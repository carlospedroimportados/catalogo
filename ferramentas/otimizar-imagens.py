#!/usr/bin/env python3
"""
Miniaturas das fotos (Fase 2 · etapa 4). Cria arquivos NOVOS em miniaturas/; os originais em img/ não são
lidos para escrita nem alterados. Idempotente: só cria o que falta (use --refazer para recriar).

  miniaturas/produtos-320/NNN.webp   320x400   (cards no celular, 1x)
  miniaturas/produtos-480/NNN.webp   480x600   (cards no celular 2x e no desktop 1x)
  miniaturas/marca/logo-128.webp     128x128   (logotipo do cabeçalho)
  miniaturas/marca/logo-256.webp     256x256   (logotipo em telas de alta densidade)

O desenho do logotipo é apenas reduzido, sem recorte nem alteração de proporção.
Uso: python3 ferramentas/otimizar-imagens.py [--refazer]
"""
import sys, glob, os
from PIL import Image, ImageChops, ImageStat
import math

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
refazer = "--refazer" in sys.argv
criados = existentes = 0
pior_psnr = 99.0
reforcadas = []
bytes_orig = bytes_novos = 0

def sobre_branco(im):
    """Compõe a imagem sobre fundo branco: pixels totalmente transparentes não têm cor visível e não devem pesar na medição."""
    if im.mode != "RGBA": return im
    fundo = Image.new("RGBA", im.size, (255, 255, 255, 255))
    return Image.alpha_composite(fundo, im).convert("RGB")

def reduzir(origem, destino, largura, qualidade):
    global criados, existentes, bytes_orig, bytes_novos, pior_psnr, reforcadas
    if os.path.exists(destino) and not refazer:
        existentes += 1; return
    im = Image.open(origem)
    if im.mode not in ("RGB", "RGBA"): im = im.convert("RGBA" if "A" in im.getbands() else "RGB")
    altura = round(im.height * largura / im.width)
    novo = im.resize((largura, altura), Image.LANCZOS)
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    # Controle de fidelidade: PSNR da miniatura gravada contra a redução sem compressão. Se ficar abaixo de 34 dB, a
    # qualidade sobe (de 6 em 6) só para essa foto; abaixo de 33 dB mesmo no máximo, a ferramenta para.
    for q in sorted({min(x, 100) for x in (qualidade, qualidade + 6, qualidade + 12, qualidade + 18, 95)}):
        novo.save(destino, "WEBP", quality=q, method=6)
        lido = Image.open(destino).convert(novo.mode)
        rms = max(sum(ImageStat.Stat(ImageChops.difference(sobre_branco(novo), sobre_branco(lido))).rms[:3]) / 3, 1e-6)
        psnr = 20 * math.log10(255 / rms)
        if psnr >= 34: break
    if psnr < 33: raise SystemExit(f"Fidelidade insuficiente ({psnr:.1f} dB): {destino}")
    pior_psnr = min(pior_psnr, psnr)
    if q != qualidade: reforcadas.append(os.path.basename(destino))
    criados += 1; bytes_orig += os.path.getsize(origem); bytes_novos += os.path.getsize(destino)

for f in sorted(glob.glob(os.path.join(RAIZ, "img", "produtos", "*.webp"))):
    n = os.path.basename(f)
    reduzir(f, os.path.join(RAIZ, "miniaturas", "produtos-320", n), 320, 72)
    reduzir(f, os.path.join(RAIZ, "miniaturas", "produtos-480", n), 480, 74)
logo = os.path.join(RAIZ, "img", "marca", "logo-cp-imports.webp")
reduzir(logo, os.path.join(RAIZ, "miniaturas", "marca", "logo-128.webp"), 128, 90)
reduzir(logo, os.path.join(RAIZ, "miniaturas", "marca", "logo-256.webp"), 256, 90)
print(f"Miniaturas: {criados} criadas, {existentes} já existiam" + (f" · {bytes_novos/1024:.0f} KB novos a partir de {bytes_orig/1024:.0f} KB (soma de leituras) · pior fidelidade {pior_psnr:.1f} dB · {len(reforcadas)} com qualidade reforçada" if criados else ""))
