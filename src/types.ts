export type ModelCapability = 'frontier' | 'turkish';
export type ModelTargetEnv = 'edge' | 'local' | 'hybrid' | 'server';
export type ModelCategory = 'DeepSeek' | 'Llama' | 'Qwen' | 'Mistral' | 'Google' | 'Microsoft' | 'NVIDIA' | 'Cohere' | 'Other' | 'Turkish' | 'Custom';
export type ModelSource = 'huggingface' | 'mirror' | 'curated' | 'unknown';

export interface ModelPreset {
  id: string;
  name: string;
  provider: string;
  hfId?: string; // Hugging Face repo id (e.g. "Qwen/Qwen3-30B-A3B") for live enrichment
  downloads?: number; // HF Hub download count
  likes?: number; // HF Hub like count
  lastUpdated?: string; // ISO timestamp of the last successful HF fetch
  capabilities?: ModelCapability[]; // curated capability tags; empty/missing = general purpose
  curated?: boolean; // true = hand-curated known model, false = auto-discovered from known orgs
  verified?: boolean; // true = architecture confirmed from live HF config, false = preset fallback (e.g. gated)
  source?: ModelSource; // where the architecture data came from: live HF repo, community mirror, or static preset
  mirrorOf?: string; // for mirror-sourced rows: the original (official) hfId whose architecture this mirrors
  mirrorHfId?: string; // the actual community repo id that provided the architecture
  totalParamsB: number; // in Billions (e.g., 70 for 70B)
  activeParamsB: number; // in Billions (for MoE, active params; for Dense = totalParamsB)
  numLayers: number;
  numHeads: number;
  numKvHeads: number; // GQA/MQA
  headDim: number;
  hiddenSize: number;
  defaultContextLen: number;
  maxContextLen: number;
  isMoe: boolean;
  numExperts?: number;
  activeExperts?: number;
  description: string;
  category: ModelCategory;
  targetEnv?: ModelTargetEnv; // 'edge': mobile/NPU/on-device, 'local': PC / Mac, 'server': Enterprise Server / Cluster, 'hybrid': Workstation or Server
}

export interface QuantizationOption {
  id: string;
  name: string;
  shortName: string;
  bytesPerParam: number;
  bits: number;
  qualityDegradation: string;
  description: string;
}

export interface GpuPreset {
  id: string;
  name: string;
  vendor: 'NVIDIA' | 'AMD' | 'Apple' | 'Intel' | 'Custom';
  vramGB: number;
  memoryBandwidthGBs: number; // Memory bandwidth in GB/s
  fp16Tflops: number; // FP16 / BF16 compute performance in TFLOPS
  hourlyCostUsd: number; // Average cloud hourly cost per GPU
  interconnectSpeedGBs: number; // NVLink / Interconnect bandwidth in GB/s
  description: string;
  tier?: 'consumer' | 'workstation' | 'datacenter' | 'unified';
}

export interface UserProfile {
  id: string;
  name: string; // e.g. "Sohbet / Chat", "RAG Belge Arama", "Kod Tamamlama"
  userCount: number; // concurrent users for this profile
  promptLen: number; // input prompt tokens
  genLen: number; // output generation tokens
}

export interface InferenceEngine {
  id: string;
  name: string;
  shortName: string;
  badge: string; // e.g. "PagedAttention", "GGUF", "RadixAttention"
  throughputMultiplier: number; // multiplier on tokens/sec
  kvCacheFragmentationPct: number; // fragmentation overhead percentage
  description: string;
  features: string[];
}

export interface ModelRecommendationResult {
  recommendedModelId: string;
  modelName: string;
  reason: string;
  keyHighlight: string;
  domainMatch: string;
  recommendedContextLen?: number;
  alternativeModelIds?: string[];
}

export interface CloudProviderPricing {
  id: string;
  name: string;
  shortName: string;
  providerType: 'serverless' | 'dedicated' | 'compute_units';
  pricingModel: string; // e.g. "Saniye Başı (Scale-to-Zero)", "Saatlik Dedicated Pod", "On-Demand VM", "Compute Units ($0.10/CU)"
  websiteUrl: string;
  region: string;
  gpuRates: Record<string, number>; // gpuId -> rate per GPU per hour
  notes: string;
}

