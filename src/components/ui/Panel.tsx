import React from 'react';

interface PanelProps {
  children?: React.ReactNode;
  className?: string;
}

export const Panel: React.FC<PanelProps> = ({ children, className = '' }) => {
  return <section className={`bg-surface border border-border rounded-md ${className}`}>{children}</section>;
};