import React, { useState } from 'react';
import { FineTuningConfig, FineTuningResults, DatasetPreset } from '../types';
import { FINE_TUNING_METHODS, FINE_TUNING_FRAMEWORKS, DATASET_PRESETS } from '../data/fineTuningPresets';
import { GPU_PRESETS } from '../data/presets';
import { Sparkles, Database, Zap, Cpu, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { Panel } from './ui/Panel';
import { SectionHeader } from './ui/SectionHeader';
import { Collapse } from './ui/Collapse';
import { Field } from './ui/Field';
import { NumberInput } from './ui/NumberInput';
import { Select } from './ui/Select';
import { Segmented } from './ui/Segmented';
import { Badge } from './ui/Badge';

interface FineTuningConfigPanelProps {
  config: FineTuningConfig;
  results: FineTuningResults;
  onChangeConfig: (updater: (prev: FineTuningConfig) => FineTuningConfig) => void;
}

export const FineTuningConfigPanel: React.FC<FineTuningConfigPanelProps> = ({ config, results, onChangeConfig }) => {
  const [showAdvancedManualParams, setShowAdvancedManualParams] = useState<boolean>(false);

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

  const autoOptimizeOn = config.autoOptimizeHyperparams !== false;
  const showManualParams = showAdvancedManualParams || !autoOptimizeOn;

  const selectedGpu =
    config.gpuId === 'custom'
      ? config.customGpu || GPU_PRESETS[2]
      : GPU_PRESETS.find((g) => g.id === config.gpuId) || GPU_PRESETS[2];
  const gpuCount = Math.max(1, config.gpuCount || 1);

  const toggleSwitch = (label: string, on: boolean, onChange: (v: boolean) => void) => (
    <button
      onClick={() => onChange(!on)}
      className="flex items-center justify-between gap-2 w-full p-2.5 bg-surface-2 border border-border rounded-md text-left"
    >
      <span className="text-[11px] font-sans font-medium text-muted">{label}</span>
      <span
        className={`relative inline-flex w-9 h-5 rounded-full transition-colors border shrink-0 ${
          on ? 'bg-accent border-accent' : 'bg-surface-2 border-border'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform ${
            on ? 'translate-x-4 bg-bg' : 'bg-muted'
          }`}
        />
      </span>
    </button>
  );

  return (
    <Panel className="p-3.5 space-y-3">
      <SectionHeader
        title="Fine-Tuning Yapılandırması"
        description="Veri seti, adaptasyon yöntemi, GPU donanımı ve hiperparametre ayarları"
      />

      <Collapse title="Dataset & Yöntem" defaultOpen>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-accent" />
                Hazır Veri Seti & Görev Şablonları (Tek Tıkla Yükle)
              </div>
              <span className="text-[10px] text-muted font-medium">
                Örnek ve token sayılarını otomatik ayarlar
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DATASET_PRESETS.map((p) => {
                const isSelected =
                  config.sampleCount === p.sampleCount &&
                  config.avgSeqLen === p.avgSeqLen &&
                  config.epochs === p.epochs;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPreset(p)}
                    className={`text-left p-2 rounded-md border transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-surface-2 border-accent ring-1 ring-accent/40'
                        : 'bg-surface border-border hover:border-accent/40 hover:bg-surface-2'
                    }`}
                  >
                    <div className="font-bold text-text text-[11px] line-clamp-1">{p.title}</div>
                    <div className="text-[10px] text-muted font-mono mt-1">
                      {p.sampleCount.toLocaleString()} örn • {p.avgSeqLen} tok
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 bg-surface-2 border border-border rounded-md p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-accent/10 text-accent rounded-md border border-accent/30">
                  <Database className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-text uppercase tracking-wider">Veri Kümesi & Sequence Length</div>
                  <div className="text-[10px] text-muted">Toplam örnek adedi, token uzunluğu ve eğitim turu (Epoch)</div>
                </div>
              </div>
              <Segmented
                value={config.datasetInputMode || 'samples'}
                onChange={(v) => onChangeConfig((prev) => ({ ...prev, datasetInputMode: v }))}
                options={[
                  { value: 'samples', label: 'Örnek + SeqLen' },
                  { value: 'tokens', label: 'Toplam Token' },
                ]}
              />
            </div>

            <div className="space-y-3 text-xs font-mono">
              {config.datasetInputMode === 'tokens' ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-text">
                    <span className="font-sans font-medium">Toplam Token Sayısı:</span>
                    <span className="font-bold text-accent">
                      {(config.totalTokensInput || (config.sampleCount * config.avgSeqLen * config.epochs)).toLocaleString()} token
                    </span>
                  </div>
                  <NumberInput
                    min={100000}
                    max={500000000}
                    step={100000}
                    value={config.totalTokensInput || (config.sampleCount * config.avgSeqLen * config.epochs)}
                    onChange={(val) =>
                      onChangeConfig((prev) => ({
                        ...prev,
                        totalTokensInput: val,
                        sampleCount: Math.max(10, Math.round(val / (prev.avgSeqLen * prev.epochs))),
                      }))
                    }
                  />
                  <p className="text-[10px] text-muted font-sans">
                    * Doğrudan ham token hacmi girildiğinde, örnek sayısı Sequence Length ({config.avgSeqLen}) ve Epoch ({config.epochs}) üzerinden otomatik hesaplanır.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-text">
                    <span className="font-sans font-medium">Toplam Veri Kümesi Örnek Sayısı (Sample Count):</span>
                    <div className="w-28">
                      <NumberInput
                        min={100}
                        max={1000000}
                        step={500}
                        value={config.sampleCount}
                        onChange={(val) => {
                          const n = Math.max(10, val || 10);
                          onChangeConfig((prev) => ({ ...prev, sampleCount: n }));
                        }}
                      />
                    </div>
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
                    className="w-full h-1.5 bg-surface-2 rounded-lg appearance-none cursor-pointer accent-[#FFB224]"
                  />
                  <div className="flex justify-between text-[10px] text-muted">
                    <span>1,000 (Test)</span>
                    <span>10,000 (Standart)</span>
                    <span>50,000</span>
                    <span>100,000</span>
                    <span>200,000 (Büyük)</span>
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex justify-between items-center text-text">
                  <span className="font-sans font-medium">Ortalama Sequence Length (Token / Örnek):</span>
                  <div className="w-28">
                    <NumberInput
                      min={128}
                      max={32768}
                      step={128}
                      value={config.avgSeqLen}
                      onChange={(val) => {
                        const v = Math.max(64, val || 64);
                        onChangeConfig((prev) => ({ ...prev, avgSeqLen: v }));
                      }}
                    />
                  </div>
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
                  className="w-full h-1.5 bg-surface-2 rounded-lg appearance-none cursor-pointer accent-[#FFB224]"
                />
                <div className="flex justify-between text-[10px] text-muted">
                  <span>512 (Kısa QA)</span>
                  <span>2,048 (Standart)</span>
                  <span>4,096 (Uzun Chat)</span>
                  <span>8,192 (RAG/Belge)</span>
                  <span>16,384</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                <Field label="Eğitim Turu (Epoch)">
                  <Select
                    value={config.epochs}
                    onChange={(val) => onChangeConfig((prev) => ({ ...prev, epochs: Number(val) }))}
                    options={[
                      { value: 1, label: '1 Epoch' },
                      { value: 2, label: '2 Epoch' },
                      { value: 3, label: '3 Epoch (Önerilen)' },
                      { value: 4, label: '4 Epoch' },
                      { value: 5, label: '5 Epoch' },
                    ]}
                  />
                </Field>

                <div className="p-2.5 bg-surface-2 border border-border rounded-md text-text space-y-0.5">
                  <div className="text-[10px] font-sans text-muted">Toplam İşlenecek Token:</div>
                  <div className="font-bold text-xs text-accent">{results.totalTokens.toLocaleString()} token</div>
                  <div className="text-[10px] text-muted font-sans">
                    ({results.totalSteps.toLocaleString()} optimizasyon adımı)
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 bg-surface-2 border border-border rounded-md p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-accent/10 text-accent rounded-md border border-accent/30">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-text uppercase tracking-wider">Model & Fine-Tuning Yöntemi</div>
                <div className="text-[10px] text-muted">Temel model seçimi ve VRAM tasarruflu adaptör türü</div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted block mb-1.5">Adaptasyon Yöntemi:</label>
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
                      className={`p-2.5 rounded-md border cursor-pointer transition flex flex-col justify-between ${
                        isSelected
                          ? 'bg-surface border-accent ring-1 ring-accent/40'
                          : 'bg-surface border-border hover:border-accent/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-text">{m.shortName}</span>
                        <Badge tone={isSelected ? 'accent' : 'default'}>{m.badge}</Badge>
                      </div>
                      <p className="text-[10px] text-muted line-clamp-2 leading-relaxed">
                        {m.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-muted">Hızlandırıcı Motor:</span>
              <div className="flex gap-1.5 flex-wrap">
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
                          ? 'opacity-40 cursor-not-allowed text-muted bg-surface-2 border border-border'
                          : isSelected
                          ? 'bg-accent text-bg font-bold border border-accent'
                          : 'bg-surface-2 text-text border border-border hover:bg-surface'
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
      </Collapse>

      <Collapse title="GPU Donanımı" defaultOpen>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
            {GPU_PRESETS.map((g) => {
              const isSelected = config.gpuId === g.id;
              return (
                <div
                  key={g.id}
                  onClick={() => onChangeConfig((prev) => ({ ...prev, gpuId: g.id }))}
                  className={`cursor-pointer rounded-md p-2.5 border transition text-left ${
                    isSelected
                      ? 'bg-surface-2 border-accent ring-1 ring-accent/40'
                      : 'bg-surface border-border hover:border-accent/40 hover:bg-surface-2'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider">{g.vendor} • {g.tier}</span>
                    <span className="text-[10px] font-mono font-bold text-accent bg-surface-2 border border-border px-1.5 py-0.2 rounded">
                      {g.vramGB} GB
                    </span>
                  </div>
                  <div className="text-[11px] font-bold text-text mb-1 line-clamp-1">{g.name}</div>
                  <div className="flex items-center justify-between text-[10px] text-muted font-mono">
                    <span>FP16: <strong className="text-accent">{g.fp16Tflops} TF</strong></span>
                    <span>{g.hourlyCostUsd > 0 ? `$${g.hourlyCostUsd.toFixed(2)}/sa` : 'Yerel'}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-surface-2 border border-border rounded-md p-3">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-accent" />
                GPU Adedi
              </label>
              <span className="text-xs font-mono font-bold text-accent bg-surface-2 border border-border px-2 py-0.5 rounded">
                {gpuCount}x GPU ({selectedGpu.vramGB * gpuCount} GB VRAM)
              </span>
            </div>
            <NumberInput
              value={gpuCount}
              min={1}
              max={64}
              step={1}
              onChange={(val) => onChangeConfig((prev) => ({ ...prev, gpuCount: Math.max(1, val || 1) }))}
            />
            <p className="text-[10px] text-muted mt-1">
              Seçili: {selectedGpu.name} — Toplam {selectedGpu.vramGB * gpuCount} GB VRAM
            </p>
          </div>
        </div>
      </Collapse>

      <Collapse title="Hiperparametreler">
        <div className="space-y-3">
          <div className="bg-surface-2 border border-border rounded-md p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-accent/10 text-accent rounded-md border border-accent/30">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-text">Otomatik Hiperparametre Optimizasyonu</div>
                  <div className="text-[10px] text-muted">Donanım ve veri seti bazlı otomatik mikro-batch / grad accumulation</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={autoOptimizeOn ? 'ok' : 'accent'}>
                  {autoOptimizeOn ? 'Otomatik (Açık)' : 'Manuel (Kapalı)'}
                </Badge>
                <button
                  onClick={() => onChangeConfig((prev) => ({ ...prev, autoOptimizeHyperparams: !(prev.autoOptimizeHyperparams !== false) }))}
                  className={`relative inline-flex w-9 h-5 rounded-full transition-colors border shrink-0 ${
                    autoOptimizeOn ? 'bg-accent border-accent' : 'bg-surface-2 border-border'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform ${
                      autoOptimizeOn ? 'translate-x-4 bg-bg' : 'bg-muted'
                    }`}
                  />
                </button>
              </div>
            </div>

            {showManualParams ? (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h4 className="text-xs font-bold text-text uppercase tracking-wider">
                    Gelişmiş Hiperparametre & Optimizasyon Ayarları (Manuel Override)
                  </h4>
                  <span className="text-[11px] text-accent font-mono">
                    Varsayılan: Otomatik Optimize Edildi
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3 text-xs font-mono">
                  <Field label="Micro-Batch Size">
                    <Select
                      value={config.perDeviceBatchSize}
                      onChange={(val) =>
                        onChangeConfig((prev) => ({ ...prev, perDeviceBatchSize: Number(val), autoOptimizeHyperparams: false }))
                      }
                      options={[
                        { value: 1, label: '1 (Min VRAM)' },
                        { value: 2, label: '2 (Dengeli)' },
                        { value: 4, label: '4 (Yüksek Hız)' },
                        { value: 8, label: '8' },
                      ]}
                    />
                  </Field>

                  <Field label="Gradient Accumulation">
                    <Select
                      value={config.gradientAccumulationSteps}
                      onChange={(val) =>
                        onChangeConfig((prev) => ({ ...prev, gradientAccumulationSteps: Number(val), autoOptimizeHyperparams: false }))
                      }
                      options={[
                        { value: 2, label: '2' },
                        { value: 4, label: '4' },
                        { value: 8, label: '8' },
                        { value: 16, label: '16' },
                        { value: 32, label: '32' },
                      ]}
                    />
                  </Field>

                  <Field label="LoRA Rank (r)">
                    <Select
                      value={config.loraRank}
                      onChange={(val) =>
                        onChangeConfig((prev) => ({ ...prev, loraRank: Number(val), loraAlpha: Number(val) * 2 }))
                      }
                      options={[
                        { value: 8, label: 'r = 8' },
                        { value: 16, label: 'r = 16 (Standart)' },
                        { value: 32, label: 'r = 32' },
                        { value: 64, label: 'r = 64' },
                      ]}
                    />
                  </Field>

                  <Field label="Optimizer">
                    <Select
                      value={config.optimizerType}
                      onChange={(val) => onChangeConfig((prev) => ({ ...prev, optimizerType: val }))}
                      options={[
                        { value: 'adamw_8bit', label: 'Paged AdamW 8-bit (%75 VRAM Tasarrufu)' },
                        { value: 'adamw_32bit', label: 'Standard AdamW 32-bit (Saf FP32)' },
                        { value: 'lion', label: 'Lion' },
                      ]}
                    />
                  </Field>

                  <Field label="Öğrenme Oranı (Learning Rate)">
                    <input
                      type="text"
                      value={config.learningRate}
                      onChange={(e) => onChangeConfig((prev) => ({ ...prev, learningRate: e.target.value }))}
                      className="w-full bg-surface-2 border border-border rounded px-2.5 py-1.5 text-xs font-mono text-text placeholder-muted focus:outline-none focus:border-accent"
                    />
                  </Field>

                  <Field label="LoRA Alpha (α)">
                    <NumberInput
                      value={config.loraAlpha}
                      min={1}
                      max={256}
                      step={1}
                      onChange={(val) => onChangeConfig((prev) => ({ ...prev, loraAlpha: Math.max(1, val || 1) }))}
                    />
                  </Field>

                  <div className="space-y-2">
                    {toggleSwitch('Gradient Checkpointing', config.gradientCheckpointing, (v) =>
                      onChangeConfig((prev) => ({ ...prev, gradientCheckpointing: v }))
                    )}
                    {toggleSwitch('Flash Attention', config.flashAttention, (v) =>
                      onChangeConfig((prev) => ({ ...prev, flashAttention: v }))
                    )}
                    {toggleSwitch('Unsloth Hızlandırılmış Çekirdekler', config.useUnslothAcceleratedKernels, (v) =>
                      onChangeConfig((prev) => ({ ...prev, useUnslothAcceleratedKernels: v }))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="text-[11px] font-bold text-text flex items-center gap-1.5">
                  <span>Otomatik Optimize Edilen Parametreler:</span>
                  <span className="font-mono text-accent bg-surface-2 border border-border px-2 py-0.5 rounded text-[10px]">
                    Micro-Batch: {results.optimalBatchSize} • Grad Accumulation: {results.optimalGradAcc} (Effective Batch: {results.effectiveBatchSize})
                  </span>
                </div>
                <p className="text-[10px] text-muted mt-1">
                  Donanım seçimi yapmanıza gerek yoktur; girdiğiniz <strong className="text-text">{config.sampleCount.toLocaleString()} örnek</strong> ve <strong className="text-text">{config.avgSeqLen} token</strong> uzunluğuna göre tüm platformlar için VRAM, süre ve maliyet aynı anda hesaplanmıştır.
                </p>
                <button
                  onClick={() => setShowAdvancedManualParams(true)}
                  className="mt-2 flex items-center gap-1 px-2.5 py-1.5 bg-surface-2 hover:bg-surface border border-border rounded-md text-text font-medium text-[11px] transition"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Manuel Parametreleri İncele
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </Collapse>
    </Panel>
  );
};