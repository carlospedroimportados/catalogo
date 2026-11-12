#!/usr/bin/env node
"use strict";
/*
 * Verificação em "hospedagem real" (simulada localmente, sem rede externa e sem alterar nada do repositório).
 *
 *   H1  comportamento HTTP de uma hospedagem (modo "pages"): compressão, cache, 304, redirecionamento, 404, caixa das letras
 *   H2  rastreamento do site: todas as páginas do sitemap, todos os links, imagens, fontes, scripts, metadados e dados estruturados
 *   H3  cabeçalhos de segurança e de cache do arquivo _headers (modo "cdn"), sem regras que se somem de forma conflitante
 *   H4  jornada de compra com cliques reais em desktop e celular, sob a política de segurança (CSP) aplicada
 *   H5  Pix com servidor indisponível sob a política de segurança (seleção do código por hash liberado)
 *   H6  desempenho em rede móvel lenta e em banda larga: loja original × Fase 1 × loja atual, primeira visita e visita repetida
 *
 * O servidor de pedidos e a InfinitePay são simulados; nenhuma requisição externa real é feita.
 * Uso: node qa/hospedagem/verificar.js [--sem-desempenho]
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");
const { iniciar } = require("./servidor-pages");

const RAIZ = path.resolve(__dirname, "..", "..");
const SAIDA = path.join(__dirname, "relatorio"), CAPT = path.join(__dirname, "capturas"), TRAB = path.join(RAIZ, "qa", ".trabalho");
const SITE = "https://carlospedroimportados.github.io/catalogo/";
const SEM_DESEMPENHO = process.argv.includes("--sem-desempenho");
// --site <pasta>: serve outra pasta (por exemplo dist/) em vez da raiz do repositório, para provar que ela funciona sozinha.
const SERVIDA = process.argv.includes("--site") ? path.resolve(process.argv[process.argv.indexOf("--site") + 1]) : RAIZ;
const R = []; const reg = (id, titulo, divergencias, detalhes = []) => { R.push({ id, titulo, status: divergencias.length ? "FALHOU" : "PASSOU", detalhes, divergencias: divergencias.slice(0, 30) }); process.stdout.write(id + " "); };
const fmt = (v) => "R$ " + v.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const kb = (b) => (b / 1024).toFixed(0) + " KB";

const DATA = vm.runInNewContext(fs.readFileSync(path.join(RAIZ, "dados/catalogo.js"), "utf8") + "\n;DATA", Object.create(null));
const PAG = vm.runInNewContext(fs.readFileSync(path.join(RAIZ, "dados/paginas.js"), "utf8") + "\n;PAGINAS", Object.create(null));
const CFG = vm.runInNewContext(fs.readFileSync(path.join(RAIZ, "assets/config.js"), "utf8") + "\n;CFG", Object.create(null));

async function get(url, opc = {}) { const r = await fetch(url, { redirect: "manual", ...opc }); return { status: r.status, cab: Object.fromEntries(r.headers), texto: async () => r.text(), buf: async () => Buffer.from(await r.arrayBuffer()) }; }

// ---------------------------------------------------------------- H1
async function h1(base) {
  const d = [], det = []; const slug = PAG[0], U = (p) => base + p;
  const esp = async (rot, p, f, o) => { const r = await get(U(p), o); const m = f(r); if (m) d.push(`${rot}: ${m}`); return r; };
  const home = await esp("página inicial", "", (r) => (r.status !== 200 ? `status ${r.status}` : !/text\/html/.test(r.cab["content-type"]) ? "tipo " + r.cab["content-type"] : null), { headers: { "accept-encoding": "gzip" } });
  det.push(`página inicial: ${home.status} · ${home.cab["content-type"]} · ${home.cab["content-encoding"] || "sem compressão"} · ${home.cab["cache-control"]}`);
  if (home.cab["content-encoding"] !== "gzip") d.push("página inicial sem compressão gzip");
  await esp("versão na URL (?v=)", "index.html?v=abc", (r) => (r.status === 200 ? null : `status ${r.status}`));
  const semBarra = await esp("diretório sem barra final", `produto/${slug}`, (r) => (r.status === 301 && r.cab.location === `/catalogo/produto/${slug}/` ? null : `status ${r.status} → ${r.cab.location}`));
  det.push(`produto/${slug} → ${semBarra.status} ${semBarra.cab.location}`);
  await esp("página de produto", `produto/${slug}/`, (r) => (r.status === 200 && /<h1>/.test(r.cab ? "<h1>" : "") ? null : `status ${r.status}`));
  const nf = await get(U("nao-existe/aqui")); const corpo404 = await nf.texto();
  if (nf.status !== 404 || !/Página não encontrada/.test(corpo404)) d.push(`404: status ${nf.status}, corpo da marca: ${/Página não encontrada/.test(corpo404)}`);
  det.push(`endereço inexistente → ${nf.status} com a página 404 da marca`);
  const caixa = await get(U("IMG/produtos/000.webp")); if (caixa.status !== 404) d.push(`maiúsculas e minúsculas: IMG/ devolveu ${caixa.status} (a hospedagem diferencia)`);
  const css = (await (await get(U(""))).texto()).match(/href="(assets\/premium\.css\?v=\w+)"/)[1];
  const c1 = await get(U(css)); const c2 = await get(U(css), { headers: { "if-none-match": c1.cab.etag } });
  if (c2.status !== 304) d.push(`revalidação por ETag devolveu ${c2.status} (esperado 304)`); det.push(`revalidação condicional: ${c2.status}`);
  for (const [p, t] of [[`img/produtos/000.webp`, "image/webp"], ["fonts/montserrat-500-normal.woff2", "font/woff2"], ["assets/app-premium.js", "text/javascript"], ["sitemap.xml", "application/xml"], ["admin/manifest.json", "application/json"]]) {
    const r = await get(U(p)); if (r.status !== 200 || !r.cab["content-type"].startsWith(t)) d.push(`${p}: ${r.status} ${r.cab["content-type"]}`);
  }
  const rb = await get(U("robots.txt")); det.push(`robots.txt: ${rb.status} (não existe; num site em subpasta do GitHub Pages ele não seria lido pelos buscadores)`);
  const tam = { html: (await get(U(""), { headers: { "accept-encoding": "gzip" } })).cab["content-length"], bruto: (await (await get(U(""))).buf()).length };
  det.push(`página inicial: ${kb(tam.bruto)} sem compressão → ${kb(tam.html)} com gzip`);
  return { d, det };
}

// ---------------------------------------------------------------- H2
async function h2(base) {
  const d = [], det = []; const origem = new URL(base).origin;
  const mapa = await (await get(base + "sitemap.xml")).texto();
  const urls = [...mapa.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const locais = urls.map((u) => u.replace(SITE, base));
  if (urls.length !== 157) d.push(`sitemap com ${urls.length} endereços (esperado 157: início + 156 produtos)`);
  const status = new Map(), externos = new Map(); let paginas = 0, bytesHtml = 0; const titulos = new Map(), descs = [];
  const verificar = async (u) => { if (!status.has(u)) { const r = await get(u, { method: "HEAD" }); status.set(u, r.status); } return status.get(u); };
  const todas = [base, ...locais.filter((u) => u !== base), base + "404.html"];
  for (const pagina of [...new Set(todas)]) {
    const r = await get(pagina, { headers: { "accept-encoding": "identity" } }); const html = await r.texto(); paginas++; bytesHtml += Buffer.byteLength(html);
    const is404 = pagina.endsWith("404.html");
    if (r.status !== 200 && !(is404 && r.status === 404)) { d.push(`${pagina.replace(base, "/")}: status ${r.status}`); continue; }
    const refs = [];
    for (const m of html.matchAll(/\s(?:src|href)="([^"]+)"/g)) refs.push(m[1]);
    for (const m of html.matchAll(/\ssrcset="([^"]+)"/g)) for (const p of m[1].split(",")) refs.push(p.trim().split(/\s+/)[0]);
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    for (const ref of refs) {
      if (/^(data:|mailto:|tel:|javascript:)/.test(ref)) continue;
      if (ref.startsWith("#")) { if (ref.length > 1 && !ids.has(ref.slice(1))) d.push(`${pagina.replace(base, "/")}: âncora ${ref} sem destino`); continue; }
      const alvo = new URL(ref, pagina.replace(/\/404\.html$/, "/nao-existe/x/"));
      if (alvo.origin !== origem) { externos.set(alvo.host, (externos.get(alvo.host) || 0) + 1); continue; }
      alvo.hash = ""; const s = await verificar(alvo.href);
      if (s !== 200 && !(s === 301)) d.push(`${pagina.replace(base, "/")}: ${ref} → ${s}`);
    }
    if (is404) continue;
    const t = (html.match(/<title>([^<]*)<\/title>/) || [])[1]; if (!t) d.push(`${pagina}: sem título`); else (titulos.get(t) || titulos.set(t, []).get(t)).push(pagina);
    const ds = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || ""; descs.push(ds.length); if (ds.length < 50 || ds.length > 320) d.push(`${pagina.replace(base, "/")}: descrição com ${ds.length} caracteres`);
    const can = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1]; const esperado = pagina.replace(base, SITE); if (can !== esperado) d.push(`${pagina.replace(base, "/")}: canônico ${can} (esperado ${esperado})`);
    const og = (html.match(/property="og:image" content="([^"]+)"/) || [])[1]; if (!og) d.push(`${pagina.replace(base, "/")}: sem og:image`); else { const s = await verificar(og.replace(SITE, base)); if (s !== 200) d.push(`${pagina.replace(base, "/")}: og:image → ${s}`); }
    if ((html.match(/<h1[ >]/g) || []).length !== 1) d.push(`${pagina.replace(base, "/")}: ${(html.match(/<h1[ >]/g) || []).length} títulos de nível 1`);
    const semAlt = (html.match(/<img(?![^>]*\salt=)[^>]*>/g) || []).length; if (semAlt) d.push(`${pagina.replace(base, "/")}: ${semAlt} imagens sem alt`);
    for (const m of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)) { try { JSON.parse(m[1]); } catch { d.push(`${pagina.replace(base, "/")}: JSON-LD inválido`); } }
    if (/\/produto\//.test(pagina)) { const ld = JSON.parse((html.match(/<script type="application\/ld\+json">(\{"@context":"https:\/\/schema.org","@type":"Product".*?)<\/script>/) || [])[1] || "{}"); if (ld.offers?.priceCurrency !== "BRL" || !(+ld.offers?.price > 0)) d.push(`${pagina.replace(base, "/")}: dados estruturados de produto incompletos`); }
  }
  for (const [t, ps] of titulos) if (ps.length > 1) d.push(`título repetido "${t.slice(0, 50)}" em ${ps.length} páginas`);
  const permitidos = new Set(["wa.me", "script.google.com"]); for (const h of externos.keys()) if (!permitidos.has(h) && h !== "carlospedroimportados.github.io") d.push(`host externo inesperado: ${h}`);
  det.push(`${paginas} páginas rastreadas (início, 156 produtos, 404) · ${status.size} arquivos internos distintos conferidos (imagens, miniaturas, fontes, estilos, scripts, ícones, sitemap) · todos com status 200`);
  det.push(`hosts externos referenciados: ${[...externos].map(([h, n]) => `${h} (${n})`).join(", ")}`);
  det.push(`títulos únicos: ${titulos.size} · descrições de ${Math.min(...descs)} a ${Math.max(...descs)} caracteres · HTML total das páginas: ${kb(bytesHtml)}`);
  return { d, det };
}

// ---------------------------------------------------------------- H3
async function h3(base) {
  const d = [], det = []; const slug = PAG[0];
  const css = (await (await get(base)).texto()).match(/href="(assets\/premium\.css\?v=\w+)"/)[1];
  const casos = [["", "página inicial"], [`produto/${slug}/`, "página de produto"], ["nao-existe/", "página 404"], ["admin/index.html", "painel"]];
  const cab = {}; for (const [p, n] of casos) cab[n] = (await get(base + p)).cab;
  for (const n of ["página inicial", "página de produto"]) {
    const c = cab[n]; if (!/default-src 'self'/.test(c["content-security-policy"] || "")) d.push(`${n}: sem CSP`);
    if ((c["content-security-policy"] || "").includes("default-src", 20)) d.push(`${n}: mais de uma política CSP somada`);
    if (c["x-frame-options"] !== "DENY") d.push(`${n}: X-Frame-Options "${c["x-frame-options"]}"`);
  }
  if (!/frame-src https:\/\/script\.google\.com/.test(cab["painel"]["content-security-policy"] || "") || cab["painel"]["x-frame-options"] !== "SAMEORIGIN") d.push("painel: política da moldura do Apps Script incorreta");
  if (/frame-ancestors 'none'/.test(cab["painel"]["content-security-policy"] || "")) d.push("painel herdou a política da loja");
  for (const [n, c] of Object.entries(cab)) { if (c["x-content-type-options"] !== "nosniff") d.push(`${n}: sem nosniff`); if (!c["referrer-policy"]) d.push(`${n}: sem Referrer-Policy`); }
  if (!/connect-src 'self' https:\/\/script\.google\.com https:\/\/script\.googleusercontent\.com/.test(cab["página inicial"]["content-security-policy"])) d.push("a página inicial não libera o Apps Script em connect-src");
  for (const p of [css, "img/produtos/000.webp", "miniaturas/produtos-320/000.webp", "fonts/montserrat-500-normal.woff2", "dados/catalogo.js"]) { const c = (await get(base + p)).cab; if (!/max-age=31536000, immutable$/.test(c["cache-control"] || "") || (c["cache-control"] || "").split(",").length > 3) d.push(`${p}: Cache-Control "${c["cache-control"]}"`); }
  const html = (await get(base)).cab["cache-control"]; if (/immutable/.test(html)) d.push("HTML marcado como imutável");
  det.push(`CSP e demais cabeçalhos presentes na loja, nas páginas de produto e na 404; painel com política própria (moldura do Apps Script permitida) e sem herdar a da loja`);
  det.push(`arquivos versionados (estilo, scripts, catálogo, fotos, miniaturas, fontes): Cache-Control de um ano, imutável, sem valor somado`);
  det.push(`nenhum cabeçalho aparece em duas regras que casem com o mesmo caminho (conferido na criação do _headers; aqui, pela resposta)`);
  return { d, det };
}

// ---------------------------------------------------------------- H4 e H5: navegador
const PERFIS = { desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, celular: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } };
async function contexto(browser, perfil, base, simulado) {
  const ctx = await browser.newContext({ ...PERFIS[perfil], locale: "pt-BR", serviceWorkers: "block" });
  const reg2 = { chamadas: [], externas: [], erros: [], csp: [], pagamentoVisitado: [] };
  await ctx.addInitScript(() => { window.__csp = []; document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(`${e.violatedDirective} ← ${e.blockedURI || e.sample || ""}`)); });
  await ctx.route("**/*", async (route) => {
    const u = new URL(route.request().url());
    if (u.origin === new URL(base).origin) return route.continue();
    if (u.hostname === "script.google.com") {
      let c = {}; try { c = JSON.parse(route.request().postData() || "{}"); } catch { /* corpo ilegível */ }
      reg2.chamadas.push(c); const r = simulado(c); if (r === "falha") return route.abort("failed");
      return route.fulfill({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(r) });
    }
    if (u.hostname === "pagamento.mock.invalid") { reg2.pagamentoVisitado.push(u.pathname + u.search); return route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Pagamento simulado</title><p>SIMULADO</p>" }); }
    reg2.externas.push(u.hostname); return route.abort("blockedbyclient");
  });
  ctx.reg = reg2; return ctx;
}
const SIM = (c) => c.action === "coupon" ? { ok: true, code: "TESTE10", tipo: "%", valor: 10, min: 0, label: "10% de desconto" } : c.action === "create" ? { ok: true, nsu: "CP-PREV-0001", url: "https://pagamento.mock.invalid/pay?nsu=CP-PREV-0001" } : c.action === "confirm" ? { status: "Aprovado" } : { ok: false };
const SIM_FALHA = (c) => (c.action === "create" ? "falha" : SIM(c));
const vigiar = (p, reg2, rotulo) => { p.on("pageerror", (e) => reg2.erros.push(`${rotulo}: ${e.message}`)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource: the server responded with a status of 404/.test(m.text())) reg2.erros.push(`${rotulo}: ${m.text().slice(0, 160)}`); }); };
const csp = async (p, reg2, rotulo) => { try { (await p.evaluate(() => window.__csp || [])).forEach((v) => reg2.csp.push(`${rotulo}: ${v}`)); } catch { /* página em navegação */ } };
const imagensOk = (p) => p.evaluate(async () => { const v = [...document.images].filter((i) => { const r = i.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.top < innerHeight + 400; }); let f = 0; for (const i of v) { if (!i.complete) await new Promise((ok) => { i.onload = i.onerror = ok; setTimeout(ok, 4000); }); if (!(i.naturalWidth > 0)) f++; } return { total: v.length, falhas: f }; });

