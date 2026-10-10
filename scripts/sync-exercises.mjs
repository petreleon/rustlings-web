import { readFile, writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import TOML from "@iarna/toml";

const root = fileURLToPath(new URL("../", import.meta.url));
const VERSION = "v6.5.0";
const COMMIT = "2af9e89ba536fad01aa828b06e0ac2174bad0f6d";
const temp = await mkdtemp(join(tmpdir(), "rustlings-sync-"));
const checkout = process.argv[2] || join(temp, "upstream");
try {
  if (!process.argv[2]) execFileSync("git", ["clone", "--depth", "1", "--branch", VERSION, "https://github.com/rust-lang/rustlings.git", checkout], { stdio: "inherit" });
  const actual = execFileSync("git", ["-C", checkout, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  if (actual !== COMMIT) throw new Error(`Expected Rustlings ${COMMIT}, got ${actual}`);
  const info = TOML.parse(await readFile(join(checkout, "rustlings-macros/info.toml"), "utf8"));
  const chapters = new Map();
  const exercises = [];
  for (const [order, ex] of info.exercises.entries()) {
    const dir = ex.dir || "quizzes";
    const path = `${ex.dir ? `${ex.dir}/` : ""}${ex.name}.rs`;
    if (!chapters.has(dir)) {
      let readme = "";
      try { readme = await readFile(join(checkout, "exercises", ex.dir || "", "README.md"), "utf8"); } catch {}
      chapters.set(dir, { id: dir, title: dir === "quizzes" ? "Quizzes" : dir.replace(/^\d+_/, "").replaceAll("_", " "), readme });
    }
    exercises.push({ id: ex.name, order, chapter: dir, path, test: ex.test !== false,
      strictClippy: !!ex.strict_clippy, hint: ex.hint?.trim() || "",
      source: await readFile(join(checkout, "exercises", path), "utf8"),
      limitation: dir === "20_threads" || ex.name === "arc1" ? "threads" : ex.strict_clippy ? "clippy" : null,
      browserNote: ["hashmaps3", "errors5", "errors6", "iterators4", "from_into", "from_str", "try_from_into"].includes(ex.name) ? "codegen" : null });
  }
  await mkdir(join(root, "src/data"), { recursive: true });
  await mkdir(join(root, "public/licenses"), { recursive: true });
  await writeFile(join(root, "src/data/exercises.json"), JSON.stringify({
    meta: { repository: "rust-lang/rustlings", version: VERSION, commit: COMMIT, count: exercises.length },
    chapters: [...chapters.values()], exercises,
  }, null, 2) + "\n");
  const license = await readFile(join(checkout, "LICENSE"), "utf8");
  await writeFile(join(root, "public/licenses/RUSTLINGS-MIT.txt"), license.trimEnd() + "\n");
  console.log(`Synced ${exercises.length} exercises from Rustlings ${VERSION} (${COMMIT}).`);
} finally { await rm(temp, { recursive: true, force: true }); }
