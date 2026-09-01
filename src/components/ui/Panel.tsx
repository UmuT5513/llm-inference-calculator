import React from 'react';

interface PanelProps {
  children?: React.ReactNode;
  className?: string;
}

export const Panel: React.FC<PanelProps> = ({ children, className = '' }) => {
  return <section className={`bg-surface border-2 border-border rounded-none ${className}`}>{children}</section>;
};