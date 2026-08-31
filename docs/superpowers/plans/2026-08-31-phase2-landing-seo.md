# Phase 2: Landing Page + SEO — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the `/` landing page (Ember Refined hero, server-rendered live example cards, feature trio, model-count stat) plus SEO mechanics (per-route meta/OG/JSON-LD injection, `sitemap.xml`, `robots.txt`, branded OG image).

**Architecture:** Express renders `/` as a fully server-rendered HTML document. The example cards are computed **at boot** by the same `calculateInferenceMetrics` code the SPA uses, formatted into static HTML, and embedded in the landing document — indexable without JS. The SPA shell (React calculator) stays on `/app`; Express injects per-route title/description/OG/JSON-LD into the shell for `/app`. SEO static routes (`/sitemap.xml`, `/robots.txt`) are plain Express handlers. Language is picked server-side from `?lang=` → cookie → `Accept-Language` (default `tr`), with a TR/EN toggle on the landing that also persists `llmcalc:lang` to localStorage so the app's i18n stays in sync.

**Tech Stack:** Express 4 (server-rendered HTML), Node 22 globals (`btoa`/`atob` for share-URL encoding), existing `calculateInferenceMetrics`, `MODEL_CATALOG`, `GPU_PRESETS`, `encodeScenario`, existing `react-i18next` (unchanged for the app). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-25-public-tool-growth-design.md` (Phase 2 section).

## Global Constraints

- **No test framework exists.** Verification for every task is: `npm run lint` (`tsc --noEmit`), `npm run build`, and the listed manual `curl`/`npx tsx` checks. Do not add a test framework.
- **No new dependencies.** Everything is built with Express + existing modules.
- **No comments** added to code (repo convention), except where a file already has them.
- **Landing must render without the DB.** Model-count stat falls back to `MODEL_CATALOG.length` (124) on query failure; cards never touch the DB (they use the static `MODEL_CATALOG`).
- **Cards are static-preset computed.** Example cards use `MODEL_CATALOG` + `GPU_PRESETS` (deterministic at boot), not live `/api/models` data — this keeps them real, indexable, and DB-independent. The live count *stat* comes from the DB.
- **Data files stay untranslated.** Model/GPU names render as-is. Only landing UI copy is bilingual (TR/EN dictionary in `src/server/landing.ts`).
- **The secret admin route** (`/admnsterrrrr`) and all `/api/*` endpoints must keep working unchanged.
- **Do not touch the `DISABLE_HMR` block in `vite.config.ts`.**
- **`APP_URL`** env var (already in `.env.example`) is the absolute base for OG URLs / sitemap / robots; fallback `http://localhost:PORT`.
- **Dev vs prod:** the `/` and `/app` handlers must be registered BEFORE Vite middleware (dev) and before `express.static`/catch-all (prod) so they win. In dev, `/app` passes the injected shell through `vite.transformIndexHtml` to preserve HMR/asset transform.
- Commit messages follow repo style: `feat:`, `fix:`, `chore:` prefixes, short imperative subject.

## Design Decision (deviation from Phase-1 routing note)

Phase 1 said "Express serves the SPA shell for `/` and `/app`; SPA picks `<Landing/>` vs calculator by pathname." Phase 2 **requires** the example cards to be "real server-side HTML — always real, indexable without JS." Serving `/` as the SPA shell would hide the cards behind JS. Resolution: Express renders `/` as a complete server-rendered document (hero + cards + features + footer). No React `<Landing/>` component is created — the landing needs only links, which works without JS. The SPA (calculator + admin gate) remains on `/app`. This is the faithful realization of Phase 2's SEO requirement.

## File Structure

**New files:**
- `src/server/landingCards.ts` — scenario list + `buildLandingCardsHtml()` (boot-time static card HTML from `calculateInferenceMetrics`).
- `src/server/seo.ts` — `baseUrl()`, `renderSitemapXml()`, `renderRobotsTxt()`, `webAppJsonLd()`, `injectRouteMeta()`, `appMeta` (per-route TR/EN title/description).
- `src/server/landing.ts` — bilingual copy, `pickLandingLang()`, `countVisibleModels()`, `renderLandingPage()`.
- `public/assets/og-image.svg` — static branded OG image (Vite copies `public/*` → `dist/`; served at `/assets/og-image.svg`).

**Modified files:**
- `server.ts` — replace `/` redirect with landing handler; add `/app` shell-meta handler, `/sitemap.xml`, `/robots.txt`; boot-compute cards + model count; read shell HTML at boot.
- `index.html` — strip static og/twitter/description metas; keep `<title>`; add `<!--APP_META-->` placeholder for server injection.
- `AGENTS.md` — update the "next planned work" note to Phase 3 (optional, end of Task 5).

---

### Task 1: Landing cards module

**Files:**
- Create: `src/server/landingCards.ts`

**Interfaces:**
- Consumes: `MODEL_CATALOG`, `GPU_PRESETS` (`src/data/presets.ts`), `DEFAULT_INFERENCE_CONFIG` (`src/data/defaults.ts`), `calculateInferenceMetrics` (`src/utils/calculator.ts`), `encodeScenario` (`src/utils/shareUrl.ts`), `CalculatorConfig` (`src/types.ts`).
- Produces: `buildLandingCardsHtml(): string` — a `\n`-joined string of `<a class="card">…</a>` blocks, each linking to `/app?c=<base64url config>`.

- [ ] **Step 1: Create `src/server/landingCards.ts`**

```ts
import { MODEL_CATALOG, GPU_PRESETS } from '../data/presets';
import { DEFAULT_INFERENCE_CONFIG } from '../data/defaults';
import { calculateInferenceMetrics } from '../utils/calculator';
import { encodeScenario } from '../utils/shareUrl';
import type { CalculatorConfig } from '../types';

interface LandingScenario {
  modelId: string;
  gpuId: string;
  quantId: string;
  engineId: string;
  gpuCount: number;
}

const LANDING_SCENARIOS: LandingScenario[] = [
  { modelId: 'llama-3.3-70b', gpuId: 'nvidia-h100-sxm', quantId: 'fp8', engineId: 'vllm', gpuCount: 1 },
  { modelId: 'qwen3-32b', gpuId: 'nvidia-rtx-4090', quantId: 'fp8', engineId: 'vllm', gpuCount: 1 },
  { modelId: 'llama-3.1-8b', gpuId: 'nvidia-rtx-4090', quantId: 'q4_k', engineId: 'llamacpp', gpuCount: 1 },
  { modelId: 'qwen3-30b-a3b', gpuId: 'nvidia-rtx-5090', quantId: 'fp8', engineId: 'vllm', gpuCount: 1 },
  { modelId: 'gemma-3-27b', gpuId: 'nvidia-rtx-6000-ada', quantId: 'fp8', engineId: 'vllm', gpuCount: 1 },
  { modelId: 'qwen3-235b-a22b', gpuId: 'nvidia-h200', quantId: 'fp8', engineId: 'sglang', gpuCount: 2 },
  { modelId: 'mistral-small-3-24b', gpuId: 'nvidia-rtx-4090', quantId: 'int4', engineId: 'vllm', gpuCount: 1 },
  { modelId: 'qwen3-8b', gpuId: 'nvidia-rtx-3090', quantId: 'q4_k', engineId: 'llamacpp', gpuCount: 1 },
];

function makeConfig(s: LandingScenario): CalculatorConfig {
  return {
    ...DEFAULT_INFERENCE_CONFIG,
    modelId: s.modelId,
    gpuId: s.gpuId,
    quantId: s.quantId,
    engineId: s.engineId,
    gpuCount: s.gpuCount,
    tensorParallelism: s.gpuCount,
    pipelineParallelism: 1,
    promptLen: 2048,
    genLen: 512,
    batchSize: 1,
    useMultiProfile: false,
    requestsPerMin: 60,
  };
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildLandingCardsHtml(): string {
  return LANDING_SCENARIOS.map((s) => {
    const config = makeConfig(s);
    const r = calculateInferenceMetrics(config, undefined, MODEL_CATALOG);
    const gpu = GPU_PRESETS.find((g) => g.id === s.gpuId) ?? GPU_PRESETS[0];
    const href = `/app?c=${encodeScenario('inference', config)}`;
    const oom = r.isOom ? '<div class="card-oom">OOM</div>' : '';
    return `
      <a class="card" href="${href}">
        <div class="card-model">${esc(r.modelName)}</div>
        <div class="card-gpu">${s.gpuCount}× ${esc(gpu.name)}</div>
        <div class="card-metrics">
          <span class="metric"><b>~${r.tokensPerSecPerUser.toFixed(0)}</b> tok/s</span>
          <span class="metric"><b>$${r.costPerMillionTotalTokensUsd.toFixed(2)}</b> / 1M tok</span>
          <span class="metric"><b>${r.totalVramNeededGB.toFixed(0)}</b> GB VRAM</span>
        </div>
        ${oom}
      </a>`;
  }).join('\n');
}
```

- [ ] **Step 2: Verify lint + runtime output**

Run: `npm run lint`
Expected: no type errors (the `Promise<void>`-style strictness of this repo is off; no unused-local errors from tsconfig).

Run:
```bash
npx tsx -e "import('./src/server/landingCards.ts').then(m => { const h = m.buildLandingCardsHtml(); if (!h.includes('tok/s') || !h.includes('/app?c=') || !h.includes('class=\"card\"')) throw new Error('missing card markup'); console.log(h.slice(0, 400)); })"
```
Expected: prints the first card's HTML — contains `class="card"`, `tok/s`, `/app?c=`, and a `$` cost.

- [ ] **Step 3: Commit**

```bash
git add src/server/landingCards.ts
git commit -m "feat(landing): compute server-side example cards from calculator"
```

---

### Task 2: SEO module (sitemap, robots, route meta, JSON-LD)

**Files:**
- Create: `src/server/seo.ts`

**Interfaces:**
- Consumes: `pickLang` (`./i18nErrors`), `process.env.APP_URL` / `PORT`.
- Produces:
  - `baseUrl(): string`
  - `renderSitemapXml(): string`
  - `renderRobotsTxt(): string`
  - `webAppJsonLd(base: string, path: string, lang: SeoLang, description: string): string`
  - `injectRouteMeta(html: string, opts: { lang: SeoLang; path: string; title: string; description: string; ogTitle: string; ogDescription: string }): string`
  - `appMeta: { tr: { title: string; description: string }; en: { title: string; description: string } }`

- [ ] **Step 1: Create `src/server/seo.ts`**

```ts
export type SeoLang = 'tr' | 'en';

export function baseUrl(): string {
  const fallback = `http://localhost:${process.env.PORT || 3000}`;
  return (process.env.APP_URL || fallback).replace(/\/+$/, '');
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
  <meta property="og:image" content="${b}/assets/og-image.svg" />
  <meta name="twitter:card" content="summary_large_image" />
  <script type="application/ld+json">${webAppJsonLd(b, opts.path, opts.lang, esc(opts.description))}</script>`;
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
```

- [ ] **Step 2: Verify lint + runtime output**

Run: `npm run lint`
Expected: passes.

Run:
```bash
npx tsx -e "import('./src/server/seo.ts').then(m => { const s = m.renderSitemapXml(); const r = m.renderRobotsTxt(); if (!s.includes('<urlset') || !r.includes('Sitemap:') || !m.appMeta.tr.title) throw new Error('missing seo output'); console.log('sitemap ok'); console.log(r); })"
```
Expected: prints `sitemap ok` and the robots.txt body.

- [ ] **Step 3: Commit**

```bash
git add src/server/seo.ts
git commit -m "feat(seo): sitemap, robots, per-route meta injection and JSON-LD"
```

---

### Task 3: Landing page renderer (bilingual HTML)

**Files:**
- Create: `src/server/landing.ts`

**Interfaces:**
- Consumes: `getPool` (`./db`), `MODEL_CATALOG` (`../data/modelCatalog`), `isTextPipeline`/`isFormatBlocked`/`isDerivativeBlocked` (`./knownOrgs`), `buildLandingCardsHtml` (`./landingCards`), `webAppJsonLd` (`./seo`).
- Produces:
  - `pickLandingLang(req: Request): 'tr' | 'en'`
  - `countVisibleModels(): Promise<number>`
  - `renderLandingPage(req: Request, cardsHtml: string, modelCount: number): string`

- [ ] **Step 1: Create `src/server/landing.ts`**

```ts
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
<meta property="og:image" content="${appUrl}/assets/og-image.svg" />
<meta name="twitter:card" content="summary_large_image" />
<script type="application/ld+json">${webAppJsonLd(appUrl, '/', lang, esc(c.metaDescription))}</script>
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
```

- [ ] **Step 2: Verify lint + runtime output**

Run: `npm run lint`
Expected: passes.

Run:
```bash
npx tsx -e "import('./src/server/landing.ts').then(m => { const req: any = { query: {}, headers: { 'accept-language': 'tr' } }; const html = m.renderLandingPage(req, '<a class=\"card\" href=\"/app?c=abc\">x</a>', 124); if (!html.includes('<!doctype html>') || !html.includes('application/ld+json') || !html.includes('?lang=') || !html.includes('class=\"cards\"')) throw new Error('missing landing structure'); console.log('landing ok', html.length); })"
```
Expected: prints `landing ok <length>`.

Run (model count with DB down / unset must not throw):
```bash
npx tsx -e "import('./src/server/landing.ts').then(async m => { const n = await m.countVisibleModels(); console.log('count', n); })"
```
Expected: prints `count 124` (fallback) or a larger number if a DB is reachable. Either is fine; must not throw.

- [ ] **Step 3: Commit**

```bash
git add src/server/landing.ts
git commit -m "feat(landing): bilingual server-rendered landing page with live model count"
```

---

### Task 4: Wire Express routes (`/`, `/app`, `/sitemap.xml`, `/robots.txt`)

**Files:**
- Modify: `server.ts`

**Interfaces:**
- Consumes: `renderLandingPage`, `pickLandingLang`, `countVisibleModels` (`./src/server/landing`); `buildLandingCardsHtml` (`./src/server/landingCards`); `injectRouteMeta`, `appMeta`, `renderSitemapXml`, `renderRobotsTxt` (`./src/server/seo`); `pickLang` (`./src/server/i18nErrors`); `MODEL_CATALOG` (`./src/data/modelCatalog`); Node `fs/promises` and `path`.
- Produces: wired routes `/`, `/app`, `/sitemap.xml`, `/robots.txt`; a `viteServer` module-level reference for the dev `/app` transform.

- [ ] **Step 1: Read the current `server.ts` top imports and `startServer()`**

Confirm the current structure: `express`, `path`, `createViteServer`, `dotenv`, `runMigrations`, `seedModelCatalog`, `adminAuthRouter`, `gpuPricesRouter`, `hfModelsRouter`, `pickLang`/`msg`. `startServer()` runs migrations/seed, then registers `app.get("/")` (302 redirect), then either Vite middleware or `express.static` + `app.get("*")`.

- [ ] **Step 2: Add imports and a module-level `viteServer` reference**

Replace the import block with these additions (keep existing lines):

```ts
import fs from "fs/promises";
import { renderLandingPage, pickLandingLang, countVisibleModels } from "./src/server/landing";
import { buildLandingCardsHtml } from "./src/server/landingCards";
import { injectRouteMeta, appMeta, renderSitemapXml, renderRobotsTxt } from "./src/server/seo";
import { MODEL_CATALOG } from "./src/data/modelCatalog";

let viteServer: Awaited<ReturnType<typeof createViteServer>> | null = null;
```

- [ ] **Step 3: Add a shell-read helper and rewrite `startServer()`**

Replace the whole `startServer()` body (from `async function startServer() {` to its closing brace) with:

```ts
async function readShell(): Promise<string> {
  const p =
    process.env.NODE_ENV === "production"
      ? path.join(process.cwd(), "dist", "index.html")
      : path.join(process.cwd(), "index.html");
  return fs.readFile(p, "utf8");
}

async function startServer() {
  try {
    await runMigrations();
    await seedModelCatalog();
  } catch (err: any) {
    console.error("PostgreSQL migration failed. Check DATABASE_URL and that PostgreSQL is running:", err?.message);
  }

  const cardsHtml = buildLandingCardsHtml();
  let modelCount = MODEL_CATALOG.length;
  try {
    modelCount = await countVisibleModels();
  } catch (err) {
    console.warn("[landing] model count fallback:", err);
  }
  const shellHtml = await readShell().catch((err) => {
    console.warn("Shell index.html not found, serving without route meta:", err);
    return "";
  });

  app.get("/", (req, res) => {
    const lang = pickLandingLang(req);
    if (req.query?.lang) {
      res.cookie("llmcalc_lang", lang, { maxAge: 31536000000 });
    }
    res.type("html").send(renderLandingPage(req, cardsHtml, modelCount));
  });

  app.get("/app", async (req, res) => {
    const lang = pickLang(req);
    const meta = appMeta[lang];
    const html = injectRouteMeta(shellHtml || "<!doctype html><html><head><title></title><!--APP_META--></head><body><div id=\"root\"></div></body></html>", {
      lang,
      path: "/app",
      title: meta.title,
      description: meta.description,
      ogTitle: meta.title,
      ogDescription: meta.description,
    });
    if (viteServer) {
      res.type("html").send(await viteServer.transformIndexHtml(req.url, html));
    } else {
      res.type("html").send(html);
    }
  });

  app.get("/sitemap.xml", (_req, res) => {
    res.type("application/xml").send(renderSitemapXml());
  });

  app.get("/robots.txt", (_req, res) => {
    res.type("text/plain").send(renderRobotsTxt());
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    viteServer = vite;
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`LLM Inference Calculator Server running on http://0.0.0.0:${PORT}`);
  });
}
```

Notes:
- The old `app.get("/", (_req, res) => res.redirect(302, "/app"))` is removed — the new `/` handler replaces it.
- `req.url` (e.g. `/app?c=...`) is passed to `vite.transformIndexHtml` so the SPA hydration from `?c=` keeps working in dev.
- The `/app` fallback shell string (when `index.html` is unreadable) is a minimal document; it is only a safety net.
- `viteServer` is assigned after Vite is created; the `/app` handler reads it lazily at request time, so registering the route before Vite creation is fine.

- [ ] **Step 4: Verify lint + build**

Run: `npm run lint`
Expected: passes.

Run: `npm run build`
Expected: `vite build` succeeds and `esbuild` bundles `server.ts` → `dist/server.cjs` without errors.

- [ ] **Step 5: Dev-mode smoke test**

Run `npm run dev`, then in a second shell:

```bash
curl -s http://localhost:3000/ | grep -oE 'class="card"|og:title|application/ld\+json|LLM Hardware &amp; Cost Architect' | sort -u
```
Expected: `application/ld+json`, `class="card"`, `og:title` all present.

```bash
curl -s 'http://localhost:3000/?lang=en' | grep -oE 'Start Calculating|Plan inference' | sort -u
```
Expected: English hero copy (`Start Calculating`).

```bash
curl -s http://localhost:3000/app | grep -E '<title>|og:description'
```
Expected: the injected app title (contains `Hesaplayıcı`) and an `og:description` meta.

```bash
curl -s http://localhost:3000/sitemap.xml
curl -s http://localhost:3000/robots.txt
```
Expected: valid XML urlset with `/` and `/app`; robots with `Sitemap:` line.

```bash
curl -sI http://localhost:3000/assets/og-image.svg | head -1
```
Expected: `HTTP/1.1 200` (Vite serves `public/` in dev).

Also click a card link (`/app?c=...`) and the CTA in the browser — the calculator must load and hydrate the shared scenario.

- [ ] **Step 6: Commit**

```bash
git add server.ts
git commit -m "feat(seo): serve landing at /, inject route meta into /app, add sitemap and robots"
```

---

### Task 5: Branded OG image + shell placeholders + final sweep

**Files:**
- Create: `public/assets/og-image.svg`
- Modify: `index.html`
- Modify: `AGENTS.md` (optional note update)

- [ ] **Step 1: Create `public/assets/og-image.svg`**

A 1200×630 branded image (dark Ember background, amber ∑ mark, title). Vite copies `public/` → `dist/`, so it is served at `/assets/og-image.svg`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0f0e0d"/>
  <rect x="48" y="48" width="1104" height="534" rx="24" fill="#171615" stroke="#2a2826" stroke-width="2"/>
  <circle cx="170" cy="180" r="64" fill="#ffb224"/>
  <text x="170" y="215" font-family="monospace" font-size="72" font-weight="800" fill="#0f0e0d" text-anchor="middle">∑</text>
  <text x="272" y="170" font-family="Arial, sans-serif" font-size="52" font-weight="700" fill="#edeae6">LLM Hardware &amp; Cost Architect</text>
  <text x="272" y="228" font-family="Arial, sans-serif" font-size="24" fill="#8e8b8b">Inference &amp; Fine-Tuning VRAM / Cost Calculator</text>
  <text x="272" y="430" font-family="Arial, sans-serif" font-size="22" fill="#ffb224">Açık kaynak LLM donanım ve maliyet hesaplayıcı</text>
  <rect x="272" y="470" width="180" height="44" rx="22" fill="#ffb224"/>
  <text x="362" y="499" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#0f0e0d" text-anchor="middle">Hemen Hesapla</text>
</svg>
```

- [ ] **Step 2: Update `index.html` to use the `<!--APP_META-->` placeholder**

Read `index.html`. Replace the `<head>` meta block (currently lines ~3–15: the `<title>` plus the description / og:title / og:description / og:type / twitter:card metas) with:

```html
    <title>LLM Hardware & Cost Architect</title>
    <!--APP_META-->
```

Keep everything else (`charset`, `viewport`, font `preconnect`/`link` tags, `<div id="root">`, the module script) unchanged.

- [ ] **Step 3: Verify the placeholder replacement**

Run: `npm run lint` — passes (no TS changes).

Run: `npm run build`, then:
```bash
NODE_ENV=production PORT=3111 node dist/server.cjs &
sleep 2
curl -s http://localhost:3111/app | grep -cE '<title>|og:image|application/ld\+json'
curl -s http://localhost:3111/ | grep -c 'class="card"'
curl -sI http://localhost:3111/assets/og-image.svg | head -1
kill %1
```
Expected: the `/app` response contains the injected `<title>`, `og:image`, and `application/ld+json` (grep count ≥ 3); the landing contains at least one `class="card"`; the OG image returns 200. If `NODE_ENV=production` complains about a missing `dist` build, run `npm run build` first (done above).

- [ ] **Step 4: Update `AGENTS.md` "next planned work" note**

Read `AGENTS.md`. Change the sentence "next planned work per the growth spec ... is Phase 2 (landing page + SEO)" to reference Phase 3 (API break-even comparison) as the next planned work.

- [ ] **Step 5: Final verification sweep**

```bash
npm run lint
npm run build
```
Both must pass. Then manual smoke via `npm run dev`:
1. `http://localhost:3000/` shows hero, 8 cards, feature trio, model count; TR/EN toggle works and persists to `/app`.
2. Clicking a card navigates to `/app?c=...` and hydrates the exact scenario.
3. `/app` still has the calculator fully functional; admin secret route (`/admnsterrrrr`) still works.
4. `curl -s http://localhost:3000/sitemap.xml` and `/robots.txt` return valid content.
5. `/assets/og-image.svg` loads.

- [ ] **Step 6: Commit**

```bash
git add public/assets/og-image.svg index.html AGENTS.md
git commit -m "feat(seo): add branded OG image and shell meta placeholder"
```

---

## Self-Review

**Spec coverage:**
- Landing hero (product name, one-line value prop TR/EN, CTA → `/app`) — Task 3/4.
- 8 live example cards as real server-side HTML, computed at boot from `calculateInferenceMetrics`, linking to `/app?c=<config>` — Task 1/4.
- Feature trio (inference / fine-tuning / live cloud prices) — Task 3.
- Model-count stat from DB (with no-DB fallback) — Task 3.
- Footer — Task 3.
- Per-route `<title>` / meta / OG injected by Express — Task 2/4 (`/` in its own head, `/app` via `injectRouteMeta`).
- `sitemap.xml` + `robots.txt` served by Express — Task 2/4.
- Static branded OG image in `assets/` (`public/assets/og-image.svg` → `/assets/og-image.svg`) — Task 5.
- JSON-LD `WebApplication` — Task 2/3/4.

**Placeholder scan:** no TBD/TODO; every step has concrete code and expected output.

**Type consistency:** `renderLandingPage(req, cardsHtml, modelCount)` matches Task 4's call. `injectRouteMeta(html, {lang, path, title, description, ogTitle, ogDescription})` matches Task 4. `buildLandingCardsHtml()` signature stable across Task 1 and Task 4. `pickLandingLang`/`countVisibleModels` match. `appMeta` keyed by `'tr' | 'en'` matches `pickLang`'s return type.