"use strict";
// Servidor estático local (127.0.0.1) que imita o caminho do GitHub Pages: /catalogo/...
// Só leitura do disco; recusa qualquer caminho fora da pasta servida.
const http = require("http");
const fs = require("fs");
const path = require("path");

const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json", ".css": "text/css",
  ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2" };

function iniciar(pasta, prefixo = "/catalogo/", porta = 0) {
  const raiz = path.resolve(pasta);
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, "http://x");
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); return res.end(); }
    if (!u.pathname.startsWith(prefixo)) { res.writeHead(302, { Location: prefixo }); return res.end(); }
    let rel = decodeURIComponent(u.pathname.slice(prefixo.length));
    if (rel === "" || rel.endsWith("/")) rel += "index.html";
    const arq = path.resolve(raiz, rel);
    if (!arq.startsWith(raiz + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(arq, (err, buf) => {
      if (err) { res.writeHead(404); return res.end("404"); }
      res.writeHead(200, { "Content-Type": TIPOS[path.extname(arq)] || "application/octet-stream", "Cache-Control": "no-store" });
      res.end(buf);
    });
  });
  return new Promise((ok) => srv.listen(porta, "127.0.0.1", () => ok({ url: `http://127.0.0.1:${srv.address().port}${prefixo}`, fechar: () => srv.close() })));
}

module.exports = { iniciar };