async function jornada(browser, perfil, base) {
  const d = [], det = []; const ctx = await contexto(browser, perfil, base, SIM); const p = await ctx.newPage(); vigiar(p, ctx.reg, perfil);
  const foto = (n) => p.screenshot({ path: path.join(CAPT, `${perfil}-${n}.png`) });
  const real = async (sel, rot) => { try { await p.click(sel, { timeout: 4000 }); return true; } catch { d.push(`${perfil}: clique real falhou em ${rot}`); return false; } };
  const esp = (ms = 450) => p.waitForTimeout(ms);
  // 1. página inicial
  const resp = await p.goto(base, { waitUntil: "load" }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "load" }); await esp(500);
  if (!/CP Importados/.test(await p.title())) d.push(`${perfil}: título "${await p.title()}"`);
  const im1 = await imagensOk(p); if (im1.falhas) d.push(`${perfil}: ${im1.falhas} imagens da primeira tela não carregaram`); det.push(`início: status ${resp.status()} · ${im1.total} imagens visíveis carregadas`);
  await foto("01-inicio");
  // 2. busca, categoria, marca, ordenação
  await p.evaluate(() => document.getElementById("catalogo").scrollIntoView()); await esp(200);
  await p.fill("#q", "club"); await esp(250); const nBusca = await p.evaluate(() => +document.getElementById("cnt").textContent.match(/^(\d+)/)[1]); if (!(nBusca > 0 && nBusca < 156)) d.push(`${perfil}: busca "club" devolveu ${nBusca}`);
  await real(".apaga", "apagar busca"); await esp(250);
  await real('.seg [data-cat="perfume"]', "categoria Perfumes"); await esp(250);
  const nCat = await p.evaluate(() => document.getElementById("cnt").textContent); if (!/^71 de 156/.test(nCat)) d.push(`${perfil}: categoria Perfumes → "${nCat}"`);
  await p.selectOption("#fBrand", "armaf"); await p.selectOption("#fSort", "asc"); await esp(300);
  const ord = await p.evaluate(() => [...document.querySelectorAll("#grid .pc:not([hidden])")].map((c) => +c.dataset.i)); const pr = ord.map((i) => DATA.products[i].price);
  if (!ord.length || pr.some((v, k) => k && v < pr[k - 1])) d.push(`${perfil}: marca + ordenação por menor preço fora de ordem`); det.push(`catálogo: busca "club" ${nBusca} · Perfumes ${nCat} · Armaf ${ord.length} produtos em ordem crescente de preço`);
  await p.evaluate(() => document.getElementById("catalogo").scrollIntoView()); await esp(250); await foto("02-catalogo-filtrado");
  // 3. painel do produto → página do produto
  const i0 = ord[0], prod = DATA.products[i0];
  await real(`#grid .pc[data-i="${i0}"] .ph`, "abrir produto"); await esp(600);
  const painel = await p.evaluate(() => document.querySelector("#pvBody .pvp strong")?.textContent); if (painel !== fmt(prod.price)) d.push(`${perfil}: preço no painel "${painel}" ≠ ${fmt(prod.price)}`);
  const link = await p.evaluate(() => document.querySelector("#pvBody .pg-link")?.getAttribute("href")); if (link !== `produto/${PAG[i0]}/`) d.push(`${perfil}: atalho para a página: ${link}`);
  await csp(p, ctx.reg, perfil + " início");
  await p.click("#pvBody .pg-link"); await p.waitForURL((u) => u.pathname === `/catalogo/produto/${PAG[i0]}/`, { timeout: 8000 }); await esp(500);
  const pg = await p.evaluate(() => ({ h1: document.querySelector("h1")?.textContent, preco: document.getElementById("preco")?.textContent, ld: JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent).offers.price }));
  if (pg.h1 !== prod.name || pg.preco !== fmt(prod.price) || pg.ld !== prod.price.toFixed(2)) d.push(`${perfil}: página do produto ${JSON.stringify(pg)}`);
  const im2 = await imagensOk(p); if (im2.falhas) d.push(`${perfil}: ${im2.falhas} imagens da página do produto não carregaram`);
  await foto("03-pagina-do-produto"); await p.evaluate(() => document.querySelector(".rel").scrollIntoView()); await esp(500); const im3 = await imagensOk(p); if (im3.falhas) d.push(`${perfil}: relacionados com ${im3.falhas} imagens quebradas`);
  await p.evaluate(() => scrollTo(0, 0));
  await real("#mais", "aumentar quantidade"); await real("#adicionar", "adicionar à sacola"); await esp(300);
  const nsac = await p.evaluate(() => document.getElementById("sacolaN").textContent); if (nsac !== "2") d.push(`${perfil}: sacola da página com ${nsac} itens (esperado 2)`);
  await p.reload({ waitUntil: "load" }); const nsac2 = await p.evaluate(() => document.getElementById("sacolaN").textContent); if (nsac2 !== "2") d.push(`${perfil}: a sacola não persistiu ao recarregar (${nsac2})`);
  await csp(p, ctx.reg, perfil + " produto");
  await real("#comprar", "comprar agora"); await p.waitForURL((u) => u.pathname === "/catalogo/" && u.hash === "#sacola", { timeout: 8000 }); await p.waitForSelector("#bag.on", { timeout: 6000 }); await esp(500);
  const tot = await p.evaluate(() => document.getElementById("barTotal").textContent); const ate = +(await p.evaluate(() => document.querySelector(".bagbtn .n").textContent)); if (ate < 2) d.push(`${perfil}: sacola da loja com ${ate} itens após "Comprar agora"`);
  await foto("04-sacola");
  // 4. checkout
  await real('[data-step="checkout"]', "finalizar compra"); await esp(300);
  await p.fill("#f_name", "Cliente de Prévia"); await p.fill("#f_cpf", "52998224725"); await p.fill("#f_phone", "14999990000"); await p.fill("#f_email", "previa@exemplo.invalid"); await p.check("#f_consent");
  await p.fill("#f_cup", "TESTE10"); await real("[data-cupok]", "aplicar cupom"); await esp(400);
  await real('[data-pay="card"]', "cartão"); await p.selectOption("#instSel", "3"); await esp(250);
  const ecoC = await p.evaluate(() => document.querySelector("#bagBody .eco")?.textContent); if (!/^economiza R\$ [\d.,]+$/.test(ecoC || "")) d.push(`${perfil}: economia no cartão: ${ecoC}`);
  await foto("05-checkout-cartao");
  await real('[data-pay="pix"]', "Pix"); await esp(250);
  const ecoP = await p.evaluate(() => document.querySelector("#bagBody p.eco")?.textContent); if (!/^Pagando no Pix você economiza de R\$ [\d.,]+ \(cartão à vista\) até R\$ [\d.,]+ \(cartão em \d+x\)\.$/.test(ecoP || "")) d.push(`${perfil}: economia no Pix: ${ecoP}`);
  await csp(p, ctx.reg, perfil + " checkout");
  await real("[data-submit]", "gerar Pix"); await p.waitForURL((u) => u.hostname === "pagamento.mock.invalid", { timeout: 10000 });
  const cr = ctx.reg.chamadas.find((c) => c.action === "create");
  if (!cr || cr.order.pay !== "pix" || cr.order.coupon !== "TESTE10" || cr.order.consent !== true || !cr.order.items.some((x) => x.i === i0 && x.q === 3)) d.push(`${perfil}: pedido enviado ao servidor: ${JSON.stringify(cr && cr.order).slice(0, 220)}`);
  // A loja só envia o endereço de retorno em HTTPS; este servidor local é HTTP, então o esperado aqui é vazio.
  if (!cr || cr.returnUrl !== "") d.push(`${perfil}: returnUrl "${cr && cr.returnUrl}" (esperado vazio em HTTP)`);
  det.push(`pedido: Pix com cupom, 2 adicionados na página + 1 do "Comprar agora" = 3 unidades → ${ctx.reg.pagamentoVisitado[0]} (pagamento simulado) · economia exibida no cartão ("${ecoC}") e no Pix`);
  // 5. retorno do pagamento
  await p.goto(base + "?pedido=CP-PREV-0001&transaction_nsu=TX1&slug=previa", { waitUntil: "load" }); await esp(700);
  const ret = await p.evaluate(() => ({ t: document.getElementById("bagBody").innerText, url: location.search, sac: localStorage.getItem("cp3_bag") }));
  if (!/Pagamento aprovado/.test(ret.t) || ret.url !== "" || ret.sac !== "{}") d.push(`${perfil}: retorno do pagamento ${JSON.stringify({ aprovado: /Pagamento aprovado/.test(ret.t), url: ret.url, sac: ret.sac })}`);
  if (!ctx.reg.chamadas.some((c) => c.action === "confirm" && c.nsu === "CP-PREV-0001")) d.push(`${perfil}: a confirmação não foi enviada ao servidor`);
  await csp(p, ctx.reg, perfil + " retorno");
  // 6. página 404
  const r404 = await p.goto(base + "nao-existe/", { waitUntil: "load" }); await esp(300);
  const bg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor); if (r404.status() !== 404 || bg !== "rgb(11, 59, 47)") d.push(`${perfil}: página 404 (status ${r404.status()}, fundo ${bg})`);
  await foto("06-pagina-404"); await real("a.btn-gold", "Ir para a loja na 404"); await p.waitForURL((u) => u.pathname === "/catalogo/", { timeout: 6000 });
  await csp(p, ctx.reg, perfil + " 404");
  d.push(...ctx.reg.csp.map((v) => `${perfil}: violação de CSP ${v}`), ...ctx.reg.erros, ...ctx.reg.externas.map((h) => `${perfil}: requisição externa para ${h}`));
  det.push(`retorno do pagamento, página 404 estilizada e botão de volta: ok · violações de CSP: ${ctx.reg.csp.length} · erros de JavaScript: ${ctx.reg.erros.length} · requisições externas: ${ctx.reg.externas.length}`);
  await ctx.close(); return { d, det };
}

