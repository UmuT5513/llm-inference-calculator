import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, ExternalLink, Eye, Layers } from 'lucide-react';
import { ModelPreset, ModelSourceLink } from '../types';
import { Badge } from './ui/Badge';

interface ModelDetailsPanelProps {
  model: ModelPreset;
}

const PROVIDER_LABEL_KEYS: Record<ModelSourceLink['provider'], string> = {
  huggingface: 'provider.huggingface',
  modelscope: 'provider.modelscope',
  ollama: 'provider.ollama',
};

function sourceUrl(source: ModelSourceLink): string {
  if (source.url) return source.url;
  switch (source.provider) {
    case 'huggingface':
      return `https://huggingface.co/${source.id}`;
    case 'modelscope':
      return `https://modelscope.cn/models/${source.id}`;
    case 'ollama':
      return `https://ollama.com/library/${source.id}`;
    default:
      return '#';
  }
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const fmt = (value: number | null | undefined): string =>
  isFiniteNumber(value) ? String(value) : '—';

export const ModelDetailsPanel: React.FC<ModelDetailsPanelProps> = ({ model }) => {
  const { t, i18n } = useTranslation();
  const isTr = (i18n.language || '').toLowerCase().startsWith('tr');
  const locale = isTr ? 'tr-TR' : 'en-US';

  const formatReleaseDate = (iso: string): string => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const releaseText = model.releasedAt
    ? formatReleaseDate(model.releasedAt)
    : model.releasedLabel || t('modelDetails.unknown');

  // Defensive: fall back to the primary HF repo when the API sends no sources array yet.
  const sources: ModelSourceLink[] =
    model.sources && model.sources.length > 0
      ? model.sources
      : model.hfId
        ? [{ provider: 'huggingface', id: model.hfId, url: `https://huggingface.co/${model.hfId}` }]
        : [];

  const modalities = (model.modalities ?? []).filter((m) => typeof m === 'string' && m.length > 0);
  const modalitiesText = modalities
    .map((m) => m.charAt(0).toUpperCase() + m.slice(1))
    .join(' · ');

  const visionParamsB = isFiniteNumber(model.visionParamsB) ? model.visionParamsB : undefined;
  const hasVisionEncoder = visionParamsB !== undefined && visionParamsB > 0;

  const gqaRatio =
    isFiniteNumber(model.numHeads) && isFiniteNumber(model.numKvHeads) && model.numKvHeads > 0
      ? `${(model.numHeads / model.numKvHeads).toFixed(1)}:1`
      : '—';

  const contextK = isFiniteNumber(model.maxContextLen)
    ? `${(model.maxContextLen / 1024).toFixed(0)}k`
    : '—';

  const unverified = model.verified === false;
  const mirrored = model.source === 'mirror' && model.verified !== false && !!model.mirrorHfId;

  return (
    <section className="bg-surface border-2 border-border rounded-none p-3.5 space-y-3 lg:sticky lg:top-20">
      {/* Header */}
      <div className="border-b-2 border-border pb-2.5">
        <div className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">
          {t('modelDetails.title')}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-accent">
            {model.provider}
          </span>
          <Layers className="w-3.5 h-3.5 text-muted" />
        </div>
        <h3 className="text-xs font-bold text-text mt-1 line-clamp-2">{model.name}</h3>
        <div className="flex flex-wrap items-center gap-1 mt-1.5">
          {model.isMoe ? (
            <Badge tone="accent" className="font-mono">
              {t('modelDetails.moe', { active: model.activeParamsB, total: model.totalParamsB })}
              {isFiniteNumber(model.numExperts) ? ` · ${model.numExperts}×` : ''}
            </Badge>
          ) : (
            <Badge tone="default" className="font-mono">
              {t('modelDetails.dense')}
            </Badge>
          )}
          {unverified && (
            <Badge tone="danger" title={t('model.unverifiedShortTitle')}>
              {t('model.unverifiedShort')}
            </Badge>
          )}
          {mirrored && (
            <Badge
              tone="default"
              title={t('model.mirrorBadgeTitle', {
                mirrorHfId: model.mirrorHfId || t('model.communityRepo'),
              })}
            >
              {t('model.mirrorBadge')}
            </Badge>
          )}
        </div>
      </div>

      {/* Release date */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted uppercase tracking-wider">
          <Calendar className="w-3 h-3 text-accent" />
          <span>{t('modelDetails.releaseDate')}</span>
        </div>
        <p className="text-[11px] font-mono text-text pl-4">{releaseText}</p>
      </div>

      {/* Sources */}
      <div className="space-y-1.5">
        <div className="text-[10px] font-semibold text-muted uppercase tracking-wider">
          {t('modelDetails.sources')}
        </div>
        {sources.length === 0 ? (
          <p className="text-[11px] font-mono text-muted">—</p>
        ) : (
          <div className="space-y-1">
            {sources.map((source) => (
              <a
                key={`${source.provider}:${source.id}`}
                href={sourceUrl(source)}
                target="_blank"
                rel="noreferrer"
                title={source.id}
                className="flex items-center justify-between gap-2 border-2 border-border rounded-none bg-surface-2 px-2 py-1 text-[10px] font-mono text-text hover:border-accent hover:bg-surface transition"
              >
                <span className="inline-flex items-center gap-1.5 shrink-0">
                  <ExternalLink className="w-3 h-3 text-accent" />
                  <span className="font-semibold">{t(PROVIDER_LABEL_KEYS[source.provider])}</span>
                </span>
                <span className="truncate text-muted">{source.id}</span>
              </a>
            ))}
          </div>
        )}
        {mirrored && (
          <p className="text-[10px] font-mono text-muted">
            {t('model.mirrorShort')} · {model.mirrorHfId}
          </p>
        )}
      </div>

      {/* Multimodal */}
      {model.isMultimodal && (
        <div className="border-2 border-border rounded-none bg-surface-2 p-2 space-y-1.5">
          <div>
            <Badge tone="accent" className="font-mono">
              {t('modelDetails.multimodal')}
            </Badge>
          </div>
          {modalitiesText && (
            <p className="text-[10px] font-mono text-muted">
              {t('modelDetails.modalities', { list: modalitiesText })}
            </p>
          )}
          {hasVisionEncoder && (
            <p className="text-[10px] font-mono text-muted inline-flex items-center gap-1">
              <Eye className="w-3 h-3 text-accent" />
              {t('modelDetails.visionEncode', { b: visionParamsB })}
            </p>
          )}
        </div>
      )}

      {/* Architecture summary */}
      <div className="space-y-1.5">
        <div className="text-[10px] font-semibold text-muted uppercase tracking-wider">
          {t('modelDetails.architecture')}
        </div>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px] font-mono">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted">{t('modelDetails.layers')}</dt>
            <dd className="text-text font-semibold">{fmt(model.numLayers)}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted">{t('modelDetails.heads')}</dt>
            <dd className="text-text font-semibold">
              {fmt(model.numHeads)}
              <span className="text-muted"> (KV: {fmt(model.numKvHeads)})</span>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted">{t('modelDetails.headDim')}</dt>
            <dd className="text-text font-semibold">{fmt(model.headDim)}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted">{t('modelDetails.hidden')}</dt>
            <dd className="text-text font-semibold">{fmt(model.hiddenSize)}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted">{t('modelDetails.gqa')}</dt>
            <dd className="text-text font-semibold">{gqaRatio}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted">{t('modelDetails.context')}</dt>
            <dd className="text-text font-semibold">{contextK}</dd>
          </div>
          {isFiniteNumber(model.downloads) && (
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted">{t('modelDetails.downloads')}</dt>
              <dd className="text-text font-semibold">
                {model.downloads.toLocaleString(locale)}
              </dd>
            </div>
          )}
          {isFiniteNumber(model.likes) && (
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted">{t('modelDetails.likes')}</dt>
              <dd className="text-text font-semibold">{model.likes.toLocaleString(locale)}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Description */}
      {model.description && (
        <p className="text-[10px] text-muted leading-relaxed border-t border-border pt-2">
          {model.description}
        </p>
      )}
    </section>
  );
};
