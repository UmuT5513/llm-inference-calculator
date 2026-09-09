<div align="center">

# ∑ LLM Hardware & Cost Architect

**LLM çıkarım (inference) ve fine-tuning için açık kaynak bir VRAM, hız ve maliyet hesaplayıcısı.**

Yüzlerce modellik katalogla açık kaynak LLM'leri karşılaştırın; kendi GPU'nuzla veya canlı bulut fiyatlarıyla —
TCO, self-host vs. API başa-baş (break-even) analizi ve Unsloth hızlandırmalı fine-tuning tahminleriyle. Giriş
gerekmez, ücretsizdir.

[**Canlı dene**](https://llminferencecalc.com.tr) · [`English → README.md`](README.md)

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![React 19](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-38BDF8?logo=tailwindcss&logoColor=white)

</div>

---

## Ne yapar

Model + donanım seçimini somut rakamlara dönüştüren adım adım bir **sihirbaz (wizard)**:

- **Inference** — `01 Model → 02 Quantization → 03 Engine → 04 GPU → 05 Workload → 06 Sonuçlar`
- **Fine-tuning** — `01 Model → 02 Fine-Tuning Yapılandırması → 03 Sonuçlar`

Her yapılandırma uyumluluk kurallarına göre (quant ↔ engine ↔ GPU üreticisi) gerçek zamanlı olarak uzlaştırılır ve
yapışkan özet çubuğu her zaman özeti gösterir: **VRAM uyumu**, **aylık maliyet**, **token/sn**.

### Elde ettiğiniz sonuçlar

| Panel | Ne yanıtlıyor |
| --- | --- |
| **VRAM** | Ağırlıklar bu GPU'ya, bu quant'ta, KV-cache ve runtime maliyetiyle sığıyor mu? |
| **Performans** | GPU'nun hesap/bellek bant genişliğinden tahmini token/sn ve gecikme. |
| **Maliyet** | Token başına ve aylık servis maliyeti (self-host veya kiralık donanım). |
| **TCO** | N aylık toplam sahip olma maliyeti: donanım + elektrik + operasyon. |
| **Bulut** | RunPod / Lambda / Modal'dan canlı kazınmış fiyatlar; en ucuz eşleşme dâhil. |
| **API başa-baş** | 1M token başına self-host vs. hosted-API maliyeti — self-host'un kâra geçtiği hacim. |

### Model & donanım kataloğu

- **Yüzlerce açık kaynak LLM** tek katalogda (DeepSeek, Llama, Qwen, Gemma, Mistral, Phi, Türkçe modeller ve
  daha fazlası). `hfId` taşıyan kayıtlar Hugging Face'ten canlı mimari verisi çeker (`config.json` + parametreler).
- **30 GPU ön ayarı** — NVIDIA veri merkezi ve iş istasyonu (GB200, B200, H200, H100, GH200, A100, L40S, L4, RTX
  5090/Ada/A-serisi…), AMD MI300X ve Apple Silicon (M6, M5 Pro/Max/Ultra, M3 Ultra).
- **7 inference motoru** — vLLM, llama.cpp, TensorRT-LLM, SGLang, TGI, Ollama, MLX.
- **Quant türleri** — FP16, FP8 ve GGUF K-quant'lar (Q8_0…Q3_K); her biri engine/üretici uyumluluğuna göre
  filtrelenir.
- **Fine-tuning** — QLoRA, LoRA, tam fine-tuning, DPO/ORPO; çerçeveler Unsloth, HF TRL+LoRA, TorchTune, DeepSpeed,
  Axolotl; otomatik micro-batch / gradient accumulation optimizasyonu ve Unsloth'un ~4× hızlandırması dâhildir.
- **İş yükü profilleri** — sohbet, RAG ve kod üretimi token akışları.

### Hazır gelen ekstralar

- **Canlı bulut GPU fiyatları** gerçek kazıyıcılardan (sponsorluk yok; kaynaklar açıkça belirtilir) ve **HF
  Hub'dan tazelenen canlı model kataloğu** — ikisi de mevcutken statik ön ayarların yerini alır.
- **Paylaşılabilir senaryo URL'leri** (`/app?c=…`) — herhangi bir yapılandırmayı serileştirin, paylaşın, açılışta
  geri yüklenir.
- **Senaryo yöneticisi** — senaryoları kaydedin/karşılaştırın/dışa aktarın; raporlar için **Markdown dışa aktarım**.
- **TR/EN yerelleştirme** — tarayıcı algılamalı varsayılan, kalıcı değiştirici; sunucu taraflı landing her iki
  dilde.
- **Metodoloji şeffaflığı** — tüm formüller ve veri kaynakları sitede belgelenmiştir.

---

## Teknoloji yığını & mimari

- **Ön yüz:** React 19 + Vite + Tailwind CSS v4, i18next (TR/EN), light-brutalist arayüz (Inter + JetBrains Mono).
- **Arka uç:** tek bir Express (TypeScript) sunucusu. Geliştirmede Vite'ı middleware modunda başlatır ve SPA + API'yi
  tek portta sunar; üretimde derlenmiş `dist/` klasörünü sunar.
- **Veritabanı:** PostgreSQL (`pg`) — kazınmış GPU fiyatlarını ve canlı HF model kataloğunu saklar. Şema açılışta
  otomatik oluşturulur ve tohumlanır (yeniden denemeli — Postgres geç gelirse uygulama kendini toparlar).
- **Kazıyıcılar:** Python (`uv` ile çalışır, Python 3.13) — RunPod, Lambda ve Modal fiyat senkronizasyonu.

```text
                    ┌────────────────────────────────────────────────────────┐
                    │               Express (server.ts)                      │
                    │                                                        │
   Tarayıcı ──────► │  GET /            SSR landing (TR/EN, SEO meta)        │
    /app ─────────► │  GET /app         SPA kabuğu + route meta enjeksiyonu  │
                    │  /sitemap.xml     /robots.txt                          │
                    │                                                        │
                    │  GET  /api/models        canlı HF katalog (cache)      │
                    │  GET  /api/gpu-prices    canlı fiyatlar (cache)        │
                    │  POST /api/models/refresh   ─┐                          │
                    │  POST /api/gpu-prices/refresh│  admin oturumu (JWT)     │
                    │  /api/admin/*  yerel admin girişi                       │
                    └───────┬───────────────┬───────────────┬────────────────┘
                            │               │               │
                      PostgreSQL     HF Hub (tazeleme)   runpod/lambda/modal
                    gpu_prices                          (python kazıyıcılar, uv)
                    hf_models
```

Genel veri akışları **salt-okunur ve cache'li**: katalog/fiyat tazelemesini yalnızca admin oturumu tetikleyebilir.

---

## Hızlı başlangıç

### Gereksinimler

- **Node.js** (>= 22) ve npm
- Yerel olarak çalışan **PostgreSQL**; `.env.example`'dakine benzer bir `DATABASE_URL`

### Yerel çalıştırma

```bash
npm install
cp .env.example .env        # DATABASE_URL ayarla (+ admin paneli için SESSION_SECRET, ADMIN_*)
npm run dev                 # http://localhost:3000
```

> Postgres çalışmasa bile sunucu ayakta kalır (migration/seed ~60 sn yeniden denenir), ancak DB'ye bağlı rotalar
> 500 döner — Postgres'in eksik olması bozuk dev çalıştırmanın en sık nedenidir.

### Komutlar

| Komut | Ne yapar |
| --- | --- |
| `npm run dev` | Geliştirme modunda sunucuyu başlatır (Vite middleware). |
| `npm run build` | `vite build` + `server.ts`'nin esbuild bundle'ı → `dist/server.cjs`. |
| `npm run start` | Üretim derlemesini sunar (`NODE_ENV=production node dist/server.cjs`). |
| `npm run lint` | Sadece tip kontrolü: `tsc --noEmit`. (Test framework'ü yok.) |
| `npm run scrape:prices` | GPU fiyatlarını RunPod/Lambda/Modal'dan tazeler (Python/`uv`; `DATABASE_URL` gerekir). |

### Ortam değişkenleri

Tümünün listesi `.env.example` içinde. Temel olanlar:

| Değişken | Zorunlu | Notlar |
| --- | --- | --- |
| `DATABASE_URL` | evet | Postgres bağlantı dizgisi; localhost dışı sunucularda `?sslmode=` yoksa SSL otomatik açılır. |
| `PORT` | hayır | HTTP portu (varsayılan 3000). |
| `SESSION_SECRET` | hayır | Admin JWT'sini imzalar; **üretimde mutlaka ayarlayın** (ayarlanmazsa her açılışta rastgele üretilir). |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | hayır | Yerel admin panelini (Yönetim) etkinleştirir. |
| `POSTGRES_PASSWORD` | yalnız compose | Docker Compose `db` kapsayıcısının parolası. |

---

## Verileri güncel tutmak

- **GPU fiyatları** — `npm run scrape:prices`, RunPod/Lambda/Modal verilerini `gpu_prices` tablosuna senkronize eder.
- **Model kataloğu** — Hugging Face Hub'dan admin paneli üzerinden tazelenir (`POST /api/models/refresh`,
  admin-oturumlu; zamanlayıcı yok). Statik ön ayarlar çevrimdışı geri dönüştür.

---

## Proje yapısı

```text
server.ts                  Express uygulaması: rotalar, landing, SEO, dev/prod sunum
src/
  components/              Wizard adımları, sonuç panelleri, admin gate, UI bileşenleri
  data/                    presets.ts (engine/quant/profil), modelCatalog.ts,
                           gpuPresets.ts, fineTuningPresets.ts, cloudProviders.ts,
                           apiPricePresets.ts
  utils/                   calculator.ts, fineTuningCalculator.ts,
                           engineCompatibility.ts, scenarioStorage.ts,
                           shareUrl.ts, scenarioMarkdown.ts …
  server/                  db.ts (migration), hfModels.ts, gpuPrices.ts, gpuScraper.ts,
                           adminAuth.ts, landing.ts, seo.ts …
  hooks/                   useLiveModels.ts, useLiveGpuPrices.ts
  i18n/                    tr.json / en.json
scripts/scraper/           Python fiyat kazıyıcıları (uv)
docs/superpowers/          Tasarım şartnameleri & uygulama planları
```

---

## Üretim dağıtımı

```bash
docker compose up -d --build
```

- Çok aşamalı `Dockerfile` (node:22-alpine) + healthcheck'li `postgres:16-alpine` servisi.
- Uygulama yalnızca **host loopback'ine yayın yapar** (`127.0.0.1:8081`); TLS/reverse-proxy'yi host'a kurulu
  nginx (certbot) üstlenir.

---

## Katkıda bulunma

Bu açık kaynak bir projedir — katkılar memnuniyetle karşılanır.

1. Fork alın, branch açın, değişiklikleri odaklı tutun.
2. Arayüz metinleri ve kullanıcıya dönük API hataları **Türkçe**dir; yeni arayüz metni hem `src/i18n/tr.json` hem de
   `src/i18n/en.json` dosyasına eklenmelidir.
3. PR öncesi doğrulama: `npm run lint` ve `npm run build` geçmeli. Test framework'ü yok — `npm run dev` ile manuel
   smoke test beklenir.
4. Büyük bir işe başlamadan önce [`PLAN.md`](PLAN.md) içindeki tamamlanmamış işleri ve yolu okuyun.

## Güvenlik

Güvenlik modeli, açık zafiyet bildirimi ve üretim sertleştirme kontrol listesi için
[`SECURITY.md`](SECURITY.md) dosyasına bakın.

## Lisans

Bu proje **açık bir lisans olmadan** yayımlanmıştır — izin almadan yeniden kullanım için hiçbir hak
tanınmaz. Lisans tartışmaları için lütfen [issue açın](https://github.com/UmuT5513/llm-inference-calculator/issues).

## Teşekkür

Bir **Google AI Studio** şablonundan üretilmiş; canlı veri entegrasyonu, yerelleştirme, SEO ve özel bir
hesaplama motoruyla üretim aracına dönüştürülmüştür.