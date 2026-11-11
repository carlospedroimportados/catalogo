"use strict";
// Reconstrói o index.html monolítico a partir de uma versão separada (Fase 1), re-embutindo
// CSS, fontes, scripts e imagens a partir dos arquivos em disco. Implementação independente da
// ferramenta de separação: se o resultado for idêntico byte a byte ao original, nada se perdeu.
// Numa versão ainda monolítica, devolve o HTML sem mudanças.
const fs = require("fs");
const path = require("path");
const { sha256 } = require("./util");

function montar(pasta) {
  const html = fs.readFileSync(path.join(pasta, "index.html"), "utf8");
  const recursos = []; const problemas = [];
  const ler = (rel, enc) => {
    const f = path.resolve(pasta, rel);
    if (!f.startsWith(path.resolve(pasta) + path.sep)) throw new Error("caminho fora da pasta: " + rel);
    if (!fs.existsSync(f)) { problemas.push("arquivo referenciado não existe: " + rel); return enc ? "" : Buffer.alloc(0); }
    const b = fs.readFileSync(f); recursos.push({ rel, bytes: b.length, sha256: sha256(b) });
    return enc ? b.toString(enc) : b;
  };
  const conferirVersao = (rel, v, buf) => { if (v && sha256(buf).slice(0, v.length) !== v) problemas.push(`?v= desatualizado em ${rel}`); };

  let out = html.replace(/<link rel="stylesheet" href="([^"?]+)(?:\?v=(\w+))?">/g, (m, rel, v) => {
    const buf = ler(rel); conferirVersao(rel, v, buf);
    const base = path.posix.dirname(rel);
    const css = buf.toString("utf8").replace(/url\(([^)?]+\.woff2)(?:\?v=(\w+))?\)/g, (mm, r2, v2) => {
      const relFonte = path.posix.normalize(path.posix.join(base, r2)); const b = ler(relFonte); conferirVersao(relFonte, v2, b);
      return `url(data:font/woff2;base64,${b.toString("base64")})`;
    });
    return `<style>${css}</style>`;
  });
  // Tags <script src> consecutivas formavam um único bloco <script> no original.
  out = out.replace(/(?:<script src="[^"]+"><\/script>)+/g, (grupo) => {
    const partes = [...grupo.matchAll(/<script src="([^"?]+)(?:\?v=(\w+))?"><\/script>/g)].map(([, rel, v]) => { const b = ler(rel); conferirVersao(rel, v, b); return b.toString("utf8"); });
    return `<script>${partes.join("")}</script>`;
  });
  out = out.replace(/src="(img\/[^"?]+\.webp)(?:\?v=(\w+))?"/g, (m, rel, v) => {
    const b = ler(rel); conferirVersao(rel, v, b);
    return `src="data:image/webp;base64,${b.toString("base64")}"`;
  });
  const separado = out !== html;
  return { html: out, separado, recursos, problemas, indexBytes: Buffer.byteLength(html) };
}

module.exports = { montar };
