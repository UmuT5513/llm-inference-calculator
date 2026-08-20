import { FineTuningConfig, FineTuningResults, ModelPreset, GpuPreset, PlatformCostEstimate } from '../types';
import { MODEL_PRESETS, GPU_PRESETS, DEFAULT_CUSTOM_MODEL, DEFAULT_CUSTOM_GPU } from '../data/presets';
import { FINE_TUNING_METHODS, FINE_TUNING_FRAMEWORKS, TRAINING_PLATFORMS } from '../data/fineTuningPresets';

export function calculateFineTuningMetrics(config: FineTuningConfig, catalog?: ModelPreset[]): FineTuningResults {
  const modelCatalog = catalog && catalog.length > 0 ? catalog : MODEL_PRESETS;
  // 1. Resolve Model
  let model: ModelPreset;
  if (config.modelId === 'custom') {
    model = config.customModel || DEFAULT_CUSTOM_MODEL;
  } else {
    model = modelCatalog.find((m) => m.id === config.modelId) || modelCatalog[1];
  }

  // 2. Resolve Fine-Tuning Method
  const method = FINE_TUNING_METHODS.find((m) => m.id === config.methodId) || FINE_TUNING_METHODS[0];

  // 3. Resolve Framework
  const framework = FINE_TUNING_FRAMEWORKS.find((f) => f.id === config.frameworkId) || FINE_TUNING_FRAMEWORKS[0];

  const totalParamsB = model.totalParamsB;
  const activeParamsB = model.activeParamsB;

  // 4. Workload & Dataset Metrics
  let sampleCount = Math.max(10, config.sampleCount || 10000);
  const avgSeqLen = Math.max(64, config.avgSeqLen || 2048);
  const epochs = Math.max(1, config.epochs || 3);

  // If user entered total tokens directly
  if (config.datasetInputMode === 'tokens' && config.totalTokensInput && config.totalTokensInput > 0) {
    sampleCount = Math.max(10, Math.round(config.totalTokensInput / (avgSeqLen * epochs)));
  }

  const totalTokens = sampleCount * avgSeqLen * epochs;

  // 5. Intelligent Hyperparameter Auto-Optimization
  // Automatically determine the optimal micro-batch size and gradient accumulation steps
  // based on sequence length and model size for maximum throughput without OOM
  let optimalBatchSize = 2;
  let optimalGradAcc = 8;

  if (avgSeqLen <= 1024) {
    optimalBatchSize = totalParamsB > 30 ? 2 : 4;
    optimalGradAcc = totalParamsB > 30 ? 8 : 4;
  } else if (avgSeqLen <= 2048) {
    optimalBatchSize = totalParamsB > 30 ? 1 : 2;
    optimalGradAcc = totalParamsB > 30 ? 16 : 8;
  } else if (avgSeqLen <= 4096) {
    optimalBatchSize = 1;
    optimalGradAcc = 16;
  } else {
    optimalBatchSize = 1;
    optimalGradAcc = 32;
  }

  // If user has custom overrides and auto-optimize is disabled
  const perDeviceBatchSize = config.autoOptimizeHyperparams === false
    ? Math.max(1, config.perDeviceBatchSize || optimalBatchSize)
    : optimalBatchSize;

  const gradientAccumulationSteps = config.autoOptimizeHyperparams === false
    ? Math.max(1, config.gradientAccumulationSteps || optimalGradAcc)
    : optimalGradAcc;

  const effectiveBatchSize = perDeviceBatchSize * gradientAccumulationSteps;
  const totalSteps = Math.ceil((sampleCount * epochs) / effectiveBatchSize);
  const tokensPerStep = effectiveBatchSize * avgSeqLen;

  // 6. VRAM Calculation for Training (GB)
  // A. Model Weights VRAM
  let weightBytesPerParam = method.bytesPerWeight;
  let weightVramGB = totalParamsB * weightBytesPerParam;

  if (config.methodId === 'dpo-alignment') {
    weightVramGB = totalParamsB * 0.5 * 2; // Reference + active policy in 4-bit
  }

  // B. Gradients VRAM
  let gradientVramGB: number;
  if (config.methodId === 'full-finetune') {
    gradientVramGB = totalParamsB * 2.0;
  } else {
    const loraRank = config.loraRank || 16;
    const loraParamFraction = (loraRank / 16) * 0.003;
    gradientVramGB = Math.max(0.05, totalParamsB * loraParamFraction * 2.0);
  }

  // C. Optimizer States VRAM
  let optimizerVramGB: number;
  if (config.methodId === 'full-finetune') {
    if (config.optimizerType === 'adamw_32bit') {
      optimizerVramGB = totalParamsB * 8.0;
    } else {
      optimizerVramGB = totalParamsB * 2.0; // 8-bit paged AdamW
    }
  } else {
    const loraRank = config.loraRank || 16;
    const loraParamFraction = (loraRank / 16) * 0.003;
    const bytesPerOpt = config.optimizerType === 'adamw_32bit' ? 8.0 : 2.0;
    optimizerVramGB = Math.max(0.08, totalParamsB * loraParamFraction * bytesPerOpt);
  }

  // D. Activation Memory (GB) with Checkpointing & Triton optimizations
  const hiddenDim = model.hiddenSize || 4096;
  const numLayers = model.numLayers || 32;
  const rawActivationGB = (perDeviceBatchSize * avgSeqLen * hiddenDim * 2 * numLayers * 12) / (1024 * 1024 * 1024);

  let activationVramGB: number;
  const useGradCheck = config.gradientCheckpointing !== false;
  if (useGradCheck) {
    activationVramGB = ((perDeviceBatchSize * avgSeqLen * hiddenDim * 2) / (1024 * 1024 * 1024)) * 2.5;
  } else {
    activationVramGB = rawActivationGB;
  }

  activationVramGB *= framework.vramEfficiencyMultiplier;
  activationVramGB = Math.max(0.35, activationVramGB);

  // E. CUDA Overhead
  const cudaOverheadGB = config.frameworkId === 'unsloth' ? 1.1 : 1.6;

  // Total required VRAM for a single GPU worker
  const totalVramNeededGB = weightVramGB + gradientVramGB + optimizerVramGB + activationVramGB + cudaOverheadGB;
  const recommendedMinVramGB = Math.ceil(totalVramNeededGB * 1.12); // +12% safety headroom

  // Default simulated GPU if selected, otherwise standard 24GB RTX 4090 / L4
  let gpu: GpuPreset;
  if (config.gpuId === 'custom') {
    gpu = config.customGpu || DEFAULT_CUSTOM_GPU;
  } else if (config.gpuId) {
    gpu = GPU_PRESETS.find((g) => g.id === config.gpuId) || GPU_PRESETS[2];
  } else {
    gpu = GPU_PRESETS.find((g) => g.vramGB >= recommendedMinVramGB) || GPU_PRESETS[2];
  }

  const gpuCount = Math.max(1, config.gpuCount || 1);
  const totalVramAvailableGB = gpu.vramGB * gpuCount;
  const vramPerGpuNeededGB = totalVramNeededGB;
  const vramUtilizationPct = Math.min(250, (vramPerGpuNeededGB / gpu.vramGB) * 100);
  const isOom = vramPerGpuNeededGB > gpu.vramGB;
  const recommendedMinGpus = Math.ceil(totalVramNeededGB / (gpu.vramGB * 0.88));

  // 7. Training FLOPs & Time Estimation
  let flopsPerTokenPerParam: number;
  if (config.methodId === 'full-finetune') {
    flopsPerTokenPerParam = 6.0;
  } else if (config.methodId === 'dpo-alignment') {
    flopsPerTokenPerParam = 4.5;
  } else {
    flopsPerTokenPerParam = 2.3; // Forward pass + low-rank backward pass
  }

  const totalFlopsRequired = totalTokens * activeParamsB * 1e9 * flopsPerTokenPerParam;

  // MFU (Model FLOPs Utilization)
  let mfu = 0.28;
  if (config.flashAttention !== false) mfu += 0.08;
  if (config.frameworkId === 'unsloth') {
    mfu = 0.62;
  } else if (config.frameworkId === 'torchtune') {
    mfu = 0.38;
  } else if (config.frameworkId === 'axolotl') {
    mfu = 0.36;
  }

  // Format Time helper
  const formatTime = (hours: number): string => {
    if (hours < 1 / 60) {
      return '< 1 dakika';
    }
    if (hours < 1) {
      const mins = Math.max(1, Math.round(hours * 60));
      return `${mins} dakika`;
    }
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) return `${h} saat`;
    return `${h} sa ${m} dk`;
  };

  // 8. Platform Cost Estimates Across All Cloud Providers & Hardware
  const usdToTryRate = config.usdToTryRate || 50;
  const electricityRateTryPerKwh = config.electricityRateTryPerKwh || 4.20;

  const platformEstimates: PlatformCostEstimate[] = TRAINING_PLATFORMS.map((platform) => {
    const platformVramTotal = platform.gpuVramGB * platform.gpuCount;
    // Check if platform VRAM is sufficient for this job
    const isFeasibleVram = totalVramNeededGB <= platformVramTotal * 0.95;
    const vramUsagePct = Math.min(250, Math.round((totalVramNeededGB / platformVramTotal) * 100));

    // Calculate platform compute performance (TFLOPS + MFU)
    const platformFlopsPerSec = platform.gpuCount * (platform.fp16Tflops * 1e12) * mfu;
    const platformTimeHours = Math.max(0.01, (totalFlopsRequired / Math.max(1, platformFlopsPerSec)) / 3600);
    const estimatedTimeFormatted = formatTime(platformTimeHours);

    let totalCostUsd = 0;
    let colabComputeUnitsNeeded: number | undefined = undefined;

    if (platform.id === 'colab-free') {
      totalCostUsd = 0;
    } else if (platform.colabComputeUnitsPerHour) {
      colabComputeUnitsNeeded = Math.ceil(platformTimeHours * platform.colabComputeUnitsPerHour);
      // Colab Pro is $9.99 for 100 CU (~$0.10 per CU)
      totalCostUsd = colabComputeUnitsNeeded * 0.10;
    } else if (platform.id === 'local-pc-rtx4090') {
      // Local PC electricity cost: 450W power draw
      const totalKwh = (450 * platformTimeHours) / 1000;
      const totalCostTryCalc = totalKwh * electricityRateTryPerKwh;
      totalCostUsd = totalCostTryCalc / usdToTryRate;
    } else {
      totalCostUsd = platformTimeHours * platform.hourlyRateUsd;
    }

    const totalCostTry = totalCostUsd * usdToTryRate;

    return {
      platformId: platform.id,
      platformName: platform.name,
      category: platform.category,
      gpuName: platform.gpuName,
      gpuCount: platform.gpuCount,
      gpuVramGB: platform.gpuVramGB,
      hourlyRateUsd: platform.hourlyRateUsd,
      estimatedTimeHours: platformTimeHours,
      estimatedTimeFormatted,
      totalCostUsd,
      totalCostTry,
      isFeasibleVram,
      vramNeededGB: totalVramNeededGB,
      vramUsagePct,
      colabComputeUnitsNeeded,
      notes: platform.notes,
      badge: platform.badge,
      websiteUrl: platform.websiteUrl,
      isCheapestFeasible: false,
      isFastestFeasible: false,
      isBestValueFeasible: false,
      freeTierUsable: platform.freeTier && isFeasibleVram,
    };
  });

  // Identify Best, Cheapest, Fastest, and Best Value platforms
  const feasiblePlatforms = platformEstimates.filter((p) => p.isFeasibleVram);
  let cheapestPlatform: PlatformCostEstimate | undefined = undefined;
  let fastestPlatform: PlatformCostEstimate | undefined = undefined;
  let bestValuePlatform: PlatformCostEstimate | undefined = undefined;
  let freePlatform: PlatformCostEstimate | undefined = undefined;

  if (feasiblePlatforms.length > 0) {
    // 1. Cheapest Feasible
    const sortedByCost = [...feasiblePlatforms].sort((a, b) => a.totalCostUsd - b.totalCostUsd);
    cheapestPlatform = sortedByCost[0];
    cheapestPlatform.isCheapestFeasible = true;

    // 2. Fastest Feasible
    const sortedByTime = [...feasiblePlatforms].sort((a, b) => a.estimatedTimeHours - b.estimatedTimeHours);
    fastestPlatform = sortedByTime[0];
    fastestPlatform.isFastestFeasible = true;

    // 3. Best Value (Sweet spot between speed and hourly cost, typically RTX 4090 or Lambda A100)
    const sortedByValue = [...feasiblePlatforms].filter((p) => !p.freeTierUsable).sort((a, b) => {
      const scoreA = a.totalCostUsd * Math.sqrt(a.estimatedTimeHours);
      const scoreB = b.totalCostUsd * Math.sqrt(b.estimatedTimeHours);
      return scoreA - scoreB;
    });
    bestValuePlatform = sortedByValue[0] || cheapestPlatform;
    bestValuePlatform.isBestValueFeasible = true;

    // 4. Free Platform
    freePlatform = feasiblePlatforms.find((p) => p.freeTierUsable);
  }

  // Baseline time calculations based on recommended platform or RTX 4090
  const refPlatform = bestValuePlatform || cheapestPlatform || platformEstimates[0];
  const trainingTimeHours = refPlatform?.estimatedTimeHours || 0.5;
  const trainingTimeSec = trainingTimeHours * 3600;
  const trainingTimeFormatted = formatTime(trainingTimeHours);
  const throughputTokensPerSec = totalTokens / Math.max(1, trainingTimeSec);

  // Unsloth Speedup vs Standard HF Baseline
  const unslothSpeedupMultiplier = config.frameworkId === 'unsloth' ? 4.2 : 1.0;
  const standardHfTimeHours = config.frameworkId === 'unsloth'
    ? trainingTimeHours * 3.8
    : trainingTimeHours;
  const unslothTimeSavedHours = Math.max(0, standardHfTimeHours - trainingTimeHours);

  // Cost Savings calculation
  const standardHfCostEstimate = (cheapestPlatform?.totalCostUsd || 5) * 3.8;
  const unslothCostSavingsUsd = Math.max(0, standardHfCostEstimate - (cheapestPlatform?.totalCostUsd || 0));

  // Local PC Electricity cost
  const localKwh = (450 * trainingTimeHours) / 1000;
  const localElectricityCostTry = localKwh * electricityRateTryPerKwh;
  const localElectricityCostUsd = localElectricityCostTry / usdToTryRate;

  // Auto-optimized description summary
  const autoOptimizedSummary = `Önerilen Konfigürasyon: Micro-batch ${optimalBatchSize}, Gradient Accumulation ${optimalGradAcc} (Effective Batch: ${effectiveBatchSize}). Unsloth Triton çekirdekleri ve Gradient Checkpointing ile gereken VRAM ${totalVramNeededGB.toFixed(1)} GB'a düşürüldü.`;

  // 9. Generate Exportable Training Code Snippets
  const unslothPythonCode = generateUnslothCode(config, model, optimalBatchSize, optimalGradAcc);
  const hfTrlScriptCode = generateHfTrlCode(config, model, optimalBatchSize, optimalGradAcc);
  const axolotlYamlCode = generateAxolotlYaml(config, model, optimalBatchSize, optimalGradAcc);
  const datasetTemplateJsonl = generateDatasetTemplateJsonl(config);

  return {
    modelName: model.name,
    totalParamsB,
    methodName: method.name,
    methodBadge: method.badge,
    frameworkName: framework.name,

    totalSamples: sampleCount,
    totalTokens,
    totalSteps,
    effectiveBatchSize,
    tokensPerStep,
    optimalBatchSize,
    optimalGradAcc,
    autoOptimizedSummary,

    weightVramGB,
    gradientVramGB,
    optimizerVramGB,
    activationVramGB,
    cudaOverheadGB,
    totalVramNeededGB,
    vramPerGpuNeededGB,
    totalVramAvailableGB,
    vramUtilizationPct,
    isOom,
    recommendedMinVramGB,
    recommendedMinGpus,

    totalFlopsRequired,
    hardwareTflopsAtMfu: ((refPlatform?.gpuCount || 1) * (GPU_PRESETS[2].fp16Tflops) * mfu),
    trainingTimeSec,
    trainingTimeHours,
    trainingTimeFormatted,
    throughputTokensPerSec,
    unslothSpeedupMultiplier,
    unslothTimeSavedHours,
    standardHfTimeHours,

    platformEstimates,
    cheapestPlatform,
    fastestPlatform,
    bestValuePlatform,
    freePlatform,
    unslothCostSavingsUsd,
    localElectricityCostTry,
    localElectricityCostUsd,

    unslothPythonCode,
    hfTrlScriptCode,
    axolotlYamlCode,
    datasetTemplateJsonl,
  };
}

