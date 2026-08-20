import { ModelPreset, QuantizationOption, GpuPreset, PresetScenario, InferenceEngine, UserProfile } from '../types';
import { MODEL_CATALOG } from './modelCatalog';

export {
  GPU_HARDWARE_SPECS,
  CLOUD_PROVIDER_EQUIVALENTS,
  CLOUD_PROVIDERS,
  type GpuHardwareSpec
} from './cloudProviders';
export { GPU_PRESETS } from './gpuPresets';
export { MODEL_CATALOG } from './modelCatalog';

export const INFERENCE_ENGINES: InferenceEngine[] = [
  {
    id: 'vllm',
    name: 'vLLM',
    shortName: 'vLLM',
    badge: 'PagedAttention',
    throughputMultiplier: 1.15,
    kvCacheFragmentationPct: 4, // PagedAttention reduces memory fragmentation to <4%
    description: 'Yüksek throughput sunan endüstri standardı vLLM motoru. PagedAttention ile bellek israfını sıfırlara indirir.',
    features: ['PagedAttention', 'Continuous Batching', 'FP8 / AWQ / GPTQ Desteği', 'Distributed TP/PP'],
  },
  {
    id: 'llamacpp',
    name: 'llama.cpp',
    shortName: 'llama.cpp',
    badge: 'GGUF / Offload',
    throughputMultiplier: 0.90,
    kvCacheFragmentationPct: 10,
    description: 'C/C++ tabanlı, CPU/GPU hibrit çalıştırma sunan, Mac Metal, CUDA ve Vulkan destekli hafif çıkarım motoru.',
    features: ['GGUF K-Quants (Q4_K_M/Q5_K_M)', 'CPU + VRAM Offloading', 'Sıfır CUDA Overhead Seçeneği', 'Apple Silicon Metal Hızlandırma'],
  },
  {
    id: 'tensorrt',
    name: 'NVIDIA TensorRT-LLM',
    shortName: 'TensorRT-LLM',
    badge: 'TensorRT Kernel',
    throughputMultiplier: 1.28,
    kvCacheFragmentationPct: 5,
    description: 'NVIDIA GPU hardware çekirdekleri için sıfırdan optimize edilmiş, en yüksek token üretim hızı sunan kurumsal motor.',
    features: ['In-flight Batching', 'FP8 / INT4 GEMM Kernels', 'XQA Attention Kernels', 'Multi-GPU Tensor Parallelism'],
  },
  {
    id: 'sglang',
    name: 'SGLang',
    shortName: 'SGLang',
    badge: 'RadixAttention',
    throughputMultiplier: 1.22,
    kvCacheFragmentationPct: 6,
    description: 'RadixAttention ile otomatik prefix caching sağlayan, RAG ve çok turlu sohbetlerde devasa prefill tasarrufu sunan motor.',
    features: ['RadixAttention Prefix Reuse', 'Fast Structured Output Decoding', 'Multi-Layer Parallelism', 'DeepSeek MoE Optimization'],
  },
  {
    id: 'tgi',
    name: 'HuggingFace TGI',
    shortName: 'TGI',
    badge: 'FlashAttention-2',
    throughputMultiplier: 1.00,
    kvCacheFragmentationPct: 8,
    description: 'HuggingFace Text Generation Inference. Production ortamları için hazır Docker konteyner çözümü.',
    features: ['FlashAttention-2', 'Safetensors Direct Loading', 'Grammar / JSON Schema Output', 'Watermarking Support'],
  },
  {
    id: 'ollama',
    name: 'Ollama',
    shortName: 'Ollama',
    badge: 'Local Developer API',
    throughputMultiplier: 0.85,
    kvCacheFragmentationPct: 10,
    description: 'Masaüstü ve yerel geliştiriciler için tek komutla model indirme ve çalıştırma kolaylığı sunan llama.cpp sarmalayıcısı.',
    features: ['Modelfile Özelleştirme', 'REST / OpenAI Uyumlu API', 'GGUF Otomatik Yönetim', 'Tek Tıkla Kurulum'],
  },
];

