# Frontend Redesign — "Instrument Panel" Design

**Tarih:** 2026-08-22
**Durum:** Onaylandı (brainstorming oturumu sonrası)

## Amaç

Mevcut "AI üretimi görünümlü" açık tema (slate + indigo, tek sütunlu uzun kaydırma) yerine; koyu, teknik, hesap makinesi estetiğinde bir arayüz. İlham: opencode.ai web UI (teknik-brutalist, monokrom + tek vurgu rengi, terminal/mono tipografi). İki sekme de (inference + fine-tuning) aynı kabuğu kullanır.

Kapsam: header, her iki sekme, tüm modallar (AI advisor, export, scenarios, comparison, admin) tek geçişte yeniden tasarlanır. Hesaplama mantığı, veri akışı ve Türkçe UI metinleri **değişmez**.

## Tasarım kararları (oturumdan)

- Koyu tema, açık ve net; vurgu rengi **amber** (`#FFB224`)
- **Mono-ağır** tipografi: sayılar, metrikler, etiketler, badge'ler, input'lar monospace; düzyazı Inter
- **Kompakt** yoğunluk (8/12px ritim, küçük kontrol yükseklikleri)
- **2 sütunlu** düzen: solda konfigürasyon, sağda sticky sonuç paneli (yaklaşım A "Instrument Panel")

## Bölüm 1: Görsel tasarım sistemi

### Renk paleti (Tailwind v4 `@theme`)

| Token | Değer | Kullanım |
|---|---|---|
| `bg` | `#0F0E0D` | sayfa arka planı (sıcak siyah) |
| `surface` | `#171615` | paneller/kartlar |
| `surface-2` | `#1E1D1B` | inputlar, iç bloklar, hover |
| `border` | `#2A2826` | hairline kenarlık (1px, gölge yok) |
| `text` | `#EDEAE6` | birincil metin |
| `text-muted` | `#8E8B8B` | etiketler, açıklamalar |
| `accent` | `#FFB224` | amber — aktif durum, ana sayılar, focus |
| `ok` | `#3FB950` | VRAM uyuyor, doğrulama |
| `danger` | `#F85149` | OOM, hata |

### Tipografi

- **JetBrains Mono** — sayılar, metrikler, etiketler, badge'ler, input değerleri, kod benzeri değerler
- **Inter** — yalnızca düzyazı/açıklamalar
- Fontlar `@fontsource` ile self-host veya Google Fonts link'i

### Görsel dil

- Drop shadow yok, gradient yok, `rounded-2xl` yok — düz yüzeyler, 1px kenarlık, en fazla `rounded-md`
- ASCII/terminal dokunuşları: `▸ 01 MODEL` biçiminde numaralı mono bölüm başlıkları, büyük harf mono mikro-etiketler, grafiklerde `Fig 1.`-tarzı açıklamalar
- Durum, ikon karmaşası yerine renk + mono badge (`[OK]`, `[OOM]`)
- Kompakt aralık

## Bölüm 2: Düzen ve bileşen mimarisi

### Sayfa yapısı

```
┌────────────────────────────────────────────────────────┐
│ Header: logo · [INFERENCE | FINE-TUNE] · aksiyonlar     │
├──────────────────────────────────┬─────────────────────┤
│ Konfigürasyon kolonu (kayar)     │ Sonuç paneli        │
│ ▸ 01 MODEL                       │ ┌─────────────────┐ │
│ ▸ 02 QUANTIZATION                │ │ Llama 3.3 70B   │ │
│ ▸ 03 ENGINE                      │ │ 2× H100 · FP8   │ │
│ ▸ 04 GPU HARDWARE                │ │ VRAM ████░ 78%  │ │
│ ▸ 05 WORKLOAD                    │ │ [OK] 142.6/160GB│ │
│   (kompakt katlanabilir gruplar) │ ├─────────────────┤ │
│                                  │ │ ana metrik ız    │ │
│                                  │ ├─────────────────┤ │
│                                  │ │ VRAM|PERF|COST| │ │
│                                  │ │ CLOUD|TCO sekm  │ │
│                                  │ │ (kaydırılabilir)│ │
│                                  │ └─────────────────┘ │
│                                  │ sticky, kendi scroll│
└──────────────────────────────────┴─────────────────────┘
```

