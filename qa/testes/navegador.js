"use strict";
// Coletores executados no Chromium para T4–T12. Cada coletor roda igual na REFERÊNCIA e no CANDIDATO;
// o executor compara as duas saídas. Toda chamada ao Apps Script é simulada (lib/navegador.js).
const { novoContexto, abrirLoja, HOST_PAGAMENTO_SIMULADO } = require("../lib/navegador");

const URL_PAG = `https://${HOST_PAGAMENTO_SIMULADO}/checkout?nsu=CP-SIM-0001`;
const CLIENTE = { nome: "Cliente Teste Simulado", cpf: "52998224725", tel: "14999990000", email: "teste@exemplo.invalid" };

const fechar = (p) => p.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
const normalizar = (s, origem) => (typeof s === "string" ? s.split(origem).join("<origem>/") : s);

// ---------- T4: cards ----------
async function cards(browser, url) {
  const ctx = await novoContexto(browser); const p = await abrirLoja(ctx, url);
  const r = await p.evaluate(() => { let g = 0; while (!document.getElementById("more").hidden && g++ < 50) document.getElementById("moreBtn").click();
    return [...document.querySelectorAll("#grid .pc")].sort((a, b) => a.dataset.i - b.dataset.i).map((c) => ({
    i: +c.dataset.i, oculto: c.hidden, marca: c.querySelector(".b")?.textContent, nome: c.querySelector("h4")?.textContent,
    spec: c.querySelector(".s")?.textContent, de: c.querySelector(".pr s")?.textContent ?? null,
    preco: c.querySelector(".pr strong")?.textContent, tag: c.querySelector(".tags")?.textContent || null,
    parcelas: c.querySelector(".inst")?.textContent, acao: c.querySelector(".act")?.textContent.trim(),
    alt: c.querySelector("img")?.alt, srcTam: c.querySelector("img")?.getAttribute("src").length,
  })); });
  await ctx.close(); return { saida: r, erros: ctx.registro.erros, bloqueadas: ctx.registro.bloqueadas };
}

