import { CalculatorConfig, CalculationResults, FineTuningConfig, FineTuningResults } from '../types';

export interface SavedScenario {
  id: string;
  type: 'inference' | 'finetuning';
  name: string;
  description: string | null;
  config: CalculatorConfig | FineTuningConfig;
  results: CalculationResults | FineTuningResults;
  created_at: string;
  updated_at: string;
}

const STORAGE_KEY = 'llmcalc:scenarios';

export function listScenarios(): SavedScenario[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedScenario[]) : [];
  } catch {
    return [];
  }
}

function persist(scenarios: SavedScenario[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
  } catch {
    // Storage full or unavailable; keep the in-memory state only.
  }
}

export interface NewScenarioInput {
  type: 'inference' | 'finetuning';
  name: string;
  description: string | null;
  config: CalculatorConfig | FineTuningConfig;
  results: CalculationResults | FineTuningResults;
}

export function saveScenario(input: NewScenarioInput): SavedScenario {
  const now = new Date().toISOString();
  const scenario: SavedScenario = {
    id: crypto.randomUUID(),
    type: input.type,
    name: input.name,
    description: input.description,
    config: input.config,
    results: input.results,
    created_at: now,
    updated_at: now,
  };
  persist([scenario, ...listScenarios()]);
  return scenario;
}

export function deleteScenario(id: string): void {
  persist(listScenarios().filter((s) => s.id !== id));
}
