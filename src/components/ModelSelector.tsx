import React, { useState, useMemo } from 'react';
import {
  Cpu,
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
          <span className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200" title="Mobil / NPU / on-device cihazlarda çalıştırmaya elverişli">
            <Laptop className="w-2.5 h-2.5" />
            Edge
          </span>
        );
      case 'local':
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200" title="Yerel PC, Mac veya tek GPU ile çalıştırmaya elverişli">
            <Laptop className="w-2.5 h-2.5" />
            Yerel / PC
          </span>
        );
      case 'hybrid':
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200" title="İş istasyonu (24GB-48GB VRAM) veya 2x GPU için uygun">
            <Zap className="w-2.5 h-2.5" />
            İş İstasyonu
          </span>
        );
      case 'server':
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200" title="Veri merkezi, 80GB H100/A100 veya GPU kümesi gerektirir">
            <Server className="w-2.5 h-2.5" />
            Sunucu / Küme
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">1. LLM Model Parametreleri</h2>
            <p className="text-[11px] text-slate-500">
              Parametre boyutu, mimari (Dense / MoE), katman ve donanım uygunluğu
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick search input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Model ara (örn: Gemma 4, Qwen 3.5)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white w-48 sm:w-60 transition"
            />
          </div>

          {/* Custom model builder button */}
          <button
            onClick={() => {
              onSelectModel('custom');
              setShowCustomModal(true);
            }}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg transition border ${
              selectedModelId === 'custom'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
          >
            <Edit3 className="w-3 h-3" />
            <span>Özel Model</span>
          </button>
        </div>
      </div>

      {/* AI Model Recommendation Assistant Banner */}
      {showAiAdvisorBox && (
        <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-3.5 sm:p-4 shadow-xs space-y-3 relative overflow-hidden">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-xs">
                <Sparkles className="w-4 h-4 text-indigo-100" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Bu hesaplamaları ne için yapıyorsunuz? (Akıllı Model Seçimi)</span>
                  <span className="text-[9px] bg-indigo-100 text-indigo-800 font-mono px-1.5 py-0.2 rounded border border-indigo-200 font-semibold">
                    AI Destekli
                  </span>
                </h3>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Kullanım amacınızı seçin veya yazın; yapay zeka sağlık verileri için <strong>uzun context length</strong>, kodlama için <strong>agentic kabiliyetler</strong> ya da mantık için <strong>thinking/reasoning</strong> gücünü analiz ederek en ideal modeli otomatik seçsin.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowAiAdvisorBox(false)}
              className="text-slate-400 hover:text-slate-700 text-xs px-1.5 py-0.5 rounded-md hover:bg-indigo-100/50"
              title="Kutuyu Gizle"
            >
              ✕
            </button>
          </div>

          {/* Quick Scenario Chips */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
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
                    className="p-2 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-lg text-left transition flex flex-col justify-between group disabled:opacity-50 shadow-2xs"
                  >
                    <div className="flex items-center gap-1.5 text-indigo-600 mb-1">
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-[10.5px] font-bold text-slate-800 group-hover:text-indigo-900 leading-tight line-clamp-1">
                        {preset.label}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-500 font-mono">
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
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-2xs"
              />
            </div>

            <button
              onClick={() => handleRecommendModel(useCaseInput)}
              disabled={isRecommending || !useCaseInput.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-xs shrink-0 active:scale-95"
            >
              {isRecommending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Model Analiz Ediliyor...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-100" />
                  <span>AI ile Modeli Öner & Seç</span>
                </>
              )}
            </button>
          </div>

          {/* Recommendation Error */}
          {recommendationError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
              {recommendationError}
            </div>
          )}

          {/* Active AI Recommendation Highlight Banner */}
          {recommendation && (
            <div className="bg-white border border-indigo-200 rounded-lg p-3 space-y-2 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded uppercase tracking-wider">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Önerilen Model Otomatik Seçildi
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {recommendation.modelName}
                  </span>
                  <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded font-medium">
                    {recommendation.domainMatch}
                  </span>
                </div>

                <div className="text-[10px] text-slate-500">
                  İstediğiniz zaman aşağıdaki listeden başka bir model seçebilirsiniz.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                <div className="md:col-span-2 space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    💡 AI Analiz Gerekçesi:
                  </div>
                  <p className="text-slate-700 text-[11px] leading-relaxed">
                    {recommendation.reason}
                  </p>
                </div>

                <div className="space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                    🎯 Kritik Güçlü Yön:
                  </div>
                  <p className="text-slate-800 text-[10.5px] font-semibold">
                    {recommendation.keyHighlight}
                  </p>
                </div>
              </div>

              {/* Alternative Recommendations */}
              {recommendation.alternativeModelIds && recommendation.alternativeModelIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-[10px]">
                  <span className="text-slate-500 font-semibold">Alternatif Öneriler:</span>
                  {recommendation.alternativeModelIds.map((altId) => {
                    const altModel = catalog.find((m) => m.id === altId);
                    if (!altModel) return null;
                    return (
                      <button
                        key={altId}
                        onClick={() => onSelectModel(altId)}
                        className={`px-2 py-0.5 rounded-md border transition flex items-center gap-1 ${
                          selectedModelId === altId
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-indigo-400 hover:bg-white'
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
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
        <span className="text-[10px] font-semibold text-slate-500 px-2 uppercase tracking-wide">Donanım Türü:</span>
        {envFilters.map((ef) => (
          <button
            key={ef.id}
            onClick={() => setActiveEnvFilter(ef.id)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition flex items-center gap-1.5 ${
              activeEnvFilter === ef.id
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {ef.icon && <ef.icon className="w-3 h-3 text-slate-500" />}
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
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            {cap.label}
          </button>
        ))}
      </div>

      {/* Model Grid */}
      {filteredModels.length === 0 ? (
        <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-200 rounded-lg">
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
                className={`cursor-pointer rounded-lg p-2.5 transition border text-left relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'bg-indigo-50/70 border-indigo-500 text-slate-900 shadow-xs ring-1 ring-indigo-500/40'
                    : isAiRecommended
                    ? 'bg-purple-50/40 border-purple-300 hover:border-purple-400 ring-1 ring-purple-300/40'
                    : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50/60 shadow-2xs'
                }`}
              >
                {/* Badges */}
                <div className="absolute top-0 right-0 flex items-center">
                  {isAiRecommended && (
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-[8px] font-bold text-white px-1.5 py-0.5 rounded-bl shadow-xs flex items-center gap-0.5">
                      <Sparkles className="w-2 h-2" />
                      AI ÖNERİSİ
                    </div>
                  )}
                  {m.verified === false && (
                    <div
                      className="bg-amber-50 text-amber-700 border border-amber-200 text-[8px] font-bold px-1.5 py-0.5 rounded-bl"
                      title="Bu modelin mimari bilgisi Hugging Face'ten doğrulanamadı (gated/erişim kısıtlı olabilir). Gösterilen değerler kayıtlı ön tanımlıdır."
                    >
                      HF'DEN DOĞRULANAMADI
                    </div>
                  )}
                  {m.source === 'mirror' && m.verified !== false && (
                    <div
                      className="bg-slate-50 text-slate-500 border border-slate-200 text-[8px] font-semibold px-1.5 py-0.5 rounded-bl"
                      title={`Mimari bilgisi üreticinin gated reposu yerine topluluk aynasından alındı: ${m.mirrorHfId || 'topluluk reposu'}`}
                    >
                      TOPLULUK AYNASI
                    </div>
                  )}
                  {isSelected && (
                    <div className="bg-indigo-600 text-[8px] font-bold text-white px-1.5 py-0.5 rounded-bl">
                      SEÇİLİ
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider line-clamp-1">
                      {m.provider}
                    </span>
                    <div className="flex items-center gap-1">
                      {getEnvBadge(m.targetEnv)}
                      <span
                        className={`text-[9px] font-mono px-1 py-0.2 rounded ${
                          m.isMoe
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {m.isMoe ? `MoE (${m.activeParamsB}B)` : 'Dense'}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs font-bold text-slate-900 mb-1 line-clamp-1 flex items-center gap-1">
                    <span>{m.name}</span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mb-1.5">
                    <span>Toplam: <strong className="text-indigo-700">{m.totalParamsB}B</strong></span>
                    <span>Context: <strong className="text-slate-800">{(m.maxContextLen / 1024).toFixed(0)}k</strong></span>
                  </div>

                  <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{m.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Model Architectural Summary */}
      <div className="bg-slate-50 p-2.5 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-3 text-[11px]">
        <div className="flex items-center gap-2 text-slate-600">
          <Layers className="w-3.5 h-3.5 text-indigo-600" />
          <span className="font-semibold text-slate-700">Seçili Mimari:</span>
          <span className="text-slate-900 font-bold">{selectedModel.name}</span>
          {getEnvBadge(selectedModel.targetEnv)}
          {selectedModel.verified === false && (
            <span
              className="text-[9px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded"
              title="Bu modelin mimari bilgisi Hugging Face'ten doğrulanamadı (gated/erişim kısıtlı). Gösterilen değerler kayıtlı ön tanımlıdır."
            >
              HF'den doğrulanamadı — ön tanımlı değerler
            </span>
          )}
          {selectedModel.source === 'mirror' && selectedModel.verified !== false && (
            <span
              className="text-[9px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded"
              title={`Mimari bilgisi topluluk aynasından alındı: ${selectedModel.mirrorHfId || 'topluluk reposu'}`}
            >
              Topluluk aynası
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-slate-700 font-mono text-[10px]">
          <div>
            Katman: <strong className="text-indigo-700">{selectedModel.numLayers}</strong>
          </div>
          <div>
            Heads: <strong className="text-indigo-700">{selectedModel.numHeads}</strong> (KV: {selectedModel.numKvHeads})
          </div>
          <div>
            Head Dim: <strong className="text-indigo-700">{selectedModel.headDim}</strong>
          </div>
          <div>
            Hidden: <strong className="text-indigo-700">{selectedModel.hiddenSize}</strong>
          </div>
          <div>
            GQA: <strong className="text-indigo-700">{(selectedModel.numHeads / selectedModel.numKvHeads).toFixed(1)}:1</strong>
          </div>
        </div>
      </div>

      {/* Custom Model Edit Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-base">
                <Sliders className="w-5 h-5 text-indigo-600" />
                Özel Model Parametreleri
              </div>
              <button
                onClick={() => setShowCustomModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Model Adı</label>
                <input
                  type="text"
                  value={customModel.name}
                  onChange={(e) =>
                    onUpdateCustomModel({ ...customModel, name: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Toplam Parametre (B)</label>
                <input
                  type="number"
                  step="0.1"
                  value={customModel.totalParamsB}
                  onChange={(e) =>
                    onUpdateCustomModel({
                      ...customModel,
                      totalParamsB: parseFloat(e.target.value) || 1,
                      activeParamsB: customModel.isMoe ? customModel.activeParamsB : parseFloat(e.target.value) || 1,
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Katman Sayısı (numLayers)</label>
                <input
                  type="number"
                  value={customModel.numLayers}
                  onChange={(e) =>
                    onUpdateCustomModel({ ...customModel, numLayers: parseInt(e.target.value) || 32 })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Attention Heads (numHeads)</label>
                <input
                  type="number"
                  value={customModel.numHeads}
                  onChange={(e) =>
                    onUpdateCustomModel({ ...customModel, numHeads: parseInt(e.target.value) || 32 })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">KV Heads (GQA numKvHeads)</label>
                <input
                  type="number"
                  value={customModel.numKvHeads}
                  onChange={(e) =>
                    onUpdateCustomModel({ ...customModel, numKvHeads: parseInt(e.target.value) || 8 })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Head Dimension (headDim)</label>
                <input
                  type="number"
                  value={customModel.headDim}
                  onChange={(e) =>
                    onUpdateCustomModel({ ...customModel, headDim: parseInt(e.target.value) || 128 })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Hidden Size (hiddenSize)</label>
                <input
                  type="number"
                  value={customModel.hiddenSize}
                  onChange={(e) =>
                    onUpdateCustomModel({ ...customModel, hiddenSize: parseInt(e.target.value) || 4096 })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Max Context Length (Tokens)</label>
                <input
                  type="number"
                  value={customModel.maxContextLen}
                  onChange={(e) =>
                    onUpdateCustomModel({ ...customModel, maxContextLen: parseInt(e.target.value) || 32768 })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={customModel.isMoe}
                  onChange={(e) =>
                    onUpdateCustomModel({ ...customModel, isMoe: e.target.checked })
                  }
                  className="rounded border-slate-300 text-indigo-600 focus:ring-0"
                />
                Mixture of Experts (MoE) Mimarisi
              </label>

              {customModel.isMoe && (
                <div className="flex-1">
                  <input
                    type="number"
                    placeholder="Aktif Parametre (B)"
                    value={customModel.activeParamsB}
                    onChange={(e) =>
                      onUpdateCustomModel({ ...customModel, activeParamsB: parseFloat(e.target.value) || 1 })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-900"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
              <button
                onClick={() => {
                  onSelectModel('custom');
                  setShowCustomModal(false);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Kaydet ve Uygula
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
