// Datos propios del configurador 3D: modelos, áreas de impresión y diseños de muestra.
// Precios, cortes, tallas y colores NO viven aquí: salen de src/config/site.ts.
import type { CorteId } from '../../config/site';
import datos from '../../data/configurador.json';

const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const ruta = (p: string) => `${base}/configurador${p}`;

export type Zona = {
  id: 'frente' | 'espalda';
  nombre: string;
  anchoCm: number;
  altoCm: number;
  minAnchoCm: number;
  /** centro del área en coordenadas de la prenda ya escalada (x, y) y z aproximada de la superficie */
  centro: [number, number, number];
  rotY: number;
};

export type Prenda = {
  id: 'sudadera' | 'playera';
  nombre: string;
  modelo: string;
  /** escala aplicada a la geometría del GLB */
  escala: number;
  /** desplazamiento vertical para centrar la prenda en el visor */
  desplazY: number;
  /** unidades del modelo (ya escalado) por cada cm real */
  unidadesPorCm: number;
  zonas: Zona[];
};

const SUDADERA: Prenda = {
  id: 'sudadera',
  nombre: 'Sudadera',
  modelo: ruta('/models/hoodie.glb'),
  escala: 1,
  desplazY: -0.31,
  // el torso mide ~0.36 u de ancho y equivale a ~58 cm reales
  unidadesPorCm: 0.0062,
  zonas: [
    { id: 'frente', nombre: 'Frente', anchoCm: 30, altoCm: 30, minAnchoCm: 5, centro: [0, 0.36, 0.12], rotY: 0 },
    { id: 'espalda', nombre: 'Espalda', anchoCm: 35, altoCm: 40, minAnchoCm: 5, centro: [0, 0.27, -0.15], rotY: Math.PI },
  ],
};

const PLAYERA: Prenda = {
  id: 'playera',
  nombre: 'Playera',
  modelo: ruta('/models/playera.glb'),
  // el GLB mide 1 u de alto; a 0.62 queda del mismo tamaño en pantalla que la sudadera
  escala: 0.62,
  desplazY: 0,
  // el cuerpo mide ~0.31 u de ancho (escalado) y equivale a ~52 cm reales
  unidadesPorCm: 0.006,
  zonas: [
    { id: 'frente', nombre: 'Frente', anchoCm: 30, altoCm: 38, minAnchoCm: 5, centro: [0, 0.09, 0.11], rotY: 0 },
    { id: 'espalda', nombre: 'Espalda', anchoCm: 30, altoCm: 40, minAnchoCm: 5, centro: [0, 0.13, -0.115], rotY: Math.PI },
  ],
};

/** Playera, premium y oversize comparten el modelo de playera. */
export const prendaDe = (corte: CorteId): Prenda => (corte === 'sudadera' ? SUDADERA : PLAYERA);

/** Prenda clara: las guías y avisos se dibujan en oscuro. */
export function esClaro(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.18;
}

export type Diseno = {
  id: string;
  nombre: string;
  src: string;
  thumb: string;
  /** usa el negro de la prenda como parte del dibujo: en prendas claras se pierde */
  soloOscuras?: boolean;
};

// Vienen de la hoja de Google (pestaña Configurador) → src/data/configurador.json.
// Excepción a la constitución §III: pueden incluir personajes con licencia, SOLO dentro del configurador.
// No se nombran en textos, metadatos, alt ni URLs de ninguna página.
export const DISENOS: Diseno[] = datos.disenos.map((d) => ({
  id: d.id,
  nombre: d.nombre,
  src: ruta(`/disenos/${d.id}.webp`),
  thumb: ruta(`/disenos/thumbs/${d.id}.webp`),
  soloOscuras: d.soloOscuras,
}));
