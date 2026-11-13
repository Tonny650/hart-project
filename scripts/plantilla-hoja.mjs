// Genera la hoja inicial (.xlsx) con los datos que hoy tiene el sitio, para importarla a Google Sheets.
//   node scripts/plantilla-hoja.mjs [salida.xlsx]
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { CORTES, PESTANAS } from './hoja/validar.mjs';

const salida = process.argv[2] ?? 'hoja-hart.xlsx';
const tienda = JSON.parse(fs.readFileSync('src/data/tienda.json', 'utf8'));
const conf = JSON.parse(fs.readFileSync('src/data/configurador.json', 'utf8'));

function leerMd(archivo) {
  const txt = fs.readFileSync(archivo, 'utf8').replace(/\r\n/g, '\n');
  const [, fm, cuerpo] = txt.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const d = {};
  for (const l of fm.split('\n')) {
    const m = l.match(/^(\w+):\s*(.*)$/);
    if (!m) continue;
    const v = m[2].trim();
    d[m[1]] = v.startsWith('"') ? JSON.parse(v) : v === 'true' ? true : v === 'false' ? false : v;
  }
  d.cuerpo = cuerpo.trim();
  d.slug = path.basename(archivo, '.md');
  return d;
}
const catalogo = fs
  .readdirSync('src/content/disenos')
  .filter((f) => f.endsWith('.md'))
  .map((f) => leerMd(path.join('src/content/disenos', f)))
  .sort((a, b) => Number(a.orden) - Number(b.orden));

const ETIQUETA = { japon: 'Japón', cyber: 'Cyber', ilustracion: 'Ilustración', frente: 'Frente', espalda: 'Espalda', lateral: 'Lateral' };
const CORTE_COL = Object.fromEntries(CORTES.map((k) => [k.id, k.columna]));

const libro = new ExcelJS.Workbook();
const NEGRITA = { bold: true, color: { argb: 'FFFFFFFF' } };
const FONDO = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D1D1F' } };

