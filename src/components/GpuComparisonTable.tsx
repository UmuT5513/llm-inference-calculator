import React from 'react';
import { useTranslation } from 'react-i18next';
import { Layers, AlertTriangle, CheckCircle2, DollarSign, Zap, Server } from 'lucide-react';
import { CalculatorConfig } from '../types';
import { GPU_PRESETS } from '../data/presets';
import { calculateInferenceMetrics } from '../utils/calculator';

interface GpuComparisonTableProps {
  config: CalculatorConfig;
}

export const GpuComparisonTable: React.FC<GpuComparisonTableProps> = ({ config }) => {
  const { t } = useTranslation();
  // Compare selected model across 6 popular GPUs
  const candidateGpuIds = [
    'nvidia-b200',
    'nvidia-h200',
    'nvidia-h100-sxm',
    'nvidia-a100-80g',
    'nvidia-l40s',
    'nvidia-rtx-4090',
  ];

  const comparisons = candidateGpuIds.map((gpuId) => {
    const gpu = GPU_PRESETS.find((g) => g.id === gpuId) || GPU_PRESETS[0];

    // Estimate minimum required GPUs to fit the model
    const singleRes = calculateInferenceMetrics({
      ...config,
      gpuId: gpu.id,
      gpuCount: 1,
    });

    const neededGpus = Math.max(1, singleRes.recommendedMinGpus);
    const finalRes = calculateInferenceMetrics({
      ...config,
      gpuId: gpu.id,
      gpuCount: neededGpus,
      tensorParallelism: Math.min(neededGpus, 8),
    });

    return {
      gpu,
      neededGpus,
      res: finalRes,
    };
  });

  return (
    <div className="bg-surface border-2 border-border rounded-none p-4 shadow-none space-y-3.5">
      <div className="flex items-center gap-2 border-b border-border pb-2.5">
        <div className="p-1.5 bg-info/10 text-info border-2 border-border rounded-none">
          <Server className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-text uppercase tracking-wider">{t('results.compare.title')}</h3>
          <p className="text-[11px] text-muted">
            {t('results.compare.subtitle')}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[11px] border-collapse">
          <thead>
            <tr className="border-b border-border text-muted font-bold uppercase tracking-wider text-[10px] bg-surface-2">
              <th className="py-2 px-2.5 rounded-none">{t('results.compare.gpuModel')}</th>
              <th className="py-2 px-2.5">{t('results.compare.count')}</th>
              <th className="py-2 px-2.5">{t('results.compare.vram')}</th>
              <th className="py-2 px-2.5">TTFT</th>
              <th className="py-2 px-2.5">TPOT</th>
              <th className="py-2 px-2.5">{t('results.compare.userSpeed')}</th>
              <th className="py-2 px-2.5">{t('results.compare.costPerHour')}</th>
              <th className="py-2 px-2.5 rounded-none">{t('results.compare.costPer1m')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-text font-mono text-[11px]">
            {comparisons.map(({ gpu, neededGpus, res }) => {
              const isSelected = config.gpuId === gpu.id;
              return (
                <tr
                  key={gpu.id}
                  className={`hover:bg-surface-2 transition ${
                    isSelected ? 'bg-indigo-50/70 font-semibold text-indigo-950' : ''
                  }`}
                >
                  <td className="py-2 px-2.5 font-medium text-text flex items-center gap-1.5">
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    )}
                    {gpu.name}
                  </td>

                  <td className="py-2 px-2.5">
                    <span className="bg-surface-2 border-2 border-border px-1.5 py-0.5 rounded-none text-indigo-700 font-bold text-[10px]">
                      {neededGpus}x
                    </span>
                  </td>

                  <td className="py-2 px-2.5">
                    {res.totalVramNeededGB.toFixed(1)} /{' '}
                    <span className="text-emerald-700 font-bold">{(gpu.vramGB * neededGpus).toFixed(1)} GB</span>
                  </td>

                  <td className="py-2 px-2.5 text-indigo-700 font-medium">
                    {res.ttftMs < 1000 ? `${res.ttftMs.toFixed(0)} ms` : `${(res.ttftMs / 1000).toFixed(2)}s`}
                  </td>

                  <td className="py-2 px-2.5 text-emerald-700 font-medium">
                    {res.tpotMs.toFixed(1)} ms
                  </td>

                  <td className="py-2 px-2.5 text-cyan-800 font-medium">
                    {res.tokensPerSecPerUser.toFixed(1)} t/s
                  </td>

                  <td className="py-2 px-2.5 font-bold text-amber-800">
                    ${res.hourlyCostUsd.toFixed(2)}/s
                  </td>

                  <td className="py-2 px-2.5 font-bold text-text">
                    ${res.costPerMillionTotalTokensUsd.toFixed(3)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
