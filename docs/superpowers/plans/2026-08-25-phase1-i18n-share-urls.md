# Phase 1: i18n + Shareable URLs + Route Split — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the calculator bilingual (TR/EN), give every scenario a shareable URL, and split routing so `/app` hosts the calculator (landing page comes in Phase 2).

**Architecture:** `react-i18next` with two JSON dictionaries (`tr`/`en`), browser language detection + localStorage persistence. Share links serialize the active config to `base64url(JSON)` in a `?c=` query param, hydrated on load and validated by merging onto typed defaults. Express 302-redirects `/` → `/app` until the Phase 2 landing page exists.

**Tech Stack:** React 19, Vite 6, Express 4, i18next / react-i18next / i18next-browser-languagedetector, Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-08-25-public-tool-growth-design.md` (Phase 1 section).

## Global Constraints

- **Verbatim Turkish:** existing Turkish UI strings must appear EXACTLY unchanged as the `tr` dictionary values. A past regression was fixed under commit `83c5b3d` ("restore verbatim Turkish labels") — do not reword, fix typos, or normalize casing of existing strings.
- **Data files stay untranslated:** `src/data/models/*`, `src/data/modelCatalog.ts`, `src/data/gpuPresets.ts`, `src/data/cloudProviders.ts`, `src/data/fineTuningPresets.ts`, quantization/engine `description`/`features` fields — all remain as-is. Only UI chrome (labels, headings, buttons, hints) is i18n'd. Exception: `PRESET_SCENARIOS` titles/descriptions and `DEFAULT_USER_PROFILES` names, handled via id-keyed lookups in Task 9.
- **No new dependencies** beyond `i18next`, `react-i18next`, `i18next-browser-languagedetector`.
- **No test framework exists.** Verification for every task is: `npm run lint` + `npm run build` + the listed manual checks. Do not add a test framework.
- **No comments** added to code (repo convention), except where a file already has them.
- The secret admin route (`window.location.pathname === '/admnsterrrrr'` in `App.tsx`) must keep working unchanged.
- Do not touch the `DISABLE_HMR` block in `vite.config.ts`.
- Commit messages follow repo style: `feat:`, `fix:`, `chore:` prefixes, short imperative subject.

## File Structure

**New files:**
- `src/i18n/index.ts` — i18next init (detector, persistence, `<html lang>` sync)
- `src/i18n/tr.json` — Turkish dictionary (values = verbatim existing strings)
- `src/i18n/en.json` — English dictionary
- `src/components/LanguageSwitcher.tsx` — TR/EN pill for the Header
- `src/data/defaults.ts` — `DEFAULT_INFERENCE_CONFIG`, `DEFAULT_FINETUNING_CONFIG` (extracted from `App.tsx`)
- `src/utils/shareUrl.ts` — encode/decode/validate scenario URLs
- `src/server/i18nErrors.ts` — `pickLang(req)` + `msg(lang, tr, en)` helper for server error messages

**Modified files:**
- `tsconfig.json` — add `resolveJsonModule`
- `src/main.tsx` — import `./i18n`
- `src/App.tsx` — use defaults constants, hydrate from `?c=`, copy-link handler, pass props
- `src/components/Header.tsx` — i18n + LanguageSwitcher + copy-link button
- `src/components/Footer.tsx`, `ModelSelector.tsx`, `QuantizationSelector.tsx`, `InferenceEngineSelector.tsx`, `GpuConfigurator.tsx`, `WorkloadConfigurator.tsx`, `ResultsPanel/*.tsx`, `GpuComparisonTable.tsx`, `ContextScalingChart.tsx`, `FineTuningConfigPanel.tsx`, `FineTuningResultsPanel/*.tsx`, `FineTuningPlatformCompare.tsx`, `FineTuningCodeExport.tsx`, `AiAdvisorModal.tsx`, `ExportModal.tsx`, `ScenarioModal.tsx`, `ScenarioComparisonModal.tsx`, `AboutModal.tsx`, `AdminGate.tsx`, `AdminPanel.tsx` — string extraction
- `server.ts` — `/` → `/app` redirect, bilingual errors in inline endpoints, advisor language param
- `src/server/hfModels.ts`, `src/server/gpuPrices.ts`, `src/server/adminAuth.ts` — bilingual errors

## i18n Extraction Pattern (used by Tasks 2–8)

Every extraction task follows the same mechanical transformation. Worked example from `Header.tsx`:

Before:
```tsx
<Segmented
  value={activeTab}
  onChange={onChangeTab}
  options={[
    { value: 'inference' as const, label: '1. Çıkarım' },
    { value: 'finetuning' as const, label: '2. Fine-Tuning' },
  ]}
/>
```

After:
```tsx
const { t } = useTranslation();
...
<Segmented
  value={activeTab}
  onChange={onChangeTab}
  options={[
    { value: 'inference' as const, label: t('header.tabInference') },
    { value: 'finetuning' as const, label: t('header.tabFinetuning') },
  ]}
/>
```

With dictionary entries (`src/i18n/tr.json` / `src/i18n/en.json`):
```json
{ "header": { "tabInference": "1. Çıkarım", "tabFinetuning": "2. Fine-Tuning" } }
```
```json
{ "header": { "tabInference": "1. Inference", "tabFinetuning": "2. Fine-Tuning" } }
```

Rules for every extraction task:
1. Read the target file(s). Every string literal shown to the user (labels, titles, tooltips, placeholders, button text, status text, empty states) becomes a `t('<ns>.<key>')` call.
2. Key names: English, camelCase, grouped by namespace given in the task. Dynamic values use interpolation: `t('results.concurrentUsers', { count: 16 })` with `"{{count}} eşzamanlı kullanıcı"` — never string-concatenate translations.
3. `tr.json` value = the exact current string. `en.json` value = your English translation (concise, technical tone).
4. Strings that are data (model/GPU names from props, engine badges, quant names) stay as rendered from props — do not extract those.
5. Completion criteria per task: `rg "[ÇĞİÖŞÜçğışöü]" <target files>` returns ZERO matches; `npm run lint` passes; `npm run build` passes; manual toggle check (see task).

Manual toggle check (applies to every extraction task): run `npm run dev`, open http://localhost:3000/app, toggle TR/EN — the extracted area renders correctly in both languages with no missing keys (no raw `header.xyz` text visible) and no layout breakage.

---

### Task 1: i18n infrastructure + LanguageSwitcher

**Files:**
- Modify: `package.json` (deps), `tsconfig.json`, `src/main.tsx`, `src/components/Header.tsx`
- Create: `src/i18n/index.ts`, `src/i18n/tr.json`, `src/i18n/en.json`, `src/components/LanguageSwitcher.tsx`

**Interfaces:**
- Produces: default-exported configured `i18n` instance; `useTranslation()` works anywhere; `LanguageSwitcher` component (no props).

- [ ] **Step 1: Install dependencies**

```bash
npm install i18next react-i18next i18next-browser-languagedetector
```

- [ ] **Step 2: Enable JSON imports**

In `tsconfig.json` `compilerOptions`, add:
```json
"resolveJsonModule": true
```

- [ ] **Step 3: Create `src/i18n/index.ts`**

```ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import tr from './tr.json';
import en from './en.json';

void i18n.use(LanguageDetector).use(initReactI18next).init({
  resources: {
    tr: { translation: tr },
    en: { translation: en },
  },
  fallbackLng: 'en',
  supportedLngs: ['tr', 'en'],
  load: 'languageOnly',
  interpolation: { escapeValue: false },
  detection: {
    order: ['localStorage', 'navigator'],
    caches: ['localStorage'],
    lookupLocalStorage: 'llmcalc:lang',
  },
});

document.documentElement.lang = i18n.resolvedLanguage || 'en';
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});

export default i18n;
```

- [ ] **Step 4: Seed dictionaries**

`src/i18n/tr.json`:
```json
{
  "common": {
    "copyLink": "Bağlantıyı Kopyala",
    "copied": "Kopyalandı"
  },
  "header": {
    "language": "Dil"
  }
}
```

`src/i18n/en.json`:
```json
{
  "common": {
    "copyLink": "Copy link",
    "copied": "Copied"
  },
  "header": {
    "language": "Language"
  }
}
```

(These grow in later tasks; keep keys sorted by namespace as they are added.)

- [ ] **Step 5: Import i18n in `src/main.tsx`**

Add after `import './index.css';`:
```ts
import './i18n';
```

- [ ] **Step 6: Create `src/components/LanguageSwitcher.tsx`**

```tsx
import React from 'react';
import { useTranslation } from 'react-i18next';

const LANGS = ['tr', 'en'] as const;

export const LanguageSwitcher: React.FC = () => {
  const { t, i18n } = useTranslation();
  const current = i18n.resolvedLanguage === 'tr' ? 'tr' : 'en';

  return (
    <div
      role="group"
      aria-label={t('header.language')}
      className="flex items-center rounded border border-border overflow-hidden"
    >
      {LANGS.map((lng) => (
        <button
          key={lng}
          onClick={() => void i18n.changeLanguage(lng)}
          className={`px-2 py-1.5 text-[11px] font-bold uppercase transition-colors ${
            current === lng
              ? 'bg-accent text-bg'
              : 'bg-surface-2 text-muted hover:text-text'
          }`}
        >
          {lng}
        </button>
      ))}
    </div>
  );
};
```

- [ ] **Step 7: Mount the switcher in `Header.tsx`**

In `src/components/Header.tsx`, import `LanguageSwitcher` and render it as the FIRST element inside the action-buttons div (`<div className="flex items-center gap-2">`, line ~63), before the presets dropdown:

```tsx
<LanguageSwitcher />
```

- [ ] **Step 8: Verify**

```bash
npm run lint && npm run build
```
Then `npm run dev`: open http://localhost:3000, confirm the TR/EN pill appears in the header; click EN → `<html lang>` becomes `en`; reload → selection persists (localStorage `llmcalc:lang`); a browser with `tr` language defaults to TR, anything else defaults to EN (test with devtools console: `localStorage.removeItem('llmcalc:lang'); location.reload()`).

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json src/main.tsx src/i18n src/components/LanguageSwitcher.tsx src/components/Header.tsx
git commit -m "feat(i18n): i18next infrastructure and language switcher"
```

---

### Task 2: Extract defaults from App.tsx + Header/Footer i18n

**Files:**
- Create: `src/data/defaults.ts`
- Modify: `src/App.tsx`, `src/components/Header.tsx`, `src/components/Footer.tsx`, `src/i18n/tr.json`, `src/i18n/en.json`

**Interfaces:**
- Produces: `DEFAULT_INFERENCE_CONFIG: CalculatorConfig` and `DEFAULT_FINETUNING_CONFIG: FineTuningConfig` from `src/data/defaults.ts` (used by App.tsx now and by `shareUrl.ts` in Task 12).

- [ ] **Step 1: Create `src/data/defaults.ts`**

Move the two inline default objects out of `App.tsx` (the `useState` initializers at lines ~37–97 — the identical copies inside `handleReset` are deleted in step 2):

```ts
import { CalculatorConfig, FineTuningConfig } from '../types';
import { DEFAULT_CUSTOM_MODEL, DEFAULT_CUSTOM_GPU, DEFAULT_USER_PROFILES } from './presets';

export const DEFAULT_INFERENCE_CONFIG: CalculatorConfig = {
  modelId: 'llama-3.3-70b',
  customModel: DEFAULT_CUSTOM_MODEL,
  quantId: 'fp8',
  kvCacheQuantId: 'fp8',
  engineId: 'vllm',
  gpuId: 'nvidia-h100-sxm',
  customGpu: DEFAULT_CUSTOM_GPU,
  gpuCount: 1,
  tensorParallelism: 1,
  pipelineParallelism: 1,
  promptLen: 4096,
  genLen: 1024,
  batchSize: 16,
  userProfiles: DEFAULT_USER_PROFILES,
  useMultiProfile: true,
  requestsPerMin: 120,
  cudaOverheadGB: 1.5,
  activationOverheadPct: 10,
  tpEfficiencyPct: 85,
  electricityRateTryPerKwh: 4.20,
  usdToTryRate: 50,
  pueRatio: 1.25,
  serverDutyCyclePct: 85,
  customGpuUnitPriceUsd: null,
  customSystemBasePriceUsd: null,
  customAnnualElectricityUsd: null,
  customAnnualCoolingUsd: null,
  customAnnualMaintenanceUsd: null,
  customAnnualOtherExpensesUsd: null,
};

export const DEFAULT_FINETUNING_CONFIG: FineTuningConfig = {
  modelId: 'llama-3.3-70b',
  customModel: DEFAULT_CUSTOM_MODEL,
  methodId: 'qlora',
  frameworkId: 'unsloth',
  gpuId: 'nvidia-rtx-4090',
  customGpu: DEFAULT_CUSTOM_GPU,
  gpuCount: 1,
  sampleCount: 10000,
  avgSeqLen: 2048,
  epochs: 3,
  perDeviceBatchSize: 2,
  gradientAccumulationSteps: 4,
  learningRate: '2e-4',
  loraRank: 16,
  loraAlpha: 32,
  optimizerType: 'adamw_8bit',
  gradientCheckpointing: true,
  flashAttention: true,
  useUnslothAcceleratedKernels: true,
  electricityRateTryPerKwh: 4.20,
  usdToTryRate: 50,
};
```

- [ ] **Step 2: Use the constants in `App.tsx`**

Replace the inline `useState({...})` initializers for `config` and `ftConfig` with:
```tsx
const [config, setConfig] = useState<CalculatorConfig>({ ...DEFAULT_INFERENCE_CONFIG });
const [ftConfig, setFtConfig] = useState<FineTuningConfig>({ ...DEFAULT_FINETUNING_CONFIG });
```
Replace the `handleReset` body with:
```tsx
const handleReset = () => {
  setConfig({ ...DEFAULT_INFERENCE_CONFIG });
  setFtConfig({ ...DEFAULT_FINETUNING_CONFIG });
};
```
Import from `./data/defaults`. Remove now-unused imports (`DEFAULT_CUSTOM_MODEL`, `DEFAULT_CUSTOM_GPU`, `DEFAULT_USER_PROFILES` from `./data/presets` IF no longer referenced in App.tsx; `GPU_PRESETS` and `MODEL_PRESETS` stay).

- [ ] **Step 3: Extract `Header.tsx` strings → `header.*`**

Apply the extraction pattern (see top of plan). Required keys (TR value verbatim → EN translation):

| key | tr | en |
|---|---|---|
| `header.tabInference` | `1. Çıkarım` | `1. Inference` |
| `header.tabFinetuning` | `2. Fine-Tuning` | `2. Fine-Tuning` |
| `header.scenarios` | `Senaryolar` | `Scenarios` |
| `header.scenarioTemplates` | `Senaryo Şablonları` | `Scenario Templates` |
| `header.save` | `Kaydet` | `Save` |
| `header.saveTitle` | `Senaryo kaydet / yönet` | `Save / manage scenarios` |
| `header.compare` | `Karşılaştır` | `Compare` |
| `header.compareTitle` | `Senaryoları karşılaştır` | `Compare scenarios` |
| `header.aiAdvisor` | `AI Mimar` | `AI Architect` |
| `header.export` | `Dışa Aktar` | `Export` |
| `header.exportTitle` | `Konfigürasyon ve Komut Çıktısı Al` | `Get configuration and command output` |
| `header.resetTitle` | `Varsayılan Değerlere Sıfırla` | `Reset to defaults` |
| `header.subtitle` | `Çıkarım (Inference) Sizing • Fine-Tuning Maliyeti • Unsloth • Colab & Cloud TCO` | `Inference Sizing • Fine-Tuning Cost • Unsloth • Colab & Cloud TCO` |

Note: `PRESET_SCENARIOS` titles/descriptions rendered in the dropdown stay from data for now (Task 9 handles them). The h1 `LLM Hardware & Cost Architect` is already English — leave as-is.

- [ ] **Step 4: Extract `Footer.tsx` strings → `footer.*`**

Read `src/components/Footer.tsx` and extract every user-visible string under `footer.*` (same rules; TR verbatim).

- [ ] **Step 5: Verify**

```bash
npm run lint && npm run build
rg "[ÇĞİÖŞÜçğışöü]" src/components/Header.tsx src/components/Footer.tsx
```
Expected: lint/build pass, rg returns nothing. Manual toggle check for header + footer. Also confirm Reset still restores defaults.

- [ ] **Step 6: Commit**

```bash
git add src/data/defaults.ts src/App.tsx src/components/Header.tsx src/components/Footer.tsx src/i18n
git commit -m "feat(i18n): extract defaults; translate header and footer"
```

---

### Task 3: ModelSelector + QuantizationSelector + InferenceEngineSelector i18n

**Files:**
- Modify: `src/components/ModelSelector.tsx`, `src/components/QuantizationSelector.tsx`, `src/components/InferenceEngineSelector.tsx`, `src/i18n/tr.json`, `src/i18n/en.json`

**Interfaces:**
- Consumes: i18n setup from Task 1.

- [ ] **Step 1: Extract `ModelSelector.tsx` → `model.*`**

Extract all static UI strings: section titles, filter labels (capability/hardware filters), search placeholder, custom-model form labels, badges such as `HF'DEN DOĞRULANAMADI` and `TOPLULUK AYNASI`, empty-state texts, AI-recommendation modal labels inside this file. Do NOT extract model names, provider names, or `description` fields coming from the `models` prop.

- [ ] **Step 2: Extract `QuantizationSelector.tsx` → `quant.*`**

Extract labels/headings/hints. Quant names (`FP8`, `Q4_K_M`…) and `qualityDegradation`/`description` from data stay as-is.

- [ ] **Step 3: Extract `InferenceEngineSelector.tsx` → `engine.*`**

Extract labels/headings/hints. Engine names/badges/features from data stay as-is.

- [ ] **Step 4: Verify**

```bash
npm run lint && npm run build
rg "[ÇĞİÖŞÜçğışöü]" src/components/ModelSelector.tsx src/components/QuantizationSelector.tsx src/components/InferenceEngineSelector.tsx
```
Expected: clean. Manual toggle check across the three selectors, including the custom-model form and filter dropdowns.

- [ ] **Step 5: Commit**

```bash
git add src/components/ModelSelector.tsx src/components/QuantizationSelector.tsx src/components/InferenceEngineSelector.tsx src/i18n
git commit -m "feat(i18n): translate model, quantization and engine selectors"
```

---

### Task 4: GpuConfigurator + WorkloadConfigurator i18n

**Files:**
- Modify: `src/components/GpuConfigurator.tsx`, `src/components/WorkloadConfigurator.tsx`, `src/i18n/tr.json`, `src/i18n/en.json`

**Interfaces:**
- Consumes: i18n setup from Task 1.

- [ ] **Step 1: Extract `GpuConfigurator.tsx` → `gpu.*`**

Extract section titles, field labels (GPU count, tensor parallelism, custom GPU form fields), hints, tier labels. GPU names/descriptions from data stay as-is.

- [ ] **Step 2: Extract `WorkloadConfigurator.tsx` → `workload.*`**

Extract field labels (prompt/gen length, batch size, requests/min, overheads, TP efficiency), multi-profile toggle labels, user-profile table headers and add/remove buttons. Profile NAMES come from data (Task 9) — leave them.

- [ ] **Step 3: Verify**

```bash
npm run lint && npm run build
rg "[ÇĞİÖŞÜçğışöü]" src/components/GpuConfigurator.tsx src/components/WorkloadConfigurator.tsx
```
Expected: clean. Manual toggle check incl. custom-GPU form and profile editor.

- [ ] **Step 4: Commit**

```bash
git add src/components/GpuConfigurator.tsx src/components/WorkloadConfigurator.tsx src/i18n
git commit -m "feat(i18n): translate GPU and workload configurators"
```

---

### Task 5: ResultsPanel cluster i18n

**Files:**
- Modify: `src/components/ResultsPanel/index.tsx`, `VramTab.tsx`, `PerfTab.tsx`, `CostTab.tsx`, `CloudTab.tsx`, `TcoTab.tsx`, `src/components/GpuComparisonTable.tsx`, `src/components/ContextScalingChart.tsx`, `src/i18n/tr.json`, `src/i18n/en.json`

**Interfaces:**
- Consumes: i18n setup from Task 1.

- [ ] **Step 1: Extract `ResultsPanel/index.tsx` → `results.*`**

Worked example (real strings from this file):

Before:
```tsx
{config.gpuCount}x {results.gpuName} • {results.activeTotalUsers} eşzamanlı kullanıcı •{' '}
...
<span>Analiz Et</span>
...
<span className="text-muted uppercase tracking-wider">VRAM Doluluk</span>
...
<Stat label="Aylık Maliyet" ...
<Stat label="Sistem Throughput" ...
```

After:
```tsx
{config.gpuCount}x {results.gpuName} • {t('results.concurrentUsers', { count: results.activeTotalUsers })} •{' '}
...
<span>{t('results.analyze')}</span>
...
<span className="text-muted uppercase tracking-wider">{t('results.vramUsage')}</span>
...
<Stat label={t('results.monthlyCost')} ...
<Stat label={t('results.systemThroughput')} ...
```

Dictionary (TR verbatim):
```json
"results": {
  "concurrentUsers": "{{count}} eşzamanlı kullanıcı",
  "analyze": "Analiz Et",
  "vramUsage": "VRAM Doluluk",
  "monthlyCost": "Aylık Maliyet",
  "systemThroughput": "Sistem Throughput"
}
```
```json
"results": {
  "concurrentUsers": "{{count}} concurrent users",
  "analyze": "Analyze",
  "vramUsage": "VRAM Usage",
  "monthlyCost": "Monthly Cost",
  "systemThroughput": "System Throughput"
}
```

Tab ids/labels `VRAM/PERF/COST/CLOUD/TCO` are already language-neutral — leave as-is.

- [ ] **Step 2: Extract the five tabs → `results.vram.*`, `results.perf.*`, `results.cost.*`, `results.cloud.*`, `results.tco.*`**

Same rules for `VramTab.tsx`, `PerfTab.tsx`, `CostTab.tsx`, `CloudTab.tsx`, `TcoTab.tsx`. Provider names, instance names and notes coming from data objects stay as-is; TCO form labels and computed-sentence fragments (e.g. `breakEvenDescription` is data from the calculator — render as-is, do not extract).

- [ ] **Step 3: Extract `GpuComparisonTable.tsx` → `results.compare.*` and `ContextScalingChart.tsx` → `results.context.*`**

- [ ] **Step 4: Verify**

```bash
npm run lint && npm run build
rg "[ÇĞİÖŞÜçğışöü]" src/components/ResultsPanel src/components/GpuComparisonTable.tsx src/components/ContextScalingChart.tsx
```
Expected: clean. Manual toggle check across all five result tabs + comparison table + context chart.

- [ ] **Step 5: Commit**

```bash
git add src/components/ResultsPanel src/components/GpuComparisonTable.tsx src/components/ContextScalingChart.tsx src/i18n
git commit -m "feat(i18n): translate results panel, GPU comparison and context chart"
```

---

### Task 6: Fine-tuning components i18n

**Files:**
- Modify: `src/components/FineTuningConfigPanel.tsx`, `src/components/FineTuningResultsPanel/index.tsx`, `FineTuningResultsPanel/VramTab.tsx`, `FineTuningResultsPanel/TimeTab.tsx`, `FineTuningResultsPanel/CostTab.tsx`, `src/components/FineTuningPlatformCompare.tsx`, `src/components/FineTuningCodeExport.tsx`, `src/i18n/tr.json`, `src/i18n/en.json`

**Interfaces:**
- Consumes: i18n setup from Task 1.

- [ ] **Step 1: Extract `FineTuningConfigPanel.tsx` → `ft.config.*`**

Method/framework names, badges and descriptions from `fineTuningPresets.ts` data stay as-is; extract form labels, section titles, hyperparameter labels, toggles, dataset presets UI labels.

- [ ] **Step 2: Extract `FineTuningResultsPanel/*` → `ft.results.*`**

Tab labels in `index.tsx` and all stat labels/sentences in the three tabs. `trainingTimeFormatted`, `autoOptimizedSummary` and code snippets are computed/data — render as-is.

- [ ] **Step 3: Extract `FineTuningPlatformCompare.tsx` → `ft.platform.*`**

Table headers, badges, legend texts. Platform names/notes from data stay as-is.

- [ ] **Step 4: Extract `FineTuningCodeExport.tsx` → `ft.code.*`**

Tab labels, copy buttons, hints. Generated code blocks stay as-is.

- [ ] **Step 5: Verify**

```bash
npm run lint && npm run build
rg "[ÇĞİÖŞÜçğışöü]" src/components/FineTuningConfigPanel.tsx src/components/FineTuningResultsPanel src/components/FineTuningPlatformCompare.tsx src/components/FineTuningCodeExport.tsx
```
Expected: clean. Manual toggle check on the Fine-Tuning tab end to end.

- [ ] **Step 6: Commit**

```bash
git add src/components/FineTuningConfigPanel.tsx src/components/FineTuningResultsPanel src/components/FineTuningPlatformCompare.tsx src/components/FineTuningCodeExport.tsx src/i18n
git commit -m "feat(i18n): translate fine-tuning components"
```

---

### Task 7: Modals i18n + advisor language

**Files:**
- Modify: `src/components/AiAdvisorModal.tsx`, `src/components/ExportModal.tsx`, `src/components/ScenarioModal.tsx`, `src/components/ScenarioComparisonModal.tsx`, `src/components/AboutModal.tsx`, `server.ts`, `src/i18n/tr.json`, `src/i18n/en.json`

**Interfaces:**
- Consumes: i18n setup from Task 1.
- Produces: `/api/advisor` accepts optional `lang: 'tr' | 'en'` in the request body.

- [ ] **Step 1: Extract `AiAdvisorModal.tsx` → `advisor.*`**

Extract chrome strings (title, placeholder, buttons, loading/error states). The AI-generated advice text is rendered as-is. In the fetch call to `/api/advisor`, add the current language to the body:

```tsx
const { t, i18n } = useTranslation();
...
body: JSON.stringify({ ..., lang: i18n.resolvedLanguage === 'tr' ? 'tr' : 'en' }),
```

- [ ] **Step 2: Make `/api/advisor` respect `lang` (server.ts)**

In the `/api/advisor` handler, read `lang` from `req.body` and replace the fixed line in the prompt:

Before:
```
Provide a structured analysis in Turkish (or bilingual terms) covering:
```
After (template-built before the prompt string):
```ts
const adviceLang = req.body?.lang === 'en' ? 'English' : 'Turkish';
```
```
Provide a structured analysis in ${adviceLang} (or bilingual terms) covering:
```

- [ ] **Step 3: Extract `ExportModal.tsx` → `export.*`**

Tab labels, buttons, descriptions. Generated CLI/k8s/JSON/markdown output stays as-is.

- [ ] **Step 4: Extract `ScenarioModal.tsx` → `scenarios.*` and `ScenarioComparisonModal.tsx` → `compare.*`**

Form labels, empty states, table headers, buttons. Saved-scenario names (user input) render as-is.

- [ ] **Step 5: Extract `AboutModal.tsx` → `about.*`**

This file contains long methodology prose in Turkish. Translate it into concise, accurate English for `en.json`; keep the Turkish text verbatim in `tr.json`. Split into logical paragraph keys (`about.section1` … or per heading) rather than one giant string.

- [ ] **Step 6: Verify**

```bash
npm run lint && npm run build
rg "[ÇĞİÖŞÜçğışöü]" src/components/AiAdvisorModal.tsx src/components/ExportModal.tsx src/components/ScenarioModal.tsx src/components/ScenarioComparisonModal.tsx src/components/AboutModal.tsx
```
Expected: clean. Manual toggle check for every modal; with `GEMINI_API_KEY` set confirm the advisor answers in the active language (without the key, confirm the 503 path still renders its error state).

- [ ] **Step 7: Commit**

```bash
git add src/components/AiAdvisorModal.tsx src/components/ExportModal.tsx src/components/ScenarioModal.tsx src/components/ScenarioComparisonModal.tsx src/components/AboutModal.tsx server.ts src/i18n
git commit -m "feat(i18n): translate modals; advisor responds in active language"
```

---

### Task 8: Admin screens i18n

**Files:**
- Modify: `src/components/AdminGate.tsx`, `src/components/AdminPanel.tsx`, `src/i18n/tr.json`, `src/i18n/en.json`

**Interfaces:**
- Consumes: i18n setup from Task 1.

- [ ] **Step 1: Extract `AdminGate.tsx` → `admin.*`**

Login form labels, error messages, lockout text.

- [ ] **Step 2: Extract `AdminPanel.tsx` → `admin.*`**

Panel titles, refresh buttons, result-summary labels. Server-returned summary strings (provider names, error messages from refresh responses) render as-is — server-side bilingual errors land in Task 10.

- [ ] **Step 3: Verify**

```bash
npm run lint && npm run build
rg "[ÇĞİÖŞÜçğışöü]" src/components/AdminGate.tsx src/components/AdminPanel.tsx
```
Expected: clean. Manual check at `/admnsterrrrr` in both languages (login flow with `ADMIN_USERNAME`/`ADMIN_PASSWORD` from `.env`).

- [ ] **Step 4: Commit**

```bash
git add src/components/AdminGate.tsx src/components/AdminPanel.tsx src/i18n
git commit -m "feat(i18n): translate admin screens"
```

---

### Task 9: Preset scenarios & user profiles (id-keyed, with fallback)

**Files:**
- Modify: `src/components/Header.tsx`, `src/components/WorkloadConfigurator.tsx` (wherever profile names render), `src/i18n/tr.json`, `src/i18n/en.json`

**Interfaces:**
- Consumes: i18n setup; `PRESET_SCENARIOS` ids (`local-ollama`, `startup-api`, `deepseek-r1-cluster`, …) and `DEFAULT_USER_PROFILES` ids (`profile-chat`, `profile-rag`, `profile-code`).

- [ ] **Step 1: Add id-keyed entries to both dictionaries**

For EVERY preset scenario in `src/data/presets.ts` (`PRESET_SCENARIOS`) add to `tr.json` (verbatim) and `en.json` (translated):

```json
"scenarios": {
  "local-ollama": {
    "title": "Yerel Masaüstü / Ollama (RTX 4090)",
    "description": "RTX 4090 24GB kart üzerinde Llama 3.3 70B Q4_K_M veya Qwen 2.5 32B çalıştırma."
  },
  "startup-api": {
    "title": "Girişim / SaaS API Sunucusu (1x H100)",
    "description": "Llama 3.3 70B FP8 hassasiyetinde vLLM ile 16 eşzamanlı kullanıcıya hizmet verme."
  }
}
```
(…and so on for every scenario in the array.) English examples: `"Desktop / Ollama (RTX 4090)"`, `"Run Llama 3.3 70B Q4_K_M or Qwen 2.5 32B on a 24GB RTX 4090."`

Same for profiles under `"profiles"`:
```json
"profiles": {
  "profile-chat": { "name": "Sohbet Kullanıcıları (Chat)" },
  "profile-rag": { "name": "RAG & Belge Arama" },
  "profile-code": { "name": "Kod Asistanı (Coding)" }
}
```
EN: `"Chat Users"`, `"RAG & Document Search"`, `"Coding Assistant"`.

- [ ] **Step 2: Use fallback lookups where they render**

In `Header.tsx` presets dropdown:
```tsx
<span className="font-semibold text-accent">{t(`scenarios.${s.id}.title`, s.title)}</span>
<span className="text-[10px] text-muted line-clamp-1">{t(`scenarios.${s.id}.description`, s.description)}</span>
```
Wherever user-profile names render (profile editor/summary in `WorkloadConfigurator.tsx` and any other renderer — find with `rg "\.name" src/components | rg profile`):
```tsx
{t(`profiles.${profile.id}.name`, profile.name)}
```
The second argument is i18next's defaultValue fallback, so user-created profiles (random ids) keep showing their own names.

- [ ] **Step 3: Verify**

```bash
npm run lint && npm run build
```
Manual toggle check: presets dropdown and profile names switch languages; a manually created profile name still displays.

- [ ] **Step 4: Commit**

```bash
git add src/components/Header.tsx src/components/WorkloadConfigurator.tsx src/i18n
git commit -m "feat(i18n): translate preset scenarios and user profile names"
```

---

### Task 10: Server-side bilingual error messages

**Files:**
- Create: `src/server/i18nErrors.ts`
- Modify: `server.ts`, `src/server/hfModels.ts`, `src/server/gpuPrices.ts`, `src/server/adminAuth.ts`

**Interfaces:**
- Produces: `pickLang(req): 'tr' | 'en'` and `msg(lang, trText, enText): string`.

- [ ] **Step 1: Create `src/server/i18nErrors.ts`**

```ts
import type { Request } from "express";

export type Lang = "tr" | "en";

export function pickLang(req: Request): Lang {
  const al = String(req.headers["accept-language"] || "").toLowerCase();
  return al.includes("tr") ? "tr" : "en";
}

export function msg(lang: Lang, trText: string, enText: string): string {
  return lang === "tr" ? trText : enText;
}
```

- [ ] **Step 2: Apply to `server.ts` inline endpoints**

`POST /api/recommend-model` (line ~249):
```ts
return res.status(400).json({ error: msg(pickLang(req), "Lütfen bir kullanım senaryosu veya sektör belirtin.", "Please provide a use case or industry.") });
```
`POST /api/advisor` 503 (line ~321):
```ts
error: msg(pickLang(req), "Gemini API anahtarı yapılandırılmamış. AI danışman özelliği sunucu ortamında GEMINI_API_KEY gerektirir.", "Gemini API key is not configured. AI advisor feature requires GEMINI_API_KEY in server environment."),
```
`POST /api/advisor` 500 (line ~359):
```ts
res.status(500).json({ error: err?.message || msg(pickLang(req), "AI danışmanlığı üretilemedi.", "Failed to generate AI advice.") });
```
Import `{ pickLang, msg }` from `./src/server/i18nErrors`.

- [ ] **Step 3: Apply to `src/server/hfModels.ts`**

Line ~108: `msg(lang, 'Model kataloğu yüklenemedi.', 'Failed to load model catalog.')`
Line ~127: `msg(lang, 'Model kataloğu güncellenemedi.', 'Failed to refresh model catalog.')`
(Line ~123 passes through `err.message` — leave unchanged.) Each handler needs `const lang = pickLang(req);` at the top.

- [ ] **Step 4: Apply to `src/server/gpuPrices.ts`**

Line ~42: `msg(lang, 'GPU fiyatları yüklenemedi.', 'Failed to load GPU prices.')`
Line ~60: `msg(lang, 'GPU fiyatları güncellenemedi.', 'Failed to refresh GPU prices.')`
Line ~79: `msg(lang, 'Fiyat geçmişi yüklenemedi.', 'Failed to load price history.')`
(Line ~56 passes through `err.message` — leave unchanged.)

- [ ] **Step 5: Apply to `src/server/adminAuth.ts`**

Line ~100: `msg(lang, 'ADMIN_USERNAME / ADMIN_PASSWORD ortam değişkenleri tanımlı değil.', 'ADMIN_USERNAME / ADMIN_PASSWORD environment variables are not set.')`
Line ~105: `msg(lang, 'Çok fazla hatalı deneme. Lütfen 15 dakika sonra tekrar deneyin.', 'Too many failed attempts. Please try again in 15 minutes.')`
Line ~110: `msg(lang, 'Kullanıcı adı ve şifre gerekli.', 'Username and password are required.')`
Line ~177: `msg(lang, 'Bu işlem için yönetici oturumu gerekli.', 'An admin session is required for this operation.')`

- [ ] **Step 6: Verify**

```bash
npm run lint && npm run build
npm run dev
```
Then (in a second terminal):
```bash
curl -s -H 'Accept-Language: tr' http://localhost:3000/api/admin/login -X POST -H 'Content-Type: application/json' -d '{}'
curl -s -H 'Accept-Language: en' http://localhost:3000/api/admin/login -X POST -H 'Content-Type: application/json' -d '{}'
```
Expected: Turkish error first, English second.

- [ ] **Step 7: Commit**

```bash
git add src/server/i18nErrors.ts server.ts src/server/hfModels.ts src/server/gpuPrices.ts src/server/adminAuth.ts
git commit -m "feat(i18n): bilingual server error messages via Accept-Language"
```

---

### Task 11: Route split — app moves to `/app`

**Files:**
- Modify: `server.ts`

**Interfaces:**
- Produces: `GET /` responds 302 → `/app`; `/app` serves the SPA (dev and production). Phase 2 will replace the redirect with the landing page.

- [ ] **Step 1: Add the redirect in `server.ts`**

Inside `startServer()`, AFTER the API route registrations and Gemini endpoints, BEFORE the Vite/production static block, add:

```ts
app.get("/", (_req, res) => {
  res.redirect(302, "/app");
});
```

The production `app.get("*")` catch-all already serves `index.html` for `/app`; in dev, Vite's SPA middleware (`appType: "spa"`) already history-falls back `/app` to `index.html`. No client changes needed — `App.tsx` renders the calculator for any path that is not `/admnsterrrrr`.

- [ ] **Step 2: Verify dev mode**

```bash
npm run dev
```
`curl -sI http://localhost:3000/` → `302` with `Location: /app`. Browser at http://localhost:3000/ lands on the calculator at `/app`. `/admnsterrrrr` still shows the admin login.

- [ ] **Step 3: Verify production mode**

```bash
npm run build
PORT=3111 NODE_ENV=production node dist/server.cjs
```
`curl -sI http://localhost:3111/` → 302 → `/app`; `curl -s http://localhost:3111/app` → 200 HTML. Stop the server afterwards.

- [ ] **Step 4: Commit**

```bash
git add server.ts
git commit -m "feat(routing): move app to /app; redirect / until landing page"
```

---

### Task 12: Shareable scenario URLs — utils + hydration

**Files:**
- Create: `src/utils/shareUrl.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `DEFAULT_INFERENCE_CONFIG`, `DEFAULT_FINETUNING_CONFIG` from Task 2.
- Produces:
  - `encodeScenario(type: 'inference' | 'finetuning', config: CalculatorConfig | FineTuningConfig): string`
  - `decodeScenario(payload: string): { type: 'inference' | 'finetuning'; config: CalculatorConfig | FineTuningConfig } | null`
  - `buildShareUrl(type, config): string`
  - `readScenarioFromLocation(): ReturnType<typeof decodeScenario>`

- [ ] **Step 1: Create `src/utils/shareUrl.ts`**

```ts
import { CalculatorConfig, FineTuningConfig } from '../types';
import { DEFAULT_INFERENCE_CONFIG, DEFAULT_FINETUNING_CONFIG } from '../data/defaults';

export type ScenarioType = 'inference' | 'finetuning';
export interface DecodedScenario {
  type: ScenarioType;
  config: CalculatorConfig | FineTuningConfig;
}

function toBase64Url(input: string): string {
  return btoa(unescape(encodeURIComponent(input)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64Url(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(escape(atob(padded)));
}

function num(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function str(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function sanitizeInference(raw: Record<string, unknown>): CalculatorConfig {
  const d = DEFAULT_INFERENCE_CONFIG;
  const cfg: CalculatorConfig = {
    ...d,
    modelId: str(raw.modelId, d.modelId),
    quantId: str(raw.quantId, d.quantId),
    kvCacheQuantId: str(raw.kvCacheQuantId, d.kvCacheQuantId),
    engineId: str(raw.engineId, d.engineId),
    gpuId: str(raw.gpuId, d.gpuId),
    gpuCount: Math.min(64, Math.max(1, Math.round(num(raw.gpuCount, d.gpuCount)))),
    tensorParallelism: Math.min(64, Math.max(1, Math.round(num(raw.tensorParallelism, d.tensorParallelism)))),
    pipelineParallelism: Math.min(16, Math.max(1, Math.round(num(raw.pipelineParallelism, d.pipelineParallelism)))),
    promptLen: Math.min(1_000_000, Math.max(1, Math.round(num(raw.promptLen, d.promptLen)))),
    genLen: Math.min(1_000_000, Math.max(1, Math.round(num(raw.genLen, d.genLen)))),
    batchSize: Math.min(4096, Math.max(1, Math.round(num(raw.batchSize, d.batchSize)))),
    useMultiProfile: bool(raw.useMultiProfile, d.useMultiProfile),
    requestsPerMin: Math.min(1_000_000, Math.max(0, num(raw.requestsPerMin, d.requestsPerMin))),
    cudaOverheadGB: Math.min(64, Math.max(0, num(raw.cudaOverheadGB, d.cudaOverheadGB))),
    activationOverheadPct: Math.min(100, Math.max(0, num(raw.activationOverheadPct, d.activationOverheadPct))),
    tpEfficiencyPct: Math.min(100, Math.max(1, num(raw.tpEfficiencyPct, d.tpEfficiencyPct))),
    electricityRateTryPerKwh: Math.max(0, num(raw.electricityRateTryPerKwh, d.electricityRateTryPerKwh)),
    usdToTryRate: Math.max(0, num(raw.usdToTryRate, d.usdToTryRate)),
    pueRatio: Math.min(3, Math.max(1, num(raw.pueRatio, d.pueRatio))),
    serverDutyCyclePct: Math.min(100, Math.max(0, num(raw.serverDutyCyclePct, d.serverDutyCyclePct))),
  };
  if (raw.customModel && typeof raw.customModel === 'object') {
    cfg.customModel = { ...d.customModel, ...(raw.customModel as object) } as CalculatorConfig['customModel'];
  }
  if (raw.customGpu && typeof raw.customGpu === 'object') {
    cfg.customGpu = { ...d.customGpu, ...(raw.customGpu as object) } as CalculatorConfig['customGpu'];
  }
  if (Array.isArray(raw.userProfiles) && raw.userProfiles.length > 0) {
    cfg.userProfiles = raw.userProfiles
      .filter((p) => p && typeof p === 'object')
      .map((p, i) => ({
        id: str((p as any).id, `profile-${i}`),
        name: str((p as any).name, `Profile ${i + 1}`),
        userCount: Math.min(100000, Math.max(0, Math.round(num((p as any).userCount, 1)))),
        promptLen: Math.min(1_000_000, Math.max(1, Math.round(num((p as any).promptLen, 1024)))),
        genLen: Math.min(1_000_000, Math.max(1, Math.round(num((p as any).genLen, 256)))),
      }));
  }
  const nullable = ['customGpuUnitPriceUsd', 'customSystemBasePriceUsd', 'customAnnualElectricityUsd', 'customAnnualCoolingUsd', 'customAnnualMaintenanceUsd', 'customAnnualOtherExpensesUsd'] as const;
  for (const key of nullable) {
    const v = raw[key];
    cfg[key] = typeof v === 'number' && Number.isFinite(v) ? v : null;
  }
  return cfg;
}

function sanitizeFinetuning(raw: Record<string, unknown>): FineTuningConfig {
  const d = DEFAULT_FINETUNING_CONFIG;
  const methods = ['qlora', 'lora', 'full-finetune', 'dpo-alignment'];
  const frameworks = ['unsloth', 'hf-trl', 'torchtune', 'deepspeed', 'axolotl'];
  const optimizers = ['adamw_8bit', 'adamw_32bit', 'paged_adamw_8bit', 'lion'];
  const cfg: FineTuningConfig = {
    ...d,
    modelId: str(raw.modelId, d.modelId),
    methodId: (methods.includes(raw.methodId as string) ? raw.methodId : d.methodId) as FineTuningConfig['methodId'],
    frameworkId: (frameworks.includes(raw.frameworkId as string) ? raw.frameworkId : d.frameworkId) as FineTuningConfig['frameworkId'],
    gpuId: str(raw.gpuId, d.gpuId),
    gpuCount: Math.min(64, Math.max(1, Math.round(num(raw.gpuCount, d.gpuCount ?? 1)))),
    sampleCount: Math.min(100_000_000, Math.max(1, Math.round(num(raw.sampleCount, d.sampleCount)))),
    avgSeqLen: Math.min(1_000_000, Math.max(1, Math.round(num(raw.avgSeqLen, d.avgSeqLen)))),
    epochs: Math.min(100, Math.max(1, Math.round(num(raw.epochs, d.epochs)))),
    perDeviceBatchSize: Math.min(1024, Math.max(1, Math.round(num(raw.perDeviceBatchSize, d.perDeviceBatchSize)))),
    gradientAccumulationSteps: Math.min(1024, Math.max(1, Math.round(num(raw.gradientAccumulationSteps, d.gradientAccumulationSteps)))),
    learningRate: str(raw.learningRate, d.learningRate),
    loraRank: Math.min(512, Math.max(1, Math.round(num(raw.loraRank, d.loraRank)))),
    loraAlpha: Math.min(1024, Math.max(1, Math.round(num(raw.loraAlpha, d.loraAlpha)))),
    optimizerType: (optimizers.includes(raw.optimizerType as string) ? raw.optimizerType : d.optimizerType) as FineTuningConfig['optimizerType'],
    gradientCheckpointing: bool(raw.gradientCheckpointing, d.gradientCheckpointing),
    flashAttention: bool(raw.flashAttention, d.flashAttention),
    useUnslothAcceleratedKernels: bool(raw.useUnslothAcceleratedKernels, d.useUnslothAcceleratedKernels),
    electricityRateTryPerKwh: Math.max(0, num(raw.electricityRateTryPerKwh, d.electricityRateTryPerKwh)),
    usdToTryRate: Math.max(0, num(raw.usdToTryRate, d.usdToTryRate)),
  };
  if (raw.customModel && typeof raw.customModel === 'object') {
    cfg.customModel = { ...d.customModel, ...(raw.customModel as object) } as FineTuningConfig['customModel'];
  }
  if (raw.customGpu && typeof raw.customGpu === 'object') {
    cfg.customGpu = { ...d.customGpu, ...(raw.customGpu as object) } as FineTuningConfig['customGpu'];
  }
  return cfg;
}

export function encodeScenario(type: ScenarioType, config: CalculatorConfig | FineTuningConfig): string {
  const payload = JSON.stringify({ t: type === 'inference' ? 'i' : 'f', v: 1, cfg: config });
  return toBase64Url(payload);
}

export function decodeScenario(payload: string): DecodedScenario | null {
  try {
    const parsed = JSON.parse(fromBase64Url(payload));
    if (!parsed || typeof parsed !== 'object' || parsed.v !== 1 || !parsed.cfg || typeof parsed.cfg !== 'object') {
      return null;
    }
    if (parsed.t === 'i') {
      return { type: 'inference', config: sanitizeInference(parsed.cfg as Record<string, unknown>) };
    }
    if (parsed.t === 'f') {
      return { type: 'finetuning', config: sanitizeFinetuning(parsed.cfg as Record<string, unknown>) };
    }
    return null;
  } catch {
    return null;
  }
}

export function buildShareUrl(type: ScenarioType, config: CalculatorConfig | FineTuningConfig): string {
  return `${window.location.origin}/app?c=${encodeScenario(type, config)}`;
}

export function readScenarioFromLocation(): DecodedScenario | null {
  const param = new URLSearchParams(window.location.search).get('c');
  return param ? decodeScenario(param) : null;
}
```

- [ ] **Step 2: Round-trip sanity check with tsx**

```bash
npx tsx -e "
import { encodeScenario, decodeScenario } from './src/utils/shareUrl';
import { DEFAULT_INFERENCE_CONFIG } from './src/data/defaults';
const p = encodeScenario('inference', DEFAULT_INFERENCE_CONFIG);
const d = decodeScenario(p);
console.log('payload bytes:', p.length);
console.log('roundtrip modelId:', d?.type, (d?.config as any).modelId);
console.log('corrupt ->', decodeScenario('!!!not-base64!!!'));
console.log('wrong shape ->', decodeScenario(encodeScenario('inference', {} as any)));
"
```
Expected: roundtrip prints `inference llama-3.3-70b`; corrupt → `null`; wrong shape → an inference scenario with all defaults (not null, not throwing).

- [ ] **Step 3: Hydrate App state from the URL**

In `src/App.tsx`, before the state declarations:
```tsx
const [initialScenario] = useState(readScenarioFromLocation);
```
Change initializers:
```tsx
const [activeTab, setActiveTab] = useState<'inference' | 'finetuning'>(
  initialScenario?.type === 'finetuning' ? 'finetuning' : 'inference'
);
const [config, setConfig] = useState<CalculatorConfig>(() =>
  initialScenario?.type === 'inference' ? (initialScenario.config as CalculatorConfig) : { ...DEFAULT_INFERENCE_CONFIG }
);
const [ftConfig, setFtConfig] = useState<FineTuningConfig>(() =>
  initialScenario?.type === 'finetuning' ? (initialScenario.config as FineTuningConfig) : { ...DEFAULT_FINETUNING_CONFIG }
);
```
Import `readScenarioFromLocation` from `./utils/shareUrl`.

- [ ] **Step 4: Verify**

```bash
npm run lint && npm run build
```
Manual: `npm run dev`, change several settings, then in the browser console run:
```js
location.href = '/app?c=' + btoa(JSON.stringify({t:'i',v:1,cfg:{modelId:'qwen-2.5-32b',gpuId:'nvidia-rtx-4090',gpuCount:2}})).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
```
Expected: app loads with Qwen 2.5 32B on 2× RTX 4090. A garbage `?c=abc` loads defaults without crashing.

- [ ] **Step 5: Commit**

```bash
git add src/utils/shareUrl.ts src/App.tsx
git commit -m "feat: shareable scenario URLs with validated hydration"
```

---

### Task 13: Copy-link buttons (Header + ResultsPanel)

**Files:**
- Modify: `src/App.tsx`, `src/components/Header.tsx`, `src/components/ResultsPanel/index.tsx`, `src/i18n/tr.json`, `src/i18n/en.json`

**Interfaces:**
- Consumes: `buildShareUrl` from Task 12; `common.copyLink` / `common.copied` keys from Task 1.
- Produces: `onCopyLink: () => string` prop on Header and ResultsPanel (App returns the URL for the ACTIVE tab's config).

- [ ] **Step 1: App provides the URL builder**

In `src/App.tsx`:
```tsx
const handleCopyLink = (): string => {
  return activeTab === 'finetuning'
    ? buildShareUrl('finetuning', ftConfig)
    : buildShareUrl('inference', config);
};
```
Pass `onCopyLink={handleCopyLink}` to `<Header>` and `<ResultsPanel>`. Import `buildShareUrl`.

- [ ] **Step 2: Header copy-link button**

Add to `HeaderProps`: `onCopyLink: () => string;`

Inside `Header`, after the Save button:
```tsx
const [copied, setCopied] = useState(false);
const handleCopyLink = async () => {
  const url = onCopyLink();
  try {
    await navigator.clipboard.writeText(url);
    window.history.replaceState(null, '', url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  } catch {
    window.prompt(t('common.copyLink'), url);
  }
};
```
```tsx
<button
  onClick={() => void handleCopyLink()}
  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted bg-surface-2 hover:bg-surface border border-border rounded transition-colors hover:text-text"
  title={t('common.copyLink')}
>
  <Link2 className="w-3.5 h-3.5 text-accent" />
  <span className="hidden sm:inline">{copied ? t('common.copied') : t('common.copyLink')}</span>
</button>
```
Import `Link2` from `lucide-react` and `useState` from React.

- [ ] **Step 3: ResultsPanel copy-link button**

Add to `ResultsPanelProps`: `onCopyLink?: () => string;`

In `ResultsPanel`, next to the `Analiz Et` button (header row), render an icon-only copy button with the same handler logic (copied state, `replaceState`, `window.prompt` fallback), using `t('common.copyLink')` / `t('common.copied')` and the `Link2` icon. Only render when `onCopyLink` is provided.

- [ ] **Step 4: Verify**

```bash
npm run lint && npm run build
```
Manual: click copy in header → address bar updates to `/app?c=...`, button shows "Copied"/"Kopyalandı"; open the copied URL in a new tab → identical config loads; repeat from the Fine-Tuning tab and from the ResultsPanel button.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/Header.tsx src/components/ResultsPanel/index.tsx src/i18n
git commit -m "feat: copy-link buttons for shareable scenarios"
```

---

### Task 14: Final i18n sweep + full verification

**Files:**
- Possibly any file with leftovers.

- [ ] **Step 1: Turkish-character sweep over all components**

```bash
rg "[ÇĞİÖŞÜçğışöü]" src/components --files-with-matches
```
Expected: no output. If files are listed, extract the remaining strings per the established pattern and re-run.

- [ ] **Step 2: Key parity check**

```bash
npx tsx -e "
import tr from './src/i18n/tr.json';
import en from './src/i18n/en.json';
const keys = (o: any, p = ''): string[] => Object.entries(o).flatMap(([k, v]) => typeof v === 'object' ? keys(v, p + k + '.') : [p + k]);
const a = new Set(keys(tr)), b = new Set(keys(en));
console.log('missing in en:', [...a].filter(k => !b.has(k)));
console.log('missing in tr:', [...b].filter(k => !a.has(k)));
"
```
Expected: two empty arrays.

- [ ] **Step 3: Full build**

```bash
npm run lint && npm run build
```

- [ ] **Step 4: End-to-end smoke test**

`npm run dev`, then walk this list in BOTH languages:
1. Fresh profile (no localStorage): browser language `en` → UI English; switch to TR → verbatim Turkish everywhere; reload persists.
2. Inference tab: every configurator, all five result tabs, GPU comparison, context chart.
3. Fine-tuning tab: config panel, results tabs, platform compare, code export.
4. All modals: AI advisor (chrome), export, scenario save/load, comparison, about.
5. Copy link → new tab round-trip for both tabs.
6. `/` redirects to `/app`; `/admnsterrrrr` admin login works; admin panel renders.
7. With DB down (stop Postgres), the app still renders and only DB-backed data degrades (existing gotcha — must not regress).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(i18n): final sweep and key parity verification"
```

---

## Self-Review Notes

- Spec Phase 1 coverage: i18n foundation (Tasks 1–10), shareable URLs (Tasks 12–13), route split (Task 11), verbatim-TR constraint (Global Constraints + per-task rules), server bilingual errors (Task 10). All covered.
- Known accepted limitation (per spec): data-file content (model/GPU descriptions, quant/engine descriptions, AI heuristic recommendation texts) remains Turkish in EN mode.
- Type names used across tasks are consistent: `ScenarioType`, `DecodedScenario`, `encodeScenario`, `decodeScenario`, `buildShareUrl`, `readScenarioFromLocation`, `DEFAULT_INFERENCE_CONFIG`, `DEFAULT_FINETUNING_CONFIG`, `pickLang`, `msg`, `onCopyLink`.