// ---------- T5/T6/T7: filtros, busca, vitrines ----------
async function navegacao(browser, url) {
  const ctx = await novoContexto(browser); const p = await abrirLoja(ctx, url);
  const visiveis = () => p.evaluate(() => {
    let g = 0; while (!document.getElementById("more").hidden && g++ < 50) document.getElementById("moreBtn").click();
    return { cnt: document.getElementById("cnt").textContent, vazio: !document.getElementById("empty").hidden,
      ids: [...document.querySelectorAll("#grid .pc:not([hidden])")].map((c) => +c.dataset.i) };
  });
  const cat = (c) => p.evaluate((c) => document.querySelector(`.seg [data-cat="${c}"]`).click(), c);
  const sel = (id, v) => p.evaluate(([id, v]) => { const s = document.getElementById(id); s.value = v; s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);
  const busca = (q) => p.evaluate((q) => { const e = document.getElementById("q"); e.value = q; e.dispatchEvent(new Event("input", { bubbles: true })); }, q);

  const categorias = {};
  for (const c of ["all", "perfume", "skincare", "cabelo", "bebida", "outros"]) {
    await cat(c);
    const marcas = await p.evaluate(() => [...document.querySelectorAll("#fBrand option")].map((o) => o.textContent));
    categorias[c] = { ...(await visiveis()), marcas };
  }
  await cat("all");
  const marcas = {};
  for (const v of await p.evaluate(() => [...document.querySelectorAll("#fBrand option")].map((o) => o.value))) {
    await sel("fBrand", v); marcas[v] = await visiveis();
  }
  await sel("fBrand", "all");
  const ordens = {};
  for (const v of ["cat", "best", "asc", "desc", "off"]) { await sel("fSort", v); ordens[v] = await visiveis(); }
  await sel("fSort", "cat");
  const buscas = {};
  for (const q of ["club", "CLUB DE NUIT", "ácido", "acido", "baunilha", "rosa jasmim", "fino", "tsubaki", "teste", "xyz-inexistente", "  "]) {
    await busca(q); buscas[q] = await visiveis();
  }
  await busca("");
  const vitrines = await p.evaluate(() => ({
    maisVendidos: [...document.querySelectorAll("#rowBest .pc")].map((c) => +c.dataset.i),
    ofertas: [...document.querySelectorAll("#rowOff .pc")].map((c) => +c.dataset.i),
    novidades: [...document.querySelectorAll("#rowNew .pc")].map((c) => +c.dataset.i),
    rotinas: document.getElementById("routs").innerText,
    atalhosCategoria: [...document.querySelectorAll(".catb")].map((b) => b.innerText.replace(/\s+/g, " ").trim()),
    banners: document.querySelectorAll(".slide").length,
    contatos: document.getElementById("contato").innerText.replace(/\s+/g, " ").trim(),
  }));
  await ctx.close();
  return { saida: { categorias, marcas, ordens, buscas, vitrines }, erros: ctx.registro.erros, bloqueadas: ctx.registro.bloqueadas };
}

// ---------- T8: parcelamento (simulador + tabela de cada produto) ----------
async function parcelamento(browser, url) {
  const ctx = await novoContexto(browser); const p = await abrirLoja(ctx, url);
  const simulador = {};
  for (const v of ["1", "29,99", "30", "59,90", "100", "409", "1.000", "4.287", "12.345,67", "0"]) {
    simulador[v] = await p.evaluate((v) => { const e = document.getElementById("simv"); e.value = v; e.dispatchEvent(new Event("input", { bubbles: true }));
      return [...document.querySelectorAll("#simt tr")].map((tr) => [...tr.cells].map((td) => td.textContent)); }, v);
  }
  const ids = await p.evaluate(() => [...document.querySelectorAll("#grid .pc")].map((c) => +c.dataset.i));
  const produto = {};
  for (const i of ids) {
    produto[i] = await p.evaluate((i) => {
      document.querySelector(`#grid .pc[data-i="${i}"] .ph`).click();
      const b = document.getElementById("pvBody");
      const r = { preco: b.querySelector(".pvp strong")?.textContent, de: b.querySelector(".pvp s")?.textContent ?? null,
        pix: b.querySelector(".pay1 span")?.textContent, resumo: b.querySelector("details.pay1 summary span")?.textContent,
        tabela: [...b.querySelectorAll(".itab tr")].map((tr) => [...tr.cells].map((td) => td.textContent)),
        relacionados: [...b.querySelectorAll("#relTrack .pc")].map((c) => +c.dataset.i),
        titulo: b.querySelector("h3")?.textContent, comprar: b.querySelector("[data-pvbuy]")?.textContent };
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      return r;
    }, i);
  }
  await ctx.close(); return { saida: { simulador, produto }, erros: ctx.registro.erros, bloqueadas: ctx.registro.bloqueadas };
}

// ---------- T9: sacola ----------
async function sacola(browser, url, sacolaExterna) {
  const ctx = await novoContexto(browser); const p = await abrirLoja(ctx, url);
  const clicar = (sel) => p.evaluate((s) => document.querySelector(s).click(), sel);
  const estado = () => p.evaluate(() => ({ badge: document.querySelector(".bagbtn .n").textContent, total: document.getElementById("barTotal").textContent,
    itens: document.getElementById("barN").textContent, barra: document.getElementById("bar").classList.contains("on"),
    storage: Object.fromEntries(Object.keys(localStorage).filter((k) => k.startsWith("cp3_")).sort().map((k) => [k, localStorage.getItem(k)])) }));
  const textoSacola = () => p.evaluate(() => ({ titulo: document.getElementById("bagT").textContent, corpo: document.getElementById("bagBody").innerText }));
  const passos = {};
  passos.inicial = await estado();
  await clicar('#grid .pc[data-i="0"] [data-add]'); passos.add0 = await estado();
  await clicar('#grid .pc[data-i="0"] [data-inc]'); await clicar('#grid .pc[data-i="0"] [data-inc]'); passos.inc0x2 = await estado();
  await clicar('#grid .pc[data-i="88"] [data-add]'); passos.add88 = await estado();
  await clicar('#grid .pc[data-i="0"] [data-dec]'); passos.dec0 = await estado();
  await clicar(".bagbtn"); passos.sacolaAberta = await textoSacola(); await fechar(p);
  await p.reload({ waitUntil: "load" }); passos.aposRecarregar = await estado();
  await clicar('[data-routine="r40"]'); passos.rotina = { ...(await estado()), sacola: await textoSacola() }; await fechar(p);
  for (let k = 0; k < 105; k++) await clicar('#grid .pc[data-i="1"] [data-add], #grid .pc[data-i="1"] [data-inc]');
  passos.limite99 = await estado();
  await clicar(".bagbtn"); await clicar("[data-clear]"); passos.esvaziada = { ...(await estado()), sacola: await textoSacola() }; await fechar(p);
  let compat = null;
  if (sacolaExterna) {
    await p.evaluate((v) => localStorage.setItem("cp3_bag", v), sacolaExterna); await p.reload({ waitUntil: "load" });
    await clicar(".bagbtn"); compat = { ...(await estado()), sacola: await textoSacola() };
  }
  await ctx.close();
  return { saida: { passos, compat }, erros: ctx.registro.erros, bloqueadas: ctx.registro.bloqueadas };
}

// ---------- T10: checkout simulado ----------
const CENARIOS = {
  "C01 Pix · pedido criado com link": { pay: "pix", api: { create: { ok: true, nsu: "CP-SIM-0001", url: URL_PAG } }, espera: "pagamento" },
  "C02 Cartão 1x · link": { pay: "card", inst: 1, api: { create: { ok: true, nsu: "CP-SIM-0001", url: URL_PAG } }, espera: "pagamento" },
  "C03 Cartão 6x · link": { pay: "card", inst: 6, api: { create: { ok: true, nsu: "CP-SIM-0001", url: URL_PAG } }, espera: "pagamento" },
  "C04 Cartão 12x · servidor devolve total": { pay: "card", inst: 12, api: { create: { ok: true, nsu: "CP-SIM-0001", url: URL_PAG, total: 1500.01 } }, espera: "pagamento" },
  "C05 Cupom 10% + Pix": { pay: "pix", cupom: "TESTE10", api: { coupon: { ok: true, code: "TESTE10", tipo: "%", valor: 10, min: 0, label: "10% de desconto" }, create: { ok: true, nsu: "CP-SIM-0001", url: URL_PAG } }, espera: "pagamento" },
  "C06 Cupom R$ 20 (mín. R$ 100) + cartão 12x": { pay: "card", inst: 12, cupom: "TESTE20", api: { coupon: { ok: true, code: "TESTE20", tipo: "R$", valor: 20, min: 100, label: "R$ 20 de desconto" }, create: { ok: true, nsu: "CP-SIM-0001", url: URL_PAG } }, espera: "pagamento" },
  "C07 Cupom acima do mínimo não atingido": { pay: "pix", cupom: "MIN5000", sacola: '{"57":1}', api: { coupon: { ok: true, code: "MIN5000", tipo: "%", valor: 15, min: 5000, label: "15% acima de R$ 5.000" } }, semEnvio: true },
  "C08 Cupom inválido": { pay: "pix", cupom: "NAOEXISTE", api: { coupon: { ok: false, error: "Cupom inválido ou expirado." } }, semEnvio: true },
  "C09 Cupom com falha de rede": { pay: "pix", cupom: "QUALQUER", api: { coupon: "falha-rede" }, semEnvio: true },
  "C10 Erro do servidor ao criar (Pix)": { pay: "pix", api: { create: { ok: false, error: "Produto indisponível no momento." } }, espera: "alerta" },
  "C11 Erro do servidor ao criar (cartão)": { pay: "card", inst: 3, api: { create: { ok: false, error: "Falha temporária.", nsu: "CP-SIM-0009" } }, espera: "concluido" },
  "C12 Servidor rejeita cupom no pedido": { pay: "pix", cupom: "TESTE10", api: { coupon: { ok: true, code: "TESTE10", tipo: "%", valor: 10, min: 0, label: "10%" }, create: { ok: false, couponError: true, error: "Cupom esgotado." } }, espera: "cupom" },
  "C13 Sem rede · Pix offline": { pay: "pix", api: { create: "falha-rede" }, espera: "concluido" },
  "C14 Sem rede · cartão via WhatsApp": { pay: "card", inst: 12, api: { create: "falha-rede" }, espera: "concluido" },
  "C15 Pedido criado sem link (Pix local)": { pay: "pix", api: { create: { ok: true, nsu: "CP-SIM-0002" } }, espera: "concluido" },
  "C16 Formulário vazio (validação)": { pay: "pix", vazio: true, api: {}, semEnvio: true, envioDireto: true },
};

async function checkout(browser, url, nome) {
  const c = CENARIOS[nome];
  const ctx = await novoContexto(browser, { cenario: c.api });
  const p = await abrirLoja(ctx, url, { armazenamento: { cp3_bag: c.sacola || '{"0":1,"88":2}' } });
  const origem = new URL(url).origin + "/";
  await p.click(".bagbtn"); await p.click('[data-step="checkout"]');
  if (!c.vazio) {
    await p.fill("#f_name", CLIENTE.nome); await p.fill("#f_cpf", CLIENTE.cpf); await p.fill("#f_phone", CLIENTE.tel); await p.fill("#f_email", CLIENTE.email);
    await p.check("#f_consent");
  }
  if (c.cupom) {
    await p.fill("#f_cup", c.cupom); await p.click("[data-cupok]");
    await p.waitForFunction(() => !document.querySelector("[data-cupok]") || !document.querySelector("[data-cupok]").disabled);
  }
  if (c.pay === "card") { await p.click('[data-pay="card"]'); if (c.inst) await p.selectOption("#instSel", String(c.inst)); }
  const antes = await p.evaluate(() => document.getElementById("bagBody").innerText);
  let depois = null, pix = null, whatsapp = [], destino = null;
  if (!c.semEnvio || c.envioDireto) {
    await p.click("[data-submit]");
    if (c.espera === "pagamento") {
      await p.waitForSelector("#bagBody .done", { timeout: 10000 });
      depois = await p.evaluate(() => document.getElementById("bagBody").innerText);
      await p.waitForURL((u) => u.hostname === "pagamento.mock.invalid", { timeout: 10000 });
      destino = p.url();
    } else {
      await p.waitForTimeout(400);
      await p.waitForFunction(() => !document.querySelector("[data-submit][disabled]"), null, { timeout: 10000 }).catch(() => {});
      depois = await p.evaluate(() => document.getElementById("bagBody").innerText);
      pix = await p.evaluate(() => document.getElementById("pixcode")?.value ?? null);
      whatsapp = await p.evaluate(() => [...document.querySelectorAll("#bagBody a.wa")].map((a) => a.href));
    }
  }
  const storage = c.espera === "pagamento" ? null : await p.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter((k) => k.startsWith("cp3_")).sort().map((k) => [k, localStorage.getItem(k)])));
  const chamadas = ctx.registro.chamadasApi.map((x) => ({ ...x, corpo: x.corpo && x.corpo.returnUrl !== undefined ? { ...x.corpo, returnUrl: normalizar(x.corpo.returnUrl, origem) } : x.corpo }));
  await ctx.close();
  const erros = ctx.registro.erros.filter((e) => !/Failed to load resource|ERR_FAILED/.test(e));
  return { saida: { chamadas, antes, depois, pix, whatsapp: whatsapp.map(decodeURIComponent), destino, storage }, erros, bloqueadas: ctx.registro.bloqueadas };
}

