import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Injeta os trechos compartilhados (<!-- @partial nome -->) em todas as páginas,
// para que cabeçalho, rodapé e CTA final sejam idênticos na home e nas internas.
const partials = () => ({
  name: 'html-partials',
  transformIndexHtml(html) {
    return html.replace(/<!--\s*@partial\s+([\w-]+)\s*-->/g, (_, name) =>
      readFileSync(resolve(__dirname, 'src/partials', `${name}.html`), 'utf8'),
    );
  },
});

export default defineConfig({
  plugins: [partials()],
  build: {
    rollupOptions: {
      input: {
        home: resolve(__dirname, 'index.html'),
        formacao: resolve(__dirname, 'formacao-varejo/index.html'),
        m7: resolve(__dirname, 'assessoria-m7/index.html'),
      },
    },
  },
});
