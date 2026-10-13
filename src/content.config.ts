import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const disenos = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/disenos' }),
  schema: ({ image }) =>
    z.object({
      nombre: z.string(),
      tema: z.enum(['japon', 'cyber', 'ilustracion']),
      ubicacion: z.enum(['frente', 'espalda', 'lateral']),
      resumen: z.string().max(155),
      imagen: image(),
      imagenAlt: z.string(),
      detalle: image(),
      detalleAlt: z.string(),
      destacado: z.boolean().default(false),
      orden: z.number(),
      corteSugerido: z.enum(['playera', 'premium', 'oversize', 'sudadera']).default('playera'),
    }),
});

export const collections = { disenos };
