"use strict";
/*
 * Navegação do catálogo no protótipo: limpar filtros, apagar a busca e voltar ao topo.
 * Não altera a lógica da loja: apenas aciona os controles que já existem (busca, categoria,
 * marca e ordenação), como um cliente faria.
 */
(function () {
  var $ = function (s) { return document.querySelector(s); };
  var eu = document.currentScript && document.currentScript.getAttribute("src") || "assets/navegacao.js";
  var BASE = eu.slice(0, eu.indexOf("assets/")); // "" na loja, "../../" no protótipo
  var q = $("#q"), marca = $("#fBrand"), ordem = $("#fSort"), cnt = $("#cnt");
  if (!q || !marca || !ordem || !cnt) return;
  var avisar = function (el, tipo) { el.dispatchEvent(new Event(tipo, { bubbles: true })); };
  var icone = function (d) { return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>'; };

  // contagem + "Limpar filtros" na mesma linha (o contador original não é modificado)
  var linha = document.createElement("div"); linha.className = "cnt-l";
  cnt.parentNode.insertBefore(linha, cnt); linha.appendChild(cnt);
  var limpar = document.createElement("button");
  limpar.type = "button"; limpar.className = "limpar"; limpar.textContent = "Limpar filtros"; limpar.hidden = true;
  linha.appendChild(limpar);

  // botão de apagar dentro da busca
  var apaga = document.createElement("button");
  apaga.type = "button"; apaga.className = "apaga"; apaga.setAttribute("aria-label", "Apagar busca"); apaga.hidden = true;
  apaga.innerHTML = icone("M6 6l12 12M18 6L6 18");
  q.parentNode.appendChild(apaga);

  var categoria = function () { var b = $('.seg [aria-pressed="true"]'); return b ? b.dataset.cat : "all"; };
  var atualizar = function () {
    limpar.hidden = !(q.value.trim() || marca.value !== "all" || ordem.value !== "cat" || categoria() !== "all");
    apaga.hidden = !q.value;
  };
  var depois = function () { setTimeout(atualizar, 0); };
  document.addEventListener("input", depois); document.addEventListener("change", depois); document.addEventListener("click", depois);

  apaga.addEventListener("click", function () { q.value = ""; avisar(q, "input"); q.focus(); });
  limpar.addEventListener("click", function () {
    if (q.value) { q.value = ""; avisar(q, "input"); }
    var todos = $('.seg [data-cat="all"]'); if (todos && categoria() !== "all") todos.click();
    if (marca.value !== "all") { marca.value = "all"; avisar(marca, "change"); }
    if (ordem.value !== "cat") { ordem.value = "cat"; avisar(ordem, "change"); }
  });

  // voltar ao topo; sobe um pouco quando a barra da sacola está visível
  var topo = document.createElement("button");
  topo.type = "button"; topo.className = "topo"; topo.setAttribute("aria-label", "Voltar ao topo");
  topo.innerHTML = icone("M6 15l6-6 6 6");
  document.body.appendChild(topo);
  var barra = $("#bar"), marcado = false;
  var rolar = function () {
    if (marcado) return; marcado = true;
    requestAnimationFrame(function () {
      marcado = false;
      topo.classList.toggle("on", window.scrollY > 900);
      topo.classList.toggle("sobe", !!barra && barra.classList.contains("on"));
    });
  };
  window.addEventListener("scroll", rolar, { passive: true });
  topo.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  });
  atualizar();

  // O botão de voltar ao topo some quando o rodapé aparece, para não cobrir os textos dele.
  var rodapeEl = $("footer.f");
  if (rodapeEl && "IntersectionObserver" in window) new IntersectionObserver(function (es) { topo.classList.toggle("fora", es[0].isIntersecting); }).observe(rodapeEl);

  // Chegada vinda das páginas de produto: ?busca=termo, ?cat=categoria e #sacola.
  // Só aciona controles existentes; os parâmetros são retirados do endereço em seguida.
  var par = new URLSearchParams(location.search), busca = par.get("busca"), cat = par.get("cat");
  if (cat) { var botao = $('.seg [data-cat="' + cat.replace(/[^a-z]/g, "") + '"]'); if (botao) botao.click(); }
  if (busca) { q.value = busca.slice(0, 80); avisar(q, "input"); }
  if (busca || cat) {
    par.delete("busca"); par.delete("cat"); var resto = par.toString();
    try { history.replaceState(null, "", location.pathname + (resto ? "?" + resto : "") + location.hash); } catch (e) { /* endereço fica como está */ }
    var alvo = $("#catalogo"); if (alvo) setTimeout(function () { alvo.scrollIntoView(); }, 60);
  }
  // Indicador de etapas da sacola e do checkout. É decorativo (aria-hidden) e não tem texto no documento;
  // o rótulo "Etapa 1 de 2" vem do CSS. Reaparece a cada redesenho do painel feito pela loja.
  var corpoSac = $("#bagBody"), tituloSac = $("#bagT");
  var etapas = function () {
    if (!corpoSac || !tituloSac) return;
    var t = tituloSac.textContent.trim(), n = t === "Sua sacola" ? 1 : t === "Finalizar compra" ? 2 : 0;
    var atual = corpoSac.querySelector(":scope > .etapas");
    if (!n || corpoSac.querySelector(".empty-bag") || corpoSac.querySelector(".done")) { if (atual) atual.remove(); return; }
    if (atual && +atual.dataset.n === n) return;
    if (atual) atual.remove();
    var el = document.createElement("div");
    el.className = "etapas"; el.dataset.n = n; el.setAttribute("aria-hidden", "true");
    el.innerHTML = '<span class="on"></span><span class="' + (n === 2 ? "on" : "") + '"></span>';
    corpoSac.insertBefore(el, corpoSac.firstChild);
  };
  if (corpoSac) new MutationObserver(etapas).observe(corpoSac, { childList: true });

  // Foco: preso dentro do painel aberto (sacola ou produto) e devolvido a quem o abriu ao fechar.
  var abriu = null;
  document.addEventListener("click", function (e) {
    var b = e.target.closest("button,a,[data-open]");
    if (b && !b.closest(".sheet")) abriu = b;
  }, true);
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Tab") return;
    var painel = $("#bag.on, #pv.on"); if (!painel) return;
    var itens = [].slice.call(painel.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select,textarea,summary,[tabindex]:not([tabindex="-1"])'))
      .filter(function (x) { return x.getClientRects().length > 0 && getComputedStyle(x).visibility !== "hidden"; });
    if (!itens.length) return;
    var primeiro = itens[0], ultimo = itens[itens.length - 1], foco = document.activeElement;
    if (!painel.contains(foco)) { primeiro.focus(); e.preventDefault(); }
    else if (e.shiftKey && foco === primeiro) { ultimo.focus(); e.preventDefault(); }
    else if (!e.shiftKey && foco === ultimo) { primeiro.focus(); e.preventDefault(); }
  });
  ["#bag", "#pv"].forEach(function (sel) {
    var painel = $(sel); if (!painel) return;
    var estava = false;
    new MutationObserver(function () {
      var aberto = painel.classList.contains("on");
      if (estava && !aberto && abriu && document.contains(abriu) && !$("#bag.on, #pv.on")) abriu.focus({ preventScroll: true });
      estava = aberto;
    }).observe(painel, { attributes: true, attributeFilter: ["class"] });
  });

  if (location.hash === "#sacola") { var sac = $(".bagbtn"); if (sac) sac.click(); }

  // Atalho do painel do produto para a página com endereço próprio (se as páginas foram geradas).
  var corpo = $("#pvBody");
  if (corpo && typeof PAGINAS !== "undefined") {
    new MutationObserver(function () {
      if (corpo.querySelector(".pg-link")) return;
      var im = corpo.querySelector(".pvimg img"), m = im && /produtos\/(\d+)\.webp/.exec(im.getAttribute("src") || "");
      var destino = m && PAGINAS[+m[1]], ancora = corpo.querySelector(".wa.ghost");
      if (!destino || !ancora) return;
      var l = document.createElement("a");
      l.className = "pg-link"; l.href = BASE + "produto/" + destino + "/"; l.textContent = "Abrir página do produto";
      ancora.insertAdjacentElement("afterend", l);
    }).observe(corpo, { childList: true });
  }
})();
