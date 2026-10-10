import { assetUrl, type Exercise } from "./exercises";
import toolchain from "../../toolchain.lock.json";

export type Diagnostic = { level: string; message: string; code?: string; line?: number; rendered: string };
export type CompileResult = {
  ok: boolean;
  stdout?: string;
  stderr?: string;
  output?: string;
  text?: string;
  runtimeError?: string;
  diagnostics?: Diagnostic[];
  passed?: number;
  failed?: number;
  compileMs?: number;
  execMs?: number;
  unsupported?: string;
  verification?: "check-only";
  backendError?: string;
};
export type CompilerStatus = { text: string; percent?: number };
export const isVerified = (exercise: Exercise, result: CompileResult) =>
  !exercise.limitation && result.verification !== "check-only" && result.ok && (!exercise.test || (result.passed ?? 0) > 0);

const CACHE_NAME = `rustlings-web:compiler:${toolchain.release}`;
const MAX_LOAD_MS = 180_000;
const MAX_JOB_MS = 30_000;

export class BrowserCompiler {
  private worker: Worker | null = null;
  private module: WebAssembly.Module | null = null;
  private bundle: ArrayBuffer | null = null;
  private controller: AbortController | null = null;
  private cancelPending: (() => void) | null = null;

  cancel() {
    this.controller?.abort();
    this.worker?.terminate();
    this.worker = null;
    this.cancelPending?.();
    this.cancelPending = null;
  }

  private async load(status: (status: CompilerStatus) => void, signal: AbortSignal) {
    if (this.module && this.bundle) return;
    status({ text: "Loading the browser compiler…" });
    const total = toolchain.assets.reduce((sum, item) => sum + item.extractedSize, 0);
    let received = 0;
    let cache: Cache | undefined;
    try { cache = await caches.open(CACHE_NAME); } catch { /* Private mode can disable the Cache API. */ }
    const download = async (name: string): Promise<ArrayBuffer> => {
      const url = assetUrl(`/compiler/rustc/${name}`);
      const expected = toolchain.assets.find((asset) => asset.file === name)!;
      const valid = async (bytes: ArrayBuffer) => {
        const digest = await crypto.subtle.digest("SHA-256", bytes);
        return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("") === expected.extractedSha256;
      };
      const hit = await cache?.match(url);
      if (hit) {
        const bytes = await hit.arrayBuffer();
        if (await valid(bytes)) {
          received += bytes.byteLength;
          status({ text: "Restoring cached compiler…", percent: Math.min(100, received / total * 100) });
          return bytes;
        }
        await cache?.delete(url);
      }
      const response = await fetch(url, { signal });
      if (!response.ok || !response.body) throw new Error(`Could not download ${name}: HTTP ${response.status}. If running locally, run npm run compiler:prepare.`);
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        chunks.push(value);
        size += value.byteLength;
        received += value.byteLength;
        status({ text: "Downloading compiler · cached for next time", percent: Math.min(100, received / total * 100) });
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      if (!await valid(bytes.buffer)) throw new Error(`Compiler integrity check failed for ${name}. Try downloading again.`);
      if (cache) {
        try { await cache.put(url, new Response(bytes, { headers: { "Content-Type": name.endsWith("wasm") ? "application/wasm" : "application/octet-stream" } })); } catch {}
      }
      return bytes.buffer;
    };
    const [wasm, bundle] = await Promise.all([download("rustc.wasm"), download("sysroot-wasip1.bundle")]);
    signal.throwIfAborted();
    status({ text: "Preparing WebAssembly compiler…", percent: 100 });
    const module = await WebAssembly.compile(wasm);
    signal.throwIfAborted();
    this.module = module;
    this.bundle = bundle;
  }

  async run(exercise: Exercise, source: string, status: (status: CompilerStatus) => void): Promise<CompileResult> {
    this.cancel();
    const controller = new AbortController();
    this.controller = controller;
    const loadTimer = setTimeout(() => controller.abort(new Error("Compiler download timed out. Check your connection and try again.")), MAX_LOAD_MS);
    try { await this.load(status, controller.signal); }
    catch (error) {
      if (controller.signal.aborted) throw controller.signal.reason;
      throw error;
    } finally { clearTimeout(loadTimer); }
    controller.signal.throwIfAborted();

    return new Promise((resolve, reject) => {
      const worker = new Worker(assetUrl("/compiler/worker.js"), { type: "module" });
      this.worker = worker;
      let backendError = "";
      const timer = setTimeout(() => {
        finish();
        reject(new Error("Execution stopped after 30 seconds. Check for an infinite loop or try a smaller program."));
      }, MAX_JOB_MS);
      const finish = () => {
        clearTimeout(timer);
        worker.terminate();
        if (this.worker === worker) this.worker = null;
        this.cancelPending = null;
      };
      this.cancelPending = () => { finish(); reject(new DOMException("Execution cancelled", "AbortError")); };
      worker.onerror = (event) => { finish(); reject(new Error(event.message || "The compiler worker could not start.")); };
      worker.onmessage = ({ data }) => {
        if (data.type === "ready") {
          worker.postMessage({ type: "job", id: 1, kind: exercise.limitation === "threads" ? "check" : exercise.test ? "tests" : "run", source, isTest: exercise.test });
        } else if (data.type === "status") status({ text: data.text });
        else if (data.type === "init-error") { finish(); reject(new Error(data.error)); }
        else if (data.type === "result") {
          const result = data.result as CompileResult;
          const text = [result.output, result.stderr, ...(result.diagnostics?.map((item) => item.message) || [])].join("\n");
          if (!result.ok && !backendError && /wasm emission failed/i.test(text)) {
            backendError = text;
            status({ text: "Browser backend limitation · checking Rust types instead…" });
            worker.postMessage({ type: "job", id: 2, kind: "check", source, isTest: exercise.test });
            return;
          }
          if (backendError || exercise.limitation === "threads") result.verification = "check-only";
          if (backendError) result.backendError = backendError;
          finish(); resolve(result);
        }
      };
      status({ text: "Starting isolated compiler worker…" });
      worker.postMessage({ type: "init", module: this.module, bundle: this.bundle, bundleUrl: assetUrl("/compiler/rustc/sysroot-wasip1.bundle") });
    });
  }
}
