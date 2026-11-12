# Bateria da Fase 2 — loja redesenhada

- 2026-11-12T12:31:31.584Z · referência: loja publicada `89ef168` · candidato: `index.html da raiz`
- Servidor de pedidos e pagamento **simulados**; rede externa bloqueada.

| Teste | Status | Descrição |
|---|---|---|
| P1 | ✅ PASSOU | Cards: 157 produtos com os mesmos dados, selos, parcelas e a mesma imagem (bytes) |
| P2 | ✅ PASSOU | Categorias, marcas, ordenações, busca e vitrines devolvem os mesmos produtos |
| P3 | ✅ PASSOU | Parcelamento: tabela de cada produto e simulador idênticos |
| P4 | ✅ PASSOU | Sacola: mesmos totais, persistência, limite e compatibilidade com sacolas já salvas |
| P5 | ✅ PASSOU | Checkout simulado (16 cenários): envio ao servidor idêntico; tela igual, exceto as diferenças aprovadas (economia do Pix e nome nas mensagens) |
| P6 | ✅ PASSOU | Retorno do pagamento: confirmação, mensagens e limpeza do endereço idênticos |
| P7 | ✅ PASSOU | Preservação: catálogo, configuração comercial, lógica, imagens, fontes e painel idênticos à Fase 1 |
| P8 | ✅ PASSOU | Sem rolagem lateral e painéis dentro da tela em 1440, 1024, 768, 390 e 320 px |
| P9 | ✅ PASSOU | Áreas de toque com pelo menos 44 px no celular (início, produto e checkout) |
| P10 | ✅ PASSOU | Imagens carregam, zero erros de JavaScript e zero requisições externas |
| P11 | ✅ PASSOU | Contraste do texto dentro do mínimo (4,5:1; 3:1 para texto grande) em início, banners, produto, sacola e checkout |
| P12 | ✅ PASSOU | Navegação do catálogo: limpar filtros, apagar busca, voltar ao topo e atalho de teclado |
| P13 | ✅ PASSOU | Páginas de produto: 156 páginas fiéis ao catálogo e integradas à sacola da loja |
| P18 | ✅ PASSOU | Cliques reais depois de abrir e fechar painéis (defeito do painel invisível que bloqueava a página no desktop) |
| P14 | ✅ PASSOU | Miniaturas: 316 arquivos nas dimensões certas, originais preservados e no máximo 1,3 MB de imagens no primeiro acesso no celular |
| P15 | ✅ PASSOU | Sacola e checkout: indicador de etapas e foco preso no painel, com devolução ao fechar |
| P16 | ✅ PASSOU | Ajustes da lógica: gerador fiel à Fase 1, app-premium rastreável, nome CP Importados, economia do Pix e miniaturas na sacola |
| P17 | ✅ PASSOU | Atualização do catálogo (ensaio em cópia): reconstrução idêntica, preço e produto novo refletidos, nada além do esperado muda, 11 violações recusadas |

## P1 — Cards: 157 produtos com os mesmos dados, selos, parcelas e a mesma imagem (bytes)

**✅ PASSOU**

- 157 cards comparados sem normalização

## P2 — Categorias, marcas, ordenações, busca e vitrines devolvem os mesmos produtos

**✅ PASSOU**

- por categoria: all 156, perfume 71, skincare 34, cabelo 33, bebida 7, outros 11
- 11 buscas · 40 marcas · 5 ordenações

## P3 — Parcelamento: tabela de cada produto e simulador idênticos

**✅ PASSOU**

- 157 produtos · 10 valores do simulador

## P4 — Sacola: mesmos totais, persistência, limite e compatibilidade com sacolas já salvas

**✅ PASSOU**

- total após rotina: R$ 1.846,00 · sacola antiga aberta: R$ 1.260,00

## P5 — Checkout simulado (16 cenários): envio ao servidor idêntico; tela igual, exceto as diferenças aprovadas (economia do Pix e nome nas mensagens)

**✅ PASSOU**

