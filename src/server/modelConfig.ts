// Shared transformers-config parsing for every model provider (Hugging Face,
// ModelScope, and HF repos matched from Ollama entries). Extracted from
// hfClient so MoE active-params decomposition and multimodal detection are
// computed identically everywhere. Must not import DOM/React code.

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
  // Multi-provider / MoE / multimodal additions (2026-09-23).
  expertIntermediateSize: number | null;
  numSharedExperts: number;
  isMultimodal: boolean;
  modalities: string[];
  visionParamsB: number;
  activeParamsEstimated: boolean;
  releasedAt: string | null;
}

export interface ConfigMeta {
  pipelineTag?: string | null;
  modelType?: string | null;
}

// Pipelines that imply a non-text encoder in addition to the text backbone.
const IMAGE_PIPELINES = new Set([
  'image-text-to-text',
  'visual-question-answering',
  'document-question-answering',
  'image-to-text',
]);
const AUDIO_PIPELINES = new Set([
  'automatic-speech-recognition',
  'audio-classification',
  'audio-to-audio',
  'text-to-audio',
]);

// Configs can be multimodal wrappers (Qwen3_5ForConditionalGeneration,
// PaliGemma, …) whose numbers live under text_config / language_model. Unwrap
// to the text backbone so architecture fields resolve; null when no hyperparams
// are present (e.g. the API's tokenizer-only config).
export function resolveHyperparamConfig(cfg: any): any | null {
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

export interface ParsedParams {
  total: number;
  active: number;
  activeEstimated: boolean;
  computedTotal: number; // text-backbone estimate (used for vision-tower delta)
  expertIntermediateSize: number; // 0 when unknown
  numSharedExperts: number;
  numExperts: number; // 0 when dense
}

// MoE-aware parameter decomposition.
//
//   H = hidden_size; kvR = kvHeads/heads (GQA ratio)
//   attnPerLayer = H*H*(2 + 2*kvR)                  # q,k,v,o
//   routedExpert = 3 * H * EI                       # gate+up+down
//   sharedFFN    = num_shared_experts * 3 * H * EI
//   active = emb + L*(attn + shared + expertsPerTok*routedExpert)
//   total  = emb + L*(attn + shared + numExperts*routedExpert)
//
// The authoritative safetensors `total` (if provided) wins for TOTAL because it
// includes every tower; the formula is preferred for ACTIVE. When the expert
// FFN size is unknown we fall back to the old
// `total * expertsPerTok / numExperts` estimate and flag it.
export function parseParams(cfg: any, totalRaw?: number): ParsedParams {
  const hidden = num(cfg?.hidden_size);
  const layers = firstPositive(cfg?.num_hidden_layers, cfg?.num_layers) ||
    (Array.isArray(cfg?.layers_block_type) ? cfg.layers_block_type.length : 0);
  const vocab = num(cfg?.vocab_size);
  const numExperts = firstPositive(cfg?.num_local_experts, cfg?.num_experts, cfg?.n_routed_experts);
  const expertsPerTok = firstPositive(cfg?.num_experts_per_tok, cfg?.top_k);
  const heads = firstPositive(cfg?.num_attention_heads, cfg?.num_heads);
  const kvHeads = firstPositive(cfg?.num_key_value_heads) || heads;
  const kvR = heads > 0 ? kvHeads / heads : 1;

  const declaredInter = firstPositive(cfg?.moe_intermediate_size, cfg?.intermediate_size);
  const eiKnown = declaredInter > 0;
  const expertIntermediateSize = declaredInter > 0 ? declaredInter : (hidden > 0 ? hidden * 8 : 0);
  // Shared (always-on) expert count: DeepSeek uses n_shared_experts, some Qwen3
  // MoE variants only carry shared_expert_intermediate_size (>0 implies 1).
  const declaredShared =
    firstPositive(cfg?.num_shared_experts, cfg?.n_shared_experts) ||
    (cfg?.shared_expert_intermediate_size > 0 ? 1 : 0);
  const numSharedExperts = Math.round(Math.max(0, declaredShared));

  const rawParams = firstPositive(cfg?.num_parameters, cfg?.total_params);
  let total = totalRaw && totalRaw > 0 ? totalRaw / 1e9 : rawParams > 0 ? rawParams / 1e9 : 0;

  const isMoe = numExperts > 0;
  const attnPerLayer = hidden * hidden * (2 + 2 * kvR);
  const routedExpertParams = 3 * hidden * expertIntermediateSize;
  const sharedFFNPerLayer = numSharedExperts * 3 * hidden * expertIntermediateSize;
  const embeddings = vocab * hidden;

  let computedTotal: number;
  let computedActive: number;
  let activeEstimated = false;

  if (isMoe && expertsPerTok > 0) {
    computedTotal =
      (embeddings + layers * (attnPerLayer + sharedFFNPerLayer + numExperts * routedExpertParams)) /
      1e9;
    computedActive =
      (embeddings +
        layers *
          (attnPerLayer +
            sharedFFNPerLayer +
            Math.min(expertsPerTok, numExperts) * routedExpertParams)) /
      1e9;
    activeEstimated = !eiKnown;
  } else {
    // Dense transformer (or MoE with an unknown top-k): 3*H*EI per-layer FFN.
    const ffn = 3 * hidden * expertIntermediateSize;
    computedTotal = (embeddings + layers * (attnPerLayer + ffn)) / 1e9;
    computedActive = computedTotal;
    activeEstimated = isMoe;
  }

  if (total <= 0) total = computedTotal;

  let active: number;
  if (isMoe) {
    if (!activeEstimated) {
      active = computedActive;
    } else if (expertsPerTok > 0 && numExperts > 0 && total > 0) {
      // Old estimate: proportional share of the total.
      active = (total * Math.min(expertsPerTok, numExperts)) / numExperts;
    } else {
      active = total;
    }
  } else {
    active = total;
    activeEstimated = false;
  }

  return {
    total: round1(Math.max(0, total)),
    active: round1(Math.max(0, active)),
    activeEstimated,
    computedTotal,
    expertIntermediateSize,
    numSharedExperts,
    numExperts,
  };
}

// Shared conversion from an (unwrapped or raw) transformers config to a
// ModelConfig. Detects multimodal wrappers from the ORIGINAL config (before
// unwrapping) plus pipeline tags, and separates the vision/audio tower params
// from the text backbone.
export function toModelConfig(rawCfg: any, totalRaw: number, meta: ConfigMeta = {}): ModelConfig {
  const base = resolveHyperparamConfig(rawCfg) ?? (rawCfg && typeof rawCfg === 'object' ? rawCfg : {});
  const params = parseParams(base, totalRaw);

  const numLayers = firstPositive(base.num_hidden_layers, base.num_layers) ||
    (Array.isArray(base.layers_block_type) ? base.layers_block_type.length : 0);
  const numHeads = firstPositive(base.num_attention_heads, base.num_heads);
  const headDim =
    firstPositive(base.head_dim) ||
    (base.hidden_size > 0 && numHeads > 0 ? Math.round(base.hidden_size / numHeads) : 0);

  const modelType = String(meta.modelType ?? rawCfg?.model_type ?? base.model_type ?? '').toLowerCase();
  const pipelineTag = String(meta.pipelineTag ?? '').toLowerCase();
  const textConfig = rawCfg?.text_config ?? rawCfg?.language_model ?? base;

  const hasVisionConfig = Boolean(
    rawCfg?.vision_config ?? textConfig?.vision_config ?? base.vision_config
  );
  const hasAudioConfig = Boolean(rawCfg?.audio_config ?? base.audio_config);
  const hasImageToken =
    (rawCfg?.image_token_id ?? base.image_token_id) != null ||
    (rawCfg?.image_token_index ?? base.image_token_index) != null;
  const hasAudioToken = (rawCfg?.audio_token_id ?? base.audio_token_id) != null;
  const visionModelType = /(^|[^a-z])(vl|vision|mllama|paligemma|llava|idefics|pixtral|internvl)($|[^a-z])/.test(
    modelType
  );
  const audioModelType = /(audio|voxtral|whisper|speech|omni)/.test(modelType);

  const hasImage =
    hasVisionConfig || hasImageToken || visionModelType || IMAGE_PIPELINES.has(pipelineTag);
  const hasAudio =
    hasAudioConfig || hasAudioToken || audioModelType || AUDIO_PIPELINES.has(pipelineTag);
  const modalities = ['text'];
  if (hasImage) modalities.push('image');
  if (hasAudio) modalities.push('audio');

  // Vision/audio tower size: safetensors total minus the text-backbone estimate,
  // only when the difference is materially large (> 5% of total).
  const fullTotal = params.total;
  let visionParamsB = 0;
  if ((hasImage || hasAudio) && fullTotal > 0 && params.computedTotal > 0) {
    const diff = fullTotal - params.computedTotal;
    if (diff > fullTotal * 0.05) visionParamsB = round1(diff);
  }

  return {
    totalParamsB: params.total,
    activeParamsB: params.active,
    numLayers,
    numHeads,
    numKvHeads: firstPositive(base.num_key_value_heads) || numHeads,
    headDim,
    hiddenSize: num(base.hidden_size),
    defaultContextLen: num(base.max_position_embeddings),
    maxContextLen: num(base.max_position_embeddings),
    isMoe: params.numExperts > 0,
    numExperts: params.numExperts > 0 ? params.numExperts : null,
    activeExperts: firstPositive(base.num_experts_per_tok, base.top_k) || null,
    expertIntermediateSize: params.expertIntermediateSize > 0 ? params.expertIntermediateSize : null,
    numSharedExperts: params.numSharedExperts,
    isMultimodal: hasImage || hasAudio,
    modalities,
    visionParamsB,
    activeParamsEstimated: params.activeEstimated,
    releasedAt: null,
  };
}

// Generic JSON/HTML fetch with the same retry/backoff shape as the old
// hfClient helper. Returns null on 404/401/403 and after exhausting retries.
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  label: string
): Promise<Response | null> {
  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.status === 429 || res.status === 500 || res.status === 503) {
        const wait = 500 * 2 ** (attempt - 1) + Math.random() * 400;
        await sleep(wait);
        continue;
      }
      if (!res.ok) {
        if (res.status === 404 || res.status === 401 || res.status === 403) return null;
        console.error(`[${label}] ${url} -> ${res.status}`);
        return null;
      }
      return res;
    } catch (err: any) {
      if (attempt === maxAttempts) {
        console.error(`[${label}] fetch error ${url}:`, err?.message);
        return null;
      }
      await sleep(300 * attempt);
    }
  }
  return null;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function firstPositive(...vals: any[]): number {
  for (const v of vals) {
    const n = num(v);
    if (n > 0) return n;
  }
  return 0;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
