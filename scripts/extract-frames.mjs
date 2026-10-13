// Convierte los videos del descenso en secuencias WebP para el scroll.
// Uso: node scripts/extract-frames.mjs [sufijo]   (por defecto lee assets-src/video/v-final-*.mp4)
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import ffmpeg from 'ffmpeg-static';

const kind = process.argv[2] ?? 'final';
const sets = [
  { name: 'desktop', src: `assets-src/video/v-${kind}-16x9.mp4`, frames: 120, width: 1600, height: 900 },
  { name: 'mobile', src: `assets-src/video/v-${kind}-9x16.mp4`, frames: 96, width: 720, height: 1280 },
];

const duration = (file) => {
  let out = '';
  try {
    execFileSync(ffmpeg, ['-hide_banner', '-i', file], { stdio: 'pipe' });
  } catch (e) {
    out = String(e.stderr);
  }
  const [, h, m, s] = out.match(/Duration: (\d+):(\d+):([\d.]+)/);
  return +h * 3600 + +m * 60 + +s;
};

for (const set of sets) {
  const dir = `public/descenso/${set.name}`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const fps = set.frames / duration(set.src);
  execFileSync(ffmpeg, [
    '-hide_banner', '-loglevel', 'error', '-i', set.src,
    '-vf', `fps=${fps.toFixed(4)},scale=${set.width}:${set.height}:force_original_aspect_ratio=increase,crop=${set.width}:${set.height}`,
    '-frames:v', String(set.frames),
    '-c:v', 'libwebp', '-quality', '68', '-compression_level', '6',
    `${dir}/%04d.webp`,
  ]);
  const files = readdirSync(dir).filter((f) => f.endsWith('.webp'));
  writeFileSync(`${dir}/manifest.json`, JSON.stringify({ count: files.length, width: set.width, height: set.height }));
  console.log(`${set.name}: ${files.length} frames`);
}
