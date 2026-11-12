#!/usr/bin/env node
"use strict";
// Auditoria automática de SEO, acessibilidade e peso: loja atual (Fase 1) × protótipo. Somente leitura.
const path = require("path");
const { RAIZ } = require("../lib/util");
const { iniciar } = require("../lib/servidor");
const { abrirNavegador, novoContexto } = require("../lib/navegador");
const N = require("../testes/navegador");
(async () => {
  const s = await iniciar(RAIZ); const browser = await abrirNavegador(); const out = {};
  for (const [nome, url] of [["loja", s.url], ["prototipo", s.url + "qa/prototipo-fase2/"]]) {
    const ctx = await novoContexto(browser); const p = await ctx.newPage(); await p.goto(url, { waitUntil: "load" });
    const a = await p.evaluate(() => {
      const q = (s) => [...document.querySelectorAll(s)], nomeAcess = (e) => (e.getAttribute("aria-label") || e.textContent || e.title || "").trim() || [...e.querySelectorAll("img")].map((i) => i.alt).join("");
      const meta = (n) => document.querySelector(`meta[name="${n}"],meta[property="${n}"]`)?.content ?? null;
      return { titulo: document.title, descricao: (meta("description") || "").length, lang: document.documentElement.lang, canonical: !!document.querySelector('link[rel=canonical]'),
        og: q('meta[property^="og:"]').length, jsonld: q('script[type="application/ld+json"]').length, favicon: !!document.querySelector('link[rel~=icon]'), manifest: !!document.querySelector('link[rel=manifest]'),
        h1: q("h1").length, h2: q("h2").length, h3: q("h3").length, h4: q("h4").length,
        imgs: q("img").length, semAlt: q("img:not([alt])").length, altVazio: q('img[alt=""]').length, semDimensoes: q("img:not([width])").length, lazy: q('img[loading="lazy"]').length,
        botoesSemNome: q("button").filter((e) => !nomeAcess(e)).length, linksSemNome: q("a[href]").filter((e) => !nomeAcess(e)).length,
        camposSemRotulo: q("input,select").filter((e) => !e.closest("label") && !e.getAttribute("aria-label") && !(e.id && document.querySelector(`label[for="${e.id}"]`))).length,
        marcos: { header: q("header").length, nav: q("nav").length, main: q("main").length, footer: q("footer").length },
        linksProduto: q('a[href*="produto"]').length };
    });
    await ctx.close(); out[nome] = { ...a, carga: await N.metricas(browser, url) };
  }
  await browser.close(); s.fechar(); console.log(JSON.stringify(out, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
