#!/usr/bin/env node
"use strict";
/*
 * Reconstrói tudo o que é gerado a partir do catálogo, na ordem correta. Para cada etapa que falha, a construção para.
 *   1. validar-catalogo.js   travas do catálogo (posições, fotos, preços)         2. otimizar-imagens.py  miniaturas que faltam
 *   3. ajustar-app.js        assets/app-premium.js                                4. gerar-paginas.js     páginas, mapa, sitemap, 404
 *   5. aplicar-redesign.js   index.html                                           6. qa/prototipo-fase2/gerar.js  protótipo
 * Uso: node ferramentas/construir.js [--pasta <raiz>]   (a pasta alternativa serve para ensaios em cópias)
 */
const { execFileSync } = require("child_process");
const path = require("path");
const raiz = process.argv.includes("--pasta") ? path.resolve(process.argv[process.argv.indexOf("--pasta") + 1]) : path.resolve(__dirname, "..");
const passos = [["node", "ferramentas/validar-catalogo.js"], ["python3", "ferramentas/otimizar-imagens.py"], ["node", "ferramentas/ajustar-app.js"], ["node", "ferramentas/gerar-paginas.js"], ["node", "ferramentas/aplicar-redesign.js"], ["node", "qa/prototipo-fase2/gerar.js"]];
for (const [cmd, arq] of passos) {
  try { process.stdout.write(execFileSync(cmd, [path.join(raiz, arq)], { cwd: raiz, stdio: ["ignore", "pipe", "pipe"] })); }
  catch (e) { process.stderr.write(String(e.stdout || "") + String(e.stderr || "")); console.error(`Construção interrompida em ${arq}.`); process.exit(1); }
}
