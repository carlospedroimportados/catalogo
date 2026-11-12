#!/usr/bin/env node
"use strict";
// Cria ferramentas/modelo/index.modelo.html a partir do index.html da Fase 1 (commit 8954947): troca os cards, as
// contagens e o nome da marca nos textos de atendimento por marcadores. Executado uma vez; o modelo fica versionado.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const RAIZ = path.resolve(__dirname, "..");
let h = execFileSync("git", ["show", "8954947e986e0ea08fa180f789032b7a2c6a5134:index.html"], { cwd: RAIZ, maxBuffer: 16 << 20 }).toString("utf8");
const un = (re, f, rot) => { const n = (h.match(new RegExp(re.source, re.flags + "g")) || []).length; if (n !== 1) throw new Error(`${rot}: ${n} ocorrências`); h = h.replace(re, f); };
un(/(<div class="grid" id="grid"[^>]*>)[\s\S]*?(<\/div>\n<div class="empty")/, (m, a, z) => `${a}<!--CARTOES-->${z}`, "cards");
h = h.replace(/(data-cat="(\w+)"><span class="c">[\s\S]*?<small>)\d+( produtos<\/small>)/g, (m, a, k, z) => `${a}{{cnt:${k}}}${z}`);
un(/(<div class="cnt" id="cnt">)\d+( produtos<\/div>)/, (m, a, z) => `${a}{{cnt:all}}${z}`, "contador");
un(/Fale com a CP Imports/, "Fale com a {{nome}}", "título do atendimento");
h = h.replace(/da%20CP%20Imports%20e%20gostaria%20de%20atendimento/g, "da%20{{nomeUrl}}%20e%20gostaria%20de%20atendimento");
fs.mkdirSync(path.join(RAIZ, "ferramentas", "modelo"), { recursive: true });
fs.writeFileSync(path.join(RAIZ, "ferramentas", "modelo", "index.modelo.html"), h);
console.log(`Modelo gravado (${(Buffer.byteLength(h) / 1024).toFixed(1)} KB) · marcadores: ${(h.match(/\{\{[^}]+\}\}|<!--CARTOES-->/g) || []).length}`);
