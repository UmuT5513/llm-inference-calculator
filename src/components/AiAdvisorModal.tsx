import React, { useState, useEffect } from 'react';
import { Sparkles, Bot, AlertTriangle, CheckCircle2, Copy, Check, Terminal, Cpu } from 'lucide-react';
import { CalculationResults, CalculatorConfig } from '../types';

interface AiAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: CalculatorConfig;
  results: CalculationResults;
}

export const AiAdvisorModal: React.FC<AiAdvisorModalProps> = ({
  isOpen,
  onClose,
  config,
  results,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [advice, setAdvice] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && !advice && !loading) {
      fetchAdvice();
    }
  }, [isOpen]);

  const fetchAdvice = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelName: results.modelName,
          quantization: config.quantId,
          gpus: {
            count: config.gpuCount,
            name: results.gpuName,
            vramGB: results.totalVramAvailableGB / config.gpuCount,
          },
          totalVramNeeded: results.totalVramNeededGB.toFixed(2),
          promptLen: config.promptLen,
          genLen: config.genLen,
          concurrentUsers: config.batchSize,
          targetTtft: results.ttftMs,
          targetTpot: results.tpotMs,
          estimatedCostPerHour: results.hourlyCostUsd,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Tavsiye oluşturulamadı.');
      }
      setAdvice(data.advice);
    } catch (err: any) {
      setError(err?.message || 'Yapay zeka önerisi alınırken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(advice);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-200">
              <Sparkles className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                AI Architect & Advisor
              </h2>
              <p className="text-[11px] text-slate-500">
                vLLM / TensorRT-LLM optimize dağıtım parametreleri ve darboğaz analizi
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-sm font-bold w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-200/60 transition"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3 font-sans text-slate-800 text-xs leading-relaxed">
          {loading && (
            <div className="py-10 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium text-indigo-900 animate-pulse">
                Gemini mimari ve vLLM konfigürasyonunu analiz ediyor...
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-2">
              <div className="font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Hata Oluştu
              </div>
              <p className="text-[11px] text-rose-700">{error}</p>
              <button
                onClick={fetchAdvice}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px]"
              >
                Yeniden Dene
              </button>
            </div>
          )}

          {!loading && !error && advice && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Kopyalandı</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-600" />
                      <span>Raporu Kopyala</span>
                    </>
                  )}
                </button>
              </div>

              {/* Rendered Advice Markdown Block */}
              <div className="prose prose-slate prose-xs max-w-none bg-slate-50 p-4 border border-slate-200 rounded-xl whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-800">
                {advice}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded-lg transition"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
