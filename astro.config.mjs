import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

/** Pages kept out of the sitemap (not meant to be found through search). */
const unlisted = ['/404/', '/admin/', '/styleguide/'];

export default defineConfig({
  site: process.env.SITE_URL || 'http://localhost:4321',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  server: { port: 4321, host: '127.0.0.1' },
  // sitemap-index.xml + sitemap-0.xml, listing every built page (new albums,
  // tags and listing pages included automatically). robots.txt points to it.
  integrations: [sitemap({ filter: (page) => !unlisted.some((path) => new URL(page).pathname === path) })],
  vite: { plugins: [tailwindcss()] },
});
