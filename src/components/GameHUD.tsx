import React, { useState } from 'react';
import {
  Award,
  Bot,
  Camera,
  Car,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  Compass,
  Crosshair,
  Flag,
  HelpCircle,
  Home,
  Map as MapIcon,
  MessageSquare,
  Phone,
  Radio,
  Settings,
  Shield,
  Sparkles,
  Star,
  Sun,
  User,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { HIDDEN_MISSIONS, STORY_MISSIONS } from '../game/missions';
import { RoadNetwork } from '../game/roadNetwork';
import {
  CharacterId,
  CHARACTERS,
  HudSnapshot,
  NpcBehaviorState,
  QualityLevel,
  RADIO_STATIONS,
  RadioStationId,
  TimePreset,
  VEHICLE_SPECS,
  VehicleTypeId,
  WeaponId,
  WeatherPreset,
} from '../game/types';
import { Minimap } from './Minimap';

interface GameHUDProps {
  hud: HudSnapshot;
  network: RoadNetwork | null;
  showHelp: boolean;
  onToggleHelp: () => void;
  onOpenMap: () => void;
  onOpenPhone: () => void;
  onOpenSettings: () => void;
  onToggleCamera: () => void;
  onSpawnVehicle: (type: VehicleTypeId) => void;
  onSetTime: (preset: TimePreset) => void;
  onToggleAutoTime: () => void;
  onSetWeather: (preset: WeatherPreset) => void;
  onToggleAutoWeather: () => void;
  onTalkNearbyNpc: () => void;
  onSetQuality: (q: QualityLevel) => void;
  onSetRadio: (station: RadioStationId) => void;
  onSetCharacter: (id: CharacterId) => void;
  onSetWeapon: (id: WeaponId) => void;
  onClearWanted: () => void;
  onHealAndRepair: () => void;
  onToggleMute: () => void;
  onStartStoryMission: (id: string) => void;
  onStartHiddenMission: (id: string) => void;
  onSendCoopInvite: (friendHandle: string, missionId: string) => void;
  onRespondCoopInvite: (accept: boolean) => void;
  onCancelMission: () => void;
  onAdvanceCutscene: () => void;
  onSkipCutscene: () => void;
  onOpenNearbyShop: () => void;
}

type DockTab = 'vehicles' | 'missions' | 'world' | 'radio';
type MissionSubTab = 'story' | 'random';

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  network,
  showHelp,
  onToggleHelp,
  onOpenMap,
  onOpenPhone,
  onOpenSettings,
  onToggleCamera,
  onSpawnVehicle,
  onSetTime,
  onToggleAutoTime,
  onSetWeather,
  onToggleAutoWeather,
  onTalkNearbyNpc,
  onSetQuality,
  onSetRadio,
  onSetCharacter,
  onSetWeapon,
  onClearWanted,
  onHealAndRepair,
  onToggleMute,
  onStartStoryMission,
  onStartHiddenMission,
  onSendCoopInvite,
  onRespondCoopInvite,
  onCancelMission,
  onAdvanceCutscene,
  onSkipCutscene,
  onOpenNearbyShop,
}) => {
  const [dockOpen, setDockOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<DockTab>('vehicles');
  const [missionSubTab, setMissionSubTab] = useState<MissionSubTab>('story');

  const theme = hud.characterTheme;

  const formatClock = (hour: number) => {
    const h = Math.floor(hour) % 24;
    const m = Math.floor((hour - Math.floor(hour)) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const formatTimer = (sec: number) => {
    const s = Math.max(0, Math.ceil(sec));
    const min = Math.floor(s / 60);
    const rem = s % 60;
    return `${min}:${String(rem).padStart(2, '0')}`;
  };

  const timeLabels: Record<TimePreset, string> = {
    dawn: 'Úsvit',
    noon: 'Poludnie',
    golden: 'Zlatá hod.',
    night: 'Noc',
  };

  const weatherLabels: Record<WeatherPreset, string> = {
    clear: 'Jasno',
    overcast: 'Oblačno',
    rain: 'Dážď',
    storm: 'Búrka',
    foggy: 'Hmla',
  };

  const behaviorLabels: Record<NpcBehaviorState, string> = {
    patrol: 'Hliadka',
    flee: 'Útek',
    shelter: 'Úkryt',
    investigate: 'Skúma',
    cheer: 'Fandí',
    confront: 'Konfrontuje',
    hail_taxi: 'Volá taxi',
  };

  const renderWeatherIcon = (w: WeatherPreset) => {
    if (w === 'clear') return <Sun className="w-3.5 h-3.5 text-amber-300" />;
    if (w === 'overcast') return <Cloud className="w-3.5 h-3.5 text-slate-300" />;
    if (w === 'rain') return <CloudRain className="w-3.5 h-3.5 text-sky-300" />;
    if (w === 'storm') return <CloudLightning className="w-3.5 h-3.5 text-yellow-300" />;
    return <CloudFog className="w-3.5 h-3.5 text-slate-400" />;
  };

  const discoveredRandomMissions = HIDDEN_MISSIONS.filter((hm) =>
    hud.discoveredHiddenIds.includes(hm.id),
  );

  const isCutscene = hud.cutscene.active;

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4">
      {/* Top Row: Radar (Left) + Mission/Co-op/Toast (Center) + Character Stats (Right) */}
      {!isCutscene && (
        <div className="flex items-start justify-between gap-4">
          {/* Top-Left: Title + Quick Action Bar + Interactive Radar */}
          <div className="pointer-events-auto flex flex-col gap-1.5">
            <div
              className="px-2.5 py-1.5 rounded bg-slate-950/92 border flex items-center gap-2"
              style={{ borderColor: `${theme.accentHex}44` }}
            >
              <span
                className="font-display text-xs font-bold tracking-wider"
                style={{ color: theme.accentHex }}
              >
                SUNSTATE OUTLAWS
              </span>
              <span className="font-mono-num text-[11px] text-emerald-400">
                {hud.fps} FPS
              </span>
              <span className="font-mono-num text-[11px] text-amber-300">
                {formatClock(hud.timeHour)}
              </span>
              <span
                className="text-[11px] text-sky-200 flex items-center gap-1"
                title={`Aktuálne počasie: ${hud.weatherLabel}`}
              >
                {renderWeatherIcon(hud.weatherPreset)}
                <span>{hud.weatherLabel}</span>
              </span>
              <button
                onClick={onOpenMap}
                className="text-cyan-300 hover:text-cyan-200 transition-colors"
                title="Mapa a GPS (M / Tab)"
              >
                <MapIcon className="w-4 h-4" />
              </button>
              <button
                onClick={onOpenPhone}
                className="text-emerald-300 hover:text-emerald-200 transition-colors"
                title="Mobil, AI & Cheaty (T)"
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                onClick={onToggleCamera}
                className="text-amber-300 hover:text-amber-200 transition-colors"
                title="Pohľad kamery 1st/3rd (V)"
              >
                <Camera className="w-4 h-4" />
              </button>
              <button
                onClick={onOpenSettings}
                className="text-purple-300 hover:text-purple-200 transition-colors"
                title="Nastavenia, Ovládač & Priatelia (O)"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={onToggleHelp}
                className="text-slate-300 hover:text-white transition-colors"
                title="Ovládanie a návod (H)"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>

            <Minimap
              playerX={hud.playerX}
              playerZ={hud.playerZ}
              playerYaw={hud.playerYaw}
              blips={hud.blips}
              wantedStars={hud.wantedStars}
              network={network}
              gpsRoute={hud.gpsRoute}
              gpsTarget={hud.gpsTarget}
              gpsDistance={hud.gpsDistance}
              gpsTurnHint={hud.gpsTurnHint}
              accentHex={theme.accentHex}
              onOpenMap={onOpenMap}
            />

            {/* Live AI Director & Adaptive NPC Feed */}
            <div
              className="w-[244px] rounded bg-slate-950/92 border p-2 space-y-1.5 text-[10px]"
              style={{ borderColor: `${theme.accentHex}38` }}
            >
              <div
                className="flex items-center justify-between gap-1 font-semibold"
                style={{ color: theme.accentHex }}
              >
                <span className="flex items-center gap-1">
                  <Bot className="w-3 h-3" /> Palmetto AI Dispečing
                </span>
                <span
                  className={
                    hud.aiDirectorStatus === 'error'
                      ? 'text-rose-400'
                      : hud.aiDirectorStatus === 'active'
                        ? 'text-emerald-400'
                        : 'text-slate-400'
                  }
                >
                  {hud.aiDirectorStatus === 'error'
                    ? 'Offline'
                    : hud.aiDirectorStatus === 'active'
                      ? 'Aktívny'
                      : 'Čaká'}
                </span>
              </div>
              {hud.aiDirectorError ? (
                <div className="text-rose-300 leading-tight">{hud.aiDirectorError}</div>
              ) : (
                <>
                  <div className="text-slate-200 leading-tight">{hud.aiBulletin}</div>
                  {hud.wantedStars > 0 && (
                    <div className="text-amber-300 leading-tight">
                      PBPD: {hud.aiPoliceTactic}
                    </div>
                  )}
                </>
              )}
              {hud.aiNearbyNpcs.length > 0 && (
                <div className="pt-1 border-t border-white/10 space-y-1">
                  {hud.aiNearbyNpcs.slice(0, 2).map((n) => (
                    <div key={n.id} className="text-slate-300 leading-tight">
                      <span className="text-emerald-300 font-semibold">{n.name}</span>{' '}
                      <span className="text-slate-400">({behaviorLabels[n.behavior]})</span>
                      {n.line && <span className="text-slate-100">: „{n.line}“</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top-Center: Active Mission + Co-op Invite + Toast */}
          <div className="flex flex-col items-center gap-2 max-w-md text-center">
            {hud.mission.activeId && (
              <div
                className="pointer-events-auto px-4 py-2 rounded-md bg-slate-950/92 border shadow-lg flex items-center gap-3"
                style={{ borderColor: `${theme.accentHex}70` }}
              >
                <div className="text-left">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-amber-400">
                    <span>{hud.mission.title}</span>
                    <span>·</span>
                    <span style={{ color: theme.accentHex }}>
                      Krok {hud.mission.stageIndex + 1}/{hud.mission.totalStages}
                    </span>
                    <span>·</span>
                    <span className="font-mono-num">{formatTimer(hud.mission.timeLeft)}</span>
                    <span>·</span>
                    <span className="font-mono-num text-emerald-400">+${hud.mission.reward}</span>
                    {hud.mission.coopHostHandle && (
                      <span className="text-purple-300">· Co-op ({hud.mission.coopHostHandle})</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-200 mt-0.5">{hud.mission.objective}</div>
                </div>
                <button
                  onClick={onCancelMission}
                  className="p-1 text-slate-400 hover:text-white"
                  title="Zrušiť misiu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {hud.pendingInvite && (
              <div className="pointer-events-auto px-4 py-2.5 rounded-md bg-slate-900/95 border border-cyan-400/50 shadow-xl flex items-center gap-3">
                <div className="text-left text-xs">
                  <div className="font-semibold text-cyan-300">
                    Pozvánka do misie od {hud.pendingInvite.fromHandle}
                  </div>
                  <div className="text-slate-200">{hud.pendingInvite.missionTitle}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onRespondCoopInvite(true)}
                    className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold"
                  >
                    Prijať
                  </button>
                  <button
                    onClick={() => onRespondCoopInvite(false)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
                  >
                    Odmietnuť
                  </button>
                </div>
              </div>
            )}

            {hud.toastText && (
              <div
                className={`px-3.5 py-1.5 rounded text-xs font-medium border shadow-md ${
                  hud.toastType === 'success'
                    ? 'bg-emerald-950/92 border-emerald-400/45 text-emerald-200'
                    : hud.toastType === 'warning'
                      ? 'bg-rose-950/92 border-rose-400/45 text-rose-200'
                      : 'bg-slate-950/92 border-sky-400/40 text-sky-100'
                }`}
              >
                {hud.toastText}
              </div>
            )}
          </div>

          {/* Top-Right: Adaptive Character Identity, Reputation, Home, Skills, Wanted, Health/Armor, Cash */}
          <div
            className="pointer-events-auto w-76 rounded-md bg-slate-950/92 border p-3 flex flex-col gap-2 shadow-lg"
            style={{
              borderColor: `${theme.accentHex}55`,
              borderTop: `3px solid ${theme.accentHex}`,
            }}
          >
            <div className="flex items-start justify-between gap-2 text-xs">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-semibold text-white">{hud.characterName}</span>
                  {hud.godMode && (
                    <span className="text-[10px] font-bold text-emerald-400">GOD</span>
                  )}
                </div>
                <div className="text-[10px] font-medium" style={{ color: theme.accentHex }}>
                  {hud.characterRole}
                </div>
              </div>
              <span className="text-[10px] text-slate-400">
                {hud.cameraMode === 'first' ? '1st Person' : '3rd Person'}
              </span>
            </div>

            {/* Reputation & Home Bar */}
            <div className="px-2 py-1 rounded bg-slate-900/90 border border-white/10 flex items-center justify-between gap-2 text-[10px]">
              <span className="flex items-center gap-1 text-amber-300 font-semibold truncate">
                <Award className="w-3 h-3 shrink-0" />
                <span className="truncate">{hud.reputationRank}</span>
                <span className="font-mono-num text-slate-400">({hud.reputation} RP)</span>
              </span>
              <span className="flex items-center gap-1 text-slate-300 truncate shrink-0">
                <Home className="w-3 h-3 shrink-0" style={{ color: theme.accentHex }} />
                <span className="truncate max-w-[96px]">{hud.characterHomeName.split(' (')[0]}</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => {
                  const active = s <= hud.wantedStars;
                  return (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${
                        active
                          ? hud.wantedEvading
                            ? 'text-sky-400 fill-sky-400'
                            : 'text-amber-400 fill-amber-400'
                          : 'text-slate-700'
                      }`}
                    />
                  );
                })}
              </div>
              <div className="text-right">
                <div className="font-mono-num text-sm font-bold text-emerald-400">
                  ${hud.cash.toLocaleString()}
                </div>
                <div className="font-mono-num text-[10px] text-sky-300">
                  Banka ${hud.bankBalance.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                  <span>Zdravie</span>
                  <span className="font-mono-num">{hud.health}%</span>
                </div>
                <div className="h-1.5 rounded-sm bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-150"
                    style={{ width: `${hud.health}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                  <span>Vesta</span>
                  <span className="font-mono-num">{hud.armor}%</span>
                </div>
                <div className="h-1.5 rounded-sm bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-sky-400 transition-all duration-150"
                    style={{ width: `${hud.armor}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Evolving Character Skills */}
            <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-white/10 text-[9px] text-slate-300">
              <div>
                <div className="flex justify-between">
                  <span>Šofér</span>
                  <span className="font-mono-num">{Math.round(hud.skills.driving)}</span>
                </div>
                <div className="h-1 bg-slate-800 rounded-sm overflow-hidden mt-0.5">
                  <div className="h-full bg-amber-400" style={{ width: `${hud.skills.driving}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between">
                  <span>Muška</span>
                  <span className="font-mono-num">{Math.round(hud.skills.shooting)}</span>
                </div>
                <div className="h-1 bg-slate-800 rounded-sm overflow-hidden mt-0.5">
                  <div className="h-full bg-rose-400" style={{ width: `${hud.skills.shooting}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between">
                  <span>Let</span>
                  <span className="font-mono-num">{Math.round(hud.skills.flying)}</span>
                </div>
                <div className="h-1 bg-slate-800 rounded-sm overflow-hidden mt-0.5">
                  <div className="h-full bg-cyan-400" style={{ width: `${hud.skills.flying}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between">
                  <span>Výdrž</span>
                  <span className="font-mono-num">{Math.round(hud.skills.stamina)}</span>
                </div>
                <div className="h-1 bg-slate-800 rounded-sm overflow-hidden mt-0.5">
                  <div className="h-full bg-emerald-400" style={{ width: `${hud.skills.stamina}%` }} />
                </div>
              </div>
            </div>

            {/* Vehicle Telemetry or Weapon Selection */}
            {hud.inVehicle ? (
              <div className="pt-1.5 border-t border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold" style={{ color: theme.accentHex }}>
                    {hud.vehicleName}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    <span>Karoséria {hud.vehicleHealth}%</span>
                    {(hud.vehicleKind === 'helicopter' || hud.vehicleKind === 'plane') && (
                      <span className="text-cyan-300 font-mono-num">
                        Výška {hud.vehicleAltitude}m
                      </span>
                    )}
                    {hud.vehicleOnFire && (
                      <span className="text-rose-400 font-bold">HORÍ!</span>
                    )}
                    {hud.vehicleWaterDisabled && (
                      <span className="text-sky-400 font-bold">VODA!</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-display font-mono-num text-xl font-bold text-white">
                    {hud.vehicleSpeedKmh}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-1">KM/H</span>
                </div>
              </div>
            ) : (
              <div className="pt-1.5 border-t border-white/10 space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  {(['fists', 'pistol', 'smg'] as WeaponId[]).map((wId, i) => {
                    const unlocked = hud.unlockedWeapons[wId];
                    const isSelected = hud.weaponId === wId;
                    return (
                      <button
                        key={wId}
                        disabled={!unlocked}
                        onClick={() => onSetWeapon(wId)}
                        style={
                          unlocked && isSelected
                            ? { backgroundColor: theme.accentHex, color: '#020617' }
                            : undefined
                        }
                        className={`flex-1 py-1 px-1.5 rounded text-[11px] font-medium whitespace-nowrap transition-colors ${
                          !unlocked
                            ? 'bg-slate-900/40 text-slate-600 cursor-not-allowed'
                            : isSelected
                              ? 'font-semibold'
                              : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {i + 1}. {wId === 'fists' ? 'Päste' : wId === 'pistol' ? '9mm' : 'SMG'}
                      </button>
                    );
                  })}
                  {hud.weaponId !== 'fists' && (
                    <span
                      className="font-mono-num text-xs pl-1 font-semibold"
                      style={{ color: theme.accentHex }}
                    >
                      {hud.ammo[hud.weaponId]}
                    </span>
                  )}
                </div>
                {(hud.hasParachute || hud.parachuteOpen) && (
                  <div className="text-[10px] text-cyan-300 flex justify-between">
                    <span>
                      {hud.parachuteOpen
                        ? 'Padák otvorený (WASD riad.)'
                        : hud.parachuteReady
                          ? 'Stlač Medzerník pre padák!'
                          : 'Padák pripravený'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Crosshair & Wasted */}
      {!isCutscene && !hud.inVehicle && !hud.wasted && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
          <Crosshair className="w-5 h-5 text-white/55" />
        </div>
      )}

      {hud.wasted && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center bg-rose-950/50">
          <div className="font-display text-5xl font-bold tracking-widest text-rose-500">
            ELIMINOVANÝ
          </div>
        </div>
      )}

      {/* Cutscene Letterbox Overlay */}
      {isCutscene && (
        <div className="pointer-events-auto fixed inset-0 z-20 flex flex-col justify-between">
          <div className="h-16 bg-slate-950 border-b border-white/10 px-6 flex items-center justify-between">
            <span className="font-display text-sm font-bold tracking-wider text-amber-400">
              {hud.cutscene.title}
            </span>
            <span className="font-mono-num text-xs text-slate-400">
              {hud.cutscene.stepIndex + 1} / {hud.cutscene.totalSteps}
            </span>
          </div>

          <div className="bg-slate-950 border-t border-white/10 px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="max-w-3xl">
              <div
                className="text-xs font-bold uppercase tracking-wider mb-1"
                style={{ color: theme.accentHex }}
              >
                {hud.cutscene.speaker}
              </div>
              <div className="text-base text-white">{hud.cutscene.text}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onAdvanceCutscene}
                style={{ backgroundColor: theme.accentHex }}
                className="px-4 py-2 rounded text-slate-950 text-xs font-bold hover:brightness-110"
              >
                Pokračovať (Space)
              </button>
              <button
                onClick={onSkipCutscene}
                className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
              >
                Preskočiť (Esc)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Prompt + Random Mission Action + Collapsible Dock */}
      {!isCutscene && (
        <div className="flex flex-col items-center gap-2">
          {(hud.promptText || (hud.nearbyHiddenMission && !hud.mission.activeId)) && (
            <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2">
              {hud.promptText && (
                <div className="px-4 py-1.5 rounded bg-slate-950/92 border border-amber-400/45 text-xs font-medium text-amber-200 shadow">
                  {hud.promptText}
                </div>
              )}
              {hud.nearbyHiddenMission && !hud.mission.activeId && (
                <button
                  onClick={() => onStartHiddenMission(hud.nearbyHiddenMission!.id)}
                  className="px-3.5 py-1.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow flex items-center gap-1.5"
                >
                  <Compass className="w-3.5 h-3.5" />
                  Spustiť náhodnú misiu: {hud.nearbyHiddenMission.title} (+${hud.nearbyHiddenMission.reward}) [E]
                </button>
              )}
              {hud.nearbyShop && (
                <button
                  onClick={onOpenNearbyShop}
                  style={{ backgroundColor: theme.accentHex }}
                  className="px-3 py-1.5 rounded text-slate-950 text-xs font-bold shadow hover:brightness-110"
                >
                  Otvoriť menu
                </button>
              )}
              {hud.nearbyInteractNpc && !hud.nearbyShop && (
                <button
                  onClick={onTalkNearbyNpc}
                  className="px-3 py-1.5 rounded bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold shadow flex items-center gap-1"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Osloviť (G)
                </button>
              )}
            </div>
          )}

          <div className="pointer-events-auto flex flex-col items-center w-full max-w-[980px]">
            <button
              onClick={() => setDockOpen((v) => !v)}
              style={{ borderColor: `${theme.accentHex}44` }}
              className="px-3.5 py-1 rounded-t-md bg-slate-950/92 border border-b-0 text-[11px] font-medium text-slate-300 hover:text-white flex items-center gap-2"
            >
              {dockOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              <span>{dockOpen ? 'Skryť menu' : 'Otvoriť menu'}</span>
              <span className="font-mono-num" style={{ color: theme.accentHex }}>
                · {hud.characterName.split(' ')[0]} · {formatClock(hud.timeHour)}
              </span>
            </button>

            {dockOpen && (
              <div
                className="w-full rounded-md rounded-t-none bg-slate-950/94 border p-2.5 shadow-xl flex flex-col gap-2"
                style={{ borderColor: `${theme.accentHex}44` }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      onClick={() => setActiveTab('vehicles')}
                      style={
                        activeTab === 'vehicles'
                          ? { backgroundColor: theme.accentHex, color: '#020617' }
                          : undefined
                      }
                      className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 whitespace-nowrap ${
                        activeTab === 'vehicles'
                          ? 'font-semibold'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Car className="w-3.5 h-3.5" /> Vozidlá
                    </button>
                    <button
                      onClick={() => setActiveTab('missions')}
                      className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 whitespace-nowrap ${
                        activeTab === 'missions'
                          ? 'bg-amber-400 text-slate-950 font-semibold'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Flag className="w-3.5 h-3.5" /> Misie ({hud.completedStoryIds.length}/20)
                    </button>
                    <button
                      onClick={() => setActiveTab('world')}
                      className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 whitespace-nowrap ${
                        activeTab === 'world'
                          ? 'bg-rose-400 text-slate-950 font-semibold'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" /> Svet & Postavy
                    </button>
                    <button
                      onClick={() => setActiveTab('radio')}
                      className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 whitespace-nowrap ${
                        activeTab === 'radio'
                          ? 'bg-emerald-400 text-slate-950 font-semibold'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Radio className="w-3.5 h-3.5" /> {hud.radioName}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={onOpenPhone}
                      className="px-2.5 py-1 rounded bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-400/35 text-xs text-emerald-200 flex items-center gap-1 whitespace-nowrap"
                    >
                      <Phone className="w-3.5 h-3.5" /> Mobil (T)
                    </button>
                    <button
                      onClick={onOpenMap}
                      className="px-2.5 py-1 rounded bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-400/35 text-xs text-cyan-200 flex items-center gap-1 whitespace-nowrap"
                    >
                      <MapIcon className="w-3.5 h-3.5" /> Mapa (M)
                    </button>
                    <button
                      onClick={onClearWanted}
                      className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs text-slate-200 flex items-center gap-1 whitespace-nowrap"
                    >
                      <Shield className="w-3.5 h-3.5 text-sky-400" /> Zrušiť hľadanie
                    </button>
                    <button
                      onClick={onHealAndRepair}
                      className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs text-slate-200 flex items-center gap-1 whitespace-nowrap"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Uzdraviť / Opraviť
                    </button>
                    <button
                      onClick={onToggleMute}
                      className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-200"
                      title={hud.soundMuted ? 'Zapnúť zvuk' : 'Stlmiť zvuk'}
                    >
                      {hud.soundMuted ? (
                        <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </button>
                  </div>
                </div>

                {activeTab === 'vehicles' && (
                  <div className="flex flex-wrap items-center gap-1.5 max-h-24 overflow-y-auto">
                    {(Object.keys(VEHICLE_SPECS) as VehicleTypeId[]).map((vId) => (
                      <button
                        key={vId}
                        onClick={() => onSpawnVehicle(vId)}
                        className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-white/10 text-[11px] text-slate-100 flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <span className="font-semibold">{VEHICLE_SPECS[vId].name}</span>
                        <span className="text-slate-400">· {VEHICLE_SPECS[vId].category}</span>
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === 'missions' && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setMissionSubTab('story')}
                          className={`px-2.5 py-1 rounded font-semibold ${
                            missionSubTab === 'story'
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-white/10'
                          }`}
                        >
                          Príbehové misie ({hud.completedStoryIds.length}/20)
                        </button>
                        <button
                          onClick={() => setMissionSubTab('random')}
                          className={`px-2.5 py-1 rounded font-semibold ${
                            missionSubTab === 'random'
                              ? 'bg-cyan-400 text-slate-950'
                              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-white/10'
                          }`}
                        >
                          Náhodné misie ({hud.discoveredHiddenIds.length}/{HIDDEN_MISSIONS.length})
                        </button>
                      </div>
                      <span className="text-slate-400">
                        Dokončené náhodné: {hud.completedHiddenIds.length} / {HIDDEN_MISSIONS.length}
                      </span>
                    </div>

                    {missionSubTab === 'story' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {STORY_MISSIONS.map((m) => {
                          const done = hud.completedStoryIds.includes(m.id);
                          const isActive = hud.mission.activeId === m.id;
                          return (
                            <div
                              key={m.id}
                              className={`p-2 rounded border flex items-center justify-between gap-2 text-xs ${
                                isActive
                                  ? 'bg-amber-950/60 border-amber-400/50'
                                  : done
                                    ? 'bg-emerald-950/35 border-emerald-500/30'
                                    : 'bg-slate-900/90 border-white/10'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="font-semibold text-white truncate flex items-center gap-1.5">
                                  {done && (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  )}
                                  <span className="truncate">{m.title}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-2">
                                  <span className="text-amber-300">{'★'.repeat(m.difficulty)}</span>
                                  <span>{m.durationLabel}</span>
                                  <span className="text-emerald-400 font-mono-num">+${m.reward}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => onStartStoryMission(m.id)}
                                  className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold"
                                >
                                  {isActive ? 'Beží' : 'Spustiť'}
                                </button>
                                {hud.onlineFriends.map((friend) => (
                                  <button
                                    key={friend.id}
                                    onClick={() => onSendCoopInvite(friend.handle, m.id)}
                                    className="px-2 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[10px] font-bold flex items-center gap-1"
                                    title={`Zahrať misiu s kamarátom ${friend.handle}`}
                                  >
                                    <Users className="w-3 h-3" /> {friend.handle}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : discoveredRandomMissions.length === 0 ? (
                      <div className="p-3 rounded bg-slate-900/80 border border-white/10 text-xs text-slate-300">
                        Zatiaľ si neobjavil žiadnu náhodnú misiu. Preskúmaj Palmetto Bay, parky, móla, letiská a strechy — akonáhle na miesto dorazíš, misia sa tu odomkne a budeš ju môcť kedykoľvek spustiť.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {discoveredRandomMissions.map((hm) => {
                          const done = hud.completedHiddenIds.includes(hm.id);
                          const isActive = hud.mission.activeId === hm.id;
                          return (
                            <div
                              key={hm.id}
                              className={`p-2 rounded border flex items-center justify-between gap-2 text-xs ${
                                isActive
                                  ? 'bg-cyan-950/60 border-cyan-400/50'
                                  : done
                                    ? 'bg-emerald-950/35 border-emerald-500/30'
                                    : 'bg-slate-900/90 border-white/10'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="font-semibold text-white truncate flex items-center gap-1.5">
                                  {done && (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  )}
                                  <span className="truncate">{hm.title}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-2">
                                  <span>{hm.district}</span>
                                  <span className="text-emerald-400 font-mono-num">+${hm.reward}</span>
                                  {done && <span className="text-emerald-300">Dokončená</span>}
                                </div>
                              </div>
                              <button
                                onClick={() => onStartHiddenMission(hm.id)}
                                className="px-2.5 py-1 rounded bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-[11px] font-bold shrink-0"
                              >
                                {isActive ? 'Beží' : done ? 'Opakovať' : 'Spustiť'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'world' && (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1">
                        {(['dawn', 'noon', 'golden', 'night'] as TimePreset[]).map((preset) => (
                          <button
                            key={preset}
                            onClick={() => onSetTime(preset)}
                            className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
                              hud.timePreset === preset && !hud.autoTimeCycle
                                ? 'bg-amber-400 text-slate-950 font-semibold'
                                : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            {timeLabels[preset]}
                          </button>
                        ))}
                        <button
                          onClick={onToggleAutoTime}
                          className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
                            hud.autoTimeCycle
                              ? 'bg-sky-400 text-slate-950 font-semibold'
                              : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          3x Auto čas
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[11px] text-slate-400 mr-0.5">Počasie:</span>
                        {(['clear', 'overcast', 'rain', 'storm', 'foggy'] as WeatherPreset[]).map(
                          (wp) => (
                            <button
                              key={wp}
                              onClick={() => onSetWeather(wp)}
                              className={`px-2 py-1 rounded text-xs whitespace-nowrap flex items-center gap-1 ${
                                hud.targetWeatherPreset === wp && !hud.autoWeatherCycle
                                  ? 'bg-cyan-400 text-slate-950 font-semibold'
                                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              {weatherLabels[wp]}
                            </button>
                          ),
                        )}
                        <button
                          onClick={onToggleAutoWeather}
                          className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
                            hud.autoWeatherCycle
                              ? 'bg-emerald-400 text-slate-950 font-semibold'
                              : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          Auto počasie (plynulé)
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-white/10">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-400 mr-1">Grafika:</span>
                        {(['high', 'medium', 'performance'] as QualityLevel[]).map((q) => (
                          <button
                            key={q}
                            onClick={() => onSetQuality(q)}
                            className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
                              hud.quality === q
                                ? 'bg-purple-500 text-white font-semibold'
                                : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            {q === 'high' ? 'Vysoká' : q === 'medium' ? 'Stredná' : 'Výkon'}
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {(['dante', 'elena', 'kairo'] as CharacterId[]).map((cId) => {
                          const char = CHARACTERS[cId];
                          const isCurrent = hud.characterId === cId;
                          return (
                            <button
                              key={cId}
                              onClick={() => onSetCharacter(cId)}
                              title={`${char.role} · Dom: ${char.homeName}`}
                              style={
                                isCurrent
                                  ? { backgroundColor: char.uiTheme.accentHex, color: '#020617' }
                                  : undefined
                              }
                              className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
                                isCurrent
                                  ? 'font-semibold'
                                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              {char.name}
                            </button>
                          );
                        })}
                        <button
                          onClick={onToggleCamera}
                          className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs text-amber-300"
                        >
                          Kamera: {hud.cameraMode === 'first' ? '1st' : '3rd'}
                        </button>
                        <button
                          onClick={onOpenSettings}
                          className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs text-cyan-300"
                        >
                          Ovládač & Nastavenia
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'radio' && (
                  <div className="flex flex-wrap items-center gap-2">
                    {RADIO_STATIONS.map((st) => (
                      <button
                        key={st.id}
                        onClick={() => onSetRadio(st.id)}
                        className={`px-3 py-1.5 rounded text-xs whitespace-nowrap ${
                          hud.radioId === st.id
                            ? 'bg-emerald-400 text-slate-950 font-semibold'
                            : 'bg-slate-900 text-slate-200 hover:bg-slate-800 border border-white/10'
                        }`}
                      >
                        {st.name} · <span className="opacity-75">{st.genre}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Controls & Field Guide Modal */}
      {showHelp && (
        <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-slate-950/82 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-slate-900 border border-white/15 p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  Sprievodca mestom Palmetto Bay & Ovládanie
                </h2>
                <p className="text-xs text-slate-400">
                  Sunstate Outlaws: Neon Tide · Coral Keys County
                </p>
              </div>
              <button
                onClick={onToggleHelp}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-white"
              >
                Späť do hry (H)
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-200">
              <div className="space-y-1.5">
                <div className="font-semibold text-amber-400 mb-1">Chôdza, Boj & Padák</div>
                <div>WASD / Ľavá páčka · Pohyb postavy</div>
                <div>Shift / × (A) · Šprint · Space / □ (X) · Skok / Padák</div>
                <div>Klik / R2 (RT) · Streľba · 1/2/3 alebo D-Pad → · Zbraň</div>
                <div>E / △ (Y) · Vstup do budov, výťahy, vozidlá a štart náhodnej misie</div>
                <div>V / Touchpad / Share · Kamera 1st / 3rd Person</div>
              </div>
              <div className="space-y-1.5">
                <div className="font-semibold text-sky-400 mb-1">Autá, Vrtuľníky, Lietadlá & PS4/PS5</div>
                <div>W / R2 · Plyn · S / L2 · Brzda (Vrtuľník: Stúpanie / Klesanie)</div>
                <div>Space / R1 · Ručná brzda · L1 / Klik · Vodné delo / Stíhačka kanón</div>
                <div>Lietadlo / Stíhačka: Páčka dole (K) = Nos hore & Stúpanie</div>
                <div>Lietadlo / Stíhačka: Páčka hore (I) = Nos dole & Klesanie</div>
                <div>O · Mapovanie klávesov a tlačidiel pre každé vozidlo zvlášť</div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 text-xs text-slate-300 space-y-1">
              <div>
                <span className="text-emerald-300 font-semibold">Mobil & AI (T / D-Pad ↑):</span> Zavolaj záchranné zložky, využi Palmetto AI asistenta, vygeneruj si vlastnú AI misiu alebo rozprávaj s NPC klávesou G!
              </div>
              <div>
                <span className="text-cyan-300 font-semibold">3 Postavy & Budovy:</span> Prepínaj medzi Dantem, Elenou a Kairom. Každý má vlastný dom, peniaze, reputáciu a farebnú tému rozhrania.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
