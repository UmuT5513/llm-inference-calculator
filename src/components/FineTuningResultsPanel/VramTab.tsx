import React from 'react';
import { useTranslation } from 'react-i18next';
import { FineTuningResults } from '../../types';
import { Stat } from '../ui/Stat';

interface VramTabProps {
  results: FineTuningResults;
}

export const VramTab: React.FC<VramTabProps> = ({ results }) => {
  const { t } = useTranslation();
  const SEGMENTS = [
    { label: t('ft.results.vram.weights'), field: 'weightVramGB' as const, cls: 'bg-accent' },
    { label: t('ft.results.vram.gradients'), field: 'gradientVramGB' as const, cls: 'bg-[#8e8b8b]' },
    { label: t('ft.results.vram.optimizerStates'), field: 'optimizerVramGB' as const, cls: 'bg-ok' },
    { label: t('ft.results.vram.activationMemory'), field: 'activationVramGB' as const, cls: 'bg-danger/50' },
    { label: t('ft.results.vram.cudaOverhead'), field: 'cudaOverheadGB' as const, cls: 'bg-danger/40' },
  ];
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
          <span className="text-muted">{t('ft.results.vram.totalRequired')}</span>
          <span className={results.isOom ? 'text-danger' : 'text-text'}>
            {results.totalVramNeededGB.toFixed(1)} GB
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">{t('ft.results.vram.perGpu')}</span>
          <span className="text-text">{results.vramPerGpuNeededGB.toFixed(1)} GB</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">{t('ft.results.vram.available')}</span>
          <span className="text-ok">{results.totalVramAvailableGB} GB</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">{t('ft.results.vram.recommendedMinVram')}</span>
          <span className="text-text">{results.recommendedMinVramGB} GB</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat label={t('ft.results.vram.utilization')} value={`%${results.vramUtilizationPct.toFixed(0)}`} tone={results.isOom ? 'danger' : 'ok'} />
        <Stat label={t('ft.results.vram.recommendedMinGpu')} value={results.recommendedMinGpus} sub={t('ft.results.vram.unitCount')} />
      </div>

      {results.isOom && (
        <div className="border border-danger/40 bg-danger/10 rounded p-2.5 text-[11px] font-mono text-danger">
          {t('ft.results.vram.oomInsufficient', { gpus: results.recommendedMinGpus })}
        </div>
      )}
    </div>
  );
};