import React from 'react';
import { useTranslation } from 'react-i18next';
import { Users, MessageSquareText, Activity, Plus, Trash2, UserCheck, ToggleLeft, ToggleRight } from 'lucide-react';
import { UserProfile } from '../types';
import { Panel } from './ui/Panel';
import { SectionHeader } from './ui/SectionHeader';
import { Field } from './ui/Field';
import { NumberInput } from './ui/NumberInput';
import { Collapse } from './ui/Collapse';

interface WorkloadConfiguratorProps {
  promptLen: number;
  genLen: number;
  batchSize: number;
  requestsPerMin: number;
  cudaOverheadGB: number;
  activationOverheadPct: number;
  tpEfficiencyPct: number;
  userProfiles: UserProfile[];
  useMultiProfile: boolean;
  onChangePromptLen: (len: number) => void;
  onChangeGenLen: (len: number) => void;
  onChangeBatchSize: (batch: number) => void;
  onChangeRequestsPerMin: (rpm: number) => void;
  onChangeCudaOverhead: (gb: number) => void;
  onChangeActivationOverhead: (pct: number) => void;
  onChangeTpEfficiency: (pct: number) => void;
  onToggleMultiProfile: (enabled: boolean) => void;
  onUpdateProfiles: (profiles: UserProfile[]) => void;
}

