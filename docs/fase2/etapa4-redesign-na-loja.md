# Fase 2 · Etapa 4 — Redesign premium aplicado à loja

Trabalho na branch `claude/sharp-davinci-n31ccy`. A `main` e o site publicado não foram alterados.

## Bloco 1 — Redesign na loja

- O `index.html` da raiz passou a ser **gerado**: `ferramentas/aplicar-redesign.js` lê o `index.html` da Fase 1 no git
  (commit `8954947`) e aplica a transformação de `ferramentas/redesign.js`.
- A transformação troca só a moldura: faixa de avisos, cabeçalho com a marca, quatro banners de campanha, faixa de
  garantias e rodapé. Acrescenta atalho de teclado, dimensões nas imagens, fontes pré-carregadas e ícone da aba.
- A camada visual (`premium.css`) e os scripts de apresentação (`efeitos.js`, `navegacao.js`) foram para `assets/`.
  O protótipo usa os mesmos arquivos.
- **Não alterados** (conferidos byte a byte contra a Fase 1, teste P7): `dados/catalogo.js`, `assets/config.js`,
  `assets/app.js`, `assets/qrcode.js`, `assets/estilo.css`, `img/`, `fonts/`, `admin/`, `instagram/`.

## Bloco 2 — Páginas de produto e SEO técnico

- `ferramentas/gerar-paginas.js` gera **156 páginas** em `produto/<endereço>/`, uma por produto (o item de teste não
  gera página), além de `dados/paginas.js` (mapa de endereços) e `sitemap.xml`.
- Cada página tem: título e descrição próprios, endereço canônico, imagem e preço para compartilhamento, dados
  estruturados de produto e de trilha, foto original, preço, Pix, parcelas, quantidade, notas ou ativos e relacionados.
- As páginas usam a **mesma sacola** da loja. "Comprar agora" coloca o produto na sacola e abre a sacola na página
  inicial, onde está o único checkout. Nenhuma página envia dados a servidor.
- Preço e parcelas da página são recalculados no navegador a partir do catálogo carregado, com as mesmas fórmulas da loja.
- A página inicial ganhou: metadados de compartilhamento, dados estruturados da loja, chegada por `?cat=` e `?busca=`,
  abertura da sacola por `#sacola` e, no painel do produto, o atalho "Abrir página do produto".
- O painel do produto continua sendo o caminho principal de compra, como combinado.

## Como reconstruir

```bash
node ferramentas/construir.js
```

Voltar a página inicial à Fase 1, se necessário:

```bash
git checkout 8954947 -- index.html
```

## Testes

| Bateria | Comando | Resultado |
|---|---|---|
| Loja redesenhada | `node qa/prototipo-fase2/testar.js --alvo loja` | 13 de 13 aprovados (`qa/relatorio-fase2/`) |
| Protótipo | `node qa/prototipo-fase2/testar.js` | 12 de 12 aprovados |

- P1–P6: dados, filtros, parcelas, sacola, 16 cenários de checkout e retorno do pagamento idênticos à loja publicada.
- P7: arquivos comerciais e de lógica idênticos à Fase 1.
- P8–P12: layout em cinco larguras, áreas de toque, imagens, contraste e navegação.
- P13: as 156 páginas conferidas contra o catálogo (posição, preço, preço "de", parcelas, imagem, dados estruturados,
  sitemap) e o percurso página → sacola → loja em desktop e celular.

A bateria T1–T15 (`qa/executar.js`) valida a Fase 1 contra o original byte a byte. Ela não se aplica à loja
redesenhada, cujo `index.html` mudou de propósito; a proteção dos dados passou para P1–P7.

## Medições (celular, local, sem cache)

| | Fase 1 | Loja redesenhada |
|---|---|---|
| Endereço canônico, compartilhamento, dados estruturados | não | sim |
| Ícone da aba | não | sim |
| Imagens sem dimensões | 247 | 8 |
| Peso do primeiro carregamento | 2,80 MB | 3,02 MB |

## Pendências

1. **Nome da marca nas mensagens de WhatsApp** — continuam "CP Imports" (texto da lógica, não alterado). As páginas
   de produto repetem esse mesmo texto para ficarem iguais à loja.
2. **Peso das fotos** — 2,4 MB no primeiro acesso; depende de versões menores das imagens.
3. **Etapas no checkout e economia do Pix** — exigem alterar a lógica.
4. **Endereço público** — canônicos e sitemap usam `https://carlospedroimportados.github.io/catalogo/`. Se houver
   domínio próprio, basta trocar a constante `SITE` em `ferramentas/redesign.js` e reconstruir.
