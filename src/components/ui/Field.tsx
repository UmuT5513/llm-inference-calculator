import React from 'react';

interface FieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export const Field: React.FC<FieldProps> = ({ label, children, className = '' }) => {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[10px] font-mono uppercase tracking-wider text-muted">{label}</span>
      {children}
    </label>
  );
};