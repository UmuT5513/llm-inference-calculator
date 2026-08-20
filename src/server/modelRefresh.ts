import { getPool } from './db';
import {
  fetchModelConfig,
  fetchArchitectureFromMirrors,
  listOrgRepos,
  searchRepos,
} from './hfClient';
import {
  KNOWN_ORGS,
  PRODUCERS,
  isCandidateRepo,
  isFormatBlocked,
  isDerivativeBlocked,
  isTextPipeline,
  resolveProducer,
  producerFamilyKey,
  getMinParamsB,
} from './knownOrgs';
import { MODEL_CATALOG } from '../data/modelCatalog';
import type { Pool } from 'pg';

export interface RefreshSummary {
  fetched: number;
  updated: number;
  mirrored: number;
  discovered: number;
  failed: string[];
}

// Manual, admin-triggerable refresh: (1) enrich every curated model that has a
// live HF repo (official first, then a community-mirror fallback for gated
// ones), (2) discover new open-source LLMs from known official orgs AND from
// community uploads, attributing every row to its ORIGINAL producer, (3) mark
// discovered rows that disappeared upstream as unverified (never delete them).
// No scheduler — only called from POST /api/models/refresh.
const INTER_REQUEST_DELAY_MS = 150;
// Community uploads below this download count are treated as junk (random
// fine-tunes / test checkpoints). Official-org scanning has no floor.
const COMMUNITY_MIN_DOWNLOADS = 250;

let refreshInFlight = false;

export async function refreshModels(): Promise<RefreshSummary> {
  if (refreshInFlight) throw new Error('Yenileme zaten çalışıyor.');
  refreshInFlight = true;
  try {
    return await runRefresh();
  } finally {
    refreshInFlight = false;
  }
}

async function runRefresh(): Promise<RefreshSummary> {
  const pool = getPool();
  const summary: RefreshSummary = { fetched: 0, updated: 0, mirrored: 0, discovered: 0, failed: [] };

  const curated = MODEL_CATALOG.filter((m) => m.hfId);
  const seenHfIds = new Set<string>();
  const seenFamilies = new Set<string>();

  // ---- Curated enrichment (official, then community-mirror fallback) ----
  for (const model of curated) {
    const hfId = model.hfId!;
    seenHfIds.add(hfId);
    seenFamilies.add(producerFamilyKey(hfId));
    const expectedParams = Number(model.totalParamsB) > 0 ? Number(model.totalParamsB) : undefined;

    let cfg = await fetchModelConfig(hfId);
    let source = 'huggingface';
    let mirrorHfId: string | null = null;

    if (!cfg) {
      // Reuse a previously discovered mirror first (cheap, deterministic).
      const prev = await pool.query(`SELECT raw_json FROM hf_models WHERE hf_id = $1`, [hfId]);
      const cachedMirror: string | undefined = prev.rows[0]?.raw_json?.mirror;
      if (cachedMirror) {
        const m = await fetchModelConfig(cachedMirror);
        if (m && paramsInRange(m.totalParamsB, expectedParams)) {
          cfg = m;
          mirrorHfId = cachedMirror;
          source = 'mirror';
        }
      }
      if (!cfg) {
        const mirror = await fetchArchitectureFromMirrors(hfId, expectedParams);
        if (mirror) {
          cfg = mirror.cfg;
          mirrorHfId = mirror.mirrorHfId;
          source = 'mirror';
        }
      }
    }

    await sleep(INTER_REQUEST_DELAY_MS);
    if (!cfg) {
      summary.failed.push(hfId);
      await pool.query(`UPDATE hf_models SET verified = false WHERE hf_id = $1`, [hfId]);
      continue;
    }
    summary.fetched += 1;
    if (source === 'mirror') summary.mirrored += 1;

    const rawJson =
      source === 'mirror'
        ? JSON.stringify({ source: 'mirror', official: hfId, mirror: mirrorHfId })
        : JSON.stringify({ source: 'huggingface' });

    const result = await pool.query(
      `UPDATE hf_models SET
         total_params_b = $1, active_params_b = $2,
         num_layers = $3, num_heads = $4, num_kv_heads = $5, head_dim = $6,
         hidden_size = $7, default_context_len = $8, max_context_len = $9,
         is_moe = $10, num_experts = $11, active_experts = $12,
         downloads = $13, likes = $14,
         raw_json = $15::jsonb,
         verified = true,
         scraped_at = now()
       WHERE hf_id = $16`,
      [
        cfg.totalParamsB,
        cfg.activeParamsB,
        cfg.numLayers,
        cfg.numHeads,
        cfg.numKvHeads,
        cfg.headDim,
        cfg.hiddenSize,
        cfg.defaultContextLen,
        cfg.maxContextLen,
        cfg.isMoe,
        cfg.numExperts,
        cfg.activeExperts,
        null,
        null,
        rawJson,
        hfId,
      ]
    );
    if (result.rowCount > 0) summary.updated += 1;
  }

  // ---- Discovery: known official orgs, producer-attributed ----
  const variantSuffix = /-\d{4,6}(-|\b)|-bf16$|-16bit$|-base$/i;
  for (const known of KNOWN_ORGS) {
    if (known.repoTerms.length === 0) continue;
    const repos = await listOrgRepos(known.org, 50, true);
    // Prefer canonical (un-suffixed) names so they claim the family slot first.
    repos.sort(
      (a, b) => (variantSuffix.test(b.id) ? 1 : 0) - (variantSuffix.test(a.id) ? 1 : 0)
    );
    for (const repo of repos) {
      if (seenHfIds.has(repo.id)) continue;
      if (!isTextPipeline(repo.pipelineTag)) continue;
      const check = isCandidateRepo(repo.id);
      if (!check.allowed) continue;
      await maybeDiscover(repo, 0, seenHfIds, seenFamilies, summary, pool);
    }
  }

  // ---- Discovery: community mirrors, attributed to the ORIGINAL producer ----
  for (const p of PRODUCERS) {
    const repos = await searchRepos(p.term, 20);
    repos.sort(
      (a, b) => (variantSuffix.test(b.id) ? 1 : 0) - (variantSuffix.test(a.id) ? 1 : 0)
    );
    for (const repo of repos) {
      if (seenHfIds.has(repo.id)) continue;
      if (!isTextPipeline(repo.pipelineTag)) continue;
      const prod = resolveProducer(repo.id);
      if (!prod || prod.term !== p.term) continue;
      await maybeDiscover(repo, COMMUNITY_MIN_DOWNLOADS, seenHfIds, seenFamilies, summary, pool);
    }
  }

  // ---- Stale discovered rows: never deleted, just unverified ----
  if (seenHfIds.size > 0) {
    await pool.query(
      `UPDATE hf_models SET verified = false
        WHERE NOT curated AND NOT (hf_id = ANY($1::text[]))`,
      [Array.from(seenHfIds)]
    );
  }

  console.log(
    `[refresh] fetched=${summary.fetched} updated=${summary.updated} mirrored=${summary.mirrored} discovered=${summary.discovered} failed=${summary.failed.length}`
  );
  return summary;
}