- C01 Pix · pedido criado com link: envio ao servidor idêntico · textos da tela idênticos
- C02 Cartão 1x · link: envio ao servidor idêntico · textos da tela idênticos
- C03 Cartão 6x · link: envio ao servidor idêntico · textos da tela idênticos
- C04 Cartão 12x · servidor devolve total: envio ao servidor idêntico · textos da tela idênticos
- C05 Cupom 10% + Pix: envio ao servidor idêntico · textos da tela idênticos
- C06 Cupom R$ 20 (mín. R$ 100) + cartão 12x: envio ao servidor idêntico · textos da tela idênticos
- C07 Cupom acima do mínimo não atingido: envio ao servidor idêntico · textos da tela idênticos
- C08 Cupom inválido: envio ao servidor idêntico · textos da tela idênticos
- C09 Cupom com falha de rede: envio ao servidor idêntico · textos da tela idênticos
- C10 Erro do servidor ao criar (Pix): envio ao servidor idêntico · textos da tela idênticos
- C11 Erro do servidor ao criar (cartão): envio ao servidor idêntico · textos da tela idênticos
- C12 Servidor rejeita cupom no pedido: envio ao servidor idêntico · textos da tela idênticos
- C13 Sem rede · Pix offline: envio ao servidor idêntico · textos da tela idênticos
- C14 Sem rede · cartão via WhatsApp: envio ao servidor idêntico · textos da tela idênticos
- C15 Pedido criado sem link (Pix local): envio ao servidor idêntico · textos da tela idênticos
- C16 Formulário vazio (validação): envio ao servidor idêntico · textos da tela idênticos

## P6 — Retorno do pagamento: confirmação, mensagens e limpeza do endereço idênticos

**✅ PASSOU**

- R1 Pago · confirmação aprovada: idêntico
- R2 Pago · confirmação pendente: idêntico
- R3 Volta sem pagamento: idêntico
- R4 Confirmação com falha de rede: idêntico
- R5 [segurança] receipt_url não-https: idêntico

## P7 — Preservação: catálogo, configuração comercial, lógica, imagens, fontes e painel idênticos à Fase 1

**✅ PASSOU**

- 225 arquivos conferidos contra a Fase 1 (8954947) · alterados: 0
- main: 89ef168 · origin/main: 89ef168

## P8 — Sem rolagem lateral e painéis dentro da tela em 1440, 1024, 768, 390 e 320 px

**✅ PASSOU**

- desktop: estouro 0px · painel do produto ok · sacola ok
- notebook: estouro 0px · painel do produto ok · sacola ok
- tablet: estouro 0px · painel do produto ok · sacola ok
- celular: estouro 0px · painel do produto ok · sacola ok
- celular pequeno: estouro 0px · painel do produto ok · sacola ok

## P9 — Áreas de toque com pelo menos 44 px no celular (início, produto e checkout)

**✅ PASSOU**

- celular: 232 controles visíveis conferidos no início
- celular pequeno: 232 controles visíveis conferidos no início

## P10 — Imagens carregam, zero erros de JavaScript e zero requisições externas

**✅ PASSOU**

- desktop: 175 imagens distintas, 0 falhas
- notebook: 175 imagens distintas, 0 falhas
- tablet: 175 imagens distintas, 0 falhas
- celular: 175 imagens distintas, 0 falhas
- celular pequeno: 175 imagens distintas, 0 falhas

## P11 — Contraste do texto dentro do mínimo (4,5:1; 3:1 para texto grande) em início, banners, produto, sacola e checkout

**✅ PASSOU**

- 14027 textos medidos em desktop e celular

## P12 — Navegação do catálogo: limpar filtros, apagar busca, voltar ao topo e atalho de teclado

**✅ PASSOU**

- desktop: com filtros "6 de 156 produtos" → após limpar "156 produtos"
- celular: com filtros "6 de 156 produtos" → após limpar "156 produtos"

## P13 — Páginas de produto: 156 páginas fiéis ao catálogo e integradas à sacola da loja

**✅ PASSOU**

- 156 páginas conferidas contra o catálogo: posição, preço, preço "de", parcelas, imagem, dados estruturados e sitemap · 404.html da marca (noindex, caminhos absolutos)
- desktop: página → +2 na sacola → "Comprar agora" → sacola da loja aberta com R$ 690,00; chegada por categoria e busca: 8 de 156 produtos
- celular: página → +2 na sacola → "Comprar agora" → sacola da loja aberta com R$ 690,00; chegada por categoria e busca: 8 de 156 produtos