// ----------------------------------------------------
// CODE GENERATION HELPERS
// ----------------------------------------------------

function generateUnslothCode(config: FineTuningConfig, model: ModelPreset, batchSize: number, gradAcc: number): string {
  const modelNameClean = model.id.replace(/[^a-zA-Z0-9_-]/g, '');
  const loraRank = config.loraRank || 16;
  const loraAlpha = config.loraAlpha || 32;
  const maxSeqLen = config.avgSeqLen || 2048;
  const epochs = config.epochs || 3;

  return `## ========================================================
## UNSLOTH FAST QLORA FINE-TUNING SCRIPT (Google Colab / Jupyter)
## Model: ${model.name} (${model.totalParamsB}B Params)
## Framework: Unsloth (5x Hızlı / %80 Daha Az VRAM)
## ========================================================

# 1. Gerekli Kütüphanelerin Kurulumu
!pip install --no-deps "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
!pip install --no-deps trl peft accelerate bitsandbytes datasets

import torch
from unsloth import FastLanguageModel
from datasets import load_dataset
from trl import SFTTrainer
from transformers import TrainingArguments

# 2. Modeli 4-bit Unsloth FastLanguageModel ile Yükleme
max_seq_length = ${maxSeqLen}
dtype = None # Otomatik algılama (Tesla T4/V100 için Float16, Ampere/Ada/Hopper için Bfloat16)
load_in_4bit = True

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name = "unsloth/${modelNameClean}-bnb-4bit", # veya HuggingFace repo adı
    max_seq_length = max_seq_length,
    dtype = dtype,
    load_in_4bit = load_in_4bit,
)

# 3. LoRA / QLoRA Adaptörlerinin Eklenmesi
model = FastLanguageModel.get_peft_model(
    model,
    r = ${loraRank},
    target_modules = ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    lora_alpha = ${loraAlpha},
    lora_dropout = 0, # Unsloth 0 dropout ile optimize edilmiştir
    bias = "none",
    use_gradient_checkpointing = "unsloth", # 80% daha az VRAM tüketen akıllı checkpointing
    random_state = 3407,
)

# 4. Veri Kümesini Yükleme ve Formatlama (ChatML / Alpaca)
alpaca_prompt = """Aşağıda bir görevi tanımlayan bir talimat yer almaktadır. İsteği uygun şekilde tamamlayan bir yanıt yazın.

### Talimat:
{}

### Girdi:
{}

### Yanıt:
{}"""

def formatting_prompts_func(examples):
    instructions = examples["instruction"]
    inputs       = examples["input"]
    outputs      = examples["output"]
    texts = []
    for instruction, input_text, output in zip(instructions, inputs, outputs):
        text = alpaca_prompt.format(instruction, input_text, output) + tokenizer.eos_token
        texts.append(text)
    return { "text" : texts }

dataset = load_dataset("json", data_files="dataset.jsonl", split="train")
dataset = dataset.map(formatting_prompts_func, batched = True)

# 5. SFT Trainer ile Eğitimi Başlatma
trainer = SFTTrainer(
    model = model,
    tokenizer = tokenizer,
    train_dataset = dataset,
    dataset_text_field = "text",
    max_seq_length = max_seq_length,
    dataset_num_proc = 2,
    packing = False, # Kısa örneklerde eğitimi %30 hızlandırabilir
    args = TrainingArguments(
        per_device_train_batch_size = ${batchSize},
        gradient_accumulation_steps = ${gradAcc},
        warmup_ratio = 0.05,
        num_train_epochs = ${epochs},
        learning_rate = 2e-4,
        fp16 = not torch.cuda.is_bf16_supported(),
        bf16 = torch.cuda.is_bf16_supported(),
        logging_steps = 10,
        optim = "adamw_8bit",
        weight_decay = 0.01,
        lr_scheduler_type = "linear",
        seed = 3407,
        output_dir = "outputs",
        save_strategy = "epoch",
    ),
)

# Eğitimi Çalıştır!
trainer_stats = trainer.train()

# 6. Modeli Kaydetme & GGUF / vLLM Formatına Dönüştürme
# A) Yalnızca LoRA Adaptörlerini Kaydet
model.save_pretrained("my_custom_lora_adapter")
tokenizer.save_pretrained("my_custom_lora_adapter")

# B) vLLM / Ollama için Doğrudan 16-bit veya GGUF Olarak Birleştir (Merge)
# model.save_pretrained_merged("merged_model_16bit", tokenizer, save_method = "merged_16bit")
# model.save_pretrained_gguf("custom_model_q4_k_m", tokenizer, quantization_method = "q4_k_m")
`;
}

