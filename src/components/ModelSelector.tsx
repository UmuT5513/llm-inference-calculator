import React, { useState, useMemo } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import {
  Edit3,
  Layers,
  Sliders,
  Laptop,
  Server,
  Zap,
  Search,
  Sparkles,
  Stethoscope,
  Code,
  BrainCircuit,
  MessageSquare,
  Scale,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { ModelPreset, ModelRecommendationResult } from '../types';
import { MODEL_PRESETS, DEFAULT_CUSTOM_MODEL } from '../data/presets';
import { Panel } from './ui/Panel';
import { SectionHeader } from './ui/SectionHeader';
import { Badge } from './ui/Badge';
import { Field } from './ui/Field';
import { NumberInput } from './ui/NumberInput';

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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);

  const catalog = models && models.length > 0 ? models : MODEL_PRESETS;

  // AI Recommendation States
  const [useCaseInput, setUseCaseInput] = useState<string>('');
  const [isRecommending, setIsRecommending] = useState<boolean>(false);
  const [recommendation, setRecommendation] = useState<ModelRecommendationResult | null>(null);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);
  const [showAiAdvisorBox, setShowAiAdvisorBox] = useState<boolean>(true);

  const handleRecommendModel = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsRecommending(true);
    setRecommendationError(null);

    try {
      const res = await fetch('/api/recommend-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useCase: queryText.trim() }),
      });

      if (!res.ok) {
        throw new Error(t('model.recommendError'));
      }

      const data: ModelRecommendationResult = await res.json();
      setRecommendation(data);

      // Automatically select the recommended model
      if (data.recommendedModelId) {
        onSelectModel(data.recommendedModelId);
      }
    } catch (err: any) {
      console.error('Model recommendation failed:', err);
      setRecommendationError(err.message || t('model.recommendServiceError'));
    } finally {
      setIsRecommending(false);
    }
  };

  const USE_CASE_PRESETS = [
    {
      id: 'health',
      label: t('model.useCaseHealth'),
      sublabel: t('model.useCaseHealthSub'),
      icon: Stethoscope,
      query: t('model.useCaseHealthQuery'),
    },
    {
      id: 'coding',
      label: t('model.useCaseCoding'),
      sublabel: t('model.useCaseCodingSub'),
      icon: Code,
      query: t('model.useCaseCodingQuery'),
    },
    {
      id: 'reasoning',
      label: t('model.useCaseReasoning'),
      sublabel: t('model.useCaseReasoningSub'),
      icon: BrainCircuit,
      query: t('model.useCaseReasoningQuery'),
    },
    {
      id: 'turkish',
      label: t('model.useCaseTurkish'),
      sublabel: t('model.useCaseTurkishSub'),
      icon: MessageSquare,
      query: t('model.useCaseTurkishQuery'),
    },
    {
      id: 'law-finance',
      label: t('model.useCaseLawFinance'),
      sublabel: t('model.useCaseLawFinanceSub'),
      icon: Scale,
      query: t('model.useCaseLawFinanceQuery'),
    },
    {
      id: 'local-edge',
      label: t('model.useCaseLocalEdge'),
      sublabel: t('model.useCaseLocalEdgeSub'),
      icon: Laptop,
      query: t('model.useCaseLocalEdgeQuery'),
    },
  ];

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
      const matchSearch =
        searchQuery.trim() === ''
          ? true
          : m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCap && matchEnv && matchSearch;
    });
  }, [catalog, activeCapability, activeEnvFilter, searchQuery]);

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

  return (
    <Panel className="p-3.5 space-y-3">
      <SectionHeader
        index="01"
        title={t('model.title')}
        description={t('model.subtitle')}
        right={
          <div className="flex items-center gap-2">
            {/* Quick search input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('model.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-surface-2 border border-border rounded pl-8 pr-2.5 py-1 text-xs font-mono text-text placeholder-muted focus:outline-none focus:border-accent w-48 sm:w-60 transition"
              />
            </div>

            {/* Custom model builder button */}
            <button
              onClick={() => {
                onSelectModel('custom');
                setShowCustomModal(true);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition border ${
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

      {/* AI Model Recommendation Assistant Banner */}
      {showAiAdvisorBox && (
        <div className="bg-surface-2 border border-border rounded-md p-3.5 sm:p-4 space-y-3 relative overflow-hidden">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-accent text-bg rounded-md">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-text flex items-center gap-1.5">
                  <span>{t('model.advisorTitle')}</span>
                  <Badge tone="accent">{t('model.advisorBadge')}</Badge>
                </h3>
                <p className="text-[11px] text-muted mt-0.5">
                  <Trans
                    i18nKey="model.advisorDesc"
                    components={{ strong: <strong /> }}
                  />
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowAiAdvisorBox(false)}
              className="text-muted hover:text-text text-xs px-1.5 py-0.5 rounded-md hover:bg-surface"
              title={t('model.advisorHideTitle')}
            >
              ✕
            </button>
          </div>

          {/* Quick Scenario Chips */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold text-muted uppercase tracking-wider flex items-center gap-1">
              <span>{t('model.quickScenario')}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
              {USE_CASE_PRESETS.map((preset) => {
                const Icon = preset.icon;
                return (
                  <button
                    key={preset.id}
                    disabled={isRecommending}
                    onClick={() => {
                      setUseCaseInput(preset.query);
                      handleRecommendModel(preset.query);
                    }}
                    className="p-2 bg-surface hover:bg-surface-2 border border-border hover:border-accent/50 rounded-md text-left transition flex flex-col justify-between group disabled:opacity-50"
                  >
                    <div className="flex items-center gap-1.5 text-accent mb-1">
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-[10.5px] font-bold text-text group-hover:text-accent leading-tight line-clamp-1">
                        {preset.label}
                      </span>
                    </div>
                    <span className="text-[9px] text-muted font-mono">
                      {preset.sublabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Free-text input bar */}
          <div className="flex flex-col sm:flex-row items-stretch gap-2 pt-0.5">
            <div className="relative flex-1">
              <input
                type="text"
                value={useCaseInput}
                onChange={(e) => setUseCaseInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && useCaseInput.trim()) {
                    handleRecommendModel(useCaseInput);
                  }
                }}
                placeholder={t('model.useCasePlaceholder')}
                className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-xs font-mono text-text placeholder-muted focus:outline-none focus:border-accent"
              />
            </div>

            <button
              onClick={() => handleRecommendModel(useCaseInput)}
              disabled={isRecommending || !useCaseInput.trim()}
              className="px-4 py-2 bg-accent hover:opacity-90 disabled:opacity-50 text-bg rounded-md text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0 active:scale-95"
            >
              {isRecommending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('model.recommending')}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t('model.recommendAndSelect')}</span>
                </>
              )}
            </button>
          </div>

          {/* Recommendation Error */}
          {recommendationError && (
            <div className="p-2.5 bg-danger/10 border border-danger/40 rounded-md text-danger text-xs">
              {recommendationError}
            </div>
          )}

          {/* Active AI Recommendation Highlight Banner */}
          {recommendation && (
            <div className="bg-surface-2 border border-border rounded-md p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                <div className="flex items-center gap-2">
                  <Badge tone="ok" className="text-[10px] font-bold uppercase tracking-wider">
                    <CheckCircle2 className="w-3 h-3" />
                    {t('model.recommendedAutoSelected')}
                  </Badge>
                  <span className="text-xs font-bold text-text">
                    {recommendation.modelName}
                  </span>
                  <span className="text-[10px] text-accent bg-surface border border-border px-1.5 py-0.2 rounded font-medium">
                    {recommendation.domainMatch}
                  </span>
                </div>

                <div className="text-[10px] text-muted">
                  {t('model.recommendationNote')}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                <div className="md:col-span-2 space-y-1">
                  <div className="text-[10px] font-bold text-muted uppercase tracking-wider">
                    {t('model.analysisReason')}
                  </div>
                  <p className="text-muted text-[11px] leading-relaxed">
                    {recommendation.reason}
                  </p>
                </div>

                <div className="space-y-1 bg-surface p-2 rounded-md border border-border">
                  <div className="text-[10px] font-bold text-accent uppercase tracking-wider">
                    {t('model.keyStrength')}
                  </div>
                  <p className="text-text text-[10.5px] font-semibold">
                    {recommendation.keyHighlight}
                  </p>
                </div>
              </div>

              {/* Alternative Recommendations */}
              {recommendation.alternativeModelIds && recommendation.alternativeModelIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border text-[10px]">
                  <span className="text-muted font-semibold">{t('model.alternativeSuggestions')}</span>
                  {recommendation.alternativeModelIds.map((altId) => {
                    const altModel = catalog.find((m) => m.id === altId);
                    if (!altModel) return null;
                    return (
                      <button
                        key={altId}
                        onClick={() => onSelectModel(altId)}
                        className={`px-2 py-0.5 rounded-md border transition flex items-center gap-1 ${
                          selectedModelId === altId
                            ? 'bg-accent text-bg border-accent font-bold'
                            : 'bg-surface text-text border-border hover:border-accent/40 hover:bg-surface-2'
                        }`}
                      >
                        <span>{altModel.name}</span>
                        <ArrowRight className="w-2.5 h-2.5 opacity-60" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Deployment Suitability Filter Tabs (Yerel vs Sunucu) */}
      <div className="flex flex-wrap items-center gap-1.5 bg-surface-2 p-1 rounded border border-border">
        <span className="text-[10px] font-semibold text-muted px-2 uppercase tracking-wide">{t('model.hardwareType')}</span>
        {envFilters.map((ef) => (
          <button
            key={ef.id}
            onClick={() => setActiveEnvFilter(ef.id)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition flex items-center gap-1.5 ${
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

      {/* Capability Filters (Frontier / Turkish) */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
        {capabilityFilters.map((cap) => (
          <button
            key={cap.id}
            onClick={() => setActiveCapability(cap.id)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition ${
              activeCapability === cap.id
                ? 'bg-accent text-bg font-bold'
                : 'bg-surface-2 text-muted hover:text-text hover:bg-surface'
            }`}
          >
            {cap.label}
          </button>
        ))}
      </div>

      {/* Model Grid */}
      {filteredModels.length === 0 ? (
        <div className="p-6 text-center text-muted text-xs border border-dashed border-border rounded-md">
          {t('model.noModelsFound')}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
          {filteredModels.map((m) => {
            const isSelected = selectedModelId === m.id;
            const isAiRecommended = recommendation?.recommendedModelId === m.id;

            return (
              <div
                key={m.id}
                onClick={() => onSelectModel(m.id)}
                className={`cursor-pointer rounded-md p-2.5 transition border text-left relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'bg-surface-2 border-accent ring-1 ring-accent/40'
                    : isAiRecommended
                    ? 'bg-surface border-accent/40 ring-1 ring-accent/40'
                    : 'bg-surface border-border hover:border-accent/40 hover:bg-surface-2'
                }`}
              >
                {/* Badges */}
                <div className="absolute top-0 right-0 flex items-center">
                  {isAiRecommended && (
                    <div className="bg-surface-2 text-muted text-[8px] font-bold px-1.5 py-0.5 rounded-bl flex items-center gap-0.5">
                      <Sparkles className="w-2 h-2" />
                      {t('model.aiRecommendationBadge')}
                    </div>
                  )}
                  {m.verified === false && (
                    <Badge
                      tone="danger"
                      className="rounded-bl"
                      title={t('model.unverifiedBadgeTitle')}
                    >
                      {t('model.unverifiedBadge')}
                    </Badge>
                  )}
                  {m.source === 'mirror' && m.verified !== false && (
                    <Badge
                      tone="default"
                      className="rounded-bl"
                      title={t('model.mirrorBadgeTitle', { mirrorHfId: m.mirrorHfId || t('model.communityRepo') })}
                    >
                      {t('model.mirrorBadge')}
                    </Badge>
                  )}
                  {isSelected && (
                    <div className="bg-accent text-bg text-[8px] font-bold px-1.5 py-0.5 rounded-bl">
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

      {/* Selected Model Architectural Summary */}
      <div className="bg-surface-2 p-2.5 border border-border rounded-md flex flex-wrap items-center justify-between gap-3 text-[11px]">
        <div className="flex items-center gap-2 text-muted">
          <Layers className="w-3.5 h-3.5 text-accent" />
          <span className="font-semibold text-muted">{t('model.selectedArchitecture')}</span>
          <span className="text-text font-bold">{selectedModel.name}</span>
          {getEnvBadge(selectedModel.targetEnv)}
          {selectedModel.verified === false && (
            <Badge
              tone="danger"
              title={t('model.unverifiedShortTitle')}
            >
              {t('model.unverifiedShort')}
            </Badge>
          )}
          {selectedModel.source === 'mirror' && selectedModel.verified !== false && (
            <Badge
              tone="default"
              title={t('model.mirrorShortTitle', { mirrorHfId: selectedModel.mirrorHfId || t('model.communityRepo') })}
            >
              {t('model.mirrorShort')}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-muted font-mono text-[10px]">
          <div>
            {t('model.layers')} <strong className="text-accent">{selectedModel.numLayers}</strong>
          </div>
          <div>
            Heads: <strong className="text-accent">{selectedModel.numHeads}</strong> (KV: {selectedModel.numKvHeads})
          </div>
          <div>
            Head Dim: <strong className="text-accent">{selectedModel.headDim}</strong>
          </div>
          <div>
            Hidden: <strong className="text-accent">{selectedModel.hiddenSize}</strong>
          </div>
          <div>
            GQA: <strong className="text-accent">{(selectedModel.numHeads / selectedModel.numKvHeads).toFixed(1)}:1</strong>
          </div>
        </div>
      </div>

      {/* Custom Model Edit Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-md max-w-lg w-full p-6 space-y-4">
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
                  className="w-full bg-surface-2 border border-border rounded px-3 py-1.5 text-xs text-text placeholder-muted focus:border-accent focus:outline-none"
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
                  className="rounded border-border text-accent focus:ring-0"
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
                onClick={() => {
                  onSelectModel('custom');
                  setShowCustomModal(false);
                }}
                className="px-4 py-2 bg-accent hover:opacity-90 text-bg rounded-md text-xs font-bold transition"
              >
                {t('model.customSave')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
};
