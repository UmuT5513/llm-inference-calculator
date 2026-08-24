# AGENTS.md

Turkish-language LLM inference / fine-tuning VRAM & cost calculator. React 19 + Vite + Tailwind frontend served by one Express (TS) server; PostgreSQL-backed; generated from a Google AI Studio template. UI strings and user-facing API errors are Turkish.

Unfinished work: the unified model-catalog plan is tracked in `PLAN.md` — resume there (fictional `hfId`s in `src/data/modelCatalog.ts` still need real HF repo mapping before the one-time refresh can complete).

## Commands
- `npm run dev` — runs everything: `server.ts` boots Vite in middleware mode, serving the SPA + API on http://localhost:3000. There is no separate frontend dev server.
- `npm run lint` — the only check: `tsc --noEmit`. No test framework exists.
- `npm run build` — vite build + esbuild bundle of `server.ts` → `dist/server.cjs` (`npm start` serves it in production mode).
- `npm run scrape:prices` — refresh GPU prices from RunPod/Lambda/Modal. Python, run via `uv` with the repo `.venv` (Python 3.13); needs `DATABASE_URL`.
- `npm run scrape:models` — refresh open-source LLMs from the Hugging Face Hub (top-N by downloads + Turkish allowlist) into the `hf_models` table; needs `DATABASE_URL`. Flags: `--top N`, `--min-downloads N`, `--pipeline text-generation` (TTS/STT = `text-to-speech` / `automatic-speech-recognition`).
- `docker compose up -d --build` — production deploy (VPS): app (multi-stage `Dockerfile`) + `db` (postgres:16-alpine) + `caddy` (auto Let's Encrypt via `Caddyfile`, domain from `DOMAIN` env). Needs `.env` with `POSTGRES_PASSWORD` and `DOMAIN`; compose overrides `DATABASE_URL` to the internal `db` host with `?sslmode=disable`.

## Architecture
- Entry: `index.html` → `src/main.tsx` → `src/App.tsx`.
- Express API in `server.ts`: `/api/auth`, `/api/scenarios`, `/api/gpu-prices`, `/api/models`, plus inline `/api/recommend-model` and `/api/advisor` (Gemini).
- Data presets are the source of truth: `src/data/presets.ts` aggregates model presets from `src/data/models/*.ts` (one file per vendor); `src/data/gpuPresets.ts` holds GPU specs. Calculation logic in `src/utils/calculator.ts` and `src/utils/fineTuningCalculator.ts`.
- DB schema is auto-created at boot (`runMigrations()` in `src/server/db.ts`): tables users, sessions, scenarios, gpu_prices, hf_models. Have Postgres running with a `DATABASE_URL` like `.env.example`.
- Live HF models are fetched by `useLiveModels` → `/api/models` and merged over the static presets by `mergeModelCatalog` (`src/utils/modelCatalog.ts`); a fetched model overwrites a matching curated entry (matched by `hfId`, slug id, or normalized name) but keeps the curated id/name/description/category.

## Gotchas
- The server keeps running if the DB is down (migration failure is logged), but DB-backed routes 500 — missing Postgres is the most likely cause of a broken dev run.
- `GEMINI_API_KEY` is optional: `/api/recommend-model` falls back to keyword heuristics; `/api/advisor` returns 503 without it.
- Google sign-in needs `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_CALLBACK_URL` and a matching redirect URI in Google Console; sessions use a JWT cookie signed with `SESSION_SECRET`. Local admin login (`/api/admin/*`) needs `ADMIN_USERNAME`/`ADMIN_PASSWORD` instead.
- `db.ts` auto-enables SSL for any non-localhost `DATABASE_URL` host without `?sslmode=` — internal Docker/other plain Postgres hosts must append `?sslmode=disable`.
- Express runs with `trust proxy: true` (Caddy in front in prod); the admin login brute-force lockout relies on the real client IP.
- Keep `GPU_SLUG_PATTERNS` in `scripts/scraper/common.py` aligned with the GPU ids in `src/data/gpuPresets.ts` — scraped prices are matched to presets by slug.
- `vite.config.ts` disables HMR/file-watching when `DISABLE_HMR=true` (agent-editing mode); don't modify that block.