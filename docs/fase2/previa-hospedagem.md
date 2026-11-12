# Prévia em hospedagem real

Branch `claude/sharp-davinci-n31ccy`. A `main`, o GitHub Pages de produção e o domínio não foram tocados.

## Situação

**Não foi possível gerar uma URL pública a partir desta sessão.** Ela não alcança nenhum host externo (nem `github.io`,
`pages.dev`, `netlify.app` ou `vercel.app`) e a API de configuração do GitHub Pages é bloqueada. Publicar numa hospedagem
exige uma conta e uma autorização suas. O que foi feito no lugar, sem rede externa:

1. **Prévia local que se comporta como hospedagem real** (`qa/hospedagem/servidor-pages.js`), aberta pelo painel de prévia do
   app: compressão gzip, cache, revalidação (304), redirecionamento de pastas, página 404 com status 404, diferenciação de
   maiúsculas e minúsculas e o arquivo `_headers` aplicado como Cloudflare e Netlify (valores repetidos são somados).
2. **Verificação completa** (`qa/hospedagem/verificar.js`): 6 de 6 aprovados.
3. **Tudo pronto para a prévia pública**: `_headers`, `ferramentas/montar-site.js` (monta `dist/`) e comando de build testado.

## Alternativas de hospedagem para a prévia

| Opção | URL independente da produção? | O que exige | Observações |
|---|---|---|---|
| Apontar o GitHub Pages deste repositório para esta branch | **Não**: troca o site em produção | — | descartada |
| **Cloudflare Pages** (recomendada) | Sim: `https://<projeto>.pages.dev` | conta gratuita e autorizar o app da Cloudflare neste repositório | cabeçalhos de segurança (CSP), cache de um ano para arquivos versionados, compressão Brotli, atualização a cada push, reversão com um clique, domínio próprio depois |
| Netlify | Sim: `https://<projeto>.netlify.app` | conta gratuita e autorizar o app da Netlify | equivalente; o `_headers` funciona igual |
| Segundo repositório com GitHub Pages | Sim: `https://carlospedroimportados.github.io/<repositorio>/` | você cria um repositório público vazio, autoriza o app Claude nele e autoriza o envio | sem conta nova; **sem** CSP e sem cache longo (o GitHub Pages ignora `_headers`) |
| Envio manual do seu computador (`wrangler` ou `netlify deploy`) | Sim | só o seu login; nenhum app no GitHub | você roda o comando; nada de credencial passa por aqui |

Recomendo a Cloudflare Pages: é a que permite ensaiar a configuração de segurança que a produção definitiva deveria ter.

## O que você precisa autorizar ou fazer (Cloudflare Pages)

Nada é alterado no GitHub Pages, na `main` ou no domínio. A Cloudflare apenas **lê** o repositório.

1. Criar uma conta gratuita na Cloudflare.
2. Em **Workers e Pages → Criar → Pages → Conectar ao Git**, autorizar o app da Cloudflare no GitHub **somente para o repositório
   `carlospedroimportados/catalogo`**.
3. Configurar o projeto (nome sugerido: `cp-importados-previa`):
   - **Branch de produção:** `claude/sharp-davinci-n31ccy` (assim o endereço do projeto serve esta branch, e não a `main`)
   - **Comando de build:** `node ferramentas/gerar-paginas.js && node ferramentas/aplicar-redesign.js && node ferramentas/montar-site.js`
   - **Pasta de saída:** `dist`
   - **Variáveis:** `CP_SITE` = `https://cp-importados-previa.pages.dev/` e `NODE_VERSION` = `22`
4. Salvar e implantar. O endereço será `https://cp-importados-previa.pages.dev/` e se atualiza a cada push na branch.

Esse comando de build usa só Node (sem Python nem dependências) e foi testado aqui (`qa/hospedagem/verificar-raiz.js`): 157 páginas,
página 404 estilizada na raiz do domínio, endereço canônico e sitemap com o endereço novo, nenhuma citação ao GitHub Pages.

Se preferir o **segundo repositório**, a autorização necessária é: criar o repositório público, dar acesso ao app Claude e autorizar
expressamente o envio do conteúdo de `dist/` (construído com `CP_SITE` apontando para o novo endereço) para ele.

## Resultados (simulados, sem rede externa)

| Teste | O que verifica | Resultado |
|---|---|---|
| H1 | gzip, cache, 304, redirecionamento, 404 com status 404, maiúsculas e minúsculas | ✅ |
| H2 | 158 páginas rastreadas e **813 arquivos** distintos conferidos (todos 200); títulos únicos, descrições, canônico, imagem de compartilhamento, um título de nível 1, dados estruturados | ✅ |
| H3 | `_headers`: CSP, nosniff, Referrer-Policy, moldura do painel, cache imutável de um ano nos arquivos versionados, sem valores somados em conflito | ✅ |
| H4 | jornada com cliques reais em desktop e celular, sob a CSP: busca, categoria, marca, ordenação, painel, página do produto, sacola, checkout com cupom, cartão e Pix, pedido, retorno do pagamento e 404 | ✅ 0 violações de CSP, 0 erros, 0 requisições externas |
| H5 | Pix com servidor fora do ar: QR Code, código selecionado ao focar (liberado por hash), WhatsApp com "CP Importados" | ✅ |
| H6 | desempenho em rede lenta, comparando original, Fase 1 e atual | ✅ |

