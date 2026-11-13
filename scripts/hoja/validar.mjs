// Convierte las filas de la hoja de Google en los datos del sitio, o en una lista de errores legibles.
// Funciones puras: no tocan red ni disco (ver scripts/sync-hoja.mjs). Probadas en validar.test.ts.

export const PESTANAS = {
  cortes: 'Cortes',
  colores: 'Colores',
  tallas: 'Tallas',
  configurador: 'Configurador',
  catalogo: 'Catálogo',
};

export const CORTES = [
  { id: 'playera', columna: 'Playera' },
  { id: 'premium', columna: 'Premium' },
  { id: 'oversize', columna: 'Oversize' },
  { id: 'sudadera', columna: 'Sudadera' },
];

const TEMAS = { japon: 'japon', cyber: 'cyber', ilustracion: 'ilustracion' };
const UBICACIONES = { frente: 'frente', espalda: 'espalda', lateral: 'lateral' };

/** Personajes y marcas de terceros: no pueden ir en el catálogo público (constitución §III). */
const LICENCIAS = ['spider', 'spiderman', 'deadpool', 'marvel', 'alien', 'batman', 'superman', 'disney', 'pokemon', 'pikachu', 'naruto', 'dragon ball', 'goku', 'one piece', 'star wars', 'hello kitty', 'mickey'];

/** "Texto alternativo (foto)" → "texto_alternativo_foto"; sin acentos ni signos. */
export const normalizar = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

export const aSlug = (s) => normalizar(s).replace(/_/g, '-');

const texto = (v) => (v === null || v === undefined ? '' : String(v).trim());

/** Casillas de Google: true/false, o texto "TRUE", "sí", "x"… Vacío cuenta como `vacio`. */
export function siNo(v, vacio = false) {
  if (typeof v === 'boolean') return v;
  const t = normalizar(v);
  if (!t) return vacio;
  return ['true', 'verdadero', 'si', 'x', '1', 'yes'].includes(t);
}

/** Id de un archivo de Drive a partir de cualquier forma de enlace. */
export function idDrive(v) {
  const t = texto(v);
  const m = t.match(/\/d\/([\w-]{20,})/) ?? t.match(/[?&]id=([\w-]{20,})/);
  return m ? m[1] : null;
}

/**
 * Una celda de imagen es un enlace de Drive (se descarga) o el nombre de un archivo que ya está en el repositorio.
 * @returns {{ tipo: 'drive', id: string } | { tipo: 'archivo', nombre: string } | null}
 */
export function imagen(v) {
  const id = idDrive(v);
  if (id) return { tipo: 'drive', id };
  const t = texto(v);
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return { tipo: 'invalida', valor: t };
  return { tipo: 'archivo', nombre: t };
}

/**
 * @param {Record<string, Array<Record<string, unknown>>>} hoja filas por pestaña, con encabezados ya normalizados
 *   y `_fila` con el número de fila real (para los mensajes de error)
 */
