import React from 'react';
import { Cpu, Zap, Layers, CheckCircle2 } from 'lucide-react';
import { INFERENCE_ENGINES } from '../data/presets';

interface InferenceEngineSelectorProps {
  selectedEngineId: string;
  onSelectEngine: (engineId: string) => void;
}

export const InferenceEngineSelector: React.FC<InferenceEngineSelectorProps> = ({
  selectedEngineId,
  onSelectEngine,
}) => {
  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs space-y-3.5">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-cyan-50 text-cyan-700 rounded-lg border border-cyan-200">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">3. Inference Engine (Çıkarım Motoru)</h2>
            <p className="text-[11px] text-slate-500">
              vLLM, TensorRT-LLM, llama.cpp, SGLang, TGI veya Ollama optimizasyon mimarisi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-800 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-md font-semibold">
          <Layers className="w-3.5 h-3.5 text-cyan-700" />
          <span>PagedAttention & TensorRT</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {INFERENCE_ENGINES.map((eng) => {
          const isSelected = eng.id === selectedEngineId;
          const speedPct = Math.round((eng.throughputMultiplier - 1) * 100);
          const speedText = speedPct > 0 ? `+${speedPct}% Token/sn` : speedPct < 0 ? `${speedPct}% Token/sn` : 'Referans Hız';

          return (
            <button
              key={eng.id}
              onClick={() => onSelectEngine(eng.id)}
              className={`text-left p-3 rounded-lg border transition relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-cyan-50/70 border-cyan-500 ring-1 ring-cyan-500/40 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-900">{eng.name}</span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                      isSelected ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {eng.badge}
                    </span>
                  </div>

                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-cyan-600" />
                  )}
                </div>

                <p className="text-[11px] text-slate-600 leading-snug line-clamp-2 mb-2">
                  {eng.description}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between text-[10px] font-mono pt-2 border-t border-slate-100">
                  <span className={speedPct > 0 ? 'text-emerald-700 font-bold' : speedPct < 0 ? 'text-amber-700 font-bold' : 'text-slate-500'}>
                    ⚡ {speedText}
                  </span>
                  <span className="text-slate-400">
                    KV İzole: ~%{eng.kvCacheFragmentationPct}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 mt-1.5">
                  {eng.features.slice(0, 2).map((feat, i) => (
                    <span key={i} className="text-[9px] font-mono text-slate-600 bg-slate-50 px-1.5 py-0.2 rounded border border-slate-200">
                      {feat}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
