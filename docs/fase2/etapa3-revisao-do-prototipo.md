# Fase 2 · Etapa 3 — Revisão do protótipo

Trabalho feito somente em `qa/prototipo-fase2/`. A loja (`index.html`, `assets/`, `dados/`, `img/`, `fonts/`),
o painel e as integrações não foram alterados. A lógica da loja (`assets/app.js`) continua sendo usada sem mudança.

## O que mudou

| Área | Mudança |
|---|---|
| Responsividade | Banner em duas colunas no tablet (700–860 px); menu sem corte entre 861 e 1180 px; marca e sacola na mesma linha em 320 px; categorias em grade no tablet |
| Sacola | Resumo e botões ancorados no rodapé do painel no desktop; preço sem quebra de linha no celular |
| Checkout | Botão de pagar sempre visível enquanto o cliente rola o formulário |
| Navegação do catálogo | Botão "Limpar filtros" (aparece só com filtro ativo), botão de apagar a busca e botão de voltar ao topo |
| Desempenho | Dimensões declaradas em 167 imagens (sobram 8 sem, todas geradas pela lógica); duas fontes principais pré-carregadas; imagens do primeiro banner com prioridade; ícone da aba |
| Acessibilidade | Atalho "Pular para o conteúdo"; contraste medido em 14 mil textos; controles de 44 px também em 320 px |

## Testes

Bateria do protótipo (`node qa/prototipo-fase2/testar.js`): **12 de 12 aprovados**.

- P1–P7: dados, filtros, parcelas, sacola, checkout (16 cenários), retorno do pagamento e isolamento — idênticos à loja publicada.
- P8: sem rolagem lateral em 1440, 1024, 768, 390 e 320 px.
- P9: áreas de toque de 44 px no celular.
- P10: imagens carregam; zero erros; zero requisições externas.
- P11 (novo): contraste mínimo de 4,5:1 (3:1 para texto grande) em início, quatro banners, produto, sacola e checkout.
- P12 (novo): limpar filtros, apagar busca, voltar ao topo e atalho de teclado.

A bateria T1–T15 da loja não foi repetida: nenhum arquivo da loja mudou desde a última execução.

## Medições (celular, local, sem cache)

| | Loja (Fase 1) | Protótipo |
|---|---|---|
| Imagens sem dimensões declaradas | 247 | 8 |
| Ícone da aba | não | sim |
| Peso do primeiro carregamento | 2,80 MB | 2,98 MB |

O peso continua dominado pelas fotos (2,4 MB). Isso só melhora com versões menores das imagens, que ainda não foram criadas.

## Pendências

1. Versões menores das fotos para o celular (os originais ficam preservados) — exige autorização para criar arquivos em `img/`.
2. Etapas no checkout, economia do Pix e nome da marca nas mensagens — exigem tocar na lógica.
3. Contraste e teclado foram medidos por teste automático; uso com leitor de tela real não foi verificado.
4. Levar o redesign do protótipo para a loja na branch de trabalho — ainda não iniciado.
5. Correção do link do comprovante e ferramenta de atualização do catálogo — registradas à parte.
