import React, { useState, useMemo, useEffect } from 'react';
import { Header } from './components/Header';
import { ModelSelector } from './components/ModelSelector';
import { QuantizationSelector } from './components/QuantizationSelector';
import { InferenceEngineSelector } from './components/InferenceEngineSelector';
import { GpuConfigurator } from './components/GpuConfigurator';
import { WorkloadConfigurator } from './components/WorkloadConfigurator';
import { FineTuningConfigPanel } from './components/FineTuningConfigPanel';
import { AiAdvisorModal } from './components/AiAdvisorModal';
import { ExportModal } from './components/ExportModal';
import { ScenarioModal } from './components/ScenarioModal';
import { ScenarioComparisonModal } from './components/ScenarioComparisonModal';
import { AdminPanel } from './components/AdminPanel';
import { ResultsPanel } from './components/ResultsPanel';
import { Panel } from './components/ui/Panel';
import { SectionHeader } from './components/ui/SectionHeader';
import { Badge } from './components/ui/Badge';

import { CalculatorConfig, PresetScenario, FineTuningConfig } from './types';
import { DEFAULT_CUSTOM_MODEL, DEFAULT_CUSTOM_GPU, DEFAULT_USER_PROFILES, GPU_PRESETS, MODEL_PRESETS } from './data/presets';
import { calculateInferenceMetrics } from './utils/calculator';
import { calculateFineTuningMetrics } from './utils/fineTuningCalculator';
import { useLiveGpuPrices } from './hooks/useLiveGpuPrices';
import { useLiveModels } from './hooks/useLiveModels';
import { useAuth } from './auth/AuthContext';

