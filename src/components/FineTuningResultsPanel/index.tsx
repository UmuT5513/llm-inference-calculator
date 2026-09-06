import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FineTuningResults } from '../../types';
import { Badge } from '../ui/Badge';
import { Panel } from '../ui/Panel';
import { Stat } from '../ui/Stat';
import { Tabs } from '../ui/Tabs';
import { InfoTooltip } from '../ui/InfoTooltip';
import { Save, Link2, FileDown, Check } from 'lucide-react';
import { copyText } from '../../utils/clipboard';
import { VramTab } from './VramTab';
import { TimeTab } from './TimeTab';
import { CostTab } from './CostTab';

interface FineTuningResultsPanelProps {
  results: FineTuningResults;
  onCopyLink?: () => string;
  onSaveScenario?: () => void;
  onExportMarkdown?: () => void;
}

const TABS = [
  { id: 'vram', label: 'VRAM' },
  { id: 'time', label: 'TIME' },
  { id: 'cost', label: 'COST' },
];

export const FineTuningResultsPanel: React.FC<FineTuningResultsPanelProps> = ({
  results,
  onCopyLink,
  onSaveScenario,
  onExportMarkdown,
}) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState('vram');
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    if (!onCopyLink) return;
    const url = onCopyLink();
    const ok = await copyText(url, t('common.copyLink'));
    if (ok) {
      window.history.replaceState(null, '', url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Panel className="overflow-hidden">
      <div className="px-3.5 py-3 border-b border-border">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-bold font-mono text-text truncate">{results.modelName} Fine-Tuning</span>
          <Badge tone="accent">{results.methodBadge}</Badge>
          <Badge tone="default">{results.frameworkName}</Badge>
        </div>

        {/* Prominent action row */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {onSaveScenario && (
            <button
              onClick={onSaveScenario}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-bg bg-accent hover:opacity-90 rounded-none transition active:scale-95"
            >
              <Save className="w-3.5 h-3.5" />
              {t('results.saveScenario')}
            </button>
          )}
          {onCopyLink && (
            <button
              onClick={() => void handleCopyLink()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-text bg-surface-2 hover:bg-surface border-2 border-border rounded-none transition"
              title={t('results.shareInfo')}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-ok" />
                  <span className="text-ok font-bold">{t('common.copied')}</span>
                </>
              ) : (
                <>
                  <Link2 className="w-3.5 h-3.5 text-accent" />
                  <span>{t('common.copyLink')}</span>
                </>
              )}
            </button>
          )}
          {onExportMarkdown && (
            <button
              onClick={onExportMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-text bg-surface-2 hover:bg-surface border-2 border-border rounded-none transition"
            >
              <FileDown className="w-3.5 h-3.5 text-muted" />
              {t('results.exportMarkdown')}
            </button>
          )}
          <InfoTooltip text={t('results.shareInfo')} className="ml-1" />
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
            <span>{results.totalVramNeededGB.toFixed(1)} GB gerekli</span>
            <span>{results.vramPerGpuNeededGB.toFixed(1)} GB / GPU</span>
            <span>{results.totalVramAvailableGB} GB mevcut</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 px-3.5 py-3 border-b border-border">
        <div className="relative">
          <Stat label={t('ft.results.trainingTime')} value={results.trainingTimeFormatted} tone={results.isOom ? 'danger' : 'accent'} />
          <InfoTooltip text={t('results.tips.trainingTime')} className="absolute top-0 right-0" />
        </div>
        <div className="relative">
          <Stat label={t('ft.results.requiredVram')} value={`${results.totalVramNeededGB.toFixed(1)}`} sub="GB" />
          <InfoTooltip text={t('results.tips.ftVram')} className="absolute top-0 right-0" />
        </div>
        <div className="relative">
          <Stat label={t('ft.results.localElectricity')} value={`${results.localElectricityCostTry.toFixed(0)}`} sub="₺" />
          <InfoTooltip text={t('results.tips.localElectricity')} className="absolute top-0 right-0" />
        </div>
        <div className="relative">
          <Stat label={t('ft.results.unslothSavings')} value={`$${results.unslothCostSavingsUsd.toFixed(0)}`} tone="ok" />
          <InfoTooltip text={t('results.tips.unslothSavings')} className="absolute top-0 right-0" />
        </div>
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