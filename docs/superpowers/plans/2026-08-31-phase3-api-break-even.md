# Phase 3: API Break-Even Comparison — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the flagship "self-host vs rent" comparison: a new **API** tab in the ResultsPanel that shows self-host cost per 1M tokens side-by-side with curated API tier prices, and a hand-rolled SVG break-even chart (monthly token volume × monthly cost) marking where self-hosting becomes cheaper.

**Architecture:** A static price preset `src/data/apiPricePresets.ts` defines three capability tiers ("8B-class", "70B-class", "frontier-class"), each with per-provider $/1M input & output prices (OpenAI, Anthropic, Google, DeepSeek, Mistral). A pure util `src/utils/apiBreakEven.ts` derives everything from the EXISTING `CalculationResults` (TCO `monthlyAverageCostUsd`, `costPerMillion*Usd`, `effectivePromptLen`/`effectiveGenLen`, `totalParamsB`) plus the selected tier/provider — no new calculation math, only presentation math (blended price from the workload's prompt:gen ratio, a linear API line vs a flat self-host line, and their intersection). The `ApiTab` React component renders tier/provider dropdowns (tier auto-mapped from `totalParamsB`, overridable), the side-by-side table, the SVG chart, and a one-line verdict with caveats.

**Tech Stack:** React 19, Tailwind 4 (existing Ember Refined dark tokens), `react-i18next` (existing), hand-rolled SVG (no chart library). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-25-public-tool-growth-design.md` (Phase 3 section).

## Global Constraints

- **No test framework exists.** Verification for every task is: `npm run lint` (`tsc --noEmit`), `npm run build`, and the listed `npx tsx -e`/manual checks. Do not add a test framework.
- **No new dependencies.** Chart is hand-rolled SVG; no chart/utility library.
- **No comments** added to code (repo convention).
- **Scope guard (spec):** uses only existing `CalculationResults` outputs + a static price table. NO changes to `calculateInferenceMetrics`/`fineTuningCalculator`, `CalculatorConfig`, `shareUrl.ts`, or the shareable `?c=` payload. The API tab's tier/provider selection is ephemeral component state — it must NOT be persisted into config or URLs.
- **Data stays untranslated:** provider names and representative model labels render as-is. All tab copy is i18n'd via `results.api.*` keys in `src/i18n/tr.json` and `src/i18n/en.json`.
- **Price preset is curated manually** (spec: "Curated manually now; admin-editable later if wanted"). Values below are current as of 2026-08-31 (standard non-batch tier). They are static data, not live-fetched.
- The ResultsPanel's existing five tabs (VRAM/PERF/COST/CLOUD/TCO) must keep working unchanged; the new tab is appended.
- The Ember Refined palette must be used in the SVG chart: `--color-bg #0f0e0d`, `--color-surface #171615`, `--color-surface-2 #1e1d1b`, `--color-border #2a2826`, `--color-text #edeae6`, `--color-muted #8e8b8b`, `--color-accent #ffb224`, `--color-ok #3fb950`, `--color-danger #f85149`. Use Tailwind utility classes (`text-accent`, `stroke-[#ffb224]`, `border-border`, `bg-surface-2`, etc.) consistent with the other tabs.
- Commit messages follow repo style: `feat:`, `fix:`, `chore:` prefixes, short imperative subject.

## File Structure

**New files:**
- `src/data/apiPricePresets.ts` — `ApiTierId`, `ApiProviderPrice`, `ApiTier` types + `API_TIERS` (curated prices) + `apiTierForParams(paramsB)` + `getApiTier(id)`.
- `src/utils/apiBreakEven.ts` — pure `computeApiBreakEven(results, tierId, providerId)` returning side-by-side prices, blended API price, self-host monthly cost, break-even token volume, and an SVG-ready chart series.
- `src/components/ResultsPanel/ApiTab.tsx` — dropdowns (tier, provider), side-by-side table, SVG break-even chart, verdict + caveats.

**Modified files:**
- `src/components/ResultsPanel/index.tsx` — import `ApiTab`, add `{ id: 'api', label: 'API' }` to `TABS`, render it.
- `src/i18n/tr.json`, `src/i18n/en.json` — add `results.api.*` keys.

## Curated API tier preset (Task 1 data, exact values)

Per-capability-class representative standard-tier prices, USD per 1M tokens (input / output), sourced 2026-08-31:

| Provider | 8B-class | 70B-class | frontier-class |
|----------|----------|-----------|----------------|
| OpenAI | $0.20 / $1.20 (GPT-5.6-luna) | $2.00 / $12.00 (GPT-5.6-terra) | $4.00 / $20.00 (GPT-5.6-sol) |
| Anthropic | $1.00 / $5.00 (Claude Haiku 4.5) | $2.00 / $10.00 (Claude Sonnet 5) | $5.00 / $25.00 (Claude Opus 5) |
| Google | $0.25 / $1.50 (Gemini 3.1 Flash-Lite) | $2.00 / $12.00 (Gemini 3.1 Pro) | $3.00 / $18.00 (Gemini 3.5 Pro) |
| DeepSeek | $0.22 / $0.66 (DeepSeek V4-flash) | $0.28 / $0.42 (DeepSeek V3.2) | $0.66 / $1.98 (DeepSeek V4-pro) |
| Mistral | $0.15 / $0.60 (Mistral Small 4) | $0.50 / $1.50 (Mistral Large 3) | $1.50 / $7.50 (Mistral Medium 3.5) |

Tier auto-mapping by `totalParamsB`: `<= 20` → `8b`; `<= 100` → `70b`; else → `frontier`.

---

### Task 1: API price preset data

**Files:**
- Create: `src/data/apiPricePresets.ts`

**Interfaces:**
- Produces (consumed by Task 2/3):
  - `export type ApiTierId = '8b' | '70b' | 'frontier'`
  - `export interface ApiProviderPrice { providerId: string; providerName: string; model: string; inputPricePerM: number; outputPricePerM: number }`
  - `export interface ApiTier { id: ApiTierId; providers: ApiProviderPrice[] }`
  - `export const API_TIERS: ApiTier[]`
  - `export function apiTierForParams(paramsB: number): ApiTierId`
  - `export function getApiTier(id: ApiTierId): ApiTier`

- [ ] **Step 1: Create `src/data/apiPricePresets.ts`**

```ts
export type ApiTierId = '8b' | '70b' | 'frontier';

export interface ApiProviderPrice {
  providerId: string;
  providerName: string;
  model: string;
  inputPricePerM: number;
  outputPricePerM: number;
}

export interface ApiTier {
  id: ApiTierId;
  providers: ApiProviderPrice[];
}

export const API_TIERS: ApiTier[] = [
  {
    id: '8b',
    providers: [
      { providerId: 'openai', providerName: 'OpenAI', model: 'GPT-5.6-luna', inputPricePerM: 0.2, outputPricePerM: 1.2 },
      { providerId: 'anthropic', providerName: 'Anthropic', model: 'Claude Haiku 4.5', inputPricePerM: 1.0, outputPricePerM: 5.0 },
      { providerId: 'google', providerName: 'Google', model: 'Gemini 3.1 Flash-Lite', inputPricePerM: 0.25, outputPricePerM: 1.5 },
      { providerId: 'deepseek', providerName: 'DeepSeek', model: 'DeepSeek V4-flash', inputPricePerM: 0.22, outputPricePerM: 0.66 },
      { providerId: 'mistral', providerName: 'Mistral', model: 'Mistral Small 4', inputPricePerM: 0.15, outputPricePerM: 0.6 },
    ],
  },
  {
    id: '70b',
    providers: [
      { providerId: 'openai', providerName: 'OpenAI', model: 'GPT-5.6-terra', inputPricePerM: 2.0, outputPricePerM: 12.0 },
      { providerId: 'anthropic', providerName: 'Anthropic', model: 'Claude Sonnet 5', inputPricePerM: 2.0, outputPricePerM: 10.0 },
      { providerId: 'google', providerName: 'Google', model: 'Gemini 3.1 Pro', inputPricePerM: 2.0, outputPricePerM: 12.0 },
      { providerId: 'deepseek', providerName: 'DeepSeek', model: 'DeepSeek V3.2', inputPricePerM: 0.28, outputPricePerM: 0.42 },
      { providerId: 'mistral', providerName: 'Mistral', model: 'Mistral Large 3', inputPricePerM: 0.5, outputPricePerM: 1.5 },
    ],
  },
  {
    id: 'frontier',
    providers: [
      { providerId: 'openai', providerName: 'OpenAI', model: 'GPT-5.6-sol', inputPricePerM: 4.0, outputPricePerM: 20.0 },
      { providerId: 'anthropic', providerName: 'Anthropic', model: 'Claude Opus 5', inputPricePerM: 5.0, outputPricePerM: 25.0 },
      { providerId: 'google', providerName: 'Google', model: 'Gemini 3.5 Pro', inputPricePerM: 3.0, outputPricePerM: 18.0 },
      { providerId: 'deepseek', providerName: 'DeepSeek', model: 'DeepSeek V4-pro', inputPricePerM: 0.66, outputPricePerM: 1.98 },
      { providerId: 'mistral', providerName: 'Mistral', model: 'Mistral Medium 3.5', inputPricePerM: 1.5, outputPricePerM: 7.5 },
    ],
  },
];

export function apiTierForParams(paramsB: number): ApiTierId {
  if (paramsB <= 20) return '8b';
  if (paramsB <= 100) return '70b';
  return 'frontier';
}

export function getApiTier(id: ApiTierId): ApiTier {
  return API_TIERS.find((t) => t.id === id) ?? API_TIERS[1];
}
```

- [ ] **Step 2: Verify lint + runtime output**

Run: `npm run lint` — expected: passes.

Run:
```bash
npx tsx -e "import('./src/data/apiPricePresets.ts').then(m => { if (m.API_TIERS.length !== 3) throw new Error('tiers'); if (m.API_TIERS.every(t => t.providers.length !== 5)) throw new Error('providers'); if (m.apiTierForParams(8) !== '8b' || m.apiTierForParams(70) !== '70b' || m.apiTierForParams(671) !== 'frontier') throw new Error('mapping'); console.log('presets ok', m.API_TIERS.map(t => t.id + ':' + t.providers.length).join(' ')); })"
```
Expected: prints `presets ok 8b:5 70b:5 frontier:5`.

- [ ] **Step 3: Commit**

```bash
git add src/data/apiPricePresets.ts
git commit -m "feat(api): curated API tier price presets"
```

---

### Task 2: Break-even math util

**Files:**
- Create: `src/utils/apiBreakEven.ts`

**Interfaces:**
- Consumes: `CalculationResults` (`../types`), `getApiTier`/`ApiTierId`/`ApiProviderPrice` (`../data/apiPricePresets`).
- Produces (consumed by Task 3):
  - `export interface ApiChartPoint { volumeB: number; selfHostUsd: number; apiUsd: number }`
  - `export interface ApiBreakEven { tierId: ApiTierId; provider: ApiProviderPrice; selfHostPerMIn: number; selfHostPerMOut: number; selfHostPerMTokens: number; blendedApiPerM: number; selfHostMonthlyUsd: number; breakEvenTokensB: number; series: ApiChartPoint[] }`
  - `export function computeApiBreakEven(results: CalculationResults, tierId: ApiTierId, providerId: string): ApiBreakEven`

Math (presentation-only, derived from existing outputs):
- `selfHostPerMIn` / `selfHostPerMOut` = `results.costPerMillionInputTokensUsd` / `results.costPerMillionOutputTokensUsd`.
- `selfHostPerMTokens` = `results.costPerMillionTotalTokensUsd`.
- `selfHostMonthlyUsd` = `results.onPremTco.monthlyAverageCostUsd` (3-year amortized CAPEX + OPEX / 36 — the flat self-host line).
- `promptFrac = effectivePromptLen / max(1, effectivePromptLen + effectiveGenLen)`; `genFrac = 1 - promptFrac`.
- `blendedApiPerM = inputPricePerM * promptFrac + outputPricePerM * genFrac`.
- `breakEvenTokensB = (selfHostMonthlyUsd / blendedApiPerM) / 1000` (self-host monthly cost / blended $ per 1M → millions, ÷1000 → billions). If `blendedApiPerM <= 0` guard to a very large number (1e6).
- `series`: 21 points from `volumeB = 0` to `xMaxB = Math.max(2, Math.ceil(breakEvenTokensB * 1.5))`; `selfHostUsd = selfHostMonthlyUsd` (flat); `apiUsd = volumeB * blendedApiPerM * 1000` (linear).

- [ ] **Step 1: Create `src/utils/apiBreakEven.ts`**

```ts
import { CalculationResults } from '../types';
import { getApiTier, ApiTierId, ApiProviderPrice } from '../data/apiPricePresets';

export interface ApiChartPoint {
  volumeB: number;
  selfHostUsd: number;
  apiUsd: number;
}

export interface ApiBreakEven {
  tierId: ApiTierId;
  provider: ApiProviderPrice;
  selfHostPerMIn: number;
  selfHostPerMOut: number;
  selfHostPerMTokens: number;
  blendedApiPerM: number;
  selfHostMonthlyUsd: number;
  breakEvenTokensB: number;
  series: ApiChartPoint[];
}

export function computeApiBreakEven(
  results: CalculationResults,
  tierId: ApiTierId,
  providerId: string
): ApiBreakEven {
  const tier = getApiTier(tierId);
  const provider = tier.providers.find((p) => p.providerId === providerId) ?? tier.providers[0];

  const promptLen = Math.max(1, results.effectivePromptLen || 1);
  const genLen = Math.max(1, results.effectiveGenLen || 1);
  const totalLen = promptLen + genLen;
  const promptFrac = promptLen / totalLen;
  const genFrac = 1 - promptFrac;
  const blendedApiPerM = provider.inputPricePerM * promptFrac + provider.outputPricePerM * genFrac;

  const selfHostMonthlyUsd = Math.max(0, results.onPremTco.monthlyAverageCostUsd || 0);
  const breakEvenTokensB = blendedApiPerM > 0 ? selfHostMonthlyUsd / blendedApiPerM / 1000 : 1e6;

  const xMaxB = Math.max(2, Math.ceil(breakEvenTokensB * 1.5));
  const STEPS = 21;
  const series: ApiChartPoint[] = Array.from({ length: STEPS }, (_, i) => {
    const volumeB = (xMaxB / (STEPS - 1)) * i;
    return {
      volumeB,
      selfHostUsd: selfHostMonthlyUsd,
      apiUsd: volumeB * blendedApiPerM * 1000,
    };
  });

  return {
    tierId,
    provider,
    selfHostPerMIn: results.costPerMillionInputTokensUsd,
    selfHostPerMOut: results.costPerMillionOutputTokensUsd,
    selfHostPerMTokens: results.costPerMillionTotalTokensUsd,
    blendedApiPerM,
    selfHostMonthlyUsd,
    breakEvenTokensB,
    series,
  };
}
```

- [ ] **Step 2: Verify lint + runtime output**

Run: `npm run lint` — expected: passes.

Run a smoke with a synthetic results object:
```bash
npx tsx -e "
import('./src/utils/apiBreakEven.ts').then(async m => {
  const { calculateInferenceMetrics } = await import('./src/utils/calculator.ts');
  const { MODEL_PRESETS } = await import('./src/data/presets.ts');
  const { DEFAULT_INFERENCE_CONFIG } = await import('./src/data/defaults.ts');
  const res = calculateInferenceMetrics(DEFAULT_INFERENCE_CONFIG, undefined, MODEL_PRESETS);
  const b = m.computeApiBreakEven(res, '70b', 'openai');
  if (b.series.length !== 21) throw new Error('series length');
  if (b.selfHostMonthlyUsd <= 0) throw new Error('flat cost');
  const flat = b.series[10].selfHostUsd, last = b.series[20].apiUsd;
  if (flat !== b.selfHostMonthlyUsd) throw new Error('flat line not flat');
  if (last <= 0 || b.breakEvenTokensB <= 0) throw new Error('break-even bad');
  console.log('break-even ok, blended=$' + b.blendedApiPerM.toFixed(2) + '/1M, monthly=$' + b.selfHostMonthlyUsd.toFixed(0) + ', xMax=' + b.series[20].volumeB + 'B, be=' + b.breakEvenTokensB.toFixed(1) + 'B');
})"
```
Expected: prints `break-even ok, ...` with sensible positive numbers. (If this throws because `DEFAULT_INFERENCE_CONFIG` import path is wrong in your environment, use the same import path the app uses — `./src/data/defaults` — and report what you changed.)

- [ ] **Step 3: Commit**

```bash
git add src/utils/apiBreakEven.ts
git commit -m "feat(api): break-even math util for self-host vs API comparison"
```

---

### Task 3: API tab component (dropdowns, side-by-side, SVG chart, verdict)

**Files:**
- Create: `src/components/ResultsPanel/ApiTab.tsx`
- Modify: `src/i18n/tr.json`, `src/i18n/en.json` (add `results.api.*`)

**Interfaces:**
- Consumes: `CalculationResults` (`../../types`), `computeApiBreakEven` (`../../utils/apiBreakEven`), `API_TIERS`/`apiTierForParams`/`ApiTierId`/`ApiProviderPrice` (`../../data/apiPricePresets`), `useTranslation` (`react-i18next`), existing `Panel`/`Stat`/`Select`/`Badge` UI (`../ui/*`) as appropriate.
- Produces: default-exported `ApiTab` component rendering the API comparison. Props: `{ results: CalculationResults }`.

- [ ] **Step 1: Add i18n keys**

In `src/i18n/tr.json`, inside the `"results"` object, add:

```json
    "api": {
      "title": "API Karşılaştırması",
      "tierLabel": "Seviye",
      "providerLabel": "Sağlayıcı",
      "selfHost": "Kendi Sunucun",
      "api": "API",
      "per1MIn": "Giriş / 1M",
      "per1MOut": "Çıkış / 1M",
      "per1MTokens": "Toplam / 1M",
      "perMonth": "Aylık",
      "volumeUnit": "B token/ay",
      "costUnit": "$/ay",
      "verdictAbove": "~{{tokens}}B token/ay üzerinde kendi sunucun daha ucuz.",
      "verdictApi": "Hedeflenen hacimlerde API daha ekonomik.",
      "caveats": "Operasyon emeği (bakım, güncelleme, izleme) hariçtir; kullanım varsayımları TCO girdileriyle aynıdır.",
      "tier8b": "8B Sınıfı",
      "tier70b": "70B Sınıfı",
      "tierFrontier": "Frontier Sınıfı",
      "legendSelfHost": "Kendi sunucun (amortize donanım + elektrik)",
      "legendApi": "API (doğrusal)"
    }
```

In `src/i18n/en.json`, inside the `"results"` object, add:

```json
    "api": {
      "title": "API Comparison",
      "tierLabel": "Tier",
      "providerLabel": "Provider",
      "selfHost": "Self-hosted",
      "api": "API",
      "per1MIn": "Input / 1M",
      "per1MOut": "Output / 1M",
      "per1MTokens": "Total / 1M",
      "perMonth": "Monthly",
      "volumeUnit": "B tokens/mo",
      "costUnit": "$/mo",
      "verdictAbove": "Above ~{{tokens}}B tokens/month, self-hosting is cheaper.",
      "verdictApi": "API is cheaper at modeled volumes.",
      "caveats": "Excludes ops effort (maintenance, upgrades, monitoring); utilization assumptions match the TCO inputs.",
      "tier8b": "8B class",
      "tier70b": "70B class",
      "tierFrontier": "Frontier class",
      "legendSelfHost": "Self-hosted (amortized hardware + electricity)",
      "legendApi": "API (linear)"
    }
```

- [ ] **Step 2: Create `src/components/ResultsPanel/ApiTab.tsx`**

```tsx
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalculationResults } from '../../types';
import { API_TIERS, apiTierForParams, ApiTierId } from '../../data/apiPricePresets';
import { computeApiBreakEven } from '../../utils/apiBreakEven';

interface ApiTabProps {
  results: CalculationResults;
}

const TIER_KEYS: Record<ApiTierId, string> = {
  '8b': 'results.api.tier8b',
  '70b': 'results.api.tier70b',
  frontier: 'results.api.tierFrontier',
};

const CHART_W = 420;
const CHART_H = 220;
const PAD = { left: 46, right: 12, top: 16, bottom: 30 };

export const ApiTab: React.FC<ApiTabProps> = ({ results }) => {
  const { t } = useTranslation();
  const autoTier = apiTierForParams(results.totalParamsB);
  const [tierId, setTierId] = useState<ApiTierId>(autoTier);
  const tier = API_TIERS.find((x) => x.id === tierId) ?? API_TIERS[1];
  const [providerId, setProviderId] = useState(tier.providers[0].providerId);

  const b = useMemo(
    () => computeApiBreakEven(results, tierId, providerId),
    [results, tierId, providerId]
  );

  const plotW = CHART_W - PAD.left - PAD.right;
  const plotH = CHART_H - PAD.top - PAD.bottom;
  const maxX = b.series[b.series.length - 1].volumeB;
  const maxY = Math.max(...b.series.map((p) => Math.max(p.selfHostUsd, p.apiUsd))) * 1.15;

  const x = (v: number) => PAD.left + (v / maxX) * plotW;
  const y = (v: number) => PAD.top + plotH - (v / maxY) * plotH;

  const selfHostPath = b.series.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.volumeB).toFixed(1)},${y(p.selfHostUsd).toFixed(1)}`).join(' ');
  const apiPath = b.series.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.volumeB).toFixed(1)},${y(p.apiUsd).toFixed(1)}`).join(' ');
  const beX = x(b.breakEvenTokensB);
  const beY = y(b.selfHostMonthlyUsd);
  const showBe = b.breakEvenTokensB <= maxX;

  const gridLines = [0.25, 0.5, 0.75].map((f) => {
    const gy = PAD.top + plotH * (1 - f);
    return { gy, label: `$${Math.round(maxY * f).toLocaleString()}` };
  });

  const formatBe = b.breakEvenTokensB >= 100 ? b.breakEvenTokensB.toFixed(0) : b.breakEvenTokensB.toFixed(1);

  return (
    <div className="space-y-3">
      <div>
        <div className="text-[11px] font-mono uppercase tracking-wider text-muted">
          {t('results.api.title')}
        </div>
        <div className="text-[10px] font-mono text-muted mt-0.5">
          {results.totalParamsB}B • {t('results.api.selfHost')} vs {t('results.api.api')}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted">{t('results.api.tierLabel')}</span>
          <select
            value={tierId}
            onChange={(e) => {
              const next = e.target.value as ApiTierId;
              setTierId(next);
              const nt = API_TIERS.find((x) => x.id === next) ?? API_TIERS[1];
              setProviderId(nt.providers[0].providerId);
            }}
            className="mt-1 w-full bg-surface-2 border border-border rounded px-2 py-1.5 text-xs font-mono text-text focus:outline-none focus:border-accent"
          >
            {API_TIERS.map((x) => (
              <option key={x.id} value={x.id}>
                {t(TIER_KEYS[x.id])}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted">{t('results.api.providerLabel')}</span>
          <select
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
            className="mt-1 w-full bg-surface-2 border border-border rounded px-2 py-1.5 text-xs font-mono text-text focus:outline-none focus:border-accent"
          >
            {tier.providers.map((p) => (
              <option key={p.providerId} value={p.providerId}>
                {p.providerName} — {p.model}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="border border-border rounded bg-surface-2 p-2.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted mb-1">{t('results.api.selfHost')}</div>
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-muted">{t('results.api.per1MIn')}</span>
            <span className="text-text">${b.selfHostPerMIn.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-muted">{t('results.api.per1MOut')}</span>
            <span className="text-text">${b.selfHostPerMOut.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-muted">{t('results.api.per1MTokens')}</span>
            <span className="text-accent font-bold">${b.selfHostPerMTokens.toFixed(2)}</span>
          </div>
        </div>
        <div className="border border-border rounded bg-surface-2 p-2.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted mb-1">
            {t('results.api.api')} • {b.provider.providerName}
          </div>
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-muted">{t('results.api.per1MIn')}</span>
            <span className="text-text">${b.provider.inputPricePerM.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-muted">{t('results.api.per1MOut')}</span>
            <span className="text-text">${b.provider.outputPricePerM.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-muted">{t('results.api.per1MTokens')}</span>
            <span className="text-accent font-bold">${b.blendedApiPerM.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full h-auto border border-border rounded bg-surface-2">
        {gridLines.map((g) => (
          <g key={g.gy}>
            <line x1={PAD.left} y1={g.gy} x2={CHART_W - PAD.right} y2={g.gy} stroke="#2a2826" strokeWidth="1" strokeDasharray="3 3" />
            <text x={PAD.left - 6} y={g.gy + 3} textAnchor="end" fontSize="9" fill="#8e8b8b">{g.label}</text>
          </g>
        ))}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + plotH} stroke="#2a2826" strokeWidth="1" />
        <line x1={PAD.left} y1={PAD.top + plotH} x2={CHART_W - PAD.right} y2={PAD.top + plotH} stroke="#2a2826" strokeWidth="1" />
        <text x={PAD.left} y={PAD.top + plotH + 18} fontSize="9" fill="#8e8b8b">0</text>
        <text x={x(maxX / 2)} y={PAD.top + plotH + 18} textAnchor="middle" fontSize="9" fill="#8e8b8b">{(maxX / 2).toFixed(0)}{t('results.api.volumeUnit')}</text>
        <text x={x(maxX)} y={PAD.top + plotH + 18} textAnchor="end" fontSize="9" fill="#8e8b8b">{maxX.toFixed(0)}{t('results.api.volumeUnit')}</text>
        <path d={selfHostPath} fill="none" stroke="#3fb950" strokeWidth="2" />
        <path d={apiPath} fill="none" stroke="#ffb224" strokeWidth="2" />
        {showBe && (
          <g>
            <line x1={beX} y1={PAD.top} x2={beX} y2={PAD.top + plotH} stroke="#8e8b8b" strokeWidth="1" strokeDasharray="2 2" />
            <circle cx={beX} cy={beY} r="4" fill="#ffb224" />
            <text x={Math.min(beX + 4, CHART_W - PAD.right - 40)} y={beY - 6} fontSize="9" fill="#ffb224">~{formatBe}B</text>
          </g>
        )}
      </svg>

      <div className="flex flex-wrap gap-3 text-[10px] font-mono text-muted">
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#3fb950] inline-block" />{t('results.api.legendSelfHost')}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-accent inline-block" />{t('results.api.legendApi')}</span>
      </div>

      <div className="border border-border rounded p-2.5 bg-surface-2 space-y-1">
        <p className="text-[11px] font-mono text-text font-bold">
          {showBe ? t('results.api.verdictAbove', { tokens: formatBe }) : t('results.api.verdictApi')}
        </p>
        <p className="text-[10px] text-muted leading-snug">{t('results.api.caveats')}</p>
      </div>
    </div>
  );
};

export default ApiTab;
```