async function pixOffline(browser, perfil, base) {
  const d = [], det = []; const ctx = await contexto(browser, perfil, base, SIM_FALHA); const p = await ctx.newPage(); vigiar(p, ctx.reg, perfil);
  await p.goto(base, { waitUntil: "load" }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "load" });
  await p.evaluate(() => document.querySelector('#grid .pc[data-i="0"] [data-add]').click()); await p.click(".bagbtn"); await p.click('[data-step="checkout"]');
  await p.fill("#f_name", "Cliente de Prévia"); await p.fill("#f_cpf", "52998224725"); await p.fill("#f_phone", "14999990000"); await p.check("#f_consent");
  await p.click("[data-submit]"); await p.waitForSelector("#pixcode", { timeout: 6000 }); await p.waitForTimeout(300);
  await p.focus("#pixcode"); const sel = await p.evaluate(() => { const t = document.getElementById("pixcode"); return { ini: t.selectionStart, fim: t.selectionEnd, tam: t.value.length }; });
  if (!(sel.ini === 0 && sel.fim === sel.tam && sel.tam > 50)) d.push(`${perfil}: o código Pix não foi selecionado ao focar (${JSON.stringify(sel)})`);
  const qr = await p.evaluate(() => !!document.querySelector("#bagBody .qr svg path")); if (!qr) d.push(`${perfil}: QR Code do Pix ausente`);
  const links = await p.evaluate(() => [...document.querySelectorAll("#bagBody a.wa")].map((a) => decodeURIComponent(a.href))); if (links.length !== 2 || links.some((l) => !/CP Importados/.test(l))) d.push(`${perfil}: links de WhatsApp do Pix offline: ${links.length}`);
  await csp(p, ctx.reg, perfil + " pix offline"); d.push(...ctx.reg.csp.map((v) => `${perfil}: violação de CSP ${v}`));
  det.push(`${perfil}: servidor indisponível → Pix local com QR Code, código selecionado ao focar (liberado por hash), ${links.length} botões de WhatsApp com "CP Importados", violações de CSP: ${ctx.reg.csp.length}`);
  await ctx.close(); return { d, det };
}

