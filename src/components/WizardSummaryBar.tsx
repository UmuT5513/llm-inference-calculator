import React from 'react';

export interface SummaryCell {
  label: string;
  value: string;
  tone?: 'default' | 'ok' | 'danger' | 'accent';
}

interface WizardSummaryBarProps {
  left: SummaryCell;
  center: SummaryCell;
  right: SummaryCell;
}

const TONES: Record<NonNullable<SummaryCell['tone']>, string> = {
  default: 'text-text',
  ok: 'text-ok',
  danger: 'text-danger',
  accent: 'text-text',
};

export const WizardSummaryBar: React.FC<WizardSummaryBarProps> = ({ left, center, right }) => {
  const cells = [left, center, right];
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 border-t-2 border-border bg-surface">
      <div className="max-w-5xl mx-auto grid grid-cols-3 divide-x divide-border">
        {cells.map((c, i) => (
          <div key={i} className="px-4 py-2.5 min-w-0">
            <div className="text-[9px] font-mono uppercase tracking-wider text-muted truncate">{c.label}</div>
            <div className={`text-sm font-mono font-bold leading-tight truncate tabular-nums ${TONES[c.tone ?? 'default']}`}>
              {c.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};