import React from 'react';

interface NumberInputProps {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  placeholder?: string;
  className?: string;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  step,
  min,
  max,
  placeholder,
  className = '',
}) => {
  return (
    <input
      type="number"
      step={step}
      min={min}
      max={max}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className={`w-full bg-surface-2 border border-border rounded px-2.5 py-1.5 text-xs font-mono text-text placeholder-muted focus:outline-none focus:border-accent ${className}`}
    />
  );
};