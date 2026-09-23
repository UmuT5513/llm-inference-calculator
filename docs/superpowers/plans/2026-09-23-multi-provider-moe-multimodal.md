# Plan — Çok sağlayıcılı model kataloğu + MoE/Multimodal hesap düzeltmesi + veri yenileme

Tasarım onaylandı (2026-09-23). Mimari: architectural. Bu dosya görev takibini tutar.

## Kapsam
1. **ModelSourcesz kataloğu genişlet:** HF + ModelScope + Ollama. Dedup tek satır/model; `sources[]` linkli; çıkış tarihi; model adımında sağ detay paneli.
2. **Hesap düzeltmesi:** MoE aktif-param formülü (DeepSeek-V3 ~37B doğru), multimodal (vision enkoderi VRAM, medya token'ları → KV/prefill: 1 görsel ≈ 1024 tok, ses ≈ 50 tok/sn, ayarlanabilir).
3. **Veri yenileme:** GPU fiyat + model refresh çalıştır (DB canlı veriyle doldurulur).

## Ortak temel (tamamlandı — bu oturum)
- [x] `types.ts`: ModelSource + modelscope/ollama; ModelPreset yeni alanlar (sources, releasedAt, releasedLabel, isMultimodal, modalities, visionParamsB, expertIntermediateSize, numSharedExperts); UserProfile/CalculatorConfig medya alanları.
- [x] `db.ts`: additive kolonlar + canonical_id backfill + partial unique.
- [x] `defaults.ts` / `presets.ts`: medya default'ları.

## Ajanlar (paralel)
- [x] Ajan A — Backend sağlayıcılar: modelConfig.ts (paylaşılan config ayrıştırma + düzeltilmiş MoE aktif-param + multimodal tespit), modelScopeClient, ollamaClient, knownOrgs (identity katmanı), modelRefresh (multi-provider, dedup, sources/link, linked sayacı), hfModels (API yeni alanlar), modelCatalogSeed.
- [x] Ajan B — Hesaplama motoru: calculator.ts (mediaTokensForModel → KV/prefill/maliyet), WorkloadConfigurator (multimodal girdiler).
- [x] Ajan C — Katalog UI: useLiveModels, ModelSelector (2 kolon), ModelDetailsPanel (yeni).

## Entegrasyon (ben)
- [x] App.tsx kablolama (workload medya props'ları; model adımı 2 kolon ModelSelector içinde).
- [x] i18n anahtarları (tr/en): workload.media* (6), provider.* (3), model.multimodalBadge, modelDetails.* (18). Doğrulandı: tüm statik t() anahtarları mevcut.
- [x] `npm run lint` (tsc --noEmit) ✅.
- [x] `npm run build` ✅.
- [x] GPU fiyat + model refresh çalıştırıldı; `/api/models` + `/api/gpu-prices` doğrula. (Model: fetched=122 updated=122 mirrored=29 discovered=146 linked=107 failed=2 → DB 444 satır. GPU: runpod 19 / modal 11 / lambda 10.)
- [x] `PLAN.md` / `AGENTS.md` güncelle.