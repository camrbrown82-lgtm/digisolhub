import fs from "fs";
import path from "path";

const outDir = path.join(process.cwd(), "out");
const nextDir = path.join(outDir, "_next");
const publicNextDir = path.join(outDir, "next");

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

if (!fs.existsSync(nextDir)) {
  console.error("Missing out/_next. Run next build first.");
  process.exit(1);
}

fs.cpSync(nextDir, publicNextDir, { recursive: true });

const rewriteExt = new Set([".html", ".js", ".css", ".txt", ".json"]);
for (const file of walk(outDir)) {
  if (!rewriteExt.has(path.extname(file))) continue;
  const original = fs.readFileSync(file, "utf8");
  const updated = original.replaceAll("/_next/", "/next/");
  if (updated !== original) fs.writeFileSync(file, updated);
}

console.log("Cloudflare Pages assets ready: /next instead of /_next");
