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

## Notlar / tuzaklar
- Seed (`modelCatalogSeed.ts`): `ON CONFLICT (hf_id)` upsert — mimariyi/raw_json'u korur, curated alanlarını günceller, keşfedilen satırları silmez.
- Refresh (`modelRefresh.ts`): curated hf_id'lerini HF'den çeker, `raw_json=source:huggingface`, `scraped_at=now()`, `verified=true`; gated modeller 401/403 → `failed` listesinde, `verified=false` işaretlenir, curated fallback korunur.
- `verified`: mimarinin canlı HF config'inden teyit edildiğini gösterir. `false` = gated/404 (preset fallback). Keşif satırları her zaman `true`.
- Keşif yalnızca INSERT (yeni) + UPDATE (mevcut) yapar; silme yapmaz — katalogdan çıkarmak istediğin keşif satırlarını elle `DELETE ... WHERE NOT curated` ile temizle.
- `.env`'de `HUGGINGFACE_API_KEY` var; `hfClient` hem `HF_TOKEN` hem `HUGGINGFACE_API_KEY` okur.