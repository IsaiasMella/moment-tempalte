# Arquitectura del proyecto

Guía para entender cómo está armado el sitio, pensada para quien viene de **React / Next.js**.

## Mapa de carpetas

```
src/
  content/            ← CONTENIDO editable (lo que escribe el CMS)
    albums/*.md         un archivo por álbum (/story/<archivo>/)
    pages/*.yml         textos de Inicio, Estudio, Precios, Contacto, Privacidad
    settings/site.yml   nombre, menú, redes, pie de página, formularios
  content.config.ts   declara las colecciones y su esquema (validación)
  lib/                ← lógica en TypeScript, sin HTML
    schemas.ts          esquemas zod: la "forma" de cada archivo de contenido
    content.ts          funciones para leer el contenido (getSiteSettings, getPage, álbumes)
    archive.ts          listados paginados (Work, colecciones, etiquetas) y fechas
    images.ts           tamaño y variantes (srcset) de cada foto, en el build
    markdown.ts         Markdown mínimo (negrita, cursiva, enlaces…)
    site.ts             SEO, URLs absolutas, JSON-LD
    share.ts, icons.ts  enlaces para compartir, íconos SVG
  layouts/BaseLayout.astro  ← el "esqueleto" HTML de todas las páginas
  pages/              ← RUTAS: cada archivo es una URL
    index.astro         /
    studio.astro, pricing.astro, contact.astro, privacy.astro, styleguide.astro, 404.astro
    story/[slug].astro  /story/<álbum>/
    work/[...page].astro, collection/[category]/[...page].astro, tag/[tag]/[...page].astro
    story/media/[file].ts  genera las variantes WebP de las fotos subidas
    admin/index.astro   el panel del CMS (/admin/)
  components/         ← piezas reutilizables (.astro)
    album/              piezas del álbum: portada, bloques, foto, galería, cita…
    blocks/             tarjetas de la guía de estilo (callout, toggle, archivo…)
    home/, archive/     piezas de la portada y de los listados
  scripts/            ← JavaScript del navegador (menú, visor, galería, carrusel…)
  styles/             ← CSS: global.css importa todo en orden (ver CSS-COMPILADO-VS-FUENTE.md)
public/               ← archivos que se copian tal cual
  _astro/             fotos del tema ya optimizadas (con sus variantes de ancho)
  fonts/              tipografías locales
  uploads/            fotos subidas desde el CMS
  admin/              config.yml y preview.js del CMS
scripts/              ← tareas de Node: finalize.mjs (post-build) y verify.mjs (chequeo)
```

## Cómo fluye el contenido

```
src/content/albums/x.md ──(validado por schemas.ts)──► lib/content.ts ──► pages/story/[slug].astro ──► components/album/*
```

1. **Contenido**: un archivo Markdown/YAML. El CMS lo escribe; también se puede editar a mano.
2. **Validación**: `content.config.ts` asocia cada carpeta a un esquema de `lib/schemas.ts`. Si falta un campo obligatorio, **el build falla** con un mensaje claro (en vez de publicar una página rota).
3. **Lectura**: las páginas no llaman a `getCollection` directamente sino a funciones de `lib/content.ts` (`getSiteSettings()`, `getPage('pricing')`, `getAlbums()`), que devuelven datos tipados.
4. **Página**: el "frontmatter" (lo que está entre `---`) corre **en el build**, lee los datos y se los pasa a los componentes como props.
5. **Componentes**: reciben props y devuelven HTML. No hay React en el navegador.

## Equivalencias con Next.js

| Next.js (App Router) | Este proyecto (Astro) |
|---|---|
| `app/layout.tsx` | `src/layouts/BaseLayout.astro` (cada página lo usa explícitamente) |
| `app/pricing/page.tsx` | `src/pages/pricing.astro` |
| `app/story/[slug]/page.tsx` | `src/pages/story/[slug].astro` |
| `generateStaticParams()` | `export async function getStaticPaths()` |
| `params` | `Astro.params` (y `Astro.props` con lo que devuelve `getStaticPaths`) |
| `{children}` | `<slot />` (y `<slot name="head" />` para slots con nombre) |
| Componente de servidor | Componente `.astro`: **todo** corre en el build, nunca en el navegador |
| `"use client"` + `useEffect` | Un `<script>` dentro del componente que importa un módulo de `src/scripts/`. Astro lo empaqueta y lo carga **una sola vez** aunque el componente aparezca muchas veces |
| `next/image` | `components/ResponsiveImage.astro` + `lib/images.ts` |
| `metadata` / `generateMetadata` | props `title`, `description`, `ogImage` de `BaseLayout` → `components/SEO.astro` |
| `className` | `class` (y `class:list={[...]}` para clases condicionales, como `clsx`) |
| `dangerouslySetInnerHTML` | `<Fragment set:html={html} />` |
| Estilos de módulo CSS | `<style>` dentro del `.astro` (queda aislado al componente) |