export default function App() {
  const { user, login, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'inference' | 'finetuning'>('inference');

  // Inference Calculator State
  const [config, setConfig] = useState<CalculatorConfig>({
    modelId: 'llama-3.3-70b',
    customModel: DEFAULT_CUSTOM_MODEL,
    quantId: 'fp8',
    kvCacheQuantId: 'fp8',
    engineId: 'vllm',
    gpuId: 'nvidia-h100-sxm',
    customGpu: DEFAULT_CUSTOM_GPU,
    gpuCount: 1,
    tensorParallelism: 1,
    pipelineParallelism: 1,
    promptLen: 4096,
    genLen: 1024,
    batchSize: 16,
    userProfiles: DEFAULT_USER_PROFILES,
    useMultiProfile: true,
    requestsPerMin: 120,
    cudaOverheadGB: 1.5,
    activationOverheadPct: 10,
    tpEfficiencyPct: 85,

    // On-Premise & Turkey TCO Defaults
    electricityRateTryPerKwh: 4.20,
    usdToTryRate: 50,
    pueRatio: 1.25,
    serverDutyCyclePct: 85,
    customGpuUnitPriceUsd: null,
    customSystemBasePriceUsd: null,
    customAnnualElectricityUsd: null,
    customAnnualCoolingUsd: null,
    customAnnualMaintenanceUsd: null,
    customAnnualOtherExpensesUsd: null,
  });

  // Fine-Tuning State
  const [ftConfig, setFtConfig] = useState<FineTuningConfig>({
    modelId: 'llama-3.3-70b',
    customModel: DEFAULT_CUSTOM_MODEL,
    methodId: 'qlora',
    frameworkId: 'unsloth',
    gpuId: 'nvidia-rtx-4090',
    customGpu: DEFAULT_CUSTOM_GPU,
    gpuCount: 1,

    sampleCount: 10000,
    avgSeqLen: 2048,
    epochs: 3,

    perDeviceBatchSize: 2,
    gradientAccumulationSteps: 4,
    learningRate: '2e-4',
    loraRank: 16,
    loraAlpha: 32,
    optimizerType: 'adamw_8bit',
    gradientCheckpointing: true,
    flashAttention: true,
    useUnslothAcceleratedKernels: true,

    electricityRateTryPerKwh: 4.20,
    usdToTryRate: 50,
  });

  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState<boolean>(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [compareInitialIds, setCompareInitialIds] = useState<string[]>([]);

  // Live scraped GPU prices (RunPod / Modal / Lambda)
  const { prices: livePrices, overrides: liveOverrides, lastUpdated, loading: pricesLoading, refetch: refetchPrices } = useLiveGpuPrices();

  // Live unified model catalog from the server (curated + discovered);
  // falls back to the static presets when the API is unavailable.
  const { models: liveModels, refetch: refetchModels } = useLiveModels();
  const modelCatalog = useMemo(
    () => (liveModels.length > 0 ? liveModels : MODEL_PRESETS),
    [liveModels]
  );

  // Show a toast-style message after OAuth redirect
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('auth');
    if (status === 'success') {
      setAuthNotice('Google ile giriş başarılı!');
    } else if (status === 'error') {
      setAuthNotice('Giriş sırasında bir sorun oluştu.');
    }
    if (status) {
      window.history.replaceState({}, '', window.location.pathname);
      const t = setTimeout(() => setAuthNotice(null), 4000);
      return () => clearTimeout(t);
    }
  }, []);

  // Synchronize model selection across Inference and Fine-Tuning
  const handleSelectModel = (modelId: string) => {
    setConfig((prev) => ({ ...prev, modelId }));
    setFtConfig((prev) => ({ ...prev, modelId }));
  };

  // Compute Inference metrics reactively (with live price overrides)
  const results = useMemo(() => {
    return calculateInferenceMetrics(config, liveOverrides, modelCatalog);
  }, [config, liveOverrides, modelCatalog]);

  // Compute Fine-Tuning metrics reactively
  const ftResults = useMemo(() => {
    return calculateFineTuningMetrics(ftConfig, modelCatalog);
  }, [ftConfig, modelCatalog]);

  const handleSelectPreset = (scenario: PresetScenario) => {
    setConfig((prev) => ({
      ...prev,
      ...scenario.config,
    }));
    if (scenario.config.modelId) {
      setFtConfig((prev) => ({ ...prev, modelId: scenario.config.modelId! }));
    }
  };

  const handleReset = () => {
    setConfig({
      modelId: 'llama-3.3-70b',
      customModel: DEFAULT_CUSTOM_MODEL,
      quantId: 'fp8',
      kvCacheQuantId: 'fp8',
      engineId: 'vllm',
      gpuId: 'nvidia-h100-sxm',
      customGpu: DEFAULT_CUSTOM_GPU,
      gpuCount: 1,
      tensorParallelism: 1,
      pipelineParallelism: 1,
      promptLen: 4096,
      genLen: 1024,
      batchSize: 16,
      userProfiles: DEFAULT_USER_PROFILES,
      useMultiProfile: true,
      requestsPerMin: 120,
      cudaOverheadGB: 1.5,
      activationOverheadPct: 10,
      tpEfficiencyPct: 85,
      electricityRateTryPerKwh: 4.20,
      usdToTryRate: 50,
      pueRatio: 1.25,
      serverDutyCyclePct: 85,
      customGpuUnitPriceUsd: null,
      customSystemBasePriceUsd: null,
      customAnnualElectricityUsd: null,
      customAnnualCoolingUsd: null,
      customAnnualMaintenanceUsd: null,
      customAnnualOtherExpensesUsd: null,
    });
    setFtConfig({
      modelId: 'llama-3.3-70b',
      customModel: DEFAULT_CUSTOM_MODEL,
      methodId: 'qlora',
      frameworkId: 'unsloth',
      gpuId: 'nvidia-rtx-4090',
      customGpu: DEFAULT_CUSTOM_GPU,
      gpuCount: 1,
      sampleCount: 10000,
      avgSeqLen: 2048,
      epochs: 3,
      perDeviceBatchSize: 2,
      gradientAccumulationSteps: 4,
      learningRate: '2e-4',
      loraRank: 16,
      loraAlpha: 32,
      optimizerType: 'adamw_8bit',
      gradientCheckpointing: true,
      flashAttention: true,
      useUnslothAcceleratedKernels: true,
      electricityRateTryPerKwh: 4.20,
      usdToTryRate: 50,
    });
  };

  // Load a saved scenario into the app state
  const handleLoadScenario = (type: 'inference' | 'finetuning', scenarioConfig: any, _results: any) => {
    setActiveTab(type);
    if (type === 'inference') {
      setConfig((prev) => ({ ...prev, ...scenarioConfig }));
    } else {
      setFtConfig((prev) => ({ ...prev, ...scenarioConfig }));
    }
  };

  const handleOpenCompare = (ids?: string[]) => {
    setCompareInitialIds(ids || []);
    setIsCompareModalOpen(true);
  };

  const activeGpu =
    config.gpuId === 'custom'
      ? config.customGpu
      : GPU_PRESETS.find((g) => g.id === config.gpuId) || GPU_PRESETS[2];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-600 selection:text-white pb-16">
      {/* Navbar */}
      <Header
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onSelectPreset={handleSelectPreset}
        onOpenAiAdvisor={() => setIsAiModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
        onReset={handleReset}
        onOpenSave={() => setIsScenarioModalOpen(true)}
        onOpenCompare={() => handleOpenCompare()}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
        user={user}
        onLogin={login}
        onLogout={logout}
      />

      {/* OAuth notice */}
      {authNotice && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg shadow-lg">
          {authNotice}
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'finetuning' ? (
          <div className="lg:grid lg:grid-cols-[1fr_460px] lg:gap-6 lg:items-start">
            <div className="space-y-4">
              <ModelSelector
                selectedModelId={ftConfig.modelId}
                customModel={ftConfig.customModel}
                onSelectModel={handleSelectModel}
                onUpdateCustomModel={(customModel) => {
                  setConfig((prev) => ({ ...prev, customModel }));
                  setFtConfig((prev) => ({ ...prev, customModel }));
                }}
                models={modelCatalog}
              />
              <FineTuningConfigPanel config={ftConfig} results={ftResults} onChangeConfig={setFtConfig} />
            </div>

            <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
              <Panel className="p-4 space-y-3">
                <SectionHeader
                  title="Fine-Tuning Sonuçları"
                  description="VRAM, süre ve platform maliyet analizi"
                />
                <div className="space-y-2">
                  <div className="text-sm font-bold text-text">
                    {ftResults.modelName} Fine-Tuning
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="accent">{ftResults.methodBadge}</Badge>
                    <Badge tone="default">{ftResults.frameworkName}</Badge>
                  </div>
                  <div className="flex items-center justify-between bg-surface-2 border border-border rounded-md p-3">
                    <span className="text-[11px] text-muted">Gereken Minimum VRAM</span>
                    <span className="text-lg font-bold font-mono text-accent">
                      {ftResults.recommendedMinVramGB} GB
                    </span>
                  </div>
                  <p className="text-[10px] text-muted">
                    Toplam gereken: {ftResults.totalVramNeededGB.toFixed(1)} GB (Min {ftResults.recommendedMinVramGB} GB) • En hızlı: {ftResults.fastestPlatform?.estimatedTimeFormatted || ftResults.trainingTimeFormatted}
                  </p>
                </div>
              </Panel>
            </div>
          </div>
        ) : (
          <div className="lg:grid lg:grid-cols-[1fr_460px] lg:gap-6 lg:items-start">
            <div className="space-y-4">
              <ModelSelector
                selectedModelId={config.modelId}
                customModel={config.customModel}
                onSelectModel={handleSelectModel}
                onUpdateCustomModel={(customModel) => {
                  setConfig((prev) => ({ ...prev, customModel }));
                  setFtConfig((prev) => ({ ...prev, customModel }));
                }}
                models={modelCatalog}
              />
              <QuantizationSelector
                selectedQuantId={config.quantId}
                selectedKvCacheQuantId={config.kvCacheQuantId}
                onSelectQuant={(quantId) => setConfig((prev) => ({ ...prev, quantId }))}
                onSelectKvCacheQuant={(kvCacheQuantId) => setConfig((prev) => ({ ...prev, kvCacheQuantId }))}
              />
              <InferenceEngineSelector
                selectedEngineId={config.engineId}
                onSelectEngine={(engineId) => setConfig((prev) => ({ ...prev, engineId }))}
              />
              <GpuConfigurator
                selectedGpuId={config.gpuId}
                gpuCount={config.gpuCount}
                customGpu={config.customGpu}
                tensorParallelism={config.tensorParallelism}
                onSelectGpu={(gpuId) => setConfig((prev) => ({ ...prev, gpuId }))}
                onChangeGpuCount={(gpuCount) => setConfig((prev) => ({ ...prev, gpuCount }))}
                onChangeTp={(tensorParallelism) => setConfig((prev) => ({ ...prev, tensorParallelism }))}
                onUpdateCustomGpu={(customGpu) => setConfig((prev) => ({ ...prev, customGpu }))}
              />
              <WorkloadConfigurator
                promptLen={config.promptLen}
                genLen={config.genLen}
                batchSize={config.batchSize}
                requestsPerMin={config.requestsPerMin}
                cudaOverheadGB={config.cudaOverheadGB}
                activationOverheadPct={config.activationOverheadPct}
                tpEfficiencyPct={config.tpEfficiencyPct}
                userProfiles={config.userProfiles}
                useMultiProfile={config.useMultiProfile}
                onChangePromptLen={(promptLen) => setConfig((prev) => ({ ...prev, promptLen }))}
                onChangeGenLen={(genLen) => setConfig((prev) => ({ ...prev, genLen }))}
                onChangeBatchSize={(batchSize) => setConfig((prev) => ({ ...prev, batchSize }))}
                onChangeRequestsPerMin={(requestsPerMin) => setConfig((prev) => ({ ...prev, requestsPerMin }))}
                onChangeCudaOverhead={(cudaOverheadGB) => setConfig((prev) => ({ ...prev, cudaOverheadGB }))}
                onChangeActivationOverhead={(activationOverheadPct) => setConfig((prev) => ({ ...prev, activationOverheadPct }))}
                onChangeTpEfficiency={(tpEfficiencyPct) => setConfig((prev) => ({ ...prev, tpEfficiencyPct }))}
                onToggleMultiProfile={(useMultiProfile) => setConfig((prev) => ({ ...prev, useMultiProfile }))}
                onUpdateProfiles={(userProfiles) => setConfig((prev) => ({ ...prev, userProfiles }))}
              />
            </div>

            <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
              <ResultsPanel
                results={results}
                config={config}
                gpuVramGB={activeGpu.vramGB}
                gpuId={config.gpuId}
                prices={livePrices}
                overrides={liveOverrides}
                lastUpdated={lastUpdated}
                pricesLoading={pricesLoading}
                onRefreshPrices={refetchPrices}
                onOpenAiAdvisor={() => setIsAiModalOpen(true)}
                onChangeConfig={(updater) => setConfig(updater)}
              />
            </div>
          </div>
        )}
      </main>

      {/* AI Advisor Modal */}
      <AiAdvisorModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        config={config}
        results={results}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        config={config}
        results={results}
      />

      {/* Scenario Save/Manage Modal */}
      <ScenarioModal
        isOpen={isScenarioModalOpen}
        onClose={() => setIsScenarioModalOpen(false)}
        activeTab={activeTab}
        config={config}
        ftConfig={ftConfig}
        results={results}
        ftResults={ftResults}
        onLoadScenario={handleLoadScenario}
        onOpenCompare={(ids) => handleOpenCompare(ids)}
      />

      {/* Scenario Comparison Modal */}
      <ScenarioComparisonModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        initialIds={compareInitialIds}
        activeTab={activeTab}
        config={config}
        ftConfig={ftConfig}
        results={results}
        ftResults={ftResults}
      />

      {/* Admin Panel Modal */}
      <AdminPanel
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onModelsRefreshed={refetchModels}
        onPricesRefreshed={refetchPrices}
      />
    </div>
  );
}