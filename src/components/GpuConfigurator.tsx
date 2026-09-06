import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Edit3, Sliders, Server, Search, AlertTriangle } from 'lucide-react';
import { GpuPreset } from '../types';
import { GPU_PRESETS, INFERENCE_ENGINES } from '../data/presets';
import { isEngineSupportedByVendor, engineVendorReason, pickCompatibleEngine } from '../utils/engineCompatibility';
import { getCustomGpu, saveCustomGpu } from '../utils/customModelStorage';
import { Panel } from './ui/Panel';
import { SectionHeader } from './ui/SectionHeader';
import { Field } from './ui/Field';
import { NumberInput } from './ui/NumberInput';
import { InfoTooltip } from './ui/InfoTooltip';

interface GpuConfiguratorProps {
  selectedGpuId: string;
  gpuCount: number;
  customGpu: GpuPreset;
  engineId: string;
  selectedQuantId: string;
  onSelectGpu: (gpuId: string) => void;
  onChangeGpuCount: (count: number) => void;
  onChangeEngine: (engineId: string) => void;
  onUpdateCustomGpu: (gpu: GpuPreset) => void;
}

export const GpuConfigurator: React.FC<GpuConfiguratorProps> = ({
  selectedGpuId,
  gpuCount,
  customGpu,
  engineId,
  selectedQuantId,
  onSelectGpu,
  onChangeGpuCount,
  onChangeEngine,
  onUpdateCustomGpu,
}) => {
  const { t } = useTranslation();
  const [showCustomGpuModal, setShowCustomGpuModal] = useState<boolean>(false);
  const [activeTier, setActiveTier] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const selectedGpu =
    selectedGpuId === 'custom'
      ? customGpu
      : GPU_PRESETS.find((g) => g.id === selectedGpuId) || GPU_PRESETS[2];

  const engine = INFERENCE_ENGINES.find((e) => e.id === engineId);

  const selectedVendorConflict = engineVendorReason(engineId, selectedGpu.vendor);
  const autoEngineId = pickCompatibleEngine({
    engineId,
    quantId: selectedQuantId,
    gpuId: selectedGpuId,
    customGpu,
  });

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

  const handleOpenCustomGpu = () => {
    const saved = getCustomGpu();
    if (saved) onUpdateCustomGpu(saved);
    onSelectGpu('custom');
    setShowCustomGpuModal(true);
  };

  const handleSaveCustomGpu = () => {
    onSelectGpu('custom');
    onUpdateCustomGpu(saveCustomGpu(customGpu));
    setShowCustomGpuModal(false);
  };

  return (
    <Panel className="p-3.5 space-y-3">
      <SectionHeader
        title="GPU Hardware"
        description={t('gpu.subtitle')}
        right={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('gpu.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-surface-2 border-2 border-border rounded-none pl-8 pr-2.5 py-1 text-xs font-mono text-text placeholder-muted focus:outline-none focus:border-text w-48 sm:w-60 transition"
              />
            </div>

            <button
              onClick={handleOpenCustomGpu}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-none transition border-2 ${
                selectedGpuId === 'custom'
                  ? 'bg-accent text-bg border-accent font-bold'
                  : 'bg-surface-2 text-text border-border hover:bg-surface'
              }`}
            >
              <Edit3 className="w-3 h-3" />
              <span>{t('gpu.customGpuButton')}</span>
            </button>
          </div>
        }
      />

      {/* Filter */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: t('gpu.filterAll') },
          { id: 'datacenter', label: t('gpu.filterDatacenter') },
          { id: 'workstation', label: t('gpu.filterWorkstation') },
          { id: 'consumer', label: t('gpu.filterConsumer') },
          { id: 'unified', label: 'Apple Silicon' },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveTier(cat.id)}
            className={`px-2.5 py-1 rounded-none text-[11px] font-medium whitespace-nowrap transition ${
              activeTier === cat.id
                ? 'bg-accent text-bg font-bold'
                : 'bg-surface-2 text-muted hover:text-text hover:bg-surface'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Engine / Vendor conflict warning */}
      {selectedVendorConflict && engine && (
        <div className="flex items-start gap-2 bg-danger/10 border-2 border-danger/40 rounded-none p-2.5 text-[11px] text-danger">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">{engine.name} + {selectedGpu.name} uyumsuz.</p>
            <p className="text-danger/80 mt-0.5">{selectedVendorConflict}</p>
            <button
              onClick={() => onChangeEngine(autoEngineId)}
              className="mt-1.5 px-2.5 py-1 bg-accent text-bg text-[11px] font-bold rounded-none hover:opacity-90 transition"
            >
              {t('gpu.autoSwitchEngine', { engine: autoEngineId })}
            </button>
          </div>
        </div>
      )}

      {/* GPU Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1">
        {filteredGpus.map((g) => {
          const isSelected = selectedGpuId === g.id;
          const vendorIncompatible = !isEngineSupportedByVendor(engineId, g.vendor);
          return (
            <div
              key={g.id}
              onClick={() => onSelectGpu(g.id)}
              className={`cursor-pointer rounded-none p-3 border-2 transition text-left flex flex-col justify-between relative ${
                isSelected
                  ? 'bg-surface-2 border-accent ring-1 ring-accent/40'
                  : vendorIncompatible
                  ? 'bg-surface border-border opacity-60 hover:opacity-90'
                  : 'bg-surface border-border hover:border-accent/40 hover:bg-surface-2'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                    {g.vendor} {g.tier && `• ${g.tier}`}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-info bg-surface-2 border-2 border-border px-1.5 py-0.2 rounded-none">
                    {g.vramGB} GB VRAM
                  </span>
                </div>

                <div className="text-xs font-bold text-text mb-1 flex items-center gap-1">
                  {g.name}
                  <InfoTooltip
                    text={`${g.description}${vendorIncompatible && engine ? ` ⚠ ${engine.name} bu donanımda çalışmaz: ${engineVendorReason(engineId, g.vendor)}` : ''}`}
                    title={g.name}
                  />
                </div>

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
                <span className="text-muted">{t('gpu.unitCost')}</span>
                <span className="font-semibold text-text">
                  {g.hourlyCostUsd > 0
                    ? t('gpu.hourlyCost', { price: g.hourlyCostUsd.toFixed(2) })
                    : t('gpu.localFree')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* GPU Count */}
      <div className="bg-surface-2 p-3.5 border-2 border-border rounded-none">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1">
            <Server className="w-3.5 h-3.5 text-accent" />
            {t('gpu.count')}
            <InfoTooltip text={selectedGpu.vendor === 'Apple' ? t('gpu.appleGpuCountHint') : t('gpu.gpuCountHint')} />
          </span>
          <span className="text-xs font-mono font-bold text-info bg-surface-2 border-2 border-border px-2 py-0.5 rounded-none">
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
          }}
          className="w-full h-2 bg-surface-2 rounded-none appearance-none cursor-pointer accent-[#FFB224]"
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

      {/* Custom GPU Modal */}
      {showCustomGpuModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border-2 border-border rounded-none max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-text font-semibold text-base">
                <Sliders className="w-5 h-5 text-accent" />
                {t('gpu.customModalTitle')}
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
                <Field label={t('gpu.customName')}>
                  <input
                    type="text"
                    value={customGpu.name}
                    onChange={(e) =>
                      onUpdateCustomGpu({ ...customGpu, name: e.target.value })
                    }
                    className="w-full bg-surface-2 border-2 border-border rounded-none px-3 py-2 text-xs text-text placeholder-muted focus:border-text focus:outline-none"
                  />
                </Field>
              </div>

              <Field label={t('gpu.customVram')}>
                <NumberInput
                  value={customGpu.vramGB}
                  onChange={(v) => onUpdateCustomGpu({ ...customGpu, vramGB: Math.round(v) || 16 })}
                />
              </Field>

              <Field label={t('gpu.customBandwidth')}>
                <NumberInput
                  value={customGpu.memoryBandwidthGBs}
                  onChange={(v) =>
                    onUpdateCustomGpu({ ...customGpu, memoryBandwidthGBs: v || 500 })
                  }
                />
              </Field>

              <Field label={t('gpu.customFp16')}>
                <NumberInput
                  value={customGpu.fp16Tflops}
                  onChange={(v) => onUpdateCustomGpu({ ...customGpu, fp16Tflops: v || 100 })}
                />
              </Field>

              <Field label={t('gpu.customHourlyCost')}>
                <NumberInput
                  value={customGpu.hourlyCostUsd}
                  step={0.05}
                  onChange={(v) => onUpdateCustomGpu({ ...customGpu, hourlyCostUsd: v || 0 })}
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <button
                onClick={handleSaveCustomGpu}
                className="px-4 py-2 bg-accent hover:opacity-90 text-bg rounded-none text-xs font-bold transition"
              >
                {t('gpu.customSave')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
};