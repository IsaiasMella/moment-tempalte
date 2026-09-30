# Errores comunes en templates (y cómo los evita este proyecto)

Cada punto: qué es el problema, dónde lo resuelve este proyecto y cómo detectarlo vos mismo.
Herramientas: **DevTools** (F12) de Chrome/Edge y **Lighthouse** (pestaña Lighthouse de DevTools).

## 1. Parpadeo del tema (modo oscuro que "salta")
**Problema:** la página se pinta clara y medio segundo después pasa a oscura, porque el script que lee la preferencia se carga tarde.
**Acá:** `src/components/ThemeScript.astro` es un `<script is:inline>` dentro del `<head>`: corre **antes** del primer pintado y pone `data-theme` en `<html>`.
**Cómo detectarlo:** elegí modo oscuro, recargá con DevTools → Network → throttling "Slow 4G". Si ves un destello claro, el script llega tarde (típico si está al final del `<body>` o con `defer`).

## 2. FOUT (texto que cambia de tipografía al cargar)
**Problema:** el texto aparece con una fuente del sistema y luego "salta" a la definitiva, moviendo todo.
**Acá:** las fuentes son locales (`public/fonts/`), se declaran en `src/styles/fonts.css` con `font-display: swap`, y las dos más usadas se precargan con `<link rel="preload" as="font">` en `BaseLayout.astro`.
**Cómo detectarlo:** DevTools → Network → filtro "Font": las fuentes deben aparecer al principio de la cascada, no al final. Lighthouse avisa con "Ensure text remains visible during webfont load".

## 3. CLS (el contenido se mueve mientras cargan las fotos)
**Problema:** una `<img>` sin `width`/`height` ocupa 0 px hasta que llega, y después empuja todo hacia abajo.
**Acá:** `src/components/ResponsiveImage.astro` siempre escribe `width` y `height` (los lee `src/lib/images.ts` del archivo real en el build), así el navegador reserva el espacio.
**Cómo detectarlo:** Lighthouse → métrica **Cumulative Layout Shift** (debe ser < 0.1). DevTools → Performance → marcá "Layout shifts" y grabá una carga.

## 4. Demasiado JavaScript
**Problema:** templates que cargan un framework entero (React, jQuery, librerías de sliders) para abrir un menú.
**Acá:** los `.astro` generan HTML estático. Solo hay scripts chicos en `src/scripts/`, y cada uno se carga únicamente en las páginas cuyo componente lo usa (por ejemplo `gallery.ts` solo donde hay galerías).
**Cómo detectarlo:** DevTools → Network → filtro "JS" y mirá el total transferido. DevTools → Coverage (Ctrl+Shift+P → "Coverage") muestra cuánto JS no se usa. Lighthouse: "Reduce unused JavaScript".

## 5. Animaciones que esconden el contenido si falla el JavaScript
**Problema:** el CSS pone `opacity: 0` a los elementos "para animarlos al aparecer"; si el script no corre (error, bloqueador, buscador), la página queda en blanco.
**Acá:** las reglas de aparición empiezan con `.js [data-reveal]` (`src/styles/components/motion.css`). La clase `js` la pone `ThemeScript` en `<html>`: sin JavaScript no hay clase y todo se ve.
**Cómo detectarlo:** DevTools → Ctrl+Shift+P → "Disable JavaScript" y recargá: todo el contenido debe verse. También respetamos `prefers-reduced-motion` (DevTools → Rendering → "Emulate CSS prefers-reduced-motion").

## 6. Cascada / orden del CSS
**Problema:** mover un `@import` de lugar y que se rompa otra página, porque con igual especificidad gana la regla que está más abajo.
**Acá:** `src/styles/global.css` importa los archivos en un orden fijo y comentado (Tailwind → tokens → fuentes → base → componentes). Ver [CSS-COMPILADO-VS-FUENTE.md](CSS-COMPILADO-VS-FUENTE.md).
**Cómo detectarlo:** DevTools → Elements → panel Styles: las reglas tachadas muestran cuál ganó y de qué archivo viene.

## 7. Scripts duplicados
**Problema:** pegar el mismo `<script>` en cada componente hace que se ejecute N veces (N menús, N listeners).
**Acá:** los `<script>` de los componentes importan módulos (`import '../scripts/gallery'`). Astro los empaqueta y los incluye **una vez por página**, aunque haya tres galerías.
**Cómo detectarlo:** DevTools → Sources/Network: cada script debe aparecer una sola vez. En la consola, `getEventListeners(window)` muestra si un evento se registró varias veces.

## 8. Imágenes enormes
**Problema:** servir una foto de 6000 px y 8 MB a un celular.
**Acá:** cada foto tiene variantes WebP de varios anchos y un `srcset` + `sizes` (`src/lib/images.ts`). Las fotos subidas desde el CMS se redimensionan en el build (`src/pages/story/media/[file].ts`). `src/scripts/autosize.ts` ajusta `sizes` al ancho real renderizado.
**Cómo detectarlo:** DevTools → Network → filtro "Img": mirá el tamaño transferido y, al pasar el mouse sobre una `<img>` en Elements, "Intrinsic size" vs "Rendered size". Lighthouse: "Properly size images" y "Serve images in modern formats".

## 9. Contenido sin validar
**Problema:** un campo mal escrito en el CMS rompe una página en producción sin avisar.
**Acá:** cada archivo de `src/content/` se valida con los esquemas de `src/lib/schemas.ts`; si algo falta, **falla el build** y no se publica. Después del build, `npm run verify` revisa que todos los enlaces e imágenes internos existan.
**Cómo detectarlo:** `npm run build` y leer el error; `npm run verify`.
