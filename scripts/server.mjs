import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const site = path.resolve(fileURLToPath(new URL("../site/", import.meta.url)));
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
};
const server = http.createServer(async (request, response) => {
  try {
    let route = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
    if (route === "/") {
      response.writeHead(302, { Location: "/BURKRAS/" });
      response.end();
      return;
    }
    route = route.replace(/^\/BURKRAS(?=\/|$)/, "") || "/";
    let filename = path.resolve(site, "." + route);
    if (filename !== site && !filename.startsWith(site + path.sep)) {
      response.writeHead(403);
      response.end();
      return;
    }
    if ((await stat(filename)).isDirectory())
      filename = path.join(filename, "index.html");
    const data = await readFile(filename);
    response.writeHead(200, {
      "Content-Type":
        types[path.extname(filename)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(data);
  } catch {
    response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    response.end(await readFile(path.join(site, "404.html")));
  }
});
server.listen(4173, "127.0.0.1", () =>
  process.stdout.write("BURKRAS: http://127.0.0.1:4173/BURKRAS/\n"),
);
