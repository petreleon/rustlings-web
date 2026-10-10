import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, copyFile, mkdtemp, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const lock = JSON.parse(await readFile(join(root, "toolchain.lock.json"), "utf8"));
const dest = join(root, "public/compiler/rustc");
const cache = join(root, ".cache", lock.release);
await mkdir(dest, { recursive: true });
await mkdir(cache, { recursive: true });
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
let receipt;
try { receipt = JSON.parse(await readFile(join(dest, "assets-meta.json"), "utf8")); } catch {}

for (const asset of lock.assets) {
  const target = join(dest, asset.file);
  const existing = receipt?.files?.[asset.file];
  if (receipt?.release === lock.release && existing?.archiveSha256 === asset.sha256) {
    try {
      if (existing.sha256 === asset.extractedSha256 && hash(await readFile(target)) === asset.extractedSha256) continue;
    } catch {}
  }
  const archive = join(cache, asset.name);
  let bytes;
  try { bytes = await readFile(archive); } catch {}
  if (!bytes || hash(bytes) !== asset.sha256) {
    console.log(`Downloading ${asset.name} (${lock.release})…`);
    const response = await fetch(`https://github.com/${lock.repository}/releases/download/${lock.release}/${asset.name}`);
    if (!response.ok) throw new Error(`Compiler download failed: HTTP ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
    if (hash(bytes) !== asset.sha256) throw new Error(`SHA-256 mismatch: ${asset.name}`);
    await writeFile(archive, bytes);
  }
  const temp = await mkdtemp(join(cache, "extract-"));
  try {
    const entries = execFileSync("tar", ["-tf", archive], { encoding: "utf8" }).trim().split("\n");
    const entry = entries.find((p) => basename(p) === asset.file);
    if (!entry || entry.startsWith("/") || entry.split("/").includes("..")) throw new Error(`Unsafe or missing ${asset.file}`);
    execFileSync("tar", ["-xf", archive, "-C", temp, entry]);
    await copyFile(join(temp, entry), target);
  } finally { await rm(temp, { recursive: true, force: true }); }
}

const files = {};
for (const asset of lock.assets) {
  const bytes = await readFile(join(dest, asset.file));
  if (hash(bytes) !== asset.extractedSha256) throw new Error(`Extracted asset SHA-256 mismatch: ${asset.file}`);
  files[asset.file] = { size: bytes.length, sha256: hash(bytes), archiveSha256: asset.sha256 };
}
await writeFile(join(dest, "assets-meta.json"), JSON.stringify({ release: lock.release, files }, null, 2));
console.log("Browser compiler ready. Archives and extracted assets verified with SHA-256.");
