#!/usr/bin/env node
"use strict";
/*
 * Protótipo da Fase 2 (isolado, com pagamentos simulados). Usa a mesma base e a mesma transformação da loja
 * (ferramentas/base.js e ferramentas/redesign.js) e acrescenta a faixa de aviso e simulacao.js. Recursos da loja são
 * referenciados em ../../, sem cópia. Uso: node qa/prototipo-fase2/gerar.js
 */
const fs = require("fs");
const path = require("path");
const { montarBase } = require("../../ferramentas/base");
const { transformar } = require("../../ferramentas/redesign");
const r = transformar(montarBase({ nome: "CP Importados" }), { prefixo: "../../", prototipo: true });
fs.writeFileSync(path.join(__dirname, "index.html"), r.html);
console.log(`Protótipo gerado: qa/prototipo-fase2/index.html (${(Buffer.byteLength(r.html) / 1024).toFixed(1)} KB) · cards: ${r.cards} · imagens com dimensões: ${r.comDimensoes} · com miniaturas: ${r.comMiniaturas}`);
