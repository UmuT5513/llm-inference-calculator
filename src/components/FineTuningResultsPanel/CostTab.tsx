import React from 'react';
import { useTranslation } from 'react-i18next';
import { FineTuningResults, PlatformCostEstimate } from '../../types';
import { Badge } from '../ui/Badge';

interface CostTabProps {
  results: FineTuningResults;
}

function HighlightCard({
  badge,
  platform,
}: {
  badge: React.ReactNode;
  platform: PlatformCostEstimate;
}) {
  const { t } = useTranslation();
  return (
    <div className="p-2.5 rounded-md border border-accent/40 bg-surface-2 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-bold uppercase tracking-wider text-accent">{badge}</span>
        <span className="text-xs font-mono font-bold text-accent shrink-0">
          ${platform.totalCostUsd.toFixed(2)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-bold text-[11px] text-text truncate">{platform.platformName}</div>
          <div className="text-[10px] text-muted font-mono truncate">{platform.gpuName}</div>
        </div>
        <Badge tone={platform.isFeasibleVram ? 'ok' : 'danger'}>
          {platform.isFeasibleVram ? '[OK]' : '[OOM]'}
        </Badge>
      </div>
      <div className="flex items-center justify-between gap-2 text-[10px] font-mono border-t border-border pt-1">
        <span className="text-muted">{t('ft.results.cost.duration', { value: platform.estimatedTimeFormatted })}</span>
        <span className="text-text">{platform.totalCostTry.toFixed(1)} ₺</span>
      </div>
    </div>
  );
}

export const CostTab: React.FC<CostTabProps> = ({ results }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <div className="text-[11px] font-mono text-muted uppercase tracking-wider">{t('ft.results.cost.featuredPlatforms')}</div>

      <div className="grid grid-cols-2 gap-2">
        {results.cheapestPlatform && (
          <HighlightCard badge={t('ft.results.cost.cheapestBadge')} platform={results.cheapestPlatform} />
        )}
        {results.bestValuePlatform && (
          <HighlightCard badge={t('ft.results.cost.bestValueBadge')} platform={results.bestValuePlatform} />
        )}
        {results.fastestPlatform && (
          <HighlightCard badge={t('ft.results.cost.fastestBadge')} platform={results.fastestPlatform} />
        )}
        {results.freePlatform && (
          <HighlightCard badge={t('ft.results.cost.freeBadge')} platform={results.freePlatform} />
        )}
      </div>

      <div className="bg-surface-2 border border-border rounded-md p-2.5 space-y-1.5 text-[11px] font-mono">
        <div className="flex items-center justify-between">
          <span className="text-muted">{t('ft.results.cost.localElectricityCost')}</span>
          <span className="text-text">
            {results.localElectricityCostTry.toFixed(1)} ₺ (${results.localElectricityCostUsd.toFixed(2)})
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-1.5">
          <span className="text-muted">{t('ft.results.cost.unslothCostSavings')}</span>
          <span className="text-ok font-bold">${results.unslothCostSavingsUsd.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};