#!/usr/bin/env node
"use strict";
/*
 * Servidor estático que imita uma hospedagem real, para ensaiar a loja fora do "modo de teste simples":
 *
 *   modo "pages"  GitHub Pages: site em /catalogo/, compressão gzip, Cache-Control: max-age=600, ETag e Last-Modified
 *                 (resposta 304), diretório sem barra final redireciona (301), endereço inexistente devolve 404.html com
 *                 status 404, maiúsculas e minúsculas importam, sem cabeçalhos de segurança extras.
 *   modo "cdn"    Cloudflare Pages / Netlify: igual ao anterior, mas aplica o arquivo _headers do repositório
 *                 (cache longo para arquivos versionados, CSP e demais cabeçalhos de segurança); valores repetidos são somados.
 *
 * Somente leitura do disco. Uso: node qa/hospedagem/servidor-pages.js [--modo pages|cdn] [--porta 4173] [--raiz <pasta>]
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");

const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".md": "text/markdown; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".webp": "image/webp", ".woff2": "font/woff2", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json" };
const COMPRIMIVEL = /^(text\/|application\/(json|xml|javascript)|image\/svg)/;

// Leitor do formato de _headers (Netlify/Cloudflare): linhas sem recuo são padrões; linhas recuadas são "Nome: valor".
function lerHeaders(arquivo) {
  if (!fs.existsSync(arquivo)) return [];
  const regras = []; let atual = null;
  for (const l of fs.readFileSync(arquivo, "utf8").split("\n")) {
    if (!l.trim() || l.trim().startsWith("#")) continue;
    if (!/^\s/.test(l)) { atual = { padrao: l.trim(), cab: [] }; regras.push(atual); }
    else if (atual) { const i = l.indexOf(":"); if (i > 0) atual.cab.push([l.slice(0, i).trim(), l.slice(i + 1).trim()]); }
  }
  return regras;
}
const casa = (padrao, caminho) => new RegExp("^" + padrao.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$").test(caminho);

function iniciar({ raiz, modo = "pages", porta = 0, prefixo = "/catalogo/", redirecionarRaiz = false } = {}) {
  raiz = path.resolve(raiz);
  const regras = modo === "cdn" ? lerHeaders(path.join(raiz, "_headers")) : [];
  const cacheGz = new Map(), log = [];
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, "http://x");
    const registrar = (status, extra = {}) => log.push({ metodo: req.method, caminho: u.pathname, status, ...extra });
    const enviar = (status, cab, corpo) => { res.writeHead(status, cab); res.end(req.method === "HEAD" ? undefined : corpo); registrar(status, { bytes: corpo ? corpo.length : 0, enc: cab["Content-Encoding"] || null }); };
    if (req.method !== "GET" && req.method !== "HEAD") return enviar(405, { Allow: "GET, HEAD" }, "");
    if (redirecionarRaiz && u.pathname === "/") return enviar(302, { Location: prefixo }, ""); // só na prévia manual: abrir o endereço-raiz leva à loja
    if (!u.pathname.startsWith(prefixo)) return enviar(404, { "Content-Type": TIPOS[".html"] }, "<h1>404</h1>");
    let rel; try { rel = decodeURIComponent(u.pathname.slice(prefixo.length)); } catch { return enviar(400, {}, ""); }
    let arq = path.resolve(raiz, rel);
    if (arq !== raiz && !arq.startsWith(raiz + path.sep)) return enviar(403, {}, "");
    let st = fs.existsSync(arq) ? fs.statSync(arq) : null;
    if (st && st.isDirectory()) {
      if (!u.pathname.endsWith("/")) return enviar(301, { Location: u.pathname + "/" + u.search }, "");
      arq = path.join(arq, "index.html"); st = fs.existsSync(arq) ? fs.statSync(arq) : null;
    }
    let status = 200;
    if (!st || !st.isFile()) { arq = path.join(raiz, "404.html"); st = fs.existsSync(arq) ? fs.statSync(arq) : null; status = 404; if (!st) return enviar(404, { "Content-Type": TIPOS[".html"] }, "Not Found"); }
    const tipo = TIPOS[path.extname(arq)] || "application/octet-stream";
    const etag = `W/"${st.size.toString(16)}-${Math.round(st.mtimeMs).toString(16)}"`;
    const cab = { "Content-Type": tipo, "Cache-Control": "max-age=600", ETag: etag, "Last-Modified": st.mtime.toUTCString(), "Access-Control-Allow-Origin": "*", Vary: "Accept-Encoding" };
    if (regras.length) {
      // Como Cloudflare Pages e Netlify: todas as regras que casam se aplicam e os valores do mesmo cabeçalho são SOMADOS.
      // Uma regra de cabeçalho substitui o padrão da hospedagem (no caso, o Cache-Control de 10 minutos do modo "pages").
      const somado = {};
      for (const r of regras) if (casa(r.padrao, "/" + rel)) for (const [n, v] of r.cab) (somado[n] = somado[n] || []).push(v);
      for (const [n, vs] of Object.entries(somado)) cab[n] = vs.join(", ");
    }
    if (status === 200 && (req.headers["if-none-match"] === etag || (req.headers["if-modified-since"] && new Date(req.headers["if-modified-since"]) >= new Date(Math.floor(st.mtimeMs / 1000) * 1000)))) return enviar(304, cab, "");
    let corpo = fs.readFileSync(arq);
    if (COMPRIMIVEL.test(tipo) && /\bgzip\b/.test(req.headers["accept-encoding"] || "")) {
      const k = arq + ":" + st.mtimeMs; if (!cacheGz.has(k)) cacheGz.set(k, zlib.gzipSync(corpo, { level: 6 }));
      corpo = cacheGz.get(k); cab["Content-Encoding"] = "gzip";
    }
    cab["Content-Length"] = corpo.length;
    enviar(status, cab, corpo);
  });
  return new Promise((ok) => srv.listen(porta, "127.0.0.1", () => ok({ porta: srv.address().port, url: `http://127.0.0.1:${srv.address().port}${prefixo}`, log, fechar: () => new Promise((f) => srv.close(f)) })));
}

if (require.main === module) {
  const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
  const raiz = arg("--raiz", path.resolve(__dirname, "..", ".."));
  iniciar({ raiz, modo: arg("--modo", "pages"), porta: +arg("--porta", 4173), redirecionarRaiz: true }).then((s) => {
    console.log(`Prévia (${arg("--modo", "pages")}): ${s.url}`);
    console.log("Imita GitHub Pages (modo pages) ou Cloudflare/Netlify com _headers (modo cdn). Somente leitura; Ctrl+C para parar.");
  });
}
module.exports = { iniciar, lerHeaders, casa };
