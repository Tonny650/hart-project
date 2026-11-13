// Lógica compartida entre el editor 2D y la textura 3D.
// Todo se calcula en centímetros reales; cada destino solo cambia la resolución (px por cm).
import type { Zona } from './catalogo';

export type Colocacion = {
  disenoId: string | null;
  src: string | null;
  /** relación alto / ancho de la imagen */
  aspecto: number;
  /** ancho real de la imagen en px, para calcular la resolución efectiva */
  pxAncho: number;
  anchoCm: number;
  /** esquina superior izquierda del diseño dentro del área, en cm */
  xCm: number;
  yCm: number;
};

export const vacia = (): Colocacion => ({ disenoId: null, src: null, aspecto: 1, pxAncho: 0, anchoCm: 0, xCm: 0, yCm: 0 });

export const PX_POR_CM_PREVIEW = 24;

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max));

/** Ancho máximo para que el diseño quepa completo en el área. */
export const anchoMaximo = (zona: Zona, aspecto: number) => Math.min(zona.anchoCm, zona.altoCm / aspecto);

/** Aplica las restricciones: tamaño mínimo/máximo y que nunca salga del área. */
export function restringir(c: Colocacion, zona: Zona): Colocacion {
  if (!c.src) return c;
  const anchoCm = clamp(c.anchoCm, zona.minAnchoCm, anchoMaximo(zona, c.aspecto));
  const altoCm = anchoCm * c.aspecto;
  return {
    ...c,
    anchoCm,
    xCm: clamp(c.xCm, 0, zona.anchoCm - anchoCm),
    yCm: clamp(c.yCm, 0, zona.altoCm - altoCm),
  };
}

export type Preset = { id: string; nombre: string; soloZona?: Zona['id'] };
export const PRESETS: Preset[] = [
  { id: 'centro', nombre: 'Centrado' },
  { id: 'max', nombre: 'Máximo' },
  { id: 'arriba', nombre: 'Arriba' },
  { id: 'pecho', nombre: 'Logo pecho', soloZona: 'frente' },
];

export function aplicarPreset(c: Colocacion, zona: Zona, preset: string): Colocacion {
  const max = anchoMaximo(zona, c.aspecto);
  let { anchoCm, xCm, yCm } = c;
  if (preset === 'max') anchoCm = max;
  if (preset === 'pecho') {
    // lado izquierdo de quien la usa = derecha vista de frente
    anchoCm = Math.min(9, max);
    xCm = zona.anchoCm - anchoCm - 2;
    yCm = 2;
    return restringir({ ...c, anchoCm, xCm, yCm }, zona);
  }
  const alto = anchoCm * c.aspecto;
  xCm = (zona.anchoCm - anchoCm) / 2;
  yCm = preset === 'arriba' ? 1.5 : (zona.altoCm - alto) / 2;
  return restringir({ ...c, anchoCm, xCm, yCm }, zona);
}

/** Resolución efectiva de impresión según el tamaño elegido. */
export const dpiEfectivo = (c: Colocacion) => (c.anchoCm ? Math.round(c.pxAncho / (c.anchoCm / 2.54)) : 0);

const cache = new Map<string, Promise<HTMLImageElement>>();
export function cargarImagen(src: string): Promise<HTMLImageElement> {
  let p = cache.get(src);
  if (!p) {
    p = new Promise((res, rej) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = src;
    });
    cache.set(src, p);
  }
  return p;
}

/** Dibuja el diseño sobre un canvas transparente del tamaño del área. */
export function dibujarDiseno(ctx: CanvasRenderingContext2D, c: Colocacion, img: HTMLImageElement | null, pxPorCm: number) {
  if (!img || !c.src) return;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, c.xCm * pxPorCm, c.yCm * pxPorCm, c.anchoCm * pxPorCm, c.anchoCm * c.aspecto * pxPorCm);
}
