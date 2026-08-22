import React from 'react';
import { FineTuningResults } from '../../types';
import { Stat } from '../ui/Stat';
import { Sparkles, TrendingDown } from 'lucide-react';

interface TimeTabProps {
  results: FineTuningResults;
}

export const TimeTab: React.FC<TimeTabProps> = ({ results }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-mono text-muted uppercase tracking-wider">Eğitim Süresi & Hızlandırma</span>
        <span className="text-[11px] font-bold text-accent bg-surface-2 border border-accent/40 px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
          <Sparkles className="w-3 h-3" />
          {results.unslothSpeedupMultiplier.toFixed(1)}x Hız Artışı
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat
          label="Unsloth Hızlandırılmış Süre"
          value={results.trainingTimeFormatted}
          tone="accent"
          sub={`~${Math.round(results.throughputTokensPerSec)} tok/sn`}
        />
        <Stat label="Eğitim Süresi" value={`${results.trainingTimeHours.toFixed(1)}`} sub="saat" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Toplam Adım" value={results.totalSteps.toLocaleString()} sub="step" />
        <Stat label="Effective Batch" value={results.effectiveBatchSize} />
        <Stat label="Adım Başı Token" value={results.tokensPerStep.toLocaleString()} />
      </div>

      <div className="bg-surface-2 border border-border rounded-md p-2.5 flex items-center justify-between gap-2 text-[11px] font-mono">
        <span className="text-muted">Standart PyTorch HF Süresi</span>
        <span className="text-right">
          <span className="text-text font-bold">{results.standardHfTimeHours.toFixed(1)} saat</span>
          <span className="block text-[10px] text-ok font-bold flex items-center gap-1 justify-end">
            <TrendingDown className="w-3 h-3" />
            {results.unslothTimeSavedHours.toFixed(1)} saat tasarruf
          </span>
        </span>
      </div>

      <div className="flex items-center justify-between bg-surface-2 border border-border rounded-md p-2.5 text-[11px] font-mono">
        <span className="text-muted">Toplam Hesaplama Gereksinimi</span>
        <span className="text-text">{(results.totalFlopsRequired / 1e15).toFixed(2)} PFLOPs</span>
      </div>
    </div>
  );
};