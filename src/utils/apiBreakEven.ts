import { CalculationResults } from '../types';
import { getApiTier, ApiTierId, ApiProviderPrice } from '../data/apiPricePresets';

export interface ApiChartPoint {
  volumeB: number;
  selfHostUsd: number;
  apiUsd: number;
}

export interface ApiBreakEven {
  tierId: ApiTierId;
  provider: ApiProviderPrice;
  selfHostPerMIn: number;
  selfHostPerMOut: number;
  selfHostPerMTokens: number;
  blendedApiPerM: number;
  selfHostMonthlyUsd: number;
  breakEvenTokensB: number;
  series: ApiChartPoint[];
}

export function computeApiBreakEven(
  results: CalculationResults,
  tierId: ApiTierId,
  providerId: string
): ApiBreakEven {
  const tier = getApiTier(tierId);
  const provider = tier.providers.find((p) => p.providerId === providerId) ?? tier.providers[0];

  const promptLen = Math.max(1, results.effectivePromptLen || 1);
  const genLen = Math.max(1, results.effectiveGenLen || 1);
  const totalLen = promptLen + genLen;
  const promptFrac = promptLen / totalLen;
  const genFrac = 1 - promptFrac;
  const blendedApiPerM = provider.inputPricePerM * promptFrac + provider.outputPricePerM * genFrac;

  const selfHostMonthlyUsd = Math.max(0, results.onPremTco.monthlyAverageCostUsd || 0);
  const breakEvenTokensB = blendedApiPerM > 0 ? selfHostMonthlyUsd / blendedApiPerM / 1000 : 1e6;

  const xMaxB = Math.max(2, Math.ceil(breakEvenTokensB * 1.5));
  const STEPS = 21;
  const series: ApiChartPoint[] = Array.from({ length: STEPS }, (_, i) => {
    const volumeB = (xMaxB / (STEPS - 1)) * i;
    return {
      volumeB,
      selfHostUsd: selfHostMonthlyUsd,
      apiUsd: volumeB * blendedApiPerM * 1000,
    };
  });

  return {
    tierId,
    provider,
    selfHostPerMIn: results.costPerMillionInputTokensUsd,
    selfHostPerMOut: results.costPerMillionOutputTokensUsd,
    selfHostPerMTokens: results.costPerMillionTotalTokensUsd,
    blendedApiPerM,
    selfHostMonthlyUsd,
    breakEvenTokensB,
    series,
  };
}