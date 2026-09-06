import { ModelPreset, GpuPreset } from '../types';
import { DEFAULT_CUSTOM_MODEL, DEFAULT_CUSTOM_GPU } from '../data/presets';

const MODELS_KEY = 'llmcalc:customModels';
const GPU_KEY = 'llmcalc:customGpu';

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full/unavailable — keep in-memory only.
  }
}

export function listCustomModels(): ModelPreset[] {
  const list = read<ModelPreset[]>(MODELS_KEY);
  return Array.isArray(list) ? list : [];
}

export function upsertCustomModel(model: ModelPreset): ModelPreset {
  const list = listCustomModels();
  const saved = { ...model, id: model.id || `custom-model-${crypto.randomUUID()}` };
  const idx = list.findIndex((m) => m.id === saved.id);
  if (idx >= 0) {
    list[idx] = saved;
  } else {
    list.push(saved);
  }
  write(MODELS_KEY, list);
  return saved;
}

export function deleteCustomModel(id: string): void {
  write(
    MODELS_KEY,
    listCustomModels().filter((m) => m.id !== id)
  );
}

export function getCustomGpu(): GpuPreset | null {
  return read<GpuPreset>(GPU_KEY);
}

export function saveCustomGpu(gpu: GpuPreset): GpuPreset {
  const saved = { ...gpu, id: 'custom-gpu' };
  write(GPU_KEY, saved);
  return saved;
}

export function customModelFromDefaults(): ModelPreset {
  return { ...DEFAULT_CUSTOM_MODEL, id: `custom-model-${crypto.randomUUID()}` };
}

export function customGpuFromDefaults(): GpuPreset {
  const existing = getCustomGpu();
  return existing ? { ...DEFAULT_CUSTOM_GPU, ...existing } : { ...DEFAULT_CUSTOM_GPU };
}