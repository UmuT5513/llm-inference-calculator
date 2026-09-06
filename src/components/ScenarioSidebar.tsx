import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, ChevronDown, ChevronRight, Trash2, ArrowUpRight, Scale, FileDown, FolderOpen } from 'lucide-react';
import { PresetScenario } from '../types';
import { PRESET_SCENARIOS } from '../data/presets';
import {
  SavedScenario,
  listScenarios,
  deleteScenario as removeScenario,
  SCENARIOS_CHANGED_EVENT,
} from '../utils/scenarioStorage';
import { Badge } from './ui/Badge';

interface ScenarioSidebarProps {
  onSelectPreset: (preset: PresetScenario) => void;
  onLoadScenario: (type: 'inference' | 'finetuning', config: any, results: any) => void;
  onCompare: (ids?: string[]) => void;
  onExportScenario: (scenario: SavedScenario) => void;
}

const fmtNum = (v: number | undefined | null, digits = 1) =>
  v == null || Number.isNaN(v) ? '—' : v.toLocaleString('tr-TR', { maximumFractionDigits: digits });

export const ScenarioSidebar: React.FC<ScenarioSidebarProps> = ({
  onSelectPreset,
  onLoadScenario,
  onCompare,
  onExportScenario,
}) => {
  const { t } = useTranslation();
  const [scenarios, setScenarios] = useState<SavedScenario[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const refresh = () => setScenarios(listScenarios());

  useEffect(() => {
    refresh();
    window.addEventListener(SCENARIOS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(SCENARIOS_CHANGED_EVENT, refresh);
  }, []);

  const toggleExpand = (id: string) => setExpandedId((cur) => (cur === id ? null : id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(t('scenarios.deleteConfirm'))) return;
    removeScenario(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setExpandedId(null);
  };

  const summaryFor = (s: SavedScenario): string => {
    if (s.type === 'inference') {
      const r = s.results as any;
      return `${fmtNum(r.totalVramNeededGB)} GB VRAM • $${(r.monthlyCostUsd ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}/ay`;
    }
    const r = s.results as any;
    return `${fmtNum(r.totalVramNeededGB)} GB VRAM • ${r.trainingTimeFormatted ?? ''}`;
  };

  return (
    <aside className="flex flex-col gap-3">
      {/* Templates */}
      <section className="bg-surface border border-border rounded-md overflow-hidden">
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border">
          <Zap className="w-3.5 h-3.5 text-accent" />
          <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-text">
            {t('header.scenarioTemplates')}
          </span>
        </div>
        <div className="p-2 space-y-1 max-h-56 overflow-y-auto">
          {PRESET_SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelectPreset(s)}
              className="w-full text-left px-2.5 py-2 rounded-md hover:bg-surface-2 border border-transparent hover:border-border transition text-[11px] flex flex-col gap-0.5"
            >
              <span className="font-semibold text-accent">{t(`scenarios.${s.id}.title`, s.title)}</span>
              <span className="text-[10px] text-muted line-clamp-1">{t(`scenarios.${s.id}.description`, s.description)}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Saved scenarios */}
      <section className="bg-surface border border-border rounded-md overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <div className="flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5 text-accent" />
            <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-text">
              {t('scenarios.title')}
            </span>
            <Badge tone="default">{scenarios.length}</Badge>
          </div>
          {selectedIds.size > 0 && (
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-[10px] text-muted hover:text-text"
            >
              ✕
            </button>
          )}
        </div>

        <div className="p-2 space-y-1 max-h-[46vh] overflow-y-auto">
          {scenarios.length === 0 && (
            <p className="text-[11px] text-muted text-center py-5 px-2">
              {t('scenarios.empty')}
            </p>
          )}

          {scenarios.map((s) => {
            const isExpanded = expandedId === s.id;
            const isChecked = selectedIds.has(s.id);
            return (
              <div key={s.id} className="border border-border rounded-md overflow-hidden bg-surface">
                <div
                  className={`flex items-center gap-2 px-2.5 py-2 cursor-pointer transition ${
                    isChecked ? 'bg-surface-2' : 'hover:bg-surface-2'
                  }`}
                  onClick={() => toggleExpand(s.id)}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(s.id);
                    }}
                    onChange={() => {}}
                    className="accent-[#FFB224] shrink-0"
                    title={t('scenarios.selectForCompare')}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-text truncate">{s.name}</span>
                      <Badge tone={s.type === 'inference' ? 'accent' : 'default'}>
                        {s.type === 'inference' ? t('scenarios.typeInference') : t('scenarios.typeFinetuning')}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted font-mono mt-0.5">{summaryFor(s)}</p>
                    <p className="text-[9px] text-muted/70 mt-0.5">
                      {t('scenarios.updated', { date: new Date(s.updated_at).toLocaleString('tr-TR') })}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-muted shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-muted shrink-0" />
                  )}
                </div>

                {/* Expanded detail mini-panel */}
                {isExpanded && (
                  <div className="px-3 py-2.5 border-t border-border bg-surface-2/60 space-y-2">
                    {s.description && (
                      <p className="text-[10px] text-muted leading-snug">{s.description}</p>
                    )}
                    <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                      {s.type === 'inference' ? (
                        <>
                          <div className="bg-surface border border-border rounded px-2 py-1">
                            <span className="text-muted">{t('scenarios.detailModel')} </span>
                            <strong className="text-text truncate block">{((s.results as any).modelName ?? '—')}</strong>
                          </div>
                          <div className="bg-surface border border-border rounded px-2 py-1">
                            <span className="text-muted">{t('scenarios.detailEngine')} </span>
                            <strong className="text-text block truncate">{((s.results as any).engineName ?? '—')}</strong>
                          </div>
                          <div className="bg-surface border border-border rounded px-2 py-1 col-span-2">
                            <span className="text-muted">{t('scenarios.detailTtft')} </span>
                            <strong className="text-text">{fmtNum((s.results as any).ttftMs, 0)} ms</strong>
                            <span className="text-muted"> • TPOT: </span>
                            <strong className="text-text">{fmtNum((s.results as any).tpotMs, 1)} ms</strong>
                            <span className="text-muted"> • {t('scenarios.detailThroughput')} </span>
                            <strong className="text-text">{fmtNum((s.results as any).systemThroughputTokensPerSec, 0)} tok/sn</strong>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="bg-surface border border-border rounded px-2 py-1">
                            <span className="text-muted">{t('scenarios.detailDuration')} </span>
                            <strong className="text-text">{(s.results as any).trainingTimeFormatted ?? '—'}</strong>
                          </div>
                          <div className="bg-surface border border-border rounded px-2 py-1">
                            <span className="text-muted">{t('scenarios.detailMethod')} </span>
                            <strong className="text-text block truncate">{((s.results as any).methodName ?? '—')}</strong>
                          </div>
                          <div className="bg-surface border border-border rounded px-2 py-1 col-span-2">
                            <span className="text-muted">{t('scenarios.detailSamples')} </span>
                            <strong className="text-text">{fmtNum((s.results as any).totalSamples, 0)}</strong>
                            <span className="text-muted"> • {t('scenarios.detailCheapest')} </span>
                            <strong className="text-text">{(s.results as any).cheapestPlatform?.platformName ?? '—'}</strong>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Actions; MD export lives at the end of this mini-panel */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <button
                        onClick={() => onLoadScenario(s.type, s.config, s.results)}
                        className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-bg bg-accent rounded-md hover:opacity-90 transition"
                      >
                        <ArrowUpRight className="w-3 h-3" />
                        {t('scenarios.loadTitle')}
                      </button>
                      <button
                        onClick={() => onExportScenario(s)}
                        className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-text bg-surface-2 border border-border rounded-md hover:bg-surface transition"
                      >
                        <FileDown className="w-3 h-3" />
                        {t('scenarios.exportMarkdown')}
                      </button>
                      <button
                        onClick={(e) => handleDelete(s.id, e)}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-danger/70 border border-transparent rounded-md hover:bg-surface hover:text-danger transition"
                      >
                        <Trash2 className="w-3 h-3" />
                        {t('scenarios.deleteTitle')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Compare button below the list */}
        <div className="p-2 border-t border-border">
          <button
            onClick={() => onCompare([...selectedIds])}
            disabled={selectedIds.size < 2}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded-md transition disabled:opacity-40 bg-surface-2 border border-border text-text hover:bg-surface"
            title={t('scenarios.compareTitle')}
          >
            <Scale className="w-3.5 h-3.5 text-accent" />
            {selectedIds.size >= 2
              ? t('scenarios.compareCount', { count: selectedIds.size })
              : t('scenarios.compareMin')}
          </button>
          <p className="text-[9px] text-muted/70 text-center mt-1.5">
            {t('scenarios.storageNote')}
          </p>
        </div>
      </section>
    </aside>
  );
};