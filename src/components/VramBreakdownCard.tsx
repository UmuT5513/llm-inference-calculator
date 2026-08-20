import React from 'react';
import { HardDrive, AlertTriangle, CheckCircle2, ShieldAlert, Cpu, ArrowUpRight } from 'lucide-react';
import { CalculationResults } from '../types';

interface VramBreakdownCardProps {
  results: CalculationResults;
  gpuCount: number;
  gpuVramGB: number;
}

export const VramBreakdownCard: React.FC<VramBreakdownCardProps> = ({
  results,
  gpuCount,
  gpuVramGB,
}) => {
  const {
    weightMemoryGB,
    kvCacheMemoryGB,
    activationMemoryGB,
    cudaOverheadGB,
    totalVramNeededGB,
    totalVramAvailableGB,
    vramUtilizationPct,
    isOom,
    recommendedMinGpus,
    kvCachePerUserMB,
  } = results;

  // Percentage calculations relative to total needed
  const total = Math.max(0.1, totalVramNeededGB);
  const weightPct = (weightMemoryGB / total) * 100;
  const kvPct = (kvCacheMemoryGB / total) * 100;
  const actPct = (activationMemoryGB / total) * 100;
  const cudaPct = (cudaOverheadGB / total) * 100;

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs space-y-3.5">
      {/* Header & Fit Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">VRAM & Bellek Analizi</h3>
            <p className="text-[11px] text-slate-500">
              GPU kümesindeki VRAM kullanımı ve bileşen kırılımı
            </p>
          </div>
        </div>

        {/* Fit Badge */}
        <div>
          {isOom ? (
            <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-300 text-rose-800 px-3 py-1 rounded-lg text-xs font-bold shadow-2xs">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>OOM RİSKİ!</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1 rounded-lg text-xs font-bold shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>SIĞIYOR (%{vramUtilizationPct.toFixed(1)})</span>
            </div>
          )}
        </div>
      </div>

      {/* Primary VRAM Numbers Grid */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-slate-50/70 p-3 border border-slate-200 rounded-xl">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Gerekli VRAM</div>
          <div className={`text-xl font-bold font-mono ${isOom ? 'text-rose-600' : 'text-indigo-700'}`}>
            {totalVramNeededGB.toFixed(2)} GB
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            GPU başı: {(totalVramNeededGB / gpuCount).toFixed(2)} GB
          </div>
        </div>

        <div className="bg-slate-50/70 p-3 border border-slate-200 rounded-xl">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Mevcut VRAM</div>
          <div className="text-xl font-bold font-mono text-emerald-700">
            {totalVramAvailableGB.toFixed(2)} GB
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            {gpuCount}x GPU ({gpuVramGB} GB)
          </div>
        </div>

        <div className="bg-slate-50/70 p-3 border border-slate-200 rounded-xl">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Doluluk Oranı</div>
          <div className={`text-xl font-bold font-mono ${vramUtilizationPct > 100 ? 'text-rose-600' : vramUtilizationPct > 85 ? 'text-amber-600' : 'text-cyan-700'}`}>
            %{vramUtilizationPct.toFixed(1)}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            {vramUtilizationPct > 90 ? 'Kritik Marj' : 'Güvenli Marj'}
          </div>
        </div>
      </div>

      {/* Visual Component Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium">
          <span>Bellek Bileşenleri</span>
          <span className="font-mono text-slate-500 text-[10px]">{totalVramNeededGB.toFixed(1)} / {totalVramAvailableGB.toFixed(1)} GB</span>
        </div>

        <div className="h-3.5 w-full bg-slate-100 rounded-lg overflow-hidden flex border border-slate-200 shadow-inner">
          <div
            style={{ width: `${Math.min(100, weightPct)}%` }}
            className="bg-indigo-500 transition-all"
            title={`Model Ağırlıkları: ${weightMemoryGB.toFixed(2)} GB (%${weightPct.toFixed(1)})`}
          />
          <div
            style={{ width: `${Math.min(100, kvPct)}%` }}
            className="bg-cyan-500 transition-all"
            title={`KV Cache: ${kvCacheMemoryGB.toFixed(2)} GB (%${kvPct.toFixed(1)})`}
          />
          <div
            style={{ width: `${Math.min(100, actPct)}%` }}
            className="bg-violet-500 transition-all"
            title={`Aktivasyon: ${activationMemoryGB.toFixed(2)} GB (%${actPct.toFixed(1)})`}
          />
          <div
            style={{ width: `${Math.min(100, cudaPct)}%` }}
            className="bg-amber-500 transition-all"
            title={`CUDA Overhead: ${cudaOverheadGB.toFixed(2)} GB (%${cudaPct.toFixed(1)})`}
          />
        </div>

        {/* Legend Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono pt-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span className="text-slate-500">Ağırlık:</span>
            <strong className="text-indigo-800">{weightMemoryGB.toFixed(1)} GB</strong>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
            <span className="text-slate-500">KV Cache:</span>
            <strong className="text-cyan-800">{kvCacheMemoryGB.toFixed(1)} GB</strong>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
            <span className="text-slate-500">Aktivasyon:</span>
            <strong className="text-violet-800">{activationMemoryGB.toFixed(1)} GB</strong>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-500">CUDA:</span>
            <strong className="text-amber-800">{cudaOverheadGB.toFixed(1)} GB</strong>
          </div>
        </div>
      </div>

      {/* KV Cache Metric Detail */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between text-[11px] font-mono">
        <span className="text-slate-600">Kullanıcı Başına KV Cache:</span>
        <span className="font-bold text-cyan-800">
          {kvCachePerUserMB > 1024
            ? `${(kvCachePerUserMB / 1024).toFixed(2)} GB / User`
            : `${kvCachePerUserMB.toFixed(1)} MB / User`}
        </span>
      </div>

      {/* OOM Recommendation Banner */}
      {isOom && (
        <div className="bg-rose-50 border border-rose-300 rounded-xl p-3 text-xs space-y-1">
          <div className="flex items-center gap-1.5 text-rose-800 font-bold">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>OOM Riski: Küme Belleği Yetersiz!</span>
          </div>
          <p className="text-rose-700 text-[11px] leading-tight">
            Mevcut VRAM sığmıyor. Önerilen minimum küme boyutu: <strong className="font-mono text-rose-900 font-bold">{recommendedMinGpus}x GPU</strong>.
          </p>
        </div>
      )}
    </div>
  );
};
