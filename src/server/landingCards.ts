import { MODEL_CATALOG, GPU_PRESETS } from '../data/presets';
import { DEFAULT_INFERENCE_CONFIG } from '../data/defaults';
import { calculateInferenceMetrics } from '../utils/calculator';
import { encodeScenario } from '../utils/shareUrl';
import type { CalculatorConfig } from '../types';

interface LandingScenario {
  modelId: string;
  gpuId: string;
  quantId: string;
  engineId: string;
  gpuCount: number;
}

const LANDING_SCENARIOS: LandingScenario[] = [
  { modelId: 'llama-3.3-70b', gpuId: 'nvidia-h100-sxm', quantId: 'fp8', engineId: 'vllm', gpuCount: 1 },
  { modelId: 'qwen3-32b', gpuId: 'nvidia-rtx-4090', quantId: 'fp8', engineId: 'vllm', gpuCount: 1 },
  { modelId: 'llama-3.1-8b', gpuId: 'nvidia-rtx-4090', quantId: 'q4_k', engineId: 'llamacpp', gpuCount: 1 },
  { modelId: 'qwen3-30b-a3b', gpuId: 'nvidia-rtx-5090', quantId: 'fp8', engineId: 'vllm', gpuCount: 1 },
  { modelId: 'gemma-3-27b', gpuId: 'nvidia-rtx-6000-ada', quantId: 'fp8', engineId: 'vllm', gpuCount: 1 },
  { modelId: 'qwen3-235b-a22b', gpuId: 'nvidia-h200', quantId: 'fp8', engineId: 'sglang', gpuCount: 2 },
  { modelId: 'mistral-small-3-24b', gpuId: 'nvidia-rtx-4090', quantId: 'int4', engineId: 'vllm', gpuCount: 1 },
  { modelId: 'qwen3-8b', gpuId: 'nvidia-rtx-3090', quantId: 'q4_k', engineId: 'llamacpp', gpuCount: 1 },
];

function makeConfig(s: LandingScenario): CalculatorConfig {
  return {
    ...DEFAULT_INFERENCE_CONFIG,
    modelId: s.modelId,
    gpuId: s.gpuId,
    quantId: s.quantId,
    engineId: s.engineId,
    gpuCount: s.gpuCount,
    tensorParallelism: s.gpuCount,
    pipelineParallelism: 1,
    promptLen: 2048,
    genLen: 512,
    batchSize: 1,
    useMultiProfile: false,
    requestsPerMin: 60,
  };
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildLandingCardsHtml(): string {
  return LANDING_SCENARIOS.map((s) => {
    const config = makeConfig(s);
    const r = calculateInferenceMetrics(config, undefined, MODEL_CATALOG);
    const gpu = GPU_PRESETS.find((g) => g.id === s.gpuId) ?? GPU_PRESETS[0];
    const href = `/app?c=${encodeScenario('inference', config)}`;
    const oom = r.isOom ? '<div class="card-oom">OOM</div>' : '';
    return `
      <a class="card" href="${href}">
        <div class="card-model">${esc(r.modelName)}</div>
        <div class="card-gpu">${s.gpuCount}× ${esc(gpu.name)}</div>
        <div class="card-metrics">
          <span class="metric"><b>~${r.tokensPerSecPerUser.toFixed(0)}</b> tok/s</span>
          <span class="metric"><b>$${r.costPerMillionTotalTokensUsd.toFixed(2)}</b> / 1M tok</span>
          <span class="metric"><b>${r.totalVramNeededGB.toFixed(0)}</b> GB VRAM</span>
        </div>
        ${oom}
      </a>`;
  }).join('\n');
}
