import React, { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  text: string;
  title?: string;
  className?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ text, title, className = '' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className={`relative inline-flex align-middle ${className}`}>
      <button
        type="button"
        aria-label="Bilgi"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-surface-2 border border-border text-muted hover:text-text hover:border-accent/50 transition cursor-help"
      >
        <Info className="w-2.5 h-2.5" />
      </button>

      {open && (
        <span
          onClick={(e) => e.stopPropagation()}
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-64 sm:w-72 p-3 bg-surface border-2 border-border rounded-md shadow-lg text-[11px] leading-relaxed text-text"
        >
          {title && <span className="block font-bold font-mono uppercase tracking-wider text-[10px] text-accent mb-1.5">{title}</span>}
          <span className="whitespace-normal">{text}</span>
        </span>
      )}
    </span>
  );
};