// ---------------------------------------------------------------- H6
async function medir(browser, base, perfil, rede) {
  const ctx = await browser.newContext({ ...PERFIS[perfil], locale: "pt-BR", serviceWorkers: "block" });
  // Sem interceptação de rede de propósito: o Playwright desativa o cache do navegador quando intercepta requisições, e a
  // visita repetida precisa usar o cache. As páginas medidas não carregam nada de fora do próprio site.
  const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
  await cdp.send("Network.enable"); await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: rede.latencia, downloadThroughput: rede.baixa, uploadThroughput: rede.sobe });
  if (rede.cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: rede.cpu });
  await p.addInitScript(() => { window.__cls = 0; window.__lcp = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = Math.round(e.startTime); }).observe({ type: "largest-contentful-paint", buffered: true }); });
  let bytes = 0, req = 0; cdp.on("Network.requestWillBeSent", () => req++); cdp.on("Network.loadingFinished", (e) => { bytes += e.encodedDataLength; });
  const visita = async () => { bytes = 0; req = 0; const t0 = Date.now(); await p.goto(base, { waitUntil: "load", timeout: 240000 }); const tl = Date.now() - t0; await p.waitForTimeout(1500);
    const m = await p.evaluate(() => ({ fcp: Math.round((performance.getEntriesByName("first-contentful-paint")[0] || {}).startTime || 0), lcp: window.__lcp, cls: Math.round(window.__cls * 1000) / 1000 }));
    return { ...m, carga: tl, kb: Math.round(bytes / 1024), req }; };
  const fria = await visita(); const repetida = await visita();
  await ctx.close(); return { fria, repetida };
}
async function h6(browser, bases) {
  const d = [], det = [], tabela = [];
  const redes = { "celular · 4G lento (1,6 Mbps, 150 ms, CPU 4× mais lenta)": ["celular", { baixa: 1.6e6 / 8, sobe: 750e3 / 8, latencia: 150, cpu: 4 }], "desktop · banda larga (10 Mbps, 40 ms)": ["desktop", { baixa: 10e6 / 8, sobe: 5e6 / 8, latencia: 40, cpu: 1 }] };
  const res = {};
  for (const [rot, [perfil, rede]] of Object.entries(redes)) for (const [nome, base] of Object.entries(bases)) { res[`${rot}|${nome}`] = await medir(browser, base, perfil, rede); process.stdout.write("."); }
  for (const rot of Object.keys(redes)) {
    tabela.push(`**${rot}**`); tabela.push("");
    tabela.push("| Versão | 1ª visita: carga | FCP | LCP | CLS | Baixado | Requisições | Visita repetida: carga | Baixado |"); tabela.push("|---|---|---|---|---|---|---|---|---|");
    for (const nome of Object.keys(bases)) { const x = res[`${rot}|${nome}`]; tabela.push(`| ${nome} | ${(x.fria.carga / 1000).toFixed(1)} s | ${x.fria.fcp} ms | ${x.fria.lcp} ms | ${x.fria.cls} | ${kb(x.fria.kb * 1024)} | ${x.fria.req} | ${(x.repetida.carga / 1000).toFixed(1)} s | ${kb(x.repetida.kb * 1024)} |`); }
    tabela.push("");
  }
  const m = res[`celular · 4G lento (1,6 Mbps, 150 ms, CPU 4× mais lenta)|loja atual`], o = res[`celular · 4G lento (1,6 Mbps, 150 ms, CPU 4× mais lenta)|loja original (89ef168)`];
  if (m.fria.lcp > 2500) d.push(`celular 4G lento: LCP de ${m.fria.lcp} ms (acima de 2.500 ms, o limite do Google para "bom")`);
  if (m.fria.cls > 0.1) d.push(`celular 4G lento: CLS ${m.fria.cls} (acima de 0,1)`);
  if (m.fria.kb > o.fria.kb) d.push("a loja atual baixa mais dados que a original na primeira visita");
  const pgm = res[`celular · 4G lento (1,6 Mbps, 150 ms, CPU 4× mais lenta)|loja atual · página de produto`];
  if (pgm.fria.lcp > 2500 || pgm.fria.cls > 0.1) d.push(`página de produto no celular 4G lento: LCP ${pgm.fria.lcp} ms, CLS ${pgm.fria.cls}`);
  for (const rot of Object.keys(redes)) { const x = res[`${rot}|loja atual`]; if (x.repetida.kb > x.fria.kb * 0.35) d.push(`${rot}: a visita repetida baixou ${x.repetida.kb} KB de ${x.fria.kb} KB (o cache não está funcionando)`); }
  det.push(`celular em 4G lento, primeira visita: a loja original carrega em ${(o.fria.carga / 1000).toFixed(1)} s (${kb(o.fria.kb * 1024)}); a atual em ${(m.fria.carga / 1000).toFixed(1)} s (${kb(m.fria.kb * 1024)}), com LCP de ${m.fria.lcp} ms`);
  det.push("valores de laboratório com rede e CPU emuladas, em servidor local; não substituem Lighthouse/PageSpeed na hospedagem final");
  return { d, det, tabela: tabela.join("\n") };
}

