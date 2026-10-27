/**
 * Load environment variables as the FIRST side effect of the process.
 *
 * Must be imported before any module that reads process.env at evaluation time
 * (database/db.ts, config/auth.ts). In ESM the first import is fully evaluated
 * before later imports, so `import "./loadEnv.js";` at the top of server.ts
 * guarantees .env.local is applied before db.ts / config/auth.ts run.
 */
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
