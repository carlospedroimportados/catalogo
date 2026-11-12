"use strict";
/*
 * Redesign Premium (Fase 2) — transformação única usada pela loja e pelo protótipo.
 *
 * Recebe a base da página inicial (ferramentas/base.js, equivalente ao index.html da Fase 1) e devolve a página com a nova apresentação. Só troca a "moldura"
 * (cabeçalho, banners, faixa de garantias, rodapé, metadados) e acrescenta folhas de estilo e
 * scripts de apresentação. Os 157 cards, os identificadores usados pela lógica, os dados, a
 * configuração comercial e assets/app.js não são alterados.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const RAIZ = path.resolve(__dirname, "..");
// Endereço público da loja (canônico, compartilhamento, sitemap, página 404). Para outro endereço: CP_SITE=https://exemplo.com/ node ferramentas/construir.js
const SITE = process.env.CP_SITE || "https://carlospedroimportados.github.io/catalogo/";
const versao = (rel) => crypto.createHash("sha256").update(fs.readFileSync(path.join(RAIZ, rel))).digest("hex").slice(0, 10);

function transformar(fase1, { prefixo = "", prototipo = false } = {}) {
  let html = fase1;
  if (/base64,/.test(html)) throw new Error("a entrada não é o index.html separado da Fase 1");
  const P = prefixo;
  const trocar = (de, para, rotulo) => {
    const n = typeof de === "string" ? html.split(de).length - 1 : (html.match(de) || []).length;
    if (n !== 1) throw new Error(`${rotulo}: esperada 1 ocorrência, encontradas ${n}`);
    html = html.replace(de, typeof para === "string" ? () => para : para);
  };
  const img = (i) => `${P}img/produtos/${String(i).padStart(3, "0")}.webp`;
  const ativo = (rel) => `${P}${rel}?v=${versao(rel)}`;

  // 1. Caminhos dos recursos da Fase 1
  if (P) html = html.replace(/(href|src)="(assets|img|dados|fonts)\//g, `$1="${P}$2/`);

  // 2. Cabeçalho do documento: título, estilos, fontes pré-carregadas, ícone
  const css = fs.readFileSync(path.join(RAIZ, "assets", "estilo.css"), "utf8");
  const fonte = (nome) => { const u = (css.match(new RegExp(`url\\(\\.\\./(fonts/${nome}\\.woff2[^)]*)\\)`)) || [])[1]; if (!u) throw new Error("fonte não encontrada: " + nome); return `<link rel="preload" as="font" type="font/woff2" crossorigin href="${P}${u}">`; };
  trocar(/<title>[^<]*<\/title>/, prototipo ? '<title>CP Importados · Protótipo Fase 2</title><meta name="robots" content="noindex">' : "<title>CP Importados · Perfumes importados, skincare coreano e cabelos</title>", "title");
  trocar("</head>", `<link rel="stylesheet" href="${ativo("assets/premium.css")}">${["cormorant-garamond-500-normal", "cormorant-garamond-500-italic", "montserrat-500-normal", "montserrat-600-normal", "montserrat-700-normal"].map(fonte).join("")}<link rel="icon" href="${P}admin/icon-192.png"><link rel="apple-touch-icon" href="${P}admin/icon-180.png">${prototipo ? "" : seo()}</head>`, "head");

  trocar('content="CP Imports — perfumes', 'content="CP Importados — perfumes', "descrição");

  // 3. Atalho de teclado, faixa de avisos e marca
  trocar('<header class="top">', `<a class="pular" href="#conteudo">Pular para o conteúdo</a>
${prototipo ? '<div class="proto" role="note">Protótipo da Fase 2 · pagamentos simulados · nenhum pedido real é criado</div>\n' : ""}<div class="aviso"><span>Pix sem acréscimo</span><span>Cartão em até 12x</span><span>Envio para todo o Brasil</span></div>
<header class="top">`, "header");
  trocar(/alt="CP Imports" width="42" height="42"><b>CP IMPORTS<\/b><\/a>/,
    'alt="CP Importados" width="60" height="60"><span class="brand-t"><b>CP IMPORTADOS</b><small>Perfumaria · Skincare · Cabelos</small></span></a>', "marca");
  trocar("<main>", '<main id="conteudo">', "main");

  // 4. Banners de campanha (mesmos textos e destinos dos banners da Fase 1) e faixa de garantias
  const arco = (i, alt, cls = "") => `<figure class="arco ${cls}"><img src="${img(i)}" alt="${alt}"></figure>`;
  trocar(/<section class="hero">[\s\S]*?<\/section>/, `<section class="hero"><div class="wrap"><div class="slides" id="slides" aria-roledescription="carrossel">
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
</div></section>`, "hero");

  // 5. Rodapé
  const logo = (html.match(/<img src="([^"]*logo-cp-imports\.webp[^"]*)"/) || [])[1];
  trocar(/<footer class="f">[\s\S]*?<\/footer>/, rodape(logo), "rodapé");

  // 5b. Ícone do WhatsApp dos contatos: o desenho original está incompleto (só o anel). Usa o desenho completo que a
  // própria loja já usa em assets/app.js.
  const completo = (fs.readFileSync(path.join(RAIZ, "assets", "app.js"), "utf8").match(/wa:'<svg[^>]*><path d="([^"]+)"/) || [])[1];
  const anel = "M12.04 2a9.9 9.9 0 00-8.5 15l-1.3 4.8 4.9-1.3A9.9 9.9 0 1012.04 2zm0 18.1a8.2 8.2 0 01-4.2-1.15l-.3-.18-2.9.76.78-2.83-.2-.3a8.2 8.2 0 1117.02-4.5 8.2 8.2 0 01-10.2 8.2z";
  if (!completo || !completo.startsWith(anel)) throw new Error("ícone do WhatsApp: desenho completo não encontrado em assets/app.js");
  if (!html.includes(`d="${anel}"`)) throw new Error("ícone do WhatsApp: desenho incompleto não encontrado nos contatos");
  html = html.split(`d="${anel}"`).join(`d="${completo}"`);

  // 6. Scripts de apresentação (depois da lógica); no protótipo, simulação de pagamento (antes)
  trocar(/<script src="[^"]*assets\/app\.js[^"]*"><\/script>/, () => `${prototipo ? '<script src="simulacao.js"></script>\n' : ""}<script src="${ativo("assets/app-premium.js")}"></script>\n<script src="${ativo("assets/efeitos.js")}"></script>\n${fs.existsSync(path.join(RAIZ, "dados", "paginas.js")) ? `<script src="${ativo("dados/paginas.js")}"></script>` : ""}<script src="${ativo("assets/navegacao.js")}"></script>`, "scripts");

  // 7. Dimensões declaradas nas imagens e prioridade para as do primeiro banner
  let comDimensoes = 0;
  html = html.replace(/<img src="([^"]*img\/(produtos|banners|categorias)\/[^"]+)"(?![^>]*\swidth=)/g, (m, src, tipo) => {
    comDimensoes++; return `<img width="${tipo === "produtos" ? 640 : 300}" height="${tipo === "produtos" ? 800 : 375}" src="${src}"`;
  });
  html = html.replace(/<div class="slide on[\s\S]*?(?=\n<div class="slide )/, (m) => m.replace(/<img /g, '<img fetchpriority="high" '));

  // 8. Miniaturas: o navegador escolhe o menor arquivo que serve para o tamanho exibido. O atributo src continua
  // apontando para o original (a lógica da loja lê esse src), então nenhuma imagem original é substituída.
  const existe = (rel) => fs.existsSync(path.join(RAIZ, rel));
  const mini = (rel) => `${P}${rel}?v=${versao(rel)}`;
  let comMiniaturas = 0;
  if (existe("miniaturas/produtos-320/000.webp")) {
    const srcset = (n3, original) => `${mini(`miniaturas/produtos-320/${n3}.webp`)} 320w, ${mini(`miniaturas/produtos-480/${n3}.webp`)} 480w, ${original} 640w`;
    html = html.replace(/<img ([^>]*?)src="([^"]*img\/produtos\/(\d{3})\.webp[^"]*)"([^>]*)>/g, (m, antes, original, n3, depois, posicao, inteiro) => {
      if (/srcset=/.test(m)) return m;
      const arco = /<figure class="arco[^"]*">$/.test(inteiro.slice(Math.max(0, posicao - 60), posicao)); // imagem dentro de um arco de banner
      comMiniaturas++;
      return m.replace(/>$/, ` srcset="${srcset(n3, original)}" sizes="${arco ? "(max-width:860px) 170px, 300px" : "(max-width:860px) 46vw, 280px"}">`);
    });
  }
  if (existe("miniaturas/marca/logo-128.webp")) {
    html = html.replace(/(<a class="brand" href="#"><img src="[^"]*logo-cp-imports\.webp[^"]*")/, (m) => `${m} srcset="${mini("miniaturas/marca/logo-128.webp")} 128w, ${mini("miniaturas/marca/logo-256.webp")} 256w" sizes="60px"`);
  }
  return { html, comDimensoes, comMiniaturas, cards: (html.match(/<article class="pc"/g) || []).length };
}

function rodape(logo, P = "") {
  return `<footer class="f fx"><div class="wrap">
<div class="fx-g">
<div class="fx-m"><img src="${logo}" alt="CP Importados" width="96" height="96"><p>Perfumes importados, skincare coreano, cabelos e bebidas, com envio para todo o Brasil.</p></div>
<nav aria-label="Navegação do rodapé"><b>Loja</b><a href="${P}#maisvendidos">Mais vendidos</a><a href="${P}#ofertas">Ofertas</a><a href="${P}#novidades">Novidades</a><a href="${P}#rotinas">Rotinas</a><a href="${P}#catalogo">Catálogo completo</a></nav>
<div><b>Atendimento</b><span>Carlos · (14) 99779-0607</span><span>Pedro · (14) 99697-7886</span><a class="fx-b" href="${P}#contato">Falar no WhatsApp</a></div>
<div><b>Pagamento</b><span>Pix sem acréscimo</span><span>Cartão em até 12x</span><span>Ambiente seguro InfinitePay</span><a href="${P}#simulador">Simular parcelas</a></div>
</div>
<small class="fx-l">Valores conforme o catálogo vigente. Seus dados são usados apenas para processar o pedido.</small>
</div></footer>`;
}

// Metadados de SEO da página inicial (endereço canônico, compartilhamento e dados estruturados).
function seo() {
  const desc = "CP Importados — perfumes importados, skincare coreano, cabelos e bebidas. Compre com Pix ou cartão em até 12x.";
  const ld = { "@context": "https://schema.org", "@type": "OnlineStore", name: "CP Importados", url: SITE, logo: SITE + "admin/icon-512.png", description: desc,
    contactPoint: [{ "@type": "ContactPoint", telephone: "+55-14-99779-0607", contactType: "sales", availableLanguage: "pt-BR" }, { "@type": "ContactPoint", telephone: "+55-14-99697-7886", contactType: "sales", availableLanguage: "pt-BR" }] };
  return `<link rel="canonical" href="${SITE}"><meta property="og:type" content="website"><meta property="og:site_name" content="CP Importados"><meta property="og:locale" content="pt_BR"><meta property="og:title" content="CP Importados · Perfumes importados, skincare coreano e cabelos"><meta property="og:description" content="${desc}"><meta property="og:url" content="${SITE}"><meta property="og:image" content="${SITE}admin/icon-512.png"><meta name="twitter:card" content="summary"><script type="application/ld+json">${JSON.stringify(ld)}</script>`;
}

module.exports = { transformar, rodape, versao, RAIZ, SITE };
