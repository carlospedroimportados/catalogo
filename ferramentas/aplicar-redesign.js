#!/usr/bin/env node
"use strict";
/*
 * Aplica o Redesign Premium (Fase 2) à loja: gera o index.html da raiz a partir do index.html da
 * Fase 1 (lido do git, commit 8954947) e da transformação em ferramentas/redesign.js.
 * Reproduzível: rodar de novo produz o mesmo arquivo. Para voltar à Fase 1:
 *   git checkout 8954947 -- index.html
 * Uso: node ferramentas/aplicar-redesign.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { transformar, RAIZ } = require("./redesign");
const FASE1 = "8954947e986e0ea08fa180f789032b7a2c6a5134";
const fase1 = execFileSync("git", ["show", `${FASE1}:index.html`], { cwd: RAIZ, maxBuffer: 16 << 20 }).toString("utf8");
const r = transformar(fase1);
fs.writeFileSync(path.join(RAIZ, "index.html"), r.html);
console.log(`Loja atualizada: index.html (${(Buffer.byteLength(r.html) / 1024).toFixed(1)} KB) · cards: ${r.cards} · imagens com dimensões: ${r.comDimensoes}`);
