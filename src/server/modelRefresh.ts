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
  getMinParamsB,
  computeIdentity,
  formatSizeB,
  sizeMatches,
  type IdentityParts,
} from './knownOrgs';
import { MODEL_CATALOG } from '../data/modelCatalog';
import {
  getModelScopeTopModels,
  fetchModelScopeConfig,
  type ModelScopeModel,
} from './modelScopeClient';
import {
  listOllamaLibrary,
  fetchOllamaModel,
  type OllamaModel,
} from './ollamaClient';
import type { ModelConfig } from './modelConfig';
import { sleep } from './modelConfig';
import type { Pool } from 'pg';

export interface RefreshSummary {
  fetched: number;
  updated: number;
  mirrored: number;
  discovered: number;
  linked: number;
  failed: string[];
}

interface SourceLink {
  provider: 'huggingface' | 'modelscope' | 'ollama';
  id: string;
  url: string;
}

// Manual, admin-triggerable refresh across providers: (1) enrich every curated
// model that has a live HF repo (official first, then a community-mirror
// fallback for gated ones), attaching ModelScope/Ollama links and release
// dates, (2) discover new open-source LLMs from known HF orgs, ModelScope and
// the Ollama library, deduping every provider onto ONE catalog row per real
// model, (3) mark discovered rows that disappeared upstream as unverified
// (never delete them). No scheduler — only called from POST /api/models/refresh.
const INTER_REQUEST_DELAY_MS = 150;
// Community uploads below this download count are treated as junk (random
// fine-tunes / test checkpoints). Official-org scanning has no floor.
const COMMUNITY_MIN_DOWNLOADS = 250;

// Bounded ModelScope discovery (the catalog has hundreds of thousands of
// entries; only the most popular/recent first pages are scanned).
const MS_MIN_DOWNLOADS = 50;
const MS_DISCOVERY_MAX_ENTRIES = 600;
const MS_DISCOVERY_MAX_CONFIG_FETCHES = 40;

// Bounded Ollama discovery.
const OLLAMA_LIBRARY_LIMIT = 80;
const OLLAMA_DISCOVERY_MAX = 60;

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

// ---------------------------------------------------------------------------
// Cross-provider identity registry: maps {producer, family, sizeB} to the one
// canonical row. A model already resolved is never re-fetched — additional
// provider links are just merged onto the existing row.
// ---------------------------------------------------------------------------
class IdentityRegistry {
  private entries: Array<IdentityParts & { canonical: string }> = [];

  find(parts: IdentityParts): string | null {
    let best: string | null = null;
    let bestDiff = Infinity;
    for (const e of this.entries) {
      if (e.producer !== parts.producer || e.family !== parts.family) continue;
      if (!sizeMatches(e.sizeB, parts.sizeB)) continue;
      if (e.sizeB && parts.sizeB) {
        const diff = Math.abs(Math.log(e.sizeB / parts.sizeB));
        if (diff < bestDiff) {
          bestDiff = diff;
          best = e.canonical;
        }
      } else if (best === null) {
        best = e.canonical;
      }
    }
    return best;
  }

  register(parts: IdentityParts, canonical: string): void {
    if (this.entries.some((e) => e.canonical === canonical && e.family === parts.family)) return;
    this.entries.push({ ...parts, canonical });
  }
}

interface DiscoveredRow {
  hfId: string; // storage hf_id (synthetic for non-HF providers)
  canonicalId: string;
  slugId: string;
  name: string;
  provider: string;
  category: string;
  capabilities: string[];
  targetEnv: string | null;
  arch: CatalogArchitecture;
  downloads: number | null;
  likes: number | null;
  description: string | null;
  pipeline: string | null;
  sourceLabel: 'huggingface' | 'modelscope' | 'ollama';
  sources: SourceLink[];
  releasedAt: string | null;
  releasedLabel: string | null;
  verified: boolean;
}

