// Known people / institutions whose open-source LLMs are allowed into the
// catalog. Refresh only enumerates these orgs — no arbitrary repos.
export const KNOWN_ORGS: Array<{
  org: string;
  repoTerms: string[]; // repo-name must match at least one term (lowercased)
}> = [
  { org: 'deepseek-ai', repoTerms: ['deepseek', 'dclm'] },
  { org: 'Qwen', repoTerms: ['qwen'] },
  { org: 'meta-llama', repoTerms: ['llama', 'muse', 'chameleon'] },
  { org: 'google', repoTerms: ['gemma', 'recurrentgemma', 'pali'] },
  { org: 'mistralai', repoTerms: ['mistral', 'mixtral', 'codestral', 'ministral', 'voxtral'] },
  { org: 'microsoft', repoTerms: ['phi', 'orca', 'wizardlm'] },
  { org: 'nvidia', repoTerms: ['nemotron', 'nemotron-ultra'] },
  { org: 'CohereForAI', repoTerms: ['command', 'aya'] },
  { org: 'openai', repoTerms: ['gpt-oss'] },
  { org: 'zai-org', repoTerms: ['glm'] },
  { org: 'moonshotai', repoTerms: ['kimi'] },
  { org: 'MiniMaxAI', repoTerms: ['minimax'] },
  { org: 'ai21labs', repoTerms: ['jamba'] },
  { org: 'ibm', repoTerms: ['granite'] },
  { org: 'databricks', repoTerms: ['dbrx'] },
  { org: 'xai-org', repoTerms: ['grok'] },
  { org: 'apple', repoTerms: ['openelm'] },
  { org: 'allenai', repoTerms: ['olmo', 'tulu'] },
  { org: 'snowflake-arctic', repoTerms: ['arctic'] },
  { org: 'WizardLMTeam', repoTerms: ['wizardlm'] },
  { org: 'Tencent', repoTerms: ['hunyuan'] },
  { org: 'THUDM', repoTerms: ['glm'] },
  { org: 'BAAI', repoTerms: ['aquila'] },
  { org: '01-ai', repoTerms: ['yi'] },
  { org: 'upstage', repoTerms: ['solar'] },
  { org: 'TheBloke', repoTerms: [] }, // placeholder, never matches
];

// Original producer attribution. Every model pulled from Hugging Face
// (official or community mirror) is labeled with its ORIGINAL manufacturer —
// never with the uploader's org. Order matters: more specific terms first.
export const PRODUCERS: Array<{ term: string; producer: string; category: string }> = [
  { term: 'recurrentgemma', producer: 'Google', category: 'Google' },
  { term: 'deepseek', producer: 'DeepSeek', category: 'DeepSeek' },
  { term: 'qwen', producer: 'Alibaba Cloud', category: 'Qwen' },
  { term: 'llama', producer: 'Meta', category: 'Llama' },
  { term: 'muse', producer: 'Meta', category: 'Llama' },
  { term: 'chameleon', producer: 'Meta', category: 'Llama' },
  { term: 'gemma', producer: 'Google', category: 'Google' },
  { term: 'pali', producer: 'Google', category: 'Google' },
  { term: 'ministral', producer: 'Mistral AI', category: 'Mistral' },
  { term: 'pixtral', producer: 'Mistral AI', category: 'Mistral' },
  { term: 'voxtral', producer: 'Mistral AI', category: 'Mistral' },
  { term: 'codestral', producer: 'Mistral AI', category: 'Mistral' },
  { term: 'mixtral', producer: 'Mistral AI', category: 'Mistral' },
  { term: 'mistral', producer: 'Mistral AI', category: 'Mistral' },
  { term: 'phi', producer: 'Microsoft', category: 'Microsoft' },
  { term: 'orca', producer: 'Microsoft', category: 'Microsoft' },
  { term: 'wizardlm', producer: 'Microsoft', category: 'Microsoft' },
  { term: 'nemotron', producer: 'NVIDIA', category: 'NVIDIA' },
  { term: 'command', producer: 'Cohere', category: 'Cohere' },
  { term: 'aya', producer: 'Cohere', category: 'Cohere' },
  { term: 'gpt-oss', producer: 'OpenAI', category: 'Other' },
  { term: 'chatglm', producer: 'Zhipu AI', category: 'Other' },
  { term: 'glm', producer: 'Zhipu AI', category: 'Other' },
  { term: 'kimi', producer: 'Moonshot AI', category: 'Other' },
  { term: 'minimax', producer: 'MiniMax', category: 'Other' },
  { term: 'jamba', producer: 'AI21 Labs', category: 'Other' },
  { term: 'granite', producer: 'IBM', category: 'Other' },
  { term: 'dbrx', producer: 'Databricks', category: 'Other' },
  { term: 'grok', producer: 'xAI', category: 'Other' },
  { term: 'openelm', producer: 'Apple', category: 'Other' },
  { term: 'olmo', producer: 'AI2 (Allen Institute)', category: 'Other' },
  { term: 'tulu', producer: 'AI2 (Allen Institute)', category: 'Other' },
  { term: 'arctic', producer: 'Snowflake', category: 'Other' },
  { term: 'hunyuan', producer: 'Tencent', category: 'Other' },
  { term: 'aquila', producer: 'BAAI', category: 'Other' },
  { term: 'exaone', producer: 'LG AI Research', category: 'Other' },
  { term: 'yi', producer: '01.AI', category: 'Other' },
  { term: 'solar', producer: 'Upstage', category: 'Other' },
];

