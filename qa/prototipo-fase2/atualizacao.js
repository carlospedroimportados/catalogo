#!/usr/bin/env node
"use strict";
/*
 * Ensaio do processo de atualização do catálogo, feito numa CÓPIA DESCARTÁVEL (qa/.trabalho/atualizacao/).
 * O catálogo, os preços e as fotos reais não são tocados: o script confere, no fim, que o repositório continua igual.
 *
 *   Parte A  reconstrução sem alterações reproduz exatamente os arquivos gerados do repositório
 *   Parte B  atualização simulada: um preço alterado e um produto fictício novo (com foto)
 *   Parte C  violações que as travas devem recusar: reordenar, remover, sem foto, foto fora do padrão, preço inválido
 *
 * Saída: JSON em stdout. Uso: node qa/prototipo-fase2/atualizacao.js
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync, execFileSync } = require("child_process");

const RAIZ = path.resolve(__dirname, "..", "..");
const COPIA = path.join(RAIZ, "qa", ".trabalho", "atualizacao");
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const lerC = (rel) => fs.readFileSync(path.join(COPIA, rel));
const git = () => execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], { cwd: RAIZ }).toString();
const gitAntes = git();
const R = { erros: [], parteA: {}, parteB: {}, parteC: [] };
const falha = (m) => R.erros.push(m);

// ---------- cópia ----------
fs.rmSync(COPIA, { recursive: true, force: true });
for (const d of ["ferramentas", "assets", "dados", "img", "miniaturas", "fonts", "admin", "produto"]) fs.cpSync(path.join(RAIZ, d), path.join(COPIA, d), { recursive: true });
fs.mkdirSync(path.join(COPIA, "qa", "prototipo-fase2"), { recursive: true });
for (const f of ["index.html", "sitemap.xml", "404.html"]) fs.copyFileSync(path.join(RAIZ, f), path.join(COPIA, f));
fs.copyFileSync(path.join(RAIZ, "qa/prototipo-fase2/gerar.js"), path.join(COPIA, "qa/prototipo-fase2/gerar.js"));

const construir = () => spawnSync("node", ["ferramentas/construir.js"], { cwd: COPIA, encoding: "utf8" });
const validar = () => spawnSync("node", ["ferramentas/validar-catalogo.js"], { cwd: COPIA, encoding: "utf8" });
const cartoes = (html) => Object.fromEntries([...html.matchAll(/<article class="pc" data-i="(\d+)"[^>]*>[\s\S]*?<\/article>/g)].map((m) => [m[1], m[0]]));
const paginas = () => Object.fromEntries(fs.readdirSync(path.join(COPIA, "produto")).map((d) => [d, sha(lerC(`produto/${d}/index.html`))]));
// Comparação "sem versões": o sufixo ?v=<hash> muda em todas as páginas quando o catálogo muda (é o que força o navegador
// a baixar o catálogo novo); o que importa é que mais nada mude além do esperado.
const paginasSemVersao = () => Object.fromEntries(fs.readdirSync(path.join(COPIA, "produto")).map((d) => [d, sha(lerC(`produto/${d}/index.html`).toString("utf8").replace(/\?v=[0-9a-f]{10}/g, ""))]));
const catalogo = () => { const t = lerC("dados/catalogo.js").toString("utf8"), a = t.indexOf("{"), b = t.lastIndexOf("}") + 1; return { t, a, b, D: JSON.parse(t.slice(a, b)) }; };
const gravarCatalogo = (c) => fs.writeFileSync(path.join(COPIA, "dados/catalogo.js"), c.t.slice(0, c.a) + JSON.stringify(c.D) + c.t.slice(c.b));
const guardar = fs.readFileSync(path.join(COPIA, "dados/catalogo.js"));

// ---------- Parte A: reconstrução sem alterações ----------
{
  const r = construir();
  if (r.status !== 0) falha("A: a construção da cópia falhou: " + (r.stderr || r.stdout).slice(0, 300));
  const iguais = ["index.html", "sitemap.xml", "404.html", "dados/paginas.js", "assets/app-premium.js"].filter((f) => !fs.readFileSync(path.join(RAIZ, f)).equals(lerC(f)));
  const antes = Object.fromEntries(fs.readdirSync(path.join(RAIZ, "produto")).map((d) => [d, sha(fs.readFileSync(path.join(RAIZ, "produto", d, "index.html")))]));
  const depois = paginas();
  const difP = Object.keys(antes).filter((d) => antes[d] !== depois[d]);
  R.parteA = { arquivosDiferentes: iguais, paginasDiferentes: difP.length, paginas: Object.keys(depois).length };
  if (iguais.length) falha("A: arquivos gerados diferem do repositório: " + iguais.join(", "));
  if (difP.length) falha(`A: ${difP.length} páginas diferem do repositório`);
}

// ---------- Parte B: atualização simulada ----------
{
  const antesHtml = lerC("index.html").toString("utf8"), antesCards = cartoes(antesHtml), antesPag = paginasSemVersao(), antesComVersao = paginas();
  const antesMini = fs.readdirSync(path.join(COPIA, "miniaturas/produtos-320")).length;
  const antesImg = Object.fromEntries(fs.readdirSync(path.join(COPIA, "img/produtos")).map((f) => [f, sha(lerC("img/produtos/" + f))]));
  const antesMap = vmPaginas();
  const c = catalogo(), p3 = c.D.products[3], precoAntigo = p3.price;
  p3.price = precoAntigo + 1;
  const novo = { i: c.D.products.length, brand: "armaf", cat: "perfume", name: "Produto de Simulação", spec: "Ensaio · 100 ml EDP", price: 99.9, old: null, desc: "Item fictício usado apenas no ensaio da atualização.", info: {} };
  c.D.products.push(novo); gravarCatalogo(c);
  fs.copyFileSync(path.join(COPIA, "img/produtos/000.webp"), path.join(COPIA, `img/produtos/${String(novo.i).padStart(3, "0")}.webp`));

  const v = validar();
  R.parteB.aviso = (v.stdout.match(/aviso: .*(novo|alterado).*/g) || []).map((x) => x.slice(0, 110));
  if (v.status !== 0) falha("B: validação recusou uma atualização legítima: " + v.stderr.slice(0, 300));
  if (!/preço alterado na posição 3/.test(v.stdout) || !/novo\(s\) no fim/.test(v.stdout)) falha("B: a validação não avisou do preço alterado e do produto novo");
  const r = construir(); if (r.status !== 0) falha("B: construção falhou: " + (r.stderr || r.stdout).slice(0, 300));

  const depHtml = lerC("index.html").toString("utf8"), depCards = cartoes(depHtml), depPag = paginasSemVersao(), depComVersao = paginas(), depMap = vmPaginas();
  const mudaram = Object.keys(antesCards).filter((i) => antesCards[i] !== depCards[i]);
  if (Object.keys(depCards).length !== 158) falha(`B: ${Object.keys(depCards).length} cards (esperado 158)`);
  if (mudaram.join() !== "3") falha(`B: cards alterados: [${mudaram}] (esperado só o 3)`);
  if (!new RegExp(`<strong><small>R\\$</small>${String(precoAntigo + 1).replace(".", ",")}`).test(depCards[3] || "") && !/351,00/.test(depCards[3] || "")) falha("B: o card 3 não mostra o novo preço");
  if (!depCards[157] || !/Produto de Simulação/.test(depCards[157]) || !/99,90/.test(depCards[157]) || !/miniaturas\/produtos-320\/157\.webp/.test(depCards[157])) falha("B: card do produto novo incorreto");
  if (!/id="cnt">157 produtos/.test(depHtml)) falha("B: o contador de produtos não foi atualizado");
  const slugNovo = depMap["157"];
  const slugsEstaveis = Object.keys(antesMap).every((i) => antesMap[i] === depMap[i]);
  if (!slugNovo || !slugsEstaveis) falha("B: endereços das páginas existentes mudaram ou o novo não foi criado");
  if (!fs.existsSync(path.join(COPIA, "produto", slugNovo || "?", "index.html"))) falha("B: página do produto novo ausente");
  const mapa = lerC("sitemap.xml").toString("utf8");
  if (!mapa.includes(`produto/${slugNovo}/</loc>`) || Object.values(antesMap).some((s) => !mapa.includes(`produto/${s}/</loc>`))) falha("B: sitemap incompleto");
  const pagMud = Object.keys(antesPag).filter((d) => antesPag[d] !== depPag[d]);
  // Uma página só pode mudar se for a do produto 3 (preço) ou se exibir o produto 3 ou o produto novo entre os relacionados.
  const semRazao = pagMud.filter((d) => { const t = lerC(`produto/${d}/index.html`).toString("utf8"); return d !== antesMap["3"] && !t.includes(`../${slugNovo}/`) && !t.includes(`../${antesMap["3"]}/`); });
  if (semRazao.length) falha(`B: páginas alteradas sem relação com o produto novo ou o preço: ${semRazao.slice(0, 3)}`);
  const pg3 = lerC(`produto/${antesMap["3"]}/index.html`).toString("utf8");
  if (!pg3.includes('<strong id="preco">R$ 351,00</strong>')) falha("B: página do produto 3 não mostra o novo preço");
  const miniNovas = fs.readdirSync(path.join(COPIA, "miniaturas/produtos-320")).length - antesMini;
  if (miniNovas !== 1) falha(`B: ${miniNovas} miniaturas novas (esperada 1)`);
  const imgMudou = Object.keys(antesImg).filter((f) => antesImg[f] !== sha(lerC("img/produtos/" + f)));
  if (imgMudou.length) falha("B: fotos originais alteradas: " + imgMudou.join());
  R.parteB = { ...R.parteB, cartoesAlterados: mudaram, cartoes: Object.keys(depCards).length, produtoNovo: slugNovo, paginasAlteradas: pagMud.length, paginasAlteradasPorRelacao: pagMud.length - 1, paginasComVersaoNova: Object.keys(antesComVersao).filter((d) => antesComVersao[d] !== depComVersao[d]).length, miniaturasNovas: miniNovas, enderecosEstaveis: slugsEstaveis, fotosOriginaisAlteradas: imgMudou.length };
}

