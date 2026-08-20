import React, { useState } from 'react';
import { HardDrive, Edit3, Sliders, Server, Zap, Shield, ChevronRight } from 'lucide-react';
import { GpuPreset } from '../types';
import { GPU_PRESETS, DEFAULT_CUSTOM_GPU } from '../data/presets';

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
    <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">4. Hardware & GPU Konfigürasyonu</h2>
            <p className="text-[11px] text-slate-500">
              GPU donanımı, VRAM kapasitesi, bellek bant genişliği ve Tensor Parallelism (TP)
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            onSelectGpu('custom');
            setShowCustomGpuModal(true);
          }}
          className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition border ${
            selectedGpuId === 'custom'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Özel GPU Gir</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-1">
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
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                activeTier === cat.id
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 border border-slate-200/60'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="GPU Ara (örn: 5090, MI300X, H200, B200)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 w-full sm:w-60 shadow-2xs"
        />
      </div>

      {/* GPU Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1">
        {filteredGpus.map((g) => {
          const isSelected = selectedGpuId === g.id;
          return (
            <div
              key={g.id}
              onClick={() => onSelectGpu(g.id)}
              className={`cursor-pointer rounded-lg p-3 border transition text-left flex flex-col justify-between relative ${
                isSelected
                  ? 'bg-emerald-50/70 border-emerald-500 ring-1 ring-emerald-500/40 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {g.vendor} {g.tier && `• ${g.tier}`}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                    {g.vramGB} GB VRAM
                  </span>
                </div>

                <div className="text-xs font-bold text-slate-900 mb-1">{g.name}</div>

                <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-600 font-mono mb-1.5">
                  <div>
                    BW: <strong className="text-emerald-700">{g.memoryBandwidthGBs} GB/s</strong>
                  </div>
                  <div>
                    FP16: <strong className="text-emerald-700">{g.fp16Tflops} TF</strong>
                  </div>
                </div>

                {g.description && (
                  <p className="text-[10px] text-slate-500 line-clamp-1 mb-1 font-sans">
                    {g.description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[10px] font-mono">
                <span className="text-slate-400">Birim Maliyet:</span>
                <span className="font-semibold text-slate-700">
                  {g.hourlyCostUsd > 0 ? `$${g.hourlyCostUsd.toFixed(2)}/saat` : 'Yerel (Ücretsiz)'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* GPU Count & Parallelism Sliders */}
      <div className="bg-slate-50 p-3.5 border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* GPU Count */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <Server className="w-3.5 h-3.5 text-emerald-600" />
              GPU Adedi (Cluster Size)
            </label>
            <span className="text-xs font-mono font-bold text-emerald-700 bg-white border border-emerald-300 px-2 py-0.5 rounded shadow-2xs">
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
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />

          <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-1">
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
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              Tensor Parallelism (TP)
            </label>
            <span className="text-xs font-mono font-bold text-amber-800 bg-white border border-amber-300 px-2 py-0.5 rounded shadow-2xs">
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
                    ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                    : tp > gpuCount
                    ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                TP {tp}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Model katmanlarının GPU’lar arasında bölünmesi (NVLink ile TP=2..8 tavsiye edilir).
          </p>
        </div>
      </div>

      {/* Custom GPU Modal */}
      {showCustomGpuModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-base">
                <Sliders className="w-5 h-5 text-emerald-600" />
                Özel GPU Özellikleri Girin
              </div>
              <button
                onClick={() => setShowCustomGpuModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="col-span-2">
                <label className="block text-slate-600 mb-1 font-medium">GPU Adı</label>
                <input
                  type="text"
                  value={customGpu.name}
                  onChange={(e) =>
                    onUpdateCustomGpu({ ...customGpu, name: e.target.value })
                  }
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">VRAM Kapasitesi (GB)</label>
                <input
                  type="number"
                  value={customGpu.vramGB}
                  onChange={(e) =>
                    onUpdateCustomGpu({ ...customGpu, vramGB: parseInt(e.target.value) || 16 })
                  }
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Bellek Bant Genişliği (GB/s)</label>
                <input
                  type="number"
                  value={customGpu.memoryBandwidthGBs}
                  onChange={(e) =>
                    onUpdateCustomGpu({
                      ...customGpu,
                      memoryBandwidthGBs: parseInt(e.target.value) || 500,
                    })
                  }
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">FP16 Compute (TFLOPS)</label>
                <input
                  type="number"
                  value={customGpu.fp16Tflops}
                  onChange={(e) =>
                    onUpdateCustomGpu({ ...customGpu, fp16Tflops: parseInt(e.target.value) || 100 })
                  }
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Saatlik Bulut Maliyeti ($/saat)</label>
                <input
                  type="number"
                  step="0.05"
                  value={customGpu.hourlyCostUsd}
                  onChange={(e) =>
                    onUpdateCustomGpu({ ...customGpu, hourlyCostUsd: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
              <button
                onClick={() => {
                  onSelectGpu('custom');
                  setShowCustomGpuModal(false);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Kaydet ve Seç
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
