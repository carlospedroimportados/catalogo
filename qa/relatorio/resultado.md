# Resultado da bateria T1–T15

- Referência (publicada): `89ef168` · Candidato: `.` · 2026-11-11T19:34:39.339Z · 105s
- Manifesto de referência: usado · Checkout e pagamentos: **simulados** (nenhuma requisição externa real)

| Teste | Status | Descrição |
|---|---|---|
| T1 | ✅ PASSOU | Catálogo: 157 itens, marcas, contatos e rotinas idênticos |
| T2 | ✅ PASSOU | Configuração comercial (taxas, parcela mínima, Pix, vitrines, API) idêntica |
| T3 | ✅ PASSOU | Imagens: inventário, integridade byte a byte (SHA-256) e vínculo produto↔imagem |
| T4 | ✅ PASSOU | Cards: marca, nome, apresentação, preço, preço "de", % e parcelas × cadastro |
| T5 | ✅ PASSOU | Categorias, marcas e ordenações |
| T6 | ✅ PASSOU | Busca (11 consultas, com e sem acento, inexistente e vazia) |
| T7 | ✅ PASSOU | Vitrines (mais vendidos, ofertas, novidades), rotinas, atalhos e contatos |
| T8 | ✅ PASSOU | Parcelamento 1x–12x: tabela de cada produto e simulador × fórmula × referência |
| T9 | ✅ PASSOU | Sacola: adicionar, +/−, persistência, rotina, limite 99, esvaziar, compatibilidade cp3_* |
| T10 | ✅ PASSOU | Checkout simulado: 16 cenários (Pix, cartão 1/6/12x, cupons, erros, sem rede, validação) |
| T11 | ✅ PASSOU | Retorno da InfinitePay (confirm, limpeza da URL, sacola) — simulado |
| T12 | ✅ PASSOU | Imagens renderizadas (grade, detalhe, sacola, rotinas) e capturas celular/desktop |
| T13 | ✅ PASSOU | Integridade: main intacta, admin/ e instagram/ idênticos, alterações só em caminhos permitidos |
| T14 | ℹ️ INFORMATIVO | Desempenho: tamanho do HTML e volume do primeiro carregamento |
| T15 | ✅ PASSOU | Reversibilidade: arquivos separados remontam o original byte a byte; nenhum arquivo ausente ou órfão |

## T1 — Catálogo: 157 itens, marcas, contatos e rotinas idênticos

**✅ PASSOU**

- 157 itens no catálogo (156 produtos reais + 1 item de teste)
- índices contíguos 0–156: sim
- 40 marcas · 2 contatos · 2 rotinas
- por categoria (incl. teste): perfume 71, skincare 34, bebida 7, outros 12, cabelo 33
- com preço "de" (oferta): 25

## T2 — Configuração comercial (taxas, parcela mínima, Pix, vitrines, API) idêntica

**✅ PASSOU**

- taxas do cartão 1x–12x: 4.2% · 6.09% · 7.01% · 7.91% · 8.8% · 9.67% · 12.59% · 13.42% · 14.25% · 15.06% · 15.87% · 16.66%
- parcela mínima: R$ 30 · mais vendidos: 10 itens · novidades a partir de i=119 · kit i=132
- endpoint da API presente: sim (mesmo da referência: sim)

## T3 — Imagens: inventário, integridade byte a byte (SHA-256) e vínculo produto↔imagem

**✅ PASSOU**

- 170 imagens embutidas (167 distintas) — logo-topo: 1, banner: 6, categoria: 5, produto: 157, logo-rodape: 1
- imagens de produto: 157, todas distintas: sim
- total decodificado: 4.39 MB · cabeçalho/Base64 inválidos: 0
- produto sem imagem: nenhum · item de teste i=133 tem card oculto e imagem própria

## T4 — Cards: marca, nome, apresentação, preço, preço "de", % e parcelas × cadastro

**✅ PASSOU**

- 157 cards conferidos campo a campo contra o cadastro (DATA) e contra a referência — 156 visíveis + item de teste oculto
- selos: desconto 25 · mais vendido 10 · novo 36 · kit 1

