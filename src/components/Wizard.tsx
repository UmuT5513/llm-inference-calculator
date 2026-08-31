import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';

export interface WizardStepDef {
  id: string;
  titleKey: string;
}

interface WizardProps {
  steps: WizardStepDef[];
  currentIndex: number;
  maxVisited: number;
  onNavigate: (index: number) => void;
  onNext: () => void;
  onBack: () => void;
  children?: React.ReactNode;
}

export const Wizard: React.FC<WizardProps> = ({
  steps,
  currentIndex,
  maxVisited,
  onNavigate,
  onNext,
  onBack,
  children,
}) => {
  const { t } = useTranslation();
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === steps.length - 1;

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap items-stretch border-2 border-border bg-surface divide-x divide-border">
        {steps.map((s, i) => {
          const isActive = i === currentIndex;
          const isDone = i < currentIndex;
          const isClickable = i <= maxVisited;
          return (
            <button
              key={s.id}
              onClick={() => isClickable && onNavigate(i)}
              disabled={!isClickable}
              className={`flex-1 min-w-[110px] flex items-center gap-1.5 px-3 py-2.5 text-left transition ${
                isActive
                  ? 'bg-text text-bg'
                  : isClickable
                    ? 'bg-surface hover:bg-surface-2 text-text'
                    : 'bg-surface text-muted cursor-not-allowed'
              }`}
            >
              <span className="font-mono text-[11px] font-bold">{String(i + 1).padStart(2, '0')}</span>
              {isDone && <Check className="w-3.5 h-3.5" />}
              <span className="font-mono text-[11px] uppercase tracking-wider truncate">{t(s.titleKey)}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-2 border-border bg-surface">{children}</div>

      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          disabled={isFirst}
          className="px-4 py-2 border-2 border-border bg-surface-2 text-text font-mono text-xs font-bold hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t('wizard.back')}
        </button>
        {!isLast && (
          <button
            onClick={onNext}
            className="px-4 py-2 border-2 border-border bg-accent text-bg font-mono text-xs font-bold hover:opacity-90"
          >
            {t('wizard.next')}
          </button>
        )}
      </div>
    </div>
  );
};