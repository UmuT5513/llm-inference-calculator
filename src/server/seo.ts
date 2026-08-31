export type SeoLang = 'tr' | 'en';

let warnedAppUrl = false;

export function baseUrl(): string {
  const fallback = `http://localhost:${process.env.PORT || 3000}`;
  const url = (process.env.APP_URL || fallback).replace(/\/+$/, '');
  if (process.env.NODE_ENV === 'production' && !warnedAppUrl) {
    const appUrl = process.env.APP_URL || '';
    if (!appUrl || appUrl.includes('localhost')) {
      warnedAppUrl = true;
      console.warn('[seo] APP_URL is missing or set to localhost in production; set APP_URL to the public domain so sitemap/robots/og:url do not advertise localhost.');
    }
  }
  return url;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderSitemapXml(): string {
  const b = baseUrl();
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${b}/</loc></url>
  <url><loc>${b}/app</loc></url>
</urlset>`;
}

export function renderRobotsTxt(): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${baseUrl()}/sitemap.xml\n`;
}

export function webAppJsonLd(base: string, path: string, lang: SeoLang, description: string): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'LLM Hardware & Cost Architect',
    url: `${base}${path}`,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    inLanguage: lang,
    description,
  });
}

export function injectRouteMeta(
  html: string,
  opts: { lang: SeoLang; path: string; title: string; description: string; ogTitle: string; ogDescription: string }
): string {
  const b = baseUrl();
  const block = `
  <meta name="description" content="${esc(opts.description)}" />
  <meta property="og:title" content="${esc(opts.ogTitle)}" />
  <meta property="og:description" content="${esc(opts.ogDescription)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${b}${opts.path}" />
  <meta property="og:image" content="${b}/assets/og-image.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <script type="application/ld+json">${webAppJsonLd(b, opts.path, opts.lang, opts.description)}</script>`;
  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(opts.title)}</title>`)
    .replace('<!--APP_META-->', block);
}

export const appMeta: Record<SeoLang, { title: string; description: string }> = {
  tr: {
    title: 'LLM Hardware & Cost Architect — Inference ve Fine-Tuning Hesaplayıcı',
    description: 'Açık kaynak LLM\'ler için çıkarım (inference) ve fine-tuning donanım, VRAM ve maliyet hesaplayıcısı. Giriş gerektirmez, topluluğa açık ve ücretsizdir.',
  },
  en: {
    title: 'LLM Hardware & Cost Architect — Inference & Fine-Tuning Calculator',
    description: 'Free open-source LLM inference and fine-tuning calculator: VRAM, latency and cost. GPU comparison, live cloud prices and on-prem TCO analysis.',
  },
};