## T5 — Categorias, marcas e ordenações

**✅ PASSOU**

- por categoria: all 156, perfume 71, skincare 34, cabelo 33, bebida 7, outros 11
- 40 filtros de marca conferidos · 5 ordenações conferidas

## T6 — Busca (11 consultas, com e sem acento, inexistente e vazia)

**✅ PASSOU**

- "club" → 10 resultado(s)
- "CLUB DE NUIT" → 10 resultado(s)
- "ácido" → 14 resultado(s)
- "acido" → 14 resultado(s)
- "baunilha" → 41 resultado(s)
- "rosa jasmim" → 13 resultado(s)
- "fino" → 8 resultado(s)
- "tsubaki" → 10 resultado(s)
- "teste" → 1 resultado(s)
- "xyz-inexistente" → 0 resultado(s)
- "  " → 156 resultado(s)

## T7 — Vitrines (mais vendidos, ofertas, novidades), rotinas, atalhos e contatos

**✅ PASSOU**

- mais vendidos: 10 · ofertas: 25 · novidades: 36 · banners: 4
- atalhos: Perfumes 71 produtos | Skincare 34 produtos | Cabelos 33 produtos | Bebidas 7 produtos | Outros 11 produtos

## T8 — Parcelamento 1x–12x: tabela de cada produto e simulador × fórmula × referência

**✅ PASSOU**

- 157 tabelas de produto e 10 valores do simulador conferidos
- ex.: R$ 409,00 → 12x R$ 40,90 R$ 490,80

## T9 — Sacola: adicionar, +/−, persistência, rotina, limite 99, esvaziar, compatibilidade cp3_*

**✅ PASSOU**

- subtotal após passos: R$ 1.038,00 (3 itens) · após rotina: R$ 1.846,00
- sacola gravada pela referência ({"0":3}) aberta no candidato: R$ 1.260,00

## T10 — Checkout simulado: 16 cenários (Pix, cartão 1/6/12x, cupons, erros, sem rede, validação)

**✅ PASSOU**

- C01 Pix · pedido criado com link: create · pay=pix inst=1 → pagamento simulado — idêntico
- C02 Cartão 1x · link: create · pay=card inst=1 → pagamento simulado — idêntico
- C03 Cartão 6x · link: create · pay=card inst=6 → pagamento simulado — idêntico
- C04 Cartão 12x · servidor devolve total: create · pay=card inst=12 → pagamento simulado — idêntico
- C05 Cupom 10% + Pix: coupon+create · pay=pix inst=1 cupom=TESTE10 → pagamento simulado — idêntico
- C06 Cupom R$ 20 (mín. R$ 100) + cartão 12x: coupon+create · pay=card inst=12 cupom=TESTE20 → pagamento simulado — idêntico
- C07 Cupom acima do mínimo não atingido: coupon — idêntico
- C08 Cupom inválido: coupon — idêntico
- C09 Cupom com falha de rede: coupon — idêntico
- C10 Erro do servidor ao criar (Pix): create · pay=pix inst=1 — idêntico
- C11 Erro do servidor ao criar (cartão): create · pay=card inst=3 → 2 link(s) WhatsApp — idêntico
- C12 Servidor rejeita cupom no pedido: coupon+create · pay=pix inst=1 cupom=TESTE10 — idêntico
- C13 Sem rede · Pix offline: create · pay=pix inst=1 → Pix offline → 2 link(s) WhatsApp — idêntico
- C14 Sem rede · cartão via WhatsApp: create · pay=card inst=12 → 2 link(s) WhatsApp — idêntico
- C15 Pedido criado sem link (Pix local): create · pay=pix inst=1 → Pix offline → 2 link(s) WhatsApp — idêntico
- C16 Formulário vazio (validação): nenhuma chamada — idêntico

## T11 — Retorno da InfinitePay (confirm, limpeza da URL, sacola) — simulado

**✅ PASSOU**

