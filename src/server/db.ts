import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    // Managed providers (Render/Neon/Supabase) require SSL. node-postgres
    // honors an explicit ?sslmode= in the URL; for hosts without it we enable
    // SSL for anything that is not a local database.
    const useSsl =
      !!connectionString &&
      !/sslmode/.test(connectionString) &&
      !/localhost|127\.0\.0\.1/.test(connectionString);
    pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
    });
    pool.on('error', (err) => {
      console.error('PostgreSQL pool error:', err);
    });
  }
  return pool;
}

const SCHEMA_SQL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Legacy auth/scenario tables (Google OAuth was removed; scenarios now live
-- in the browser's localStorage). Drop order respects foreign keys.
DROP TABLE IF EXISTS scenarios;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;

CREATE TABLE IF NOT EXISTS gpu_prices (
  id BIGSERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  gpu_slug TEXT NOT NULL,
  gpu_name TEXT NOT NULL,
  vram_gb NUMERIC,
  price_per_hr_usd NUMERIC NOT NULL,
  price_model TEXT,
  raw_json JSONB,
  scraped_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_gpu_prices_provider ON gpu_prices(provider, gpu_slug, scraped_at DESC);

CREATE TABLE IF NOT EXISTS hf_models (
  id BIGSERIAL PRIMARY KEY,
  hf_id TEXT NOT NULL,
  slug_id TEXT,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  category TEXT,
  capabilities TEXT[] NOT NULL DEFAULT '{}',
  target_env TEXT,
  curated BOOLEAN NOT NULL DEFAULT false,
  total_params_b NUMERIC NOT NULL,
  active_params_b NUMERIC NOT NULL,
  num_layers INTEGER NOT NULL,
  num_heads INTEGER NOT NULL,
  num_kv_heads INTEGER NOT NULL,
  head_dim INTEGER NOT NULL,
  hidden_size INTEGER NOT NULL,
  default_context_len INTEGER NOT NULL,
  max_context_len INTEGER NOT NULL,
  is_moe BOOLEAN NOT NULL,
  num_experts INTEGER,
  active_experts INTEGER,
  downloads BIGINT,
  likes INTEGER,
  description TEXT,
  raw_json JSONB,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified BOOLEAN NOT NULL DEFAULT false
);

-- Migrations for pre-existing catalogs (added columns + unique hf_id).
-- Must run BEFORE the index creation below (indexes reference these columns).
ALTER TABLE hf_models ADD COLUMN IF NOT EXISTS slug_id TEXT;
ALTER TABLE hf_models ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE hf_models ADD COLUMN IF NOT EXISTS capabilities TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE hf_models ADD COLUMN IF NOT EXISTS target_env TEXT;
ALTER TABLE hf_models ADD COLUMN IF NOT EXISTS curated BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE hf_models ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false;

-- Drop the old per-snapshot index (replaced by the unique hf_id catalog key).
DROP INDEX IF EXISTS idx_hf_models_hf_id;

-- Keep only the newest row per hf_id from legacy scrapes, then enforce UNIQUE.
DELETE FROM hf_models a
  USING hf_models b
  WHERE a.hf_id = b.hf_id AND a.scraped_at < b.scraped_at;
CREATE UNIQUE INDEX IF NOT EXISTS idx_hf_models_hf_id_unique ON hf_models(hf_id);

CREATE INDEX IF NOT EXISTS idx_hf_models_slug_id ON hf_models(slug_id);
CREATE INDEX IF NOT EXISTS idx_hf_models_category ON hf_models(category);
CREATE INDEX IF NOT EXISTS idx_hf_models_target_env ON hf_models(target_env);
`;

export async function runMigrations(): Promise<void> {
  const p = getPool();
  await p.query(SCHEMA_SQL);
  console.log('Database schema ready.');
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}