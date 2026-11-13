import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import Prenda3D, { type Capturar } from './Prenda3D';
import EditorZona from './EditorZona';
import { DISENOS, esClaro, prendaDe, type Diseno, type Prenda, type Zona } from './catalogo';
import {
  PRESETS,
  PX_POR_CM_PREVIEW,
  anchoMaximo,
  aplicarPreset,
  cargarImagen,
  dibujarDiseno,
  dpiEfectivo,
  restringir,
  vacia,
  type Colocacion,
} from './impresion';
import { armarFicha, describirZona, enviarPorWhatsApp, type Envio, type LineaZona } from './envio';
import { cortes, mxn, tallas, type Color, type Corte } from '../../config/site';
import { buildConfiguradoMessage } from '../../lib/whatsapp';
import './configurador.css';

type ZonaId = Zona['id'];
const ZONA_IDS: ZonaId[] = ['frente', 'espalda'];
const zonaDe = (p: Prenda, id: ZonaId) => p.zonas.find((z) => z.id === id)!;
const corteDe = (id: Corte['id']) => cortes.find((k) => k.id === id)!;
/** Al cambiar de corte se conserva el color si existe; si no, negro; si no, el primero. */
const colorPara = (k: Corte, id: string): Color =>
  k.colores.find((c) => c.id === id) ?? k.colores.find((c) => c.id === 'NEG') ?? k.colores[0];

async function colocar(d: Diseno, zona: Zona, previa: Colocacion, preset?: string): Promise<Colocacion> {
  const img = await cargarImagen(d.src);
  const aspecto = img.naturalHeight / img.naturalWidth;
  const base: Colocacion = { ...previa, disenoId: d.id, src: d.src, aspecto, pxAncho: img.naturalWidth };
  if (preset) return aplicarPreset({ ...base, anchoCm: anchoMaximo(zona, aspecto) * 0.7 }, zona, preset);
  // conservar tamaño y centro del diseño anterior cuando se cambia de diseño
  const anchoCm = previa.src ? previa.anchoCm : anchoMaximo(zona, aspecto) * 0.7;
  const cx = previa.src ? previa.xCm + previa.anchoCm / 2 : zona.anchoCm / 2;
  const cy = previa.src ? previa.yCm + (previa.anchoCm * previa.aspecto) / 2 : zona.altoCm / 2;
  return restringir({ ...base, anchoCm, xCm: cx - anchoCm / 2, yCm: cy - (anchoCm * aspecto) / 2 }, zona);
}

/** Lleva una colocación a otra área (al cambiar de prenda) conservando su posición relativa. */
function trasladar(c: Colocacion, de: Zona, a: Zona): Colocacion {
  if (!c.src || de === a) return c;
  const cx = (c.xCm + c.anchoCm / 2) / de.anchoCm;
  const cy = (c.yCm + (c.anchoCm * c.aspecto) / 2) / de.altoCm;
  const anchoCm = Math.min(c.anchoCm, anchoMaximo(a, c.aspecto));
  return restringir(
    { ...c, anchoCm, xCm: cx * a.anchoCm - anchoCm / 2, yCm: cy * a.altoCm - (anchoCm * c.aspecto) / 2 },
    a,
  );
}

const noGuardar = (e: React.SyntheticEvent) => e.preventDefault();

