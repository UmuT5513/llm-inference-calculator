// CLI model refresh (multi-provider catalog). Mirrors the admin
// POST /api/models/refresh endpoint but runs directly against the DB.
// Usage: npm run scrape:models   (needs DATABASE_URL in .env)
import 'dotenv/config';
import { refreshModels } from '../src/server/modelRefresh';
import { runMigrations, closePool } from '../src/server/db';

async function main() {
  await runMigrations();
  const summary = await refreshModels();
  console.log('Model refresh tamamlandı:', JSON.stringify(summary));
  await closePool();
}

main().catch((err) => {
  console.error('Model refresh başarısız:', err);
  process.exit(1);
});