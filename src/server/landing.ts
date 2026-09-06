import type { Request } from 'express';
import { getPool } from './db';
import { MODEL_CATALOG } from '../data/modelCatalog';
import { isTextPipeline, isFormatBlocked, isDerivativeBlocked } from './knownOrgs';
import { webAppJsonLd } from './seo';
import { GPU_PRESETS } from '../data/gpuPresets';

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
  gpuStat: string;
  catalogNote: string;
  methTitle: string;
  meth1Title: string;
  meth1: string;
  meth2Title: string;
  meth2: string;
  meth3Title: string;
  meth3: string;
  meth4Title: string;
  meth4: string;
  srcTitle: string;
  src1Title: string;
  src1: string;
  src2Title: string;
  src2: string;
  src3Title: string;
  src3: string;
  srcNote: string;
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
    cardsTitle: 'Senaryolar ve rakamlar',
    cardsSub: 'Bu kartlar sunucuda aynı hesap motoruyla hesaplanır; her biri uygulamada düzenlenebilir.',
    f1Title: 'Çıkarım (Inference)',
    f1Sub: 'TTFT, TPOT, token/s ve VRAM — 8B’den 671B MoE’ye kadar.',
    f2Title: 'Fine-Tuning',
    f2Sub: 'QLoRA, LoRA ve tam ince ayar için GPU süresi, VRAM ve platform maliyeti.',
    f3Title: 'Canlı Bulut Fiyatları',
    f3Sub: 'RunPod, Lambda ve Modal’dan anlık GPU fiyatları; on-prem TCO kıyası.',
    modelStat: 'katalogdaki açık kaynak model',
    gpuStat: 'katalogdaki GPU',
    catalogNote: 'Model listesi Hugging Face Hub’dan canlı çekilir; GPU’lar NVIDIA/AMD/Apple’ı kapsar.',
    methTitle: 'Hesaplama nasıl yapılıyor?',
    meth1Title: 'VRAM gereksinimi',
    meth1: 'Ağırlıklar = parametre sayısı × parametre başına bayt (niceleme), artı KV cache, aktivasyonlar ve çalışma zamanı ek yükü.',
    meth2Title: 'Hız',
    meth2: 'İlk token süresi (TTFT) hesaplamaya bağlıdır; sonraki her token (TPOT) bellek bant genişliğine bağlıdır. Kullanıcı başına token/s ve sistem toplam çıktısı hesaplanır.',
    meth3Title: 'Maliyet',
    meth3: 'GPU sayısı × saatlik fiyat × süre; 1 milyon token başına maliyet ve bulut sağlayıcılar arası fiyat karşılaştırması.',
    meth4Title: 'On-prem TCO ve fine-tuning',
    meth4: 'Donanım (yatırım) + elektrik/soğutma/bakım (işletme) ve buluta kıyasla başa baş noktası. Fine-tuning: yöntem/çatı + veri seti + GPU saati + platform maliyeti.',
    srcTitle: 'Veri kaynakları ve şeffaflık',
    src1Title: 'Canlı GPU fiyatları',
    src1: 'GPU fiyatları RunPod, Lambda ve Modal’dan periyodik olarak çekilir ve uygulamada güncel bulut tarifesi olarak gösterilir. Bu sağlayıcılarla sponsorluk, ortaklık ya da bağlantı yoktur — araç bağımsız ve ücretsizdir.',
    src2Title: 'Modeller',
    src2: 'Modeller Hugging Face Hub’dan çekilir (açık kaynak, indirme sayısına göre ilk sıralar + Türkçe beyaz liste) ve elle derlenmiş kataloğun üzerine eklenir; mimari veriler mümkün olduğunca HF ile doğrulanır.',
    src3Title: 'Donanım kapsamı',
    src3: 'Apple Silicon (yerel cihazlar) ile özel GPU ve model desteği içerir; yerel donanımın bulut fiyatı yoktur.',
    srcNote: 'Hesaplamalar yaklaşık değerlerdir; satın alma kararından önce doğrulayın.',
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
    cardsTitle: 'Scenarios and numbers',
    cardsSub: 'These cards are computed server-side by the same calculator engine; each is editable in the app.',
    f1Title: 'Inference',
    f1Sub: 'TTFT, TPOT, tokens/s and VRAM — from 8B to 671B MoE.',
    f2Title: 'Fine-Tuning',
    f2Sub: 'GPU hours, VRAM and platform cost for QLoRA, LoRA and full fine-tuning.',
    f3Title: 'Live Cloud Prices',
    f3Sub: 'Up-to-date GPU prices from RunPod, Lambda and Modal; on-prem TCO comparison.',
    modelStat: 'open-source models in the catalog',
    gpuStat: 'GPUs in the catalog',
    catalogNote: 'Models are fetched live from the Hugging Face Hub; GPUs cover NVIDIA/AMD/Apple.',
    methTitle: 'How the calculation works',
    meth1Title: 'VRAM requirements',
    meth1: 'Weights = parameters × bytes-per-weight (quantization), plus KV cache, activations and runtime overhead.',
    meth2Title: 'Speed',
    meth2: 'Time to first token (TTFT) is compute-bound; each following token (TPOT) is memory-bandwidth-bound. Tokens/s per user and total system throughput are computed.',
    meth3Title: 'Cost',
    meth3: 'GPU count × hourly price × time; per-1M-token cost and price comparison across cloud providers.',
    meth4Title: 'On-prem TCO & fine-tuning',
    meth4: 'Hardware (CAPEX) + electricity/cooling/maintenance (OPEX) and a break-even point vs. cloud. For fine-tuning: method/framework + dataset + GPU hours + platform cost.',
    srcTitle: 'Data sources & transparency',
    src1Title: 'Live GPU prices',
    src1: 'GPU prices are scraped periodically from RunPod, Lambda and Modal and shown as live cloud rates in the app. There is no sponsorship, partnership or affiliation with these providers — the tool is independent and free.',
    src2Title: 'Models',
    src2: 'Models are fetched from the Hugging Face Hub (open-source, top-by-downloads + a Turkish allowlist) on top of a hand-curated catalog; architecture data is verified against HF where possible.',
    src3Title: 'Hardware coverage',
    src3: 'Includes Apple Silicon (local devices) and custom GPU/model support; local hardware has no cloud price.',
    srcNote: 'Calculations are estimates; verify before making a purchase decision.',
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
  const gpuCount = GPU_PRESETS.length;
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
  :root { --bg:#f5f5f3; --surface:#ffffff; --surface2:#ebebe7; --border:#111111; --text:#111111; --muted:#6b6b67; --accent:#ffb224; --info:#1d4ed8; --ok:#3fb950; --danger:#f85149; }
  * { box-sizing:border-box; margin:0; padding:0; border-radius:0 !important; }
  body { background:var(--bg); color:var(--text); font-family:Inter, system-ui, sans-serif; -webkit-font-smoothing:antialiased; }
  .wrap { max-width:1080px; margin:0 auto; padding:0 24px; }
  header.site { display:flex; align-items:center; justify-content:space-between; padding:18px 24px; border-bottom:2px solid var(--border); }
  .brand { display:flex; align-items:center; gap:12px; }
  .brand .logo { width:36px; height:36px; background:var(--accent); color:var(--bg); border:2px solid var(--border); display:flex; align-items:center; justify-content:center; font-family:"JetBrains Mono", monospace; font-weight:800; font-size:20px; }
  .brand .name { font-weight:700; font-size:15px; font-family:"JetBrains Mono", monospace; }
  .lang a { color:var(--muted); font-size:12px; font-weight:700; margin-left:10px; text-decoration:none; }
  .lang a.active { color:var(--text); border-bottom:2px solid var(--text); padding-bottom:2px; }
  main { padding:72px 24px 48px; }
  .hero { border:2px solid var(--border); background:var(--surface); max-width:820px; margin:0 auto 72px; padding:48px 32px 32px; position:relative; text-align:center; }
  .hero-badge { position:absolute; top:0; left:50%; transform:translate(-50%,-50%); background:var(--info); color:#fff; font-family:"JetBrains Mono", monospace; font-size:12px; font-weight:700; letter-spacing:.08em; padding:6px 14px; border:2px solid var(--border); }
  .hero h1 { font-size:clamp(30px,5vw,48px); line-height:1.1; letter-spacing:-.02em; text-align:center; margin:12px 0 16px; }
  .hero p { color:var(--muted); font-size:17px; line-height:1.6; text-align:center; margin-bottom:32px; }
  .hero-divider { border-top:1px solid var(--border); margin:28px 0 16px; }
  .hero-meta { text-align:center; font-family:"JetBrains Mono", monospace; font-size:12px; color:var(--muted); }
  .cta { display:inline-block; background:var(--accent); color:var(--bg); font-weight:800; font-size:16px; padding:14px 28px; border:2px solid var(--border); text-decoration:none; }
  section h2 { font-size:26px; margin-bottom:8px; text-align:center; }
  section .sub { color:var(--muted); font-size:15px; margin-bottom:28px; text-align:center; }
  .cards { display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:16px; justify-content:center; max-width:960px; margin:0 auto 72px; }
  .card { display:block; background:var(--surface); border:2px solid var(--border); padding:18px; text-decoration:none; color:inherit; transition:border-color .15s; }
  .card:hover { background:var(--surface2); }
  .card-model { font-weight:700; font-size:15px; margin-bottom:4px; }
  .card-gpu { color:var(--muted); font-size:13px; margin-bottom:14px; }
  .card-metrics { display:flex; flex-wrap:wrap; gap:8px; }
  .metric { background:var(--surface2); border:2px solid var(--border); padding:8px 10px; font-size:12px; color:var(--muted); }
  .metric b { color:var(--text); font-family:"JetBrains Mono", monospace; font-size:14px; }
  .card-oom { margin-top:10px; color:var(--danger); font-size:12px; font-weight:700; }
  .features { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:16px; max-width:960px; margin:0 auto 72px; }
  .feature { background:var(--surface); border:2px solid var(--border); padding:20px; }
  .feature h3 { font-size:16px; margin-bottom:8px; }
  .feature p { color:var(--muted); font-size:14px; line-height:1.5; }
  .methodology { max-width:760px; margin:0 auto 72px; }
  .methodology .row { display:flex; gap:16px; border:2px solid var(--border); background:var(--surface); padding:16px 18px; margin-bottom:12px; text-align:left; }
  .methodology .num { font-family:"JetBrains Mono", monospace; font-weight:800; font-size:13px; color:var(--info); min-width:28px; padding-top:2px; }
  .methodology h3 { font-size:16px; margin-bottom:6px; }
  .methodology p { color:var(--muted); font-size:14px; line-height:1.5; }
  .sources { max-width:760px; margin:0 auto 72px; }
  .sources .row { border:2px solid var(--border); background:var(--surface); padding:16px 18px; margin-bottom:12px; text-align:left; }
  .sources h3 { font-size:16px; margin-bottom:6px; }
  .sources p { color:var(--muted); font-size:14px; line-height:1.5; }
  .sources .note { color:var(--muted); font-size:13px; text-align:center; margin-top:16px; }
  .stats { display:flex; justify-content:center; align-items:flex-start; gap:64px; flex-wrap:wrap; text-align:center; margin-bottom:12px; }
  .stat { color:var(--muted); font-size:14px; }
  .stat b { color:var(--text); font-family:"JetBrains Mono", monospace; font-size:28px; display:block; margin-bottom:4px; }
  .catalog-note { text-align:center; color:var(--muted); font-size:13px; }
  footer.site { border-top:2px solid var(--border); padding:28px 24px 40px; }
  footer.site .wrap { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px; color:var(--muted); font-size:13px; }
  footer.site a { color:var(--muted); text-decoration:none; margin-left:16px; }
  footer.site a:hover { color:var(--text); }
  @media (max-width:600px) { main { padding:48px 16px 32px; } .hero { padding:40px 20px 24px; } }
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
      <span class="hero-badge">LLM TOOLS · 2026</span>
      <h1>${esc(c.heroTitle)}</h1>
      <p>${esc(c.heroSub)}</p>
      <a class="cta" href="/app">${esc(c.cta)}</a>
      <div class="hero-divider"></div>
      <div class="hero-meta">${esc(c.heroBadge)}</div>
    </section>

    <section class="scenarios">
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

    <section class="methodology">
      <h2>${esc(c.methTitle)}</h2>
      <div class="row"><div class="num">01</div><div><h3>${esc(c.meth1Title)}</h3><p>${esc(c.meth1)}</p></div></div>
      <div class="row"><div class="num">02</div><div><h3>${esc(c.meth2Title)}</h3><p>${esc(c.meth2)}</p></div></div>
      <div class="row"><div class="num">03</div><div><h3>${esc(c.meth3Title)}</h3><p>${esc(c.meth3)}</p></div></div>
      <div class="row"><div class="num">04</div><div><h3>${esc(c.meth4Title)}</h3><p>${esc(c.meth4)}</p></div></div>
    </section>

    <section class="sources">
      <h2>${esc(c.srcTitle)}</h2>
      <div class="row"><h3>${esc(c.src1Title)}</h3><p>${esc(c.src1)}</p></div>
      <div class="row"><h3>${esc(c.src2Title)}</h3><p>${esc(c.src2)}</p></div>
      <div class="row"><h3>${esc(c.src3Title)}</h3><p>${esc(c.src3)}</p></div>
      <p class="note">${esc(c.srcNote)}</p>
    </section>

    <section class="stats">
      <div class="stat"><b>${modelCount}</b> ${esc(c.modelStat)}</div>
      <div class="stat"><b>${gpuCount}</b> ${esc(c.gpuStat)}</div>
    </section>
    <p class="catalog-note">${esc(c.catalogNote)}</p>
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
