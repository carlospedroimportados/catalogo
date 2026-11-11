"use strict";
// Extração estática (sem navegador) de DATA, CFG, cards e imagens Base64 de um index.html.
// Somente leitura: o HTML é lido como texto; nada é gravado de volta.
const vm = require("vm");
const { sha256 } = require("./util");

function blocoObjeto(html, marcador) {
  const ini = html.indexOf(marcador);
  if (ini < 0) throw new Error(`Marcador não encontrado: ${marcador}`);
  let i = html.indexOf("{", ini), prof = 0, str = null;
  for (let j = i; j < html.length; j++) {
    const c = html[j];
    if (str) { if (c === "\\") { j++; continue; } if (c === str) str = null; continue; }
    if (c === '"' || c === "'" || c === "`") { str = c; continue; }
    if (c === "{") prof++;
    else if (c === "}") { prof--; if (prof === 0) return html.slice(i, j + 1); }
  }
  throw new Error(`Objeto não terminado: ${marcador}`);
}

// Avalia o literal num contexto isolado e vazio (é código da própria loja, sem acesso a nada).
const avaliar = (txt) => vm.runInNewContext("(" + txt + ")", Object.create(null), { timeout: 2000 });

function contextoImagem(html, pos) {
  const antes = html.slice(Math.max(0, pos - 600), pos).replace(/<img src="$/, "");
  const card = [...antes.matchAll(/<article class="pc" data-i="(\d+)"(?: hidden)?>/g)].pop();
  const fimCard = antes.lastIndexOf("</article>");
  if (card && antes.lastIndexOf(card[0]) > fimCard) return { tipo: "produto", i: +card[1] };
  if (/<a class="brand" href="#">$/.test(antes)) return { tipo: "logo-topo" };
  if (/<footer class="f"><div class="wrap">$/.test(antes)) return { tipo: "logo-rodape" };
  const cat = [...antes.matchAll(/class="catb" type="button" data-cat="(\w+)"/g)].pop();
  if (cat && /<span class="c">$/.test(antes)) return { tipo: "categoria", cat: cat[1] };
  if (/<figure>$/.test(antes)) return { tipo: "banner" };
  return { tipo: "outro" };
}

function extrair(html) {
  const DATA = avaliar(blocoObjeto(html, "const DATA="));
  const CFG = avaliar(blocoObjeto(html, "const CFG="));

  const imagens = [];
  const re = /data:image\/([a-z+]+);base64,([A-Za-z0-9+/=]+)/g;
  let m;
  while ((m = re.exec(html))) {
    const bytes = Buffer.from(m[2], "base64");
    const ok = bytes.toString("base64") === m[2]; // ida e volta sem perda
    const alt = (html.slice(re.lastIndex, re.lastIndex + 300).match(/^"[^>]*?alt="([^"]*)"/) || [])[1];
    imagens.push({
      ...contextoImagem(html, m.index), formato: m[1], alt: alt ?? null,
      bytes: bytes.length, sha256: sha256(bytes),
      cabecalhoValido: m[1] === "webp" ? bytes.slice(0, 4).toString() === "RIFF" && bytes.slice(8, 12).toString() === "WEBP" : true,
      base64Canonico: ok,
    });
  }

  const cards = [...html.matchAll(/<article class="pc" data-i="(\d+)"( hidden)?>([\s\S]*?)<\/article>/g)].map(([, i, oculto, c]) => {
    const t = (r) => (c.match(r) || [])[1] ?? null;
    return {
      i: +i, oculto: !!oculto,
      marca: t(/<div class="b">([^<]*)<\/div>/), nome: t(/<h4>([^<]*)<\/h4>/), spec: t(/<div class="s">([^<]*)<\/div>/),
      de: t(/<s>([^<]*)<\/s>/), preco: t(/<strong><small>R\$<\/small>([^<]*)<\/strong>/), tag: t(/<span class="tg[^"]*">([^<]*)<\/span>/),
      whatsapp: [...c.matchAll(/href="(https:\/\/wa\.me\/[^"]+)"/g)].map((x) => x[1]),
    };
  });

  const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map((x) => x[1]);
  const dominios = {};
  for (const x of html.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) dominios[x[1]] = (dominios[x[1]] || 0) + 1;

  return { DATA, CFG, imagens, cards, scripts, dominios, tamanho: Buffer.byteLength(html) };
}

module.exports = { extrair };
