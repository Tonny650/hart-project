import { describe, expect, it } from 'vitest';
import { buildConfiguradoMessage, buildPedidoMessage, buildPersonalizadoMessage, waUrl } from './whatsapp';

describe('buildPedidoMessage', () => {
  it('arma el pedido de una pieza sin total', () => {
    expect(
      buildPedidoMessage({
        diseno: 'Kaizen', corte: 'oversize', talla: 'G', color: 'Negro', cantidad: 1,
        url: 'https://example.com/disenos/kaizen/',
      }),
    ).toBe(
      'Hola HART Project. Quiero pedir: Kaizen — Oversize ($320) — Talla G — Negro — 1 pieza. https://example.com/disenos/kaizen/',
    );
  });

  it('incluye el total cuando hay más de una pieza', () => {
    const msg = buildPedidoMessage({
      diseno: 'Yin', corte: 'sudadera', talla: 'M', color: 'Hueso', cantidad: 3, url: 'u',
    });
    expect(msg).toContain('3 piezas. Total: $1,290.');
  });

  it('usa el primer corte si el id no existe', () => {
    expect(buildPedidoMessage({ diseno: 'X', corte: 'nope', talla: 'M', color: 'Negro', cantidad: 1, url: 'u' }))
      .toContain('Playera ($220)');
  });
});

describe('buildPersonalizadoMessage', () => {
  it('omite la idea vacía', () => {
    expect(buildPersonalizadoMessage({ corte: 'playera', cantidad: 10, idea: '  ' })).toBe(
      'Hola HART Project. Quiero un diseño personalizado: Playera — 10 piezas.',
    );
  });
  it('incluye la idea', () => {
    expect(buildPersonalizadoMessage({ corte: 'premium', cantidad: 1, idea: 'Un lobo' })).toContain('Idea: Un lobo');
  });
});

describe('buildConfiguradoMessage', () => {
  it('lista prenda, talla, color y cada zona', () => {
    expect(
      buildConfiguradoMessage({
        corte: 'sudadera', talla: 'M', color: 'Negro', cantidad: 1,
        zonas: ['Frente: Koi · 9 × 9 cm', 'Espalda: sin diseño'], url: 'https://example.com/disena/',
      }),
    ).toBe(
      [
        'Hola HART Project. Quiero pedir esta prenda que armé en el configurador:',
        '',
        '• Sudadera ($430) — Talla M — Negro — 1 pieza.',
        '• Frente: Koi · 9 × 9 cm',
        '• Espalda: sin diseño',
        '',
        'Adjunto la previsualización.',
        'https://example.com/disena/',
      ].join('\n'),
    );
  });

  it('incluye el total cuando hay más de una pieza', () => {
    expect(
      buildConfiguradoMessage({ corte: 'playera', talla: 'G', color: 'Blanco', cantidad: 2, zonas: [], url: 'u' }),
    ).toContain('2 piezas. Total: $440.');
  });
});

describe('waUrl', () => {
  it('codifica el texto', () => {
    expect(waUrl('a b&c')).toBe('https://wa.me/5213317367336?text=a%20b%26c');
  });
});
