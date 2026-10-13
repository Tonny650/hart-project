// Genera favicon.svg, apple-touch-icon.png y og.jpg a partir del monograma y del frame final del descenso.
// Uso: node scripts/brand-assets.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const markSvg = readFileSync('src/assets/logo-mark.svg', 'utf8');
const viewBox = markSvg.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
const path = markSvg.match(/<path[^>]*\/>/)[0];
const [vx, vy, vw, vh] = viewBox;

// Monograma blanco centrado en un cuadrado negro de radio suave.
function iconSvg(size, pad = 0.16) {
  const inner = size * (1 - pad * 2);
  const scale = inner / Math.max(vw, vh);
  const tx = (size - vw * scale) / 2 - vx * scale;
  const ty = (size - vh * scale) / 2 - vy * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
<rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#000"/>
<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(5)})" fill="#fff">${path.replace(/fill-rule="evenodd" /, 'fill-rule="evenodd" ')}</g>
</svg>`;
}

writeFileSync('public/favicon.svg', iconSvg(64, 0.12));
await sharp(Buffer.from(iconSvg(180, 0.18))).png().toFile('public/apple-touch-icon.png');

// OG 1200×630: frame final del descenso a la derecha, marca y frase a la izquierda.
const W = 1200, H = 630;
const shirt = await sharp('assets-src/higgsfield/h-end-16x9.png')
  .resize({ height: H, width: Math.round((H * 16) / 9), fit: 'cover' })
  .extract({ left: Math.round((H * 16) / 9 / 2 - 330), top: 0, width: 660, height: H })
  .toBuffer();
const markScale = 120 / vw;
const text = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<g transform="translate(${72 - vx * markScale} ${150 - vy * markScale}) scale(${markScale})" fill="#f5f5f7">${path}</g>
<text x="72" y="330" fill="#f5f5f7" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="64" font-weight="600" letter-spacing="-1">HART Project</text>
<text x="72" y="400" fill="#a1a1a6" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="32">Diseños originales.</text>
<text x="72" y="444" fill="#a1a1a6" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="32">Impresos en México.</text>
</svg>`;
await sharp({ create: { width: W, height: H, channels: 3, background: '#000' } })
  .composite([
    { input: shirt, left: W - 660, top: 0 },
    { input: Buffer.from(text), left: 0, top: 0 },
  ])
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile('public/og.jpg');

console.log('favicon.svg, apple-touch-icon.png, og.jpg');
