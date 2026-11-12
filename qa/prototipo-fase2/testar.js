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
      const intactos = ["dados", "assets/config.js", "assets/app.js", "assets/qrcode.js", "assets/estilo.css", "img", "fonts", "admin", "instagram"];
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
