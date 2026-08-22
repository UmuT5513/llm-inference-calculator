import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';

interface CollapseProps {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export const Collapse: React.FC<CollapseProps> = ({ title, subtitle, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-md bg-surface">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span className="flex items-center gap-2 min-w-0">
          <ChevronRight
            className={`w-3.5 h-3.5 text-muted transition-transform shrink-0 ${open ? 'rotate-90' : ''}`}
          />
          <span className="text-[11px] font-mono uppercase tracking-wider text-text truncate">{title}</span>
          {subtitle && <span className="text-[10px] text-muted font-mono shrink-0">{subtitle}</span>}
        </span>
      </button>
      {open && <div className="border-t border-border px-3 py-3">{children}</div>}
    </div>
  );
};