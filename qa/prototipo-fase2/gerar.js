#!/usr/bin/env node
"use strict";
/*
 * Protótipo da Fase 2 — Redesign Premium (isolado em qa/prototipo-fase2/).
 *
 * Lê o index.html da loja (somente leitura) e grava qa/prototipo-fase2/index.html com a nova
 * apresentação. NÃO altera nenhum arquivo da loja: dados, configuração, imagens, fontes e a lógica
 * (assets/app.js) são referenciados no lugar original, sem cópia e sem modificação.
 *
 * O que muda: cabeçalho, banners, faixa de garantias, rodapé e a folha de estilo adicional premium.css.
 * O que não muda: os 157 cards, os identificadores usados pela lógica, sacola, checkout e mensagens.
 * Pagamentos: simulacao.js responde localmente no lugar do servidor (nenhum pedido real é criado).
 *
 * Uso: node qa/prototipo-fase2/gerar.js
 */
const fs = require("fs");
const path = require("path");

const RAIZ = path.resolve(__dirname, "..", "..");
const AQUI = __dirname;
let html = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8");
if (/base64,/.test(html)) throw new Error("index.html da raiz não é a versão separada da Fase 1");

function trocar(de, para, rotulo) {
  const n = typeof de === "string" ? html.split(de).length - 1 : (html.match(de) || []).length;
  if (n !== 1) throw new Error(`${rotulo}: esperada 1 ocorrência, encontradas ${n}`);
  html = html.replace(de, typeof para === "string" ? () => para : para);
}
const P = "../../"; // caminho até a raiz da loja
const img = (i) => `${P}img/produtos/${String(i).padStart(3, "0")}.webp`;

