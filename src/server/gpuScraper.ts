import { getPool } from './db';

export interface ScrapedGpuRow {
  gpuSlug: string;
  gpuName: string;
  vramGb: number | null;
  pricePerHrUsd: number;
  priceModel: string | null;
  rawJson: Record<string, unknown>;
}

export interface GpuSyncSummary {
  providers: Array<{ provider: string; count: number; error?: string }>;
  total: number;
  completedAt: string;
}

const RUNPOD_URL = 'https://www.runpod.io/pricing';
const MODAL_URL = 'https://modal.com/pricing';
const LAMBDA_URL = 'https://lambda.ai/pricing';

const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0 Safari/537.36';

// Mirrors scripts/scraper/common.py GPU_SLUG_PATTERNS. First match wins,
// so order from most specific to least. Input is lowercased before matching.
const GPU_SLUG_PATTERNS: Array<[RegExp, string]> = [
  [/\bh100\s+nvl\b/, 'nvidia-h100-nvl'],
  [/\bh100\s+pcie\b/, 'nvidia-h100-pcie'],
  [/\bh100\s+sxm5?\b/, 'nvidia-h100-sxm'],
  [/\bh100\b/, 'nvidia-h100-sxm'],
  [/\bh200\s+sxm\b/, 'nvidia-h200'],
  [/\bh200\b/, 'nvidia-h200'],
  [/\bb200\b/, 'nvidia-b200'],
  [/\bb300\b/, 'nvidia-b300'],
  [/\bgb200\b/, 'nvidia-gb200-nvl'],
  [/\bgh200\b/, 'nvidia-gh200'],
  [/\ba100\b.*\bpcie\b/, 'nvidia-a100-40g'],
  [/\ba100\b.*\b40\s*gb\b/, 'nvidia-a100-40g'],
  [/\ba100\b/, 'nvidia-a100-80g'],
  [/\ba10g?\b/, 'nvidia-a10g'],
  [/\ba40\b/, 'nvidia-a40'],
  [/\bl40s\b/, 'nvidia-l40s'],
  [/\bl40\b/, 'nvidia-l40'],
  [/\bl4\b/, 'nvidia-l4'],
  [/\bt4\b/, 'nvidia-tesla-t4'],
  [/\bmi300x\b/, 'amd-mi300x'],
  [/\brtx\s+pro\s+6000\b/, 'nvidia-rtx-6000-ada'],
  [/\brtx\s+6000\s+ada\b/, 'nvidia-rtx-6000-ada'],
  [/\brtx\s+a6000\b/, 'nvidia-rtx-a6000'],
  [/\ba6000\b/, 'nvidia-rtx-a6000'],
  [/\brtx\s+5000\s+ada\b/, 'nvidia-rtx-5000-ada'],
  [/\brtx\s+a5000\b/, 'nvidia-rtx-a5000'],
  [/\ba5000\b/, 'nvidia-rtx-a5000'],
  [/\brtx\s+a4500\b/, 'nvidia-rtx-a4500'],
  [/\brtx\s+a4000\b/, 'nvidia-rtx-a4000'],
  [/\brtx\s+5090\b/, 'nvidia-rtx-5090'],
  [/\brtx\s+5080\b/, 'nvidia-rtx-5080'],
  [/\brtx\s+4090\b/, 'nvidia-rtx-4090'],
  [/\brtx\s+4080\b/, 'nvidia-rtx-4080-super'],
  [/\brtx\s+4070\b/, 'nvidia-rtx-4070ti-super'],
  [/\brtx\s+3090\b/, 'nvidia-rtx-3090'],
];

export function slugifyGpu(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug ? `gpu-${slug}` : 'gpu-unknown';
}

export function normalizeGpuName(name: string): string {
  const lowered = (name || '').toLowerCase();
  for (const [pattern, slug] of GPU_SLUG_PATTERNS) {
    if (pattern.test(lowered)) return slug;
  }
  return slugifyGpu(name || '');
}

export function parsePriceUsd(text: string): number | null {
  if (!text) return null;
  const match = text.match(/\$\s?([0-9]+(?:\.[0-9]+)?)/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractPriceText(html: string): string | null {
  const match = html.match(/<([a-z0-9]+)\b[^>]*class="[^"]*\bprice\b[^"]*"[^>]*>([\s\S]*?)<\/\1>/i);
  return match ? stripTags(match[2]) : null;
}

async function fetchHtml(url: string, timeoutMs = 30000): Promise<string> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en-US,en;q=0.9' },
        signal: controller.signal,
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.text();
    } catch (err) {
      lastErr = err;
      await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`Failed to fetch ${url}: ${(lastErr as Error)?.message}`);
}

