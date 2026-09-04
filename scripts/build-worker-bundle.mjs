import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const js = readFileSync(join(root, "cloudflare-worker", "dist", "index.js"), "utf8");
const b64 = Buffer.from(js, "utf8").toString("base64");
const out = `export const CLOUDFLARE_WORKER_CODE_BASE64 =\n  "${b64}";\n`;
writeFileSync(join(root, "src", "services", "worker-bundle.ts"), out);
console.log(`Wrote worker-bundle.ts (${js.length} bytes source, ${b64.length} base64)`);
