# Plan técnico — Spec 001

## Stack
- Astro 5, `output: 'static'`, `trailingSlash: 'always'`, `site` = dominio propio.
- Integraciones: `@astrojs/sitemap`. Fuente: `@fontsource-variable/inter`.
- CSS: variables en `src/styles/tokens.css`, sin frameworks de utilidades.
- JS: islas mínimas en `<script>` de Astro (TypeScript, bundle por página). `ClientRouter` para View Transitions.
- Pruebas: Vitest para `src/lib/whatsapp.ts`.
- Herramientas: `ffmpeg-static` + `sharp` en `scripts/extract-frames.mjs`.
- Despliegue: GitHub Actions (`withastro/action` + `actions/deploy-pages`), `public/CNAME`.

## Tokens
```
--bg #fff  --bg-alt #f5f5f7  --bg-dark #000
--text #1d1d1f  --text-secondary #6e6e73  --text-on-dark #f5f5f7
--accent #d1262c  --accent-hover #b81f25  --border rgba(0,0,0,.08)
espaciado 120/80 · 48/32 · 24/16 · container 980 / 1440 · gutter 32/22
breakpoints 734px, 1068px · radio 12px tarjetas, 980px botones
```

## Descenso (HU-4)
- Componente `Descenso.astro`: `<section>` alto `400vh` (móvil `300vh`), hijo `position: sticky; top: 0; height: 100svh` con `<canvas>` y `<img>` póster (noscript/LCP).
- Manifiesto `public/descenso/{desktop,mobile}/manifest.json` con `{count, width, height}`.
- Carga: frame 0 (preload) → cada 8º → el resto, `createImageBitmap` cuando esté disponible.
- Bucle rAF: `target = progress * (count-1)`; `current += (target-current)*0.15`; dibujar `round(current)` con el frame cargado más cercano; `object-fit: cover` manual en canvas.
- Frases: `data-from`/`data-to` en progreso; opacidad calculada en el mismo bucle.

## Generación de assets
Ver sección "Producción de imágenes y video" del plan aprobado (`~/.claude/plans/twinkly-riding-barto.md`). Salidas crudas en `assets-src/higgsfield/`, finales en `src/assets/`.

## Modelos (verificados en Higgsfield, 2026-10-12)
- Imagen: `gpt_image_2_5` (edición con `image_references`; `quality: high`, `resolution: 2k`, aspect 4:5 para producto, 16:9 / 9:16 para el descenso).
- Video: `seedance_2_5`, `mode: omni_reference` con `start_image`, `duration: 8–10`, `generate_audio: false`. Primero `draft: true` (480p) para validar el movimiento y luego se finaliza a 1080p con `draft_job_id`, para no pagar dos veces un mal resultado.
- Saldo actual: **1.45 créditos (plan free)**. No alcanza para el lote; bloquea la fase 2.

## Riesgos
- **Fidelidad de impresiones con IA** → revisión manual 1:1; fallback a quitar fondo de la foto real.
- **Peso de la secuencia** → WebP q70, 1600/750 px, carga progresiva; presupuesto RNF-3.
- **Créditos de Higgsfield** → cotizar antes de cada lote.