interface CatalogArchitecture {
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
  expertIntermediateSize: number | null;
  numSharedExperts: number;
  isMultimodal: boolean;
  modalities: string[];
  visionParamsB: number;
}

async function runRefresh(): Promise<RefreshSummary> {
  const pool = getPool();
  const summary: RefreshSummary = {
    fetched: 0,
    updated: 0,
    mirrored: 0,
    discovered: 0,
    linked: 0,
    failed: [],
  };

  const registry = new IdentityRegistry();
  const sourcesMap = new Map<string, SourceLink[]>();
  const releasedFallback = new Map<string, { at: string | null; label: string | null }>();
  const seenCanonical = new Set<string>();

  // Bounded provider listings, shared by link-matching and discovery so each
  // provider is paged at most once per run.
  const msModels = await getModelScopeTopModels(MS_DISCOVERY_MAX_ENTRIES);
  const ollamaNames = await listOllamaLibrary(OLLAMA_LIBRARY_LIMIT);
  const ollamaCache = new Map<string, OllamaModel>();

  const addSource = (canonical: string, link: SourceLink): boolean => {
    const arr = sourcesMap.get(canonical) ?? [];
    if (arr.some((s) => s.provider === link.provider && s.id === link.id)) {
      sourcesMap.set(canonical, arr);
      return false;
    }
    arr.push(link);
    sourcesMap.set(canonical, arr);
    return true;
  };
  const setReleasedFallback = (canonical: string, at: string | null, label: string | null) => {
    const prev = releasedFallback.get(canonical) ?? { at: null, label: null };
    releasedFallback.set(canonical, {
      at: prev.at ?? at,
      label: prev.label ?? label,
    });
  };

  const curated = MODEL_CATALOG.filter((m) => m.hfId);

  // ---- Curated enrichment (official, then community-mirror fallback) ----
  for (const model of curated) {
    const hfId = model.hfId!;
    const canonical = hfId;
    seenCanonical.add(canonical);
    addSource(canonical, hfSource(hfId));
    const expectedParams = Number(model.totalParamsB) > 0 ? Number(model.totalParamsB) : undefined;
    // Register the identity before any provider call so community mirrors and
    // ModelScope/Ollama entries collapse onto this curated row even when its
    // own HF config is gated/unavailable.
    registry.register(computeIdentity(hfId, expectedParams ?? null), canonical);

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

    const sizeForIdentity = cfg?.totalParamsB ?? expectedParams ?? null;
    let releasedAt = cfg && source === 'huggingface' ? cfg.releasedAt : null;
    let releasedLabel: string | null = null;

    // -- ModelScope link (+ architecture fallback when HF is gated) --
    const msHit = matchModelScope(msModels, hfId, sizeForIdentity);
    if (msHit) {
      if (addSource(canonical, msSource(msHit.id))) summary.linked += 1;
      registry.register(computeIdentity(msHit.id, sizeForIdentity), canonical);
      const msAt = msHit.createdTime ? new Date(msHit.createdTime * 1000).toISOString() : null;
      if (!releasedAt && msAt) releasedAt = msAt;
      if (!cfg) {
        const msCfg = await fetchModelScopeConfig(msHit.id);
        await sleep(INTER_REQUEST_DELAY_MS);
        if (msCfg) {
          cfg = msCfg;
          source = 'modelscope';
        }
      }
    }

    // -- Ollama link --
    const om = await matchOllama(ollamaNames, ollamaCache, hfId, sizeForIdentity);
    if (om) {
      if (addSource(canonical, ollamaSource(om.name))) summary.linked += 1;
      registry.register(computeIdentity(om.name, om.sizeB), canonical);
      if (om.model.updatedLabel) releasedLabel = om.model.updatedLabel;
    }

    await sleep(INTER_REQUEST_DELAY_MS);

    if (!cfg) {
      summary.failed.push(hfId);
      await pool.query(
        `UPDATE hf_models SET verified = false, canonical_id = COALESCE(canonical_id, $2) WHERE hf_id = $1`,
        [hfId, canonical]
      );
      setReleasedFallback(canonical, releasedAt, releasedLabel);
      continue;
    }

    summary.fetched += 1;
    if (source === 'mirror') summary.mirrored += 1;
    registry.register(computeIdentity(hfId, cfg.totalParamsB), canonical);

    const modalities = mergeModalities(cfg.modalities, om?.model);
    const isMultimodal = cfg.isMultimodal || modalities.some((m) => m !== 'text');
    const rawJson =
      source === 'mirror'
        ? JSON.stringify({ source: 'mirror', official: hfId, mirror: mirrorHfId })
        : JSON.stringify({ source: source === 'modelscope' ? 'modelscope' : 'huggingface' });

    const result = await pool.query(
      `UPDATE hf_models SET
         total_params_b = $1, active_params_b = $2,
         num_layers = $3, num_heads = $4, num_kv_heads = $5, head_dim = $6,
         hidden_size = $7, default_context_len = $8, max_context_len = $9,
         is_moe = $10, num_experts = $11, active_experts = $12,
         expert_intermediate_size = $13, num_shared_experts = $14,
         is_multimodal = $15, modalities = $16::text[], vision_params_b = $17,
         downloads = $18, likes = $19,
         canonical_id = COALESCE(canonical_id, $20),
         released_at = COALESCE(released_at, $21),
         released_label = COALESCE(released_label, $22),
         raw_json = $23::jsonb,
         verified = true,
         scraped_at = now()
       WHERE hf_id = $24`,
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
        cfg.expertIntermediateSize,
        cfg.numSharedExperts,
        isMultimodal,
        modalities,
        cfg.visionParamsB,
        null,
        null,
        canonical,
        releasedAt,
        releasedLabel,
        rawJson,
        hfId,
      ]
    );
    if (result.rowCount > 0) summary.updated += 1;
    setReleasedFallback(canonical, releasedAt, releasedLabel);
  }

  // ---- Discovery: known official HF orgs, producer-attributed ----
  const variantSuffix = /-\d{4,6}(-|\b)|-bf16$|-16bit$|-base$/i;
  for (const known of KNOWN_ORGS) {
    if (known.repoTerms.length === 0) continue;
    const repos = await listOrgRepos(known.org, 50, true);
    // Prefer canonical (un-suffixed) names so they claim the family slot first.
    repos.sort(
      (a, b) => (variantSuffix.test(b.id) ? 1 : 0) - (variantSuffix.test(a.id) ? 1 : 0)
    );
    for (const repo of repos) {
      if (registry.find(computeIdentity(repo.id, null))) continue;
      if (!isTextPipeline(repo.pipelineTag)) continue;
      const check = isCandidateRepo(repo.id);
      if (!check.allowed) continue;
      await maybeDiscoverHf(repo, 0, { registry, sourcesMap, seenCanonical, summary, addSource, pool });
    }
  }

  // ---- Discovery: HF community mirrors, attributed to the ORIGINAL producer ----
  for (const p of PRODUCERS) {
    const repos = await searchRepos(p.term, 20);
    repos.sort(
      (a, b) => (variantSuffix.test(b.id) ? 1 : 0) - (variantSuffix.test(a.id) ? 1 : 0)
    );
    for (const repo of repos) {
      if (registry.find(computeIdentity(repo.id, null))) continue;
      if (!isTextPipeline(repo.pipelineTag)) continue;
      const prod = resolveProducer(repo.id);
      if (!prod || prod.term !== p.term) continue;
      await maybeDiscoverHf(repo, COMMUNITY_MIN_DOWNLOADS, {
        registry,
        sourcesMap,
        seenCanonical,
        summary,
        addSource,
        pool,
      });
    }
  }

  // ---- Discovery: ModelScope ----
  let msConfigFetches = 0;
  for (const m of msModels) {
    if (msConfigFetches >= MS_DISCOVERY_MAX_CONFIG_FETCHES) break;
    const prod = resolveProducer(m.id);
    if (!prod) continue;
    if (m.downloads < MS_MIN_DOWNLOADS) continue;
    if (isFormatBlocked(m.id) || isDerivativeBlocked(m.id)) continue;
    if (!isTextTaskList(m.tasks)) continue;

    const preParts = computeIdentity(m.id, null);
    const preHit = registry.find(preParts);
    if (preHit) {
      if (addSource(preHit, msSource(m.id))) summary.linked += 1;
      registry.register(preParts, preHit);
      setReleasedFallback(preHit, msDate(m), null);
      continue;
    }

    const cfg = await fetchModelScopeConfig(m.id);
    msConfigFetches += 1;
    await sleep(INTER_REQUEST_DELAY_MS);
    if (!cfg || cfg.totalParamsB < getMinParamsB()) continue;

    const parts = computeIdentity(m.id, cfg.totalParamsB);
    const hit = registry.find(parts);
    if (hit) {
      if (addSource(hit, msSource(m.id))) summary.linked += 1;
      registry.register(parts, hit);
      setReleasedFallback(hit, msDate(m), null);
      continue;
    }

    const canonical = `ms:${m.id}`;
    registry.register(parts, canonical);
    seenCanonical.add(canonical);
    addSource(canonical, msSource(m.id));
    await insertDiscoveredRow(pool, {
      hfId: canonical,
      canonicalId: canonical,
      slugId: slugify('ms', m.id),
      name: m.id.split('/').pop() ?? m.id,
      provider: prod.producer,
      category: prod.category,
      capabilities: [],
      targetEnv: inferTargetEnv(cfg.totalParamsB),
      arch: toArch(cfg),
      downloads: m.downloads,
      likes: 0,
      description: null,
      pipeline: m.tasks[0] ?? null,
      sourceLabel: 'modelscope',
      sources: sourcesMap.get(canonical) ?? [msSource(m.id)],
      releasedAt: msDate(m),
      releasedLabel: null,
      verified: true,
    });
    setReleasedFallback(canonical, msDate(m), null);
    summary.discovered += 1;
  }

  // ---- Discovery: Ollama library ----
  for (const name of ollamaNames.slice(0, OLLAMA_DISCOVERY_MAX)) {
    const prod = resolveProducer(name);
    if (!prod) continue;
    if (isFormatBlocked(name) || isDerivativeBlocked(name)) continue;
    const om = await getOllama(ollamaCache, name);
    const sizes = om.sizesB.filter((s) => s >= getMinParamsB());
    if (sizes.length === 0) continue;

    // Merge onto any already-resolved identities (curated / discovered).
    let merged = false;
    for (const s of sizes) {
      const parts = computeIdentity(name, s);
      const hit = registry.find(parts);
      if (hit) {
        if (addSource(hit, ollamaSource(name))) summary.linked += 1;
        registry.register(parts, hit);
        if (om.updatedLabel) setReleasedFallback(hit, null, om.updatedLabel);
        merged = true;
      }
    }
    if (merged) continue;

    // New model: use the largest size as the representative row.
    const rep = Math.max(...sizes);
    const canonical = `ollama:${name}`;
    const parts = computeIdentity(name, rep);
    const hit = registry.find(parts);
    if (hit) {
      if (addSource(hit, ollamaSource(name))) summary.linked += 1;
      registry.register(parts, hit);
      continue;
    }
    registry.register(parts, canonical);
    seenCanonical.add(canonical);

    // Try to resolve the architecture from Hugging Face by family+size.
    const synthetic = `x/${name}-${formatSizeB(rep)}b`;
    const mirror = await fetchArchitectureFromMirrors(synthetic, rep);
    await sleep(INTER_REQUEST_DELAY_MS);

    const sourceLinks: SourceLink[] = [ollamaSource(name)];
    if (mirror) sourceLinks.push(hfSource(mirror.mirrorHfId));
    const arch: CatalogArchitecture = mirror
      ? toArch(mirror.cfg)
      : {
          totalParamsB: rep,
          activeParamsB: rep,
          numLayers: 0,
          numHeads: 0,
          numKvHeads: 0,
          headDim: 0,
          hiddenSize: 0,
          defaultContextLen: om.contextLen,
          maxContextLen: om.contextLen,
          isMoe: false,
          numExperts: null,
          activeExperts: null,
          expertIntermediateSize: null,
          numSharedExperts: 0,
          isMultimodal: modalitiesFromCapabilities(om.capabilities).some((m) => m !== 'text'),
          modalities: modalitiesFromCapabilities(om.capabilities),
          visionParamsB: 0,
        };

    await insertDiscoveredRow(pool, {
      hfId: canonical,
      canonicalId: canonical,
      slugId: slugify('ollama', name),
      name,
      provider: prod.producer,
      category: prod.category,
      capabilities: normalizeCapabilities(om.capabilities),
      targetEnv: inferTargetEnv(arch.totalParamsB),
      arch,
      downloads: null,
      likes: null,
      description: null,
      pipeline: null,
      sourceLabel: 'ollama',
      sources: sourceLinks,
      releasedAt: null,
      releasedLabel: om.updatedLabel,
      verified: Boolean(mirror),
    });
    if (om.updatedLabel) setReleasedFallback(canonical, null, om.updatedLabel);
    summary.discovered += 1;
  }

  // ---- Merge accumulated provider links / release fallbacks into rows ----
  for (const [canonical, links] of sourcesMap) {
    const prev = await pool.query(`SELECT sources FROM hf_models WHERE canonical_id = $1`, [canonical]);
    const existing: SourceLink[] = Array.isArray(prev.rows[0]?.sources) ? prev.rows[0].sources : [];
    const merged = dedupeSources([...existing, ...links]);
    const rel = releasedFallback.get(canonical);
    await pool.query(
      `UPDATE hf_models SET
         sources = $2::jsonb,
         released_at = COALESCE(released_at, $3),
         released_label = COALESCE(released_label, $4)
       WHERE canonical_id = $1`,
      [canonical, JSON.stringify(merged), rel?.at ?? null, rel?.label ?? null]
    );
  }

  // ---- Stale discovered rows: never deleted, just unverified ----
  if (seenCanonical.size > 0) {
    await pool.query(
      `UPDATE hf_models SET verified = false
        WHERE NOT curated
          AND (canonical_id IS NULL OR NOT (canonical_id = ANY($1::text[])))`,
      [Array.from(seenCanonical)]
    );
  }

  console.log(
    `[refresh] fetched=${summary.fetched} updated=${summary.updated} mirrored=${summary.mirrored} discovered=${summary.discovered} linked=${summary.linked} failed=${summary.failed.length}`
  );
  return summary;
}

