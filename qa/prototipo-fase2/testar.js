#!/usr/bin/env node
"use strict";
/*
 * Bateria do protótipo da Fase 2 (desktop e celular). Complementa a bateria T1–T15 sem alterá-la
 * e grava em qa/prototipo-fase2/relatorio/ — os relatórios de qa/relatorio/ não são tocados.
 *
 * P1–P7 comparam o protótipo com a loja publicada (89ef168) usando os mesmos coletores da bateria
 * principal: o redesign não pode mudar dados, filtros, parcelas, sacola nem o que vai ao servidor.
 * P8–P12 verificam o layout novo, o contraste e a navegação em desktop, tablet e celular.
 * Rede externa bloqueada; servidor de pedidos e pagamento simulados.
 */
const fs = require("fs");
const path = require("path");
const { RAIZ, git, diff } = require("../lib/util");
const { iniciar } = require("../lib/servidor");
const { abrirNavegador, novoContexto } = require("../lib/navegador");
const N = require("../testes/navegador");

const REF = "89ef168bd1304769d1eeabdb88ddea6724839995";
const FASE1 = "8954947e986e0ea08fa180f789032b7a2c6a5134";
// Alvo: "prototipo" (padrão) ou "loja" (a loja redesenhada na raiz). Uso: node testar.js --alvo loja
const LOJA = process.argv[process.argv.indexOf("--alvo") + 1] === "loja" && process.argv.includes("--alvo");
const SAIDA = LOJA ? path.join(RAIZ, "qa", "relatorio-fase2") : path.join(__dirname, "relatorio");
const SUB = LOJA ? "" : "qa/prototipo-fase2/";

// Texto exibido pode mudar de caixa (CSS) e de espaçamento sem mudar o conteúdo: normaliza para comparar.
const norm = (v) => typeof v === "string" ? (SUB ? v.split(SUB).join("") : v).toLowerCase().replace(/\s+/g, " ").trim()
  : Array.isArray(v) ? v.map(norm) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, norm(x)])) : v;
const R = [];
const reg = (id, titulo, divergencias, detalhes = []) => { R.push({ id, titulo, status: divergencias.length ? "FALHOU" : "PASSOU", detalhes, divergencias: divergencias.slice(0, 25) }); process.stdout.write(id + " "); };

