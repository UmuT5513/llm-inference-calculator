import React from 'react';

interface BadgeProps {
  tone?: 'default' | 'accent' | 'ok' | 'danger';
  children: React.ReactNode;
  title?: string;
  className?: string;
}

const TONES: Record<NonNullable<BadgeProps['tone']>, string> = {
  default: 'text-muted bg-surface-2 border-border',
  accent: 'text-accent bg-surface-2 border-accent/40',
  ok: 'text-ok bg-surface-2 border-ok/40',
  danger: 'text-danger bg-surface-2 border-danger/40',
};

export const Badge: React.FC<BadgeProps> = ({ tone = 'default', children, title, className = '' }) => {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono font-semibold border rounded ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
};