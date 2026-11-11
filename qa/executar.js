#!/usr/bin/env node
"use strict";
// Bateria T1–T15 (criada na Fase 0, estendida na Fase 1). Uso:  node qa/executar.js [--ref <commit>] [--candidato <pasta>] [--gravar-manifesto]
// REFERÊNCIA = index.html do commit publicado (extraído do git para qa/.trabalho/, sem tocar no repositório).
// CANDIDATO  = pasta a validar (padrão: a raiz do repositório). Nenhuma requisição externa real é feita.
const fs = require("fs");
const path = require("path");
const { RAIZ, git, diff, brl } = require("./lib/util");
const { extrair } = require("./lib/extrair");
const { montar } = require("./lib/montar");
const { iniciar } = require("./lib/servidor");
const { abrirNavegador } = require("./lib/navegador");
const E = require("./testes/estaticos");
const N = require("./testes/navegador");

const arg = (n, d) => { const k = process.argv.indexOf(n); return k > 0 ? process.argv[k + 1] : d; };
const REF = git(["rev-parse", arg("--ref", "89ef168bd1304769d1eeabdb88ddea6724839995")]).toString().trim();
const CAND_DIR = path.resolve(arg("--candidato", RAIZ));
const QA = __dirname, TRAB = path.join(QA, ".trabalho"), REL = path.join(QA, "relatorio"), CAPT = path.join(REL, "capturas");
const MANIFESTO = path.join(QA, "referencia", "manifesto.json");

const res = (id, titulo, status, detalhes = [], divergencias = []) => ({ id, titulo, status, detalhes, divergencias });
const status = (d) => (d.length ? "FALHOU" : "PASSOU");

// Fórmula de parcelamento reimplementada de forma independente a partir do CFG (para conferir a interface).
function opcoes(CFG, base) {
  const o = [];
  for (let n = 1; n <= 12; n++) {
    const fee = (CFG.fees[n] || 0) / 100, par = Math.ceil(base / (1 - fee) / n * 100 - 1e-9) / 100, total = Math.round(par * n * 100) / 100;
    if (n === 1 || par >= CFG.minParcela) o.push({ n, par, total });
  }
  return o;
}

