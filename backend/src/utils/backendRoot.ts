import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Absolute path to the backend package root (contains models.json, .env.local). */
export const backendRoot = path.resolve(__dirname, "../..");
