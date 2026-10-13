import { cortes, mxn } from '../config/site';

export const faq = [
  {
    q: '¿Cómo hago mi pedido?',
    a: 'Elige un diseño, el corte, la talla y el color, y toca «Pedir por WhatsApp». El mensaje ya lleva todo tu pedido; por ahí te confirmamos disponibilidad, total y entrega.',
  },
  {
    q: '¿Cuánto cuesta cada prenda?',
    a: `El precio depende del corte, no del diseño: ${cortes.map((k) => `${k.nombre.toLowerCase()} ${mxn(k.precio)}`).join(', ')}. Precios en pesos mexicanos.`,
  },
  {
    q: '¿Puedo pedir un diseño en otro corte o color?',
    a: 'Sí. Cada diseño se imprime en cualquiera de los cuatro cortes y en los colores disponibles para ese corte.',
  },
  {
    q: '¿Hacen diseños personalizados?',
    a: 'Sí. Cuéntanos tu idea, te mandamos una propuesta y la imprimimos en la prenda que elijas, desde una pieza.',
  },
  {
    q: '¿Cómo pago y cómo recibo mi pedido?',
    a: 'Al confirmar tu pedido por WhatsApp te compartimos las formas de pago y las opciones de entrega o envío según tu ubicación. Estamos en Guadalajara, Jalisco.',
  },
];
