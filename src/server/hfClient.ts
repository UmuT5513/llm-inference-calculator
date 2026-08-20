// Hugging Face Hub client (server-side). Uses HF_TOKEN (optional) so gated
// repos like gated Meta/Google models can be fetched too.
import { familySizeKey, isCandidateMirror } from './knownOrgs';

const HF_API = 'https://huggingface.co/api';

export interface ModelConfig {
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
}

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
// unwrap the text backbone (text_config / language_model).
export async function fetchModelConfig(hfId: string): Promise<ModelConfig | null> {
  const info = await fetchJson<any>(`${HF_API}/models/${hfId}`);
  if (!info) return null;

  let cfg = resolveHyperparamConfig(info?.config);
  if (!cfg) {
    const raw = await fetchJson(`https://huggingface.co/${hfId}/resolve/main/config.json`);
    if (!raw) return null;
    cfg = resolveHyperparamConfig(raw);
    if (!cfg) return null;
  }

  return toModelConfig(cfg, Number(info?.safetensors?.total ?? 0));
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Configs can be multimodal wrappers (Qwen3_5ForConditionalGeneration,
// PaliGemma, …) whose numbers live under text_config / language_model. Unwrap
// to the text backbone so architecture fields resolve; null when no hyperparams
// are present (e.g. the API's tokenizer-only config). MoE-only keys like
// num_experts_per_tok are deliberately ignored here — they alone don't make a
// config usable.
function resolveHyperparamConfig(cfg: any): any | null {
  if (!cfg || typeof cfg !== 'object') return null;
  const nested = cfg.text_config ?? cfg.language_model ?? cfg.text_model ?? cfg.moe_config;
  const base = nested && typeof nested === 'object' ? nested : cfg;
  const hasArch =
    Boolean(base.hidden_size) ||
    Boolean(base.num_hidden_layers) ||
    Boolean(base.num_layers) ||
    Boolean(base.num_attention_heads);
  return hasArch ? base : null;
}

// Shared conversion from an unwrapped transformers config to a ModelConfig.
function toModelConfig(cfg: any, totalRaw: number): ModelConfig {
  const params = parseParams(cfg, totalRaw);
  const numLayers =
    cfg.num_hidden_layers ??
    cfg.num_layers ??
    (Array.isArray(cfg.layers_block_type) ? cfg.layers_block_type.length : 0);
  const numHeads = cfg.num_attention_heads ?? cfg.num_heads ?? 0;
  const headDim =
    cfg.head_dim ??
    (cfg.hidden_size > 0 && numHeads > 0 ? Math.round(cfg.hidden_size / numHeads) : 0);
  return {
    totalParamsB: params.total,
    activeParamsB: params.active,
    numLayers,
    numHeads,
    numKvHeads: cfg.num_key_value_heads ?? numHeads,
    headDim,
    hiddenSize: cfg.hidden_size ?? 0,
    defaultContextLen: cfg.max_position_embeddings ?? 0,
    maxContextLen: cfg.max_position_embeddings ?? 0,
    isMoe: Boolean(cfg.num_experts || cfg.num_local_experts || cfg.n_routed_experts),
    numExperts: cfg.num_experts ?? cfg.num_local_experts ?? cfg.n_routed_experts ?? null,
    activeExperts: cfg.num_experts_per_tok ?? null,
  };
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
  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, { headers: headers() });
      if (res.status === 429 || res.status === 500 || res.status === 503) {
        // Rate limited / temporary server error: back off and retry.
        const wait = 500 * 2 ** (attempt - 1) + Math.random() * 400;
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      if (!res.ok) {
        // 404: repo doesn't exist. 401/403: gated without token.
        if (res.status === 404) return null;
        if (res.status === 401 || res.status === 403) return null;
        console.error(`[hf] ${url} -> ${res.status}`);
        return null;
      }
      return (await res.json()) as T;
    } catch (err: any) {
      if (attempt === maxAttempts) {
        console.error(`[hf] fetch error ${url}:`, err?.message);
        return null;
      }
      await new Promise((r) => setTimeout(r, 300 * attempt));
    }
  }
  return null;
}

// Total / active params (in billions) from a transformers config, with
// MoE-aware decomposition and a guard against nonsense values. Prefers the
// authoritative safetensors total when available.
function parseParams(cfg: any, totalRaw?: number): { total: number; active: number } {
  const hidden = Number(cfg.hidden_size ?? 0);
  const layers = Number(cfg.num_hidden_layers ?? cfg.num_layers ?? 0);
  const vocab = Number(cfg.vocab_size ?? 0);
  const localExperts = Number(cfg.num_experts ?? cfg.num_local_experts ?? cfg.n_routed_experts ?? 0);
  const expertsPerTok = Number(cfg.num_experts_per_tok ?? 0);
  const inter = Number(cfg.moe_intermediate_size ?? cfg.intermediate_size ?? 0);

  // Total from raw params if the Hub provides them.
  const raw = Number(cfg.num_parameters ?? cfg.total_params ?? 0);
  let total = raw > 0 ? raw / 1e9 : 0;
  if (total <= 0 && totalRaw && totalRaw > 0) total = totalRaw / 1e9;

  // Fallback estimate: 12 * params_per_layer * layers + embeddings.
  if (total <= 0 && hidden > 0 && layers > 0 && vocab > 0) {
    const perLayer = localExperts > 0 ? 12 * hidden * (inter || hidden * 4) * localExperts : 12 * hidden * (inter || hidden * 4);
    total = (perLayer * layers + hidden * vocab) / 1e9;
  }

  const active = localExperts > 0 ? Math.round((total * Math.min(expertsPerTok, localExperts)) / localExperts) : total;
  return {
    total: Math.round(total * 10) / 10,
    active: Math.round(active * 10) / 10,
  };
}