"use strict";
/*
 * Página individual de produto. Usa a MESMA sacola da loja (chave cp3_bag no navegador) e as mesmas
 * fórmulas de preço e parcelamento. O checkout acontece na página inicial: "Comprar agora" coloca o
 * produto na sacola e leva o cliente até ela. Nenhum dado é enviado a servidor algum a partir daqui.
 */
(function () {
  var main = document.querySelector("main[data-i]"); if (!main) return;
  var i = +main.dataset.i, $ = function (id) { return document.getElementById(id); };
  var p = (typeof DATA !== "undefined" && DATA.products[i]) || null;
  var fmt = function (v) { return "R$ " + v.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, "."); };
  var opcoes = function (base) {
    var o = [];
    for (var n = 1; n <= 12; n++) {
      var par = Math.ceil(base / (1 - (CFG.fees[n] || 0) / 100) / n * 100 - 1e-9) / 100;
      if (n === 1 || par >= CFG.minParcela) o.push({ n: n, par: par, total: Math.round(par * n * 100) / 100 });
    }
    return o;
  };

  // Sacola compartilhada com a loja
  var sacola = {}; try { sacola = JSON.parse(localStorage.getItem("cp3_bag") || "{}") || {}; } catch (e) { sacola = {}; }
  var gravar = function () { try { localStorage.setItem("cp3_bag", JSON.stringify(sacola)); } catch (e) { /* armazenamento indisponível */ } };
  var contar = function () { return Object.keys(sacola).reduce(function (s, k) { return s + (+sacola[k] || 0); }, 0); };
  var qtd = 1, tAviso;
  var aviso = function (t) { var e = $("toast"); e.textContent = t; e.classList.add("on"); clearTimeout(tAviso); tAviso = setTimeout(function () { e.classList.remove("on"); }, 1900); };
  var colocar = function () { sacola[i] = Math.min(99, (+sacola[i] || 0) + qtd); gravar(); };

  function desenhar() {
    $("sacolaN").textContent = contar();
    $("qtd").textContent = qtd;
    var na = +sacola[i] || 0;
    $("adicionar").textContent = "Adicionar à sacola" + (na ? " (" + na + " na sacola)" : "");
    if (!p) return;
    // Preço e parcelas vêm sempre do catálogo carregado: a página nunca mostra valor desatualizado.
    var o = opcoes(p.price), m = o[o.length - 1];
    $("preco").textContent = fmt(p.price);
    $("pix").textContent = fmt(p.price) + " à vista, sem acréscimo";
    $("cartao").textContent = m.n > 1 ? "até " + m.n + "x de " + fmt(m.par) : fmt(m.total);
    $("parcelas").innerHTML = o.map(function (c) { return "<tr><td>" + c.n + "x</td><td>" + fmt(c.par) + "</td><td>" + fmt(c.total) + "</td></tr>"; }).join("");
    $("comprar").textContent = "Comprar agora · " + fmt(p.price * qtd);
  }

  $("menos").addEventListener("click", function () { qtd = Math.max(1, qtd - 1); desenhar(); });
  $("mais").addEventListener("click", function () { qtd = Math.min(99, qtd + 1); desenhar(); });
  $("adicionar").addEventListener("click", function () { colocar(); aviso(qtd + " adicionado" + (qtd > 1 ? "s" : "") + " à sacola"); qtd = 1; desenhar(); });
  $("comprar").addEventListener("click", function () { colocar(); }); // o link segue para a sacola da loja
  window.addEventListener("pageshow", function () { try { sacola = JSON.parse(localStorage.getItem("cp3_bag") || "{}") || {}; } catch (e) { sacola = {}; } desenhar(); });
  desenhar();
})();