// 1. Caminhos dos recursos originais (referenciados, não copiados)
html = html.replace(/(href|src)="(assets|img|dados|fonts)\//g, `$1="${P}$2/`);

// 2. Cabeçalho do documento
trocar(/<title>[^<]*<\/title>/, "<title>CP Importados · Protótipo Fase 2</title><meta name=\"robots\" content=\"noindex\">", "title");
trocar("</head>", `<link rel="stylesheet" href="premium.css"></head>`, "head");

// 3. Faixa de avisos + marca no cabeçalho
trocar('<header class="top">', `<div class="proto" role="note">Protótipo da Fase 2 · pagamentos simulados · nenhum pedido real é criado</div>
<div class="aviso"><span>Pix sem acréscimo</span><span>Cartão em até 12x</span><span>Envio para todo o Brasil</span></div>
<header class="top">`, "header");
trocar(/alt="CP Imports" width="42" height="42"><b>CP IMPORTS<\/b><\/a>/,
  'alt="CP Importados" width="60" height="60"><span class="brand-t"><b>CP IMPORTADOS</b><small>Perfumaria · Skincare · Cabelos</small></span></a>', "marca");

// 4. Banners de campanha (mesmos textos e mesmos destinos dos banners atuais)
const arco = (i, alt, cls = "") => `<figure class="arco ${cls}"><img src="${img(i)}" alt="${alt}"></figure>`;
const hero = `<section class="hero"><div class="wrap"><div class="slides" id="slides" aria-roledescription="carrossel">
<div class="slide on c-esmeralda"><div class="camp-t"><div class="eyebrow">Perfumes importados</div><h1>Fragrâncias que <em>marcam presença</em></h1><p>Árabes e de grife, com notas olfativas detalhadas em cada produto para você escolher certo.</p><div class="ctas"><button class="btn-gold" type="button" data-cat="perfume">Ver perfumes</button><a class="btn-ghost" href="#ofertas">Ofertas</a></div></div><div class="camp-p">${arco(10, "Carolina Herrera Good Girl Very Good Girl", "g")}${arco(34, "Paco Rabanne Invictus Parfum")}</div></div>
<div class="slide c-claro"><div class="camp-t"><div class="eyebrow">Mais vendidos</div><h2>Cabelo e pele <em>de outro nível</em></h2><p>Fino, Tsubaki, Medicube, Celimax e Alluvi Labs: os queridinhos dos nossos clientes, com envio para todo o Brasil.</p><div class="ctas"><a class="btn-gold" href="#maisvendidos">Ver mais vendidos</a><button class="btn-ghost" type="button" data-cat="skincare">Ver skincare</button></div></div><div class="camp-p">${arco(102, "Fino Premium Touch Hair Mask")}${arco(57, "Medicube Zero Pore Pad", "g")}${arco(61, "Alluvi Labs GHK-Cu Glow", "s3")}</div></div>
<div class="slide c-marinho"><div class="camp-n">0<span>%</span></div><div class="camp-t"><div class="eyebrow">Pagamento no Pix</div><h2>de acréscimo <em>no Pix</em></h2><p>Pague pelo preço do catálogo. O pagamento é confirmado na hora, sem enviar comprovante.</p><div class="ctas"><a class="btn-ghost" href="#pagamento">Ver pagamento</a></div></div></div>
<div class="slide c-verde"><div class="camp-t"><div class="eyebrow">Cartão de crédito</div><h2>no cartão, <em>com clareza</em></h2><p>Parcele pela InfinitePay. A taxa do parcelamento aparece antes de você pagar.</p><div class="ctas"><a class="btn-gold" href="#simulador">Simular parcelas</a></div></div><div class="camp-n">12<span>x</span></div></div>
</div><div class="dots" id="dots"></div></div></section>
<section class="garantias" aria-label="Condições de compra"><div class="wrap">
<div><b>Pix sem acréscimo</b><span>Pague o preço do catálogo</span></div>
<div><b>Até 12x no cartão</b><span>Taxa exibida antes de pagar</span></div>
<div><b>Pagamento seguro</b><span>Ambiente InfinitePay</span></div>
<div><b>Envio para todo o Brasil</b><span>Combinado pelo WhatsApp</span></div>
</div></section>`;
trocar(/<section class="hero">[\s\S]*?<\/section>/, hero, "hero");

// 5. Rodapé
const logo = (html.match(/<img src="([^"]*logo-cp-imports\.webp[^"]*)"/) || [])[1];
trocar(/<footer class="f">[\s\S]*?<\/footer>/, `<footer class="f fx"><div class="wrap">
<div class="fx-g">
<div class="fx-m"><img src="${logo}" alt="CP Importados" width="96" height="96"><p>Perfumes importados, skincare coreano, cabelos e bebidas, com envio para todo o Brasil.</p></div>
<nav aria-label="Navegação do rodapé"><b>Loja</b><a href="#maisvendidos">Mais vendidos</a><a href="#ofertas">Ofertas</a><a href="#novidades">Novidades</a><a href="#rotinas">Rotinas</a><a href="#catalogo">Catálogo completo</a></nav>
<div><b>Atendimento</b><span>Carlos · (14) 99779-0607</span><span>Pedro · (14) 99697-7886</span><a class="fx-b" href="#contato">Falar no WhatsApp</a></div>
<div><b>Pagamento</b><span>Pix sem acréscimo</span><span>Cartão em até 12x</span><span>Ambiente seguro InfinitePay</span><a href="#simulador">Simular parcelas</a></div>
</div>
<small class="fx-l">Valores conforme o catálogo vigente. Seus dados são usados apenas para processar o pedido.</small>
</div></footer>`, "rodapé");

// 6. Simulação de pagamento (antes da lógica); efeitos visuais e navegação do catálogo (depois)
trocar(/<script src="[^"]*assets\/app\.js[^"]*"><\/script>/, (m) => `<script src="simulacao.js"></script>\n${m}\n<script src="efeitos.js"></script>\n<script src="navegacao.js"></script>`, "scripts");

// 7. Desempenho e acessibilidade (etapa 3)
// 7a. Dimensões declaradas nas imagens: o navegador reserva o espaço antes de a foto chegar.
let comDimensoes = 0;
html = html.replace(/<img src="([^"]*\/img\/(produtos|banners|categorias)\/[^"]+)"(?![^>]*\swidth=)/g, (m, src, tipo) => {
  comDimensoes++; return `<img width="${tipo === "produtos" ? 640 : 300}" height="${tipo === "produtos" ? 800 : 375}" src="${src}"`;
});
// 7b. Imagens do primeiro banner com prioridade; fontes principais pré-carregadas; ícone da aba.
html = html.replace(/<div class="slide on[\s\S]*?(?=\n<div class="slide )/, (m) => m.replace(/<img /g, '<img fetchpriority="high" '));
const css = fs.readFileSync(path.join(RAIZ, "assets", "estilo.css"), "utf8");
const fonte = (nome) => { const u = (css.match(new RegExp(`url\\(\\.\\./(fonts/${nome}\\.woff2[^)]*)\\)`)) || [])[1]; if (!u) throw new Error("fonte não encontrada: " + nome); return `<link rel="preload" as="font" type="font/woff2" crossorigin href="${P}${u}">`; };
trocar('<link rel="stylesheet" href="premium.css"></head>', `<link rel="stylesheet" href="premium.css">${fonte("cormorant-garamond-500-normal")}${fonte("montserrat-500-normal")}<link rel="icon" href="${P}admin/icon-192.png"></head>`, "pré-carga");
// 7c. Atalho "pular para o conteúdo" e alvo no conteúdo principal.
trocar('<div class="proto" role="note">', '<a class="pular" href="#conteudo">Pular para o conteúdo</a>\n<div class="proto" role="note">', "atalho");
trocar("<main>", '<main id="conteudo">', "main");

fs.writeFileSync(path.join(AQUI, "index.html"), html);
console.log(`Protótipo gerado: qa/prototipo-fase2/index.html (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB) · cards: ${(html.match(/<article class="pc"/g) || []).length} · imagens com dimensões declaradas: ${comDimensoes}`);
