import React from 'react';
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
        <span className="text-muted">Süre: {platform.estimatedTimeFormatted}</span>
        <span className="text-text">{platform.totalCostTry.toFixed(1)} ₺</span>
      </div>
    </div>
  );
}

export const CostTab: React.FC<CostTabProps> = ({ results }) => {
  return (
    <div className="space-y-3">
      <div className="text-[11px] font-mono text-muted uppercase tracking-wider">Öne Çıkan Platformlar</div>

      <div className="grid grid-cols-2 gap-2">
        {results.cheapestPlatform && (
          <HighlightCard badge="★ En Ekonomik Pod" platform={results.cheapestPlatform} />
        )}
        {results.bestValuePlatform && (
          <HighlightCard badge="⚡ En İyi F/P" platform={results.bestValuePlatform} />
        )}
        {results.fastestPlatform && (
          <HighlightCard badge="🚀 En Hızlı" platform={results.fastestPlatform} />
        )}
        {results.freePlatform && (
          <HighlightCard badge="Ücretsiz Tier" platform={results.freePlatform} />
        )}
      </div>

      <div className="bg-surface-2 border border-border rounded-md p-2.5 space-y-1.5 text-[11px] font-mono">
        <div className="flex items-center justify-between">
          <span className="text-muted">Yerel Elektrik Maliyeti</span>
          <span className="text-text">
            {results.localElectricityCostTry.toFixed(1)} ₺ (${results.localElectricityCostUsd.toFixed(2)})
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-1.5">
          <span className="text-muted">Unsloth Maliyet Tasarrufu</span>
          <span className="text-ok font-bold">${results.unslothCostSavingsUsd.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};