interface DiscoverContext {
  registry: IdentityRegistry;
  sourcesMap: Map<string, SourceLink[]>;
  seenCanonical: Set<string>;
  summary: RefreshSummary;
  addSource: (canonical: string, link: SourceLink) => boolean;
  pool: Pool;
}

async function maybeDiscoverHf(
  repo: { id: string; downloads: number; pipelineTag: string | null },
  minDownloads: number,
  ctx: DiscoverContext
): Promise<void> {
  if (minDownloads > 0 && (repo.downloads ?? 0) < minDownloads) return;
  // Quantized/alt-format and derivative/fine-tune repos never enter the
  // catalog (they may still be used as mirror config sources).
  if (isFormatBlocked(repo.id) || isDerivativeBlocked(repo.id)) return;
  const prod = resolveProducer(repo.id);
  if (!prod) return;

  const cfg = await fetchModelConfig(repo.id);
  if (!cfg) return; // stale-mark unverifies existing rows that can't be validated
  if (cfg.totalParamsB < getMinParamsB()) return;

  const parts = computeIdentity(repo.id, cfg.totalParamsB);
  const hit = ctx.registry.find(parts);
  if (hit) {
    // Same real model as an existing row (curated or other provider): absorb
    // the link instead of creating a duplicate.
    if (ctx.addSource(hit, hfSource(repo.id))) ctx.summary.linked += 1;
    ctx.registry.register(parts, hit);
    return;
  }

  const canonical = repo.id;
  ctx.registry.register(parts, canonical);
  ctx.seenCanonical.add(canonical);
  ctx.addSource(canonical, hfSource(repo.id));
  await insertDiscoveredRow(ctx.pool, {
    hfId: repo.id,
    canonicalId: canonical,
    slugId: slugify('hf', repo.id),
    name: repo.id.split('/')[1] ?? repo.id,
    provider: prod.producer,
    category: prod.category,
    capabilities: [],
    targetEnv: inferTargetEnv(cfg.totalParamsB),
    arch: toArch(cfg),
    downloads: repo.downloads,
    likes: 0,
    description: null,
    pipeline: repo.pipelineTag ?? null,
    sourceLabel: 'huggingface',
    sources: ctx.sourcesMap.get(canonical) ?? [hfSource(repo.id)],
    releasedAt: cfg.releasedAt,
    releasedLabel: null,
    verified: true,
  });
  ctx.summary.discovered += 1;
}

