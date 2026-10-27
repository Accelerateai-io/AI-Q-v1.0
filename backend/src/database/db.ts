// backend/src/database/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { logger } from "../middlewares/logger.js";
import { assertServerEnv } from "../config/requireEnv.js";

// Create the postgresql client.
// No hard-coded credential fallbacks: a missing DB var must fail the boot check
// in initDB() rather than silently connect with a well-known default password.
const DATABASE_USER = (process.env.DATABASE_USER ?? "").trim();
const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD ?? "";
const DATABASE_HOST = (process.env.DATABASE_HOST ?? "").trim();
const DATABASE_PORT = (process.env.DATABASE_PORT ?? "5432").trim();
const DATABASE_NAME = (process.env.DATABASE_NAME ?? "").trim();

const pool = new Pool({
  user: DATABASE_USER,
  password: DATABASE_PASSWORD,
  host: DATABASE_HOST,
  port: Number(DATABASE_PORT),
  database: DATABASE_NAME,
  connectionTimeoutMillis: 10000,
});

// Create Drizzle ORM instance
export const db = drizzle({ client: pool });
export { pool };

// Optional: function to check connection
export async function initDB() {
  try {
    // Fail fast with a clear message before attempting to connect with a blank/default secret.
    assertServerEnv();
    await db.execute(`SELECT 1 AS connected`);
    // logger.info("Database connected successfully");
    console.log("Database connected successfully")
  } catch (err) {
    console.log("Database connection failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    logger.error("Database connection failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err; // stop server if DB fails
  }
}
