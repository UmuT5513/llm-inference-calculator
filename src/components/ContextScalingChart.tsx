import React from 'react';
import { useTranslation } from 'react-i18next';
import { LineChart, Database, Layers, ArrowUpRight } from 'lucide-react';
import { CalculatorConfig } from '../types';
import { calculateInferenceMetrics } from '../utils/calculator';

interface ContextScalingChartProps {
  config: CalculatorConfig;
}

export const ContextScalingChart: React.FC<ContextScalingChartProps> = ({ config }) => {
  const { t } = useTranslation();
  const contextSteps = [1024, 2048, 4096, 8192, 16384, 32768, 65536, 128000];

  const chartData = contextSteps.map((ctx) => {
    const res = calculateInferenceMetrics({
      ...config,
      promptLen: ctx,
    });

    return {
      contextLen: ctx,
      label: ctx >= 1024 ? `${(ctx / 1024).toFixed(0)}k` : `${ctx}`,
      weightGB: res.weightMemoryGB,
      kvCacheGB: res.kvCacheMemoryGB,
      totalNeededGB: res.totalVramNeededGB,
      availableGB: res.totalVramAvailableGB,
      isOom: res.isOom,
    };
  });

  const maxVal = Math.max(...chartData.map((d) => Math.max(d.totalNeededGB, d.availableGB)));

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs space-y-3.5">
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
        <div className="p-1.5 bg-cyan-50 text-cyan-700 rounded-lg border border-cyan-200">
          <Database className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{t('results.context.title')}</h3>
          <p className="text-[11px] text-slate-500">
            {t('results.context.subtitle')}
          </p>
        </div>
      </div>

      {/* Bar visual chart */}
      <div className="space-y-2.5">
        <div className="grid grid-cols-8 gap-2 items-end h-28 bg-slate-50 rounded-xl p-3 border border-slate-200">
          {chartData.map((d) => {
            const heightPct = Math.min(100, (d.totalNeededGB / maxVal) * 100);
            const isCurrent = config.promptLen === d.contextLen;

            return (
              <div key={d.contextLen} className="flex flex-col items-center h-full justify-end group">
                <div className="text-[9px] font-mono text-slate-600 opacity-0 group-hover:opacity-100 transition mb-0.5 font-bold">
                  {d.totalNeededGB.toFixed(0)}G
                </div>

                <div className="w-full max-w-[20px] bg-slate-200/80 rounded-t overflow-hidden flex flex-col justify-end relative h-full">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full transition-all duration-300 rounded-t ${
                      d.isOom
                        ? 'bg-rose-500'
                        : isCurrent
                        ? 'bg-indigo-600'
                        : 'bg-indigo-400/70'
                    }`}
                  />
                </div>

                <div
                  className={`text-[10px] font-mono mt-1 ${
                    isCurrent ? 'text-indigo-700 font-bold' : 'text-slate-500'
                  }`}
                >
                  {d.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Breakdown table list */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
          {chartData.map((d) => (
            <div
              key={d.contextLen}
              className={`p-2 rounded-lg border flex justify-between items-center ${
                config.promptLen === d.contextLen
                  ? 'bg-indigo-50 border-indigo-400 font-bold shadow-2xs'
                  : 'bg-slate-50/70 border-slate-200'
              }`}
            >
              <span className="text-slate-600">{d.label}:</span>
              <span className={`${d.isOom ? 'text-rose-600 font-bold' : 'text-indigo-700'}`}>
                {d.totalNeededGB.toFixed(1)} GB
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
