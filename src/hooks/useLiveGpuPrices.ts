import { useCallback, useEffect, useMemo, useState } from 'react';

export interface GpuPrice {
  id: string;
  provider: string;
  gpuSlug: string;
  gpuName: string;
  vramGb: number | null;
  pricePerHrUsd: number;
  priceModel: string | null;
  scrapedAt: string;
}

export interface LiveGpuPrices {
  prices: GpuPrice[];
  overrides: Record<string, number>;
  lastUpdated: string | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useLiveGpuPrices(): LiveGpuPrices {
  const [prices, setPrices] = useState<GpuPrice[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/gpu-prices');
      if (!res.ok) throw new Error('GPU fiyatları yüklenemedi');
      const data = await res.json();
      setPrices(data.prices || []);
      setLastUpdated(data.prices?.length ? new Date().toISOString() : null);
    } catch {
      setPrices([]);
      setLastUpdated(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Best (lowest) hourly rate per GPU slug across all providers
  const overrides = useMemo<Record<string, number>>(() => {
    const out: Record<string, number> = {};
    const bestBySlug = new Map<string, number>();
    prices.forEach((p) => {
      const cur = bestBySlug.get(p.gpuSlug);
      if (cur === undefined || p.pricePerHrUsd < cur) {
        bestBySlug.set(p.gpuSlug, p.pricePerHrUsd);
      }
    });
    bestBySlug.forEach((price, slug) => {
      out[slug] = price;
    });
    return out;
  }, [prices]);

  return { prices, overrides, lastUpdated, loading, refetch };
}