export type ApiTierId = '8b' | '70b' | 'frontier';

export interface ApiProviderPrice {
  providerId: string;
  providerName: string;
  model: string;
  inputPricePerM: number;
  outputPricePerM: number;
}

export interface ApiTier {
  id: ApiTierId;
  providers: ApiProviderPrice[];
}

export const API_TIERS: ApiTier[] = [
  {
    id: '8b',
    providers: [
      { providerId: 'openai', providerName: 'OpenAI', model: 'GPT-5.6-luna', inputPricePerM: 0.2, outputPricePerM: 1.2 },
      { providerId: 'anthropic', providerName: 'Anthropic', model: 'Claude Haiku 4.5', inputPricePerM: 1.0, outputPricePerM: 5.0 },
      { providerId: 'google', providerName: 'Google', model: 'Gemini 3.1 Flash-Lite', inputPricePerM: 0.25, outputPricePerM: 1.5 },
      { providerId: 'deepseek', providerName: 'DeepSeek', model: 'DeepSeek V4-flash', inputPricePerM: 0.22, outputPricePerM: 0.66 },
      { providerId: 'mistral', providerName: 'Mistral', model: 'Mistral Small 4', inputPricePerM: 0.15, outputPricePerM: 0.6 },
    ],
  },
  {
    id: '70b',
    providers: [
      { providerId: 'openai', providerName: 'OpenAI', model: 'GPT-5.6-terra', inputPricePerM: 2.0, outputPricePerM: 12.0 },
      { providerId: 'anthropic', providerName: 'Anthropic', model: 'Claude Sonnet 5', inputPricePerM: 2.0, outputPricePerM: 10.0 },
      { providerId: 'google', providerName: 'Google', model: 'Gemini 3.1 Pro', inputPricePerM: 2.0, outputPricePerM: 12.0 },
      { providerId: 'deepseek', providerName: 'DeepSeek', model: 'DeepSeek V3.2', inputPricePerM: 0.28, outputPricePerM: 0.42 },
      { providerId: 'mistral', providerName: 'Mistral', model: 'Mistral Large 3', inputPricePerM: 0.5, outputPricePerM: 1.5 },
    ],
  },
  {
    id: 'frontier',
    providers: [
      { providerId: 'openai', providerName: 'OpenAI', model: 'GPT-5.6-sol', inputPricePerM: 4.0, outputPricePerM: 20.0 },
      { providerId: 'anthropic', providerName: 'Anthropic', model: 'Claude Opus 5', inputPricePerM: 5.0, outputPricePerM: 25.0 },
      { providerId: 'google', providerName: 'Google', model: 'Gemini 3.5 Pro', inputPricePerM: 3.0, outputPricePerM: 18.0 },
      { providerId: 'deepseek', providerName: 'DeepSeek', model: 'DeepSeek V4-pro', inputPricePerM: 0.66, outputPricePerM: 1.98 },
      { providerId: 'mistral', providerName: 'Mistral', model: 'Mistral Medium 3.5', inputPricePerM: 1.5, outputPricePerM: 7.5 },
    ],
  },
];

export function apiTierForParams(paramsB: number): ApiTierId {
  if (paramsB <= 20) return '8b';
  if (paramsB <= 100) return '70b';
  return 'frontier';
}

export function getApiTier(id: ApiTierId): ApiTier {
  return API_TIERS.find((t) => t.id === id) ?? API_TIERS[1];
}