function generateHfTrlCode(config: FineTuningConfig, model: ModelPreset, batchSize: number, gradAcc: number): string {
  const loraRank = config.loraRank || 16;
  const loraAlpha = config.loraAlpha || 32;
  const epochs = config.epochs || 3;

  return `import torch
from datasets import load_dataset
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig, TrainingArguments
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer

# 1. 4-bit NF4 Quantization Yapılandırması
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True,
)

# 2. Model ve Tokenizer Yükleme
model_id = "${model.name}"
tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
tokenizer.pad_token = tokenizer.eos_token

model = AutoModelForCausalLM.from_pretrained(
    model_id,
    quantization_config=bnb_config,
    device_map="auto",
    trust_remote_code=True,
)
model = prepare_model_for_kbit_training(model)

# 3. LoRA Adaptör Yapılandırması
peft_config = LoraConfig(
    r=${loraRank},
    lora_alpha=${loraAlpha},
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
)
model = get_peft_model(model, peft_config)

# 4. Eğitim Parametreleri
training_args = TrainingArguments(
    output_dir="./results",
    num_train_epochs=${epochs},
    per_device_train_batch_size=${batchSize},
    gradient_accumulation_steps=${gradAcc},
    learning_rate=2e-4,
    optim="paged_adamw_8bit",
    fp16=False,
    bf16=True,
    logging_steps=10,
    gradient_checkpointing=True,
)

# 5. SFTTrainer Başlatma
dataset = load_dataset("json", data_files="dataset.jsonl", split="train")
trainer = SFTTrainer(
    model=model,
    train_dataset=dataset,
    peft_config=peft_config,
    dataset_text_field="text",
    max_seq_length=${config.avgSeqLen || 2048},
    tokenizer=tokenizer,
    args=training_args,
)

trainer.train()
model.save_pretrained("./fine_tuned_lora")
`;
}

