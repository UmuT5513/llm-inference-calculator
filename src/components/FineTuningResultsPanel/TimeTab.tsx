import React from 'react';
import { useTranslation } from 'react-i18next';
import { FineTuningResults } from '../../types';
import { Stat } from '../ui/Stat';
import { Sparkles, TrendingDown } from 'lucide-react';

interface TimeTabProps {
  results: FineTuningResults;
}

export const TimeTab: React.FC<TimeTabProps> = ({ results }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-mono text-muted uppercase tracking-wider">{t('ft.results.time.title')}</span>
        <span className="text-[11px] font-bold text-info bg-surface-2 border-2 border-accent/40 px-2 py-0.5 rounded-none flex items-center gap-1 shrink-0">
          <Sparkles className="w-3 h-3" />
          {t('ft.results.time.speedup', { mult: results.unslothSpeedupMultiplier.toFixed(1) })}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat
          label={t('ft.results.time.unslothAcceleratedTime')}
          value={results.trainingTimeFormatted}
          tone="accent"
          sub={`~${Math.round(results.throughputTokensPerSec)} tok/sn`}
        />
        <Stat label={t('ft.results.time.trainingTime')} value={`${results.trainingTimeHours.toFixed(1)}`} sub={t('ft.results.time.hours')} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label={t('ft.results.time.totalSteps')} value={results.totalSteps.toLocaleString()} sub="step" />
        <Stat label="Effective Batch" value={results.effectiveBatchSize} />
        <Stat label={t('ft.results.time.tokensPerStep')} value={results.tokensPerStep.toLocaleString()} />
      </div>

      <div className="bg-surface-2 border-2 border-border rounded-none p-2.5 flex items-center justify-between gap-2 text-[11px] font-mono">
        <span className="text-muted">{t('ft.results.time.standardHfTime')}</span>
        <span className="text-right">
          <span className="text-text font-bold">{t('ft.results.time.hoursValue', { value: results.standardHfTimeHours.toFixed(1) })}</span>
          <span className="block text-[10px] text-ok font-bold flex items-center gap-1 justify-end">
            <TrendingDown className="w-3 h-3" />
            {t('ft.results.time.saved', { value: results.unslothTimeSavedHours.toFixed(1) })}
          </span>
        </span>
      </div>

      <div className="flex items-center justify-between bg-surface-2 border-2 border-border rounded-none p-2.5 text-[11px] font-mono">
        <span className="text-muted">{t('ft.results.time.totalComputeRequirement')}</span>
        <span className="text-text">{(results.totalFlopsRequired / 1e15).toFixed(2)} PFLOPs</span>
      </div>
    </div>
  );
};