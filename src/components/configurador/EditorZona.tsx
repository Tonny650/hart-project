import { useEffect, useRef, useState } from 'react';
import type { Zona } from './catalogo';
import { cargarImagen, dibujarDiseno, restringir, type Colocacion } from './impresion';

type Props = {
  zona: Zona;
  colocacion: Colocacion;
  colorHex: string;
  claro: boolean;
  onChange: (c: Colocacion) => void;
};

const PX_CM = 14; // resolución del lienzo del editor (se multiplica por devicePixelRatio)
const MANIJA_CM = 1.6;

type Arrastre = { modo: 'mover' | 'escalar'; dx: number; dy: number; cx: number; cy: number; d0: number; ancho0: number };

/** Lienzo 2D del área de impresión: arrastrar mueve, las esquinas escalan. Todo se restringe en cm. */
export default function EditorZona({ zona, colocacion: c, colorHex, claro, onChange }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const arrastre = useRef<Arrastre | null>(null);
  const escala = PX_CM * (typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1);

  useEffect(() => {
    let vivo = true;
    if (!c.src) return setImg(null);
    cargarImagen(c.src).then((i) => vivo && setImg(i));
    return () => {
      vivo = false;
    };
  }, [c.src]);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    cv.width = zona.anchoCm * escala;
    cv.height = zona.altoCm * escala;
    const ctx = cv.getContext('2d')!;
    const guia = claro ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.28)';

    ctx.fillStyle = colorHex;
    ctx.fillRect(0, 0, cv.width, cv.height);

    // cuadrícula cada 5 cm
    ctx.strokeStyle = claro ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let x = 5; x < zona.anchoCm; x += 5) line(ctx, x * escala, 0, x * escala, cv.height);
    for (let y = 5; y < zona.altoCm; y += 5) line(ctx, 0, y * escala, cv.width, y * escala);

    // ejes centrales
    ctx.strokeStyle = guia;
    ctx.setLineDash([4, 6]);
    line(ctx, cv.width / 2, 0, cv.width / 2, cv.height);
    line(ctx, 0, cv.height / 2, cv.width, cv.height / 2);

    dibujarDiseno(ctx, c, img, escala);

    if (img && c.src) {
      const x = c.xCm * escala;
      const y = c.yCm * escala;
      const w = c.anchoCm * escala;
      const h = c.anchoCm * c.aspecto * escala;
      ctx.setLineDash([]);
      ctx.strokeStyle = '#d1262c';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      const m = 0.55 * escala;
      ctx.fillStyle = '#d1262c';
      for (const [hx, hy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) ctx.fillRect(hx - m / 2, hy - m / 2, m, m);
    }

    // borde del área imprimible
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = claro ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, cv.width - 2, cv.height - 2);
  }, [zona, c, img, colorHex, claro, escala]);

  const aCm = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * zona.anchoCm, ((e.clientY - r.top) / r.height) * zona.altoCm];
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!c.src) return;
    const [px, py] = aCm(e);
    const alto = c.anchoCm * c.aspecto;
    const cx = c.xCm + c.anchoCm / 2;
    const cy = c.yCm + alto / 2;
    const esquinas = [[c.xCm, c.yCm], [c.xCm + c.anchoCm, c.yCm], [c.xCm, c.yCm + alto], [c.xCm + c.anchoCm, c.yCm + alto]];
    const enEsquina = esquinas.some(([x, y]) => Math.hypot(px - x, py - y) < MANIJA_CM);
    const dentro = px >= c.xCm && px <= c.xCm + c.anchoCm && py >= c.yCm && py <= c.yCm + alto;
    if (!enEsquina && !dentro) return;
    canvas.current!.setPointerCapture(e.pointerId);
    arrastre.current = {
      modo: enEsquina ? 'escalar' : 'mover',
      dx: px - c.xCm,
      dy: py - c.yCm,
      cx,
      cy,
      d0: Math.hypot(px - cx, py - cy),
      ancho0: c.anchoCm,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const a = arrastre.current;
    if (!a) return;
    const [px, py] = aCm(e);
    if (a.modo === 'mover') {
      onChange(restringir({ ...c, xCm: px - a.dx, yCm: py - a.dy }, zona));
    } else {
      // escala desde el centro, conservando proporción
      const anchoCm = a.ancho0 * (Math.hypot(px - a.cx, py - a.cy) / Math.max(a.d0, 0.1));
      const r = restringir({ ...c, anchoCm }, zona);
      onChange(restringir({ ...r, xCm: a.cx - r.anchoCm / 2, yCm: a.cy - (r.anchoCm * r.aspecto) / 2 }, zona));
    }
  };

  const soltar = () => (arrastre.current = null);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!c.src) return;
    const paso = e.shiftKey ? 2 : 0.5;
    const mov: Record<string, [number, number]> = {
      ArrowLeft: [-paso, 0],
      ArrowRight: [paso, 0],
      ArrowUp: [0, -paso],
      ArrowDown: [0, paso],
    };
    const m = mov[e.key];
    if (!m) return;
    e.preventDefault();
    onChange(restringir({ ...c, xCm: c.xCm + m[0], yCm: c.yCm + m[1] }, zona));
  };

  return (
    <div className="cfg-editor">
      <canvas
        ref={canvas}
        className="cfg-lienzo"
        style={{ aspectRatio: `${zona.anchoCm} / ${zona.altoCm}`, cursor: c.src ? 'grab' : 'default' }}
        tabIndex={0}
        aria-label={`Área de impresión ${zona.nombre}, ${zona.anchoCm} por ${zona.altoCm} cm. Usa las flechas para mover el diseño.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        onKeyDown={onKeyDown}
      />
      <div className="cfg-regla">
        <span>{zona.anchoCm} cm</span>
        <span>×</span>
        <span>{zona.altoCm} cm</span>
      </div>
    </div>
  );
}

function line(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}