O conjunto `dist/` (668 arquivos, 12,3 MB, sem testes, documentação nem `instagram/`) passa sozinho em H1 a H5.

### Desempenho (laboratório: rede e CPU emuladas, servidor local)

Celular em 4G lento (1,6 Mbps, 150 ms, CPU 4× mais lenta):

| Versão | 1ª visita | Maior elemento (LCP) | Layout (CLS) | Baixado | Requisições | Visita repetida |
|---|---|---|---|---|---|---|
| Loja original | **25,6 s** | 1,5 s | 0,002 | 7.059 KB | 93 | 1,4 s |
| Fase 1 | 13,6 s | 7,8 s | 0,001 | 2.532 KB | 98 | 0,5 s |
| **Loja atual** | **2,5 s** | 1,1 s | 0 | **423 KB** | 30 | 0,9 s |
| Página de produto | 1,9 s | 0,9 s | 0,001 | 299 KB | 20 | 0,2 s |

Desktop em banda larga (10 Mbps): original 4,4 s e 7.107 KB; atual 0,5 s e 409 KB. Valores de laboratório, que servem para comparar
versões; não substituem Lighthouse nem PageSpeed na hospedagem final.

## Problemas encontrados

| # | Problema | Gravidade | Situação |
|---|---|---|---|
| 1 | Deslocamento de layout de 0,057 no desktop: o texto do banner mudava de 4 para 3 linhas quando a fonte itálica chegava | Média | **Corrigido** (fontes pré-carregadas; CLS 0) |
| 2 | Política de segurança rígida bloquearia o `onfocus="this.select()"` do Pix offline | Média | **Corrigido** (liberado só esse trecho, por hash) |
| 3 | Primeira versão do `_headers` repetia cabeçalhos em regras sobrepostas; Cloudflare e Netlify somam os valores (cache e CSP ficariam conflitantes e o painel perderia a moldura do Apps Script) | Alta | **Corrigido** antes de qualquer uso |
| 4 | A página 404 usa caminhos absolutos de `/catalogo/`; na raiz de um domínio ficaria sem estilo | Média | **Corrigido** (`CP_SITE`; testado) |
| 5 | **Pedido real feito pela prévia:** a loja envia ao Apps Script o endereço da própria página como endereço de retorno (apenas em HTTPS), então a InfinitePay devolveria o cliente à prévia, e o servidor pode ou não aceitar essa origem | Alta | **Aberto.** Não fazer compra real pela prévia sem conferir o `Code.gs` |
| 6 | Não existe `robots.txt`; num site em subpasta do GitHub Pages ele não seria lido, mas na raiz de um domínio própria faria diferença | Baixa | Aberto; criar ao definir o domínio definitivo. Prévias da Cloudflare são marcadas como não indexáveis, segundo a documentação da hospedagem (conferir) |
| 7 | Endereço canônico, sitemap e imagens de compartilhamento citam o endereço atual do GitHub Pages (as páginas novas ainda não existem lá) | Informativo | Esperado até a publicação; troque com `CP_SITE` ao mudar de endereço |
| 8 | Sacola, nome e telefone salvos ficam por endereço (cada origem tem o seu armazenamento): quem testar na prévia não verá a sacola da loja atual | Informativo | Esperado |
| 9 | Arquivos de teste da medição anterior que desativavam o cache davam "visita repetida" igual à primeira | Baixa | **Corrigido no teste** (não afetava a loja) |

## O que a simulação não cobre

- Rede real, HTTP/2 e HTTP/3, Brotli (as hospedagens reais comprimem melhor que gzip) e a latência da hospedagem.
- Apps Script e InfinitePay reais (respostas simuladas), inclusive se o servidor aceita a origem da prévia.
- Aparelhos físicos, leitor de tela, PageSpeed/Lighthouse e indexação do Google.
- Limites e recursos da Cloudflare Pages citados aqui vêm da documentação pública da hospedagem: conferir no painel ao criar o projeto.

## Reproduzir

```bash
node qa/hospedagem/servidor-pages.js --modo cdn
```

```bash
node qa/hospedagem/verificar.js
```

```bash
node qa/hospedagem/verificar.js --site dist --sem-desempenho
```

```bash
node qa/hospedagem/verificar-raiz.js https://cp-importados-previa.pages.dev/
```

Relatórios em `qa/hospedagem/relatorio/` (completo e do `dist/`) e capturas da jornada em `qa/hospedagem/capturas/`.
