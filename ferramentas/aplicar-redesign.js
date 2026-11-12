#!/usr/bin/env node
"use strict";
/*
 * Aplica o Redesign Premium à loja: monta a base a partir do catálogo (ferramentas/base.js, com o nome CP Importados
 * nas mensagens de WhatsApp) e aplica a transformação de ferramentas/redesign.js. Reproduzível: rodar de novo produz
 * o mesmo arquivo. Para voltar à Fase 1:  git checkout 8954947 -- index.html
 * Uso: node ferramentas/aplicar-redesign.js
 */
const fs = require("fs");
const path = require("path");
const { montarBase } = require("./base");
const { transformar, RAIZ } = require("./redesign");
const r = transformar(montarBase({ nome: "CP Importados" }));
fs.writeFileSync(path.join(RAIZ, "index.html"), r.html);
console.log(`Loja atualizada: index.html (${(Buffer.byteLength(r.html) / 1024).toFixed(1)} KB) · cards: ${r.cards} · imagens com dimensões: ${r.comDimensoes} · com miniaturas: ${r.comMiniaturas}`);