- [ ] **Step 3: Verify lint + build**

Run: `npm run lint` — expected: passes.
Run: `npm run build` — expected: succeeds.

Manual check: `npm run dev`, open `http://localhost:3000/app`, run the default Llama 3.3 70B config, open the **API** tab. Verify: tier defaults to "70B Sınıfı" (auto-mapped from 70B), provider defaults to OpenAI; the side-by-side shows self-host vs API $/1M; the SVG shows a flat green line and a rising amber line; the intersection dot is marked; the verdict reads "~X B token/ay üzerinde kendi sunucun daha ucuz."; toggling tier/provider updates the numbers, the chart, and the verdict. Toggle TR/EN — the tab renders in both languages.

- [ ] **Step 4: Commit**

```bash
git add src/components/ResultsPanel/ApiTab.tsx src/i18n/tr.json src/i18n/en.json
git commit -m "feat(api): break-even chart and side-by-side comparison in API tab"
```

---

### Task 4: Wire the API tab into ResultsPanel

**Files:**
- Modify: `src/components/ResultsPanel/index.tsx`

**Interfaces:**
- Consumes: `ApiTab` from `./ApiTab`.
- Produces: the `api` tab wired into `TABS` and the tab body; existing tabs unchanged.

- [ ] **Step 1: Add the import**

