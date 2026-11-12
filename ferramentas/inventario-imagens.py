#!/usr/bin/env python3
"""Gera docs/fase2/inventario-imagens.csv: um registro por produto (inclusive o item de teste, marcado à parte).
Somente leitura do catálogo e das imagens. As colunas de origem/licença começam como 'a confirmar' e só mudam com prova de procedência."""
import csv, json, re, subprocess, os, sys
from PIL import Image
raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
js = open(os.path.join(raiz, "dados/catalogo.js"), encoding="utf8").read()
dados = json.loads(subprocess.run(["node", "-e", 'const vm=require("vm");const D=vm.runInNewContext(require("fs").readFileSync(process.argv[1],"utf8")+"\\n;DATA",Object.create(null));console.log(JSON.stringify(D.products.map(p=>({i:p.i,brand:p.brand,cat:p.cat,name:p.name,spec:p.spec,price:p.price,old:p.old||"",test:!!p.test}))))', os.path.join(raiz, "dados/catalogo.js")], capture_output=True, text=True, check=True).stdout)
campos = ["posicao", "tipo", "categoria", "marca", "produto", "especificacao", "preco_atual", "arquivo_atual", "largura_px", "altura_px", "kb", "origem_atual", "fonte_candidata_url", "licenca_uso_comercial", "arquivo_candidato", "situacao"]
with open(os.path.join(raiz, "docs/fase2/inventario-imagens.csv"), "w", newline="", encoding="utf-8-sig") as f:
    w = csv.DictWriter(f, campos, delimiter=";"); w.writeheader()
    for p in dados:
        arq = f"img/produtos/{p['i']:03d}.webp"; a = os.path.join(raiz, arq)
        if os.path.exists(a):
            im = Image.open(a); wd, ht = im.size; kb = round(os.path.getsize(a) / 1024)
        else: wd = ht = kb = ""; arq = "(sem arquivo)"
        w.writerow({"posicao": p["i"], "tipo": "ITEM DE TESTE - não vender, não excluir sem autorização" if p["test"] else "produto comercial", "categoria": p["cat"], "marca": p["brand"], "produto": p["name"], "especificacao": p["spec"], "preco_atual": p["price"], "arquivo_atual": arq, "largura_px": wd, "altura_px": ht, "kb": kb, "origem_atual": "foto original do catálogo (proprietário)", "fonte_candidata_url": "", "licenca_uso_comercial": "a confirmar", "arquivo_candidato": "", "situacao": "mantida (original preservada)"})
print(len(dados), "registros")
