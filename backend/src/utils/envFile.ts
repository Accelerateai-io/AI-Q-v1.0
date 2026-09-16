import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Update or append KEY=value lines in a dotenv file, preserving comments and order.
 */
export function upsertEnvFile(
  filePath: string,
  updates: Record<string, string>,
): void {
  const keys = Object.keys(updates);
  if (keys.length === 0) return;

  let lines: string[] = [];
  try {
    if (fs.existsSync(filePath)) {
      lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    }
  } catch (err) {
    throwEnvWriteError(filePath, err);
  }

  const touched = new Set<string>();

  const nextLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return line;

    const eq = line.indexOf("=");
    if (eq === -1) return line;

    const key = line.slice(0, eq).trim();
    if (!(key in updates)) return line;

    touched.add(key);
    return `${key}=${updates[key]}`;
  });

  for (const key of keys) {
    if (!touched.has(key)) {
      nextLines.push(`${key}=${updates[key]}`);
    }
  }

  const body = nextLines.join("\n");
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, body.endsWith("\n") ? body : `${body}\n`, "utf8");
  } catch (err) {
    throwEnvWriteError(filePath, err);
  }
}

function throwEnvWriteError(filePath: string, err: unknown): never {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as NodeJS.ErrnoException).code)
      : "";
  if (code === "EACCES" || code === "EPERM") {
    throw new Error(
      `Permission denied writing ${filePath}. ` +
        `Ensure the process user owns that file (e.g. chown) and can write the backend directory.`,
    );
  }
  throw err instanceof Error ? err : new Error(String(err));
}

