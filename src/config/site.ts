// Precios, cortes, tallas y colores vienen de la hoja de Google (scripts/sync-hoja.mjs → src/data/tienda.json).
// Aquí solo se tipan y se arman; contacto y dominio siguen viviendo en este archivo.
import tienda from '../data/tienda.json';

export type CorteId = 'playera' | 'premium' | 'oversize' | 'sudadera';

export type Color = { id: string; nombre: string; hex: string };

export type Corte = {
  id: CorteId;
  nombre: string;
  precio: number;
  atributos: [string, string, string];
  colores: Color[];
};

const colorPorId = new Map<string, Color>(tienda.colores.map((c) => [c.id, c]));

export const cortes: Corte[] = tienda.cortes.map((k) => ({
  id: k.id as CorteId,
  nombre: k.nombre,
  precio: k.precio,
  atributos: k.atributos as Corte['atributos'],
  colores: k.colores.map((id) => colorPorId.get(id)!),
}));

export const tallas: readonly string[] = tienda.tallas;

export const precioDesde = Math.min(...cortes.map((k) => k.precio));
export const precioHasta = Math.max(...cortes.map((k) => k.precio));

export const site = {
  nombre: 'HART Project',
  descripcion:
    'Playeras, oversize y sudaderas con diseños originales, impresos en Guadalajara. Diseños personalizados. Pide por WhatsApp.',
  whatsapp: '5213317367336',
  ciudad: 'Guadalajara',
  estado: 'Jalisco',
  pais: 'MX',
  redes: {
    instagram: 'https://www.instagram.com/hugohatr/',
    tiktok: 'https://www.tiktok.com/@hugohatr77',
  },
  creditos: { nombre: 'NightBit Games', url: 'https://nightbitgames.com' },
};

export const getCorte = (id: string) => cortes.find((k) => k.id === id) ?? cortes[0];

export const mxn = (n: number) => `$${n.toLocaleString('es-MX')}`;
