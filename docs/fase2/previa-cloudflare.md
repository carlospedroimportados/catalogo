# Prévia na Cloudflare Pages — instruções objetivas

Objetivo: uma URL temporária (`https://<projeto>.pages.dev/`) para avaliar a loja no celular e no computador, **sem tocar na produção** (GitHub Pages, branch `main`, Apps Script).

## O que a prévia é
- Loja completa: design premium, catálogo (157 produtos), páginas individuais, sacola e checkout.
- **Pedidos e pagamentos desativados**: o servidor de pedidos fica desligado no `dist/` (nada é enviado ao Apps Script). O checkout gera o Pix local e as mensagens de WhatsApp; cartão segue por atendimento. Faixa fixa avisa: "Prévia da loja · pedidos e pagamentos desativados · nada é cobrado".
- Fora do Google: `noindex,nofollow` em todas as páginas.
- Sem credenciais: nada secreto entra no build.

## ANTES de conectar: autorize o push
A branch no GitHub (`faf791f`) ainda **não tem o modo prévia**; se a Cloudflare construir dela, os pedidos ficariam LIGADOS no servidor real. Autorize o push dos novos commits para `claude/sharp-davinci-n31ccy` primeiro.

## Passo a passo (você faz na sua conta)
1. Crie/entre na conta em https://dash.cloudflare.com (gratuita).
2. **Workers & Pages → Create → Pages → Connect to Git**. Autorize o app da Cloudflare **somente no repositório `carlospedroimportados/catalogo`** (acesso de leitura).
3. Nome do projeto: `cp-importados-previa` (a URL será `https://cp-importados-previa.pages.dev/`; se o nome estiver ocupado, a Cloudflare muda o endereço — então ajuste `CP_SITE` abaixo para o endereço exato).
4. **Production branch**: `claude/sharp-davinci-n31ccy` (a `main` não é usada; o GitHub Pages continua intocado).
5. Build:
   - Framework preset: **None**
   - Build command: `node ferramentas/gerar-paginas.js && node ferramentas/aplicar-redesign.js && node ferramentas/montar-site.js`
   - Build output directory: `dist`
6. Variáveis de ambiente (Production):
   - `CP_SITE` = `https://cp-importados-previa.pages.dev/` (com a barra final)
   - `CP_PREVIA` = `1`
   - `NODE_VERSION` = `22`
   - **Não** defina `CP_API`. (`CP_API=real` religa o servidor real: só use se quiser um teste ponta a ponta combinado conosco.)
7. **Save and Deploy**. Ao terminar, abra a URL.

## Recomendado: proteger o acesso
Em **Settings → General → Access Policy** (Cloudflare Access), restrinja a prévia ao seu e-mail. Mesmo com `noindex`, isso impede que terceiros vejam a loja antes do lançamento.

## Alternativa manual (sem conectar o GitHub)
Na sua máquina, com Node: `CP_SITE=https://cp-importados-previa.pages.dev/ CP_PREVIA=1 node ferramentas/gerar-paginas.js && node ferramentas/aplicar-redesign.js && node ferramentas/montar-site.js` (com as mesmas variáveis exportadas) e depois `npx wrangler pages deploy dist --project-name cp-importados-previa`. Sempre com `CP_PREVIA=1`.

## Checklist no celular e no computador
- Faixa de prévia visível; nenhuma cobrança possível.
- Início, busca, categorias, painel do produto, "ver página do produto".
- URL direta de um produto (`/produto/<nome>/`), compartilhando no WhatsApp.
- Sacola → finalizar: sem campo de cupom; Pix local mostra QR/código e botões de WhatsApp "CP Importados".
- Endereço inexistente mostra a página 404 da loja.
- Rolagem e carregamento fluidos em 4G.
**Não pague o Pix gerado**: ele é real (chave do titular).

## O que foi verificado (`qa/hospedagem/verificar-previa.js`, sem alterar o repositório)
- V1: commit extraído limpo e construído só com Node (668 arquivos, 12,3 MB, maior arquivo 272 KB; limites da Cloudflare: 20.000 arquivos / 25 MiB; `_headers` com 11 regras). Pedidos desativados, endereço do Apps Script ausente do `dist/`, aviso e noindex na inicial e nas 156 páginas de produto, canônico e sitemap no endereço da prévia, nenhuma menção ao GitHub Pages; modo `CP_API=real` mantém o servidor.
- V2: 157 páginas e 807 arquivos internos respondem 200 na raiz do domínio; 404 estilizada; CSP e proteção de moldura aplicadas.
- V3: jornada real (cliques) em desktop e celular sob a CSP: 0 chamadas ao Apps Script, 0 requisições externas, 0 erros; Pix local com CRC e valor corretos.
- Relatório: `qa/hospedagem/relatorio/resultado-previa.md`; capturas: `qa/hospedagem/capturas-previa/`.

## Limites conhecidos
- Não testado: aparelho real, PageSpeed público, a Cloudflare de verdade (só emulada), e pedido real ponta a ponta (exige o servidor ligado e acompanhamento seu).
- Se o endereço da prévia diferir de `CP_SITE`, canônico/sitemap/compartilhamentos apontarão para o endereço errado (não afeta o uso).
