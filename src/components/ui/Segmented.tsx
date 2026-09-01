import React from 'react';

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
  className?: string;
}

export function Segmented<T extends string>({ value, onChange, options, className = '' }: SegmentedProps<T>) {
  return (
    <div className={`inline-flex bg-surface-2 border-2 border-border rounded-none p-0.5 gap-0.5 ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-2.5 py-1 text-[11px] font-mono rounded-none transition ${
            value === o.value ? 'bg-text text-bg font-bold' : 'text-muted hover:text-text'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}