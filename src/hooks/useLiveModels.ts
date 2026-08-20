import { useCallback, useEffect, useMemo, useState } from 'react';
import { ModelCategory, ModelPreset } from '../types';

export interface LiveModelRow {
  id: string;
  slugId: string | null;
  hfId: string;
  name: string;
  provider: string;
  category: string | null;
  capabilities: string[];
  targetEnv: string | null;
  curated: boolean;
  source: ModelPreset['source'];
  mirrorOf: string | null;
  mirrorHfId: string | null;
  totalParamsB: number;
  activeParamsB: number;
  numLayers: number;
  numHeads: number;
  numKvHeads: number;
  headDim: number;
  hiddenSize: number;
  defaultContextLen: number;
  maxContextLen: number;
  isMoe: boolean;
  numExperts: number | null;
  activeExperts: number | null;
  downloads: number | null;
  likes: number | null;
  description: string | null;
  scrapedAt: string;
  verified: boolean;
}

export interface LiveModels {
  models: ModelPreset[];
  loading: boolean;
  lastUpdated: string | null;
  refetch: () => Promise<void>;
}

const KNOWN_CATEGORIES: ModelCategory[] = [
  'DeepSeek',
  'Llama',
  'Qwen',
  'Mistral',
  'Google',
  'Microsoft',
  'NVIDIA',
  'Cohere',
  'Other',
  'Turkish',
  'Custom',
];

function toModelPreset(row: LiveModelRow): ModelPreset {
  return {
    id: row.slugId || row.hfId,
    name: row.name,
    provider: row.provider,
    hfId: row.hfId,
    downloads: row.downloads ?? undefined,
    likes: row.likes ?? undefined,
    lastUpdated: row.scrapedAt,
    capabilities: (row.capabilities ?? []) as ModelPreset['capabilities'],
    curated: row.curated,
    verified: row.verified,
    source: row.source ?? 'unknown',
    mirrorOf: row.mirrorOf ?? undefined,
    mirrorHfId: row.mirrorHfId ?? undefined,
    totalParamsB: row.totalParamsB,
    activeParamsB: row.activeParamsB,
    numLayers: row.numLayers,
    numHeads: row.numHeads,
    numKvHeads: row.numKvHeads,
    headDim: row.headDim,
    hiddenSize: row.hiddenSize,
    defaultContextLen: row.defaultContextLen,
    maxContextLen: row.maxContextLen,
    isMoe: row.isMoe,
    numExperts: row.numExperts ?? undefined,
    activeExperts: row.activeExperts ?? undefined,
    description: row.description || `${row.provider} ${row.name}`,
    category: KNOWN_CATEGORIES.includes(row.category as ModelCategory)
      ? (row.category as ModelCategory)
      : 'Other',
    targetEnv: (row.targetEnv as ModelPreset['targetEnv']) || undefined,
  };
}

export function useLiveModels(): LiveModels {
  const [models, setModels] = useState<ModelPreset[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/models');
      if (!res.ok) throw new Error('Model kataloğu yüklenemedi');
      const data = await res.json();
      setModels((data.models || []).map(toModelPreset));
    } catch {
      setModels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const lastUpdated = useMemo(
    () => models.reduce<string | null>((acc, m) => (m.lastUpdated && m.lastUpdated > acc ? m.lastUpdated : acc), ''),
    [models]
  );

  return { models, loading, lastUpdated, refetch };
}