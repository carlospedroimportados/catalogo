"use strict";
// Navegador isolado: só 127.0.0.1 passa. Apps Script e InfinitePay são SIMULADOS; o resto é bloqueado.
// Nenhuma requisição real sai daqui — nem pedido, nem cupom, nem pagamento.
const { chromium } = require("playwright");

const HOST_PAGAMENTO_SIMULADO = "pagamento.mock.invalid";

async function abrirNavegador() { return chromium.launch(); }

// cenario: { coupon: resp|fn|"falha-rede", create: ..., confirm: ... }
async function novoContexto(browser, { viewport = { width: 390, height: 844 }, cenario = {} } = {}) {
  const ctx = await browser.newContext({ viewport, locale: "pt-BR", serviceWorkers: "block" });
  const registro = { chamadasApi: [], bloqueadas: [], erros: [], navegouPagamento: [] };
  ctx.cenario = cenario;
  await ctx.route("**/*", async (route) => {
    const req = route.request(), u = new URL(req.url());
    if (u.protocol === "data:" || u.hostname === "127.0.0.1") return route.continue();
    if (u.hostname === "script.google.com") {
      let corpo = null; try { corpo = JSON.parse(req.postData() || "null"); } catch { corpo = req.postData(); }
      const acao = corpo && corpo.action;
      registro.chamadasApi.push({ metodo: req.method(), contentType: req.headers()["content-type"] || null, corpo });
      const r = ctx.cenario[acao];
      if (r === "falha-rede" || r === undefined) return route.abort("failed");
      const resp = typeof r === "function" ? r(corpo) : r;
      return route.fulfill({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(resp) });
    }
    if (u.hostname === HOST_PAGAMENTO_SIMULADO) {
      registro.navegouPagamento.push(u.pathname + u.search);
      return route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Pagamento simulado</title><p>SIMULADO</p>" });
    }
    registro.bloqueadas.push(req.url().slice(0, 120));
    return route.abort("blockedbyclient");
  });
  ctx.on("page", (p) => vigiar(p, registro));
  ctx.registro = registro;
  return ctx;
}

function vigiar(page, registro) {
  page.on("pageerror", (e) => registro.erros.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") registro.erros.push("console: " + m.text().slice(0, 200)); });
}

async function abrirLoja(ctx, url, { limparStorage = true, armazenamento = null } = {}) {
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "load" });
  if (limparStorage || armazenamento) {
    await page.evaluate((a) => { localStorage.clear(); if (a) for (const [k, v] of Object.entries(a)) localStorage.setItem(k, v); }, armazenamento);
    await page.reload({ waitUntil: "load" });
  }
  return page;
}

module.exports = { abrirNavegador, novoContexto, abrirLoja, HOST_PAGAMENTO_SIMULADO };
