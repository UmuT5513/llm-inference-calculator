// Hugging Face Hub client (server-side). Uses HF_TOKEN (optional) so gated
// repos like gated Meta/Google models can be fetched too. Config parsing lives
// in ./modelConfig (shared with the ModelScope/Ollama paths).
import { familySizeKey, isCandidateMirror } from './knownOrgs';
import {
  ModelConfig,
  fetchWithRetry,
  resolveHyperparamConfig,
  sleep,
  toModelConfig,
} from './modelConfig';

// Re-export the shared parser so existing call sites keep importing it from
// here (modelConfig is the single source of truth).
export type { ModelConfig, ConfigMeta } from './modelConfig';
export { resolveHyperparamConfig, parseParams, toModelConfig } from './modelConfig';

const HF_API = 'https://huggingface.co/api';

export interface MirrorArchitecture {
  cfg: ModelConfig;
  mirrorHfId: string;
}

function token(): string | undefined {
  return process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || undefined;
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json' };
  const t = token();
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

// Fetch a model's metadata from the Hub. Returns null if the repo is missing
// (404/not-found, e.g. speculative future models) or its architecture cannot
// be read (e.g. gated repos without granted access). The /models/:id endpoint
// gives the authoritative safetensors total; newer/multimodal models no longer
// expose hyperparams there, so we fall back to the repo's config.json and
// unwrap the text backbone (text_config / language_model). `releasedAt` is the
// repo's createdAt (HF release date).
export async function fetchModelConfig(hfId: string): Promise<ModelConfig | null> {
  const info = await fetchJson<any>(`${HF_API}/models/${hfId}`);
  if (!info) return null;

  const pipelineTag = typeof info.pipeline_tag === 'string' ? info.pipeline_tag : null;
  const modelType = info?.config?.model_type ?? info?.config?.text_config?.model_type ?? null;
  const rawCfg = resolveHyperparamConfig(info?.config)
    ? info?.config
    : await fetchJson(`https://huggingface.co/${hfId}/resolve/main/config.json`);
  if (!rawCfg) return null;

  const cfg = toModelConfig(rawCfg, Number(info?.safetensors?.total ?? 0), { pipelineTag, modelType });
  cfg.releasedAt = typeof info?.createdAt === 'string' ? info.createdAt : null;
  return cfg;
}

// Community-mirror fallback for gated / unreadable curated models. Searches the
// Hub for repos with the same family+size, then validates candidates via their
// full /models/:id metadata (authoritative safetensors total) and returns the
// first one whose architecture matches the expected size. Quantized mirrors are
// fine — we only consume metadata, never the weights.
export async function fetchArchitectureFromMirrors(
  hfId: string,
  expectedParamsB?: number
): Promise<MirrorArchitecture | null> {
  const familySize = familySizeKey(hfId);
  if (!familySize) return null;

  const url = `${HF_API}/models?search=${encodeURIComponent(familySize)}&sort=downloads&direction=-1&limit=15`;
  const data = await fetchJson<any[]>(url);
  if (!Array.isArray(data)) return null;

  const candidates = data
    .map((m) => m?.id)
    .filter((id): id is string => typeof id === 'string' && id !== hfId);

  for (const id of candidates.slice(0, 12)) {
    if (!isCandidateMirror(id, familySize).allowed) continue;
    const modelConfig = await fetchModelConfig(id);
    await sleep(150);
    if (!modelConfig || modelConfig.totalParamsB <= 0) continue;
    // Size guard: a mirror must be the same model, not a small sibling that
    // shares a name prefix (tolerance ±25%).
    if (expectedParamsB && expectedParamsB > 0) {
      const ratio = modelConfig.totalParamsB / expectedParamsB;
      if (ratio < 0.75 || ratio > 1.25) continue;
    }
    return { cfg: modelConfig, mirrorHfId: id };
  }
  return null;
}

// List model ids under an org, in repo-desc order. `full` includes pipeline_tag
// and other metadata used for filtering; filtering happens later.
export async function listOrgRepos(
  org: string,
  limit = 50,
  full = false
): Promise<Array<{ id: string; downloads: number; likes: number; pipelineTag: string | null }>> {
  const url = `${HF_API}/models?author=${encodeURIComponent(org)}&limit=${limit}&full=${full ? 'true' : 'false'}`;
  const data = await fetchJson<any[]>(url);
  return mapRepos(data);
}

// Search the Hub (sorted by downloads desc), used for community-mirror lookups
// and producer-scoped discovery.
export async function searchRepos(
  query: string,
  limit = 20
): Promise<Array<{ id: string; downloads: number; likes: number; pipelineTag: string | null }>> {
  const url = `${HF_API}/models?search=${encodeURIComponent(query)}&sort=downloads&direction=-1&limit=${limit}&full=true`;
  const data = await fetchJson<any[]>(url);
  return mapRepos(data);
}

function mapRepos(data: any): Array<{ id: string; downloads: number; likes: number; pipelineTag: string | null }> {
  if (!Array.isArray(data)) return [];
  return data
    .filter((m) => m && typeof m.id === 'string')
    .map((m) => ({
      id: m.id,
      downloads: m.downloads ?? 0,
      likes: m.likes ?? 0,
      pipelineTag: typeof m.pipeline_tag === 'string' ? m.pipeline_tag : null,
    }));
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const res = await fetchWithRetry(url, { headers: headers() }, 'hf');
  if (!res) return null;
  try {
    return (await res.json()) as T;
  } catch (err: any) {
    console.error(`[hf] json error ${url}:`, err?.message);
    return null;
  }
}
