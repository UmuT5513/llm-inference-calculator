import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import { ScenarioModal } from './components/ScenarioModal';
import { ScenarioComparisonModal } from './components/ScenarioComparisonModal';
import { ScenarioSidebar } from './components/ScenarioSidebar';
import { MarkdownExportModal, MarkdownExportData } from './components/MarkdownExportModal';
import { AdminGate } from './components/AdminGate';
import { ResultsPanel } from './components/ResultsPanel';
import { Footer } from './components/Footer';
import { AboutModal } from './components/AboutModal';
import { Wizard, WizardStepDef } from './components/Wizard';
import { WizardSummaryBar, SummaryCell } from './components/WizardSummaryBar';
import { useTranslation } from 'react-i18next';

import { CalculatorConfig, PresetScenario, FineTuningConfig, GpuPreset } from './types';
import { SavedScenario } from './utils/scenarioStorage';
import { GPU_PRESETS, MODEL_PRESETS } from './data/presets';
import { DEFAULT_INFERENCE_CONFIG, DEFAULT_FINETUNING_CONFIG } from './data/defaults';
import { calculateInferenceMetrics } from './utils/calculator';
import { calculateFineTuningMetrics } from './utils/fineTuningCalculator';
import { pickCompatibleEngine } from './utils/engineCompatibility';
import { useLiveGpuPrices } from './hooks/useLiveGpuPrices';
import { useLiveModels } from './hooks/useLiveModels';
import { buildShareUrl, readScenarioFromLocation } from './utils/shareUrl';
import { ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

const INFERENCE_STEPS: WizardStepDef[] = [
  { id: 'model', titleKey: 'wizard.stepModel' },
  { id: 'quantization', titleKey: 'wizard.stepQuantization' },
  { id: 'engine', titleKey: 'wizard.stepEngine' },
  { id: 'gpu', titleKey: 'wizard.stepGpu' },
  { id: 'workload', titleKey: 'wizard.stepWorkload' },
  { id: 'results', titleKey: 'wizard.stepResults' },
];

const FINETUNING_STEPS: WizardStepDef[] = [
  { id: 'model', titleKey: 'wizard.stepModel' },
  { id: 'config', titleKey: 'wizard.stepFinetuningConfig' },
  { id: 'results', titleKey: 'wizard.stepResults' },
];

export default function App() {
  // Secret admin panel route (username/password login lives on this page).
  if (window.location.pathname === '/admnsterrrrr') {
    return <AdminGate />;
  }

  const { t } = useTranslation();

  const [initialScenario] = useState(readScenarioFromLocation);

  const initialResultIndex = initialScenario
    ? initialScenario.type === 'finetuning'
      ? FINETUNING_STEPS.length - 1
      : INFERENCE_STEPS.length - 1
    : 0;

  const [stepIndex, setStepIndex] = useState(initialResultIndex > 0 ? initialResultIndex : 0);
  const [maxVisited, setMaxVisited] = useState(initialResultIndex > 0 ? initialResultIndex : 0);

  const [activeTab, setActiveTab] = useState<'inference' | 'finetuning'>(
    initialScenario?.type === 'finetuning' ? 'finetuning' : 'inference'
  );

  // Inference Calculator State
  const [config, setConfig] = useState<CalculatorConfig>(() =>
    initialScenario?.type === 'inference' ? (initialScenario.config as CalculatorConfig) : { ...DEFAULT_INFERENCE_CONFIG }
  );

  // Fine-Tuning State
  const [ftConfig, setFtConfig] = useState<FineTuningConfig>(() =>
    initialScenario?.type === 'finetuning' ? (initialScenario.config as FineTuningConfig) : { ...DEFAULT_FINETUNING_CONFIG }
  );

  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState<boolean>(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState<boolean>(false);
  const [compareInitialIds, setCompareInitialIds] = useState<string[]>([]);
  const [markdownExport, setMarkdownExport] = useState<MarkdownExportData | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  const hydratedFromUrl = useRef(initialScenario !== null);
  const hydratedSnapshot = useRef(initialScenario?.config ?? null);

  useEffect(() => {
    if (!hydratedFromUrl.current) return;
    const snapshot = hydratedSnapshot.current;
    const changed = activeTab === 'inference' ? config !== snapshot : ftConfig !== snapshot;
    if (changed) {
      hydratedFromUrl.current = false;
      window.history.replaceState(null, '', '/app');
    }
  }, [config, ftConfig]);

  // Live scraped GPU prices (RunPod / Modal / Lambda)
  const { prices: livePrices, overrides: liveOverrides, lastUpdated, loading: pricesLoading } = useLiveGpuPrices();

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

  // Reconcile the engine so it always supports the current quant AND GPU vendor.
  const reconcileEngine = (next: {
    engineId?: string;
    quantId: string;
    gpuId: string;
    customGpu: GpuPreset;
  }): string => pickCompatibleEngine(next);

  // Auto-switch the engine when the selected GPU vendor is incompatible.
  const handleSelectGpu = (gpuId: string) => {
    setConfig((prev) => ({
      ...prev,
      gpuId,
      engineId: reconcileEngine({ engineId: prev.engineId, quantId: prev.quantId, gpuId, customGpu: prev.customGpu }),
    }));
  };

  const handleUpdateCustomGpu = (customGpu: GpuPreset) => {
    setConfig((prev) => ({
      ...prev,
      customGpu,
      engineId: reconcileEngine({ engineId: prev.engineId, quantId: prev.quantId, gpuId: prev.gpuId, customGpu }),
    }));
  };

  const handleSelectQuant = (quantId: string) => {
    setConfig((prev) => ({
      ...prev,
      quantId,
      engineId: reconcileEngine({ engineId: prev.engineId, quantId, gpuId: prev.gpuId, customGpu: prev.customGpu }),
    }));
  };

  const handleSelectPreset = (scenario: PresetScenario) => {
    setActiveTab('inference');
    setConfig((prev) => {
      const merged = { ...prev, ...scenario.config };
      return {
        ...merged,
        engineId: reconcileEngine({
          engineId: merged.engineId,
          quantId: merged.quantId,
          gpuId: merged.gpuId,
          customGpu: merged.customGpu,
        }),
      };
    });
    if (scenario.config.modelId) {
      setFtConfig((prev) => ({ ...prev, modelId: scenario.config.modelId! }));
    }
    setStepIndex(INFERENCE_STEPS.length - 1);
    setMaxVisited(INFERENCE_STEPS.length - 1);
  };

  const handleReset = () => {
    setConfig({ ...DEFAULT_INFERENCE_CONFIG });
    setFtConfig({ ...DEFAULT_FINETUNING_CONFIG });
  };

  // Load a saved scenario into the app state
  const handleLoadScenario = (type: 'inference' | 'finetuning', scenarioConfig: any, _results: any) => {
    setActiveTab(type);
    const resultIndex = type === 'finetuning' ? FINETUNING_STEPS.length - 1 : INFERENCE_STEPS.length - 1;
    setStepIndex(resultIndex);
    setMaxVisited(resultIndex);
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

  // Selected inference model — used to gate multimodal media inputs in the workload step.
  const activeModel = useMemo(
    () =>
      config.modelId === 'custom'
        ? config.customModel
        : modelCatalog.find((m) => m.id === config.modelId) || modelCatalog[0],
    [config.modelId, config.customModel, modelCatalog]
  );

  const handleCopyLink = (): string => {
    return activeTab === 'finetuning'
      ? buildShareUrl('finetuning', ftConfig)
      : buildShareUrl('inference', config);
  };

  const handleExportCurrent = () => {
    setMarkdownExport({
      type: activeTab,
      config: activeTab === 'inference' ? config : ftConfig,
      results: activeTab === 'inference' ? results : ftResults,
    });
  };

  const handleExportSavedScenario = (scenario: SavedScenario) => {
    setMarkdownExport({
      type: scenario.type,
      name: scenario.name,
      config: scenario.config,
      results: scenario.results,
    });
  };

  const steps = activeTab === 'inference' ? INFERENCE_STEPS : FINETUNING_STEPS;
  const lastStep = steps.length - 1;

  const handleChangeTab = (tab: 'inference' | 'finetuning') => {
    setActiveTab(tab);
    setStepIndex(0);
    setMaxVisited(0);
  };

  const goToStep = (index: number) => {
    if (index <= maxVisited) setStepIndex(index);
  };
  const goNext = () => {
    setStepIndex((prev) => {
      const next = Math.min(lastStep, prev + 1);
      setMaxVisited((m) => Math.max(m, next));
      return next;
    });
  };
  const goBack = () => setStepIndex((i) => Math.max(0, i - 1));

  const renderModelStep = () => (
    <ModelSelector
      selectedModelId={activeTab === 'inference' ? config.modelId : ftConfig.modelId}
      customModel={config.customModel}
      onSelectModel={handleSelectModel}
      onUpdateCustomModel={(customModel) => {
        setConfig((prev) => ({ ...prev, customModel }));
        setFtConfig((prev) => ({ ...prev, customModel }));
      }}
      models={modelCatalog}
    />
  );

  const renderStepBody = () => {
    const stepId = steps[stepIndex].id;
    if (activeTab === 'finetuning') {
      if (stepId === 'model') {
        return renderModelStep();
      }
      if (stepId === 'results') {
        return (
          <div className="space-y-4">
            <FineTuningResultsPanel
              results={ftResults}
              onCopyLink={handleCopyLink}
              onSaveScenario={() => setIsScenarioModalOpen(true)}
              onExportMarkdown={handleExportCurrent}
            />
            <FineTuningPlatformCompare results={ftResults} />
            <FineTuningCodeExport results={ftResults} />
          </div>
        );
      }
      return <FineTuningConfigPanel config={ftConfig} results={ftResults} onChangeConfig={setFtConfig} />;
    }
    switch (stepId) {
      case 'model':
        return renderModelStep();
      case 'quantization':
        return (
          <QuantizationSelector
            selectedQuantId={config.quantId}
            selectedKvCacheQuantId={config.kvCacheQuantId}
            onSelectQuant={handleSelectQuant}
            onSelectKvCacheQuant={(kvCacheQuantId) => setConfig((prev) => ({ ...prev, kvCacheQuantId }))}
          />
        );
      case 'engine':
        return (
          <InferenceEngineSelector
            selectedEngineId={config.engineId}
            selectedQuantId={config.quantId}
            onSelectEngine={(engineId) => setConfig((prev) => ({ ...prev, engineId }))}
          />
        );
      case 'gpu':
        return (
          <GpuConfigurator
            selectedGpuId={config.gpuId}
            gpuCount={config.gpuCount}
            customGpu={config.customGpu}
            engineId={config.engineId}
            selectedQuantId={config.quantId}
            onSelectGpu={handleSelectGpu}
            onChangeGpuCount={(gpuCount) => setConfig((prev) => ({ ...prev, gpuCount }))}
            onChangeEngine={(engineId) => setConfig((prev) => ({ ...prev, engineId }))}
            onUpdateCustomGpu={handleUpdateCustomGpu}
          />
        );
      case 'workload':
        return (
          <WorkloadConfigurator
            promptLen={config.promptLen}
            genLen={config.genLen}
            batchSize={config.batchSize}
            requestsPerMin={config.requestsPerMin}
            cudaOverheadGB={config.cudaOverheadGB}
            activationOverheadPct={config.activationOverheadPct}
            userProfiles={config.userProfiles}
            useMultiProfile={config.useMultiProfile}
            onChangePromptLen={(promptLen) => setConfig((prev) => ({ ...prev, promptLen }))}
            onChangeGenLen={(genLen) => setConfig((prev) => ({ ...prev, genLen }))}
            onChangeBatchSize={(batchSize) => setConfig((prev) => ({ ...prev, batchSize }))}
            onChangeRequestsPerMin={(requestsPerMin) => setConfig((prev) => ({ ...prev, requestsPerMin }))}
            onChangeCudaOverhead={(cudaOverheadGB) => setConfig((prev) => ({ ...prev, cudaOverheadGB }))}
            onChangeActivationOverhead={(activationOverheadPct) => setConfig((prev) => ({ ...prev, activationOverheadPct }))}
            onToggleMultiProfile={(useMultiProfile) => setConfig((prev) => ({ ...prev, useMultiProfile }))}
            onUpdateProfiles={(userProfiles) => setConfig((prev) => ({ ...prev, userProfiles }))}
            isMultimodal={Boolean(activeModel?.isMultimodal)}
            imageTokensPerImage={config.imageTokensPerImage ?? 1024}
            audioTokensPerSecond={config.audioTokensPerSecond ?? 50}
            perRequestImages={config.perRequestImages ?? 0}
            audioSecondsPerRequest={config.audioSecondsPerRequest ?? 0}
            onMediaChange={(patch) => setConfig((prev) => ({ ...prev, ...patch }))}
          />
        );
      case 'results':
        return (
          <ResultsPanel
            results={results}
            config={config}
            gpuVramGB={activeGpu.vramGB}
            gpuId={config.gpuId}
            prices={livePrices}
            overrides={liveOverrides}
            lastUpdated={lastUpdated}
            pricesLoading={pricesLoading}
            onChangeConfig={(updater) => setConfig(updater)}
            onCopyLink={handleCopyLink}
            onSaveScenario={() => setIsScenarioModalOpen(true)}
            onExportMarkdown={handleExportCurrent}
          />
        );
      default:
        return null;
    }
  };

  const summaryProps: { left: SummaryCell; center: SummaryCell; right: SummaryCell } =
    activeTab === 'inference'
      ? {
          left: {
            label: t('summary.vram'),
            value: `${results.isOom ? t('summary.vramOom') : t('summary.vramOk')} ${results.totalVramNeededGB.toFixed(1)} / ${results.totalVramAvailableGB} GB`,
            tone: results.isOom ? 'danger' : 'ok',
          },
          center: { label: t('summary.monthlyCost'), value: `$${results.monthlyCostUsd.toFixed(0)} ${t('summary.perMonth')}` },
          right: { label: t('summary.throughput'), value: `${results.systemThroughputTokensPerSec.toFixed(0)} tok/s` },
        }
      : {
          left: {
            label: t('summary.vram'),
            value: `${ftResults.isOom ? t('summary.vramOom') : t('summary.vramOk')} ${ftResults.totalVramNeededGB.toFixed(1)} / ${ftResults.totalVramAvailableGB} GB`,
            tone: ftResults.isOom ? 'danger' : 'ok',
          },
          center: { label: t('summary.finetuningTime'), value: ftResults.trainingTimeFormatted },
          right: { label: t('summary.monthlyCost'), value: `${ftResults.localElectricityCostTry.toFixed(0)} ₺` },
        };

  return (
    <div className="min-h-screen bg-bg text-text font-sans selection:bg-accent selection:text-bg pb-28">
      {/* Navbar */}
      <Header
        activeTab={activeTab}
        onChangeTab={handleChangeTab}
        onReset={handleReset}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-28">
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          {/* Left sidebar — scenarios */}
          <div className="w-full lg:w-72 shrink-0">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="lg:hidden w-full flex items-center justify-between px-3 py-2 text-xs font-bold font-mono uppercase tracking-wider bg-surface border-2 border-border rounded-none mb-2"
            >
              <span className="flex items-center gap-1.5">
                {sidebarOpen ? <PanelLeftClose className="w-3.5 h-3.5 text-accent" /> : <PanelLeftOpen className="w-3.5 h-3.5 text-accent" />}
                {sidebarOpen ? t('sidebar.hide') : t('sidebar.show')}
              </span>
              {sidebarOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            <div className={sidebarOpen ? 'block' : 'hidden'}>
              <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
                <ScenarioSidebar
                  onSelectPreset={handleSelectPreset}
                  onLoadScenario={handleLoadScenario}
                  onCompare={handleOpenCompare}
                  onExportScenario={handleExportSavedScenario}
                />
              </div>
            </div>
          </div>

          {/* Wizard */}
          <div className="flex-1 min-w-0">
            <Wizard
              steps={steps}
              currentIndex={stepIndex}
              maxVisited={maxVisited}
              onNavigate={goToStep}
              onNext={goNext}
              onBack={goBack}
            >
              {renderStepBody()}
            </Wizard>
          </div>
        </div>
      </main>

      <WizardSummaryBar left={summaryProps.left} center={summaryProps.center} right={summaryProps.right} />

      {/* Scenario Save Modal */}
      <ScenarioModal
        isOpen={isScenarioModalOpen}
        onClose={() => setIsScenarioModalOpen(false)}
        activeTab={activeTab}
        config={config}
        ftConfig={ftConfig}
        results={results}
        ftResults={ftResults}
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

      {/* Markdown export modal (current results or a saved scenario) */}
      <MarkdownExportModal
        isOpen={markdownExport !== null}
        onClose={() => setMarkdownExport(null)}
        data={markdownExport}
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