// ---------------------------------------------------------------------------
// Matching helpers
// ---------------------------------------------------------------------------

function matchModelScope(models: ModelScopeModel[], id: string, sizeB: number | null | undefined): ModelScopeModel | null {
  const target = computeIdentity(id, sizeB ?? null);
  let best: ModelScopeModel | null = null;
  let bestDiff = Infinity;
  for (const m of models) {
    const parts = computeIdentity(m.id, null);
    if (parts.producer !== target.producer || parts.family !== target.family) continue;
    if (!sizeMatches(parts.sizeB, target.sizeB)) continue;
    const diff = parts.sizeB && target.sizeB ? Math.abs(Math.log(parts.sizeB / target.sizeB)) : 1;
    if (diff < bestDiff) {
      bestDiff = diff;
      best = m;
    }
  }
  return best;
}

async function matchOllama(
  names: string[],
  cache: Map<string, OllamaModel>,
  id: string,
  sizeB: number | null | undefined
): Promise<{ name: string; model: OllamaModel; sizeB: number | null } | null> {
  const target = computeIdentity(id, sizeB ?? null);
  let best: { name: string; model: OllamaModel; sizeB: number | null } | null = null;
  let bestDiff = Infinity;
  for (const name of names) {
    const baseParts = computeIdentity(name, null);
    if (baseParts.producer !== target.producer || baseParts.family !== target.family) continue;
    const model = await getOllama(cache, name);
    for (const s of model.sizesB) {
      if (!sizeMatches(s, target.sizeB)) continue;
      const diff = target.sizeB && s ? Math.abs(Math.log(s / target.sizeB)) : 1;
      if (diff < bestDiff) {
        bestDiff = diff;
        best = { name, model, sizeB: s };
      }
    }
    if (!best && model.sizesB.length === 0) {
      best = { name, model, sizeB: null };
      bestDiff = 2;
    }
  }
  return best;
}

