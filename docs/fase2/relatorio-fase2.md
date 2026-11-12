# CP IMPORTADOS — Fase 2 · Redesign Premium

Relatório da operação de preparação: auditorias, plano de conversão e plano de implementação.
Nada aqui altera a loja: o protótipo vive em `qa/prototipo-fase2/` e a loja original não foi tocada.

Convenção: **[confirmado]** = verificado nos arquivos ou por teste; **[pendente]** = depende de informação externa.

---

## 1. Auditoria técnica da arquitetura

### 1.1 Componentes

| Componente | Onde | Situação |
|---|---|---|
| Página da loja | `index.html` (232 KB, 157 cards prontos) | [confirmado] |
| Estilo | `assets/estilo.css` (28 KB, uma folha, sem pré-processador) | [confirmado] |
| Lógica | `assets/app.js` (34 KB, um arquivo, sem dependências) | [confirmado] |
| Catálogo | `dados/catalogo.js` (157 itens, 40 marcas, 2 contatos, 2 rotinas) | [confirmado] |
| Configuração comercial | `assets/config.js` (endereço do servidor, taxas 1x–12x, parcela mínima, Pix, vitrines) | [confirmado] |
| Imagens | `img/` (167 arquivos WebP, 4,3 MB; produtos em 640×800) | [confirmado] |
| Fontes | `fonts/` (8 arquivos, Cormorant Garamond e Montserrat) | [confirmado] |
| Painel | `admin/` abre o Apps Script numa moldura, com a senha no endereço | [confirmado] |
| Servidor de pedidos | Google Apps Script, um único endereço para loja e painel | existência [confirmado]; código [pendente] |
| Pagamento | InfinitePay, acionada só pelo servidor; a loja apenas redireciona | [confirmado] |
| Gerador do catálogo | fora do GitHub; indícios de programa em Python | [pendente] |
| Publicação | GitHub Pages a partir da `main`, por upload manual | [confirmado] |

### 1.2 Como a loja funciona por dentro

- **Estado**: quatro chaves no navegador (`cp3_bag`, `cp3_pay`, `cp3_inst`, `cp3_cust`). CPF não é salvo.
- **Renderização**: os cards vêm prontos no HTML; a lógica só os mostra, esconde e reordena. Sacola, checkout e painel do produto são montados pela lógica.
- **Contrato com o servidor**: três envios (`coupon`, `create`, `confirm`). O pedido leva apenas a posição do produto e a quantidade — o preço cobrado é decidido pelo servidor.
- **Dependências externas**: nenhuma biblioteca, CDN, fonte remota ou rastreador. Só `wa.me` (links) e o endereço do Apps Script.

### 1.3 Oportunidades

1. **A lógica depende de nomes de classe e de identificadores do HTML.** O redesign pode ser feito quase todo por CSS, mantendo esses nomes — foi o que o protótipo comprovou: `assets/app.js` é usado sem nenhuma alteração.
2. **Cards duplicados em memória**: as vitrines clonam os cards da grade. Funciona, mas multiplica imagens carregadas (ver 3.1).
3. **Um arquivo de lógica só**: fácil de manter hoje; dividir em módulos só compensa quando entrarem páginas de produto e catálogo dinâmico.
4. **Marca**: o cabeçalho, o título da página e as mensagens de WhatsApp dizem "CP Imports"; o logotipo diz "CP Importados". O protótipo usa "CP Importados" no cabeçalho, mas as mensagens de WhatsApp continuam "CP Imports" porque estão na lógica, que não foi tocada. **Decisão pendente.**

### 1.4 Riscos

| Risco | Gravidade | Tratamento |
|---|---|---|
| Posição do produto é o identificador do pedido | Alta | Nunca reordenar; travas na ferramenta de atualização |
| Catálogo em dois lugares (loja e servidor) | Alta | Conferir preços do servidor; catálogo dinâmico em fase futura |
| Upload do `index.html` antigo desfaz a Fase 1 | Alta | Definir fluxo antes de publicar |
| Loja sem estoque | Média | Fase futura, depende do Apps Script |
| Sem ambiente de homologação em hospedagem real | Média | Repositório de prévia antes da `main` |

---

## 2. Conversão comercial

Tudo abaixo usa só informações que a loja já tem. Nada inventa preço, prazo ou promoção.

### 2.1 Já aplicado no protótipo

