import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Download, RefreshCw, Zap, Save, Scale, Link2 } from 'lucide-react';
import { PresetScenario } from '../types';
import { PRESET_SCENARIOS } from '../data/presets';
import { Segmented } from './ui/Segmented';
import { Badge } from './ui/Badge';
import { LanguageSwitcher } from './LanguageSwitcher';

interface HeaderProps {
  activeTab: 'inference' | 'finetuning';
  onChangeTab: (tab: 'inference' | 'finetuning') => void;
  onSelectPreset: (preset: PresetScenario) => void;
  onOpenAiAdvisor: () => void;
  onOpenExport: () => void;
  onReset: () => void;
  onOpenSave: () => void;
  onOpenCompare: () => void;
  onCopyLink: () => string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onChangeTab,
  onSelectPreset,
  onOpenAiAdvisor,
  onOpenExport,
  onReset,
  onOpenSave,
  onOpenCompare,
  onCopyLink,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const handleCopyLink = async () => {
    const url = onCopyLink();
    try {
      await navigator.clipboard.writeText(url);
      window.history.replaceState(null, '', url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t('common.copyLink'), url);
    }
  };
  return (
    <header className="bg-bg border-b border-border sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent text-bg rounded font-mono font-bold flex items-center justify-center text-base">
            ∑
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-text font-mono tracking-tight leading-none">
                LLM Hardware & Cost Architect
              </h1>
              <Badge tone="accent">Inference + Fine-Tuning</Badge>
            </div>
            <p className="text-[11px] text-muted hidden sm:block mt-0.5">
              {t('header.subtitle')}
            </p>
          </div>
        </div>

        {/* Center Mode Switcher Tabs */}
        <div className="hidden md:block">
          <Segmented
            value={activeTab}
            onChange={onChangeTab}
            options={[
              { value: 'inference' as const, label: t('header.tabInference') },
              { value: 'finetuning' as const, label: t('header.tabFinetuning') },
            ]}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {/* Quick Presets Dropdown */}
          <div className="relative group hidden md:block">
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted bg-surface-2 hover:bg-surface border border-border rounded transition-colors hover:text-text">
              <Zap className="w-3.5 h-3.5 text-accent" />
              <span className="hidden sm:inline">{t('header.scenarios')}</span>
            </button>
            <div className="absolute right-0 mt-1 w-64 bg-surface border border-border rounded-md shadow-none p-2 hidden group-hover:block z-50">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted px-2 py-1 mb-1 border-b border-border">
                {t('header.scenarioTemplates')}
              </div>
              {PRESET_SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onSelectPreset(s)}
                  className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-surface-2 text-xs text-muted transition flex flex-col gap-0.5"
                >
                  <span className="font-semibold text-accent">{t(`scenarios.${s.id}.title`, s.title)}</span>
                  <span className="text-[10px] text-muted line-clamp-1">{t(`scenarios.${s.id}.description`, s.description)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Save Scenario Button */}
          <button
            onClick={onOpenSave}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted bg-surface-2 hover:bg-surface border border-border rounded transition-colors hover:text-text"
            title={t('header.saveTitle')}
          >
            <Save className="w-3.5 h-3.5 text-ok" />
            <span className="hidden sm:inline">{t('header.save')}</span>
          </button>

          {/* Copy Link Button */}
          <button
            onClick={() => void handleCopyLink()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted bg-surface-2 hover:bg-surface border border-border rounded transition-colors hover:text-text"
            title={t('common.copyLink')}
          >
            <Link2 className="w-3.5 h-3.5 text-accent" />
            <span className="hidden sm:inline">{copied ? t('common.copied') : t('common.copyLink')}</span>
          </button>

          {/* Compare Scenarios Button */}
          <button
            onClick={onOpenCompare}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted bg-surface-2 hover:bg-surface border border-border rounded transition-colors hover:text-text"
            title={t('header.compareTitle')}
          >
            <Scale className="w-3.5 h-3.5 text-muted" />
            <span className="hidden sm:inline">{t('header.compare')}</span>
          </button>

          {/* AI Advisor Button */}
          <button
            onClick={onOpenAiAdvisor}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-bg bg-accent hover:opacity-90 rounded font-bold transition active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-bg/70" />
            <span className="hidden sm:inline">{t('header.aiAdvisor')}</span>
          </button>

          {/* Export Button */}
          <button
            onClick={onOpenExport}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted bg-surface-2 hover:bg-surface border border-border rounded transition-colors hover:text-text"
            title={t('header.exportTitle')}
          >
            <Download className="w-3.5 h-3.5 text-muted" />
            <span>{t('header.export')}</span>
          </button>

          {/* Reset Button */}
          <button
            onClick={onReset}
            className="p-1.5 text-muted hover:text-text bg-surface-2 hover:bg-surface border border-border rounded transition-colors"
            title={t('header.resetTitle')}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

        </div>
      </div>
    </header>
  );
};