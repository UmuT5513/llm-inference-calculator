import React, { useState } from 'react';
import { RefreshCw, X, Database, Cpu, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Panel } from './ui/Panel';
import { SectionHeader } from './ui/SectionHeader';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onModelsRefreshed: () => Promise<void>;
  onPricesRefreshed: () => Promise<void>;
}

interface TaskState {
  busy: boolean;
  message: string | null;
  error: string | null;
}

const idleState: TaskState = { busy: false, message: null, error: null };

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, onModelsRefreshed, onPricesRefreshed }) => {
  const [modelsState, setModelsState] = useState<TaskState>(idleState);
  const [pricesState, setPricesState] = useState<TaskState>(idleState);

  if (!isOpen) return null;

  const runModelRefresh = async () => {
    setModelsState({ busy: true, message: null, error: null });
    try {
      const res = await fetch('/api/models/refresh', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      const s = data.summary || {};
      setModelsState({
        busy: false,
        message: `Getirilen: ${s.fetched} • Güncellenen: ${s.updated} • Ayna: ${s.mirrored} • Keşfedilen: ${s.discovered} • Başarısız: ${(s.failed || []).length}`,
        error: null,
      });
      await onModelsRefreshed();
    } catch (err: any) {
      setModelsState({ busy: false, message: null, error: err?.message || 'Model kataloğu güncellenemedi.' });
    }
  };

  const runPricesRefresh = async () => {
    setPricesState({ busy: true, message: null, error: null });
    try {
      const res = await fetch('/api/gpu-prices/refresh', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      const providers = data.summary?.providers || [];
      const detail = providers
        .map((p: any) => `${p.provider}: ${p.count}${p.error ? ' (hata)' : ''}`)
        .join(' • ');
      setPricesState({ busy: false, message: detail || `Toplam: ${data.summary?.total}`, error: null });
      await onPricesRefreshed();
    } catch (err: any) {
      setPricesState({ busy: false, message: null, error: err?.message || 'GPU fiyatları güncellenemedi.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-md w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border px-3.5 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <Database className="w-4 h-4 text-accent shrink-0" />
            <h2 className="text-[11px] font-bold font-mono uppercase tracking-wider text-text">Yönetim Paneli</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted hover:text-text hover:bg-surface-2 rounded-md transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-[11px] text-muted">
            Veri kataloğunu Hugging Face ve GPU sağlayıcılarından (RunPod / Lambda / Modal) talep üzerine güncelleyin.
            Bu işlem yalnızca yöneticiler tarafından tetiklenebilir.
          </p>

          {/* Model catalog */}
          <Panel className="overflow-hidden">
            <SectionHeader
              title="Model Kataloğu"
              description="Hugging Face'ten açık kaynak modelleri çeker ve günceller."
              right={
                <button
                  onClick={runModelRefresh}
                  disabled={modelsState.busy}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-bg bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition active:scale-95 shrink-0 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${modelsState.busy ? 'animate-spin' : ''}`} />
                  {modelsState.busy ? 'Güncelleniyor…' : 'Güncelle'}
                </button>
              }
            />
            <div className="p-3.5 space-y-2">
              {modelsState.message && (
                <p className="flex items-center gap-1.5 text-[11px] font-mono text-ok">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {modelsState.message}
                </p>
              )}
              {modelsState.error && (
                <p className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-danger">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {modelsState.error}
                </p>
              )}
            </div>
          </Panel>

          {/* GPU prices */}
          <Panel className="overflow-hidden">
            <SectionHeader
              title="GPU Fiyatları"
              description="RunPod, Lambda ve Modal'dan güncel saatlik fiyatları çeker."
              right={
                <button
                  onClick={runPricesRefresh}
                  disabled={pricesState.busy}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-bg bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition active:scale-95 shrink-0 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${pricesState.busy ? 'animate-spin' : ''}`} />
                  {pricesState.busy ? 'Güncelleniyor…' : 'Güncelle'}
                </button>
              }
            />
            <div className="p-3.5 space-y-2">
              {pricesState.message && (
                <p className="flex items-center gap-1.5 text-[11px] font-mono text-ok">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {pricesState.message}
                </p>
              )}
              {pricesState.error && (
                <p className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-danger">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {pricesState.error}
                </p>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
};