(async () => {
  fs.mkdirSync(SAIDA, { recursive: true });
  const refDir = path.join(RAIZ, "qa", ".trabalho", "referencia-" + REF.slice(0, 7));
  fs.mkdirSync(refDir, { recursive: true });
  fs.writeFileSync(path.join(refDir, "index.html"), git(["show", `${REF}:index.html`]));
  const sRef = await iniciar(refDir), sLoja = await iniciar(RAIZ);
  const uRef = sRef.url, uProto = sLoja.url + SUB;
  const browser = await abrirNavegador();
  const erros = [], bloqueadas = [];
  const par = async (fn, ...a) => { const r = await fn(browser, uRef, ...a), c = await fn(browser, uProto, ...a);
    erros.push(...c.erros); bloqueadas.push(...c.bloqueadas); return { r: r.saida, c: c.saida }; };
  try {
    { const { r, c } = await par(N.cards);
      reg("P1", "Cards: 157 produtos com os mesmos dados, selos, parcelas e a mesma imagem (bytes)", diff(r, c, "cards"), [`${c.length} cards comparados sem normalização`]); }
    { const { r, c } = await par(N.navegacao);
      reg("P2", "Categorias, marcas, ordenações, busca e vitrines devolvem os mesmos produtos", diff(norm(r), norm(c), "nav"),
        ["por categoria: " + Object.entries(c.categorias).map(([k, v]) => `${k} ${v.ids.length}`).join(", "), `${Object.keys(c.buscas).length} buscas · ${Object.keys(c.marcas).length - 1} marcas · 5 ordenações`]); }
    { const { r, c } = await par(N.parcelamento);
      reg("P3", "Parcelamento: tabela de cada produto e simulador idênticos", diff(r, c, "parc"), [`${Object.keys(c.produto).length} produtos · ${Object.keys(c.simulador).length} valores do simulador`]); }
    { const base = await N.sacola(browser, uRef); const sac = base.saida.passos.inc0x2.storage.cp3_bag;
      const { r, c } = await par(N.sacola, sac);
      reg("P4", "Sacola: mesmos totais, persistência, limite e compatibilidade com sacolas já salvas", diff(norm(r), norm(c), "sacola"), [`total após rotina: ${c.passos.rotina.total} · sacola antiga aberta: ${c.compat.total}`]); }
    { const d = [], det = [];
      for (const nome of Object.keys(N.CENARIOS)) { const { r, c } = await par(N.checkout, nome);
        const dn = diff(norm(r.chamadas), norm(c.chamadas), "envio"); const dt = diff(norm({ ...r, chamadas: 0 }), norm({ ...c, chamadas: 0 }), "tela");
        det.push(`${nome}: envio ao servidor ${dn.length ? "DIFERENTE" : "idêntico"} · textos da tela ${dt.length ? "diferentes" : "idênticos"}`);
        d.push(...[...dn, ...dt].map((x) => `${nome}: ${x}`)); }
      reg("P5", "Checkout simulado (16 cenários): o que é enviado ao servidor e os textos da tela não mudam", d, det); }
    { const d = [], det = [];
      for (const nome of Object.keys(N.RETORNOS)) { const { r, c } = await par(N.retorno, nome);
        const x = diff(norm(r), norm(c), "retorno"); det.push(`${nome}: ${x.length ? "DIFERENTE" : "idêntico"}`); d.push(...x.map((y) => `${nome}: ${y}`)); }
      reg("P6", "Retorno do pagamento: confirmação, mensagens e limpeza do endereço idênticos", d, det); }
    if (LOJA) {
      // Tudo o que é comercial ou lógica deve estar idêntico, byte a byte, ao commit da Fase 1.
      const intactos = ["dados/catalogo.js", "assets/config.js", "assets/app.js", "assets/qrcode.js", "assets/estilo.css", "img", "fonts", "admin", "instagram"];
      const mudou = git(["status", "--porcelain", "--untracked-files=all", "--", ...intactos]).toString().split("\n").filter(Boolean)
        .concat(git(["diff", "--name-only", FASE1, "HEAD", "--", ...intactos]).toString().split("\n").filter(Boolean));
      const n = git(["ls-tree", "-r", "--name-only", FASE1, "--", ...intactos]).toString().split("\n").filter(Boolean).length;
      reg("P7", "Preservação: catálogo, configuração comercial, lógica, imagens, fontes e painel idênticos à Fase 1", mudou.map((f) => "alterado: " + f),
        [`${n} arquivos conferidos contra a Fase 1 (${FASE1.slice(0, 7)}) · alterados: ${mudou.length}`, `main: ${git(["rev-parse", "--short", "main"]).toString().trim()} · origin/main: ${git(["rev-parse", "--short", "origin/main"]).toString().trim()}`]);
    } else {
      const st = git(["status", "--porcelain", "--untracked-files=all"]).toString().split("\n").filter(Boolean).map((l) => l.slice(3));
      const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
      const usa = ["../../assets/app.js", "../../assets/config.js", "../../dados/catalogo.js", "../../assets/qrcode.js", "../../assets/estilo.css"].filter((f) => !html.includes(f));
      reg("P7", "Isolamento: protótipo usa lógica, dados e imagens da loja sem cópia", usa.map((f) => "não referencia o original: " + f), [`alterações pendentes no repositório: ${st.length}`]);
    }

    // P8–P10: layout novo em desktop e celular
    const layout = {};
    for (const [nome, viewport] of [["desktop", { width: 1440, height: 900 }], ["notebook", { width: 1024, height: 768 }], ["tablet", { width: 768, height: 1024 }], ["celular", { width: 390, height: 844 }], ["celular pequeno", { width: 320, height: 640 }]]) {
      const ctx = await novoContexto(browser, { viewport }); const p = await ctx.newPage();
      await p.emulateMedia({ reducedMotion: "reduce" });
      await p.goto(uProto, { waitUntil: "load" }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "load" });
      const medir = () => p.evaluate(() => {
        const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden"; };
        const alvos = [...document.querySelectorAll("button, a[href], select, input:not([type=checkbox])")].filter(vis)
          .filter((e) => !e.closest(".nojs") && !e.closest(".sheet:not(.on)") && !e.closest(".fx-g nav") && !e.closest(".fx-g div:not(.fx-m)") || e.classList.contains("fx-b"));
        const pequenos = alvos.filter((e) => { const r = e.getBoundingClientRect(); return r.height < 43.5 && r.width < 200; }).map((e) => (e.className || e.tagName) + ":" + Math.round(e.getBoundingClientRect().height));
        return { estouro: document.documentElement.scrollWidth - innerWidth, pequenos: [...new Set(pequenos)], alvos: alvos.length };
      });
      const m = { inicio: await medir() };
      await p.evaluate(() => document.querySelector('#grid .pc[data-i="0"] .ph').click()); await p.waitForTimeout(500);
      m.produto = await medir();
      m.painelCabe = await p.evaluate(() => { const r = document.getElementById("pv").getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1; });
      await p.evaluate(() => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); document.querySelector('#grid .pc[data-i="0"] [data-add]').click(); document.querySelector(".bagbtn").click(); }); await p.waitForTimeout(500);
      await p.evaluate(() => document.querySelector('[data-step="checkout"]').click());
      m.checkout = await medir();
      m.sacolaCabe = await p.evaluate(() => { const r = document.getElementById("bag").getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1; });
      m.imagens = await p.evaluate(async () => { const s = [...new Set([...document.images].map((i) => i.src))]; let f = 0; for (const u of s) { const i = new Image(); i.src = u; try { await i.decode(); } catch { f++; } } return { total: s.length, falhas: f }; });
      m.erros = ctx.registro.erros.length; m.externas = ctx.registro.bloqueadas.length;
      layout[nome] = m; await ctx.close();
    }
    const L = Object.entries(layout);
    reg("P8", "Sem rolagem lateral e painéis dentro da tela em 1440, 1024, 768, 390 e 320 px",
      L.flatMap(([n, m]) => [m.inicio.estouro > 1 && `${n}: página estoura ${m.inicio.estouro}px`, m.produto.estouro > 1 && `${n}: produto estoura`, m.checkout.estouro > 1 && `${n}: checkout estoura`, !m.painelCabe && `${n}: painel do produto fora da tela`, !m.sacolaCabe && `${n}: sacola fora da tela`].filter(Boolean)),
      L.map(([n, m]) => `${n}: estouro ${m.inicio.estouro}px · painel do produto ${m.painelCabe ? "ok" : "fora"} · sacola ${m.sacolaCabe ? "ok" : "fora"}`));
    reg("P9", "Áreas de toque com pelo menos 44 px no celular (início, produto e checkout)",
      ["celular", "celular pequeno"].flatMap((n) => ["inicio", "produto", "checkout"].flatMap((t) => layout[n][t].pequenos.map((x) => `${n} · ${t}: ${x}px`))),
      ["celular", "celular pequeno"].map((n) => `${n}: ${layout[n].inicio.alvos} controles visíveis conferidos no início`));
    reg("P10", "Imagens carregam, zero erros de JavaScript e zero requisições externas",
      [...L.flatMap(([n, m]) => [m.imagens.falhas && `${n}: ${m.imagens.falhas} imagens falharam`, m.erros && `${n}: ${m.erros} erros`, m.externas && `${n}: ${m.externas} requisições externas`].filter(Boolean)),
        ...[...new Set(erros)].slice(0, 5), ...[...new Set(bloqueadas)].slice(0, 5)],
      L.map(([n, m]) => `${n}: ${m.imagens.total} imagens distintas, ${m.imagens.falhas} falhas`));

    // P11: contraste do texto (WCAG AA: 4,5:1; 3:1 para texto grande) nas telas principais
    { const falhas = []; let conferidos = 0;
      for (const [nome, viewport] of [["desktop", { width: 1440, height: 900 }], ["celular", { width: 390, height: 844 }]]) {
        const ctx = await novoContexto(browser, { viewport }); const p = await ctx.newPage();
        await p.emulateMedia({ reducedMotion: "reduce" });
        await p.goto(uProto, { waitUntil: "load" }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "load" });
        const medir = (tela) => p.evaluate((tela) => {
          const lum = (c) => { const v = c.map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
          const cor = (s) => { const m = s.match(/[\d.]+/g).map(Number); return { rgb: m.slice(0, 3), a: m.length > 3 ? m[3] : 1 }; };
          const fundo = (e) => { for (let x = e; x; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.backgroundImage !== "none" && !/^linear-gradient\(rgb\([^)]+\), rgb\([^)]+\)\)$/.test(cs.backgroundImage)) return null;
            const c = cor(cs.backgroundColor); if (c.a >= 0.99) return c.rgb; if (c.a > 0.01) return null; } return [255, 255, 255]; };
          const out = []; let n = 0;
          for (const e of document.querySelectorAll("body *")) {
            if (![...e.childNodes].some((t) => t.nodeType === 3 && t.textContent.trim())) continue;
            const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
            if (!r.width || !r.height || cs.visibility === "hidden" || +cs.opacity === 0 || e.closest(".sheet:not(.on)") || e.closest(".nojs") || e.closest("[hidden]")) continue;
            if (e.closest(".slide:not(.on)") || e.closest(".toast") || e.closest(".bar:not(.on)")) continue;
            const bg = fundo(e); if (!bg) continue; const fg = cor(cs.color); if (fg.a < 0.99) continue;
            const a = lum(fg.rgb), b = lum(bg), razao = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
            const px = parseFloat(cs.fontSize), grande = px >= 24 || (px >= 18.66 && +cs.fontWeight >= 700); n++;
            if (razao < (grande ? 3 : 4.5)) out.push(`${tela}: "${e.textContent.trim().slice(0, 28)}" (${(e.className || e.tagName).toString().slice(0, 24)}) ${razao.toFixed(2)}:1`);
          }
          return { n, out: [...new Set(out)] };
        }, tela);
        const junta = (m) => { conferidos += m.n; falhas.push(...m.out); };
        junta(await medir(nome + " · início"));
        for (const k of [1, 2, 3]) { await p.evaluate((k) => document.querySelector(`#dots [data-sl="${k}"]`).click(), k); await p.waitForTimeout(900); junta(await medir(`${nome} · banner ${k + 1}`)); }
        await p.evaluate(() => document.querySelector('#grid .pc[data-i="0"] .ph').click()); await p.waitForTimeout(600); junta(await medir(nome + " · produto"));
        await p.evaluate(() => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); document.querySelector('#grid .pc[data-i="0"] [data-add]').click(); document.querySelector(".bagbtn").click(); }); await p.waitForTimeout(600);
        junta(await medir(nome + " · sacola"));
        await p.evaluate(() => { document.querySelector('[data-step="checkout"]').click(); document.querySelector('[data-pay="card"]').click(); document.querySelector("[data-submit]").click(); }); await p.waitForTimeout(300);
        junta(await medir(nome + " · checkout com erros"));
        await ctx.close();
      }
      reg("P11", "Contraste do texto dentro do mínimo (4,5:1; 3:1 para texto grande) em início, banners, produto, sacola e checkout", [...new Set(falhas)], [`${conferidos} textos medidos em desktop e celular`]); }

    // P12: limpar filtros, apagar busca, voltar ao topo e atalho de teclado
    { const d = [], det = [];
      for (const [nome, viewport] of [["desktop", { width: 1440, height: 900 }], ["celular", { width: 390, height: 844 }]]) {
        const ctx = await novoContexto(browser, { viewport }); const p = await ctx.newPage();
        await p.emulateMedia({ reducedMotion: "reduce" });
        await p.goto(uProto, { waitUntil: "load" }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "load" });
        const estado = () => p.evaluate(() => ({ cnt: document.getElementById("cnt").textContent, limpar: !document.querySelector(".limpar").hidden, apaga: !document.querySelector(".apaga").hidden,
          cat: document.querySelector('.seg [aria-pressed="true"]').dataset.cat, marca: document.getElementById("fBrand").value, ordem: document.getElementById("fSort").value, q: document.getElementById("q").value }));
        const tick = () => p.waitForTimeout(80);
        const e0 = await estado(); if (e0.limpar || e0.apaga) d.push(`${nome}: botões visíveis sem filtro`);
        await p.fill("#q", "club"); await tick(); const e1 = await estado(); if (!e1.limpar || !e1.apaga) d.push(`${nome}: busca não mostrou limpar/apagar`);
        await p.evaluate(() => document.querySelector(".apaga").click()); await tick(); const e2 = await estado(); if (e2.q || e2.cnt !== e0.cnt || e2.limpar) d.push(`${nome}: apagar busca não restaurou o catálogo`);
        await p.evaluate(() => { document.querySelector('.seg [data-cat="perfume"]').click(); const o = document.getElementById("fSort"); o.value = "asc"; o.dispatchEvent(new Event("change", { bubbles: true })); });
        await p.selectOption("#fBrand", "armaf"); await p.fill("#q", "woman"); await tick();
        const e3 = await estado(); if (!e3.limpar || e3.cnt === e0.cnt) d.push(`${nome}: filtros combinados não refletidos`);
        await p.evaluate(() => document.querySelector(".limpar").click()); await tick();
        const e4 = await estado(); if (e4.cnt !== e0.cnt || e4.cat !== "all" || e4.marca !== "all" || e4.ordem !== "cat" || e4.q || e4.limpar) d.push(`${nome}: limpar filtros não restaurou tudo (${JSON.stringify(e4)})`);
        await p.evaluate(() => window.scrollTo(0, 3000)); await p.waitForTimeout(250);
        const t1 = await p.evaluate(() => document.querySelector(".topo").classList.contains("on")); if (!t1) d.push(`${nome}: voltar ao topo não apareceu`);
        await p.evaluate(() => document.querySelector(".topo").click()); await p.waitForTimeout(300);
        const y = await p.evaluate(() => window.scrollY); if (y > 5) d.push(`${nome}: voltar ao topo não rolou (y=${y})`);
        await p.reload({ waitUntil: "load" }); // foco volta ao início do documento
        await p.keyboard.press("Tab"); const foco = await p.evaluate(() => document.activeElement.className); if (foco !== "pular") d.push(`${nome}: primeiro Tab não foca o atalho (${foco})`);
        det.push(`${nome}: com filtros "${e3.cnt}" → após limpar "${e4.cnt}"`);
        d.push(...ctx.registro.erros.map((x) => `${nome}: ${x}`)); await ctx.close();
      }
      reg("P12", "Navegação do catálogo: limpar filtros, apagar busca, voltar ao topo e atalho de teclado", d, det); }

    // P13 (só a loja): páginas individuais de produto
    if (LOJA) {
      const vm = require("vm"); const d = [], det = [];
      const DATA = vm.runInNewContext(fs.readFileSync(path.join(RAIZ, "dados/catalogo.js"), "utf8") + "\n;DATA", Object.create(null));
      const CFG = vm.runInNewContext(fs.readFileSync(path.join(RAIZ, "assets/config.js"), "utf8") + "\n;CFG", Object.create(null));
      const PAG = vm.runInNewContext(fs.readFileSync(path.join(RAIZ, "dados/paginas.js"), "utf8") + "\n;PAGINAS", Object.create(null));
      const fmt = (v) => "R$ " + v.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      const opc = (b) => { const o = []; for (let n = 1; n <= 12; n++) { const par = Math.ceil(b / (1 - (CFG.fees[n] || 0) / 100) / n * 100 - 1e-9) / 100; if (n === 1 || par >= CFG.minParcela) o.push(`<tr><td>${n}x</td><td>${fmt(par)}</td><td>${fmt(Math.round(par * n * 100) / 100)}</td></tr>`); } return o.join(""); };
      const reais = DATA.products.filter((p) => !p.test); const slugs = Object.values(PAG);
      if (slugs.length !== reais.length || new Set(slugs).size !== slugs.length) d.push(`páginas ${slugs.length} (únicas ${new Set(slugs).size}) ≠ produtos ${reais.length}`);
      const mapa = fs.readFileSync(path.join(RAIZ, "sitemap.xml"), "utf8");
      for (const p of reais) {
        const arq = path.join(RAIZ, "produto", PAG[p.i] || "?", "index.html");
        if (!fs.existsSync(arq)) { d.push(`i=${p.i}: página ausente`); continue; }
        const h = fs.readFileSync(arq, "utf8"), n3 = String(p.i).padStart(3, "0");
        const ld = JSON.parse((h.match(/<script type="application\/ld\+json">(\{"@context":"https:\/\/schema.org","@type":"Product".*?)<\/script>/) || [])[1] || "{}");
        if (!h.includes(`data-i="${p.i}"`)) d.push(`i=${p.i}: posição errada na página`);
        if (!h.includes(`<strong id="preco">${fmt(p.price)}</strong>`)) d.push(`i=${p.i}: preço da página difere do catálogo`);
        if (p.old && !h.includes(`<s>${fmt(p.old)}</s>`)) d.push(`i=${p.i}: preço "de" ausente`);
        if (!h.includes(`<table class="itab" id="parcelas">${opc(p.price)}</table>`)) d.push(`i=${p.i}: parcelas diferem da fórmula`);
        if (!h.includes(`fetchpriority="high" src="../../img/produtos/${n3}.webp"`)) d.push(`i=${p.i}: imagem errada`);
        if (ld.offers?.price !== p.price.toFixed(2) || ld.sku !== String(p.i)) d.push(`i=${p.i}: dados estruturados divergentes`);
        if (!mapa.includes(`produto/${PAG[p.i]}/</loc>`)) d.push(`i=${p.i}: fora do sitemap`);
        if (/base64,|script\.google\.com|fetch\(/.test(h)) d.push(`i=${p.i}: conteúdo inesperado na página`);
      }
      const e404 = fs.existsSync(path.join(RAIZ, "404.html")) ? fs.readFileSync(path.join(RAIZ, "404.html"), "utf8") : "";
      if (!/noindex/.test(e404) || !/href="\/catalogo\/"/.test(e404) || /href="(assets|img)\//.test(e404)) d.push("404.html ausente, indexável ou com caminhos relativos");
      det.push(`${reais.length} páginas conferidas contra o catálogo: posição, preço, preço "de", parcelas, imagem, dados estruturados e sitemap · 404.html da marca (noindex, caminhos absolutos)`);
      // Navegação real: página → sacola compartilhada → sacola da loja
      for (const [nome, viewport] of [["desktop", { width: 1440, height: 900 }], ["celular", { width: 390, height: 844 }]]) {
        const ctx = await novoContexto(browser, { viewport }); const p = await ctx.newPage(); await p.emulateMedia({ reducedMotion: "reduce" });
        const alvo = reais.find((x) => x.i === 61), u = uProto + "produto/" + PAG[61] + "/";
        await p.goto(u, { waitUntil: "load" }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "load" });
        const estouro = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (estouro > 1) d.push(`${nome}: página estoura ${estouro}px`);
        const peq = await p.evaluate(() => [...document.querySelectorAll("main button, main a.btn-pay, main a.add, .bagbtn")].filter((e) => e.getBoundingClientRect().height < 43.5).map((e) => e.id || e.className)); if (peq.length) d.push(`${nome}: controles menores que 44px: ${peq}`);
        await p.click("#mais"); await p.click("#adicionar");
        const s1 = await p.evaluate(() => ({ bag: localStorage.getItem("cp3_bag"), n: document.getElementById("sacolaN").textContent, preco: document.getElementById("preco").textContent }));
        if (s1.bag !== '{"61":2}' || s1.n !== "2" || s1.preco !== fmt(alvo.price)) d.push(`${nome}: sacola da página incorreta ${JSON.stringify(s1)}`);
        await p.click("#comprar"); await p.waitForURL((x) => x.pathname === new URL(uProto).pathname, { timeout: 10000 }); await p.waitForTimeout(500);
        const s2 = await p.evaluate(() => ({ aberta: document.getElementById("bag").classList.contains("on"), bag: localStorage.getItem("cp3_bag"), total: document.getElementById("barTotal").textContent }));
        if (!s2.aberta || s2.bag !== '{"61":3}' || s2.total !== fmt(alvo.price * 3)) d.push(`${nome}: sacola da loja não refletiu a página ${JSON.stringify(s2)}`);
        await p.goto(uProto + "?cat=cabelo&busca=fino#catalogo", { waitUntil: "load" }); await p.waitForTimeout(200);
        const s3 = await p.evaluate(() => ({ cnt: document.getElementById("cnt").textContent, cat: document.querySelector('.seg [aria-pressed="true"]').dataset.cat, q: document.getElementById("q").value, url: location.search }));
        if (s3.cat !== "cabelo" || s3.q !== "fino" || s3.url !== "") d.push(`${nome}: chegada por ?cat/?busca incorreta ${JSON.stringify(s3)}`);
        await p.evaluate(() => document.querySelector('#grid .pc[data-i="61"] .ph').click()); await p.waitForTimeout(400);
        const lk = await p.evaluate(() => document.querySelector("#pvBody .pg-link")?.getAttribute("href")); if (lk !== `produto/${PAG[61]}/`) d.push(`${nome}: atalho do painel para a página: ${lk}`);
        d.push(...ctx.registro.erros.map((x) => `${nome}: ${x}`), ...ctx.registro.bloqueadas.map((x) => `${nome}: externa ${x}`));
        det.push(`${nome}: página → +2 na sacola → "Comprar agora" → sacola da loja aberta com ${s2.total}; chegada por categoria e busca: ${s3.cnt}`);
        await ctx.close();
      }
      reg("P13", "Páginas de produto: 156 páginas fiéis ao catálogo e integradas à sacola da loja", d, det);
    }

    // P14: miniaturas — arquivos, dimensões, originais preservados e peso do primeiro carregamento no celular
    { const d = [], det = [];
      const dim = (arq) => { const b = fs.readFileSync(arq), t = b.slice(12, 16).toString();
        if (t === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
        if (t === "VP8X") return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)]; return null; };
      const lista = fs.readdirSync(path.join(RAIZ, "img", "produtos")).filter((n) => n.endsWith(".webp"));
      let menores = 0, somaOrig = 0, somaMini = 0;
      for (const n of lista) for (const [pasta, w, h] of [["produtos-320", 320, 400], ["produtos-480", 480, 600]]) {
        const arq = path.join(RAIZ, "miniaturas", pasta, n);
        if (!fs.existsSync(arq)) { d.push(`ausente: miniaturas/${pasta}/${n}`); continue; }
        const [lw, lh] = dim(arq) || [0, 0]; if (lw !== w || lh !== h) d.push(`${pasta}/${n}: ${lw}×${lh} (esperado ${w}×${h})`);
        if (pasta === "produtos-320") { somaOrig += fs.statSync(path.join(RAIZ, "img", "produtos", n)).size; somaMini += fs.statSync(arq).size; if (fs.statSync(arq).size < fs.statSync(path.join(RAIZ, "img", "produtos", n)).size) menores++; }
      }
      for (const [n, w] of [["logo-128.webp", 128], ["logo-256.webp", 256]]) { const arq = path.join(RAIZ, "miniaturas", "marca", n); const x = fs.existsSync(arq) ? dim(arq) : null; if (!x || x[0] !== w || x[1] !== w) d.push(`logotipo ${n} ausente ou com dimensões erradas`); }
      det.push(`${lista.length} fotos × 2 miniaturas e 2 tamanhos do logotipo conferidos · miniatura de 320 px menor que o original em ${menores} de ${lista.length}`);
      det.push(`soma das miniaturas de 320 px: ${(somaMini / 1024).toFixed(0)} KB contra ${(somaOrig / 1024).toFixed(0)} KB dos originais`);
      // peso no celular: sem rolagem, só o que o navegador baixa ao abrir
      const medir = async (dpr) => { const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: dpr, serviceWorkers: "block", locale: "pt-BR" });
        await ctx.route("**/*", (r) => (new URL(r.request().url()).hostname === "127.0.0.1" ? r.continue() : r.abort()));
        const pg = await ctx.newPage(), imgs = []; pg.on("response", async (r) => { if (r.request().resourceType() === "image") { try { imgs.push({ u: r.url(), b: (await r.body()).length }); } catch { /* sem corpo */ } } });
        await pg.goto(uProto, { waitUntil: "load" }); await pg.waitForLoadState("networkidle");
        const usa = await pg.evaluate(() => { const c = document.querySelector('#grid .pc[data-i="0"] img'), b = document.querySelector(".slide.on .arco.g img"); return { atual: b.currentSrc, src: c.getAttribute("src") }; });
        await ctx.close(); return { kb: imgs.reduce((a, x) => a + x.b, 0) / 1024, n: imgs.length, usa, mini: imgs.filter((x) => /miniaturas\//.test(x.u)).length }; };
      const m1 = await medir(1), m2 = await medir(2);
      if (!/miniaturas\/produtos-320\//.test(m1.usa.atual)) d.push(`1x: banner usa ${m1.usa.atual}`);
      if (!/miniaturas\/produtos-480\//.test(m2.usa.atual)) d.push(`2x: banner usa ${m2.usa.atual}`);
      if (!/img\/produtos\/000\.webp/.test(m1.usa.src)) d.push(`o atributo src do card não aponta para o original: ${m1.usa.src}`);
      for (const [r, m] of [["1x", m1], ["2x", m2]]) { det.push(`celular ${r}: ${m.kb.toFixed(0)} KB de imagens em ${m.n} arquivos (${m.mini} miniaturas) — antes das miniaturas: 2474 KB`); if (m.kb > 1300) d.push(`celular ${r}: ${m.kb.toFixed(0)} KB de imagens (limite 1300 KB)`); }
      reg("P14", "Miniaturas: 316 arquivos nas dimensões certas, originais preservados e no máximo 1,3 MB de imagens no primeiro acesso no celular", d, det); }

    // P15: indicador de etapas e foco dentro dos painéis (desktop e celular)
    { const d = [], det = [];
      for (const [nome, viewport] of [["desktop", { width: 1440, height: 900 }], ["celular", { width: 390, height: 844 }]]) {
        const ctx = await novoContexto(browser, { viewport }); const p = await ctx.newPage(); await p.emulateMedia({ reducedMotion: "reduce" });
        await p.goto(uProto, { waitUntil: "load" }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "load" });
        const esp = () => p.waitForTimeout(500);
        await p.evaluate(() => document.querySelector('#grid .pc[data-i="0"] [data-add]').click());
        await p.focus(".bagbtn"); await p.keyboard.press("Enter"); await esp();
        const e1 = await p.evaluate(() => { const e = document.querySelector("#bagBody > .etapas"); return e && { n: e.dataset.n, ligadas: e.querySelectorAll(".on").length, oculto: e.getAttribute("aria-hidden"), texto: e.textContent }; });
        if (!e1 || e1.n !== "1" || e1.ligadas !== 1 || e1.oculto !== "true" || e1.texto !== "") d.push(`${nome}: etapa 1 incorreta ${JSON.stringify(e1)}`);
        await p.evaluate(() => document.querySelector('[data-step="checkout"]').click()); await esp();
        const e2 = await p.evaluate(() => { const e = document.querySelector("#bagBody > .etapas"); return e && { n: e.dataset.n, ligadas: e.querySelectorAll(".on").length, total: document.querySelectorAll("#bagBody > .etapas").length }; });
        if (!e2 || e2.n !== "2" || e2.ligadas !== 2 || e2.total !== 1) d.push(`${nome}: etapa 2 incorreta ${JSON.stringify(e2)}`);
        // foco preso: 40 Tabs e 40 Shift+Tabs nunca saem do painel
        let fora = 0;
        for (let k = 0; k < 40; k++) { await p.keyboard.press("Tab"); if (!(await p.evaluate(() => document.getElementById("bag").contains(document.activeElement)))) fora++; }
        for (let k = 0; k < 40; k++) { await p.keyboard.press("Shift+Tab"); if (!(await p.evaluate(() => document.getElementById("bag").contains(document.activeElement)))) fora++; }
        if (fora) d.push(`${nome}: foco saiu do painel da sacola ${fora} vezes`);
        await p.keyboard.press("Escape"); await esp();
        const volta = await p.evaluate(() => document.activeElement.className); if (!/bagbtn/.test(volta)) d.push(`${nome}: foco não voltou ao botão da sacola (${volta})`);
        await p.evaluate(() => document.querySelector('#grid .pc[data-i="1"] .ph').focus()); await p.keyboard.press("Enter"); await esp();
        let foraP = 0; for (let k = 0; k < 40; k++) { await p.keyboard.press("Tab"); if (!(await p.evaluate(() => document.getElementById("pv").contains(document.activeElement)))) foraP++; }
        if (foraP) d.push(`${nome}: foco saiu do painel do produto ${foraP} vezes`);
        await p.keyboard.press("Escape"); await esp();
        const voltaP = await p.evaluate(() => document.activeElement.closest(".pc")?.dataset.i); if (voltaP !== "1") d.push(`${nome}: foco não voltou ao card do produto (${voltaP})`);
        det.push(`${nome}: etapas 1 e 2 corretas · 80 Tabs na sacola e 40 no produto sem sair do painel · foco devolvido ao fechar`);
        d.push(...ctx.registro.erros.map((x) => `${nome}: ${x}`)); await ctx.close();
      }
      reg("P15", "Sacola e checkout: indicador de etapas e foco preso no painel, com devolução ao fechar", d, det); }
  } finally { await browser.close(); sRef.fechar(); sLoja.fechar(); }

  const ic = { PASSOU: "✅ PASSOU", FALHOU: "❌ FALHOU" };
  let md = `# Bateria da Fase 2 — ${LOJA ? "loja redesenhada" : "protótipo"}\n\n- ${new Date().toISOString()} · referência: loja publicada \`${REF.slice(0, 7)}\` · candidato: \`${SUB || "index.html da raiz"}\`\n- Servidor de pedidos e pagamento **simulados**; rede externa bloqueada.\n\n| Teste | Status | Descrição |\n|---|---|---|\n`;
  md += R.map((r) => `| ${r.id} | ${ic[r.status]} | ${r.titulo} |`).join("\n") + "\n";
  for (const r of R) { md += `\n## ${r.id} — ${r.titulo}\n\n**${ic[r.status]}**\n\n` + r.detalhes.map((x) => `- ${x}`).join("\n") + "\n"; if (r.divergencias.length) md += "\nDivergências:\n\n" + r.divergencias.map((x) => `- ${x}`).join("\n") + "\n"; }
  fs.writeFileSync(path.join(SAIDA, "resultado.md"), md);
  fs.writeFileSync(path.join(SAIDA, "resultado.json"), JSON.stringify(R, null, 1));
  console.log("\n"); for (const r of R) console.log(`${r.status.padEnd(7)} ${r.id.padEnd(4)} ${r.titulo}`);
  process.exitCode = R.some((r) => r.status === "FALHOU") ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(2); });