export function validarHoja(hoja) {
  const errores = [];
  const err = (pestana, fila, msg) => errores.push(fila ? `Pestaña ${pestana}, fila ${fila}: ${msg}` : `Pestaña ${pestana}: ${msg}`);
  const filas = (clave) => {
    const f = hoja[clave];
    if (!f) {
      err(PESTANAS[clave], 0, 'no existe. Revisa que la pestaña se llame exactamente así.');
      return [];
    }
    // ignora filas vacías; una fila que solo tiene casillas sin marcar también cuenta como vacía
    return f.filter((r) => Object.entries(r).some(([k, v]) => k !== '_fila' && v !== false && texto(v) !== '' && normalizar(v) !== 'false'));
  };

  // ---------- tallas ----------
  const tallas = [];
  for (const r of filas('tallas')) {
    const t = texto(r.talla);
    if (!t) err(PESTANAS.tallas, r._fila, 'falta la talla.');
    else if (siNo(r.activa, true)) {
      if (tallas.includes(t)) err(PESTANAS.tallas, r._fila, `la talla "${t}" está repetida.`);
      else tallas.push(t);
    }
  }
  if (!errores.length && !tallas.length) err(PESTANAS.tallas, 0, 'debe haber al menos una talla activa.');

  // ---------- colores ----------
  const colores = [];
  const coloresPorCorte = Object.fromEntries(CORTES.map((k) => [k.id, []]));
  const codigos = new Set();
  for (const r of filas('colores')) {
    const nombre = texto(r.color);
    let hex = texto(r.hex).toLowerCase();
    if (hex && !hex.startsWith('#')) hex = `#${hex}`;
    if (!nombre) {
      err(PESTANAS.colores, r._fila, 'falta el nombre del color.');
      continue;
    }
    if (!/^#[0-9a-f]{6}$/.test(hex)) {
      err(PESTANAS.colores, r._fila, `el código "${texto(r.hex)}" de ${nombre} no es válido. Usa 6 dígitos, por ejemplo #1b2030.`);
      continue;
    }
    let id = texto(r.codigo).toUpperCase() || aSlug(nombre).toUpperCase();
    if (codigos.has(id)) {
      // nombre repetido sin código: se desambigua solo
      if (texto(r.codigo)) {
        err(PESTANAS.colores, r._fila, `el código "${id}" está repetido.`);
        continue;
      }
      let n = 2;
      while (codigos.has(`${id}-${n}`)) n++;
      id = `${id}-${n}`;
    }
    codigos.add(id);
    let usado = false;
    for (const k of CORTES) {
      if (siNo(r[normalizar(k.columna)])) {
        coloresPorCorte[k.id].push(id);
        usado = true;
      }
    }
    if (usado) colores.push({ id, nombre, hex });
  }

  // ---------- cortes ----------
  const cortes = [];
  const filasCortes = filas('cortes');
  for (const k of CORTES) {
    const r = filasCortes.find((f) => normalizar(f.clave) === k.id);
    if (!r) {
      err(PESTANAS.cortes, 0, `falta la fila del corte "${k.id}" (columna Clave). No borres ni renombres esa columna.`);
      continue;
    }
    const nombre = texto(r.nombre);
    const precio = Number(String(r.precio ?? '').replace(/[$,\s]/g, ''));
    const n = coloresPorCorte[k.id].length;
    const atributos = [r.detalle_1, r.detalle_2, r.detalle_3].map((a) => texto(a).replace('{colores}', String(n)));
    if (!nombre) err(PESTANAS.cortes, r._fila, `falta el nombre del corte ${k.id}.`);
    if (!Number.isInteger(precio) || precio <= 0) err(PESTANAS.cortes, r._fila, `el precio "${texto(r.precio)}" no es válido. Escribe solo el número, por ejemplo 220.`);
    if (atributos.some((a) => !a)) err(PESTANAS.cortes, r._fila, 'faltan detalles: llena Detalle 1, 2 y 3.');
    if (!n) err(PESTANAS.colores, 0, `el corte ${nombre || k.id} no tiene ningún color marcado.`);
    cortes.push({ id: k.id, nombre, precio, atributos, colores: coloresPorCorte[k.id] });
  }

  // ---------- diseños del configurador ----------
  const configurador = [];
  const idsConf = new Set();
  for (const r of filas('configurador')) {
    if (!siNo(r.activo, true)) continue;
    const nombre = texto(r.nombre);
    const id = aSlug(texto(r.clave) || nombre);
    const img = imagen(r.imagen);
    if (!nombre) err(PESTANAS.configurador, r._fila, 'falta el nombre.');
    else if (idsConf.has(id)) err(PESTANAS.configurador, r._fila, `"${nombre}" está repetido.`);
    if (!img) err(PESTANAS.configurador, r._fila, `falta la imagen de "${nombre}".`);
    else if (img.tipo === 'invalida') err(PESTANAS.configurador, r._fila, `la imagen de "${nombre}" no es un enlace de Google Drive.`);
    idsConf.add(id);
    configurador.push({ id, nombre, soloOscuras: siNo(r.se_ve_mejor_en_prendas_oscuras), imagen: img });
  }
  if (!errores.length && !configurador.length) err(PESTANAS.configurador, 0, 'debe haber al menos un diseño activo.');

  // ---------- catálogo ----------
  const catalogo = [];
  const slugs = new Set();
  for (const r of filas('catalogo')) {
    if (!siNo(r.activo, true)) continue;
    const P = PESTANAS.catalogo;
    const nombre = texto(r.nombre);
    const slug = aSlug(texto(r.clave_url) || nombre);
    if (!nombre) {
      err(P, r._fila, 'falta el nombre.');
      continue;
    }
    if (slugs.has(slug)) err(P, r._fila, `la clave "${slug}" está repetida.`);
    slugs.add(slug);
    const tema = TEMAS[normalizar(r.tema)];
    const ubicacion = UBICACIONES[normalizar(r.ubicacion)];
    const corte = CORTES.find((k) => normalizar(k.columna) === normalizar(r.corte_sugerido) || k.id === normalizar(r.corte_sugerido))?.id ?? 'playera';
    const resumen = texto(r.resumen);
    const descripcion = texto(r.descripcion);
    const foto = imagen(r.foto);
    const detalle = imagen(r.foto_detalle);
    if (!tema) err(P, r._fila, `el tema "${texto(r.tema)}" no existe. Usa Japón, Cyber o Ilustración.`);
    if (!ubicacion) err(P, r._fila, `la ubicación "${texto(r.ubicacion)}" no existe. Usa Frente, Espalda o Lateral.`);
    if (!resumen) err(P, r._fila, `falta el resumen de "${nombre}".`);
    else if (resumen.length > 155) err(P, r._fila, `el resumen de "${nombre}" tiene ${resumen.length} letras; el máximo es 155.`);
    for (const [img, campo] of [[foto, 'Foto'], [detalle, 'Foto detalle']]) {
      if (!img) err(P, r._fila, `falta ${campo} de "${nombre}".`);
      else if (img.tipo === 'invalida') err(P, r._fila, `${campo} de "${nombre}" no es un enlace de Google Drive.`);
    }
    const todo = normalizar([nombre, resumen, descripcion, r.texto_alternativo_foto, r.texto_alternativo_detalle].join(' ')).replace(/_/g, ' ');
    const marca = LICENCIAS.find((m) => new RegExp(`\\b${m}\\b`).test(todo));
    if (marca) err(P, r._fila, `"${nombre}" menciona "${marca}". Los personajes con licencia no pueden ir en el catálogo; solo en el configurador o como pedido personalizado.`);
    catalogo.push({
      slug,
      nombre,
      tema,
      ubicacion,
      corteSugerido: corte,
      resumen,
      descripcion,
      destacado: siNo(r.destacado),
      foto,
      fotoAlt: texto(r.texto_alternativo_foto) || `${nombre}: diseño de ${'HART Project'} impreso en la prenda, vista completa.`,
      detalle,
      detalleAlt: texto(r.texto_alternativo_detalle) || `${nombre}: acercamiento al diseño impreso.`,
    });
  }
  if (!errores.length && !catalogo.length) err(PESTANAS.catalogo, 0, 'debe haber al menos un diseño activo.');

  return {
    errores,
    tienda: { cortes, colores, tallas },
    configurador,
    catalogo,
  };
}
