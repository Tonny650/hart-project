import { describe, expect, it } from 'vitest';
import { idDrive, imagen, siNo, validarHoja } from './validar.mjs';

type Fila = Record<string, unknown> & { _fila: number };
const fila = (n: number, r: Record<string, unknown>): Fila => ({ _fila: n, ...r });

const base = () => ({
  cortes: [
    fila(2, { clave: 'playera', nombre: 'Playera', precio: 220, detalle_1: 'Algodón', detalle_2: 'Regular', detalle_3: '{colores} colores' }),
    fila(3, { clave: 'premium', nombre: 'Premium', precio: '$250', detalle_1: 'a', detalle_2: 'b', detalle_3: 'c' }),
    fila(4, { clave: 'oversize', nombre: 'Oversize', precio: 320, detalle_1: 'a', detalle_2: 'b', detalle_3: 'c' }),
    fila(5, { clave: 'sudadera', nombre: 'Sudadera', precio: 430, detalle_1: 'a', detalle_2: 'b', detalle_3: 'c' }),
  ],
  colores: [
    fila(2, { color: 'Negro', hex: '#000000', playera: true, premium: true, oversize: true, sudadera: true, codigo: 'NEG' }),
    fila(3, { color: 'Azul rey', hex: '0D47A1', playera: 'TRUE', premium: false, oversize: false, sudadera: false }),
  ],
  tallas: [fila(2, { talla: 'CH', activa: true }), fila(3, { talla: 'XXG', activa: false })],
  configurador: [fila(2, { nombre: 'Koi', imagen: 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view?usp=sharing' })],
  catalogo: [
    fila(2, {
      nombre: 'Gran Ola', tema: 'Japón', ubicacion: 'Espalda', corte_sugerido: 'Sudadera', resumen: 'Una ola.',
      foto: 'gran-ola.webp', foto_detalle: 'https://drive.google.com/open?id=1AbCdEfGhIjKlMnOpQrStUvWxYz', destacado: true,
    }),
  ],
});

describe('celdas', () => {
  it('reconoce enlaces de Drive', () => {
    expect(idDrive('https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view')).toBe('1AbCdEfGhIjKlMnOpQrStUvWxYz');
    expect(idDrive('https://drive.google.com/open?id=1AbCdEfGhIjKlMnOpQrStUvWxYz')).toBe('1AbCdEfGhIjKlMnOpQrStUvWxYz');
    expect(imagen('kaizen.webp')).toEqual({ tipo: 'archivo', nombre: 'kaizen.webp' });
    expect(imagen('https://imgur.com/x.png')?.tipo).toBe('invalida');
  });
  it('lee casillas', () => {
    expect([siNo(true), siNo('TRUE'), siNo('Sí'), siNo('FALSE'), siNo(''), siNo('', true)]).toEqual([true, true, true, false, false, true]);
  });
});

describe('validarHoja', () => {
  it('arma los datos del sitio', () => {
    const v = validarHoja(base());
    expect(v.errores).toEqual([]);
    expect(v.tienda.tallas).toEqual(['CH']);
    expect(v.tienda.colores).toEqual([
      { id: 'NEG', nombre: 'Negro', hex: '#000000' },
      { id: 'AZUL-REY', nombre: 'Azul rey', hex: '#0d47a1' },
    ]);
    expect(v.tienda.cortes[0]).toMatchObject({ precio: 220, atributos: ['Algodón', 'Regular', '2 colores'], colores: ['NEG', 'AZUL-REY'] });
    expect(v.tienda.cortes[1].precio).toBe(250);
    expect(v.configurador[0]).toMatchObject({ id: 'koi', imagen: { tipo: 'drive' } });
    expect(v.catalogo[0]).toMatchObject({ slug: 'gran-ola', tema: 'japon', ubicacion: 'espalda', corteSugerido: 'sudadera', destacado: true });
  });

  it('explica cada error con pestaña y fila', () => {
    const h = base();
    h.cortes[0].precio = 'doscientos';
    h.colores[1].hex = '#12';
    h.catalogo[0].resumen = 'x'.repeat(160);
    h.catalogo[0].tema = 'Anime';
    const { errores } = validarHoja(h);
    expect(errores).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^Pestaña Cortes, fila 2: el precio "doscientos"/),
        expect.stringMatching(/^Pestaña Colores, fila 3: el código "#12"/),
        expect.stringMatching(/^Pestaña Catálogo, fila 2: el resumen .* 160 letras/),
        expect.stringMatching(/^Pestaña Catálogo, fila 2: el tema "Anime"/),
      ]),
    );
  });

  it('rechaza personajes con licencia en el catálogo pero no en el configurador', () => {
    const h = base();
    h.configurador.push(fila(3, { nombre: 'Deadpool X', imagen: 'deadpool-x.webp' }));
    h.catalogo[0].nombre = 'Spider Grunge';
    const { errores } = validarHoja(h);
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/Catálogo, fila 2: .*"spider"/);
  });

  it('ignora filas vacías e inactivas, y exige los cuatro cortes', () => {
    const h = base();
    h.catalogo.push(fila(3, { nombre: '', tema: '' }), fila(4, { nombre: 'Viejo', activo: false }));
    h.cortes.pop();
    const { errores, catalogo } = validarHoja(h);
    expect(catalogo).toHaveLength(1);
    expect(errores).toEqual([expect.stringMatching(/falta la fila del corte "sudadera"/)]);
  });
});
