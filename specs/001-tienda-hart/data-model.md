# Modelo de datos — Spec 001

## Config global (`src/config/site.ts`)

```ts
type Corte = {
  id: 'playera' | 'premium' | 'oversize' | 'sudadera';
  nombre: string;          // "Playera", "Playera premium", "Oversize", "Sudadera"
  precio: number;          // MXN, entero
  atributos: [string, string, string];
};

const site = {
  nombre: 'HART Project',
  dominio: 'https://<dominio>',
  whatsapp: '52XXXXXXXXXX',   // solo dígitos, con lada de país
  ciudad?: string,
  redes: { instagram?: string; tiktok?: string },
  cortes: Corte[],            // playera 220, premium 250, oversize 320, sudadera 430
  tallas: ['CH','M','G','XG','XXG'],
  colores: ['Negro','Hueso'],
};
```

## Colección `disenos` (`src/content/disenos/<slug>.md`)

| Campo | Tipo | Notas |
|---|---|---|
| `nombre` | string | "Kaizen" |
| `tema` | `'japon' \| 'cyber' \| 'ilustracion'` | filtro del catálogo |
| `ubicacion` | `'frente' \| 'espalda' \| 'lateral'` | dónde va la impresión |
| `resumen` | string ≤ 155 | meta description |
| `imagen` | image() | principal, prenda fantasma sobre `#f5f5f7` |
| `imagenAlt` | string | |
| `detalle` | image() | acercamiento de la impresión |
| `detalleAlt` | string | |
| `destacado` | boolean | aparece en la home |
| `orden` | number | orden en el catálogo |
| `cortes` | Corte['id'][] opcional | por defecto todos |
| body | markdown | descripción larga (2–3 frases) |

El slug es el nombre del archivo.

## Pedido (en memoria, no se persiste)

```ts
type Pedido = {
  diseno: string; corte: Corte['id']; talla: string; color: string;
  cantidad: number; url: string;
};
type PedidoPersonalizado = { corte: Corte['id']; cantidad: number; idea?: string };
```

`buildPedidoMessage(p)` y `buildPersonalizadoMessage(p)` → string; `waUrl(text)` → `https://wa.me/<numero>?text=<encodeURIComponent(text)>`.
