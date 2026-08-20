import React, { useState } from 'react';
import {
  Server,
  Zap,
  DollarSign,
  Clock,
  Settings2,
  TrendingDown,
  Building2,
  Fan,
  Wrench,
  Layers,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Sliders,
  CheckCircle2,
  Coins,
} from 'lucide-react';
import { OnPremisesTco, CalculationResults } from '../types';

interface OnPremisesTcoCardProps {
  onPremTco: OnPremisesTco;
  results: CalculationResults;
  gpuCount: number;
  electricityRateTryPerKwh: number;
  usdToTryRate: number;
  pueRatio: number;
  serverDutyCyclePct: number;
  customGpuUnitPriceUsd?: number | null;
  customSystemBasePriceUsd?: number | null;
  customAnnualElectricityUsd?: number | null;
  customAnnualCoolingUsd?: number | null;
  customAnnualMaintenanceUsd?: number | null;
  customAnnualOtherExpensesUsd?: number | null;
  onChangeElectricityRate: (val: number) => void;
  onChangeUsdToTryRate: (val: number) => void;
  onChangePueRatio: (val: number) => void;
  onChangeDutyCycle: (val: number) => void;
  onChangeCustomGpuUnitPrice: (val: number | null) => void;
  onChangeCustomSystemBasePrice: (val: number | null) => void;
  onChangeCustomAnnualElectricity: (val: number | null) => void;
  onChangeCustomAnnualCooling: (val: number | null) => void;
  onChangeCustomAnnualMaintenance: (val: number | null) => void;
  onChangeCustomAnnualOtherExpenses: (val: number | null) => void;
  onResetAllCustomCosts: () => void;
}