In `src/components/ResultsPanel/index.tsx`, add after the `TcoTab` import line:

```tsx
import { ApiTab } from './ApiTab';
```

- [ ] **Step 2: Add the tab to `TABS`**

Change the `TABS` array to append the API tab:

```tsx
const TABS = [
  { id: 'vram', label: 'VRAM' },
  { id: 'perf', label: 'PERF' },
  { id: 'cost', label: 'COST' },
  { id: 'cloud', label: 'CLOUD' },
  { id: 'tco', label: 'TCO' },
  { id: 'api', label: 'API' },
];
```

- [ ] **Step 3: Render the tab body**

Add inside the tab-body `<div className="p-3.5">` after the `TcoTab` line:

```tsx
        {tab === 'api' && <ApiTab results={results} />}
```

- [ ] **Step 4: Verify lint + build + smoke**

Run: `npm run lint` — passes.
Run: `npm run build` — passes.

`npm run dev`, open `/app`: all six tabs render; VRAM/PERF/COST/CLOUD/TCO behavior unchanged; API tab matches Task 3's manual check. Also verify the shareable `?c=` URL still round-trips (existing behavior unchanged — no config/URL changes were made).

- [ ] **Step 5: Commit**

```bash
git add src/components/ResultsPanel/index.tsx
git commit -m "feat(api): wire API break-even tab into ResultsPanel"
```

