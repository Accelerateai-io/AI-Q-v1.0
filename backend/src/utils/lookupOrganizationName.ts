import { eq } from "drizzle-orm";
import { db } from "../database/db.js";
import { createOrganization } from "../schema/schema.js";

export function firstNonEmptyString(...values: unknown[]): string {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

/** Resolve organizations.organizationName from a numeric id or a stored name. */
export async function lookupOrganizationName(
  orgKey: string | number | null | undefined,
): Promise<string> {
  const key = String(orgKey ?? "").trim();
  if (!key) return "";
  const numericId = Number(key);
  if (Number.isInteger(numericId) && numericId >= 1) {
    const [byId] = await db
      .select({ organizationName: createOrganization.organizationName })
      .from(createOrganization)
      .where(eq(createOrganization.id, numericId))
      .limit(1);
    const name = String(byId?.organizationName ?? "").trim();
    if (name) return name;
  }
  const [byName] = await db
    .select({ organizationName: createOrganization.organizationName })
    .from(createOrganization)
    .where(eq(createOrganization.organizationName, key))
    .limit(1);
  return String(byName?.organizationName ?? "").trim();
}
