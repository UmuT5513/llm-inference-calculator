import React from 'react';
import { useTranslation } from 'react-i18next';

const LANGS = ['tr', 'en'] as const;

export const LanguageSwitcher: React.FC = () => {
  const { t, i18n } = useTranslation();
  const current = i18n.resolvedLanguage === 'tr' ? 'tr' : 'en';

  return (
    <div
      role="group"
      aria-label={t('header.language')}
      className="flex items-center rounded border border-border overflow-hidden"
    >
      {LANGS.map((lng) => (
        <button
          key={lng}
          onClick={() => void i18n.changeLanguage(lng)}
          className={`px-2 py-1.5 text-[11px] font-bold uppercase transition-colors ${
            current === lng
              ? 'bg-accent text-bg'
              : 'bg-surface-2 text-muted hover:text-text'
          }`}
        >
          {lng}
        </button>
      ))}
    </div>
  );
};
