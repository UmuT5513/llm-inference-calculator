import React from 'react';
import { Layers, ShieldCheck, Scale, Database } from 'lucide-react';
import { QUANTIZATION_OPTIONS, KV_CACHE_QUANT_OPTIONS } from '../data/presets';

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
    <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs space-y-4">
      {/* Weight Quantization */}
      <div>
        <div className="flex items-center gap-2 mb-2.5 border-b border-slate-200 pb-2">
          <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-200">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">2. Quantization (Hassasiyet)</h2>
            <p className="text-[11px] text-slate-500">
              Model ağırlıklarının parametre başına kullandığı hassasiyet ve kalite koruma oranı
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {QUANTIZATION_OPTIONS.map((q) => {
            const isSelected = selectedQuantId === q.id;
            return (
              <div
                key={q.id}
                onClick={() => onSelectQuant(q.id)}
                className={`cursor-pointer rounded-lg p-2.5 border transition text-left flex flex-col justify-between ${
                  isSelected
                    ? 'bg-indigo-50/80 border-indigo-500 text-slate-900 shadow-xs ring-1 ring-indigo-500/30'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold text-slate-900">{q.shortName}</span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {q.bytesPerParam} B/p
                    </span>
                  </div>

                  <div className="text-[10px] text-amber-600 font-mono font-medium">
                    {q.qualityDegradation}
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 line-clamp-1 mt-1">{q.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* KV Cache Quantization */}
      <div className="border-t border-slate-100 pt-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1 bg-cyan-50 text-cyan-700 rounded-md border border-cyan-200">
            <Database className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">KV Cache Precision</h3>
            <p className="text-[10px] text-slate-500">
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
                className={`cursor-pointer rounded-lg p-2.5 border transition text-left flex items-center justify-between ${
                  isSelected
                    ? 'bg-cyan-50/80 border-cyan-500 text-slate-900 shadow-xs ring-1 ring-cyan-500/30'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs'
                }`}
              >
                <div>
                  <div className="text-xs font-semibold text-slate-900">{kv.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Hassasiyet: <span className="text-cyan-700 font-bold">{kv.bytesPerParam} Byte/p</span>
                  </div>
                </div>

                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    isSelected ? 'border-cyan-600 bg-cyan-600' : 'border-slate-300 bg-white'
                  }`}
                >
                  {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