function generateAxolotlYaml(config: FineTuningConfig, model: ModelPreset, batchSize: number, gradAcc: number): string {
  return `base_model: ${model.name}
model_type: AutoModelForCausalLM
tokenizer_type: AutoTokenizer

load_in_8bit: false
load_in_4bit: true
strict: false

datasets:
  - path: dataset.jsonl
    type: alpaca

dataset_prepared_path:
val_set_size: 0.05
output_dir: ./axolotl_output

sequence_len: ${config.avgSeqLen || 2048}
sample_packing: true
pad_to_sequence_len: true

adapter: qlora
lora_r: ${config.loraRank || 16}
lora_alpha: ${config.loraAlpha || 32}
lora_dropout: 0.05
lora_target_modules:
  - q_proj
  - k_proj
  - v_proj
  - o_proj
  - gate_proj
  - up_proj
  - down_proj

gradient_accumulation_steps: ${gradAcc}
micro_batch_size: ${batchSize}
num_epochs: ${config.epochs || 3}
optimizer: paged_adamw_8bit
lr_scheduler: cosine
learning_rate: 0.0002

bf16: auto
fp16: false
tf32: false

gradient_checkpointing: true
early_stopping_patience:
resume_from_checkpoint:
local_rank:
logging_steps: 1
xformers_attention:
flash_attention: true

warmup_steps: 20
evals_per_epoch: 2
saves_per_epoch: 1
weight_decay: 0.0
`;
}