export interface ProducerInfo {
  producer: string;
  category: string;
  term: string;
}

export function resolveProducer(repoId: string): ProducerInfo | null {
  const name = repoId.toLowerCase();
  for (const p of PRODUCERS) {
    if (name.includes(p.term)) return p;
  }
  return null;
}

// Format / quant / non-LLM-pipeline suffixes: rejected for catalog rows. These
// mirrors may still be used for architecture config (metadata only), so they
// live in a separate list.
const FORMAT_BLOCKLIST =
  /(gguf|gptq|awq|exl2|mlx|ggml|onnx|torchscript|tensorrt|ncnn|original|embed|rerank|retriev|asr|stt|tts|ocr|audio|speech|diffusion|safety|guard|orchestrator|safeguard|reward|tokenizer|fp8|nvfp4|mxfp8|4bit|8bit|int4|int8|qat|q4_0|q8_0|quant|16bit|4q|8q|w\d+a\d+|image|e5|mt0|clip|siglip)/i;

// Derivatives / fine-tunes and superseded old-gen families: never useful for
// either the catalog or mirror config (a fine-tune may carry altered arch).
const DERIVATIVE_BLOCKLIST =
  /(starcoder|codegeex|orca|yi-|deepseek-coder|deepseek-math|deepseek-moe-16b|deepseek-llm|chatglm|glm-2b|glm-10b|glm-4-9b|webglm|aquila|solar-10.7b|solar-0|solar-pro|phi-3-|molmo|mistral-7b-v0|mistral-7b-instruct-v0|mixtral|grok-2|wizardlm|visualglm|olmoe|kimi-dev|jamba-v0|jamba2-mini|teacher|minimax-text-01|minimax-m1-40k|mistral-small-instruct-2409|mistral-small-24b-instruct-2501|abliterated|simpo|grpo|dpo|dolphin|wolf|zephyr|merged|merge|eagle|slerp|apollyon|heretic|myrrh|sakura|evo|hermes|nous|smaug|goliath|detox|layer|expo)/i;

// Pipelines that are not text-capable LLMs (embedding/ASR/vision-only/image
// generation/classification...). null/unknown passes so newly-tagged repos
// aren't accidentally dropped.
const NON_LLM_PIPELINES = new Set([
  'automatic-speech-recognition',
  'text-to-speech',
  'text-to-audio',
  'audio-classification',
  'audio-to-audio',
  'text-to-image',
  'image-to-image',
  'text-to-video',
  'image-to-video',
  'image-classification',
  'image-segmentation',
  'object-detection',
  'zero-shot-image-classification',
  'feature-extraction',
  'sentence-similarity',
  'zero-shot-classification',
  'token-classification',
  'text-classification',
  'translation',
  'summarization',
  'question-answering',
  'fill-mask',
]);

