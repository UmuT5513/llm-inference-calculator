import React, { useState, useEffect } from 'react';
import { Sparkles, AlertTriangle, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation();
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
          lang: i18n.resolvedLanguage === 'tr' ? 'tr' : 'en',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || t('advisor.adviceFailed'));
      }
      setAdvice(data.advice);
    } catch (err: any) {
      setError(err?.message || t('advisor.errorGeneric'));
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface border-2 border-border rounded-none max-w-2xl w-full max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-3.5 py-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 bg-surface-2 text-accent border-2 border-border rounded-none shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[11px] font-bold font-mono uppercase tracking-wider text-text">
                {t('advisor.title')}
              </h2>
              <p className="text-[11px] text-muted mt-0.5">
                {t('advisor.subtitle')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-muted hover:text-text text-sm font-bold w-7 h-7 flex items-center justify-center rounded-none hover:bg-surface-2 transition shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-3 font-sans text-text text-xs leading-relaxed">
          {loading && (
            <div className="py-10 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium text-muted animate-pulse">
                {t('advisor.loading')}
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-surface-2 border border-danger/40 rounded-none text-xs text-danger space-y-2">
              <div className="font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-danger" />
                {t('advisor.errorTitle')}
              </div>
              <p className="text-[11px] text-muted">{error}</p>
              <button
                onClick={fetchAdvice}
                className="px-3 py-1.5 bg-surface-2 border-2 border-border text-text hover:bg-surface rounded-none font-bold text-[11px] transition cursor-pointer"
              >
                {t('advisor.retry')}
              </button>
            </div>
          )}

          {!loading && !error && advice && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-text bg-surface-2 hover:bg-surface border-2 border-border rounded-none transition cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-ok" />
                      <span className="text-ok font-bold">{t('advisor.copied')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-muted" />
                      <span>{t('advisor.copyReport')}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Rendered Advice Markdown Block */}
              <div className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-text [&_pre]:bg-surface-2 [&_pre]:border [&_pre]:border-border [&_pre]:font-mono [&_pre]:text-xs [&_code]:bg-surface-2 [&_code]:border [&_code]:border-border [&_code]:font-mono [&_code]:text-xs">
                {advice}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-surface-2 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface-2 border-2 border-border text-text hover:bg-surface text-xs font-medium rounded-none transition cursor-pointer"
          >
            {t('advisor.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
