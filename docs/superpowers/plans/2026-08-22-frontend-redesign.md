# Frontend Redesign — "Instrument Panel" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current light, "AI-generated-looking" UI with a dark, technical, calculator-style UI: warm monochrome + amber accent, mono-heavy typography, compact density, and a 2-column layout with a sticky results panel — across both tabs, header, and all modals, in one pass.

**Architecture:** Pure presentational redesign. Calculation logic, data flow, prop interfaces, and Turkish UI strings are untouched. A Tailwind v4 `@theme` token set + a small `ui/` primitive library form the new design foundation; `App.tsx` is restructured into a 2-column grid whose right column is a sticky, tabbed results panel. Existing config components are restyled onto the primitives; the 6 result cards are replaced by compact tab views inside the panel; modals are restyled with the same tokens.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4 (CSS-first `@theme`), Vite, `lucide-react` icons, `motion` (available, used sparingly). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-22-frontend-redesign-design.md`

## Global Constraints

- **Turkish strings:** All user-facing text (`senaryo`, `Model ara`, `Analiz Et`, `Giriş Yap`, etc.) is preserved verbatim — only styling changes.
- **No logic changes:** Do not modify `src/utils/calculator.ts`, `src/utils/fineTuningCalculator.ts`, or any calculation path. Do not change component prop/state contracts.
- **Do not modify** the `DISABLE_HMR` block in `vite.config.ts`.
- **Design tokens** (Tailwind v4): `bg #0F0E0D`, `surface #171615`, `surface-2 #1E1D1B`, `border #2A2826`, `text #EDEAE6`, `muted #8E8B8B`, `accent #FFB224`, `ok #3FB950`, `danger #F85149`. Fonts: JetBrains Mono (numbers/labels/inputs/badges), Inter (prose only).
- **Visual language:** flat surfaces, 1px borders, `rounded-md` max, no drop shadows/gradients, numbered mono section headers (`▸ 01 MODEL`), status badges as `[OK]`/`[OOM]` mono chips.
- **Verification** per task: `npm run lint` (tsc --noEmit) must pass; optionally `npm run build`; manual visual check via `npm run dev` (dark theme, no layout breakage). There is no test framework — the "test cycle" for each task is lint + build + visual inspection.
- All new files go under `src/components/ui/` and `src/components/ResultsPanel/`, `src/components/FineTuningResultsPanel/` unless stated otherwise.

---

## File Structure

**Create:**
- `src/index.css` — (modify) `@theme` tokens, base layer, scrollbar
- `index.html` — (modify) Google Fonts links
- `src/components/ui/Panel.tsx`
- `src/components/ui/SectionHeader.tsx`
- `src/components/ui/Stat.tsx`
- `src/components/ui/Badge.tsx`
- `src/components/ui/Field.tsx`
- `src/components/ui/NumberInput.tsx`
- `src/components/ui/Select.tsx`
- `src/components/ui/Segmented.tsx`
- `src/components/ui/Tabs.tsx`
- `src/components/ui/Collapse.tsx`
- `src/components/ResultsPanel/index.tsx` — container (headline, VRAM fit bar, key metrics, tabs)
- `src/components/ResultsPanel/VramTab.tsx`
- `src/components/ResultsPanel/PerfTab.tsx`
- `src/components/ResultsPanel/CostTab.tsx`
- `src/components/ResultsPanel/CloudTab.tsx`
- `src/components/ResultsPanel/TcoTab.tsx`
- `src/components/FineTuningResultsPanel/index.tsx`
- `src/components/FineTuningResultsPanel/VramTab.tsx`
- `src/components/FineTuningResultsPanel/TimeTab.tsx`
- `src/components/FineTuningResultsPanel/CostTab.tsx`
- `src/components/FineTuningConfigPanel.tsx` — fine-tuning input side (from FineTuningDashboard)
- `src/components/FineTuningPlatformCompare.tsx` — platform cost cards + table (from FineTuningDashboard)
- `src/components/FineTuningCodeExport.tsx` — 4-tab code export (from FineTuningDashboard)

**Modify (restyle only):** `src/App.tsx`, `src/components/Header.tsx`, `ModelSelector.tsx`, `QuantizationSelector.tsx`, `InferenceEngineSelector.tsx`, `GpuConfigurator.tsx`, `WorkloadConfigurator.tsx`, `AiAdvisorModal.tsx`, `ExportModal.tsx`, `ScenarioModal.tsx`, `ScenarioComparisonModal.tsx`, `AdminPanel.tsx`.

**Delete (replaced by panel tabs):** `src/components/VramBreakdownCard.tsx`, `PerformanceCard.tsx`, `CostAnalysisCard.tsx`, `CloudCostComparisonCard.tsx`, `OnPremisesTcoCard.tsx`, `GpuPricesCard.tsx`, `FineTuningDashboard.tsx`. Do not delete `ContextScalingChart.tsx` / `GpuComparisonTable.tsx` (currently unused, left as-is).

---

### Task 1: Design tokens + base styles

**Files:**
- Modify: `src/index.css`
- Modify: `index.html`

- [ ] **Step 1: Add Google Fonts links to `index.html`**

In `<head>`, before the title, add:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
```

- [ ] **Step 2: Replace `src/index.css` with the token set**

```css
@import "tailwindcss";

@theme {
  --color-bg: #0f0e0d;
  --color-surface: #171615;
  --color-surface-2: #1e1d1b;
  --color-border: #2a2826;
  --color-text: #edeae6;
  --color-muted: #8e8b8b;
  --color-accent: #ffb224;
  --color-ok: #3fb950;
  --color-danger: #f85149;

  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
}

@layer base {
  body {
    @apply bg-bg text-text font-sans antialiased;
  }
  ::selection {
    @apply bg-accent text-bg;
  }
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
}

@layer utilities {
  .scrollbar-none {
    scrollbar-width: none;
  }
  .scrollbar-none::-webkit-scrollbar {
    display: none;
  }
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: #171615;
}
::-webkit-scrollbar-thumb {
  background: #2a2826;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #8e8b8b;
}
```

- [ ] **Step 3: Verify**

Run: `npm run lint`
Expected: PASS (index.css is not type-checked; this confirms nothing broke).

Run: `npm run dev`, open http://localhost:3000
Expected: page background is now near-black `#0f0e0d`; text is light; existing components still render (they keep their own `bg-white` card classes on the dark page — temporarily inconsistent, expected until Task 4).

- [ ] **Step 4: Commit**

```bash
git add index.html src/index.css
git commit -m "feat(ui): add dark design tokens, fonts, base styles"
```

---

### Task 2: UI primitives

**Files:**
- Create: `src/components/ui/Panel.tsx`, `SectionHeader.tsx`, `Stat.tsx`, `Badge.tsx`, `Field.tsx`, `NumberInput.tsx`, `Select.tsx`, `Segmented.tsx`, `Tabs.tsx`, `Collapse.tsx`

**Interfaces:**
- Consumes: nothing (only Tailwind tokens + `lucide-react`).
- Produces (exact signatures used by later tasks):
  - `Panel: React.FC<{ children?: React.ReactNode; className?: string }>`
  - `SectionHeader: React.FC<{ index?: string; title: string; description?: string; right?: React.ReactNode }>`
  - `Stat: React.FC<{ label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: 'default' | 'ok' | 'danger' | 'accent' }>`
  - `Badge: React.FC<{ tone?: 'default' | 'accent' | 'ok' | 'danger'; children: React.ReactNode; title?: string; className?: string }>`
  - `Field: React.FC<{ label: string; children: React.ReactNode; className?: string }>`
  - `NumberInput: React.FC<{ value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; placeholder?: string; className?: string }>` — `onChange` receives `parseFloat(e.target.value)` which may be `NaN`; callers apply their own fallback (e.g. `|| 1`).
  - `Select: <T extends string | number>(props: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string })`
  - `Segmented: <T extends string>(props: { value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode }[]; className?: string })`
  - `Tabs: React.FC<{ tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void; className?: string }>`
  - `Collapse: React.FC<{ title: string; subtitle?: string; defaultOpen?: boolean; children: React.ReactNode }>`

