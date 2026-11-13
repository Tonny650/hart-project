// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';

// Sin dominio propio todavía: se publica en GitHub Pages bajo /hart-project/.
// Al tener dominio, definir SITE_URL=https://dominio.com y BASE_PATH=/ (y agregar public/CNAME).
const site = process.env.SITE_URL ?? 'https://tonny650.github.io';
const base = process.env.BASE_PATH ?? '/hart-project';

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  integrations: [sitemap(), react()],
  image: { layout: 'constrained' },
  build: { format: 'directory' },
});