// ---------- T11: retorno da InfinitePay ----------
const RETORNOS = {
  "R1 Pago · confirmação aprovada": { qs: "?pedido=CP-SIM-0001&transaction_nsu=TX-SIM-1&slug=sim&receipt_url=https%3A%2F%2Fpagamento.mock.invalid%2Frecibo", api: { confirm: { status: "Aprovado" } } },
  "R2 Pago · confirmação pendente": { qs: "?order_nsu=CP-SIM-0002&transaction_nsu=TX-SIM-2&slug=sim", api: { confirm: { status: "Pendente" } } },
  "R3 Volta sem pagamento": { qs: "?pedido=CP-SIM-0003", api: {} },
  "R4 Confirmação com falha de rede": { qs: "?pedido=CP-SIM-0004&transaction_nsu=TX-SIM-4", api: { confirm: "falha-rede" } },
  "R5 [segurança] receipt_url não-https": { qs: "?pedido=CP-SIM-0005&receipt_url=javascript%3Avoid(0)", api: {}, seguranca: true },
};

async function retorno(browser, url, nome) {
  const r = RETORNOS[nome];
  const ctx = await novoContexto(browser, { cenario: r.api });
  const p = await abrirLoja(ctx, url, { armazenamento: { cp3_bag: '{"0":1}' } });
  await p.goto(url + r.qs, { waitUntil: "load" });
  await p.waitForTimeout(600);
  const s = await p.evaluate(() => ({ titulo: document.getElementById("bagT").textContent, corpo: document.getElementById("bagBody").innerText,
    comprovante: document.querySelector("#bagBody a.btn-line")?.getAttribute("href") ?? null,
    urlFinal: location.pathname + location.search, sacola: localStorage.getItem("cp3_bag") }));
  const chamadas = ctx.registro.chamadasApi;
  await ctx.close();
  const erros = ctx.registro.erros.filter((e) => !/Failed to load resource|ERR_FAILED/.test(e));
  return { saida: { ...s, chamadas }, erros, bloqueadas: ctx.registro.bloqueadas, seguranca: r.seguranca ? /^javascript:/i.test(s.comprovante || "") : null };
}