function generateDatasetTemplateJsonl(config: FineTuningConfig): string {
  return `{"instruction": "Aşağıdaki müşteri sorusuna profesyonel, nazik ve çözüm odaklı bir dille Türkçe yanıt verin.", "input": "Siparişim 4 gündür kargoya verilmedi, ne zaman teslim edilir?", "output": "Merhaba, gecikme için özür dileriz. Sipariş numaranızı iletirseniz lojistik merkezimizle görüşüp kargonuzun durumunu anında kontrol edebilir ve size hızla geri dönüş sağlayabiliriz."}
{"instruction": "Verilen kurumsal metni özetleyin.", "input": "2025 yılı 4. çeyrek finansal raporunda şirketimiz net kârını geçen yılın aynı dönemine kıyasla %34 artırarak 140 milyon TL seviyesine ulaştırmıştır. Ar-Ge yatırımları kapsamında yapay zeka altyapısına 25 milyon TL bütçe ayrılmıştır.", "output": "Şirket 2025 Q4 net kârını %34 artışla 140M TL'ye yükseltmiş ve yapay zeka Ar-Ge projelerine 25M TL bütçe tahsis etmiştir."}
{"instruction": "Python ile verilen JSON verisindeki en yüksek puanlı kullanıcıyı bulan fonksiyonu yazın.", "input": "[{'name': 'Ahmet', 'score': 85}, {'name': 'Ayşe', 'score': 96}]", "output": "def get_top_user(users):\n    return max(users, key=lambda u: u['score'])\n\n# Örnek kullanım:\n# top = get_top_user(data) # {'name': 'Ayşe', 'score': 96}"}`;
}
