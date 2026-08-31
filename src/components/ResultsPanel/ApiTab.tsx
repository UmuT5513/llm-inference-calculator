import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalculationResults } from '../../types';
import { API_TIERS, apiTierForParams, ApiTierId } from '../../data/apiPricePresets';
import { computeApiBreakEven } from '../../utils/apiBreakEven';

interface ApiTabProps {
  results: CalculationResults;
}

const TIER_KEYS: Record<ApiTierId, string> = {
  '8b': 'results.api.tier8b',
  '70b': 'results.api.tier70b',
  frontier: 'results.api.tierFrontier',
};

const CHART_W = 420;
const CHART_H = 220;
const PAD = { left: 46, right: 12, top: 16, bottom: 30 };

export const ApiTab: React.FC<ApiTabProps> = ({ results }) => {
  const { t } = useTranslation();
  const autoTier = apiTierForParams(results.totalParamsB);
  const [tierId, setTierId] = useState<ApiTierId>(autoTier);
  const tier = API_TIERS.find((x) => x.id === tierId) ?? API_TIERS[1];
  const [providerId, setProviderId] = useState(tier.providers[0].providerId);

  const b = useMemo(
    () => computeApiBreakEven(results, tierId, providerId),
    [results, tierId, providerId]
  );

  const plotW = CHART_W - PAD.left - PAD.right;
  const plotH = CHART_H - PAD.top - PAD.bottom;
  const maxX = b.series[b.series.length - 1].volumeB;
  const maxY = Math.max(...b.series.map((p) => Math.max(p.selfHostUsd, p.apiUsd))) * 1.15;

  const x = (v: number) => PAD.left + (v / maxX) * plotW;
  const y = (v: number) => PAD.top + plotH - (v / maxY) * plotH;

  const selfHostPath = b.series.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.volumeB).toFixed(1)},${y(p.selfHostUsd).toFixed(1)}`).join(' ');
  const apiPath = b.series.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.volumeB).toFixed(1)},${y(p.apiUsd).toFixed(1)}`).join(' ');
  const beX = x(b.breakEvenTokensB);
  const beY = y(b.selfHostMonthlyUsd);
  const showBe = b.breakEvenTokensB <= maxX;

  const gridLines = [0.25, 0.5, 0.75].map((f) => {
    const gy = PAD.top + plotH * (1 - f);
    return { gy, label: `$${Math.round(maxY * f).toLocaleString()}` };
  });

  const formatBe = b.breakEvenTokensB >= 100 ? b.breakEvenTokensB.toFixed(0) : b.breakEvenTokensB.toFixed(1);

  return (
    <div className="space-y-3">
      <div>
        <div className="text-[11px] font-mono uppercase tracking-wider text-muted">
          {t('results.api.title')}
        </div>
        <div className="text-[10px] font-mono text-muted mt-0.5">
          {results.totalParamsB}B • {t('results.api.selfHost')} vs {t('results.api.api')}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted">{t('results.api.tierLabel')}</span>
          <select
            value={tierId}
            onChange={(e) => {
              const next = e.target.value as ApiTierId;
              setTierId(next);
              const nt = API_TIERS.find((x) => x.id === next) ?? API_TIERS[1];
              setProviderId(nt.providers[0].providerId);
            }}
            className="mt-1 w-full bg-surface-2 border border-border rounded px-2 py-1.5 text-xs font-mono text-text focus:outline-none focus:border-accent"
          >
            {API_TIERS.map((x) => (
              <option key={x.id} value={x.id}>
                {t(TIER_KEYS[x.id])}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted">{t('results.api.providerLabel')}</span>
          <select
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
            className="mt-1 w-full bg-surface-2 border border-border rounded px-2 py-1.5 text-xs font-mono text-text focus:outline-none focus:border-accent"
          >
            {tier.providers.map((p) => (
              <option key={p.providerId} value={p.providerId}>
                {p.providerName} — {p.model}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="border border-border rounded bg-surface-2 p-2.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted mb-1">{t('results.api.selfHost')}</div>
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-muted">{t('results.api.per1MIn')}</span>
            <span className="text-text">${b.selfHostPerMIn.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-muted">{t('results.api.per1MOut')}</span>
            <span className="text-text">${b.selfHostPerMOut.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-muted">{t('results.api.per1MTokens')}</span>
            <span className="text-accent font-bold">${b.selfHostPerMTokens.toFixed(2)}</span>
          </div>
        </div>
        <div className="border border-border rounded bg-surface-2 p-2.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted mb-1">
            {t('results.api.api')} • {b.provider.providerName}
          </div>
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-muted">{t('results.api.per1MIn')}</span>
            <span className="text-text">${b.provider.inputPricePerM.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-muted">{t('results.api.per1MOut')}</span>
            <span className="text-text">${b.provider.outputPricePerM.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-muted">{t('results.api.per1MTokens')}</span>
            <span className="text-accent font-bold">${b.blendedApiPerM.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full h-auto border border-border rounded bg-surface-2">
        {gridLines.map((g) => (
          <g key={g.gy}>
            <line x1={PAD.left} y1={g.gy} x2={CHART_W - PAD.right} y2={g.gy} stroke="#2a2826" strokeWidth="1" strokeDasharray="3 3" />
            <text x={PAD.left - 6} y={g.gy + 3} textAnchor="end" fontSize="9" fill="#8e8b8b">{g.label}</text>
          </g>
        ))}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + plotH} stroke="#2a2826" strokeWidth="1" />
        <line x1={PAD.left} y1={PAD.top + plotH} x2={CHART_W - PAD.right} y2={PAD.top + plotH} stroke="#2a2826" strokeWidth="1" />
        <text x={PAD.left} y={PAD.top + plotH + 18} fontSize="9" fill="#8e8b8b">0</text>
        <text x={x(maxX / 2)} y={PAD.top + plotH + 18} textAnchor="middle" fontSize="9" fill="#8e8b8b">{(maxX / 2).toFixed(0)}{t('results.api.volumeUnit')}</text>
        <text x={x(maxX)} y={PAD.top + plotH + 18} textAnchor="end" fontSize="9" fill="#8e8b8b">{maxX.toFixed(0)}{t('results.api.volumeUnit')}</text>
        <path d={selfHostPath} fill="none" stroke="#3fb950" strokeWidth="2" />
        <path d={apiPath} fill="none" stroke="#ffb224" strokeWidth="2" />
        {showBe && (
          <g>
            <line x1={beX} y1={PAD.top} x2={beX} y2={PAD.top + plotH} stroke="#8e8b8b" strokeWidth="1" strokeDasharray="2 2" />
            <circle cx={beX} cy={beY} r="4" fill="#ffb224" />
            <text x={Math.min(beX + 4, CHART_W - PAD.right - 40)} y={beY - 6} fontSize="9" fill="#ffb224">~{formatBe}B</text>
          </g>
        )}
      </svg>

      <div className="flex flex-wrap gap-3 text-[10px] font-mono text-muted">
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#3fb950] inline-block" />{t('results.api.legendSelfHost')}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-accent inline-block" />{t('results.api.legendApi')}</span>
      </div>

      <div className="border border-border rounded p-2.5 bg-surface-2 space-y-1">
        <p className="text-[11px] font-mono text-text font-bold">
          {showBe ? t('results.api.verdictAbove', { tokens: formatBe }) : t('results.api.verdictApi')}
        </p>
        <p className="text-[10px] text-muted leading-snug">{t('results.api.caveats')}</p>
      </div>
    </div>
  );
};

export default ApiTab;