import { CalculatorConfig, CalculationResults, FineTuningConfig, FineTuningResults } from '../types';

const fmt = (v: number | undefined | null, digits = 2) =>
  v == null || Number.isNaN(v) ? '—' : v.toLocaleString('tr-TR', { maximumFractionDigits: digits });

const fmtMoney = (v: number | undefined | null) =>
  v == null || Number.isNaN(v) ? '—' : `$${v.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

export function buildInferenceMarkdown(config: CalculatorConfig, results: CalculationResults, scenarioName?: string): string {
  const header = scenarioName ? `# Senaryo: ${scenarioName}\n` : '# LLM Inference & VRAM Raporu\n';
  const status = results.isOom
    ? '**OOM — Donanım Yetersiz** (önerilen min. GPU: ' + results.recommendedMinGpus + 'x)'
    : '**Uygun (OK)** — VRAM doluluk %' + fmt(results.vramUtilizationPct, 0);

  const cloudLines = results.cloudCosts
    .map((c) => `- **${c.providerName}:** ${fmtMoney(c.totalHourlyCostUsd)}/saat (${fmtMoney(c.totalMonthlyCostUsd)}/ay) • ${c.matchedInstance} ${c.isCheapest ? '**[EN UYGUN]**' : ''}`)
    .join('\n');

  return `${header}
**Model:** ${results.modelName} (${results.totalParamsB}B Params${results.activeParamsB !== results.totalParamsB ? `, ${results.activeParamsB}B aktif (MoE)` : ''})
**Engine:** ${results.engineName} (${results.engineBadge})
**GPU Donanımı:** ${config.gpuCount}x ${results.gpuName} (${fmt(results.totalVramAvailableGB, 0)} GB toplam)
**Kuantizasyon:** ${String(config.quantId).toUpperCase()} (KV Cache: ${String(config.kvCacheQuantId).toUpperCase()})
**İş Yükü:** ${results.activeTotalUsers} eşzamanlı kullanıcı (Prompt: ${results.effectivePromptLen} token / Çıktı: ${results.effectiveGenLen} token)

## Bellek Dağılımı (VRAM)
- **Model Ağırlıkları:** ${fmt(results.weightMemoryGB)} GB
- **KV Cache:** ${fmt(results.kvCacheMemoryGB)} GB (kullanıcı başına ${fmt(results.kvCachePerUserMB, 0)} MB)
- **Aktivasyonlar:** ${fmt(results.activationMemoryGB)} GB
- **CUDA / Runtime Overhead:** ${fmt(results.cudaOverheadGB)} GB
- **Toplam Gerekli:** ${fmt(results.totalVramNeededGB)} GB / Mevcut: ${fmt(results.totalVramAvailableGB)} GB
- **Durum:** ${status}

## Performans & Maliyet
- **TTFT (ilk token):** ${fmt(results.ttftMs, 0)} ms
- **TPOT (token başına):** ${fmt(results.tpotMs, 1)} ms (${fmt(results.tokensPerSecPerUser, 1)} t/sn kullanıcı)
- **Sistem Çıktısı:** ${fmt(results.systemThroughputTokensPerSec, 0)} token/sn
- **Saatlik Maliyet:** ${fmtMoney(results.hourlyCostUsd)}/saat (Aylık: ${fmtMoney(results.monthlyCostUsd)})
- **1M Token Maliyeti:** ${fmtMoney(results.costPerMillionTotalTokensUsd)} (girdi ${fmtMoney(results.costPerMillionInputTokensUsd)} / çıktı ${fmtMoney(results.costPerMillionOutputTokensUsd)})

## Bulut GPU Sağlayıcı Karşılaştırması
${cloudLines || '- Bulut sağlayıcı fiyatlandırması bulunamadı (Apple Silicon vb. yerel donanım).'}

## Türkiye On-Premise (Yerel) TCO & ROI
- **Donanım Yatırımı (CAPEX):** ${fmtMoney(results.onPremTco.hardwareCapexUsd)} (₺${fmt(results.onPremTco.hardwareCapexTry, 0)})
- **Yıllık Elektrik:** ${fmtMoney(results.onPremTco.annualElectricityCostUsd)} (₺${fmt(results.onPremTco.annualElectricityCostTry, 0)}) • ${fmt(results.onPremTco.annualElectricityKwh, 0)} kWh
- **Yıllık Soğutma:** ${fmtMoney(results.onPremTco.annualCoolingCostUsd)} (₺${fmt(results.onPremTco.annualCoolingCostTry, 0)})
- **Yıllık Bakım:** ${fmtMoney(results.onPremTco.annualMaintenanceUsd)} (₺${fmt(results.onPremTco.annualMaintenanceTry, 0)})
- **1 Yıllık TCO:** ${fmtMoney(results.onPremTco.totalFirstYearCostUsd)} (₺${fmt(results.onPremTco.totalFirstYearCostTry, 0)})
- **3 Yıllık TCO:** ${fmtMoney(results.onPremTco.totalThreeYearCostUsd)} (₺${fmt(results.onPremTco.totalThreeYearCostTry, 0)}) • Aylık ortalama ${fmtMoney(results.onPremTco.monthlyAverageCostUsd)}
- **Buluta Göre Başabaş:** ${results.onPremTco.breakEvenDescription}
`;
}

