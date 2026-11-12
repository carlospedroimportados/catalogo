# Verificação da prévia (Cloudflare Pages simulada)

- 2026-11-12T12:40:48.385Z · commit `fc0cb92` · endereço público simulado: https://cp-importados-previa.pages.dev/
- Construção limpa só com Node, servida na raiz de um domínio com o `_headers`. Pedidos e pagamentos **desativados**; nenhuma chamada ao Apps Script.

| Teste | Status | Descrição |
|---|---|---|
| V1 | ✅ PASSOU | Construção limpa como a Cloudflare faria: limites da hospedagem e marcas do modo prévia |
| V2 | ✅ PASSOU | Site servido na raiz de um domínio: 157 páginas, todos os arquivos, 404 e cabeçalhos |
| V3 | ✅ PASSOU | Jornada na prévia (pedidos desativados), desktop e celular, sob a CSP: nada chega ao Apps Script e o checkout usa WhatsApp / Pix local |

## V1 — Construção limpa como a Cloudflare faria: limites da hospedagem e marcas do modo prévia

**✅ PASSOU**

- commit fc0cb92 extraído limpo e construído só com Node (sem Python): 668 arquivos, 12.3 MB, maior arquivo 272 KB, 11 regras e linha máxima de 370 caracteres no _headers
- modo prévia: pedidos desativados (api vazio, endereço do Apps Script ausente do dist/), aviso e noindex na página inicial e nas 156 páginas de produto, canônico e sitemap em https://cp-importados-previa.pages.dev/

## V2 — Site servido na raiz de um domínio: 157 páginas, todos os arquivos, 404 e cabeçalhos

**✅ PASSOU**

- 157 páginas e 807 arquivos internos conferidos na raiz do domínio (todos 200) · 404 estilizada com caminhos absolutos · CSP e proteção contra moldura aplicadas

## V3 — Jornada na prévia (pedidos desativados), desktop e celular, sob a CSP: nada chega ao Apps Script e o checkout usa WhatsApp / Pix local

**✅ PASSOU**

- desktop: aviso da prévia e noindex · busca, categoria, painel, página do produto, sacola · checkout sem cupom e com aviso de WhatsApp · Pix local com CRC válido e valor R$ 328,00 (2 unidades) · cartão com atendimento por WhatsApp · chamadas ao Apps Script: 0 · requisições externas: 0 · erros: 0
- celular: aviso da prévia e noindex · busca, categoria, painel, página do produto, sacola · checkout sem cupom e com aviso de WhatsApp · Pix local com CRC válido e valor R$ 328,00 (2 unidades) · cartão com atendimento por WhatsApp · chamadas ao Apps Script: 0 · requisições externas: 0 · erros: 0
