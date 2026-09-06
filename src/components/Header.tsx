import React from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { Badge } from './ui/Badge';
import { LanguageSwitcher } from './LanguageSwitcher';

interface HeaderProps {
  activeTab: 'inference' | 'finetuning';
  onChangeTab: (tab: 'inference' | 'finetuning') => void;
  onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onChangeTab,
  onReset,
}) => {
  const { t } = useTranslation();
  return (
    <header className="bg-bg border-b border-border sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
        {/* Logo & Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-accent text-bg font-mono font-bold flex items-center justify-center text-base">∑</div>
          <div>
            <div className="font-mono font-bold text-sm tracking-tight text-text leading-none">LLM-CALC</div>
            <Badge tone="accent">Inference + Fine-Tuning</Badge>
          </div>
        </div>

        {/* Center Mode Nav Links */}
        <nav className="hidden md:flex items-center gap-6">
          {(['inference', 'finetuning'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => onChangeTab(tab)}
              className={`pb-1 font-mono text-xs font-bold uppercase tracking-wider border-b-2 transition ${
                activeTab === tab ? 'border-text text-text' : 'border-transparent text-muted hover:text-text'
              }`}
            >
              {t(tab === 'inference' ? 'header.tabInference' : 'header.tabFinetuning')}
            </button>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <button
            onClick={onReset}
            className="p-1.5 text-muted hover:text-text bg-surface-2 hover:bg-surface border-2 border-border rounded-none transition-colors"
            title={t('header.resetTitle')}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};