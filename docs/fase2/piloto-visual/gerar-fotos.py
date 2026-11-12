#!/usr/bin/env python3
"""Piloto do padrão fotográfico premium (NÃO altera nenhuma foto do catálogo; lê img/produtos e grava só aqui, em processadas/).
Para cada foto: recorta o cartão do produto (quando a foto é um criativo com fundo desfocado) e o assenta num painel 4:5 marfim,
com sombra suave, cantos arredondados e fio dourado. Fotos com texto/preço dentro da imagem ficam inteiras e são sinalizadas."""
import numpy as np, csv, os
from PIL import Image, ImageDraw, ImageFilter
raiz = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
os.chdir(raiz)
W, H = 960, 1200
INTEIRAS = {52: "tem selo promocional dentro da imagem", 151: "tem o PREÇO escrito dentro da imagem", 152: "tem o PREÇO escrito dentro da imagem", 153: "tem PREÇO e logotipo escritos dentro da imagem"}
def caixa(im):
    g = np.asarray(im.convert("L").filter(ImageFilter.GaussianBlur(1)), dtype=np.float32)
    e = (np.abs(np.diff(g, axis=0))[:, :-1] + np.abs(np.diff(g, axis=1))[:-1, :]); h, w = e.shape; b = 8
    m = e[:h // b * b, :w // b * b].reshape(h // b, b, w // b, b).mean(axis=(1, 3)); ys, xs = np.where(m > max(3.0, m.mean() * 0.9))
    x0, x1 = np.percentile(xs, [2, 98]) * b; y0, y1 = np.percentile(ys, [2, 98]) * b
    return int(x0) + 8, int(y0) + 8, int(x1) - 4, int(y1) - 4  # um pouco para dentro: some o borrado das bordas
def arredonda(im, r):
    m = Image.new("L", im.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, im.size[0] - 1, im.size[1] - 1), r, fill=255); im = im.convert("RGBA"); im.putalpha(m); return im
def painel(foto, inteira):
    base = Image.new("RGB", (W, H)); px = base.load()
    top, bot = np.array([251, 248, 241]), np.array([234, 228, 214])
    for y in range(H):
        t = y / (H - 1); c = tuple(int(v) for v in top * (1 - t) + bot * t)
        for x in range(0, W): px[x, y] = c
    base = base.convert("RGBA")
    if inteira: alvo = (int(W * 0.88), int(H * 0.88))
    else: alvo = (int(W * 0.90), int(H * 0.72))
    s = min(alvo[0] / foto.width, alvo[1] / foto.height); f = foto.resize((int(foto.width * s), int(foto.height * s)), Image.LANCZOS)
    f = arredonda(f, 26); x, y = (W - f.width) // 2, (H - f.height) // 2
    sombra = Image.new("RGBA", (W, H), (0, 0, 0, 0)); ImageDraw.Draw(sombra).rounded_rectangle((x, y + 22, x + f.width, y + f.height + 22), 26, fill=(10, 40, 30, 90))
    base.alpha_composite(sombra.filter(ImageFilter.GaussianBlur(26))); base.alpha_composite(f, (x, y))
    d = ImageDraw.Draw(base); d.rounded_rectangle((34, 34, W - 35, H - 35), 22, outline=(201, 164, 92, 150), width=2)
    return base.convert("RGB")
linhas = [r for r in csv.DictReader(open("docs/fase2/inventario-imagens.csv", encoding="utf-8-sig"), delimiter=";") if r["marca"] == "medicube"]
saida = "docs/fase2/piloto-visual/processadas"; os.makedirs(saida, exist_ok=True); rel = []
for r in linhas:
    i = int(r["posicao"]); im = Image.open(r["arquivo_atual"]).convert("RGB"); inteira = i in INTEIRAS
    foto = im if inteira else im.crop(caixa(im)); painel(foto, inteira).save(f"{saida}/{i:03d}.webp", quality=90, method=6)
    rel.append((i, r["produto"], inteira, INTEIRAS.get(i, "recorte do cartão do produto")))
open("docs/fase2/piloto-visual/processadas.csv", "w", encoding="utf-8").write("posicao;produto;tratamento\n" + "\n".join(f"{i};{n};{'INTEIRA: ' + t if a else t}" for i, n, a, t in rel))
print(len(rel), "painéis gerados")
