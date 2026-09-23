import { useCallback, useEffect, useMemo, useState } from 'react';
import { ModelCategory, ModelPreset, ModelSourceLink } from '../types';

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
  // Multi-provider catalog fields (may be absent from older API responses)
  sources?: ModelSourceLink[] | null;
  releasedAt?: string | null;
  releasedLabel?: string | null;
  isMultimodal?: boolean | null;
  modalities?: string[] | null;
  visionParamsB?: number | null;
  expertIntermediateSize?: number | null;
  numSharedExperts?: number | null;
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

function num(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function sourceUrl(provider: ModelSourceLink['provider'], id: string): string {
  switch (provider) {
    case 'huggingface':
      return `https://huggingface.co/${id}`;
    case 'modelscope':
      return `https://modelscope.cn/models/${id}`;
    case 'ollama':
      return `https://ollama.com/library/${id}`;
    default:
      return '';
  }
}

function toSourceLinks(value: unknown): ModelSourceLink[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw): ModelSourceLink[] => {
    if (!raw || typeof raw !== 'object') return [];
    const source = raw as Record<string, unknown>;
    const provider = source.provider;
    if (provider !== 'huggingface' && provider !== 'modelscope' && provider !== 'ollama') return [];
    const id = typeof source.id === 'string' ? source.id : '';
    if (!id) return [];
    const url = typeof source.url === 'string' && source.url ? source.url : sourceUrl(provider, id);
    if (!url) return [];
    return [{ provider, id, url }];
  });
}

function toStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  return items.length > 0 ? items : undefined;
}

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
    sources: toSourceLinks(row.sources),
    releasedAt: typeof row.releasedAt === 'string' && row.releasedAt ? row.releasedAt : undefined,
    releasedLabel:
      typeof row.releasedLabel === 'string' && row.releasedLabel ? row.releasedLabel : undefined,
    isMultimodal: row.isMultimodal === true,
    modalities: toStringArray(row.modalities),
    visionParamsB: num(row.visionParamsB),
    expertIntermediateSize: num(row.expertIntermediateSize) ?? null,
    numSharedExperts: num(row.numSharedExperts),
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