# Datos de la tienda desde una hoja de Google

El dueño edita precios, colores, tallas, diseños del configurador y el catálogo **desde la app de Google Sheets en su teléfono**. No necesita GitHub. Al marcar la casilla **Publicar cambios**, la página se actualiza en unos 2 minutos.

```
Hoja de Google ──(casilla Publicar)──► Apps Script ──► GitHub Actions
  + carpeta de Drive con imágenes                       ├─ scripts/sync-hoja.mjs: valida, baja imágenes, regenera datos
                                                        ├─ commit "Datos desde la hoja de Google"
                                                        └─ build + deploy a GitHub Pages
```

- **Si la hoja tiene un error, no se publica nada.** El script escribe el error en la celda Estado de la pestaña Publicar (pestaña, fila y qué corregir) y la página se queda como estaba.
- **El sitio sigue estático.** Los datos se copian al repositorio en cada publicación, así que la velocidad, el SEO y el historial de git no cambian, y cualquier cambio se puede deshacer con git.
- **Respaldo diario.** El workflow también corre a las 6:00 (Guadalajara), aunque nadie marque la casilla.
- **Todo es gratis.** Google Sheets, Drive y Apps Script con una cuenta normal, y GitHub Actions en un repositorio público.

## Instalación (una vez, la hace quien administra la página)

### 1. Hoja y carpeta
1. Genera la hoja inicial con los datos actuales: `npm run hoja:plantilla` (crea `hoja-hart.xlsx`).
2. Súbela a Google Drive y ábrela con Google Sheets (Archivo → Guardar como Hojas de cálculo de Google).
3. Convierte en casillas las columnas de verdadero/falso. Selecciona la columna y ve a **Insertar → Casilla de verificación**:
   - Colores: Playera, Premium, Oversize, Sudadera
   - Tallas: Activa
   - Configurador: Se ve mejor en prendas oscuras, Activo
   - Catálogo: Destacado, Activo
4. Comparte la hoja:
   - Con el dueño, como **Editor**.
   - En **Acceso general**, elige **Cualquier persona con el enlace → Lector**. GitHub Actions la descarga así; los datos ya son públicos en la página.
5. Crea una carpeta de Drive llamada "Imágenes HART" y compártela igual:
   - Con el dueño, como Editor.
   - Con "Cualquier persona con el enlace → Lector".
   Las imágenes que suba ahí heredan ese permiso.

### 2. GitHub
1. En el repositorio, ve a **Settings → Secrets and variables → Actions → Variables** y crea `SHEET_ID` con el id de la hoja (lo que va entre `/d/` y `/edit` en su URL).
2. Crea un token en **GitHub → Settings → Developer settings → Fine-grained tokens**:
   - Repositorio: solo `hart-project`.
   - Permisos: **Contents: Read and write** y **Actions: Read**.
   - Vencimiento: el máximo que permita. Anota la fecha para renovarlo.

### 3. Apps Script (la casilla Publicar)
1. Entra a [script.google.com](https://script.google.com) → **Nuevo proyecto**. Hazlo con tu cuenta; **no** uses Extensiones → Apps Script dentro de la hoja, porque desde ahí cualquier editor podría ver el token.
2. Pega el contenido de `scripts/google/publicar.gs`.
3. En **Configuración del proyecto → Propiedades de la secuencia de comandos**, agrega `HOJA_ID` y `GITHUB_TOKEN`.
4. Selecciona la función `instalar` → **Ejecutar** y acepta los permisos.
5. Prueba: en la hoja, pestaña **Publicar**, marca la casilla. En unos 2 minutos Estado debe decir "✅ Publicado".

## Uso diario (el dueño)

Las instrucciones también están en la pestaña **Instrucciones** de la hoja.

- **Editar:** cambia lo que necesites y marca la casilla en la pestaña **Publicar**.
- **Agregar una imagen:** súbela a la carpeta "Imágenes HART" desde la app de Drive. Luego toca ⋮ → Compartir → Copiar enlace, y pega el enlace en la celda.
- **Configurador:** el diseño solo, en PNG con fondo transparente y grande (1500 px o más; el DPI se calcula con ese tamaño).
- **Quitar algo sin borrarlo:** desmarca su casilla **Activo**.
- **Reglas del catálogo:**
  - No cambies la **Clave URL** de un diseño ya publicado.
  - Solo diseños propios. Si el texto menciona personajes con licencia, la publicación se rechaza.

## Mantenimiento

| Para | Comando |
|---|---|
| Probar una hoja descargada como .xlsx sin publicar | `node scripts/sync-hoja.mjs --archivo hoja.xlsx` |
| Traer la hoja real en local | `SHEET_ID=… npm run hoja:sync` |
| Regenerar la hoja inicial desde el repositorio | `npm run hoja:plantilla` |

- Los cortes son fijos (playera, premium, oversize, sudadera) porque el configurador y las fotos de la comparativa dependen de ellos. En la hoja se editan su nombre, precio y detalles.
- Las imágenes que vienen de Drive se recuerdan en `src/data/imagenes.json`. Solo se vuelven a descargar si cambia el enlace.
- **Si vence el token, la casilla deja de funcionar.** Estado dirá "No se pudo iniciar". Genera uno nuevo y reemplázalo en las propiedades del script.
