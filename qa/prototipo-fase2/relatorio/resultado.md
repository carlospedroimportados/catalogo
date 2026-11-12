# Bateria da Fase 2 — protótipo

- 2026-11-12T01:31:29.887Z · referência: loja publicada `89ef168` · candidato: `qa/prototipo-fase2/`
- Servidor de pedidos e pagamento **simulados**; rede externa bloqueada.

| Teste | Status | Descrição |
|---|---|---|
| P1 | ✅ PASSOU | Cards: 157 produtos com os mesmos dados, selos, parcelas e a mesma imagem (bytes) |
| P2 | ✅ PASSOU | Categorias, marcas, ordenações, busca e vitrines devolvem os mesmos produtos |
| P3 | ✅ PASSOU | Parcelamento: tabela de cada produto e simulador idênticos |
| P4 | ✅ PASSOU | Sacola: mesmos totais, persistência, limite e compatibilidade com sacolas já salvas |
| P5 | ✅ PASSOU | Checkout simulado (16 cenários): o que é enviado ao servidor e os textos da tela não mudam |
| P6 | ✅ PASSOU | Retorno do pagamento: confirmação, mensagens e limpeza do endereço idênticos |
| P7 | ✅ PASSOU | Isolamento: protótipo usa lógica, dados e imagens da loja sem cópia |
| P8 | ✅ PASSOU | Sem rolagem lateral e painéis dentro da tela em 1440, 1024, 768, 390 e 320 px |
| P9 | ✅ PASSOU | Áreas de toque com pelo menos 44 px no celular (início, produto e checkout) |
| P10 | ✅ PASSOU | Imagens carregam, zero erros de JavaScript e zero requisições externas |
| P11 | ✅ PASSOU | Contraste do texto dentro do mínimo (4,5:1; 3:1 para texto grande) em início, banners, produto, sacola e checkout |
| P12 | ✅ PASSOU | Navegação do catálogo: limpar filtros, apagar busca, voltar ao topo e atalho de teclado |

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

## P5 — Checkout simulado (16 cenários): o que é enviado ao servidor e os textos da tela não mudam

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

## P7 — Isolamento: protótipo usa lógica, dados e imagens da loja sem cópia

**✅ PASSOU**

- alterações pendentes no repositório: 188

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

- desktop: 168 imagens distintas, 0 falhas
- notebook: 168 imagens distintas, 0 falhas
- tablet: 168 imagens distintas, 0 falhas
- celular: 168 imagens distintas, 0 falhas
- celular pequeno: 168 imagens distintas, 0 falhas

## P11 — Contraste do texto dentro do mínimo (4,5:1; 3:1 para texto grande) em início, banners, produto, sacola e checkout

**✅ PASSOU**

- 14039 textos medidos em desktop e celular

## P12 — Navegação do catálogo: limpar filtros, apagar busca, voltar ao topo e atalho de teclado

**✅ PASSOU**

- desktop: com filtros "6 de 156 produtos" → após limpar "156 produtos"
- celular: com filtros "6 de 156 produtos" → após limpar "156 produtos"
