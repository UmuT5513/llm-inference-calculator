import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCcw } from 'lucide-react';
import { CalculationResults, CalculatorConfig, OnPremisesTco } from '../../types';
import { Collapse } from '../ui/Collapse';
import { Field } from '../ui/Field';
import { NumberInput } from '../ui/NumberInput';
import { Stat } from '../ui/Stat';

interface TcoTabProps {
  results: CalculationResults;
  config: CalculatorConfig;
  onChangeConfig: (updater: (prev: CalculatorConfig) => CalculatorConfig) => void;
}

interface TcoSegment {
  labelKey: string;
  field: keyof OnPremisesTco;
  tryField: keyof OnPremisesTco;
  cls: string;
}

const TCO_SEGMENTS: TcoSegment[] = [
  { labelKey: 'capex', field: 'hardwareCapexUsd', tryField: 'hardwareCapexTry', cls: 'bg-[#8e8b8b]' },
  { labelKey: 'electricity', field: 'annualElectricityCostUsd', tryField: 'annualElectricityCostTry', cls: 'bg-accent' },
  { labelKey: 'cooling', field: 'annualCoolingCostUsd', tryField: 'annualCoolingCostTry', cls: 'bg-[#5aa7ff]' },
  { labelKey: 'maintenance', field: 'annualMaintenanceUsd', tryField: 'annualMaintenanceTry', cls: 'bg-ok' },
  { labelKey: 'other', field: 'annualOtherExpensesUsd', tryField: 'annualOtherExpensesTry', cls: 'bg-[#a78bfa]' },
];

