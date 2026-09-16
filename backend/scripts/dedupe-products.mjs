import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import dotenv from "dotenv";

const backendRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(backendRoot, ".env.local") });
dotenv.config({ path: path.join(backendRoot, ".env") });

const user = process.env.DATABASE_USER ?? "postgres";
const password = process.env.DATABASE_PASSWORD ?? "Postgresql123";
const host = process.env.DATABASE_HOST ?? "127.0.0.1";
const port = process.env.DATABASE_PORT ?? "5432";
const database = process.env.DATABASE_NAME ?? "ai_q_vendors_db";
const fallbackUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
const connectionString = (process.env.DATABASE_URL ?? "").trim() || fallbackUrl;
const apply = process.argv.includes("--apply");

const pool = new pg.Pool({ connectionString });
const client = await pool.connect();

async function findDuplicates() {
  return client.query(`
    WITH ranked AS (
      SELECT
        id,
        vendor_self_attestation_id,
        user_id,
        organization_id,
        product_name,
        status,
        updated_at,
        row_number() OVER (
          PARTITION BY
            COALESCE(NULLIF(trim(organization_id), ''), 'user:' || COALESCE(user_id::text, 'unknown')),
            lower(trim(product_name))
          ORDER BY
            CASE WHEN upper(COALESCE(status, '')) = 'COMPLETED' THEN 0 ELSE 1 END,
            updated_at DESC NULLS LAST,
            created_at DESC NULLS LAST,
            id
        ) AS duplicate_rank,
        first_value(id) OVER (
          PARTITION BY
            COALESCE(NULLIF(trim(organization_id), ''), 'user:' || COALESCE(user_id::text, 'unknown')),
            lower(trim(product_name))
          ORDER BY
            CASE WHEN upper(COALESCE(status, '')) = 'COMPLETED' THEN 0 ELSE 1 END,
            updated_at DESC NULLS LAST,
            created_at DESC NULLS LAST,
            id
        ) AS keep_id
      FROM vendor_self_attestations
      WHERE NULLIF(trim(product_name), '') IS NOT NULL
    )
    SELECT *
    FROM ranked
    WHERE duplicate_rank > 1
    ORDER BY organization_id, lower(trim(product_name)), duplicate_rank
  `);
}

try {
  if (apply) {
    await client.query("BEGIN");
    // Prevent imports from adding rows between cleanup and index creation.
    await client.query("LOCK TABLE vendor_self_attestations IN ACCESS EXCLUSIVE MODE");
  }

  const duplicates = await findDuplicates();

  if (duplicates.rowCount === 0) {
    console.log("No duplicate products found.");
    process.exitCode = 0;
  } else {
    console.table(
      duplicates.rows.map((row) => ({
        product: row.product_name,
        organization_id: row.organization_id,
        user_id: row.user_id,
        status: row.status,
        remove_id: row.id,
        keep_id: row.keep_id,
      })),
    );

    if (!apply) {
      console.log(`Dry run: ${duplicates.rowCount} duplicate product row(s) found. Re-run with --apply to remove them.`);
    } else {
      for (const duplicate of duplicates.rows) {
        const duplicateIds = [duplicate.id, duplicate.vendor_self_attestation_id].filter(Boolean);

        await client.query(
          `UPDATE generated_profile_reports
           SET attestation_id = $1
           WHERE attestation_id = ANY($2::uuid[])`,
          [duplicate.keep_id, duplicateIds],
        );

        await client.query(
          `UPDATE cots_vendor_assessments
           SET vendor_attestation_id = $1
           WHERE vendor_attestation_id = ANY($2::uuid[])`,
          [duplicate.keep_id, duplicateIds],
        );

        await client.query(
          `DELETE FROM vendor_self_attestations WHERE id = $1`,
          [duplicate.id],
        );
      }

      console.log(`Removed ${duplicates.rowCount} duplicate product row(s).`);
    }
  }

  if (apply) {
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS vendor_self_attestations_org_product_unique
      ON vendor_self_attestations (
        (
          COALESCE(
            NULLIF(trim(organization_id), ''),
            'user:' || COALESCE(user_id::text, 'unknown')
          )
        ),
        (lower(trim(product_name)))
      )
      WHERE NULLIF(trim(product_name), '') IS NOT NULL
    `);
    await client.query("COMMIT");
    console.log("Duplicate prevention index is active.");
  }
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Product deduplication failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
