# Piloto visual — relatório (somente visual; sem commit)

## Fontes das imagens utilizadas
Nesta rodada **todas as imagens são as fotos que já estão no catálogo da CP Importados** (`img/produtos/NNN.webp`, 640×800 px).
Nenhuma foto externa foi baixada: a liberação de rede para lojas de terceiros não foi aprovada no app e o site da medicube bloqueia
robôs de IA no `robots.txt`. Portanto, **as fotos novas (item 1 do briefing) estão PENDENTES**. Arquivos originais intactos.

| Uso | Arquivos de origem |
|---|---|
| 14 painéis Medicube (processadas/) | img/produtos/051–057, 074–077, 151–153 (10 recortadas; 52, 151, 152, 153 ficam "inteiras" e precisam de foto nova) |
| Banner A (perfumaria) | img/produtos/010 (Good Girl Very Good Girl), 032 (Invictus Parfum) |
| Banner B (skincare) | img/produtos/053 (AGE-R Cream), 056 (Deep Vita C Serum) |
| Banner C (institucional) | img/produtos/009 (Good Girl), 000 (Club de Nuit Woman) |

## Arquivos criados (todos novos, em docs/fase2/piloto-visual/, sem commit)
gerar-fotos.py, processadas/051–153.webp (14 painéis 960×1200), processadas.csv, fotos-antes-depois.png,
banners-responsivos.css, banners.html (versão fixa antiga), banner-{A,B,C}-{desktop,tablet,celular}.png,
previa-home-{desktop,tablet,celular}-{1..5}.png, piloto-pagina-produto.css, pagina-{057,053}-{mobile,desktop}-{antes,depois}.png,
comparativo-pagina-{057,053}-{mobile,desktop}.png, este relatório.
Também criados antes (já enviados ao GitHub): docs/fase2/inventario-imagens.csv e ferramentas/inventario-imagens.py.

## Arquivos modificados
Nenhum. A loja (index.html, assets/, produto/, dados/, img/, admin/) está intacta.

## Pendências / decisões
- Fotos novas: precisam de rede liberada (claude.ai no computador) e de imagens limpas; não removo marca d'água/logotipo de terceiros.
- Textos da loja que contradizem "sob encomenda e vendas locais": barra superior "Envio para todo o Brasil" e bloco "Pagamento/Envio"
  (a prévia da home os troca por "Sob encomenda"; na loja real continuam até você aprovar).
- Fotos #151, #152, #153 trazem preço escrito na imagem; #52 traz selo; precisam de foto nova.

## Processo para fotos candidatas (preparar-candidatas.py)
Colocar as imagens em `candidatas/` e preencher `candidatas/candidatas.csv` (posicao;arquivo;site_origem;url_origem;licenca).
`python3 docs/fase2/piloto-visual/preparar-candidatas.py` gera `finais/NNN.webp` (painel 4:5 premium), `relatorio-candidatas.csv`
(produto, imagem, site, resolução, licença, arquivo final, observações) e `comparativo-candidatas.png`.
Fundo claro e uniforme -> tratado; fundo não uniforme, resolução < 1000 px ou texto/marca de terceiros -> sinalizado para revisão. Não remove marca d'água.
