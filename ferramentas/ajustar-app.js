#!/usr/bin/env node
"use strict";
/*
 * Ajustes pontuais da lógica da loja (Fase 2 · etapa 4). O assets/app.js da Fase 1 NÃO é alterado: este script o lê e
 * grava assets/app-premium.js com as trocas abaixo. Cada troca exige exatamente UMA ocorrência do trecho original;
 * se o app.js mudar e o trecho sumir, a geração falha em vez de produzir um arquivo diferente do esperado.
 * Nada aqui toca em cálculo de preço, parcelamento, cupom, pedido, InfinitePay ou envio ao servidor.
 */
const fs = require("fs");
const path = require("path");
const RAIZ = path.resolve(__dirname, "..");

const TROCAS = [
  { id: "whatsapp-pedido", obs: "Mensagem do pedido enviada por WhatsApp usa o nome CP Importados",
    de: "Fiz um pedido pelo catálogo da CP Imports", para: "Fiz um pedido pelo catálogo da CP Importados" },
  { id: "whatsapp-duvida", obs: "Mensagem de dúvida sobre um produto usa o nome CP Importados",
    de: "Vim pelo catálogo da CP Imports e tenho uma dúvida", para: "Vim pelo catálogo da CP Importados e tenho uma dúvida" },
  { id: "economia-cartao", obs: "Checkout, cartão: mostra quanto o Pix economiza = taxa do cartão na parcela escolhida (mesma conta já exibida na linha 'Taxa do cartão')",
    de: "No Pix você paga ${fmt(base)}.</p>", para: 'No Pix você paga ${fmt(base)} e <b class="eco">economiza ${fmt(cc.total-base)}</b>.</p>' },
  { id: "economia-pix", obs: "Checkout, Pix: mostra a taxa que o cliente evita, da parcela à vista até a maior parcela (mesmas taxas de CFG.fees)",
    de: '<span>Total no Pix</span><span>${fmt(base)}</span></div></div>`;',
    para: '<span>Total no Pix</span><span>${fmt(base)}</span></div></div><p class="note eco">Pagando no Pix você economiza ${opts.length>1?`de ${fmt(opts[0].total-base)} (cartão à vista) até ${fmt(opts[opts.length-1].total-base)} (cartão em ${opts[opts.length-1].n}x)`:`${fmt(opts[0].total-base)} em taxas do cartão`}.</p>`;' },
  { id: "miniatura-definicao", obs: "Função que escolhe a miniatura de 320 px do card (ou o original, se não houver)",
    de: "cardEl[+c.dataset.i]=c});",
    para: 'cardEl[+c.dataset.i]=c});\nconst thumb=i=>{const m=/(\\S+)\\s+320w/.exec((cardEl[i]&&cardEl[i].querySelector("img").getAttribute("srcset"))||"");return m?m[1]:IMG[i]};' },
  { id: "miniatura-sacola", obs: "Foto da sacola usa a miniatura",
    de: '<div class="th"><img src="${IMG[x.p.i]}" alt="">', para: '<div class="th"><img src="${thumb(x.p.i)}" alt="" width="84" height="105" decoding="async">' },
  { id: "miniatura-rotina", obs: "Foto das rotinas usa a miniatura",
    de: '<div class="th"><img src="${IMG[p.i]}" alt="">', para: '<div class="th"><img src="${thumb(p.i)}" alt="" width="56" height="70" loading="lazy" decoding="async">' },
];

function gerar() {
  let codigo = fs.readFileSync(path.join(RAIZ, "assets", "app.js"), "utf8");
  for (const t of TROCAS) {
    const n = codigo.split(t.de).length - 1;
    if (n !== 1) throw new Error(`troca "${t.id}": esperada 1 ocorrência do trecho original, encontradas ${n}`);
    codigo = codigo.replace(t.de, () => t.para);
  }
  return `/* Gerado por ferramentas/ajustar-app.js a partir de assets/app.js (${TROCAS.length} trocas pontuais). Não editar à mão. */${codigo}`;
}
if (require.main === module) {
  const c = gerar(); fs.writeFileSync(path.join(RAIZ, "assets", "app-premium.js"), c);
  console.log(`assets/app-premium.js gerado: ${TROCAS.length} trocas · ${(Buffer.byteLength(c) / 1024).toFixed(1)} KB`);
}
module.exports = { gerar, TROCAS };
