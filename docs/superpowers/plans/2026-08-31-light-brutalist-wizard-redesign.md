# Light Brutalist Redesign + Wizard Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the app's dark theme and scrolling two-column layout with a flat, light, 2px-black-bordered "brutalist" visual language and a step-by-step wizard flow, restyling every surface (app, landing, modals, header, footer).

**Architecture:** Theme lives in `src/index.css` `@theme` tokens; the 10 `ui/*` primitives carry the visual language so configurators inherit it. A new `Wizard` component owns the step indicator + navigation and a fixed `WizardSummaryBar` shows the live result on every step; `App.tsx` becomes the orchestrator holding `stepIndex`/`maxVisited` and rendering one step's content. The SSR landing page gets its `<style>` block rewritten and a new modules-grid section.

**Tech Stack:** React 19, TypeScript, Tailwind v4 (`@theme` tokens), Vite, `react-i18next` (TR/EN). No test framework — verification is `npm run lint` (tsc) + `npm run build` + manual smoke.

**Spec:** `docs/superpowers/specs/2026-08-31-light-brutalist-wizard-redesign-design.md` (plan argues from the spec; executors read both).

## Global Constraints

- All color/border/font decisions below are **verbatim** from the spec — do not improvise new palette values.
- Palette tokens (must land exactly in `src/index.css` `@theme`): `bg #f5f5f3`, `surface #ffffff`, `surface-2 #ebebe7`, `border #111111`, `text #111111`, `muted #6b6b67`, `accent #ffb224`, `info #1d4ed8`, `ok #3fb950`, `danger #f85149`.
- **No `border-radius` anywhere** (sharp corners); **no shadows** anywhere. Inner hairlines/dividers stay 1px (`border-b`/`border-t`/`border-l`/`border-r`/`divide-*`); major containers/sections/buttons/inputs/cards/modals use `border-2`.
- Amber `accent` is a **fill only** (`bg-accent text-bg`): never amber *text* on a light surface. Category labels / mono tags use blue `text-info`. Soft amber tints `bg-accent/10 … border-accent/30` become `bg-info/10 … border-info/30`.
- Inter for body/headings, JetBrains Mono for labels/numbers/metadata; numbers get `tabular-nums`.
- UI strings stay in `react-i18next` dictionaries (`src/i18n/tr.json`, `en.json`). The SSR landing page has its own `COPY` object in `src/server/landing.ts` (tr + en) — landing copy goes there, not into the JSON dictionaries.
- Run `npm run lint` after every task; `npm run build` at task boundaries touching `server.ts` imports or SSR.
- Commit after each task. Turkish UI copy; commit messages in repo style (`feat(ui): …`).

---

### Task 1: Light brutalist theme tokens + global sharp corners

**Files:**
- Modify: `src/index.css`

**Interfaces:**
- Produces: new Tailwind tokens `bg/surface/surface-2/border/text/muted/accent/info/ok/danger` available to every component.

- [ ] **Step 1: Replace the `@theme` block and scrollbar colors**

In `src/index.css` replace the whole `@theme { … }` block with:

```css
@theme {
  --color-bg: #f5f5f3;
  --color-surface: #ffffff;
  --color-surface-2: #ebebe7;
  --color-border: #111111;
  --color-text: #111111;
  --color-muted: #6b6b67;
  --color-accent: #ffb224;
  --color-info: #1d4ed8;
  --color-ok: #3fb950;
  --color-danger: #f85149;

  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
}
```

Replace the scrollbar rules at the bottom with light-theme colors:

```css
::-webkit-scrollbar-track { background: #ebebe7; }
::-webkit-scrollbar-thumb { background: #111111; }
::-webkit-scrollbar-thumb:hover { background: #6b6b67; }
```

- [ ] **Step 2: Force sharp corners globally**

In `@layer base`, add a rule that neutralizes any `border-radius` utility so no component keeps rounded corners:

```css
@layer base {
  * { border-radius: 0 !important; }
}
```

- [ ] **Step 3: Verify**