5. **`robots.txt`** — não foi criado: num site em subpasta do GitHub Pages ele não é lido pelos buscadores.
6. **Atualização do catálogo** — ao mudar `dados/catalogo.js`, é preciso rodar `construir.js`. O fluxo de upload do
   `index.html` monolítico continua incompatível com esta versão.
7. **Disponibilidade em estoque** — os dados estruturados não declaram estoque, porque a loja não tem essa informação.
8. Correção do link do comprovante e teste real de pedido — registrados à parte.

---

## Bloco 3 — Imagens e velocidade, sacola e checkout, acessibilidade

### Imagens e velocidade

- `ferramentas/otimizar-imagens.py` cria **316 miniaturas novas** em `miniaturas/` (320×400 e 480×600 para cada uma
  das 157 fotos) e dois tamanhos do logotipo (128 e 256 px). **Os originais em `img/` não foram tocados** (teste P7).
- Cada foto é comparada com a redução sem compressão (PSNR). Se ficar abaixo de 34 dB, a qualidade sobe só para essa
  foto (31 precisaram). Pior resultado: 33,6 dB, acima do mínimo de 33 dB; abaixo disso a ferramenta para.
- Cards, banners e logotipo ganharam `srcset`/`sizes`: o navegador escolhe o menor arquivo que serve. O atributo `src`
  continua apontando para o original, porque a lógica da loja lê esse valor (sacola, painel do produto).
- As páginas de produto usam as mesmas miniaturas nos relacionados e no logotipo.

Peso do primeiro carregamento no celular (390 px, local, sem cache):

| | Antes | Depois | Variação |
|---|---|---|---|
| Início, tela 1x · imagens | 2.474 KB | 714 KB | **-71%** |
| Início, tela 2x · imagens | 2.474 KB | 961 KB | **-61%** |
| Início, tela 1x · total | 3.018 KB | 1.291 KB | -57% |
| Início, tela 2x · total | 3.018 KB | 1.539 KB | -49% |
| Início, tela 1x · requisições | 108 | 69 | -36% |
| Início, tela 3x · imagens | 2.349 KB | 2.496 KB | sem ganho |
| Página de produto 1x · imagens | 216 KB | 155 KB | -28% |

Em telas 3x (iPhones Pro e semelhantes) o card de 179 px precisa de 537 px reais, e o navegador volta ao arquivo
original de 640 px: não há ganho nesse caso. Reduzir isso exigiria aceitar imagens levemente menos nítidas.

### Sacola e checkout

- Indicador de etapas ("Etapa 1 de 2" e "Etapa 2 de 2", com barras) acima da sacola e do checkout. É feito por um
  script de apresentação (`assets/navegacao.js`): **a lógica da loja (`assets/app.js`) não foi alterada**. O indicador
  é decorativo (oculto para leitores de tela), não tem texto no documento e some na tela de pedido concluído.
- Textos, valores e envios ao servidor idênticos (P5 continua aprovado).

### Acessibilidade e usabilidade

- Foco preso dentro do painel aberto (sacola ou produto) e devolvido ao botão ou card de origem ao fechar.
  Testado com 80 Tabs/Shift+Tabs na sacola e 40 no painel do produto, em desktop e celular.
- Página `404.html` da marca (noindex, caminhos absolutos), para endereços inexistentes.

### Testes

| Bateria | Resultado |
|---|---|
| Loja (`testar.js --alvo loja`) | **15 de 15** aprovados — P14 (miniaturas e peso) e P15 (etapas e foco) são novos |
| Protótipo (`testar.js`) | **14 de 14** aprovados |

### Arquivos novos ou alterados neste bloco

`miniaturas/` (316 arquivos), `ferramentas/otimizar-imagens.py`, `ferramentas/redesign.js`, `ferramentas/gerar-paginas.js`,
`ferramentas/construir.js`, `assets/navegacao.js`, `assets/premium.css`, `404.html`, `index.html`, `produto/*/index.html`,
`qa/prototipo-fase2/{testar,medir,gerar}.js` e os relatórios e capturas de `qa/relatorio-fase2/`.

### Pendências atualizadas

1. **Mensagens de WhatsApp** ainda dizem "CP Imports" (texto da lógica).
2. **Economia do Pix em reais no checkout** — exige alterar a lógica.
3. **Telas 3x** sem ganho de peso (ver acima).
4. **Miniaturas das fotos da sacola**: a sacola usa o original de 640 px para uma foto de 84 px — exige alterar a lógica.
5. **Leitor de tela real** e rede 4G real não foram testados.
6. **Endereço público e `robots.txt`**: ver pendências do bloco 2.
7. **Atualização do catálogo**: rodar `node ferramentas/construir.js` (cria miniaturas só das fotos novas).
8. Correção do link do comprovante e pedido real de teste, registrados à parte.