## P18 — Cliques reais depois de abrir e fechar painéis (defeito do painel invisível que bloqueava a página no desktop)

**✅ PASSOU**

- desktop: abrir produto, fechar, abrir outro, adicionar, sacola, checkout e pagamento com cliques reais — painéis fechados ocultos
- tablet: abrir produto, fechar, abrir outro, adicionar, sacola, checkout e pagamento com cliques reais — painéis fechados ocultos
- celular: abrir produto, fechar, abrir outro, adicionar, sacola, checkout e pagamento com cliques reais — painéis fechados ocultos

## P14 — Miniaturas: 316 arquivos nas dimensões certas, originais preservados e no máximo 1,3 MB de imagens no primeiro acesso no celular

**✅ PASSOU**

- 157 fotos × 2 miniaturas e 2 tamanhos do logotipo conferidos · miniatura de 320 px menor que o original em 157 de 157
- soma das miniaturas de 320 px: 1884 KB contra 4259 KB dos originais
- celular 1x: 547 KB de imagens em 46 arquivos (40 miniaturas) — antes das miniaturas: 2474 KB
- celular 2x: 794 KB de imagens em 46 arquivos (40 miniaturas) — antes das miniaturas: 2474 KB

## P15 — Sacola e checkout: indicador de etapas e foco preso no painel, com devolução ao fechar

**✅ PASSOU**

- desktop: etapas 1 e 2 corretas · 80 Tabs na sacola e 40 no produto sem sair do painel · foco devolvido ao fechar
- celular: etapas 1 e 2 corretas · 80 Tabs na sacola e 40 no produto sem sair do painel · foco devolvido ao fechar

## P16 — Ajustes da lógica: gerador fiel à Fase 1, app-premium rastreável, nome CP Importados, economia do Pix e miniaturas na sacola

**✅ PASSOU**

- gerador de cards reproduz o index.html da Fase 1 byte a byte (157 cards, contagens e textos)
- assets/app-premium.js = assets/app.js (intacto, ver P7) + 7 trocas declaradas: whatsapp-pedido, whatsapp-duvida, economia-cartao, economia-pix, miniatura-definicao, miniatura-sacola, miniatura-rotina
- travas do catálogo: aprovado (157 produtos, 157 na trava)
- mensagens de WhatsApp estáticas conferidas em index.html e 156 páginas: nenhuma com "CP Imports" (o nome do produto "CP Imports Kit…" vem do catálogo e não foi alterado)
- desktop: fotos da sacola e das rotinas = miniaturas de 320 px carregadas · mensagem do painel com "CP Importados" · cartão: "economiza R$ 123,60" · Pix: "Pagando no Pix você economiza de R$ 27,10 (cartão à vista) até R$ 123,60 (cartão em 12x)."
- celular: fotos da sacola e das rotinas = miniaturas de 320 px carregadas · mensagem do painel com "CP Importados" · cartão: "economiza R$ 123,60" · Pix: "Pagando no Pix você economiza de R$ 27,10 (cartão à vista) até R$ 123,60 (cartão em 12x)."

## P17 — Atualização do catálogo (ensaio em cópia): reconstrução idêntica, preço e produto novo refletidos, nada além do esperado muda, 11 violações recusadas

**✅ PASSOU**

- reconstrução sem alterações: 0 arquivos diferentes, 0 de 156 páginas diferentes
- atualização simulada: cards alterados [3] de 158 · produto novo → produto/armaf-produto-de-simulacao/ · 13 páginas alteradas (preço e relacionados) · 1 miniatura nova · endereços existentes estáveis: true · fotos originais alteradas: 0
- travas: 11 de 11 violações recusadas (reordenar dois produtos; trocar o produto de uma posição; remover o último produto; produto novo sem foto; foto fora do padrão (300×375); foto que não é WebP; preço zerado; preço "de" menor que o preço; marca inexistente; posição fora de sequência; mais vendidos apontando para produto inexistente)
- repositório real intacto após o ensaio: true
