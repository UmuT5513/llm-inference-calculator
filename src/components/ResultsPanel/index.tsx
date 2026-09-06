import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalculationResults, CalculatorConfig } from '../../types';
import { GpuPrice } from '../../hooks/useLiveGpuPrices';
import { Badge } from '../ui/Badge';
import { Panel } from '../ui/Panel';
import { Stat } from '../ui/Stat';
import { Tabs } from '../ui/Tabs';
import { InfoTooltip } from '../ui/InfoTooltip';
import { Save, Link2, FileDown, Check, CheckCircle2, XCircle } from 'lucide-react';
import { copyText } from '../../utils/clipboard';
import { VramTab } from './VramTab';
import { PerfTab } from './PerfTab';
import { CostTab } from './CostTab';
import { CloudTab } from './CloudTab';
import { TcoTab } from './TcoTab';
import { ApiTab } from './ApiTab';

export interface ResultsPanelProps {
  results: CalculationResults;
  config: CalculatorConfig;
  gpuVramGB: number;
  gpuId: string;
  prices: GpuPrice[];
  overrides: Record<string, number>;
  lastUpdated: string | null;
  pricesLoading: boolean;
  onChangeConfig?: (updater: (prev: CalculatorConfig) => CalculatorConfig) => void;
  onCopyLink?: () => string;
  onSaveScenario?: () => void;
  onExportMarkdown?: () => void;
}

const TABS = [
  { id: 'vram', label: 'VRAM' },
  { id: 'perf', label: 'PERF' },
  { id: 'cost', label: 'COST' },
  { id: 'cloud', label: 'CLOUD' },
  { id: 'tco', label: 'TCO' },
  { id: 'api', label: 'API' },
];

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  results,
  config,
  gpuVramGB,
  gpuId,
  prices,
  overrides,
  lastUpdated,
  pricesLoading,
  onChangeConfig,
  onCopyLink,
  onSaveScenario,
  onExportMarkdown,
}) => {
  const [tab, setTab] = useState('vram');
  const { t } = useTranslation();
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
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-bold font-mono text-text truncate">{results.modelName}</span>
              <Badge tone="default">{results.totalParamsB}B</Badge>
              <Badge tone="accent">{results.engineName}</Badge>
              <Badge tone="default">{config.quantId.toUpperCase()}</Badge>
            </div>
            <p className="text-[11px] text-muted font-mono mt-1 truncate">
              {config.gpuCount}x {results.gpuName} •{' '}
              {t('results.concurrentUsers', { count: results.activeTotalUsers })} •{' '}
              {results.effectivePromptLen.toLocaleString()} in / {results.effectiveGenLen.toLocaleString()} out
            </p>
          </div>
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
          {onCopyLink && (
            <InfoTooltip text={t('results.shareInfo')} className="ml-1" />
          )}
        </div>

        {/* Verdict + VRAM bar */}
        <div className={`mt-3 border-2 rounded-none p-2.5 ${results.isOom ? 'border-danger/50 bg-danger/5' : 'border-ok/40 bg-ok/5'}`}>
          <div className="flex items-center justify-between text-[11px] font-mono mb-1">
            <span className="flex items-center gap-1.5 uppercase tracking-wider font-bold text-text">
              {results.isOom ? (
                <XCircle className="w-4 h-4 text-danger" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-ok" />
              )}
              {t('results.vramUsage')}
            </span>
            <span className={`flex items-center gap-1 font-bold ${results.isOom ? 'text-danger' : 'text-ok'}`}>
              {results.isOom ? '[OOM]' : '[OK]'} %{results.vramUtilizationPct.toFixed(0)}
            </span>
          </div>
          <div className="h-2.5 bg-surface-2 border border-border rounded-none overflow-hidden">
            <div
              className={`h-full transition-all ${results.isOom ? 'bg-danger' : 'bg-ok'}`}
              style={{ width: `${Math.min(100, results.vramUtilizationPct)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono mt-1 text-muted">
            <span>{results.totalVramNeededGB.toFixed(1)} GB gerekli</span>
            <span>{results.totalVramAvailableGB} GB mevcut</span>
            <span>{results.vramPerGpuNeededGB.toFixed(1)} GB / GPU</span>
          </div>
          {results.isOom && (
            <p className="text-[10px] text-danger font-semibold mt-1.5">
              {t('results.vram.oomInsufficient', { gpus: results.recommendedMinGpus })}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 px-3.5 py-3 border-b border-border">
        <div className="relative">
          <Stat label={t('results.monthlyCost')} value={`$${results.monthlyCostUsd.toFixed(0)}`} tone={results.isOom ? 'danger' : 'accent'} />
          <InfoTooltip text={t('results.tips.monthlyCost')} className="absolute top-0 right-0" />
        </div>
        <div className="relative">
          <Stat label={t('results.systemThroughput')} value={`${results.systemThroughputTokensPerSec.toFixed(0)}`} sub="tok/s" />
          <InfoTooltip text={t('results.tips.throughput')} className="absolute top-0 right-0" />
        </div>
        <div className="relative">
          <Stat label="TTFT" value={`${results.ttftMs.toFixed(0)}`} sub="ms" />
          <InfoTooltip text={t('results.tips.ttft')} className="absolute top-0 right-0" />
        </div>
        <div className="relative">
          <Stat label="TPOT" value={`${results.tpotMs.toFixed(2)}`} sub="ms" />
          <InfoTooltip text={t('results.tips.tpot')} className="absolute top-0 right-0" />
        </div>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      <div className="p-3.5">
        {tab === 'vram' && <VramTab results={results} gpuCount={config.gpuCount} gpuVramGB={gpuVramGB} />}
        {tab === 'perf' && <PerfTab results={results} />}
        {tab === 'cost' && <CostTab results={results} gpuCount={config.gpuCount} gpuName={results.gpuName} />}
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
          />
        )}
        {tab === 'tco' && onChangeConfig && (
          <TcoTab results={results} config={config} onChangeConfig={onChangeConfig} />
        )}
        {tab === 'api' && <ApiTab config={config} results={results} />}
      </div>
    </Panel>
  );
};