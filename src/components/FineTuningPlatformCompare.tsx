import React, { useState } from 'react';
import { FineTuningResults } from '../types';
import { Panel } from './ui/Panel';
import { SectionHeader } from './ui/SectionHeader';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface FineTuningPlatformCompareProps {
  results: FineTuningResults;
}

type CategoryFilter = 'ALL' | 'RunPod' | 'Lambda' | 'Modal' | 'Colab' | 'Multi-GPU';

const FILTERS: { id: CategoryFilter; label: string }[] = [
  { id: 'ALL', label: 'Tümü (Hepsi)' },
  { id: 'RunPod', label: 'RunPod Pods' },
  { id: 'Lambda', label: 'Lambda Cloud' },
  { id: 'Modal', label: 'Modal Dedicated' },
  { id: 'Colab', label: 'Google Colab' },
  { id: 'Multi-GPU', label: 'Multi-GPU Kümeleri' },
];

export const FineTuningPlatformCompare: React.FC<FineTuningPlatformCompareProps> = ({ results }) => {
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<CategoryFilter>('ALL');

  const filteredPlatforms = results.platformEstimates.filter((plat) => {
    if (selectedCategoryFilter === 'ALL') return true;
    if (selectedCategoryFilter === 'Multi-GPU') return plat.gpuCount > 1;
    return plat.category === selectedCategoryFilter;
  });

  return (
    <Panel>
      <SectionHeader
        title="Bulut Dedicated Pod & Instance Fine-Tuning Maliyet Karşılaştırması"
        description={
          <>
            Resmi fiyat listeleriyle adanmış (dedicated) GPU podları:{' '}
            <a href="https://www.runpod.io/pricing" target="_blank" rel="noreferrer" className="text-accent underline font-medium hover:opacity-80">
              RunPod
            </a>{' '}
            •{' '}
            <a href="https://lambda.ai/pricing" target="_blank" rel="noreferrer" className="text-accent underline font-medium hover:opacity-80">
              Lambda Labs
            </a>{' '}
            •{' '}
            <a href="https://modal.com/pricing" target="_blank" rel="noreferrer" className="text-accent underline font-medium hover:opacity-80">
              Modal.com
            </a>{' '}
            •{' '}
            <a href="https://colab.research.google.com/signup" target="_blank" rel="noreferrer" className="text-accent underline font-medium hover:opacity-80">
              Google Colab
            </a>
          </>
        }
      />

      <div className="px-3.5 py-3 space-y-3">
        {/* Category / Provider Filter Pills */}
        <div className="flex flex-wrap items-center gap-1 bg-surface-2 border border-border p-1 rounded-md text-[11px] font-medium">
          {FILTERS.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryFilter(cat.id)}
              className={`px-2.5 py-1 rounded transition ${
                selectedCategoryFilter === cat.id
                  ? 'bg-accent text-bg font-bold'
                  : 'text-muted hover:text-text'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Featured Recommendation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {results.cheapestPlatform && (
            <div className="p-3 rounded-md border border-accent/40 bg-surface-2 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-accent bg-surface border border-accent/40 px-1.5 py-0.5 rounded">
                  ★ En Ekonomik Pod
                </span>
                <span className="text-xs font-mono font-bold text-accent">
                  ${results.cheapestPlatform.totalCostUsd.toFixed(2)}
                </span>
              </div>
              <div>
                <div className="font-bold text-xs text-text line-clamp-1">{results.cheapestPlatform.platformName}</div>
                <div className="text-[11px] text-muted font-mono">{results.cheapestPlatform.gpuName}</div>
              </div>
              <div className="text-[11px] font-mono text-muted pt-1 border-t border-border flex justify-between gap-2">
                <span>Tahmini Süre:</span>
                <strong className="text-text">{results.cheapestPlatform.estimatedTimeFormatted}</strong>
              </div>
              <div className="text-[10px] text-muted font-sans">
                Toplam: <strong className="text-text">{results.cheapestPlatform.totalCostTry.toFixed(1)} ₺</strong>
              </div>
            </div>
          )}

          {results.bestValuePlatform && (
            <div className="p-3 rounded-md border border-ok/40 bg-surface-2 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-ok bg-surface border border-ok/40 px-1.5 py-0.5 rounded">
                  ⚡ En İyi Fiyat / Performans
                </span>
                <span className="text-xs font-mono font-bold text-ok">
                  ${results.bestValuePlatform.totalCostUsd.toFixed(2)}
                </span>
              </div>
              <div>
                <div className="font-bold text-xs text-text line-clamp-1">{results.bestValuePlatform.platformName}</div>
                <div className="text-[11px] text-muted font-mono">{results.bestValuePlatform.gpuName}</div>
              </div>
              <div className="text-[11px] font-mono text-muted pt-1 border-t border-border flex justify-between gap-2">
                <span>Tahmini Süre:</span>
                <strong className="text-text">{results.bestValuePlatform.estimatedTimeFormatted}</strong>
              </div>
              <div className="text-[10px] text-muted font-sans">
                Toplam: <strong className="text-text">{results.bestValuePlatform.totalCostTry.toFixed(1)} ₺</strong>
              </div>
            </div>
          )}

          {results.fastestPlatform && (
            <div className="p-3 rounded-md border border-border bg-surface-2 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-text bg-surface border border-border px-1.5 py-0.5 rounded">
                  🚀 En Hızlı Tamamlama
                </span>
                <span className="text-xs font-mono font-bold text-text">
                  ${results.fastestPlatform.totalCostUsd.toFixed(2)}
                </span>
              </div>
              <div>
                <div className="font-bold text-xs text-text line-clamp-1">{results.fastestPlatform.platformName}</div>
                <div className="text-[11px] text-muted font-mono">{results.fastestPlatform.gpuName}</div>
              </div>
              <div className="text-[11px] font-mono text-muted pt-1 border-t border-border flex justify-between gap-2">
                <span>Tahmini Süre:</span>
                <strong className="text-text">{results.fastestPlatform.estimatedTimeFormatted}</strong>
              </div>
              <div className="text-[10px] text-muted font-sans">
                Toplam: <strong className="text-text">{results.fastestPlatform.totalCostTry.toFixed(1)} ₺</strong>
              </div>
            </div>
          )}

          {/* Large VRAM / Blackwell */}
          <div className="p-3 rounded-md border border-border bg-surface space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted bg-surface-2 border border-border px-1.5 py-0.5 rounded">
                Blackwell & Multi-GPU Kümeleri
              </span>
              <span className="text-xs font-mono font-bold text-text">
                192GB / 1.44TB
              </span>
            </div>
            <div>
              <div className="font-bold text-xs text-text line-clamp-1">
                RunPod / Lambda / Modal Kümeleri
              </div>
              <div className="text-[11px] text-muted font-mono">
                NVLink Mesh & InfiniBand Podlar
              </div>
            </div>
            <div className="text-[11px] font-mono text-muted pt-1 border-t border-border flex justify-between gap-2">
              <span>Kurumsal Ölçek:</span>
              <strong className="text-accent">
                DeepSpeed / FSDP2
              </strong>
            </div>
            <div className="text-[10px] text-muted font-sans">
              Full Fine-Tuning ve 70B+ modeller için sınırsız ölçek
            </div>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="overflow-x-auto pt-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-muted font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Platform / Sağlayıcı</th>
                <th className="py-2.5 px-3">Donanım & VRAM</th>
                <th className="py-2.5 px-3">Saatlik Ücret</th>
                <th className="py-2.5 px-3">VRAM Uygunluk</th>
                <th className="py-2.5 px-3">Tahmini Eğitim Süresi</th>
                <th className="py-2.5 px-3">Toplam Maliyet ($ / ₺)</th>
                <th className="py-2.5 px-3">Platform Notu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-text font-mono text-[11px]">
              {filteredPlatforms.map((plat) => {
                return (
                  <tr
                    key={plat.platformId}
                    className={`hover:bg-surface-2 transition ${
                      plat.isCheapestFeasible ? 'bg-accent/5' : ''
                    } ${!plat.isFeasibleVram ? 'opacity-50' : ''}`}
                  >
                    <td className="py-2.5 px-3 font-medium">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{plat.platformName}</span>
                        {plat.isCheapestFeasible && (
                          <span className="text-[9px] font-sans font-bold bg-surface text-accent border border-accent/40 px-1.5 py-0.2 rounded">
                            ★ En Uygun
                          </span>
                        )}
                        {plat.isBestValueFeasible && !plat.isCheapestFeasible && (
                          <span className="text-[9px] font-sans font-bold bg-surface text-ok border border-ok/40 px-1.5 py-0.2 rounded">
                            ⚡ F/P
                          </span>
                        )}
                        {plat.isFastestFeasible && (
                          <span className="text-[9px] font-sans font-bold bg-surface text-muted border border-border px-1.5 py-0.2 rounded">
                            🚀 Hızlı
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-muted">
                      {plat.gpuName}
                    </td>

                    <td className="py-2.5 px-3 text-muted">
                      {plat.hourlyRateUsd === 0 ? (
                        <span className="text-ok font-bold">ÜCRETSİZ</span>
                      ) : (
                        `$${plat.hourlyRateUsd.toFixed(2)}/sa`
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      {plat.isFeasibleVram ? (
                        <span className="text-ok font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Yeterli ({plat.vramUsagePct}% VRAM)
                        </span>
                      ) : (
                        <span className="text-danger font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Yetersiz ({plat.gpuVramGB}GB &lt; {results.totalVramNeededGB.toFixed(0)}GB)
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 font-semibold">
                      {plat.isFeasibleVram ? (
                        plat.estimatedTimeFormatted
                      ) : (
                        <span className="text-muted font-normal">-</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 font-bold">
                      {plat.isFeasibleVram ? (
                        plat.totalCostUsd === 0 ? (
                          <span className="text-ok">0.00 TL (Ücretsiz)</span>
                        ) : (
                          <div>
                            <span className="text-accent">${plat.totalCostUsd.toFixed(2)}</span>
                            <span className="text-[10px] text-muted font-normal ml-1">
                              ({plat.totalCostTry.toFixed(1)} ₺)
                            </span>
                          </div>
                        )
                      ) : (
                        <span className="text-muted text-[10px] font-sans">OOM</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-[10px] text-muted font-sans max-w-xs">
                      {plat.colabComputeUnitsNeeded
                        ? `~${plat.colabComputeUnitsNeeded} Colab Compute Unit gerekir ($10 paket).`
                        : plat.notes}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Panel>
  );
};