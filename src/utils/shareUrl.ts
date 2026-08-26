import { CalculatorConfig, FineTuningConfig } from '../types';
import { DEFAULT_INFERENCE_CONFIG, DEFAULT_FINETUNING_CONFIG } from '../data/defaults';

export type ScenarioType = 'inference' | 'finetuning';
export interface DecodedScenario {
  type: ScenarioType;
  config: CalculatorConfig | FineTuningConfig;
}

function toBase64Url(input: string): string {
  return btoa(unescape(encodeURIComponent(input)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64Url(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(escape(atob(padded)));
}

function num(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function str(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function sanitizeInference(raw: Record<string, unknown>): CalculatorConfig {
  const d = DEFAULT_INFERENCE_CONFIG;
  const cfg: CalculatorConfig = {
    ...d,
    modelId: str(raw.modelId, d.modelId),
    quantId: str(raw.quantId, d.quantId),
    kvCacheQuantId: str(raw.kvCacheQuantId, d.kvCacheQuantId),
    engineId: str(raw.engineId, d.engineId),
    gpuId: str(raw.gpuId, d.gpuId),
    gpuCount: Math.min(64, Math.max(1, Math.round(num(raw.gpuCount, d.gpuCount)))),
    tensorParallelism: Math.min(64, Math.max(1, Math.round(num(raw.tensorParallelism, d.tensorParallelism)))),
    pipelineParallelism: Math.min(16, Math.max(1, Math.round(num(raw.pipelineParallelism, d.pipelineParallelism)))),
    promptLen: Math.min(1_000_000, Math.max(1, Math.round(num(raw.promptLen, d.promptLen)))),
    genLen: Math.min(1_000_000, Math.max(1, Math.round(num(raw.genLen, d.genLen)))),
    batchSize: Math.min(4096, Math.max(1, Math.round(num(raw.batchSize, d.batchSize)))),
    useMultiProfile: bool(raw.useMultiProfile, d.useMultiProfile),
    requestsPerMin: Math.min(1_000_000, Math.max(0, num(raw.requestsPerMin, d.requestsPerMin))),
    cudaOverheadGB: Math.min(64, Math.max(0, num(raw.cudaOverheadGB, d.cudaOverheadGB))),
    activationOverheadPct: Math.min(100, Math.max(0, num(raw.activationOverheadPct, d.activationOverheadPct))),
    tpEfficiencyPct: Math.min(100, Math.max(1, num(raw.tpEfficiencyPct, d.tpEfficiencyPct))),
    electricityRateTryPerKwh: Math.max(0, num(raw.electricityRateTryPerKwh, d.electricityRateTryPerKwh)),
    usdToTryRate: Math.max(0, num(raw.usdToTryRate, d.usdToTryRate)),
    pueRatio: Math.min(3, Math.max(1, num(raw.pueRatio, d.pueRatio))),
    serverDutyCyclePct: Math.min(100, Math.max(0, num(raw.serverDutyCyclePct, d.serverDutyCyclePct))),
  };
  if (raw.customModel && typeof raw.customModel === 'object') {
    cfg.customModel = { ...d.customModel, ...(raw.customModel as object) } as CalculatorConfig['customModel'];
  }
  if (raw.customGpu && typeof raw.customGpu === 'object') {
    cfg.customGpu = { ...d.customGpu, ...(raw.customGpu as object) } as CalculatorConfig['customGpu'];
  }
  if (Array.isArray(raw.userProfiles) && raw.userProfiles.length > 0) {
    cfg.userProfiles = raw.userProfiles
      .filter((p) => p && typeof p === 'object')
      .map((p, i) => ({
        id: str((p as any).id, `profile-${i}`),
        name: str((p as any).name, `Profile ${i + 1}`),
        userCount: Math.min(100000, Math.max(0, Math.round(num((p as any).userCount, 1)))),
        promptLen: Math.min(1_000_000, Math.max(1, Math.round(num((p as any).promptLen, 1024)))),
        genLen: Math.min(1_000_000, Math.max(1, Math.round(num((p as any).genLen, 256)))),
      }));
  }
  const nullable = ['customGpuUnitPriceUsd', 'customSystemBasePriceUsd', 'customAnnualElectricityUsd', 'customAnnualCoolingUsd', 'customAnnualMaintenanceUsd', 'customAnnualOtherExpensesUsd'] as const;
  for (const key of nullable) {
    const v = raw[key];
    cfg[key] = typeof v === 'number' && Number.isFinite(v) ? v : null;
  }
  return cfg;
}

function sanitizeFinetuning(raw: Record<string, unknown>): FineTuningConfig {
  const d = DEFAULT_FINETUNING_CONFIG;
  const methods = ['qlora', 'lora', 'full-finetune', 'dpo-alignment'];
  const frameworks = ['unsloth', 'hf-trl', 'torchtune', 'deepspeed', 'axolotl'];
  const optimizers = ['adamw_8bit', 'adamw_32bit', 'paged_adamw_8bit', 'lion'];
  const cfg: FineTuningConfig = {
    ...d,
    modelId: str(raw.modelId, d.modelId),
    methodId: (methods.includes(raw.methodId as string) ? raw.methodId : d.methodId) as FineTuningConfig['methodId'],
    frameworkId: (frameworks.includes(raw.frameworkId as string) ? raw.frameworkId : d.frameworkId) as FineTuningConfig['frameworkId'],
    gpuId: str(raw.gpuId, d.gpuId),
    gpuCount: Math.min(64, Math.max(1, Math.round(num(raw.gpuCount, d.gpuCount ?? 1)))),
    sampleCount: Math.min(100_000_000, Math.max(1, Math.round(num(raw.sampleCount, d.sampleCount)))),
    avgSeqLen: Math.min(1_000_000, Math.max(1, Math.round(num(raw.avgSeqLen, d.avgSeqLen)))),
    epochs: Math.min(100, Math.max(1, Math.round(num(raw.epochs, d.epochs)))),
    perDeviceBatchSize: Math.min(1024, Math.max(1, Math.round(num(raw.perDeviceBatchSize, d.perDeviceBatchSize)))),
    gradientAccumulationSteps: Math.min(1024, Math.max(1, Math.round(num(raw.gradientAccumulationSteps, d.gradientAccumulationSteps)))),
    learningRate: str(raw.learningRate, d.learningRate),
    loraRank: Math.min(512, Math.max(1, Math.round(num(raw.loraRank, d.loraRank)))),
    loraAlpha: Math.min(1024, Math.max(1, Math.round(num(raw.loraAlpha, d.loraAlpha)))),
    optimizerType: (optimizers.includes(raw.optimizerType as string) ? raw.optimizerType : d.optimizerType) as FineTuningConfig['optimizerType'],
    gradientCheckpointing: bool(raw.gradientCheckpointing, d.gradientCheckpointing),
    flashAttention: bool(raw.flashAttention, d.flashAttention),
    useUnslothAcceleratedKernels: bool(raw.useUnslothAcceleratedKernels, d.useUnslothAcceleratedKernels),
    electricityRateTryPerKwh: Math.max(0, num(raw.electricityRateTryPerKwh, d.electricityRateTryPerKwh)),
    usdToTryRate: Math.max(0, num(raw.usdToTryRate, d.usdToTryRate)),
  };
  if (raw.customModel && typeof raw.customModel === 'object') {
    cfg.customModel = { ...d.customModel, ...(raw.customModel as object) } as FineTuningConfig['customModel'];
  }
  if (raw.customGpu && typeof raw.customGpu === 'object') {
    cfg.customGpu = { ...d.customGpu, ...(raw.customGpu as object) } as FineTuningConfig['customGpu'];
  }
  return cfg;
}

export function encodeScenario(type: ScenarioType, config: CalculatorConfig | FineTuningConfig): string {
  const payload = JSON.stringify({ t: type === 'inference' ? 'i' : 'f', v: 1, cfg: config });
  return toBase64Url(payload);
}

export function decodeScenario(payload: string): DecodedScenario | null {
  try {
    const parsed = JSON.parse(fromBase64Url(payload));
    if (!parsed || typeof parsed !== 'object' || parsed.v !== 1 || !parsed.cfg || typeof parsed.cfg !== 'object') {
      return null;
    }
    if (parsed.t === 'i') {
      return { type: 'inference', config: sanitizeInference(parsed.cfg as Record<string, unknown>) };
    }
    if (parsed.t === 'f') {
      return { type: 'finetuning', config: sanitizeFinetuning(parsed.cfg as Record<string, unknown>) };
    }
    return null;
  } catch {
    return null;
  }
}

export function buildShareUrl(type: ScenarioType, config: CalculatorConfig | FineTuningConfig): string {
  return `${window.location.origin}/app?c=${encodeScenario(type, config)}`;
}

export function readScenarioFromLocation(): DecodedScenario | null {
  const param = new URLSearchParams(window.location.search).get('c');
  return param ? decodeScenario(param) : null;
}