export const DEFAULT_USER_PROFILES: UserProfile[] = [
  {
    id: 'profile-chat',
    name: 'Sohbet Kullanıcıları (Chat)',
    userCount: 12,
    promptLen: 1024,
    genLen: 512,
  },
  {
    id: 'profile-rag',
    name: 'RAG & Belge Arama',
    userCount: 4,
    promptLen: 8192,
    genLen: 1024,
  },
  {
    id: 'profile-code',
    name: 'Kod Asistanı (Coding)',
    userCount: 2,
    promptLen: 4096,
    genLen: 512,
  },
];

export const MODEL_PRESETS: ModelPreset[] = [
  ...MODEL_CATALOG,
];

export const DEFAULT_CUSTOM_MODEL: ModelPreset = {
  id: 'custom-model',
  name: 'Özel LLM Modeli',
  provider: 'Özel',
  totalParamsB: 14,
  activeParamsB: 14,
  numLayers: 40,
  numHeads: 32,
  numKvHeads: 8,
  headDim: 128,
  hiddenSize: 4096,
  defaultContextLen: 4096,
  maxContextLen: 32768,
  isMoe: false,
  description: 'Manuel girilmiş model parametreleri.',
  category: 'Custom',
};

export const QUANTIZATION_OPTIONS: QuantizationOption[] = [
  {
    id: 'fp16',
    name: 'FP16 / BF16 (16-bit Uncompressed)',
    shortName: 'FP16',
    bytesPerParam: 2.0,
    bits: 16,
    qualityDegradation: 'Tam Hassasiyet (%0 Kayıp)',
    description: 'En yüksek doğruluk ve eğitim hassasiyeti. En fazla VRAM tüketir.',
  },
  {
    id: 'fp8',
    name: 'FP8 / INT8 (8-bit Quantized)',
    shortName: 'FP8 / INT8',
    bytesPerParam: 1.0,
    bits: 8,
    qualityDegradation: 'İhmal Edilebilir (<%0.1 Kayıp)',
    description: 'Hız ve VRAM dengesinde modern endüstri standardı.',
  },
  {
    id: 'int4',
    name: 'INT4 / AWQ / GPTQ (4-bit Quantized)',
    shortName: 'INT4 / AWQ',
    bytesPerParam: 0.5,
    bits: 4,
    qualityDegradation: 'Çok Düşük (~%0.5 - %1 Kayıp)',
    description: 'VRAM yükünü 4 kat düşürür. GPU belleği kısıtlı ortamlarda popülerdir.',
  },
  {
    id: 'q8_0',
    name: 'GGUF Q8_0 (8.5-bit Equivalent)',
    shortName: 'Q8_0',
    bytesPerParam: 1.05,
    bits: 8.5,
    qualityDegradation: 'Sıfıra Yakın Kayıp',
    description: 'llama.cpp ve Ollama için yüksek kaliteli GGUF hassasiyeti.',
  },
  {
    id: 'q6_k',
    name: 'GGUF Q6_K (6.5-bit Equivalent)',
    shortName: 'Q6_K',
    bytesPerParam: 0.82,
    bits: 6.5,
    qualityDegradation: 'Aşırı Düşük Kayıp',
    description: 'GGUF formatında kalite ve boyut dengesi.',
  },
  {
    id: 'q5_k',
    name: 'GGUF Q5_K_M (5.5-bit Equivalent)',
    shortName: 'Q5_K_M',
    bytesPerParam: 0.70,
    bits: 5.5,
    qualityDegradation: 'Minimum Kayıp (~%0.2)',
    description: 'Yerel LLM meraklılarının favori dengeli GGUF formatı.',
  },
  {
    id: 'q4_k',
    name: 'GGUF Q4_K_M (4.5-bit Equivalent)',
    shortName: 'Q4_K_M',
    bytesPerParam: 0.55,
    bits: 4.5,
    qualityDegradation: 'Küçük Kayıp (~%0.8)',
    description: 'Masaüstü ve Mac cihazlarda en çok tercih edilen hassasiyet.',
  },
  {
    id: 'q3_k',
    name: 'GGUF Q3_K_M (3.4-bit Quantized)',
    shortName: 'Q3_K_M',
    bytesPerParam: 0.45,
    bits: 3.4,
    qualityDegradation: 'Belirgin Kayıp (~%2 - %4)',
    description: 'Aşırı VRAM tasarrufu gerektiren durumlar için.',
  },
];

