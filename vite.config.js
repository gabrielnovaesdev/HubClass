import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SITE_URL, pages } from './site.config.js';

// Injeta os trechos compartilhados (<!-- @partial nome -->) em todas as páginas,
// para que cabeçalho, rodapé e CTA final sejam idênticos na home e nas internas.
// Também troca %SITE_URL% pelo domínio definido em site.config.js.
const partials = () => ({
  name: 'html-partials',
  transformIndexHtml(html) {
    return html
      .replace(/<!--\s*@partial\s+([\w-]+)\s*-->/g, (_, name) =>
        readFileSync(resolve(__dirname, 'src/partials', `${name}.html`), 'utf8'),
      )
      .replaceAll('%SITE_URL%', SITE_URL);
  },
});

const robotsTxt = () => `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
const sitemapXml = () =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  pages.map((p) => `  <url><loc>${SITE_URL}${p.path}</loc></url>\n`).join('') +
  `</urlset>\n`;

// robots.txt e sitemap.xml saem do mesmo cadastro de páginas, no build e no servidor local.
const seoFiles = () => ({
  name: 'seo-files',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url === '/robots.txt') return res.setHeader('Content-Type', 'text/plain; charset=utf-8'), res.end(robotsTxt());
      if (req.url === '/sitemap.xml') return res.setHeader('Content-Type', 'application/xml; charset=utf-8'), res.end(sitemapXml());
      next();
    });
  },
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robotsTxt() });
    this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemapXml() });
  },
});

// Servidores locais (dev e preview) nunca devem ser indexados.
const noindex = { 'X-Robots-Tag': 'noindex, nofollow' };

export default defineConfig({
  plugins: [partials(), seoFiles()],
  server: { headers: noindex },
  preview: { headers: noindex },
  build: {
    rollupOptions: {
      input: {
        ...Object.fromEntries(pages.map((p) => [p.path === '/' ? 'home' : p.path.replaceAll('/', ''), resolve(__dirname, p.input)])),
        notFound: resolve(__dirname, '404.html'),
      },
    },
  },
});
