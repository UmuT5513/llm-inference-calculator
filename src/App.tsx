import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { ModelSelector } from './components/ModelSelector';
import { QuantizationSelector } from './components/QuantizationSelector';
import { InferenceEngineSelector } from './components/InferenceEngineSelector';
import { GpuConfigurator } from './components/GpuConfigurator';
import { WorkloadConfigurator } from './components/WorkloadConfigurator';
import { FineTuningConfigPanel } from './components/FineTuningConfigPanel';
import { FineTuningResultsPanel } from './components/FineTuningResultsPanel';
import { FineTuningPlatformCompare } from './components/FineTuningPlatformCompare';
import { FineTuningCodeExport } from './components/FineTuningCodeExport';
import { AiAdvisorModal } from './components/AiAdvisorModal';
import { ExportModal } from './components/ExportModal';
import { ScenarioModal } from './components/ScenarioModal';
import { ScenarioComparisonModal } from './components/ScenarioComparisonModal';
import { AdminGate } from './components/AdminGate';
import { ResultsPanel } from './components/ResultsPanel';
import { Footer } from './components/Footer';
import { AboutModal } from './components/AboutModal';

import { CalculatorConfig, PresetScenario, FineTuningConfig } from './types';
import { GPU_PRESETS, MODEL_PRESETS } from './data/presets';
import { DEFAULT_INFERENCE_CONFIG, DEFAULT_FINETUNING_CONFIG } from './data/defaults';
import { calculateInferenceMetrics } from './utils/calculator';
import { calculateFineTuningMetrics } from './utils/fineTuningCalculator';
import { useLiveGpuPrices } from './hooks/useLiveGpuPrices';
import { useLiveModels } from './hooks/useLiveModels';

export default function App() {
  // Secret admin panel route (username/password login lives on this page).
  if (window.location.pathname === '/admnsterrrrr') {
    return <AdminGate />;
  }

  const [activeTab, setActiveTab] = useState<'inference' | 'finetuning'>('inference');

  // Inference Calculator State
  const [config, setConfig] = useState<CalculatorConfig>({ ...DEFAULT_INFERENCE_CONFIG });

  // Fine-Tuning State
  const [ftConfig, setFtConfig] = useState<FineTuningConfig>({ ...DEFAULT_FINETUNING_CONFIG });

  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState<boolean>(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState<boolean>(false);
  const [compareInitialIds, setCompareInitialIds] = useState<string[]>([]);

  // Live scraped GPU prices (RunPod / Modal / Lambda)
  const { prices: livePrices, overrides: liveOverrides, lastUpdated, loading: pricesLoading, refetch: refetchPrices } = useLiveGpuPrices();

  // Live unified model catalog from the server (curated + discovered);
  // falls back to the static presets when the API is unavailable.
  const { models: liveModels } = useLiveModels();
  const modelCatalog = useMemo(
    () => (liveModels.length > 0 ? liveModels : MODEL_PRESETS),
    [liveModels]
  );

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
    setConfig({ ...DEFAULT_INFERENCE_CONFIG });
    setFtConfig({ ...DEFAULT_FINETUNING_CONFIG });
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
    <div className="min-h-screen bg-bg text-text font-sans selection:bg-accent selection:text-bg pb-16">
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
      />

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
              <FineTuningPlatformCompare results={ftResults} />
              <FineTuningCodeExport results={ftResults} />
            </div>

            <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
              <FineTuningResultsPanel results={ftResults} />
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

      {/* Methodology & About Modal */}
      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />

      {/* Footer */}
      <Footer onOpenAbout={() => setIsAboutModalOpen(true)} />
    </div>
  );
}