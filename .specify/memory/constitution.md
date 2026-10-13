# Constitución — HART Project Shop

Principios no negociables. Toda spec, plan y tarea se valida contra este documento. En caso de conflicto, gana este documento; para detalles visuales, gana `design/CONTEXTO_DISENO_APPLE.md`.

## I. Deferencia al producto
La prenda y su impresión son el contenido. La interfaz cede: blanco, `#f5f5f7` y negro puro; un solo acento (rojo HART `#d1262c`) exclusivo de elementos accionables. Una idea por sección, un solo elemento memorable por página.

## II. Fidelidad de la impresión
Toda imagen de producto (generada o retocada) debe reproducir el diseño impreso sin alterarlo: mismas formas, colores, textos y posición. Una imagen que cambia el diseño se descarta, aunque sea más bonita.

## III. Solo diseños propios
El catálogo público contiene únicamente diseños originales de HART Project. Personajes, logotipos o marcas de terceros no aparecen en imágenes, textos, metadatos ni URLs. Los pedidos de ese tipo se atienden por WhatsApp como "pedido personalizado".

## IV. WhatsApp es el checkout
No hay carrito, pagos ni backend. Cada acción de compra termina en un enlace `wa.me` con un mensaje prellenado que incluye diseño, corte, precio, talla, color, cantidad y URL del producto. El mensaje es la orden: debe ser completo y legible.

## V. Una sola fuente de verdad
Precios, cortes, tallas, colores, número de WhatsApp y dominio viven en `src/config/site.ts`. Los diseños viven en la colección de contenido `disenos`. Ningún precio se escribe a mano en una página.

## VI. Estático, rápido y encontrable
Sitio estático (Astro) sin JS salvo donde una interacción lo exige. HTML semántico, un `h1` por página, `lang="es-MX"`, metadatos y JSON-LD por página. Objetivos Lighthouse móvil: Performance ≥ 90; SEO, Accesibilidad y Buenas prácticas ≥ 95.

## VII. Móvil primero, movimiento con propósito
Funciona a 375 px sin scroll horizontal. El movimiento explica: fades de 300–400 ms, sin rebotes ni entradas laterales. `prefers-reduced-motion` desactiva todo salvo cambios de color y el video del descenso (excepción documentada en el contexto de diseño).

## VIII. Spec antes que código
Ningún cambio de funcionalidad se implementa sin estar descrito en `specs/` con criterios de aceptación. Las tareas se marcan en `tasks.md` al completarse.