- [ ] **Step 1: Create `Panel.tsx`**

```tsx
import React from 'react';

interface PanelProps {
  children?: React.ReactNode;
  className?: string;
}

export const Panel: React.FC<PanelProps> = ({ children, className = '' }) => {
  return <section className={`bg-surface border border-border rounded-md ${className}`}>{children}</section>;
};
```

- [ ] **Step 2: Create `SectionHeader.tsx`**

```tsx
import React from 'react';

interface SectionHeaderProps {
  index?: string;
  title: string;
  description?: string;
  right?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ index, title, description, right }) => {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-3.5 py-2">
      <div className="flex items-center gap-2.5 min-w-0">
        {index && <span className="text-[11px] font-bold font-mono text-accent shrink-0">▸ {index}</span>}
        <div className="min-w-0">
          <h2 className="text-[11px] font-bold font-mono uppercase tracking-wider text-text">{title}</h2>
          {description && <p className="text-[11px] text-muted mt-0.5">{description}</p>}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
};
```

- [ ] **Step 3: Create `Stat.tsx`**

```tsx
import React from 'react';

interface StatProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: 'default' | 'ok' | 'danger' | 'accent';
}

const TONES: Record<NonNullable<StatProps['tone']>, string> = {
  default: 'text-text',
  ok: 'text-ok',
  danger: 'text-danger',
  accent: 'text-accent',
};

export const Stat: React.FC<StatProps> = ({ label, value, sub, tone = 'default' }) => {
  return (
    <div className="border border-border rounded-md p-2.5 bg-surface-2">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted">{label}</div>
      <div className={`text-lg font-bold font-mono leading-tight mt-0.5 ${TONES[tone]}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted font-mono mt-0.5">{sub}</div>}
    </div>
  );
};
```

- [ ] **Step 4: Create `Badge.tsx`**

```tsx
import React from 'react';

interface BadgeProps {
  tone?: 'default' | 'accent' | 'ok' | 'danger';
  children: React.ReactNode;
  title?: string;
  className?: string;
}

const TONES: Record<NonNullable<BadgeProps['tone']>, string> = {
  default: 'text-muted bg-surface-2 border-border',
  accent: 'text-accent bg-surface-2 border-accent/40',
  ok: 'text-ok bg-surface-2 border-ok/40',
  danger: 'text-danger bg-surface-2 border-danger/40',
};

export const Badge: React.FC<BadgeProps> = ({ tone = 'default', children, title, className = '' }) => {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono font-semibold border rounded ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
};
```

- [ ] **Step 5: Create `Field.tsx`**

```tsx
import React from 'react';

interface FieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export const Field: React.FC<FieldProps> = ({ label, children, className = '' }) => {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[10px] font-mono uppercase tracking-wider text-muted">{label}</span>
      {children}
    </label>
  );
};
```

- [ ] **Step 6: Create `NumberInput.tsx`**

```tsx
import React from 'react';

interface NumberInputProps {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  placeholder?: string;
  className?: string;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  step,
  min,
  max,
  placeholder,
  className = '',
}) => {
  return (
    <input
      type="number"
      step={step}
      min={min}
      max={max}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className={`w-full bg-surface-2 border border-border rounded px-2.5 py-1.5 text-xs font-mono text-text placeholder-muted focus:outline-none focus:border-accent ${className}`}
    />
  );
};
```

- [ ] **Step 7: Create `Select.tsx`**

```tsx
import React from 'react';

interface SelectProps<T extends string | number> {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}

