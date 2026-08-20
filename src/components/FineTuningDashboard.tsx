import React, { useState } from 'react';
import { FineTuningConfig, FineTuningResults, DatasetPreset, ModelPreset } from '../types';
import { FINE_TUNING_METHODS, FINE_TUNING_FRAMEWORKS, DATASET_PRESETS, TRAINING_PLATFORMS } from '../data/fineTuningPresets';
import { MODEL_PRESETS } from '../data/presets';
import {
  Sparkles,
  Zap,
  Clock,
  DollarSign,
  Database,
  Layers,
  Cpu,
  Server,
  Code2,
  Check,
  Copy,
  AlertTriangle,
  Flame,
  CheckCircle2,
  TrendingDown,
  FileCode,
  Sliders,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Info,
  Laptop,
  Cloud,
  CheckCircle,
  XCircle,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface FineTuningDashboardProps {
  config: FineTuningConfig;
  results: FineTuningResults;
  onChangeConfig: (updater: (prev: FineTuningConfig) => FineTuningConfig) => void;
  models?: ModelPreset[];
}

export function FineTuningDashboard({ config, results, onChangeConfig, models }: FineTuningDashboardProps) {
  const modelCatalog = models && models.length > 0 ? models : MODEL_PRESETS;
  const [activeCodeTab, setActiveCodeTab] = useState<'unsloth' | 'hf' | 'axolotl' | 'jsonl'>('unsloth');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [showAdvancedManualParams, setShowAdvancedManualParams] = useState<boolean>(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'ALL' | 'RunPod' | 'Lambda' | 'Modal' | 'Colab' | 'Multi-GPU'>('ALL');

  const selectedModel = modelCatalog.find((m) => m.id === config.modelId) || modelCatalog[1];
  const selectedMethod = FINE_TUNING_METHODS.find((m) => m.id === config.methodId) || FINE_TUNING_METHODS[0];

  const handleSelectPreset = (preset: DatasetPreset) => {
    onChangeConfig((prev) => ({
      ...prev,
      sampleCount: preset.sampleCount,
      avgSeqLen: preset.avgSeqLen,
      epochs: preset.epochs,
      methodId: preset.suggestedMethod,
      datasetInputMode: 'samples',
    }));
  };

  const handleCopyCode = () => {
    let text = results.unslothPythonCode;
    if (activeCodeTab === 'hf') text = results.hfTrlScriptCode;
    if (activeCodeTab === 'axolotl') text = results.axolotlYamlCode;
    if (activeCodeTab === 'jsonl') text = results.datasetTemplateJsonl;

    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Filter platforms by Provider category or Multi-GPU
  const filteredPlatforms = results.platformEstimates.filter((plat) => {
    if (selectedCategoryFilter === 'ALL') return true;
    if (selectedCategoryFilter === 'Multi-GPU') return plat.gpuCount > 1;
    return plat.category === selectedCategoryFilter;
  });

  return (
    <div className="space-y-6">
      {/* 1. TOP HIGHLIGHTS & AUTO-OPTIMIZATION STATUS */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-700 rounded-lg border border-amber-200">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-bold text-slate-900">{results.modelName} Fine-Tuning</span>
                <span className="text-xs font-mono font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  {results.methodBadge}
                </span>
                <span className="text-xs font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded font-bold">
                  {results.frameworkName}
                </span>
                <span className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  Donanım Bağımsız Otomatik Optimizasyon
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Eğitim Verisi: <strong className="text-slate-800">{results.totalSamples.toLocaleString()} örnek</strong> ({results.totalTokens.toLocaleString()} toplam token) • {config.epochs} Epoch • Gereken Minimum VRAM: <strong className="text-indigo-700 font-mono">{results.recommendedMinVramGB} GB</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5 text-right">
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Gereken Eğitim VRAM</div>
              <div className="text-lg font-bold font-mono text-emerald-600">
                {results.totalVramNeededGB.toFixed(1)} GB
                <span className="text-xs font-normal text-slate-400 ml-1">(Min {results.recommendedMinVramGB} GB)</span>
              </div>
            </div>

            <div>
              <div className="text-[11px] text-slate-500 font-medium">En Hızlı Süre</div>
              <div className="text-lg font-bold font-mono text-indigo-600">
                {results.fastestPlatform?.estimatedTimeFormatted || results.trainingTimeFormatted}
              </div>
            </div>

            {results.cheapestPlatform && (
              <div>
                <div className="text-[11px] text-slate-500 font-medium">En Düşük Maliyet</div>
                <div className="text-lg font-bold font-mono text-amber-600">
                  ${results.cheapestPlatform.totalCostUsd.toFixed(2)}
                  <span className="text-[10px] text-slate-400 font-normal ml-1">
                    ({(results.cheapestPlatform.totalCostTry).toFixed(0)} ₺)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Auto-Optimization Banner */}
        <div className="p-3 bg-gradient-to-r from-indigo-50/90 via-sky-50/60 to-emerald-50/70 border border-indigo-200/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                <span>Otomatik Optimize Edilen Parametreler:</span>
                <span className="font-mono text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded text-[11px]">
                  Micro-Batch: {results.optimalBatchSize} • Grad Accumulation: {results.optimalGradAcc} (Effective Batch: {results.effectiveBatchSize})
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Donanım seçimi yapmanıza gerek yoktur; girdiğiniz <strong>{config.sampleCount.toLocaleString()} örnek</strong> ve <strong>{config.avgSeqLen} token</strong> uzunluğuna göre tüm platformlar için VRAM, süre ve maliyet aynı anda hesaplanmıştır.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAdvancedManualParams(!showAdvancedManualParams)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-indigo-200 rounded-lg text-indigo-700 font-medium text-[11px] shrink-0 transition"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {showAdvancedManualParams ? 'Manuel Ayarları Gizle' : 'Manuel Parametreleri İncele'}
            {showAdvancedManualParams ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Dataset Quick Presets */}
        <div className="pt-2 border-t border-slate-100">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              Hazır Veri Seti & Görev Şablonları (Tek Tıkla Yükle)
            </div>
            <span className="text-[10px] text-slate-400 font-normal">
              Örnek ve token sayılarını otomatik ayarlar
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {DATASET_PRESETS.map((p) => {
              const isSelected =
                config.sampleCount === p.sampleCount &&
                config.avgSeqLen === p.avgSeqLen &&
                config.epochs === p.epochs;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectPreset(p)}
                  className={`text-left p-2.5 rounded-lg border text-xs transition flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-50 border-indigo-400 shadow-2xs'
                      : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/70 hover:border-slate-300'
                  }`}
                >
                  <div className="font-bold text-slate-800 line-clamp-1">{p.title}</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">
                    {p.sampleCount.toLocaleString()} örn • {p.avgSeqLen} tok
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. PRIMARY INPUTS: DATASET, SEQUENCE LENGTH, MODEL & METHOD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Card: Veri Kümesi & Sequence Length Girişi (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">1. Veri Kümesi & Sequence Length</h3>
                <p className="text-[11px] text-slate-500">
                  Toplam örnek adedi, token uzunluğu ve eğitim turu (Epoch)
                </p>
              </div>
            </div>

            {/* Input Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[10px] font-medium text-slate-600">
              <button
                onClick={() => onChangeConfig((prev) => ({ ...prev, datasetInputMode: 'samples' }))}
                className={`px-2 py-1 rounded-md transition ${
                  config.datasetInputMode !== 'tokens'
                    ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                    : 'hover:text-slate-900'
                }`}
              >
                Örnek + SeqLen
              </button>
              <button
                onClick={() => onChangeConfig((prev) => ({ ...prev, datasetInputMode: 'tokens' }))}
                className={`px-2 py-1 rounded-md transition ${
                  config.datasetInputMode === 'tokens'
                    ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                    : 'hover:text-slate-900'
                }`}
              >
                Toplam Token
              </button>
            </div>
          </div>

          <div className="space-y-4 text-xs font-mono">
            {config.datasetInputMode === 'tokens' ? (
              /* Direct Total Tokens Input */
              <div className="space-y-2">
                <div className="flex justify-between text-slate-700">
                  <span className="font-sans font-medium">Toplam Token Sayısı:</span>
                  <span className="font-bold text-indigo-600">
                    {(config.totalTokensInput || (config.sampleCount * config.avgSeqLen * config.epochs)).toLocaleString()} token
                  </span>
                </div>
                <input
                  type="number"
                  min={100000}
                  max={500000000}
                  step={100000}
                  value={config.totalTokensInput || (config.sampleCount * config.avgSeqLen * config.epochs)}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    onChangeConfig((prev) => ({
                      ...prev,
                      totalTokensInput: val,
                      sampleCount: Math.max(10, Math.round(val / (prev.avgSeqLen * prev.epochs))),
                    }));
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-bold focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-mono"
                />
                <p className="text-[10px] text-slate-500 font-sans">
                  * Doğrudan ham token hacmi girildiğinde, örnek sayısı Sequence Length ({config.avgSeqLen}) ve Epoch ({config.epochs}) üzerinden otomatik hesaplanır.
                </p>
              </div>
            ) : (
              /* Sample Count Slider & Number Input */
              <div className="space-y-2">
                <div className="flex justify-between items-center text-slate-700">
                  <span className="font-sans font-medium">Toplam Veri Kümesi Örnek Sayısı (Sample Count):</span>
                  <input
                    type="number"
                    min={100}
                    max={1000000}
                    step={500}
                    value={config.sampleCount}
                    onChange={(e) => {
                      const val = Math.max(10, Number(e.target.value));
                      onChangeConfig((prev) => ({ ...prev, sampleCount: val }));
                    }}
                    className="w-28 text-right bg-slate-50 border border-slate-300 rounded-md px-2 py-1 text-xs text-indigo-700 font-bold font-mono focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <input
                  type="range"
                  min={500}
                  max={200000}
                  step={500}
                  value={config.sampleCount}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    onChangeConfig((prev) => ({ ...prev, sampleCount: val }));
                  }}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>1,000 (Test)</span>
                  <span>10,000 (Standart)</span>
                  <span>50,000</span>
                  <span>100,000</span>
                  <span>200,000 (Büyük)</span>
                </div>
              </div>
            )}

            {/* Sequence Length Slider & Input */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-sans font-medium">Ortalama Sequence Length (Token / Örnek):</span>
                <input
                  type="number"
                  min={128}
                  max={32768}
                  step={128}
                  value={config.avgSeqLen}
                  onChange={(e) => {
                    const val = Math.max(64, Number(e.target.value));
                    onChangeConfig((prev) => ({ ...prev, avgSeqLen: val }));
                  }}
                  className="w-28 text-right bg-slate-50 border border-slate-300 rounded-md px-2 py-1 text-xs text-indigo-700 font-bold font-mono focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <input
                type="range"
                min={256}
                max={16384}
                step={256}
                value={config.avgSeqLen}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onChangeConfig((prev) => ({ ...prev, avgSeqLen: val }));
                }}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>512 (Kısa QA)</span>
                <span>2,048 (Standart)</span>
                <span>4,096 (Uzun Chat)</span>
                <span>8,192 (RAG/Belge)</span>
                <span>16,384</span>
              </div>
            </div>

            {/* Epochs & Token Total Info */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div className="space-y-1">
                <label className="text-[11px] font-sans font-medium text-slate-600">Eğitim Turu (Epoch):</label>
                <select
                  value={config.epochs}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    onChangeConfig((prev) => ({ ...prev, epochs: val }));
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={1}>1 Epoch</option>
                  <option value={2}>2 Epoch</option>
                  <option value={3}>3 Epoch (Önerilen)</option>
                  <option value={4}>4 Epoch</option>
                  <option value={5}>5 Epoch</option>
                </select>
              </div>

              <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 space-y-0.5">
                <div className="text-[10px] font-sans text-slate-500">Toplam İşlenecek Token:</div>
                <div className="font-bold text-xs text-indigo-700">{results.totalTokens.toLocaleString()} token</div>
                <div className="text-[10px] text-slate-500 font-sans">
                  ({results.totalSteps.toLocaleString()} optimizasyon adımı)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Model & Fine-Tuning Yöntemi (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">2. Model & Fine-Tuning Yöntemi</h3>
                <p className="text-[11px] text-slate-500">
                  Temel model seçimi ve VRAM tasarruflu adaptör türü
                </p>
              </div>
            </div>

            <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
              {selectedModel.totalParamsB}B Parametre
            </span>
          </div>

          <div className="space-y-3">
            {/* Model Select */}
            <div>
              <label className="text-[11px] font-medium text-slate-600 block mb-1">Hedef LLM Modeli:</label>
              <select
                value={config.modelId}
                onChange={(e) => onChangeConfig((prev) => ({ ...prev, modelId: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-mono"
              >
                {modelCatalog.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.totalParamsB}B Parametre • {m.isMoe ? 'MoE' : 'Dense'} • {m.provider})
                  </option>
                ))}
              </select>
            </div>

            {/* Fine-Tuning Method List */}
            <div>
              <label className="text-[11px] font-medium text-slate-600 block mb-1.5">Adaptasyon Yöntemi:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FINE_TUNING_METHODS.map((m) => {
                  const isSelected = config.methodId === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => {
                        onChangeConfig((prev) => {
                          let nextFrameworkId = prev.frameworkId;
                          if (!m.supportedFrameworks.includes(prev.frameworkId)) {
                            nextFrameworkId = m.supportedFrameworks[0];
                          }
                          return { ...prev, methodId: m.id, frameworkId: nextFrameworkId };
                        });
                      }}
                      className={`p-2.5 rounded-lg border cursor-pointer transition flex flex-col justify-between ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-400 shadow-2xs ring-1 ring-indigo-300'
                          : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900">{m.shortName}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold">
                          {m.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                        {m.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Framework Selector */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-slate-600">Hızlandırıcı Motor:</span>
              <div className="flex gap-1.5">
                {FINE_TUNING_FRAMEWORKS.map((f) => {
                  const isSelected = config.frameworkId === f.id;
                  const isCompatible = f.supportedMethods.includes(config.methodId);
                  return (
                    <button
                      key={f.id}
                      disabled={!isCompatible}
                      onClick={() => onChangeConfig((prev) => ({ ...prev, frameworkId: f.id }))}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition ${
                        !isCompatible
                          ? 'opacity-40 cursor-not-allowed text-slate-400 bg-slate-100'
                          : isSelected
                          ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {f.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. OPTIONAL ADVANCED MANUAL PARAMETERS (COLLAPSIBLE) */}
      {showAdvancedManualParams && (
        <div className="bg-slate-50/90 border border-indigo-200 rounded-xl p-4 sm:p-5 shadow-inner space-y-3">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Gelişmiş Hiperparametre & Optimizasyon Ayarları (Manuel Override)
              </h4>
            </div>
            <span className="text-[11px] text-indigo-700 font-mono">
              Varsayılan: Otomatik Optimize Edildi
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="space-y-1">
              <label className="text-[11px] font-sans font-medium text-slate-600">Micro-Batch Size:</label>
              <select
                value={config.perDeviceBatchSize}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onChangeConfig((prev) => ({ ...prev, perDeviceBatchSize: val, autoOptimizeHyperparams: false }));
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:ring-1 focus:ring-indigo-500"
              >
                <option value={1}>1 (Min VRAM)</option>
                <option value={2}>2 (Dengeli)</option>
                <option value={4}>4 (Yüksek Hız)</option>
                <option value={8}>8</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-sans font-medium text-slate-600">Gradient Accumulation:</label>
              <select
                value={config.gradientAccumulationSteps}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onChangeConfig((prev) => ({ ...prev, gradientAccumulationSteps: val, autoOptimizeHyperparams: false }));
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:ring-1 focus:ring-indigo-500"
              >
                <option value={2}>2</option>
                <option value={4}>4</option>
                <option value={8}>8</option>
                <option value={16}>16</option>
                <option value={32}>32</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-sans font-medium text-slate-600">LoRA Rank (r):</label>
              <select
                value={config.loraRank}
                onChange={(e) => {
                  const rank = Number(e.target.value);
                  onChangeConfig((prev) => ({ ...prev, loraRank: rank, loraAlpha: rank * 2 }));
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:ring-1 focus:ring-indigo-500"
              >
                <option value={8}>r = 8</option>
                <option value={16}>r = 16 (Standart)</option>
                <option value={32}>r = 32</option>
                <option value={64}>r = 64</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-sans font-medium text-slate-600">Optimizer:</label>
              <select
                value={config.optimizerType}
                onChange={(e) => {
                  const val = e.target.value as any;
                  onChangeConfig((prev) => ({ ...prev, optimizerType: val }));
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:ring-1 focus:ring-indigo-500"
              >
                <option value="adamw_8bit">Paged AdamW 8-bit (%75 VRAM Tasarrufu)</option>
                <option value="adamw_32bit">Standard AdamW 32-bit (Saf FP32)</option>
                <option value="lion">Lion</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 4. VRAM DISTRIBUTION & TRAINING TIME / SPEEDUP ANALYSIS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* VRAM Breakdown Card (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Eğitim VRAM Dağılımı</h3>
                <p className="text-[11px] text-slate-500">
                  Ağırlıklar, gradyanlar, optimizer states ve aktivasyon belleği
                </p>
              </div>
            </div>

            <div className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Gereken Toplam: {results.totalVramNeededGB.toFixed(1)} GB
            </div>
          </div>

          {/* Visual Progress Bar */}
          <div className="space-y-2 font-mono text-xs">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-600">Minimum GPU VRAM İhtiyacı:</span>
              <span className="font-bold text-indigo-700">
                {results.recommendedMinVramGB} GB VRAM
              </span>
            </div>

            <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
              <div
                style={{ width: `${Math.min(100, (results.weightVramGB / results.totalVramNeededGB) * 100)}%` }}
                className="bg-indigo-500 h-full"
                title={`Model Ağırlıkları: ${results.weightVramGB.toFixed(1)} GB`}
              />
              <div
                style={{ width: `${Math.min(100, (results.gradientVramGB / results.totalVramNeededGB) * 100)}%` }}
                className="bg-purple-500 h-full"
                title={`Gradyanlar: ${results.gradientVramGB.toFixed(2)} GB`}
              />
              <div
                style={{ width: `${Math.min(100, (results.optimizerVramGB / results.totalVramNeededGB) * 100)}%` }}
                className="bg-amber-500 h-full"
                title={`Optimizer States: ${results.optimizerVramGB.toFixed(2)} GB`}
              />
              <div
                style={{ width: `${Math.min(100, (results.activationVramGB / results.totalVramNeededGB) * 100)}%` }}
                className="bg-cyan-500 h-full"
                title={`Aktivasyonlar: ${results.activationVramGB.toFixed(1)} GB`}
              />
              <div
                style={{ width: `${Math.min(100, (results.cudaOverheadGB / results.totalVramNeededGB) * 100)}%` }}
                className="bg-slate-400 h-full"
                title={`CUDA Overhead: ${results.cudaOverheadGB.toFixed(1)} GB`}
              />
            </div>

            {/* Legend & Breakdown Items */}
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500" />
                  Model Ağırlıkları:
                </span>
                <span className="font-bold text-slate-800">{results.weightVramGB.toFixed(1)} GB</span>
              </div>

              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-xs bg-purple-500" />
                  Gradyanlar (Grads):
                </span>
                <span className="font-bold text-slate-800">{results.gradientVramGB.toFixed(2)} GB</span>
              </div>

              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" />
                  Optimizer Durumları:
                </span>
                <span className="font-bold text-slate-800">{results.optimizerVramGB.toFixed(2)} GB</span>
              </div>

              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-xs bg-cyan-500" />
                  Aktivasyon Belleği:
                </span>
                <span className="font-bold text-slate-800">{results.activationVramGB.toFixed(1)} GB</span>
              </div>
            </div>
          </div>
        </div>

        {/* Time & Speedup Card (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Eğitim Süresi & Hızlandırma Analizi</h3>
                <p className="text-[11px] text-slate-500">
                  Unsloth ve Triton çekirdeklerinin standart PyTorch'a kıyasla kazandırdığı süre
                </p>
              </div>
            </div>

            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {results.unslothSpeedupMultiplier}x Hız Artışı
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-1">
              <div className="text-[11px] font-sans text-indigo-900 font-medium">Unsloth Hızlandırılmış Süre:</div>
              <div className="text-xl font-bold text-indigo-700">{results.trainingTimeFormatted}</div>
              <div className="text-[10px] text-indigo-600">Throughput: ~{Math.round(results.throughputTokensPerSec)} tok/sn</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="text-[11px] font-sans text-slate-500">Standart PyTorch HF Süresi:</div>
              <div className="text-xl font-bold text-slate-500">
                {results.standardHfTimeHours.toFixed(1)} saat
              </div>
              <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" />
                {results.unslothTimeSavedHours.toFixed(1)} saat tasarruf
              </div>
            </div>
          </div>

          {/* Step & Token breakdown */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <div className="font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-indigo-600" />
                Hesaplama ve Adım Metrikleri
              </span>
              <span className="font-mono text-[10px] text-slate-500">
                {(results.totalFlopsRequired / 1e15).toFixed(2)} PFLOPs
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 font-mono text-[11px] text-slate-700">
              <div>
                <span className="text-slate-500 block text-[10px] font-sans">Toplam Adım:</span>
                <strong>{results.totalSteps.toLocaleString()} step</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-sans">Effective Batch:</span>
                <strong>{results.effectiveBatchSize}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-sans">Adım Başı Token:</span>
                <strong>{results.tokensPerStep.toLocaleString()}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. DEDICATED CLOUD POD & INSTANCE COST COMPARISON */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Bulut Dedicated Pod & Instance Fine-Tuning Maliyet Karşılaştırması
              </h3>
              <p className="text-[11px] text-slate-500">
                Resmi fiyat listeleriyle adanmış (dedicated) GPU podları:{' '}
                <a href="https://www.runpod.io/pricing" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-medium hover:text-indigo-800">RunPod</a> •{' '}
                <a href="https://lambda.ai/pricing" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-medium hover:text-indigo-800">Lambda Labs</a> •{' '}
                <a href="https://modal.com/pricing" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-medium hover:text-indigo-800">Modal.com</a> •{' '}
                <a href="https://colab.research.google.com/signup" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-medium hover:text-indigo-800">Google Colab</a>
              </p>
            </div>
          </div>

          {/* Category / Provider Filter Pills */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg text-[11px] font-medium">
            {(['ALL', 'RunPod', 'Lambda', 'Modal', 'Colab', 'Multi-GPU'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-md transition ${
                  selectedCategoryFilter === cat
                    ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat === 'ALL' ? 'Tümü (Hepsi)' : cat === 'RunPod' ? 'RunPod Pods' : cat === 'Lambda' ? 'Lambda Cloud' : cat === 'Modal' ? 'Modal Dedicated' : cat === 'Colab' ? 'Google Colab' : 'Multi-GPU Kümeleri'}
              </button>
            ))}
          </div>
        </div>

        {/* Featured Recommendation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Cheapest Feasible */}
          {results.cheapestPlatform && (
            <div className="p-3.5 rounded-xl border border-amber-300 bg-gradient-to-b from-amber-50/70 to-white space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded border border-amber-200">
                  ★ En Ekonomik Pod
                </span>
                <span className="text-xs font-mono font-bold text-amber-900">
                  ${results.cheapestPlatform.totalCostUsd.toFixed(2)}
                </span>
              </div>
              <div>
                <div className="font-bold text-xs text-slate-900 line-clamp-1">{results.cheapestPlatform.platformName}</div>
                <div className="text-[11px] text-slate-500 font-mono">{results.cheapestPlatform.gpuName}</div>
              </div>
              <div className="text-[11px] font-mono text-slate-600 pt-1 border-t border-amber-200/60 flex justify-between">
                <span>Tahmini Süre:</span>
                <strong className="text-slate-800">{results.cheapestPlatform.estimatedTimeFormatted}</strong>
              </div>
              <div className="text-[10px] text-amber-900 font-sans">
                Toplam: <strong>{results.cheapestPlatform.totalCostTry.toFixed(1)} ₺</strong>
              </div>
            </div>
          )}

          {/* 2. Best Value (F/P) */}
          {results.bestValuePlatform && (
            <div className="p-3.5 rounded-xl border border-indigo-300 bg-gradient-to-b from-indigo-50/70 to-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 bg-indigo-100/90 px-2 py-0.5 rounded border border-indigo-200">
                  ⚡ En İyi Fiyat / Performans
                </span>
                <span className="text-xs font-mono font-bold text-indigo-900">
                  ${results.bestValuePlatform.totalCostUsd.toFixed(2)}
                </span>
              </div>
              <div>
                <div className="font-bold text-xs text-slate-900 line-clamp-1">{results.bestValuePlatform.platformName}</div>
                <div className="text-[11px] text-slate-500 font-mono">{results.bestValuePlatform.gpuName}</div>
              </div>
              <div className="text-[11px] font-mono text-slate-600 pt-1 border-t border-indigo-200/60 flex justify-between">
                <span>Tahmini Süre:</span>
                <strong className="text-slate-800">{results.bestValuePlatform.estimatedTimeFormatted}</strong>
              </div>
              <div className="text-[10px] text-indigo-900 font-sans">
                Toplam: <strong>{results.bestValuePlatform.totalCostTry.toFixed(1)} ₺</strong>
              </div>
            </div>
          )}

          {/* 3. Fastest Platform */}
          {results.fastestPlatform && (
            <div className="p-3.5 rounded-xl border border-purple-300 bg-gradient-to-b from-purple-50/70 to-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 bg-purple-100/90 px-2 py-0.5 rounded border border-purple-200">
                  🚀 En Hızlı Tamamlama
                </span>
                <span className="text-xs font-mono font-bold text-purple-900">
                  ${results.fastestPlatform.totalCostUsd.toFixed(2)}
                </span>
              </div>
              <div>
                <div className="font-bold text-xs text-slate-900 line-clamp-1">{results.fastestPlatform.platformName}</div>
                <div className="text-[11px] text-slate-500 font-mono">{results.fastestPlatform.gpuName}</div>
              </div>
              <div className="text-[11px] font-mono text-slate-600 pt-1 border-t border-purple-200/60 flex justify-between">
                <span>Tahmini Süre:</span>
                <strong className="text-slate-800">{results.fastestPlatform.estimatedTimeFormatted}</strong>
              </div>
              <div className="text-[10px] text-purple-900 font-sans">
                Toplam: <strong>{results.fastestPlatform.totalCostTry.toFixed(1)} ₺</strong>
              </div>
            </div>
          )}

          {/* 4. Large VRAM / Blackwell */}
          <div className="p-3.5 rounded-xl border border-emerald-300 bg-gradient-to-b from-emerald-50/70 to-white space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-200">
                Blackwell & Multi-GPU Kümeleri
              </span>
              <span className="text-xs font-mono font-bold text-emerald-700">
                192GB / 1.44TB
              </span>
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 line-clamp-1">
                RunPod / Lambda / Modal Kümeleri
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                NVLink Mesh & InfiniBand Podlar
              </div>
            </div>
            <div className="text-[11px] font-mono text-slate-600 pt-1 border-t border-emerald-200/60 flex justify-between">
              <span>Kurumsal Ölçek:</span>
              <strong className="text-emerald-700">
                DeepSpeed / FSDP2
              </strong>
            </div>
            <div className="text-[10px] text-slate-500 font-sans">
              Full Fine-Tuning ve 70B+ modeller için sınırsız ölçek
            </div>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] bg-slate-50/80">
                <th className="py-2.5 px-3 rounded-l-lg">Platform / Sağlayıcı</th>
                <th className="py-2.5 px-3">Donanım & VRAM</th>
                <th className="py-2.5 px-3">Saatlik Ücret</th>
                <th className="py-2.5 px-3">VRAM Uygunluk</th>
                <th className="py-2.5 px-3">Tahmini Eğitim Süresi</th>
                <th className="py-2.5 px-3">Toplam Maliyet ($ / ₺)</th>
                <th className="py-2.5 px-3 rounded-r-lg">Platform Notu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-[11px]">
              {filteredPlatforms.map((plat) => {
                return (
                  <tr
                    key={plat.platformId}
                    className={`hover:bg-slate-50/80 transition ${
                      plat.isCheapestFeasible ? 'bg-amber-50/40 font-medium' : ''
                    } ${!plat.isFeasibleVram ? 'opacity-50 bg-slate-50/30' : ''}`}
                  >
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{plat.platformName}</span>
                        {plat.isCheapestFeasible && (
                          <span className="text-[9px] font-sans font-bold bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.2 rounded">
                            ★ En Uygun
                          </span>
                        )}
                        {plat.isBestValueFeasible && !plat.isCheapestFeasible && (
                          <span className="text-[9px] font-sans font-bold bg-indigo-100 text-indigo-800 border border-indigo-300 px-1.5 py-0.2 rounded">
                            ⚡ F/P
                          </span>
                        )}
                        {plat.isFastestFeasible && (
                          <span className="text-[9px] font-sans font-bold bg-purple-100 text-purple-800 border border-purple-300 px-1.5 py-0.2 rounded">
                            🚀 Hızlı
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-slate-700">
                      {plat.gpuName}
                    </td>

                    <td className="py-2.5 px-3 text-slate-600">
                      {plat.hourlyRateUsd === 0 ? (
                        <span className="text-emerald-600 font-bold">ÜCRETSİZ</span>
                      ) : (
                        `$${plat.hourlyRateUsd.toFixed(2)}/sa`
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      {plat.isFeasibleVram ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Yeterli ({plat.vramUsagePct}% VRAM)
                        </span>
                      ) : (
                        <span className="text-rose-600 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                          Yetersiz ({plat.gpuVramGB}GB &lt; {results.totalVramNeededGB.toFixed(0)}GB)
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {plat.isFeasibleVram ? (
                        plat.estimatedTimeFormatted
                      ) : (
                        <span className="text-slate-400 font-normal">-</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {plat.isFeasibleVram ? (
                        plat.totalCostUsd === 0 ? (
                          <span className="text-emerald-600">0.00 TL (Ücretsiz)</span>
                        ) : (
                          <div>
                            <span className="text-indigo-700">${plat.totalCostUsd.toFixed(2)}</span>
                            <span className="text-[10px] text-slate-500 font-normal ml-1">
                              ({(plat.totalCostTry).toFixed(1)} ₺)
                            </span>
                          </div>
                        )
                      ) : (
                        <span className="text-slate-400 text-[10px] font-sans">OOM</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-[10px] text-slate-500 font-sans max-w-xs">
                      {plat.colabComputeUnitsNeeded
                        ? `~${plat.colabComputeUnitsNeeded} Colab Compute Unit gerekir ($10 paket).`
                        : plat.notes}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. READY-TO-RUN CODE EXPORT SECTION */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Hazır Eğitim Scripti & Google Colab Kodu
              </h3>
              <p className="text-[11px] text-slate-500">
                Otomatik optimize edilen hiperparametrelerle tek tıkla çalıştırılabilir Python/YAML eğitim kodları
              </p>
            </div>
          </div>

          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition cursor-pointer"
          >
            {copiedCode ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Kopyalandı</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Kodu Kopyala</span>
              </>
            )}
          </button>
        </div>

        {/* Code Tabs */}
        <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveCodeTab('unsloth')}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition cursor-pointer ${
              activeCodeTab === 'unsloth'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Unsloth (Google Colab / Jupyter)
          </button>

          <button
            onClick={() => setActiveCodeTab('hf')}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition cursor-pointer ${
              activeCodeTab === 'hf'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            HuggingFace TRL + SFTTrainer
          </button>

          <button
            onClick={() => setActiveCodeTab('axolotl')}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition cursor-pointer ${
              activeCodeTab === 'axolotl'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Axolotl YAML Config
          </button>

          <button
            onClick={() => setActiveCodeTab('jsonl')}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition cursor-pointer ${
              activeCodeTab === 'jsonl'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Veri Seti Şablonu (dataset.jsonl)
          </button>
        </div>

        {/* Code Preview Box */}
        <pre className="p-4 bg-slate-900 border border-slate-800 rounded-xl font-mono text-[11px] text-indigo-300 overflow-x-auto max-h-96 whitespace-pre-wrap leading-relaxed shadow-inner">
          {activeCodeTab === 'unsloth' && results.unslothPythonCode}
          {activeCodeTab === 'hf' && results.hfTrlScriptCode}
          {activeCodeTab === 'axolotl' && results.axolotlYamlCode}
          {activeCodeTab === 'jsonl' && results.datasetTemplateJsonl}
        </pre>
      </div>
    </div>
  );
}
