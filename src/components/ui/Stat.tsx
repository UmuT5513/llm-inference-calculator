import React from 'react';

interface StatProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: 'default' | 'ok' | 'danger' | 'accent';
}

const TONES: Record<NonNullable<StatProps['tone']>, string> = {
  default: 'text-text',
  ok: 'text-ok',
  danger: 'text-danger',
  accent: 'bg-accent text-bg',
};

export const Stat: React.FC<StatProps> = ({ label, value, sub, tone = 'default' }) => {
  return (
    <div className="border-2 border-border rounded-none p-2.5 bg-surface-2">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted">{label}</div>
      <div className={`text-lg font-bold font-mono leading-tight mt-0.5 ${TONES[tone]}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted font-mono mt-0.5">{sub}</div>}
    </div>
  );
};