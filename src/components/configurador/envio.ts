// Arma la ficha del pedido (imagen + texto) y la manda a WhatsApp.
//
// Limitación de WhatsApp: un enlace wa.me solo puede llevar TEXTO, nunca una imagen adjunta.
// Por eso hay dos caminos:
//  - Celular: menú "Compartir" del sistema con la imagen y el texto; el cliente elige WhatsApp y el chat.
//  - Computadora: la imagen se copia al portapapeles y se abre el chat con el texto listo; el cliente pega (Ctrl+V).
import { waUrl } from '../../lib/whatsapp';
import type { Zona } from './catalogo';
import type { Colocacion } from './impresion';

export type LineaZona = { zona: Zona; colocacion: Colocacion; nombreDiseno: string | null };

const cm = (v: number) => (Math.round(v * 10) / 10).toString();

/** Describe tamaño y posición de un diseño dentro de su área, en palabras. */
export function describirZona({ zona, colocacion: c, nombreDiseno }: LineaZona): string {
  if (!c.src || !nombreDiseno) return `${zona.nombre}: sin diseño`;
  const alto = c.anchoCm * c.aspecto;
  const desv = c.xCm + c.anchoCm / 2 - zona.anchoCm / 2;
  const horiz = Math.abs(desv) < 0.3 ? 'centrado' : `${cm(Math.abs(desv))} cm a la ${desv < 0 ? 'izquierda' : 'derecha'} del centro`;
  return `${zona.nombre}: ${nombreDiseno} · ${cm(c.anchoCm)} × ${cm(alto)} cm · ${horiz}, a ${cm(c.yCm)} cm del borde superior del área`;
}

const FUENTE = "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'Inter Variable', Inter, Arial, sans-serif";

/** Imagen tipo ficha: vistas de frente y espalda + los datos del pedido. */
export function armarFicha(fotos: { frente: HTMLCanvasElement | null; espalda: HTMLCanvasElement | null }, titulo: string, lineas: string[]) {
  const W = 1080;
  const lado = 500;
  const margen = (W - lado * 2) / 3;
  const yFotos = 110;
  const yTexto = yFotos + lado + 80;
  const H = yTexto + lineas.length * 44 + 48;

  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#1d1d1f';
  ctx.font = `600 34px ${FUENTE}`;
  ctx.fillText('HART Project', margen, 63);
  ctx.fillStyle = '#6e6e73';
  ctx.font = `400 22px ${FUENTE}`;
  ctx.textAlign = 'right';
  ctx.fillText('Previsualización de pedido', W - margen, 63);
  ctx.textAlign = 'left';

  (['frente', 'espalda'] as const).forEach((v, i) => {
    const x = margen + i * (lado + margen);
    ctx.fillStyle = '#f5f5f7';
    ctx.beginPath();
    ctx.roundRect(x, yFotos, lado, lado, 18);
    ctx.fill();
    const foto = fotos[v];
    if (foto) {
      ctx.save();
      ctx.clip();
      ctx.drawImage(foto, x, yFotos, lado, lado);
      ctx.restore();
    }
    ctx.fillStyle = '#6e6e73';
    ctx.font = `600 20px ${FUENTE}`;
    ctx.textAlign = 'center';
    ctx.fillText(v === 'frente' ? 'Frente' : 'Espalda', x + lado / 2, yFotos + lado + 30);
    ctx.textAlign = 'left';
  });

  ctx.fillStyle = '#1d1d1f';
  ctx.font = `600 30px ${FUENTE}`;
  ctx.fillText(titulo, margen, yTexto);
  ctx.font = `400 22px ${FUENTE}`;
  ctx.fillStyle = '#424245';
  lineas.forEach((l, i) => ctx.fillText(l, margen, yTexto + 44 * (i + 1), W - margen * 2));
  return c;
}

export type Envio =
  | { estado: 'compartido' }
  | { estado: 'cancelado' }
  | { estado: 'copiado'; url: string; abierto: boolean }
  | { estado: 'solo-texto'; url: string; abierto: boolean };

export async function enviarPorWhatsApp(ficha: HTMLCanvasElement, texto: string): Promise<Envio> {
  const imagen = new Promise<Blob>((res, rej) => ficha.toBlob((b) => (b ? res(b) : rej(new Error('sin imagen'))), 'image/png'));
  const url = waUrl(texto);
  const movil = window.matchMedia('(pointer: coarse)').matches;

  if (movil && typeof navigator.canShare === 'function') {
    const archivo = new File([await imagen], 'hart-pedido.png', { type: 'image/png' });
    if (navigator.canShare({ files: [archivo] })) {
      try {
        await navigator.share({ files: [archivo], text: texto });
        return { estado: 'compartido' };
      } catch (e) {
        if ((e as Error).name === 'AbortError') return { estado: 'cancelado' };
        // si el menú de compartir falla, seguimos con el camino de escritorio
      }
    }
  }

  let copiado = false;
  try {
    // se pasa la promesa directo: Safari exige crear el ClipboardItem dentro del clic
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': imagen })]);
    copiado = true;
  } catch {
    copiado = false;
  }
  const w = window.open(url, '_blank');
  if (w) w.opener = null;
  return copiado ? { estado: 'copiado', url, abierto: !!w } : { estado: 'solo-texto', url, abierto: !!w };
}