// ---------- T12: imagens renderizadas + capturas ----------
async function visual(browser, url, prefixo, pastaCapturas) {
  const out = {};
  const ctx = await novoContexto(browser);
  const p = await abrirLoja(ctx, url);
  out.decodificacao = await p.evaluate(async () => {
    const srcs = [...new Set([...document.querySelectorAll("img")].map((i) => i.getAttribute("src")))];
    let ok = 0, falhas = 0;
    for (const s of srcs) { const im = new Image(); im.src = s; try { await im.decode(); if (im.naturalWidth > 0) ok++; else falhas++; } catch { falhas++; } }
    return { imgs: document.querySelectorAll("img").length, distintas: srcs.length, ok, falhas };
  });
  out.semAlt = await p.evaluate(() => [...document.querySelectorAll("#grid img")].filter((i) => !i.alt).length);
  await p.evaluate(() => document.querySelector('#grid .pc[data-i="0"] .ph').click());
  out.modal = await p.evaluate(() => { const i = document.querySelector("#pvBody .pvimg img"); return { largura: i.naturalWidth, altura: i.naturalHeight, completa: i.complete }; });
  await fechar(p);
  await p.evaluate(() => document.querySelector('#grid .pc[data-i="88"] [data-add]').click());
  await p.click(".bagbtn");
  out.miniaturaSacola = await p.evaluate(() => [...document.querySelectorAll("#bagBody .th img")].map((i) => i.naturalWidth > 0));
  await fechar(p);
  out.rotinas = await p.evaluate(() => [...document.querySelectorAll("#routs img")].every((i) => i.complete && i.naturalWidth > 0));
  await ctx.close();
  out.erros = ctx.registro.erros;

  // Capturas (movimento reduzido para o carrossel não variar entre execuções).
  const capturas = {};
  for (const [nome, vp] of [["celular", { width: 390, height: 844 }], ["desktop", { width: 1366, height: 900 }]]) {
    const c2 = await browser.newContext({ viewport: vp, locale: "pt-BR", reducedMotion: "reduce", deviceScaleFactor: 1, serviceWorkers: "block" });
    await c2.route("**/*", (rt) => (new URL(rt.request().url()).hostname === "127.0.0.1" || rt.request().url().startsWith("data:") ? rt.continue() : rt.abort()));
    const q = await c2.newPage(); await q.goto(url, { waitUntil: "load" });
    await q.evaluate(() => localStorage.clear()); await q.reload({ waitUntil: "load" });
    await q.addStyleTag({ content: "*{caret-color:transparent!important}" });
    const shot = async (sufixo) => { const f = `${pastaCapturas}/${prefixo}-${nome}-${sufixo}.png`; const b = await q.screenshot({ path: f }); capturas[`${nome}-${sufixo}`] = require("crypto").createHash("sha256").update(b).digest("hex"); };
    await shot("1-topo");
    await q.evaluate(() => document.getElementById("catalogo").scrollIntoView()); await q.waitForTimeout(800); await shot("2-catalogo");
    await q.evaluate(() => { window.scrollTo(0, 0); document.querySelector('#grid .pc[data-i="1"] .ph').click(); }); await q.waitForTimeout(500); await shot("3-produto");
    await q.evaluate(() => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); document.querySelector('#grid .pc[data-i="1"] [data-add]').click(); document.querySelector(".bagbtn").click(); });
    await q.waitForTimeout(500); await shot("4-sacola");
    await c2.close();
  }
  out.capturas = capturas;
  return { saida: out, erros: out.erros, bloqueadas: [] };
}

