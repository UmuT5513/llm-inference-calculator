import React, { useState } from 'react';
import { Download, Copy, Check, Terminal, FileCode, FileText } from 'lucide-react';
import { CalculatorConfig, CalculationResults } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: CalculatorConfig;
  results: CalculationResults;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  config,
  results,
}) => {
  const [activeTab, setActiveTab] = useState<'cli' | 'k8s' | 'json' | 'markdown'>('cli');
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

  const handleCopy = () => {
    navigator.clipboard.writeText(displayContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full flex flex-col shadow-xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
            <Download className="w-4 h-4 text-indigo-600" />
            Dışa Aktar & Dağıtım Konfigürasyonları
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-sm font-bold w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-200/60 transition"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 p-2 gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('cli')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition ${
              activeTab === 'cli'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            {results.engineName} CLI
          </button>

          <button
            onClick={() => setActiveTab('k8s')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition ${
              activeTab === 'k8s'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            K8s YAML
          </button>

          <button
            onClick={() => setActiveTab('markdown')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition ${
              activeTab === 'markdown'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Markdown
          </button>

          <button
            onClick={() => setActiveTab('json')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition ${
              activeTab === 'json'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            JSON
          </button>
        </div>

        {/* Code Content */}
        <div className="p-4 bg-slate-50/30 space-y-2.5">
          <div className="flex justify-end">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Kopyalandı</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Kopyala</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl font-mono text-[11px] text-indigo-300 overflow-x-auto max-h-64 whitespace-pre-wrap leading-relaxed shadow-inner">
            {displayContent}
          </pre>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded-lg transition"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