Run: `npm run lint`. Expected: passes (no type errors).

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "feat(ui): light brutalist theme tokens and sharp corners"
```

---

### Task 2: Brutalist pass on `ui/*` primitives

**Files:**
- Modify: `src/components/ui/Panel.tsx`, `SectionHeader.tsx`, `Badge.tsx`, `Stat.tsx`, `Field.tsx`, `Tabs.tsx`, `Segmented.tsx`, `Collapse.tsx`, `Select.tsx`, `NumberInput.tsx`

**Interfaces:**
- Produces: unchanged component props (consumers need no edits); new visual language applied.

- [ ] **Step 1: Edit each primitive per the rule table**

Apply exactly:

| File | Change |
|------|--------|
| `Panel.tsx` | `bg-surface border border-border rounded-md` → `bg-surface border-2 border-border rounded-none` |
| `SectionHeader.tsx` | divider stays `border-b border-border`; index `text-accent` → `text-info` |
| `Badge.tsx` | all tones: `rounded` → `rounded-none`, `border` → `border-2`; tones become: `default: 'text-muted bg-surface-2 border-border'`, `accent: 'text-bg bg-accent border-border'`, `ok: 'text-ok bg-surface-2 border-border'`, `danger: 'text-danger bg-surface-2 border-border'` |
| `Stat.tsx` | `rounded-md` → `rounded-none`, `border` → `border-2`; tones: `default: 'text-text'`, `ok: 'text-ok'`, `danger: 'text-danger'`, `accent: 'bg-accent text-bg'` (amber fill stat) |
| `Field.tsx` | label color `text-muted` unchanged (already muted mono) |
| `Tabs.tsx` | container `border-b border-border` stays; active tab `text-accent border-accent` → `text-text border-text`; inactive `text-muted` unchanged |
| `Segmented.tsx` | `rounded p-0.5` → `rounded-none p-0.5`, `border` → `border-2`; active `bg-accent text-bg` → `bg-text text-bg` (black fill); inner `rounded` → `rounded-none` |
| `Collapse.tsx` | `rounded-md` → `rounded-none`, `border` → `border-2` |
| `Select.tsx` | `rounded` → `rounded-none`, `border` → `border-2`, `focus:border-accent` → `focus:border-text` |
| `NumberInput.tsx` | `rounded` → `rounded-none`, `border` → `border-2`, `focus:border-accent` → `focus:border-text` |

- [ ] **Step 2: Verify**

Run: `npm run lint`. Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui
git commit -m "feat(ui): brutalist pass on ui primitives"
```

---

### Task 3: Wizard i18n keys (TR + EN)

**Files:**
- Modify: `src/i18n/tr.json`, `src/i18n/en.json`

**Interfaces:**
- Produces: keys `wizard.*` and `summary.*` consumed by Task 5 (`Wizard`, `WizardSummaryBar`) and Task 6 (`App.tsx`).

- [ ] **Step 1: Append namespaces to `tr.json`**

Add after the top-level object's last key (match the existing indentation, 2 spaces):

```json
  "wizard": {
    "stepModel": "Model",
    "stepQuantization": "Kuantizasyon",
    "stepEngine": "Motor",
    "stepGpu": "GPU",
    "stepWorkload": "İş Yükü",
    "stepResults": "Sonuçlar",
    "stepFinetuningConfig": "Fine-Tuning Ayarı",
    "back": "← Geri",
    "next": "İleri →"
  },
  "summary": {
    "vram": "VRAM",
    "vramOk": "OK",
    "vramOom": "OOM",
    "monthlyCost": "Aylık Maliyet",
    "throughput": "Tok/s",
    "finetuningTime": "Eğitim Süresi"
  }
```

- [ ] **Step 2: Append the same namespaces to `en.json`**

```json
  "wizard": {
    "stepModel": "Model",
    "stepQuantization": "Quantization",
    "stepEngine": "Engine",
    "stepGpu": "GPU",
    "stepWorkload": "Workload",
    "stepResults": "Results",
    "stepFinetuningConfig": "Fine-Tuning Setup",
    "back": "← Back",
    "next": "Next →"
  },
  "summary": {
    "vram": "VRAM",
    "vramOk": "OK",
    "vramOom": "OOM",
    "monthlyCost": "Monthly Cost",
    "throughput": "Tok/s",
    "finetuningTime": "Training Time"
  }
```

- [ ] **Step 3: Verify JSON validity + lint**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/i18n/tr.json','utf8')); JSON.parse(require('fs').readFileSync('src/i18n/en.json','utf8')); console.log('json ok')"` then `npm run lint`. Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/tr.json src/i18n/en.json
git commit -m "feat(i18n): wizard and summary bar keys"
```

---

### Task 4: Header restyle — logo, nav-link tabs, bordered actions

**Files:**
- Modify: `src/components/Header.tsx`, `src/components/LanguageSwitcher.tsx`

**Interfaces:**
- Consumes: existing `HeaderProps` (unchanged), `useTranslation`, `PRESET_SCENARIOS`.
- Produces: `onChangeTab(tab)` still drives mode switching (App calls it via the new `handleChangeTab` in Task 6).

- [ ] **Step 1: Replace the mode switcher with nav links**

Remove the `<Segmented …/>` block and its import. Replace it with:

```tsx
        {/* Center Mode Nav Links */}
        <nav className="hidden md:flex items-center gap-6">
          {(['inference', 'finetuning'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => onChangeTab(tab)}
              className={`pb-1 font-mono text-xs font-bold uppercase tracking-wider border-b-2 transition ${
                activeTab === tab ? 'border-text text-text' : 'border-transparent text-muted hover:text-text'
              }`}
            >
              {t(tab === 'inference' ? 'header.tabInference' : 'header.tabFinetuning')}
            </button>
          ))}
        </nav>
```

- [ ] **Step 2: Replace the logo block**

Replace the current logo `div` pair (the `∑` square + the title `div`) with:

```tsx
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-accent text-bg font-mono font-bold flex items-center justify-center text-base">∑</div>
          <div>
            <div className="font-mono font-bold text-sm tracking-tight text-text leading-none">LLM-CALC</div>
            <Badge tone="accent">Inference + Fine-Tuning</Badge>
          </div>
        </div>
```

- [ ] **Step 3: Bordered action buttons**

Mechanically transform every action button and the presets dropdown in `Header.tsx`:
- `border border-border rounded` → `border-2 border-border rounded-none`
- `rounded-md` → `rounded-none` (dropdown panel)
- the AI Advisor button `bg-accent … rounded` → add `border-2 border-border rounded-none`

Also, remove the now-unused `Segmented` import (keep `Badge`, `LanguageSwitcher`).

- [ ] **Step 4: Restyle `LanguageSwitcher`**

Read `src/components/LanguageSwitcher.tsx`; apply the same mechanical rule: `rounded*` → `rounded-none`, major `border` → `border-2`. Keep its props/logic identical.

- [ ] **Step 5: Verify**

Run: `npm run lint` then `npm run build`. Then `npm run dev`, open http://localhost:3000/app, confirm: nav tabs switch Inference/Fine-Tuning with a black underline on the active one; no rounded corners; all buttons have 2px black borders.

- [ ] **Step 6: Commit**

```bash
git add src/components/Header.tsx src/components/LanguageSwitcher.tsx
git commit -m "feat(ui): brutalist header with nav-link tabs"
```

---

### Task 5: Wizard + summary bar components

**Files:**
- Create: `src/components/Wizard.tsx`
- Create: `src/components/WizardSummaryBar.tsx`

**Interfaces:**
- Produces:
  - `export interface WizardStepDef { id: string; titleKey: string }`
  - `Wizard` props: `{ steps: WizardStepDef[]; currentIndex: number; maxVisited: number; onNavigate: (index: number) => void; onNext: () => void; onBack: () => void; children?: React.ReactNode }`
  - `WizardSummaryBar` props: `{ left: SummaryCell; center: SummaryCell; right: SummaryCell }` where `interface SummaryCell { label: string; value: string; tone?: 'default' | 'ok' | 'danger' | 'accent' }`

- [ ] **Step 1: Create `Wizard.tsx`**

```tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';

