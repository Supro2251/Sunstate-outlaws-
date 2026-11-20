import { useEffect, useRef, useState } from 'react';
import { GameHUD } from './components/GameHUD';
import { InteractiveMapModal } from './components/InteractiveMapModal';
import { NpcChatModal } from './components/NpcChatModal';
import { SettingsModal } from './components/SettingsModal';
import { ShopModal } from './components/ShopModal';
import { SmartphoneModal } from './components/SmartphoneModal';
import { StartupScreen } from './components/StartupScreen';
import { GameEngine } from './game/engine';
import { RoadNetwork } from './game/roadNetwork';
import { CHARACTERS, DEFAULT_CONTROLS_CONFIG, HudSnapshot, ShopLocation } from './game/types';

const INITIAL_HUD: HudSnapshot = {
  characterId: 'dante',
  characterName: 'Dante Vance',
  customization: { ...CHARACTERS.dante.defaults },
  skills: { ...CHARACTERS.dante.startingSkills },
  health: 100,
  armor: 50,
  cash: CHARACTERS.dante.startingCash,
  bankBalance: CHARACTERS.dante.startingBank,
  godMode: false,
  hasParachute: false,
  parachuteReady: false,
  parachuteOpen: false,
  wantedStars: 0,
  wantedEvading: false,
  inVehicle: false,
  vehicleKind: null,
  vehicleName: '',
  vehicleSpeedKmh: 0,
  vehicleAltitude: 0,
  vehicleHealth: 100,
  vehicleOnFire: false,
  vehicleWaterDisabled: false,
  vehicleUpgrades: {
    engineLevel: 0,
    turboInstalled: false,
    handlingLevel: 0,
    neonColor: 'off',
  },
  cameraMode: 'third',
  weaponId: 'pistol',
  weaponName: 'Viper 9mm',
  ammo: { fists: 0, pistol: 84, smg: 0 },
  unlockedWeapons: { fists: true, pistol: true, smg: false },
  radioId: 'off',
  radioName: 'Rádio vypnuté',
  timePreset: 'golden',
  timeHour: 17.4,
  autoTimeCycle: true,
  weatherPreset: 'clear',
  targetWeatherPreset: 'clear',
  weatherLabel: 'Jasno',
  autoWeatherCycle: true,
  rainIntensity: 0,
  aiDirectorStatus: 'idle',
  aiDirectorError: '',
  aiBulletin: 'Palmetto Bay · AI mestský dispečing pripravený.',
  aiPoliceTactic: 'Bežná hliadka obvodov PBPD',
  aiNearbyNpcs: [],
  nearbyInteractNpc: null,
  quality: 'high',
  fps: 60,
  promptText: '',
  nearbyShop: null,
  insideShop: null,
  toastText: 'Načítavam Palmetto Bay...',
  toastType: 'info',
  mission: {
    activeId: null,
    isHidden: false,
    title: 'Voľná jazda — Palmetto Bay',
    objective: 'Preskúmaj otvorené cesty, vojdi do obchodov alebo spusti misiu',
    targetX: null,
    targetY: null,
    targetZ: null,
    stageIndex: 0,
    totalStages: 0,
    timeLeft: 0,
    reward: 0,
  },
  completedStoryIds: [],
  completedHiddenIds: [],
  cutscene: {
    active: false,
    title: '',
    speaker: '',
    text: '',
    stepIndex: 0,
    totalSteps: 0,
  },
  playerX: 40,
  playerY: 1,
  playerZ: 12,
  playerYaw: Math.PI,
  blips: [],
  gpsTarget: null,
  gpsRoute: [],
  gpsDistance: 0,
  gpsTurnHint: '',
  pointerLocked: false,
  wasted: false,
  soundMuted: false,
  gamepadConnected: false,
  activeControlContext: 'on_foot',
  controlsConfig: JSON.parse(JSON.stringify(DEFAULT_CONTROLS_CONFIG)),
  playerHandle: 'Hráč',
  friends: [],
  onlineFriends: [],
  pendingInvite: null,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [network, setNetwork] = useState<RoadNetwork | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [started, setStarted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeShop, setActiveShop] = useState<ShopLocation | null>(null);
  const [activeNpcChat, setActiveNpcChat] = useState<{
    id: number;
    name: string;
    role: string;
    mood: string;
  } | null>(null);
  const isCapturingControlRef = useRef(false);

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new GameEngine(
      mount,
      (snapshot) => setHud(snapshot),
      (shop) => setActiveShop(shop),
      (action) => {
        if (action === 'cancel') {
          setActiveNpcChat(null);
          setActiveShop((prev) => {
            if (prev) return null;
            setShowPhone((p) => {
              if (p) return false;
              setShowSettings((s) => {
                if (s) return false;
                setShowMap((m) => {
                  if (m) return false;
                  setShowHelp(false);
                  return false;
                });
                return false;
              });
              return false;
            });
            return null;
          });
        } else if (action === 'map') {
          setActiveNpcChat(null);
          setShowPhone(false);
          setShowSettings(false);
          setShowHelp(false);
          setActiveShop(null);
          setShowMap((prev) => !prev);
        } else if (action === 'phone') {
          setActiveNpcChat(null);
          setShowMap(false);
          setShowSettings(false);
          setShowHelp(false);
          setActiveShop(null);
          setShowPhone((prev) => !prev);
        } else if (action === 'settings') {
          setActiveNpcChat(null);
          setShowMap(false);
          setShowPhone(false);
          setShowHelp(false);
          setActiveShop(null);
          setShowSettings((prev) => !prev);
        }
      },
      (npc) => setActiveNpcChat(npc),
    );
    engineRef.current = engine;
    setNetwork(engine.getRoadNetwork());

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Pause engine simulation whenever a modal overlay is open
  useEffect(() => {
    engineRef.current?.setPaused(
      showHelp ||
        showMap ||
        showPhone ||
        showSettings ||
        activeShop !== null ||
        activeNpcChat !== null,
    );
  }, [showHelp, showMap, showPhone, showSettings, activeShop, activeNpcChat]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isCapturingControlRef.current) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        if (e.code === 'Escape') {
          (target as HTMLInputElement).blur();
        }
        return;
      }

      if (!started) {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          setStarted(true);
          engineRef.current?.exitStartupShowcase();
        }
        return;
      }

      if (hud.cutscene.active) {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          engineRef.current?.advanceCutscene();
        } else if (e.code === 'Escape') {
          e.preventDefault();
          engineRef.current?.skipCutscene();
        }
        return;
      }

      if (e.code === 'KeyM' || e.code === 'Tab') {
        e.preventDefault();
        setShowHelp(false);
        setShowPhone(false);
        setShowSettings(false);
        setActiveShop(null);
        setShowMap((prev) => !prev);
      } else if (e.code === 'KeyT') {
        e.preventDefault();
        setShowHelp(false);
        setShowMap(false);
        setShowSettings(false);
        setActiveShop(null);
        setShowPhone((prev) => !prev);
      } else if (e.code === 'KeyO') {
        e.preventDefault();
        setShowHelp(false);
        setShowMap(false);
        setShowPhone(false);
        setActiveShop(null);
        setShowSettings((prev) => !prev);
      } else if (e.code === 'KeyH') {
        setShowMap(false);
        setShowPhone(false);
        setShowSettings(false);
        setActiveShop(null);
        setShowHelp((prev) => !prev);
      } else if (e.code === 'Escape') {
        if (document.pointerLockElement) return;
        if (activeNpcChat) setActiveNpcChat(null);
        else if (activeShop) setActiveShop(null);
        else if (showPhone) setShowPhone(false);
        else if (showSettings) setShowSettings(false);
        else if (showMap) setShowMap(false);
        else if (showHelp) setShowHelp(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [started, hud.cutscene.active, activeShop, activeNpcChat, showMap, showHelp, showPhone, showSettings]);

  const handleStartGame = () => {
    setStarted(true);
    engineRef.current?.exitStartupShowcase();
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950">
      <div ref={canvasMountRef} className="w-full h-full" />

      {!started && (
        <StartupScreen
          selectedCharacter={hud.characterId}
          onSelectCharacter={(id) => engineRef.current?.setCharacter(id)}
          onStartGame={handleStartGame}
        />
      )}

      {started && (
        <GameHUD
          hud={hud}
          network={network}
          showHelp={showHelp}
          onToggleHelp={() => setShowHelp((v) => !v)}
          onOpenMap={() => setShowMap(true)}
          onOpenPhone={() => setShowPhone(true)}
          onOpenSettings={() => setShowSettings(true)}
          onToggleCamera={() => engineRef.current?.toggleCameraMode()}
          onSpawnVehicle={(t) => engineRef.current?.spawnPlayerVehicle(t)}
          onSetTime={(p) => engineRef.current?.setTimePreset(p)}
          onToggleAutoTime={() => engineRef.current?.toggleAutoTimeCycle()}
          onSetWeather={(w) => engineRef.current?.setWeatherPreset(w)}
          onToggleAutoWeather={() => engineRef.current?.toggleAutoWeatherCycle()}
          onTalkNearbyNpc={() => engineRef.current?.interactWithNearbyNpc()}
          onSetQuality={(q) => engineRef.current?.setQuality(q)}
          onSetRadio={(s) => engineRef.current?.setRadioStation(s)}
          onSetCharacter={(c) => engineRef.current?.setCharacter(c)}
          onSetWeapon={(w) => engineRef.current?.setWeapon(w)}
          onClearWanted={() => engineRef.current?.clearWanted()}
          onHealAndRepair={() => engineRef.current?.healAndRepair()}
          onToggleMute={() => engineRef.current?.toggleMute()}
          onStartStoryMission={(id) => engineRef.current?.startStoryMission(id)}
          onSendCoopInvite={(friendHandle, missionId) =>
            engineRef.current?.sendCoopMissionInvite(friendHandle, missionId)
          }
          onRespondCoopInvite={(accept) => engineRef.current?.respondCoopInvite(accept)}
          onCancelMission={() => engineRef.current?.cancelMission()}
          onAdvanceCutscene={() => engineRef.current?.advanceCutscene()}
          onSkipCutscene={() => engineRef.current?.skipCutscene()}
          onOpenNearbyShop={() => {
            engineRef.current?.openNearbyShopIfAllowed();
          }}
        />
      )}

      {started && showMap && (
        <InteractiveMapModal
          network={network}
          playerX={hud.playerX}
          playerZ={hud.playerZ}
          playerYaw={hud.playerYaw}
          onlineFriends={hud.onlineFriends}
          gpsTarget={hud.gpsTarget}
          gpsRoute={hud.gpsRoute}
          gpsDistance={hud.gpsDistance}
          onSetWaypoint={(x, z, label) => engineRef.current?.setGpsWaypoint(x, z, label)}
          onClearWaypoint={() => engineRef.current?.clearGpsWaypoint()}
          onClose={() => setShowMap(false)}
        />
      )}

      {started && showPhone && (
        <SmartphoneModal
          godMode={hud.godMode}
          weatherLabel={hud.weatherLabel}
          aiBulletin={hud.aiBulletin}
          onCallService={(service) => engineRef.current?.callEmergencyService(service)}
          onDialCheat={(code) =>
            engineRef.current?.dialCheatCode(code) ?? {
              ok: false,
              message: 'Hra ešte nie je pripravená.',
            }
          }
          onAskAiCopilot={(text) =>
            engineRef.current?.sendAiChat('copilot', text) ??
            Promise.resolve({ reply: '', error: 'Hra ešte nie je pripravená.' })
          }
          onGenerateAiMission={(theme) =>
            engineRef.current?.generateAndStartAiMission(theme) ??
            Promise.resolve({ ok: false, error: 'Hra ešte nie je pripravená.' })
          }
          onClose={() => setShowPhone(false)}
        />
      )}

      {started && activeNpcChat && (
        <NpcChatModal
          npc={activeNpcChat}
          weatherLabel={hud.weatherLabel}
          onSendMessage={(npc, text) =>
            engineRef.current?.sendAiChat(
              { npcId: npc.id, npcName: npc.name, npcRole: npc.role, npcMood: npc.mood },
              text,
            ) ?? Promise.resolve({ reply: '', error: 'Hra ešte nie je pripravená.' })
          }
          onClose={() => setActiveNpcChat(null)}
        />
      )}

      {started && showSettings && (
        <SettingsModal
          hud={hud}
          onSetQuality={(q) => engineRef.current?.setQuality(q)}
          onSetHandle={(h) => engineRef.current?.setPlayerHandle(h)}
          onAddFriend={(h) => engineRef.current?.addFriendHandle(h)}
          onRemoveFriend={(h) => engineRef.current?.removeFriendHandle(h)}
          onUpdateControlBinding={(ctx, action, patch) =>
            engineRef.current?.updateControlBinding(ctx, action, patch)
          }
          onResetControls={(ctx) => engineRef.current?.resetControlsConfig(ctx)}
          onCaptureStateChange={(cap) => {
            isCapturingControlRef.current = cap;
          }}
          onResetProgress={() => engineRef.current?.resetAllProgress()}
          onClose={() => setShowSettings(false)}
        />
      )}

      {started && activeShop && (
        <ShopModal
          shop={activeShop}
          hud={hud}
          onClose={() => setActiveShop(null)}
          onBuySnack={(n, c, h, a) => engineRef.current?.buySnack(n, c, h, a)}
          onVehicleMod={(act, val) => engineRef.current?.applyVehicleMod(act, val)}
          onBuyArmory={(item) => engineRef.current?.buyArmoryItem(item)}
          onUpdateStyle={(p, c, l, skin) => engineRef.current?.updateStyle(p, c, l, skin)}
          onBankAction={(act, amt) => engineRef.current?.bankAction(act, amt)}
          onDealershipVehicle={(t, buy) => engineRef.current?.buyOrTestDriveVehicle(t, buy)}
          onSafehouseAction={(act, preset) => engineRef.current?.safehouseAction(act, preset)}
        />
      )}
    </div>
  );
}
