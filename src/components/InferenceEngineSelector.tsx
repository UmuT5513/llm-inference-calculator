import React from 'react';
import { useTranslation } from 'react-i18next';
import { Layers, CheckCircle2 } from 'lucide-react';
import { INFERENCE_ENGINES } from '../data/presets';
import { Panel } from './ui/Panel';
import { SectionHeader } from './ui/SectionHeader';
import { Badge } from './ui/Badge';

interface InferenceEngineSelectorProps {
  selectedEngineId: string;
  onSelectEngine: (engineId: string) => void;
}

export const InferenceEngineSelector: React.FC<InferenceEngineSelectorProps> = ({
  selectedEngineId,
  onSelectEngine,
}) => {
  const { t } = useTranslation();
  return (
    <Panel className="p-3.5 space-y-3">
      <SectionHeader
        index="03"
        title="Inference Engine"
        description={t('engine.subtitle')}
        right={
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-info bg-surface-2 border-2 border-border px-2 py-0.5 rounded-none font-semibold">
            <Layers className="w-3.5 h-3.5 text-accent" />
            <span>PagedAttention & TensorRT</span>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {INFERENCE_ENGINES.map((eng) => {
          const isSelected = eng.id === selectedEngineId;
          const speedPct = Math.round((eng.throughputMultiplier - 1) * 100);
          const speedText = speedPct > 0 ? t('engine.speedBoost', { pct: speedPct }) : speedPct < 0 ? t('engine.speedPenalty', { pct: speedPct }) : t('engine.speedReference');

          return (
            <button
              key={eng.id}
              onClick={() => onSelectEngine(eng.id)}
              className={`text-left p-3 rounded-none border-2 transition relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-surface-2 border-accent'
                  : 'bg-surface border-border hover:border-accent/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-text">{eng.name}</span>
                    <Badge tone="accent">{eng.badge}</Badge>
                  </div>

                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-accent" />
                  )}
                </div>

                <p className="text-[11px] text-muted leading-snug line-clamp-2 mb-2">
                  {eng.description}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between text-[10px] font-mono pt-2 border-t border-border">
                  <span className={speedPct > 0 ? 'text-ok font-bold' : speedPct < 0 ? 'text-accent font-bold' : 'text-muted'}>
                    ⚡ {speedText}
                  </span>
                  <span className="text-muted">
                    {t('engine.kvIsolated', { pct: eng.kvCacheFragmentationPct })}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 mt-1.5">
                  {eng.features.slice(0, 2).map((feat, i) => (
                    <span key={i} className="text-[9px] font-mono text-muted bg-surface-2 px-1.5 py-0.2 rounded-none border-2 border-border">
                      {feat}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Panel>
  );
};