function pestana(nombre, columnas, filas, { notas = {}, listas = {}, casillas = [] } = {}) {
  const h = libro.addWorksheet(nombre, { views: [{ state: 'frozen', ySplit: 1 }] });
  h.columns = columnas.map(([header, width]) => ({ header, width }));
  h.getRow(1).eachCell((c) => {
    c.font = NEGRITA;
    c.fill = FONDO;
    c.alignment = { vertical: 'middle', wrapText: true };
  });
  h.getRow(1).height = 32;
  filas.forEach((f) => h.addRow(f));
  for (const [col, nota] of Object.entries(notas)) h.getCell(`${col}1`).note = nota;
  const ultima = Math.max(filas.length + 40, 60);
  for (const [col, opciones] of Object.entries(listas)) {
    for (let r = 2; r <= ultima; r++) h.getCell(`${col}${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`"${opciones.join(',')}"`] };
  }
  for (const col of casillas) {
    for (let r = 2; r <= ultima; r++) h.getCell(`${col}${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"TRUE,FALSE"'] };
  }
  h.eachRow((row) => (row.alignment = { vertical: 'top', wrapText: true }));
  return h;
}

// ---------- Instrucciones ----------
const ins = libro.addWorksheet('Instrucciones');
ins.columns = [{ width: 110 }];
[
  'CÓMO EDITAR LA TIENDA HART PROJECT',
  '',
  '1. Cambia lo que necesites en las pestañas Cortes, Colores, Tallas, Configurador y Catálogo.',
  '2. Ve a la pestaña Publicar y marca la casilla "Publicar cambios". En unos 2 minutos los cambios están en la página.',
  '   La celda Estado te dice si se publicó o qué hay que corregir. Si hay un error, la página se queda como estaba.',
  '',
  'IMÁGENES',
  '• Súbelas a la carpeta de Google Drive de la tienda (desde la app de Drive: botón +, Subir).',
  '• En la imagen: los tres puntos ⋮ → Compartir → Copiar enlace, y pégalo en la celda.',
  '• Configurador: el diseño solo, en PNG con fondo transparente, lo más grande posible (mínimo 1500 px).',
  '• Catálogo: Foto = la prenda completa; Foto detalle = acercamiento al diseño. JPG o PNG.',
  '• Si una celda tiene un nombre como "kaizen.webp" es una imagen que ya está en la página; déjala así o cámbiala por un enlace.',
  '',
  'REGLAS',
  '• Para quitar algo sin borrarlo, desmarca su casilla Activo.',
  '• No cambies los encabezados (fila 1) ni los nombres de las pestañas.',
  '• Cortes: no cambies la columna Clave. En los detalles puedes escribir {colores} y se reemplaza por el número de colores.',
  '• Catálogo: no cambies la Clave URL de un diseño ya publicado (es su dirección en la página). Para uno nuevo, déjala vacía.',
  '• Catálogo: solo diseños propios. Personajes o marcas de terceros (Spider-Man, Deadpool, etc.) solo en el Configurador.',
  '• El orden de las filas es el orden en la página.',
].forEach((t, i) => {
  const c = ins.getCell(`A${i + 1}`);
  c.value = t;
  if (t && t === t.toUpperCase()) c.font = { bold: true, size: 13 };
});

// ---------- Publicar ----------
const pub = libro.addWorksheet('Publicar');
pub.columns = [{ width: 22 }, { width: 70 }];
pub.getCell('A1').value = 'Publicar cambios';
pub.getCell('B1').value = false;
pub.getCell('B1').dataValidation = { type: 'list', allowBlank: true, formulae: ['"TRUE,FALSE"'] };
pub.getCell('A2').value = 'Estado';
pub.getCell('B2').value = 'Sin publicar todavía';
pub.getCell('A1').font = pub.getCell('A2').font = { bold: true, size: 14 };
pub.getCell('B2').alignment = { wrapText: true, vertical: 'top' };

// ---------- Cortes ----------
pestana(
  PESTANAS.cortes,
  [['Clave', 12], ['Nombre', 22], ['Precio', 10], ['Detalle 1', 26], ['Detalle 2', 26], ['Detalle 3', 26]],
  tienda.cortes.map((k) => [k.id, k.nombre, k.precio, ...k.atributos.map((a) => a.replace(/^\d+ colores$/, '{colores} colores'))]),
  { notas: { A: 'No cambiar.', C: 'Solo el número, en pesos. Ej. 220' } },
);

// ---------- Colores ----------
const usa = (id, corte) => tienda.cortes.find((k) => k.id === corte).colores.includes(id);
pestana(
  PESTANAS.colores,
  [['Color', 22], ['Hex', 11], ...CORTES.map((k) => [k.columna, 11]), ['Código', 10]],
  tienda.colores.map((c) => [c.nombre, c.hex, ...CORTES.map((k) => usa(c.id, k.id)), c.id]),
  {
    notas: { B: 'Código de color de 6 dígitos, ej. #1b2030', G: 'Opcional. No cambiar en colores existentes.' },
    casillas: ['C', 'D', 'E', 'F'],
  },
);

// ---------- Tallas ----------
pestana(PESTANAS.tallas, [['Talla', 12], ['Activa', 10]], tienda.tallas.map((t) => [t, true]), { casillas: ['B'] });

// ---------- Configurador ----------
pestana(
  PESTANAS.configurador,
  [['Nombre', 22], ['Imagen', 46], ['Se ve mejor en prendas oscuras', 16], ['Activo', 10], ['Clave', 18]],
  conf.disenos.map((d) => [d.nombre, `${d.id}.webp`, d.soloOscuras, true, d.id]),
  {
    notas: { B: 'Enlace de Google Drive a un PNG con fondo transparente.', E: 'Opcional. No cambiar en diseños existentes.' },
    casillas: ['C', 'D'],
  },
);

// ---------- Catálogo ----------
pestana(
  PESTANAS.catalogo,
  [
    ['Clave URL', 18], ['Nombre', 20], ['Tema', 13], ['Ubicación', 12], ['Corte sugerido', 14], ['Resumen', 50], ['Descripción', 60],
    ['Foto', 40], ['Texto alternativo foto', 50], ['Foto detalle', 40], ['Texto alternativo detalle', 50], ['Destacado', 11], ['Activo', 10],
  ],
  catalogo.map((d) => [
    d.slug, d.nombre, ETIQUETA[d.tema], ETIQUETA[d.ubicacion], CORTE_COL[d.corteSugerido], d.resumen, d.cuerpo,
    path.basename(d.imagen), d.imagenAlt, path.basename(d.detalle), d.detalleAlt, d.destacado === true, true,
  ]),
  {
    notas: {
      A: 'No cambiar en diseños publicados. Vacía para uno nuevo.',
      F: 'Máximo 155 letras. Aparece en Google y en la tarjeta.',
      I: 'Describe la foto para personas que no la ven. Opcional.',
      L: 'Aparece en la página de inicio.',
    },
    listas: { C: ['Japón', 'Cyber', 'Ilustración'], D: ['Frente', 'Espalda', 'Lateral'], E: CORTES.map((k) => k.columna) },
    casillas: ['L', 'M'],
  },
);

await libro.xlsx.writeFile(salida);
console.log(`Escrito ${salida}: ${tienda.cortes.length} cortes, ${tienda.colores.length} colores, ${conf.disenos.length} diseños de configurador, ${catalogo.length} de catálogo.`);
