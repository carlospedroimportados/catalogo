"use strict";
/*
 * Base da página inicial (equivalente ao index.html da Fase 1), gerada a partir do catálogo.
 *
 *   modelo/index.modelo.html   página sem os cards e sem as contagens (extraída do index.html da Fase 1)
 *   dados/catalogo.js          produtos, marcas, contatos (fonte única)
 *   assets/config.js           mais vendidos, novidades, kit
 *   catalogo.regras.json       rótulo "Preço Brasil" por marca
 *
 * Com nome = "CP Imports" o resultado é idêntico, byte a byte, ao index.html da Fase 1 (teste P16): é a prova de que o
 * gerador reproduz fielmente os cards. A loja usa nome = "CP Importados".
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

const RAIZ = path.resolve(__dirname, "..");
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), "utf8");
const versao = (rel) => crypto.createHash("sha256").update(fs.readFileSync(path.join(RAIZ, rel))).digest("hex").slice(0, 10);

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = (v) => "R$ " + v.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
// Mesma codificação do gerador original: além de encodeURIComponent, escapa ! ' ( ) * e mantém a barra / sem codificar
const url = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()).replace(/%2F/g, "/");

function carregar() {
  const DATA = vm.runInNewContext(ler("dados/catalogo.js") + "\n;DATA", Object.create(null));
  const CFG = vm.runInNewContext(ler("assets/config.js") + "\n;CFG", Object.create(null));
  const regras = JSON.parse(ler("ferramentas/catalogo.regras.json"));
  return { DATA, CFG, regras };
}

function card(p, { DATA, CFG, regras }, nome) {
  const B = Object.fromEntries(DATA.brands.map((b) => [b.id, b])), b = B[p.brand];
  const tags = [];
  if (CFG.best.includes(p.i)) tags.push('<span class="tg best">Mais vendido</span>');
  if (p.i >= CFG.newFrom && p.i !== CFG.kitFrom && !p.test) tags.push('<span class="tg new">Novo</span>');
  if (p.i === CFG.kitFrom) tags.push('<span class="tg new">Kit</span>');
  if (p.old) tags.push(`<span class="tg">-${Math.round((1 - p.price / p.old) * 100)}%</span>`);
  const linha = `• 1× ${b.short} ${p.name} (${p.spec}) — ${fmt(p.price)}`;
  const links = DATA.contacts.map((c) => `<a href="https://wa.me/${c.phone}?text=${url(`Olá, ${c.name}! Vim pelo catálogo da ${nome} e tenho interesse em:\n\n${linha}\n\nEstá disponível?`)}" target="_blank" rel="noopener">${esc(c.name)}</a>`);
  const n3 = String(p.i).padStart(3, "0");
  return `<article class="pc" data-i="${p.i}"${p.test ? " hidden" : ""}><button class="ph" type="button" aria-label="Ver detalhes de ${esc(p.name)}"><div class="tags">${tags.join("")}</div><img src="img/produtos/${n3}.webp?v=${versao(`img/produtos/${n3}.webp`)}" alt="${esc(b.short + " " + p.name)}" loading="lazy" decoding="async"></button><div class="pi"><div class="b">${esc(b.short)}</div><h4>${esc(p.name)}</h4><div class="s">${esc(p.spec)}</div><div class="pr">${p.old && regras.precoBrasil.includes(p.brand) ? '<span class="pbl">Preço Brasil</span>' : ""}${p.old ? `<s>${fmt(p.old)}</s>` : ""}<strong><small>R$</small>${fmt(p.price).slice(3)}</strong></div><div class="inst"></div><div class="act"></div><div class="nojs">Pedir pelo WhatsApp: ${links.join(" · ")}</div></div></article>`;
}

function montarBase({ nome = "CP Importados" } = {}) {
  const ctx = carregar();
  let html = ler("ferramentas/modelo/index.modelo.html");
  const reais = ctx.DATA.products.filter((p) => !p.test);
  const cnt = { all: reais.length }; reais.forEach((p) => { const c = p.cat || ctx.DATA.brands.find((b) => b.id === p.brand).cat; cnt[c] = (cnt[c] || 0) + 1; });
  html = html.replace("<!--CARTOES-->", () => ctx.DATA.products.map((p) => card(p, ctx, nome)).join(""))
    .replace(/\{\{cnt:(\w+)\}\}/g, (m, k) => { if (!(k in cnt)) throw new Error("categoria sem produtos: " + k); return cnt[k]; })
    .replace(/\{\{nome\}\}/g, nome).replace(/\{\{nomeUrl\}\}/g, encodeURIComponent(nome));
  // Cache: cada arquivo local referenciado leva a versão (hash) do seu conteúdo atual.
  html = html.replace(/((?:src|href)=")((?:assets|dados|img)\/[^"?]+)\?v=\w+(")/g, (m, a, rel, z) => `${a}${rel}?v=${versao(rel)}${z}`);
  return html;
}

module.exports = { montarBase, card, carregar, fmt, esc, url, versao, RAIZ };
