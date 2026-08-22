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
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-4xl bg-surface border border-border rounded-md shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-3.5 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <Scale className="w-4 h-4 text-accent shrink-0" />
            <h2 className="text-[11px] font-bold font-mono uppercase tracking-wider text-text">
              Senaryo Karşılaştırma
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted hover:text-text rounded-md hover:bg-surface-2 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!user ? (
            <div className="flex items-center justify-between gap-3 bg-surface-2 border border-border rounded-md p-4">
              <p className="text-sm font-semibold text-text">
                Karşılaştırmak için önce Google ile giriş yapın.
              </p>
              <button
                onClick={login}
                className="px-3 py-2 text-xs font-semibold text-text bg-surface-2 border border-border hover:bg-surface rounded-md cursor-pointer"
              >
                Giriş Yap
              </button>
            </div>
          ) : (
            <>
              <label className="flex items-center gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  checked={includeCurrent}
                  onChange={(e) => setIncludeCurrent(e.target.checked)}
                  className="accent-[#FFB224]"
                />
                Geçerli yapılandırmayı da dahil et
              </label>

              {loading ? (
                <p className="text-sm text-muted">Yükleniyor...</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto">
                  {saved.map((s) => (
                    <label
                      key={s.id}
                      className={`flex items-start gap-2 border rounded-md p-2 cursor-pointer text-sm ${
                        selected.has(s.id) ? 'border-accent/50 bg-surface-2' : 'bg-surface border-border hover:bg-surface-2'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(s.id)}
                        onChange={() => toggleSaved(s.id)}
                        className="mt-0.5 accent-[#FFB224]"
                      />
                      <span className="min-w-0">
                        <span className="block font-semibold text-text truncate">{s.name}</span>
                        <span className="block text-[10px] text-muted">{s.subtitle}</span>
                      </span>
                    </label>
                  ))}
                  {saved.length === 0 && (
                    <p className="col-span-full text-sm text-muted text-center py-4">
                      Kayıtlı senaryo yok.
                    </p>
                  )}
                </div>
              )}

              {columns.length >= 2 && (
                <div className="overflow-x-auto border border-border rounded-md">
                  <table className="w-full text-[11px] font-mono">
                    <thead>
                      <tr className="bg-surface-2 border-b border-border">
                        <th className="text-left px-4 py-2 font-semibold text-muted w-56 min-w-44">
                          Metrik
                        </th>
                        {columns.map((c) => (
                          <th
                            key={c.id}
                            className={`px-4 py-2 font-semibold text-text min-w-48 ${
                              c.id === 'current' ? 'bg-surface-2 border-l border-accent/40' : ''
                            }`}
                          >
                            <span className="block text-[10px] text-accent mb-0.5">
                              {c.id === 'current' ? '⚡ Canlı' : 'Senaryo'}
                            </span>
                            {c.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-surface' : 'bg-surface-2/40'}>
                          <td className="px-4 py-2.5 font-medium text-muted">{row.label}</td>
                          {row.values.map((v, vi) => {
                            const isCurrent = columns[vi].id === 'current';
                            return (
                              <td
                                key={vi}
                                className={`px-4 py-2.5 text-text ${
                                  isCurrent ? 'bg-surface-2 border-l border-accent/40 text-accent' : ''
                                }`}
                              >
                                {v}
                              </td>
                            );
                          })}
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