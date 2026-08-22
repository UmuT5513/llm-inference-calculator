import React, { useState } from 'react';
import { FineTuningResults } from '../types';
import { Panel } from './ui/Panel';
import { SectionHeader } from './ui/SectionHeader';
import { Tabs } from './ui/Tabs';
import { Check, Copy } from 'lucide-react';

interface FineTuningCodeExportProps {
  results: FineTuningResults;
}

type CodeTab = 'unsloth' | 'hf' | 'axolotl' | 'jsonl';

const CODE_TABS: { id: CodeTab; label: string }[] = [
  { id: 'unsloth', label: 'Unsloth (Google Colab / Jupyter)' },
  { id: 'hf', label: 'HuggingFace TRL + SFTTrainer' },
  { id: 'axolotl', label: 'Axolotl YAML Config' },
  { id: 'jsonl', label: 'Veri Seti Şablonu (dataset.jsonl)' },
];

export const FineTuningCodeExport: React.FC<FineTuningCodeExportProps> = ({ results }) => {
  const [activeCodeTab, setActiveCodeTab] = useState<CodeTab>('unsloth');
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
        title="Hazır Eğitim Scripti & Google Colab Kodu"
        description="Otomatik optimize edilen hiperparametrelerle tek tıkla çalıştırılabilir Python/YAML eğitim kodları"
        right={
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-text bg-surface-2 hover:bg-surface border border-border rounded-md transition cursor-pointer shrink-0"
          >
            {copiedCode ? (
              <>
                <Check className="w-3.5 h-3.5 text-ok" />
                <span className="text-ok font-bold">Kopyalandı</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-muted" />
                <span>Kodu Kopyala</span>
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