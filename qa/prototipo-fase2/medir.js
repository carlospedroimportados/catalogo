#!/usr/bin/env node
"use strict";
// Mede o primeiro carregamento da loja (raiz) e de uma página de produto no celular, com densidade de pixels 1x, 2x e 3x.
// Rede externa bloqueada. Uso: node qa/prototipo-fase2/medir.js [rótulo]  → imprime JSON.
const path = require("path");
const { RAIZ } = require("../lib/util");
const { iniciar } = require("../lib/servidor");
const { abrirNavegador } = require("../lib/navegador");
(async () => {
  const s = await iniciar(RAIZ), b = await abrirNavegador(), out = {};
  const alvos = { inicio: s.url, produto: s.url + "produto/armaf-club-de-nuit-woman/" };
  for (const [nome, url] of Object.entries(alvos)) for (const dpr of [1, 2, 3]) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: dpr, serviceWorkers: "block", locale: "pt-BR" });
    await ctx.route("**/*", (r) => (new URL(r.request().url()).hostname === "127.0.0.1" ? r.continue() : r.abort()));
    const p = await ctx.newPage(), res = [];
    p.on("response", async (r) => { try { res.push({ tipo: r.request().resourceType(), url: r.url(), bytes: (await r.body()).length }); } catch { /* sem corpo */ } });
    await p.goto(url, { waitUntil: "load" }); await p.waitForLoadState("networkidle");
    const t = await p.evaluate(() => { const n = performance.getEntriesByType("navigation")[0]; return { dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd) }; });
    const img = res.filter((x) => x.tipo === "image");
    out[`${nome} ${dpr}x`] = { requisicoes: res.length, totalKB: Math.round(res.reduce((a, x) => a + x.bytes, 0) / 1024), imagensKB: Math.round(img.reduce((a, x) => a + x.bytes, 0) / 1024), imagens: img.length, ...t };
    await ctx.close();
  }
  await b.close(); s.fechar(); console.log(JSON.stringify({ rotulo: process.argv[2] || "", ...out }, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