export function buildFineTuningMarkdown(config: FineTuningConfig, results: FineTuningResults, scenarioName?: string): string {
  const header = scenarioName ? `# Senaryo: ${scenarioName}\n` : '# LLM Fine-Tuning & Maliyet Raporu\n';
  const status = results.isOom
    ? '**OOM — Donanım Yetersiz** (önerilen min. GPU: ' + results.recommendedMinGpus + 'x)'
    : '**Uygun (OK)** — VRAM doluluk %' + fmt(results.vramUtilizationPct, 0);

  const platforms = results.platformEstimates
    .map((p) => `- **${p.platformName}:** ${fmtMoney(p.totalCostUsd)} • ${p.estimatedTimeFormatted} • ${p.isFeasibleVram ? 'Uygun' : 'Yetersiz VRAM'}${p.isCheapestFeasible ? ' **[EN UCUZ]**' : ''}${p.isFastestFeasible ? ' **[EN HIZLI]**' : ''}${p.freeTierUsable ? ' **[ÜCRETSİZ]**' : ''}`)
    .join('\n');

  return `${header}
**Model:** ${results.modelName} (${results.totalParamsB}B Params)
**Yöntem:** ${results.methodName} (${results.methodBadge})
**Framework:** ${results.frameworkName}
**Veri Seti:** ${results.totalSamples.toLocaleString('tr-TR')} örnek / ${results.totalTokens.toLocaleString('tr-TR')} token / ${config.epochs} epoch
**Adım Sayısı:** ${results.totalSteps} (efektif batch ${results.effectiveBatchSize})

## VRAM Gereksinimi
- **Model Ağırlıkları:** ${fmt(results.weightVramGB)} GB
- **Gradyanlar:** ${fmt(results.gradientVramGB)} GB
- **Optimizer Durumları:** ${fmt(results.optimizerVramGB)} GB
- **Aktivasyonlar:** ${fmt(results.activationVramGB)} GB
- **Toplam Gerekli:** ${fmt(results.totalVramNeededGB)} GB (kart başına ${fmt(results.vramPerGpuNeededGB)} GB)
- **Durum:** ${status}
- **Önerilen Min VRAM:** ${fmt(results.recommendedMinVramGB, 0)} GB (${results.recommendedMinGpus} GPU)

## Süre & Hız
- **Eğitim Süresi:** ${results.trainingTimeFormatted} (${fmt(results.trainingTimeHours, 2)} saat)
- **Unsloth Hızlandırma:** ${fmt(results.unslothSpeedupMultiplier, 1)}x (${fmt(results.unslothTimeSavedHours, 1)} saat tasarruf)
- **Standart PyTorch HF Süresi:** ${fmt(results.standardHfTimeHours, 2)} saat

## Platform Maliyet Karşılaştırması
${platforms}

## Yerel Kullanım
- **Yerel Elektrik Maliyeti:** ${fmt(results.localElectricityCostTry, 0)} ₺ (${fmtMoney(results.localElectricityCostUsd)})
- **Unsloth Maliyet Tasarrufu:** ${fmtMoney(results.unslothCostSavingsUsd)}
`;
}