- Izgara: `lg:grid-cols-[1fr_460px]`
- Panel: `sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto`
- Fine-tuning sekmesi aynı kabuk: konfigürasyon grupları (model, method/framework, GPU, dataset & hyperparametreler) + panel sekmeleri (`VRAM / TIME / COST`)
- Mobil (`<lg`): tek sütun — önce konfigürasyon, sonra panel inline

### Bileşen değişiklikleri

**Yeni `src/components/ui/` primitifleri:** `Panel`, `SectionHeader`, `Stat`, `Badge`, `Field`, `NumberInput`, `Select`, `Segmented`, `Tabs`, `Collapse`

**Yeni:** `ResultsPanel` (inference), `FineTuningResultsPanel` — mevcut 6 sonuç kartı kompakt sekme görünümlerine dönüşür (mono tablolar, bar metreler, kart şeması yok).

**Yeniden inşa:** `ModelSelector`, `QuantizationSelector`, `InferenceEngineSelector`, `GpuConfigurator`, `WorkloadConfigurator`, `FineTuningDashboard`, `Header` — aynı props/state, primitifler üzerinde.

**Restyle:** tüm modallar (`AiAdvisorModal`, `ExportModal`, `ScenarioModal`, `ScenarioComparisonModal`, `AdminPanel`).

## Bölüm 3: Detaylar, durumlar ve teslimat

### Mevcut kartların hedefi (inference panel sekmeleri)

| Sekme | Kaynak |
|---|---|
| `VRAM` | VramBreakdownCard (stacked bar metre + mono kırılım satırları) |
| `PERF` | PerformanceCard (throughput, TTFT/TPOT, kullanıcılar) |
| `COST` | CostAnalysisCard (cloud vs on-prem başlığı, $/mo, $/1M token) |
| `CLOUD` | CloudCostComparisonCard + GpuPricesCard birleşik (sağlayıcı fiyat matrisi, canlı scrape zaman damgası, en ucuz vurgulu) |
| `TCO` | OnPremisesTcoCard (Türkiye elektrik, PUE, özel maliyet override'ları) |

Fine-tuning panel sekmeleri: `VRAM` (kırılım + uyum), `TIME` (süre, adımlar, samples/s), `COST` (elektrik TRY + cloud $).

### Durumlar

- OOM → kırmızı `[OOM]` badge'i + panel başlığı danger rengine döner
- Yükleniyor → mono skeleton satırları
- API kapalı → mevcut preset-fallback mantığı korunur; `HF'DEN DOĞRULANAMADI` / `TOPLULUK AYNASI` badge'leri mono chip olarak restyle edilir
- Tüm Türkçe metinler aynen korunur

### Motion

- Sadece ince geçişler: sekme crossfade, collapse yükseklik animasyonu — mevcut `motion` kütüphanesiyle

### Teslimat sırası

1. `index.css`'te tasarım token'ları (`@theme`: renkler, fontlar, scrollbar) + `ui/` primitifleri
2. Header + `App.tsx` kabuğu (2 sütunlu grid, sticky panel)
3. Inference konfigürasyon bileşenleri primitifler üzerinde yeniden inşa
4. `ResultsPanel` 5 sekme görünümü
5. Fine-tuning sekmesi (konfigürasyon + `FineTuningResultsPanel`)
6. Modallar + admin paneli
7. Doğrulama: `npm run lint`, `npm run build`, `npm run dev` ile manuel QA

## Kısıtlamalar

- Hesaplama mantığı, veri akışı, Türkçe string'ler ve `vite.config.ts` HMR bloğu **dokunulmaz**
- Yalnızca sunumsal (presentational) yeniden tasarım — props/state/hesap değişmez