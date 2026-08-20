import React from 'react';
import { Cloud, DollarSign, Award, CheckCircle2, Shuffle, ExternalLink, Zap, Server, Cpu } from 'lucide-react';
import { CalculationResults } from '../types';

interface CloudCostComparisonCardProps {
  results: CalculationResults;
  gpuCount: number;
}

export const CloudCostComparisonCard: React.FC<CloudCostComparisonCardProps> = ({
  results,
  gpuCount,
}) => {
  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs space-y-3.5">
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-2.5 gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
            <Cloud className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Bulut & Serverless Çıkarım (Inference) Maliyet Karşılaştırması
            </h2>
            <p className="text-[11px] text-slate-500">
              {gpuCount}x {results.gpuName} için güncel resmi fiyatlandırmalar (Lambda, RunPod Pods/Serverless, Modal, Google Colab)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono font-semibold">
          <a
            href="https://www.runpod.io/pricing"
            target="_blank"
            rel="noreferrer"
            className="text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition flex items-center gap-1 text-[10px]"
          >
            RunPod <ExternalLink className="w-2.5 h-2.5" />
          </a>
          <a
            href="https://modal.com/pricing"
            target="_blank"
            rel="noreferrer"
            className="text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition flex items-center gap-1 text-[10px]"
          >
            Modal <ExternalLink className="w-2.5 h-2.5" />
          </a>
          <a
            href="https://lambda.ai/pricing"
            target="_blank"
            rel="noreferrer"
            className="text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition flex items-center gap-1 text-[10px]"
          >
            Lambda <ExternalLink className="w-2.5 h-2.5" />
          </a>
          <div className="text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1 text-[10px]">
            <DollarSign className="w-3 h-3 text-emerald-600" />
            <span>Fiyat Matrisi</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {results.cloudCosts.map((cloud) => {
          const isServerless = cloud.providerType === 'serverless';
          const isComputeUnits = cloud.providerType === 'compute_units';

          return (
            <div
              key={cloud.providerId}
              className={`p-3.5 rounded-xl border transition flex flex-col justify-between ${
                cloud.isCheapest
                  ? 'bg-emerald-50/70 border-emerald-500 ring-1 ring-emerald-500/40 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs'
              }`}
            >
              <div>
                {/* Header & Badges */}
                <div className="flex items-start justify-between gap-1 mb-1.5">
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">{cloud.shortName}</span>
                    <span className="text-[10px] text-slate-500 font-sans block line-clamp-1">{cloud.providerName}</span>
                  </div>
                  {cloud.isCheapest && (
                    <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-800 bg-white border border-emerald-300 px-1.5 py-0.5 rounded shadow-2xs shrink-0">
                      <Award className="w-3 h-3 text-emerald-600" />
                      En Uygun
                    </span>
                  )}
                </div>

                {/* Pricing Model Type Tag */}
                <div className="mb-2">
                  {isServerless ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-mono font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                      <Zap className="w-3 h-3 text-purple-600" />
                      Serverless (Saniye Başı)
                    </span>
                  ) : isComputeUnits ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-mono font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                      <Cpu className="w-3 h-3 text-amber-600" />
                      Compute Units ($0.10/CU)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[9px] font-mono font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                      <Server className="w-3 h-3 text-indigo-600" />
                      Dedicated Pod / VM
                    </span>
                  )}
                </div>

                {/* Matched Instance / Equivalent Indicator */}
                <div className="mb-2.5">
                  <div className="flex items-center gap-1 text-[10px] font-mono">
                    {cloud.isExactMatch ? (
                      <span className="flex items-center gap-1 text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-medium">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Doğrudan Mevcut
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-medium">
                        <Shuffle className="w-3 h-3 text-amber-600" />
                        En Yakın Muadil
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono font-bold text-slate-900 mt-1 truncate" title={cloud.matchedInstance}>
                    {cloud.matchedInstance}
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="space-y-1.5 bg-slate-50/80 p-2.5 border border-slate-200 rounded-lg font-mono text-xs">
                  {isServerless && cloud.serverlessPerSecUsd ? (
                    <div className="flex justify-between items-center bg-purple-50/60 p-1 rounded border border-purple-100">
                      <span className="text-[10px] text-purple-700 font-sans font-medium">Saniye Başı:</span>
                      <span className="font-bold text-purple-900 font-mono">${cloud.serverlessPerSecUsd.toFixed(6)}/sn</span>
                    </div>
                  ) : null}

                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-500">GPU Başı / Saat:</span>
                    <span className="font-bold text-slate-800">${cloud.hourlyRatePerGpuUsd.toFixed(2)}/sa</span>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-200/80 pt-1">
                    <span className="text-[10px] text-slate-500">Küme ({gpuCount}x):</span>
                    <span className={`font-bold ${cloud.isCheapest ? 'text-emerald-700 text-sm' : 'text-slate-900'}`}>
                      ${cloud.totalHourlyCostUsd.toFixed(2)}/sa
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-500">Aylık (7/24):</span>
                    <span className="font-semibold text-slate-700">
                      ${Math.round(cloud.totalMonthlyCostUsd).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-200/80 pt-1 text-[10px]">
                    <span className="text-slate-500">1M Token Maliyeti:</span>
                    <span className="font-bold text-cyan-800">${cloud.costPerMillionTokensUsd.toFixed(3)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-500 leading-snug">
                <div className="line-clamp-2" title={cloud.notes}>{cloud.notes}</div>
                {cloud.websiteUrl && (
                  <a
                    href={cloud.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-mono text-indigo-600 hover:text-indigo-800 mt-1"
                  >
                    Fiyat Listesi <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
