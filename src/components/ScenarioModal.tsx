import React, { useEffect, useState, useCallback } from 'react';
import { X, Save, FolderOpen, Trash2, ArrowUpRight, LogIn } from 'lucide-react';
import { CalculatorConfig, CalculationResults, FineTuningConfig, FineTuningResults } from '../types';
import { useAuth } from '../auth/AuthContext';

export interface SavedScenario {
  id: string;
  type: 'inference' | 'finetuning';
  name: string;
  description: string | null;
  config: CalculatorConfig | FineTuningConfig;
  results: CalculationResults | FineTuningResults;
  created_at: string;
  updated_at: string;
}

interface ScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'inference' | 'finetuning';
  config: CalculatorConfig;
  ftConfig: FineTuningConfig;
  results: CalculationResults;
  ftResults: FineTuningResults;
  onLoadScenario: (type: 'inference' | 'finetuning', config: any, results: any) => void;
  onOpenCompare: (ids: string[]) => void;
}

export const ScenarioModal: React.FC<ScenarioModalProps> = ({
  isOpen,
  onClose,
  activeTab,
  config,
  ftConfig,
  results,
  ftResults,
  onLoadScenario,
  onOpenCompare,
}) => {
  const { user, loading: authLoading, login } = useAuth();
  const [scenarios, setScenarios] = useState<SavedScenario[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadScenarios = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/scenarios');
      if (!res.ok) throw new Error('Senaryolar yüklenemedi');
      const data = await res.json();
      setScenarios(data.scenarios || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set());
      if (user) {
        loadScenarios();
      }
    }
  }, [isOpen, user, loadScenarios]);

  if (!isOpen) return null;

  const saveScenario = async () => {
    if (!user) {
      login();
      return;
    }
    if (!name.trim()) {
      setError('Lütfen senaryo adı girin.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const type = activeTab;
      const payload = {
        type,
        name: name.trim(),
        description: description.trim() || null,
        config: type === 'inference' ? config : ftConfig,
        results: type === 'inference' ? results : ftResults,
      };
      const res = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Senaryo kaydedilemedi');
      setName('');
      setDescription('');
      await loadScenarios();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteScenario = async (id: string) => {
    if (!user) return;
    if (!window.confirm('Bu senaryoyu silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/scenarios/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Silinemedi');
      await loadScenarios();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const compareSelected = () => {
    if (selectedIds.size < 2) {
      setError('Karşılaştırmak için en az 2 senaryo seçin.');
      return;
    }
    onOpenCompare([...selectedIds]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Senaryo Yönetimi</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {!user && !authLoading && (
            <div className="flex items-center justify-between gap-3 bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <div>
                <p className="text-sm font-semibold text-indigo-900">Senaryolarınızı kaydetmek için giriş yapın</p>
                <p className="text-xs text-indigo-700 mt-0.5">
                  Kaydettiğiniz senaryoları başka senaryolarla karşılaştırabilirsiniz.
                </p>
              </div>
              <button
                onClick={login}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
              >
                <LogIn className="w-4 h-4" /> Google ile Giriş
              </button>
            </div>
          )}

          {user && (
            <>
              {/* Save form */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Save className="w-4 h-4 text-indigo-600" />
                  Mevcut Yapılandırmayı Kaydet ({activeTab === 'inference' ? 'Çıkarım' : 'Fine-Tuning'})
                </div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Senaryo adı (örn. Staging API 2x H100)"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Açıklama (opsiyonel)"
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={saveScenario}
                  disabled={saving}
                  className="w-full py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
                >
                  {saving ? 'Kaydediliyor...' : 'Senaryoyu Kaydet'}
                </button>
              </div>

              {/* Error / Empty states */}
              {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
              {loading && <p className="text-xs text-slate-500">Yükleniyor...</p>}

              {/* List */}
              {!loading && scenarios.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-6">
                  Henüz kayıtlı senaryonuz yok.
                </p>
              )}

              {scenarios.length > 0 && (
                <div className="space-y-2">
                  {scenarios.map((s) => (
                    <div
                      key={s.id}
                      className={`flex items-start gap-3 border rounded-xl p-3 transition ${
                        selectedIds.has(s.id)
                          ? 'border-indigo-400 bg-indigo-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(s.id)}
                        onChange={() => toggleSelect(s.id)}
                        className="mt-1 accent-indigo-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-900 truncate">{s.name}</span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                              s.type === 'inference'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {s.type === 'inference' ? 'Çıkarım' : 'Fine-Tuning'}
                          </span>
                        </div>
                        {s.description && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{s.description}</p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1">
                          Güncellendi: {new Date(s.updated_at).toLocaleString('tr-TR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            onLoadScenario(s.type, s.config, s.results);
                            onClose();
                          }}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          title="Yükle"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteScenario(s.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={compareSelected}
                    disabled={selectedIds.size < 2}
                    className="w-full py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-40"
                  >
                    {selectedIds.size >= 2
                      ? `Karşılaştır (${selectedIds.size} senaryo)`
                      : 'Karşılaştır (en az 2 seçin)'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};