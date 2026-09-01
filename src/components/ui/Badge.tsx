import React from 'react';

interface BadgeProps {
  tone?: 'default' | 'accent' | 'ok' | 'danger';
  children: React.ReactNode;
  title?: string;
  className?: string;
}

const TONES: Record<NonNullable<BadgeProps['tone']>, string> = {
  default: 'text-muted bg-surface-2 border-border',
  accent: 'text-bg bg-accent border-border',
  ok: 'text-ok bg-surface-2 border-border',
  danger: 'text-danger bg-surface-2 border-border',
};

export const Badge: React.FC<BadgeProps> = ({ tone = 'default', children, title, className = '' }) => {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono font-semibold border-2 rounded-none ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
};