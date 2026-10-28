import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const html = readFileSync(resolve(root, "web/index.html"), "utf8");
const source = readFileSync(resolve(root, "worker/index.js"), "utf8");
const marker = 'const PAGE = ""; // @INJECT_PAGE';
if (!source.includes(marker)) throw new Error("Missing HTML injection marker");
const compiled = source.replace(marker, "const PAGE = " + JSON.stringify(html) + ";");
mkdirSync(resolve(root, "dist/server"), { recursive: true });
mkdirSync(resolve(root, "dist/.openai"), { recursive: true });
writeFileSync(resolve(root, "dist/server/index.js"), compiled);
writeFileSync(resolve(root, "dist/.openai/hosting.json"), readFileSync(resolve(root, ".openai/hosting.json")));
console.log("Built Worker and embedded search UI");
