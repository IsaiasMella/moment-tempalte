# Moments · tema Astro para fotografía de bodas

Sitio estático para un fotógrafo de bodas y retratos, hecho con **Astro 7**: portada con foto a pantalla completa, muro de trabajos, álbumes con galerías que no recortan las fotos, páginas de Estudio, Precios, Contacto y Privacidad, modo claro/oscuro y un panel de edición (**Sveltia CMS**) en `/admin/`.

Está pensado también para **estudiar**: cada página y componente tiene comentarios que explican qué hace y su equivalente en React/Next.js.

## Requisitos

- Node.js **22.12** o posterior.
- Para el panel en modo local: Chrome o Edge de escritorio.

## Comandos

```sh
npm install        # una vez
npm run dev        # sitio en http://127.0.0.1:4321 (y el panel en /admin/)
npm run build      # genera dist/ (sitio estático listo para publicar)
npm run verify     # revisa que todos los enlaces e imágenes internos de dist/ existan
npm run preview    # sirve dist/ localmente
npx astro check    # chequeo de tipos
```

En Windows se puede hacer doble clic en `INICIAR.cmd` (instala si hace falta y arranca `npm run dev`).

Antes de publicar, definir `SITE_URL` con el dominio final (por ejemplo `SITE_URL=https://mi-dominio.com npm run build`) para que canonical, Open Graph, sitemap y JSON-LD usen esa dirección.

## Dónde editar

| Quiero cambiar… | Dónde |
|---|---|
| Álbumes, textos de páginas, menú, redes, formularios | Panel `/admin/`, o los archivos de `src/content/` |
| Diseño de una página | `src/pages/*.astro` |
| Una pieza reutilizable (portada, galería, tarjeta…) | `src/components/` |
| Colores, tipografías, medidas | `src/styles/tokens.css` |
| Estilos de un componente | `src/styles/components/*.css` |
| Comportamiento en el navegador (menú, visor, carrusel) | `src/scripts/` |
| Campos del panel | `public/admin/config.yml` + `src/lib/schemas.ts` (deben coincidir) |

**Formularios:** contacto y newsletter están desactivados hasta cargar la URL del proveedor (por ejemplo Formspree) en el panel: **Configuración → Formularios**.

## Documentación

- [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md): mapa de carpetas, cómo fluye el contenido, equivalencias con Next.js, orden de lectura, cómo agregar páginas.
- [docs/ERRORES-COMUNES.md](docs/ERRORES-COMUNES.md): problemas típicos de templates y cómo los evita este proyecto.
- [docs/CMS.md](docs/CMS.md): uso del panel, modo local y publicación con GitHub.
- [docs/CSS-COMPILADO-VS-FUENTE.md](docs/CSS-COMPILADO-VS-FUENTE.md): cómo se organizó el CSS y por qué importa el orden.

## Créditos

Diseño basado en la demo pública de *Moments* (https://moments.xocoweb.workers.dev/). Las fotografías y el diseño mantienen las atribuciones de esa referencia; este proyecto no otorga una licencia del tema ni de sus contenidos.