export interface WizardStepDef {
  id: string;
  titleKey: string;
}

interface WizardProps {
  steps: WizardStepDef[];
  currentIndex: number;
  maxVisited: number;
  onNavigate: (index: number) => void;
  onNext: () => void;
  onBack: () => void;
  children?: React.ReactNode;
}

export const Wizard: React.FC<WizardProps> = ({
  steps,
  currentIndex,
  maxVisited,
  onNavigate,
  onNext,
  onBack,
  children,
}) => {
  const { t } = useTranslation();
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === steps.length - 1;

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap items-stretch border-2 border-border bg-surface divide-x divide-border">
        {steps.map((s, i) => {
          const isActive = i === currentIndex;
          const isDone = i < currentIndex;
          const isClickable = i <= maxVisited;
          return (
            <button
              key={s.id}
              onClick={() => isClickable && onNavigate(i)}
              disabled={!isClickable}
              className={`flex-1 min-w-[110px] flex items-center gap-1.5 px-3 py-2.5 text-left transition ${
                isActive
                  ? 'bg-text text-bg'
                  : isClickable
                    ? 'bg-surface hover:bg-surface-2 text-text'
                    : 'bg-surface text-muted cursor-not-allowed'
              }`}
            >
              <span className="font-mono text-[11px] font-bold">{String(i + 1).padStart(2, '0')}</span>
              {isDone && <Check className="w-3.5 h-3.5" />}
              <span className="font-mono text-[11px] uppercase tracking-wider truncate">{t(s.titleKey)}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-2 border-border bg-surface">{children}</div>

      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          disabled={isFirst}
          className="px-4 py-2 border-2 border-border bg-surface-2 text-text font-mono text-xs font-bold hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t('wizard.back')}
        </button>
        {!isLast && (
          <button
            onClick={onNext}
            className="px-4 py-2 border-2 border-border bg-accent text-bg font-mono text-xs font-bold hover:opacity-90"
          >
            {t('wizard.next')}
          </button>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Create `WizardSummaryBar.tsx`**

```tsx
import React from 'react';

export interface SummaryCell {
  label: string;
  value: string;
  tone?: 'default' | 'ok' | 'danger' | 'accent';
}

interface WizardSummaryBarProps {
  left: SummaryCell;
  center: SummaryCell;
  right: SummaryCell;
}

const TONES: Record<NonNullable<SummaryCell['tone']>, string> = {
  default: 'text-text',
  ok: 'text-ok',
  danger: 'text-danger',
  accent: 'text-text',
};

export const WizardSummaryBar: React.FC<WizardSummaryBarProps> = ({ left, center, right }) => {
  const cells = [left, center, right];
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 border-t-2 border-border bg-surface">
      <div className="max-w-5xl mx-auto grid grid-cols-3 divide-x divide-border">
        {cells.map((c, i) => (
          <div key={i} className="px-4 py-2.5 min-w-0">
            <div className="text-[9px] font-mono uppercase tracking-wider text-muted truncate">{c.label}</div>
            <div className={`text-sm font-mono font-bold leading-tight truncate tabular-nums ${TONES[c.tone ?? 'default']}`}>
              {c.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Verify**

Run: `npm run lint`. Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/components/Wizard.tsx src/components/WizardSummaryBar.tsx
git commit -m "feat(ui): wizard stepper and live summary bar"
```

---

### Task 6: Wire the wizard into `App.tsx`

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `Wizard`, `WizardStepDef`, `WizardSummaryBar`, `SummaryCell` (Task 5); `useTranslation` (`react-i18next`); all existing configurators/results components (props unchanged from current usage).
- Produces: step-based rendering; `handleChangeTab`, `goToStep`, `goNext`, `goBack`; hydration → Results step; preset → Results step.

- [ ] **Step 1: Add imports and step constants**

Add `useTranslation` to the react-i18next import line and import the wizard components. Add above the component:

```tsx
const INFERENCE_STEPS: WizardStepDef[] = [
  { id: 'model', titleKey: 'wizard.stepModel' },
  { id: 'quantization', titleKey: 'wizard.stepQuantization' },
  { id: 'engine', titleKey: 'wizard.stepEngine' },
  { id: 'gpu', titleKey: 'wizard.stepGpu' },
  { id: 'workload', titleKey: 'wizard.stepWorkload' },
  { id: 'results', titleKey: 'wizard.stepResults' },
];

const FINETUNING_STEPS: WizardStepDef[] = [
  { id: 'model', titleKey: 'wizard.stepModel' },
  { id: 'config', titleKey: 'wizard.stepFinetuningConfig' },
  { id: 'results', titleKey: 'wizard.stepResults' },
];
```

- [ ] **Step 2: Add step state**

Inside `App()` add `const { t } = useTranslation();` and:

```tsx
  const initialResultIndex = initialScenario
    ? initialScenario.type === 'finetuning'
      ? FINETUNING_STEPS.length - 1
      : INFERENCE_STEPS.length - 1
    : 0;

  const [stepIndex, setStepIndex] = useState(initialResultIndex > 0 ? initialResultIndex : 0);
  const [maxVisited, setMaxVisited] = useState(initialResultIndex > 0 ? initialResultIndex : 0);
```

- [ ] **Step 3: Add step navigation handlers + tab switch**

Replace the direct `setActiveTab` usage in Header props with a handler. Add:

```tsx
  const steps = activeTab === 'inference' ? INFERENCE_STEPS : FINETUNING_STEPS;
  const lastStep = steps.length - 1;

  const handleChangeTab = (tab: 'inference' | 'finetuning') => {
    setActiveTab(tab);
    setStepIndex(0);
    setMaxVisited(0);
  };

  const goToStep = (index: number) => {
    if (index <= maxVisited) setStepIndex(index);
  };
  const goNext = () => {
    setStepIndex((i) => Math.min(lastStep, i + 1));
    setMaxVisited((m) => Math.max(m, Math.min(lastStep, stepIndex + 1)));
  };
  const goBack = () => setStepIndex((i) => Math.max(0, i - 1));
```

Pass `onChangeTab={handleChangeTab}` to `Header`.

- [ ] **Step 4: Jump to Results on preset load**

In `handleSelectPreset`, after the existing `setConfig`/`setFtConfig` calls add:

```tsx
    setStepIndex(INFERENCE_STEPS.length - 1);
    setMaxVisited(INFERENCE_STEPS.length - 1);
```

- [ ] **Step 5: Extract the shared model step renderer**

Inside `App()` add a function (before `return`) that renders the shared `ModelSelector` used by both modes (it is currently duplicated):

```tsx
  const renderModelStep = () => (
    <ModelSelector
      selectedModelId={activeTab === 'inference' ? config.modelId : ftConfig.modelId}
      customModel={config.customModel}
      onSelectModel={handleSelectModel}
      onUpdateCustomModel={(customModel) => {
        setConfig((prev) => ({ ...prev, customModel }));
        setFtConfig((prev) => ({ ...prev, customModel }));
      }}
      models={modelCatalog}
    />
  );
```

- [ ] **Step 6: Render the active step body**

Add a step-body function:

```tsx
  const renderStepBody = () => {
    const stepId = steps[stepIndex].id;
    if (activeTab === 'finetuning') {
      if (stepId === 'results') {
        return (
          <div className="space-y-4">
            <FineTuningResultsPanel results={ftResults} />
            <FineTuningPlatformCompare results={ftResults} />
            <FineTuningCodeExport results={ftResults} />
          </div>
        );
      }
      return <FineTuningConfigPanel config={ftConfig} results={ftResults} onChangeConfig={setFtConfig} />;
    }
    switch (stepId) {
      case 'model':
        return renderModelStep();
      case 'quantization':
        return <QuantizationSelector selectedQuantId={config.quantId} selectedKvCacheQuantId={config.kvCacheQuantId} onSelectQuant={(quantId) => setConfig((prev) => ({ ...prev, quantId }))} onSelectKvCacheQuant={(kvCacheQuantId) => setConfig((prev) => ({ ...prev, kvCacheQuantId }))} />;
      case 'engine':
        return <InferenceEngineSelector selectedEngineId={config.engineId} onSelectEngine={(engineId) => setConfig((prev) => ({ ...prev, engineId }))} />;
      case 'gpu':
        return (
          <GpuConfigurator
            selectedGpuId={config.gpuId}
            gpuCount={config.gpuCount}
            customGpu={config.customGpu}
            tensorParallelism={config.tensorParallelism}
            onSelectGpu={(gpuId) => setConfig((prev) => ({ ...prev, gpuId }))}
            onChangeGpuCount={(gpuCount) => setConfig((prev) => ({ ...prev, gpuCount }))}
            onChangeTp={(tensorParallelism) => setConfig((prev) => ({ ...prev, tensorParallelism }))}
            onUpdateCustomGpu={(customGpu) => setConfig((prev) => ({ ...prev, customGpu }))}
          />
        );
      case 'workload':
        return (
          <WorkloadConfigurator
            promptLen={config.promptLen}
            genLen={config.genLen}
            batchSize={config.batchSize}
            requestsPerMin={config.requestsPerMin}
            cudaOverheadGB={config.cudaOverheadGB}
            activationOverheadPct={config.activationOverheadPct}
            tpEfficiencyPct={config.tpEfficiencyPct}
            userProfiles={config.userProfiles}
            useMultiProfile={config.useMultiProfile}
            onChangePromptLen={(promptLen) => setConfig((prev) => ({ ...prev, promptLen }))}
            onChangeGenLen={(genLen) => setConfig((prev) => ({ ...prev, genLen }))}
            onChangeBatchSize={(batchSize) => setConfig((prev) => ({ ...prev, batchSize }))}
            onChangeRequestsPerMin={(requestsPerMin) => setConfig((prev) => ({ ...prev, requestsPerMin }))}
            onChangeCudaOverhead={(cudaOverheadGB) => setConfig((prev) => ({ ...prev, cudaOverheadGB }))}
            onChangeActivationOverhead={(activationOverheadPct) => setConfig((prev) => ({ ...prev, activationOverheadPct }))}
            onChangeTpEfficiency={(tpEfficiencyPct) => setConfig((prev) => ({ ...prev, tpEfficiencyPct }))}
            onToggleMultiProfile={(useMultiProfile) => setConfig((prev) => ({ ...prev, useMultiProfile }))}
            onUpdateProfiles={(userProfiles) => setConfig((prev) => ({ ...prev, userProfiles }))}
          />
        );
      case 'results':
        return (
          <ResultsPanel
            results={results}
            config={config}
            gpuVramGB={activeGpu.vramGB}
            gpuId={config.gpuId}
            prices={livePrices}
            overrides={liveOverrides}
            lastUpdated={lastUpdated}
            pricesLoading={pricesLoading}
            onRefreshPrices={refetchPrices}
            onOpenAiAdvisor={() => setIsAiModalOpen(true)}
            onChangeConfig={(updater) => setConfig(updater)}
            onCopyLink={handleCopyLink}
          />
        );
      default:
        return null;
    }
  };
```

- [ ] **Step 7: Build the summary bar props**

Add:

```tsx
  const summaryProps =
    activeTab === 'inference'
      ? {
          left: {
            label: t('summary.vram'),
            value: `${results.isOom ? t('summary.vramOom') : t('summary.vramOk')} ${results.totalVramNeededGB.toFixed(1)} / ${results.totalVramAvailableGB} GB`,
            tone: (results.isOom ? 'danger' : 'ok') as const,
          },
          center: { label: t('summary.monthlyCost'), value: `$${results.monthlyCostUsd.toFixed(0)} / ay` },
          right: { label: t('summary.throughput'), value: `${results.systemThroughputTokensPerSec.toFixed(0)} tok/s` },
        }
      : {
          left: {
            label: t('summary.vram'),
            value: `${ftResults.isOom ? t('summary.vramOom') : t('summary.vramOk')} ${ftResults.totalVramNeededGB.toFixed(1)} / ${ftResults.totalVramAvailableGB} GB`,
            tone: (ftResults.isOom ? 'danger' : 'ok') as const,
          },
          center: { label: t('summary.finetuningTime'), value: ftResults.trainingTimeFormatted },
          right: { label: t('summary.monthlyCost'), value: `${ftResults.localElectricityCostTry.toFixed(0)} ₺` },
        };
```

- [ ] **Step 8: Replace the main layout**

Remove the current two-column `<main>` grid and both conditional column blocks. Replace with:

```tsx
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-28">
        <Wizard
          steps={steps}
          currentIndex={stepIndex}
          maxVisited={maxVisited}
          onNavigate={goToStep}
          onNext={goNext}
          onBack={goBack}
        >
          {renderStepBody()}
        </Wizard>
      </main>

      <WizardSummaryBar left={summaryProps.left} center={summaryProps.center} right={summaryProps.right} />
```

Also change the root div's `pb-16` to `pb-28` so the fixed summary bar never overlaps content.

- [ ] **Step 9: Verify**

Run: `npm run lint` then `npm run build`. Then `npm run dev` and check:
- Step 1 (Model) → Next works through all 6 inference steps; Results step shows the full ResultsPanel.
- Back button returns to previous steps; visited steps are clickable in the stepper; unvisited steps are disabled.
- Fine-Tuning tab shows 3 steps (Model → Fine-Tuning Setup → Results).
- The summary bar is visible on every step and updates as config changes; OOM shows red, OK shows green.
- `http://localhost:3000/app?c=<a copied link>` lands directly on the Results step.
- Clicking a preset ("Senaryo") jumps to Results.

- [ ] **Step 10: Commit**

```bash
git add src/App.tsx
git commit -m "feat(ui): wizard flow with live summary bar"
```

---

### Task 7: Configurator sweep (border-2 + accent→info text)

**Files:**
- Modify: `src/components/ModelSelector.tsx`, `QuantizationSelector.tsx`, `InferenceEngineSelector.tsx`, `GpuConfigurator.tsx`, `WorkloadConfigurator.tsx`, `FineTuningConfigPanel.tsx`

**Interfaces:**
- Consumes: Task 2's primitive restyles. No prop changes.

- [ ] **Step 1: Apply the mechanical sweep rules**

For each file, apply these exact transformations to every matching class string:

1. `rounded-md` / `rounded-lg` / `rounded` → `rounded-none` (the global `* { border-radius: 0 !important }` already enforces this visually, but remove them so the codebase is honest).
2. Major surfaces (cards, panels, buttons, inputs, pre blocks, profile cards, toggle containers): `border border-border` → `border-2 border-border`. Leave `border-b`/`border-t`/`border-l`/`border-r`-only dividers at 1px.
3. Amber **text** → blue category: any `text-accent` used on a light surface (small mono category chips, e.g. `text-[10px] font-mono font-bold text-accent` in GpuConfigurator/WorkloadConfigurator/FineTuningConfigPanel) → `text-info`. Keep `bg-accent text-bg` fills unchanged.
4. Soft amber tints `bg-accent/10 … border-accent/30` → `bg-info/10 … border-info/30`; `bg-accent/20` → `bg-info/20`.
5. Range sliders keep `accent-[#FFB224]`.
6. `focus:ring-accent focus:border-accent` → `focus:border-text` (drop the ring).
7. Toggle switches (`rounded-full`) become squares via the global radius rule; no manual edit needed.

Work through each file with `rg -n "rounded|text-accent|border-accent|bg-accent"` to find every occurrence; apply the rules.

- [ ] **Step 2: Verify**

Run: `npm run lint`. Then `npm run dev` and walk each step's configurator visually: cards/buttons have 2px black borders, no rounded corners, category labels are blue, amber appears only as fills/CTAs.

- [ ] **Step 3: Commit**

```bash
git add src/components/ModelSelector.tsx src/components/QuantizationSelector.tsx src/components/InferenceEngineSelector.tsx src/components/GpuConfigurator.tsx src/components/WorkloadConfigurator.tsx src/components/FineTuningConfigPanel.tsx
git commit -m "feat(ui): brutalist sweep on configurators"
```

---

### Task 8: Results panels + charts sweep

**Files:**
- Modify: `src/components/ResultsPanel/index.tsx`, `VramTab.tsx`, `PerfTab.tsx`, `CostTab.tsx`, `CloudTab.tsx`, `TcoTab.tsx`, `src/components/FineTuningResultsPanel/index.tsx`, `VramTab.tsx`, `TimeTab.tsx`, `CostTab.tsx`, `src/components/ContextScalingChart.tsx`

**Interfaces:**
- Consumes: Task 2's primitive restyles. No prop changes.

- [ ] **Step 1: ResultsPanel headers**

In both `ResultsPanel/index.tsx` and `FineTuningResultsPanel/index.tsx`:
- copy-link and "analyze" buttons: `border border-border rounded` → `border-2 border-border rounded-none` (analyze button also gets `border-2 border-border`).
- progress bars: `h-2 bg-surface-2 border border-border rounded` → `h-2 bg-surface-2 border border-border rounded-none`.
- inner `Stat` cells are fixed by Task 2.

- [ ] **Step 2: Tab bodies + CloudTab**

For `VramTab`, `PerfTab`, `CostTab`, `CloudTab`, `TcoTab` and the Fine-Tuning tab bodies, apply the same sweep rules as Task 7 Step 1 (border-2 on major surfaces, `rounded*`→`rounded-none`, soft red tints `bg-danger/10 border-danger/40` keep, amber text→`text-info`). `CloudTab` skeleton bars keep `animate-pulse`.

- [ ] **Step 3: Tokenize `ContextScalingChart`**

`ContextScalingChart.tsx` currently hardcodes light slate/cyan styles. Rewrite its wrapper and grid so it uses the theme tokens and brutalist language:
- `bg-white border border-slate-200/90 rounded-xl shadow-xs` → `bg-surface border-2 border-border rounded-none shadow-none`
- `bg-cyan-50 text-cyan-700 rounded-lg border border-cyan-200` → `bg-info/10 text-info border-2 border-border rounded-none`
- `bg-slate-50 … border-slate-200` → `bg-surface-2 … border-border`
- `bg-slate-200/80` bar track → `bg-surface-2`; bar fills keep their data-driven colors but ensure visible on light.
- any `rounded-*` → `rounded-none`.

Do the same tokenization for any other chart/`<svg>`-rendering blocks found via `rg -n "viewBox|<svg" src/components`.

- [ ] **Step 4: Verify**

Run: `npm run lint`. Then `npm run dev` and open the Results step: all 5 tabs (VRAM/PERF/COST/CLOUD/TCO) render with the brutalist language; the context-scaling chart and TCO chart are flat, bordered, no shadows.

- [ ] **Step 5: Commit**

```bash
git add src/components/ResultsPanel src/components/FineTuningResultsPanel src/components/ContextScalingChart.tsx
git commit -m "feat(ui): brutalist sweep on results panels and charts"
```

---

### Task 9: Modals + footer sweep

**Files:**
- Modify: `src/components/AboutModal.tsx`, `ExportModal.tsx`, `ScenarioModal.tsx`, `ScenarioComparisonModal.tsx`, `AiAdvisorModal.tsx`, `AdminGate.tsx`, `AdminPanel.tsx`, `Footer.tsx`

**Interfaces:**
- Consumes: Task 2 primitives. No prop changes.

- [ ] **Step 1: Apply the sweep rules**

Apply the same mechanical rules as Task 7 Step 1, with the modal-specific additions:
- Modal container: `bg-surface border border-border rounded-md shadow-2xl` → `bg-surface border-2 border-border rounded-none shadow-none` (both `ScenarioModal` and `ScenarioComparisonModal`).
- Overlay backdrop: keep its translucent black; no change.
- Inputs: `rounded-md … focus:ring-2 focus:ring-accent/50` → `rounded-none … border-2 border-border` (drop rings).
- Buttons: `rounded-md` → `rounded-none`; primary amber buttons add `border-2 border-border`.
- `Footer.tsx`: `border-t border-border` stays; its link buttons `rounded` → `rounded-none`, `border` → `border-2`.

- [ ] **Step 2: Verify**

Run: `npm run lint`. Then `npm run dev`: open About, Export, Scenario save, Compare, and the admin gate — every modal is flat, bordered, square-cornered, no shadow.

- [ ] **Step 3: Commit**

```bash
git add src/components/AboutModal.tsx src/components/ExportModal.tsx src/components/ScenarioModal.tsx src/components/ScenarioComparisonModal.tsx src/components/AiAdvisorModal.tsx src/components/AdminGate.tsx src/components/AdminPanel.tsx src/components/Footer.tsx
git commit -m "feat(ui): brutalist sweep on modals and footer"
```

---

### Task 10: Landing SSR restyle + modules grid

**Files:**
- Modify: `src/server/landing.ts`, `src/server/landingCards.ts` (only if card markup needs class tweaks; CSS lives in `landing.ts`)

**Interfaces:**
- Consumes: `renderLandingPage(req, cardsHtml, modelCount)` signature unchanged (call site `server.ts` untouched).
- Produces: new copy keys `modulesTitle`, `m1Cat`, `m1Title`, `m1Desc`, `m1Open`, `m1Quick`, `m2Cat`, `m2Title`, `m2Desc`, `m2Open`, `m2Quick` in `Copy` + both `COPY` languages; hero box markup + modules grid markup.

- [ ] **Step 1: Extend the `Copy` interface and dictionary**

In `landing.ts`, add to `interface Copy`: `modulesTitle: string; m1Cat: string; m1Title: string; m1Desc: string; m1Open: string; m1Quick: string; m2Cat: string; m2Title: string; m2Desc: string; m2Open: string; m2Quick: string;`.

Fill `tr`:
```ts
modulesTitle: 'Hesaplayıcı Modülleri',
m1Cat: 'INFERENCE', m1Title: 'Çıkarım Hesaplayıcı',
m1Desc: 'TTFT, TPOT, token/s ve VRAM — 8B’den 671B MoE’ye; canlı bulut fiyatları ve TCO.',
m1Open: 'Hesap Aç', m1Quick: 'Hızlı Başlangıç',
m2Cat: 'FINE-TUNING', m2Title: 'Fine-Tuning Hesaplayıcı',
m2Desc: 'QLoRA, LoRA ve tam ince ayar için GPU süresi, VRAM ve platform maliyeti.',
m2Open: 'Hesap Aç', m2Quick: 'Hızlı Başlangıç',
```
Fill `en`:
```ts
modulesTitle: 'Calculator Modules',
m1Cat: 'INFERENCE', m1Title: 'Inference Calculator',
m1Desc: 'TTFT, TPOT, tokens/s and VRAM — from 8B to 671B MoE; live cloud prices and TCO.',
m1Open: 'Open Calculator', m1Quick: 'Quick Start',
m2Cat: 'FINE-TUNING', m2Title: 'Fine-Tuning Calculator',
m2Desc: 'GPU hours, VRAM and platform cost for QLoRA, LoRA and full fine-tuning.',
m2Open: 'Open Calculator', m2Quick: 'Quick Start',
```

- [ ] **Step 2: Rewrite the inline `<style>` block**

Replace the entire `<style>…</style>` content with a light brutalist stylesheet. Key tokens/classes (write plain CSS; no Tailwind available in SSR):

```css
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
.hero { border:2px solid var(--border); background:var(--surface); max-width:820px; margin:0 auto 72px; padding:48px 32px 32px; position:relative; }
.hero-badge { position:absolute; top:0; left:50%; transform:translate(-50%,-50%); background:var(--info); color:#fff; font-family:"JetBrains Mono", monospace; font-size:12px; font-weight:700; letter-spacing:.08em; padding:6px 14px; border:2px solid var(--border); }
.hero h1 { font-size:clamp(30px,5vw,48px); line-height:1.1; letter-spacing:-.02em; text-align:center; margin:12px 0 16px; }
.hero p { color:var(--muted); font-size:17px; line-height:1.6; text-align:center; margin-bottom:32px; }
.hero-divider { border-top:1px solid var(--border); margin:28px 0 16px; }
.hero-meta { text-align:center; font-family:"JetBrains Mono", monospace; font-size:12px; color:var(--muted); }
.cta { display:inline-block; background:var(--accent); color:var(--bg); font-weight:800; font-size:16px; padding:14px 28px; border:2px solid var(--border); text-decoration:none; }
section h2 { font-size:26px; margin-bottom:8px; }
section .sub { color:var(--muted); font-size:15px; margin-bottom:28px; }
.modules { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:20px; margin-bottom:72px; }
.module { border:2px solid var(--border); background:var(--surface); display:flex; flex-direction:column; }
.module-head { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:2px solid var(--border); }
.module-num { font-family:"JetBrains Mono", monospace; font-size:14px; font-weight:800; }
.module-status { display:inline-flex; align-items:center; gap:6px; font-family:"JetBrains Mono", monospace; font-size:10px; font-weight:700; color:var(--ok); }
.module-status .sq { width:10px; height:10px; background:var(--ok); border:2px solid var(--border); }
.module-body { padding:16px; flex:1; }
.module-cat { font-family:"JetBrains Mono", monospace; font-size:11px; font-weight:700; color:var(--info); letter-spacing:.1em; }
.module-body h3 { font-size:18px; margin:6px 0 8px; }
.module-body p { color:var(--muted); font-size:14px; line-height:1.5; }
.module-foot { display:flex; border-top:2px solid var(--border); }
.module-foot a { flex:1; text-align:center; padding:12px 8px; font-family:"JetBrains Mono", monospace; font-size:12px; font-weight:700; color:var(--text); text-decoration:none; border-right:2px solid var(--border); }
.module-foot a:last-child { border-right:none; }
.module-foot a:hover { background:var(--surface2); }
.cards { display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:16px; margin-bottom:72px; }
.card { display:block; background:var(--surface); border:2px solid var(--border); padding:18px; text-decoration:none; color:inherit; transition:border-color .15s; }
.card:hover { background:var(--surface2); }
.card-model { font-weight:700; font-size:15px; margin-bottom:4px; }
.card-gpu { color:var(--muted); font-size:13px; margin-bottom:14px; }
.card-metrics { display:flex; flex-wrap:wrap; gap:8px; }
.metric { background:var(--surface2); border:2px solid var(--border); padding:8px 10px; font-size:12px; color:var(--muted); }
.metric b { color:var(--text); font-family:"JetBrains Mono", monospace; font-size:14px; }
.card-oom { margin-top:10px; color:var(--danger); font-size:12px; font-weight:700; }
.features { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:16px; margin-bottom:72px; }
.feature { background:var(--surface); border:2px solid var(--border); padding:20px; }
.feature h3 { font-size:16px; margin-bottom:8px; }
.feature p { color:var(--muted); font-size:14px; line-height:1.5; }
.stat { text-align:center; color:var(--muted); font-size:14px; }
.stat b { color:var(--text); font-family:"JetBrains Mono", monospace; font-size:28px; display:block; }
footer.site { border-top:2px solid var(--border); padding:28px 24px 40px; }
footer.site .wrap { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px; color:var(--muted); font-size:13px; }
footer.site a { color:var(--muted); text-decoration:none; margin-left:16px; }
footer.site a:hover { color:var(--text); }
@media (max-width:600px) { main { padding:48px 16px 32px; } .hero { padding:40px 20px 24px; } }
```

- [ ] **Step 3: Rebuild the hero + add modules grid markup**

Replace the `<section class="hero">…</section>` block with:

```html
    <section class="hero">
      <span class="hero-badge">LLM TOOLS · 2026</span>
      <h1>${esc(c.heroTitle)}</h1>
      <p>${esc(c.heroSub)}</p>
      <a class="cta" href="/app">${esc(c.cta)}</a>
      <div class="hero-divider"></div>
      <div class="hero-meta">${esc(c.heroBadge)}</div>
    </section>
```

Add the modules section directly after the hero (before the cards section):

```html
    <section>
      <h2>${esc(c.modulesTitle)}</h2>
      <div class="modules">
        <div class="module">
          <div class="module-head">
            <span class="module-num">01</span>
            <span class="module-status"><span class="sq"></span>ACTIVE</span>
          </div>
          <div class="module-body">
            <div class="module-cat">${esc(c.m1Cat)}</div>
            <h3>${esc(c.m1Title)}</h3>
            <p>${esc(c.m1Desc)}</p>
          </div>
          <div class="module-foot">
            <a href="/app">${esc(c.m1Open)}</a>
            <a href="/app?c=${esc(quickStartInference())}">${esc(c.m1Quick)}</a>
          </div>
        </div>
        <div class="module">
          <div class="module-head">
            <span class="module-num">02</span>
            <span class="module-status"><span class="sq"></span>ACTIVE</span>
          </div>
          <div class="module-body">
            <div class="module-cat">${esc(c.m2Cat)}</div>
            <h3>${esc(c.m2Title)}</h3>
            <p>${esc(c.m2Desc)}</p>
          </div>
          <div class="module-foot">
            <a href="/app">${esc(c.m2Open)}</a>
            <a href="/app">${esc(c.m2Quick)}</a>
          </div>
        </div>
      </div>
    </section>
```

For `quickStartInference()`: build a default config URL. Add to `landing.ts`:

```ts
import { DEFAULT_INFERENCE_CONFIG } from '../data/defaults';
import { encodeScenario } from '../utils/shareUrl';

function quickStartInference(): string {
  return encodeScenario('inference', DEFAULT_INFERENCE_CONFIG);
}
```

(Import path for `shareUrl` is `../utils/shareUrl` from `src/server/`; verify against the existing `landingCards.ts` import which already uses `'../utils/shareUrl'`.)

- [ ] **Step 4: Verify**

Run: `npm run lint` then `npm run build`. Then start the server and check `/`:
- Hero box with the blue `LLM TOOLS · 2026` badge, title, subtitle, divider, mono metadata.
- Two modules cards with 2px borders, mono numbers, green ACTIVE status, blue category labels, split footer buttons.
- Live example cards and features restyled flat/bordered; no rounded corners or shadows anywhere.

- [ ] **Step 5: Commit**

```bash
git add src/server/landing.ts src/server/landingCards.ts
git commit -m "feat(ui): brutalist landing with hero and modules grid"
```

---

### Task 11: Final verification + docs

**Files:**
- Modify: `AGENTS.md`, `PLAN.md`

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Full lint + build**

Run: `npm run lint` and `npm run build`. Expected: both pass clean.

- [ ] **Step 2: Manual smoke checklist**

Run `npm run dev` and verify each item:
- [ ] Landing `/` renders light brutalist hero + modules grid; language toggle works (TR/EN).
- [ ] `/app` loads at step 1; step indicator shows `01…06` for inference, `01…03` for fine-tuning.
- [ ] Geri/İleri navigation; visited steps clickable, unvisited disabled; back on step 1 disabled.
- [ ] Summary bar visible on every step; VRAM OK/OOM color correct; monthly cost and throughput update live.
- [ ] `?c=` share URL lands on Results; preset quick-start lands on Results.
- [ ] All 5 results tabs render; charts flat/bordered; context-scaling chart tokenized.
- [ ] Modals (About, Export, Scenario, Compare, Admin gate) flat/bordered/square.
- [ ] Mobile width: single column, summary bar pinned to bottom, no overflow.
- [ ] All UI text translated — no hardcoded Turkish/English leftovers in `src/components` (grep `rg -n "[A-Za-zÇĞİÖŞÜçğıöşü]" src/components --glob '*.tsx'` and inspect hits against `t('…')` usage).

- [ ] **Step 3: Update AGENTS.md**

Change the sentence in `AGENTS.md` that names the next planned work from Phase 3 to Phase 4 (light brutalist redesign + wizard), e.g.: *"next planned work per the growth spec (`docs/superpowers/specs/2026-08-25-public-tool-growth-design.md`) is Phase 4 (light brutalist redesign + wizard flow)".* Also update the AGENTS.md command/architecture notes if the wizard changed anything behavioral (it did not — same endpoints, same data flow).

- [ ] **Step 4: Update PLAN.md**

Mark the "SIRADAKİ: Phase 4" section as implemented: change the status line from *plan yazımı bekliyor (henüz kod yok)* to a completion summary (light brutalist theme, wizard steps, summary bar, landing modules grid) and note verification results (lint ✅, build ✅).

- [ ] **Step 5: Commit**

```bash
git add AGENTS.md PLAN.md
git commit -m "docs: mark Phase 4 light brutalist wizard complete"
```

---

## Self-Review

**Spec coverage:** Every spec section maps to a task — tokens/global corners (Task 1), primitives (Task 2), header/nav/logo/actions (Task 4), wizard stepper + summary bar (Tasks 5–6), configurators/results/modals/footer sweeps (Tasks 7–9), landing hero + modules grid (Task 10), i18n keys (Task 3), verification + docs (Task 11). The "unified SVG chart styling" item is covered by Task 8 Step 3 for the charts that exist in code.

**Placeholder scan:** No "TBD/TODO" or vague steps; every code step shows exact before/after or full component source. Sweep tasks use an explicit, repeatable rule table (bordered by `rg` enumeration) instead of open-ended prose.

**Type consistency:** `WizardStepDef`, `Wizard` props, and `SummaryCell`/`WizardSummaryBar` props defined in Task 5 are consumed verbatim in Task 6. `handleChangeTab`/`goToStep`/`goNext`/`goBack` names used in Task 6 Step 3 match the JSX wiring in Step 8. Step title keys (`wizard.*`) defined in Task 3 match `titleKey` values in Task 6 Step 1. Summary labels (`summary.*`) match Task 6 Step 7. `renderLandingPage(req, cardsHtml, modelCount)` signature untouched in Task 10 — `server.ts` needs no edit.

**Known gap (flagged, not a plan failure):** Phase 3's `ApiTab`/`apiPricePresets.ts` do not exist in the codebase (the Phase 3 plan doc exists but the code was never landed). The growth spec's Phase 4 mentions styling "incl. break-even chart"; since that component does not exist, Task 8 styles only the charts present today. If Phase 3 lands later, its `ApiTab` should follow the same unified chart rules.