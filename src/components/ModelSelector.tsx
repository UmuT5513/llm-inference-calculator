import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Edit3,
  Sliders,
  Laptop,
  Server,
  Zap,
  Search,
  Trash2,
  Plus,
} from 'lucide-react';
import { ModelPreset } from '../types';
import { MODEL_PRESETS } from '../data/presets';
import { listCustomModels, upsertCustomModel, deleteCustomModel, customModelFromDefaults } from '../utils/customModelStorage';
import { Panel } from './ui/Panel';
import { SectionHeader } from './ui/SectionHeader';
import { Badge } from './ui/Badge';
import { Field } from './ui/Field';
import { NumberInput } from './ui/NumberInput';
import { InfoTooltip } from './ui/InfoTooltip';
import { ModelDetailsPanel } from './ModelDetailsPanel';

interface ModelSelectorProps {
  selectedModelId: string;
  customModel: ModelPreset;
  onSelectModel: (modelId: string) => void;
  onUpdateCustomModel: (model: ModelPreset) => void;
  models?: ModelPreset[];
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModelId,
  customModel,
  onSelectModel,
  onUpdateCustomModel,
  models,
}) => {
  const { t } = useTranslation();
  const [activeCapability, setActiveCapability] = useState<'all' | 'frontier' | 'turkish'>('all');
  const [activeEnvFilter, setActiveEnvFilter] = useState<'all' | 'edge' | 'local' | 'hybrid' | 'server'>('all');
  const [activeProvider, setActiveProvider] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [customModels, setCustomModels] = useState<ModelPreset[]>([]);

  const catalog = models && models.length > 0 ? models : MODEL_PRESETS;

  useEffect(() => {
    setCustomModels(listCustomModels());
  }, []);

  const providerOptions = useMemo(() => {
    const providers: string[] = [];
    catalog.forEach((m) => {
      if (m.provider && !providers.includes(m.provider)) providers.push(m.provider);
    });
    return providers.sort((a, b) => a.localeCompare(b, 'tr'));
  }, [catalog]);

  const capabilityFilters = [
    { id: 'all' as const, label: t('model.capabilityAll') },
    { id: 'frontier' as const, label: t('model.capabilityFrontier') },
    { id: 'turkish' as const, label: t('model.capabilityTurkish') },
  ];

  const envFilters = [
    { id: 'all' as const, label: t('model.envAll'), icon: null },
    { id: 'edge' as const, label: t('model.envEdge'), icon: Laptop, desc: t('model.envEdgeDesc') },
    { id: 'local' as const, label: t('model.envLocal'), icon: Laptop, desc: t('model.envLocalDesc') },
    { id: 'hybrid' as const, label: t('model.envHybrid'), icon: Zap, desc: t('model.envHybridDesc') },
    { id: 'server' as const, label: t('model.envServer'), icon: Server, desc: t('model.envServerDesc') },
  ];

  const filteredModels = useMemo(() => {
    return catalog.filter((m) => {
      const matchCap =
        activeCapability === 'all' ? true : m.capabilities?.includes(activeCapability) ?? false;
      const matchEnv = activeEnvFilter === 'all' ? true : m.targetEnv === activeEnvFilter;
      const matchProvider = activeProvider === 'all' ? true : m.provider === activeProvider;
      const matchSearch =
        searchQuery.trim() === ''
          ? true
          : m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCap && matchEnv && matchProvider && matchSearch;
    });
  }, [catalog, activeCapability, activeEnvFilter, activeProvider, searchQuery]);

  const selectedModel =
    selectedModelId === 'custom'
      ? customModel
      : catalog.find((m) => m.id === selectedModelId) || catalog[0];

  const getEnvBadge = (env?: ModelPreset['targetEnv']) => {
    switch (env) {
      case 'edge':
        return (
          <Badge tone="default" title={t('model.envBadgeEdgeTitle')}>
            <Laptop className="w-2.5 h-2.5" />
            {t('model.envBadgeEdge')}
          </Badge>
        );
      case 'local':
        return (
          <Badge tone="default" title={t('model.envBadgeLocalTitle')}>
            <Laptop className="w-2.5 h-2.5" />
            {t('model.envBadgeLocal')}
          </Badge>
        );
      case 'hybrid':
        return (
          <Badge tone="default" title={t('model.envBadgeHybridTitle')}>
            <Zap className="w-2.5 h-2.5" />
            {t('model.envBadgeHybrid')}
          </Badge>
        );
      case 'server':
        return (
          <Badge tone="default" title={t('model.envBadgeServerTitle')}>
            <Server className="w-2.5 h-2.5" />
            {t('model.envBadgeServer')}
          </Badge>
        );
      default:
        return null;
    }
  };

  const openNewCustomModel = () => {
    const fresh = customModelFromDefaults();
    onUpdateCustomModel(fresh);
    onSelectModel('custom');
    setShowCustomModal(true);
  };

  const openSavedCustomModel = (m: ModelPreset) => {
    onUpdateCustomModel({ ...m });
    onSelectModel('custom');
    setShowCustomModal(true);
  };

  const removeCustomModel = (id: string) => {
    deleteCustomModel(id);
    setCustomModels(listCustomModels());
  };

  const handleSaveCustom = () => {
    const saved = upsertCustomModel(customModel);
    onUpdateCustomModel(saved);
    onSelectModel('custom');
    setCustomModels(listCustomModels());
    setShowCustomModal(false);
  };

  return (
    <Panel className="p-3.5">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-3">
        <div className="space-y-3 min-w-0">
      <SectionHeader
        title={t('model.title')}
        description={t('model.subtitle')}
        right={
          <div className="flex items-center gap-2">
            <InfoTooltip text={t('model.selectGuide')} title={t('model.selectGuideTitle')} />
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('model.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-surface-2 border-2 border-border rounded-none pl-8 pr-2.5 py-1 text-xs font-mono text-text placeholder-muted focus:outline-none focus:border-text w-48 sm:w-60 transition"
              />
            </div>

            <button
              onClick={openNewCustomModel}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-none transition border-2 ${
                selectedModelId === 'custom'
                  ? 'bg-accent text-bg border-accent font-bold'
                  : 'bg-surface-2 text-text border-border hover:bg-surface'
              }`}
            >
              <Edit3 className="w-3 h-3" />
              <span>{t('model.customModel')}</span>
            </button>
          </div>
        }
      />

      {/* Saved custom models */}
      {customModels.length > 0 && (
        <div className="bg-surface-2 border-2 border-border rounded-none p-2.5">
          <div className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">
            {t('model.customModelsTitle', { count: customModels.length })}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {customModels.map((m) => (
              <span
                key={m.id}
                className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-none border-2 transition ${
                  selectedModelId === 'custom' && customModel.id === m.id
                    ? 'bg-accent text-bg border-accent'
                    : 'bg-surface text-text border-border hover:bg-surface'
                }`}
              >
                <button
                  onClick={() => {
                    onUpdateCustomModel({ ...m });
                    onSelectModel('custom');
                  }}
                  className="font-semibold"
                  title={t('model.loadCustomTitle')}
                >
                  {m.name}
                </button>
                <button
                  onClick={() => openSavedCustomModel(m)}
                  className="text-muted hover:text-text"
                  title={t('model.editCustomTitle')}
                >
                  <Edit3 className="w-3 h-3" />
                </button>
                <button
                  onClick={() => removeCustomModel(m.id)}
                  className="text-danger/70 hover:text-danger"
                  title={t('model.deleteCustomTitle')}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Deployment Suitability Filter Tabs (Yerel vs Sunucu) */}
      <div className="flex flex-wrap items-center gap-1.5 bg-surface-2 p-1 rounded-none border-2 border-border">
        <span className="text-[10px] font-semibold text-muted px-2 uppercase tracking-wide">{t('model.hardwareType')}</span>
        {envFilters.map((ef) => (
          <button
            key={ef.id}
            onClick={() => setActiveEnvFilter(ef.id)}
            className={`px-2.5 py-1 rounded-none text-[11px] font-medium transition flex items-center gap-1.5 ${
              activeEnvFilter === ef.id
                ? 'bg-accent text-bg font-bold'
                : 'text-muted hover:text-text'
            }`}
          >
            {ef.icon && <ef.icon className={`w-3 h-3 ${activeEnvFilter === ef.id ? 'text-bg' : 'text-muted'}`} />}
            <span>{ef.label}</span>
          </button>
        ))}
      </div>

      {/* Capability + Provider filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          {capabilityFilters.map((cap) => (
            <button
              key={cap.id}
              onClick={() => setActiveCapability(cap.id)}
              className={`px-2.5 py-1 rounded-none text-[11px] font-medium whitespace-nowrap transition ${
                activeCapability === cap.id
                  ? 'bg-accent text-bg font-bold'
                  : 'bg-surface-2 text-muted hover:text-text hover:bg-surface'
              }`}
            >
              {cap.label}
            </button>
          ))}
        </div>

        <select
          value={activeProvider}
          onChange={(e) => setActiveProvider(e.target.value)}
          className="px-2.5 py-1 rounded-none text-[11px] font-medium bg-surface-2 text-text border-2 border-border focus:outline-none focus:border-text cursor-pointer max-w-44"
          title={t('model.providerFilter')}
        >
          <option value="all">{t('model.providerAll')}</option>
          {providerOptions.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Model Grid */}
      {filteredModels.length === 0 ? (
        <div className="p-6 text-center text-muted text-xs border border-dashed border-border rounded-none">
          {t('model.noModelsFound')}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
          {filteredModels.map((m) => {
            const isSelected = selectedModelId === m.id;

            return (
              <div
                key={m.id}
                onClick={() => onSelectModel(m.id)}
                className={`cursor-pointer rounded-none p-2.5 transition border-2 text-left relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'bg-surface-2 border-accent ring-1 ring-accent/40'
                    : 'bg-surface border-border hover:border-accent/40 hover:bg-surface-2'
                }`}
              >
                {/* Badges */}
                <div className="absolute top-0 right-0 flex items-center">
                  {m.verified === false && (
                    <Badge
                      tone="danger"
                      className="rounded-none"
                      title={t('model.unverifiedBadgeTitle')}
                    >
                      {t('model.unverifiedBadge')}
                    </Badge>
                  )}
                  {m.source === 'mirror' && m.verified !== false && (
                    <Badge
                      tone="default"
                      className="rounded-none"
                      title={t('model.mirrorBadgeTitle', { mirrorHfId: m.mirrorHfId || t('model.communityRepo') })}
                    >
                      {t('model.mirrorBadge')}
                    </Badge>
                  )}
                  {m.isMultimodal && (
                    <Badge tone="accent" className="rounded-none">
                      {t('model.multimodalBadge')}
                    </Badge>
                  )}
                  {isSelected && (
                    <div className="bg-accent text-bg text-[8px] font-bold px-1.5 py-0.5 rounded-none">
                      {t('model.selectedBadge')}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider line-clamp-1">
                      {m.provider}
                    </span>
                    <div className="flex items-center gap-1">
                      {getEnvBadge(m.targetEnv)}
                      {m.isMoe ? (
                        <Badge tone="accent" className="font-mono">{`MoE (${m.activeParamsB}B)`}</Badge>
                      ) : (
                        <Badge tone="default" className="font-mono">Dense</Badge>
                      )}
                    </div>
                  </div>

                  <div className="text-xs font-bold text-text mb-1 line-clamp-1 flex items-center gap-1">
                    <span>{m.name}</span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-muted font-mono mb-1.5">
                    <span>{t('model.totalParams')} <strong className="text-accent">{m.totalParamsB}B</strong></span>
                    <span>Context: <strong className="text-text">{(m.maxContextLen / 1024).toFixed(0)}k</strong></span>
                  </div>

                  <p className="text-[10px] text-muted line-clamp-2 leading-relaxed">{m.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

        </div>

        {/* Selected model details (sticky on large screens) */}
        <div className="min-w-0">
          <ModelDetailsPanel model={selectedModel} />
        </div>
      </div>

      {/* Custom Model Edit Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border-2 border-border rounded-none max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-text font-semibold text-base">
                <Sliders className="w-5 h-5 text-accent" />
                {t('model.customModalTitle')}
              </div>
              <button
                onClick={() => setShowCustomModal(false)}
                className="text-muted hover:text-text text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <Field label={t('model.customName')}>
                <input
                  type="text"
                  value={customModel.name}
                  onChange={(e) =>
                    onUpdateCustomModel({ ...customModel, name: e.target.value })
                  }
                  className="w-full bg-surface-2 border-2 border-border rounded-none px-3 py-1.5 text-xs text-text placeholder-muted focus:border-text focus:outline-none"
                />
              </Field>

              <Field label={t('model.customTotalParams')}>
                <NumberInput
                  value={customModel.totalParamsB}
                  step={0.1}
                  onChange={(v) =>
                    onUpdateCustomModel({
                      ...customModel,
                      totalParamsB: v || 1,
                      activeParamsB: customModel.isMoe ? customModel.activeParamsB : v || 1,
                    })
                  }
                />
              </Field>

              <Field label={t('model.customNumLayers')}>
                <NumberInput
                  value={customModel.numLayers}
                  onChange={(v) =>
                    onUpdateCustomModel({ ...customModel, numLayers: Math.round(v) || 32 })
                  }
                />
              </Field>

              <Field label={t('model.customNumHeads')}>
                <NumberInput
                  value={customModel.numHeads}
                  onChange={(v) =>
                    onUpdateCustomModel({ ...customModel, numHeads: Math.round(v) || 32 })
                  }
                />
              </Field>

              <Field label={t('model.customNumKvHeads')}>
                <NumberInput
                  value={customModel.numKvHeads}
                  onChange={(v) =>
                    onUpdateCustomModel({ ...customModel, numKvHeads: Math.round(v) || 8 })
                  }
                />
              </Field>

              <Field label={t('model.customHeadDim')}>
                <NumberInput
                  value={customModel.headDim}
                  onChange={(v) =>
                    onUpdateCustomModel({ ...customModel, headDim: Math.round(v) || 128 })
                  }
                />
              </Field>

              <Field label={t('model.customHiddenSize')}>
                <NumberInput
                  value={customModel.hiddenSize}
                  onChange={(v) =>
                    onUpdateCustomModel({ ...customModel, hiddenSize: Math.round(v) || 4096 })
                  }
                />
              </Field>

              <Field label={t('model.customMaxContext')}>
                <NumberInput
                  value={customModel.maxContextLen}
                  onChange={(v) =>
                    onUpdateCustomModel({ ...customModel, maxContextLen: Math.round(v) || 32768 })
                  }
                />
              </Field>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-text">
                <input
                  type="checkbox"
                  checked={customModel.isMoe}
                  onChange={(e) =>
                    onUpdateCustomModel({ ...customModel, isMoe: e.target.checked })
                  }
                  className="rounded-none border-border text-accent"
                />
                {t('model.customMoE')}
              </label>

              {customModel.isMoe && (
                <div className="flex-1">
                  <NumberInput
                    placeholder={t('model.customActiveParams')}
                    value={customModel.activeParamsB}
                    onChange={(v) =>
                      onUpdateCustomModel({ ...customModel, activeParamsB: v || 1 })
                    }
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <button
                onClick={handleSaveCustom}
                className="px-4 py-2 bg-accent hover:opacity-90 text-bg rounded-none text-xs font-bold transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('model.customSave')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
};