# Tareas — Spec 001

Formato: `[ ]` pendiente · `[x]` hecha · `[P]` paralelizable · (HU) historia relacionada.

## Fase 1 — Especificación
- [x] T001 Constitución (`.specify/memory/constitution.md`)
- [x] T002 Spec, wireframe del hero y revisión §6 (`spec.md`)
- [x] T003 Plan técnico y modelo de datos
- [x] T004 Aprobación del usuario + datos (WhatsApp, ciudad, redes, colores por corte, `higanbana` confirmado como propio)

## Fase 2 — Assets (Higgsfield, cuenta NightBit Games vía CLI)
- [x] T010 Saldo, IDs de modelos (`gpt_image_2_5`, `seedance_2_5`) y cotización
- [x] T011 [P] Logo: monograma vectorizado (`src/assets/logo-mark.svg`), favicon y apple-touch-icon (`scripts/vectorize-logo.py`, `scripts/brand-assets.mjs`)
- [x] T012 [P] Fotos de producto: 9 principales + 9 detalles, revisadas contra las fotos reales (`scripts/jobs-productos.json`, `scripts/prepare-images.py`)
- [x] T013 [P] Cortes: 4 imágenes (HU-5)
- [x] T014 [P] Personalizados: 1 imagen editorial (HU-3)
- [x] T015 Descenso: frames inicial/final 16:9 y 9:16 → Seedance 2.5 (borrador 480p validado, final 1080p)
- [x] T016 [P] Imagen OG 1200×630 (HU-6)

## Fase 3 — Base
- [x] T020 Scaffold Astro, dependencias, `astro.config.mjs`
- [x] T021 Tokens + estilos globales
- [x] T022 `site.ts`, colección `disenos` + 9 archivos de contenido
- [x] T023 `whatsapp.ts` + pruebas Vitest (HU-2, HU-3)
- [x] T024 `Base.astro` (SEO en el head), `JsonLd.astro`, Nav, Footer (HU-6, HU-7)

## Fase 4 — Páginas
- [x] T030 `/catalogo/` + filtro (HU-1)
- [x] T031 `/disenos/[slug]/` + `PedidoForm` (HU-2)
- [x] T032 `/personalizados/` (HU-3)
- [x] T033 `/guia-de-tallas/` (HU-5) — sin tabla de medidas hasta tener datos (T080)
- [x] T034 `/` inicio: destacados, comparativa, personalizados, FAQ, CTA (HU-5)
- [x] T035 404

## Fase 5 — Descenso
- [x] T040 `scripts/extract-frames.mjs` + secuencias desktop/móvil
- [x] T041 `Descenso.astro` (HU-4)

## Fase 6 — SEO
- [x] T050 JSON-LD por página, sitemap, robots, OG (HU-6)

## Fase 7 — QA
- [x] T060 Build + tests
- [x] T061 Navegador: 390 y 1920 px, descenso ida y vuelta, selector, WhatsApp, filtro, transiciones
- [x] T062 Lighthouse móvil: 99 / 100 / 100 / 100 (inicio y producto)
- [x] T063 Autocrítica §8.4: se quitó el enlace duplicado "Ver diseño ›" de los destacados

## Fase 8 — Despliegue (requiere confirmación)
- [ ] T070 `git init`, repo GitHub, workflow Pages (`.github/workflows/deploy.yml` listo)

## Pendientes con datos del cliente
- [ ] T080 Medidas reales por talla y corte → tabla en `/guia-de-tallas/`
- [ ] T081 Confirmar nombres de colores con códigos dudosos (CHA, CHE, HEL, PEY, FLA, MON) en `site.ts`
- [ ] T082 Colores de sudadera (hoy: Negro y Hueso)
- [ ] T083 Dominio propio: variables `SITE_URL` y `BASE_PATH=/`, `public/CNAME`, `robots.txt`