export const WorkloadConfigurator: React.FC<WorkloadConfiguratorProps> = ({
  promptLen,
  genLen,
  batchSize,
  requestsPerMin,
  cudaOverheadGB,
  activationOverheadPct,
  tpEfficiencyPct,
  userProfiles,
  useMultiProfile,
  onChangePromptLen,
  onChangeGenLen,
  onChangeBatchSize,
  onChangeRequestsPerMin,
  onChangeCudaOverhead,
  onChangeActivationOverhead,
  onChangeTpEfficiency,
  onToggleMultiProfile,
  onUpdateProfiles,
}) => {
  const { t } = useTranslation();
  const contextPresets = [512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 128000];
  const genPresets = [128, 256, 512, 1024, 2048, 4096];
  const batchPresets = [1, 2, 4, 8, 16, 32, 64, 128];

  // Handlers for User Profiles
  const handleAddProfile = () => {
    const newProfile: UserProfile = {
      id: `profile-${Date.now()}`,
      name: t('workload.newProfileDefaultName', { count: userProfiles.length + 1 }),
      userCount: 5,
      promptLen: 2048,
      genLen: 512,
    };
    onUpdateProfiles([...userProfiles, newProfile]);
  };

  const handleRemoveProfile = (id: string) => {
    onUpdateProfiles(userProfiles.filter((p) => p.id !== id));
  };

  const handleUpdateProfileField = (id: string, field: keyof UserProfile, value: any) => {
    onUpdateProfiles(
      userProfiles.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const totalMultiProfileUsers = userProfiles.reduce((acc, p) => acc + (p.userCount || 0), 0);

  return (
    <Panel className="p-3.5 space-y-3">
      <SectionHeader
        index="05"
        title={t('workload.title')}
        description={
          useMultiProfile
            ? t('workload.multiProfileDesc')
            : t('workload.singleBatchDesc')
        }
        right={
          <button
            onClick={() => onToggleMultiProfile(!useMultiProfile)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-bold rounded-none border-2 transition ${
              useMultiProfile
                ? 'bg-accent text-bg border-accent'
                : 'bg-surface-2 text-muted border-border hover:text-text'
            }`}
          >
            {useMultiProfile ? (
              <ToggleRight className="w-4 h-4" />
            ) : (
              <ToggleLeft className="w-4 h-4" />
            )}
            <span>{useMultiProfile ? t('workload.multiProfileToggle') : t('workload.singleBatchToggle')}</span>
          </button>
        }
      />

      {/* MULTI-PROFILE WORKLOAD MODE */}
      {useMultiProfile ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between bg-surface-2 p-3 border-2 border-border rounded-none text-xs">
            <div className="flex items-center gap-3">
              <span className="font-mono text-info font-bold flex items-center gap-1">
                <Users className="w-4 h-4 text-accent" />
                {t('workload.totalConcurrentUsers', { count: totalMultiProfileUsers })}
              </span>
              <span className="text-border">|</span>
              <span className="text-muted text-[11px] font-medium">
                {t('workload.profileCount', { count: userProfiles.length })}
              </span>
            </div>

            <button
              onClick={handleAddProfile}
              className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-mono font-bold text-bg bg-accent hover:opacity-90 rounded-none transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('workload.addProfile')}</span>
            </button>
          </div>

          {/* User Persona Profiles Grid */}
          <div className="grid grid-cols-1 gap-2.5">
            {userProfiles.map((profile, idx) => (
              <div
                key={profile.id}
                className="bg-surface-2 p-3.5 border-2 border-border hover:border-accent/40 rounded-none transition space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <span className="text-[10px] font-mono font-bold text-info bg-surface border-2 border-border px-2 py-0.5 rounded-none">
                      #{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => handleUpdateProfileField(profile.id, 'name', e.target.value)}
                      placeholder={t('workload.profileNamePlaceholder')}
                      className="bg-surface border-2 border-border rounded-none px-2.5 py-1 text-xs text-text font-bold w-full max-w-xs focus:outline-none focus:border-text"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <UserCheck className="w-4 h-4 text-accent" />
                      <span className="text-muted font-medium">{t('workload.concurrentCount')}</span>
                      <div className="w-16">
                        <NumberInput
                          value={profile.userCount}
                          min={1}
                          max={200}
                          onChange={(v) =>
                            handleUpdateProfileField(profile.id, 'userCount', Math.max(1, Math.round(v) || 1))
                          }
                        />
                      </div>
                    </div>

                    {userProfiles.length > 1 && (
                      <button
                        onClick={() => handleRemoveProfile(profile.id)}
                        className="p-1.5 text-muted hover:text-danger rounded-none hover:bg-surface transition"
                        title={t('workload.removeProfile')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Prompt & Generation Sliders per profile */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Profile Prompt Len */}
                  <div>
                    <div className="flex justify-between items-center text-[10px] mb-1">
                      <span className="font-bold text-muted flex items-center gap-1">
                        <MessageSquareText className="w-3.5 h-3.5 text-accent" />
                        {t('workload.profilePromptTokens')}
                      </span>
                      <span className="font-mono text-info font-bold bg-surface border-2 border-border px-1.5 py-0.2 rounded-none">
                        {profile.promptLen.toLocaleString()} tk
                      </span>
                    </div>
                    <input
                      type="range"
                      min="128"
                      max="128000"
                      step="128"
                      value={profile.promptLen}
                      onChange={(e) =>
                        handleUpdateProfileField(profile.id, 'promptLen', parseInt(e.target.value) || 1024)
                      }
                      className="w-full h-1.5 bg-surface-2 rounded-none appearance-none cursor-pointer accent-[#FFB224]"
                    />
                  </div>

                  {/* Profile Gen Len */}
                  <div>
                    <div className="flex justify-between items-center text-[10px] mb-1">
                      <span className="font-bold text-muted flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-accent" />
                        {t('workload.profileGenTokens')}
                      </span>
                      <span className="font-mono text-info font-bold bg-surface border-2 border-border px-1.5 py-0.2 rounded-none">
                        {profile.genLen.toLocaleString()} tk
                      </span>
                    </div>
                    <input
                      type="range"
                      min="32"
                      max="8192"
                      step="32"
                      value={profile.genLen}
                      onChange={(e) =>
                        handleUpdateProfileField(profile.id, 'genLen', parseInt(e.target.value) || 512)
                      }
                      className="w-full h-1.5 bg-surface-2 rounded-none appearance-none cursor-pointer accent-[#FFB224]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* SINGLE BATCH MODE (Standard Sliders) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Prompt Token Length */}
          <div className="bg-surface-2 p-3.5 border-2 border-border rounded-none">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1">
                <MessageSquareText className="w-3.5 h-3.5 text-accent" />
                {t('workload.promptLen')}
              </label>
              <span className="text-xs font-mono font-bold text-info bg-surface-2 border-2 border-border px-2 py-0.5 rounded-none">
                {promptLen.toLocaleString()} Tokens
              </span>
            </div>

            <input
              type="range"
              min="128"
              max="128000"
              step="128"
              value={promptLen}
              onChange={(e) => onChangePromptLen(parseInt(e.target.value) || 1024)}
              className="w-full h-2 bg-surface-2 rounded-none appearance-none cursor-pointer accent-[#FFB224]"
            />

            <div className="flex flex-wrap gap-1 mt-2">
              {contextPresets.map((p) => (
                <button
                  key={p}
                  onClick={() => onChangePromptLen(p)}
                  className={`px-2 py-0.5 text-[10px] font-mono rounded-none transition border-2 ${
                    promptLen === p
                      ? 'bg-accent text-bg border-accent font-bold'
                      : 'bg-surface-2 text-muted border-border hover:bg-surface hover:text-text'
                  }`}
                >
                  {p >= 1024 ? `${p / 1024}k` : p}
                </button>
              ))}
            </div>
          </div>

          {/* Generation Token Length */}
          <div className="bg-surface-2 p-3.5 border-2 border-border rounded-none">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-accent" />
                {t('workload.genLen')}
              </label>
              <span className="text-xs font-mono font-bold text-info bg-surface-2 border-2 border-border px-2 py-0.5 rounded-none">
                {genLen.toLocaleString()} Tokens
              </span>
            </div>

            <input
              type="range"
              min="32"
              max="8192"
              step="32"
              value={genLen}
              onChange={(e) => onChangeGenLen(parseInt(e.target.value) || 512)}
              className="w-full h-2 bg-surface-2 rounded-none appearance-none cursor-pointer accent-[#FFB224]"
            />

            <div className="flex flex-wrap gap-1 mt-2">
              {genPresets.map((g) => (
                <button
                  key={g}
                  onClick={() => onChangeGenLen(g)}
                  className={`px-2 py-0.5 text-[10px] font-mono rounded-none transition border-2 ${
                    genLen === g
                      ? 'bg-accent text-bg border-accent font-bold'
                      : 'bg-surface-2 text-muted border-border hover:bg-surface hover:text-text'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Batch Size (Concurrency) */}
          <div className="bg-surface-2 p-3.5 border-2 border-border rounded-none">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-accent" />
                {t('workload.batchSize')}
              </label>
              <span className="text-xs font-mono font-bold text-info bg-surface-2 border-2 border-border px-2 py-0.5 rounded-none">
                {t('workload.batchStreams', { count: batchSize })}
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="256"
              step="1"
              value={batchSize}
              onChange={(e) => onChangeBatchSize(parseInt(e.target.value) || 1)}
              className="w-full h-2 bg-surface-2 rounded-none appearance-none cursor-pointer accent-[#FFB224]"
            />

            <div className="flex flex-wrap gap-1 mt-2">
              {batchPresets.map((b) => (
                <button
                  key={b}
                  onClick={() => onChangeBatchSize(b)}
                  className={`px-2 py-0.5 text-[10px] font-mono rounded-none transition border-2 ${
                    batchSize === b
                      ? 'bg-accent text-bg border-accent font-bold'
                      : 'bg-surface-2 text-muted border-border hover:bg-surface hover:text-text'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Requests Per Minute */}
          <div className="bg-surface-2 p-3.5 border-2 border-border rounded-none">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-accent" />
                {t('workload.requestsPerMin')}
              </label>
              <span className="text-xs font-mono font-bold text-info bg-surface-2 border-2 border-border px-2 py-0.5 rounded-none">
                {requestsPerMin} req/min ({(requestsPerMin / 60).toFixed(1)} rps)
              </span>
            </div>

            <input
              type="range"
              min="10"
              max="3000"
              step="10"
              value={requestsPerMin}
              onChange={(e) => onChangeRequestsPerMin(parseInt(e.target.value) || 60)}
              className="w-full h-2 bg-surface-2 rounded-none appearance-none cursor-pointer accent-[#FFB224]"
            />

            <div className="flex justify-between text-[10px] text-muted font-mono mt-2">
              <span>{t('workload.rpmTick', { value: '10' })}</span>
              <span>{t('workload.rpmTick', { value: '100' })}</span>
              <span>{t('workload.rpmTick', { value: '500' })}</span>
              <span>{t('workload.rpmTick', { value: '1,000' })}</span>
              <span>{t('workload.rpmTick', { value: '3,000' })}</span>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Settings Drawer */}
      <Collapse title={t('workload.advancedTitle')}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <Field label={t('workload.cudaOverhead')}>
            <NumberInput
              value={cudaOverheadGB}
              step={0.1}
              onChange={(v) => onChangeCudaOverhead(v || 1.0)}
            />
            <p className="text-[10px] text-muted mt-1">
              {t('workload.cudaOverheadHint')}
            </p>
          </Field>

          <Field label={t('workload.activationOverhead')}>
            <NumberInput
              value={activationOverheadPct}
              onChange={(v) => onChangeActivationOverhead(v || 10)}
            />
            <p className="text-[10px] text-muted mt-1">
              {t('workload.activationOverheadHint')}
            </p>
          </Field>

          <Field label={t('workload.tpEfficiency')}>
            <NumberInput
              value={tpEfficiencyPct}
              onChange={(v) => onChangeTpEfficiency(v || 85)}
            />
            <p className="text-[10px] text-muted mt-1">
              {t('workload.tpEfficiencyHint')}
            </p>
          </Field>
        </div>
      </Collapse>
    </Panel>
  );
};