---

### Task 5: i18n sweep + final verification

**Files:**
- Modify: `src/i18n/tr.json`, `src/i18n/en.json` (verify parity)
- Modify: `AGENTS.md` (optional note: next planned work → Phase 4 polish wave)

- [ ] **Step 1: Verify key parity**

Run:
```bash
python3 -c "
import json
tr=json.load(open('src/i18n/tr.json'))
en=json.load(open('src/i18n/en.json'))
def keys(d,p=''):
    out=set()
    for k,v in d.items():
        kk=f'{p}.{k}' if p else k
        if isinstance(v,dict): out|=keys(v,kk)
        else: out.add(kk)
    return out
missing_en=keys(tr)-keys(en); missing_tr=keys(en)-keys(tr)
print('missing in en:', sorted(missing_en))
print('missing in tr:', sorted(missing_tr))
assert not missing_en and not missing_tr
print('parity ok')
"
```
Expected: `parity ok` (and empty missing lists).

Also verify no leftover hardcoded Turkish UI strings in the new component:
```bash
rg -n "[çğıöşüÇĞİÖŞÜ]" src/components/ResultsPanel/ApiTab.tsx || echo "clean"
```
Expected: `clean` (or only the Turkish strings inside `t(...)` key lookups if any were used — there should be none; all copy is via i18n keys).

