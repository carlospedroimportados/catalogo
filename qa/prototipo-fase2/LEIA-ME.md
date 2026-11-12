# Protótipo da Fase 2 — Redesign Premium

Protótipo funcional e isolado. **Não substitui nem altera a loja**: usa a lógica, os dados, as imagens e as
fontes originais no lugar onde estão, e acrescenta só a nova apresentação.

## Como ver

```bash
node qa/prototipo-fase2/servir.js
```

Abra `http://127.0.0.1:4173/catalogo/qa/prototipo-fase2/`. A loja atual fica em `http://127.0.0.1:4173/catalogo/`
para comparar lado a lado. Para ver a versão de celular, reduza a janela ou use o modo de dispositivo do navegador.

## O que dá para fazer

- Navegar por banners, categorias, vitrines, catálogo, filtros e busca.
- Abrir o painel de qualquer um dos 156 produtos, com preços e parcelas reais.
- Montar a sacola e percorrer o checkout com Pix ou cartão.
- Aplicar o cupom de demonstração `PROTOTIPO10`.
- Seguir até uma página de pagamento simulado e voltar com "pagamento aprovado".

**Nenhum pedido, cobrança ou mensagem real é criado.** `simulacao.js` responde no lugar do servidor de pedidos.

## Arquivos

| Arquivo | Função |
|---|---|
| `gerar.js` | Monta `index.html` a partir da loja (somente leitura): troca cabeçalho, banners, garantias e rodapé |
| `index.html` | Página do protótipo (gerada; não editar à mão) |
| `premium.css` | Camada visual do redesign, carregada depois de `assets/estilo.css` |
| `efeitos.js` | Entrada suave das seções ao rolar |
| `simulacao.js` | Respostas locais para cupom, pedido e confirmação |
| `pagamento-simulado.html` | Substitui a InfinitePay no protótipo |
| `servir.js` | Servidor local |
| `capturar.js` | Gera as capturas de `capturas/` (desktop e celular) |
| `testar.js` | Bateria P1–P10; grava em `relatorio/` |
| `auditar.js` | Auditoria automática de SEO, acessibilidade e peso |

## Regerar

```bash
node qa/prototipo-fase2/gerar.js
```

```bash
node qa/prototipo-fase2/testar.js
```

```bash
node qa/prototipo-fase2/capturar.js
```

## Limites

- A lógica original é usada sem alteração. Por isso as mensagens de WhatsApp ainda dizem "CP Imports" e o
  indicador de etapas do checkout, desenhado no canvas, ainda não aparece: os dois exigem tocar na lógica.
- O protótipo depende dos arquivos da loja em `../../`; não funciona copiado sozinho para outro lugar.
- Relatório completo das auditorias e do plano: `docs/fase2/relatorio-fase2.md`.
