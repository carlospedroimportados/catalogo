#!/usr/bin/env node
"use strict";
// Serve a loja (somente leitura) em http://127.0.0.1:4173/catalogo/ para navegar no protótipo.
// Protótipo: http://127.0.0.1:4173/catalogo/qa/prototipo-fase2/
const path = require("path");
const { iniciar } = require("../lib/servidor");
const porta = +(process.argv[2] || 4173);
iniciar(path.resolve(__dirname, "..", ".."), "/catalogo/", porta).then((s) => {
  console.log("Loja atual:  " + s.url);
  console.log("Protótipo:   " + s.url + "qa/prototipo-fase2/");
});