async function main() {
  const t0 = Date.now();
  fs.mkdirSync(TRAB, { recursive: true }); fs.mkdirSync(CAPT, { recursive: true });
  const refDir = path.join(TRAB, "referencia-" + REF.slice(0, 7));
  fs.mkdirSync(refDir, { recursive: true });
  fs.writeFileSync(path.join(refDir, "index.html"), git(["show", `${REF}:index.html`]));

  const htmlRef = fs.readFileSync(path.join(refDir, "index.html"), "utf8");
  // Versões separadas (Fase 1) são remontadas em memória para as verificações estáticas T1–T3.
  const montagem = montar(CAND_DIR);
  const htmlCand = montagem.html;
  const ref = extrair(htmlRef), cand = extrair(htmlCand);
  cand.tamanho = montagem.indexBytes; cand.separado = montagem.separado;

  if (process.argv.includes("--gravar-manifesto")) {
    fs.mkdirSync(path.dirname(MANIFESTO), { recursive: true });
    fs.writeFileSync(MANIFESTO, JSON.stringify({ commit: REF, gerado: new Date().toISOString(), ...E.manifesto(ref) }, null, 1));
    console.log("Manifesto de referência gravado em", path.relative(RAIZ, MANIFESTO));
  }
  const man = fs.existsSync(MANIFESTO) ? JSON.parse(fs.readFileSync(MANIFESTO, "utf8")) : null;

  const R = [];
  R.push(E.T1(ref, cand, man), E.T2(ref, cand), E.T3(ref, cand, man));

  const sRef = await iniciar(refDir), sCand = await iniciar(CAND_DIR);
  const browser = await abrirNavegador();
  const bloqueadasTotal = [], errosTotal = [];
  const ambos = async (fn, ...a) => {
    const [r, c] = [await fn(browser, sRef.url, ...a), await fn(browser, sCand.url, ...a)];
    bloqueadasTotal.push(...r.bloqueadas, ...c.bloqueadas); errosTotal.push(...r.erros.map((e) => "ref " + e), ...c.erros.map((e) => "cand " + e));
    return { r, c, d: diff(r.saida, c.saida, "saida") };
  };
  const P = cand.DATA.products, B = Object.fromEntries(cand.DATA.brands.map((b) => [b.id, b]));
  const fmtV = (v) => brl(v).replace("R$ ", "");

  try {
    // T4
    process.stdout.write("T4 cards… ");
    { const { r, c, d } = await ambos(N.cards); const a = [];
      if (c.saida.length !== P.length) a.push(`cards no catálogo: ${c.saida.length} (esperado ${P.length})`);
      const visiveis = c.saida.filter((k) => !k.oculto);
      if (visiveis.length !== 156) a.push(`cards visíveis: ${visiveis.length} (esperado 156)`);
      for (const k of c.saida) if (k.oculto !== !!P[k.i].test) a.push(`i=${k.i}: visibilidade inesperada`);
      for (const k of c.saida) { const p = P[k.i], m = opcoes(cand.CFG, p.price).pop();
        const selo = (cand.CFG.best.includes(p.i) ? "Mais vendido" : "") + (p.i >= cand.CFG.newFrom && !p.test ? (p.i === cand.CFG.kitFrom ? "Kit" : "Novo") : "") + (p.old ? `-${Math.round((1 - p.price / p.old) * 100)}%` : "");
        const esp = { marca: B[p.brand].short, nome: p.name, spec: p.spec, preco: "R$" + fmtV(p.price), de: p.old ? brl(p.old) : null,
          tag: selo || null, parcelas: m.n > 1 ? `ou ${m.n}x de ${brl(m.par)} no cartão` : "no cartão: " + brl(m.total) };
        for (const [f, v] of Object.entries(esp)) if (k[f] !== v) a.push(`i=${k.i} ${f}: tela "${k[f]}" ≠ cadastro "${v}"`);
        if (k.acao !== "Adicionar") a.push(`i=${k.i} botão "${k.acao}"`); }
      R.push(res("T4", "Cards: marca, nome, apresentação, preço, preço \"de\", % e parcelas × cadastro", status([...d, ...a]),
        [`${c.saida.length} cards conferidos campo a campo contra o cadastro (DATA) e contra a referência — ${c.saida.filter((x) => !x.oculto).length} visíveis + item de teste oculto`,
         `selos: desconto ${c.saida.filter((x) => /%/.test(x.tag || "")).length} · mais vendido ${c.saida.filter((x) => /Mais vendido/.test(x.tag || "")).length} · novo ${c.saida.filter((x) => /Novo/.test(x.tag || "")).length} · kit ${c.saida.filter((x) => /Kit/.test(x.tag || "")).length}`], [...d, ...a])); }

    // T5/T6/T7
    process.stdout.write("T5–T7 navegação… ");
    { const { c, d } = await ambos(N.navegacao); const s = c.saida, a = [];
      const real = P.filter((p) => !p.test), porCat = {}; real.forEach((p) => (porCat[p.cat] = (porCat[p.cat] || 0) + 1));
      for (const [cat, v] of Object.entries(s.categorias)) { const esp = cat === "all" ? real.length : porCat[cat]; if (v.ids.length !== esp) a.push(`categoria ${cat}: ${v.ids.length} ≠ ${esp}`);
        if (cat !== "all" && v.ids.some((i) => P[i].cat !== cat)) a.push(`categoria ${cat} contém produto de outra categoria`); }
      for (const [b, v] of Object.entries(s.marcas)) if (b !== "all") { const esp = real.filter((p) => p.brand === b).length; if (v.ids.length !== esp) a.push(`marca ${b}: ${v.ids.length} ≠ ${esp}`); }
      const pr = (ids) => ids.map((i) => P[i].price);
      if (pr(s.ordens.asc.ids).some((v, k, x) => k && v < x[k - 1])) a.push("ordenação 'menor preço' fora de ordem");
      if (pr(s.ordens.desc.ids).some((v, k, x) => k && v > x[k - 1])) a.push("ordenação 'maior preço' fora de ordem");
      const d5 = d.filter((x) => /categorias|marcas|ordens/.test(x)), d6 = d.filter((x) => /buscas/.test(x)), d7 = d.filter((x) => /vitrines/.test(x));
      R.push(res("T5", "Categorias, marcas e ordenações", status([...d5, ...a]), [
        "por categoria: " + Object.entries(s.categorias).map(([k, v]) => `${k} ${v.ids.length}`).join(", "),
        `${Object.keys(s.marcas).length - 1} filtros de marca conferidos · 5 ordenações conferidas`], [...d5, ...a]));
      R.push(res("T6", "Busca (11 consultas, com e sem acento, inexistente e vazia)", status(d6),
        Object.entries(s.buscas).map(([q, v]) => `"${q}" → ${v.ids.length} resultado(s)`), d6));
      const a7 = [], ofEsp = P.filter((p) => p.old && !p.test).sort((x, y) => (1 - y.price / y.old) - (1 - x.price / x.old)).map((p) => p.i);
      if (diff(s.vitrines.ofertas, ofEsp).length) a7.push("vitrine Ofertas difere do cadastro");
      if (diff(s.vitrines.maisVendidos, cand.CFG.best).length) a7.push("vitrine Mais vendidos difere de CFG.best");
      R.push(res("T7", "Vitrines (mais vendidos, ofertas, novidades), rotinas, atalhos e contatos", status([...d7, ...a7]), [
        `mais vendidos: ${s.vitrines.maisVendidos.length} · ofertas: ${s.vitrines.ofertas.length} · novidades: ${s.vitrines.novidades.length} · banners: ${s.vitrines.banners}`,
        "atalhos: " + s.vitrines.atalhosCategoria.join(" | ")], [...d7, ...a7])); }

    // T8
    process.stdout.write("T8 parcelamento… ");
    { const { c, d } = await ambos(N.parcelamento); const a = [];
      const linha = (o) => [`${o.n}x`, brl(o.par), brl(o.total)];
      for (const [i, v] of Object.entries(c.saida.produto)) { const esp = opcoes(cand.CFG, P[i].price).map(linha);
        if (diff(esp, v.tabela).length) a.push(`i=${i}: tabela de parcelas difere da fórmula`); }
      for (const [v, t] of Object.entries(c.saida.simulador)) { const n = parseFloat(v.replace(/\./g, "").replace(",", ".")) || 0;
        const esp = n > 0 ? opcoes(cand.CFG, n).map(linha) : []; if (diff(esp, t).length) a.push(`simulador R$ ${v}: difere da fórmula`); }
      R.push(res("T8", "Parcelamento 1x–12x: tabela de cada produto e simulador × fórmula × referência", status([...d, ...a]), [
        `${Object.keys(c.saida.produto).length} tabelas de produto e ${Object.keys(c.saida.simulador).length} valores do simulador conferidos`,
        `ex.: R$ 409,00 → ${c.saida.simulador["409"].map((x) => x.join(" ")).slice(-1)[0]}`], [...d, ...a])); }

    // T9
    process.stdout.write("T9 sacola… ");
    { const r1 = await N.sacola(browser, sRef.url); const sacolaRef = r1.saida.passos.inc0x2.storage.cp3_bag;
      const r = await N.sacola(browser, sRef.url, sacolaRef), c = await N.sacola(browser, sCand.url, sacolaRef);
      bloqueadasTotal.push(...r.bloqueadas, ...c.bloqueadas); errosTotal.push(...r.erros, ...c.erros);
      const d = diff(r.saida, c.saida, "saida"), s = c.saida.passos, a = [];
      if (s.add0.badge !== "1" || s.inc0x2.badge !== "3") a.push("contador da sacola incorreto");
      if (diff(s.dec0.storage, s.aposRecarregar.storage).length) a.push("sacola não persistiu após recarregar");
      if (JSON.parse(s.limite99.storage.cp3_bag)["1"] !== 99) a.push("limite de 99 unidades não respeitado");
      if (s.esvaziada.badge !== "0") a.push("sacola não esvaziou");
      if (!c.saida.compat || c.saida.compat.storage.cp3_bag !== sacolaRef) a.push("sacola salva pela referência não abriu no candidato");
      R.push(res("T9", "Sacola: adicionar, +/−, persistência, rotina, limite 99, esvaziar, compatibilidade cp3_*", status([...d, ...a]), [
        `subtotal após passos: ${s.dec0.total} (${s.dec0.itens}) · após rotina: ${s.rotina.total}`,
        `sacola gravada pela referência (${sacolaRef}) aberta no candidato: ${c.saida.compat ? c.saida.compat.total : "—"}`], [...d, ...a])); }

    // T10
    process.stdout.write("T10 checkout… ");
    { const det = [], dif = [];
      for (const nome of Object.keys(N.CENARIOS)) {
        const { c, d } = await ambos(N.checkout, nome); const s = c.saida, a = [], cen = N.CENARIOS[nome];
        const create = s.chamadas.find((x) => x.corpo && x.corpo.action === "create");
        if (s.chamadas.some((x) => x.metodo !== "POST" || !/^text\/plain/.test(x.contentType || ""))) a.push("chamada fora do padrão POST text/plain");
        if (cen.semEnvio && create) a.push("enviou pedido quando não deveria");
        if (cen.espera === "pagamento" && !/pagamento\.mock\.invalid/.test(s.destino || "")) a.push("não redirecionou ao pagamento simulado");
        if (create && diff(create.corpo.order.items, Object.entries(JSON.parse(cen.sacola || '{"0":1,"88":2}')).map(([i, q]) => ({ i: +i, q }))).length) a.push("itens {i,q} enviados diferem da sacola");
        det.push(`${nome}: ${s.chamadas.map((x) => x.corpo.action).join("+") || "nenhuma chamada"}${create ? ` · pay=${create.corpo.order.pay} inst=${create.corpo.order.inst}${create.corpo.order.coupon ? " cupom=" + create.corpo.order.coupon : ""}` : ""}${s.destino ? " → pagamento simulado" : ""}${s.pix ? " → Pix offline" : ""}${s.whatsapp.length ? ` → ${s.whatsapp.length} link(s) WhatsApp` : ""} — ${d.length + a.length ? "DIVERGE" : "idêntico"}`);
        dif.push(...[...d, ...a].map((x) => `${nome}: ${x}`));
      }
      R.push(res("T10", "Checkout simulado: 16 cenários (Pix, cartão 1/6/12x, cupons, erros, sem rede, validação)", status(dif), det, dif)); }

    // T11
    process.stdout.write("T11 retorno… ");
    { const det = [], dif = []; let vulneravel = null;
      for (const nome of Object.keys(N.RETORNOS)) {
        const { r, c, d } = await ambos(N.retorno, nome); const s = c.saida, a = [];
        if (/R1|R2/.test(nome) && !s.chamadas.some((x) => x.corpo.action === "confirm")) a.push("confirm não foi chamado");
        if (/R3/.test(nome) && s.chamadas.length) a.push("chamou a API sem transaction_nsu");
        if (s.urlFinal !== new URL(sCand.url).pathname) a.push(`URL não foi limpa: ${s.urlFinal}`);
        if (s.sacola !== "{}") a.push("sacola não foi esvaziada no retorno");
        if (N.RETORNOS[nome].seguranca) vulneravel = { ref: r.seguranca, cand: c.seguranca };
        det.push(`${nome}: ${s.chamadas.map((x) => JSON.stringify(x.corpo)).join(" ") || "sem chamada"} → "${s.corpo.split("\n").filter(Boolean).slice(0, 3).join(" / ")}"`);
        dif.push(...[...d, ...a].map((x) => `${nome}: ${x}`));
      }
      if (vulneravel) det.push(`achado de segurança conhecido (receipt_url aceita javascript:) — referência: ${vulneravel.ref ? "presente" : "ausente"} · candidato: ${vulneravel.cand ? "presente" : "ausente"} (correção prevista para a Fase 1, com aprovação)`);
      R.push(res("T11", "Retorno da InfinitePay (confirm, limpeza da URL, sacola) — simulado", status(dif), det, dif)); }

    // T12
    process.stdout.write("T12 visual… ");
    { const r = await N.visual(browser, sRef.url, "referencia", CAPT), c = await N.visual(browser, sCand.url, "candidato", CAPT);
      errosTotal.push(...r.erros, ...c.erros);
      const s = c.saida, a = [];
      if (s.decodificacao.falhas) a.push(`${s.decodificacao.falhas} imagens não decodificaram`);
      if (!(s.modal.largura > 0)) a.push("imagem do produto não carregou no detalhe");
      if (!s.miniaturaSacola.every(Boolean)) a.push("miniatura da sacola não carregou");
      if (!s.rotinas) a.push("imagens das rotinas não carregaram");
      if (s.semAlt) a.push(`${s.semAlt} imagens de produto sem texto alternativo`);
      const capIguais = Object.keys(s.capturas).filter((k) => s.capturas[k] === r.saida.capturas[k]);
      const capComp = [];
      for (const k of Object.keys(s.capturas)) { if (s.capturas[k] === r.saida.capturas[k]) continue;
        const cmp = await N.compararCapturas(browser, path.join(CAPT, `referencia-${k}.png`), path.join(CAPT, `candidato-${k}.png`));
        capComp.push(`${k}: ${cmp.pct.toFixed(3)}% dos pixels`); if (!cmp.mesmasDimensoes || cmp.pct > 0.5) a.push(`captura ${k} difere da referência em ${cmp.pct.toFixed(2)}% dos pixels`); }
      const d = diff({ ...r.saida, capturas: null, erros: null }, { ...s, capturas: null, erros: null }, "saida");
      R.push(res("T12", "Imagens renderizadas (grade, detalhe, sacola, rotinas) e capturas celular/desktop", status([...d, ...a]), [
        `${s.decodificacao.imgs} <img> na página · ${s.decodificacao.distintas} distintas · decodificadas: ${s.decodificacao.ok} · falhas: ${s.decodificacao.falhas}`,
        `detalhe do produto: ${s.modal.largura}×${s.modal.altura}px · miniaturas da sacola ok: ${s.miniaturaSacola.every(Boolean)}`,
        `capturas idênticas byte a byte à referência: ${capIguais.length}/${Object.keys(s.capturas).length}` + (capComp.length ? ` · demais dentro da tolerância de 0,5%: ${capComp.join(", ")}` : "") + " (em qa/relatorio/capturas/)"], [...d, ...a])); }

    // Rede e console (parte de T12/T10): nenhuma requisição externa real e nenhum erro de JavaScript
    const errosReais = errosTotal.filter((e) => !/Failed to load resource|ERR_FAILED|ERR_BLOCKED/.test(e));
    const t12 = R.find((x) => x.id === "T12");
    t12.detalhes.push(`requisições externas bloqueadas em toda a bateria: ${bloqueadasTotal.length} · erros de JavaScript/console: ${errosReais.length}`);
    if (bloqueadasTotal.length) { t12.divergencias.push("requisições externas inesperadas: " + [...new Set(bloqueadasTotal)].slice(0, 5).join(", ")); t12.status = "FALHOU"; }
    if (errosReais.length) { t12.divergencias.push(...[...new Set(errosReais)].slice(0, 10)); t12.status = "FALHOU"; }

    const met = { ref: await N.metricas(browser, sRef.url), cand: await N.metricas(browser, sCand.url) };
    R.push(E.T13(REF, CAND_DIR, montagem), E.T14(cand, met, path.join(CAND_DIR, "index.html")), E.T15(htmlRef, montagem, CAND_DIR));
  } finally { await browser.close(); sRef.fechar(); sCand.fechar(); }

  R.sort((a, b) => +a.id.slice(1) - +b.id.slice(1));
  const resumo = { referencia: REF, candidato: path.relative(RAIZ, CAND_DIR) || ".", quando: new Date().toISOString(), duracaoS: Math.round((Date.now() - t0) / 1000), manifesto: !!man, resultados: R };
  fs.writeFileSync(path.join(REL, "resultado.json"), JSON.stringify(resumo, null, 1));
  fs.writeFileSync(path.join(REL, "resultado.md"), markdown(resumo));
  console.log("\n");
  for (const x of R) console.log(`${x.status.padEnd(11)} ${x.id.padEnd(4)} ${x.titulo}`);
  console.log(`\nRelatório: ${path.relative(RAIZ, path.join(REL, "resultado.md"))} (${resumo.duracaoS}s)`);
  process.exitCode = R.some((x) => x.status === "FALHOU") ? 1 : 0;
}

function markdown(s) {
  const ic = { PASSOU: "✅ PASSOU", FALHOU: "❌ FALHOU", INFORMATIVO: "ℹ️ INFORMATIVO" };
  let m = `# Resultado da bateria T1–T15\n\n- Referência (publicada): \`${s.referencia.slice(0, 7)}\` · Candidato: \`${s.candidato}\` · ${s.quando} · ${s.duracaoS}s\n- Manifesto de referência: ${s.manifesto ? "usado" : "ausente"} · Checkout e pagamentos: **simulados** (nenhuma requisição externa real)\n\n| Teste | Status | Descrição |\n|---|---|---|\n`;
  m += s.resultados.map((r) => `| ${r.id} | ${ic[r.status]} | ${r.titulo} |`).join("\n") + "\n";
  for (const r of s.resultados) {
    m += `\n## ${r.id} — ${r.titulo}\n\n**${ic[r.status]}**\n\n` + r.detalhes.map((x) => `- ${x}`).join("\n") + "\n";
    if (r.divergencias.length) m += `\nDivergências / observações:\n\n` + r.divergencias.map((x) => `- ${x}`).join("\n") + "\n";
  }
  return m;
}

main().catch((e) => { console.error(e); process.exit(2); });
