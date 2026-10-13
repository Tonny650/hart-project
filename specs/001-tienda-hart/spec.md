# Spec 001 — Tienda HART Project

**Estado:** borrador para aprobación · **Fecha:** 2026-10-12

## Resumen
Sitio de catálogo para HART Project (playeras y sudaderas con diseños originales, impresos en México) que convierte visitas en pedidos por WhatsApp. Incluye pedidos de diseños personalizados.

## Brief (CONTEXTO_DISENO_APPLE.md §2)

| Campo | Valor |
|---|---|
| Producto / servicio | HART Project: playeras y sudaderas con diseños originales, más diseños personalizados. |
| Audiencia principal | Jóvenes de 18–35 en México, gusto por estética japonesa, cyberpunk e ilustración; compran por Instagram/TikTok y WhatsApp. Les importa el diseño, la calidad del algodón y el precio claro. |
| Objetivo de la página | Una sola acción: enviar un pedido por WhatsApp. |
| Mensaje central | "Diseños originales. Impresos en México." |
| Secciones | Descenso (hero), diseños destacados, cortes y precios, personalizados, FAQ, CTA final. |
| Assets | Fotos reales en `img/` (referencia), imágenes y video generados con Higgsfield. |
| Tono | Sereno, preciso, con actitud. Sin exclamaciones ni emojis. |
| Idioma | Español (es-MX). |

## Historias de usuario

### HU-1 · Ver el catálogo (P1)
Como visitante, quiero ver todos los diseños disponibles para elegir uno que me guste.
- **AC1.1** `/catalogo/` muestra todos los diseños publicados con imagen, nombre y "Desde $220".
- **AC1.2** Puedo filtrar por tema (Todos, Japón, Cyber, Ilustración) sin recargar la página; el filtro funciona con teclado.
- **AC1.3** Sin JS, se ven todos los diseños (el filtro se oculta).
- **AC1.4** 2 columnas desde 735 px, 1 columna en móvil.

### HU-2 · Configurar y pedir un diseño (P1)
Como cliente, quiero elegir corte, talla, color y cantidad y mandar el pedido por WhatsApp.
- **AC2.1** `/disenos/<slug>/` muestra imagen principal, detalle de la impresión, nombre, descripción y ubicación de la impresión.
- **AC2.2** El selector de corte muestra los 4 cortes con su precio; al cambiarlo, el precio mostrado se actualiza al instante.
- **AC2.3** Tallas: CH, M, G, XG, XXG. Colores: Negro, Hueso. Cantidad 1–20.
- **AC2.4** "Pedir por WhatsApp ›" abre `https://wa.me/<número>?text=<mensaje>` en una pestaña nueva.
- **AC2.5** El mensaje tiene el formato: `Hola HART Project. Quiero pedir: <Diseño> — <Corte> ($<precio>) — Talla <talla> — <Color> — <n> pieza(s). <URL del producto>`. Si la cantidad > 1 incluye el total.
- **AC2.6** Sin JS, el botón sigue funcionando con la configuración por defecto (Playera, M, Negro, 1).

### HU-3 · Pedir un diseño personalizado (P1)
Como cliente, quiero contar mi idea y que HART la diseñe e imprima.
- **AC3.1** `/personalizados/` explica el proceso en 3 pasos: idea → propuesta → impresión.
- **AC3.2** Un formulario (prenda, cantidad, descripción opcional) arma el mensaje de WhatsApp: `Hola HART Project. Quiero un diseño personalizado: <prenda> — <n> pieza(s). Idea: <descripción>`.
- **AC3.3** El formulario no envía datos a ningún servidor.

### HU-4 · El descenso (P2)
Como visitante, quiero una primera impresión memorable que me muestre la calidad de la prenda.
- **AC4.1** En `/`, una secuencia de video a pantalla completa avanza al bajar y retrocede al subir, sin saltos visibles, en Chrome, Safari (iOS/macOS) y Firefox.
- **AC4.2** Tres frases aparecen y desaparecen según el progreso del scroll; el `h1` es la primera.
- **AC4.3** El primer frame es visible en < 2.5 s en 4G (LCP).
- **AC4.4** Sin JS se ve una imagen fija con el `h1`.
- **AC4.5** Con `prefers-reduced-motion` el video sigue ligado al scroll; los textos solo cambian de opacidad.
- **AC4.6** En móvil (vertical) usa una secuencia 9:16 más ligera.