Diferencia clave: en Next.js el componente puede volver a ejecutarse en el navegador; en Astro el `.astro` produce HTML estático y **no hay estado**. La interactividad (abrir el menú, el visor de fotos) son scripts pequeños que buscan elementos con atributos `data-*` y les agregan comportamiento.

## Orden de lectura recomendado

1. `src/content/albums/the-case-for-film.md` — cómo se ve un álbum como dato.
2. `src/lib/schemas.ts` y `src/content.config.ts` — qué forma debe tener.
3. `src/lib/content.ts` — cómo se lee.
4. `src/layouts/BaseLayout.astro` — el esqueleto (head, header, footer, `<slot />`).
5. `src/pages/pricing.astro` — la página más simple.
6. `src/pages/story/[slug].astro` → `components/album/Blocks.astro` → `Figure.astro`, `Gallery.astro`.
7. `src/components/ResponsiveImage.astro` + `src/lib/images.ts` — imágenes.
8. `src/components/album/Gallery.astro` + `src/scripts/gallery.ts` — un componente con JavaScript.
9. `src/styles/global.css` — cómo se arma el CSS.
10. `public/admin/config.yml` — cómo el CMS describe los mismos campos.

## Cómo agregar una página nueva

Ejemplo: `/faq/`.

1. Crear `src/pages/faq.astro`:

   ```astro
   ---
   import BaseLayout from '../layouts/BaseLayout.astro';
   import PageHead from '../components/PageHead.astro';
   import Prose from '../components/Prose.astro';
   ---
   <BaseLayout title="FAQ" description="Preguntas frecuentes.">
     <PageHead title="FAQ" lede="Lo que más me preguntan." />
     <div class="wrap section-tight"><Prose><h2>¿Viajás?</h2><p>Sí.</p></Prose></div>
   </BaseLayout>
   ```

2. Agregarla al menú desde el CMS (Configuración → Menú) o en `src/content/settings/site.yml`.

Para que sea **editable desde el CMS**:

1. Crear `src/content/pages/faq.yml` con los textos.
2. En `src/lib/schemas.ts`, definir `faqPageSchema` (y exportar su tipo).
3. En `src/content.config.ts`, agregar `faqPage: defineCollection({ loader: page('faq'), schema: faqPageSchema })`.
4. En `src/lib/content.ts`, sumar `faq` a `PageContent` y `pageCollection`.
5. En la página: `const page = await getPage('faq');`.
6. En `public/admin/config.yml`, agregar una entrada en la colección `pages` con **los mismos campos** y `preview_path: faq/`.

## Cómo agregar una sección (componente)

1. Crear `src/components/home/MiSeccion.astro` con sus `interface Props`.
2. Si tiene estilos propios, ponerlos en `src/styles/components/mi-seccion.css` e importarlo en `global.css` (al final, para no alterar el orden de lo existente), o en un `<style>` dentro del componente.
3. Si necesita JavaScript, crear `src/scripts/mi-seccion.ts` e importarlo desde un `<script>` en el componente.
4. Usarla en la página: `<MiSeccion titulo={page.algo} />`.

## Cómo se conecta el CMS

- `/admin/` lo sirve `src/pages/admin/index.astro`, que carga Sveltia CMS y `public/admin/preview.js`.
- `public/admin/config.yml` describe colecciones y campos. **Cada campo debe coincidir** con el esquema de `src/lib/schemas.ts`: el CMS escribe los archivos de `src/content/` y Astro los valida al compilar.
- El CMS **no** llama a ningún servidor propio: guarda archivos (en la carpeta local o como commits en GitHub) y el sitio se reconstruye.
- La vista previa de álbumes (`preview.js`) reproduce el marcado de `components/album/*` y usa el CSS real del sitio: `admin/index.astro` obtiene la URL del CSS compilado con `import siteStyles from '../../styles/global.css?url'` y se la pasa a `preview.js` en el atributo `data-styles`.
- Páginas y configuración no tienen vista previa propia: usan el botón **Ver en el sitio** (`preview_path`).

Más detalles de uso: [CMS.md](CMS.md).