| Melhoria | Efeito esperado |
|---|---|
| Faixa de avisos e faixa de garantias (Pix sem acréscimo, 12x, pagamento seguro, envio) | Responde às dúvidas de compra antes do catálogo |
| Banners de campanha com um botão principal por banner | Direciona para categoria ou oferta |
| Cards maiores, nome em destaque, selo de desconto em esmeralda | Leitura mais rápida de produto e oferta |
| Botão "Adicionar" em contorno que preenche ao tocar | Ação clara sem competir com a foto |
| Painel do produto com preço, Pix e parcelas no topo | Decisão de compra sem rolar |
| Sacola em cartões com foto maior e controles de 44 px | Menos erro de toque no celular |
| Checkout com Pix e cartão lado a lado e total sempre visível | Menos abandono na escolha do pagamento |
| Barra fixa da sacola no celular | Acesso à compra em qualquer ponto da página |

### 2.2 Recomendado, ainda não feito

1. **Mostrar a economia do Pix no checkout** quando o cartão está selecionado ("No Pix você paga R$ X" já existe; destacar a diferença em reais). Exige tocar na marcação que a lógica gera.
2. **Indicador de etapas** ("Sacola → Dados e pagamento") — desenhado no canvas; exige a mesma alteração de marcação.
3. **Busca com sugestões** enquanto o cliente digita (marcas e produtos).
4. **Filtros por faixa de preço e por família olfativa** — os dados já existem no catálogo.
5. **Página por produto com endereço próprio**, para compartilhar no WhatsApp e no Instagram.
6. **"Avise-me" e "esgotado"** — dependem de estoque no servidor.
7. **Prova social** (avaliações, fotos de clientes) — depende de material seu.

### 2.3 Localização de produtos

- O menu de categorias e a busca já funcionam; o protótipo os deixou sempre visíveis no desktop.
- No celular, o cabeçalho deixou de ser fixo para liberar tela; a barra da sacola permanece fixa.
- Pendente de decisão: manter 5 categorias ou separar "Perfumes árabes" e "Perfumes de grife" (71 produtos numa só categoria).

---

## 3. Performance e SEO

Medições locais, celular 390 px, sem cache. Não simulam 4G real.

### 3.1 Peso do primeiro carregamento [confirmado]

| | Original (`main`) | Fase 1 | Protótipo Fase 2 |
|---|---|---|---|
| HTML | 6,42 MB | 232 KB | 234 KB |
| CSS | embutido | 28 KB | 49 KB |
| Imagens | embutidas | 2,41 MB | 2,47 MB |
| Scripts | embutidos | 130 KB | 132 KB |
| Fontes | embutidas | 121 KB | 107 KB |
| **Total** | **6,42 MB** | **2,92 MB** | **3,00 MB** |
| Requisições | 1 | 104 | 107 |

O redesign acrescenta 21 KB de CSS e não piora o carregamento.

### 3.2 Problemas encontrados [confirmado]

| Problema | Impacto | Correção |
|---|---|---|
| 2,4 MB de imagens no primeiro acesso | Alto | Versões de 320 px para cards no celular (originais preservados) |
| 247 imagens sem largura e altura declaradas | Médio (a página "pula" ao carregar) | Declarar 640×800 nos cards |
| Logotipo de 640 px e 73 KB exibido em 60 px | Baixo | Versão de 128 px |
| Sem ícone de aba (favicon) | Baixo | Gerar a partir do logotipo |
| Sem imagem e título para compartilhamento (Open Graph) | Alto para WhatsApp e Instagram | Adicionar metadados |
| Sem dados estruturados de produto | Alto para o Google | JSON-LD de loja e produtos |
| Sem endereço canônico, sitemap e robots | Médio | Adicionar |
| Produtos sem endereço próprio | Alto | Páginas individuais (fase seguinte) |
| 228 títulos de nível 4 (um por card clonado) | Baixo | Aceitável; revisar com as páginas de produto |
| Título da página "CP Imports · Catálogo" | Médio | Definir com a decisão de marca |

### 3.3 Acessibilidade [confirmado]

- Sem imagem sem texto alternativo, sem botão ou link sem nome, sem campo sem rótulo.
- Idioma declarado (`pt-BR`); cabeçalho, navegação, conteúdo principal e rodapé marcados.
- No protótipo, todos os controles do celular têm pelo menos 44 px (teste P9).
- Foco visível em esmeralda; animações desligam quando o aparelho pede menos movimento.
- **Não verificado**: contraste medido por ferramenta e uso com leitor de tela real.

### 3.4 Responsividade [confirmado]

Protótipo testado em 1440, 1024, 390 e 320 px: sem rolagem lateral; painel do produto e sacola dentro da tela (teste P8).

---

## 4. Segurança

Nenhuma credencial, pagamento ou configuração externa foi alterada.

