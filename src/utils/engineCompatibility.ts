import { INFERENCE_ENGINES, GPU_PRESETS } from '../data/presets';
import { GpuPreset } from '../types';

export type GpuVendor = GpuPreset['vendor'];

// Returns true when the given engine can run on the given GPU vendor.
export function isEngineSupportedByVendor(engineId: string, vendor: GpuVendor): boolean {
  if (vendor === 'Custom') return true; // user-defined accelerator: allow all engines
  const engine = INFERENCE_ENGINES.find((e) => e.id === engineId);
  if (!engine) return true;
  return engine.supportedVendors.includes(vendor as 'NVIDIA' | 'AMD' | 'Apple');
}

// Returns true when the given weight-quant id is supported by the engine.
export function isQuantSupportedByEngine(quantId: string, engineId: string): boolean {
  const engine = INFERENCE_ENGINES.find((e) => e.id === engineId);
  if (!engine) return true;
  return engine.supportedQuants.includes(quantId);
}

export function engineVendorReason(engineId: string, vendor: GpuVendor): string | null {
  if (isEngineSupportedByVendor(engineId, vendor)) return null;
  const engine = INFERENCE_ENGINES.find((e) => e.id === engineId);
  if (!engine) return null;
  return engine.vendorReason || null;
}

export function engineQuantReason(quantId: string, engineId: string): string | null {
  if (isQuantSupportedByEngine(quantId, engineId)) return null;
  const engine = INFERENCE_ENGINES.find((e) => e.id === engineId);
  if (!engine) return null;
  return engine.quantReason || null;
}

// Preferred engine order per vendor (used to break ties in pickCompatibleEngine).
const ENGINE_PRIORITY: Record<Exclude<GpuVendor, 'Custom'>, string[]> = {
  Apple: ['mlx', 'llamacpp', 'ollama'],
  NVIDIA: ['vllm', 'sglang', 'tgi', 'tensorrt', 'ollama', 'llamacpp'],
  AMD: ['vllm', 'sglang', 'ollama', 'llamacpp'],
  Intel: ['llamacpp'],
};

// Picks an engine that supports BOTH the selected quant and GPU vendor.
// Keeps the current engine when it is already compatible; otherwise falls back
// to a sensible engine for the vendor, staying within supportedQuants.
export function pickCompatibleEngine(opts: {
  engineId?: string;
  quantId: string;
  gpuId: string;
  customGpu?: GpuPreset;
}): string {
  const { engineId, quantId, gpuId, customGpu } = opts;
  const actualVendor: GpuVendor =
    gpuId === 'custom'
      ? customGpu?.vendor ?? 'Custom'
      : GPU_PRESETS.find((g) => g.id === gpuId)?.vendor ?? 'NVIDIA';

  const candidates = INFERENCE_ENGINES.filter(
    (e) => isQuantSupportedByEngine(quantId, e.id) && isEngineSupportedByVendor(e.id, actualVendor)
  );
  const candidateIds = candidates.map((e) => e.id);

  if (engineId && candidateIds.includes(engineId)) return engineId;

  if (actualVendor === 'Custom') {
    // User-defined accelerator: honor the quant family preference.
    return candidateIds[0] || 'llamacpp';
  }

  const priority = ENGINE_PRIORITY[actualVendor as Exclude<GpuVendor, 'Custom'>] || [];
  for (const id of priority) {
    if (candidateIds.includes(id)) return id;
  }
  // Last resort: first candidate that matches the quant, else the classic fallback.
  return candidateIds[0] || 'llamacpp';
}