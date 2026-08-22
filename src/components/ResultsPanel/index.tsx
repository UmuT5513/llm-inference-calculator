import React, { useState } from 'react';
import { CalculationResults, CalculatorConfig } from '../../types';
import { GpuPrice } from '../../hooks/useLiveGpuPrices';
import { Badge } from '../ui/Badge';
import { Panel } from '../ui/Panel';
import { Stat } from '../ui/Stat';
import { Tabs } from '../ui/Tabs';
import { Sparkles } from 'lucide-react';
import { VramTab } from './VramTab';
import { PerfTab } from './PerfTab';
import { CostTab } from './CostTab';

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
        {tab === 'perf' && <PerfTab results={results} />}
        {tab === 'cost' && <CostTab results={results} gpuCount={config.gpuCount} gpuName={results.gpuName} />}
        {tab === 'cloud' && null}
        {tab === 'tco' && null}
      </div>
    </Panel>
  );
};