import React from 'react';
import { useTranslation } from 'react-i18next';
import { CalculationResults } from '../../types';
import { Stat } from '../ui/Stat';

interface CostTabProps {
  results: CalculationResults;
  gpuCount: number;
  gpuName: string;
}

export const CostTab: React.FC<CostTabProps> = ({ results, gpuCount, gpuName }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <div className="text-[11px] font-mono text-muted uppercase tracking-wider">
        {t('results.cost.hardware', { gpuCount, gpuName })}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label={t('results.cost.hourly')} value={`$${results.hourlyCostUsd.toFixed(2)}`} />
        <Stat label={t('results.cost.daily')} value={`$${results.dailyCostUsd.toFixed(2)}`} />
        <Stat label={t('results.cost.monthly')} value={`$${results.monthlyCostUsd.toFixed(0)}`} tone="accent" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="$/1M In" value={results.costPerMillionInputTokensUsd.toFixed(2)} />
        <Stat label="$/1M Out" value={results.costPerMillionOutputTokensUsd.toFixed(2)} />
        <Stat label="$/100k Req" value={results.costFor100kRequestsUsd.toFixed(2)} />
      </div>
    </div>
  );
};