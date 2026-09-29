# Moments · réplica local

Reproducción local de https://moments.xocoweb.workers.dev/, capturada el 29 de septiembre de 2026. Conserva el HTML publicado, CSS, JavaScript, fotografías, iconos y tipografías para mantener la máxima fidelidad visual. Incluye 34 páginas distintas, las 19 historias y 972 recursos locales. El inventario registra además cuatro variantes de URL sin barra final.

## Abrir y trabajar

Requiere Node.js 22.12 o posterior.

```sh
npm install
npm run dev
```

Abrir http://localhost:4321. También se puede usar `INICIAR.cmd` en Windows. No abrir los HTML con doble clic: las rutas de imágenes y navegación necesitan el servidor local.

```sh
npm run build
npm run verify
npm run preview
```

`dist/` contiene la web estática lista para un servidor estático. No necesita conexión a la web original para cargar páginas, fotografías, CSS, iconos o fuentes. Los enlaces a redes y los embeds externos de la guía de estilo mantienen su destino original.

## Estructura y edición

- `src/reference/`: HTML de cada página; editar aquí textos, imágenes y estructura de cada ruta.
- `public/_astro/`: imágenes optimizadas y estilos publicados de la referencia.
- `public/fonts/`: fuentes originales locales.
- `src/pages/[...path].astro`: genera todas las rutas con Astro 7.
- `src/lib/reference.ts`: lectura de páginas y adaptación de las URLs al dominio local o al dominio de publicación.
- `src/config/site.ts`: configuración de proveedores de formularios.
- `reference-manifest.json`: inventario de rutas y recursos, con errores de descarga si los hubiera.

Esta es una reconstrucción de la **versión pública compilada**, dentro de un proyecto Astro 7 funcional. No es el código fuente privado del tema comercial: no contiene sus colecciones MDX, componentes originales ni configuraciones privadas. Los estilos publicados proceden de su compilación Tailwind; no se añade otra compilación que pudiera alterar la apariencia.

## Formularios

La demo original tiene desactivados los formularios de contacto y newsletter. La réplica conserva ese comportamiento. Para activarlos, completar `enquiryAction` y `newsletterAction` con los endpoints reales del proveedor elegido en `src/config/site.ts`; se habilitan los botones al reconstruir. No se simulan envíos ni suscripciones.

## Publicación

Definir `SITE_URL` con el dominio final antes de construir para actualizar canonical, Open Graph, JSON-LD y enlaces absolutos. Las fotografías y el diseño mantienen las atribuciones de la referencia; esta réplica no proporciona una licencia del tema ni de sus contenidos.
