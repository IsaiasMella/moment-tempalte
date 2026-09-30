# CSS compilado vs. CSS fuente

## Qué hay en cada lugar
| Archivo | Qué es |
|---|---|
| `public/_astro/PageLayout.cuBU2wuV.css` | El CSS **compilado** tal como se publicó: 2 líneas, minificado, con Tailwind ya generado. |
| `docs/estudio/compilado-formateado.css` | El mismo archivo, solo con saltos de línea para poder leerlo. Mismo contenido, sin organización. |
| `src/styles/` | El CSS **fuente reconstruido**: así lo tendría el autor del tema. |

## Cómo está organizado `src/styles/`
- `global.css`: punto de entrada. Importa Tailwind y todo lo demás **en orden**.
- `tokens.css`: tokens de diseño (colores, tipografías, medidas, animaciones) y su versión para modo oscuro.
- `fonts.css`: las fuentes locales.
- `base.css`: estilos generales (body, enlaces, foco).
- `components/*.css`: un archivo por componente, cada uno con un comentario que dice qué estiliza.

## Qué se perdió al compilar y cómo se recuperó
1. **La división en archivos:** en el compilado todo está en uno solo. Se recuperó siguiendo el orden original: el compilador concatena los archivos uno detrás de otro, así que cada "tramo" del archivo corresponde a un componente.
2. **Tailwind:** el compilado trae el reset y las utilidades ya generados (miles de líneas). En el fuente es una sola línea, `@import "tailwindcss";`, y Tailwind los vuelve a generar.
3. **Algunos tokens:** había colores y tiempos repetidos a mano (texto blanco sobre fotos, fondo del visor, duraciones). Se convirtieron en tokens nuevos, al final de `tokens.css`.

## La lección más importante: el orden importa
El primer intento agrupó las reglas por componente **cambiando su orden**, y el sitio se rompió: galerías más altas, tarjetas desplazadas. En CSS, cuando dos reglas tienen la misma prioridad, gana la que está más abajo. Por eso `global.css` importa los archivos exactamente en el orden original.

## Verificación
Se compararon con capturas 12 páginas, en escritorio y celular, en modo claro y oscuro: CSS compilado original contra CSS generado desde `src/styles/`. Son **idénticas**. Las únicas diferencias están en páginas con carrusel o grillas animadas, y esas páginas también difieren al comparar el original contra sí mismo.

## Señales de un template bien o mal hecho
- ✅ Colores y tipografías en variables (`--accent`, `--font-display`), no repetidos a mano.
- ✅ Un archivo o bloque por componente, con nombres de clase que describen qué son (`.gallery-frame`, `.post-hero`).
- ⚠️ El mismo color escrito 10 veces en distintos archivos.
- ⚠️ `!important` por todos lados: señal de que peleaban contra su propio CSS.
- ⚠️ Estilos que dependen del orden de forma frágil: cambiás un import de lugar y se rompe algo en otra página.
