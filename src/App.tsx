import React, { useState, useMemo, useEffect } from 'react';
import { Header } from './components/Header';
import { ModelSelector } from './components/ModelSelector';
import { QuantizationSelector } from './components/QuantizationSelector';
import { InferenceEngineSelector } from './components/InferenceEngineSelector';
import { GpuConfigurator } from './components/GpuConfigurator';
import { WorkloadConfigurator } from './components/WorkloadConfigurator';
import { VramBreakdownCard } from './components/VramBreakdownCard';
import { PerformanceCard } from './components/PerformanceCard';
import { CostAnalysisCard } from './components/CostAnalysisCard';
import { CloudCostComparisonCard } from './components/CloudCostComparisonCard';
import { OnPremisesTcoCard } from './components/OnPremisesTcoCard';
import { FineTuningDashboard } from './components/FineTuningDashboard';
import { AiAdvisorModal } from './components/AiAdvisorModal';
import { ExportModal } from './components/ExportModal';
import { ScenarioModal } from './components/ScenarioModal';
import { ScenarioComparisonModal } from './components/ScenarioComparisonModal';
import { GpuPricesCard } from './components/GpuPricesCard';
import { AdminPanel } from './components/AdminPanel';

import { CalculatorConfig, PresetScenario, FineTuningConfig } from './types';
import { DEFAULT_CUSTOM_MODEL, DEFAULT_CUSTOM_GPU, DEFAULT_USER_PROFILES, GPU_PRESETS, MODEL_PRESETS } from './data/presets';
import { calculateInferenceMetrics } from './utils/calculator';
import { calculateFineTuningMetrics } from './utils/fineTuningCalculator';
import { useLiveGpuPrices } from './hooks/useLiveGpuPrices';
import { useLiveModels } from './hooks/useLiveModels';
import { useAuth } from './auth/AuthContext';
import { Sparkles, Cpu } from 'lucide-react';

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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Active Tab View */}
        {activeTab === 'finetuning' ? (
          /* ================= FINE-TUNING WORKSPACE ================= */
          <div className="space-y-5">
            {/* Global Shared Model Selector */}
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

            {/* Fine Tuning Dashboard Component */}
            <FineTuningDashboard
              config={ftConfig}
              results={ftResults}
              onChangeConfig={setFtConfig}
              models={modelCatalog}
            />
          </div>
        ) : (
          /* ================= INFERENCE WORKSPACE ================= */
          <>
            {/* Top Summary Banner */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
                  <Cpu className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-bold text-slate-900">{results.modelName}</span>
                    <span className="text-xs font-mono font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                      {results.totalParamsB}B Params
                    </span>
                    <span className="text-xs font-mono text-cyan-800 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded font-bold">
                      {results.engineName} ({results.engineBadge})
                    </span>
                    <span className="text-xs font-mono text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                      {config.quantId.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Donanım: <strong className="text-slate-800">{config.gpuCount}x {results.gpuName}</strong> ({results.totalVramAvailableGB} GB VRAM) • Yük: <strong className="text-slate-800">{results.activeTotalUsers} Eşzamanlı Kullanıcı</strong> ({results.effectivePromptLen.toLocaleString()} in / {results.effectiveGenLen.toLocaleString()} out)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div>
                  <div className="text-[11px] text-slate-500 font-medium">Toplam Gerekli VRAM</div>
                  <div className={`text-xl font-bold font-mono ${results.isOom ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {results.totalVramNeededGB.toFixed(1)} GB <span className="text-sm font-normal text-slate-400">/ {results.totalVramAvailableGB} GB</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsAiModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition active:scale-95"
                >
                  <Sparkles className="w-4 h-4 text-indigo-100" />
                  <span>Analiz Et</span>
                </button>
              </div>
            </div>

            {/* Configuration Step Cards */}
            <div className="space-y-5">
              {/* 1. Model Selection */}
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

              {/* 2. Quantization Selection */}
              <QuantizationSelector
                selectedQuantId={config.quantId}
                selectedKvCacheQuantId={config.kvCacheQuantId}
                onSelectQuant={(quantId) => setConfig((prev) => ({ ...prev, quantId }))}
                onSelectKvCacheQuant={(kvCacheQuantId) => setConfig((prev) => ({ ...prev, kvCacheQuantId }))}
              />

              {/* 3. Inference Engine Selector */}
              <InferenceEngineSelector
                selectedEngineId={config.engineId}
                onSelectEngine={(engineId) => setConfig((prev) => ({ ...prev, engineId }))}
              />

              {/* 4. GPU Hardware Configuration */}
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

              {/* 5. Workload & User Personas Configuration */}
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

            {/* Primary Results Section */}
            <div className="pt-2 space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <h2 className="text-base font-bold text-slate-900">Hesaplama ve Performans Sonuçları</h2>
              </div>

              {/* Live Scraped GPU Prices */}
              <GpuPricesCard
                gpuId={config.gpuId}
                gpuName={results.gpuName}
                prices={livePrices}
                overrides={liveOverrides}
                lastUpdated={lastUpdated}
                loading={pricesLoading}
                onRefresh={refetchPrices}
              />

              {/* VRAM Breakdown & Fit Analysis */}
              <VramBreakdownCard
                results={results}
                gpuCount={config.gpuCount}
                gpuVramGB={activeGpu.vramGB}
              />

              {/* Performance & Throughput */}
              <PerformanceCard results={results} />

              {/* Financial & Cost Metrics */}
              <CostAnalysisCard
                results={results}
                gpuCount={config.gpuCount}
                gpuName={results.gpuName}
              />

              {/* Cloud GPU Providers Comparison Matrix */}
              <CloudCostComparisonCard
                results={results}
                gpuCount={config.gpuCount}
              />

              {/* On-Premise TCO & Turkey Electricity Cost Card */}
              <OnPremisesTcoCard
                onPremTco={results.onPremTco}
                results={results}
                gpuCount={config.gpuCount}
                electricityRateTryPerKwh={config.electricityRateTryPerKwh}
                usdToTryRate={config.usdToTryRate}
                pueRatio={config.pueRatio}
                serverDutyCyclePct={config.serverDutyCyclePct}
                customGpuUnitPriceUsd={config.customGpuUnitPriceUsd}
                customSystemBasePriceUsd={config.customSystemBasePriceUsd}
                customAnnualElectricityUsd={config.customAnnualElectricityUsd}
                customAnnualCoolingUsd={config.customAnnualCoolingUsd}
                customAnnualMaintenanceUsd={config.customAnnualMaintenanceUsd}
                customAnnualOtherExpensesUsd={config.customAnnualOtherExpensesUsd}
                onChangeElectricityRate={(val) => setConfig((prev) => ({ ...prev, electricityRateTryPerKwh: val }))}
                onChangeUsdToTryRate={(val) => setConfig((prev) => ({ ...prev, usdToTryRate: val }))}
                onChangePueRatio={(val) => setConfig((prev) => ({ ...prev, pueRatio: val }))}
                onChangeDutyCycle={(val) => setConfig((prev) => ({ ...prev, serverDutyCyclePct: val }))}
                onChangeCustomGpuUnitPrice={(val) => setConfig((prev) => ({ ...prev, customGpuUnitPriceUsd: val }))}
                onChangeCustomSystemBasePrice={(val) => setConfig((prev) => ({ ...prev, customSystemBasePriceUsd: val }))}
                onChangeCustomAnnualElectricity={(val) => setConfig((prev) => ({ ...prev, customAnnualElectricityUsd: val }))}
                onChangeCustomAnnualCooling={(val) => setConfig((prev) => ({ ...prev, customAnnualCoolingUsd: val }))}
                onChangeCustomAnnualMaintenance={(val) => setConfig((prev) => ({ ...prev, customAnnualMaintenanceUsd: val }))}
                onChangeCustomAnnualOtherExpenses={(val) => setConfig((prev) => ({ ...prev, customAnnualOtherExpensesUsd: val }))}
                onResetAllCustomCosts={() =>
                  setConfig((prev) => ({
                    ...prev,
                    customGpuUnitPriceUsd: null,
                    customSystemBasePriceUsd: null,
                    customAnnualElectricityUsd: null,
                    customAnnualCoolingUsd: null,
                    customAnnualMaintenanceUsd: null,
                    customAnnualOtherExpensesUsd: null,
                  }))
                }
              />
            </div>
          </>
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