- R1 Pago · confirmação aprovada: {"action":"confirm","nsu":"CP-SIM-0001","transaction_nsu":"TX-SIM-1","slug":"sim"} → "Pagamento recebido! / Pedido CP-SIM-0001 / Pagamento aprovado. Obrigado! Em breve entramos em contato."
- R2 Pago · confirmação pendente: {"action":"confirm","nsu":"CP-SIM-0002","transaction_nsu":"TX-SIM-2","slug":"sim"} → "Pagamento recebido! / Pedido CP-SIM-0002 / Recebemos seu retorno. Confirmaremos o pagamento em instantes."
- R3 Volta sem pagamento: sem chamada → "Obrigado pelo pedido! / Pedido CP-SIM-0003 / Assim que o pagamento for confirmado, avisamos pelo WhatsApp."
- R4 Confirmação com falha de rede: {"action":"confirm","nsu":"CP-SIM-0004","transaction_nsu":"TX-SIM-4","slug":null} → "Pagamento recebido! / Pedido CP-SIM-0004 / Estamos confirmando com a InfinitePay…"
- R5 [segurança] receipt_url não-https: {"action":"confirm","nsu":"CP-SIM-0005","transaction_nsu":null,"slug":null} → "Pagamento recebido! / Pedido CP-SIM-0005 / Estamos confirmando com a InfinitePay…"
- achado de segurança conhecido (receipt_url aceita javascript:) — referência: presente · candidato: presente (correção prevista para a Fase 1, com aprovação)

## T12 — Imagens renderizadas (grade, detalhe, sacola, rotinas) e capturas celular/desktop

**✅ PASSOU**

- 249 <img> na página · 167 distintas · decodificadas: 167 · falhas: 0
- detalhe do produto: 640×800px · miniaturas da sacola ok: true
- capturas idênticas byte a byte à referência: 6/8 · demais dentro da tolerância de 0,5%: celular-2-catalogo: 0.000% dos pixels, desktop-2-catalogo: 0.000% dos pixels (em qa/relatorio/capturas/)
- requisições externas bloqueadas em toda a bateria: 0 · erros de JavaScript/console: 0

## T13 — Integridade: main intacta, admin/ e instagram/ idênticos, alterações só em caminhos permitidos

**✅ PASSOU**

- branch atual: claude/sharp-davinci-n31ccy · main local: 89ef168 · origin/main: 89ef168 · referência publicada: 89ef168
- 47 arquivos da versão publicada conferidos byte a byte (admin/: 6, instagram/: 39) — alterados: index.html
- caminhos novos/alterados desde a referência: 211 · fora dos permitidos (index.html, assets/, dados/, fonts/, img/, ferramentas/, qa/): 0

## T14 — Desempenho: tamanho do HTML e volume do primeiro carregamento

**ℹ️ INFORMATIVO**

- index.html: 231.8 KB (gzip: 22.5 KB) · meta da Fase 1: ≤ 150 KB
- Base64 dentro do index.html: nenhum · scripts externos de terceiros: 0
- original — 1 requisições · 6.42 MB no 1º carregamento (celular, sem cache) · DOMContentLoaded 487 ms · load 494 ms
- nova versão — 104 requisições · 2.85 MB no 1º carregamento (celular, sem cache) · DOMContentLoaded 280 ms · load 373 ms
- nova versão por tipo: document 231.8 KB, stylesheet 27.6 KB, image 2412.3 KB, script 130.0 KB, font 121.4 KB

Divergências / observações:

- meta ≤ 150 KB não atingida (231.8 KB): o restante são os 157 cards pré-renderizados, incluindo os links de WhatsApp de reserva sem JavaScript, preservados por regra; comprimido (gzip) o HTML tem 22.5 KB

## T15 — Reversibilidade: arquivos separados remontam o original byte a byte; nenhum arquivo ausente ou órfão

**✅ PASSOU**

- versão separada: sim · arquivos referenciados: 180 (assets 4, fonts 8, dados 1, img/marca 1, img/banners 6, img/categorias 3, img/produtos 157)
- index.html remontado a partir dos arquivos: SHA-256 d70b8243f62681e6… · original publicado: d70b8243f62681e6… → IDÊNTICO byte a byte
- arquivos ausentes ou com ?v= desatualizado: 0 · arquivos órfãos (em disco e não usados): 0
