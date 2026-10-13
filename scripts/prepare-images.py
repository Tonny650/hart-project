"""Turn raw Higgsfield PNGs into site-ready WebP files.

- assets-src/higgsfield/p-<slug>.png -> src/assets/disenos/<slug>.webp (main)
                                       src/assets/disenos/<slug>-detalle.webp (auto crop of the print)
- assets-src/higgsfield/c-<corte>.png -> src/assets/cortes/<corte>.webp
- assets-src/higgsfield/x-<name>.png  -> src/assets/<name>.webp
Run: python -I scripts/prepare-images.py
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

SRC = Path("assets-src/higgsfield")
DST = Path("src/assets")


def save(im, path, width):
    path.parent.mkdir(parents=True, exist_ok=True)
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(path, "WEBP", quality=84, method=6)


def print_box(im):
    """Bounding box of the print: pixels that differ from the garment color, ignoring the backdrop."""
    small = im.copy()
    small.thumbnail((448, 560))
    scale = im.width / small.width
    # Flood the light backdrop from the corners so it is excluded from the garment mask.
    flood = small.copy()
    for xy in [(0, 0), (small.width - 1, 0), (0, small.height - 1), (small.width - 1, small.height - 1)]:
        ImageDraw.floodfill(flood, xy, (255, 0, 255), thresh=70)
    a = np.asarray(small).astype(int)
    bg = np.all(np.asarray(flood) == (255, 0, 255), axis=-1)
    garment = a[~bg]
    base = np.median(garment, axis=0)
    diff = np.abs(a - base).sum(axis=-1)
    backdrop = np.asarray(small.getpixel((2, 2))).astype(int)
    mask = (diff > 120) & ~bg & (np.abs(a - backdrop).sum(axis=-1) > 90)
    # Drop the collar label area (top 22%) so it does not stretch the box.
    mask[: int(small.height * 0.22)] = False
    ys, xs = np.nonzero(mask)
    if len(xs) < 50:
        return None
    x0, x1 = np.percentile(xs, [1, 99])
    y0, y1 = np.percentile(ys, [1, 99])
    return [v * scale for v in (x0, y0, x1, y1)]


# Manual framing per design (center x, center y, crop height) as fractions of the image.
DETAIL = {
    "archive-06": (0.53, 0.45, 0.50),
    "butterfly-effect": (0.52, 0.38, 0.42),
    "higanbana": (0.49, 0.45, 0.52),
    "icaro": (0.50, 0.53, 0.50),
    "kaizen": (0.65, 0.50, 0.42),
    "katana-sakura": (0.63, 0.45, 0.42),
    "mirai": (0.48, 0.50, 0.50),
    "tag": (0.51, 0.43, 0.30),
    "yin": (0.51, 0.72, 0.42),
}


def detail_crop(im, slug=None):
    if slug in DETAIL:
        fx, fy, fh = DETAIL[slug]
        h = im.height * fh
        w = h * 4 / 5
        left = min(max(im.width * fx - w / 2, 0), im.width - w)
        top = min(max(im.height * fy - h / 2, 0), im.height - h)
        return im.crop((round(left), round(top), round(left + w), round(top + h)))
    box = print_box(im)
    if not box:
        return im
    x0, y0, x1, y1 = box
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    # 4:5 window that covers the print with a little air, at most the full image.
    h = max((y1 - y0) * 1.12, (x1 - x0) * 1.12 * 5 / 4, im.height * 0.42)
    h = min(h, im.height)
    w = h * 4 / 5
    left = min(max(cx - w / 2, 0), im.width - w)
    top = min(max(cy - h / 2, 0), im.height - h)
    return im.crop((round(left), round(top), round(left + w), round(top + h)))


def main():
    for f in sorted(SRC.glob("p-*.png")):
        slug = f.stem[2:]
        im = Image.open(f).convert("RGB")
        save(im, DST / "disenos" / f"{slug}.webp", 1600)
        save(detail_crop(im, slug), DST / "disenos" / f"{slug}-detalle.webp", 1200)
        print("diseno", slug)
    for f in sorted(SRC.glob("c-*.png")):
        save(Image.open(f).convert("RGB"), DST / "cortes" / f"{f.stem[2:]}.webp", 1200)
        print("corte", f.stem[2:])
    for f in sorted(SRC.glob("x-*.png")):
        save(Image.open(f).convert("RGB"), DST / f"{f.stem[2:]}.webp", 2000)
        print("extra", f.stem[2:])


if __name__ == "__main__":
    main()