| # | Achado | Gravidade | Situação |
|---|---|---|---|
| 1 | Link "Ver comprovante" aceita endereço `javascript:` vindo da URL | Média | Aberto; correção proposta e aguardando autorização |
| 2 | Senha do painel vai no endereço (`?painel&k=`) e fica salva sem proteção no celular | Média | Aberto; exige mudança no Apps Script |
| 3 | Mesmo endereço do Apps Script para a API pública e o painel | Média | Aberto; exige mudança no Apps Script |
| 4 | Envios `create`, `coupon` e `confirm` sem proteção visível contra abuso | Média | [pendente] — só o `Code.gs` mostra se o servidor se protege |
| 5 | Tela "Pagamento recebido!" aparece só com parâmetros do endereço | Baixa | É apenas visual; o status real vem do servidor |
| 6 | Sem política de segurança de conteúdo (CSP) | Baixa | Recomendado na publicação |
| 7 | Chave Pix, nome e cidade do titular e dois telefones são públicos | Informativo | Necessários ao funcionamento |
| 8 | Endereço do Apps Script público no código | Informativo | Inevitável numa loja estática; a proteção tem de estar no servidor |

- Varredura por senhas, tokens e chaves nos arquivos da loja e do protótipo: **nada encontrado**.
- O protótipo **não cria pedidos reais**: `simulacao.js` responde no lugar do servidor e o pagamento leva a uma página local de simulação. O achado 1 continua presente no protótipo, porque a lógica original é usada sem alteração.

---

## 5. Testes

| Bateria | Onde | Resultado |
|---|---|---|
| T1–T15 (loja Fase 1 × original) | `qa/executar.js` → `qa/relatorio/` | 14 aprovados, 1 informativo (última execução; não repetida) |
| P1–P10 (protótipo × original, desktop e celular) | `qa/prototipo-fase2/testar.js` → `qa/prototipo-fase2/relatorio/` | 10 aprovados |

O que a bateria do protótipo garante: mesmos 157 produtos, preços, selos, parcelas e imagens; mesmos resultados de filtros, busca e vitrines; mesma sacola; **mesmo conteúdo enviado ao servidor** nos 16 cenários de checkout; mesmo retorno de pagamento; layout sem estouro em quatro larguras; áreas de toque de 44 px.

O que nenhuma bateria cobre: o comportamento real do Apps Script e da InfinitePay.

---

## 6. Plano de implementação

Esforço: P = até 1 sessão curta · M = 1 sessão · G = 2 ou mais sessões.

### 6.1 Ordem recomendada

| # | Etapa | Depende de | Esforço | Exige sua aprovação |
|---|---|---|---|---|
| 1 | Aprovar o protótipo (ajustes visuais) | — | P | Sim |
| 2 | Decidir a marca nos textos: "CP Imports" ou "CP Importados" | — | P | Sim |
| 3 | Levar o redesign para a loja na branch de trabalho: `premium.css` incorporado a `assets/estilo.css`; cabeçalho, banners, garantias e rodapé no `index.html` | 1 | M | Sim (commit) |
| 4 | Ajustes que tocam a marcação gerada pela lógica: etapas no checkout, economia do Pix, textos de marca | 2, 3 | M | Sim |
| 5 | Correção do link do comprovante | — | P | Sim (toca o retorno do pagamento) |
| 6 | Imagens: largura e altura declaradas, versões menores, favicon | 3 | M | Sim (cria arquivos novos; originais ficam) |
| 7 | Metadados de compartilhamento, dados estruturados, sitemap | 2, 3 | P | Não (dentro da branch) |
| 8 | Ferramenta de atualização do catálogo com travas | Saber como o catálogo é gerado | M | Sim |
| 9 | Páginas individuais de produto | 3, 8 | G | Sim |
| 10 | Prévia em hospedagem real e pedido real de teste | 3–7 | P | Sim |
| 11 | Publicação na `main` | 10 | P | Sim |
| 12 | Catálogo dinâmico, estoque e painel | Fontes do Apps Script | G | Sim |

### 6.2 O que pode andar em paralelo

- 5 (comprovante) e 7 (metadados) não dependem do visual.
- 6 (imagens) pode correr junto com 4.
- 8 (ferramenta do catálogo) só depende de informação sua.

### 6.3 Pendências que só você resolve

1. Como o `index.html` é gerado hoje e onde está esse gerador.
2. Fontes do Apps Script (`Code.gs`, `Painel.html`, `PainelEstoque.html` e demais).
3. Domínio dos comprovantes da InfinitePay.
4. Onde o servidor guarda produtos e preços.
5. Códigos oficiais das cores e logotipo em alta resolução.
6. Nome da marca nos textos.
