import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { X, Scale } from 'lucide-react';
import { CalculatorConfig, CalculationResults, FineTuningConfig, FineTuningResults } from '../types';
import { useAuth } from '../auth/AuthContext';

interface ScenarioRow {
  id: string;
  type: 'inference' | 'finetuning' | 'current';
  name: string;
  subtitle: string;
  config: CalculatorConfig | FineTuningConfig | null;
  results: CalculationResults | FineTuningResults | null;
}

interface ScenarioComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialIds?: string[];
  activeTab: 'inference' | 'finetuning';
  config: CalculatorConfig;
  ftConfig: FineTuningConfig;
  results: CalculationResults;
  ftResults: FineTuningResults;
}

const fmtNum = (v: number | undefined | null, digits = 1) =>
  v == null || Number.isNaN(v) ? '—' : v.toLocaleString('tr-TR', { maximumFractionDigits: digits });

const fmtMoney = (v: number | undefined | null) =>
  v == null || Number.isNaN(v) ? '—' : `$${v.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

const fmtTime = (ms: number | undefined | null) =>
  ms == null || Number.isNaN(ms) ? '—' : `${fmtNum(ms, 1)} ms`;

export const ScenarioComparisonModal: React.FC<ScenarioComparisonModalProps> = ({
  isOpen,
  onClose,
  initialIds,
  activeTab,
  config,
  ftConfig,
  results,
  ftResults,
}) => {
  const { user, login } = useAuth();
  const [saved, setSaved] = useState<ScenarioRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [includeCurrent, setIncludeCurrent] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadSaved = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/scenarios');
      if (!res.ok) throw new Error('Yüklenemedi');
      const data = await res.json();
      setSaved(
        (data.scenarios || []).map((s: any) => ({
          id: s.id,
          type: s.type,
          name: s.name,
          subtitle: new Date(s.updated_at).toLocaleString('tr-TR'),
          config: s.config,
          results: s.results,
        }))
      );
    } catch {
      setSaved([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      setSelected(new Set(initialIds || []));
      loadSaved();
    }
  }, [isOpen, initialIds, loadSaved]);

  const currentRow: ScenarioRow | null = useMemo(
    () => ({
      id: 'current',
      type: activeTab,
      name: 'Geçerli Yapılandırma',
      subtitle: 'Canlı hesap',
      config: activeTab === 'inference' ? config : ftConfig,
      results: activeTab === 'inference' ? results : ftResults,
    }),
    [activeTab, config, ftConfig, results, ftResults]
  );

  const columns = useMemo(() => {
    const cols: ScenarioRow[] = [];
    if (includeCurrent && currentRow) cols.push(currentRow);
    saved.filter((s) => selected.has(s.id)).forEach((s) => cols.push(s));
    return cols;
  }, [includeCurrent, currentRow, saved, selected]);

  if (!isOpen) return null;

  const toggleSaved = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const buildRows = (): { label: string; values: (string | React.ReactNode)[] }[] => {
    const r = (row: ScenarioRow, get: (c: any, res: any) => string): string => {
      if (row.type === 'inference') {
        return get(row.config as CalculatorConfig, row.results as CalculationResults);
      }
      return get(row.config as FineTuningConfig, row.results as FineTuningResults);
    };

    const rows: { label: string; values: (string | React.ReactNode)[] }[] = [];

    if (activeTab === 'inference') {
      rows.push({
        label: 'Model',
        values: columns.map((c) =>
          r(c, (cfg, res) => `${res.modelName || '—'} (${fmtNum(res.totalParamsB, 0)}B)`)
        ),
      });
      rows.push({
        label: 'Quantization',
        values: columns.map((c) =>
          r(c, (cfg) => `${String(cfg.quantId || '').toUpperCase()} / KV: ${String(cfg.kvCacheQuantId || '').toUpperCase()}`)
        ),
      });
      rows.push({
        label: 'Motor (Engine)',
        values: columns.map((c) => r(c, (cfg, res) => res.engineName || cfg.engineId || '—')),
      });
      rows.push({
        label: 'GPU Donanım',
        values: columns.map((c) =>
          r(c, (cfg, res) => `${cfg.gpuCount}x ${res.gpuName || '—'} (${cfg.tensorParallelism} TP / ${cfg.pipelineParallelism} PP)`)
        ),
      });
      rows.push({
        label: 'Eşzamanlı Kullanıcı',
        values: columns.map((c) => r(c, (_cfg, res) => `${fmtNum(res.activeTotalUsers, 0)} (${fmtNum(res.effectivePromptLen, 0)} in / ${fmtNum(res.effectiveGenLen, 0)} out)`)),
      });
      rows.push({
        label: 'Toplam VRAM Gerekli',
        values: columns.map((c) => r(c, (_cfg, res) => `${fmtNum(res.totalVramNeededGB)} GB / ${fmtNum(res.totalVramAvailableGB)} GB (${fmtNum(res.vramUtilizationPct, 0)}%)`)),
      });
      rows.push({
        label: 'VRAM Yeterliliği',
        values: columns.map((c) =>
          r(c, (_cfg, res) =>
            res.isOom ? 'OOM! Kart başına yetersiz' : 'Yeterli'
          )
        ),
      });
      rows.push({
        label: 'TTFT (İlk Token Süresi)',
        values: columns.map((c) => r(c, (_cfg, res) => fmtTime(res.ttftMs))),
      });
      rows.push({
        label: 'TPOT (Token Süresi)',
        values: columns.map((c) => r(c, (_cfg, res) => fmtTime(res.tpotMs))),
      });
      rows.push({
        label: 'Sistem Çıktısı',
        values: columns.map((c) =>
          r(c, (_cfg, res) => `${fmtNum(res.tokensPerSecPerUser, 1)} tok/sn/kullanıcı (${fmtNum(res.systemThroughputTokensPerSec, 1)} tok/sn sistem)`)
        ),
      });
      rows.push({
        label: 'Saatlik Maliyet',
        values: columns.map((c) => r(c, (_cfg, res) => fmtMoney(res.hourlyCostUsd))),
      });
      rows.push({
        label: 'Aylık Maliyet',
        values: columns.map((c) => r(c, (_cfg, res) => fmtMoney(res.monthlyCostUsd))),
      });
      rows.push({
        label: 'Milyon Token Maliyeti',
        values: columns.map((c) =>
          r(c, (_cfg, res) => `${fmtMoney(res.costPerMillionTotalTokensUsd)}/M tok (${fmtMoney(res.costPerMillionInputTokensUsd)} in / ${fmtMoney(res.costPerMillionOutputTokensUsd)} out)`)
        ),
      });
      rows.push({
        label: 'En Ucuz Bulut',
        values: columns.map((c) =>
          r(c, (_cfg, res) => {
            const cheapest = res.cloudCosts?.find((x) => x.isCheapest);
            return cheapest ? `${cheapest.shortName} (${fmtMoney(cheapest.hourlyRatePerGpuUsd)}/saat/GPU)` : '—';
          })
        ),
      });
      rows.push({
        label: '3 Yıllık On-Prem TCO',
        values: columns.map((c) => r(c, (_cfg, res) => fmtMoney(res.onPremTco?.totalThreeYearCostUsd))),
      });
      rows.push({
        label: 'Buluta Karşı Kırılma Noktası',
        values: columns.map((c) =>
          r(c, (_cfg, res) =>
            res.onPremTco?.breakEvenMonthsVsCloud < 999
              ? `~${fmtNum(res.onPremTco.breakEvenMonthsVsCloud, 1)} ay`
              : 'Bulut daha ekonomik'
          )
        ),
      });
    } else {
      rows.push({
        label: 'Model',
        values: columns.map((c) => r(c, (cfg, res) => `${res.modelName || '—'} (${fmtNum(res.totalParamsB, 0)}B)`)),
      });
      rows.push({
        label: 'Yöntem / Framework',
        values: columns.map((c) => r(c, (cfg, res) => `${res.methodName || cfg.methodId || '—'} + ${res.frameworkName || cfg.frameworkId || '—'}`)),
      });
      rows.push({
        label: 'Dataset',
        values: columns.map((c) => r(c, (cfg, res) => `${fmtNum(res.totalSamples, 0)} örnek / ${fmtNum(res.totalTokens, 0)} token / ${cfg.epochs || '—'} epoch`)),
      });
      rows.push({
        label: 'VRAM Gerekli',
        values: columns.map((c) => r(c, (_cfg, res) => `${fmtNum(res.totalVramNeededGB)} GB (kart başına ${fmtNum(res.vramPerGpuNeededGB)} GB)`)),
      });
      rows.push({
        label: 'Eğitim Süresi',
        values: columns.map((c) => r(c, (_cfg, res) => res.trainingTimeFormatted || `${fmtNum(res.trainingTimeHours, 2)} saat`)),
      });
      rows.push({
        label: 'Unsloth Kazanımı',
        values: columns.map((c) => r(c, (_cfg, res) => `${fmtNum(res.unslothSpeedupMultiplier, 1)}x hız (${fmtNum(res.unslothTimeSavedHours, 1)} saat tasarruf)`)),
      });
      rows.push({
        label: 'En Ucuz Platform',
        values: columns.map((c) =>
          r(c, (_cfg, res) =>
            res.cheapestPlatform
              ? `${res.cheapestPlatform.platformName} (${fmtMoney(res.cheapestPlatform.totalCostUsd)})`
              : '—'
          )
        ),
      });
      rows.push({
        label: 'Toplam Bulut Maliyeti',
        values: columns.map((c) => r(c, (_cfg, res) => fmtMoney(res.platformEstimates?.reduce((a, p) => a + p.totalCostUsd, 0)))),
      });
      rows.push({
        label: 'Yerel Elektrik Maliyeti',
        values: columns.map((c) => r(c, (_cfg, res) => `${fmtNum(res.localElectricityCostTry)} TL`)),
      });
    }

    return rows;
  };

  const rows = buildRows();

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Senaryo Karşılaştırma</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!user ? (
            <div className="flex items-center justify-between gap-3 bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-indigo-900">
                Karşılaştırmak için önce Google ile giriş yapın.
              </p>
              <button
                onClick={login}
                className="px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
              >
                Giriş Yap
              </button>
            </div>
          ) : (
            <>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={includeCurrent}
                  onChange={(e) => setIncludeCurrent(e.target.checked)}
                  className="accent-indigo-600"
                />
                Geçerli yapılandırmayı da dahil et
              </label>

              {loading ? (
                <p className="text-sm text-slate-500">Yükleniyor...</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto">
                  {saved.map((s) => (
                    <label
                      key={s.id}
                      className={`flex items-start gap-2 border rounded-lg p-2 cursor-pointer text-sm ${
                        selected.has(s.id) ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(s.id)}
                        onChange={() => toggleSaved(s.id)}
                        className="mt-0.5 accent-indigo-600"
                      />
                      <span className="min-w-0">
                        <span className="block font-semibold text-slate-800 truncate">{s.name}</span>
                        <span className="block text-[10px] text-slate-400">{s.subtitle}</span>
                      </span>
                    </label>
                  ))}
                  {saved.length === 0 && (
                    <p className="col-span-full text-sm text-slate-500 text-center py-4">
                      Kayıtlı senaryo yok.
                    </p>
                  )}
                </div>
              )}

              {columns.length >= 2 && (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-2 font-semibold text-slate-500 w-56 min-w-44">
                          Metrik
                        </th>
                        {columns.map((c) => (
                          <th key={c.id} className="px-4 py-2 font-semibold text-slate-800 min-w-48">
                            <span className="block text-xs text-indigo-600 mb-0.5">
                              {c.id === 'current' ? '⚡ Canlı' : 'Senaryo'}
                            </span>
                            {c.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                          <td className="px-4 py-2.5 font-medium text-slate-700">{row.label}</td>
                          {row.values.map((v, vi) => (
                            <td key={vi} className="px-4 py-2.5 text-slate-800">{v}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};