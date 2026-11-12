#!/usr/bin/env node
"use strict";
/*
 * Protótipo da Fase 2 (isolado, com pagamentos simulados). Usa a mesma transformação da loja
 * (ferramentas/redesign.js), aplicada ao index.html da Fase 1 lido do git, e acrescenta a faixa de
 * aviso e simulacao.js. Recursos da loja são referenciados em ../../, sem cópia.
 * Uso: node qa/prototipo-fase2/gerar.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { transformar, RAIZ } = require("../../ferramentas/redesign");
const fase1 = execFileSync("git", ["show", "8954947e986e0ea08fa180f789032b7a2c6a5134:index.html"], { cwd: RAIZ, maxBuffer: 16 << 20 }).toString("utf8");
const r = transformar(fase1, { prefixo: "../../", prototipo: true });
fs.writeFileSync(path.join(__dirname, "index.html"), r.html);
console.log(`Protótipo gerado: qa/prototipo-fase2/index.html (${(Buffer.byteLength(r.html) / 1024).toFixed(1)} KB) · cards: ${r.cards} · imagens com dimensões: ${r.comDimensoes}`);
