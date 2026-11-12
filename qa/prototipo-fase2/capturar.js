#!/usr/bin/env node
"use strict";
// Capturas do protótipo em desktop e celular. Rede externa bloqueada; servidor de pedidos simulado.
// Uso: node qa/prototipo-fase2/capturar.js [pasta-de-saida]
const fs = require("fs");
const path = require("path");
const { iniciar } = require("../lib/servidor");
const { abrirNavegador, novoContexto } = require("../lib/navegador");

// Alvo: protótipo (padrão) ou a loja redesenhada (--alvo loja → qa/relatorio-fase2/capturas).
const LOJA = process.argv.includes("--alvo") && process.argv[process.argv.indexOf("--alvo") + 1] === "loja";
const SAIDA = LOJA ? path.resolve(__dirname, "..", "relatorio-fase2", "capturas") : path.join(__dirname, "capturas");
const API = { coupon: { ok: true, code: "PROTOTIPO10", tipo: "%", valor: 10, min: 0, label: "10% de desconto (cupom de demonstração)" } };

(async () => {
  fs.mkdirSync(SAIDA, { recursive: true });
  const srv = await iniciar(path.resolve(__dirname, "..", ".."));
  const url = srv.url + (LOJA ? "" : "qa/prototipo-fase2/");
  const browser = await abrirNavegador();
  const erros = [];
  for (const [nome, viewport, escala] of [["desktop", { width: 1440, height: 900 }, 1], ["tablet", { width: 768, height: 1024 }, 1], ["celular", { width: 390, height: 844 }, 2]]) {
    const ctx = await novoContexto(browser, { viewport, cenario: API });
    const p = await ctx.newPage();
    await p.emulateMedia({ reducedMotion: "reduce" });
    await p.goto(url, { waitUntil: "load" });
    await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "load" });
    await p.evaluate(() => document.fonts.ready);
    const foto = async (arq, opcoes = {}) => { await p.waitForTimeout(450); await p.screenshot({ path: path.join(SAIDA, `${nome}-${arq}.png`), ...opcoes }); };
    const clique = (sel) => p.evaluate((s) => document.querySelector(s).click(), sel);
    const fechar = () => p.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); ok(); }))));
    const ir = async (sel) => { await p.evaluate((s) => { const e = document.querySelector(s); window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 20); }, sel); };

    await foto("01-inicio");
    for (const k of [1, 2, 3]) { await clique(`#dots [data-sl="${k}"]`); await foto(`02-banner-${k + 1}`, { clip: { x: 0, y: 0, width: viewport.width, height: Math.min(viewport.height, 820) } }); }
    await clique('#dots [data-sl="0"]');
    await ir(".garantias"); await foto("03-garantias-categorias");
    await ir("#maisvendidos"); await foto("04-mais-vendidos");
    await ir("#rotinas"); await foto("05-rotinas");
    await clique('.seg [data-cat="perfume"]'); await ir("#catalogo"); await foto("06-catalogo");
    await p.fill("#q", "woman"); await p.waitForTimeout(150); await ir("#catalogo"); await foto("06b-catalogo-filtrado");
    await clique(".limpar");
    await ir("#pagamento"); await foto("07-pagamento");
    await ir("#contato"); await foto("08-contato-rodape");
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await foto("09-rodape");
    await p.evaluate(() => window.scrollTo(0, 0));
    await clique('#grid .pc[data-i="0"] .ph'); await foto("10-produto");
    await p.evaluate(() => { document.querySelector("#pv .sh-b").scrollTop = 520; }); await foto("11-produto-notas");
    await fechar();
    await clique('#grid .pc[data-i="102"] [data-add]'); await clique('#grid .pc[data-i="57"] [data-add]');
    await p.evaluate(() => window.scrollTo(0, 0)); await foto("12-barra-da-sacola");
    await clique(".bagbtn"); await foto("13-sacola");
    await clique('[data-step="checkout"]'); await foto("14-checkout");
    await p.fill("#f_cup", "PROTOTIPO10"); await clique("[data-cupok]"); await p.waitForTimeout(300);
    await clique('[data-pay="card"]');
    await p.evaluate(() => { document.getElementById("bagBody").scrollTop = 9999; }); await foto("15-checkout-cartao-cupom");
    await clique("[data-submit]"); await p.evaluate(() => { document.getElementById("bagBody").scrollTop = 0; }); await foto("16-checkout-validacao");
    erros.push(...ctx.registro.erros.map((e) => `${nome}: ${e}`), ...ctx.registro.bloqueadas.map((e) => `${nome}: bloqueada ${e}`));
    await ctx.close();
  }
  await browser.close(); srv.fechar();
  console.log(`Capturas em ${path.relative(process.cwd(), SAIDA)} · erros/requisições externas: ${erros.length}`);
  erros.slice(0, 10).forEach((e) => console.log("  " + e));
})().catch((e) => { console.error(e); process.exit(1); });
