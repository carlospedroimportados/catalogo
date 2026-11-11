"use strict";
// T1, T2, T3, T13, T14 — verificações sem navegador.
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

function T13(refSha) {
  const d = [], det = [];
  const head = git(["rev-parse", "HEAD"]).toString().trim();
  let remoto = null; try { remoto = git(["rev-parse", "origin/main"]).toString().trim(); } catch { /* sem remoto local */ }
  const status = git(["status", "--porcelain", "--untracked-files=all"]).toString().split("\n").filter(Boolean);
  const alterados = status.filter((l) => !l.slice(3).startsWith("qa/"));
  const novos = status.filter((l) => l.slice(3).startsWith("qa/")).length;
  // Cada arquivo rastreado no disco tem exatamente o conteúdo do commit de referência?
  const arvore = git(["ls-tree", "-r", refSha]).toString().trim().split("\n").map((l) => { const [meta, nome] = l.split("\t"); return { blob: meta.split(" ")[2], nome }; });
  const divergentes = arvore.filter(({ blob, nome }) => {
    try { return git(["hash-object", path.join(RAIZ, nome)]).toString().trim() !== blob; } catch { return true; }
  }).map((x) => x.nome);
  const admin = arvore.filter((x) => x.nome.startsWith("admin/")).length, insta = arvore.filter((x) => x.nome.startsWith("instagram/")).length;
  det.push(`HEAD local: ${head.slice(0, 7)} · origin/main (última leitura local): ${remoto ? remoto.slice(0, 7) : "indisponível"} · referência: ${refSha.slice(0, 7)}`);
  det.push(`${arvore.length} arquivos rastreados conferidos byte a byte contra a referência (admin/: ${admin}, instagram/: ${insta})`);
  det.push(`alterações fora de qa/: ${alterados.length} · arquivos novos em qa/: ${novos} (não versionados, sem commit)`);
  if (head !== refSha) d.push(`HEAD (${head.slice(0, 7)}) difere da referência`);
  if (remoto && remoto !== refSha) d.push(`origin/main (${remoto.slice(0, 7)}) difere da referência`);
  if (alterados.length) d.push(...alterados.map((l) => "alterado: " + l));
  if (divergentes.length) d.push(...divergentes.map((n) => "conteúdo diferente do commit: " + n));
  return res("T13", "Integridade: loja publicada, admin/ e instagram/ intactos; sem commits", d.length ? "FALHOU" : "PASSOU", det, d);
}

function T14(cand, metricas) {
  const det = [
    `index.html: ${(cand.tamanho / 1048576).toFixed(2)} MB (meta da Fase 1: ≤ 150 KB)`,
    `Base64 de imagens dentro do HTML: ${(cand.imagens.reduce((s, m) => s + Math.ceil(m.bytes / 3) * 4, 0) / 1048576).toFixed(2)} MB`,
    `scripts externos: ${cand.scripts.length} · domínios citados: ${Object.entries(cand.dominios).map(([k, v]) => `${k} (${v})`).join(", ")}`,
  ];
  if (metricas) det.push(`carregamento local sem limitação de rede — DOMContentLoaded: ${metricas.dcl} ms · load: ${metricas.load} ms · requisições: ${metricas.requisicoes}`);
  const atingida = cand.tamanho <= 150 * 1024;
  return res("T14", "Orçamento de desempenho (linha de base para a Fase 1)", atingida ? "PASSOU" : "INFORMATIVO", det,
    atingida ? [] : ["meta ≤ 150 KB ainda não atingida — esperado na Fase 0; é o objetivo da Fase 1"]);
}

module.exports = { T1, T2, T3, T13, T14, manifesto };
