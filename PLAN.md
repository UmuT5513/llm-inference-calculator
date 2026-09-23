# PLAN — Birleşik, sunucu-tarafı, isteğe bağlı güncellenen model kataloğu

Onaylanan plan: oturum `ses_fe4c69a62ffeHGHsvLLd4Lzgtg` (2026-08-19 23:07, "Final Plan").
Bu dosya planı korur; yarın kaldığımız yerden devam edilecek.

## Amaç
"Eski modeller" ile "güncel HF modelleri" ayrımı kalkacak → tek birleşik katalog.
Sadece bilinen kişi/kurumların açık kaynak LLM'leri görünecek. Filtreler:
- Capability: 🚀 Frontier / 🇹🇷 Türkçe (sadece bu ikisi)
- Donanım: Edge / Yerel PC-Mac / İş İstasyonu / Sunucu
Güncelleme yalnızca ilerideki admin panelinden istenince çalışır (zamanlayıcı yok, UI'da buton yok).

## Plan adımları ve durum

| # | Adım | Durum |
|---|------|-------|
| 1 | Tipler & DB: `ModelCapability='frontier'\|'turkish'`, `targetEnv` + `'edge'`, `curated?`; `hf_models`'e slug_id/category/capabilities/target_env/curated kolonları | ✅ tamam |
| 2 | Curated katalog `src/data/modelCatalog.ts` (~130 model, eski id'ler korunur) | ✅ tamam (ama kurmaca hfId'ler var, aşağı) |
| 3 | "Şimdi toplayalım": boot'ta `seedModelCatalog()` | ✅ tamam |
| 3 | Tek seferlik `refreshModels()` (curated zenginleştir + bilinen kurumlardan keşif) | ✅ tamam |
| 4 | `hfClient.ts`, `knownOrgs.ts`, `modelRefresh.ts`, `POST /api/models/refresh` | ✅ tamam |
| 5 | Frontend: `useLiveModels` doğrudan, `ModelSelector` filtreleri, `mergeModelCatalog`/`slugifyModelId`/Python `hf_models.py` silindi | ✅ tamam |
| 6 | Doğrulama: lint + build + refresh + API/filtre kontrolü + keşif gürültüsü temizliği | ✅ tamam |

## KALINAN YER (yarın buradan devam)
Oturum şu cümleyle koptu:
> "Several hfIds are fictional. Let me find the real repos for all"

**Sorun:** `src/data/modelCatalog.ts`'teki birçok `hfId` kurmaca/yanlış → HF'de 404.
Gerçek token (`HUGGINGFACE_API_KEY` artık `.env`'de, `hfClient` okur) ile:
- 404 = repo yok (kurmaca) → gerçek repo bulunmalı
- 200 = repo var (gated dahil) → sorun yok

Bilinen kurmaca adayları: `qwen-3.5-72b` (server.ts'ta da referanslı), `meta-llama/Muse`, spekülatif Gemma 4 hfId'leri, BİLGEM 70B (HF'de halka açık yok).

### Doğrulama yöntemi
`HUGGINGFACE_API_KEY` ile tek tek kontrol:
```
curl -H "Authorization: Bearer $HUGGINGFACE_API_KEY" https://huggingface.co/api/models/<hfId>
```
- 200 → geçerli; 404 → kurmaca, düzelt.

### Devam adımları
1. `modelCatalog.ts`'teki tüm hfId'leri doğrula, kurmacaları gerçek repo'larla eşle (id/slug korunmalı, sadece `hfId` değişir).
2. `npm run lint` (tsc --noEmit).
3. `seed-test.ts` → migration + seed doğrula.
4. `refresh-test.ts` → tek seferlik refresh (DB'yi canlı veriyle doldurur). Öncesinde DB'deki 107 "curated-source" satırı ya silinmeli ya da seed+refresh üzerine yazmalı (seed `ON CONFLICT` mimariyi korumaz, raw_json'u da dokunmaz — refresh sadece hf_id eşleşeni UPDATE eder).
5. `GET /api/models` çıktısını ve filtreleri kontrol et; `npm run build`.

## Tamamlanan oturum özeti (2026-08-20)
- **24 kurmaca hfId düzeltildi** (6 silindi + 18 gerçek repo'ya remap; `bilgem-bilge-70b` bilinçli hfId'siz kaldı). 124 hfId'nin tamamı HF'de 200 (BAD: 0).
- **`hfClient.ts`**: `/api/models/:id` config'i yetersizse `resolve/main/config.json`'a fallback; `text_config`/`language_model`/`text_model` unwrap; `num_experts`/`n_routed_experts` MoE desteği; NemotronH için `layers_block_type.length` katman fallback'i; `head_dim` yoksa `hidden_size/num_heads`'ten yuvarlatılmış türetme.
- **Keşif sıkılaştırıldı** (`knownOrgs.ts`): format/quant bloklistesi (gguf/gptq/embed/asr/tts/ocr/audio/safety/orchestrator/reward/fp8/…), eski-gen aile blokları (yi-, deepseek-coder, chatglm, mixtral, wizardlm, teacher, …), `MIN_PARAMS_B=3`, `familyKey()` aile-dedup (curated + kardeş varyantlarla çakışma), canlı reposunda tarih/bf16/base sonekli olanlar sonraya.
- **`modelRefresh.ts`**: keşfedilen satırlar artık INSERT yerine UPDATE de ediyor (eski hatalı veri kendini düzeltir).
- **DB (2026-08-20)**: 173 satır = 124 curated (92'si canlı HF verisiyle zenginleşti) + 49 keşif (hepsi gerçek, güncel, bilinen kurumların LLM'leri). Refresh: fetched=92 updated=92 discovered=0 failed=32 (gated: meta-llama/gemma/nvidia-nemotron-4/cohere/pixtral → curated fallback korunur).
- **`verified` işareti (2026-08-20)**: `hf_models.verified` kolonu eklendi. Refresh başarılıysa `true`, gated/404 ise `false` yazar; `/api/models` ve `useLiveModels` üzerinden frontend'e taşınır; `ModelSelector`'da `verified=false` olanlar "HF'DEN DOĞRULANAMADI" rozeti alır (preset fallback kullandıkları görünür). DB: 141 verified / 32 unverified (hepsi curated, gated).
- **Doğrulama**: `npm run lint` ✅, `npm run build` ✅, `/api/models` 173 model, duplikat id yok, curated isimleri korunuyor.
- Geçici kök script'leri silindi.

## Tamamlanan oturum özeti (2026-08-20, devam)

**Amaç:** Gated (erişim kısıtlı) resmi modellerin mimari bilgisi topluluk aynalarından doldurulacak; keşif topluluk repolarını da kapsayacak ve her satır asıl üreticiye atfedilecek; refresh admin tarafından tekrar çalıştırılabilir olacak.

### Yapılanlar
- **`knownOrgs.ts`**: `PRODUCERS` üretici haritası eklendi (aile terimi → üretici + kategori; ör. llama→Meta, qwen→Alibaba Cloud, nemotron→NVIDIA, voxtral/pixtral→Mistral AI). `resolveProducer()` her repo adını asıl üreticiye eşler. Bloklisteler ayrıştırıldı: `FORMAT_BLOCKLIST` (gguf/gptq/awq/mlx/fp8/nvfp4/qat/4bit/w4a8/image/e5/embed/asr/tts/ocr/audio/…), `DERIVATIVE_BLOCKLIST` (fine-tune/dpo/dolphin/eagle/slerp/hermes/nous/merge/… + eski-gen aileler), `isTextPipeline()` (non-LLM pipeline_tag'leri reddeder). `familySizeKey()` / `producerFamilyKey()` aile bazlı cross-org dedup sağlar.
- **`hfClient.ts`**: `fetchArchitectureFromMirrors(hfId, expectedParamsB)` eklendi — family+size ile HF araması (`sort=downloads`), adayları `isCandidateMirror` ile filtreler (quantize mirror'lar config için izinli, fine-tune değil) ve ilk geçerli config'i döner. Adaylar `/models/:id` üzerinden doğrulanır (gerçek `safetensors.total`; formül tahminine güvenilmez, ±%25 boyut guard'ı). Ortak `toModelConfig()` refactor edildi. `listOrgRepos`/`searchRepos` artık `pipeline_tag` döndürüyor.
- **`modelRefresh.ts`**: (1) Curated zenginleştirme: resmi repo başarısızsa önce önbellekteki mirror, sonra yeni arama; başarılıysa `raw_json={source:'mirror', official, mirror}`, `verified=true`. (2) Keşif: bilinen resmi org taraması + üretici terimi başına topluluk araması (`COMMUNITY_MIN_DOWNLOADS=250` eşiği). Tüm keşif satırları üreticiye atfedilir (`provider`/`category`). (3) Stale işareti: bu turda görülmeyen keşif satırları silinmez, yalnızca `verified=false` yazılır (rozet görünür). (4) Concurrency guard (ikinci eşzamanlı refresh 409 döner). (5) Özet artık `mirrored` sayısını içeriyor.
- **`hfModels.ts`**: API'de `source` / `mirrorOf` / `mirrorHfId` alanları (`raw_json`'dan); quantize/fine-tune/pipeline-uygunsuz keşif satırları katalogdan gizlenir (curated asla gizlenmez). `POST /api/models/refresh` 409 koruması.
- **Frontend**: `types.ts`'te `ModelPreset`'e `source`/`mirrorOf`/`mirrorHfId`; `useLiveModels` taşıyor; `ModelSelector`'da `source='mirror'` için gri "TOPLULUK AYNASI" etiketi (kart + seçili özet) eklendi; `verified=false` rozeti korunuyor.

### Doğrulama (2026-08-20, son durum)
- Refresh: `fetched=121 updated=121 mirrored=29 discovered=2 failed=3`. 32 gated curated modelden 29'u topluluk aynasıyla çözüldü; kalan 3 (`google/gemma-2-2b-it`, `nvidia/NVLM-D-72B`, `CohereForAI/c4ai-command-r-08-2024`) için erişilebilir eşleşen ayna yok — `verified=false` rozetiyle duruyor.
- DB: 356 satır = 124 curated + 232 keşif. Görünür katalog: 216 model (124 curated + 92 keşif); 140 junk satır (quantize mirror / fine-tune / non-LLM pipeline) gizlendi. Verified 212 / unverified 4 (3 curated + 1 keşif: `mistralai/Voxtral-Mini-4B-Realtime-2602` gated). Duplikat yok, atfedilmeyen satır yok.
- `npm run lint` ✅, `npm run build` ✅.

### Notlar / tuzaklar
- Quantize/format mirror'lar yalnızca config/metadata için kullanılır, asla katalog satırı olmaz. Gated olan ve yalnızca quantize aynası erişilebilen yeni aileler (örn. Gemma 4) otomatik keşfedilmez; istenirse curated kataloğa elle eklenebilir.
- Eski kötü çalışmanın junk satırları DB'de tutulur (silme yok) ama API'de gizlenir — temizlemek istersen: `DELETE FROM hf_models WHERE NOT curated AND (hf_id ~* '<format veya derivative regex>')`.
- Refresh idempotent ve yeniden çalıştırılabilir; admin koruması kullanıcı sonra ekleyecek (mevcut `POST /api/models/refresh` şimdilik korumasız, middleware kolayca takılabilir).

## TAMAMLANDI: Çok sağlayıcılı katalog (HF+ModelScope+Ollama) + MoE/Multimodal hesap düzeltmesi + veri yenileme (2026-09-23)

Tasarım onayı (`docs/superpowers/plans/2026-09-23-multi-provider-moe-multimodal.md`), paralel ajanlarla uygulandı. Özet:
- **Model kaynakları:** ModelScope (token'sız Hub API: `PUT /api/v1/models` + `resolve/.../config.json`, HF config formatında) ve Ollama (resmi API yok → HTML scraping: `ollama.com/library` + model sayfaları; mimari yalnızca HF/ModelScope eşlemesiyle gelir) eklendi. `src/server/modelScopeClient.ts`, `ollamaClient.ts`.
- **Ortak config ayrıştırma:** `src/server/modelConfig.ts` (HF+MS ortak). **MoE aktif-param formülü düzeltildi:** kapalı form (GQA + ortak uzman + expertsPerTok×expert FFN) → DeepSeek-V3 aktif **37.6B** ✅ (eski `total×k/N` tahmini ~21B veriyordu). Multimodal tespiti + `vision_params_b` (Qwen2.5-VL-7B → 1.2B).
- **Dedup/identite:** `knownOrgs.ts`'te `computeIdentity`; refresh satır başına bir model (`canonical_id`), `sources[]` linkleri + `released_at`/`released_label`, `linked` özet sayacı; yalnızca bir sağlayıcı mimari çözer (tekrar çekme yok).
- **API/UI:** `/api/models` → `sources/releasedAt/releasedLabel/isMultimodal/modalities/visionParamsB/expertIntermediateSize/numSharedExperts`. Model adımı **iki kolonlu** (sol: mevcut seçici, sağ: sticky `ModelDetailsPanel` — çıkış tarihi, HF/ModelScope/Ollama linkleri, mimari, multimodal). Kartlara MULTİMODAL rozeti.
- **Hesap motoru:** `calculator.ts` medya token'larını girdi yanına ekler (KV/prefill/maliyet; yalnızca `isMultimodal`); `WorkloadConfigurator` tek-kullanıcı + profil kartlarında görsel/ses girdileri (1 görsel ≈ 1024 tok, ses ≈ 50 tok/sn, ayarlanabilir).
- **Veri yenileme:** CLI `npm run scrape:models` (`scripts/refresh-models.ts`) restore edildi. Gerçek çalıştırma: **fetched=122 updated=122 mirrored=29 discovered=146 linked=107 failed=2**; DB 444 satır (124 curated + 320 keşif; hepsi canonical-id'li, 270'i sources'lı). GPU fiyatları da tazelendi: runpod 19 / modal 11 / lambda 10 (B200 $6.69).
- **Doğrulama:** `npm run lint` ✅, `npm run build` ✅, `/api/models` (304 görünür model; 223 çıkış-tarihli; 100 multimodal) + `/api/gpu-prices` (39 satır) ✅, `/`, `/app`, sitemap/robots 200 ✅, i18n eksik anahtar 0 ✅.

### Notlar / tuzaklar
- ModelScope/Ollama hiçbir anahtara/ücrete tabi değil; HF limitleri aynen geçerli (anonim 500 istek/5dk → refresh 150ms gecikmeyle rahat). Ücretli kıyas: HF PRO $9/ay → 2.500 istek/5dk; ModelScope API-Inference ücretsiz 2.000 çağrı/gün (model başına 500), ücretli = API-Provider bağlama (DashScope vb.); Ollama kataloğu için ücretli yok.
- Ollama satırlarında kesin çıkış tarihi yok → `released_label` (göreli). Mimari yoksa `verified=false`.
- `hf_id` yeni MS/Ollama satırlarında `ms:<id>` / `ollama:<name>` (NOT NULL+UNIQUE nedeniyle) — frontend linkleri `sources`'tan render etmeli, `hfId`'nin gerçek HF repo olduğunu varsaymamalı.

## Notlar / tuzaklar (eski, geçerliliğini korur)
- Refresh (`modelRefresh.ts`): curated hf_id'lerini HF'den çeker, `raw_json=source:huggingface`, `scraped_at=now()`, `verified=true`; gated modeller 401/403 → `failed` listesinde, `verified=false` işaretlenir, curated fallback korunur.
- `verified`: mimarinin canlı HF config'inden teyit edildiğini gösterir. `false` = gated/404 (preset fallback). Keşif satırları her zaman `true`.
- Keşif yalnızca INSERT (yeni) + UPDATE (mevcut) yapar; silme yapmaz — katalogdan çıkarmak istediğin keşif satırlarını elle `DELETE ... WHERE NOT curated` ile temizle.
- `.env`'de `HUGGINGFACE_API_KEY` var; `hfClient` hem `HF_TOKEN` hem `HUGGINGFACE_API_KEY` okur.

## Tamamlanan oturum özeti (2026-08-20, bulut hazırlığı)

**Amaç:** Fiyatlar/ekran kartları ve model kataloğu güncel olduğundan uygulama buluta alınıp serve edilecek; hem modeller hem GPU fiyatları **admin istediğinde on-demand** güncellenebilir olacak. Kararlar: Render (PaaS) + yönetilen Postgres + uygulama içi admin endpoint'ler.

### Yapılanlar
- **Port/env** (`server.ts`, `package.json`): `PORT = process.env.PORT || 3000`; `start` → `NODE_ENV=production node dist/server.cjs`.
- **Admin koruması** (`auth.ts`, `hfModels.ts`): `ADMIN_EMAILS` env allowlist + `isAdminEmail()` + `requireAdmin` middleware (401 oturum yok / 403 admin değil). `AuthUser.isAdmin` eklendi, `/api/auth/me` döndürüyor. `POST /api/models/refresh` artık `requireAdmin` ile korumalı.
- **GPU scraper Node portu** (`src/server/gpuScraper.ts`, `gpuPrices.ts`): Python scraper'lar (`common.py` + runpod/modal/lambda) Node'a taşındı — `GPU_SLUG_PATTERNS`/`normalize_gpu_name`/`parse_price_usd` portları, JSON-LD (RunPod), `.line-item` (Modal, ×3600), tablo + `data-plan` + en-düşük fiyat (Lambda). İnternet olmadığı için cheerio kurulamadı → tamamen regex/built-in fetch tabanlı. `POST /api/gpu-prices/refresh` (requireAdmin, concurrency 409, sağlayıcı-bazlı hata). Python scriptler referans olarak `scripts/scraper/` içinde kaldı.
- **Admin UI** (`AdminPanel.tsx`, `Header.tsx`, `App.tsx`, `AuthContext.tsx`): sadece admin'e görünen "Yönetim" butonu → modal; "Modelleri Güncelle" ve "GPU Fiyatlarını Güncelle" butonları, sonuç özetleri (fetched/mirrored/discovered, provider başına fiyat satırı), sonrasında `refetchModels()`/`refetchPrices()`.
- **SSL/DB** (`db.ts`): yerel olmayan DATABASE_URL'lerde (`sslmode` yoksa ve localhost değilse) `ssl:{rejectUnauthorized:false}` — yönetilen Postgres (Render/Neon/Supabase) uyumu.
- **`render.yaml`** blueprint'i (web service + postgres + env şeması, `DATABASE_URL` otomatik bağlanır) ve `.env.example` güncellemesi (PORT, HUGGINGFACE_API_KEY, ADMIN_EMAILS).
- **Git/Render hazırlığı**: repo `git init` + ilk commit; GitHub'a push edildi → `https://github.com/UmuT5513/llm-inference-calculator` (private). `gh` oturumu hazır.

### Doğrulama (2026-08-20)
- `npm run lint` ✅, `npm run build` ✅.
- Scraper portu çevrimdışı fixture'lar ile test edildi (fetch stub'lanarak gerçek regex/extraction kodu koşuldu): runpod 3 satır (H100 SXM→$2.29, RTX 4090→$0.69, A100 80GB→$1.50), modal 2 satır (×3600 dönüşümü doğru), lambda 2 satır (en-düşük fiyat seçimi: B200 $2.49). Python davranışıyla birebir.
- Prod sunucu (PORT=3111, NODE_ENV=production): `/api/auth/me` → `{user:null}`, `POST /api/models/refresh` ve `POST /api/gpu-prices/refresh` → **401** (middleware bağlı), `/api/models` → 200, `/` → 200 (statik serve + migration + 124 curated seed).

### KALAN (sonraki oturum: Render deploy) — İPTAL: Render'dan vazgeçildi
Karar (2026-08-24): Render yerine kendi VPS'inde Docker Compose ile self-host. `render.yaml` silindi.

## Tamamlanan oturum özeti (2026-08-24, VPS deploy hazırlığı)
- **`Dockerfile`**: multi-stage node:22-alpine (build → runtime, `npm ci --omit=dev`, `dist/` kopyası).
- **`docker-compose.yml`**: `db` (postgres:16-alpine + pgdata volume + healthcheck), `app` (env_file=.env, DATABASE_URL compose'ta `?sslmode=disable` ile override), `caddy` (80/443, otomatik Let's Encrypt).
- **`Caddyfile`**: `{$DOMAIN:localhost} { reverse_proxy app:3000 }`.
- **`server.ts`**: `app.set("trust proxy", true)` — Caddy arkasında admin brute-force kilidi gerçek IP'yi görür.
- **`.env.example`**: `POSTGRES_PASSWORD`, `DOMAIN`, `ADMIN_USERNAME`/`ADMIN_PASSWORD` eklendi + sslmode notu.
- **Doğrulama (yerel, DOMAIN=localhost)**: `docker compose up -d --build` → migration + 124 curated seed ✅, `https://localhost/` 200 ✅, `/api/models` ✅, admin login (yanlış→401, doğru→`{ok:true}` + `/api/admin/me` 200) ✅.

### KALAN (VPS üzerinde)
1. VPS (Ubuntu 24.04, min 1 vCPU/2GB): Docker kur, `ufw allow 22,80,443/tcp`.
2. Repo clone (private → deploy key veya PAT), `cp .env.example .env` ve doldur: `DOMAIN`, `POSTGRES_PASSWORD`, `APP_URL=https://domain`, `SESSION_SECRET`, `ADMIN_USERNAME/PASSWORD`, Gemini/HF key'leri. (Google OAuth kaldırıldı — gerekmez.)
3. DNS A kaydı → VPS IP; `docker compose up -d --build`.
4. Host nginx site'ini kur: `/etc/nginx/sites-available/llminferencecalc.com.tr` → `reverse_proxy 127.0.0.1:8081`, `certbot --nginx` ile TLS.
5. Bakım: `docker compose logs -f app`; güncelleme `git pull && docker compose up -d --build`; yedek `docker compose exec -T db pg_dump -U llmcalc llmcalc | gzip > backup.sql.gz`.

## Tamamlanan oturum özeti (2026-08-31, caddy → nginx)
- **Karar:** Caddy yerine host'ta kurulu nginx (reverse-proxy + TLS, certbot). `Caddyfile` silindi.
- **`docker-compose.yml`**: `caddy` servisi kaldırıldı (caddy_data/caddy_config volume'ları da); `app` artık yalnızca host loopback'ine `127.0.0.1:8081:3000` bind ediyor. TLS/uç sunum tamamen host nginx'e devredildi.
- **nginx config repo'da yok** — host'ta yönetiliyor: `/etc/nginx/sites-available/llminferencecalc.com.tr` (reverse proxy → `127.0.0.1:8081`, certbot TLS, `DOMAIN` server_name).
- **`.env.example`**: `DOMAIN` yorumu Caddy → host nginx/certbot olarak güncellendi (compose artık okumuyor).
- **`AGENTS.md`**: compose komutu ve `trust proxy` gotchası güncellendi.
- **Not:** `server.ts` `trust proxy: true` kalıyor — nginx arkasında admin brute-force kilidi gerçek IP'yi görür.

## TAMAMLANDI: Phase 4 — Light Brutalist redesign + wizard flow (2026-08-31)

Growth spec'inin Phase 4 bölümü 2026-08-31'de yenilendi: koyu "Ember Refined" pası
yerine **açık brutalist tema + adım adım sihirbaz** geldi. Tasarım spec'i:
`docs/superpowers/specs/2026-08-31-light-brutalist-wizard-redesign-design.md`
(onaylandı). **Durum: tamamlandı** — tüm kod `feat/phase4-brutalist-wizard`
dalında birleştirildi (Task 1-10 kod, Task 11 doğrulama + dokümantasyon).

Tamamlanan özet:
- Tema: açık (`#f5f5f3` zemin, beyaz yüzey, 2px katı siyah kenarlık, düz, keskin
  köşe, gölge yok). Koyu tema kaldırıldı, toggle yok. Amber CTA/logoda kalır,
  mavi mono kategori label'ları için.
- `/app` sihirbazı (hibrit): inference `Model → Quant → Engine → GPU → Workload
  → Sonuçlar` (6 adım), fine-tuning `Model → Fine-Tuning Ayarı → Sonuçlar` (3
  adım); alt satırda her adımda görünen sticky özet çubuğu (VRAM uyumu / maliyet
  / tok-s); `?c=` ve preset'ler doğrudan Sonuçlar'a atlar.
- Landing (`/`): SSR hero kutusu (mavi mono rozet, başlık, ayraç, mono metadata)
  + modül grid (`01` INFERENCE / `02` FINE-TUNING, bölünmüş footer butonları).
- Header: nav-link sekmeler (aktif = siyah alt çizgi), bordered düz butonlar.
- Modallar, results sekmeleri, footer aynı dile geçer; grafikler birleşik SVG
  stili; focus-visible/aria + loading/empty state'ler.

### Doğrulama (2026-08-31)
- `npm run lint` ✅ (tsc --noEmit temiz), `npm run build` ✅ (yalnızca chunk-size
  uyarısı, hata yok).
- Headless curl smoke: `/` 200 (light brutalist marker'ları mevcut: `hero-badge`,
  `module-num`, `LLM TOOLS · 2026`, `ACTIVE`; Accept-Language'e göre
  "Calculator Modules" / "Hesaplayıcı Modülleri"), `/app` 200 (SPA shell),
  `/app?c=` 200 (hydration rotası çakmıyor), `/sitemap.xml` + `/robots.txt` 200,
  `/api/models` 200 (228 model), `/api/gpu-prices` 200.
- i18n sweep: `rg "[A-Za-zÇĞİÖŞÜçğıöşü]" src/components` incelemesi yapıldı.
  Kalan hardcoded UI string'lerin tamamı Phase 4 **öncesinden** kalma
  (SectionHeader title'ları "Quantization" / "GPU Hardware" / "Inference Engine",
  FT `Field` label'ları, "Inference + Fine-Tuning" badge'i, TTFT/TPOT/Effective
  Batch, "PagedAttention & TensorRT"). Phase 4'ün yeni bileşenleri (Wizard,
  WizardSummaryBar, landing) tamamen `t('…')` kullanıyor.
- **İnsan-doğrulamalı kalan smoke maddeleri (headless ortamda çalıştırılamadı):**
  sihirbaz adım gezinmesinin ekrandaki hissi, özet çubuğu renkleri (VRAM OK/OOM)
  ekranda, modalların mobil genişlikte görünümü, mobil tek sütun + sticky bar
  overflow'suz akış, dil toggle'ın görsel davranışı, grafiklerin ekrandaki
  flat/bordered hali.
## TAMAMLANDI: Tutarlılık & Kullanılabilirlik Revizyonu (2026-09-06, `origin/main` tabanlı)

İlk denemede yanlışlıkla güncellenmemiş yerel `main`'den (Phase 4 öncesi) dal
açılmıştı; bu PR **`origin/main`** (canlı/cloud: Phase 4 wizard + ışık landing +
API break-even) üzerine yeniden uygulandı. Revizyon + landing değişiklikleri tek
PR (#4). Önemli kararlar:

- **Sıralama numaraları kaldırıldı:** Header sekmeleri "1. Çıkarım / 2.
  Fine-Tuning" → "Çıkarım / Fine-Tuning"; `SectionHeader ▸ 0N` ve **Wizard adım
  sekmesi "01–06"** numaraları silindi.
- **Tensor Parallelism kaldırıldı:** `tensorParallelism`/`pipelineParallelism`/
  `tpEfficiencyPct` hesaba hiç girmiyordu; seçiciler + UI + CLI parametreleri
  temizlendi, `calculator.ts` sabit 0.85 verimlilik kullanır. Eski share URL'leri
  alanları yoksayarak açılır.
- **Header sadeleşti:** Kaydet/Kopyala/Karşılaştır/AI Mimar/Dışa Aktar/şablon
  dropdown'ı çıktı; kalan: logo, mod sekmeleri, dil, sıfırlama.
- **Sol Senaryo çubuğu (`ScenarioSidebar`):** hazır şablonlar + kayıtlı senaryo
  listesi (dinamik, `llmcalc:scenarios-changed` event'i ile), tıklayınca açılan
  detay mini-paneli (Yükle / **Dışa Aktar MD** / Sil), altta Karşılaştır.
- **Sonuç eylemleri:** inference + fine-tuning sonuç panellerinde belirgin
  "Senaryoyu Kaydet", "Bağlantıyı Kopyala" (paylaşım bilgisi ikonu), "Markdown
  Dışa Aktar". Yeni **API sekmesi**: CLI / K8s / JSON (MLX komutu dahil) +
  mevcut **break-even** tek tab altında birleştirildi. CloudTab'daki kamuya açık
  "Yenile" butonu kaldırıldı (fiyat yenileme yalnızca admin).
- **AI özellikleri kaldırıldı:** Akıllı Model Seçimi + AI Mimar; `/api/recommend-model`
  + `/api/advisor` + `@google/genai` silindi; yerine Model adımında "Model nasıl
  seçilir?" bilgi ikonu.
- **Engine uyumluluk matrisi:** `INFERENCE_ENGINES`'e `supportedVendors`/
  `supportedQuants`/`details`/reasons + yeni **MLX** motoru; engine seçicide
  quant uyumsuzları devre dışı, GPU üretici çakışması uyarı + quant-aware
  otomatik geçiş (`pickCompatibleEngine`), preset/quant değişimlerinde de
  uzlaştırma.
- **Apple Silicon GPU'ları:** M6, M5 Pro, M5 Max, M3 Ultra, M5 Ultra
  (`tier:'unified'`, yerel maliyet 0) + TCO `GPU_HARDWARE_SPECS` + CloudTab
  Apple notu.
- **Custom model/GPU localStorage:** `customModelStorage.ts`
  (`llmcalc:customModels`, `llmcalc:customGpu`); ModelSelector "Özel Modellerim"
  + **yapımcı kurum (provider) filtresi**.
- **Bilgi ikonları:** `ui/InfoTooltip` (engine detayları, quant, GPU, model
  seçim rehberi, sonuç metrikleri, KV cache).
- **Hata düzeltmeleri:** fine-tuning `vramPerGpuNeededGB` / `gpuCount`; AboutModal
  TP/PP iddiası; DB boot retry (`initDb`); `SESSION_SECRET` rastgele fallback;
  admin login 503; ölü bileşenler silindi (GpuComparisonTable, ContextScalingChart).
- **Landing:** "Calculator Modules" grid kaldırıldı; "Real scenarios, real
  numbers" → "Scenarios and numbers" (TR: "Senaryolar ve rakamlar"); senaryo
  kartları + "Start Calculating" ortalandı; **metodoloji** ve **veri
  kaynağı/şeffaflık** bölümleri eklendi (fiyatlar RunPod/Lambda/Modal'dan
  periyodik çekilir, **sponsorluk yok**; modeller HF Hub + derlenmiş katalog);
  **model + GPU sayısı** gösterilir.
- **Doğrulama:** `npm run lint` ✅, `npm run build` ✅, dev smoke (`/`, `/app`,
  `/api/models`, `/api/gpu-prices` 200; `/api/advisor` 404; landing'de modüller
  yok, yeni bölümler var), reconciliation runtime testi ✅, i18n eksik anahtar 0 ✅.
