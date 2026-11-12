#!/usr/bin/env node
"use strict";
/*
 * Páginas individuais de produto (Fase 2 · etapa 4, bloco 2).
 *
 * Lê dados/catalogo.js e assets/config.js (somente leitura) e gera:
 *   produto/<slug>/index.html   uma página por produto (o item de teste não gera página)
 *   dados/paginas.js            mapa posição → slug, usado pela loja para apontar para as páginas
 *   sitemap.xml                 página inicial + páginas de produto
 *
 * As páginas reutilizam o visual do painel do produto e alimentam a MESMA sacola da loja
 * (chave cp3_bag). O checkout continua existindo só na página inicial, sem duplicação de lógica.
 * Preços e parcelas são calculados com os dados e as taxas da loja; nada é digitado à mão.
 *
 * Uso: node ferramentas/gerar-paginas.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { rodape, versao, RAIZ, SITE } = require("./redesign");

const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), "utf8");
const DATA = vm.runInNewContext(ler("dados/catalogo.js") + "\n;DATA", Object.create(null));
const CFG = vm.runInNewContext(ler("assets/config.js") + "\n;CFG", Object.create(null));
const P = DATA.products, B = Object.fromEntries(DATA.brands.map((b) => [b.id, b]));
const CATN = { perfume: "Perfumaria", skincare: "Skincare", cabelo: "Cabelos", bebida: "Bebidas", outros: "Outros" };
const catOf = (p) => p.cat || B[p.brand].cat;

// Mesmas fórmulas de assets/app.js (fmt, cardCalc, cardOptions, lineOf, related).
const fmt = (v) => "R$ " + v.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function opcoes(base) {
  const o = [];
  for (let n = 1; n <= 12; n++) {
    const par = Math.ceil(base / (1 - (CFG.fees[n] || 0) / 100) / n * 100 - 1e-9) / 100;
    if (n === 1 || par >= CFG.minParcela) o.push({ n, par, total: Math.round(par * n * 100) / 100 });
  }
  return o;
}
const lineOf = (p, q) => `• ${q}× ${B[p.brand].short} ${p.name} (${p.spec}) — ${fmt(p.price * q)}`;
const relacionados = (p) => P.filter((x) => x.i !== p.i && !x.test)
  .map((x) => ({ x, s: (x.brand === p.brand ? 0 : 10) + (catOf(x) === catOf(p) ? 0 : 100) + Math.abs(x.price - p.price) / 100 }))
  .sort((a, b) => a.s - b.s).slice(0, 8).map((o) => o.x);

// Endereços estáveis: marca + nome; em caso de repetição, acrescenta a apresentação e, por fim, a posição.
const slug = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " e ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const SLUG = {}; const usados = new Set();
for (const p of P) {
  if (p.test) continue;
  const base = slug(`${B[p.brand].short} ${p.name}`);
  const s = [base, `${base}-${slug(p.spec)}`, `${base}-${p.i}`].find((c) => !usados.has(c));
  usados.add(s); SLUG[p.i] = s;
}

const R = "../../"; // das páginas até a raiz da loja
const a = (rel) => `${R}${rel}?v=${versao(rel)}`;
const foto = (i) => `img/produtos/${String(i).padStart(3, "0")}.webp`;
const chev = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
const chips = (l) => (l || []).map((x) => `<span class="nt">${esc(x)}</span>`).join("");

function info(p) {
  const f = p.info; if (!f) return "";
  if (f.top || f.fam) return `<details class="acc" open><summary>Fragrância e notas ${chev}</summary><div class="accb">
${f.fam ? `<div class="fam"><small>Família olfativa</small><b>${esc(f.fam)}</b></div>` : ""}
<div class="pyr">${f.top ? `<div><small>Notas de topo</small><div class="nts">${chips(f.top)}</div></div>` : ""}${f.mid ? `<div><small>Notas de coração</small><div class="nts">${chips(f.mid)}</div></div>` : ""}${f.base ? `<div><small>Notas de fundo</small><div class="nts">${chips(f.base)}</div></div>` : ""}</div>
${f.uso ? `<div class="fam"><small>Indicado para</small><b>${esc(f.uso)}</b></div>` : ""}${f.note ? `<p class="note">${esc(f.note[0].toUpperCase() + f.note.slice(1))}.</p>` : ""}</div></details>`;
  return `<details class="acc" open><summary>Para que serve ${chev}</summary><div class="accb">
${f.obj ? `<div class="fam"><small>Objetivo</small><b>${esc(f.obj)}</b></div>` : ""}
${f.ativos ? `<div><small class="lbl">Principais ativos</small><div class="nts">${chips(f.ativos)}</div></div>` : ""}
${f.tipo ? `<div class="fam"><small>Indicado para</small><b>${esc(f.tipo)}</b></div>` : ""}
${f.uso ? `<div class="fam"><small>Como usar</small><span>${esc(f.uso)}</span></div>` : ""}</div></details>`;
}

function cartao(x) {
  const m = opcoes(x.price).pop(), b = B[x.brand];
  return `<article class="pc"><a class="ph" href="../${SLUG[x.i]}/" aria-label="Ver ${esc(b.short + " " + x.name)}"><img width="640" height="800" loading="lazy" decoding="async" src="${R}${foto(x.i)}" srcset="${a(`miniaturas/produtos-320/${String(x.i).padStart(3, "0")}.webp`)} 320w, ${a(`miniaturas/produtos-480/${String(x.i).padStart(3, "0")}.webp`)} 480w, ${R}${foto(x.i)} 640w" sizes="(max-width:860px) 46vw, 270px" alt="${esc(b.short + " " + x.name)}"></a>
<div class="pi"><div class="b">${esc(b.short)}</div><h3>${esc(x.name)}</h3><div class="s">${esc(x.spec)}</div><div class="pr">${x.old ? `<s>${fmt(x.old)}</s>` : ""}<strong><small>R$</small>${fmt(x.price).slice(3)}</strong></div><div class="inst">${m.n > 1 ? `ou ${m.n}x de ${fmt(m.par)} no cartão` : "no cartão: " + fmt(m.total)}</div><div class="act"><a class="add" href="../${SLUG[x.i]}/">Ver produto</a></div></div></article>`;
}

function pagina(p) {
  const b = B[p.brand], cat = catOf(p), o = opcoes(p.price), m = o[o.length - 1], off = p.old ? Math.round((1 - p.price / p.old) * 100) : 0;
  const nome = `${b.short} ${p.name}`, url = `${SITE}produto/${SLUG[p.i]}/`, imagem = SITE + foto(p.i);
  const desc = (p.desc || `${nome} — ${p.spec}.`) + ` ${fmt(p.price)} no Pix ou em até ${m.n}x no cartão.`;
  const c0 = DATA.contacts[0];
  const wa = `https://wa.me/${c0.phone}?text=${encodeURIComponent(`Olá, ${c0.name}! Vim pelo catálogo da CP Importados e tenho uma dúvida sobre:\n\n${lineOf(p, 1)}`)}`;
  const ld = { "@context": "https://schema.org", "@type": "Product", name: nome, image: imagem, description: p.desc || `${nome} — ${p.spec}`, sku: String(p.i), brand: { "@type": "Brand", name: b.short }, category: CATN[cat],
    offers: { "@type": "Offer", url, priceCurrency: "BRL", price: p.price.toFixed(2), seller: { "@type": "Organization", name: "CP Importados" } } };
  const trilha = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [["Início", SITE], [CATN[cat], `${SITE}?cat=${cat}#catalogo`], [nome, url]].map(([name, item], k) => ({ "@type": "ListItem", position: k + 1, name, item })) };
  const css = ler("assets/estilo.css");
  const fonte = (n) => `<link rel="preload" as="font" type="font/woff2" crossorigin href="${R}${(css.match(new RegExp(`url\\(\\.\\./(fonts/${n}\\.woff2[^)]*)\\)`)) || [])[1]}">`;
  const logo = `${R}img/marca/logo-cp-imports.webp?v=${versao("img/marca/logo-cp-imports.webp")}`;
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(nome)} · ${esc(p.spec)} — CP Importados</title><meta name="description" content="${esc(desc)}"><meta name="theme-color" content="#0B1B2E">
<link rel="canonical" href="${url}"><meta property="og:type" content="product"><meta property="og:site_name" content="CP Importados"><meta property="og:locale" content="pt_BR"><meta property="og:title" content="${esc(nome)} — CP Importados"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${imagem}"><meta property="og:image:width" content="640"><meta property="og:image:height" content="800"><meta property="product:price:amount" content="${p.price.toFixed(2)}"><meta property="product:price:currency" content="BRL"><meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="${a("assets/estilo.css")}"><link rel="stylesheet" href="${a("assets/premium.css")}">${fonte("cormorant-garamond-500-normal")}${fonte("montserrat-500-normal")}<link rel="icon" href="${R}admin/icon-192.png"><link rel="apple-touch-icon" href="${R}admin/icon-180.png">
<script type="application/ld+json">${JSON.stringify(ld)}</script><script type="application/ld+json">${JSON.stringify(trilha)}</script></head><body class="pagina-produto">
<a class="pular" href="#conteudo">Pular para o conteúdo</a>
<div class="aviso"><span>Pix sem acréscimo</span><span>Cartão em até 12x</span><span>Envio para todo o Brasil</span></div>
<header class="top"><div class="wrap top-in"><a class="brand" href="${R}"><img src="${logo}" srcset="${a("miniaturas/marca/logo-128.webp")} 128w, ${a("miniaturas/marca/logo-256.webp")} 256w" sizes="60px" alt="CP Importados" width="60" height="60"><span class="brand-t"><b>CP IMPORTADOS</b><small>Perfumaria · Skincare · Cabelos</small></span></a>
<form class="find" role="search" action="${R}" method="get"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/></svg><input name="busca" type="search" aria-label="Buscar produto ou marca" placeholder="Buscar produto, marca ou nota" autocomplete="off"></form>
<a class="bagbtn" href="${R}#sacola" aria-label="Abrir sacola"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 016 0v2"/></svg><span>Sacola</span><span class="n" id="sacolaN">0</span></a></div>
<nav class="cats-nav" aria-label="Categorias"><div class="wrap"><a href="${R}#maisvendidos">Mais vendidos</a><a href="${R}#ofertas">Ofertas</a>${Object.entries({ perfume: "Perfumes", skincare: "Skincare", cabelo: "Cabelos", bebida: "Bebidas", outros: "Outros" }).map(([k, v]) => `<a${k === cat ? ' class="pill" aria-current="true"' : ""} href="${R}?cat=${k}#catalogo">${v}</a>`).join("")}<a href="${R}#rotinas">Rotinas</a><a href="${R}#pagamento">Pagamento</a><a href="${R}#contato">Contato</a></div></nav></header>
<main id="conteudo" class="pg" data-i="${p.i}">
<nav class="trilha" aria-label="Você está em"><a href="${R}">Início</a> / <a href="${R}?cat=${cat}#catalogo">${CATN[cat]}</a> / ${esc(b.short)} / ${esc(p.name)}</nav>
<div class="pvg"><div class="pvimg"><img width="640" height="800" fetchpriority="high" src="${R}${foto(p.i)}" alt="${esc(nome)}">${off ? `<span class="tg off">-${off}%</span>` : ""}</div>
<div class="pvi"><div class="crumb">${CATN[cat]} · ${esc(b.short)}</div><h1>${esc(p.name)}</h1><div class="spec">${esc(p.spec)}</div>${p.desc ? `<p class="pg-desc">${esc(p.desc)}</p>` : ""}
<div class="pvp">${p.old ? `<s>${fmt(p.old)}</s>` : ""}<strong id="preco">${fmt(p.price)}</strong></div>
<div class="paybox"><div class="pay1"><b>Pix</b><span id="pix">${fmt(p.price)} à vista, sem acréscimo</span></div>
<details class="pay1"><summary><b>Cartão de crédito</b><span id="cartao">${m.n > 1 ? `até ${m.n}x de ${fmt(m.par)}` : fmt(m.total)}</span>${chev}</summary><table class="itab" id="parcelas">${o.map((c) => `<tr><td>${c.n}x</td><td>${fmt(c.par)}</td><td>${fmt(c.total)}</td></tr>`).join("")}</table><p class="note">Valores com a taxa do cartão repassada.</p></details></div>
<div class="qrow"><span class="lbl2">Quantidade</span><div class="stp big"><button type="button" id="menos" aria-label="Diminuir">−</button><span id="qtd">1</span><button type="button" id="mais" aria-label="Aumentar">+</button></div></div>
<div class="ctas2"><button class="add big" type="button" id="adicionar">Adicionar à sacola</button><a class="btn-pay" id="comprar" href="${R}#sacola">Comprar agora · ${fmt(p.price)}</a></div>
<a class="wa ghost" target="_blank" rel="noopener" href="${wa}">Falar com vendedor</a>
${info(p)}
<details class="acc"><summary>Informações do produto ${chev}</summary><div class="accb">${p.desc ? `<p>${esc(p.desc)}</p>` : ""}<div class="fam"><small>Apresentação</small><span>${esc(p.spec)}</span></div><div class="fam"><small>Marca</small><span>${esc(b.name)}</span></div></div></details>
</div></div>
<section class="rel" aria-labelledby="relT"><div class="eyebrow">Relacionados</div><h2 id="relT">Você também vai gostar</h2><div class="track">${relacionados(p).map(cartao).join("\n")}</div></section>
</main>
${rodape(logo, R)}
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script src="${a("assets/config.js")}"></script><script src="${a("dados/catalogo.js")}"></script>
<script src="${a("assets/produto.js")}"></script>
</body></html>
`;
}

// Gravação: a pasta produto/ é recriada inteira a cada execução (só contém arquivos gerados).
const destino = path.join(RAIZ, "produto");
fs.rmSync(destino, { recursive: true, force: true });
let bytes = 0;
for (const p of P) {
  if (p.test) continue;
  const html = pagina(p), dir = path.join(destino, SLUG[p.i]);
  fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, "index.html"), html); bytes += Buffer.byteLength(html);
}
fs.writeFileSync(path.join(RAIZ, "dados", "paginas.js"), `/* Gerado por ferramentas/gerar-paginas.js — posição do produto → endereço da página. Não editar à mão. */\nconst PAGINAS=${JSON.stringify(SLUG)};\n`);
fs.writeFileSync(path.join(RAIZ, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>${SITE}</loc></url>\n${Object.values(SLUG).map((s) => `<url><loc>${SITE}produto/${s}/</loc></url>`).join("\n")}\n</urlset>\n`);
console.log(`Páginas de produto: ${Object.keys(SLUG).length} · ${(bytes / 1024).toFixed(0)} KB no total · média ${(bytes / Object.keys(SLUG).length / 1024).toFixed(1)} KB`);

