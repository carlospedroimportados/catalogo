#!/usr/bin/env node
"use strict";
/*
 * Fase 1 — Separação do index.html monolítico em arquivos independentes.
 *
 * Lê o index.html ORIGINAL diretamente de um commit do git (padrão: 89ef168, versão publicada)
 * e grava, sem alterar nenhum byte de conteúdo:
 *   assets/estilo.css        CSS original (fontes passam a ser referenciadas por arquivo)
 *   fonts/*.woff2            8 fontes (Cormorant Garamond e Montserrat), bytes originais
 *   img/**                   imagens WebP, bytes originais (167 arquivos únicos para 170 usos)
 *   assets/qrcode.js         biblioteca de QR Code (MIT) usada no Pix offline
 *   assets/config.js         objeto CFG (API, taxas, Pix, vitrines) — texto original
 *   dados/catalogo.js        objeto DATA (157 itens, marcas, contatos, rotinas) — texto original
 *   assets/app.js            aplicação da loja (catálogo, sacola, checkout) — texto original
 *   index.html               mesma marcação, apontando para os arquivos acima
 *
 * A transformação é reversível: qa/lib/montar.js reconstrói o HTML original byte a byte.
 * Uso: node ferramentas/separar-index.js [--ref <commit>] [--saida <pasta>]
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const RAIZ = path.resolve(__dirname, "..");
const arg = (n, d) => { const k = process.argv.indexOf(n); return k > 0 ? process.argv[k + 1] : d; };
const REF = arg("--ref", "89ef168bd1304769d1eeabdb88ddea6724839995");
const SAIDA = path.resolve(arg("--saida", RAIZ));

const original = execFileSync("git", ["show", `${REF}:index.html`], { cwd: RAIZ, maxBuffer: 64 << 20 }).toString("utf8");
const hash = (b) => crypto.createHash("sha256").update(b).digest("hex");
const versao = (b) => hash(b).slice(0, 10);
const gravados = [];
function gravar(rel, conteudo) {
  const f = path.join(SAIDA, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, conteudo);
  gravados.push({ rel, bytes: Buffer.byteLength(conteudo) });
  return `${rel}?v=${versao(conteudo)}`;
}
const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function unico(trecho, inicio, fim, desde = 0) {
  const a = original.indexOf(inicio, desde); if (a < 0) throw new Error("não encontrado: " + inicio);
  const b = original.indexOf(fim, a + inicio.length); if (b < 0) throw new Error("fim não encontrado: " + fim);
  return { a, b: b + fim.length, conteudo: original.slice(a + inicio.length, b), trecho };
}

// ---------- 1. CSS + fontes ----------
const estilo = unico("css", "<style>", "</style>");
let css = estilo.conteudo;
css = css.replace(/@font-face\{font-family:'([^']+)';font-style:(\w+);font-weight:(\d+);font-display:swap;src:url\(data:font\/woff2;base64,([A-Za-z0-9+/=]+)\)/g,
  (m, fam, est, peso, b64) => {
    const bytes = Buffer.from(b64, "base64");
    if (bytes.toString("base64") !== b64) throw new Error("Base64 de fonte não canônico: " + fam);
    const ref = gravar(`fonts/${slug(fam)}-${peso}-${est}.woff2`, bytes);
    return m.replace(`data:font/woff2;base64,${b64}`, "../" + ref);
  });
if (/data:/.test(css)) throw new Error("CSS ainda contém data: URI");
const refCss = gravar("assets/estilo.css", css);

// ---------- 2. Scripts (texto original, mesma ordem de execução) ----------
const qr = unico("qr", "<script>/* QR Code generator", "</script>");
const qrConteudo = "/* QR Code generator" + qr.conteudo;
const bloco = unico("cfg+data", "<script>\n/* ===== CONFIGURAÇÃO", "</script>", qr.b);
const blocoConteudo = "\n/* ===== CONFIGURAÇÃO" + bloco.conteudo;
const corte = blocoConteudo.indexOf("const DATA=");
if (corte < 0) throw new Error("const DATA= não encontrado");
const app = unico("app", "<script>\n(function(){", "</script>", bloco.b);
const appConteudo = "\n(function(){" + app.conteudo;
for (const s of [qrConteudo, blocoConteudo, appConteudo]) if (/data:image|base64,/.test(s)) throw new Error("script contém Base64");

const refQr = gravar("assets/qrcode.js", qrConteudo);
const refCfg = gravar("assets/config.js", blocoConteudo.slice(0, corte));
const refData = gravar("dados/catalogo.js", blocoConteudo.slice(corte));
const refApp = gravar("assets/app.js", appConteudo);

// ---------- 3. Imagens da marcação ----------
const porHash = new Map(); const usos = [];
function nomeImagem(pos, alt) {
  const antes = original.slice(Math.max(0, pos - 600), pos);
  const card = [...antes.matchAll(/<article class="pc" data-i="(\d+)"(?: hidden)?>/g)].pop();
  if (card && antes.lastIndexOf(card[0]) > antes.lastIndexOf("</article>")) return `img/produtos/${String(card[1]).padStart(3, "0")}.webp`;
  if (/<a class="brand" href="#"><img src="$/.test(antes) || /<footer class="f"><div class="wrap"><img src="$/.test(antes)) return "img/marca/logo-cp-imports.webp";
  const cat = [...antes.matchAll(/class="catb" type="button" data-cat="(\w+)"/g)].pop();
  if (cat && /<span class="c"><img src="$/.test(antes)) return `img/categorias/${cat[1]}.webp`;
  if (/<figure><img src="$/.test(antes)) return `img/banners/${slug(alt || "banner")}.webp`;
  throw new Error("imagem sem local identificado na posição " + pos);
}
let html = original.slice(0, estilo.a) + `<link rel="stylesheet" href="${refCss}">` + original.slice(estilo.b, qr.a)
  + `<script src="${refQr}"></script>` + original.slice(qr.b, bloco.a)
  + `<script src="${refCfg}"></script><script src="${refData}"></script>` + original.slice(bloco.b, app.a)
  + `<script src="${refApp}"></script>` + original.slice(app.b);
html = html.replace(/src="data:image\/webp;base64,([A-Za-z0-9+/=]+)"([^>]*)>/g, (m, b64, resto, pos) => {
  const bytes = Buffer.from(b64, "base64");
  if (bytes.toString("base64") !== b64) throw new Error("Base64 de imagem não canônico");
  const h = hash(bytes), alt = (resto.match(/alt="([^"]*)"/) || [])[1];
  // A posição no HTML parcial difere da original: localiza o mesmo Base64 no original para identificar o contexto.
  const anteriores = usos.filter((u) => u.h === h);
  const posOriginal = original.indexOf(b64, anteriores.length ? anteriores.pop().pos + 1 : 0);
  let ref = porHash.get(h);
  const nome = nomeImagem(posOriginal - "data:image/webp;base64,".length, alt); // início do data URI no original
  if (!ref) { ref = gravar(nome, bytes); porHash.set(h, ref); }
  usos.push({ h, pos: posOriginal, nome, arquivo: ref.split("?")[0] });
  return `src="${ref}"${resto}>`;
});
if (/base64,/.test(html)) throw new Error("index.html ainda contém Base64");

fs.writeFileSync(path.join(SAIDA, "index.html"), html);
const relatorio = {
  referencia: REF, original: { bytes: Buffer.byteLength(original), sha256: hash(original) },
  index: { bytes: Buffer.byteLength(html), sha256: hash(html) },
  imagens: { usos: usos.length, arquivos: porHash.size, reaproveitadas: usos.filter((u) => u.nome !== u.arquivo).map((u) => `${u.nome} → ${u.arquivo}`) },
  arquivos: gravados,
};
console.log(JSON.stringify(relatorio, null, 1));
