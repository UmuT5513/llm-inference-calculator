import React, { useState } from 'react';
import { SlidersHorizontal, Users, MessageSquareText, Activity, Settings2, Plus, Trash2, UserCheck, ToggleLeft, ToggleRight } from 'lucide-react';
import { UserProfile } from '../types';

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
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const contextPresets = [512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 128000];
  const genPresets = [128, 256, 512, 1024, 2048, 4096];
  const batchPresets = [1, 2, 4, 8, 16, 32, 64, 128];

  // Handlers for User Profiles
  const handleAddProfile = () => {
    const newProfile: UserProfile = {
      id: `profile-${Date.now()}`,
      name: `Kullanıcı Tipi ${userProfiles.length + 1}`,
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
    <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs space-y-3.5">
      {/* Section Header with Mode Toggle */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-2.5 gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-violet-50 text-violet-700 rounded-lg border border-violet-200">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              5. İş Yükü ve Kullanıcı Profilleri (Workload)
            </h2>
            <p className="text-[11px] text-slate-500">
              {useMultiProfile
                ? 'Özelleştirilebilir çoklu kullanıcı tipleri (farklı prompt/gen uzunlukları ve eşzamanlı sayıları)'
                : 'Sabit tekil batch size ve homojen girdi/çıktı token boyutları'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Multi-Profile Toggle Button */}
          <button
            onClick={() => onToggleMultiProfile(!useMultiProfile)}
            className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-mono font-bold rounded-lg border transition ${
              useMultiProfile
                ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {useMultiProfile ? (
              <>
                <ToggleRight className="w-4 h-4 text-white" />
                <span>Çoklu Kullanıcı (Aktif)</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4 text-slate-400" />
                <span>Tekil Batch Modu</span>
              </>
            )}
          </button>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 transition"
          >
            <Settings2 className="w-3.5 h-3.5 text-violet-600" />
            <span>{showAdvanced ? 'Gelişmişi Gizle' : 'Gelişmiş Parametreler'}</span>
          </button>
        </div>
      </div>

      {/* MULTI-PROFILE WORKLOAD MODE */}
      {useMultiProfile ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between bg-slate-50 p-3 border border-slate-200 rounded-xl text-xs">
            <div className="flex items-center gap-3">
              <span className="font-mono text-violet-800 font-bold flex items-center gap-1">
                <Users className="w-4 h-4 text-violet-600" />
                Toplam Eşzamanlı Kullanıcı: {totalMultiProfileUsers}
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-600 text-[11px] font-medium">
                {userProfiles.length} Farklı Kullanıcı Tipi
              </span>
            </div>

            <button
              onClick={handleAddProfile}
              className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-mono font-bold text-white bg-violet-600 hover:bg-violet-500 rounded-lg transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Yeni Kullanıcı Tipi Ekle</span>
            </button>
          </div>

          {/* User Persona Profiles Grid */}
          <div className="grid grid-cols-1 gap-2.5">
            {userProfiles.map((profile, idx) => (
              <div
                key={profile.id}
                className="bg-white p-3.5 border border-slate-200 hover:border-slate-300 rounded-xl transition space-y-3 shadow-2xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <span className="text-[10px] font-mono font-bold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded">
                      #{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => handleUpdateProfileField(profile.id, 'name', e.target.value)}
                      placeholder="Kullanıcı Tipi İsmi (ör. Chat, RAG, Kod)"
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-900 font-bold w-full max-w-xs focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <UserCheck className="w-4 h-4 text-amber-600" />
                      <span className="text-slate-600 font-medium">Eşzamanlı Sayı:</span>
                      <input
                        type="number"
                        min="1"
                        max="200"
                        value={profile.userCount}
                        onChange={(e) =>
                          handleUpdateProfileField(profile.id, 'userCount', Math.max(1, parseInt(e.target.value) || 1))
                        }
                        className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-amber-800 text-center"
                      />
                    </div>

                    {userProfiles.length > 1 && (
                      <button
                        onClick={() => handleRemoveProfile(profile.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                        title="Profil Sil"
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
                      <span className="font-bold text-slate-700 flex items-center gap-1">
                        <MessageSquareText className="w-3.5 h-3.5 text-indigo-600" />
                        Girdi (Prompt) Tokens
                      </span>
                      <span className="font-mono text-indigo-700 font-bold bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
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
                      className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  {/* Profile Gen Len */}
                  <div>
                    <div className="flex justify-between items-center text-[10px] mb-1">
                      <span className="font-bold text-slate-700 flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-emerald-600" />
                        Üretim (Output) Tokens
                      </span>
                      <span className="font-mono text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
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
                      className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-emerald-600"
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
          <div className="bg-slate-50/70 p-3.5 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <MessageSquareText className="w-3.5 h-3.5 text-indigo-600" />
                Girdi Uzunluğu (Prompt)
              </label>
              <span className="text-xs font-mono font-bold text-indigo-700 bg-white border border-indigo-200 px-2 py-0.5 rounded shadow-2xs">
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
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />

            <div className="flex flex-wrap gap-1 mt-2">
              {contextPresets.map((p) => (
                <button
                  key={p}
                  onClick={() => onChangePromptLen(p)}
                  className={`px-2 py-0.5 text-[10px] font-mono rounded-md transition border ${
                    promptLen === p
                      ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {p >= 1024 ? `${p / 1024}k` : p}
                </button>
              ))}
            </div>
          </div>

          {/* Generation Token Length */}
          <div className="bg-slate-50/70 p-3.5 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-emerald-600" />
                Üretim Uzunluğu (Output)
              </label>
              <span className="text-xs font-mono font-bold text-emerald-700 bg-white border border-emerald-200 px-2 py-0.5 rounded shadow-2xs">
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
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />

            <div className="flex flex-wrap gap-1 mt-2">
              {genPresets.map((g) => (
                <button
                  key={g}
                  onClick={() => onChangeGenLen(g)}
                  className={`px-2 py-0.5 text-[10px] font-mono rounded-md transition border ${
                    genLen === g
                      ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Batch Size (Concurrency) */}
          <div className="bg-slate-50/70 p-3.5 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-amber-600" />
                Batch Size (Eşzamanlılık)
              </label>
              <span className="text-xs font-mono font-bold text-amber-800 bg-white border border-amber-300 px-2 py-0.5 rounded shadow-2xs">
                {batchSize} Akış
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="256"
              step="1"
              value={batchSize}
              onChange={(e) => onChangeBatchSize(parseInt(e.target.value) || 1)}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />

            <div className="flex flex-wrap gap-1 mt-2">
              {batchPresets.map((b) => (
                <button
                  key={b}
                  onClick={() => onChangeBatchSize(b)}
                  className={`px-2 py-0.5 text-[10px] font-mono rounded-md transition border ${
                    batchSize === b
                      ? 'bg-amber-500 text-white border-amber-500 font-bold shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Requests Per Minute */}
          <div className="bg-slate-50/70 p-3.5 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-cyan-600" />
                Trafik Hızı (Requests / Min)
              </label>
              <span className="text-xs font-mono font-bold text-cyan-800 bg-white border border-cyan-300 px-2 py-0.5 rounded shadow-2xs">
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
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
            />

            <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-2">
              <span>10/dk</span>
              <span>100/dk</span>
              <span>500/dk</span>
              <span>1,000/dk</span>
              <span>3,000/dk</span>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Settings Drawer */}
      {showAdvanced && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-600 mb-1 font-medium">
              GPU Başına CUDA Overhead (GB)
            </label>
            <input
              type="number"
              step="0.1"
              value={cudaOverheadGB}
              onChange={(e) => onChangeCudaOverhead(parseFloat(e.target.value) || 1.0)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 font-mono"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              PyTorch runtime ve CUDA bağlam sabiti (Genelde 1.0GB - 2.0GB).
            </p>
          </div>

          <div>
            <label className="block text-slate-600 mb-1 font-medium">
              Aktivasyon Bellek Faktörü (%)
            </label>
            <input
              type="number"
              value={activationOverheadPct}
              onChange={(e) => onChangeActivationOverhead(parseFloat(e.target.value) || 10)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 font-mono"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Ara katman aktivasyonlarının kapladığı tahmini dinamik oran.
            </p>
          </div>

          <div>
            <label className="block text-slate-600 mb-1 font-medium">
              TP İletişim Verimliliği (%)
            </label>
            <input
              type="number"
              value={tpEfficiencyPct}
              onChange={(e) => onChangeTpEfficiency(parseFloat(e.target.value) || 85)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 font-mono"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              GPU'lar arası AllReduce haberleşme verimi (NVLink için ~%85-%95).
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
