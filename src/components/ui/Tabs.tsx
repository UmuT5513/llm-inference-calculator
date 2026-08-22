import React from 'react';

interface TabsProps {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, active, onChange, className = '' }) => {
  return (
    <div className={`flex items-center gap-0.5 border-b border-border px-1 overflow-x-auto scrollbar-none ${className}`}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider border-b-2 transition whitespace-nowrap ${
            active === t.id ? 'text-accent border-accent' : 'text-muted border-transparent hover:text-text'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
};