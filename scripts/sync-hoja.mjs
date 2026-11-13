// Trae los datos de la hoja de Google y regenera los datos del sitio.
//
//   SHEET_ID=<id> node scripts/sync-hoja.mjs        (la hoja debe estar compartida como "Cualquier persona con el enlace: lector")
//   node scripts/sync-hoja.mjs --archivo hoja.xlsx  (prueba local con un .xlsx descargado)
//
// Escribe: src/data/tienda.json, src/data/configurador.json, src/content/disenos/*.md,
//          imágenes en public/configurador/disenos/ y src/assets/disenos/, y src/data/imagenes.json.
// Si hay cualquier error no escribe nada y termina con código 1 (en GitHub Actions, como anotaciones ::error::).
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import sharp from 'sharp';
import { PESTANAS, normalizar, validarHoja } from './hoja/validar.mjs';

const RAIZ = process.cwd();
const R = (...p) => path.join(RAIZ, ...p);
const DIR_CONF = 'public/configurador/disenos';
const DIR_CAT = 'src/assets/disenos';
const MANIFIESTO = 'src/data/imagenes.json';
const MAX_BYTES = 30 * 1024 * 1024;
const enCI = !!process.env.GITHUB_ACTIONS;

const errores = [];
const fallar = (msg) => errores.push(msg);