// Compara duas capturas no próprio Chromium: % de pixels com diferença perceptível (> 24/255 em algum canal).
async function compararCapturas(browser, arqA, arqB) {
  const fs = require("fs");
  const ctx = await browser.newContext(); const p = await ctx.newPage();
  await p.route("**/*", (r) => r.abort());
  const r = await p.evaluate(async ([a, b]) => {
    const img = (s) => new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = s; });
    const [x, y] = await Promise.all([img(a), img(b)]);
    if (x.width !== y.width || x.height !== y.height) return { mesmasDimensoes: false, pct: 100 };
    const px = (i) => { const c = document.createElement("canvas"); c.width = i.width; c.height = i.height; const g = c.getContext("2d"); g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; };
    const A = px(x), B = px(y); let n = 0;
    for (let k = 0; k < A.length; k += 4) if (Math.abs(A[k] - B[k]) > 24 || Math.abs(A[k + 1] - B[k + 1]) > 24 || Math.abs(A[k + 2] - B[k + 2]) > 24) n++;
    return { mesmasDimensoes: true, pct: (100 * n) / (A.length / 4) };
  }, [arqA, arqB].map((f) => "data:image/png;base64," + fs.readFileSync(f).toString("base64")));
  await ctx.close(); return r;
}

// ---------- métricas para T14 ----------
async function metricas(browser, url) {
  const ctx = await novoContexto(browser); const p = await ctx.newPage();
  let req = 0; p.on("request", () => req++);
  await p.goto(url, { waitUntil: "load" });
  const t = await p.evaluate(() => { const n = performance.getEntriesByType("navigation")[0]; return { dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd) }; });
  await ctx.close(); return { ...t, requisicoes: req };
}

module.exports = { compararCapturas, cards, navegacao, parcelamento, sacola, checkout, retorno, visual, metricas, CENARIOS, RETORNOS };
