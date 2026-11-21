import React, { useState } from 'react';
import {
  Award,
  Car,
  CloudDownload,
  Gamepad2,
  Globe,
  Home,
  MapPin,
  Monitor,
  Play,
  ShieldCheck,
  Smartphone,
  Users,
} from 'lucide-react';
import {
  getLocalizedCharacterCopy,
  getLocalizedRank,
  getUi,
  LANGUAGE_OPTIONS,
} from '../game/i18n';
import {
  CHARACTERS,
  CharacterId,
  LanguageCode,
  PlatformType,
  SHOPS,
  UiModePreference,
} from '../game/types';

interface StartupScreenProps {
  selectedCharacter: CharacterId;
  language: LanguageCode;
  cloudSyncId: string;
  detectedPlatform: PlatformType;
  uiModePreference: UiModePreference;
  isMobileUi: boolean;
  onSelectCharacter: (id: CharacterId) => void;
  onSetLanguage: (lang: LanguageCode) => void;
  onSetUiMode: (pref: UiModePreference) => void;
  onLoadCloud: (syncId: string) => Promise<{ ok: boolean; language?: LanguageCode; error?: string }>;
  onStartGame: () => void;
}

export const StartupScreen: React.FC<StartupScreenProps> = ({
  selectedCharacter,
  language,
  cloudSyncId,
  detectedPlatform,
  uiModePreference,
  isMobileUi,
  onSelectCharacter,
  onSetLanguage,
  onSetUiMode,
  onLoadCloud,
  onStartGame,
}) => {
  const [syncInput, setSyncInput] = useState(cloudSyncId);
  const [cloudStatus, setCloudStatus] = useState('');
  const [cloudLoading, setCloudLoading] = useState(false);

  const activeProfile = CHARACTERS[selectedCharacter];
  const activeTheme = activeProfile.uiTheme;
  const ui = getUi(language);

  const handleCloudLoad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syncInput.trim() || cloudLoading) return;
    setCloudLoading(true);
    setCloudStatus('');
    const res = await onLoadCloud(syncInput.trim());
    setCloudLoading(false);
    if (res.ok) {
      setCloudStatus(getUi(res.language ?? language).cloudLoadedToast);
    } else {
      setCloudStatus(res.error || 'Cloud restore failed.');
    }
  };

  return (
    <div className="pointer-events-auto fixed inset-0 z-40 flex flex-col justify-between p-3.5 sm:p-5 md:p-9 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/85 overflow-y-auto">
      {/* Top Brand Showcase Header + Language Selector + Cloud Sync Restore */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <div
            className="text-[11px] sm:text-xs font-semibold tracking-widest uppercase mb-1"
            style={{ color: activeTheme.accentHex }}
          >
            {ui.modeLabel} · {activeProfile.name.toUpperCase()}
          </div>
          <h1 className="font-display text-2xl sm:text-4xl md:text-6xl font-bold tracking-tight text-white">
            SUNSTATE OUTLAWS:{' '}
            <span style={{ color: activeTheme.accentHex }}>NEON TIDE</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-2xl">{ui.startupSubtitle}</p>

          <div className="flex flex-wrap gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-slate-200 mt-3">
            <div className="px-2.5 py-1 rounded bg-slate-900/90 border border-white/10 flex items-center gap-1.5">
              {isMobileUi ? (
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Monitor className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span>
                {detectedPlatform === 'mobile' ? ui.platformMobile : ui.platformPc} ·{' '}
                <strong className="text-white">
                  {isMobileUi ? ui.uiModeMobile : ui.uiModePc}
                </strong>
              </span>
            </div>
            <div className="px-2.5 py-1 rounded bg-slate-900/90 border border-white/10 flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-amber-400" /> {ui.badgeVehicles}
            </div>
            <div className="px-2.5 py-1 rounded bg-slate-900/90 border border-white/10 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" style={{ color: activeTheme.accentHex }} /> {SHOPS.length}{' '}
              {ui.badgeBuildings}
            </div>
            <div className="px-2.5 py-1 rounded bg-slate-900/90 border border-white/10 flex items-center gap-1.5">
              <Gamepad2 className="w-3.5 h-3.5 text-emerald-400" /> {ui.badgeController}
            </div>
            <div className="px-2.5 py-1 rounded bg-slate-900/90 border border-white/10 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-sky-400" /> {ui.badgeCoop}
            </div>
          </div>
        </div>

        {/* Language Picker, Platform Auto-Switch & Cloud Save Quick Restore */}
        <div className="flex flex-col gap-2.5 bg-slate-950/90 border border-white/12 rounded-lg p-3.5 w-full lg:w-[360px] shrink-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" style={{ color: activeTheme.accentHex }} />
              {ui.languageLabel}
            </span>
            <span className="text-[10px] text-slate-400">{language.toUpperCase()}</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {LANGUAGE_OPTIONS.map((opt) => {
              const active = language === opt.code;
              return (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => onSetLanguage(opt.code)}
                  style={
                    active
                      ? { backgroundColor: activeTheme.accentHex, color: '#020617', borderColor: activeTheme.accentHex }
                      : undefined
                  }
                  className={`px-2 py-2 rounded border text-[11px] font-medium transition-colors ${
                    active
                      ? 'font-bold'
                      : 'bg-slate-900 text-slate-300 border-white/10 hover:bg-slate-800'
                  }`}
                >
                  {opt.native.split(' ')[0]}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-400 leading-snug">{ui.cloudDefaultNote}</p>

          <div className="pt-2 border-t border-white/10 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-200">
              <span>{ui.uiModeTitle.split(' (')[0]}</span>
              <span className="text-[10px] text-emerald-300">
                {detectedPlatform === 'mobile' ? ui.platformMobile : ui.platformPc}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'auto', label: ui.uiModeAuto },
                  { id: 'pc', label: ui.uiModePc },
                  { id: 'mobile', label: ui.uiModeMobile },
                ] as Array<{ id: UiModePreference; label: string }>
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSetUiMode(m.id)}
                  className={`px-2 py-1.5 rounded border text-[10px] font-medium transition-colors ${
                    uiModePreference === m.id
                      ? 'bg-emerald-400 text-slate-950 border-emerald-300 font-bold'
                      : 'bg-slate-900 text-slate-300 border-white/10 hover:bg-slate-800'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleCloudLoad} className="pt-2 border-t border-white/10 space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-200 flex items-center gap-1.5">
              <CloudDownload className="w-3.5 h-3.5 text-sky-400" />
              {ui.cloudQuickLoadTitle}
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={syncInput}
                onChange={(e) => setSyncInput(e.target.value)}
                placeholder={ui.cloudSyncPlaceholder}
                className="flex-1 min-w-0 px-2.5 py-1.5 rounded bg-slate-900 border border-white/15 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                disabled={cloudLoading || syncInput.trim().length < 3}
                className="px-3 py-1.5 rounded bg-sky-500 hover:bg-sky-400 disabled:opacity-45 text-slate-950 font-bold text-[11px] shrink-0"
              >
                {ui.cloudLoadBtn}
              </button>
            </div>
            {cloudStatus && (
              <div className="text-[10px] text-amber-300">{cloudStatus}</div>
            )}
          </form>
        </div>
      </div>

      {/* Bottom 3-Character Selector Cards & Launch Button */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-end justify-between gap-4 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
          {(['dante', 'elena', 'kairo'] as CharacterId[]).map((id) => {
            const p = CHARACTERS[id];
            const copy = getLocalizedCharacterCopy(id, language);
            const active = selectedCharacter === id;
            const rank = getLocalizedRank(p.startingReputation, id, language);
            return (
              <button
                key={id}
                onClick={() => onSelectCharacter(id)}
                style={
                  active
                    ? {
                        borderColor: p.uiTheme.accentHex,
                        boxShadow: `0 12px 28px -12px ${p.uiTheme.accentHex}88`,
                      }
                    : undefined
                }
                className={`p-4 rounded-lg border text-left transition-all flex flex-col justify-between ${
                  active
                    ? 'bg-slate-900/95'
                    : 'bg-slate-950/88 border-white/12 hover:bg-slate-900/90'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-display text-base font-bold text-white">{p.name}</span>
                    <span
                      className="text-[11px] font-semibold"
                      style={{ color: p.uiTheme.accentHex }}
                    >
                      {copy.role}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed mb-2">
                    {copy.story}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] mb-2">
                    <span className="text-slate-200 flex items-center gap-1">
                      <Home className="w-3 h-3" style={{ color: p.uiTheme.accentHex }} />
                      {copy.homeName}
                    </span>
                    <span className="text-amber-300 flex items-center gap-1">
                      <Award className="w-3 h-3" /> {rank} ({p.startingReputation} RP)
                    </span>
                  </div>

                  <div className="text-xs text-emerald-300 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> {copy.strength}
                  </div>
                  <div className="text-[11px] text-rose-300 mt-0.5">{copy.weakness}</div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-white/10 space-y-1.5">
                  <div className="flex justify-between text-[11px] font-mono-num">
                    <span className="text-emerald-400 font-semibold">
                      {ui.cash} ${p.startingCash.toLocaleString()}
                    </span>
                    <span className="text-sky-300">
                      {ui.bank} ${p.startingBank.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-300 font-mono-num">
                    <span>
                      {ui.skillDrive} {p.startingSkills.driving}%
                    </span>
                    <span>
                      {ui.skillShoot} {p.startingSkills.shooting}%
                    </span>
                    <span>
                      {ui.skillFly} {p.startingSkills.flying}%
                    </span>
                    <span>
                      {ui.skillStam} {p.startingSkills.stamina}%
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={onStartGame}
          style={{
            background: `linear-gradient(135deg, ${activeTheme.accentHex}, ${activeTheme.secondaryHex})`,
          }}
          className="px-8 py-4 rounded-lg text-slate-950 font-display text-lg font-bold tracking-wide shadow-xl flex items-center justify-center gap-2.5 shrink-0 hover:brightness-110 transition-all"
        >
          <Play className="w-5 h-5 fill-slate-950" /> {ui.playAs}{' '}
          {activeProfile.name.split(' ')[0].toUpperCase()}
        </button>
      </div>
    </div>
  );
};
