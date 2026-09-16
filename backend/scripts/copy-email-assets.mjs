import fs from "node:fs";
import path from "node:path";

const src = path.join("src", "email", "assets");
const dest = path.join("dist", "email", "assets");

fs.mkdirSync(dest, { recursive: true });
for (const file of fs.readdirSync(src)) {
  fs.copyFileSync(path.join(src, file), path.join(dest, file));
}
