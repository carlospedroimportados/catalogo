#!/usr/bin/env node
"use strict";
/*
 * Ensaia a PRÉVIA exatamente como a Cloudflare Pages a construiria, sem alterar o repositório:
 *   1. extrai o commit informado (padrão: HEAD) para uma pasta limpa, sem .git nem arquivos locais
 *   2. roda o comando de build da hospedagem, só com Node, com CP_SITE e CP_PREVIA=1
 *   3. confere os limites da hospedagem (arquivos, tamanho, _headers) e as marcas do modo prévia
 *   4. serve o dist/ na RAIZ de um domínio, com o _headers aplicado, e percorre a loja em desktop e celular sob a CSP
 *   5. garante que NENHUMA chamada chegue ao Apps Script e que o checkout caia no fluxo de WhatsApp / Pix local
 * Uso: node qa/hospedagem/verificar-previa.js [https://projeto.pages.dev/] [commit]
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execFileSync, spawnSync } = require("child_process");
const { chromium } = require("playwright");
const { iniciar } = require("./servidor-pages");

const RAIZ = path.resolve(__dirname, "..", "..");
const SITE = (process.argv[2] || "https://cp-importados-previa.pages.dev/").replace(/\/?$/, "/");
const COMMIT = process.argv[3] || "HEAD";
const PASTA = path.join(RAIZ, "qa", ".trabalho", "cloudflare"), CAPT = path.join(__dirname, "capturas-previa"), SAIDA = path.join(__dirname, "relatorio");
const AVISO = "Prévia da loja · pedidos e pagamentos desativados · nada é cobrado";
const R = []; const reg = (id, titulo, d, det = []) => { R.push({ id, titulo, status: d.length ? "FALHOU" : "PASSOU", detalhes: det, divergencias: d.slice(0, 30) }); process.stdout.write(id + " "); };
const fmt = (v) => "R$ " + v.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const crc16 = (s) => { let c = 0xFFFF; for (let i = 0; i < s.length; i++) { c ^= s.charCodeAt(i) << 8; for (let k = 0; k < 8; k++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xFFFF : (c << 1) & 0xFFFF; } return c.toString(16).toUpperCase().padStart(4, "0"); };

(async () => {
  fs.mkdirSync(CAPT, { recursive: true }); fs.mkdirSync(SAIDA, { recursive: true });
  // ---- 1 e 2: construção limpa
  fs.rmSync(PASTA, { recursive: true, force: true }); fs.mkdirSync(PASTA, { recursive: true });
  execFileSync("sh", ["-c", `git archive ${COMMIT} | tar -x -C "${PASTA}"`], { cwd: RAIZ });
  const commit = execFileSync("git", ["rev-parse", "--short", COMMIT], { cwd: RAIZ }).toString().trim();
  const env = { PATH: path.dirname(process.execPath) + ":/usr/bin:/bin", HOME: process.env.HOME || "/tmp", CP_SITE: SITE, CP_PREVIA: "1" }; // sem Python no PATH de propósito
  const build = (extra = {}) => ["ferramentas/gerar-paginas.js", "ferramentas/aplicar-redesign.js", "ferramentas/montar-site.js"].map((a) => spawnSync("node", [a], { cwd: PASTA, env: { ...env, ...extra }, encoding: "utf8" }));
  const passos = build(); const falhou = passos.find((p) => p.status !== 0);
  const d1 = [], det1 = [];
  if (falhou) d1.push("o comando de build falhou: " + (falhou.stderr || falhou.stdout).slice(0, 300));
  const dist = path.join(PASTA, "dist");
  const arquivos = []; const varrer = (p) => { for (const e of fs.readdirSync(p, { withFileTypes: true })) { const q = path.join(p, e.name); e.isDirectory() ? varrer(q) : arquivos.push([q, fs.statSync(q).size]); } };
  if (!falhou) varrer(dist);
  const maior = arquivos.reduce((m, a) => (a[1] > m[1] ? a : m), ["", 0]), total = arquivos.reduce((s, a) => s + a[1], 0);
  const hd = !falhou && fs.existsSync(path.join(dist, "_headers")) ? fs.readFileSync(path.join(dist, "_headers"), "utf8") : "";
  const regras = (hd.match(/^\/\S*$/gm) || []).length, linhaMax = Math.max(0, ...hd.split("\n").map((l) => l.length));
  if (!falhou) {
    if (arquivos.length > 20000) d1.push(`${arquivos.length} arquivos (limite da hospedagem: 20.000)`);
    if (maior[1] > 25 * 1048576) d1.push(`arquivo de ${(maior[1] / 1048576).toFixed(1)} MB (limite: 25 MiB)`);
    if (!hd) d1.push("_headers ausente na raiz do dist/"); if (regras > 100) d1.push(`${regras} regras no _headers (limite: 100)`); if (linhaMax > 2000) d1.push(`linha de ${linhaMax} caracteres no _headers (limite: 2000)`);
    for (const f of ["index.html", "404.html", "sitemap.xml"]) if (!fs.existsSync(path.join(dist, f))) d1.push(`${f} ausente`);
    if (/qa\/|docs\/|instagram\//.test(arquivos.map((a) => path.relative(dist, a[0])).join("\n"))) d1.push("o dist/ contém pastas que não são do site");
    const cfg = fs.readFileSync(path.join(dist, "assets/config.js"), "utf8"); if (!/api:""/.test(cfg)) d1.push('CFG.api não está vazio: os pedidos NÃO estão desativados');
    if (/script\.google\.com/.test(fs.readFileSync(path.join(dist, "assets/config.js"), "utf8"))) d1.push("o endereço do Apps Script ainda aparece no config.js do dist/");
    const home = fs.readFileSync(path.join(dist, "index.html"), "utf8"); if (!home.includes(AVISO) || !/name="robots" content="noindex,nofollow"/.test(home) || !home.includes(`rel="canonical" href="${SITE}"`)) d1.push("página inicial sem aviso, noindex ou canônico correto");
    const pg = fs.readdirSync(path.join(dist, "produto")); let semMarca = 0; for (const p of pg) { const h = fs.readFileSync(path.join(dist, "produto", p, "index.html"), "utf8"); if (!h.includes(AVISO) || !/noindex,nofollow/.test(h) || !h.includes(`rel="canonical" href="${SITE}produto/${p}/"`)) semMarca++; }
    if (semMarca) d1.push(`${semMarca} páginas de produto sem aviso, noindex ou canônico correto`);
    const mapa = fs.readFileSync(path.join(dist, "sitemap.xml"), "utf8"); if ((mapa.match(/<loc>/g) || []).length !== 157 || /github\.io/.test(mapa)) d1.push("sitemap incorreto");
    const antigo = arquivos.filter(([f]) => /\.(html|xml)$/.test(f)).filter(([f]) => /github\.io|\/catalogo\//.test(fs.readFileSync(f, "utf8"))).length; if (antigo) d1.push(`${antigo} arquivos HTML/XML ainda citam o endereço do GitHub Pages`);
    // modo "servidor real" também compila (não é servido aqui)
    const real = build({ CP_API: "real" }); if (real.some((p) => p.status !== 0) || !/script\.google\.com/.test(fs.readFileSync(path.join(dist, "assets/config.js"), "utf8"))) d1.push("o modo CP_API=real não manteve o servidor ligado");
    build(); // volta ao modo seguro
  }
  det1.push(`commit ${commit} extraído limpo e construído só com Node (sem Python): ${arquivos.length} arquivos, ${(total / 1048576).toFixed(1)} MB, maior arquivo ${(maior[1] / 1024).toFixed(0)} KB, ${regras} regras e linha máxima de ${linhaMax} caracteres no _headers`);
  det1.push(`modo prévia: pedidos desativados (api vazio, endereço do Apps Script ausente do dist/), aviso e noindex na página inicial e nas 156 páginas de produto, canônico e sitemap em ${SITE}`);
  reg("V1", "Construção limpa como a Cloudflare faria: limites da hospedagem e marcas do modo prévia", d1, det1);
  if (falhou) { console.log("\nconstrução falhou"); process.exit(1); }

  // ---- 3: servidor na raiz, com _headers
  const srv = await iniciar({ raiz: dist, modo: "cdn", prefixo: "/" }); const base = srv.url;
  const browser = await chromium.launch(); const DATA = vm.runInNewContext(fs.readFileSync(path.join(dist, "dados/catalogo.js"), "utf8") + "\n;DATA", Object.create(null));
  const PAG = vm.runInNewContext(fs.readFileSync(path.join(dist, "dados/paginas.js"), "utf8") + "\n;PAGINAS", Object.create(null));
  try {
    // rastreamento
    const d2 = [], det2 = []; const mapa = fs.readFileSync(path.join(dist, "sitemap.xml"), "utf8"); const urls = [...mapa.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(SITE, base));
    const visto = new Map(); const tem = async (u) => { if (!visto.has(u)) visto.set(u, (await fetch(u, { method: "HEAD" })).status); return visto.get(u); };
    for (const u of [...new Set([base, ...urls])]) { const r = await fetch(u); const h = await r.text(); if (r.status !== 200) { d2.push(`${u}: ${r.status}`); continue; }
      for (const m of h.matchAll(/\s(?:src|href)="([^"#]+)"/g)) { if (/^(https?:|mailto:|tel:|data:)/.test(m[1])) continue; const t = new URL(m[1], u); if (t.origin === new URL(base).origin && (await tem(t.href)) !== 200) d2.push(`${u.replace(base, "/")}: ${m[1]} → ${visto.get(t.href)}`); }
      for (const m of h.matchAll(/\ssrcset="([^"]+)"/g)) for (const p of m[1].split(",")) { const t = new URL(p.trim().split(/\s+/)[0], u); if ((await tem(t.href)) !== 200) d2.push(`${u.replace(base, "/")}: srcset ${p.trim().split(/\s+/)[0]} → ${visto.get(t.href)}`); } }
    const nf = await fetch(base + "nao-existe/x"); const h404 = await nf.text(); if (nf.status !== 404 || !h404.includes('href="/assets/premium.css')) d2.push("página 404 sem status 404 ou sem caminhos absolutos na raiz");
    for (const m of h404.matchAll(/(?:href|src)="(\/[^"?]+(?:\?v=\w+)?)"/g)) { if (!(await fetch(new URL(m[1], base))).ok) d2.push(`404: ${m[1]} indisponível`); }
    const cab = Object.fromEntries((await fetch(base)).headers); if (!/default-src 'self'/.test(cab["content-security-policy"] || "") || cab["x-frame-options"] !== "DENY") d2.push("cabeçalhos de segurança ausentes na raiz");
    det2.push(`${urls.length} páginas e ${visto.size} arquivos internos conferidos na raiz do domínio (todos 200) · 404 estilizada com caminhos absolutos · CSP e proteção contra moldura aplicadas`);
    reg("V2", "Site servido na raiz de um domínio: 157 páginas, todos os arquivos, 404 e cabeçalhos", d2, det2);

    // jornada
    const PERFIS = { desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, celular: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } };
    const d3 = [], det3 = [];
    for (const [perfil, opc] of Object.entries(PERFIS)) {
      const ctx = await browser.newContext({ ...opc, locale: "pt-BR", serviceWorkers: "block" }); const reg2 = { externas: [], apps: [], erros: [] };
      await ctx.addInitScript(() => { window.__csp = []; document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(`${e.violatedDirective} ← ${e.blockedURI || e.sample || ""}`)); });
      await ctx.route("**/*", (r) => { const u = new URL(r.request().url()); if (u.origin === new URL(base).origin) return r.continue(); (u.hostname.includes("google") ? reg2.apps : reg2.externas).push(u.hostname); return r.abort("blockedbyclient"); });
      const p = await ctx.newPage(); p.on("pageerror", (e) => reg2.erros.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/status of 404/.test(m.text())) reg2.erros.push(m.text().slice(0, 150)); });
      const esp = (ms = 450) => p.waitForTimeout(ms); const foto = (n) => p.screenshot({ path: path.join(CAPT, `${perfil}-${n}.png`) });
      const real = async (sel, rot) => { try { await p.click(sel, { timeout: 4000 }); return true; } catch { d3.push(`${perfil}: clique real falhou em ${rot}`); return false; } };
      await p.goto(base, { waitUntil: "load" }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "load" }); await esp(500);
      const topo = await p.evaluate(() => ({ aviso: document.querySelector(".proto")?.textContent, api: typeof CFG !== "undefined" ? CFG.api : "?", robots: document.querySelector('meta[name="robots"]')?.content, h1: document.querySelector("h1")?.textContent }));
      if (topo.aviso !== AVISO || topo.api !== "" || topo.robots !== "noindex,nofollow") d3.push(`${perfil}: topo da prévia ${JSON.stringify(topo)}`);
      await foto("01-inicio");
      await p.fill("#q", "club"); await esp(300); const nb = await p.evaluate(() => +document.getElementById("cnt").textContent.match(/^(\d+)/)[1]); if (!(nb > 0 && nb < 156)) d3.push(`${perfil}: busca devolveu ${nb}`); await real(".apaga", "apagar busca");
      await real('.seg [data-cat="skincare"]', "categoria Skincare"); await esp(300); await p.evaluate(() => document.getElementById("catalogo").scrollIntoView()); await esp(250); await foto("02-catalogo");
      const i0 = 57, prod = DATA.products[i0]; await p.evaluate((i) => document.querySelector(`#grid .pc[data-i="${i}"]`).scrollIntoView({ block: "center" }), i0); await esp(250);
      await real(`#grid .pc[data-i="${i0}"] .ph`, "abrir produto"); await esp(600); await p.click("#pvBody .pg-link"); await p.waitForURL((u) => u.pathname === `/produto/${PAG[i0]}/`, { timeout: 8000 }); await esp(500);
      const pg = await p.evaluate(() => ({ h1: document.querySelector("h1")?.textContent, preco: document.getElementById("preco")?.textContent, aviso: document.querySelector(".proto")?.textContent, robots: document.querySelector('meta[name="robots"]')?.content }));
      if (pg.h1 !== prod.name || pg.preco !== fmt(prod.price) || pg.aviso !== AVISO || pg.robots !== "noindex,nofollow") d3.push(`${perfil}: página do produto ${JSON.stringify(pg)}`);
      await foto("03-pagina-do-produto"); await real("#adicionar", "adicionar à sacola");
      await real("#comprar", "comprar agora"); await p.waitForURL((u) => u.pathname === "/" && u.hash === "#sacola", { timeout: 8000 }); await p.waitForSelector("#bag.on"); await esp(500); await foto("04-sacola");
      await real('[data-step="checkout"]', "finalizar compra"); await esp(300);
      const sem = await p.evaluate(() => ({ cupom: !!document.getElementById("f_cup"), nota: document.querySelector("#bagBody p.note.center")?.textContent }));
      if (sem.cupom) d3.push(`${perfil}: campo de cupom visível com o servidor desativado`); if (!/O pedido segue pelo WhatsApp para confirmação/.test(sem.nota || "")) d3.push(`${perfil}: aviso do checkout: ${sem.nota}`);
      await p.fill("#f_name", "Cliente de Prévia"); await p.fill("#f_cpf", "52998224725"); await p.fill("#f_phone", "14999990000"); await p.check("#f_consent");
      await real('[data-pay="pix"]', "Pix"); await real("[data-submit]", "gerar Pix"); await p.waitForSelector("#pixcode", { timeout: 6000 }); await esp(400);
      const px = await p.evaluate(() => ({ codigo: document.getElementById("pixcode").value, qr: !!document.querySelector("#bagBody .qr svg path"), links: [...document.querySelectorAll("#bagBody a.wa")].map((a) => decodeURIComponent(a.href)) }));
      const corpo = px.codigo.slice(0, -4), valor = (px.codigo.match(/54\d{2}(\d+\.\d{2})/) || [])[1];
      if (px.codigo.slice(-4) !== crc16(corpo)) d3.push(`${perfil}: CRC do código Pix inválido`); if (+valor !== prod.price * 2) d3.push(`${perfil}: valor do Pix ${valor} ≠ ${prod.price * 2} (2 unidades: Adicionar + Comprar agora)`); if (!px.qr) d3.push(`${perfil}: QR Code ausente`);
      if (px.links.length !== 2 || px.links.some((l) => !/CP Importados/.test(l) || !/^https:\/\/wa\.me\/55\d{10,11}\?text=/.test(l))) d3.push(`${perfil}: links de WhatsApp do Pix: ${px.links.length}`);
      await foto("05-pix-local");
      // cartão: sem link de pagamento automático; o atendente envia
      await p.evaluate(() => document.querySelector('[data-newbuy]').click()); await esp(500);
      await p.evaluate(() => document.querySelector('#grid .pc[data-i="1"] [data-add]').click()); await real(".bagbtn", "sacola"); await esp(500); await real('[data-step="checkout"]', "checkout (cartão)");
      await p.fill("#f_name", "Cliente de Prévia"); await p.fill("#f_cpf", "52998224725"); await p.fill("#f_phone", "14999990000"); await p.check("#f_consent"); await real('[data-pay="card"]', "cartão"); await real("[data-submit]", "enviar pedido (cartão)"); await esp(500);
      const cc = await p.evaluate(() => ({ t: document.getElementById("bagBody").innerText, links: [...document.querySelectorAll("#bagBody a.wa")].map((a) => decodeURIComponent(a.href)) }));
      if (!/O atendente confirma a disponibilidade e envia o link de pagamento do cartão/.test(cc.t) || cc.links.length !== 2 || cc.links.some((l) => !/CP Importados/.test(l))) d3.push(`${perfil}: fluxo do cartão sem servidor incorreto`);
      await foto("06-cartao-whatsapp");
      for (const v of await p.evaluate(() => window.__csp || [])) d3.push(`${perfil}: violação de CSP ${v}`);
      d3.push(...reg2.erros.map((e) => `${perfil}: ${e}`), ...reg2.apps.map((h) => `${perfil}: CHAMADA AO APPS SCRIPT/GOOGLE (${h})`), ...reg2.externas.map((h) => `${perfil}: requisição externa (${h})`));
      det3.push(`${perfil}: aviso da prévia e noindex · busca, categoria, painel, página do produto, sacola · checkout sem cupom e com aviso de WhatsApp · Pix local com CRC válido e valor ${fmt(prod.price * 2)} (2 unidades) · cartão com atendimento por WhatsApp · chamadas ao Apps Script: ${reg2.apps.length} · requisições externas: ${reg2.externas.length} · erros: ${reg2.erros.length}`);
      await ctx.close();
    }
    reg("V3", "Jornada na prévia (pedidos desativados), desktop e celular, sob a CSP: nada chega ao Apps Script e o checkout usa WhatsApp / Pix local", d3, det3);
  } finally { await browser.close(); await srv.fechar(); fs.rmSync(PASTA, { recursive: true, force: true }); }
  const ic = { PASSOU: "✅ PASSOU", FALHOU: "❌ FALHOU" };
  let md = `# Verificação da prévia (Cloudflare Pages simulada)\n\n- ${new Date().toISOString()} · commit \`${commit}\` · endereço público simulado: ${SITE}\n- Construção limpa só com Node, servida na raiz de um domínio com o \`_headers\`. Pedidos e pagamentos **desativados**; nenhuma chamada ao Apps Script.\n\n| Teste | Status | Descrição |\n|---|---|---|\n`;
  md += R.map((r) => `| ${r.id} | ${ic[r.status]} | ${r.titulo} |`).join("\n") + "\n";
  for (const r of R) { md += `\n## ${r.id} — ${r.titulo}\n\n**${ic[r.status]}**\n\n` + r.detalhes.map((x) => `- ${x}`).join("\n") + "\n"; if (r.divergencias.length) md += "\nDivergências:\n\n" + r.divergencias.map((x) => `- ${x}`).join("\n") + "\n"; }
  fs.writeFileSync(path.join(SAIDA, "resultado-previa.md"), md); fs.writeFileSync(path.join(SAIDA, "resultado-previa.json"), JSON.stringify(R, null, 1));
  console.log("\n"); for (const r of R) console.log(`${r.status.padEnd(7)} ${r.id} ${r.titulo.slice(0, 110)}`);
  process.exitCode = R.some((r) => r.status === "FALHOU") ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(2); });
