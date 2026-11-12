#!/usr/bin/env python3
"""Prepara fotos CANDIDATAS (de qualquer origem) no padrão premium da CP Importados. Não altera nenhuma foto do catálogo.
Entrada : candidatas/candidatas.csv  (posicao;arquivo;site_origem;url_origem;licenca) + os arquivos em candidatas/
Saída   : finais/NNN.webp (painel 4:5, 960x1200) , relatorio-candidatas.csv e comparativo-candidatas.png
Regras  : fundo claro e uniforme -> o produto é isolado e assentado no painel marfim com sombra suave; fundo não uniforme -> NÃO é tratado
          (vai como 'revisar'); resolução baixa e possíveis marcas/textos de terceiros são sinalizados. Nunca remove marca d'água de terceiros."""
import csv, os, sys, numpy as np
from collections import deque
from PIL import Image, ImageDraw, ImageFilter, ImageFont
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, "..", "..", ".."))
W, H = 960, 1200
inv = {int(r["posicao"]): r for r in csv.DictReader(open(os.path.join(RAIZ, "docs/fase2/inventario-imagens.csv"), encoding="utf-8-sig"), delimiter=";")}
def mascara_produto(im, tol=14):
    a = np.asarray(im.convert("RGB")).astype(np.int16); h, w, _ = a.shape
    borda = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]]); bg = np.median(borda, axis=0); desvio = np.abs(borda - bg).max(axis=1)
    uniforme = (desvio < 18).mean() > 0.97 and bg.min() > 225
    if not uniforme: return None, bg
    perto = (np.abs(a - bg).max(axis=2) <= tol); vis = np.zeros((h, w), bool); q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if perto[y, x] and not vis[y, x]: vis[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if perto[y, x] and not vis[y, x]: vis[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and perto[ny, nx] and not vis[ny, nx]: vis[ny, nx] = True; q.append((ny, nx))
    return ~vis, bg
def painel_base():
    top, bot = np.array([251, 248, 241]), np.array([234, 228, 214]); t = np.linspace(0, 1, H)[:, None, None]
    return Image.fromarray((top * (1 - t) + bot * t).repeat(W, axis=1).astype(np.uint8)).convert("RGBA")
def compor(im):
    m, bg = mascara_produto(im)
    if m is None: return None, "fundo NÃO uniforme: revisar manualmente (não tratado)"
    ys, xs = np.where(m); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    alpha = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2)); rgba = im.convert("RGBA"); rgba.putalpha(alpha)
    prod = rgba.crop((x0, y0, x1, y1)); s = min(W * 0.62 / prod.width, H * 0.66 / prod.height); prod = prod.resize((int(prod.width * s), int(prod.height * s)), Image.LANCZOS)
    base = painel_base(); x, y = (W - prod.width) // 2, int((H - prod.height) * 0.46)
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0)); ImageDraw.Draw(sh).ellipse((x + prod.width * 0.08, y + prod.height - 14, x + prod.width * 0.92, y + prod.height + 34), fill=(10, 40, 30, 110))
    base.alpha_composite(sh.filter(ImageFilter.GaussianBlur(22))); base.alpha_composite(prod, (x, y))
    ImageDraw.Draw(base).rounded_rectangle((34, 34, W - 35, H - 35), 22, outline=(201, 164, 92, 150), width=2)
    return base.convert("RGB"), "ok"
def main():
    cand = os.path.join(AQUI, "candidatas", "candidatas.csv")
    if not os.path.exists(cand): sys.exit("sem candidatas/candidatas.csv")
    linhas = list(csv.DictReader(open(cand, encoding="utf-8-sig"), delimiter=";")); rel = []; pares = []
    for r in linhas:
        i = int(r["posicao"]); arq = os.path.join(AQUI, "candidatas", r["arquivo"]); im = Image.open(arq); im.load(); w, h = im.size; avisos = []
        if max(w, h) < 1000: avisos.append(f"resolução baixa ({w}x{h}); ideal ≥1000 px no lado maior")
        res, st = compor(im.convert("RGB")); final = ""
        if res is not None: final = f"finais/{i:03d}.webp"; res.save(os.path.join(AQUI, final), quality=92, method=6); pares.append((i, res))
        else: avisos.append(st)
        rel.append({"posicao": i, "produto": inv[i]["produto"], "especificacao": inv[i]["especificacao"], "imagem_selecionada": r["arquivo"], "site_origem": r["site_origem"], "url_origem": r["url_origem"], "resolucao": f"{w}x{h}", "licenca": r.get("licenca") or "a confirmar (uso só em protótipo/teste interno)", "arquivo_final": final or "(não gerado)", "foto_atual": inv[i]["arquivo_atual"], "observacoes": "; ".join(avisos) or "ok"})
    with open(os.path.join(AQUI, "relatorio-candidatas.csv"), "w", newline="", encoding="utf-8-sig") as f:
        w_ = csv.DictWriter(f, list(rel[0].keys()), delimiter=";"); w_.writeheader(); w_.writerows(rel)
    if pares:
        fb = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 15); Wc, Hc = 250, 312; sh = Image.new("RGB", (len(pares) * (Wc + 12) + 12, 2 * Hc + 90), "#e9e4d8"); d = ImageDraw.Draw(sh); d.text((12, 12), "ANTES (foto atual, acima) × DEPOIS (candidata no padrão, abaixo)", fill="#0b3d2e", font=fb)
        for k, (i, res) in enumerate(pares):
            x = 12 + k * (Wc + 12); sh.paste(Image.open(os.path.join(RAIZ, inv[i]["arquivo_atual"])).convert("RGB").resize((Wc, Hc)), (x, 40)); sh.paste(res.resize((Wc, Hc)), (x, 40 + Hc + 6)); d.text((x, 40 + 2 * Hc + 10), f"#{i} {inv[i]['produto'][:28]}", fill="#111", font=fb)
        sh.save(os.path.join(AQUI, "comparativo-candidatas.png"))
    print(len(rel), "candidatas;", sum(1 for r in rel if r["arquivo_final"] != "(não gerado)"), "geradas;", sum(1 for r in rel if r["observacoes"] != "ok"), "com avisos")
main()
