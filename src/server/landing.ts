import type { Request } from 'express';
import { getPool } from './db';
import { MODEL_CATALOG } from '../data/modelCatalog';
import { isTextPipeline, isFormatBlocked, isDerivativeBlocked } from './knownOrgs';
import { webAppJsonLd } from './seo';

type Lang = 'tr' | 'en';

export function pickLandingLang(req: Request): Lang {
  const q = String(req.query?.lang ?? '').toLowerCase();
  if (q === 'tr' || q === 'en') return q;
  const cookie = req.headers?.cookie || '';
  if (cookie.includes('llmcalc_lang=en')) return 'en';
  if (cookie.includes('llmcalc_lang=tr')) return 'tr';
  const al = String(req.headers?.['accept-language'] || '').toLowerCase();
  return al.includes('tr') ? 'tr' : 'en';
}

export async function countVisibleModels(): Promise<number> {
  try {
    const pool = getPool();
    const { rows } = await pool.query('SELECT hf_id, curated, raw_json FROM hf_models');
    return rows.filter(
      (r: any) =>
        r.curated ||
        (isTextPipeline(r.raw_json?.pipeline ?? null) &&
          !isFormatBlocked(r.hf_id) &&
          !isDerivativeBlocked(r.hf_id))
    ).length;
  } catch (err) {
    console.warn('[landing] model count unavailable, using static catalog:', err);
    return MODEL_CATALOG.length;
  }
}

interface Copy {
  heroBadge: string;
  heroTitle: string;
  heroSub: string;
  cta: string;
  cardsTitle: string;
  cardsSub: string;
  f1Title: string;
  f1Sub: string;
  f2Title: string;
  f2Sub: string;
  f3Title: string;
  f3Sub: string;
  modelStat: string;
  footerNote: string;
  footerSource: string;
  footerFeedback: string;
  metaTitle: string;
  metaDescription: string;
}

