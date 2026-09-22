import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const root = normalize(join(import.meta.dirname, ".."));
const port = Number(process.env.QA_PORT || 4173);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".webp": "image/webp", ".xml": "application/xml", ".txt": "text/plain" };

createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  let filePath = normalize(join(root, decodeURIComponent(url.pathname)));
  if (!filePath.startsWith(root)) { response.writeHead(403).end("Forbidden"); return; }
  if (existsSync(filePath) && statSync(filePath).isDirectory()) filePath = join(filePath, "index.html");
  if (!existsSync(filePath)) { response.writeHead(404).end("Not found"); return; }
  response.writeHead(200, { "Content-Type": types[extname(filePath)] || "application/octet-stream", "Cache-Control": "no-store" });
  createReadStream(filePath).pipe(response);
}).listen(port, "127.0.0.1", () => console.log(`SLS preview: http://127.0.0.1:${port}`));
