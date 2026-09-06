import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, FileDown, X } from 'lucide-react';
import { CalculatorConfig, CalculationResults, FineTuningConfig, FineTuningResults } from '../types';
import { buildInferenceMarkdown, buildFineTuningMarkdown } from '../utils/scenarioMarkdown';
import { copyText, downloadText } from '../utils/clipboard';

export interface MarkdownExportData {
  type: 'inference' | 'finetuning';
  name?: string;
  config: CalculatorConfig | FineTuningConfig;
  results: CalculationResults | FineTuningResults;
}

interface MarkdownExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: MarkdownExportData | null;
}

export const MarkdownExportModal: React.FC<MarkdownExportModalProps> = ({ isOpen, onClose, data }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  if (!isOpen || !data) return null;

  const markdown =
    data.type === 'inference'
      ? buildInferenceMarkdown(data.config as CalculatorConfig, data.results as CalculationResults, data.name)
      : buildFineTuningMarkdown(data.config as FineTuningConfig, data.results as FineTuningResults, data.name);

  const filename = `${(data.name || (data.type === 'inference' ? 'inference' : 'finetuning'))
    .toLowerCase()
    .replace(/[^a-z0-9çğıöşü]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'senaryo'}.md`;

  const handleCopy = () => {
    copyText(markdown, t('export.copy'));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    downloadText(filename, markdown, 'text/markdown;charset=utf-8');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-md max-w-3xl w-full max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-3 border-b border-border px-3.5 py-2">
          <div className="flex items-center gap-2 text-text font-bold text-[11px] font-mono uppercase tracking-wider">
            <FileDown className="w-4 h-4 text-accent" />
            {t('export.markdownTitle')}
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-text text-sm font-bold w-7 h-7 flex items-center justify-center rounded-md hover:bg-surface-2 transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] text-muted">{data.name && <strong className="text-text">{data.name}</strong>}</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium text-text bg-surface-2 hover:bg-surface border border-border rounded-md transition cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-ok" />
                    <span className="text-ok font-bold">{t('export.copied')}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-muted" />
                    <span>{t('export.copy')}</span>
                  </>
                )}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-bg bg-accent rounded-md hover:opacity-90 transition cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5" />
                {t('export.download')}
              </button>
            </div>
          </div>

          <pre className="bg-surface-2 border border-border rounded p-3 text-[11px] font-mono text-text overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {markdown}
          </pre>
        </div>
      </div>
    </div>
  );
};