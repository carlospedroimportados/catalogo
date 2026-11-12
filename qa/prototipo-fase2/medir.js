#!/usr/bin/env node
"use strict";
// Mede o primeiro carregamento da loja (raiz) e de uma página de produto no celular, com densidade de pixels 1x, 2x e 3x.
// Também mede CLS (deslocamento de layout, rolando a página até o fim) e LCP. Rede externa bloqueada.
// Uso: node qa/prototipo-fase2/medir.js [rótulo] [--raiz <pasta>]  → imprime JSON.
const path = require("path");
const { RAIZ } = require("../lib/util");
const { iniciar } = require("../lib/servidor");
const { abrirNavegador } = require("../lib/navegador");
(async () => {
  const raizArg = process.argv.includes("--raiz") ? path.resolve(process.argv[process.argv.indexOf("--raiz") + 1]) : RAIZ;
  const s = await iniciar(raizArg), b = await abrirNavegador(), out = {};
  const alvos = { inicio: s.url, produto: s.url + "produto/armaf-club-de-nuit-woman/" };
  for (const [nome, url] of Object.entries(alvos)) for (const dpr of [1, 2, 3]) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: dpr, serviceWorkers: "block", locale: "pt-BR" });
    await ctx.route("**/*", (r) => (new URL(r.request().url()).hostname === "127.0.0.1" ? r.continue() : r.abort()));
    const p = await ctx.newPage(), res = [];
    await p.addInitScript(() => { window.__cls = 0; window.__lcp = 0;
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = Math.round(e.startTime); }).observe({ type: "largest-contentful-paint", buffered: true }); });
    p.on("response", async (r) => { try { res.push({ tipo: r.request().resourceType(), url: r.url(), bytes: (await r.body()).length }); } catch { /* sem corpo */ } });
    await p.goto(url, { waitUntil: "load" }); await p.waitForLoadState("networkidle");
    if (nome === "inicio") { await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((ok) => setTimeout(ok, 60)); } scrollTo(0, 0); }); await p.waitForLoadState("networkidle"); }
    const t = await p.evaluate(() => { const n = performance.getEntriesByType("navigation")[0]; return { dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd), lcp: window.__lcp, cls: Math.round(window.__cls * 1000) / 1000 }; });
    const img = res.filter((x) => x.tipo === "image");
    out[`${nome} ${dpr}x`] = { requisicoes: res.length, totalKB: Math.round(res.reduce((a, x) => a + x.bytes, 0) / 1024), imagensKB: Math.round(img.reduce((a, x) => a + x.bytes, 0) / 1024), imagens: img.length, ...t };
    await ctx.close();
  }
  await b.close(); s.fechar(); console.log(JSON.stringify({ rotulo: process.argv[2] || "", ...out }, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
