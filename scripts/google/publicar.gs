/**
 * HART Project — casilla "Publicar cambios" de la hoja de Google.
 *
 * Proyecto de Apps Script INDEPENDIENTE (script.google.com → Nuevo proyecto), no "Extensiones → Apps Script"
 * dentro de la hoja: así quien edita la hoja no puede ver el token de GitHub.
 *
 * Instalación (una vez): ver docs/hoja-de-google.md. Resumen:
 *   1. Pega este archivo. En Configuración del proyecto → Propiedades de la secuencia de comandos agrega:
 *        HOJA_ID       id de la hoja (lo que va entre /d/ y /edit en su URL)
 *        GITHUB_TOKEN  token "fine-grained" solo para el repositorio, con Contents: Read and write y Actions: Read
 *   2. Ejecuta instalar() una vez y acepta los permisos.
 */

const REPO = 'Tonny650/hart-project';
const PESTANA = 'Publicar';
const CASILLA = 'B1';
const ESTADO = 'B2';
const ESPERA_MAX_MS = 5 * 60 * 1000; // el límite de una ejecución es 6 min

function instalar() {
  const id = prop_('HOJA_ID');
  ScriptApp.getProjectTriggers().forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('alEditar').forSpreadsheet(id).onEdit().create();
  const hoja = SpreadsheetApp.openById(id).getSheetByName(PESTANA);
  if (!hoja) throw new Error(`La hoja no tiene una pestaña "${PESTANA}".`);
  hoja.getRange(CASILLA).insertCheckboxes().setValue(false);
  hoja.getRange(ESTADO).setValue('Listo para publicar.');
  // prueba del token
  const r = gh_('GET', '');
  if (r.getResponseCode() !== 200) throw new Error(`El token no tiene acceso a ${REPO} (HTTP ${r.getResponseCode()}).`);
  Logger.log('Instalado. Marca la casilla de la pestaña Publicar para probar.');
}

/** Disparador instalable: también se ejecuta cuando se edita desde la app del teléfono. */
function alEditar(e) {
  const r = e.range;
  if (r.getSheet().getName() !== PESTANA || r.getA1Notation() !== CASILLA || r.getValue() !== true) return;
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return; // ya hay una publicación en curso
  try {
    publicar_(r.getSheet());
  } finally {
    lock.releaseLock();
  }
}

function publicar_(hoja) {
  const estado = hoja.getRange(ESTADO);
  const casilla = hoja.getRange(CASILLA);
  const poner = (t) => {
    estado.setValue(t);
    SpreadsheetApp.flush();
  };
  const id = Utilities.getUuid().slice(0, 8);
  const inicio = Date.now();

  const res = gh_('POST', '/dispatches', { event_type: 'publicar', client_payload: { id } });
  if (res.getResponseCode() !== 204) {
    poner(`❌ No se pudo iniciar la publicación (error ${res.getResponseCode()}). Avisa a quien administra la página.`);
    casilla.setValue(false);
    return;
  }
  poner(`⏳ Publicando… (${hora_()}). Tarda unos 2 minutos; no cierres nada, puedes seguir editando.`);

  let run = null;
  while (Date.now() - inicio < ESPERA_MAX_MS) {
    Utilities.sleep(15000);
    const lista = JSON.parse(gh_('GET', '/actions/runs?event=repository_dispatch&per_page=10').getContentText()).workflow_runs || [];
    run = lista.find((x) => (x.display_title || '').indexOf(id) > -1) || null;
    if (run && run.status === 'completed') break;
  }

  casilla.setValue(false);
  if (!run || run.status !== 'completed') {
    poner(`⚠️ Está tardando más de lo normal (${hora_()}). Revisa la página en unos minutos; si no cambió, vuelve a marcar la casilla.`);
    return;
  }
  if (run.conclusion === 'success') {
    poner(`✅ Publicado a las ${hora_()}. Ya se ve en la página (si no, recarga).`);
    return;
  }
  const errores = erroresDeLaHoja_(run.id);
  poner(
    errores.length
      ? `❌ No se publicó (${hora_()}). Corrige esto y vuelve a marcar la casilla:\n• ${errores.join('\n• ')}`
      : `❌ No se publicó por un error técnico (${hora_()}). La página sigue como estaba. Avisa a quien administra la página.`,
  );
}

/** Lee del log de GitHub Actions las líneas "HOJA-ERROR: …" que escribe scripts/sync-hoja.mjs. */
function erroresDeLaHoja_(runId) {
  const jobs = JSON.parse(gh_('GET', `/actions/runs/${runId}/jobs`).getContentText()).jobs || [];
  const errores = [];
  for (const job of jobs) {
    if (job.conclusion !== 'failure') continue;
    const r = gh_('GET', `/actions/jobs/${job.id}/logs`, null, false);
    const destino = r.getHeaders()['Location'] || r.getHeaders()['location'];
    const log = destino ? UrlFetchApp.fetch(destino, { muteHttpExceptions: true }).getContentText() : r.getContentText();
    const re = /HOJA-ERROR: (.*)/g;
    let m;
    while ((m = re.exec(log))) if (errores.indexOf(m[1].trim()) < 0) errores.push(m[1].trim());
  }
  return errores.slice(0, 10);
}

function gh_(metodo, ruta, cuerpo, seguir) {
  const op = {
    method: metodo,
    muteHttpExceptions: true,
    followRedirects: seguir !== false,
    headers: {
      Authorization: `Bearer ${prop_('GITHUB_TOKEN')}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  };
  if (cuerpo) {
    op.contentType = 'application/json';
    op.payload = JSON.stringify(cuerpo);
  }
  return UrlFetchApp.fetch(`https://api.github.com/repos/${REPO}${ruta}`, op);
}

function prop_(k) {
  const v = PropertiesService.getScriptProperties().getProperty(k);
  if (!v) throw new Error(`Falta la propiedad ${k} en la configuración del proyecto.`);
  return v;
}

function hora_() {
  return Utilities.formatDate(new Date(), 'America/Mexico_City', 'HH:mm');
}
