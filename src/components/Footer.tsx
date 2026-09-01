import React from 'react';
import { useTranslation } from 'react-i18next';
import { Github, Linkedin, Newspaper, MessageSquareWarning, Info, ShieldCheck } from 'lucide-react';

const REPO_URL = 'https://github.com/UmuT5513/llm-inference-calculator';
const ISSUES_URL = `${REPO_URL}/issues`;
const LINKEDIN_URL = 'https://www.linkedin.com/in/umut-a%C4%9Fr%C4%B1man';
const MEDIUM_URL = 'https://medium.com/@kazloo';

interface FooterProps {
  onOpenAbout: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAbout }) => {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-border mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted text-center sm:text-left max-w-xl">
            <span className="font-semibold text-text">LLM Hardware & Cost Architect</span> — {t('footer.description')}
          </p>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              title={t('footer.sourceCodeTitle')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted bg-surface-2 hover:bg-surface border-2 border-border rounded-none transition-colors hover:text-text"
            >
              <Github className="w-3.5 h-3.5" />
              GitHub
            </a>
            <a
              href={ISSUES_URL}
              target="_blank"
              rel="noopener noreferrer"
              title={t('footer.feedbackTitle')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted bg-surface-2 hover:bg-surface border-2 border-border rounded-none transition-colors hover:text-text"
            >
              <MessageSquareWarning className="w-3.5 h-3.5 text-accent" />
              {t('footer.feedback')}
            </a>
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="LinkedIn"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted bg-surface-2 hover:bg-surface border-2 border-border rounded-none transition-colors hover:text-text"
            >
              <Linkedin className="w-3.5 h-3.5" />
              LinkedIn
            </a>
            <a
              href={MEDIUM_URL}
              target="_blank"
              rel="noopener noreferrer"
              title={t('footer.mediumTitle')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted bg-surface-2 hover:bg-surface border-2 border-border rounded-none transition-colors hover:text-text"
            >
              <Newspaper className="w-3.5 h-3.5" />
              Medium
            </a>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-border pt-4">
          <p className="flex items-center gap-1.5 text-[11px] text-muted">
            <ShieldCheck className="w-3.5 h-3.5 text-ok shrink-0" />
            {t('footer.privacy')}
          </p>
          <button
            onClick={onOpenAbout}
            className="flex items-center gap-1.5 text-[11px] font-medium text-muted hover:text-text transition-colors cursor-pointer"
          >
            <Info className="w-3.5 h-3.5" />
            {t('footer.about')}
          </button>
        </div>
      </div>
    </footer>
  );
};
