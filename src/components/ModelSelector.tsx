import React, { useState, useMemo } from 'react';
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

const USE_CASE_PRESETS = [
  {
    id: 'health',
    label: 'Sağlık & Epikriz Analizi',
    sublabel: 'Uzun Bağlam & RAG',
    icon: Stethoscope,
    query: 'Sağlık sektöründe hastane kayıtları, klinik hasta epikrizleri ve uzun medikal raporların analizi (128k uzun bağlam ve yüksek RAG sadakati gerekiyor).',
  },
  {
    id: 'coding',
    label: 'Yazılım & Agentic Kodlama',
    sublabel: 'Tool Use & Code',
    icon: Code,
    query: 'Büyük bir kod tabanında repository analizi, agentic refactoring, hata ayıklama ve çok adımlı kod üretimi yapacağım.',
  },
  {
    id: 'reasoning',
    label: 'Mantık & Derin Düşünme',
    sublabel: 'Thinking & Matematik',
    icon: BrainCircuit,
    query: 'Matematiksel problem çözme, mantıksal çıkarım, bilimsel araştırma ve adım adım zincirleme düşünme (chain-of-thought thinking) gerektiren görevler.',
  },
  {
    id: 'turkish',
    label: 'Türkçe Müşteri Hizmetleri',
    sublabel: 'Yerel NLP & Chatbot',
    icon: MessageSquare,
    query: 'Çağrı merkezi, Türkçe müşteri desteği, yerel dil nüansları ve yüksek hızlı sohbet botu.',
  },
  {
    id: 'law-finance',
    label: 'Hukuk & Finans Dokümanları',
    sublabel: '128k+ Büyük RAG',
    icon: Scale,
    query: 'Yüzlerce sayfalık hukuki sözleşmeler, mevzuat metinleri ve finansal raporların derinlemesine RAG analizi.',
  },
  {
    id: 'local-edge',
    label: 'Yerel PC / Mac & Düşük Bütçe',
    sublabel: 'Hafif 8B Edge LLM',
    icon: Laptop,
    query: 'Tek bir tüketici GPU (RTX 4060/3060) veya Apple Mac üzerinde minimum VRAM ile yerel ve hızlı çalıştırma.',
  },
];

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModelId,
  customModel,
  onSelectModel,
  onUpdateCustomModel,
  models,
}) => {
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
        throw new Error('Model önerisi alınırken bir hata oluştu.');
      }

      const data: ModelRecommendationResult = await res.json();
      setRecommendation(data);

      // Automatically select the recommended model
      if (data.recommendedModelId) {
        onSelectModel(data.recommendedModelId);
      }
    } catch (err: any) {
      console.error('Model recommendation failed:', err);
      setRecommendationError(err.message || 'Öneri servisiyle bağlantı kurulamadı.');
    } finally {
      setIsRecommending(false);
    }
  };

  const capabilityFilters = [
    { id: 'all' as const, label: 'Tümü' },
    { id: 'frontier' as const, label: '🚀 Frontier' },
    { id: 'turkish' as const, label: '🇹🇷 Türkçe' },
  ];

  const envFilters = [
    { id: 'all' as const, label: 'Tüm Donanımlar', icon: null },
    { id: 'edge' as const, label: '📱 Edge', icon: Laptop, desc: 'Mobil / NPU / On-device' },
    { id: 'local' as const, label: '💻 Yerel / PC & Mac', icon: Laptop, desc: 'Tüketici GPU / Apple Silicon' },
    { id: 'hybrid' as const, label: '⚡ İş İstasyonu (Hybrid)', icon: Zap, desc: '24GB - 48GB VRAM / Çoklu GPU' },
    { id: 'server' as const, label: '🏢 Sunucu / Enterprise', icon: Server, desc: '80GB+ H100/A100 / GPU Kümesi' },
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
          <Badge tone="default" title="Mobil / NPU / on-device cihazlarda çalıştırmaya elverişli">
            <Laptop className="w-2.5 h-2.5" />
            Edge
          </Badge>
        );
      case 'local':
        return (
          <Badge tone="default" title="Yerel PC, Mac veya tek GPU ile çalıştırmaya elverişli">
            <Laptop className="w-2.5 h-2.5" />
            Yerel / PC
          </Badge>
        );
      case 'hybrid':
        return (
          <Badge tone="default" title="İş istasyonu (24GB-48GB VRAM) veya 2x GPU için uygun">
            <Zap className="w-2.5 h-2.5" />
            İş İstasyonu
          </Badge>
        );
      case 'server':
        return (
          <Badge tone="default" title="Veri merkezi, 80GB H100/A100 veya GPU kümesi gerektirir">
            <Server className="w-2.5 h-2.5" />
            Sunucu / Küme
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
        title="LLM Model Parametreleri"
        description="Parametre boyutu, mimari (Dense / MoE), katman ve donanım uygunluğu"
        right={
          <div className="flex items-center gap-2">
            {/* Quick search input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Model ara (örn: Gemma 4, Qwen 3.5)..."
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
              <span>Özel Model</span>
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
                  <span>Bu hesaplamaları ne için yapıyorsunuz? (Akıllı Model Seçimi)</span>
                  <Badge tone="accent">AI Destekli</Badge>
                </h3>
                <p className="text-[11px] text-muted mt-0.5">
                  Kullanım amacınızı seçin veya yazın; yapay zeka sağlık verileri için <strong>uzun context length</strong>, kodlama için <strong>agentic kabiliyetler</strong> ya da mantık için <strong>thinking/reasoning</strong> gücünü analiz ederek en ideal modeli otomatik seçsin.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowAiAdvisorBox(false)}
              className="text-muted hover:text-text text-xs px-1.5 py-0.5 rounded-md hover:bg-surface"
              title="Kutuyu Gizle"
            >
              ✕
            </button>
          </div>

          {/* Quick Scenario Chips */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold text-muted uppercase tracking-wider flex items-center gap-1">
              <span>Hızlı Senaryo Seçin:</span>
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
                placeholder="Veya projenizi yazın: (örn: 'Sağlık sektöründe hasta epikrizleri tarayacağım' ya da 'Python agentic kod refactoring')..."
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
                  <span>Model Analiz Ediliyor...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI ile Modeli Öner & Seç</span>
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
                    Önerilen Model Otomatik Seçildi
                  </Badge>
                  <span className="text-xs font-bold text-text">
                    {recommendation.modelName}
                  </span>
                  <span className="text-[10px] text-accent bg-surface border border-border px-1.5 py-0.2 rounded font-medium">
                    {recommendation.domainMatch}
                  </span>
                </div>

                <div className="text-[10px] text-muted">
                  İstediğiniz zaman aşağıdaki listeden başka bir model seçebilirsiniz.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                <div className="md:col-span-2 space-y-1">
                  <div className="text-[10px] font-bold text-muted uppercase tracking-wider">
                    💡 AI Analiz Gerekçesi:
                  </div>
                  <p className="text-muted text-[11px] leading-relaxed">
                    {recommendation.reason}
                  </p>
                </div>

                <div className="space-y-1 bg-surface p-2 rounded-md border border-border">
                  <div className="text-[10px] font-bold text-accent uppercase tracking-wider">
                    🎯 Kritik Güçlü Yön:
                  </div>
                  <p className="text-text text-[10.5px] font-semibold">
                    {recommendation.keyHighlight}
                  </p>
                </div>
              </div>

              {/* Alternative Recommendations */}
              {recommendation.alternativeModelIds && recommendation.alternativeModelIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border text-[10px]">
                  <span className="text-muted font-semibold">Alternatif Öneriler:</span>
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
        <span className="text-[10px] font-semibold text-muted px-2 uppercase tracking-wide">Donanım Türü:</span>
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

      {/* Capability Filters (Frontier / Türkçe) */}
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
          Seçilen kriterlere uygun model bulunamadı. Filtreleri sıfırlamayı deneyin.
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
                      AI ÖNERİSİ
                    </div>
                  )}
                  {m.verified === false && (
                    <Badge
                      tone="danger"
                      className="rounded-bl"
                      title="Bu modelin mimari bilgisi Hugging Face'ten doğrulanamadı (gated/erişim kısıtlı olabilir). Gösterilen değerler kayıtlı ön tanımlıdır."
                    >
                      HF'DEN DOĞRULANAMADI
                    </Badge>
                  )}
                  {m.source === 'mirror' && m.verified !== false && (
                    <Badge
                      tone="default"
                      className="rounded-bl"
                      title={`Mimari bilgisi üreticinin gated reposu yerine topluluk aynasından alındı: ${m.mirrorHfId || 'topluluk reposu'}`}
                    >
                      TOPLULUK AYNASI
                    </Badge>
                  )}
                  {isSelected && (
                    <div className="bg-accent text-bg text-[8px] font-bold px-1.5 py-0.5 rounded-bl">
                      SEÇİLİ
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
                    <span>Toplam: <strong className="text-accent">{m.totalParamsB}B</strong></span>
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
          <span className="font-semibold text-muted">Seçili Mimari:</span>
          <span className="text-text font-bold">{selectedModel.name}</span>
          {getEnvBadge(selectedModel.targetEnv)}
          {selectedModel.verified === false && (
            <Badge
              tone="danger"
              title="Bu modelin mimari bilgisi Hugging Face'ten doğrulanamadı (gated/erişim kısıtlı). Gösterilen değerler kayıtlı ön tanımlıdır."
            >
              HF'den doğrulanamadı — ön tanımlı değerler
            </Badge>
          )}
          {selectedModel.source === 'mirror' && selectedModel.verified !== false && (
            <Badge
              tone="default"
              title={`Mimari bilgisi topluluk aynasından alındı: ${selectedModel.mirrorHfId || 'topluluk reposu'}`}
            >
              Topluluk aynası
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-muted font-mono text-[10px]">
          <div>
            Katman: <strong className="text-accent">{selectedModel.numLayers}</strong>
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
                Özel Model Parametreleri
              </div>
              <button
                onClick={() => setShowCustomModal(false)}
                className="text-muted hover:text-text text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <Field label="Model Adı">
                <input
                  type="text"
                  value={customModel.name}
                  onChange={(e) =>
                    onUpdateCustomModel({ ...customModel, name: e.target.value })
                  }
                  className="w-full bg-surface-2 border border-border rounded px-3 py-1.5 text-xs text-text placeholder-muted focus:border-accent focus:outline-none"
                />
              </Field>

              <Field label="Toplam Parametre (B)">
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

              <Field label="Katman Sayısı (numLayers)">
                <NumberInput
                  value={customModel.numLayers}
                  onChange={(v) =>
                    onUpdateCustomModel({ ...customModel, numLayers: Math.round(v) || 32 })
                  }
                />
              </Field>

              <Field label="Attention Heads (numHeads)">
                <NumberInput
                  value={customModel.numHeads}
                  onChange={(v) =>
                    onUpdateCustomModel({ ...customModel, numHeads: Math.round(v) || 32 })
                  }
                />
              </Field>

              <Field label="KV Heads (GQA numKvHeads)">
                <NumberInput
                  value={customModel.numKvHeads}
                  onChange={(v) =>
                    onUpdateCustomModel({ ...customModel, numKvHeads: Math.round(v) || 8 })
                  }
                />
              </Field>

              <Field label="Head Dimension (headDim)">
                <NumberInput
                  value={customModel.headDim}
                  onChange={(v) =>
                    onUpdateCustomModel({ ...customModel, headDim: Math.round(v) || 128 })
                  }
                />
              </Field>

              <Field label="Hidden Size (hiddenSize)">
                <NumberInput
                  value={customModel.hiddenSize}
                  onChange={(v) =>
                    onUpdateCustomModel({ ...customModel, hiddenSize: Math.round(v) || 4096 })
                  }
                />
              </Field>

              <Field label="Max Context Length (Tokens)">
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
                Mixture of Experts (MoE) Mimarisi
              </label>

              {customModel.isMoe && (
                <div className="flex-1">
                  <NumberInput
                    placeholder="Aktif Parametre (B)"
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
                Kaydet ve Uygula
              </button>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
};
