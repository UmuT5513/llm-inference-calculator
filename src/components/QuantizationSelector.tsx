import React from 'react';
import { Database } from 'lucide-react';
import { QUANTIZATION_OPTIONS, KV_CACHE_QUANT_OPTIONS } from '../data/presets';
import { Panel } from './ui/Panel';
import { SectionHeader } from './ui/SectionHeader';

interface QuantizationSelectorProps {
  selectedQuantId: string;
  selectedKvCacheQuantId: string;
  onSelectQuant: (quantId: string) => void;
  onSelectKvCacheQuant: (kvQuantId: string) => void;
}

export const QuantizationSelector: React.FC<QuantizationSelectorProps> = ({
  selectedQuantId,
  selectedKvCacheQuantId,
  onSelectQuant,
  onSelectKvCacheQuant,
}) => {
  return (
    <Panel className="p-3.5 space-y-3">
      <SectionHeader
        index="02"
        title="Quantization"
        description="Model ağırlıklarının parametre başına kullandığı hassasiyet ve kalite koruma oranı"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {QUANTIZATION_OPTIONS.map((q) => {
          const isSelected = selectedQuantId === q.id;
          return (
            <div
              key={q.id}
              onClick={() => onSelectQuant(q.id)}
              className={`cursor-pointer rounded-md p-2.5 border transition text-left flex flex-col justify-between ${
                isSelected
                  ? 'bg-surface-2 border-accent'
                  : 'bg-surface border-border hover:border-accent/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-bold text-text">{q.shortName}</span>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                      isSelected
                        ? 'bg-accent text-bg'
                        : 'bg-surface-2 text-accent border border-border'
                    }`}
                  >
                    {q.bytesPerParam} B/p
                  </span>
                </div>

                <div className="text-[10px] text-accent font-mono font-medium">
                  {q.qualityDegradation}
                </div>
              </div>

              <p className="text-[10px] text-muted line-clamp-1 mt-1">{q.description}</p>
            </div>
          );
        })}
      </div>

      {/* KV Cache Quantization */}
      <div className="border-t border-border pt-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1 bg-surface-2 text-accent rounded-md border border-border">
            <Database className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-text uppercase tracking-wider">KV Cache Precision</h3>
            <p className="text-[10px] text-muted">
              Uzun bağlam pencerelerinde (128k context) bellek taşmasını engelleyen KV belleği
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {KV_CACHE_QUANT_OPTIONS.map((kv) => {
            const isSelected = selectedKvCacheQuantId === kv.id;
            return (
              <div
                key={kv.id}
                onClick={() => onSelectKvCacheQuant(kv.id)}
                className={`cursor-pointer rounded-md p-2.5 border transition text-left flex items-center justify-between ${
                  isSelected
                    ? 'bg-surface-2 border-accent'
                    : 'bg-surface border-border hover:border-accent/40'
                }`}
              >
                <div>
                  <div className="text-xs font-semibold text-text">{kv.name}</div>
                  <div className="text-[10px] text-muted font-mono">
                    Hassasiyet: <span className="text-accent font-bold">{kv.bytesPerParam} Byte/p</span>
                  </div>
                </div>

                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    isSelected ? 'border-accent bg-accent' : 'border-border bg-surface'
                  }`}
                >
                  {isSelected && <div className="w-1.5 h-1.5 bg-bg rounded-full" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
};