// Página 404 da marca (o GitHub Pages a serve para qualquer endereço inexistente). Usa caminhos absolutos
// porque é exibida em endereços de qualquer profundidade; fora do índice dos buscadores (noindex).
{
  const base = new URL(SITE).pathname; // "/catalogo/"
  const abs = (rel) => `${base}${rel}?v=${versao(rel)}`;
  const logo = abs("img/marca/logo-cp-imports.webp");
  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Página não encontrada · CP Importados</title><meta name="robots" content="noindex"><meta name="theme-color" content="#0B1B2E">
<link rel="stylesheet" href="${abs("assets/estilo.css")}"><link rel="stylesheet" href="${abs("assets/premium.css")}"><link rel="icon" href="${base}admin/icon-192.png"></head>
<body class="pagina-erro"><main class="erro"><img src="${logo}" alt="CP Importados" width="96" height="96"><div class="eyebrow">Erro 404</div><h1>Esta página <em>não foi encontrada</em></h1>
<p>O endereço pode ter mudado. Volte ao catálogo para encontrar perfumes, skincare, cabelos e bebidas.</p>
<div class="ctas"><a class="btn-gold" href="${base}">Ir para a loja</a><a class="btn-ghost" href="${base}?cat=perfume#catalogo">Ver perfumes</a></div></main></body></html>
`;
  fs.writeFileSync(path.join(RAIZ, "404.html"), html);
  console.log("Página 404 gerada.");
}
