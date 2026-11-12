# Como atualizar o catálogo (produtos, preços e fotos)

O catálogo da loja vem de **um único lugar**: `dados/catalogo.js`. Os cards, as páginas de produto, o sitemap e as
miniaturas são **gerados** a partir dele. Nunca edite `index.html`, `produto/`, `sitemap.xml` ou `miniaturas/` à mão.

> **Atenção — o servidor de pedidos.** O pedido enviado ao Apps Script identifica cada produto pela **posição** (`i`) na
> lista, sem nome nem preço. Um produto novo ou um preço novo precisa existir também no servidor, na mesma posição.
> Esta ferramenta não enxerga o Apps Script: **confira lá antes de publicar**.

## Mudar o preço de um produto

1. Em `dados/catalogo.js`, altere `price` (e `old`, se houver preço "de") do produto.
2. Rode `node ferramentas/construir.js`. A ferramenta avisa "preço alterado na posição N".
3. Confira o mesmo preço no servidor de pedidos.

## Acrescentar um produto

1. Prepare a foto: WebP, **640×800 px**.
2. Salve em `img/produtos/NNN.webp`, onde NNN é a próxima posição com três dígitos (se o último produto é o 156, o novo é `157.webp`).
3. Em `dados/catalogo.js`, acrescente o produto **no fim** de `products`, com `i` igual à próxima posição, `brand` de uma marca
   existente (ou acrescente a marca em `brands`), `cat`, `name`, `spec`, `price`, `old` (ou `null`), `desc` e `info`.
4. Rode `node ferramentas/construir.js`. Ela valida, cria a miniatura que falta e regera cards, páginas e sitemap.
5. Cadastre o produto no servidor de pedidos, na mesma posição.
6. Depois de revisado, registre na trava: `node ferramentas/validar-catalogo.js --registrar`.

## Marcas com "Preço Brasil"

O rótulo "Preço Brasil" acima do preço riscado vale por marca: lista `precoBrasil` em `ferramentas/catalogo.regras.json`
(hoje: alluvi, zapata, licor43, on). Marca nova com esse rótulo exige acrescentar o identificador à lista.

## O que a ferramenta recusa (e por quê)

A construção **para** se houver erro, sem alterar a loja:

| Situação | Motivo |
|---|---|
| Produto reordenado, trocado ou removido | a posição passaria a apontar para outro produto nos pedidos |
| Produto sem foto, foto que não é WebP ou fora de 640×800 | card quebrado ou foto distorcida |
| Preço zerado, negativo ou "de" menor ou igual ao preço | valor incorreto exibido |
| Marca ou categoria inexistente | card sem marca |
| Mais vendidos ou rotinas apontando para produto inexistente | vitrine quebrada |

Produto **não deve ser apagado nem reordenado**. Para tirar um produto de venda, fale com quem mantém o servidor; a
loja hoje não tem campo de estoque ou de "indisponível".

## Conferir antes de publicar

```bash
node qa/prototipo-fase2/testar.js --alvo loja
```

Roda 18 testes (dados, preços, parcelas, sacola, checkout, páginas, miniaturas, cliques reais) e o ensaio de atualização.
O resultado fica em `qa/relatorio-fase2/resultado.md`.

## Ensaio do processo (sem tocar no catálogo real)

```bash
node qa/prototipo-fase2/atualizacao.js
```

Faz tudo isso numa cópia descartável: altera um preço, acrescenta um produto fictício e confere que só o esperado muda;
em seguida tenta 11 violações e confere que todas são recusadas. O repositório real não é alterado.

## Se algo der errado

Cada atualização deve ir num commit próprio: desfazer o commit restaura o catálogo anterior. Para voltar a loja inteira ao
estado da Fase 1: `git checkout 8954947 -- index.html` (os outros arquivos da Fase 1 continuam no lugar).

## Limites

- Não há validação do lado do servidor (Apps Script) nem do estoque.
- O upload manual do `index.html` antigo pelo site do GitHub **desfaz** tudo isto: não envie esse arquivo.
- Fotos novas com outro formato ou tamanho precisam ser convertidas antes (a ferramenta recusa, não converte).
