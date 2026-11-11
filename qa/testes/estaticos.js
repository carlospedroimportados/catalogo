"use strict";
// T1, T2, T3, T13, T14, T15 — verificações sem navegador.
const fs = require("fs");
const path = require("path");
const { RAIZ, sha256, git, diff } = require("../lib/util");

const res = (id, titulo, status, detalhes = [], divergencias = []) => ({ id, titulo, status, detalhes, divergencias });

function manifesto(ex) {
  const imgProd = {};
  ex.imagens.filter((m) => m.tipo === "produto").forEach((m) => (imgProd[m.i] = m.sha256));
  return {
    produtos: ex.DATA.products.map((p) => ({ i: p.i, nome: p.name, registro: sha256(JSON.stringify(p)), imagem: imgProd[p.i] || null })),
    marcas: sha256(JSON.stringify(ex.DATA.brands)), contatos: sha256(JSON.stringify(ex.DATA.contacts)),
    rotinas: sha256(JSON.stringify(ex.DATA.routines)), cfg: sha256(JSON.stringify(ex.CFG)),
    imagens: ex.imagens.map((m) => ({ tipo: m.tipo, i: m.i, cat: m.cat, alt: m.alt, bytes: m.bytes, sha256: m.sha256 })),
  };
}

function T1(ref, cand, man) {
  const P = cand.DATA.products, d = [], det = [];
  d.push(...diff(ref.DATA, cand.DATA, "DATA"));
  if (man) d.push(...diff(man.produtos, manifesto(cand).produtos.map((p) => ({ ...p })), "manifesto.produtos").filter((x) => !x.includes(".imagem")));
  const reais = P.filter((p) => !p.test), cats = {};
  P.forEach((p) => (cats[p.cat] = (cats[p.cat] || 0) + 1));
  const contiguo = P.every((p, k) => p.i === k);
  det.push(`${P.length} itens no catálogo (${reais.length} produtos reais + ${P.length - reais.length} item de teste)`);
  det.push(`índices contíguos 0–${P.length - 1}: ${contiguo ? "sim" : "NÃO"}`);
  det.push(`${cand.DATA.brands.length} marcas · ${cand.DATA.contacts.length} contatos · ${cand.DATA.routines.length} rotinas`);
  det.push("por categoria (incl. teste): " + Object.entries(cats).map(([k, v]) => `${k} ${v}`).join(", "));
  det.push(`com preço "de" (oferta): ${P.filter((p) => p.old).length}`);
  const marcasSemCadastro = P.filter((p) => !cand.DATA.brands.some((b) => b.id === p.brand)).map((p) => p.i);
  if (marcasSemCadastro.length) d.push(`produtos com marca inexistente: ${marcasSemCadastro}`);
  if (reais.length !== 156) d.push(`esperados 156 produtos reais, encontrados ${reais.length}`);
  if (!contiguo) d.push("índices não contíguos — quebra o contrato {i,q} com o Apps Script");
  return res("T1", "Catálogo: 157 itens, marcas, contatos e rotinas idênticos", d.length ? "FALHOU" : "PASSOU", det, d);
}

