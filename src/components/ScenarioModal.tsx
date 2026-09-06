import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CalculatorConfig, CalculationResults, FineTuningConfig, FineTuningResults } from '../types';
import { saveScenario } from '../utils/scenarioStorage';

interface ScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'inference' | 'finetuning';
  config: CalculatorConfig;
  ftConfig: FineTuningConfig;
  results: CalculationResults;
  ftResults: FineTuningResults;
}

export const ScenarioModal: React.FC<ScenarioModalProps> = ({
  isOpen,
  onClose,
  activeTab,
  config,
  ftConfig,
  results,
  ftResults,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!name.trim()) {
      setError(t('scenarios.errorNameRequired'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const type = activeTab;
      saveScenario({
        type,
        name: name.trim(),
        description: description.trim() || null,
        config: type === 'inference' ? config : ftConfig,
        results: type === 'inference' ? results : ftResults,
      });
      setName('');
      setDescription('');
      onClose();
    } catch {
      setError(t('scenarios.errorSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-lg bg-surface border border-border rounded-md shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-3.5 py-2">
          <h2 className="text-[11px] font-bold font-mono uppercase tracking-wider text-text">
            {t('scenarios.saveTitle')}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-muted hover:text-text rounded-md hover:bg-surface-2 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="text-[11px] text-muted">
            {t('scenarios.saveSectionTitle', {
              type: activeTab === 'inference' ? t('scenarios.typeInference') : t('scenarios.typeFinetuning'),
            })}
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('scenarios.namePlaceholder')}
            autoFocus
            className="w-full px-3 py-2 text-sm bg-surface-2 border border-border rounded-md text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('scenarios.descriptionPlaceholder')}
            rows={2}
            className="w-full px-3 py-2 text-sm bg-surface-2 border border-border rounded-md text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
          />

          {error && <p className="text-xs text-danger font-medium">{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2 text-sm font-bold text-bg bg-accent hover:bg-accent/90 rounded-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? t('scenarios.saving') : t('scenarios.saveButton')}
          </button>

          <p className="text-[10px] text-muted/70 text-center">
            {t('scenarios.storageNote')}
          </p>
        </div>
      </div>
    </div>
  );
};