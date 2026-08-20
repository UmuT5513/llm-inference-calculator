import React, { useState } from 'react';
import { RefreshCw, X, Database, Cpu, CheckCircle2, AlertTriangle } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Yönetim Paneli</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-500">
            Veri kataloğunu Hugging Face ve GPU sağlayıcılarından (RunPod / Lambda / Modal) talep üzerine güncelleyin.
            Bu işlem yalnızca yöneticiler tarafından tetiklenebilir.
          </p>

          {/* Model catalog */}
          <div className="border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                  <Database className="w-4 h-4 text-indigo-600" />
                  Model Kataloğu
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Hugging Face'ten açık kaynak modelleri çeker ve günceller.</p>
              </div>
              <button
                onClick={runModelRefresh}
                disabled={modelsState.busy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition active:scale-95 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${modelsState.busy ? 'animate-spin' : ''}`} />
                {modelsState.busy ? 'Güncelleniyor…' : 'Güncelle'}
              </button>
            </div>
            {modelsState.message && (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" /> {modelsState.message}
              </p>
            )}
            {modelsState.error && (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-600">
                <AlertTriangle className="w-3.5 h-3.5" /> {modelsState.error}
              </p>
            )}
          </div>

          {/* GPU prices */}
          <div className="border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                  <Cpu className="w-4 h-4 text-indigo-600" />
                  GPU Fiyatları
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">RunPod, Lambda ve Modal'dan güncel saatlik fiyatları çeker.</p>
              </div>
              <button
                onClick={runPricesRefresh}
                disabled={pricesState.busy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition active:scale-95 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${pricesState.busy ? 'animate-spin' : ''}`} />
                {pricesState.busy ? 'Güncelleniyor…' : 'Güncelle'}
              </button>
            </div>
            {pricesState.message && (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" /> {pricesState.message}
              </p>
            )}
            {pricesState.error && (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-600">
                <AlertTriangle className="w-3.5 h-3.5" /> {pricesState.error}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};