export const OnPremisesTcoCard: React.FC<OnPremisesTcoCardProps> = ({
  onPremTco,
  results,
  gpuCount,
  electricityRateTryPerKwh,
  usdToTryRate,
  pueRatio,
  serverDutyCyclePct,
  customGpuUnitPriceUsd,
  customSystemBasePriceUsd,
  customAnnualElectricityUsd,
  customAnnualCoolingUsd,
  customAnnualMaintenanceUsd,
  customAnnualOtherExpensesUsd,
  onChangeElectricityRate,
  onChangeUsdToTryRate,
  onChangePueRatio,
  onChangeDutyCycle,
  onChangeCustomGpuUnitPrice,
  onChangeCustomSystemBasePrice,
  onChangeCustomAnnualElectricity,
  onChangeCustomAnnualCooling,
  onChangeCustomAnnualMaintenance,
  onChangeCustomAnnualOtherExpenses,
  onResetAllCustomCosts,
}) => {
  const [showSettings, setShowSettings] = useState<boolean>(true);
  const [activeCurrency, setActiveCurrency] = useState<'USD' | 'TRY'>('USD');
  const [activeTab, setActiveTab] = useState<'all' | 'gpu' | 'electricity' | 'cooling' | 'maintenance' | 'other'>('all');

  const cheapestCloud = results.cloudCosts.find((c) => c.isCheapest) || results.cloudCosts[0];
  const cheapestCloudAnnualCostUsd = (cheapestCloud?.totalHourlyCostUsd || 0) * 24 * 365;
  const cheapestCloudAnnualCostTry = cheapestCloudAnnualCostUsd * onPremTco.usdToTryRate;

  const isBreakEvenFast = onPremTco.breakEvenMonthsVsCloud <= 12;

  // Percentage shares for 1-Year TCO Breakdown
  const totalFirstYear = Math.max(1, onPremTco.totalFirstYearCostUsd);
  const capexPct = (onPremTco.hardwareCapexUsd / totalFirstYear) * 100;
  const elecPct = (onPremTco.annualElectricityCostUsd / totalFirstYear) * 100;
  const coolPct = (onPremTco.annualCoolingCostUsd / totalFirstYear) * 100;
  const maintPct = (onPremTco.annualMaintenanceUsd / totalFirstYear) * 100;
  const otherPct = (onPremTco.annualOtherExpensesUsd / totalFirstYear) * 100;

  // Format helper based on currency view
  const formatMoney = (usdVal: number, tryVal: number) => {
    if (activeCurrency === 'TRY') {
      return `₺${Math.round(tryVal).toLocaleString('tr-TR')}`;
    }
    return `$${Math.round(usdVal).toLocaleString('en-US')}`;
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-3 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-50 text-amber-700 rounded-lg border border-amber-200">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                On-Premise (Yerel Kurulum) TCO & Maliyet Bileşenleri
              </h2>
              {onPremTco.isCustomized ? (
                <span className="text-[10px] font-mono font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                  Özel Fiyatlar Aktif
                </span>
              ) : (
                <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  TR Elektrik & Piyasa Fiyatları
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Ekran kartı satın alma, yıllık elektrik, soğutma, bakım ve diğer operasyonel masrafları kendiniz belirleyebilirsiniz.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Currency Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-mono">
            <button
              onClick={() => setActiveCurrency('USD')}
              className={`px-2.5 py-1 rounded-md transition font-bold ${
                activeCurrency === 'USD'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              $ USD
            </button>
            <button
              onClick={() => setActiveCurrency('TRY')}
              className={`px-2.5 py-1 rounded-md transition font-bold ${
                activeCurrency === 'TRY'
                  ? 'bg-white text-amber-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ₺ TRY
            </button>
          </div>

          {/* Settings Drawer Toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 rounded-lg transition"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-600" />
            <span>{showSettings ? 'Maliyet Girişlerini Gizle' : 'Maliyetleri Özelleştir'}</span>
            {showSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* USER COST INPUTS & COMPONENT CUSTOMIZER SECTION                           */}
      {/* ========================================================================= */}
      {showSettings && (
        <div className="bg-slate-50 border border-amber-200/90 rounded-xl p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/60 pb-2.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Yerel Kurulum Maliyet Bileşenlerini Girin / Düzenleyin
              </h3>
            </div>

            {onPremTco.isCustomized && (
              <button
                onClick={onResetAllCustomCosts}
                className="flex items-center gap-1 text-[11px] font-mono text-rose-700 hover:text-rose-800 bg-rose-50 border border-rose-200 hover:bg-rose-100 px-2.5 py-1 rounded-md transition"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Tüm Maliyetleri Varsayılana Sıfırla</span>
              </button>
            )}
          </div>

          {/* Category Tabs for Quick Filtering on Mobile or Condensed View */}
          <div className="flex flex-wrap items-center gap-1.5 pb-1">
            {[
              { id: 'all', label: 'Tüm Maliyet Bileşenleri (5 Kalem)', icon: Layers },
              { id: 'gpu', label: '1. Ekran Kartı & Donanım', icon: Server },
              { id: 'electricity', label: '2. Yıllık Elektrik', icon: Zap },
              { id: 'cooling', label: '3. Soğutma / PUE', icon: Fan },
              { id: 'maintenance', label: '4. Bakım & Destek', icon: Wrench },
              { id: 'other', label: '5. Diğer Masraflar', icon: Building2 },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 text-xs font-mono font-medium px-2.5 py-1 rounded-lg border transition ${
                    isSelected
                      ? 'bg-amber-600 text-white border-amber-600 shadow-2xs font-bold'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Grid of Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* ------------------------------------------------------------- */}
            {/* 1. SEÇİLEN EKRAN KARTI FİYATI & DONANIM (CAPEX)               */}
            {/* ------------------------------------------------------------- */}
            {(activeTab === 'all' || activeTab === 'gpu') && (
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-indigo-600" />
                    1. Ekran Kartı Birim Fiyatı
                  </span>
                  <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                    {gpuCount}x {results.gpuName}
                  </span>
                </div>

                <div>
                  <label className="block text-slate-700 text-xs font-medium mb-1">
                    Birim GPU Kartı Satın Alma Fiyatı:
                  </label>
                  <div className="flex items-center gap-1.5">
                    <div className="relative w-full">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-bold">
                        {activeCurrency === 'USD' ? '$' : '₺'}
                      </span>
                      <input
                        type="number"
                        step={activeCurrency === 'USD' ? '50' : '2500'}
                        min="0"
                        value={
                          activeCurrency === 'USD'
                            ? Math.round(onPremTco.gpuUnitPriceUsd)
                            : Math.round(onPremTco.gpuUnitPriceUsd * onPremTco.usdToTryRate)
                        }
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (isNaN(val) || val <= 0) {
                            onChangeCustomGpuUnitPrice(null);
                          } else {
                            const usdVal = activeCurrency === 'USD' ? val : val / onPremTco.usdToTryRate;
                            onChangeCustomGpuUnitPrice(usdVal);
                          }
                        }}
                        className="w-full bg-slate-50/70 border border-slate-300 focus:bg-white rounded-lg pl-6 pr-2.5 py-1.5 text-slate-900 font-mono text-xs font-bold focus:outline-none focus:border-indigo-500 shadow-2xs"
                        placeholder="Ekran kartı birim fiyatı girin"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                    <span>Toplam GPU ({gpuCount}x): {formatMoney(onPremTco.gpuTotalPriceUsd, onPremTco.gpuTotalPriceUsd * onPremTco.usdToTryRate)}</span>
                    {customGpuUnitPriceUsd != null && (
                      <button
                        onClick={() => onChangeCustomGpuUnitPrice(null)}
                        className="text-indigo-600 hover:underline font-mono"
                      >
                        Sıfırla
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-1.5 border-t border-slate-100">
                  <label className="block text-slate-700 text-xs font-medium mb-1">
                    Sunucu Kasa, CPU, RAM & NVMe Taban Bedeli:
                  </label>
                  <div className="relative w-full">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-bold">
                      {activeCurrency === 'USD' ? '$' : '₺'}
                    </span>
                    <input
                      type="number"
                      step={activeCurrency === 'USD' ? '50' : '2500'}
                      min="0"
                      value={
                        activeCurrency === 'USD'
                          ? Math.round(onPremTco.systemBaseCapexUsd)
                          : Math.round(onPremTco.systemBaseCapexUsd * onPremTco.usdToTryRate)
                      }
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (isNaN(val) || val < 0) {
                          onChangeCustomSystemBasePrice(null);
                        } else {
                          const usdVal = activeCurrency === 'USD' ? val : val / onPremTco.usdToTryRate;
                          onChangeCustomSystemBasePrice(usdVal);
                        }
                      }}
                      className="w-full bg-slate-50/70 border border-slate-300 focus:bg-white rounded-lg pl-6 pr-2.5 py-1 text-slate-900 font-mono text-xs font-bold focus:outline-none focus:border-indigo-500 shadow-2xs"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Anakart, Çift PSU, Xeon/EPYC işlemci ve ECC RAM</p>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 2. YILLIK ELEKTRİK TÜKETİMİ & MASRAFI (OPEX)                  */}
            {/* ------------------------------------------------------------- */}
            {(activeTab === 'all' || activeTab === 'electricity') && (
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    2. Yıllık Elektrik Masrafı
                  </span>
                  <span className="text-[10px] font-mono text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                    {onPremTco.powerDrawWatts}W TDP
                  </span>
                </div>

                <div>
                  <label className="block text-slate-700 text-xs font-medium mb-1">
                    Doğrudan Yıllık Elektrik Faturası Gir ($/₺):
                  </label>
                  <div className="relative w-full">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-bold">
                      {activeCurrency === 'USD' ? '$' : '₺'}
                    </span>
                    <input
                      type="number"
                      step={activeCurrency === 'USD' ? '50' : '2000'}
                      min="0"
                      value={
                        activeCurrency === 'USD'
                          ? Math.round(onPremTco.annualElectricityCostUsd)
                          : Math.round(onPremTco.annualElectricityCostTry)
                      }
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (isNaN(val) || val < 0) {
                          onChangeCustomAnnualElectricity(null);
                        } else {
                          const usdVal = activeCurrency === 'USD' ? val : val / onPremTco.usdToTryRate;
                          onChangeCustomAnnualElectricity(usdVal);
                        }
                      }}
                      className="w-full bg-slate-50/70 border border-slate-300 focus:bg-white rounded-lg pl-6 pr-2.5 py-1.5 text-slate-900 font-mono text-xs font-bold focus:outline-none focus:border-indigo-500 shadow-2xs"
                      placeholder="Yıllık elektrik tutarı"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                    <span>Yıllık Tüketim: ~{onPremTco.annualElectricityKwh.toLocaleString()} kWh</span>
                    {customAnnualElectricityUsd != null && (
                      <button
                        onClick={() => onChangeCustomAnnualElectricity(null)}
                        className="text-amber-700 hover:underline font-mono"
                      >
                        Formülden Hesapla
                      </button>
                    )}
                  </div>
                </div>

                {/* Dynamic Electricity Parameters */}
                <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-100 text-xs">
                  <div>
                    <label className="block text-slate-600 text-[10px] font-medium mb-0.5">TR Tarife (₺/kWh):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="30"
                      value={electricityRateTryPerKwh}
                      onChange={(e) => onChangeElectricityRate(parseFloat(e.target.value) || 4.20)}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-800 font-mono text-[11px] font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[10px] font-medium mb-0.5">Sunucu Yükü (%):</label>
                    <input
                      type="number"
                      step="5"
                      min="10"
                      max="100"
                      value={serverDutyCyclePct}
                      onChange={(e) => onChangeDutyCycle(parseFloat(e.target.value) || 85)}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-800 font-mono text-[11px] font-bold"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 3. SOĞUTMA VE İKLİMLENDİRME GİDERLERİ (COOLING & PUE)         */}
            {/* ------------------------------------------------------------- */}
            {(activeTab === 'all' || activeTab === 'cooling') && (
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Fan className="w-3.5 h-3.5 text-cyan-600" />
                    3. Soğutma & İklimlendirme
                  </span>
                  <span className="text-[10px] font-mono text-cyan-800 bg-cyan-50 border border-cyan-200 px-1.5 py-0.5 rounded">
                    PUE: {pueRatio.toFixed(2)}
                  </span>
                </div>

                <div>
                  <label className="block text-slate-700 text-xs font-medium mb-1">
                    Yıllık Soğutma / HVAC Gideri ($/₺):
                  </label>
                  <div className="relative w-full">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-bold">
                      {activeCurrency === 'USD' ? '$' : '₺'}
                    </span>
                    <input
                      type="number"
                      step={activeCurrency === 'USD' ? '25' : '1000'}
                      min="0"
                      value={
                        activeCurrency === 'USD'
                          ? Math.round(onPremTco.annualCoolingCostUsd)
                          : Math.round(onPremTco.annualCoolingCostTry)
                      }
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (isNaN(val) || val < 0) {
                          onChangeCustomAnnualCooling(null);
                        } else {
                          const usdVal = activeCurrency === 'USD' ? val : val / onPremTco.usdToTryRate;
                          onChangeCustomAnnualCooling(usdVal);
                        }
                      }}
                      className="w-full bg-slate-50/70 border border-slate-300 focus:bg-white rounded-lg pl-6 pr-2.5 py-1.5 text-slate-900 font-mono text-xs font-bold focus:outline-none focus:border-indigo-500 shadow-2xs"
                      placeholder="Yıllık klima/soğutma masrafı"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                    <span>Klima, chiller ve havalandırma payı</span>
                    {customAnnualCoolingUsd != null && (
                      <button
                        onClick={() => onChangeCustomAnnualCooling(null)}
                        className="text-cyan-700 hover:underline font-mono"
                      >
                        PUE'den Hesapla
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-1.5 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <label className="text-slate-700 text-[11px] font-medium">
                      PUE Çarpanı (Enerji Verimliliği):
                    </label>
                    <span className="font-mono font-bold text-cyan-800">{pueRatio}</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="2.0"
                    step="0.05"
                    value={pueRatio}
                    onChange={(e) => onChangePueRatio(parseFloat(e.target.value) || 1.25)}
                    className="w-full accent-cyan-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                    <span>1.05 (Modern DC)</span>
                    <span>1.25 (Ortalama)</span>
                    <span>1.60+ (Ofis Klima)</span>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 4. YILLIK BAKIM, YEDEK PARÇA & DESTEK (MAINTENANCE)           */}
            {/* ------------------------------------------------------------- */}
            {(activeTab === 'all' || activeTab === 'maintenance') && (
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                    4. Yıllık Bakım & Teknik Destek
                  </span>
                  <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                    ~%6 CAPEX Payı
                  </span>
                </div>

                <div>
                  <label className="block text-slate-700 text-xs font-medium mb-1">
                    Yıllık Bakım, Parça Değişim & Destek:
                  </label>
                  <div className="relative w-full">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-bold">
                      {activeCurrency === 'USD' ? '$' : '₺'}
                    </span>
                    <input
                      type="number"
                      step={activeCurrency === 'USD' ? '50' : '2000'}
                      min="0"
                      value={
                        activeCurrency === 'USD'
                          ? Math.round(onPremTco.annualMaintenanceUsd)
                          : Math.round(onPremTco.annualMaintenanceTry)
                      }
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (isNaN(val) || val < 0) {
                          onChangeCustomAnnualMaintenance(null);
                        } else {
                          const usdVal = activeCurrency === 'USD' ? val : val / onPremTco.usdToTryRate;
                          onChangeCustomAnnualMaintenance(usdVal);
                        }
                      }}
                      className="w-full bg-slate-50/70 border border-slate-300 focus:bg-white rounded-lg pl-6 pr-2.5 py-1.5 text-slate-900 font-mono text-xs font-bold focus:outline-none focus:border-indigo-500 shadow-2xs"
                      placeholder="Yıllık bakım masrafı"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                    <span>Yedek fan, kablo, termal macun, DevOps desteği</span>
                    {customAnnualMaintenanceUsd != null && (
                      <button
                        onClick={() => onChangeCustomAnnualMaintenance(null)}
                        className="text-emerald-700 hover:underline font-mono"
                      >
                        Otomatik Hesapla
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-1.5 border-t border-slate-100 text-[11px] text-slate-500">
                  Tipik kurumsal sunucu bakım oranları donanım maliyetinin <strong>%5 - %8</strong>'i civarındadır.
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 5. DİĞER MASRAFLAR (COLOCATION, LİSANS, SİGORTA)              */}
            {/* ------------------------------------------------------------- */}
            {(activeTab === 'all' || activeTab === 'other') && (
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-violet-600" />
                    5. Diğer Yıllık Masraflar
                  </span>
                  <span className="text-[10px] font-mono text-violet-800 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded">
                    Kabin & Barındırma
                  </span>
                </div>

                <div>
                  <label className="block text-slate-700 text-xs font-medium mb-1">
                    Kabin/Colocation, İnternet, Sigorta ve Lisans:
                  </label>
                  <div className="relative w-full">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-bold">
                      {activeCurrency === 'USD' ? '$' : '₺'}
                    </span>
                    <input
                      type="number"
                      step={activeCurrency === 'USD' ? '50' : '2000'}
                      min="0"
                      value={
                        activeCurrency === 'USD'
                          ? Math.round(onPremTco.annualOtherExpensesUsd)
                          : Math.round(onPremTco.annualOtherExpensesTry)
                      }
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (isNaN(val) || val < 0) {
                          onChangeCustomAnnualOtherExpenses(null);
                        } else {
                          const usdVal = activeCurrency === 'USD' ? val : val / onPremTco.usdToTryRate;
                          onChangeCustomAnnualOtherExpenses(usdVal);
                        }
                      }}
                      className="w-full bg-slate-50/70 border border-slate-300 focus:bg-white rounded-lg pl-6 pr-2.5 py-1.5 text-slate-900 font-mono text-xs font-bold focus:outline-none focus:border-indigo-500 shadow-2xs"
                      placeholder="0 (Masraf yoksa 0 bırakın)"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Veri merkezi U-kabin kiralama, statik IP/BGP fiber hat, sigorta vb.
                  </p>
                </div>

                <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-600 text-[11px]">Dolar Kuru (USD/TRY):</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.5"
                      min="10"
                      max="100"
                      value={usdToTryRate}
                      onChange={(e) => onChangeUsdToTryRate(parseFloat(e.target.value) || 50)}
                      className="w-16 bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 text-slate-800 font-mono text-[11px] font-bold text-right"
                    />
                    <span className="text-slate-500 text-[10px]">₺</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4 PRIMARY METRIC CARDS GRID                                               */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. İlk Donanım Satın Alma (CAPEX) */}
        <div className="bg-slate-50/70 p-3.5 border border-slate-200 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-600 font-bold uppercase tracking-wider flex items-center gap-1">
              <Server className="w-3.5 h-3.5 text-indigo-600" />
              İlk Yatırım (CAPEX)
            </span>
            <span className="text-[10px] font-mono text-indigo-800 bg-indigo-50 border border-indigo-200 px-1.5 rounded">
              {gpuCount}x GPU + Taban Sistem
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-indigo-700">
            {formatMoney(onPremTco.hardwareCapexUsd, onPremTco.hardwareCapexTry)}
          </div>
          <div className="text-xs font-mono text-slate-600">
            {activeCurrency === 'USD'
              ? `₺${Math.round(onPremTco.hardwareCapexTry).toLocaleString('tr-TR')}`
              : `$${Math.round(onPremTco.hardwareCapexUsd).toLocaleString('en-US')}`}
          </div>
          <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-200">
            {gpuCount}x GPU ({formatMoney(onPremTco.gpuTotalPriceUsd, onPremTco.gpuTotalPriceUsd * onPremTco.usdToTryRate)}) + Kasa & Altyapı ({formatMoney(onPremTco.systemBaseCapexUsd, onPremTco.systemBaseCapexUsd * onPremTco.usdToTryRate)}).
          </p>
        </div>

        {/* 2. Yıllık Toplam Operasyonel Masraf (OPEX) */}
        <div className="bg-slate-50/70 p-3.5 border border-slate-200 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-600 font-bold uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              Yıllık Masraf (OPEX)
            </span>
            <span className="text-[10px] font-mono text-amber-800 bg-amber-50 border border-amber-200 px-1.5 rounded">
              Elektrik + Soğutma + Bakım
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-amber-700">
            {formatMoney(onPremTco.annualOpexTotalUsd, onPremTco.annualOpexTotalTry)}
            <span className="text-xs font-normal text-slate-500"> / yıl</span>
          </div>
          <div className="text-xs font-mono text-amber-800 font-bold">
            {activeCurrency === 'USD'
              ? `₺${Math.round(onPremTco.annualOpexTotalTry).toLocaleString('tr-TR')} / yıl`
              : `$${Math.round(onPremTco.annualOpexTotalUsd).toLocaleString('en-US')} / yıl`}
          </div>
          <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200 space-y-0.5">
            <div>Elektrik: <strong>{formatMoney(onPremTco.annualElectricityCostUsd, onPremTco.annualElectricityCostTry)}</strong></div>
            <div>Soğutma & Bakım & Diğer: <strong>{formatMoney(onPremTco.annualCoolingCostUsd + onPremTco.annualMaintenanceUsd + onPremTco.annualOtherExpensesUsd, (onPremTco.annualCoolingCostUsd + onPremTco.annualMaintenanceUsd + onPremTco.annualOtherExpensesUsd) * onPremTco.usdToTryRate)}</strong></div>
          </div>
        </div>

        {/* 3. 1 Yıllık ve 3 Yıllık Toplam Sahip Olma (TCO) */}
        <div className="bg-slate-50/70 p-3.5 border border-slate-200 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-600 font-bold uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              1 Yıllık Toplam (TCO)
            </span>
            <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 rounded">
              CAPEX + 1 Yıl OPEX
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700">
            {formatMoney(onPremTco.totalFirstYearCostUsd, onPremTco.totalFirstYearCostTry)}
          </div>
          <div className="text-xs font-mono text-slate-600">
            3 Yıllık Toplam: {formatMoney(onPremTco.totalThreeYearCostUsd, onPremTco.totalThreeYearCostTry)}
          </div>
          <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-200">
            3 yıllık amortismanla aylık ortalama: <strong>{formatMoney(onPremTco.monthlyAverageCostUsd, onPremTco.monthlyAverageCostTry)}/ay</strong>
          </p>
        </div>

        {/* 4. Başabaş Noktası (Break-Even vs Cloud) */}
        <div className={`p-3.5 border rounded-xl space-y-1.5 ${
          isBreakEvenFast
            ? 'bg-emerald-50/70 border-emerald-400'
            : 'bg-slate-50/70 border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-600 font-bold uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-cyan-600" />
              Başabaş (ROI Süresi)
            </span>
            <span className={`text-[10px] font-mono font-bold px-1.5 rounded ${
              isBreakEvenFast ? 'text-emerald-800 bg-white border border-emerald-300' : 'text-slate-600 bg-slate-200'
            }`}>
              {onPremTco.breakEvenMonthsVsCloud < 99 ? `~${onPremTco.breakEvenMonthsVsCloud.toFixed(1)} Ay` : 'Bulut Daha Avantajlı'}
            </span>
          </div>

          <div className="text-xl font-bold font-mono text-cyan-800">
            {onPremTco.breakEvenMonthsVsCloud < 99 ? `${onPremTco.breakEvenMonthsVsCloud.toFixed(1)} Ayda` : 'Uzun Vadeli'}
          </div>

          <div className="text-[11px] font-medium text-slate-700 leading-snug">
            {onPremTco.breakEvenDescription}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VISUAL COST DISTRIBUTION BAR (Maliyet Dağılım Çubuğu)                     */}
      {/* ========================================================================= */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-600" />
            1. Yıl Maliyet Bileşenleri Dağılımı (TCO Kırılımı)
          </span>
          <span className="text-slate-500 font-mono text-[11px]">
            Toplam: {formatMoney(onPremTco.totalFirstYearCostUsd, onPremTco.totalFirstYearCostTry)}
          </span>
        </div>

        {/* Stacked Percentage Bar */}
        <div className="w-full h-3.5 bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
          <div
            style={{ width: `${capexPct}%` }}
            className="bg-indigo-600 h-full transition-all duration-300"
            title={`Donanım (CAPEX): %${capexPct.toFixed(1)}`}
          />
          <div
            style={{ width: `${elecPct}%` }}
            className="bg-amber-500 h-full transition-all duration-300"
            title={`Elektrik: %${elecPct.toFixed(1)}`}
          />
          <div
            style={{ width: `${coolPct}%` }}
            className="bg-cyan-500 h-full transition-all duration-300"
            title={`Soğutma: %${coolPct.toFixed(1)}`}
          />
          <div
            style={{ width: `${maintPct}%` }}
            className="bg-emerald-500 h-full transition-all duration-300"
            title={`Bakım & Destek: %${maintPct.toFixed(1)}`}
          />
          {otherPct > 0 && (
            <div
              style={{ width: `${otherPct}%` }}
              className="bg-violet-500 h-full transition-all duration-300"
              title={`Diğer Masraflar: %${otherPct.toFixed(1)}`}
            />
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono pt-1 text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
            <span>Donanım: <strong>{formatMoney(onPremTco.hardwareCapexUsd, onPremTco.hardwareCapexTry)}</strong> (%{capexPct.toFixed(1)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span>Elektrik: <strong>{formatMoney(onPremTco.annualElectricityCostUsd, onPremTco.annualElectricityCostTry)}</strong> (%{elecPct.toFixed(1)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" />
            <span>Soğutma: <strong>{formatMoney(onPremTco.annualCoolingCostUsd, onPremTco.annualCoolingCostTry)}</strong> (%{coolPct.toFixed(1)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>Bakım: <strong>{formatMoney(onPremTco.annualMaintenanceUsd, onPremTco.annualMaintenanceTry)}</strong> (%{maintPct.toFixed(1)})</span>
          </div>
          {onPremTco.annualOtherExpensesUsd > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-500 inline-block" />
              <span>Diğer: <strong>{formatMoney(onPremTco.annualOtherExpensesUsd, onPremTco.annualOtherExpensesTry)}</strong> (%{otherPct.toFixed(1)})</span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DIRECT CLOUD VS ON-PREMISES COMPARISON BANNER                             */}
      {/* ========================================================================= */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="space-y-1">
          <div className="text-slate-600 flex items-center gap-1.5">
            <TrendingDown className="w-4 h-4 text-emerald-600" />
            <span>1 Yıllık Karşılaştırma:</span>
            <strong className="text-slate-900">En Uygun Bulut ({cheapestCloud?.providerName})</strong>
            <span className="text-slate-400">vs.</span>
            <strong className="text-amber-800">Yerel Satın Alma (On-Prem)</strong>
          </div>
          <div className="text-[11px] text-slate-600">
            Bulut 1 Yıl: <span className="text-rose-700 font-bold">{formatMoney(cheapestCloudAnnualCostUsd, cheapestCloudAnnualCostTry)}</span>
            {' '} • Yerel 1 Yıl (TCO): <span className="text-emerald-700 font-bold">{formatMoney(onPremTco.totalFirstYearCostUsd, onPremTco.totalFirstYearCostTry)}</span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-500 block uppercase">2. ve 3. Yıl Yıllık Sabit Masraf (Yalnızca OPEX):</span>
          <span className="text-sm font-bold text-emerald-700">
            ~{formatMoney(onPremTco.annualOpexTotalUsd, onPremTco.annualOpexTotalTry)} / yıl
          </span>
          <span className="text-[10px] text-slate-500 block">
            (Donanım satın alındıktan sonra sadece elektrik, soğutma, bakım ve diğer giderler ödenir)
          </span>
        </div>
      </div>
    </div>
  );
};
