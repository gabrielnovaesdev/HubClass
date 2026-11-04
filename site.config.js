// Fonte única do domínio e das páginas públicas. Canonical, og:url, JSON-LD,
// robots.txt e sitemap.xml são gerados a partir daqui.
//
// PENDENTE: confirmar o domínio definitivo do novo site. Para publicar em outro
// endereço, troque o valor abaixo ou rode o build com SITE_URL=https://... .
export const SITE_URL = (process.env.SITE_URL || 'https://hubclassmarketing.com.br').replace(/\/+$/, '');

// Só entram aqui páginas canônicas e indexáveis (a 404 fica de fora).
export const pages = [
  { path: '/', input: 'index.html' },
  { path: '/formacao-varejo/', input: 'formacao-varejo/index.html' },
  { path: '/assessoria-m7/', input: 'assessoria-m7/index.html' },
];
