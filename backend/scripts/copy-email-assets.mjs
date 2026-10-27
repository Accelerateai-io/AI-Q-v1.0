import fs from "node:fs";
import path from "node:path";

const src = path.join("src", "email", "assets");
const dest = path.join("dist", "email", "assets");

fs.mkdirSync(dest, { recursive: true });
for (const file of fs.readdirSync(src)) {
  fs.copyFileSync(path.join(src, file), path.join(dest, file));
}

// tsc does not emit JSON. The compiled risk lookup and framework mapping
// read these files beside the JS via import.meta.url, so a missing copy
// aborts the Type 2 report before AIRI or the Python score.
const runtimeJson = [
  ["src/services/riskMapping/riskVocabulary.v1.json", "dist/services/riskMapping/riskVocabulary.v1.json"],
  ["src/services/frameworkMapping/frameworkCatalogMap.v1.json", "dist/services/frameworkMapping/frameworkCatalogMap.v1.json"],
];
for (const [from, to] of runtimeJson) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}