export async function scrapeRunpod(): Promise<ScrapedGpuRow[]> {
  const html = await fetchHtml(RUNPOD_URL);
  const rows: ScrapedGpuRow[] = [];
  const blocks = html.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi) || [];
  for (const block of blocks) {
    const jsonText = block.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
    let data: unknown;
    try {
      data = JSON.parse(jsonText);
    } catch {
      continue;
    }
    const graph = (data as { '@graph'?: unknown } | null)?.['@graph'];
    if (!Array.isArray(graph)) continue;
    for (const item of graph) {
      if (!item || typeof item !== 'object') continue;
      const product = item as { '@type'?: string; name?: string; offers?: unknown };
      if (product['@type'] !== 'Product') continue;
      const gpuName = (product.name || '').trim().replace(/\s+GPU\s+on\s+Runpod\s*$/i, '').trim();
      if (!gpuName) continue;
      const offers = (product.offers ?? {}) as {
        '@type'?: string;
        lowPrice?: string | number;
        highPrice?: string | number;
        offers?: unknown;
      };
      if (offers['@type'] !== 'AggregateOffer') continue;
      const low = Number(offers.lowPrice || 0);
      const high = Number(offers.highPrice || 0);
      if (!Number.isFinite(high) || high <= 0) continue;
      rows.push({
        gpuSlug: normalizeGpuName(gpuName),
        gpuName,
        vramGb: null,
        pricePerHrUsd: high,
        priceModel: 'Secure Cloud (On-Demand)',
        rawJson: {
          community_price_per_hr_usd: low,
          secure_price_per_hr_usd: high,
          offers: offers.offers ?? [],
          url: RUNPOD_URL,
        },
      });
    }
  }
  return rows;
}

export async function scrapeModal(): Promise<ScrapedGpuRow[]> {
  const html = await fetchHtml(MODAL_URL);
  const rows: ScrapedGpuRow[] = [];
  const chunks = html.split(/<div[^>]*class="[^"]*\bline-item\b[^"]*"[^>]*>/i).slice(1);
  for (const chunk of chunks) {
    const item = chunk.split(/<div[^>]*class="[^"]*\bline-item\b[^"]*"[^>]*>/i)[0];
    const nameMatch = item.match(/<p[^>]*>[\s\S]*?<\/p>/i);
    if (!nameMatch) continue;
    const name = stripTags(nameMatch[0]);
    if (!name.toLowerCase().startsWith('nvidia')) continue;
    const priceText = extractPriceText(item);
    if (priceText === null) continue;
    const perSec = parsePriceUsd(priceText);
    if (perSec === null) continue;
    rows.push({
      gpuSlug: normalizeGpuName(name),
      gpuName: name,
      vramGb: null,
      pricePerHrUsd: Number((perSec * 3600).toFixed(6)),
      priceModel: 'Per-Second (Scale-to-Zero) -> per hour',
      rawJson: { price_per_sec_usd: perSec, url: MODAL_URL },
    });
  }
  return rows;
}

export async function scrapeLambda(): Promise<ScrapedGpuRow[]> {
  const html = await fetchHtml(LAMBDA_URL);
  const best: Record<string, { plan: string; price: number }> = {};
  const tables = html.match(/<table[\s\S]*?<\/table>/gi) || [];
  for (const table of tables) {
    const headers = (table.match(/<th\b[^>]*>[\s\S]*?<\/th>/gi) || []).map((t) =>
      stripTags(t).toLowerCase()
    );
    const priceColIdx = headers.findIndex((h) => h.includes('price/gpu/hr'));
    if (priceColIdx === -1) continue;
    const trs = table.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) || [];
    for (const tr of trs) {
      const cells = tr.match(/<(?:th|td)\b[^>]*>[\s\S]*?<\/(?:th|td)>/gi) || [];
      if (cells.length <= priceColIdx) continue;
      const planAttr = tr.match(/data-plan="([^"]*)"/i);
      const plan = (planAttr ? planAttr[1] : stripTags(cells[0])).trim();
      if (!plan) continue;
      const price = parsePriceUsd(stripTags(cells[priceColIdx]));
      if (price === null || price <= 0) continue;
      const slug = normalizeGpuName(plan);
      if (!best[slug] || price < best[slug].price) {
        best[slug] = { plan, price };
      }
    }
  }
  return Object.entries(best).map(([slug, { plan, price }]) => ({
    gpuSlug: slug,
    gpuName: plan,
    vramGb: null,
    pricePerHrUsd: price,
    priceModel: 'On-Demand / Cluster (PRICE/GPU/HR)',
    rawJson: { url: LAMBDA_URL },
  }));
}

async function insertPrices(provider: string, rows: ScrapedGpuRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  const pool = getPool();
  for (const row of rows) {
    await pool.query(
      `INSERT INTO gpu_prices
         (provider, gpu_slug, gpu_name, vram_gb, price_per_hr_usd, price_model, raw_json, scraped_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
      [
        provider,
        row.gpuSlug,
        row.gpuName,
        row.vramGb,
        row.pricePerHrUsd,
        row.priceModel,
        JSON.stringify(row.rawJson),
      ]
    );
  }
  return rows.length;
}

let gpuSyncInFlight = false;

export async function syncGpuPrices(): Promise<GpuSyncSummary> {
  if (gpuSyncInFlight) throw new Error('GPU fiyat güncellemesi zaten çalışıyor.');
  gpuSyncInFlight = true;
  try {
    const results: Array<{ provider: string; count: number; error?: string }> = [];
    const scrapers: Array<[string, () => Promise<ScrapedGpuRow[]>]> = [
      ['runpod', scrapeRunpod],
      ['modal', scrapeModal],
      ['lambda', scrapeLambda],
    ];
    for (const [provider, scrape] of scrapers) {
      try {
        const rows = await scrape();
        const inserted = await insertPrices(provider, rows);
        results.push({ provider, count: inserted });
      } catch (err) {
        results.push({ provider, count: 0, error: (err as Error)?.message });
      }
    }
    return {
      providers: results,
      total: results.reduce((sum, r) => sum + r.count, 0),
      completedAt: new Date().toISOString(),
    };
  } finally {
    gpuSyncInFlight = false;
  }
}