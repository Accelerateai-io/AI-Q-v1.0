import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import {defineConfig} from "drizzle-kit";

config({
  path: path.join(path.dirname(fileURLToPath(import.meta.url)), ".env.local"),
});

const DATABASE_USER = process.env.DATABASE_USER ?? "postgres";
const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD ?? "Postgresql123";
const DATABASE_HOST = process.env.DATABASE_HOST ?? "localhost";
const DATABASE_PORT = process.env.DATABASE_PORT ?? "5432";
const DATABASE_NAME = process.env.DATABASE_NAME ?? "ai_eval_db";

const DATABASE_URI = `postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}`;

const getDirname = () => {
  if (typeof import.meta?.url !== "undefined") {
    return path.dirname(fileURLToPath(import.meta.url));
  }
  return path.resolve(process.cwd());
};
const rootDir = getDirname();
const migrationsDir = path.join(rootDir, "migrations");

export default defineConfig({
  schema: "./dist/schema/schema.js",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: DATABASE_URI!,
  },
});



// import path from "path";
// import { fileURLToPath } from "url";
// import { config } from "dotenv";
// import {Config} from "drizzle-kit";
// config({ path: ".env.local" });

// const getDirname = () => {
//   if (typeof import.meta?.url !== "undefined") {
//     return path.dirname(fileURLToPath(import.meta.url));
//   }
//   return path.resolve(process.cwd());
// };
// const rootDir = getDirname();
// const migrationsDir = path.join(rootDir, "migrations");

// export default {
//   schema: "./dist/schema/schema.js",
//   out: migrationsDir,
//   dialect: "postgresql",
//   dbCredentials: {
//     url: process.env.DATABASE_URL!,
//   },
// } satisfies Config;
