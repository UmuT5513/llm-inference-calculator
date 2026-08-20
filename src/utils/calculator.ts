import { CalculatorConfig, CalculationResults, ModelPreset, GpuPreset, CloudProviderCost, OnPremisesTco } from '../types';
import { MODEL_PRESETS, GPU_PRESETS, QUANTIZATION_OPTIONS, INFERENCE_ENGINES, CLOUD_PROVIDERS, CLOUD_PROVIDER_EQUIVALENTS, GPU_HARDWARE_SPECS, DEFAULT_CUSTOM_MODEL, DEFAULT_CUSTOM_GPU } from '../data/presets';

export function calculateInferenceMetrics(
  config: CalculatorConfig,
  priceOverrides?: Record<string, number>,
  catalog?: ModelPreset[]
): CalculationResults {
  const modelCatalog = catalog && catalog.length > 0 ? catalog : MODEL_PRESETS;
  // 1. Resolve Model
  let model: ModelPreset;
  if (config.modelId === 'custom') {
    model = config.customModel || DEFAULT_CUSTOM_MODEL;
  } else {
    model = modelCatalog.find((m) => m.id === config.modelId) || modelCatalog[1];
  }

  // 2. Resolve Quantization
  const quant = QUANTIZATION_OPTIONS.find((q) => q.id === config.quantId) || QUANTIZATION_OPTIONS[0];
  const bytesPerWeight = quant.bytesPerParam;

  // Resolve KV Cache Quantization
  let bytesPerKvParam = 2.0;
  if (config.kvCacheQuantId === 'fp8') bytesPerKvParam = 1.0;
  if (config.kvCacheQuantId === 'int4') bytesPerKvParam = 0.5;

  // 3. Resolve Inference Engine
  const engine = INFERENCE_ENGINES.find((e) => e.id === config.engineId) || INFERENCE_ENGINES[0];

  // 4. Resolve GPU
  let gpu: GpuPreset;
  if (config.gpuId === 'custom') {
    gpu = config.customGpu || DEFAULT_CUSTOM_GPU;
  } else {
    gpu = GPU_PRESETS.find((g) => g.id === config.gpuId) || GPU_PRESETS[2];
  }

  const gpuCount = Math.max(1, config.gpuCount || 1);
  const totalParamsB = model.totalParamsB;
  const activeParamsB = model.activeParamsB;

  // Live scraped price override (gpuId -> hourly USD) takes precedence over the static preset.
  const gpuHourlyCostUsd =
    priceOverrides && priceOverrides[gpu.id] != null ? priceOverrides[gpu.id] : gpu.hourlyCostUsd;

  // A. Model Weights Memory (GB)
  const weightMemoryGB = totalParamsB * bytesPerWeight;

  // B. Workload & KV Cache Memory Calculation (Multi-profile or Single Batch)
  const numLayers = model.numLayers;
  const numKvHeads = model.numKvHeads;
  const headDim = model.headDim;
  const kvBytesPerTokenPerLayer = 2 * numKvHeads * headDim * bytesPerKvParam;

  let activeTotalUsers = 0;
  let effectivePromptLen = 0;
  let effectiveGenLen = 0;
  let totalKvCacheBytes = 0;

  if (config.useMultiProfile && config.userProfiles && config.userProfiles.length > 0) {
    let sumPromptUser = 0;
    let sumGenUser = 0;

    config.userProfiles.forEach((p) => {
      const uCount = Math.max(0, p.userCount || 0);
      const pLen = Math.max(1, p.promptLen || 1024);
      const gLen = Math.max(1, p.genLen || 512);

      activeTotalUsers += uCount;
      sumPromptUser += uCount * pLen;
      sumGenUser += uCount * gLen;

      // KV bytes for this user persona group
      const seqContext = pLen + gLen;
      const kvBytesPerSeq = kvBytesPerTokenPerLayer * numLayers * seqContext;
      totalKvCacheBytes += kvBytesPerSeq * uCount;
    });

    if (activeTotalUsers > 0) {
      effectivePromptLen = Math.round(sumPromptUser / activeTotalUsers);
      effectiveGenLen = Math.round(sumGenUser / activeTotalUsers);
    } else {
      activeTotalUsers = 1;
      effectivePromptLen = config.promptLen || 2048;
      effectiveGenLen = config.genLen || 512;
      const seqContext = effectivePromptLen + effectiveGenLen;
      totalKvCacheBytes = kvBytesPerTokenPerLayer * numLayers * seqContext;
    }
  } else {
    activeTotalUsers = Math.max(1, config.batchSize || 1);
    effectivePromptLen = Math.max(128, config.promptLen || 2048);
    effectiveGenLen = Math.max(32, config.genLen || 512);

    const totalContextLen = effectivePromptLen + effectiveGenLen;
    const kvBytesPerSequence = kvBytesPerTokenPerLayer * numLayers * totalContextLen;
    totalKvCacheBytes = kvBytesPerSequence * activeTotalUsers;
  }

  // Engine KV Cache Fragmentation factor
  const fragmentationFactor = 1 + (engine.kvCacheFragmentationPct || 5) / 100;
  totalKvCacheBytes *= fragmentationFactor;

  const kvCacheMemoryGB = totalKvCacheBytes / (1024 * 1024 * 1024);
  const kvCachePerUserMB = activeTotalUsers > 0
    ? (totalKvCacheBytes / activeTotalUsers) / (1024 * 1024)
    : 0;

  // C. Activation Memory (GB)
  const activationBaseGB = (activeTotalUsers * effectivePromptLen * model.hiddenSize * 2) / (1024 * 1024 * 1024);
  const activationOverheadPct = (config.activationOverheadPct || 10) / 100;
  const activationMemoryGB = Math.max(0.5, activationBaseGB + weightMemoryGB * activationOverheadPct * 0.2);

  // D. CUDA & Framework Overhead
  const cudaOverheadPerGpu = config.cudaOverheadGB ?? 1.5;
  const totalCudaOverheadGB = cudaOverheadPerGpu * gpuCount;

  // E. Total VRAM Needed
  const totalVramNeededGB = weightMemoryGB + kvCacheMemoryGB + activationMemoryGB + totalCudaOverheadGB;
  const vramPerGpuNeededGB = totalVramNeededGB / gpuCount;
  const totalVramAvailableGB = gpu.vramGB * gpuCount;
  const vramUtilizationPct = Math.min(200, (totalVramNeededGB / totalVramAvailableGB) * 100);

  const isOom = vramPerGpuNeededGB > gpu.vramGB;
  const recommendedMinGpus = Math.ceil(totalVramNeededGB / (gpu.vramGB * 0.9)); // 90% target safety limit

  // F. Performance Estimation (Prefill / TTFT & Decode / TPOT)
  const tpEfficiency = (config.tpEfficiencyPct || 85) / 100;
  
  // Prefill Phase: Compute Bound
  const totalPrefillFlops = 2 * activeParamsB * 1e9 * effectivePromptLen * activeTotalUsers;
  
  const computeEfficiency = 0.35;
  const totalFlopsPerSec = gpuCount * (gpu.fp16Tflops * 1e12) * tpEfficiency * computeEfficiency;
  
  const baseTtftSec = Math.max(0.005, totalPrefillFlops / Math.max(1, totalFlopsPerSec));
  const ttftSec = baseTtftSec / Math.max(0.5, engine.throughputMultiplier);
  const ttftMs = ttftSec * 1000;

  // Decode Phase: Memory Bandwidth Bound
  const activeWeightsBytes = activeParamsB * bytesPerWeight * 1e9;
  const totalBytesPerOutputToken = activeWeightsBytes + totalKvCacheBytes;

  const bandwidthEfficiency = 0.65;
  const totalBandwidthBytesPerSec = gpuCount * (gpu.memoryBandwidthGBs * 1e9) * tpEfficiency * bandwidthEfficiency;

  const baseTpotSec = Math.max(0.002, totalBytesPerOutputToken / Math.max(1, totalBandwidthBytesPerSec));
  const tpotSec = baseTpotSec / Math.max(0.5, engine.throughputMultiplier);
  const tpotMs = tpotSec * 1000;

  const tokensPerSecPerUser = 1 / tpotSec;
  const systemThroughputTokensPerSec = tokensPerSecPerUser * activeTotalUsers;

  // Concurrency Limits
  const vramForWeightsAndOverheadGB = weightMemoryGB + totalCudaOverheadGB + activationMemoryGB;
  const remainingVramForKvGB = Math.max(0, totalVramAvailableGB - vramForWeightsAndOverheadGB);
  const kvCachePerUserGB = kvCachePerUserMB / 1024;
  const maxConcurrentUsersVramLimit = Math.max(1, Math.floor(remainingVramForKvGB / Math.max(0.001, kvCachePerUserGB)));

  const maxConcurrentUsersComputeLimit = Math.max(1, Math.floor(totalBandwidthBytesPerSec / (activeWeightsBytes * 10)));

  // G. Financial Calculations & Cloud Providers Comparison
  const hourlyCostUsd = gpuHourlyCostUsd * gpuCount;
  const dailyCostUsd = hourlyCostUsd * 24;
  const monthlyCostUsd = dailyCostUsd * 30.5;

  const targetRpm = Math.max(1, config.requestsPerMin || 60);
  const requestsPerHour = targetRpm * 60;
  const totalTokensPerRequest = effectivePromptLen + effectiveGenLen;
  const totalTokensPerHour = requestsPerHour * totalTokensPerRequest;

  const costPerMillionTotalTokensUsd = totalTokensPerHour > 0
    ? (hourlyCostUsd / totalTokensPerHour) * 1000000
    : 0;

  const costPerMillionInputTokensUsd = costPerMillionTotalTokensUsd * 0.4;
  const costPerMillionOutputTokensUsd = costPerMillionTotalTokensUsd * 1.2;

  const costFor100kRequestsUsd = (100000 * totalTokensPerRequest * costPerMillionTotalTokensUsd) / 1000000;

  // Cloud Providers Pricing & Equivalent Matching Matrix
  let minCost = Infinity;
  const cloudCostsRaw = CLOUD_PROVIDERS.map((provider) => {
    const providerEquivalents = CLOUD_PROVIDER_EQUIVALENTS[provider.id] || {};
    const exactOrEquiv = providerEquivalents[config.gpuId];

    let ratePerGpu = provider.gpuRates[config.gpuId] ?? gpuHourlyCostUsd;
    let status: 'available' | 'equivalent' | 'not_supported' = 'available';
    let matchedInstance = `${gpuCount}x ${gpu.name}`;
    let matchedGpuName = gpu.name;
    let isExactMatch = true;
    let providerNotes = provider.notes;

    if (exactOrEquiv) {
      ratePerGpu = exactOrEquiv.hourlyRatePerGpuUsd;
      isExactMatch = exactOrEquiv.isExactMatch;
      status = isExactMatch ? 'available' : 'equivalent';
      matchedInstance = exactOrEquiv.instanceName;
      matchedGpuName = exactOrEquiv.gpuType;
      providerNotes = exactOrEquiv.notes;
    } else if (config.gpuId === 'custom') {
      ratePerGpu = gpuHourlyCostUsd;
      status = 'equivalent';
      matchedInstance = `Özel Donanım (${gpu.vramGB}GB VRAM / ${gpu.fp16Tflops} TFLOPS)`;
      matchedGpuName = `${gpu.name} (Özel)`;
      isExactMatch = false;
      providerNotes = 'Özel tanımlı donanım için tahmini bulut eşleşmesi.';
    }

    const totHourly = ratePerGpu * gpuCount;
    const totMonthly = totHourly * 24 * 30.5;
    const tokCost = totalTokensPerHour > 0 ? (totHourly / totalTokensPerHour) * 1000000 : 0;

    if (totHourly < minCost) {
      minCost = totHourly;
    }

    let serverlessPerSecUsd = exactOrEquiv?.serverlessPerSecUsd;
    if (!serverlessPerSecUsd && provider.providerType === 'serverless') {
      serverlessPerSecUsd = ratePerGpu / 3600;
    }

    return {
      providerId: provider.id,
      providerName: provider.name,
      shortName: provider.shortName,
      providerType: provider.providerType,
      pricingModel: provider.pricingModel,
      websiteUrl: provider.websiteUrl,
      status,
      matchedInstance,
      matchedGpuName,
      isExactMatch,
      hourlyRatePerGpuUsd: ratePerGpu,
      serverlessPerSecUsd,
      totalHourlyCostUsd: totHourly,
      totalMonthlyCostUsd: totMonthly,
      costPerMillionTokensUsd: tokCost,
      isCheapest: false,
      notes: providerNotes,
    };
  });

  const cloudCosts: CloudProviderCost[] = cloudCostsRaw.map((c) => ({
    ...c,
    isCheapest: Math.abs(c.totalHourlyCostUsd - minCost) < 0.01,
  }));

  // H. Turkey On-Premises TCO & Break-Even Analysis
  const hardwareSpec = GPU_HARDWARE_SPECS[config.gpuId] || {
    tdpWatts: 350,
    retailPriceUsd: Math.max(1000, gpuHourlyCostUsd * 2000),
    systemBaseCapexUsd: 2000,
  };

  const usdToTry = Math.max(1, config.usdToTryRate || 50);
  const electricityKwhPriceTry = Math.max(0.5, config.electricityRateTryPerKwh || 4.20);
  const electricityKwhPriceUsd = electricityKwhPriceTry / usdToTry;
  const pueRatio = Math.max(1.0, config.pueRatio || 1.25);
  const dutyCycle = Math.max(0.1, Math.min(1.0, (config.serverDutyCyclePct || 85) / 100));

  // 1. CAPEX (GPU Card Price + Server Base System)
  const gpuUnitPriceUsd = config.customGpuUnitPriceUsd != null && config.customGpuUnitPriceUsd > 0
    ? config.customGpuUnitPriceUsd
    : hardwareSpec.retailPriceUsd;
  const gpuTotalPriceUsd = gpuUnitPriceUsd * gpuCount;
  const systemBaseCapexUsd = config.customSystemBasePriceUsd != null && config.customSystemBasePriceUsd >= 0
    ? config.customSystemBasePriceUsd
    : hardwareSpec.systemBaseCapexUsd;
  const hardwareCapexUsd = gpuTotalPriceUsd + systemBaseCapexUsd;
  const hardwareCapexTry = hardwareCapexUsd * usdToTry;

  // 2. Power & Electricity Consumption
  const totalGpuPowerWatts = hardwareSpec.tdpWatts * gpuCount;
  const systemBasePowerWatts = 300 + (gpuCount > 2 ? (gpuCount - 2) * 50 : 0);
  const totalPowerDrawWatts = totalGpuPowerWatts + systemBasePowerWatts;
  const basePowerKw = (totalPowerDrawWatts / 1000) * dutyCycle;
  const annualHours = 8760; // 365 * 24
  const annualBaseElectricityKwh = Math.round(basePowerKw * annualHours);

  // Annual Electricity Cost (Direct override or calculated)
  let annualElectricityCostUsd: number;
  let annualElectricityCostTry: number;
  let annualElectricityKwh = annualBaseElectricityKwh;

  if (config.customAnnualElectricityUsd != null && config.customAnnualElectricityUsd >= 0) {
    annualElectricityCostUsd = config.customAnnualElectricityUsd;
    annualElectricityCostTry = annualElectricityCostUsd * usdToTry;
  } else {
    annualElectricityCostUsd = annualBaseElectricityKwh * electricityKwhPriceUsd;
    annualElectricityCostTry = annualBaseElectricityKwh * electricityKwhPriceTry;
  }

  // 3. Cooling & HVAC Costs (Direct override or PUE overhead)
  let annualCoolingCostUsd: number;
  let annualCoolingCostTry: number;

  if (config.customAnnualCoolingUsd != null && config.customAnnualCoolingUsd >= 0) {
    annualCoolingCostUsd = config.customAnnualCoolingUsd;
    annualCoolingCostTry = annualCoolingCostUsd * usdToTry;
  } else {
    // Extra energy consumed by cooling infrastructure based on (PUE - 1.0)
    const coolingPowerKw = basePowerKw * Math.max(0, pueRatio - 1.0);
    const annualCoolingKwh = Math.round(coolingPowerKw * annualHours);
    annualCoolingCostUsd = annualCoolingKwh * electricityKwhPriceUsd;
    annualCoolingCostTry = annualCoolingKwh * electricityKwhPriceTry;
  }

  // 4. Annual Maintenance, Spares & DevOps/Support
  let annualMaintenanceUsd: number;
  let annualMaintenanceTry: number;

  if (config.customAnnualMaintenanceUsd != null && config.customAnnualMaintenanceUsd >= 0) {
    annualMaintenanceUsd = config.customAnnualMaintenanceUsd;
    annualMaintenanceTry = annualMaintenanceUsd * usdToTry;
  } else {
    annualMaintenanceUsd = hardwareCapexUsd * 0.06; // Standard ~6% of CAPEX
    annualMaintenanceTry = annualMaintenanceUsd * usdToTry;
  }

  // 5. Other Annual Expenses (Colocation / Rack cabinet, Static IP, Insurance, Licenses)
  const annualOtherExpensesUsd = config.customAnnualOtherExpensesUsd != null && config.customAnnualOtherExpensesUsd >= 0
    ? config.customAnnualOtherExpensesUsd
    : 0;
  const annualOtherExpensesTry = annualOtherExpensesUsd * usdToTry;

  // Total Annual OPEX
  const annualOpexTotalUsd = annualElectricityCostUsd + annualCoolingCostUsd + annualMaintenanceUsd + annualOtherExpensesUsd;
  const annualOpexTotalTry = annualOpexTotalUsd * usdToTry;

  // 1-Year & 3-Year TCO
  const totalFirstYearCostUsd = hardwareCapexUsd + annualOpexTotalUsd;
  const totalFirstYearCostTry = totalFirstYearCostUsd * usdToTry;

  const totalThreeYearCostUsd = hardwareCapexUsd + (annualOpexTotalUsd * 3);
  const totalThreeYearCostTry = totalThreeYearCostUsd * usdToTry;

  const monthlyAverageCostUsd = totalThreeYearCostUsd / 36;
  const monthlyAverageCostTry = monthlyAverageCostUsd * usdToTry;

  // Break-Even / Payback Period vs Cheapest Cloud
  const cheapestCloudMonthlyUsd = Math.max(1, minCost * 24 * 30.5);
  const monthlyOnPremOpexUsd = annualOpexTotalUsd / 12;
  const monthlyNetSavingsVsCloud = cheapestCloudMonthlyUsd - monthlyOnPremOpexUsd;

  let breakEvenMonthsVsCloud = 999;
  let breakEvenDescription = '';

  if (monthlyNetSavingsVsCloud > 0) {
    breakEvenMonthsVsCloud = Math.max(0.5, hardwareCapexUsd / monthlyNetSavingsVsCloud);
    const monthsRounded = breakEvenMonthsVsCloud.toFixed(1);
    breakEvenDescription = `Yerel donanım satın aldığınızda ~${monthsRounded} ay sonra en uygun bulut kiralama seçeneğine göre kendi maliyetini çıkartıp kara geçer.`;
  } else {
    breakEvenMonthsVsCloud = 999;
    breakEvenDescription = `Düşük kullanım veya yüksek operasyonel masraflar nedeniyle bu senaryoda bulut kiralama daha ekonomiktir.`;
  }

  const isCustomized = Boolean(
    config.customGpuUnitPriceUsd != null ||
    config.customSystemBasePriceUsd != null ||
    config.customAnnualElectricityUsd != null ||
    config.customAnnualCoolingUsd != null ||
    config.customAnnualMaintenanceUsd != null ||
    (config.customAnnualOtherExpensesUsd != null && config.customAnnualOtherExpensesUsd > 0)
  );

  const onPremTco: OnPremisesTco = {
    gpuUnitPriceUsd,
    gpuTotalPriceUsd,
    systemBaseCapexUsd,
    hardwareCapexUsd,
    hardwareCapexTry,
    annualElectricityKwh,
    annualElectricityCostUsd,
    annualElectricityCostTry,
    annualCoolingCostUsd,
    annualCoolingCostTry,
    annualMaintenanceUsd,
    annualMaintenanceTry,
    annualOtherExpensesUsd,
    annualOtherExpensesTry,
    annualOpexTotalUsd,
    annualOpexTotalTry,
    totalFirstYearCostUsd,
    totalFirstYearCostTry,
    totalThreeYearCostUsd,
    totalThreeYearCostTry,
    monthlyAverageCostUsd,
    monthlyAverageCostTry,
    breakEvenMonthsVsCloud,
    breakEvenDescription,
    powerDrawWatts: totalPowerDrawWatts,
    pueRatio,
    usdToTryRate: usdToTry,
    electricityKwhPriceTry,
    isCustomized,
  };

  return {
    modelName: model.name,
    gpuName: gpu.name,
    engineName: engine.name,
    engineBadge: engine.badge,
    totalParamsB,
    activeParamsB,
    bytesPerWeight,
    bytesPerKvParam,

    activeTotalUsers,
    effectivePromptLen,
    effectiveGenLen,

    weightMemoryGB,
    kvCacheMemoryGB,
    kvCachePerUserMB,
    activationMemoryGB,
    cudaOverheadGB: totalCudaOverheadGB,
    totalVramNeededGB,
    vramPerGpuNeededGB,
    totalVramAvailableGB,
    vramUtilizationPct,
    isOom,
    recommendedMinGpus,

    prefillFlopsTotal: totalPrefillFlops,
    ttftMs,
    tpotMs,
    tokensPerSecPerUser,
    systemThroughputTokensPerSec,
    maxConcurrentUsersVramLimit,
    maxConcurrentUsersComputeLimit,

    hourlyCostUsd,
    dailyCostUsd,
    monthlyCostUsd,
    costPerMillionInputTokensUsd,
    costPerMillionOutputTokensUsd,
    costPerMillionTotalTokensUsd,
    costFor100kRequestsUsd,

    cloudCosts,
    onPremTco,
  };
}
