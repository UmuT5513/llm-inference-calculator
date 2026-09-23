// Ollama library client (server-side). Ollama has no official JSON API for the
// public library, so this scrapes the HTML with regexes (no cheerio — deps are
// intentionally unchanged). Sparse by design: architecture comes from an HF /
// ModelScope match, or the row is inserted unverified.
import { fetchWithRetry } from './modelConfig';

const OLLAMA = 'https://ollama.com';

export interface OllamaModel {
  name: string; // library name without tag, e.g. "llama3.1"
  sizesB: number[]; // parameter sizes found in tags, ascending
  contextLen: number; // max context window found (tokens)
  capabilities: string[]; // e.g. ["Text", "Image", "Tools", "Thinking"]
  updatedLabel: string | null; // relative "Updated X ago" text
}

// Scrape the library index for model names. `sort` maps to the site's
// ?sort=popular / ?sort=newest views; the default view is already
// popularity-ordered.
export async function listOllamaLibrary(
  limit = 200,
  sort?: 'popular' | 'newest'
): Promise<string[]> {
  const url = sort ? `${OLLAMA}/library?sort=${sort}` : `${OLLAMA}/library`;
  const res = await fetchWithRetry(
    url,
    { headers: { Accept: 'text/html', 'User-Agent': 'llm-inference-calculator/1.0' } },
    'ollama'
  );
  if (!res) return [];
  let html: string;
  try {
    html = await res.text();
  } catch {
    return [];
  }
  const names: string[] = [];
  const seen = new Set<string>();
  const re = /href="\/library\/([^"?#]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const name = m[1];
    // Skip tag links (name:tag) and nested paths.
    if (!name || name.includes(':') || name.includes('/')) continue;
    if (seen.has(name)) continue;
    seen.add(name);
    names.push(name);
    if (names.length >= limit) break;
  }
  return names;
}

// Scrape one library model page for tag sizes, context window, capabilities and
// the relative "updated" label.
export async function fetchOllamaModel(name: string): Promise<OllamaModel> {
  const empty: OllamaModel = { name, sizesB: [], contextLen: 0, capabilities: [], updatedLabel: null };
  const res = await fetchWithRetry(
    `${OLLAMA}/library/${encodeURIComponent(name)}`,
    { headers: { Accept: 'text/html', 'User-Agent': 'llm-inference-calculator/1.0' } },
    'ollama'
  );
  if (!res) return empty;
  let html: string;
  try {
    html = await res.text();
  } catch {
    return empty;
  }
  return parseOllamaHtml(name, html);
}

export function parseOllamaHtml(name: string, html: string): OllamaModel {
  const sizes = new Set<number>();
  const contexts: number[] = [];
  const caps = new Set<string>();

  // Tag links carry the parameter size, e.g. href="/library/qwen3:30b-a3b".
  const tagRe = /href="\/library\/[^"/]+:([^"?#]+)"/g;
  let tm: RegExpExecArray | null;
  while ((tm = tagRe.exec(html))) {
    const size = parseSizeToken(tm[1]);
    if (size != null) sizes.add(size);
  }

  // Each size row ends with "<size> · <context> context window · <caps> · <age>".
  const rowRe = /([\d.]+[KMG]?B)\s*·\s*([\d.]+[KM]?)\s*context window\s*·\s*([^<]+)/g;
  let rm: RegExpExecArray | null;
  while ((rm = rowRe.exec(html))) {
    const ctx = parseContext(rm[2]);
    if (ctx > 0) contexts.push(ctx);
    // Capabilities are comma-separated and end before the trailing " · <age>".
    const capsPart = rm[3].split('·')[0];
    for (const c of capsPart.split(',')) {
      const t = c.trim();
      if (t) caps.add(t);
    }
  }

  // Fallbacks for sizes spelled in prose ("31B (Dense)", "3.5B effective").
  if (sizes.size === 0) {
    const bodyRe = /(\d+(?:\.\d+)?)\s*[bB]\s*\((?:Dense|dense|effective|Effective)\)/g;
    let bm: RegExpExecArray | null;
    while ((bm = bodyRe.exec(html))) {
      const n = Number(bm[1]);
      if (Number.isFinite(n) && n > 0) sizes.add(n);
    }
  }

  return {
    name,
    sizesB: Array.from(sizes).sort((a, b) => a - b),
    contextLen: contexts.length ? Math.max(...contexts) : 0,
    capabilities: Array.from(caps),
    updatedLabel: parseUpdated(html),
  };
}

function parseSizeToken(token: string): number | null {
  const m = /^(\d+(?:\.\d+)?)b(?:$|[-_.])/i.exec(token);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseContext(value: string): number {
  const m = /^(\d+(?:\.\d+)?)\s*([KM])?/i.exec(value.trim());
  if (!m) return 0;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return 0;
  const unit = (m[2] || '').toUpperCase();
  if (unit === 'K') return Math.round(n * 1024);
  if (unit === 'M') return Math.round(n * 1024 * 1024);
  return Math.round(n);
}

function parseUpdated(html: string): string | null {
  let m = /Updated&nbsp;<\/span>\s*<span[^>]*>([^<]+)/i.exec(html);
  if (!m) m = /Updated\s*<\/span>\s*<span[^>]*>([^<]+)/i.exec(html);
  const label = m?.[1]?.trim();
  return label ? label : null;
}