export interface CloudProviderEquivalent {
  instanceName: string; // e.g. "1x A100 SXM 80GB" or "Serverless H100 SXM5"
  gpuType: string; // e.g. "NVIDIA A100 SXM"
  vramGB: number;
  hourlyRatePerGpuUsd: number;
  serverlessPerSecUsd?: number;
  isExactMatch: boolean; // true if the exact GPU is natively offered
  notes: string;
}

export interface CloudProviderCost {
  providerId: string;
  providerName: string;
  shortName: string;
  providerType?: 'serverless' | 'dedicated' | 'compute_units';
  pricingModel?: string;
  websiteUrl?: string;
  status: 'available' | 'equivalent' | 'not_supported';
  matchedInstance: string;
  matchedGpuName: string;
  isExactMatch: boolean;
  hourlyRatePerGpuUsd: number;
  serverlessPerSecUsd?: number;
  totalHourlyCostUsd: number;
  totalMonthlyCostUsd: number;
  costPerMillionTokensUsd: number;
  isCheapest: boolean;
  notes: string;
}

export interface OnPremisesTco {
  gpuUnitPriceUsd: number; // Unit price per GPU card
  gpuTotalPriceUsd: number; // Unit price * GPU count
  systemBaseCapexUsd: number; // Server chassis, PSU, CPU, RAM, NVMe
  hardwareCapexUsd: number; // GPU hardware + Server/Workstation chassis, PSU, CPU, RAM, NVMe
  hardwareCapexTry: number;
  
  annualElectricityKwh: number; // Total kWh consumed per year
  annualElectricityCostUsd: number; // Cost based on Turkey electricity tariff or user override
  annualElectricityCostTry: number;

  annualCoolingCostUsd: number; // Cooling / HVAC cost (via PUE or user override)
  annualCoolingCostTry: number;

  annualMaintenanceUsd: number; // Annual maintenance, support & spares
  annualMaintenanceTry: number;

  annualOtherExpensesUsd: number; // Colocation, rack space, insurance, licensing, network
  annualOtherExpensesTry: number;

  annualOpexTotalUsd: number; // Electricity + Cooling + Maintenance + Other expenses
  annualOpexTotalTry: number;

  totalFirstYearCostUsd: number; // CAPEX + 1 Year OPEX (Electricity + Cooling + Maintenance + Other)
  totalFirstYearCostTry: number;
  totalThreeYearCostUsd: number; // CAPEX + 3 Years OPEX
  totalThreeYearCostTry: number;
  monthlyAverageCostUsd: number; // (3-year TCO / 36 months)
  monthlyAverageCostTry: number;
  breakEvenMonthsVsCloud: number; // Payback period in months compared to cheapest cloud
  breakEvenDescription: string;
  powerDrawWatts: number;
  pueRatio: number;
  usdToTryRate: number;
  electricityKwhPriceTry: number;
  isCustomized: boolean; // True if user entered any custom cost parameter
}

export interface CalculatorConfig {
  modelId: string;
  customModel: ModelPreset;
  quantId: string;
  kvCacheQuantId: string; // 'fp16' | 'fp8' | 'int4'
  engineId: string; // 'vllm' | 'llamacpp' | 'tensorrt' | 'sglang' | 'tgi' | 'ollama'
  gpuId: string;
  customGpu: GpuPreset;
  gpuCount: number;
  tensorParallelism: number;
  pipelineParallelism: number;
  promptLen: number; // Default input context length in tokens
  genLen: number; // Default output generation length in tokens
  batchSize: number; // Default active concurrent user streams
  userProfiles: UserProfile[]; // Multi-profile user workloads
  useMultiProfile: boolean; // Toggle for using multi-profile vs single batch
  requestsPerMin: number; // Target query rate for monthly cost/throughput estimation
  cudaOverheadGB: number; // Overhead per GPU in GB (e.g., 1.5)
  activationOverheadPct: number; // Percentage for activations (e.g., 10%)
  tpEfficiencyPct: number; // Inter-GPU communication efficiency (e.g., 85%)

  // On-Premise & Turkey TCO Parameters
  electricityRateTryPerKwh: number; // Turkey electricity price in TL (default: 4.20 TL / kWh)
  usdToTryRate: number; // Currency conversion rate (default: 50 TL)
  pueRatio: number; // Power Usage Effectiveness (default: 1.25)
  serverDutyCyclePct: number; // % uptime at load (default: 85%)

