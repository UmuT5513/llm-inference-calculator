# Design: Public-Tool Growth — i18n, Share URLs, Landing/SEO, API Break-Even, Ember Refined Polish

Date: 2026-08-25
Status: Approved (brainstorming session)

## Goal

Turn the LLM inference/fine-tuning calculator into a public tool that attracts and retains three audiences: local-LLM hobbyists, ML/infra engineers, and decision makers. Growth-oriented roadmap, phased so each phase ships independently.

## Decisions from brainstorming

- **Goal:** public tool / more users.
- **Audience:** all three segments equally.
- **Language:** bilingual TR/EN (browser-detect default, persisted toggle).
- **Design direction:** **Ember Refined** — evolve the existing warm charcoal (`#0f0e0d`) + amber (`#ffb224`) theme; better hierarchy, spacing, mobile, charts. No rebrand.
- **Roadmap:** hybrid, 4 phases in order.

## Phase 1 — i18n foundation + shareable URLs + route split

### i18n
- Add `react-i18next`; dictionaries `src/i18n/tr.json` and `src/i18n/en.json`.
- Extract all UI strings from components to keys; numbers/units locale-formatted.
- Data (model names, GPU names) stays untranslated — only UI chrome is i18n'd.
- Language pill (TR/EN) in `Header`; default from `navigator.language` (`tr*` → Turkish, else English); choice persisted to localStorage.
- Server-side user-facing API error messages become bilingual (small inline map in `server.ts`, selected via `Accept-Language`).

### Shareable scenario URLs
- "Copy link" button in Header + ResultsPanel: serializes active config (inference or fine-tuning) to `/app?c=<base64url(JSON)>`.
- On load: parse + validate `c`; invalid → silently ignored.
- URL written via `history.replaceState` only when copying.
- localStorage scenarios unchanged (personal); URLs are for sharing.

### Route split
- App moves to `/app`; `/` reserved for the landing page (Phase 2). Until landing exists, `/` 302 → `/app`.
- No react-router: Express serves the SPA shell for `/` and `/app`; SPA picks `<Landing/>` vs calculator by pathname (same pattern as the existing admin gate in `App.tsx`).

## Phase 2 — Landing page + SEO

### Landing page (`/`)
- Ember Refined hero: product name, one-line value prop (TR/EN), CTA → `/app`.
- **Live example cards:** 6–8 precomputed scenarios rendered as real server-side HTML — e.g. "Llama 3.3 70B on 1×H100: ~X tok/s, $Y/1M tokens", "Qwen3 32B on RTX 4090", "8B on MacBook M3". Each links to `/app?c=<config>`. Numbers computed server-side at boot from the same calculator code — always real, indexable without JS.
- Feature trio (inference / fine-tuning / live cloud prices), model-count stat from DB, footer.

### SEO mechanics
- Per-route `<title>` / meta description / OG tags injected by Express in the HTML shell.
- `sitemap.xml` + `robots.txt` served by Express.
- Static branded OG image in `assets/`.
- JSON-LD `WebApplication` structured data.

## Phase 3 — API break-even comparison (flagship)

"Self-host vs rent" for the same capability class.

### Data
- New static preset `src/data/apiPricePresets.ts`: API tiers ("8B-class", "70B-class", "frontier-class") with provider prices ($/1M input & output tokens: OpenAI, Anthropic, Google, DeepSeek, Mistral). Curated manually now; admin-editable later if wanted.
- Selected model auto-maps to a tier by parameter count; user can override via dropdown.

### UI — new "API" tab in ResultsPanel
- Side-by-side: self-host cost per 1M tokens (existing calc outputs) vs API tier input/output prices.
- Break-even chart (hand-rolled SVG, existing chart style): x = monthly token volume, y = monthly cost; self-host line (amortized hardware + electricity, mostly flat) vs API line (linear); intersection marked — "cheaper to self-host above ~N B tokens/month".
- One-line verdict + caveats (ops effort; utilization assumptions already in TCO inputs).

### Scope guard
Uses existing TCO/cost engine outputs — no new calculation math, only new presentation + static price table.

## Phase 4 — Light Brutalist redesign + wizard flow (rework of "Ember Refined polish wave")

Replaces the original "restyle once" polish wave with a full visual-language and
interaction redesign (approved 2026-08-31; see
`docs/superpowers/specs/2026-08-31-light-brutalist-wizard-redesign-design.md`).
Ships once, after Phases 1–3 land.

### Theme — light brutalist (dark theme removed, no toggle)
- Off-white `#f5f5f3` background, white surfaces, solid **2px black borders** on
  all major containers/sections/buttons/inputs, **flat** (no shadows, no
  border-radius), sharp corners.
- Inter (headings/body) + JetBrains Mono (labels, numbers, metadata, badges).
- Brand accent amber `#ffb224` (CTA/logo) retained; blue `#1d4ed8` for mono
  category labels; green/red keep status meaning. Tokens live in `index.css`
  `@theme`.

### Calculator — step-by-step wizard (`/app`)
- Hybrid: **linear wizard steps** (one visible at a time) + **sticky summary bar**
  at the bottom always showing VRAM fit / monthly cost / tok-s.
- Inference steps: `01 Model → 02 Quantization → 03 Engine → 04 GPU → 05
  Workload → 06 Results`. Fine-tuning: `01 Model → 02 Fine-Tuning Config → 03
  Results` (Platform Compare + Code Export in Results step).
- Mono step indicator with black-filled active / checked-completed states;
  backward nav always allowed, forward sequential; visited steps clickable.
- `?c=` share URLs and quick-start presets jump straight to Results. No new
  calculation logic.
- Header restyled: `LLM-CALC` logo, nav-link tabs (Inference/Fine-Tuning, active
  = black underline), all actions in bordered flat boxes.
- Modals, results tabs, and footer restyled to the same language.

### Landing page (`/`)
- SSR hero box: blue mono badge (`LLM TOOLS · 2026`), bold heading, subtitle,
  thin divider, mono metadata.
- Modules grid: `01` INFERENCE / `02` FINE-TUNING cards (status badge, blue
  category label, split-button footer "Hesap Aç" / "Hızlı Başlangıç").
- Live example cards + features + stat + footer restyled.

### Unified charts, a11y, states
- Unified SVG chart styling (grid, axis labels, amber accent) incl. break-even
  chart.
- Focus-visible + aria pass; loading/empty states for live price/model fetches.
- Micro-interactions kept minimal (no `motion` dependency required).

## Verification (no test framework exists)

- `npm run lint` (tsc --noEmit) + `npm run build` after each phase.
- Manual smoke via `npm run dev`: language toggle, URL hydration round-trip, landing → app navigation, break-even chart sanity.
- i18n completeness: grep sweep for leftover hardcoded Turkish strings in `src/components`.
- DB-backed routes checked with running Postgres; app must still render without DB (existing gotcha).

## Out of scope (explicitly)

- User accounts / cloud-saved scenarios.
- Benchmark-calibrated throughput data.
- PDF report export.
- Hardware catalog expansion (RTX 5090, Apple Silicon) — revisit later.
- react-router or other routing library.
