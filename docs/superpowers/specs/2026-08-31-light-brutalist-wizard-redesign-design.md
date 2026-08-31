# Design: Light Brutalist Redesign + Wizard Flow (Phase 4 rework)

Date: 2026-08-31
Status: Approved (brainstorming session)

## Goal

Replace the dark "Ember Refined" polish wave of the growth spec's Phase 4 with a
light **brutalist** visual language and a **step-by-step wizard** flow for the
calculator. The current `/app` is a long-scrolling two-column layout (five
configurators stacked on the left, sticky results on the right) that reads as
complex for people who do not know LLM inference. This redesign:

1. Applies one flat, light, thick-bordered visual language to the whole product.
2. Turns the calculator into a guided, linear, numbered flow (PC-builder style)
   with a live summary bar so beginners see the impact of each choice.
3. Restyles the server-rendered landing page with a hero + modules grid.

## Decisions from brainstorming

- **Theme:** full switch to a **light brutalist** theme; dark theme is removed,
  no dark toggle. Off-white background, solid 2px black borders, sharp corners,
  no shadows.
- **Scope:** the theme and layout apply everywhere — `/app` wizard, landing `/`,
  all modals, header, footer, and the server-rendered landing page.
- **Wizard model:** hybrid — linear steps (one visible at a time) plus an
  always-visible sticky **summary bar** (VRAM fit / estimated cost / throughput)
  at the bottom.
- **Inference wizard steps (6):** Model → Quantization → Engine → GPU → Workload
  → Results.
- **Fine-tuning wizard steps (3):** Model → Fine-Tuning Config → Results
  (Platform Compare + Code Export live inside the Results step).
- **Brand accents:** amber `#ffb224` stays as the primary CTA/logo accent;
  blue `#1D4ED8` is used for mono category labels (the prompt's "blue badge"
  idea); green/red keep their status meaning.

## Design language

### Tokens (`src/index.css` `@theme`)

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#f5f5f3` | page background (off-white) |
| `--color-surface` | `#ffffff` | cards, panels, inputs |
| `--color-surface-2` | `#ebebe7` | muted fills, hover, table stripes |
| `--color-border` | `#111111` | **2px solid black** on major containers/sections/buttons |
| `--color-text` | `#111111` | primary text |
| `--color-muted` | `#6b6b67` | secondary text, mono metadata |
| `--color-accent` | `#ffb224` | primary CTA, logo, active highlights |
| `--color-info` | `#1d4ed8` | mono category labels ("INFERENCE", "LORA") |
| `--color-ok` | `#3fb950` | status OK / ACTIVE |
| `--color-danger` | `#f85149` | OOM / errors |

- **Shapes:** `border-radius: 0` everywhere. Flat — **no shadows** anywhere.
- **Borders:** 2px solid black on all major containers, sections, buttons,
  inputs, table cells, modals, the header and footer.
- **Typography:** Inter for headings/descriptions/body; JetBrains Mono for small
  labels, numbers, metadata, badges, step numbers (already the project's font
  stack). Numbers use tabular figures where applicable.
- **Selection:** `bg-accent text-bg` stays (now black text on amber).

## Layout architecture

### Header (`/app`)

- Off-white bar with a **2px solid black bottom border**.
- Left: text logo **`LLM-CALC`** in mono, inside a small black square amber
  `∑` mark retained.
- Center: mode tabs **Inference** / **Fine-Tuning** as nav links; the active tab
  gets a solid black 2px underline (hover: underline). Replaces the current
  `Segmented` control.
- Right: all action buttons (Language, Presets, Save, Copy Link, Compare,
  Export, Reset, AI Advisor) restyled as flat bordered boxes (2px black, no
  radius); AI Advisor stays the amber filled CTA.

### Landing page (`/`)

Server-rendered (`src/server/landing.ts` + `landingCards.ts`). Restyled inline
CSS to the light brutalist tokens.

- **Hero:** a large centered container with 2px black borders, sharp corners.
  Top-center inside the box: a small **dark blue rectangular badge** with white
  mono text (`LLM TOOLS · 2026`). Large bold heading, descriptive subtitle, a
  thin black divider, and a mono metadata line (version/author) at the bottom.
- **Live example cards:** existing SSR cards restyled — 2px black borders, mono
  metric values, green/red OOM indicator unchanged in meaning.
- **Modules grid:** two cards, `01` INFERENCE and `02` FINE-TUNING. Each card:
  mono number top-left, green `ACTIVE` status square top-right, blue mono
  category label, bold title, short description; footer is a split
  two-button row divided by a 2px black border ("Hesap Aç" → `/app`,
  "Hızlı Başlangıç" → loads a preset scenario at `/app?c=<config>`).
- Feature trio, model-count stat, footer: restyled to match.

### `/app` wizard