  // Custom User Overrides for On-Premises Cost Components
  customGpuUnitPriceUsd?: number | null; // Custom price for selected GPU card
  customSystemBasePriceUsd?: number | null; // Custom base server chassis price
  customAnnualElectricityUsd?: number | null; // Custom annual electricity cost in USD
  customAnnualCoolingUsd?: number | null; // Custom annual cooling cost in USD
  customAnnualMaintenanceUsd?: number | null; // Custom annual maintenance cost in USD
  customAnnualOtherExpensesUsd?: number | null; // Custom annual other expenses (rack, colocation, insurance, licenses) in USD
}

export interface CalculationResults {
  modelName: string;
  gpuName: string;
  engineName: string;
  engineBadge: string;
  totalParamsB: number;
  activeParamsB: number;
  bytesPerWeight: number;
  bytesPerKvParam: number;

  // Workload summary
  activeTotalUsers: number;
  effectivePromptLen: number;
  effectiveGenLen: number;

  // Memory metrics (GB)
  weightMemoryGB: number;
  kvCacheMemoryGB: number;
  kvCachePerUserMB: number;
  activationMemoryGB: number;
  cudaOverheadGB: number;
  totalVramNeededGB: number;
  vramPerGpuNeededGB: number;
  totalVramAvailableGB: number;
  vramUtilizationPct: number;
  isOom: boolean;
  recommendedMinGpus: number;

  // Performance metrics
  prefillFlopsTotal: number;
  ttftMs: number; // Time to First Token in milliseconds
  tpotMs: number; // Time per Output Token in milliseconds
  tokensPerSecPerUser: number;
  systemThroughputTokensPerSec: number;
  maxConcurrentUsersVramLimit: number;
  maxConcurrentUsersComputeLimit: number;

  // Financial & Operational metrics
  hourlyCostUsd: number;
  dailyCostUsd: number;
  monthlyCostUsd: number;
  costPerMillionInputTokensUsd: number;
  costPerMillionOutputTokensUsd: number;
  costPerMillionTotalTokensUsd: number;
  costFor100kRequestsUsd: number;

  // Cloud Providers Comparison (with Equivalent matching)
  cloudCosts: CloudProviderCost[];

  // Turkey On-Premises TCO & Break-even analysis
  onPremTco: OnPremisesTco;
}

export interface PresetScenario {
  id: string;
  title: string;
  description: string;
  iconName: string;
  config: Partial<CalculatorConfig>;
}

// ==========================================
// FINE-TUNING & TRAINING TYPINGS
// ==========================================

export type FineTuningMethodId = 'qlora' | 'lora' | 'full-finetune' | 'dpo-alignment';

export interface FineTuningMethod {
  id: FineTuningMethodId;
  name: string;
  shortName: string;
  badge: string; // e.g. "4-bit NormalFloat (NF4)", "16-bit LoRA (BF16)", "DeepSpeed ZeRO-3", "RLHF / Alignment"
  speedMultiplier: number;
  vramMultiplier: number;
  bytesPerWeight: number; // 0.5 for 4-bit, 2.0 for 16-bit, etc.
  gradBytesMultiplier: number;
  optimizerBytesPerParam: number;
  description: string;
  features: string[];
  recommendedHardware: string;
  supportedFrameworks: FineTuningFrameworkId[];
}

export type FineTuningFrameworkId = 'unsloth' | 'hf-trl' | 'torchtune' | 'deepspeed' | 'axolotl';

export interface FineTuningFramework {
  id: FineTuningFrameworkId;
  name: string;
  shortName: string;
  badge: string;
  speedMultiplier: number; // Speed boost multiplier relative to baseline
  vramEfficiencyMultiplier: number; // VRAM reduction factor (e.g. 0.35 for Unsloth)
  description: string;
  speedRating: string;
  vramEfficiency: string;
  features: string[];
  commandPreview: string;
  supportedMethods: FineTuningMethodId[];
}

export interface TrainingPlatform {
  id: string;
  name: string;
  category: 'RunPod' | 'Lambda' | 'Modal' | 'Colab';
  gpuName: string;
  gpuCount: number;
  gpuVramGB: number;
  memoryBandwidthGBs: number;
  fp16Tflops: number;
  hourlyRateUsd: number;
  freeTier: boolean;
  colabComputeUnitsPerHour?: number;
  notes: string;
  badge?: string;
  websiteUrl?: string;
}

