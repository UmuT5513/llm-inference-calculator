import React from 'react';
import { useTranslation } from 'react-i18next';
import { CalculationResults } from '../../types';
import { Stat } from '../ui/Stat';

interface PerfTabProps {
  results: CalculationResults;
}

export const PerfTab: React.FC<PerfTabProps> = ({ results }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="TTFT" value={`${results.ttftMs.toFixed(0)}`} sub="ms" />
        <Stat label="TPOT" value={`${results.tpotMs.toFixed(2)}`} sub="ms" />
        <Stat label={t('results.perf.userSpeed')} value={`${results.tokensPerSecPerUser.toFixed(1)}`} sub="tok/s" />
        <Stat label={t('results.perf.systemThroughput')} value={`${results.systemThroughputTokensPerSec.toFixed(0)}`} sub="tok/s" />
      </div>

      <div className="space-y-1 text-[11px] font-mono border-2 border-border rounded-none p-2.5 bg-surface-2">
        <div className="flex items-center justify-between">
          <span className="text-muted">{t('results.perf.concurrentUsers')}</span>
          <span className="text-text">{results.activeTotalUsers}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">{t('results.perf.limitVram')}</span>
          <span className="text-text">{results.maxConcurrentUsersVramLimit}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">{t('results.perf.limitCompute')}</span>
          <span className="text-text">{results.maxConcurrentUsersComputeLimit}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">{t('results.perf.prefillFlops')}</span>
          <span className="text-text">{(results.prefillFlopsTotal / 1e12).toFixed(2)} TFLOP</span>
        </div>
      </div>
    </div>
  );
};