#!/usr/bin/env node
"use strict";
// Reconstrói tudo o que é gerado na Fase 2, na ordem correta:
//   1. páginas de produto, mapa de páginas e sitemap   2. página inicial redesenhada   3. protótipo
// Uso: node ferramentas/construir.js
const { execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const raiz = path.resolve(__dirname, "..");
// Miniaturas: criadas só se faltarem (os originais em img/ nunca são alterados).
if (!fs.existsSync(path.join(raiz, "miniaturas", "produtos-320", "000.webp"))) process.stdout.write(execFileSync("python3", [path.join(raiz, "ferramentas", "otimizar-imagens.py")], { cwd: raiz }));
for (const f of ["ferramentas/gerar-paginas.js", "ferramentas/aplicar-redesign.js", "qa/prototipo-fase2/gerar.js"]) {
  process.stdout.write(execFileSync("node", [path.resolve(__dirname, "..", f)], { cwd: path.resolve(__dirname, "..") }));
}
