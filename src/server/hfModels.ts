import express from 'express';
import { getPool } from './db';
import { refreshModels } from './modelRefresh';
import { requireAdminSession } from './adminAuth';
import { isFormatBlocked, isDerivativeBlocked, isTextPipeline } from './knownOrgs';
import { pickLang, msg } from './i18nErrors';

export const hfModelsRouter = express.Router();

export type ModelSource = 'huggingface' | 'modelscope' | 'ollama' | 'mirror' | 'curated' | 'unknown';

export interface HfModelSourceLink {
  provider: 'huggingface' | 'modelscope' | 'ollama';
  id: string;
  url: string;
}

export interface HfModelRow {
  id: string;
  slugId: string | null;
  hfId: string;
  canonicalId: string | null;
  name: string;
  provider: string;
  category: string | null;
  capabilities: string[];
  targetEnv: string | null;
  curated: boolean;
  source: ModelSource;
  mirrorOf: string | null;
  mirrorHfId: string | null;
  sources: HfModelSourceLink[];
  releasedAt: string | null;
  releasedLabel: string | null;
  isMultimodal: boolean;
  modalities: string[];
  visionParamsB: number;
  expertIntermediateSize: number | null;
  numSharedExperts: number;
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

// Single unified catalog: one row per model, seeded from the curated presets
// and enriched with live HF architecture when available.
hfModelsRouter.get('/', async (req, res) => {
  const lang = pickLang(req);
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT id, hf_id, slug_id, canonical_id, name, provider, category, capabilities, target_env, curated,
         total_params_b, active_params_b, num_layers, num_heads, num_kv_heads, head_dim,
         hidden_size, default_context_len, max_context_len, is_moe, num_experts, active_experts,
         downloads, likes, description, scraped_at, verified, raw_json,
         sources, released_at, released_label,
         is_multimodal, modalities, vision_params_b, expert_intermediate_size, num_shared_experts
       FROM hf_models
       ORDER BY curated DESC, downloads DESC NULLS LAST, name ASC`
    );
    // Discovered rows that match the quantized-format / fine-tune blocklist, or
    // that are tagged with a non-text pipeline (embedding/ASR/image generation/...),
    // are never surfaced: they can only have been inserted by an older buggy run
    // and are not real catalog entries. Curated rows are never filtered.
    const visible = result.rows.filter(
      (r) =>
        r.curated ||
        (isTextPipeline(r.raw_json?.pipeline ?? null) &&
          !isFormatBlocked(r.hf_id) &&
          !isDerivativeBlocked(r.hf_id))
    );
    const rows: HfModelRow[] = visible.map((r) => {
      const raw = r.raw_json ?? {};
      const source: ModelSource =
        raw.source === 'mirror' ||
        raw.source === 'huggingface' ||
        raw.source === 'modelscope' ||
        raw.source === 'ollama' ||
        raw.source === 'curated'
          ? raw.source
          : 'unknown';
      const sources: HfModelSourceLink[] = Array.isArray(r.sources)
        ? r.sources
            .filter((s: any) => s && typeof s.url === 'string' && typeof s.provider === 'string')
            .map((s: any) => ({ provider: s.provider, id: String(s.id ?? ''), url: String(s.url) }))
        : [];
      if (
        sources.length === 0 &&
        (raw.source === 'huggingface' || raw.source === 'mirror' || raw.source === 'curated')
      ) {
        sources.push({ provider: 'huggingface', id: r.hf_id, url: `https://huggingface.co/${r.hf_id}` });
      }
      return {
        id: r.id,
        slugId: r.slug_id,
        hfId: r.hf_id,
        canonicalId: r.canonical_id ?? null,
        name: r.name,
        provider: r.provider,
        category: r.category,
        capabilities: r.capabilities ?? [],
        targetEnv: r.target_env,
        curated: r.curated,
        source,
        mirrorOf: raw.source === 'mirror' ? (raw.official ?? null) : null,
        mirrorHfId: raw.source === 'mirror' ? (raw.mirror ?? null) : null,
        sources,
        releasedAt: r.released_at ? new Date(r.released_at).toISOString() : null,
        releasedLabel: r.released_label ?? null,
        isMultimodal: Boolean(r.is_multimodal),
        modalities: r.modalities ?? ['text'],
        visionParamsB: Number(r.vision_params_b ?? 0),
        expertIntermediateSize:
          r.expert_intermediate_size != null ? Number(r.expert_intermediate_size) : null,
        numSharedExperts: Number(r.num_shared_experts ?? 0),
        totalParamsB: Number(r.total_params_b),
        activeParamsB: Number(r.active_params_b),
        numLayers: Number(r.num_layers),
        numHeads: Number(r.num_heads),
        numKvHeads: Number(r.num_kv_heads),
        headDim: Number(r.head_dim),
        hiddenSize: Number(r.hidden_size),
        defaultContextLen: Number(r.default_context_len),
        maxContextLen: Number(r.max_context_len),
        isMoe: r.is_moe,
        numExperts: r.num_experts != null ? Number(r.num_experts) : null,
        activeExperts: r.active_experts != null ? Number(r.active_experts) : null,
        downloads: r.downloads != null ? Number(r.downloads) : null,
        likes: r.likes != null ? Number(r.likes) : null,
        description: r.description,
        scrapedAt: r.scraped_at,
        verified: r.verified,
      };
    });
    res.json({ models: rows });
  } catch (err: any) {
    console.error('List HF models error:', err?.message);
    res.status(500).json({ error: msg(lang, 'Model kataloğu yüklenemedi.', 'Failed to load model catalog.') });
  }
});

// Admin hook: refresh the catalog from Hugging Face on demand (no scheduler).
// Requires the local admin session (ADMIN_USERNAME/ADMIN_PASSWORD). Returns a
// summary of fetched/updated/mirrored/discovered models. A second concurrent
// call is rejected with 409 (the refresh is idempotent, but running it twice
// at once would hammer the Hub).
hfModelsRouter.post('/refresh', requireAdminSession, async (req, res) => {
  const lang = pickLang(req);
  try {
    const summary = await refreshModels();
    res.json({ ok: true, summary });
  } catch (err: any) {
    if (err?.message === 'Yenileme zaten çalışıyor.') {
      res.status(409).json({ error: err.message });
      return;
    }
    console.error('Refresh HF models error:', err?.message);
    res.status(500).json({ error: msg(lang, 'Model kataloğu güncellenemedi.', 'Failed to refresh model catalog.') });
  }
});