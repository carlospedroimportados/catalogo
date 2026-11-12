#!/usr/bin/env node
"use strict";
/*
 * Monta dist/ com SOMENTE o que o site usa, para hospedagens que publicam uma pasta (Cloudflare Pages, Netlify):
 * página inicial, 404, sitemap, _headers, assets, dados, fontes, fotos, miniaturas, páginas de produto e o atalho do painel.
 * Fica de fora: qa/, docs/, ferramentas/, instagram/, README e tudo o que não é do site.
 * Não precisa de Python nem de dependências. Comando de build da hospedagem:  node ferramentas/montar-site.js   (pasta de saída: dist)
 * Variáveis: CP_PREVIA=1 (modo prévia: pedidos desativados), CP_API=real (prévia com o servidor real), CP_SITE (endereço público).
 * Uso: node ferramentas/montar-site.js [--saida dist]
 */
const fs = require("fs");
const path = require("path");
const raiz = path.resolve(__dirname, "..");
const saida = path.resolve(raiz, process.argv.includes("--saida") ? process.argv[process.argv.indexOf("--saida") + 1] : "dist");
const PREVIA = process.env.CP_PREVIA === "1";
// Trava de segurança: numa hospedagem automática (Cloudflare Pages define CF_PAGES; Netlify, NETLIFY) o build SÓ roda em modo prévia.
// Sem CP_PREVIA=1 ele aborta, para que um deploy esquecido nunca saia com pedidos ligados no servidor real.
// CP_API=real também é recusado nessas hospedagens (religar o servidor real é decisão manual, fora do build automático).
const EM_HOSPEDAGEM = !!(process.env.CF_PAGES || process.env.NETLIFY);
if (EM_HOSPEDAGEM && !PREVIA) { console.error("BUILD RECUSADO: build em hospedagem automática sem CP_PREVIA=1. Defina a variável CP_PREVIA=1 (prévia com pedidos desativados)."); process.exit(1); }
if (EM_HOSPEDAGEM && process.env.CP_API === "real") { console.error("BUILD RECUSADO: CP_API=real não é permitido em build de hospedagem automática."); process.exit(1); }
// O painel administrativo nunca vai para a prévia; só as imagens de ícone (usadas como favicon pelas páginas da loja) são copiadas.
const ITENS = ["index.html", "404.html", "sitemap.xml", "_headers", "assets", "dados", "fonts", "img", "miniaturas", "produto", ...(PREVIA ? [] : ["admin"])];
if (saida === raiz || !saida.startsWith(raiz + path.sep)) throw new Error("a pasta de saída precisa ficar dentro do repositório e não pode ser a raiz");
fs.rmSync(saida, { recursive: true, force: true }); fs.mkdirSync(saida, { recursive: true });
if (PREVIA) { fs.mkdirSync(path.join(saida, "admin"), { recursive: true }); }
let arquivos = 0, bytes = 0;
const contar = (p) => { for (const e of fs.readdirSync(p, { withFileTypes: true })) { const q = path.join(p, e.name); if (e.isDirectory()) contar(q); else { arquivos++; bytes += fs.statSync(q).size; } } };
for (const i of ITENS) { const o = path.join(raiz, i); if (!fs.existsSync(o)) throw new Error("item ausente: " + i + " (rode node ferramentas/construir.js antes)"); fs.cpSync(o, path.join(saida, i), { recursive: true }); }
if (PREVIA) for (const f of fs.readdirSync(path.join(raiz, "admin"))) if (/^icon-.*\.png$/.test(f)) fs.copyFileSync(path.join(raiz, "admin", f), path.join(saida, "admin", f));
// Modo prévia (CP_PREVIA=1): o servidor de pedidos é desligado no dist/ (CFG.api vazio). A loja já trata isso: o checkout
// segue o fluxo de WhatsApp e Pix local, sem enviar nada ao Apps Script e sem criar pedido ou cobrança reais.
// CP_API=real mantém o servidor de produção ligado (use só em teste combinado, com o item de R$ 2 e conferência no painel).
let modo = "site publicado (pedidos ativos)";
if (process.env.CP_PREVIA === "1") {
  const cfg = path.join(saida, "assets", "config.js"); let t = fs.readFileSync(cfg, "utf8");
  if (process.env.CP_API === "real") modo = "PRÉVIA com o servidor de pedidos REAL ligado — qualquer compra criará pedido de verdade";
  else {
    const n = (t.match(/api:"[^"]*"/g) || []).length; if (n !== 1) throw new Error(`config.js: esperado 1 api:"...", encontrado ${n}`);
    fs.writeFileSync(cfg, t.replace(/api:"[^"]*"/, 'api:""')); modo = "PRÉVIA com pedidos DESATIVADOS (nada é enviado ao Apps Script)";
  }
}
contar(saida);
console.log(`Modo: ${modo}`);
console.log(`dist/ montado: ${arquivos} arquivos, ${(bytes / 1048576).toFixed(1)} MB (o repositório tem mais de 890 arquivos, incluindo testes e documentação)`);
