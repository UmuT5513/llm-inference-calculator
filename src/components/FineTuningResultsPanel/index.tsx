import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FineTuningResults } from '../../types';
import { Badge } from '../ui/Badge';
import { Panel } from '../ui/Panel';
import { Stat } from '../ui/Stat';
import { Tabs } from '../ui/Tabs';
import { VramTab } from './VramTab';
import { TimeTab } from './TimeTab';
import { CostTab } from './CostTab';

interface FineTuningResultsPanelProps {
  results: FineTuningResults;
}

const TABS = [
  { id: 'vram', label: 'VRAM' },
  { id: 'time', label: 'TIME' },
  { id: 'cost', label: 'COST' },
];

export const FineTuningResultsPanel: React.FC<FineTuningResultsPanelProps> = ({ results }) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState('vram');

  return (
    <Panel className="overflow-hidden">
      <div className="px-3.5 py-3 border-b border-border">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-bold font-mono text-text truncate">{results.modelName} Fine-Tuning</span>
          <Badge tone="accent">{results.methodBadge}</Badge>
          <Badge tone="default">{results.frameworkName}</Badge>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] font-mono mb-1">
            <span className="text-muted uppercase tracking-wider">{t('ft.results.vramUsage')}</span>
            <span className={results.isOom ? 'text-danger' : 'text-ok'}>
              {results.isOom ? '[OOM]' : '[OK]'} %{results.vramUtilizationPct.toFixed(0)}
            </span>
          </div>
          <div className="h-2 bg-surface-2 border border-border rounded-none overflow-hidden">
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
        <Stat label={t('ft.results.trainingTime')} value={results.trainingTimeFormatted} tone={results.isOom ? 'danger' : 'accent'} />
        <Stat label={t('ft.results.requiredVram')} value={`${results.totalVramNeededGB.toFixed(1)}`} sub="GB" />
        <Stat label={t('ft.results.localElectricity')} value={`${results.localElectricityCostTry.toFixed(0)}`} sub="₺" />
        <Stat label={t('ft.results.unslothSavings')} value={`$${results.unslothCostSavingsUsd.toFixed(0)}`} tone="ok" />
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      <div className="p-3.5">
        {tab === 'vram' && <VramTab results={results} />}
        {tab === 'time' && <TimeTab results={results} />}
        {tab === 'cost' && <CostTab results={results} />}
      </div>
    </Panel>
  );
};