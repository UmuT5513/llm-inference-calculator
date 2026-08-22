import React from 'react';

interface SelectProps<T extends string | number> {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}

export function Select<T extends string | number>({ value, onChange, options, className = '' }: SelectProps<T>) {
  const numeric = typeof value === 'number';
  return (
    <select
      value={value}
      onChange={(e) => {
        const raw = e.target.value;
        onChange((numeric ? Number(raw) : raw) as T);
      }}
      className={`w-full bg-surface-2 border border-border rounded px-2.5 py-1.5 text-xs font-mono text-text focus:outline-none focus:border-accent ${className}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-surface text-text">
          {o.label}
        </option>
      ))}
    </select>
  );
}