export const KV_CACHE_QUANT_OPTIONS = [
  { id: 'fp16', name: 'FP16 (16-bit Standard)', bytesPerParam: 2.0 },
  { id: 'fp8', name: 'FP8 (8-bit Quantized Cache)', bytesPerParam: 1.0 },
  { id: 'int4', name: 'INT4 (4-bit Quantized Cache)', bytesPerParam: 0.5 },
];

export const DEFAULT_CUSTOM_GPU: GpuPreset = {
  id: 'custom-gpu',
  name: 'Özel GPU / Hızlandırıcı',
  vendor: 'Custom',
  vramGB: 32,
  memoryBandwidthGBs: 1200,
  fp16Tflops: 300,
  hourlyCostUsd: 1.0,
  interconnectSpeedGBs: 128,
  description: 'Özel tanımlanmış GPU bellek ve hesaplama değerleri.',
};

export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: 'local-ollama',
    title: 'Yerel Masaüstü / Ollama (RTX 4090)',
    description: 'RTX 4090 24GB kart üzerinde Llama 3.3 70B Q4_K_M veya Qwen 2.5 32B çalıştırma.',
    iconName: 'Laptop',
    config: {
      modelId: 'qwen-2.5-32b',
      quantId: 'q4_k',
      kvCacheQuantId: 'fp16',
      gpuId: 'nvidia-rtx-4090',
      gpuCount: 1,
      tensorParallelism: 1,
      promptLen: 2048,
      genLen: 512,
      batchSize: 1,
      requestsPerMin: 10,
    },
  },
  {
    id: 'startup-api',
    title: 'Girişim / SaaS API Sunucusu (1x H100)',
    description: 'Llama 3.3 70B FP8 hassasiyetinde vLLM ile 16 eşzamanlı kullanıcıya hizmet verme.',
    iconName: 'Server',
    config: {
      modelId: 'llama-3.3-70b',
      quantId: 'fp8',
      kvCacheQuantId: 'fp8',
      gpuId: 'nvidia-h100-sxm',
      gpuCount: 1,
      tensorParallelism: 1,
      promptLen: 4096,
      genLen: 1024,
      batchSize: 16,
      requestsPerMin: 120,
    },
  },
  {
    id: 'deepseek-r1-cluster',
    title: 'DeepSeek R1 / V3 On-Prem Kümesi (8x H100)',
    description: '671B MoE dev modeli 8x H100 80GB düğümünde FP8 hassasiyeti ile çalıştırma.',
    iconName: 'Cpu',
    config: {
      modelId: 'deepseek-r1-v3',
      quantId: 'fp8',
      kvCacheQuantId: 'fp8',
      gpuId: 'nvidia-h100-sxm',
      gpuCount: 8,
      tensorParallelism: 8,
      promptLen: 8192,
      genLen: 2048,
      batchSize: 32,
      requestsPerMin: 300,
    },
  },
  {
    id: 'llama-405b-enterprise',
    title: 'Kurumsal Llama 405B Çıkarım (16x H200)',
    description: 'Frontier sınıfı 405B modelini yüksek eşzamanlılık ve 128k bağlam ile canlı tutma.',
    iconName: 'ShieldCheck',
    config: {
      modelId: 'llama-3.1-405b',
      quantId: 'fp8',
      kvCacheQuantId: 'fp8',
      gpuId: 'nvidia-h200',
      gpuCount: 16,
      tensorParallelism: 8,
      promptLen: 16384,
      genLen: 1024,
      batchSize: 64,
      requestsPerMin: 600,
    },
  },
];
