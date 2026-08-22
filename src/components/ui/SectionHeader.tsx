import React from 'react';

interface SectionHeaderProps {
  index?: string;
  title: string;
  description?: string;
  right?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ index, title, description, right }) => {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-3.5 py-2">
      <div className="flex items-center gap-2.5 min-w-0">
        {index && <span className="text-[11px] font-bold font-mono text-accent shrink-0">▸ {index}</span>}
        <div className="min-w-0">
          <h2 className="text-[11px] font-bold font-mono uppercase tracking-wider text-text">{title}</h2>
          {description && <p className="text-[11px] text-muted mt-0.5">{description}</p>}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
};