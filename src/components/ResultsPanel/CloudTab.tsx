import React from 'react';
import { RefreshCw } from 'lucide-react';
import { CalculationResults } from '../../types';
import { GpuPrice } from '../../hooks/useLiveGpuPrices';
import { Badge } from '../ui/Badge';

interface CloudTabProps {
  results: CalculationResults;
  gpuCount: number;
  gpuId: string;
  gpuName: string;
  prices: GpuPrice[];
  overrides: Record<string, number>;
  lastUpdated: string | null;
  pricesLoading: boolean;
  onRefreshPrices: () => void;
}

const PROVIDER_LABELS: Record<string, string> = {
  runpod: 'RunPod',
  modal: 'Modal',
  lambda: 'Lambda',
};

const formatLastUpdated = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const CloudTab: React.FC<CloudTabProps> = ({
  results,
  gpuCount,
  gpuId,
  gpuName,
  prices,
  overrides,
  lastUpdated,
  pricesLoading,
  onRefreshPrices,
}) => {
  const currentPrice = overrides[gpuId];
  const grouped: Record<string, GpuPrice[]> = {};
  prices
    .filter((p) => p.gpuSlug === gpuId)
    .forEach((p) => {
      (grouped[p.provider] = grouped[p.provider] || []).push(p);
    });

  return (
    <div className="space-y-3">
      <div>
        <div className="text-[11px] font-mono uppercase tracking-wider text-muted">
          Bulut & Serverless Çıkarım (Inference) Maliyet Karşılaştırması
        </div>
        <div className="text-[10px] font-mono text-muted mt-0.5">
          {gpuCount}x {gpuName} için güncel resmi fiyatlandırmalar (Lambda, RunPod Pods/Serverless, Modal, Google
          Colab)
        </div>
      </div>

      <div className="space-y-1.5">
        {results.cloudCosts.map((cloud) => (
          <div key={cloud.providerId} className="border border-border rounded bg-surface-2 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold font-mono text-text truncate">{cloud.shortName}</span>
                  {cloud.isCheapest && <Badge tone="accent">EN UCUZ</Badge>}
                </div>
                <div className="text-[10px] text-muted truncate mt-0.5">
                  {cloud.providerName} • {cloud.matchedInstance}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[11px] font-mono font-bold text-text">
                  ${cloud.totalHourlyCostUsd.toFixed(2)}/sa
                </div>
                <div className="text-[10px] font-mono text-muted">
                  ${Math.round(cloud.totalMonthlyCostUsd).toLocaleString()}/ay
                </div>
              </div>
            </div>
            {cloud.notes && (
              <p className="text-[10px] text-muted leading-snug mt-1.5 border-t border-border pt-1">{cloud.notes}</p>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-border pt-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-mono uppercase tracking-wider text-text">Canlı GPU Fiyatları</span>
            {lastUpdated && (
              <span className="text-[10px] font-mono text-muted truncate">
                Son güncelleme: {formatLastUpdated(lastUpdated)}
              </span>
            )}
          </div>
          <button
            onClick={onRefreshPrices}
            title="Fiyatları yenile (npm run scrape:prices)"
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono text-muted border border-border rounded hover:text-text transition shrink-0"
          >
            <RefreshCw className={`w-3 h-3 ${pricesLoading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
        </div>

        {currentPrice != null && (
          <div className="flex items-center justify-between gap-2 border border-accent/30 bg-surface-2 rounded px-2.5 py-2 mb-2">
            <div className="min-w-0">
              <p className="text-[10px] font-mono text-text truncate">Seçili GPU: {gpuName}</p>
              <p className="text-[9px] text-muted">Kazınan 3 sağlayıcı arasında en düşük saatlik kira</p>
            </div>
            <div className="text-base font-bold font-mono text-ok shrink-0">
              ${currentPrice.toLocaleString('en-US', { maximumFractionDigits: 3 })}
              <span className="text-[10px] font-normal text-muted">/saat</span>
            </div>
          </div>
        )}

        {pricesLoading && (
          <div className="space-y-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-8 rounded bg-surface-2 animate-pulse" />
            ))}
          </div>
        )}

        {!pricesLoading && Object.keys(grouped).length === 0 && (
          <p className="text-[11px] text-muted text-center py-2">Fiyat verisi yok</p>
        )}

        {!pricesLoading && Object.keys(grouped).length > 0 && (
          <div className="space-y-2.5">
            {Object.entries(grouped).map(([provider, rows]) => (
              <div key={provider}>
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted mb-0.5">
                  {PROVIDER_LABELS[provider] || provider}
                </div>
                {rows.map((p) => {
                  const isBest = overrides[p.gpuSlug] === p.pricePerHrUsd;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-2 py-1 border-b border-border/60 last:border-0"
                    >
                      <div className="min-w-0">
                        <span className="block text-[11px] font-mono text-text truncate">{p.gpuName}</span>
                        {p.vramGb != null && <span className="text-[9px] text-muted">{p.vramGb} GB VRAM</span>}
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-[11px] font-mono font-bold ${isBest ? 'text-ok' : 'text-text'}`}>
                          ${p.pricePerHrUsd.toLocaleString('en-US', { maximumFractionDigits: 3 })}
                        </span>
                        {isBest && <span className="block text-[9px] text-ok font-semibold">En düşük</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};