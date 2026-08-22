import React, { useState } from 'react';
import { Edit3, Sliders, Server, Zap, Search } from 'lucide-react';
import { GpuPreset } from '../types';
import { GPU_PRESETS, DEFAULT_CUSTOM_GPU } from '../data/presets';
import { Panel } from './ui/Panel';
import { SectionHeader } from './ui/SectionHeader';
import { Field } from './ui/Field';
import { NumberInput } from './ui/NumberInput';

interface GpuConfiguratorProps {
  selectedGpuId: string;
  gpuCount: number;
  customGpu: GpuPreset;
  tensorParallelism: number;
  onSelectGpu: (gpuId: string) => void;
  onChangeGpuCount: (count: number) => void;
  onChangeTp: (tp: number) => void;
  onUpdateCustomGpu: (gpu: GpuPreset) => void;
}

export const GpuConfigurator: React.FC<GpuConfiguratorProps> = ({
  selectedGpuId,
  gpuCount,
  customGpu,
  tensorParallelism,
  onSelectGpu,
  onChangeGpuCount,
  onChangeTp,
  onUpdateCustomGpu,
}) => {
  const [showCustomGpuModal, setShowCustomGpuModal] = useState<boolean>(false);
  const [activeTier, setActiveTier] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const selectedGpu =
    selectedGpuId === 'custom'
      ? customGpu
      : GPU_PRESETS.find((g) => g.id === selectedGpuId) || GPU_PRESETS[2];

  const filteredGpus = GPU_PRESETS.filter((g) => {
    const matchesTier =
      activeTier === 'all'
        ? true
        : activeTier === 'datacenter'
        ? g.tier === 'datacenter'
        : activeTier === 'consumer'
        ? g.tier === 'consumer'
        : activeTier === 'workstation'
        ? g.tier === 'workstation'
        : activeTier === 'unified'
        ? g.tier === 'unified'
        : activeTier === 'nvidia'
        ? g.vendor === 'NVIDIA'
        : activeTier === 'amd'
        ? g.vendor === 'AMD'
        : activeTier === 'intel'
        ? g.vendor === 'Intel'
        : activeTier === 'apple'
        ? g.vendor === 'Apple'
        : true;

    const matchesSearch =
      !searchTerm ||
      g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.description.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesTier && matchesSearch;
  });

  const totalVramAvailableGB = selectedGpu.vramGB * gpuCount;

  return (
    <Panel className="p-3.5 space-y-3">
      <SectionHeader
        index="04"
        title="GPU Hardware"
        description="GPU donanımı, VRAM kapasitesi, bellek bant genişliği ve Tensor Parallelism (TP)"
        right={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="GPU Ara (örn: 5090, MI300X, H200, B200)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-surface-2 border border-border rounded pl-8 pr-2.5 py-1 text-xs font-mono text-text placeholder-muted focus:outline-none focus:border-accent w-48 sm:w-60 transition"
              />
            </div>

            <button
              onClick={() => {
                onSelectGpu('custom');
                setShowCustomGpuModal(true);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition border ${
                selectedGpuId === 'custom'
                  ? 'bg-accent text-bg border-accent font-bold'
                  : 'bg-surface-2 text-text border-border hover:bg-surface'
              }`}
            >
              <Edit3 className="w-3 h-3" />
              <span>Özel GPU Gir</span>
            </button>
          </div>
        }
      />

      {/* Filter */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'Tümü' },
          { id: 'datacenter', label: 'Veri Merkezi / AI Cluster' },
          { id: 'workstation', label: 'İş İstasyonu' },
          { id: 'consumer', label: 'Tüketici / Masaüstü' },
          { id: 'unified', label: 'Apple Silicon' },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveTier(cat.id)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition ${
              activeTier === cat.id
                ? 'bg-accent text-bg font-bold'
                : 'bg-surface-2 text-muted hover:text-text hover:bg-surface'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* GPU Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1">
        {filteredGpus.map((g) => {
          const isSelected = selectedGpuId === g.id;
          return (
            <div
              key={g.id}
              onClick={() => onSelectGpu(g.id)}
              className={`cursor-pointer rounded-md p-3 border transition text-left flex flex-col justify-between relative ${
                isSelected
                  ? 'bg-surface-2 border-accent ring-1 ring-accent/40'
                  : 'bg-surface border-border hover:border-accent/40 hover:bg-surface-2'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                    {g.vendor} {g.tier && `• ${g.tier}`}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-accent bg-surface-2 border border-border px-1.5 py-0.2 rounded">
                    {g.vramGB} GB VRAM
                  </span>
                </div>

                <div className="text-xs font-bold text-text mb-1">{g.name}</div>

                <div className="grid grid-cols-2 gap-1 text-[10px] text-muted font-mono mb-1.5">
                  <div>
                    BW: <strong className="text-accent">{g.memoryBandwidthGBs} GB/s</strong>
                  </div>
                  <div>
                    FP16: <strong className="text-accent">{g.fp16Tflops} TF</strong>
                  </div>
                </div>

                {g.description && (
                  <p className="text-[10px] text-muted line-clamp-1 mb-1 font-sans">
                    {g.description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-1.5 border-t border-border text-[10px] font-mono">
                <span className="text-muted">Birim Maliyet:</span>
                <span className="font-semibold text-text">
                  {g.hourlyCostUsd > 0 ? `$${g.hourlyCostUsd.toFixed(2)}/saat` : 'Yerel (Ücretsiz)'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* GPU Count & Parallelism Sliders */}
      <div className="bg-surface-2 p-3.5 border border-border rounded-md grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* GPU Count */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1">
              <Server className="w-3.5 h-3.5 text-accent" />
              GPU Adedi (Cluster Size)
            </label>
            <span className="text-xs font-mono font-bold text-accent bg-surface-2 border border-border px-2 py-0.5 rounded">
              {gpuCount}x GPU ({totalVramAvailableGB} GB VRAM)
            </span>
          </div>

          <input
            type="range"
            min="1"
            max="64"
            step="1"
            value={gpuCount}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 1;
              onChangeGpuCount(val);
              if (tensorParallelism > val) {
                onChangeTp(Math.min(val, 8));
              }
            }}
            className="w-full h-2 bg-surface-2 rounded-md appearance-none cursor-pointer accent-[#FFB224]"
          />

          <div className="flex justify-between text-[9px] text-muted font-mono mt-1">
            <span>1x</span>
            <span>2x</span>
            <span>4x</span>
            <span>8x</span>
            <span>16x</span>
            <span>32x</span>
            <span>64x</span>
          </div>
        </div>

        {/* Tensor Parallelism */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-accent" />
              Tensor Parallelism (TP)
            </label>
            <span className="text-xs font-mono font-bold text-accent bg-surface-2 border border-border px-2 py-0.5 rounded">
              TP = {tensorParallelism}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {[1, 2, 4, 8, 16, 32].map((tp) => (
              <button
                key={tp}
                disabled={tp > gpuCount}
                onClick={() => onChangeTp(tp)}
                className={`flex-1 py-1 text-[11px] font-mono font-bold rounded-md transition border ${
                  tensorParallelism === tp
                    ? 'bg-accent text-bg border-accent'
                    : tp > gpuCount
                    ? 'bg-surface-2 text-muted border-border cursor-not-allowed'
                    : 'bg-surface-2 text-text border-border hover:bg-surface'
                }`}
              >
                TP {tp}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted mt-1">
            Model katmanlarının GPU’lar arasında bölünmesi (NVLink ile TP=2..8 tavsiye edilir).
          </p>
        </div>
      </div>

      {/* Custom GPU Modal */}
      {showCustomGpuModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-md max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-text font-semibold text-base">
                <Sliders className="w-5 h-5 text-accent" />
                Özel GPU Özellikleri Girin
              </div>
              <button
                onClick={() => setShowCustomGpuModal(false)}
                className="text-muted hover:text-text text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <Field label="GPU Adı">
                  <input
                    type="text"
                    value={customGpu.name}
                    onChange={(e) =>
                      onUpdateCustomGpu({ ...customGpu, name: e.target.value })
                    }
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-xs text-text placeholder-muted focus:border-accent focus:outline-none"
                  />
                </Field>
              </div>

              <Field label="VRAM Kapasitesi (GB)">
                <NumberInput
                  value={customGpu.vramGB}
                  onChange={(v) => onUpdateCustomGpu({ ...customGpu, vramGB: v || 16 })}
                />
              </Field>

              <Field label="Bellek Bant Genişliği (GB/s)">
                <NumberInput
                  value={customGpu.memoryBandwidthGBs}
                  onChange={(v) =>
                    onUpdateCustomGpu({ ...customGpu, memoryBandwidthGBs: v || 500 })
                  }
                />
              </Field>

              <Field label="FP16 Compute (TFLOPS)">
                <NumberInput
                  value={customGpu.fp16Tflops}
                  onChange={(v) => onUpdateCustomGpu({ ...customGpu, fp16Tflops: v || 100 })}
                />
              </Field>

              <Field label="Saatlik Bulut Maliyeti ($/saat)">
                <NumberInput
                  value={customGpu.hourlyCostUsd}
                  step={0.05}
                  onChange={(v) => onUpdateCustomGpu({ ...customGpu, hourlyCostUsd: v || 0 })}
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <button
                onClick={() => {
                  onSelectGpu('custom');
                  setShowCustomGpuModal(false);
                }}
                className="px-4 py-2 bg-accent hover:opacity-90 text-bg rounded-md text-xs font-bold transition"
              >
                Kaydet ve Seç
              </button>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
};