export const TcoTab: React.FC<TcoTabProps> = ({ results, config, onChangeConfig }) => {
  const { t } = useTranslation();
  const [showTry, setShowTry] = useState(false);
  const { onPremTco } = results;

  const formatMoney = (usdVal: number, tryVal: number) => {
    if (showTry) return `₺${Math.round(tryVal).toLocaleString('tr-TR')}`;
    return `$${Math.round(usdVal).toLocaleString('en-US')}`;
  };

  const setElectricityRate = (v: number) =>
    onChangeConfig((prev) => ({ ...prev, electricityRateTryPerKwh: v || 4.2 }));
  const setUsdToTryRate = (v: number) =>
    onChangeConfig((prev) => ({ ...prev, usdToTryRate: v || 50 }));
  const setPueRatio = (v: number) =>
    onChangeConfig((prev) => ({ ...prev, pueRatio: v || 1.25 }));
  const setDutyCycle = (v: number) =>
    onChangeConfig((prev) => ({ ...prev, serverDutyCyclePct: v || 85 }));

  const setCustomGpuUnitPrice = (v: number) =>
    onChangeConfig((prev) => ({ ...prev, customGpuUnitPriceUsd: Number.isNaN(v) || v <= 0 ? null : v }));
  const setCustomSystemBasePrice = (v: number) =>
    onChangeConfig((prev) => ({ ...prev, customSystemBasePriceUsd: Number.isNaN(v) || v < 0 ? null : v }));
  const setCustomAnnualElectricity = (v: number) =>
    onChangeConfig((prev) => ({ ...prev, customAnnualElectricityUsd: Number.isNaN(v) || v < 0 ? null : v }));
  const setCustomAnnualCooling = (v: number) =>
    onChangeConfig((prev) => ({ ...prev, customAnnualCoolingUsd: Number.isNaN(v) || v < 0 ? null : v }));
  const setCustomAnnualMaintenance = (v: number) =>
    onChangeConfig((prev) => ({ ...prev, customAnnualMaintenanceUsd: Number.isNaN(v) || v < 0 ? null : v }));
  const setCustomAnnualOtherExpenses = (v: number) =>
    onChangeConfig((prev) => ({ ...prev, customAnnualOtherExpensesUsd: Number.isNaN(v) || v < 0 ? null : v }));

  const resetAllCustomCosts = () =>
    onChangeConfig((prev) => ({
      ...prev,
      customGpuUnitPriceUsd: null,
      customSystemBasePriceUsd: null,
      customAnnualElectricityUsd: null,
      customAnnualCoolingUsd: null,
      customAnnualMaintenanceUsd: null,
      customAnnualOtherExpensesUsd: null,
    }));

  const tcoTotal = Math.max(1, onPremTco.totalFirstYearCostUsd);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-mono uppercase tracking-wider text-muted">
          {t('results.tco.title')}
        </div>
        <div className="flex items-center bg-surface-2 border border-border rounded p-0.5 text-[10px] font-mono shrink-0">
          <button
            onClick={() => setShowTry(false)}
            className={`px-2 py-0.5 rounded transition font-bold ${
              !showTry ? 'bg-surface text-text border border-border' : 'text-muted'
            }`}
          >
            $ USD
          </button>
          <button
            onClick={() => setShowTry(true)}
            className={`px-2 py-0.5 rounded transition font-bold ${
              showTry ? 'bg-surface text-text border border-border' : 'text-muted'
            }`}
          >
            ₺ TRY
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat label={t('results.tco.capex')} value={formatMoney(onPremTco.hardwareCapexUsd, onPremTco.hardwareCapexTry)} />
        <Stat
          label={t('results.tco.opex')}
          value={formatMoney(onPremTco.annualOpexTotalUsd, onPremTco.annualOpexTotalTry)}
          sub={t('results.tco.perYear')}
        />
        <Stat
          label={t('results.tco.yearTotal')}
          value={formatMoney(onPremTco.totalFirstYearCostUsd, onPremTco.totalFirstYearCostTry)}
          sub={t('results.tco.threeYearTotal', { value: formatMoney(onPremTco.totalThreeYearCostUsd, onPremTco.totalThreeYearCostTry) })}
          tone="accent"
        />
        <Stat
          label={t('results.tco.breakEven')}
          value={
            onPremTco.breakEvenMonthsVsCloud < 99
              ? t('results.tco.breakEvenMonths', { months: onPremTco.breakEvenMonthsVsCloud.toFixed(1) })
              : t('results.tco.cloudAdvantage')
          }
          sub={onPremTco.breakEvenDescription}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-mono uppercase tracking-wider text-text">
            {t('results.tco.yearBreakdown')}
          </span>
          <span className="text-[10px] font-mono text-muted">
            {t('results.tco.total', { value: formatMoney(onPremTco.totalFirstYearCostUsd, onPremTco.totalFirstYearCostTry) })}
          </span>
        </div>
        <div className="flex h-2.5 w-full overflow-hidden rounded bg-surface-2 border border-border">
          {TCO_SEGMENTS.map((s) => {
            const usdVal = onPremTco[s.field] as number;
            return (
              <div
                key={s.labelKey}
                className={s.cls}
                style={{ width: `${(usdVal / tcoTotal) * 100}%` }}
                title={`${t(`results.tco.segments.${s.labelKey}`)}: ${formatMoney(usdVal, onPremTco[s.tryField] as number)}`}
              />
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1.5">
          {TCO_SEGMENTS.map((s) => {
            const usdVal = onPremTco[s.field] as number;
            return (
              <div key={s.labelKey} className="flex items-center justify-between text-[10px] font-mono">
                <span className="flex items-center gap-1 text-muted">
                  <span className={`w-1.5 h-1.5 rounded-full ${s.cls}`} />
                  {t(`results.tco.segments.${s.labelKey}`)}
                </span>
                <span className="text-text">
                  {formatMoney(usdVal, onPremTco[s.tryField] as number)} (%{((usdVal / tcoTotal) * 100).toFixed(0)})
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border border-border rounded-md p-2.5 bg-surface-2 space-y-1">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-muted">{t('results.tco.cloudMonthly')}</span>
          <span className="text-text font-bold">${results.monthlyCostUsd.toFixed(0)}{t('results.tco.perMonthUnit')}</span>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-muted">{t('results.tco.monthlyAverage')}</span>
          <span className="text-ok font-bold">
            {formatMoney(onPremTco.monthlyAverageCostUsd, onPremTco.monthlyAverageCostTry)}{t('results.tco.perMonthUnit')}
          </span>
        </div>
        <p className="text-[10px] text-muted leading-snug">{onPremTco.breakEvenDescription}</p>
      </div>

      <Collapse title={t('results.tco.costSettings')}>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label={t('results.tco.electricityRate')}>
            <NumberInput value={config.electricityRateTryPerKwh} onChange={setElectricityRate} step={0.1} min={0.5} max={30} />
          </Field>
          <Field label={t('results.tco.usdRate')}>
            <NumberInput value={config.usdToTryRate} onChange={setUsdToTryRate} step={0.5} min={10} max={100} />
          </Field>
          <Field label={t('results.tco.pue')}>
            <NumberInput value={config.pueRatio} onChange={setPueRatio} step={0.05} min={1.0} max={2.0} />
          </Field>
          <Field label={t('results.tco.dutyCycle')}>
            <NumberInput value={config.serverDutyCyclePct} onChange={setDutyCycle} step={5} min={10} max={100} />
          </Field>
          <Field label={t('results.tco.gpuUnitPrice')}>
            <NumberInput
              value={config.customGpuUnitPriceUsd ?? onPremTco.gpuUnitPriceUsd}
              onChange={setCustomGpuUnitPrice}
              step={50}
              min={0}
            />
          </Field>
          <Field label={t('results.tco.systemBase')}>
            <NumberInput
              value={config.customSystemBasePriceUsd ?? onPremTco.systemBaseCapexUsd}
              onChange={setCustomSystemBasePrice}
              step={50}
              min={0}
            />
          </Field>
          <Field label={t('results.tco.annualElectricity')}>
            <NumberInput
              value={config.customAnnualElectricityUsd ?? onPremTco.annualElectricityCostUsd}
              onChange={setCustomAnnualElectricity}
              step={50}
              min={0}
            />
          </Field>
          <Field label={t('results.tco.annualCooling')}>
            <NumberInput
              value={config.customAnnualCoolingUsd ?? onPremTco.annualCoolingCostUsd}
              onChange={setCustomAnnualCooling}
              step={25}
              min={0}
            />
          </Field>
          <Field label={t('results.tco.annualMaintenance')}>
            <NumberInput
              value={config.customAnnualMaintenanceUsd ?? onPremTco.annualMaintenanceUsd}
              onChange={setCustomAnnualMaintenance}
              step={50}
              min={0}
            />
          </Field>
          <Field label={t('results.tco.annualOther')}>
            <NumberInput
              value={config.customAnnualOtherExpensesUsd ?? onPremTco.annualOtherExpensesUsd}
              onChange={setCustomAnnualOtherExpenses}
              step={50}
              min={0}
            />
          </Field>
        </div>
        <button
          onClick={resetAllCustomCosts}
          className="mt-3 flex items-center gap-1 text-[10px] font-mono text-danger border border-danger/40 rounded px-2 py-1 hover:bg-danger/10 transition"
        >
          <RotateCcw className="w-3 h-3" />
          {t('results.tco.resetAll')}
        </button>
      </Collapse>
    </div>
  );
};