const COPY: Record<Lang, Copy> = {
  tr: {
    heroBadge: 'Açık kaynak LLM hesaplama aracı',
    heroTitle: 'Inference ve fine-tuning’i planlayın — donanım, VRAM ve maliyet.',
    heroSub: 'Açık kaynak LLM\'leri yüzlerce modellik katalogla karşılaştırın; canlı bulut fiyatları, TCO ve token maliyeti analizi. Giriş gerekmez, ücretsizdir.',
    cta: 'Hemen Hesapla →',
    cardsTitle: 'Gerçek senaryolar, gerçek rakamlar',
    cardsSub: 'Bu kartlar sunucuda aynı hesap motoruyla hesaplanır; her biri uygulamada düzenlenebilir.',
    f1Title: 'Çıkarım (Inference)',
    f1Sub: 'TTFT, TPOT, token/s ve VRAM — 8B’den 671B MoE’ye kadar.',
    f2Title: 'Fine-Tuning',
    f2Sub: 'QLoRA, LoRA ve tam ince ayar için GPU süresi, VRAM ve platform maliyeti.',
    f3Title: 'Canlı Bulut Fiyatları',
    f3Sub: 'RunPod, Lambda ve Modal’dan anlık GPU fiyatları; on-prem TCO kıyası.',
    modelStat: 'katalogdaki açık kaynak model',
    footerNote: 'Verileriniz yalnızca tarayıcınızda saklanır • Giriş gerekmez',
    footerSource: 'GitHub',
    footerFeedback: 'Geri Bildirim',
    metaTitle: 'LLM Hardware & Cost Architect — Inference ve Fine-Tuning Hesaplayıcı',
    metaDescription: 'Açık kaynak LLM\'ler için inference ve fine-tuning VRAM, hız ve maliyet hesaplayıcısı. Canlı bulut fiyatları ve on-prem TCO analizi.',
  },
  en: {
    heroBadge: 'Open-source LLM calculator',
    heroTitle: 'Plan inference & fine-tuning — hardware, VRAM and cost.',
    heroSub: 'Compare open-source LLMs across a catalog of hundreds of models; live cloud prices, TCO and per-token cost analysis. No sign-up, free.',
    cta: 'Start Calculating →',
    cardsTitle: 'Real scenarios, real numbers',
    cardsSub: 'These cards are computed server-side by the same calculator engine; each is editable in the app.',
    f1Title: 'Inference',
    f1Sub: 'TTFT, TPOT, tokens/s and VRAM — from 8B to 671B MoE.',
    f2Title: 'Fine-Tuning',
    f2Sub: 'GPU hours, VRAM and platform cost for QLoRA, LoRA and full fine-tuning.',
    f3Title: 'Live Cloud Prices',
    f3Sub: 'Up-to-date GPU prices from RunPod, Lambda and Modal; on-prem TCO comparison.',
    modelStat: 'open-source models in the catalog',
    footerNote: 'Your data stays in your browser • No sign-up',
    footerSource: 'GitHub',
    footerFeedback: 'Feedback',
    metaTitle: 'LLM Hardware & Cost Architect — Inference & Fine-Tuning Calculator',
    metaDescription: 'VRAM, speed and cost calculator for open-source LLM inference and fine-tuning. Live cloud prices and on-prem TCO analysis.',
  },
};

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderLandingPage(req: Request, cardsHtml: string, modelCount: number): string {
  const lang = pickLandingLang(req);
  const c = COPY[lang];
  const base = `http://localhost:${process.env.PORT || 3000}`;
  const appUrl = (process.env.APP_URL || base).replace(/\/+$/, '');
  const langToggle = (['tr', 'en'] as const)
    .map(
      (l) =>
        `<a href="/?lang=${l}" data-lang="${l}" class="${l === lang ? 'active' : ''}">${l.toUpperCase()}</a>`
    )
    .join('');

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
<title>${esc(c.metaTitle)}</title>
<meta name="description" content="${esc(c.metaDescription)}" />
<meta property="og:title" content="${esc(c.metaTitle)}" />
<meta property="og:description" content="${esc(c.metaDescription)}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${appUrl}/" />
<meta property="og:image" content="${appUrl}/assets/og-image.png" />
<meta name="twitter:card" content="summary_large_image" />
<script type="application/ld+json">${webAppJsonLd(appUrl, '/', lang, c.metaDescription)}</script>
<style>
  :root { --bg:#0f0e0d; --surface:#171615; --surface2:#1e1d1b; --border:#2a2826; --text:#edeae6; --muted:#8e8b8b; --accent:#ffb224; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--text); font-family: Inter, system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
  .wrap { max-width: 1080px; margin: 0 auto; padding: 0 24px; }
  header.site { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid var(--border); }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand .logo { width: 36px; height: 36px; background: var(--accent); color: var(--bg); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-family: "JetBrains Mono", monospace; font-weight: 800; font-size: 20px; }
  .brand .name { font-weight: 700; font-size: 15px; font-family: "JetBrains Mono", monospace; }
  .lang a { color: var(--muted); font-size: 12px; font-weight: 700; margin-left: 10px; text-decoration: none; }
  .lang a.active { color: var(--accent); }
  main { padding: 72px 24px 48px; }
  .hero { text-align: center; max-width: 760px; margin: 0 auto 72px; }
  .hero .badge { display: inline-block; font-size: 12px; font-weight: 700; color: var(--accent); border: 1px solid var(--border); border-radius: 999px; padding: 6px 14px; margin-bottom: 20px; }
  .hero h1 { font-size: clamp(30px, 5vw, 52px); line-height: 1.1; letter-spacing: -0.02em; margin-bottom: 18px; }
  .hero p { color: var(--muted); font-size: 17px; line-height: 1.6; margin-bottom: 32px; }
  .cta { display: inline-block; background: var(--accent); color: var(--bg); font-weight: 800; font-size: 16px; padding: 14px 28px; border-radius: 10px; text-decoration: none; }
  section h2 { font-size: 26px; margin-bottom: 8px; }
  section .sub { color: var(--muted); font-size: 15px; margin-bottom: 28px; }
  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px; margin-bottom: 72px; }
  .card { display: block; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 18px; text-decoration: none; color: inherit; transition: border-color 0.15s, transform 0.15s; }
  .card:hover { border-color: var(--accent); transform: translateY(-2px); }
  .card-model { font-weight: 700; font-size: 15px; margin-bottom: 4px; }
  .card-gpu { color: var(--muted); font-size: 13px; margin-bottom: 14px; }
  .card-metrics { display: flex; flex-wrap: wrap; gap: 8px; }
  .metric { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; font-size: 12px; color: var(--muted); }
  .metric b { color: var(--text); font-family: "JetBrains Mono", monospace; font-size: 14px; }
  .card-oom { margin-top: 10px; color: #f85149; font-size: 12px; font-weight: 700; }
  .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 72px; }
  .feature { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
  .feature h3 { font-size: 16px; color: var(--accent); margin-bottom: 8px; }
  .feature p { color: var(--muted); font-size: 14px; line-height: 1.5; }
  .stat { text-align: center; color: var(--muted); font-size: 14px; }
  .stat b { color: var(--accent); font-family: "JetBrains Mono", monospace; font-size: 28px; display: block; }
  footer.site { border-top: 1px solid var(--border); padding: 28px 24px 40px; }
  footer.site .wrap { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; color: var(--muted); font-size: 13px; }
  footer.site a { color: var(--muted); text-decoration: none; margin-left: 16px; }
  footer.site a:hover { color: var(--text); }
  @media (max-width: 600px) { main { padding: 48px 16px 32px; } }
</style>
</head>
<body>
  <header class="site">
    <div class="brand">
      <div class="logo">∑</div>
      <span class="name">LLM Hardware &amp; Cost Architect</span>
    </div>
    <nav class="lang">${langToggle}</nav>
  </header>

  <main>
    <section class="hero">
      <span class="badge">${esc(c.heroBadge)}</span>
      <h1>${esc(c.heroTitle)}</h1>
      <p>${esc(c.heroSub)}</p>
      <a class="cta" href="/app">${esc(c.cta)}</a>
    </section>

    <section>
      <h2>${esc(c.cardsTitle)}</h2>
      <p class="sub">${esc(c.cardsSub)}</p>
      <div class="cards">
${cardsHtml}
      </div>
    </section>

    <section class="features">
      <div class="feature"><h3>${esc(c.f1Title)}</h3><p>${esc(c.f1Sub)}</p></div>
      <div class="feature"><h3>${esc(c.f2Title)}</h3><p>${esc(c.f2Sub)}</p></div>
      <div class="feature"><h3>${esc(c.f3Title)}</h3><p>${esc(c.f3Sub)}</p></div>
    </section>

    <p class="stat"><b>${modelCount}</b> ${esc(c.modelStat)}</p>
  </main>

  <footer class="site">
    <div class="wrap">
      <span>${esc(c.footerNote)}</span>
      <span>
        <a href="https://github.com/UmuT5513/llm-inference-calculator" target="_blank" rel="noopener noreferrer">${esc(c.footerSource)}</a>
        <a href="https://github.com/UmuT5513/llm-inference-calculator/issues" target="_blank" rel="noopener noreferrer">${esc(c.footerFeedback)}</a>
      </span>
    </div>
  </footer>

  <script>
    document.querySelectorAll('.lang a').forEach(function (a) {
      a.addEventListener('click', function () {
        try {
          localStorage.setItem('llmcalc:lang', a.getAttribute('data-lang'));
          document.cookie = 'llmcalc_lang=' + a.getAttribute('data-lang') + '; path=/; max-age=31536000';
        } catch (e) {}
      });
    });
  </script>
</body>
</html>`;
}
