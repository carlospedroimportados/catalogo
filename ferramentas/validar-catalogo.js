#!/usr/bin/env node
"use strict";
/*
 * Travas do catálogo. O servidor de pedidos identifica cada produto pela POSIÇÃO (i) na lista: se uma posição passar a
 * apontar para outro produto, pedidos futuros registram o item errado. Esta verificação roda antes de toda construção.
 *
 * Erros (bloqueiam a construção): posições fora de sequência ou repetidas; produto existente reordenado, trocado ou
 * removido (comparado com ferramentas/catalogo.trava.json); marca ou categoria inexistente; preço inválido; preço
 * "de" menor ou igual ao preço; produto sem foto ou foto que não é WebP 640×800; mais vendidos, rotinas ou vitrines
 * apontando para produto inexistente; endereço de página repetido.
 * Avisos (informativos): produtos novos no fim da lista, preços alterados, marcas sem produto.
 *
 * Produtos novos só entram na trava depois de revisados:  node ferramentas/validar-catalogo.js --registrar
 * Uso: node ferramentas/validar-catalogo.js [--registrar] [--pasta <raiz>]
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const pasta = process.argv.includes("--pasta") ? path.resolve(process.argv[process.argv.indexOf("--pasta") + 1]) : path.resolve(__dirname, "..");
const ler = (rel) => fs.readFileSync(path.join(pasta, rel), "utf8");
const CATS = ["perfume", "skincare", "cabelo", "bebida", "outros"];

function dimWebp(arq) {
  const b = fs.readFileSync(arq), t = b.slice(12, 16).toString();
  if (b.slice(0, 4).toString() !== "RIFF" || b.slice(8, 12).toString() !== "WEBP") return null;
  if (t === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  if (t === "VP8X") return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (t === "VP8L") { const v = b.readUInt32LE(21); return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1]; }
  return null;
}
const slug = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " e ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function validar() {
  const erros = [], avisos = [];
  const DATA = vm.runInNewContext(ler("dados/catalogo.js") + "\n;DATA", Object.create(null));
  const CFG = vm.runInNewContext(ler("assets/config.js") + "\n;CFG", Object.create(null));
  const P = DATA.products, B = Object.fromEntries(DATA.brands.map((b) => [b.id, b]));
  if (DATA.brands.some((b, k) => DATA.brands.findIndex((x) => x.id === b.id) !== k)) erros.push("marcas com identificador repetido");
  P.forEach((p, k) => {
    const r = `produto ${k}${p.name ? ` (${p.name})` : ""}`;
    if (p.i !== k) erros.push(`${r}: posição i=${p.i} fora de sequência (esperado ${k})`);
    if (!B[p.brand]) erros.push(`${r}: marca inexistente "${p.brand}"`);
    const cat = p.cat || (B[p.brand] && B[p.brand].cat);
    if (!CATS.includes(cat)) erros.push(`${r}: categoria inválida "${cat}"`);
    if (!p.name || !p.spec) erros.push(`${r}: nome ou apresentação vazios`);
    if (!(typeof p.price === "number" && p.price > 0 && isFinite(p.price))) erros.push(`${r}: preço inválido (${p.price})`);
    if (p.old != null && !(typeof p.old === "number" && p.old > p.price)) erros.push(`${r}: preço "de" (${p.old}) deve ser maior que o preço (${p.price})`);
    const arq = path.join(pasta, "img", "produtos", String(k).padStart(3, "0") + ".webp");
    if (!fs.existsSync(arq)) erros.push(`${r}: foto ausente (img/produtos/${String(k).padStart(3, "0")}.webp)`);
    else { const d = dimWebp(arq); if (!d) erros.push(`${r}: a foto não é um arquivo WebP válido`); else if (d[0] !== 640 || d[1] !== 800) erros.push(`${r}: foto com ${d[0]}×${d[1]} px (esperado 640×800)`); }
  });
  const existe = (i) => Number.isInteger(i) && i >= 0 && i < P.length;
  CFG.best.forEach((i) => { if (!existe(i)) erros.push(`mais vendidos: posição ${i} não existe`); });
  DATA.routines.forEach((r) => r.ids.forEach((i) => { if (!existe(i)) erros.push(`rotina ${r.id}: posição ${i} não existe`); }));
  if (!existe(CFG.kitFrom)) erros.push(`kitFrom ${CFG.kitFrom} não existe`);
  if (!(CFG.newFrom >= 0 && CFG.newFrom <= P.length)) erros.push(`newFrom ${CFG.newFrom} fora do catálogo`);
  const usados = new Map();
  P.filter((p) => !p.test).forEach((p) => { const s = slug(`${(B[p.brand] || {}).short} ${p.name}`); if (usados.has(s)) avisos.push(`nome repetido "${s}" (posições ${usados.get(s)} e ${p.i}): a página usará a apresentação ou a posição no endereço`); else usados.set(s, p.i); });

  // Trava de posição contra o último catálogo revisado
  const arqTrava = path.join(pasta, "ferramentas", "catalogo.trava.json");
  const atual = P.map((p) => ({ i: p.i, brand: p.brand, name: p.name, price: p.price, old: p.old == null ? null : p.old }));
  if (fs.existsSync(arqTrava)) {
    const base = JSON.parse(fs.readFileSync(arqTrava, "utf8")).produtos;
    base.forEach((b) => {
      const a = P[b.i];
      if (!a) erros.push(`produto ${b.i} (${b.name}) foi removido: a posição precisa continuar existindo`);
      else if (a.brand !== b.brand || a.name !== b.name) erros.push(`posição ${b.i} mudou de "${b.name}" (${b.brand}) para "${a.name}" (${a.brand}): isso trocaria o produto nos pedidos`);
      else if (a.price !== b.price || (a.old == null ? null : a.old) !== b.old) avisos.push(`preço alterado na posição ${b.i} (${b.name}): ${b.price}${b.old ? ` (de ${b.old})` : ""} → ${a.price}${a.old ? ` (de ${a.old})` : ""}`);
    });
    if (P.length > base.length) avisos.push(`${P.length - base.length} produto(s) novo(s) no fim da lista (posições ${base.length}–${P.length - 1}): confirme no servidor de pedidos e registre com --registrar`);
    return { erros, avisos, atual, arqTrava, total: P.length, base: base.length };
  }
  avisos.push("sem trava de posição registrada");
  return { erros, avisos, atual, arqTrava, total: P.length, base: 0 };
}

if (require.main === module) {
  const r = validar();
  r.avisos.forEach((a) => console.log("aviso: " + a));
  if (r.erros.length) { r.erros.forEach((e) => console.error("ERRO: " + e)); console.error(`Catálogo recusado: ${r.erros.length} erro(s).`); process.exit(1); }
  if (process.argv.includes("--registrar")) {
    fs.writeFileSync(r.arqTrava, JSON.stringify({ _sobre: "Último catálogo revisado: posição, marca, nome e preço de cada produto. Gerado por validar-catalogo.js --registrar.", n: r.total, produtos: r.atual }, null, 1) + "\n");
    console.log(`Trava registrada: ${r.total} produtos.`);
  } else console.log(`Catálogo válido: ${r.total} produtos${r.total > r.base ? ` (${r.total - r.base} novos ainda não registrados)` : ""}.`);
}
module.exports = { validar, dimWebp, slug };