export function Select<T extends string | number>({ value, onChange, options, className = '' }: SelectProps<T>) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={`w-full bg-surface-2 border border-border rounded px-2.5 py-1.5 text-xs font-mono text-text focus:outline-none focus:border-accent ${className}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-surface text-text">
          {o.label}
        </option>
      ))}
    </select>
  );
}
```

- [ ] **Step 8: Create `Segmented.tsx`**

```tsx
import React from 'react';

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
  className?: string;
}

export function Segmented<T extends string>({ value, onChange, options, className = '' }: SegmentedProps<T>) {
  return (
    <div className={`inline-flex bg-surface-2 border border-border rounded p-0.5 gap-0.5 ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-2.5 py-1 text-[11px] font-mono rounded transition ${
            value === o.value ? 'bg-accent text-bg font-bold' : 'text-muted hover:text-text'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 9: Create `Tabs.tsx`**

```tsx
import React from 'react';

interface TabsProps {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, active, onChange, className = '' }) => {
  return (
    <div className={`flex items-center gap-0.5 border-b border-border px-1 overflow-x-auto scrollbar-none ${className}`}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider border-b-2 transition whitespace-nowrap ${
            active === t.id ? 'text-accent border-accent' : 'text-muted border-transparent hover:text-text'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
};
```

- [ ] **Step 10: Create `Collapse.tsx`**

```tsx
import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';

interface CollapseProps {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export const Collapse: React.FC<CollapseProps> = ({ title, subtitle, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-md bg-surface">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span className="flex items-center gap-2 min-w-0">
          <ChevronRight
            className={`w-3.5 h-3.5 text-muted transition-transform shrink-0 ${open ? 'rotate-90' : ''}`}
          />
          <span className="text-[11px] font-mono uppercase tracking-wider text-text truncate">{title}</span>
          {subtitle && <span className="text-[10px] text-muted font-mono shrink-0">{subtitle}</span>}
        </span>
      </button>
      {open && <div className="border-t border-border px-3 py-3">{children}</div>}
    </div>
  );
};
```

- [ ] **Step 11: Verify**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 12: Commit**

```bash
git add src/components/ui
git commit -m "feat(ui): add Panel, SectionHeader, Stat, Badge, Field, NumberInput, Select, Segmented, Tabs, Collapse primitives"
```

---

### Task 3: Header restyle

**Files:**
- Modify: `src/components/Header.tsx`

**Interfaces:**
- Consumes: `Segmented`, `Badge` primitives; existing `HeaderProps` (unchanged) and `PRESET_SCENARIOS`.
- Produces: nothing new (same props).

- [ ] **Step 1: Restyle the header shell**

Keep `HeaderProps`, the auth dropdown, preset dropdown, and all button handlers exactly as-is. Replace the classes:

- `header`: `bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-xs` → `bg-bg border-b border-border sticky top-0 z-30`
- Container: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3` unchanged
- Logo box: `w-8 h-8 bg-indigo-600 rounded-lg ...` → `w-8 h-8 bg-accent text-bg rounded font-mono font-bold flex items-center justify-center text-base` (keep the `∑` glyph)
- `h1`: `text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-none` → `text-sm sm:text-base font-bold text-text font-mono tracking-tight leading-none`
- Header badge (`Inference + Fine-Tuning`): → `<Badge tone="accent">Inference + Fine-Tuning</Badge>`
- Subtitle `p`: `text-[11px] text-slate-500` → `text-[11px] text-muted`

- [ ] **Step 2: Replace the center tab switcher with `Segmented`**

The `hidden md:flex ... rounded-xl` tab container becomes:

```tsx
<div className="hidden md:block">
  <Segmented
    value={activeTab}
    onChange={onChangeTab}
    options={[
      { value: 'inference' as const, label: '1. Çıkarım' },
      { value: 'finetuning' as const, label: '2. Fine-Tuning' },
    ]}
  />
</div>
```

Remove the old per-tab `Zap`/`Sparkles` icons and the `Unsloth & Colab` inline badge (moved to a `title`/subtitle if desired). Keep the Turkish labels verbatim.

- [ ] **Step 3: Restyle all action buttons**

Map each button to the shared classes:

- Secondary buttons (Senaryolar, Kaydet, Karşılaştır, Dışa Aktar, Sıfırla, Yönetim, avatar/login): `bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-700` → `bg-surface-2 hover:bg-surface border border-border rounded text-muted hover:text-text`; icon `text-slate-*` → `text-muted` (keep semantic color on the icon glyph where meaningful: Save emerald → `text-ok`, Compare sky → `text-muted`, Shield rose → `text-danger`).
- Primary button (AI Mimar): `bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg` → `bg-accent hover:opacity-90 text-bg font-bold rounded`; icon `text-indigo-100` → `text-bg/70`.
- Dropdown panels (`bg-white ... rounded-xl shadow-xl`): → `bg-surface border border-border rounded-md shadow-none`; items `hover:bg-indigo-50 text-indigo-600` → `hover:bg-surface-2 text-accent`.
- Login button: keep as a secondary button with `text-muted`; icon → `text-accent`.

- [ ] **Step 4: Verify**

Run: `npm run lint`
Expected: PASS.

Run `npm run dev` and visually confirm: single-row dark bar, amber active tab, amber primary button, legible dropdowns.

- [ ] **Step 5: Commit**

```bash
git add src/components/Header.tsx
git commit -m "feat(ui): restyle header to dark instrument bar"
```

---

### Task 4: App shell + ResultsPanel (headline, metrics, VRAM tab)

**Files:**
- Modify: `src/App.tsx`
- Create: `src/components/ResultsPanel/index.tsx`, `src/components/ResultsPanel/VramTab.tsx`

**Interfaces:**
- Consumes: all existing config components and modals; `results`, `config`, `livePrices`, `liveOverrides`, `lastUpdated`, `pricesLoading`, `refetchPrices`, `activeGpu` from `App`.
- Produces:
  - `ResultsPanelProps`: `{ results: CalculationResults; config: CalculatorConfig; gpuVramGB: number; prices: GpuPrice[]; overrides: Record<string, number>; lastUpdated: string | null; pricesLoading: boolean; onRefreshPrices: () => void; onOpenAiAdvisor?: () => void; onChangeConfig?: (updater: (prev: CalculatorConfig) => CalculatorConfig) => void }`
  - `VramTabProps`: `{ results: CalculationResults; gpuCount: number; gpuVramGB: number }`

- [ ] **Step 1: Create `ResultsPanel/VramTab.tsx`**

```tsx
import React from 'react';
import { CalculationResults } from '../../types';
import { Badge, Panel, Stat } from '../ui';
import { Weight, Layers, Activity, Cpu } from 'lucide-react';

interface VramTabProps {
  results: CalculationResults;
  gpuCount: number;
  gpuVramGB: number;
}

const SEGMENTS = [
  { label: 'Ağırlıklar', field: 'weightMemoryGB' as const, cls: 'bg-accent' },
  { label: 'KV Önbellek', field: 'kvCacheMemoryGB' as const, cls: 'bg-[#8e8b8b]' },
  { label: 'Aktivasyonlar', field: 'activationMemoryGB' as const, cls: 'bg-ok' },
  { label: 'CUDA Overhead', field: 'cudaOverheadGB' as const, cls: 'bg-danger/50' },
];

export const VramTab: React.FC<VramTabProps> = ({ results, gpuCount, gpuVramGB }) => {
  const total = results.totalVramNeededGB || 1;
  return (
    <div className="space-y-3">
      <div className="flex h-3 w-full overflow-hidden rounded bg-surface-2 border border-border">
        {SEGMENTS.map((s) => (
          <div
            key={s.field}
            className={s.cls}
            style={{ width: `${Math.max(0, Math.min(100, (results[s.field] / total) * 100))}%` }}
            title={s.label}
          />
        ))}
      </div>

      <div className="space-y-1 text-[11px] font-mono">
        {SEGMENTS.map((s) => (
          <div key={s.field} className="flex items-center justify-between">
            <span className="text-muted">{s.label}</span>
            <span className="text-text">{results[s.field].toFixed(1)} GB</span>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-border pt-1 font-bold">
          <span className="text-muted">Toplam Gerekli</span>
          <span className={results.isOom ? 'text-danger' : 'text-text'}>
            {results.totalVramNeededGB.toFixed(1)} GB
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">GPU Başına ({gpuCount}x)</span>
          <span className="text-text">{results.vramPerGpuNeededGB.toFixed(1)} GB</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">Mevcut</span>
          <span className="text-ok">{results.totalVramAvailableGB} GB ({gpuVramGB} GB/GPU)</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Doluluk" value={`%${results.vramUtilizationPct.toFixed(0)}`} tone={results.isOom ? 'danger' : 'ok'} />
        <Stat label="KV / Kullanıcı" value={`${results.kvCachePerUserMB.toFixed(0)}`} sub="MB" />
      </div>

      {results.isOom && (
        <div className="border border-danger/40 bg-danger/10 rounded p-2.5 text-[11px] font-mono text-danger">
          [OOM] Bu donanım yetersiz. Önerilen min. GPU: {results.recommendedMinGpus}
        </div>
      )}
    </div>
  );
};
```

Note: `Weight, Layers, Activity, Cpu` imports are illustrative — use only the lucide icons you actually reference (drop unused imports; lint has no `noUnusedLocals` but keep it clean).

- [ ] **Step 2: Create `ResultsPanel/index.tsx`**

```tsx
import React, { useState } from 'react';
import { CalculationResults, CalculatorConfig, GpuPrice } from '../../types';
import { Badge, Panel, Stat, Tabs } from '../ui';
import { Sparkles } from 'lucide-react';
import { VramTab } from './VramTab';

export interface ResultsPanelProps {
  results: CalculationResults;
  config: CalculatorConfig;
  gpuVramGB: number;
  prices: GpuPrice[];
  overrides: Record<string, number>;
  lastUpdated: string | null;
  pricesLoading: boolean;
  onRefreshPrices: () => void;
  onOpenAiAdvisor?: () => void;
  onChangeConfig?: (updater: (prev: CalculatorConfig) => CalculatorConfig) => void;
}

const TABS = [
  { id: 'vram', label: 'VRAM' },
  { id: 'perf', label: 'PERF' },
  { id: 'cost', label: 'COST' },
  { id: 'cloud', label: 'CLOUD' },
  { id: 'tco', label: 'TCO' },
];

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  results,
  config,
  gpuVramGB,
  prices,
  overrides,
  lastUpdated,
  pricesLoading,
  onRefreshPrices,
  onOpenAiAdvisor,
  onChangeConfig,
}) => {
  const [tab, setTab] = useState('vram');

  return (
    <Panel className="overflow-hidden">
      <div className="px-3.5 py-3 border-b border-border">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-bold font-mono text-text truncate">{results.modelName}</span>
              <Badge tone="default">{results.totalParamsB}B</Badge>
              <Badge tone="accent">{results.engineName}</Badge>
              <Badge tone="default">{config.quantId.toUpperCase()}</Badge>
            </div>
            <p className="text-[11px] text-muted font-mono mt-1 truncate">
              {config.gpuCount}x {results.gpuName} • {results.activeTotalUsers} eşzamanlı kullanıcı •{' '}
              {results.effectivePromptLen.toLocaleString()} in / {results.effectiveGenLen.toLocaleString()} out
            </p>
          </div>
          {onOpenAiAdvisor && (
            <button
              onClick={onOpenAiAdvisor}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold font-mono text-bg bg-accent hover:opacity-90 rounded shrink-0 transition active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Analiz Et</span>
            </button>
          )}
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] font-mono mb-1">
            <span className="text-muted uppercase tracking-wider">VRAM Doluluk</span>
            <span className={results.isOom ? 'text-danger' : 'text-ok'}>
              {results.isOom ? '[OOM]' : '[OK]'} %{results.vramUtilizationPct.toFixed(0)}
            </span>
          </div>
          <div className="h-2 bg-surface-2 border border-border rounded overflow-hidden">
            <div
              className={`h-full transition-all ${results.isOom ? 'bg-danger' : 'bg-ok'}`}
              style={{ width: `${Math.min(100, results.vramUtilizationPct)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono mt-1 text-muted">
            <span>{results.totalVramNeededGB.toFixed(1)} GB</span>
            <span>/ {results.totalVramAvailableGB} GB</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 px-3.5 py-3 border-b border-border">
        <Stat label="Aylık Maliyet" value={`$${results.monthlyCostUsd.toFixed(0)}`} tone={results.isOom ? 'danger' : 'accent'} />
        <Stat label="Sistem Throughput" value={`${results.systemThroughputTokensPerSec.toFixed(0)}`} sub="tok/s" />
        <Stat label="TTFT" value={`${results.ttftMs.toFixed(0)}`} sub="ms" />
        <Stat label="TPOT" value={`${results.tpotMs.toFixed(2)}`} sub="ms" />
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      <div className="p-3.5">
        {tab === 'vram' && <VramTab results={results} gpuCount={config.gpuCount} gpuVramGB={gpuVramGB} />}
        {tab === 'perf' && null}
        {tab === 'cost' && null}
        {tab === 'cloud' && null}
        {tab === 'tco' && null}
      </div>
    </Panel>
  );
};
```

Note: the `null` branches for perf/cost/cloud/tco are temporary — Tasks 9 and 10 replace them with real tab components. Do not remove the tab entries from `TABS`; a placeholder tab body is acceptable only as this transitional state, and it will be gone after Task 10.

- [ ] **Step 3: Restructure `App.tsx` inference branch into the 2-column grid**

Keep every line of state, the memoized `results`/`ftResults`, `modelCatalog`, all modal handlers, and `handleReset`/`handleSelectPreset`/`handleSelectModel`/`handleLoadScenario`/`handleOpenCompare` untouched. Remove the old top summary banner and the old results section (`GpuPricesCard`…`OnPremisesTcoCard` imports + JSX), and remove those six imports.

Replace the main JSX with:

```tsx
<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
  {activeTab === 'finetuning' ? (
    <div className="space-y-5">
      <ModelSelector
        selectedModelId={ftConfig.modelId}
        customModel={ftConfig.customModel}
        onSelectModel={handleSelectModel}
        onUpdateCustomModel={(customModel) => {
          setConfig((prev) => ({ ...prev, customModel }));
          setFtConfig((prev) => ({ ...prev, customModel }));
        }}
        models={modelCatalog}
      />
      <FineTuningDashboard
        config={ftConfig}
        results={ftResults}
        onChangeConfig={setFtConfig}
        models={modelCatalog}
      />
    </div>
  ) : (
    <div className="lg:grid lg:grid-cols-[1fr_460px] lg:gap-6 lg:items-start">
      <div className="space-y-4">
        <ModelSelector
          selectedModelId={config.modelId}
          customModel={config.customModel}
          onSelectModel={handleSelectModel}
          onUpdateCustomModel={(customModel) => {
            setConfig((prev) => ({ ...prev, customModel }));
            setFtConfig((prev) => ({ ...prev, customModel }));
          }}
          models={modelCatalog}
        />
        <QuantizationSelector
          selectedQuantId={config.quantId}
          selectedKvCacheQuantId={config.kvCacheQuantId}
          onSelectQuant={(quantId) => setConfig((prev) => ({ ...prev, quantId }))}
          onSelectKvCacheQuant={(kvCacheQuantId) => setConfig((prev) => ({ ...prev, kvCacheQuantId }))}
        />
        <InferenceEngineSelector
          selectedEngineId={config.engineId}
          onSelectEngine={(engineId) => setConfig((prev) => ({ ...prev, engineId }))}
        />
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
      </div>

      <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
        <ResultsPanel
          results={results}
          config={config}
          gpuVramGB={activeGpu.vramGB}
          prices={livePrices}
          overrides={liveOverrides}
          lastUpdated={lastUpdated}
          pricesLoading={pricesLoading}
          onRefreshPrices={refetchPrices}
          onOpenAiAdvisor={() => setIsAiModalOpen(true)}
          onChangeConfig={(updater) => setConfig(updater)}
        />
      </div>
    </div>
  )}
</main>
```

Add `ResultsPanel` to imports. Keep all modal JSX below `</main>` unchanged.

- [ ] **Step 4: Verify**

Run: `npm run lint`
Expected: PASS (removed imports must be gone from `App.tsx`).

Run `npm run dev`: inference tab shows config column on the left and a dark sticky panel on the right with headline, VRAM bar, key metric grid, and a working VRAM tab. OOM state turns the bar/badge red. Changing `batchSize` or GPU count updates the panel live.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/ResultsPanel
git commit -m "feat(ui): 2-column app shell with sticky ResultsPanel (headline, VRAM tab)"
```

---

### Task 5: ModelSelector restyle

**Files:**
- Modify: `src/components/ModelSelector.tsx`

**Interfaces:**
- Consumes: `Panel`, `SectionHeader`, `Badge`, `Field`, `NumberInput`, `Collapse` primitives. `ModelSelectorProps` unchanged.
- Produces: nothing new.

- [ ] **Step 1: Restyle the outer card and header**

- Outer container `bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs space-y-3.5` → `Panel` with `p-3.5 space-y-3` body. Header block → `SectionHeader index="01" title="LLM Model Parametreleri" description="Parametre boyutu, mimari (Dense / MoE), katman ve donanım uygunluğu" right={<search + Özel Model buttons>}`. Search icon `text-slate-400` → `text-muted`; search input classes → `bg-surface-2 border border-border rounded pl-8 pr-2.5 py-1 text-xs font-mono text-text placeholder-muted focus:outline-none focus:border-accent w-48 sm:w-60`.
- "Özel Model" button: active `bg-indigo-600 text-white border-indigo-600` → `bg-accent text-bg border-accent font-bold`; inactive `bg-slate-100 text-slate-700 border-slate-200` → `bg-surface-2 text-text border-border hover:bg-surface`.

- [ ] **Step 2: Restyle the AI recommendation banner**

Banner `bg-indigo-50/70 border border-indigo-200/80 rounded-xl ...` → `bg-surface-2 border border-border rounded-md`; icon tile `bg-indigo-600 text-white` → `bg-accent text-bg`; title `text-slate-900` → `text-text`; "AI Destekli" chip → `Badge tone="accent"`. Use-case preset chips (`bg-white hover:bg-indigo-50 border-slate-200`) → `bg-surface hover:bg-surface-2 border-border hover:border-accent/50`; chip icon/label `text-indigo-600`/`text-indigo-900` → `text-accent`. Free-text input → same input token set as the search box but `py-2`. Primary button → `bg-accent text-bg font-bold hover:opacity-90`. Error box → `bg-danger/10 border-danger/40 text-danger`. Recommendation highlight banner → `bg-surface-2 border-border rounded-md`; "Önerilen Model Otomatik Seçildi" chip → `Badge tone="ok"`.

- [ ] **Step 3: Restyle filter bars, model grid, and summary**

- Env filter container `bg-slate-50 ... border-slate-200` → `bg-surface-2 border-border rounded`; active pill `bg-white text-indigo-700` → `bg-accent text-bg font-bold`; inactive `text-slate-600` → `text-muted hover:text-text`.
- Capability filter buttons: active `bg-indigo-600 text-white` → `bg-accent text-bg font-bold`; inactive `bg-slate-100 text-slate-600` → `bg-surface-2 text-muted hover:text-text hover:bg-surface`.
- Model cards: selected `bg-indigo-50/70 border-indigo-500` → `bg-surface-2 border-accent`; AI-recommended `bg-purple-50/40 border-purple-300` → `bg-surface border-accent/40`; default `bg-white border-slate-200` → `bg-surface border-border hover:border-accent/40 hover:bg-surface-2`. Card provider label `text-slate-400` → `text-muted`; model name `text-slate-900` → `text-text`; stat values `text-indigo-700` → `text-accent`. Env badges (`bg-teal-50 text-teal-700` etc.) → use `Badge` with `tone="default"` (keep the Turkish label text) or a muted `Badge`; MoE chip `bg-amber-50 text-amber-700` → `Badge tone="accent"`. Corner badges (`SEÇİLİ`/`AI ÖNERİSİ`) → `bg-accent text-bg` / `bg-surface-2 text-muted`; `HF'DEN DOĞRULANAMADI` → `Badge tone="danger"`; `TOPLULUK AYNASI` → `Badge tone="default"`.
- Selected architecture summary strip `bg-slate-50 ... border-slate-200` → `bg-surface-2 border-border rounded-md`; labels `text-slate-600`/`text-slate-700` → `text-muted`; values `text-indigo-700` → `text-accent`.

- [ ] **Step 4: Restyle the custom-model modal**

Overlay `bg-slate-900/50` → `bg-black/60`; dialog `bg-white ... rounded-xl` → `bg-surface border border-border rounded-md`; inputs → `bg-surface-2 border-border ... focus:border-accent` token set; title `text-slate-900` → `text-text`; close button `text-slate-400` → `text-muted hover:text-text`; checkbox `text-indigo-600` → `text-accent`; "Kaydet ve Uygula" → `bg-accent text-bg font-bold hover:opacity-90`.

- [ ] **Step 5: Verify**

Run: `npm run lint` (PASS). Dev check: model search, filters, AI recommendation, custom model modal all function and match the dark theme.

- [ ] **Step 6: Commit**

```bash
git add src/components/ModelSelector.tsx
git commit -m "feat(ui): restyle ModelSelector onto dark primitives"
```

---

### Task 6: Quantization + Engine selectors restyle

**Files:**
- Modify: `src/components/QuantizationSelector.tsx`, `src/components/InferenceEngineSelector.tsx`

**Interfaces:**
- Consumes: `Panel`, `SectionHeader`, `Badge` primitives. Props unchanged.
- Produces: nothing new.

- [ ] **Step 1: Restyle `QuantizationSelector.tsx`**

- Outer card → `Panel`; header → `SectionHeader index="02" title="Quantization" description="..."` (keep existing description text). Replace every `bg-white`/`bg-slate-*`/`border-slate-*`/`text-indigo-*` with the token equivalents: selected option tiles → `bg-surface-2 border-accent`; unselected → `bg-surface border-border hover:border-accent/40`. Quant name/value text → `text-text`/`text-accent`; description → `text-muted`. Keep all option data (`QUANTIZATION_OPTIONS`, KV options) and handlers unchanged.

- [ ] **Step 2: Restyle `InferenceEngineSelector.tsx`**

- Outer card → `Panel`; header → `SectionHeader index="03" title="Inference Engine" ...`. Engine tiles: selected → `bg-surface-2 border-accent`, unselected → `bg-surface border-border`. Speed/status values `text-indigo-600` → `text-accent`; `[HIZLI]`-type badges → `Badge tone="accent"`. Keep `INFERENCE_ENGINES` data and handlers unchanged.

- [ ] **Step 3: Verify + commit**

Run: `npm run lint` (PASS); dev check both selectors look dark and remain interactive.

```bash
git add src/components/QuantizationSelector.tsx src/components/InferenceEngineSelector.tsx
git commit -m "feat(ui): restyle quant + engine selectors"
```

---

### Task 7: GpuConfigurator restyle

**Files:**
- Modify: `src/components/GpuConfigurator.tsx`

**Interfaces:**
- Consumes: `Panel`, `SectionHeader`, `Badge`, `Field`, `NumberInput` primitives. Props unchanged.
- Produces: nothing new.

- [ ] **Step 1: Restyle shell + tier filters + search**

- Outer card → `Panel`; header → `SectionHeader index="04" title="GPU Hardware" ...`. Tier pills + search: same pattern as Task 5 Step 3 (active → `bg-accent text-bg font-bold`, inactive → `bg-surface-2 text-muted hover:text-text hover:bg-surface`).

- [ ] **Step 2: Restyle GPU card grid**

- GPU cards: selected → `bg-surface-2 border-accent`, default → `bg-surface border-border hover:border-accent/40`; VRAM value `text-indigo-600` → `text-accent`; price line → `text-muted`. Model name → `text-text`. Any "uymuyor" / insufficient-VRAM badge → `Badge tone="danger"`.

- [ ] **Step 3: Restyle count/TP controls and custom-GPU modal**

- Slider + TP buttons: secondary → `bg-surface-2 text-text border-border`; active TP → `bg-accent text-bg font-bold`. Slider accent: add `accent-[#FFB224]` to the range input. Custom-GPU modal: overlay `bg-black/60`, dialog `bg-surface border-border rounded-md`, inputs → token set (same as Task 5 Step 4). Keep `GpuPreset` fields and handlers unchanged.

- [ ] **Step 4: Verify + commit**

Run: `npm run lint` (PASS); dev check GPU grid, tier filter, slider, TP buttons, custom GPU modal.

```bash
git add src/components/GpuConfigurator.tsx
git commit -m "feat(ui): restyle GpuConfigurator"
```

---

### Task 8: WorkloadConfigurator restyle

**Files:**
- Modify: `src/components/WorkloadConfigurator.tsx`

**Interfaces:**
- Consumes: `Panel`, `SectionHeader`, `Field`, `NumberInput`, `Collapse`, `Segmented` primitives. Props unchanged.
- Produces: nothing new.

- [ ] **Step 1: Restyle shell + header**

- Outer card → `Panel`; header → `SectionHeader index="05" title="Workload & Kullanıcı Profilleri" ...`. `useMultiProfile` toggle (segmented or switch) → `Segmented` if segmented; otherwise a mono switch: active `bg-accent text-bg`, inactive `bg-surface-2 text-muted`.

- [ ] **Step 2: Restyle sliders, inputs, persona editor, advanced drawer**

- Every numeric input → `NumberInput` (keeping the caller's parse-fallback semantics; verify each original `onChange` used `parseFloat(...) || x` and preserve that fallback in the `onChange` you pass).
- Sliders: add `accent-[#FFB224]`. Persona cards → `bg-surface-2 border-border`; profile value numbers → `text-accent`. Advanced drawer → `Collapse title="Gelişmiş Parametreler"` (Turkish label from the existing section) with the overhead inputs inside. Keep all props/handlers and the `UserProfile` shape unchanged.

- [ ] **Step 3: Verify + commit**

Run: `npm run lint` (PASS); dev check multi-profile toggle, sliders, persona editor, advanced drawer.

```bash
git add src/components/WorkloadConfigurator.tsx
git commit -m "feat(ui): restyle WorkloadConfigurator"
```

---

### Task 9: ResultsPanel — PERF and COST tabs

**Files:**
- Create: `src/components/ResultsPanel/PerfTab.tsx`, `src/components/ResultsPanel/CostTab.tsx`
- Modify: `src/components/ResultsPanel/index.tsx`

**Interfaces:**
- Consumes: `CalculationResults` fields; `Stat`, `Badge` primitives.
- Produces: `PerfTabProps = { results: CalculationResults }`; `CostTabProps = { results: CalculationResults; gpuCount: number; gpuName: string }`.

- [ ] **Step 1: Create `PerfTab.tsx`**

```tsx
import React from 'react';
import { CalculationResults } from '../../types';
import { Stat } from '../ui';

interface PerfTabProps {
  results: CalculationResults;
}

export const PerfTab: React.FC<PerfTabProps> = ({ results }) => {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="TTFT" value={`${results.ttftMs.toFixed(0)}`} sub="ms" />
        <Stat label="TPOT" value={`${results.tpotMs.toFixed(2)}`} sub="ms" />
        <Stat label="Kullanıcı Hızı" value={`${results.tokensPerSecPerUser.toFixed(1)}`} sub="tok/s" />
        <Stat label="Sistem Throughput" value={`${results.systemThroughputTokensPerSec.toFixed(0)}`} sub="tok/s" />
      </div>

      <div className="space-y-1 text-[11px] font-mono border border-border rounded-md p-2.5 bg-surface-2">
        <div className="flex items-center justify-between">
          <span className="text-muted">Eşzamanlı Kullanıcı (yapılandırılan)</span>
          <span className="text-text">{results.activeTotalUsers}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">Limit (VRAM)</span>
          <span className="text-text">{results.maxConcurrentUsersVramLimit}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">Limit (Compute)</span>
          <span className="text-text">{results.maxConcurrentUsersComputeLimit}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">Prefill FLOPs</span>
          <span className="text-text">{(results.prefillFlopsTotal / 1e12).toFixed(2)} TFLOP</span>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Create `CostTab.tsx`**

```tsx
import React from 'react';
import { CalculationResults } from '../../types';
import { Stat } from '../ui';

interface CostTabProps {
  results: CalculationResults;
  gpuCount: number;
  gpuName: string;
}

export const CostTab: React.FC<CostTabProps> = ({ results, gpuCount, gpuName }) => {
  return (
    <div className="space-y-3">
      <div className="text-[11px] font-mono text-muted uppercase tracking-wider">
        Donanım: {gpuCount}x {gpuName}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Saatlik" value={`$${results.hourlyCostUsd.toFixed(2)}`} />
        <Stat label="Günlük" value={`$${results.dailyCostUsd.toFixed(2)}`} />
        <Stat label="Aylık" value={`$${results.monthlyCostUsd.toFixed(0)}`} tone="accent" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="$/1M In" value={results.costPerMillionInputTokensUsd.toFixed(2)} />
        <Stat label="$/1M Out" value={results.costPerMillionOutputTokensUsd.toFixed(2)} />
        <Stat label="$/100k Req" value={results.costFor100kRequestsUsd.toFixed(2)} />
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Wire the tabs into `ResultsPanel/index.tsx`**

Add imports and replace the `{tab === 'perf' && null}` / `{tab === 'cost' && null}` lines:

```tsx
{tab === 'perf' && <PerfTab results={results} />}
{tab === 'cost' && <CostTab results={results} gpuCount={config.gpuCount} gpuName={results.gpuName} />}
```

- [ ] **Step 4: Verify + commit**

Run: `npm run lint` (PASS). Dev check: PERF and COST tabs render live-updating stats; numbers match the old cards.

```bash
git add src/components/ResultsPanel
git commit -m "feat(ui): add PERF and COST tabs to ResultsPanel"
```

---

### Task 10: ResultsPanel — CLOUD and TCO tabs

**Files:**
- Create: `src/components/ResultsPanel/CloudTab.tsx`, `src/components/ResultsPanel/TcoTab.tsx`
- Modify: `src/components/ResultsPanel/index.tsx`

**Interfaces:**
- Consumes: `CalculationResults.cloudCosts`, `GpuPrice[]`/`overrides`/`lastUpdated`/`loading`/`onRefresh`, `OnPremisesTco`, `CalculatorConfig` + `onChangeConfig`.
- Produces:
  - `CloudTabProps = { results: CalculationResults; gpuCount: number; gpuId: string; gpuName: string; prices: GpuPrice[]; overrides: Record<string, number>; lastUpdated: string | null; pricesLoading: boolean; onRefreshPrices: () => void }`
  - `TcoTabProps = { results: CalculationResults; config: CalculatorConfig; onChangeConfig: (updater: (prev: CalculatorConfig) => CalculatorConfig) => void }`

- [ ] **Step 1: Create `CloudTab.tsx`**

Compact provider matrix. For each `results.cloudCosts` entry render a row: provider name, `matchedInstance`, hourly (`totalHourlyCostUsd`) and monthly (`totalMonthlyCostUsd`), a `Badge tone="accent"` with "EN UCUZ" when `isCheapest`, and `notes` in muted text. Use `results` fields `cloudCosts`; keep the exact Turkish strings from `CloudCostComparisonCard.tsx` (open it and copy the provider display names / notes / header labels verbatim).

Below the matrix add the live-scraped prices section (from `GpuPricesCard.tsx` — copy the Turkish labels, override banner, and provider groupings verbatim): a header row with "Canlı GPU Fiyatları" + last-updated timestamp (`lastUpdated` → format as `YYYY-MM-DD HH:mm` or the raw string) + refresh button (`onRefreshPrices`, spinning icon when `pricesLoading`), then grouped rows for RunPod / Modal / Lambda from `prices` filtered by `gpuId`, honoring `overrides` (override value replaces the scraped price; keep the same rule `GpuPricesCard` uses — check its code and reproduce).

Styling: rows as mono `text-[11px]`, provider label `text-muted`, prices `text-text`, cheapest `text-ok`, loading → 3 skeleton rows (`animate-pulse bg-surface-2`), empty → "Fiyat verisi yok" muted text.

- [ ] **Step 2: Create `TcoTab.tsx`**

Open `OnPremisesTcoCard.tsx` and reproduce its content compactly:
- Local `const [showTry, setShowTry] = useState(false)` for USD/TRY (matches the old toggle behavior — check the old card's toggle logic and copy it).
- 2×2 stat grid from `results.onPremTco`: `hardwareCapexUsd|Try`, `annualOpexTotalUsd|Try`, `totalFirstYearCostUsd|Try` (tone accent), `breakEvenMonthsVsCloud` (sub: `breakEvenDescription`).
- TCO distribution: 3-segment bar of `annualElectricityCostUsd|Try`, `annualCoolingCostUsd|Try`, `annualMaintenanceUsd|Try`, `annualOtherExpensesUsd|Try` (sum = `annualOpexTotalUsd|Try`) with a mono legend.
- Cloud vs on-prem note: reuse `breakEvenDescription` + `monthlyAverageCostUsd|Try` vs `results.monthlyCostUsd`.
- A `Collapse title="Maliyet Ayarları"` containing `NumberInput`s bound via `config` + `onChangeConfig`: `electricityRateTryPerKwh`, `usdToTryRate`, `pueRatio`, `serverDutyCyclePct`, and the six custom fields (`customGpuUnitPriceUsd`, `customSystemBasePriceUsd`, `customAnnualElectricityUsd`, `customAnnualCoolingUsd`, `customAnnualMaintenanceUsd`, `customAnnualOtherExpensesUsd`), each `onChange` mapping to the same `setConfig` updaters App previously passed to `OnPremisesTcoCard` (copy the exact updater expressions from the old `App.tsx` diff / current `OnPremisesTcoCard` props). Add a "Sıfırla" button calling the same `onResetAllCustomCosts` logic (null the six custom fields).
- Keep all Turkish labels verbatim from `OnPremisesTcoCard.tsx`.

- [ ] **Step 3: Wire into `ResultsPanel/index.tsx`**

Pass the extra props through `ResultsPanelProps` (add `gpuId: string` to the props; `App.tsx` supplies `config.gpuId`) and replace the `null` branches:

```tsx
{tab === 'cloud' && (
  <CloudTab
    results={results}
    gpuCount={config.gpuCount}
    gpuId={config.gpuId}
    gpuName={results.gpuName}
    prices={prices}
    overrides={overrides}
    lastUpdated={lastUpdated}
    pricesLoading={pricesLoading}
    onRefreshPrices={onRefreshPrices}
  />
)}
{tab === 'tco' && onChangeConfig && (
  <TcoTab results={results} config={config} onChangeConfig={onChangeConfig} />
)}
```

Update `App.tsx` to pass `gpuId={config.gpuId}` to `ResultsPanel`.

- [ ] **Step 4: Verify + commit**

Run: `npm run lint` (PASS). Dev check: CLOUD tab shows provider matrix + live scraped prices with refresh; TCO tab shows TCO stats, distribution, and the settings collapse mutates config live. OOM still reflected in headline.

```bash
git add src/components/ResultsPanel src/App.tsx
git commit -m "feat(ui): add CLOUD and TCO tabs to ResultsPanel"
```

---

### Task 11: Fine-tuning — config panel + 2-column shell

**Files:**
- Create: `src/components/FineTuningConfigPanel.tsx`
- Modify: `src/App.tsx`
- (Reference only: `src/components/FineTuningDashboard.tsx` — split its input side here; results side handled in Task 12)

**Interfaces:**
- Consumes: `FineTuningConfig`, `FineTuningResults`, `onChangeConfig`, `models?`. Existing `FineTuningDashboardProps` shape.
- Produces: `FineTuningConfigPanelProps = { config: FineTuningConfig; results: FineTuningResults; onChangeConfig: (updater: (prev: FineTuningConfig) => FineTuningConfig) => void }`; `FineTuningResultsPanelProps` (Task 12).

- [ ] **Step 1: Read `FineTuningDashboard.tsx` and identify the input sections**

Open the file and split it: everything that *configures* (dataset presets, method & framework pickers, GPU picker, dataset/token inputs, manual hyperparameters, auto-optimize toggle) belongs in `FineTuningConfigPanel`; everything that *displays results* (VRAM distribution, time/speedup, platform comparison, code export) belongs in Task 12. Preserve every input's exact `config` field binding and Turkish label.

- [ ] **Step 2: Create `FineTuningConfigPanel.tsx`**

Structure = `Panel` + `SectionHeader`-style group headers using `Collapse` sections:
- `Collapse title="Dataset & Yöntem" defaultOpen` — dataset presets row (restyled chips), `methodId` selection, `frameworkId` selection, dataset mode (`Segmented` for `samples`/`tokens`), `sampleCount`/`totalTokensInput`/`avgSeqLen`/`epochs` via `NumberInput`.
- `Collapse title="GPU Donanımı" defaultOpen` — `gpuId` picker, `gpuCount` `NumberInput`.
- `Collapse title="Hiperparametreler"` — `perDeviceBatchSize`, `gradientAccumulationSteps`, `learningRate`, `loraRank`, `loraAlpha`, `optimizerType` (`Select`), and the three toggles (`gradientCheckpointing`, `flashAttention`, `useUnslothAcceleratedKernels`) as mono switches (`bg-accent` on / `bg-surface-2` off). Include the auto-optimize banner and `autoOptimizeHyperparams` toggle if present in the original.
- Restyle everything with tokens (`bg-surface`/`surface-2`/`border`/`accent`); keep the code-export-independent `FineTuningResults` fields out of this component.

- [ ] **Step 3: Restructure the `App.tsx` fine-tuning branch into the 2-column grid**

```tsx
<div className="lg:grid lg:grid-cols-[1fr_460px] lg:gap-6 lg:items-start">
  <div className="space-y-4">
    <ModelSelector
      selectedModelId={ftConfig.modelId}
      customModel={ftConfig.customModel}
      onSelectModel={handleSelectModel}
      onUpdateCustomModel={(customModel) => {
        setConfig((prev) => ({ ...prev, customModel }));
        setFtConfig((prev) => ({ ...prev, customModel }));
      }}
      models={modelCatalog}
    />
    <FineTuningConfigPanel config={ftConfig} results={ftResults} onChangeConfig={setFtConfig} />
  </div>
  <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
    <FineTuningResultsPanel config={ftConfig} results={ftResults} onChangeConfig={setFtConfig} />
  </div>
</div>
```

`FineTuningResultsPanel` does not exist until Task 12 — for this task, temporarily render `Panel` with the existing headline/VRAM numbers so the app compiles, then Task 12 replaces it. Remove the `FineTuningDashboard` import once its pieces are re-homed (fully in Task 12).

- [ ] **Step 4: Verify + commit**

Run: `npm run lint` (PASS). Dev check: fine-tuning tab config inputs work and update results.

```bash
git add src/components/FineTuningConfigPanel.tsx src/App.tsx
git commit -m "feat(ui): fine-tuning config panel + 2-column shell"
```

---

### Task 12: Fine-tuning — results panel + platform + code export

**Files:**
- Create: `src/components/FineTuningResultsPanel/index.tsx`, `src/components/FineTuningResultsPanel/VramTab.tsx`, `src/components/FineTuningResultsPanel/TimeTab.tsx`, `src/components/FineTuningResultsPanel/CostTab.tsx`, `src/components/FineTuningPlatformCompare.tsx`, `src/components/FineTuningCodeExport.tsx`
- Modify: `src/App.tsx`
- Delete: `src/components/FineTuningDashboard.tsx`

**Interfaces:**
- Consumes: `FineTuningResults` fields; `FineTuningConfig`.
- Produces: `FineTuningResultsPanelProps = { config: FineTuningConfig; results: FineTuningResults; onChangeConfig: (updater: (prev: FineTuningConfig) => FineTuningConfig) => void }`.

- [ ] **Step 1: Create `FineTuningResultsPanel` tabs**

`index.tsx`: `Panel` with headline (model name + `Badge tone="accent"` for `methodBadge`, `Badge tone="default"` for `frameworkName`), a VRAM fit bar (same pattern as the inference panel: `results.totalVramNeededGB` / `results.totalVramAvailableGB`, `isOom` → red, else green), key metric grid (`trainingTimeFormatted`, `totalVramNeededGB`, `localElectricityCostTry` `₺`, `unslothCostSavingsUsd` `$`), then `Tabs` with `VRAM / TIME / COST`.

`VramTab.tsx` — stacked bar + breakdown: `weightVramGB`, `gradientVramGB`, `optimizerVramGB`, `activationVramGB`, `cudaOverheadGB` (segment colors: accent, `#8e8b8b`, ok, `bg-danger/50`, `bg-danger/40`), then rows "Toplam Gerekli", "GPU Başına", "Mevcut", "Önerilen Min VRAM" (`recommendedMinVramGB`), and an OOM banner when `isOom` (recommendedMinGpus).

`TimeTab.tsx` — stats: `trainingTimeFormatted`, `trainingTimeHours.toFixed(1)` saat, `throughputTokensPerSec` tok/s, `totalSteps`, `effectiveBatchSize`, `tokensPerStep`. Unsloth block: `unslothSpeedupMultiplier.toFixed(1)}x hızlanma`, `unslothTimeSavedHours` saat tasarruf vs `standardHfTimeHours`.

`CostTab.tsx` — from `platformEstimates` (+ the `cheapestPlatform`/`bestValuePlatform`/`fastestPlatform`/`freePlatform` pointers copied verbatim from `FineTuningDashboard`): cheapest/best-value/free-tier highlights as compact cards (name, `totalCostUsd`/`totalCostTry`, `estimatedTimeFormatted`, `isFeasibleVram` as `[OK]`/`[OOM]` badge), then `localElectricityCostUsd`/`Try` and `unslothCostSavingsUsd` rows.

Keep every Turkish label verbatim from the original `FineTuningDashboard`.

- [ ] **Step 2: Create `FineTuningPlatformCompare.tsx`**

Move the platform cost comparison (featured cards + the provider-filtered table) here, restyled onto tokens. Copy the exact field bindings and Turkish labels from `FineTuningDashboard`.

- [ ] **Step 3: Create `FineTuningCodeExport.tsx`**

Move the 4-tab code export (`unsloth`/`hf-trl`/`axolotl`/`jsonl` — copy the exact code strings from `FineTuningResults.unslothPythonCode`, `hfTrlScriptCode`, `axolotlYamlCode`, `datasetTemplateJsonl`), restyled: `Tabs` + `pre` blocks `bg-surface-2 border border-border rounded p-3 text-[11px] font-mono text-text overflow-x-auto`, copy button secondary style.

- [ ] **Step 4: Update `App.tsx`**

In the fine-tuning branch, below the config column add:

```tsx
<FineTuningPlatformCompare results={ftResults} config={ftConfig} />
<FineTuningCodeExport results={ftResults} />
```

(both take `FineTuningResults`; adjust props to what you defined). Replace the Task 11 temporary panel with the real `FineTuningResultsPanel`. Remove the `FineTuningDashboard` import.

- [ ] **Step 5: Delete the old dashboard + verify + commit**

```bash
git rm src/components/FineTuningDashboard.tsx
npm run lint
```

Expected: PASS. Dev check: fine-tuning tab has config left, sticky results right (VRAM/TIME/COST tabs), platform compare and code export below the config column, all interactions work.

```bash
git add -A src/components src/App.tsx
git commit -m "feat(ui): fine-tuning results panel, platform compare, code export"
```

---

### Task 13: AiAdvisorModal + ExportModal restyle

**Files:**
- Modify: `src/components/AiAdvisorModal.tsx`, `src/components/ExportModal.tsx`

**Interfaces:**
- Consumes: `Panel`, `SectionHeader`, `Tabs`, `Badge` primitives. Props unchanged.

- [ ] **Step 1: Restyle `AiAdvisorModal.tsx`**

Overlay `bg-slate-900/50` → `bg-black/60`; dialog `bg-white ... rounded-xl` → `bg-surface border border-border rounded-md max-w-2xl w-full max-h-[85vh] overflow-y-auto`; header → mono `text-text` with close button `text-muted hover:text-text`; loading spinner → `text-accent animate-spin`; error + retry → `text-danger` box + secondary retry button; advice markdown block → `text-[13px] leading-relaxed text-text` with `pre`/code inside styled `bg-surface-2 border-border font-mono text-xs`. Keep all fetch logic and Turkish strings.

- [ ] **Step 2: Restyle `ExportModal.tsx`**

Same overlay/dialog token treatment; tab switcher → `Tabs`; each export pane: `pre` blocks → `bg-surface-2 border border-border rounded p-3 text-[11px] font-mono text-text overflow-x-auto`; copy button → secondary (`bg-surface-2 border-border text-text hover:bg-surface`), copied state → `text-ok`. Keep all 4 tabs and code-generation logic.

- [ ] **Step 3: Verify + commit**

Run: `npm run lint` (PASS). Dev check both modals open/close and copy works.

```bash
git add src/components/AiAdvisorModal.tsx src/components/ExportModal.tsx
git commit -m "feat(ui): restyle AI advisor and export modals"
```

---

### Task 14: Scenario, Comparison + Admin modals restyle

**Files:**
- Modify: `src/components/ScenarioModal.tsx`, `src/components/ScenarioComparisonModal.tsx`, `src/components/AdminPanel.tsx`

**Interfaces:**
- Consumes: `Panel`, `SectionHeader`, `Badge`, `Field`, `NumberInput`, `Tabs` primitives. Props unchanged.

- [ ] **Step 1: Restyle `ScenarioModal.tsx`**

Overlay/dialog tokens as Task 13. Save form inputs → token set; scenario list rows → `bg-surface border-border hover:bg-surface-2`; selected checkbox → `accent-[#FFB224]`; load/delete buttons → secondary; compare button (≥2) → `bg-accent text-bg font-bold`. Google-login gate → keep text, restyle button. Keep `SavedScenario` interface and all handlers.

- [ ] **Step 2: Restyle `ScenarioComparisonModal.tsx`**

Dialog wider (`max-w-4xl`); the comparison table → mono `text-[11px]`, header cells `text-muted bg-surface-2`, column highlight for the selected/current column → `bg-surface-2` border-left `border-accent/40`, numeric cells `text-text`/`text-accent`; column checkbox picker → `accent-[#FFB224]`. Keep `buildRows()` logic and metric sets unchanged.

- [ ] **Step 3: Restyle `AdminPanel.tsx`**

Dialog tokens as Task 13; the two refresh cards → `Panel` with `SectionHeader` (titles "Model Kataloğu" / "GPU Fiyatları"), refresh button → `bg-accent text-bg font-bold` (spinning when busy), result summaries → mono `text-[11px]` rows (`fetched`/`mirrored`/`discovered` per-provider lines), error → `text-danger`. Keep the API calls and `requireAdmin` behavior.

- [ ] **Step 4: Verify + commit**

Run: `npm run lint` (PASS). Dev check: save/load/delete scenarios, comparison modal, admin refresh flows still work.

```bash
git add src/components/ScenarioModal.tsx src/components/ScenarioComparisonModal.tsx src/components/AdminPanel.tsx
git commit -m "feat(ui): restyle scenario, comparison and admin modals"
```

---

### Task 15: Delete replaced cards + final verification

**Files:**
- Delete: `src/components/VramBreakdownCard.tsx`, `PerformanceCard.tsx`, `CostAnalysisCard.tsx`, `CloudCostComparisonCard.tsx`, `OnPremisesTcoCard.tsx`, `GpuPricesCard.tsx`
- Verify: full app

- [ ] **Step 1: Confirm nothing references the deleted cards**

```bash
rg "VramBreakdownCard|PerformanceCard|CostAnalysisCard|CloudCostComparisonCard|OnPremisesTcoCard|GpuPricesCard" src
```

Expected: no matches (Task 4 removed their App imports; Tasks 9-10 re-homed their content).

- [ ] **Step 2: Delete the card files**

```bash
git rm src/components/VramBreakdownCard.tsx src/components/PerformanceCard.tsx src/components/CostAnalysisCard.tsx src/components/CloudCostComparisonCard.tsx src/components/OnPremisesTcoCard.tsx src/components/GpuPricesCard.tsx
```

- [ ] **Step 3: Full verification**

Run: `npm run lint` — Expected: PASS.
Run: `npm run build` — Expected: PASS (vite build + esbuild bundle).

Manual QA checklist via `npm run dev` (verify all):
- Inference tab: 2-column layout; sticky panel; headline, VRAM bar, all 5 tabs; OOM → red.
- Config inputs (model/quant/engine/GPU/workload) update the panel live.
- Fine-tuning tab: config left, sticky results right (VRAM/TIME/COST), platform compare + code export.
- Header: tab switcher, presets dropdown, Kaydet, Karşılaştır, AI Mimar, Dışa Aktar, Sıfırla, login/logout, Yönetim (admin).
- All 5 modals open/close/behave; admin refresh works.
- Mobile width (<1024px): single column, panel below config, no horizontal overflow.
- No leftover light-theme elements (`bg-white`, `bg-slate-`, `text-indigo-`, `shadow-`) anywhere.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(ui): remove replaced result cards, final dark-theme verification"
```

---

## Self-Review

- **Spec coverage:** Spec §1 (tokens/fonts/visual language) → Task 1; §1 mono typography → tokens + mono classes throughout; §2 layout (2-col, sticky panel, both tabs) → Tasks 4, 11, 12; §2 primitives → Task 2; §2 ResultsPanel tabs → Tasks 4, 9, 10; §3 CLOUD merge (prices + comparison) → Task 10; §3 TCO → Task 10; §3 fine-tuning tabs VRAM/TIME/COST → Task 12; §3 modals + admin → Tasks 13, 14; §3 delivery order → matches; §3 states (OOM/loading/verified badges) → Tasks 4, 5, 10, 12; §3 motion (subtle) → hover/active transitions + `animate-pulse` skeletons. All covered.
- **Placeholder scan:** No TBD/TODO. The only transitional placeholders are (a) the four `null` tab branches in Task 4 explicitly removed by Task 10, and (b) Task 11's temporary panel replaced by Task 12 — both are intentional, time-boxed, and documented inline.
- **Type consistency:** `ResultsPanelProps`, `VramTabProps`, `PerfTabProps`, `CostTabProps`, `CloudTabProps`, `TcoTabProps`, `FineTuningResultsPanelProps`, and the primitive signatures are defined once (Task 2/4/9/10/12) and referenced consistently. `gpuId` added to `ResultsPanelProps` in Task 10 and supplied by `App.tsx` in the same task. `NumberInput.onChange` passes raw float (may be `NaN`) — Task 8 warns callers to preserve original fallbacks.