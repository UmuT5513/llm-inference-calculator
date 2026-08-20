import React from 'react';
import { DollarSign, DollarSign as CoinIcon, TrendingDown, Scale, Server, HelpCircle } from 'lucide-react';
import { CalculationResults } from '../types';

interface CostAnalysisCardProps {
  results: CalculationResults;
  gpuCount: number;
  gpuName: string;
}

export const CostAnalysisCard: React.FC<CostAnalysisCardProps> = ({
  results,
  gpuCount,
  gpuName,
}) => {
  const {
    hourlyCostUsd,
    dailyCostUsd,
    monthlyCostUsd,
    costPerMillionInputTokensUsd,
    costPerMillionOutputTokensUsd,
    costPerMillionTotalTokensUsd,
    costFor100kRequestsUsd,
  } = results;

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs space-y-3.5">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Donanım & Token Maliyet Analizi</h3>
            <p className="text-[11px] text-slate-500">
              Bulut sunucu maliyeti ve 1M token başı birim fiyatlandırma
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded shadow-2xs">
          {gpuCount}x {gpuName}
        </span>
      </div>

      {/* Primary Hardware Costs */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-slate-50/70 p-3 border border-slate-200 rounded-xl">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Saatlik</div>
          <div className="text-xl font-bold font-mono text-emerald-700">
            ${hourlyCostUsd.toFixed(2)}/s
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Bulut ortalama kiralama</div>
        </div>

        <div className="bg-slate-50/70 p-3 border border-slate-200 rounded-xl">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Günlük</div>
          <div className="text-xl font-bold font-mono text-emerald-800">
            ${dailyCostUsd.toFixed(2)}/gün
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">24 saat çalıştırma</div>
        </div>

        <div className="bg-slate-50/70 p-3 border border-slate-200 rounded-xl">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Aylık Tahmini</div>
          <div className="text-xl font-bold font-mono text-slate-900">
            ${monthlyCostUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}/ay
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">30 gün tam yük operasyon</div>
        </div>
      </div>

      {/* Unit Token Costs */}
      <div className="bg-slate-50/70 p-3 border border-slate-200 rounded-xl space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600">1 Milyon Token Başına Birim Fiyat ($/1M Tokens):</div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-2xs">
            <div className="text-[10px] text-slate-500 mb-0.5">1M Prompt (Input)</div>
            <div className="text-base font-bold font-mono text-indigo-700">
              ${costPerMillionInputTokensUsd.toFixed(4)}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-2xs">
            <div className="text-[10px] text-slate-500 mb-0.5">1M Gen (Output)</div>
            <div className="text-base font-bold font-mono text-emerald-700">
              ${costPerMillionOutputTokensUsd.toFixed(4)}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-2xs">
            <div className="text-[10px] text-slate-500 mb-0.5">100k Tam İstek</div>
            <div className="text-base font-bold font-mono text-cyan-800">
              ${costFor100kRequestsUsd.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* API Comparison Note */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-[11px] text-slate-700 flex items-center gap-2">
        <TrendingDown className="w-4 h-4 text-emerald-600 shrink-0" />
        <div>
          <strong className="text-emerald-800">Self-Host Kıyaslaması:</strong> Özel API servislerine kıyasla yüksek trafikte <strong className="text-emerald-900">%60 - %85 maliyet avantajı</strong> sunar.
        </div>
      </div>
    </div>
  );
};
