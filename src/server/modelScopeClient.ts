// ModelScope Hub client (server-side, no auth needed for public reads).
// Used by the multi-provider model refresh to attach ModelScope links and to
// discover models that are not on the Hugging Face Hub.
import { ModelConfig, fetchWithRetry, sleep, toModelConfig } from './modelConfig';

const MS_API = 'https://modelscope.cn/api/v1';
const MS_WEB = 'https://modelscope.cn';
const MS_MAX_PAGE_SIZE = 50;

export interface ModelScopeModel {
  id: string; // "Path/Name", e.g. "deepseek-ai/DeepSeek-V3"
  createdTime: number | null; // unix seconds
  downloads: number;
  license: string | null;
  tasks: string[];
  architectures: string[];
  isOnline: boolean;
  supportInference: boolean;
}

// Module-level cache so a single refresh run pages the (huge) ModelScope
// catalog at most once while still serving both link-matching and discovery.
let libraryCache: ModelScopeModel[] | null = null;
let libraryCacheAt = 0;
const LIBRARY_TTL_MS = 10 * 60 * 1000;

// One page of the public model listing. The endpoint is a POST-style PUT with
// a JSON body; PageSize is capped at 50 by the API.
export async function listModelScopeModels(
  pageSize = MS_MAX_PAGE_SIZE,
  pageNumber = 1
): Promise<ModelScopeModel[]> {
  const size = Math.min(Math.max(1, Math.floor(pageSize)), MS_MAX_PAGE_SIZE);
  const page = Math.max(1, Math.floor(pageNumber));
  const res = await fetchWithRetry(
    `${MS_API}/models`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ PageSize: size, PageNumber: page }),
    },
    'modelscope'
  );
  if (!res) return [];
  try {
    const data = (await res.json()) as any;
    return mapModels(data?.Data?.Models);
  } catch (err: any) {
    console.error('[modelscope] list json error:', err?.message);
    return [];
  }
}

// Bounded paged scan of the most popular/recent ModelScope models. Cached for
// the duration of a refresh run.
export async function getModelScopeTopModels(maxEntries = 600): Promise<ModelScopeModel[]> {
  const now = Date.now();
  if (libraryCache && now - libraryCacheAt < LIBRARY_TTL_MS && libraryCache.length >= maxEntries) {
    return libraryCache;
  }
  if (libraryCache && now - libraryCacheAt < LIBRARY_TTL_MS && libraryCache.length > 0) {
    return libraryCache;
  }
  const pages = Math.ceil(maxEntries / MS_MAX_PAGE_SIZE);
  const all: ModelScopeModel[] = [];
  for (let page = 1; page <= pages; page++) {
    const batch = await listModelScopeModels(MS_MAX_PAGE_SIZE, page);
    if (batch.length === 0) break;
    all.push(...batch);
    if (all.length >= maxEntries) break;
    await sleep(200);
  }
  libraryCache = all;
  libraryCacheAt = now;
  return all;
}

// Family+size search over the cached listing. Kept simple: substring match on
// the id, ordered by the catalog's own (popularity) order.
export async function searchModelScopeModels(familySize: string, limit = 5): Promise<ModelScopeModel[]> {
  if (!familySize) return [];
  const key = familySize.toLowerCase();
  const all = await getModelScopeTopModels();
  const out: ModelScopeModel[] = [];
  for (const m of all) {
    if (m.id.toLowerCase().includes(key)) {
      out.push(m);
      if (out.length >= limit) break;
    }
  }
  return out;
}

// Fetch a model's standard transformers config.json from ModelScope and parse
// it with the shared parser. Returns null when the file is missing or has no
// usable hyperparameters (e.g. diffusion checkpoints).
export async function fetchModelScopeConfig(nsName: string): Promise<ModelConfig | null> {
  const id = nsName.replace(/^\/+/, '');
  const res = await fetchWithRetry(
    `${MS_WEB}/models/${id}/resolve/master/config.json`,
    { headers: { Accept: 'application/json' } },
    'modelscope'
  );
  if (!res) return null;
  let raw: any;
  try {
    raw = await res.json();
  } catch {
    return null;
  }
  const cfg = toModelConfig(raw, 0, { modelType: raw?.model_type });
  if (!cfg || cfg.numLayers <= 0 || cfg.hiddenSize <= 0) return null;
  return cfg;
}

function mapModels(list: any): ModelScopeModel[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((m) => m && typeof m.Name === 'string' && m.Name.length > 0)
    .map((m) => ({
      id: typeof m.Path === 'string' && m.Path.length > 0 ? `${m.Path}/${m.Name}` : m.Name,
      createdTime:
        typeof m.CreatedTime === 'number' && m.CreatedTime > 0 ? m.CreatedTime : null,
      downloads: Number(m.Downloads ?? 0) || 0,
      license: typeof m.License === 'string' ? m.License : null,
      tasks: Array.isArray(m.Tasks)
        ? m.Tasks.map((t: any) => String(t?.Name ?? '')).filter(Boolean)
        : [],
      architectures: Array.isArray(m.Architectures) ? m.Architectures.map(String) : [],
      isOnline: Boolean(m.IsOnline),
      supportInference: Boolean(m.SupportInference),
    }));
}
