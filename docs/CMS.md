# Panel de administración (Sveltia CMS)

El sitio incluye un panel en **`/admin/`** para editar álbumes, páginas y datos generales sin tocar código. Funciona con [Sveltia CMS](https://sveltiacms.app): cada cambio se guarda como archivo dentro del proyecto (`src/content/…` para textos, `public/uploads/` para fotos) y el sitio se reconstruye con esos archivos.

- Configuración del panel: `public/admin/config.yml`
- Página del panel: `src/pages/admin/index.astro`
- Vista previa de álbumes con el diseño real: `public/admin/preview.js`
- Fotos subidas desde el panel: `public/uploads/`

El idioma del panel sigue al del navegador: con el navegador en español se muestra en español. Se puede cambiar desde el menú de la cuenta → **Configuración**.

---

## 1. Probar en la computadora (local)

Requisitos: Node.js 22.12 o posterior y **Google Chrome o Microsoft Edge** (Firefox y Safari no permiten el modo local).

1. En la carpeta del proyecto, instalar y arrancar el sitio:

   ```sh
   npm install
   npm run dev
   ```

   En Windows también se puede hacer doble clic en `INICIAR.cmd`.

2. Abrir **http://127.0.0.1:4321/admin/** en Chrome o Edge.
3. Hacer clic en **“Trabajar con un repositorio local”**.
4. Elegir la **carpeta del proyecto** (la que contiene `package.json` y la carpeta `.git`) y aceptar el permiso de edición que pide el navegador.
5. Editar lo que haga falta y apretar **Guardar**. El panel escribe directamente en los archivos del proyecto.
6. Para ver el resultado, abrir http://127.0.0.1:4321/ en otra pestaña y **recargar la página**.
7. Cuando todo esté bien, publicar los cambios con Git (o con GitHub Desktop):

   ```sh
   git add -A
   git commit -m "Nuevo álbum: Ana & Iñaki"
   git push
   ```

> En modo local el panel **no** hace commits ni `push`: solo modifica archivos. Hay que subirlos con Git.

---

## 2. Crear un álbum con galería de fotos

1. En **Álbumes**, botón **Nuevo**.
2. Completar lo básico:
   - **Título** (por ejemplo “Ana & Iñaki”). La dirección de la página se genera sola: `/story/ana-inaki/`.
   - **Fecha**, **Categoría** (Bodas / Retratos), **Lugar**.
   - **Portada**: subir la foto principal y escribir una breve descripción de lo que se ve.
   - **Bajada**: una o dos frases que resumen el álbum.
3. En **Contenido del álbum**, usar **Agregar bloque** y elegir el tipo:
   - **Texto**: párrafos con negrita, cursiva y enlaces.
   - **Título de sección**.
   - **Foto**: una foto sola, en tamaño normal, ancho o pantalla completa.
   - **Cita**: una frase destacada, con autor opcional.
   - **Galería de fotos**: varias fotos acomodadas en filas, sin recortes.
4. En la galería, **Agregar foto** una vez por cada foto. El orden de la lista es el orden en la web y se cambia arrastrando.
   **Consejo para muchas fotos:** primero abrir **Recursos** (ícono de fotos en la barra superior), en la carpeta **Recursos globales**, y subir todas juntas (se pueden arrastrar varias a la vez). Después, en cada foto de la galería, **Explorar** y elegirla de la lista.
5. Mientras se arma, dejar **Borrador** activado: el álbum no aparece en la web. Al terminar, desactivarlo y **Guardar**.
6. **Destacado en la portada** muestra el álbum en la página de inicio (hasta 3).

Sobre las fotos:

- Al subirlas se convierten **solas a WebP** y se achican a **2400 px** en el lado más largo (calidad 82). No hace falta prepararlas antes. Se aceptan JPEG, PNG, HEIC (iPhone), AVIF y WebP de hasta 40 MB.
- El sitio genera además las versiones más chicas para celulares al compilar.
- El nombre del archivo se normaliza (“Foto Boda 1.JPG” → `foto-boda-1.webp`).

En la lista de álbumes se puede **Ordenar** (fecha, título, lugar, categoría), **Filtrar** (publicados, borradores, destacados, bodas, retratos, notas) y **Agrupar** (por categoría o por año).

---

## 3. Inicio de sesión en el sitio publicado (Cloudflare + GitHub)

En el sitio publicado, el panel guarda los cambios **directamente en GitHub** (cada “Guardar” es un commit en la rama `main`), y el hosting vuelve a publicar la web. Para iniciar sesión con GitHub hace falta un pequeño servicio gratuito en Cloudflare: **sveltia-cms-auth**. Se configura una sola vez.

### Paso 1 · Crear el Worker en Cloudflare

1. Crear una cuenta gratis en https://dash.cloudflare.com (si no hay una).
2. Abrir https://github.com/sveltia/sveltia-cms-auth y hacer clic en el botón **Deploy to Cloudflare Workers** (o ir directo a https://deploy.workers.cloudflare.com/?url=https://github.com/sveltia/sveltia-cms-auth) y seguir el asistente.
3. Al terminar, en el panel de Cloudflare → **Workers & Pages** → servicio **`sveltia-cms-auth`**, copiar la URL del Worker. Tiene esta forma:
   `https://sveltia-cms-auth.TU-SUBDOMINIO.workers.dev`

### Paso 2 · Registrar una OAuth App en GitHub

1. Ir a https://github.com/settings/applications/new (GitHub → Settings → Developer settings → OAuth Apps → New OAuth App).
2. Completar:
   - **Application name**: `Sveltia CMS Authenticator` (o cualquier nombre)
   - **Homepage URL**: la dirección del sitio (o `https://github.com/sveltia/sveltia-cms-auth`)
   - **Authorization callback URL**: la URL del Worker **seguida de `/callback`**, por ejemplo
     `https://sveltia-cms-auth.TU-SUBDOMINIO.workers.dev/callback`
3. Registrar la app y hacer clic en **Generate a new client secret**. Guardar el **Client ID** y el **Client Secret**.

### Paso 3 · Variables del Worker

En Cloudflare → servicio `sveltia-cms-auth` → **Settings** → **Variables**, agregar:

| Variable | Valor |
| --- | --- |
| `GITHUB_CLIENT_ID` | el Client ID del paso 2 |
| `GITHUB_CLIENT_SECRET` | el Client Secret del paso 2 (usar **Encrypt** para ocultarlo) |
| `ALLOWED_DOMAINS` | el dominio del sitio, por ejemplo `www.mifotografia.com` (varios separados por coma; `*.mifotografia.com` para subdominios). Opcional pero **muy recomendado**: impide que otros sitios usen tu Worker. |

Guardar y desplegar (**Save and deploy**).

### Paso 4 · Poner la URL en la configuración del panel

En `public/admin/config.yml`, reemplazar el valor de `base_url` por la URL del Worker (sin `/callback`):

```yaml
backend:
  name: github
  repo: IsaiasMella/moment-tempalte
  branch: main
  base_url: https://sveltia-cms-auth.TU-SUBDOMINIO.workers.dev
```

Hacer commit y push. Cuando el sitio se vuelva a publicar, entrar a `https://tu-dominio/admin/` → **Iniciar sesión con GitHub**.

Quien edite necesita una **cuenta de GitHub con permiso de escritura** en el repositorio `IsaiasMella/moment-tempalte` (GitHub → repositorio → Settings → Collaborators).

---

## 4. Limitaciones

- **Galerías: se agrega foto por foto.** Cada foto de una galería tiene su propia descripción, epígrafe y crédito, así que no existe un botón para crear muchas entradas de galería de una vez. Para agilizar, subir primero todas las fotos juntas en **Recursos** y después elegirlas.
- **Modo local solo en Chrome/Edge** (escritorio). En el sitio publicado funciona en cualquier navegador moderno, también en el celular.
- **Sin vista previa con el diseño real.** El panel muestra un formulario; para ver cómo queda, recargar el sitio local o esperar la publicación.
- **Cada guardado en producción es un commit** y dispara una nueva publicación del sitio (puede tardar un par de minutos en verse).
- **Cambiar el título de un álbum no cambia su dirección.** La dirección (`/story/…/`) se fija al crearlo, para no romper enlaces ya compartidos. Para cambiarla hay que renombrar el archivo en `src/content/albums/`.
- **Etiquetas:** solo Destination, Elopements e Intimate tienen página propia; por eso el panel ofrece solo esas.
- **Formato de textos:** en los bloques de texto de los álbumes solo se usan negrita, cursiva y enlaces; en Estudio y Privacidad también títulos, listas y citas.
- **Las fotos originales del tema** (`public/_astro/`) se ven en Recursos como solo lectura; se pueden reutilizar pero no borrar desde el panel.
- **No borrar ni renombrar campos** en `config.yml` sin cambiar también los esquemas en `src/lib/albums/schema.ts` y `src/lib/pages/schema.ts`: si no coinciden, la compilación falla.
