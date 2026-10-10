import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../out", import.meta.url));
const prefix = process.env.NEXT_PUBLIC_BASE_PATH || "";
const port = Number(process.env.PORT || 3100);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".wasm": "application/wasm", ".svg": "image/svg+xml", ".txt": "text/plain", ".woff2": "font/woff2", ".woff": "font/woff", ".ico": "image/x-icon", ".png": "image/png" };

createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") { response.writeHead(405).end(); return; }
  try {
    let path = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    if (prefix && path !== prefix && !path.startsWith(`${prefix}/`)) throw new Error("Not found");
    if (prefix) path = path.slice(prefix.length);
    let file = resolve(root, `.${path || "/"}`);
    if (file !== root && !file.startsWith(root + sep)) throw new Error("Not found");
    let info = await stat(file);
    if (info.isDirectory()) { file = resolve(file, "index.html"); info = await stat(file); }
    if (!info.isFile()) throw new Error("Not found");
    response.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream", "Content-Length": info.size, "Cache-Control": "no-cache" });
    if (request.method === "HEAD") response.end();
    else createReadStream(file).pipe(response);
  } catch { response.writeHead(404, { "Content-Type": "text/plain" }).end("Not found"); }
}).listen(port, "127.0.0.1", () => console.log(`Preview: http://127.0.0.1:${port}${prefix}/`));
