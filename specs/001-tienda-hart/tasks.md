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

## Fase 9 — Configurador 3D (`/disena/`)
Integra el prototipo validado en `otro/test`. Criterios de aceptación:
- Elegir corte (los 4 de `site.ts`, con su precio), talla (`tallas`) y color (colores de ese corte).
- Colocar un diseño de muestra o uno subido por el cliente en frente y espalda, en cm reales, con aviso de DPI bajo.
- Vista 3D girable; playera/premium/oversize usan el modelo de playera, sudadera el de sudadera.
- "Enviar por WhatsApp" manda corte, precio, talla, color, cantidad, zonas y URL + ficha con frente y espalda.
- Estética del sitio (claro, rojo solo en lo accionable); funciona a 375 px; créditos CC BY de los modelos.
- Diseños con licencia solo dentro de la herramienta (excepción §III).

- [x] T090 Dependencias React + three.js, integración `@astrojs/react`
- [x] T091 Modelos y diseños en `public/configurador/` (WebP)
- [x] T092 `src/components/configurador/*` adaptado a `site.ts` y al base path
- [x] T093 `buildConfiguradoMessage` + pruebas
- [x] T094 Página `/disena/`, enlaces en nav, footer y personalizados
- [x] T095 QA en navegador 390 y 1440 px; Lighthouse móvil `/disena/`: 100 / 100 / 100 / 100 (three.js se carga con la primera interacción)

## Fase 10 — Datos editables desde Google Sheets (`docs/hoja-de-google.md`)
Criterios de aceptación: el dueño, sin GitHub y desde el teléfono, edita precios/cortes, colores/tallas, diseños del configurador y catálogo; una casilla publica en ~2 min; un error de la hoja no publica nada y se explica en la hoja; el sitio sigue estático (Lighthouse sin cambios).

- [x] T100 `src/data/tienda.json` y `configurador.json`; `site.ts` y el configurador los leen
- [x] T101 `scripts/hoja/validar.mjs` + pruebas; `scripts/sync-hoja.mjs` (Drive → WebP, borra lo retirado)
- [x] T102 `scripts/plantilla-hoja.mjs`: hoja inicial con los datos actuales (ida y vuelta sin cambios)
- [x] T103 Workflow: sync + commit + deploy; `repository_dispatch` y respaldo diario
- [x] T104 `scripts/google/publicar.gs`: casilla Publicar con estado y errores en la hoja
- [ ] T105 Instalación real: hoja, carpeta de Drive, `SHEET_ID`, token, Apps Script (requiere cuentas del cliente)
