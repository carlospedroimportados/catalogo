"use strict";
/*
 * SOMENTE PROTÓTIPO. Responde localmente às três chamadas que a loja faz ao servidor de pedidos
 * (cupom, criar pedido, confirmar pagamento), para que o fluxo possa ser navegado sem criar
 * pedidos, cobranças ou mensagens reais. Nenhum dado digitado sai do navegador.
 *
 * Sob automação de testes (navigator.webdriver) fica inativo: os testes interceptam a rede
 * diretamente e precisam ver as chamadas originais da loja.
 */
(function () {
  if (navigator.webdriver) return;
  var original = window.fetch;
  var resposta = function (obj) {
    return Promise.resolve(new Response(JSON.stringify(obj), { status: 200, headers: { "Content-Type": "application/json" } }));
  };
  window.fetch = function (url, opcoes) {
    if (String(url).indexOf("script.google.com") < 0) return original.apply(this, arguments);
    var corpo = {};
    try { corpo = JSON.parse((opcoes && opcoes.body) || "{}"); } catch (e) { /* corpo ilegível: trata como vazio */ }
    if (corpo.action === "coupon") {
      return resposta(String(corpo.code).toUpperCase() === "PROTOTIPO10"
        ? { ok: true, code: "PROTOTIPO10", tipo: "%", valor: 10, min: 0, label: "10% de desconto (cupom de demonstração)" }
        : { ok: false, error: "Cupom inválido. No protótipo, use PROTOTIPO10." });
    }
    if (corpo.action === "create") {
      return resposta({ ok: true, nsu: "PROTOTIPO-0001", url: "pagamento-simulado.html?pay=" + encodeURIComponent((corpo.order || {}).pay || "") });
    }
    if (corpo.action === "confirm") return resposta({ status: "Aprovado" });
    return resposta({ ok: false, error: "Ação não simulada no protótipo." });
  };
})();