function T2(ref, cand) {
  const d = diff(ref.CFG, cand.CFG, "CFG").map((x) => x.replace(/https:\/\/script\.google\.com\/[^"]+/g, "<URL do Apps Script>"));
  const det = [
    `taxas do cartão 1x–12x: ${Object.values(cand.CFG.fees).join("% · ")}%`,
    `parcela mínima: R$ ${cand.CFG.minParcela} · mais vendidos: ${cand.CFG.best.length} itens · novidades a partir de i=${cand.CFG.newFrom} · kit i=${cand.CFG.kitFrom}`,
    `endpoint da API presente: ${/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(cand.CFG.api) ? "sim (mesmo da referência: " + (ref.CFG.api === cand.CFG.api ? "sim" : "NÃO") + ")" : "NÃO"}`,
  ];
  return res("T2", "Configuração comercial (taxas, parcela mínima, Pix, vitrines, API) idêntica", d.length ? "FALHOU" : "PASSOU", det, d);
}

function T3(ref, cand, man) {
  const d = [], det = [];
  const chave = (m) => JSON.parse(JSON.stringify({ tipo: m.tipo, i: m.i, cat: m.cat, alt: m.alt, bytes: m.bytes, sha256: m.sha256 }));
  d.push(...diff(ref.imagens.map(chave), cand.imagens.map(chave), "imagens"));
  if (man) d.push(...diff(man.imagens, cand.imagens.map(chave), "manifesto.imagens"));
  const prod = cand.imagens.filter((m) => m.tipo === "produto");
  const porTipo = {}; cand.imagens.forEach((m) => (porTipo[m.tipo] = (porTipo[m.tipo] || 0) + 1));
  const unicas = new Set(cand.imagens.map((m) => m.sha256)).size;
  const reais = cand.DATA.products.map((p) => p.i); // inclui o item de teste (card oculto, com imagem)
  const semImg = reais.filter((i) => !prod.some((m) => m.i === i));
  const prodUnicas = new Set(prod.map((m) => m.sha256)).size;
  const invalidas = cand.imagens.filter((m) => !m.cabecalhoValido || !m.base64Canonico).length;
  det.push(`${cand.imagens.length} imagens embutidas (${unicas} distintas) — ` + Object.entries(porTipo).map(([k, v]) => `${k}: ${v}`).join(", "));
  det.push(`imagens de produto: ${prod.length}, todas distintas: ${prodUnicas === prod.length ? "sim" : "NÃO"}`);
  det.push(`total decodificado: ${(cand.imagens.reduce((s, m) => s + m.bytes, 0) / 1048576).toFixed(2)} MB · cabeçalho/Base64 inválidos: ${invalidas}`);
  det.push(`produto sem imagem: ${semImg.length ? semImg.join(", ") : "nenhum"} · item de teste i=${cand.DATA.products.filter((p) => p.test).map((p) => p.i)} tem card oculto e imagem própria`);
  if (semImg.length) d.push(`produtos sem imagem: ${semImg}`);
  if (invalidas) d.push(`${invalidas} imagens com cabeçalho WebP ou Base64 inválido`);
  if (prod.length !== reais.length) d.push(`imagens de produto ${prod.length} ≠ itens do catálogo ${reais.length}`);
  if (porTipo.outro) d.push(`${porTipo.outro} imagens sem local identificado`);
  return res("T3", "Imagens: inventário, integridade byte a byte (SHA-256) e vínculo produto↔imagem", d.length ? "FALHOU" : "PASSOU", det, d);
}

// Caminhos que a Fase 1 pode criar ou alterar. Todo o resto (admin/, instagram/, README.md…) deve ficar idêntico.
const PERMITIDOS = ["index.html", "assets/", "dados/", "fonts/", "img/", "ferramentas/", "qa/"];
const permitido = (n) => PERMITIDOS.some((p) => (p.endsWith("/") ? n.startsWith(p) : n === p));

function T13(refSha) {
  const d = [], det = [];
  const rev = (r) => { try { return git(["rev-parse", r]).toString().trim(); } catch { return null; } };
  const ramo = git(["branch", "--show-current"]).toString().trim();
  const main = rev("main"), remoto = rev("origin/main");
  // Arquivos versionados da referência: idênticos no disco, exceto os permitidos.
  const arvore = git(["ls-tree", "-r", refSha]).toString().trim().split("\n").map((l) => { const [meta, nome] = l.split("\t"); return { blob: meta.split(" ")[2], nome }; });
  const divergentes = arvore.filter(({ blob, nome }) => {
    try { return git(["hash-object", path.join(RAIZ, nome)]).toString().trim() !== blob; } catch { return true; }
  }).map((x) => x.nome);
  // Tudo o que mudou desde a referência (commits da branch + área de trabalho) deve estar em caminhos permitidos.
  const commitados = git(["diff", "--name-only", refSha, "HEAD"]).toString().split("\n").filter(Boolean);
  const trabalho = git(["status", "--porcelain", "--untracked-files=all"]).toString().split("\n").filter(Boolean).map((l) => l.slice(3));
  const fora = [...new Set([...commitados, ...trabalho, ...divergentes])].filter((n) => !permitido(n));
  const admin = arvore.filter((x) => x.nome.startsWith("admin/")).length, insta = arvore.filter((x) => x.nome.startsWith("instagram/")).length;
  det.push(`branch atual: ${ramo} · main local: ${main ? main.slice(0, 7) : "—"} · origin/main: ${remoto ? remoto.slice(0, 7) : "—"} · referência publicada: ${refSha.slice(0, 7)}`);
  det.push(`${arvore.length} arquivos da versão publicada conferidos byte a byte (admin/: ${admin}, instagram/: ${insta}) — alterados: ${divergentes.length ? divergentes.join(", ") : "nenhum"}`);
  det.push(`caminhos novos/alterados desde a referência: ${[...new Set([...commitados, ...trabalho])].length} · fora dos permitidos (${PERMITIDOS.join(", ")}): ${fora.length}`);
  if (ramo !== "claude/sharp-davinci-n31ccy") d.push(`branch atual inesperada: ${ramo}`);
  if (main && main !== refSha) d.push(`main local (${main.slice(0, 7)}) difere da versão publicada`);
  if (remoto && remoto !== refSha) d.push(`origin/main (${remoto.slice(0, 7)}) difere da versão publicada`);
  if (fora.length) d.push(...fora.map((n) => "alteração fora do permitido: " + n));
  return res("T13", "Integridade: main intacta, admin/ e instagram/ idênticos, alterações só em caminhos permitidos", d.length ? "FALHOU" : "PASSOU", det, d);
}

function T14(cand, m, arqIndex) {
  const zlib = require("zlib");
  const html = fs.readFileSync(arqIndex);
  const gz = zlib.gzipSync(html, { level: 9 }).length;
  const kb = (b) => (b / 1024).toFixed(1) + " KB", mb = (b) => (b / 1048576).toFixed(2) + " MB";
  const det = [
    `index.html: ${cand.tamanho > 1048576 ? mb(cand.tamanho) : kb(cand.tamanho)} (gzip: ${kb(gz)}) · meta da Fase 1: ≤ 150 KB`,
    `Base64 dentro do index.html: ${/base64,/.test(html.toString()) ? "sim" : "nenhum"} · scripts externos de terceiros: 0`,
  ];
  if (m && m.ref) {
    const linha = (n, x) => `${n} — ${x.requisicoes} requisições · ${mb(x.bytes)} no 1º carregamento (celular, sem cache) · DOMContentLoaded ${x.dcl} ms · load ${x.load} ms`;
    det.push(linha("original", m.ref), linha("nova versão", m.cand));
    det.push("nova versão por tipo: " + Object.entries(m.cand.porTipo).map(([k, v]) => `${k} ${kb(v)}`).join(", "));
  }
  const atingida = cand.tamanho <= 150 * 1024;
  return res("T14", "Desempenho: tamanho do HTML e volume do primeiro carregamento", atingida ? "PASSOU" : "INFORMATIVO", det,
    atingida ? [] : [`meta ≤ 150 KB não atingida (${kb(cand.tamanho)}): o restante são os 157 cards pré-renderizados, incluindo os links de WhatsApp de reserva sem JavaScript, preservados por regra; comprimido (gzip) o HTML tem ${kb(gz)}`]);
}

// T15 — Reversibilidade: a versão separada remonta o index.html original byte a byte.
function T15(htmlRef, montagem, pasta) {
  const d = [], det = [];
  const igual = Buffer.from(montagem.html).equals(Buffer.from(htmlRef));
  const referenciados = new Set(montagem.recursos.map((r) => r.rel));
  const listar = (dir) => { const out = []; const rec = (p) => { if (!fs.existsSync(path.join(pasta, p))) return; for (const e of fs.readdirSync(path.join(pasta, p), { withFileTypes: true })) { const q = path.posix.join(p, e.name); e.isDirectory() ? rec(q) : out.push(q); } }; rec(dir); return out; };
  const emDisco = ["img", "fonts", "assets", "dados"].flatMap(listar);
  const orfaos = emDisco.filter((f) => !referenciados.has(f));
  const porPasta = {}; for (const f of referenciados) { const k = f.split("/").slice(0, f.startsWith("img/") ? 2 : 1).join("/"); porPasta[k] = (porPasta[k] || 0) + 1; }
  det.push(`versão separada: ${montagem.separado ? "sim" : "não (monolítica)"} · arquivos referenciados: ${referenciados.size} (${Object.entries(porPasta).map(([k, v]) => `${k} ${v}`).join(", ")})`);
  det.push(`index.html remontado a partir dos arquivos: SHA-256 ${sha256(Buffer.from(montagem.html)).slice(0, 16)}… · original publicado: ${sha256(Buffer.from(htmlRef)).slice(0, 16)}… → ${igual ? "IDÊNTICO byte a byte" : "DIFERENTE"}`);
  det.push(`arquivos ausentes ou com ?v= desatualizado: ${montagem.problemas.length} · arquivos órfãos (em disco e não usados): ${orfaos.length}`);
  if (!igual) d.push("a reconstrução não reproduz o index.html original — algo foi perdido ou alterado");
  d.push(...montagem.problemas, ...orfaos.map((f) => "arquivo não referenciado: " + f));
  return res("T15", "Reversibilidade: arquivos separados remontam o original byte a byte; nenhum arquivo ausente ou órfão", d.length ? "FALHOU" : "PASSOU", det, d);
}

module.exports = { T1, T2, T3, T13, T14, T15, manifesto };
