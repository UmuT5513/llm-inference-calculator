import React, { useEffect, useState, useCallback } from 'react';
import { X, Save, FolderOpen, Trash2, ArrowUpRight, LogIn } from 'lucide-react';
import { CalculatorConfig, CalculationResults, FineTuningConfig, FineTuningResults } from '../types';
import { useAuth } from '../auth/AuthContext';
import { Panel } from './ui/Panel';
import { SectionHeader } from './ui/SectionHeader';
import { Badge } from './ui/Badge';

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
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl bg-surface border border-border rounded-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-3.5 py-2">
          <h2 className="text-[11px] font-bold font-mono uppercase tracking-wider text-text">Senaryo Yönetimi</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-muted hover:text-text rounded-md hover:bg-surface-2 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {!user && !authLoading && (
            <div className="flex items-center justify-between gap-3 bg-surface-2 border border-border rounded-md p-4">
              <div>
                <p className="text-sm font-semibold text-text">Senaryolarınızı kaydetmek için giriş yapın</p>
                <p className="text-xs text-muted mt-0.5">
                  Kaydettiğiniz senaryoları başka senaryolarla karşılaştırabilirsiniz.
                </p>
              </div>
              <button
                onClick={login}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-text bg-surface-2 border border-border hover:bg-surface rounded-md cursor-pointer"
              >
                <LogIn className="w-4 h-4" /> Google ile Giriş
              </button>
            </div>
          )}

          {user && (
            <>
              {/* Save form */}
              <Panel className="overflow-hidden">
                <SectionHeader
                  title={`Mevcut Yapılandırmayı Kaydet (${activeTab === 'inference' ? 'Çıkarım' : 'Fine-Tuning'})`}
                  right={<Save className="w-4 h-4 text-accent shrink-0" />}
                />
                <div className="p-3.5 space-y-3">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Senaryo adı (örn. Staging API 2x H100)"
                    className="w-full px-3 py-2 text-sm bg-surface-2 border border-border rounded-md text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Açıklama (opsiyonel)"
                    rows={2}
                    className="w-full px-3 py-2 text-sm bg-surface-2 border border-border rounded-md text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                  <button
                    onClick={saveScenario}
                    disabled={saving}
                    className="w-full py-2 text-sm font-bold text-bg bg-accent hover:bg-accent/90 rounded-md disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? 'Kaydediliyor...' : 'Senaryoyu Kaydet'}
                  </button>
                </div>
              </Panel>

              {/* Error / Empty states */}
              {error && <p className="text-xs text-danger font-medium">{error}</p>}
              {loading && <p className="text-xs text-muted">Yükleniyor...</p>}

              {/* List */}
              {!loading && scenarios.length === 0 && (
                <p className="text-sm text-muted text-center py-6">
                  Henüz kayıtlı senaryonuz yok.
                </p>
              )}

              {scenarios.length > 0 && (
                <div className="space-y-2">
                  {scenarios.map((s) => (
                    <div
                      key={s.id}
                      className={`flex items-start gap-3 border rounded-md p-3 transition ${
                        selectedIds.has(s.id)
                          ? 'border-accent/50 bg-surface-2'
                          : 'bg-surface border-border hover:bg-surface-2'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(s.id)}
                        onChange={() => toggleSelect(s.id)}
                        className="mt-1 accent-[#FFB224]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-text truncate">{s.name}</span>
                          <Badge tone={s.type === 'inference' ? 'accent' : 'default'}>
                            {s.type === 'inference' ? 'Çıkarım' : 'Fine-Tuning'}
                          </Badge>
                        </div>
                        {s.description && (
                          <p className="text-xs text-muted mt-0.5 line-clamp-2">{s.description}</p>
                        )}
                        <p className="text-[10px] text-muted/70 mt-1">
                          Güncellendi: {new Date(s.updated_at).toLocaleString('tr-TR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            onLoadScenario(s.type, s.config, s.results);
                            onClose();
                          }}
                          className="p-1.5 text-muted hover:text-text hover:bg-surface-2 rounded-md cursor-pointer"
                          title="Yükle"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteScenario(s.id)}
                          className="p-1.5 text-danger/70 hover:text-danger hover:bg-surface-2 rounded-md cursor-pointer"
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
                    className="w-full py-2 text-sm font-bold text-bg bg-accent hover:bg-accent/90 rounded-md disabled:opacity-40 cursor-pointer"
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