- [ ] **Step 2: Run final checks**

`npm run lint` ✅, `npm run build` ✅. Manual smoke via `npm run dev`: API tab renders in TR/EN, chart/verdict correct, all five pre-existing tabs unchanged, `?c=` share URLs still hydrate.

- [ ] **Step 3: Update AGENTS.md next-work note (optional)**

Read `AGENTS.md`; change "next planned work ... is Phase 3 (API break-even comparison)" to reference Phase 4 (Ember Refined polish wave) as next.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/tr.json src/i18n/en.json AGENTS.md
git commit -m "chore(api): verify i18n parity and update next-work note"
```

---

## Self-Review

**Spec coverage (Phase 3):**
- New static preset `src/data/apiPricePresets.ts` with 3 tiers × 5 providers ($/1M in/out: OpenAI, Anthropic, Google, DeepSeek, Mistral) — Task 1.
- Selected model auto-maps to a tier by parameter count; user overrides via dropdown — Task 1 (`apiTierForParams`) + Task 3 (tier `<select>`).
- New "API" tab in ResultsPanel, side-by-side self-host cost vs API tier in/out — Task 3/4.
- Break-even chart (hand-rolled SVG, existing Ember style), x=monthly volume, y=monthly cost, flat self-host line vs linear API line, marked intersection — Task 2/3.
- One-line verdict + caveats — Task 3.
- Scope guard: no new calc math, only presentation + static table — Task 2/3 (everything derives from existing `CalculationResults`); no changes to calculator/config/shareUrl — enforced in Global Constraints and Task 4.

**Placeholder scan:** no TBD/TODO; every step has concrete code and expected output.

**Type consistency:** `computeApiBreakEven(results, tierId, providerId)` matches its definition and Task 3's call. `API_TIERS`/`apiTierForParams`/`getApiTier`/`ApiTierId`/`ApiProviderPrice` names consistent across Tasks 1-3. `ApiTab` props `{ results }` match Task 4's `<ApiTab results={results} />`. `results.api.*` keys referenced in Task 3 all exist in the Task 3 dictionary blocks.