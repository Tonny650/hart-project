"""Trace the HART hanger monogram from the brand image into an SVG path.

Run: python -I scripts/vectorize-logo.py  -> src/assets/logo-mark.svg (fill=currentColor)
"""
from pathlib import Path

import numpy as np
import potrace
from PIL import Image, ImageFilter

src = Image.open("img/a0720ac2-41fb-4a9a-827f-9fab6df5707b.jpg").convert("L")
mark = src.crop((555, 190, 855, 395))
# Upscale for smoother curves, then threshold the dark ink.
mark = mark.resize((mark.width * 4, mark.height * 4), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.2))
# potracer treats False as ink, so pass the paper as True.
bitmap = potrace.Bitmap(np.asarray(mark) >= 140)
plist = bitmap.trace(turdsize=40, alphamax=1.0, opticurve=True, opttolerance=0.2)

parts = []
for curve in plist:
    s = curve.start_point
    d = [f"M{s.x:.1f},{s.y:.1f}"]
    for seg in curve.segments:
        if seg.is_corner:
            d.append(f"L{seg.c.x:.1f},{seg.c.y:.1f}L{seg.end_point.x:.1f},{seg.end_point.y:.1f}")
        else:
            d.append(
                f"C{seg.c1.x:.1f},{seg.c1.y:.1f} {seg.c2.x:.1f},{seg.c2.y:.1f} {seg.end_point.x:.1f},{seg.end_point.y:.1f}"
            )
    d.append("Z")
    parts.append("".join(d))

# Tight viewBox around the traced ink.
ys, xs = np.nonzero(np.asarray(mark) < 140)
pad = 8
x0, y0, x1, y1 = xs.min() - pad, ys.min() - pad, xs.max() + pad, ys.max() + pad
svg = (
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0} {y0} {x1 - x0} {y1 - y0}" fill="currentColor">'
    f'<path fill-rule="evenodd" d="{"".join(parts)}"/></svg>\n'
)
out = Path("src/assets/logo-mark.svg")
out.write_text(svg, encoding="utf-8")
print(out, len(svg), "bytes", (x1 - x0, y1 - y0))

