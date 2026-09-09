<div align="center">

# ∑ LLM Hardware & Cost Architect

**An open-source VRAM, throughput and cost calculator for LLM inference and fine-tuning.**

Compare open-source LLMs across a catalog of hundreds of models, against your own GPU or live cloud prices —
with TCO, on-prem vs. API break-even and Unsloth-accelerated fine-tuning estimates. No sign-up, free.

[**Try it live**](https://llminferencecalc.com.tr) · [`Türkçe → README.tr.md`](README.tr.md)

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![React 19](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-38BDF8?logo=tailwindcss&logoColor=white)

</div>

---

## What it does

A step-by-step **wizard** that turns a model + hardware selection into concrete numbers:

- **Inference** — `01 Model → 02 Quantization → 03 Engine → 04 GPU → 05 Workload → 06 Results`
- **Fine-tuning** — `01 Model → 02 Fine-Tuning Config → 03 Results`

Every configuration is reconciled in real time against compatibility rules (quant ↔ engine ↔ GPU vendor), and the
sticky summary bar always shows the bottom line: **VRAM fit**, **monthly cost**, **tokens/sec**.

### Results you get

| Panel | What it answers |
| --- | --- |
| **VRAM** | Do the weights fit this GPU, in this quant, with KV-cache and runtime overhead? |
| **Performance** | Estimated tokens/sec and latency from the GPU's compute/memory bandwidth. |
| **Cost** | Per-token and monthly serving cost (self-hosted or rented hardware). |
| **TCO** | Total cost of ownership over N months: hardware + electricity + ops. |
| **Cloud** | Live, scraped prices from RunPod / Lambda / Modal, cheapest match included. |
| **API break-even** | Self-host vs. hosted-API cost per 1M tokens — the volume where self-hosting wins. |

### Model & hardware catalog

- **Hundreds of open-source LLMs** from a unified catalog (DeepSeek, Llama, Qwen, Gemma, Mistral, Phi, Turkish
  models and more). Entries with an `hfId` pull live architecture data from Hugging Face (`config.json` + params).
- **30 GPU presets** — NVIDIA data-center and workstation (GB200, B200, H200, H100, GH200, A100, L40S, L4, RTX
  5090/Ada/A-series…), AMD MI300X, and Apple Silicon (M6, M5 Pro/Max/Ultra, M3 Ultra).
- **7 inference engines** — vLLM, llama.cpp, TensorRT-LLM, SGLang, TGI, Ollama, MLX.
- **Quants** — FP16, FP8 and GGUF K-quants (Q8_0…Q3_K), each gated by engine/vendor compatibility.
- **Fine-tuning** — QLoRA, LoRA, full fine-tuning, DPO/ORPO; frameworks Unsloth, HF TRL+LoRA, TorchTune,
  DeepSpeed, Axolotl; auto micro-batch / gradient-accumulation optimization and Unsloth's ~4× speedup built in.
- **Workload profiles** — chat, RAG, and code generation token streams.

### Nice-to-haves that ship

- **Live GPU prices** from real scrapers (no sponsorship, sources disclosed on the landing page) and a **live model
  catalog** refreshed from the HF Hub — both replace the static presets when available.
- **Shareable scenario URLs** (`/app?c=…`) — serialize any config, share it, and it rehydrates on load.
- **Scenario manager** — save/compare/export scenarios; **Markdown export** for reports.
- **TR/EN localization** — browser-detect default, persisted toggle; server-rendered landing page in both languages.
- **Methodology transparency** — every formula and data source is documented on the site.

---

## Tech stack & architecture

- **Frontend:** React 19 + Vite + Tailwind CSS v4, i18next (TR/EN), light-brutalist UI (Inter + JetBrains Mono).
- **Backend:** one Express (TypeScript) server. In dev it boots Vite in middleware mode and serves the SPA + API on
  a single port; in production it serves the built `dist/`.
- **Database:** PostgreSQL (`pg`) — stores scraped GPU prices and the live HF model catalog. Schema is
  auto-created and seeded on boot (with retry, so the app self-heals if Postgres comes up late).
- **Scrapers:** Python (run via `uv`, Python 3.13) — RunPod, Lambda and Modal price sync.

```text
                    ┌────────────────────────────────────────────────────────┐
                    │                   Express (server.ts)                  │
                    │                                                        │
   Browser ───────► │  GET /            SSR landing (TR/EN, SEO meta)        │
    /app ─────────► │  GET /app         SPA shell + route meta injection     │
                    │  /sitemap.xml     /robots.txt                          │
                    │                                                        │
                    │  GET  /api/models        live HF catalog (cached)      │
                    │  GET  /api/gpu-prices    live prices   (cached)        │
                    │  POST /api/models/refresh   ─┐                         │
                    │  POST /api/gpu-prices/refresh│  admin session (JWT)    │
                    │  /api/admin/*  local admin login                       │
                    └───────┬───────────────┬───────────────┬────────────────┘
                            │               │               │
                      PostgreSQL     HF Hub (refresh)   runpod/lambda/modal
                    gpu_prices                        (python scrapers, uv)
                    hf_models
```

Public data flows are **read-only and cached**: only the admin session can trigger a catalog/price refresh.

---

## Quick start

### Prerequisites

- **Node.js** (>= 22) and npm
- **PostgreSQL** running locally, with a `DATABASE_URL` like the one in `.env.example`

### Run locally

```bash
npm install
cp .env.example .env        # set DATABASE_URL (+ SESSION_SECRET, ADMIN_* for the admin panel)
npm run dev                 # http://localhost:3000
```

> The server stays up even if Postgres is down (migration/seed is retried ~60s), but the DB-backed routes will
> 500 — a missing Postgres is the most common cause of a broken dev run.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the server in dev mode (Vite middleware). |
| `npm run build` | `vite build` + esbuild bundle of `server.ts` → `dist/server.cjs`. |
| `npm run start` | Serve the production build (`NODE_ENV=production node dist/server.cjs`). |
| `npm run lint` | Type-check only: `tsc --noEmit`. (No test framework exists.) |
| `npm run scrape:prices` | Refresh GPU prices from RunPod/Lambda/Modal (Python via `uv`; needs `DATABASE_URL`). |

### Environment variables

See `.env.example` for everything. The essentials:

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string; non-localhost hosts get SSL auto-enabled unless `?sslmode=` is set. |
| `PORT` | no | HTTP port (default 3000). |
| `SESSION_SECRET` | no | Signs the admin JWT; **set it in production** (unset = random per boot, sessions invalid on restart). |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | no | Enables the local admin panel (Yönetim). |
| `POSTGRES_PASSWORD` | compose only | Docker Compose `db` container password. |

---

## Keeping data fresh

- **GPU prices** — `npm run scrape:prices` syncs RunPod/Lambda/Modal into `gpu_prices`.
- **Model catalog** — refreshed from the Hugging Face Hub via the admin panel (`POST /api/models/refresh`,
  admin-session-guarded; no scheduler). The static presets are the offline fallback.

---

## Project structure

```text
server.ts                  Express app: routes, landing, SEO, dev/prod serving
src/
  components/              Wizard steps, results panels, admin gate, UI primitives
  data/                    presets.ts (engines/quants/profiles), modelCatalog.ts,
                           gpuPresets.ts, fineTuningPresets.ts, cloudProviders.ts,
                           apiPricePresets.ts
  utils/                   calculator.ts, fineTuningCalculator.ts,
                           engineCompatibility.ts, scenarioStorage.ts,
                           shareUrl.ts, scenarioMarkdown.ts …
  server/                  db.ts (migrations), hfModels.ts, gpuPrices.ts, gpuScraper.ts,
                           adminAuth.ts, landing.ts, seo.ts …
  hooks/                   useLiveModels.ts, useLiveGpuPrices.ts
  i18n/                    tr.json / en.json
scripts/scraper/           Python price scrapers (uv)
docs/superpowers/          Design specs & implementation plans
```

---

## Production deployment

```bash
docker compose up -d --build
```

- Multi-stage `Dockerfile` (node:22-alpine) + `postgres:16-alpine` service with healthcheck.
- The app publishes **only to host loopback** (`127.0.0.1:8081`); TLS/reverse-proxy is terminated by a
  host-installed nginx (certbot) in front.

---

## Contributing

This is an open-source project — contributions are welcome.

1. Fork, branch, keep changes focused.
2. UI strings and user-facing API errors are **Turkish**; new UI text should be added to both `src/i18n/tr.json`
   and `src/i18n/en.json`.
3. Verify before opening a PR: `npm run lint` and `npm run build` must pass. There is no test framework — a manual
   smoke test (`npm run dev`) is expected.
4. Check [`PLAN.md`](PLAN.md) for unfinished work and the roadmap before starting something big.

## Security

See [`SECURITY.md`](SECURITY.md) for the security model, vulnerability reporting, and production hardening checklist.

## License

This project is published **without an explicit license** — no rights are granted for reuse without permission.
Please [open an issue](https://github.com/UmuT5513/llm-inference-calculator/issues) to discuss licensing.

## Acknowledgements

Generated from a **Google AI Studio** template and evolved into a production tool with live data integration,
localization, SEO and a custom calculator engine.