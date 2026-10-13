// Única fuente de verdad de precios, cortes, tallas, colores y contacto.

export type CorteId = 'playera' | 'premium' | 'oversize' | 'sudadera';

export type Color = { id: string; nombre: string; hex: string };

export type Corte = {
  id: CorteId;
  nombre: string;
  precio: number;
  atributos: [string, string, string];
  colores: Color[];
};

const c = (id: string, nombre: string, hex: string): Color => ({ id, nombre, hex });

const BLANCO = c('BLA', 'Blanco', '#ffffff');
const NEGRO = c('NEG', 'Negro', '#000000');
const JASPE = c('JAS', 'Jaspe', '#b3b3b3');
const MARINO = c('MAR', 'Marino', '#1b2030');
const HUESO = c('HUE', 'Hueso', '#e8e2d0');

export const cortes: Corte[] = [
  {
    id: 'playera',
    nombre: 'Playera',
    precio: 220,
    atributos: ['Algodón 180 g', 'Corte regular', '36 colores'],
    colores: [
      BLANCO, MARINO, NEGRO,
      c('REY', 'Azul rey', '#0d47a1'),
      c('ROJ', 'Rojo', '#e00016'),
      c('CAN', 'Canario', '#edd040'),
      c('CHA', 'Charcoal', '#36363b'),
      c('CHE', 'Cereza', '#800020'),
      c('HEL', 'Rosa helio', '#e0337a'),
      c('KAK', 'Kaki', '#b9a886'),
      c('OXF', 'Oxford', '#353535'),
      c('PET', 'Petróleo', '#213b4b'),
      c('PEY', 'Turquesa oscuro', '#00a3b4'),
      c('TUR', 'Turquesa', '#0a83b8'),
      c('AQU', 'Aqua', '#66d9e3'),
      c('BAN', 'Verde bandera', '#054d1c'),
      c('CEL', 'Celeste', '#577fd6'),
      c('FLA', 'Amarillo flúor', '#d9f52a'),
      c('LIM', 'Limón', '#91dd27'),
      c('MEN', 'Menta', '#8fe8dc'),
      c('MIL', 'Verde militar', '#3a3a2b'),
      c('MOR', 'Morado', '#3b2c5a'),
      c('NNE', 'Naranja neón', '#f39203'),
      c('RNE', 'Rosa neón', '#ff4f73'),
      c('ROS', 'Rosa', '#f7dfee'),
      c('SAL', 'Salmón', '#d05559'),
      c('TAB', 'Tabaco', '#2c1c1b'),
      c('VNE', 'Verde neón', '#7ef05b'),
      JASPE,
      c('VIN', 'Vino', '#560008'),
      HUESO,
      c('PER', 'Perla', '#d8d8dd'),
      c('BOT', 'Verde botella', '#193f35'),
      c('NAN', 'Naranja', '#ff5426'),
      c('MON', 'Morado noche', '#392d58'),
      c('AMA', 'Amarillo', '#ffd84f'),
    ],
  },
  {
    id: 'premium',
    nombre: 'Playera premium',
    precio: 250,
    atributos: ['Algodón peinado 200 g', 'Tacto más suave', '6 colores'],
    colores: [BLANCO, NEGRO, HUESO, JASPE, c('CRU', 'Crudo', '#fbf6e6'), MARINO],
  },
  {
    id: 'oversize',
    nombre: 'Oversize',
    precio: 320,
    atributos: ['Corte holgado', 'Hombro caído', '6 colores'],
    colores: [BLANCO, NEGRO, JASPE, MARINO, HUESO, c('CIE', 'Cielo', '#b3c8dc')],
  },
  {
    id: 'sudadera',
    nombre: 'Sudadera',
    precio: 430,
    atributos: ['Con capucha', 'Bolsa canguro', 'Interior afelpado'],
    colores: [NEGRO, HUESO],
  },
];

export const tallas = ['CH', 'M', 'G', 'XG', 'XXG'] as const;

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
