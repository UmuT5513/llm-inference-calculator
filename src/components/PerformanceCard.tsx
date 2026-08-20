import React from 'react';
import { Gauge, Zap, Clock, Users, ArrowUpRight, Activity } from 'lucide-react';
import { CalculationResults } from '../types';

interface PerformanceCardProps {
  results: CalculationResults;
}

export const PerformanceCard: React.FC<CalculationResults & PerformanceCardProps> = ({ results }) => {
  const {
    ttftMs,
    tpotMs,
    tokensPerSecPerUser,
    systemThroughputTokensPerSec,
    maxConcurrentUsersVramLimit,
    maxConcurrentUsersComputeLimit,
  } = results;

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs space-y-3.5">
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
        <div className="p-1.5 bg-amber-50 text-amber-700 rounded-lg border border-amber-200">
          <Gauge className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Çıkarım Hızı ve Throughput Metrikleri</h3>
          <p className="text-[11px] text-slate-500">
            Prefill süresi (TTFT), token hızı (TPOT) ve maksimum eşzamanlılık kapasitesi
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* TTFT */}
        <div className="bg-slate-50/70 p-3 border border-slate-200 rounded-xl">
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">
            <span>TTFT</span>
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-xl font-bold font-mono text-indigo-700">
            {ttftMs < 1000 ? `${ttftMs.toFixed(0)} ms` : `${(ttftMs / 1000).toFixed(2)} s`}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Prompt prefill gecikmesi
          </div>
        </div>

        {/* TPOT */}
        <div className="bg-slate-50/70 p-3 border border-slate-200 rounded-xl">
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">
            <span>TPOT</span>
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700">
            {tpotMs.toFixed(1)} ms/tok
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Token üretme süresi
          </div>
        </div>

        {/* Speed per user */}
        <div className="bg-slate-50/70 p-3 border border-slate-200 rounded-xl">
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">
            <span>Kullanıcı Hızı</span>
            <Activity className="w-3.5 h-3.5 text-cyan-600" />
          </div>
          <div className="text-xl font-bold font-mono text-cyan-700">
            {tokensPerSecPerUser.toFixed(1)} t/s
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Tek akış yanıt hızı
          </div>
        </div>

        {/* System Throughput */}
        <div className="bg-slate-50/70 p-3 border border-slate-200 rounded-xl">
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">
            <span>Sistem Throughput</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-violet-600" />
          </div>
          <div className="text-xl font-bold font-mono text-violet-700">
            {systemThroughputTokensPerSec.toFixed(0)} t/s
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Toplu üretim kapasitesi
          </div>
        </div>
      </div>

      {/* Concurrency Limit Gauges */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
        <div className="flex items-center justify-between">
          <span className="text-slate-600 text-[11px] flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            Max Eşzamanlı (VRAM Limiti):
          </span>
          <span className="font-bold text-indigo-800">{maxConcurrentUsersVramLimit} Kullanıcı</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-600 text-[11px] flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
            İdeal Eşzamanlı (Bant Genişliği):
          </span>
          <span className="font-bold text-emerald-800">{maxConcurrentUsersComputeLimit} Kullanıcı</span>
        </div>
      </div>
    </div>
  );
};
