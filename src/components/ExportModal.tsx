import React, { useState } from 'react';
import { Download, Copy, Check } from 'lucide-react';
import { CalculatorConfig, CalculationResults } from '../types';
import { Tabs } from './ui/Tabs';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: CalculatorConfig;
  results: CalculationResults;
}

type ExportTab = 'cli' | 'k8s' | 'json' | 'markdown';

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  config,
  results,
}) => {
  const [activeTab, setActiveTab] = useState<ExportTab>('cli');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const modelSlug = results.modelName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const maxCtx = results.effectivePromptLen + results.effectiveGenLen;

  // Engine specific launch commands
  let cliCommand = '';
  switch (config.engineId) {
    case 'vllm':
      cliCommand = `vllm serve ${modelSlug} \\
  --tensor-parallel-size ${config.tensorParallelism} \\
  --gpu-memory-utilization 0.90 \\
  --max-model-len ${maxCtx} \\
  ${config.kvCacheQuantId !== 'fp16' ? `--kv-cache-dtype ${config.kvCacheQuantId}` : ''} \\
  --port 8000`;
      break;

    case 'llamacpp':
      cliCommand = `llama-server \\
  --model ./${modelSlug}.gguf \\
  --ctx-size ${maxCtx} \\
  --n-gpu-layers 99 \\
  --batch-size ${results.activeTotalUsers} \\
  --port 8080`;
      break;

    case 'tensorrt':
      cliCommand = `# 1. Build TensorRT-LLM Engine:
trtllm-build \\
  --checkpoint_dir ./${modelSlug} \\
  --output_dir ./trt_engines/${modelSlug} \\
  --tp_size ${config.tensorParallelism} \\
  --max_batch_size ${results.activeTotalUsers}

# 2. Launch TRT-LLM Server:
python3 -m tensorrt_llm.hlapi.llm --model ./trt_engines/${modelSlug} --port 8000`;
      break;

    case 'sglang':
      cliCommand = `python3 -m sglang.launch_server \\
  --model-path ${modelSlug} \\
  --tp ${config.tensorParallelism} \\
  --mem-fraction-static 0.88 \\
  --enable-radix-cache \\
  --port 30000`;
      break;

    case 'tgi':
      cliCommand = `docker run --gpus '"device=0,1"' -p 8080:80 \\
  -v $PWD/data:/data \\
  ghcr.io/huggingface/text-generation-inference:latest \\
  --model-id ${modelSlug} \\
  --num-shard ${config.tensorParallelism} \\
  --max-batch-prefill-tokens ${maxCtx * 2}`;
      break;

    case 'ollama':
      cliCommand = `# Ollama Model Run Command:
ollama run ${modelSlug}

# Custom Modelfile Config:
# FROM ${modelSlug}
# PARAMETER num_ctx ${maxCtx}
# PARAMETER num_gpu 99`;
      break;

    default:
      cliCommand = `vllm serve ${modelSlug} --tensor-parallel-size ${config.tensorParallelism}`;
  }

  // Generate K8s Spec
  const k8sYaml = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${modelSlug}-inference
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: llm-engine
        image: vllm/vllm-openai:latest
        resources:
          limits:
            nvidia.com/gpu: "${config.gpuCount}"
        env:
        - name: MODEL_NAME
          value: "${results.modelName}"
        - name: TENSOR_PARALLEL_SIZE
          value: "${config.tensorParallelism}"
        ports:
        - containerPort: 8000`;

  // Generate JSON
  const jsonExport = JSON.stringify({ config, results }, null, 2);

  // Generate Markdown
  const markdownReport = `# LLM Inference & VRAM Benchmark Report
**Model:** ${results.modelName} (${results.totalParamsB}B Params)
**Engine:** ${results.engineName} (${results.engineBadge})
**GPU Cluster:** ${config.gpuCount}x ${results.gpuName} (${results.totalVramAvailableGB} GB VRAM)
**Quantization:** ${config.quantId} (KV Cache: ${config.kvCacheQuantId})
**Workload:** ${results.activeTotalUsers} Active Users (Prompt: ${results.effectivePromptLen} tk / Gen: ${results.effectiveGenLen} tk)

## Memory Breakdown
- **Weights VRAM:** ${results.weightMemoryGB.toFixed(2)} GB
- **KV Cache VRAM:** ${results.kvCacheMemoryGB.toFixed(2)} GB
- **Activation VRAM:** ${results.activationMemoryGB.toFixed(2)} GB
- **Total VRAM Needed:** ${results.totalVramNeededGB.toFixed(2)} GB
- **Status:** ${results.isOom ? 'OOM (Out of Memory)' : 'Fit / Compatible'}

## Performance & Cost
- **TTFT (Prefill):** ${results.ttftMs.toFixed(0)} ms
- **TPOT (Decode):** ${results.tpotMs.toFixed(1)} ms/token (${results.tokensPerSecPerUser.toFixed(1)} t/s/user)
- **Hourly Cost:** $${results.hourlyCostUsd.toFixed(2)}/hr
- **Cost per 1M Tokens:** $${results.costPerMillionTotalTokensUsd.toFixed(3)}

## Cloud GPU Provider Price Matrix
${results.cloudCosts.map((c) => `- **${c.providerName}:** $${c.totalHourlyCostUsd.toFixed(2)}/saat ($${Math.round(c.totalMonthlyCostUsd)}/ay) • Eşleşen VM: ${c.matchedInstance} ${c.isCheapest ? '[EN UYGUN]' : ''}`).join('\n')}

## Türkiye On-Premise (Yerel Kurulum) TCO & ROI
- **GPU Donanım Yatırımı (CAPEX):** $${Math.round(results.onPremTco.hardwareCapexUsd).toLocaleString()} (₺${Math.round(results.onPremTco.hardwareCapexTry).toLocaleString('tr-TR')}) [Birim GPU: $${Math.round(results.onPremTco.gpuUnitPriceUsd).toLocaleString()}]
- **Yıllık TR Elektrik:** $${Math.round(results.onPremTco.annualElectricityCostUsd).toLocaleString()} (₺${Math.round(results.onPremTco.annualElectricityCostTry).toLocaleString('tr-TR')})
- **Yıllık Soğutma & İklimlendirme:** $${Math.round(results.onPremTco.annualCoolingCostUsd).toLocaleString()} (₺${Math.round(results.onPremTco.annualCoolingCostTry).toLocaleString('tr-TR')}) [PUE: ${results.onPremTco.pueRatio}]
- **Yıllık Bakım & Destek:** $${Math.round(results.onPremTco.annualMaintenanceUsd).toLocaleString()} (₺${Math.round(results.onPremTco.annualMaintenanceTry).toLocaleString('tr-TR')})
- **Yıllık Diğer Masraflar (Kabin/Colocation/Hat):** $${Math.round(results.onPremTco.annualOtherExpensesUsd).toLocaleString()} (₺${Math.round(results.onPremTco.annualOtherExpensesTry).toLocaleString('tr-TR')})
- **1 Yıllık Toplam Sahip Olma (TCO):** $${Math.round(results.onPremTco.totalFirstYearCostUsd).toLocaleString()} (₺${Math.round(results.onPremTco.totalFirstYearCostTry).toLocaleString('tr-TR')})
- **3 Yıllık Toplam Sahip Olma (TCO):** $${Math.round(results.onPremTco.totalThreeYearCostUsd).toLocaleString()} (₺${Math.round(results.onPremTco.totalThreeYearCostTry).toLocaleString('tr-TR')})
- **Buluta Göre Başabaş (ROI):** ${results.onPremTco.breakEvenDescription}
`;

  let displayContent = cliCommand;
  if (activeTab === 'k8s') displayContent = k8sYaml;
  if (activeTab === 'json') displayContent = jsonExport;
  if (activeTab === 'markdown') displayContent = markdownReport;

  const EXPORT_TABS: { id: ExportTab; label: string }[] = [
    { id: 'cli', label: `${results.engineName} CLI` },
    { id: 'k8s', label: 'K8s YAML' },
    { id: 'markdown', label: 'Markdown' },
    { id: 'json', label: 'JSON' },
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(displayContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-md max-w-xl w-full max-h-[85vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-3.5 py-2">
          <div className="flex items-center gap-2 text-text font-bold text-[11px] font-mono uppercase tracking-wider">
            <Download className="w-4 h-4 text-accent" />
            Dışa Aktar & Dağıtım Konfigürasyonları
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-text text-sm font-bold w-7 h-7 flex items-center justify-center rounded-md hover:bg-surface-2 transition shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <Tabs
          tabs={EXPORT_TABS}
          active={activeTab}
          onChange={(id) => setActiveTab(id as ExportTab)}
          className="mt-2"
        />

        {/* Code Content */}
        <div className="p-4 space-y-2.5">
          <div className="flex justify-end">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium text-text bg-surface-2 hover:bg-surface border border-border rounded-md transition cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-ok" />
                  <span className="text-ok font-bold">Kopyalandı</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-muted" />
                  <span>Kopyala</span>
                </>
              )}
            </button>
          </div>

          <pre className="bg-surface-2 border border-border rounded p-3 text-[11px] font-mono text-text overflow-x-auto max-h-64 whitespace-pre-wrap leading-relaxed">
            {displayContent}
          </pre>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-surface-2 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface-2 border border-border text-text hover:bg-surface text-xs font-medium rounded-md transition cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