// ---------- Parte C: violações que as travas devem recusar ----------
function vmPaginas() { const t = lerC("dados/paginas.js").toString("utf8"); return require("vm").runInNewContext(t + "\n;PAGINAS", Object.create(null)); }
function violacao(nome, esperado, alterar, foto) {
  fs.writeFileSync(path.join(COPIA, "dados/catalogo.js"), guardar);
  for (const f of fs.readdirSync(path.join(COPIA, "img/produtos"))) if (f === "157.webp") fs.rmSync(path.join(COPIA, "img/produtos", f));
  const c = catalogo(); alterar(c.D); gravarCatalogo(c); if (foto) foto();
  const v = validar(), ok = v.status === 1 && esperado.test(v.stderr);
  R.parteC.push({ violacao: nome, recusada: ok, mensagem: (v.stderr.split("\n").find((l) => esperado.test(l)) || v.stderr.split("\n")[0] || "").slice(0, 150) });
  if (!ok) falha(`C: "${nome}" não foi recusada (status ${v.status}): ${v.stderr.slice(0, 160)}`);
}
const novoProd = (D, extra = {}) => D.products.push({ i: D.products.length, brand: "armaf", cat: "perfume", name: "Fictício", spec: "x", price: 10, old: null, desc: "", info: {}, ...extra });
const comFoto = () => fs.copyFileSync(path.join(COPIA, "img/produtos/000.webp"), path.join(COPIA, "img/produtos/157.webp"));
violacao("reordenar dois produtos", /mudou de/, (D) => { const a = D.products[10], b = D.products[11]; D.products[10] = { ...b, i: 10 }; D.products[11] = { ...a, i: 11 }; });
violacao("trocar o produto de uma posição", /mudou de/, (D) => { D.products[20].name = "Outro produto"; });
violacao("remover o último produto", /foi removido/, (D) => { D.products.pop(); });
violacao("produto novo sem foto", /foto ausente/, (D) => novoProd(D));
violacao("foto fora do padrão (300×375)", /foto com 300×375/, (D) => novoProd(D), () => fs.copyFileSync(path.join(COPIA, "img/banners/good-girl.webp"), path.join(COPIA, "img/produtos/157.webp")));
violacao("foto que não é WebP", /WebP válido/, (D) => novoProd(D), () => fs.writeFileSync(path.join(COPIA, "img/produtos/157.webp"), "isto não é uma imagem"));
violacao("preço zerado", /preço inválido/, (D) => novoProd(D, { price: 0 }), comFoto);
violacao('preço "de" menor que o preço', /deve ser maior/, (D) => novoProd(D, { price: 50, old: 40 }), comFoto);
violacao("marca inexistente", /marca inexistente/, (D) => novoProd(D, { brand: "naoexiste" }), comFoto);
violacao("posição fora de sequência", /fora de sequência/, (D) => novoProd(D, { i: 200 }), comFoto);
violacao("mais vendidos apontando para produto inexistente", /mais vendidos: posição 999/, () => { fs.writeFileSync(path.join(COPIA, "assets/config.js"), fs.readFileSync(path.join(RAIZ, "assets/config.js"), "utf8").replace("best:[102,", "best:[999,").replace("best:[102 ,", "best:[999,").replace(/best:\[102/, "best:[999")); }, null);
fs.writeFileSync(path.join(COPIA, "assets/config.js"), fs.readFileSync(path.join(RAIZ, "assets/config.js")));

// ---------- o repositório real continua igual ----------
if (git() !== gitAntes) falha("o repositório real foi alterado durante o ensaio");
R.repositorioIntacto = git() === gitAntes;
fs.rmSync(COPIA, { recursive: true, force: true });
console.log(JSON.stringify(R, null, 1));
process.exitCode = R.erros.length ? 1 : 0;
