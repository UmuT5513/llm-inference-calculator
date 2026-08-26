import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FineTuningResults } from '../types';
import { Panel } from './ui/Panel';
import { SectionHeader } from './ui/SectionHeader';
import { Tabs } from './ui/Tabs';
import { Check, Copy } from 'lucide-react';

interface FineTuningCodeExportProps {
  results: FineTuningResults;
}

type CodeTab = 'unsloth' | 'hf' | 'axolotl' | 'jsonl';

export const FineTuningCodeExport: React.FC<FineTuningCodeExportProps> = ({ results }) => {
  const { t } = useTranslation();
  const [activeCodeTab, setActiveCodeTab] = useState<CodeTab>('unsloth');

  const CODE_TABS: { id: CodeTab; label: string }[] = [
    { id: 'unsloth', label: t('ft.code.tabUnsloth') },
    { id: 'hf', label: t('ft.code.tabHf') },
    { id: 'axolotl', label: t('ft.code.tabAxolotl') },
    { id: 'jsonl', label: t('ft.code.tabJsonl') },
  ];
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const handleCopyCode = () => {
    let text = results.unslothPythonCode;
    if (activeCodeTab === 'hf') text = results.hfTrlScriptCode;
    if (activeCodeTab === 'axolotl') text = results.axolotlYamlCode;
    if (activeCodeTab === 'jsonl') text = results.datasetTemplateJsonl;

    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <Panel>
      <SectionHeader
        title={t('ft.code.title')}
        description={t('ft.code.subtitle')}
        right={
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-text bg-surface-2 hover:bg-surface border border-border rounded-md transition cursor-pointer shrink-0"
          >
            {copiedCode ? (
              <>
                <Check className="w-3.5 h-3.5 text-ok" />
                <span className="text-ok font-bold">{t('ft.code.copied')}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-muted" />
                <span>{t('ft.code.copyCode')}</span>
              </>
            )}
          </button>
        }
      />

      <Tabs
        tabs={CODE_TABS}
        active={activeCodeTab}
        onChange={(id) => setActiveCodeTab(id as CodeTab)}
        className="mt-2"
      />

      <div className="p-3.5">
        <pre className="bg-surface-2 border border-border rounded p-3 text-[11px] font-mono text-text overflow-x-auto max-h-96 whitespace-pre-wrap leading-relaxed">
          {activeCodeTab === 'unsloth' && results.unslothPythonCode}
          {activeCodeTab === 'hf' && results.hfTrlScriptCode}
          {activeCodeTab === 'axolotl' && results.axolotlYamlCode}
          {activeCodeTab === 'jsonl' && results.datasetTemplateJsonl}
        </pre>
      </div>
    </Panel>
  );
};