async function getOllama(cache: Map<string, OllamaModel>, name: string): Promise<OllamaModel> {
  const cached = cache.get(name);
  if (cached) return cached;
  const model = await fetchOllamaModel(name);
  cache.set(name, model);
  await sleep(120);
  return model;
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

function toArch(cfg: ModelConfig): CatalogArchitecture {
  return {
    totalParamsB: cfg.totalParamsB,
    activeParamsB: cfg.activeParamsB,
    numLayers: cfg.numLayers,
    numHeads: cfg.numHeads,
    numKvHeads: cfg.numKvHeads,
    headDim: cfg.headDim,
    hiddenSize: cfg.hiddenSize,
    defaultContextLen: cfg.defaultContextLen,
    maxContextLen: cfg.maxContextLen,
    isMoe: cfg.isMoe,
    numExperts: cfg.numExperts,
    activeExperts: cfg.activeExperts,
    expertIntermediateSize: cfg.expertIntermediateSize,
    numSharedExperts: cfg.numSharedExperts,
    isMultimodal: cfg.isMultimodal,
    modalities: cfg.modalities,
    visionParamsB: cfg.visionParamsB,
  };
}

function rowValues(row: DiscoveredRow): any[] {
  const a = row.arch;
  return [
    row.hfId,
    row.slugId,
    row.canonicalId,
    row.name,
    row.provider,
    row.category,
    row.capabilities,
    row.targetEnv,
    a.totalParamsB,
    a.activeParamsB,
    a.numLayers,
    a.numHeads,
    a.numKvHeads,
    a.headDim,
    a.hiddenSize,
    a.defaultContextLen,
    a.maxContextLen,
    a.isMoe,
    a.numExperts,
    a.activeExperts,
    row.downloads,
    row.likes,
    row.description,
    row.sourceLabel,
    row.pipeline,
    row.verified,
    JSON.stringify(row.sources),
    row.releasedAt,
    row.releasedLabel,
    a.isMultimodal,
    a.modalities,
    a.visionParamsB,
    a.expertIntermediateSize,
    a.numSharedExperts,
  ];
}

async function insertDiscoveredRow(pool: Pool, row: DiscoveredRow): Promise<void> {
  const v = rowValues(row);
  await pool.query(
    `INSERT INTO hf_models
      (hf_id, slug_id, canonical_id, name, provider, category, capabilities, target_env, curated,
       total_params_b, active_params_b, num_layers, num_heads, num_kv_heads, head_dim,
       hidden_size, default_context_len, max_context_len, is_moe, num_experts, active_experts,
       downloads, likes, description, raw_json, verified,
       sources, released_at, released_label,
       is_multimodal, modalities, vision_params_b, expert_intermediate_size, num_shared_experts)
     VALUES ($1, $2, $3, $4, $5, $6, $7::text[], $8, false,
       $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
       $21, $22, $23, jsonb_build_object('source', $24::text, 'pipeline', $25::text), $26,
       $27::jsonb, $28, $29, $30, $31::text[], $32, $33, $34)
     ON CONFLICT (hf_id) DO UPDATE SET
       slug_id = EXCLUDED.slug_id,
       canonical_id = COALESCE(hf_models.canonical_id, EXCLUDED.canonical_id),
       name = EXCLUDED.name,
       provider = EXCLUDED.provider,
       category = EXCLUDED.category,
       capabilities = EXCLUDED.capabilities,
       target_env = EXCLUDED.target_env,
       total_params_b = EXCLUDED.total_params_b,
       active_params_b = EXCLUDED.active_params_b,
       num_layers = EXCLUDED.num_layers,
       num_heads = EXCLUDED.num_heads,
       num_kv_heads = EXCLUDED.num_kv_heads,
       head_dim = EXCLUDED.head_dim,
       hidden_size = EXCLUDED.hidden_size,
       default_context_len = EXCLUDED.default_context_len,
       max_context_len = EXCLUDED.max_context_len,
       is_moe = EXCLUDED.is_moe,
       num_experts = EXCLUDED.num_experts,
       active_experts = EXCLUDED.active_experts,
       downloads = EXCLUDED.downloads,
       likes = EXCLUDED.likes,
       description = EXCLUDED.description,
       raw_json = EXCLUDED.raw_json,
       verified = EXCLUDED.verified,
       sources = EXCLUDED.sources,
       released_at = COALESCE(EXCLUDED.released_at, hf_models.released_at),
       released_label = COALESCE(EXCLUDED.released_label, hf_models.released_label),
       is_multimodal = EXCLUDED.is_multimodal,
       modalities = EXCLUDED.modalities,
       vision_params_b = EXCLUDED.vision_params_b,
       expert_intermediate_size = EXCLUDED.expert_intermediate_size,
       num_shared_experts = EXCLUDED.num_shared_experts,
       scraped_at = now()`,
    v
  );
}

// ---------------------------------------------------------------------------
// Misc helpers
// ---------------------------------------------------------------------------

function hfSource(id: string): SourceLink {
  return { provider: 'huggingface', id, url: `https://huggingface.co/${id}` };
}
function msSource(id: string): SourceLink {
  return { provider: 'modelscope', id, url: `https://modelscope.cn/models/${id}` };
}
function ollamaSource(name: string): SourceLink {
  return { provider: 'ollama', id: name, url: `https://ollama.com/library/${name}` };
}

function dedupeSources(links: SourceLink[]): SourceLink[] {
  const out: SourceLink[] = [];
  for (const l of links) {
    if (!out.some((s) => s.provider === l.provider && s.id === l.id)) out.push(l);
  }
  return out;
}

function msDate(m: ModelScopeModel): string | null {
  return m.createdTime ? new Date(m.createdTime * 1000).toISOString() : null;
}

function slugify(prefix: string, value: string): string {
  return `${prefix}-${value.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()}`;
}

function mergeModalities(cfgModalities: string[], ollama?: OllamaModel): string[] {
  const set = new Set<string>(cfgModalities.length ? cfgModalities : ['text']);
  set.add('text');
  if (ollama) for (const m of modalitiesFromCapabilities(ollama.capabilities)) set.add(m);
  return Array.from(set);
}

function modalitiesFromCapabilities(capabilities: string[]): string[] {
  const set = new Set<string>(['text']);
  for (const c of capabilities) {
    const l = c.toLowerCase();
    if (l.includes('image') || l.includes('vision')) set.add('image');
    if (l.includes('audio') || l.includes('speech')) set.add('audio');
  }
  return Array.from(set);
}

function normalizeCapabilities(capabilities: string[]): string[] {
  const out: string[] = [];
  for (const c of capabilities) {
    const t = c.trim();
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

// ModelScope task names that are text-capable LLMs. Unknown/no task passes;
// media-generation / ASR / embedding pipelines are rejected.
const TEXT_TASK_RE = /(text-generation|text2text|chat|image-text-to-text|visual-question|document-question|question-answering)/i;
const BLOCKED_TASK_RE = /(text.?to.?image|text2image|txt2img|image.?to.?image|image2image|text.?to.?video|image.?to.?video|text.?to.?speech|text2speech|tts|audio|speech|diffusion|image-synthesis|image-generation|embedding|rerank|ocr|segmentation|detection|classification|summarization|translation)/i;
function isTextTaskList(tasks: string[]): boolean {
  if (!tasks || tasks.length === 0) return true;
  if (tasks.some((t) => TEXT_TASK_RE.test(t))) return true;
  return tasks.every((t) => !BLOCKED_TASK_RE.test(t));
}

function inferTargetEnv(paramsB: number): 'edge' | 'local' | 'hybrid' | 'server' {
  if (paramsB <= 4) return 'edge';
  if (paramsB <= 13) return 'local';
  if (paramsB <= 50) return 'hybrid';
  return 'server';
}

function paramsInRange(actual: number, expected?: number): boolean {
  if (!expected || expected <= 0 || !actual || actual <= 0) return false;
  const ratio = actual / expected;
  return ratio >= 0.75 && ratio <= 1.25;
}