New orchestration in `App.tsx`:

- **App-level state:** `activeTab` (`inference` | `finetuning`), `step`
  (index into the active tab's step list), existing `config` / `ftConfig`
  state, and the live results (unchanged memoized calculations).
- **Step indicator:** horizontal row below the header — mono step numbers
  (`01 02 … 06`), active step filled black with white text, completed steps
  get a black square check mark, upcoming steps muted. Backward navigation is
  always allowed; forward is sequential. Clicking a previously-visited step
  jumps to it.
- **Step body:** exactly one configurator rendered at a time (see steps
  below). Configurator components keep their internal logic and are restyled
  through the shared `ui/` primitives.
- **Sticky summary bar:** fixed at the bottom, 2px black top border. Shows the
  running result compactly: **VRAM fit** (green `OK` / red `OOM` + used/avail),
  **estimated monthly cost**, **throughput** (tok/s). Always visible on every
  step including Results. On mobile it is the sticky bottom bar (existing Phase
  4 item); on desktop it spans the wizard width.
- **Navigation buttons:** `Geri` / `İleri` at the bottom of the step body
  (above the summary bar). On the last step `İleri` becomes the Results action
  if not already on it; on Results `İleri` is hidden.
- **Results step:** renders the existing `ResultsPanel` (VRAM / Perf / Cost /
  TCO / Cloud tabs) for inference; for fine-tuning, `FineTuningResultsPanel` +
  `FineTuningPlatformCompare` + `FineTuningCodeExport` as stacked sub-sections.

### Steps

| # | Inference | Fine-Tuning |
|---|-----------|-------------|
| 1 | Model (`ModelSelector`) | Model (`ModelSelector`) |
| 2 | Quantization (`QuantizationSelector`) | Fine-Tuning Config (`FineTuningConfigPanel`) |
| 3 | Engine (`InferenceEngineSelector`) | Results |
| 4 | GPU (`GpuConfigurator`) | — |
| 5 | Workload (`WorkloadConfigurator`) | — |
| 6 | Results | — |

## Behavior

- **Share URL hydration:** on load, if `?c=` is present, set the active tab from
  the scenario type and jump directly to the **Results** step (current
  `shareUrl.ts` logic unchanged; only navigation state is affected). The
  existing "clear the URL on first config change" effect is preserved.
- **Preset scenarios / quick start:** loading a preset jumps to Results so the
  user immediately sees an answer; the wizard can then be stepped back.
- **Summary bar values:** computed from the same `calculateInferenceMetrics` /
  `calculateFineTuningMetrics` outputs — no new calculation math (scope guard
  from Phase 3 holds).

## Files changed

- `src/index.css` — light brutalist tokens, base styles.
- `src/components/ui/*` — `Panel`, `SectionHeader`, `Badge`, `Stat`, `Field`,
  `Select`, `NumberInput`, `Collapse`, `Segmented`, `Tabs`: brutalist treatment
  (2px borders, flat, mono labels, tabular numerals).
- `src/components/Header.tsx` — nav-link tabs, logo, bordered action buttons.
- `src/components/Wizard.tsx` (new) — step indicator + step body + nav buttons.
- `src/components/WizardSummaryBar.tsx` (new) — sticky bottom summary.
- `src/components/ResultsPanel/*`, `FineTuningResultsPanel/*` — restyle only.
- `src/components/{About,Export,Scenario,ScenarioComparison,AiAdvisor,AdminGate,AdminPanel}Modal*` — restyle only.
- `src/components/Footer.tsx` — restyle only.
- `src/App.tsx` — wizard state, step rendering, hydration to Results.
- `src/server/landing.ts` + `src/server/landingCards.ts` — light brutalist SSR
  CSS + modules grid.
- `src/i18n/tr.json` + `en.json` — new keys (step labels, summary bar labels,
  modules grid copy, nav labels).
- `docs/superpowers/specs/2026-08-25-public-tool-growth-design.md` — Phase 4
  section updated to reflect this redesign.
- `PLAN.md` — track the Phase 4 work.

## Verification

- `npm run lint` (tsc --noEmit) and `npm run build` after the work.
- Manual smoke via `npm run dev`: step navigation (forward/back), summary bar
  values on each step, `?c=` hydration → Results, preset → Results, landing →
  app, language toggle, mobile single-column + sticky bar.
- i18n completeness: grep sweep for leftover hardcoded Turkish strings in
  `src/components`.
- DB-backed routes still render without DB (existing gotcha).

## Out of scope

- No dark theme (removed deliberately).
- No new calculation logic, no new data sources.
- No routing library — wizard is pure state in `App.tsx` (same pattern as the
  existing admin gate / route split).
- "KV Cache" nav link from the inspiration prompt is not added — there is no
  separate KV-cache calculator; KV cache is part of inference.