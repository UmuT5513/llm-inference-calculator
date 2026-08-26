import React from 'react';
import { X, Info, Calculator, Database, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import { Panel } from './ui/Panel';
import { SectionHeader } from './ui/SectionHeader';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl bg-surface border border-border rounded-md shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-3.5 py-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-accent shrink-0" />
            <h2 className="text-[11px] font-bold font-mono uppercase tracking-wider text-text">
              {t('about.title')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted hover:text-text rounded-md hover:bg-surface-2 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-muted leading-relaxed">
            <Trans i18nKey="about.intro" components={{ strong: <span className="text-text font-semibold" /> }} />
          </p>

          <Panel className="overflow-hidden">
            <SectionHeader
              title={t('about.inferenceTitle')}
              right={<Calculator className="w-4 h-4 text-accent shrink-0" />}
            />
            <ul className="p-3.5 space-y-2 text-xs text-muted list-disc list-inside marker:text-accent">
              <li>
                <Trans i18nKey="about.inf1" components={{ b: <span className="text-text font-medium" /> }} />
              </li>
              <li>
                <Trans i18nKey="about.inf2" components={{ b: <span className="text-text font-medium" /> }} />
              </li>
              <li>
                <Trans i18nKey="about.inf3" components={{ b: <span className="text-text font-medium" /> }} />
              </li>
              <li>
                <Trans i18nKey="about.inf4" components={{ b: <span className="text-text font-medium" /> }} />
              </li>
              <li>
                <Trans i18nKey="about.inf5" components={{ b: <span className="text-text font-medium" /> }} />
              </li>
              <li>
                <Trans i18nKey="about.inf6" components={{ b: <span className="text-text font-medium" /> }} />
              </li>
            </ul>
          </Panel>

          <Panel className="overflow-hidden">
            <SectionHeader
              title={t('about.finetuningTitle')}
              right={<Calculator className="w-4 h-4 text-accent shrink-0" />}
            />
            <ul className="p-3.5 space-y-2 text-xs text-muted list-disc list-inside marker:text-accent">
              <li>{t('about.ft1')}</li>
              <li>{t('about.ft2')}</li>
            </ul>
          </Panel>

          <Panel className="overflow-hidden">
            <SectionHeader
              title={t('about.dataTitle')}
              right={<Database className="w-4 h-4 text-accent shrink-0" />}
            />
            <ul className="p-3.5 space-y-2 text-xs text-muted list-disc list-inside marker:text-accent">
              <li>{t('about.data1')}</li>
              <li>{t('about.data2')}</li>
              <li>{t('about.data3')}</li>
            </ul>
          </Panel>

          <div className="flex items-start gap-2.5 bg-surface-2 border border-border rounded-md p-3.5">
            <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <p className="text-xs text-muted leading-relaxed">
              <Trans i18nKey="about.warning" components={{ strong: <span className="text-text font-semibold" /> }} />
            </p>
          </div>

          <div className="flex items-start gap-2.5 bg-surface-2 border border-border rounded-md p-3.5">
            <ShieldCheck className="w-4 h-4 text-ok shrink-0 mt-0.5" />
            <p className="text-xs text-muted leading-relaxed">
              <Trans i18nKey="about.privacy" components={{ strong: <span className="text-text font-semibold" /> }} />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