export function isTextPipeline(tag?: string | null): boolean {
  if (!tag) return true;
  return !NON_LLM_PIPELINES.has(tag);
}

export function isFormatBlocked(repoId: string): boolean {
  return FORMAT_BLOCKLIST.test(repoId);
}

export function isDerivativeBlocked(repoId: string): boolean {
  return DERIVATIVE_BLOCKLIST.test(repoId);
}

// Coarse size gate so fine-tunes / derivative checkpoints don't flood the list.
const MIN_PARAMS_B = 3;

// Normalize a repo id to its "family" so variant releases (base/instruct/date/
// version suffixes) collapse onto one entry. Used to skip discovered models
// whose family is already covered by the curated catalog or a sibling.
export function familyKey(repoId: string): string {
  const org = repoId.split('/')[0].toLowerCase();
  const repo = repoId.split('/').slice(1).join('/').toLowerCase();
  let cleaned = repo
    .replace(/-\d{4,6}$/g, '')
    .replace(/-v0(\.\d+)*$/g, '');
  for (let i = 0; i < 3; i++) {
    cleaned = cleaned.replace(/-(instruct|it|chat|base|pt|preview|exp|think|thinking|bf16|fp16|16bit|hf)$/g, '');
    cleaned = cleaned.replace(/-\d{4,6}$/g, '');
    cleaned = cleaned.replace(/-v0(\.\d+)*$/g, '');
  }
  return `${org}/${cleaned}`;
}

// Family+size key, org-independent (used for search + cross-org mirror matching).
export function familySizeKey(repoId: string): string {
  const parts = familyKey(repoId).split('/');
  return parts[parts.length - 1];
}

// Producer-prefixed family: collapses mirrors across orgs onto one entry
// (e.g. unsloth/Llama-3.3-70B-* and meta-llama/Llama-3.3-70B-* -> Meta/llama-3.3-70b).
export function producerFamilyKey(repoId: string): string {
  const prod = resolveProducer(repoId);
  const orgless = familyKey(repoId).split('/').slice(1).join('/');
  return `${prod ? prod.producer : '?'}/${orgless}`;
}

// Catalog rows: only known official orgs, family-term match, no quantized
// formats and no derivatives.
export function isCandidateRepo(repoId: string): { allowed: boolean; reason?: string } {
  const [org, ...rest] = repoId.split('/');
  const repo = rest.join('/');
  const known = KNOWN_ORGS.find((k) => k.org.toLowerCase() === org?.toLowerCase());
  if (!known) return { allowed: false, reason: 'unknown org' };
  if (known.repoTerms.length === 0) return { allowed: false, reason: 'org not eligible' };
  const matchesTerm = known.repoTerms.some((t) => repo.toLowerCase().includes(t));
  if (!matchesTerm) return { allowed: false, reason: 'no matching family term' };
  if (FORMAT_BLOCKLIST.test(repo)) return { allowed: false, reason: 'blocked format' };
  if (DERIVATIVE_BLOCKLIST.test(repo)) return { allowed: false, reason: 'blocked derivative' };
  return { allowed: true };
}

// Mirror config candidate: same family+size as the gated model, not a
// derivative. Quantized formats are fine — we only read config.json metadata.
export function isCandidateMirror(repoId: string, familySize: string): { allowed: boolean; reason?: string } {
  const name = repoId.toLowerCase();
  if (familySize && !name.includes(familySize)) {
    return { allowed: false, reason: 'family size mismatch' };
  }
  if (DERIVATIVE_BLOCKLIST.test(repoId)) return { allowed: false, reason: 'blocked derivative' };
  return { allowed: true };
}

export function getMinParamsB(): number {
  return MIN_PARAMS_B;
}