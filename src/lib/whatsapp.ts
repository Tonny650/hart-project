import { getCorte, mxn, site } from '../config/site';

export type Pedido = {
  diseno: string;
  corte: string;
  talla: string;
  color: string;
  cantidad: number;
  url: string;
};

export type PedidoPersonalizado = { corte: string; cantidad: number; idea?: string };

const piezas = (n: number) => `${n} ${n === 1 ? 'pieza' : 'piezas'}`;

export function buildPedidoMessage(p: Pedido): string {
  const corte = getCorte(p.corte);
  const total = p.cantidad > 1 ? ` Total: ${mxn(corte.precio * p.cantidad)}.` : '';
  return (
    `Hola ${site.nombre}. Quiero pedir: ${p.diseno} — ${corte.nombre} (${mxn(corte.precio)}) — ` +
    `Talla ${p.talla} — ${p.color} — ${piezas(p.cantidad)}.${total} ${p.url}`
  );
}

export function buildPersonalizadoMessage(p: PedidoPersonalizado): string {
  const corte = getCorte(p.corte);
  const idea = p.idea?.trim() ? ` Idea: ${p.idea.trim()}` : '';
  return `Hola ${site.nombre}. Quiero un diseño personalizado: ${corte.nombre} — ${piezas(p.cantidad)}.${idea}`;
}

export type PedidoConfigurado = {
  corte: string;
  talla: string;
  color: string;
  cantidad: number;
  /** una línea por zona de impresión, p. ej. "Frente: Koi · 20 × 30 cm · centrado…" */
  zonas: string[];
  url: string;
};

/** Pedido armado en el configurador 3D. La previsualización se adjunta aparte (wa.me solo lleva texto). */
export function buildConfiguradoMessage(p: PedidoConfigurado): string {
  const corte = getCorte(p.corte);
  const total = p.cantidad > 1 ? ` Total: ${mxn(corte.precio * p.cantidad)}.` : '';
  return [
    `Hola ${site.nombre}. Quiero pedir esta prenda que armé en el configurador:`,
    '',
    `• ${corte.nombre} (${mxn(corte.precio)}) — Talla ${p.talla} — ${p.color} — ${piezas(p.cantidad)}.${total}`,
    ...p.zonas.map((z) => `• ${z}`),
    '',
    'Adjunto la previsualización.',
    p.url,
  ].join('\n');
}

export const waUrl =(text: string) => `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;
