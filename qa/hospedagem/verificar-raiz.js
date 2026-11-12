#!/usr/bin/env node
"use strict";
/*
 * Ensaia o site hospedado NA RAIZ de um domínio (Cloudflare Pages, Netlify), que é diferente do GitHub Pages (subpasta /catalogo/).
 * Constrói com CP_SITE, monta dist/ e o serve em "/". Confere: página 404 estilizada (caminhos absolutos na raiz), endereço
 * canônico e sitemap com o endereço novo, nenhuma referência ao endereço do GitHub Pages nas páginas e todos os arquivos com 200.
 * ATENÇÃO: reescreve index.html, 404.html, sitemap.xml e produto/ no repositório; ao final restaura do git (git checkout).
 * Uso: node qa/hospedagem/verificar-raiz.js [https://projeto.pages.dev/]
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { iniciar } = require("./servidor-pages");
const RAIZ = path.resolve(__dirname, "..", "..");
const SITE = (process.argv[2] || "https://previa-exemplo.pages.dev/").replace(/\/?$/, "/");
const ANTIGO = "https://carlospedroimportados.github.io/catalogo/";
const erros = [], det = [];
const sujo = execFileSync("git", ["status", "--porcelain", "--", "index.html", "404.html", "sitemap.xml", "produto", "dados/paginas.js"], { cwd: RAIZ }).toString();
if (sujo.trim()) { console.error("Há alterações não commitadas nos arquivos gerados; commite ou descarte antes de rodar este ensaio."); process.exit(2); }
const env = { ...process.env, CP_SITE: SITE };
const rodar = (arq) => execFileSync("node", [path.join(RAIZ, arq)], { cwd: RAIZ, env, stdio: "pipe" });
(async () => {
  let s;
  try {
    // Mesmo comando que a hospedagem executaria (só Node, sem Python): páginas e 404, página inicial, montagem do dist/
    rodar("ferramentas/gerar-paginas.js"); rodar("ferramentas/aplicar-redesign.js"); rodar("ferramentas/montar-site.js");
    const dist = path.join(RAIZ, "dist"); s = await iniciar({ raiz: dist, modo: "cdn", prefixo: "/" }); const base = s.url;
    const txt = async (p) => (await fetch(base + p)).text();
    const home = await txt(""); const nf = await fetch(base + "nao-existe/x"); const html404 = await nf.text();
    if (nf.status !== 404) erros.push(`404 devolveu ${nf.status}`);
    for (const m of html404.matchAll(/(?:href|src)="(\/[^"]+)"/g)) { const r = await fetch(new URL(m[1], base)); if (!r.ok && !m[1].includes("?cat=")) erros.push(`404: ${m[1]} → ${r.status}`); }
    if (!html404.includes('href="/assets/premium.css')) erros.push("404 sem caminho absoluto na raiz");
    if (!home.includes(`<link rel="canonical" href="${SITE}">`)) erros.push("página inicial com endereço canônico incorreto");
    const mapa = await txt("sitemap.xml"); const locs = [...mapa.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    if (locs.length !== 157 || locs.some((l) => !l.startsWith(SITE))) erros.push(`sitemap: ${locs.length} endereços, fora do site: ${locs.filter((l) => !l.startsWith(SITE)).length}`);
    let antigos = 0, paginas = 0;
    for (const l of locs) { const h = await (await fetch(l.replace(SITE, base))).text(); paginas++; if (h.includes(ANTIGO) || h.includes("/catalogo/")) antigos++; if (!h.includes(`rel="canonical" href="${l}"`)) erros.push(`${l}: canônico incorreto`); }
    if (antigos) erros.push(`${antigos} páginas ainda citam o endereço antigo (GitHub Pages)`);
    const css = await fetch(new URL(home.match(/href="(assets\/premium\.css\?v=\w+)"/)[1], base)); if (css.status !== 200 || !/immutable/.test(css.headers.get("cache-control") || "")) erros.push("estilo sem cache imutável");
    det.push(`site na raiz de ${SITE}: ${paginas} páginas conferidas, 404 estilizada com caminhos absolutos na raiz, canônico e sitemap com o endereço novo, nenhuma citação ao endereço do GitHub Pages`);
  } catch (e) { erros.push(String(e.message || e).slice(0, 300)); }
  finally { if (s) await s.fechar(); execFileSync("git", ["checkout", "--", "index.html", "404.html", "sitemap.xml", "produto", "dados/paginas.js", "qa/prototipo-fase2/index.html"], { cwd: RAIZ }); fs.rmSync(path.join(RAIZ, "dist"), { recursive: true, force: true }); }
  console.log(erros.length ? "FALHOU\n - " + erros.join("\n - ") : "PASSOU\n - " + det.join("\n - "));
  console.log("Arquivos gerados restaurados do git: " + (execFileSync("git", ["status", "--porcelain"], { cwd: RAIZ }).toString().trim() || "nenhuma alteração pendente"));
  process.exitCode = erros.length ? 1 : 0;
})();
