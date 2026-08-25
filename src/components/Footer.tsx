import React from 'react';
import { Github, Linkedin, Newspaper, MessageSquareWarning, Info, ShieldCheck } from 'lucide-react';

const REPO_URL = 'https://github.com/UmuT5513/llm-inference-calculator';
const ISSUES_URL = `${REPO_URL}/issues`;
const LINKEDIN_URL = 'https://www.linkedin.com/in/umut-ağrıman';
const MEDIUM_URL = 'https://medium.com/@kazloo';

interface FooterProps {
  onOpenAbout: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAbout }) => {
  return (
    <footer className="border-t border-border mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted text-center sm:text-left max-w-xl">
            <span className="font-semibold text-text">LLM Hardware & Cost Architect</span> — LLM çıkarım
            (inference) ve fine-tuning donanım/maliyet hesaplayıcısı. Topluluğa açık, ücretsiz bir
            projedir; katkılarınız ve geri bildirimleriniz için GitHub üzerinden ulaşabilirsiniz.
          </p>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="Kaynak kodu (GitHub)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted bg-surface-2 hover:bg-surface border border-border rounded transition-colors hover:text-text"
            >
              <Github className="w-3.5 h-3.5" />
              GitHub
            </a>
            <a
              href={ISSUES_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="Hata bildir veya öneri ver"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted bg-surface-2 hover:bg-surface border border-border rounded transition-colors hover:text-text"
            >
              <MessageSquareWarning className="w-3.5 h-3.5 text-accent" />
              Geri Bildirim
            </a>
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="LinkedIn"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted bg-surface-2 hover:bg-surface border border-border rounded transition-colors hover:text-text"
            >
              <Linkedin className="w-3.5 h-3.5" />
              LinkedIn
            </a>
            <a
              href={MEDIUM_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="Medium yazıları"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted bg-surface-2 hover:bg-surface border border-border rounded transition-colors hover:text-text"
            >
              <Newspaper className="w-3.5 h-3.5" />
              Medium
            </a>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-border pt-4">
          <p className="flex items-center gap-1.5 text-[11px] text-muted">
            <ShieldCheck className="w-3.5 h-3.5 text-ok shrink-0" />
            Kişisel veri toplanmaz; kaydettiğiniz senaryolar yalnızca kendi tarayıcınızda saklanır.
          </p>
          <button
            onClick={onOpenAbout}
            className="flex items-center gap-1.5 text-[11px] font-medium text-muted hover:text-text transition-colors cursor-pointer"
          >
            <Info className="w-3.5 h-3.5" />
            Metodoloji & Hakkında
          </button>
        </div>
      </div>
    </footer>
  );
};
