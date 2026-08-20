import React from 'react';
import { Cpu, Sparkles, Download, RefreshCw, Zap, LogIn, LogOut, Save, Scale, Shield } from 'lucide-react';
import { PresetScenario } from '../types';
import { PRESET_SCENARIOS } from '../data/presets';
import { AuthUser } from '../auth/AuthContext';

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
    <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white text-base shadow-xs">
            ∑
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-none">
                LLM Hardware & Cost Architect
              </h1>
              <span className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
                Inference + Fine-Tuning
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block mt-0.5">
              Çıkarım (Inference) Sizing • Fine-Tuning Maliyeti • Unsloth • Colab & Cloud TCO
            </p>
          </div>
        </div>

        {/* Center Mode Switcher Tabs */}
        <div className="hidden md:flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => onChangeTab('inference')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition ${
              activeTab === 'inference'
                ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-indigo-600" />
            <span>1. Çıkarım (Inference)</span>
          </button>

          <button
            onClick={() => onChangeTab('finetuning')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition relative ${
              activeTab === 'finetuning'
                ? 'bg-white text-amber-700 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>2. Fine-Tuning Maliyeti</span>
            <span className="hidden lg:inline text-[9px] font-mono font-bold bg-amber-100 text-amber-800 px-1 py-0.2 rounded border border-amber-300">
              Unsloth & Colab
            </span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Quick Presets Dropdown */}
          <div className="relative group hidden md:block">
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Senaryolar</span>
            </button>
            <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-2 hidden group-hover:block z-50">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 mb-1 border-b border-slate-100">
                Senaryo Şablonları
              </div>
              {PRESET_SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onSelectPreset(s)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 text-xs text-slate-700 transition flex flex-col gap-0.5"
                >
                  <span className="font-semibold text-indigo-600">{s.title}</span>
                  <span className="text-[10px] text-slate-500 line-clamp-1">{s.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Save Scenario Button */}
          <button
            onClick={onOpenSave}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors"
            title="Senaryo kaydet / yönet"
          >
            <Save className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Kaydet</span>
          </button>

          {/* Compare Scenarios Button */}
          <button
            onClick={onOpenCompare}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors"
            title="Senaryoları karşılaştır"
          >
            <Scale className="w-3.5 h-3.5 text-sky-600" />
            <span className="hidden sm:inline">Karşılaştır</span>
          </button>

          {/* AI Advisor Button */}
          <button
            onClick={onOpenAiAdvisor}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-100" />
            <span className="hidden sm:inline">AI Mimar</span>
          </button>

          {/* Export Button */}
          <button
            onClick={onOpenExport}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors"
            title="Konfigürasyon ve Komut Çıktısı Al"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Dışa Aktar</span>
          </button>

          {/* Reset Button */}
          <button
            onClick={onReset}
            className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors"
            title="Varsayılan Değerlere Sıfırla"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Admin Button (admin users only) */}
          {user?.isAdmin && (
            <button
              onClick={onOpenAdmin}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors"
              title="Veri kataloğunu güncelle"
            >
              <Shield className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">Yönetim</span>
            </button>
          )}

          {/* Auth Section */}
          {user ? (
            <div className="relative group">
              <button className="flex items-center gap-2 pl-1 pr-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name || user.email}
                    className="w-6 h-6 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                    {(user.name || user.email || '?').charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="hidden lg:block text-xs font-medium text-slate-700 max-w-28 truncate">
                  {user.name || user.email}
                </span>
              </button>
              <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 hidden group-hover:block z-50">
                <div className="px-2 py-1.5 border-b border-slate-100 mb-1">
                  <p className="text-xs font-semibold text-slate-800 truncate">{user.name || 'Kullanıcı'}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                </div>
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-rose-50 text-xs text-rose-600 font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" /> Çıkış Yap
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={onLogin}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Giriş Yap</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};