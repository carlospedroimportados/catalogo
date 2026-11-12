# QA — Bateria de testes T1–T15 (Fases 0 e 1)

Bateria independente que compara a **loja publicada** (referência) com uma **versão candidata**, sem tocar na loja,
no painel administrativo, no Google Apps Script, nas planilhas ou nos pagamentos.

## Como executar

```bash
node qa/executar.js
```

- **Referência**: o `index.html` do commit publicado (`89ef168`), extraído do git para `qa/.trabalho/` — o arquivo
  original não é lido para escrita nem alterado.
- **Candidato**: por padrão a raiz do repositório. Para validar outra pasta (ex.: a futura Fase 1):
  `node qa/executar.js --candidato <pasta>`.
- `--ref <commit>` troca a referência; `--gravar-manifesto` regrava `qa/referencia/manifesto.json`
  (impressões digitais SHA-256 de cada produto, imagem e configuração — sem copiar dados comerciais).
- Requisitos: Node 18+ e Playwright com Chromium (já disponíveis no ambiente). Nenhuma dependência é instalada.
- Saídas: `qa/relatorio/resultado.md`, `qa/relatorio/resultado.json` e `qa/relatorio/capturas/*.png`.
- Código de saída: `0` se nada falhou, `1` se algum teste falhou.

## Versão separada (Fase 1)

`ferramentas/separar-index.js` gera a versão separada a partir do `index.html` original do commit publicado,
sem alterar nenhum byte de conteúdo. `qa/lib/montar.js` faz o caminho inverso, com código independente, e o T15
exige que o resultado seja idêntico ao original. As verificações estáticas (T1–T3) rodam sobre essa remontagem;
as de navegador (T4–T12) rodam sobre os arquivos separados, servidos de verdade.

## Prévia local

`qa/lib/servidor.js` serve as duas versões em `http://127.0.0.1:<porta>/catalogo/`, imitando o caminho do
GitHub Pages. Nada é publicado.

## Isolamento de rede (checkout simulado)

O navegador de testes (`qa/lib/navegador.js`) só acessa `127.0.0.1`:

| Destino | Tratamento |
|---|---|
| `script.google.com` (cupom, criar pedido, confirmar) | **simulado** — a requisição é registrada e respondida localmente; nunca sai da máquina |
| InfinitePay (link de pagamento) | substituído por `pagamento.mock.invalid`, respondido localmente |
| `wa.me` | apenas os links são lidos e conferidos; nunca abertos |
| qualquer outro | bloqueado e contabilizado (o T12 falha se houver algum) |

Nenhum pedido, cupom, pagamento ou mensagem real é criado.

## Testes

| ID | O que garante |
|---|---|
| T1 | 157 itens do catálogo (156 + item de teste), índices `i` contíguos, marcas, contatos e rotinas idênticos |
| T2 | Taxas 1x–12x, parcela mínima, dados Pix, vitrines e endpoint da API idênticos |
| T3 | 170 imagens (157 produtos, 6 banners, 5 categorias, 2 logos) idênticas byte a byte; vínculo produto↔imagem |
| T4 | Cada card: marca, nome, apresentação, preço, preço "de", selos e parcelas × cadastro × referência |
| T5 | Contagem por categoria e por marca; 5 ordenações |
| T6 | 11 buscas (acentos, maiúsculas, inexistente, vazia) devolvem os mesmos produtos |
| T7 | Mais vendidos, ofertas, novidades, rotinas, atalhos e contatos |
| T8 | Tabela de parcelas de todos os produtos e simulador × fórmula × referência |
| T9 | Sacola: adicionar, +/−, recarregar, rotina, limite 99, esvaziar, compatibilidade das chaves `cp3_*` |
| T10 | Checkout simulado em 16 cenários; o corpo enviado ao Apps Script deve ser idêntico |
| T11 | Retorno da InfinitePay: chamada `confirm`, mensagens, limpeza da URL, sacola |
| T12 | Todas as imagens decodificam; detalhe, sacola e rotinas; capturas celular/desktop; zero erros e zero rede externa |
| T13 | Arquivos versionados (incl. `admin/` e `instagram/`) idênticos ao commit publicado |
| T13 | (Fase 1) `main` intacta; alterações apenas em `index.html`, `assets/`, `dados/`, `fonts/`, `img/`, `ferramentas/`, `qa/` |
| T14 | Tamanho do HTML (bruto e gzip) e volume do primeiro carregamento: original × nova versão |
| T15 | Reversibilidade: o `index.html` remontado a partir dos arquivos separados é idêntico byte a byte ao original; nenhum arquivo ausente, órfão ou com `?v=` desatualizado |

## Fase 2 (loja redesenhada)

A bateria T1–T15 valida a Fase 1 contra o original byte a byte. Depois do redesign, o `index.html` muda de
propósito, e a validação da loja passa a ser feita por `qa/prototipo-fase2/testar.js --alvo loja` (P1–P13), que
grava em `qa/relatorio-fase2/`. Os relatórios de `qa/relatorio/` são o registro da Fase 1 e não são regravados.

## Limites conhecidos

- O comportamento **do servidor** (Apps Script) não é testado: as respostas são simuladas com base no contrato
  observado no cliente. A validação do lado servidor depende dos arquivos do Apps Script.
- A versão no ar em `carlospedroimportados.github.io` não é baixada (sem acesso de rede nesta sessão); a integridade
  é comprovada pelo git (T13).