### HU-5 · Entender cortes y precios (P1)
- **AC5.1** La comparativa en `/` muestra los 4 cortes con foto, nombre, precio y 3 atributos.
- **AC5.2** `/guia-de-tallas/` muestra medidas por talla para cada corte.

### HU-6 · Encontrar la tienda en Google (P1)
- **AC6.1** Cada página tiene `title` y `meta description` únicos, `canonical`, Open Graph y Twitter Card.
- **AC6.2** JSON-LD válido: `ClothingStore` (global), `Product` + `AggregateOffer` (cada diseño), `BreadcrumbList` (catálogo y diseños), `FAQPage` (inicio).
- **AC6.3** `sitemap-index.xml` y `robots.txt` generados.
- **AC6.4** Todas las imágenes tienen `alt` descriptivo; imágenes en AVIF/WebP con `srcset`.

### HU-7 · Navegar con fluidez (P2)
- **AC7.1** Las transiciones entre páginas usan View Transitions; la imagen de la tarjeta se transforma en la imagen del producto.
- **AC7.2** Las secciones aparecen con fade de 300–400 ms al entrar en pantalla.
- **AC7.3** Navegación completa por teclado con foco visible.

## Requisitos no funcionales
- **RNF-1** Lighthouse móvil: Performance ≥ 90; SEO, Accesibilidad, Buenas prácticas ≥ 95.
- **RNF-2** Sin scroll horizontal a 375 px.
- **RNF-3** Peso de la home sin el descenso < 500 KB; secuencia del descenso ≤ 6 MB desktop / ≤ 3 MB móvil, cargada progresivamente.
- **RNF-4** Despliegue automático a GitHub Pages en cada push a `main`, con dominio propio.

## Fuera de alcance
Carrito, pagos, cuentas de usuario, inventario, panel de administración, envío de formularios a servidor.

## Wireframe del hero (paso 1 del proceso de diseño)

```
┌──────────────────────────────────────────────────────────┐
│ ◇ HART                Catálogo  Personalizados  [Pedir]  │  nav 48px translúcida
├──────────────────────────────────────────────────────────┤
│                                                          │
│                         ╭─╮                              │  progreso 0.00
│                         │ │   gancho                     │  fondo #000
│                    ─────┴─┴─────                         │
│                                                          │
│              Diseños originales.                         │  h1, 80/48px
│              Impresos en México.                         │
│                                                          │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ (scroll: la cámara baja) ─ ─ ─ ─ ─ ─ ─┤
│               ╭──────[ HART ]──────╮                     │  progreso 0.35
│               │    etiqueta cuello  │                     │  "100% algodón."
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┤
│               │   ░▒▓ impresión ▓▒░ │                     │  progreso 0.70
│               │   luz que la revela │                     │  "Cada detalle, impreso."
│               ╰─────────────────────╯   Ver catálogo ›    │  progreso 1.00 → CTA
└──────────────────────────────────────────────────────────┘
```

**Elemento memorable:** el descenso. Un plano continuo que sigue al dedo del usuario, del gancho (la forma del logo) a la impresión. Es el único elemento animado de peso en todo el sitio.

## Revisión contra §6 del contexto de diseño
- Sin eyebrows ni etiquetas en mayúsculas: titulares solos. ✔
- Sin `01/02/03`: el proceso de personalizados sí es secuencia real (idea → propuesta → impresión), se numera en texto ("Primero", "Después", "Al final") para no caer en el patrón. ✔
- Sin tarjetas idénticas con borde y sombra: las tarjetas del catálogo son imagen + texto sin borde ni sombra. ✔
- Sin gradientes, blobs ni glow; fondos solo blanco, `#f5f5f7`, negro. ✔
- Sin `A · B · C` ni flechas `→`: enlaces con ` ›`. ✔
- Un solo acento (rojo HART) en acciones. ✔
- Sin entradas laterales; solo fades. ✔
- Cambio respecto a una tienda genérica: el hero no es un carrusel de productos sino un solo plano de la prenda; la cuadrícula del catálogo es de 2 columnas grandes, no 4 miniaturas.
