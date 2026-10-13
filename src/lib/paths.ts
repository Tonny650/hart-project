const base = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Ruta interna con el base path del sitio. `href('/catalogo/')` → `/hart-project/catalogo/`. */
export const href = (path: string) => `${base}${path}`;

/** URL absoluta para canonical, OG y JSON-LD. */
export const absUrl = (path: string) => new URL(href(path), import.meta.env.SITE).toString();