// ---------------------------------------------------------------- execução
(async () => {
  fs.mkdirSync(SAIDA, { recursive: true }); fs.mkdirSync(CAPT, { recursive: true });
  const original = path.join(TRAB, "original"); if (!fs.existsSync(path.join(original, "index.html"))) { fs.mkdirSync(original, { recursive: true }); execFileSync("sh", ["-c", `git archive 89ef168bd1304769d1eeabdb88ddea6724839995 | tar -x -C "${original}"`], { cwd: RAIZ }); }
  const fase1 = path.join(TRAB, "fase1"); if (!fs.existsSync(path.join(fase1, "index.html"))) { fs.mkdirSync(fase1, { recursive: true }); execFileSync("sh", ["-c", `git archive 8954947e986e0ea08fa180f789032b7a2c6a5134 | tar -x -C "${fase1}"`], { cwd: RAIZ }); }
  const pages = await iniciar({ raiz: SERVIDA, modo: "pages" }), cdn = await iniciar({ raiz: SERVIDA, modo: "cdn" });
  const browser = await chromium.launch(); let tabela = "";
  try {
    const a = await h1(pages.url); reg("H1", "Comportamento de hospedagem (modo GitHub Pages): gzip, cache, 304, redirecionamento, 404, caixa das letras", a.d, a.det);
    const b = await h2(pages.url); reg("H2", "Rastreamento do site: 157 páginas, todos os links e arquivos, metadados e dados estruturados", b.d, b.det);
    const c = await h3(cdn.url); reg("H3", "Cabeçalhos de segurança e cache do _headers (modo CDN), sem valores somados em conflito", c.d, c.det);
    const dj = [], dt = [];
    for (const perfil of ["desktop", "celular"]) { const j = await jornada(browser, perfil, cdn.url); dj.push(...j.d); dt.push(...j.det); }
    reg("H4", "Jornada de compra com cliques reais em desktop e celular, sob a CSP: busca, filtros, produto, página, sacola, checkout, retorno e 404", dj, dt);
    const e = [], et = []; for (const perfil of ["desktop", "celular"]) { const j = await pixOffline(browser, perfil, cdn.url); e.push(...j.d); et.push(...j.det); }
    reg("H5", "Pix com servidor indisponível sob a CSP (seleção do código liberada por hash)", e, et);
    if (!SEM_DESEMPENHO) {
      const so = await iniciar({ raiz: original, modo: "pages" }), sf = await iniciar({ raiz: fase1, modo: "pages" });
      const f = await h6(browser, { "loja original (89ef168)": so.url, "Fase 1 (separada)": sf.url, "loja atual": pages.url, "loja atual · página de produto": `${pages.url}produto/${PAG[0]}/` });
      reg("H6", "Desempenho em rede lenta: original × Fase 1 × atual (primeira visita e visita repetida)", f.d, f.det); tabela = f.tabela;
      await so.fechar(); await sf.fechar();
    }
  } finally { await browser.close(); await pages.fechar(); await cdn.fechar(); }
  const ic = { PASSOU: "✅ PASSOU", FALHOU: "❌ FALHOU" };
  let md = `# Verificação em hospedagem simulada\n\n- pasta servida: \`${path.relative(RAIZ, SERVIDA) || "raiz do repositório"}\` · ${new Date().toISOString()} · ramo \`${execFileSync("git", ["branch", "--show-current"], { cwd: RAIZ }).toString().trim()}\` · commit \`${execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: RAIZ }).toString().trim()}\`\n- Servidor local que imita GitHub Pages (modo pages) e Cloudflare/Netlify com \`_headers\` (modo cdn). Pedidos e pagamento **simulados**; sem rede externa.\n\n| Teste | Status | Descrição |\n|---|---|---|\n`;
  md += R.map((r) => `| ${r.id} | ${ic[r.status]} | ${r.titulo} |`).join("\n") + "\n";
  for (const r of R) { md += `\n## ${r.id} — ${r.titulo}\n\n**${ic[r.status]}**\n\n` + r.detalhes.map((x) => `- ${x}`).join("\n") + "\n"; if (r.id === "H6" && tabela) md += "\n" + tabela + "\n"; if (r.divergencias.length) md += "\nDivergências:\n\n" + r.divergencias.map((x) => `- ${x}`).join("\n") + "\n"; }
  fs.writeFileSync(path.join(SAIDA, "resultado.md"), md); fs.writeFileSync(path.join(SAIDA, "resultado.json"), JSON.stringify(R, null, 1));
  console.log("\n"); for (const r of R) console.log(`${r.status.padEnd(7)} ${r.id} ${r.titulo.slice(0, 100)}`);
  process.exitCode = R.some((r) => r.status === "FALHOU") ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(2); });
