import React from 'react';
import { Sparkles, Download, RefreshCw, Zap, LogIn, LogOut, Save, Scale, Shield } from 'lucide-react';
import { PresetScenario } from '../types';
import { PRESET_SCENARIOS } from '../data/presets';
import { AuthUser } from '../auth/AuthContext';
import { Segmented } from './ui/Segmented';
import { Badge } from './ui/Badge';

interface HeaderProps {
  activeTab: 'inference' | 'finetuning';
  onChangeTab: (tab: 'inference' | 'finetuning') => void;
  onSelectPreset: (preset: PresetScenario) => void;
  onOpenAiAdvisor: () => void;
  onOpenExport: () => void;
  onReset: () => void;
  onOpenSave: () => void;
  onOpenCompare: () => void;
  onOpenAdmin: () => void;
  user: AuthUser | null;
  onLogin: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onChangeTab,
  onSelectPreset,
  onOpenAiAdvisor,
  onOpenExport,
  onReset,
  onOpenSave,
  onOpenCompare,
  onOpenAdmin,
  user,
  onLogin,
  onLogout,
}) => {
  return (
    <header className="bg-bg border-b border-border sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent text-bg rounded font-mono font-bold flex items-center justify-center text-base">
            ∑
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-text font-mono tracking-tight leading-none">
                LLM Hardware & Cost Architect
              </h1>
              <Badge tone="accent">Inference + Fine-Tuning</Badge>
            </div>
            <p className="text-[11px] text-muted hidden sm:block mt-0.5">
              Çıkarım (Inference) Sizing • Fine-Tuning Maliyeti • Unsloth • Colab & Cloud TCO
            </p>
          </div>
        </div>

        {/* Center Mode Switcher Tabs */}
        <div className="hidden md:block">
          <Segmented
            value={activeTab}
            onChange={onChangeTab}
            options={[
              { value: 'inference' as const, label: '1. Çıkarım' },
              { value: 'finetuning' as const, label: '2. Fine-Tuning' },
            ]}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Quick Presets Dropdown */}
          <div className="relative group hidden md:block">
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted bg-surface-2 hover:bg-surface border border-border rounded transition-colors hover:text-text">
              <Zap className="w-3.5 h-3.5 text-accent" />
              <span className="hidden sm:inline">Senaryolar</span>
            </button>
            <div className="absolute right-0 mt-1 w-64 bg-surface border border-border rounded-md shadow-none p-2 hidden group-hover:block z-50">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted px-2 py-1 mb-1 border-b border-border">
                Senaryo Şablonları
              </div>
              {PRESET_SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onSelectPreset(s)}
                  className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-surface-2 text-xs text-muted transition flex flex-col gap-0.5"
                >
                  <span className="font-semibold text-accent">{s.title}</span>
                  <span className="text-[10px] text-muted line-clamp-1">{s.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Save Scenario Button */}
          <button
            onClick={onOpenSave}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted bg-surface-2 hover:bg-surface border border-border rounded transition-colors hover:text-text"
            title="Senaryo kaydet / yönet"
          >
            <Save className="w-3.5 h-3.5 text-ok" />
            <span className="hidden sm:inline">Kaydet</span>
          </button>

          {/* Compare Scenarios Button */}
          <button
            onClick={onOpenCompare}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted bg-surface-2 hover:bg-surface border border-border rounded transition-colors hover:text-text"
            title="Senaryoları karşılaştır"
          >
            <Scale className="w-3.5 h-3.5 text-muted" />
            <span className="hidden sm:inline">Karşılaştır</span>
          </button>

          {/* AI Advisor Button */}
          <button
            onClick={onOpenAiAdvisor}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-bg bg-accent hover:opacity-90 rounded font-bold transition active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-bg/70" />
            <span className="hidden sm:inline">AI Mimar</span>
          </button>

          {/* Export Button */}
          <button
            onClick={onOpenExport}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted bg-surface-2 hover:bg-surface border border-border rounded transition-colors hover:text-text"
            title="Konfigürasyon ve Komut Çıktısı Al"
          >
            <Download className="w-3.5 h-3.5 text-muted" />
            <span>Dışa Aktar</span>
          </button>

          {/* Reset Button */}
          <button
            onClick={onReset}
            className="p-1.5 text-muted hover:text-text bg-surface-2 hover:bg-surface border border-border rounded transition-colors"
            title="Varsayılan Değerlere Sıfırla"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Admin Button (admin users only) */}
          {user?.isAdmin && (
            <button
              onClick={onOpenAdmin}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted bg-surface-2 hover:bg-surface border border-border rounded transition-colors hover:text-text"
              title="Veri kataloğunu güncelle"
            >
              <Shield className="w-3.5 h-3.5 text-danger" />
              <span className="hidden sm:inline">Yönetim</span>
            </button>
          )}

          {/* Auth Section */}
          {user ? (
            <div className="relative group">
              <button className="flex items-center gap-2 pl-1 pr-2.5 py-1 bg-surface-2 hover:bg-surface border border-border rounded">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name || user.email}
                    className="w-6 h-6 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-accent text-bg flex items-center justify-center text-xs font-bold">
                    {(user.name || user.email || '?').charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="hidden lg:block text-xs font-medium text-muted max-w-28 truncate">
                  {user.name || user.email}
                </span>
              </button>
              <div className="absolute right-0 mt-1 w-48 bg-surface border border-border rounded-md shadow-none p-1.5 hidden group-hover:block z-50">
                <div className="px-2 py-1.5 border-b border-border mb-1">
                  <p className="text-xs font-semibold text-text truncate">{user.name || 'Kullanıcı'}</p>
                  <p className="text-[10px] text-muted truncate">{user.email}</p>
                </div>
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface-2 text-xs text-danger font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" /> Çıkış Yap
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={onLogin}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-muted bg-surface-2 hover:bg-surface border border-border rounded transition-colors hover:text-text"
            >
              <LogIn className="w-3.5 h-3.5 text-accent" />
              <span className="hidden sm:inline">Giriş Yap</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};