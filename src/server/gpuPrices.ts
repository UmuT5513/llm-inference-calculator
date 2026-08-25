import express from 'express';
import { getPool } from './db';
import { requireAdminSession } from './adminAuth';
import { syncGpuPrices } from './gpuScraper';

export const gpuPricesRouter = express.Router();

export interface GpuPriceRow {
  id: string;
  provider: string;
  gpuSlug: string;
  gpuName: string;
  vramGb: number | null;
  pricePerHrUsd: number;
  priceModel: string | null;
  scrapedAt: string;
}

// Latest price per provider + gpu_slug (one row per provider/slug)
gpuPricesRouter.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT DISTINCT ON (provider, gpu_slug)
         id, provider, gpu_slug, gpu_name, vram_gb, price_per_hr_usd, price_model, scraped_at
       FROM gpu_prices
       ORDER BY provider, gpu_slug, scraped_at DESC`
    );
    const rows: GpuPriceRow[] = result.rows.map((r) => ({
      id: r.id,
      provider: r.provider,
      gpuSlug: r.gpu_slug,
      gpuName: r.gpu_name,
      vramGb: r.vram_gb != null ? Number(r.vram_gb) : null,
      pricePerHrUsd: Number(r.price_per_hr_usd),
      priceModel: r.price_model,
      scrapedAt: r.scraped_at,
    }));
    res.json({ prices: rows });
  } catch (err: any) {
    console.error('List gpu prices error:', err?.message);
    res.status(500).json({ error: 'GPU fiyatları yüklenemedi.' });
  }
});

// Admin hook: re-scrape RunPod/Lambda/Modal and write new price rows on demand.
// Requires the local admin session (ADMIN_USERNAME/ADMIN_PASSWORD). A concurrent
// run is rejected with 409; a provider failure is reported per-provider
// instead of failing all.
gpuPricesRouter.post('/refresh', requireAdminSession, async (req, res) => {
  try {
    const summary = await syncGpuPrices();
    res.json({ ok: true, summary });
  } catch (err: any) {
    if (err?.message === 'GPU fiyat güncellemesi zaten çalışıyor.') {
      res.status(409).json({ error: err.message });
      return;
    }
    console.error('Refresh GPU prices error:', err?.message);
    res.status(500).json({ error: 'GPU fiyatları güncellenemedi.' });
  }
});

// Price history for a specific provider + slug (for the prices card history view)
gpuPricesRouter.get('/history/:provider/:slug', async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT id, provider, gpu_slug, gpu_name, price_per_hr_usd, price_model, scraped_at
       FROM gpu_prices
       WHERE provider = $1 AND gpu_slug = $2
       ORDER BY scraped_at DESC
       LIMIT 30`,
      [req.params.provider, req.params.slug]
    );
    res.json({ history: result.rows });
  } catch (err: any) {
    console.error('GPU price history error:', err?.message);
    res.status(500).json({ error: 'Fiyat geçmişi yüklenemedi.' });
  }
});