export default function Configurador() {
  const [corteId, setCorteId] = useState<Corte['id']>('playera');
  const [talla, setTalla] = useState<string | null>(null);
  const [colorId, setColorId] = useState('NEG');
  const [cantidad, setCantidad] = useState(1);
  const [zonaId, setZonaId] = useState<ZonaId>('frente');
  const [mostrarArea, setMostrarArea] = useState(true);
  const [propios, setPropios] = useState<Diseno[]>([]);
  const [col, setCol] = useState<Record<ZonaId, Colocacion>>({ frente: vacia(), espalda: vacia() });
  const [enviando, setEnviando] = useState(false);
  const [envio, setEnvio] = useState<Envio | null>(null);
  const [faltaTalla, setFaltaTalla] = useState(false);
  const capturar = useRef<Capturar | null>(null);

  const corte = corteDe(corteId);
  const prenda = prendaDe(corteId);
  const zonas = prenda.zonas;
  const color = colorPara(corte, colorId);
  const claro = esClaro(color.hex);
  const zona = zonaDe(prenda, zonaId);
  const actual = col[zonaId];
  const catalogo = [...propios, ...DISENOS];
  const disenoActual = catalogo.find((d) => d.id === actual.disenoId);

  // Diseños iniciales para que arranque con algo que ver.
  useEffect(() => {
    const ini = async () => {
      const p = prendaDe('playera');
      const frente = await colocar(DISENOS.find((d) => d.id === 'hart-logo-blanco') ?? DISENOS[0], zonaDe(p, 'frente'), vacia(), 'pecho');
      const ola = await colocar(DISENOS.find((d) => d.id === 'gran-ola') ?? DISENOS[0], zonaDe(p, 'espalda'), vacia());
      const espalda = aplicarPreset({ ...ola, anchoCm: 26 }, zonaDe(p, 'espalda'), 'arriba');
      setCol({ frente, espalda });
    };
    ini().catch(() => {});
  }, []);

  const cambiarCorte = (nuevo: Corte) => {
    if (nuevo.id === corteId) return;
    const destino = prendaDe(nuevo.id);
    setCol((prev) => ({
      frente: trasladar(prev.frente, zonaDe(prenda, 'frente'), zonaDe(destino, 'frente')),
      espalda: trasladar(prev.espalda, zonaDe(prenda, 'espalda'), zonaDe(destino, 'espalda')),
    }));
    setColorId(colorPara(nuevo, color.id).id);
    setCorteId(nuevo.id);
  };

  // Un canvas transparente por zona: es la textura del decal en 3D. Cambia de tamaño con la prenda.
  const lienzos = useMemo(() => {
    const r = {} as Record<ZonaId, { canvas: HTMLCanvasElement; tex: THREE.CanvasTexture; zona: Zona }>;
    for (const z of zonas) {
      const canvas = document.createElement('canvas');
      canvas.width = z.anchoCm * PX_POR_CM_PREVIEW;
      canvas.height = z.altoCm * PX_POR_CM_PREVIEW;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      r[z.id] = { canvas, tex, zona: z };
    }
    return r;
  }, [zonas]);
  useEffect(() => () => ZONA_IDS.forEach((id) => lienzos[id].tex.dispose()), [lienzos]);
  const texturas = useMemo(
    () => Object.fromEntries(ZONA_IDS.map((id) => [id, lienzos[id].tex])) as Record<ZonaId, THREE.CanvasTexture>,
    [lienzos],
  );

  /** Carga las imágenes y devuelve una función que pinta las texturas de forma síncrona. */
  const preparar = useCallback(async () => {
    const imgs = await Promise.all(
      ZONA_IDS.map((id) => (col[id].src ? cargarImagen(col[id].src!).catch(() => null) : Promise.resolve(null))),
    );
    return (conBorde: boolean) => {
      ZONA_IDS.forEach((id, i) => {
        const { canvas, tex } = lienzos[id];
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        dibujarDiseno(ctx, col[id], imgs[i], PX_POR_CM_PREVIEW);
        if (conBorde && id === zonaId) {
          ctx.setLineDash([18, 14]);
          ctx.lineWidth = 4;
          ctx.strokeStyle = claro ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.55)';
          ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
        }
        tex.needsUpdate = true;
      });
    };
  }, [col, lienzos, zonaId, claro]);

  useEffect(() => {
    let vivo = true;
    preparar().then((pintar) => vivo && pintar(mostrarArea));
    return () => {
      vivo = false;
    };
  }, [preparar, mostrarArea]);

  const actualizar = (c: Colocacion) => setCol((prev) => ({ ...prev, [zonaId]: c }));

  const elegir = async (d: Diseno) => actualizar(await colocar(d, zona, actual));

  const subir = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    const d: Diseno = { id: `propio-${Date.now()}`, nombre: f.name.replace(/\.[^.]+$/, ''), src: url, thumb: url };
    setPropios((p) => [d, ...p]);
    elegir(d);
    e.target.value = '';
  };

  const lineas: LineaZona[] = zonas.map((z) => ({
    zona: z,
    colocacion: col[z.id],
    nombreDiseno: catalogo.find((d) => d.id === col[z.id].disenoId)?.nombre ?? null,
  }));
  const hayDiseno = zonas.some((z) => col[z.id].src);
  const hayPropio = zonas.some((z) => col[z.id].disenoId?.startsWith('propio-'));

  const enviar = async () => {
    if (!talla) {
      setFaltaTalla(true);
      document.getElementById('paso-talla')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setEnviando(true);
    setEnvio(null);
    try {
      const zonasTxt = lineas.map(describirZona);
      if (hayPropio) zonasTxt.push('Diseño propio: te mando el archivo original por aquí.');
      // fotos sin el borde punteado del área
      const pintar = await preparar();
      pintar(false);
      const fotos = {
        frente: capturar.current?.('frente', 500) ?? null,
        espalda: capturar.current?.('espalda', 500) ?? null,
      };
      pintar(mostrarArea);
      const titulo = `${corte.nombre} · ${color.nombre} · Talla ${talla}${cantidad > 1 ? ` · ${cantidad} piezas` : ''}`;
      const ficha = armarFicha(fotos, titulo, zonasTxt);
      const texto = buildConfiguradoMessage({
        corte: corte.id,
        talla,
        color: color.nombre,
        cantidad,
        zonas: zonasTxt,
        url: location.href.split('#')[0],
      });
      setEnvio(await enviarPorWhatsApp(ficha, texto));
    } finally {
      setEnviando(false);
    }
  };

  const max = actual.src ? anchoMaximo(zona, actual.aspecto) : zona.anchoCm;
  const alto = actual.anchoCm * actual.aspecto;
  const dpi = dpiEfectivo(actual);
  const avisoOscuras = disenoActual?.soloOscuras && claro;

  return (
    <div className="cfg">
      <div className="cfg-visor protegido" onContextMenu={noGuardar}>
        <Prenda3D prenda={prenda} color={color.hex} texturas={texturas} vista={zonaId} capturar={capturar} />
        <div className="cfg-vistas" role="group" aria-label="Vista">
          {zonas.map((z) => (
            <button key={z.id} type="button" className={z.id === zonaId ? 'activo' : ''} aria-pressed={z.id === zonaId} onClick={() => setZonaId(z.id)}>
              {z.nombre}
            </button>
          ))}
        </div>
        <p className="cfg-ayuda">Arrastra para girar. Pellizca o usa la rueda para acercar.</p>
      </div>

      <div className="cfg-panel">
        <section className="cfg-paso" id="paso-talla">
          <h2>
            Prenda y talla. <em>{mxn(corte.precio)}</em>
          </h2>
          <div className="cfg-opciones">
            {cortes.map((k) => (
              <button key={k.id} type="button" className={k.id === corteId ? 'activo' : ''} onClick={() => cambiarCorte(k)} aria-pressed={k.id === corteId}>
                {k.nombre}
                <small>{mxn(k.precio)}</small>
              </button>
            ))}
          </div>
          <div className={`cfg-tallas ${faltaTalla && !talla ? 'falta' : ''}`} role="group" aria-label="Talla">
            {tallas.map((t) => (
              <button
                key={t}
                type="button"
                className={t === talla ? 'activo' : ''}
                aria-pressed={t === talla}
                onClick={() => {
                  setTalla(t);
                  setFaltaTalla(false);
                }}
              >
                {t}
              </button>
            ))}
          </div>
          {faltaTalla && !talla && <p className="cfg-aviso">Elige tu talla para enviar el pedido.</p>}
        </section>

        <section className="cfg-paso">
          <h2>
            Color. <em>{color.nombre}</em>
          </h2>
          <div className="cfg-colores">
            {corte.colores.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`cfg-swatch ${c.id === color.id ? 'activo' : ''}`}
                style={{ '--c': c.hex } as React.CSSProperties}
                onClick={() => setColorId(c.id)}
                aria-label={c.nombre}
                aria-pressed={c.id === color.id}
                title={c.nombre}
              />
            ))}
          </div>
        </section>

        <section className="cfg-paso">
          <h2>Zona de impresión.</h2>
          <div className="cfg-opciones">
            {zonas.map((z) => (
              <button key={z.id} type="button" className={z.id === zonaId ? 'activo' : ''} aria-pressed={z.id === zonaId} onClick={() => setZonaId(z.id)}>
                {z.nombre}
                <small>
                  {z.anchoCm} × {z.altoCm} cm
                </small>
                {col[z.id].src && <i className="cfg-punto" aria-label="con diseño" />}
              </button>
            ))}
          </div>
        </section>

        <section className="cfg-paso">
          <h2>Diseño.</h2>
          <div className="cfg-disenos protegido" style={{ '--prenda': color.hex } as React.CSSProperties} onContextMenu={noGuardar}>
            <label className="cfg-diseno subir">
              <input type="file" accept="image/png,image/webp,image/jpeg,image/svg+xml" onChange={subir} />
              <span aria-hidden="true">+</span>
              <small>Subir el tuyo</small>
            </label>
            <button
              type="button"
              className={`cfg-diseno vacio ${!actual.src ? 'activo' : ''}`}
              onClick={() => actualizar(vacia())}
              aria-pressed={!actual.src}
              title={`Dejar ${zona.nombre.toLowerCase()} sin diseño`}
            >
              <span aria-hidden="true" />
              <small>Sin diseño</small>
            </button>
            {catalogo.map((d) => (
              <button
                key={d.id}
                type="button"
                className={`cfg-diseno ${d.id === actual.disenoId ? 'activo' : ''}`}
                aria-pressed={d.id === actual.disenoId}
                onClick={() => elegir(d)}
                title={d.nombre}
              >
                <img src={d.thumb} alt="" loading="lazy" draggable={false} />
                <small>{d.nombre}</small>
              </button>
            ))}
          </div>
          {avisoOscuras && <p className="cfg-aviso">Este diseño usa el color de la prenda como parte del dibujo. Se ve mejor en colores oscuros.</p>}
        </section>

        <section className="cfg-paso">
          <h2>Tamaño y posición.</h2>
          <div className="protegido" onContextMenu={noGuardar}>
            <EditorZona zona={zona} colocacion={actual} colorHex={color.hex} claro={claro} onChange={actualizar} />
          </div>

          {actual.src ? (
            <>
              <div className="cfg-medidas">
                <strong>
                  {actual.anchoCm.toFixed(1)} × {alto.toFixed(1)} cm
                </strong>
                <span className={`cfg-dpi ${dpi < 150 ? 'bajo' : ''}`}>{dpi} DPI</span>
              </div>
              <div className="cfg-presets">
                {PRESETS.filter((p) => !p.soloZona || p.soloZona === zonaId).map((p) => (
                  <button key={p.id} type="button" onClick={() => actualizar(aplicarPreset(actual, zona, p.id))}>
                    {p.nombre}
                  </button>
                ))}
                <button type="button" className="quitar" onClick={() => actualizar(vacia())}>
                  Quitar
                </button>
              </div>
              <Rango
                etiqueta="Tamaño"
                valor={actual.anchoCm}
                min={zona.minAnchoCm}
                max={max}
                sufijo={`cm (máx. ${max.toFixed(0)})`}
                onChange={(v) => {
                  // escalar desde el centro
                  const cx = actual.xCm + actual.anchoCm / 2;
                  const cy = actual.yCm + alto / 2;
                  actualizar(restringir({ ...actual, anchoCm: v, xCm: cx - v / 2, yCm: cy - (v * actual.aspecto) / 2 }, zona));
                }}
              />
              <Rango
                etiqueta="Horizontal"
                valor={actual.xCm}
                min={0}
                max={zona.anchoCm - actual.anchoCm}
                sufijo="cm"
                onChange={(v) => actualizar(restringir({ ...actual, xCm: v }, zona))}
              />
              <Rango
                etiqueta="Vertical"
                valor={actual.yCm}
                min={0}
                max={zona.altoCm - alto}
                sufijo="cm"
                onChange={(v) => actualizar(restringir({ ...actual, yCm: v }, zona))}
              />
              {dpi < 150 && <p className="cfg-aviso">Resolución baja para este tamaño: la impresión puede verse pixelada.</p>}
            </>
          ) : (
            <p className="cfg-vacio">Elige un diseño para la zona {zona.nombre.toLowerCase()}.</p>
          )}
          <label className="cfg-check">
            <input type="checkbox" checked={mostrarArea} onChange={(e) => setMostrarArea(e.target.checked)} />
            Mostrar el área imprimible en la prenda
          </label>
        </section>

        <section className="cfg-resumen">
          <h2>Tu pedido.</h2>
          <dl>
            <div>
              <dt>Prenda</dt>
              <dd>
                {corte.nombre} · {color.nombre}
              </dd>
            </div>
            <div>
              <dt>Talla</dt>
              <dd>{talla ?? '—'}</dd>
            </div>
            {lineas.map(({ zona: z, colocacion: c, nombreDiseno }) => (
              <div key={z.id}>
                <dt>{z.nombre}</dt>
                <dd>{nombreDiseno ? `${nombreDiseno} · ${c.anchoCm.toFixed(0)} × ${(c.anchoCm * c.aspecto).toFixed(0)} cm` : '—'}</dd>
              </div>
            ))}
            <div>
              <dt>Cantidad</dt>
              <dd>
                <span className="cfg-cantidad">
                  <button type="button" onClick={() => setCantidad((n) => Math.max(1, n - 1))} aria-label="Una pieza menos" disabled={cantidad <= 1}>
                    −
                  </button>
                  <output aria-live="polite">{cantidad}</output>
                  <button type="button" onClick={() => setCantidad((n) => Math.min(500, n + 1))} aria-label="Una pieza más">
                    +
                  </button>
                </span>
              </dd>
            </div>
          </dl>
          <p className="cfg-total">
            <span>Total</span>
            <strong>{mxn(corte.precio * cantidad)}</strong>
          </p>
          <button type="button" className="btn cfg-enviar" onClick={enviar} disabled={enviando || !hayDiseno}>
            <IconoWhatsApp />
            {enviando ? 'Preparando…' : 'Enviar pedido por WhatsApp'}
          </button>
          <EstadoEnvio envio={envio} />
          {!envio && (
            <p className="cfg-nota">
              Se envía la talla, el color, las medidas y una imagen de frente y espalda.
              {hayPropio && ' Con tu propio diseño te confirmamos el total por WhatsApp.'}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function EstadoEnvio({ envio }: { envio: Envio | null }) {
  if (!envio || envio.estado === 'cancelado') return null;
  if (envio.estado === 'compartido') {
    return <p className="cfg-envio ok">Listo. Si el texto no llegó junto con la imagen, revisa que hayas elegido el chat de HART.</p>;
  }
  return (
    <p className={`cfg-envio ${envio.estado === 'copiado' ? 'ok' : ''}`}>
      {envio.estado === 'copiado' ? (
        <>
          <b>Imagen copiada.</b> En el chat de WhatsApp pégala con <kbd>Ctrl</kbd>+<kbd>V</kbd> y envíala junto con el texto.
        </>
      ) : (
        <>Tu navegador no permitió copiar la imagen; el texto del pedido sí va listo en el chat.</>
      )}{' '}
      {!envio.abierto && (
        <a href={envio.url} target="_blank" rel="noopener">
          Abrir chat de WhatsApp
        </a>
      )}
    </p>
  );
}

function IconoWhatsApp() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.200 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  );
}

function Rango(p: { etiqueta: string; valor: number; min: number; max: number; sufijo: string; onChange: (v: number) => void }) {
  const fijo = p.max - p.min < 0.05;
  return (
    <label className="cfg-rango">
      <span>
        {p.etiqueta}
        <output>
          {p.valor.toFixed(1)} {p.sufijo}
        </output>
      </span>
      <input
        type="range"
        min={p.min}
        max={Math.max(p.max, p.min + 0.01)}
        step={0.1}
        value={p.valor}
        disabled={fijo}
        onChange={(e) => p.onChange(parseFloat(e.target.value))}
      />
    </label>
  );
}