export interface FineTuningConfig {
  modelId: string;
  customModel: ModelPreset;
  methodId: FineTuningMethodId;
  frameworkId: FineTuningFrameworkId;
  gpuId?: string;
  customGpu?: GpuPreset;
  gpuCount?: number;

  // Dataset parameters
  datasetInputMode?: 'samples' | 'tokens';
  sampleCount: number; // e.g. 10,000 samples
  avgSeqLen: number; // e.g. 2048 tokens per sample
  totalTokensInput?: number; // Optional direct token input
  epochs: number; // e.g. 3
  
  // Optimization Strategy
  optimizationStrategy?: 'cost' | 'balanced' | 'speed';
  autoOptimizeHyperparams?: boolean;

  // Hyperparameters
  perDeviceBatchSize: number; // e.g. 2
  gradientAccumulationSteps: number; // e.g. 4
  learningRate: string; // e.g. '2e-4'
  loraRank: number; // e.g. 16, 32, 64
  loraAlpha: number; // e.g. 32
  optimizerType: 'adamw_8bit' | 'adamw_32bit' | 'paged_adamw_8bit' | 'lion';
  gradientCheckpointing: boolean;
  flashAttention: boolean;
  useUnslothAcceleratedKernels: boolean;

  // Local Electricity & Currency parameters
  electricityRateTryPerKwh: number;
  usdToTryRate: number;
}

export interface PlatformCostEstimate {
  platformId: string;
  platformName: string;
  category: 'RunPod' | 'Lambda' | 'Modal' | 'Colab';
  gpuName: string;
  gpuCount: number;
  gpuVramGB: number;
  hourlyRateUsd: number;
  estimatedTimeHours: number;
  estimatedTimeFormatted: string;
  totalCostUsd: number;
  totalCostTry: number;
  isFeasibleVram: boolean;
  vramNeededGB: number;
  vramUsagePct: number;
  colabComputeUnitsNeeded?: number;
  notes: string;
  badge?: string;
  websiteUrl?: string;
  isCheapestFeasible: boolean;
  isFastestFeasible: boolean;
  isBestValueFeasible: boolean;
  freeTierUsable: boolean;
}

export interface FineTuningResults {
  modelName: string;
  totalParamsB: number;
  methodName: string;
  methodBadge: string;
  frameworkName: string;

  // Workload summary
  totalSamples: number;
  totalTokens: number;
  totalSteps: number;
  effectiveBatchSize: number;
  tokensPerStep: number;
  optimalBatchSize: number;
  optimalGradAcc: number;
  autoOptimizedSummary: string;

  // VRAM Breakdown (GB)
  weightVramGB: number;
  gradientVramGB: number;
  optimizerVramGB: number;
  activationVramGB: number;
  cudaOverheadGB: number;
  totalVramNeededGB: number;
  vramPerGpuNeededGB: number;
  totalVramAvailableGB: number;
  vramUtilizationPct: number;
  isOom: boolean;
  recommendedMinVramGB: number;
  recommendedMinGpus: number;

  // Time and Speed Metrics
  totalFlopsRequired: number;
  hardwareTflopsAtMfu: number;
  trainingTimeSec: number;
  trainingTimeHours: number;
  trainingTimeFormatted: string;
  throughputTokensPerSec: number;
  unslothSpeedupMultiplier: number;
  unslothTimeSavedHours: number;
  standardHfTimeHours: number;

  // Financial & Platform Metrics
  platformEstimates: PlatformCostEstimate[];
  cheapestPlatform?: PlatformCostEstimate;
  fastestPlatform?: PlatformCostEstimate;
  bestValuePlatform?: PlatformCostEstimate;
  freePlatform?: PlatformCostEstimate;
  unslothCostSavingsUsd: number;
  localElectricityCostTry: number;
  localElectricityCostUsd: number;

  // Code Export Snippets
  unslothPythonCode: string;
  hfTrlScriptCode: string;
  axolotlYamlCode: string;
  datasetTemplateJsonl: string;
}

export interface DatasetPreset {
  id: string;
  title: string;
  description: string;
  sampleCount: number;
  avgSeqLen: number;
  epochs: number;
  suggestedMethod: FineTuningMethodId;
  category: 'Chatbot' | 'RAG / Enterprise' | 'Coding' | 'Domain Specific' | 'Reasoning / Alignment';
}

