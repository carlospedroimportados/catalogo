"use strict";
// Microinterações do protótipo: entrada suave das seções ao rolar. Só visual; não toca na lógica da loja.
// Desligado quando o aparelho pede menos movimento ou quando o navegador não oferece IntersectionObserver.
(function () {
  if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var alvos = document.querySelectorAll("section.blk .sec-head, .garantias .wrap > div, .rt, .payc, .steps li, .ct");
  var obs = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("visto"); obs.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px" });
  alvos.forEach(function (el) { el.classList.add("entra"); obs.observe(el); });
})();
