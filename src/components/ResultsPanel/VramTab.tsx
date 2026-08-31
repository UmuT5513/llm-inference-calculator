import React from 'react';
import { useTranslation } from 'react-i18next';
import { CalculationResults } from '../../types';
import { Stat } from '../ui/Stat';

interface VramTabProps {
  results: CalculationResults;
  gpuCount: number;
  gpuVramGB: number;
}

const SEGMENTS = [
  { labelKey: 'weights', field: 'weightMemoryGB' as const, cls: 'bg-accent' },
  { labelKey: 'kvCache', field: 'kvCacheMemoryGB' as const, cls: 'bg-[#8e8b8b]' },
  { labelKey: 'activations', field: 'activationMemoryGB' as const, cls: 'bg-ok' },
  { labelKey: 'cudaOverhead', field: 'cudaOverheadGB' as const, cls: 'bg-danger/50' },
];

export const VramTab: React.FC<VramTabProps> = ({ results, gpuCount, gpuVramGB }) => {
  const { t } = useTranslation();
  const total = results.totalVramNeededGB || 1;
  return (
    <div className="space-y-3">
      <div className="flex h-3 w-full overflow-hidden rounded-none bg-surface-2 border-2 border-border">
        {SEGMENTS.map((s) => (
          <div
            key={s.field}
            className={s.cls}
            style={{ width: `${Math.max(0, Math.min(100, (results[s.field] / total) * 100))}%` }}
            title={t(`results.vram.${s.labelKey}`)}
          />
        ))}
      </div>

      <div className="space-y-1 text-[11px] font-mono">
        {SEGMENTS.map((s) => (
          <div key={s.field} className="flex items-center justify-between">
            <span className="text-muted">{t(`results.vram.${s.labelKey}`)}</span>
            <span className="text-text">{results[s.field].toFixed(1)} GB</span>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-border pt-1 font-bold">
          <span className="text-muted">{t('results.vram.totalRequired')}</span>
          <span className={results.isOom ? 'text-danger' : 'text-text'}>
            {results.totalVramNeededGB.toFixed(1)} GB
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">{t('results.vram.perGpu', { gpuCount })}</span>
          <span className="text-text">{results.vramPerGpuNeededGB.toFixed(1)} GB</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">{t('results.vram.available')}</span>
          <span className="text-ok">{results.totalVramAvailableGB} GB ({gpuVramGB} GB/GPU)</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat label={t('results.vram.utilization')} value={`%${results.vramUtilizationPct.toFixed(0)}`} tone={results.isOom ? 'danger' : 'ok'} />
        <Stat label={t('results.vram.kvPerUser')} value={`${results.kvCachePerUserMB.toFixed(0)}`} sub="MB" />
      </div>

      {results.isOom && (
        <div className="border border-danger/40 bg-danger/10 rounded-none p-2.5 text-[11px] font-mono text-danger">
          {t('results.vram.oomInsufficient', { gpus: results.recommendedMinGpus })}
        </div>
      )}
    </div>
  );
};