async function maybeDiscover(
  repo: { id: string; downloads: number; pipelineTag: string | null },
  minDownloads: number,
  seenHfIds: Set<string>,
  seenFamilies: Set<string>,
  summary: RefreshSummary,
  pool: Pool
): Promise<void> {
  if (minDownloads > 0 && (repo.downloads ?? 0) < minDownloads) return;
  // Quantized/alt-format and derivative/fine-tune repos never enter the
  // catalog (they may still be used as mirror config sources, handled in the
  // curated enrichment above). Skipped rows are left to the stale-mark below,
  // which unverifies any previously-inserted junk.
  if (isFormatBlocked(repo.id) || isDerivativeBlocked(repo.id)) return;
  const family = producerFamilyKey(repo.id);
  if (seenFamilies.has(family)) return;
  seenHfIds.add(repo.id);

  const cfg = await fetchModelConfig(repo.id);
  if (!cfg) return; // stale-mark unverifies existing rows that can't be validated
  if (cfg.totalParamsB < getMinParamsB()) return;

  const prod = resolveProducer(repo.id);
  if (!prod) return;

  const slugId = `hf-${repo.id.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()}`;
  const existing = await pool.query(`SELECT id FROM hf_models WHERE hf_id = $1`, [repo.id]);
  if (existing.rowCount === 0) {
    await pool.query(
      `INSERT INTO hf_models
        (hf_id, slug_id, name, provider, category, capabilities, target_env, curated,
         total_params_b, active_params_b, num_layers, num_heads, num_kv_heads, head_dim,
         hidden_size, default_context_len, max_context_len, is_moe, num_experts, active_experts,
         downloads, likes, description, raw_json, verified)
       VALUES ($1, $2, $3, $4, $5, '{}'::TEXT[], NULL, false,
         $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
         $18, $19, $20, jsonb_build_object('source', 'huggingface', 'pipeline', $21::text), true)`,
      [
        repo.id,
        slugId,
        repo.id.split('/')[1] ?? repo.id,
        prod.producer,
        prod.category,
        cfg.totalParamsB,
        cfg.activeParamsB,
        cfg.numLayers,
        cfg.numHeads,
        cfg.numKvHeads,
        cfg.headDim,
        cfg.hiddenSize,
        cfg.defaultContextLen,
        cfg.maxContextLen,
        cfg.isMoe,
        cfg.numExperts,
        cfg.activeExperts,
        repo.downloads,
        0,
        null,
        repo.pipelineTag ?? null,
      ]
    );
    summary.discovered += 1;
  } else {
    await pool.query(
      `UPDATE hf_models SET
         provider = $2, category = $3,
         total_params_b = $4, active_params_b = $5,
         num_layers = $6, num_heads = $7, num_kv_heads = $8, head_dim = $9,
         hidden_size = $10, default_context_len = $11, max_context_len = $12,
         is_moe = $13, num_experts = $14, active_experts = $15,
         downloads = $16,
         raw_json = jsonb_build_object('source', 'huggingface', 'pipeline', $17::text),
         verified = true,
         scraped_at = now()
       WHERE hf_id = $1`,
      [
        repo.id,
        prod.producer,
        prod.category,
        cfg.totalParamsB,
        cfg.activeParamsB,
        cfg.numLayers,
        cfg.numHeads,
        cfg.numKvHeads,
        cfg.headDim,
        cfg.hiddenSize,
        cfg.defaultContextLen,
        cfg.maxContextLen,
        cfg.isMoe,
        cfg.numExperts,
        cfg.activeExperts,
        repo.downloads,
        repo.pipelineTag ?? null,
      ]
    );
  }
  seenFamilies.add(family);
}

function paramsInRange(actual: number, expected?: number): boolean {
  if (!expected || expected <= 0 || !actual || actual <= 0) return false;
  const ratio = actual / expected;
  return ratio >= 0.75 && ratio <= 1.25;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}