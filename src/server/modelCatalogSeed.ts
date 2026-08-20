import { ModelPreset } from '../types';
import { MODEL_CATALOG } from '../data/modelCatalog';
import { getPool } from './db';

// Boot-time seed: upserts the curated catalog into hf_models.
// Architecture columns are preserved when a live snapshot already exists
// (fresh HF data wins); otherwise the curated fallback architecture is used.
export async function seedModelCatalog(): Promise<number> {
  const pool = getPool();
  let seeded = 0;
  let skipped = 0;
  for (const model of MODEL_CATALOG) {
    if (!model.hfId) {
      skipped += 1;
      continue;
    }
    const row = toCatalogRow(model);
    await pool.query(
      `INSERT INTO hf_models
        (hf_id, slug_id, name, provider, category, capabilities, target_env, curated,
         total_params_b, active_params_b, num_layers, num_heads, num_kv_heads,
         head_dim, hidden_size, default_context_len, max_context_len,
         is_moe, num_experts, active_experts, downloads, likes, description, raw_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
         $9, $10, $11, $12, $13, $14, $15, $16, $17,
         $18, $19, $20, $21, $22, $23, $24)
       ON CONFLICT (hf_id) DO UPDATE SET
         slug_id = EXCLUDED.slug_id,
         name = EXCLUDED.name,
         provider = EXCLUDED.provider,
         category = EXCLUDED.category,
         capabilities = EXCLUDED.capabilities,
         target_env = EXCLUDED.target_env,
         curated = true,
         description = EXCLUDED.description
       RETURNING hf_id`,
      [
        row.hf_id,
        row.slug_id,
        row.name,
        row.provider,
        row.category,
        row.capabilities,
        row.target_env,
        true,
        row.total_params_b,
        row.active_params_b,
        row.num_layers,
        row.num_heads,
        row.num_kv_heads,
        row.head_dim,
        row.hidden_size,
        row.default_context_len,
        row.max_context_len,
        row.is_moe,
        row.num_experts,
        row.active_experts,
        null, // downloads — never clobber live value
        null, // likes
        row.description,
        JSON.stringify({ source: 'curated' }),
      ]
    );
    seeded += 1;
  }
  console.log(`[seed] ${seeded} curated models upserted into hf_models (${skipped} skipped: no hfId).`);
  return seeded;
}

// Map a curated ModelPreset to the hf_models row shape. Models without an
// hfId (e.g. speculative/future presets) are skipped: the DB catalog is keyed
// on hf_id and the seed upsert uses ON CONFLICT (hf_id).
function toCatalogRow(model: ModelPreset): Record<string, any> {
  if (!model.hfId) {
    throw new Error(`Model ${model.id} has no hfId and cannot be seeded.`);
  }
  return {
    hf_id: model.hfId,
    slug_id: model.id,
    name: model.name,
    provider: model.provider,
    category: model.category,
    capabilities: model.capabilities ?? [],
    target_env: model.targetEnv ?? inferTargetEnv(model.totalParamsB),
    total_params_b: model.totalParamsB,
    active_params_b: model.activeParamsB,
    num_layers: model.numLayers,
    num_heads: model.numHeads,
    num_kv_heads: model.numKvHeads,
    head_dim: model.headDim,
    hidden_size: model.hiddenSize,
    default_context_len: model.defaultContextLen,
    max_context_len: model.maxContextLen,
    is_moe: model.isMoe,
    num_experts: model.numExperts ?? null,
    active_experts: model.activeExperts ?? null,
    description: model.description,
  };
}

function inferTargetEnv(paramsB: number): 'edge' | 'local' | 'hybrid' | 'server' {
  if (paramsB <= 4) return 'edge';
  if (paramsB <= 13) return 'local';
  if (paramsB <= 50) return 'hybrid';
  return 'server';
}