import React from 'react';
import { TrendingUp, ExternalLink, RefreshCw } from 'lucide-react';
import { GpuPrice } from '../hooks/useLiveGpuPrices';

interface GpuPricesCardProps {
  gpuId: string;
  gpuName: string;
  prices: GpuPrice[];
  overrides: Record<string, number>;
  lastUpdated: string | null;
  loading: boolean;
  onRefresh: () => void;
}

const PROVIDER_LABELS: Record<string, string> = {
  runpod: 'RunPod',
  modal: 'Modal',
  lambda: 'Lambda',
};

const PROVIDER_COLORS: Record<string, string> = {
  runpod: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  modal: 'text-sky-700 bg-sky-50 border-sky-200',
  lambda: 'text-violet-700 bg-violet-50 border-violet-200',
};

export const GpuPricesCard: React.FC<GpuPricesCardProps> = ({
  gpuId,
  gpuName,
  prices,
  overrides,
  lastUpdated,
  loading,
  onRefresh,
}) => {
  const currentPrice = overrides[gpuId];
  const grouped: Record<string, GpuPrice[]> = {};
  prices.forEach((p) => {
    (grouped[p.provider] = grouped[p.provider] || []).push(p);
  });

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">Güncel Bulut GPU Fiyatları</h3>
          {lastUpdated && (
            <span className="text-[10px] text-slate-400">
              Son güncelleme: {new Date(lastUpdated).toLocaleString('tr-TR')}
            </span>
          )}
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg"
          title="Fiyatları yenile (npm run scrape:prices)"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Yenile
        </button>
      </div>

      <div className="px-5 py-4">
        {currentPrice != null && (
          <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 mb-4">
            <div>
              <p className="text-xs text-indigo-700 font-medium">Seçili GPU: {gpuName}</p>
              <p className="text-xs text-indigo-500">
                Kazınan 3 sağlayıcı arasında en düşük saatlik kira
              </p>
            </div>
            <div className="text-xl font-bold font-mono text-indigo-700">
              ${currentPrice.toLocaleString('en-US', { maximumFractionDigits: 3 })}
              <span className="text-xs font-normal text-indigo-400">/saat</span>
            </div>
          </div>
        )}

        {loading && <p className="text-sm text-slate-500 py-4 text-center">Fiyatlar yükleniyor...</p>}

        {!loading && Object.keys(grouped).length === 0 && (
          <p className="text-sm text-slate-500 py-4 text-center">
            Henüz kazınmış fiyat verisi yok.{' '}
            <button
              onClick={onRefresh}
              className="text-indigo-600 underline font-medium"
              title="Python kazıyıcıyı çalıştır"
            >
              npm run scrape:prices
            </button>{' '}
            komutunu çalıştırın.
          </p>
        )}

        {!loading && Object.keys(grouped).length > 0 && (
          <div className="grid gap-4 sm:grid-cols-3">
            {Object.entries(grouped).map(([provider, rows]) => (
              <div key={provider} className="border border-slate-200 rounded-xl overflow-hidden">
                <div
                  className={`px-3 py-2 text-xs font-bold uppercase tracking-wide border-b ${PROVIDER_COLORS[provider] || 'text-slate-600 bg-slate-50 border-slate-200'}`}
                >
                  {PROVIDER_LABELS[provider] || provider}
                </div>
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {rows.map((p) => {
                    const isCurrent = p.gpuSlug === gpuId;
                    const isBest = overrides[p.gpuSlug] === p.pricePerHrUsd;
                    return (
                      <div
                        key={p.id}
                        className={`px-3 py-2 flex items-center justify-between gap-2 ${
                          isCurrent ? 'bg-indigo-50/60' : ''
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="block text-xs font-medium text-slate-800 truncate">{p.gpuName}</span>
                          {p.vramGb != null && (
                            <span className="text-[10px] text-slate-400">{p.vramGb} GB VRAM</span>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`font-mono text-xs font-bold ${isBest ? 'text-emerald-600' : 'text-slate-700'}`}>
                            ${p.pricePerHrUsd.toLocaleString('en-US', { maximumFractionDigits: 3 })}
                          </span>
                          {isBest && <span className="block text-[9px] text-emerald-500 font-semibold">En düşük</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] text-slate-400 mt-3">
          Fiyatlar python kazıyıcılar tarafından çekilir (
          <a
            className="underline"
            href="https://www.runpod.io/pricing"
            target="_blank"
            rel="noreferrer"
          >
            RunPod
          </a>
          ,{' '}
          <a className="underline" href="https://modal.com/pricing" target="_blank" rel="noreferrer">
            Modal
          </a>
          ,{' '}
          <a className="underline" href="https://lambda.ai/pricing" target="_blank" rel="noreferrer">
            Lambda
          </a>
          ) ve PostgreSQL'e kaydedilir. <ExternalLink className="inline w-3 h-3" />
        </p>
      </div>
    </div>
  );
};