// ---------- leer la hoja ----------
async function bajarHoja() {
  const i = process.argv.indexOf('--archivo');
  if (i > -1) return fs.readFileSync(process.argv[i + 1]);
  const id = process.env.SHEET_ID;
  if (!id) throw new Error('Falta SHEET_ID (o usa --archivo hoja.xlsx).');
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/export?format=xlsx`, { redirect: 'follow' });
  const tipo = res.headers.get('content-type') ?? '';
  if (!res.ok || tipo.includes('text/html')) {
    throw new Error('No se pudo descargar la hoja. Revisa que esté compartida como "Cualquier persona con el enlace" (lector).');
  }
  return Buffer.from(await res.arrayBuffer());
}

function valor(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object' && !(v instanceof Date)) {
    if ('hyperlink' in v && v.hyperlink) return v.hyperlink;
    if ('result' in v) return valor(v.result);
    if ('richText' in v) return v.richText.map((t) => t.text).join('');
    if ('text' in v) return valor(v.text);
    if ('error' in v) return '';
  }
  return v;
}

async function leerHoja(buffer) {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(buffer);
  const porNombre = new Map(libro.worksheets.map((h) => [normalizar(h.name), h]));
  const hoja = {};
  for (const [clave, nombre] of Object.entries(PESTANAS)) {
    const h = porNombre.get(normalizar(nombre));
    if (!h) continue;
    const enc = [];
    h.getRow(1).eachCell({ includeEmpty: true }, (c, col) => (enc[col] = normalizar(valor(c.value))));
    const filas = [];
    h.eachRow({ includeEmpty: false }, (fila, n) => {
      if (n === 1) return;
      const r = { _fila: n };
      fila.eachCell({ includeEmpty: true }, (c, col) => {
        if (enc[col]) r[enc[col]] = valor(c.value);
      });
      filas.push(r);
    });
    hoja[clave] = filas;
  }
  return hoja;
}

// ---------- imágenes ----------
const manifiesto = fs.existsSync(R(MANIFIESTO)) ? JSON.parse(fs.readFileSync(R(MANIFIESTO), 'utf8')) : {};
const nuevoManifiesto = {};

async function bajarDeDrive(id, quien) {
  const res = await fetch(`https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`, { redirect: 'follow' });
  const tipo = res.headers.get('content-type') ?? '';
  if (!res.ok || !tipo.startsWith('image/')) {
    fallar(`${quien}: no se pudo descargar la imagen de Drive. Revisa que el archivo (o su carpeta) esté compartido como "Cualquier persona con el enlace" y que sea una imagen.`);
    return null;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) {
    fallar(`${quien}: la imagen pesa más de 30 MB.`);
    return null;
  }
  return buf;
}

/**
 * Decide de dónde sale la imagen de `destino`. Devuelve un Buffer para procesar, o null si se conserva el archivo actual.
 * `carpeta` es donde se buscan los nombres de archivo escritos a mano.
 */
async function origen(img, destino, carpeta, quien) {
  if (img.tipo === 'drive') {
    nuevoManifiesto[destino] = img.id;
    if (manifiesto[destino] === img.id && fs.existsSync(R(destino))) return null; // misma imagen que la última vez
    return bajarDeDrive(img.id, quien);
  }
  const nombre = path.basename(img.nombre);
  const candidatos = [nombre, `${nombre}.webp`].map((n) => path.join(carpeta, n));
  const existe = candidatos.find((c) => fs.existsSync(R(c)));
  if (!existe) {
    fallar(`${quien}: no encontré el archivo "${img.nombre}". Pon un enlace de Google Drive.`);
    return null;
  }
  if (manifiesto[destino] && existe === destino) nuevoManifiesto[destino] = manifiesto[destino];
  if (path.resolve(R(existe)) === path.resolve(R(destino))) return null;
  return fs.readFileSync(R(existe));
}

async function revisarImagen(buf, quien) {
  try {
    const m = await sharp(buf).metadata();
    if (!m.width || !m.height) throw new Error();
    return m;
  } catch {
    fallar(`${quien}: el archivo no es una imagen válida (usa PNG, JPG o WebP).`);
    return null;
  }
}

// ---------- principal ----------
const escrituras = []; // [ruta, Buffer|string]

async function main() {
  const hoja = await leerHoja(await bajarHoja());
  const v = validarHoja(hoja);
  errores.push(...v.errores);
  if (errores.length) return;

  // diseños del configurador: PNG/WebP con transparencia, a resolución completa (el DPI se calcula con ella)
  for (const d of v.configurador) {
    const destino = `${DIR_CONF}/${d.id}.webp`;
    const thumb = `${DIR_CONF}/thumbs/${d.id}.webp`;
    const quien = `Configurador, "${d.nombre}"`;
    const buf = await origen(d.imagen, destino, DIR_CONF, quien);
    let fuente = buf;
    if (buf) {
      const m = await revisarImagen(buf, quien);
      if (!m) continue;
      if (!m.hasAlpha) console.warn(`Aviso: ${quien} no tiene fondo transparente; se imprimirá con su fondo.`);
      const webp = await sharp(buf).resize({ width: 3000, height: 3000, fit: 'inside', withoutEnlargement: true }).webp({ quality: 90, alphaQuality: 100, effort: 5 }).toBuffer();
      escrituras.push([destino, webp]);
      fuente = webp;
    } else if (!fs.existsSync(R(thumb)) && fs.existsSync(R(destino))) {
      fuente = fs.readFileSync(R(destino));
    }
    if (fuente) {
      const t = await sharp(fuente).resize(160, 160, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 85 }).toBuffer();
      escrituras.push([thumb, t]);
    }
  }

  // catálogo: fotos de producto
  for (const d of v.catalogo) {
    for (const [img, sufijo, campo] of [[d.foto, '', 'Foto'], [d.detalle, '-detalle', 'Foto detalle']]) {
      const destino = `${DIR_CAT}/${d.slug}${sufijo}.webp`;
      const quien = `Catálogo, "${d.nombre}" (${campo})`;
      const buf = await origen(img, destino, DIR_CAT, quien);
      if (!buf) continue;
      if (!(await revisarImagen(buf, quien))) continue;
      const webp = await sharp(buf).rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85, effort: 5 }).toBuffer();
      escrituras.push([destino, webp]);
    }
  }
  if (errores.length) return;

  // ---------- escribir ----------
  const json = (o) => `${JSON.stringify(o, null, 2)}\n`;
  escrituras.push(['src/data/tienda.json', json(v.tienda)]);
  escrituras.push(['src/data/configurador.json', json({ disenos: v.configurador.map(({ id, nombre, soloOscuras }) => ({ id, nombre, soloOscuras })) })]);
  v.catalogo.forEach((d, i) => {
    const fm = [
      '---',
      `nombre: ${JSON.stringify(d.nombre)}`,
      `tema: ${d.tema}`,
      `ubicacion: ${d.ubicacion}`,
      `resumen: ${JSON.stringify(d.resumen)}`,
      `imagen: ../../assets/disenos/${d.slug}.webp`,
      `imagenAlt: ${JSON.stringify(d.fotoAlt)}`,
      `detalle: ../../assets/disenos/${d.slug}-detalle.webp`,
      `detalleAlt: ${JSON.stringify(d.detalleAlt)}`,
      `destacado: ${d.destacado}`,
      `orden: ${i + 1}`,
      `corteSugerido: ${d.corteSugerido}`,
      '---',
      '',
      d.descripcion,
      '',
    ].join('\n');
    escrituras.push([`src/content/disenos/${d.slug}.md`, fm]);
  });
  escrituras.push([MANIFIESTO, json(Object.fromEntries(Object.entries(nuevoManifiesto).sort()))]);

  for (const [ruta, datos] of escrituras) {
    fs.mkdirSync(path.dirname(R(ruta)), { recursive: true });
    fs.writeFileSync(R(ruta), datos);
  }

  // quitar lo que ya no está en la hoja
  const vivos = new Set(escrituras.map(([r]) => path.resolve(R(r))));
  const conservar = (r) => vivos.has(path.resolve(R(r)));
  const cat = new Set(v.catalogo.flatMap((d) => [`${d.slug}.webp`, `${d.slug}-detalle.webp`]));
  const conf = new Set(v.configurador.map((d) => `${d.id}.webp`));
  const slugs = new Set(v.catalogo.map((d) => `${d.slug}.md`));
  const borrar = [
    ...fs.readdirSync(R('src/content/disenos')).filter((f) => f.endsWith('.md') && !slugs.has(f)).map((f) => `src/content/disenos/${f}`),
    ...fs.readdirSync(R(DIR_CAT)).filter((f) => f.endsWith('.webp') && !cat.has(f)).map((f) => `${DIR_CAT}/${f}`),
    ...fs.readdirSync(R(DIR_CONF)).filter((f) => f.endsWith('.webp') && !conf.has(f)).map((f) => `${DIR_CONF}/${f}`),
    ...fs.readdirSync(R(`${DIR_CONF}/thumbs`)).filter((f) => !conf.has(f)).map((f) => `${DIR_CONF}/thumbs/${f}`),
  ].filter((r) => !conservar(r));
  borrar.forEach((r) => fs.rmSync(R(r)));

  console.log(
    `Hoja sincronizada: ${v.tienda.cortes.length} cortes, ${v.tienda.colores.length} colores, ${v.tienda.tallas.length} tallas, ` +
      `${v.configurador.length} diseños en el configurador, ${v.catalogo.length} en el catálogo. ` +
      `${escrituras.filter(([r]) => r.endsWith('.webp')).length} imágenes nuevas, ${borrar.length} archivos quitados.`,
  );
}

try {
  await main();
} catch (e) {
  fallar(e.message);
}
if (errores.length) {
  for (const e of errores) {
    console.error(enCI ? `::error title=Hoja de Google::${e}` : `✗ ${e}`);
    if (enCI) console.log(`HOJA-ERROR: ${e}`); // el script de la hoja lee estas líneas del log
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### La hoja tiene errores; no se publicó nada\n\n${errores.map((e) => `- ${e}`).join('\n')}\n`);
  }
  process.exit(1);
}
