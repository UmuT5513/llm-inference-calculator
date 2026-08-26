import React, { useEffect, useState } from 'react';
import { X, Save, Trash2, ArrowUpRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CalculatorConfig, CalculationResults, FineTuningConfig, FineTuningResults } from '../types';
import { Panel } from './ui/Panel';
import { SectionHeader } from './ui/SectionHeader';
import { Badge } from './ui/Badge';
import {
  SavedScenario,
  listScenarios,
  saveScenario,
  deleteScenario as removeScenario,
} from '../utils/scenarioStorage';

interface ScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'inference' | 'finetuning';
  config: CalculatorConfig;
  ftConfig: FineTuningConfig;
  results: CalculationResults;
  ftResults: FineTuningResults;
  onLoadScenario: (type: 'inference' | 'finetuning', config: any, results: any) => void;
  onOpenCompare: (ids: string[]) => void;
}

export const ScenarioModal: React.FC<ScenarioModalProps> = ({
  isOpen,
  onClose,
  activeTab,
  config,
  ftConfig,
  results,
  ftResults,
  onLoadScenario,
  onOpenCompare,
}) => {
  const { t } = useTranslation();
  const [scenarios, setScenarios] = useState<SavedScenario[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadScenarios = () => {
    setScenarios(listScenarios());
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set());
      setError(null);
      loadScenarios();
    }
  }, [isOpen]);

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
      loadScenarios();
    } catch {
      setError(t('scenarios.errorSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    if (!window.confirm(t('scenarios.deleteConfirm'))) return;
    removeScenario(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    loadScenarios();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const compareSelected = () => {
    if (selectedIds.size < 2) {
      setError(t('scenarios.errorMinCompare'));
      return;
    }
    onOpenCompare([...selectedIds]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl bg-surface border border-border rounded-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-3.5 py-2">
          <h2 className="text-[11px] font-bold font-mono uppercase tracking-wider text-text">{t('scenarios.title')}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-muted hover:text-text rounded-md hover:bg-surface-2 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Save form */}
          <Panel className="overflow-hidden">
            <SectionHeader
              title={t('scenarios.saveSectionTitle', {
                type: activeTab === 'inference' ? t('scenarios.typeInference') : t('scenarios.typeFinetuning'),
              })}
              right={<Save className="w-4 h-4 text-accent shrink-0" />}
            />
            <div className="p-3.5 space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('scenarios.namePlaceholder')}
                className="w-full px-3 py-2 text-sm bg-surface-2 border border-border rounded-md text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('scenarios.descriptionPlaceholder')}
                rows={2}
                className="w-full px-3 py-2 text-sm bg-surface-2 border border-border rounded-md text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-2 text-sm font-bold text-bg bg-accent hover:bg-accent/90 rounded-md disabled:opacity-50 cursor-pointer"
              >
                {saving ? t('scenarios.saving') : t('scenarios.saveButton')}
              </button>
            </div>
          </Panel>

          {/* Error state */}
          {error && <p className="text-xs text-danger font-medium">{error}</p>}

          {/* Empty state */}
          {scenarios.length === 0 && (
            <p className="text-sm text-muted text-center py-6">
              {t('scenarios.empty')}
            </p>
          )}

          {scenarios.length > 0 && (
            <div className="space-y-2">
              {scenarios.map((s) => (
                <div
                  key={s.id}
                  className={`flex items-start gap-3 border rounded-md p-3 transition ${
                    selectedIds.has(s.id)
                      ? 'border-accent/50 bg-surface-2'
                      : 'bg-surface border-border hover:bg-surface-2'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(s.id)}
                    onChange={() => toggleSelect(s.id)}
                    className="mt-1 accent-[#FFB224]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-text truncate">{s.name}</span>
                      <Badge tone={s.type === 'inference' ? 'accent' : 'default'}>
                        {s.type === 'inference' ? t('scenarios.typeInference') : t('scenarios.typeFinetuning')}
                      </Badge>
                    </div>
                    {s.description && (
                      <p className="text-xs text-muted mt-0.5 line-clamp-2">{s.description}</p>
                    )}
                    <p className="text-[10px] text-muted/70 mt-1">
                      {t('scenarios.updated', { date: new Date(s.updated_at).toLocaleString('tr-TR') })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        onLoadScenario(s.type, s.config, s.results);
                        onClose();
                      }}
                      className="p-1.5 text-muted hover:text-text hover:bg-surface-2 rounded-md cursor-pointer"
                      title={t('scenarios.loadTitle')}
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-1.5 text-danger/70 hover:text-danger hover:bg-surface-2 rounded-md cursor-pointer"
                      title={t('scenarios.deleteTitle')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={compareSelected}
                disabled={selectedIds.size < 2}
                className="w-full py-2 text-sm font-bold text-bg bg-accent hover:bg-accent/90 rounded-md disabled:opacity-40 cursor-pointer"
              >
                {selectedIds.size >= 2
                  ? t('scenarios.compareCount', { count: selectedIds.size })
                  : t('scenarios.compareMin')}
              </button>
            </div>
          )}

          <p className="text-[10px] text-muted/70 text-center">
            {t('scenarios.storageNote')}
          </p>
        </div>
      </div>
    </div>
  );
};
