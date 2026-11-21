import * as THREE from 'three';
import { SoundEngine } from './audio';
import { buildHiddenMissionPlayableDef, HIDDEN_MISSIONS, STORY_MISSIONS } from './missions';
import {
  applyCharacterCustomization,
  CharacterRig,
  createCharacterMesh,
  createVehicleMesh,
  deformVehicleMesh,
  resetVehicleDeformation,
  setCharacterWeaponMesh,
  setCharacterWeaponPose,
  setVehicleNeon,
  VehicleRig,
} from './models';
import {
  computeGpsRoute,
  getRightLanePointOnEdge,
  projectPointOntoRoad,
  RoadNetwork,
} from './roadNetwork';
import { createProceduralTextures, ProceduralTexturePack } from './textures';
import {
  getLocalizedCharacterCopy,
  getLocalizedMissionTitle,
  getLocalizedRank,
  getUi,
  getWeatherLabel,
} from './i18n';
import {
  ActionBinding,
  ActiveMissionState,
  AiNpcFeedItem,
  CameraMode,
  CHARACTERS,
  CharacterAccount,
  CharacterCustomization,
  CharacterId,
  CharacterSkills,
  ControlActionId,
  ControlContextId,
  ControlsConfig,
  CutsceneViewState,
  DEFAULT_CONTROLS_CONFIG,
  GamepadInputCode,
  GamepadLayoutPreference,
  getActiveBindingLabel,
  GpsPoint,
  GslMissionTelemetry,
  HiddenMissionDef,
  HudSnapshot,
  InputDeviceType,
  LanguageCode,
  MinimapBlip,
  NeonColorId,
  NpcBehaviorState,
  PendingCoopInvite,
  PlatformType,
  QualityLevel,
  RADIO_STATIONS,
  RadioStationId,
  RemoteFriendInfo,
  ShopLocation,
  SHOPS,
  StoryMissionDef,
  TimePreset,
  UiModePreference,
  VEHICLE_SPECS,
  VehicleTypeId,
  VehicleUpgradeState,
  WEAPONS,
  WeaponId,
  WeatherPreset,
} from './types';
import {
  buildPalmettoBayWorld,
  CircleCollider,
  ElevatorSystem,
  OrientedCollider,
  WorldData,
} from './world';

const SAVE_KEY = 'sunstate_outlaws_save_v2';
const CLOUD_SYNC_KEY = 'sunstate_cloud_sync_id';

const WEATHER_LABELS_SK: Record<WeatherPreset, string> = {
  clear: 'Jasno',
  overcast: 'Oblačno',
  rain: 'Dážď',
  storm: 'Búrka',
  foggy: 'Hmla',
};

const NPC_CITIZEN_NAMES: Array<{ name: string; role: string }> = [
  { name: 'Matej Kováč', role: 'Barista v Palmetto Bay' },
  { name: 'Lucia Horváthová', role: 'Kuriérka z Prístavu' },
  { name: 'Tomáš Bielik', role: 'Automechanik' },
  { name: 'Sofia Tóthová', role: 'Surferka z Coral Keys' },
  { name: 'Dávid Varga', role: 'Pouličný fotograf' },
  { name: 'Katarína Nováková', role: 'Zdravotná sestra EMS' },
  { name: 'Oliver Král', role: 'Súkromný pilot' },
  { name: 'Nina Šimková', role: 'Módna dizajnérka' },
  { name: 'Patrik Mlynár', role: 'Taxikár Sunstate Cab' },
  { name: 'Ema Ráczová', role: 'Finančná analytička' },
  { name: 'Samuel Benko', role: 'Lodný technik' },
  { name: 'Zuzana Kučerová', role: 'Reportérka Pulse FM' },
];

export type GamepadUiAction = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'cancel' | 'map' | 'phone' | 'settings';

interface VehicleEntity {
  id: number;
  type: VehicleTypeId;
  rig: VehicleRig;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  steerAngle: number;
  pitch: number;
  roll: number;
  wheelSpin: number;
  rotorSpeed: number;
  health: number;
  maxHealth: number;
  wrecked: boolean;
  onFire: boolean;
  waterDisabled: boolean;
  isAI: boolean;
  isPolice: boolean;
  isServiceUnit?: 'ems' | 'fire' | 'taxi' | 'police';
  serviceTimer?: number;
  upgrades: VehicleUpgradeState;
  aiEdgeId: number;
  aiReverse: boolean;
  aiSampleIdx: number;
  aiCooldown: number;
  airTime: number;
  wasAirborne: boolean;
  airStartX: number;
  airStartZ: number;
}

interface NpcEntity {
  id: number;
  name: string;
  role: string;
  rig: CharacterRig;
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  health: number;
  dead: boolean;
  respawnTimer: number;
  isCop: boolean;
  panicTimer: number;
  behavior: NpcBehaviorState;
  mood: string;
  reactionLine: string;
  behaviorTimer: number;
  targetX?: number;
  targetZ?: number;
}

interface RemotePlayerEntity {
  id: string;
  handle: string;
  characterId: CharacterId;
  x: number;
  y: number;
  z: number;
  yaw: number;
  inVehicle: boolean;
  vehicleType: string;
  rig: CharacterRig;
  carRig?: VehicleRig;
}

interface Particle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  isWater?: boolean;
}

interface TracerLine {
  line: THREE.Line;
  life: number;
}

interface ActiveCutsceneInternal {
  title: string;
  lines: Array<{ speaker: string; text: string }>;
  stepIndex: number;
  focusX: number;
  focusY: number;
  focusZ: number;
  onFinish: () => void;
}

// Pre-allocated math & spatial-query scratch helpers (zero per-frame GC churn)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _aimCamOrigin = new THREE.Vector3();
const _aimCamDir = new THREE.Vector3();
const _aimRayOrigin = new THREE.Vector3();
const _aimTargetPt = new THREE.Vector3();
const _camDesired = new THREE.Vector3();
const _camLook = new THREE.Vector3();
const _skyColor = new THREE.Color();
const _dawnSky = new THREE.Color(0xd99b66);
const _noonSky = new THREE.Color(0x5b9bd5);
const _goldenSky = new THREE.Color(0xd96b52);
const _nightSky = new THREE.Color(0x070b18);
const _sunDawn = new THREE.Color(0xfde6c4);
const _sunNoon = new THREE.Color(0xfdf8ee);
const _sunGolden = new THREE.Color(0xf59e56);
const _sunNight = new THREE.Color(0x64748b);
const _stormTint = new THREE.Color(0x3b485b);
const _fogTint = new THREE.Color(0x94a3b8);
const _lightningTint = new THREE.Color(0xdbeafe);
const _cloudDummy = new THREE.Object3D();
const _nearbyColliders: OrientedCollider[] = [];
const _nearbyCircles: CircleCollider[] = [];

function cloneDefaultControls(): ControlsConfig {
  return JSON.parse(JSON.stringify(DEFAULT_CONTROLS_CONFIG)) as ControlsConfig;
}

function createDefaultAccount(id: CharacterId): CharacterAccount {
  const p = CHARACTERS[id];
  return {
    cash: p.startingCash,
    bankBalance: p.startingBank,
    reputation: p.startingReputation,
    savedX: p.homeSpawnX,
    savedZ: p.homeSpawnZ,
    savedYaw: p.homeSpawnYaw,
    customization: { ...p.defaults },
    skills: { ...p.startingSkills },
    unlockedWeapons: { fists: true, pistol: true, smg: id === 'elena' },
    ammo: { fists: 0, pistol: 84, smg: id === 'elena' ? 120 : 0 },
    hasParachute: id === 'kairo',
    ownedVehicles: ['taxi'],
  };
}

export class GameEngine {
  private container: HTMLElement;
  private onHudUpdate: (snapshot: HudSnapshot) => void;
  private onOpenShop: (shop: ShopLocation) => void;
  private onGamepadUiAction?: (action: GamepadUiAction) => void;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private envRT: THREE.WebGLRenderTarget | null = null;
  private textures!: ProceduralTexturePack;
  private world!: WorldData;
  private sound = new SoundEngine();

  private sunLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private fillLight!: THREE.DirectionalLight;
  private muzzleLight!: THREE.PointLight;

  private isSoftwareGl = false;
  private quality: QualityLevel = 'high';
  private paused = false;
  private startupMode = true;
  private frameId = 0;
  private disposed = false;
  private clock = new THREE.Clock();
  private elapsed = 0;
  private hudTimer = 0;
  private gpsTimer = 0;
  private fpsAccum = 0;
  private fpsFrames = 0;
  private currentFps = 60;
  private shadowFrame = 0;
  private shadowUpdateInterval = 2;
  private lowFpsStreak = 0;
  private adaptiveDprCap = 1.25;

  // Input & Gamepad
  private keys: Record<string, boolean> = {};
  private mouseDown = false;
  private mouseAiming = false;
  private isDraggingLook = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private pointerLocked = false;
  private gamepadConnected = false;
  private activeInputDevice: InputDeviceType = 'keyboard';
  private detectedGamepadType: 'playstation' | 'xbox' = 'playstation';
  private gamepadLayoutPreference: GamepadLayoutPreference = 'auto';
  private detectedPlatform: PlatformType = 'pc';
  private uiModePreference: UiModePreference = 'auto';
  private virtualMoveX = 0;
  private virtualMoveY = 0;
  private virtualActions: Partial<Record<ControlActionId, boolean>> = {};
  private activeLookPointerId: number | null = null;
  private lastTouchLookX = 0;
  private lastTouchLookY = 0;
  private lastTouchTime = 0;
  private coarseMediaQuery: MediaQueryList | null = null;
  private steeringSensitivity = 1.0;
  private lookSensitivity = 1.0;
  private prevGamepadButtons: boolean[] = [];
  private controlsConfig: ControlsConfig = cloneDefaultControls();
  private cachedControlsSnapshot: ControlsConfig | null = null;

  // Language & Cloud Sync (always boots in 'en' unless restored from Cloud Save)
  private language: LanguageCode = 'en';
  private cloudSyncId = '';
  private cloudLastSavedAt: string | null = null;

  // Camera
  private cameraMode: CameraMode = 'third';
  private camYaw = Math.PI;
  private camPitch = 0.28;
  private camFov = 62;
  private manualLookCooldown = 0;
  private smoothCamY = 1.85;

  // Player & Individual Character Accounts
  private playerRig!: CharacterRig;
  private characterId: CharacterId = 'dante';
  private accounts: Record<CharacterId, CharacterAccount> = {
    dante: createDefaultAccount('dante'),
    elena: createDefaultAccount('elena'),
    kairo: createDefaultAccount('kairo'),
  };
  private playerX = CHARACTERS.dante.homeSpawnX;
  private playerY = 0.08;
  private playerZ = CHARACTERS.dante.homeSpawnZ;
  private playerVy = 0;
  private peakFallVy = 0;
  private playerYaw = CHARACTERS.dante.homeSpawnYaw;
  private onGround = true;
  private parachuteOpen = false;
  private walkCycle = 0;
  private prevWalkSin = 0;
  private health = 100;
  private armor = 50;
  private godMode = false;
  private wasted = false;
  private wastedTimer = 0;

  // Weapons & Firing
  private weaponId: WeaponId = 'pistol';
  private fireCooldown = 0;
  private weaponRecoil = 0;
  private muzzleTimer = 0;
  private isAiming = false;
  private hitMarkerTimer = 0;

  // Vehicles, Transmission & NPCs
  private vehicles: VehicleEntity[] = [];
  private npcs: NpcEntity[] = [];
  private currentVehicle: VehicleEntity | null = null;
  private nextEntityId = 1;
  private prevVehSpeed = 0;
  private prevVehYaw = 0;
  private currentGear = 1;
  private engineRpm = 0.2;
  private shiftDipTimer = 0;
  private lastThrottle = 0;
  private atmoLastWindowEmissive = -1;
  private atmoLastBulbEmissive = -1;
  private atmoLastHeadlightEmissive = -1;
  private gslState = {
    active: false,
    vanId: null as number | null,
    packageDamage: 0,
    onRoad: true,
    graceTimer: 0,
  };

  // Particles & Tracers
  private particles: Particle[] = [];
  private tracers: TracerLine[] = [];
  private smokeGeo = new THREE.SphereGeometry(0.32, 6, 6);
  private waterGeo = new THREE.SphereGeometry(0.22, 5, 5);
  private sparkGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);

  // Wanted
  private wantedStars = 0;
  private wantedCooldown = 0;
  private wantedEvading = false;
  private copSpawnTimer = 0;

  // Time (3x real-time cycle!) & Smooth Weather & Radio
  private timeHour = 16.5;
  private timePreset: TimePreset = 'golden';
  private autoTimeCycle = true;
  private weatherPreset: WeatherPreset = 'clear';
  private targetWeatherPreset: WeatherPreset = 'clear';
  private autoWeatherCycle = true;
  private weatherCycleTimer = 210;
  private rainFactor = 0;
  private cloudFactor = 0.2;
  private fogFactor = 0.04;
  private stormFactor = 0;
  private wetness = 0;
  private lightningFlash = 0;
  private lightningCooldown = 8;
  private rainGeo: THREE.BufferGeometry | null = null;
  private rainPositions: Float32Array | null = null;
  private rainLines: THREE.LineSegments | null = null;
  private rainMat: THREE.LineBasicMaterial | null = null;
  private radioId: RadioStationId = 'off';

  // AI Director & Interactive AI NPCs
  private aiDirectorStatus: 'idle' | 'active' | 'error' = 'idle';
  private aiDirectorError = '';
  private aiBulletin = 'Palmetto Bay · AI City Dispatch ready.';
  private aiPoliceTactic = 'Standard PBPD district patrol';
  private aiDirectorTimer = 3.0;
  private aiDirectorInFlight = false;
  private recentWorldEvents: string[] = [];
  private onOpenNpcChat?: (npc: { id: number; name: string; role: string; mood: string }) => void;

  // GPS, Story Missions, Discoverable Random Missions & Cutscenes
  private gpsTarget: { x: number; z: number; label: string } | null = null;
  private gpsRoute: GpsPoint[] = [];
  private gpsDistance = 0;
  private gpsTurnHint = '';
  private completedStoryIds: string[] = [];
  private discoveredHiddenIds: string[] = [];
  private completedHiddenIds: string[] = [];
  private nearbyHiddenMission: HiddenMissionDef | null = null;
  private activeHiddenId: string | null = null;
  private activeStoryDef: StoryMissionDef | null = null;
  private mission: ActiveMissionState = {
    activeId: null,
    isHidden: false,
    title: getUi('en').freeRoamTitle,
    objective: getUi('en').freeRoamObjective,
    targetX: null,
    targetY: null,
    targetZ: null,
    stageIndex: 0,
    totalStages: 0,
    timeLeft: 0,
    reward: 0,
  };
  private cutscene: ActiveCutsceneInternal | null = null;

  // Multiplayer WebSocket & Friends
  private ws: WebSocket | null = null;
  private wsTimer = 0;
  private playerHandle = `Outlaw_${Math.floor(1000 + Math.random() * 8999)}`;
  private friends: string[] = [];
  private remotePlayers = new Map<string, RemotePlayerEntity>();
  private pendingInvite: PendingCoopInvite | null = null;

  // Notifications
  private toastText = getUi('en').welcomeToast;
  private toastTimer = 5;
  private toastType: 'info' | 'success' | 'warning' = 'info';

  constructor(
    container: HTMLElement,
    onHudUpdate: (snapshot: HudSnapshot) => void,
    onOpenShop: (shop: ShopLocation) => void,
    onGamepadUiAction?: (action: GamepadUiAction) => void,
    onOpenNpcChat?: (npc: { id: number; name: string; role: string; mood: string }) => void,
  ) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    this.onOpenShop = onOpenShop;
    this.onGamepadUiAction = onGamepadUiAction;
    this.onOpenNpcChat = onOpenNpcChat;
    this.loadSavedState();
    this.refreshPlatformDetection(true);
    this.init();
    const savedSyncId = localStorage.getItem(CLOUD_SYNC_KEY);
    if (savedSyncId && savedSyncId.trim()) {
      this.cloudSyncId = savedSyncId.trim();
      void this.loadFromCloud(this.cloudSyncId, true);
    }
  }

  private get account(): CharacterAccount {
    return this.accounts[this.characterId];
  }

  public getRoadNetwork(): RoadNetwork {
    return this.world.network;
  }

  private loadSavedState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.characterId === 'dante' || saved.characterId === 'elena' || saved.characterId === 'kairo') {
        this.characterId = saved.characterId;
      }
      if (saved.accounts?.dante) {
        this.accounts.dante = { ...createDefaultAccount('dante'), ...saved.accounts.dante };
      }
      if (saved.accounts?.elena) {
        this.accounts.elena = { ...createDefaultAccount('elena'), ...saved.accounts.elena };
      }
      if (saved.accounts?.kairo) {
        this.accounts.kairo = { ...createDefaultAccount('kairo'), ...saved.accounts.kairo };
      }
      (['dante', 'elena', 'kairo'] as CharacterId[]).forEach((cId) => {
        if (!Array.isArray(this.accounts[cId].ownedVehicles) || this.accounts[cId].ownedVehicles.length === 0) {
          this.accounts[cId].ownedVehicles = ['taxi'];
        }
      });
      const activeAcc = this.accounts[this.characterId];
      const activeProf = CHARACTERS[this.characterId];
      this.playerX = typeof activeAcc.savedX === 'number' ? activeAcc.savedX : activeProf.homeSpawnX;
      this.playerZ = typeof activeAcc.savedZ === 'number' ? activeAcc.savedZ : activeProf.homeSpawnZ;
      this.playerYaw = typeof activeAcc.savedYaw === 'number' ? activeAcc.savedYaw : activeProf.homeSpawnYaw;

      if (Array.isArray(saved.completedStoryIds)) this.completedStoryIds = saved.completedStoryIds;
      if (Array.isArray(saved.discoveredHiddenIds)) this.discoveredHiddenIds = saved.discoveredHiddenIds;
      if (Array.isArray(saved.completedHiddenIds)) this.completedHiddenIds = saved.completedHiddenIds;
      if (typeof saved.playerHandle === 'string' && saved.playerHandle.trim()) {
        this.playerHandle = saved.playerHandle.trim();
      }
      if (Array.isArray(saved.friends)) this.friends = saved.friends;
      if (typeof saved.timeHour === 'number') this.timeHour = saved.timeHour;
      if (typeof saved.steeringSensitivity === 'number') {
        this.steeringSensitivity = THREE.MathUtils.clamp(saved.steeringSensitivity, 0.3, 2.5);
      }
      if (typeof saved.lookSensitivity === 'number') {
        this.lookSensitivity = THREE.MathUtils.clamp(saved.lookSensitivity, 0.3, 2.5);
      }
      if (
        saved.gamepadLayoutPreference === 'auto' ||
        saved.gamepadLayoutPreference === 'playstation' ||
        saved.gamepadLayoutPreference === 'xbox'
      ) {
        this.gamepadLayoutPreference = saved.gamepadLayoutPreference;
      }
      if (
        saved.uiModePreference === 'auto' ||
        saved.uiModePreference === 'pc' ||
        saved.uiModePreference === 'mobile'
      ) {
        this.uiModePreference = saved.uiModePreference;
      }
      if (saved.controlsConfig && typeof saved.controlsConfig === 'object') {
        const defaults = cloneDefaultControls();
        (Object.keys(defaults) as ControlContextId[]).forEach((ctx) => {
          if (saved.controlsConfig[ctx]) {
            defaults[ctx] = { ...defaults[ctx], ...saved.controlsConfig[ctx] };
          }
        });
        this.controlsConfig = defaults;
      }
    } catch {
      // Ignore corrupt save
    }
  }

  private buildSerializableSaveData() {
    if (!this.currentVehicle) {
      this.account.savedX = this.playerX;
      this.account.savedZ = this.playerZ;
      this.account.savedYaw = this.playerYaw;
    }
    return {
      characterId: this.characterId,
      accounts: this.accounts,
      completedStoryIds: this.completedStoryIds,
      discoveredHiddenIds: this.discoveredHiddenIds,
      completedHiddenIds: this.completedHiddenIds,
      playerHandle: this.playerHandle,
      friends: this.friends,
      timeHour: this.timeHour,
      steeringSensitivity: this.steeringSensitivity,
      lookSensitivity: this.lookSensitivity,
      gamepadLayoutPreference: this.gamepadLayoutPreference,
      uiModePreference: this.uiModePreference,
      controlsConfig: this.controlsConfig,
    };
  }

  private applyRestoredSaveData(saved: any) {
    if (!saved || typeof saved !== 'object') return;
    if (saved.characterId === 'dante' || saved.characterId === 'elena' || saved.characterId === 'kairo') {
      this.characterId = saved.characterId;
    }
    if (saved.accounts?.dante) {
      this.accounts.dante = { ...createDefaultAccount('dante'), ...saved.accounts.dante };
    }
    if (saved.accounts?.elena) {
      this.accounts.elena = { ...createDefaultAccount('elena'), ...saved.accounts.elena };
    }
    if (saved.accounts?.kairo) {
      this.accounts.kairo = { ...createDefaultAccount('kairo'), ...saved.accounts.kairo };
    }
    (['dante', 'elena', 'kairo'] as CharacterId[]).forEach((cId) => {
      if (!Array.isArray(this.accounts[cId].ownedVehicles) || this.accounts[cId].ownedVehicles.length === 0) {
        this.accounts[cId].ownedVehicles = ['taxi'];
      }
    });
    const activeAcc = this.accounts[this.characterId];
    const activeProf = CHARACTERS[this.characterId];
    this.playerX = typeof activeAcc.savedX === 'number' ? activeAcc.savedX : activeProf.homeSpawnX;
    this.playerZ = typeof activeAcc.savedZ === 'number' ? activeAcc.savedZ : activeProf.homeSpawnZ;
    this.playerYaw = typeof activeAcc.savedYaw === 'number' ? activeAcc.savedYaw : activeProf.homeSpawnYaw;
    if (this.world) {
      this.playerY = this.world.groundHeightAt(this.playerX, this.playerZ, 2);
    }
    this.camYaw = this.playerYaw + Math.PI;

    if (Array.isArray(saved.completedStoryIds)) this.completedStoryIds = saved.completedStoryIds;
    if (Array.isArray(saved.discoveredHiddenIds)) this.discoveredHiddenIds = saved.discoveredHiddenIds;
    if (Array.isArray(saved.completedHiddenIds)) this.completedHiddenIds = saved.completedHiddenIds;
    if (typeof saved.playerHandle === 'string' && saved.playerHandle.trim()) {
      this.playerHandle = saved.playerHandle.trim();
    }
    if (Array.isArray(saved.friends)) this.friends = saved.friends;
    if (typeof saved.timeHour === 'number') this.timeHour = saved.timeHour;
    if (typeof saved.steeringSensitivity === 'number') {
      this.steeringSensitivity = THREE.MathUtils.clamp(saved.steeringSensitivity, 0.3, 2.5);
    }
    if (typeof saved.lookSensitivity === 'number') {
      this.lookSensitivity = THREE.MathUtils.clamp(saved.lookSensitivity, 0.3, 2.5);
    }
    if (
      saved.gamepadLayoutPreference === 'auto' ||
      saved.gamepadLayoutPreference === 'playstation' ||
      saved.gamepadLayoutPreference === 'xbox'
    ) {
      this.gamepadLayoutPreference = saved.gamepadLayoutPreference;
    }
    if (
      saved.uiModePreference === 'auto' ||
      saved.uiModePreference === 'pc' ||
      saved.uiModePreference === 'mobile'
    ) {
      this.uiModePreference = saved.uiModePreference;
      this.refreshPlatformDetection(true);
    }
    if (saved.controlsConfig && typeof saved.controlsConfig === 'object') {
      const defaults = cloneDefaultControls();
      (Object.keys(defaults) as ControlContextId[]).forEach((ctx) => {
        if (saved.controlsConfig[ctx]) {
          defaults[ctx] = { ...defaults[ctx], ...saved.controlsConfig[ctx] };
        }
      });
      this.controlsConfig = defaults;
      this.cachedControlsSnapshot = null;
    }
    if (this.scene) {
      if (this.currentVehicle) {
        this.currentVehicle = null;
      }
      this.rebuildPlayerCharacter();
      this.applyAtmosphere();
    }
  }

  public saveGameState(silent = false) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.buildSerializableSaveData()));
      if (!silent) {
        this.showToast(
          this.language === 'en' ? 'Progress saved locally!' : 'Postup hry bol úspešne uložený!',
          'success',
        );
      }
    } catch {
      if (!silent) this.showToast('Local save failed', 'warning');
    }
  }

  public setLanguage(lang: LanguageCode) {
    this.language = lang;
    const ui = getUi(lang);
    if (!this.mission.activeId) {
      this.mission = {
        ...this.mission,
        title: ui.freeRoamTitle,
        objective: ui.freeRoamObjective,
      };
    }
    this.showToast(`${ui.languageLabel}: ${lang.toUpperCase()}`, 'info');
    this.emitHud();
  }

  private detectMobilePlatform(): PlatformType {
    if (typeof window === 'undefined') return 'pc';
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    const isMobileUa =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(ua);
    const hasCoarse = Boolean(window.matchMedia?.('(pointer: coarse)')?.matches);
    const hasFine = Boolean(window.matchMedia?.('(pointer: fine)')?.matches);
    const touchPoints = typeof navigator !== 'undefined' ? navigator.maxTouchPoints || 0 : 0;
    if (isMobileUa) return 'mobile';
    if (hasCoarse && !hasFine) return 'mobile';
    if (touchPoints > 0 && window.innerWidth <= 1024 && !hasFine) return 'mobile';
    return 'pc';
  }

  private getIsMobileUi(): boolean {
    if (this.uiModePreference === 'mobile') return true;
    if (this.uiModePreference === 'pc') return false;
    return this.detectedPlatform === 'mobile';
  }

  private refreshPlatformDetection(forceDeviceSync = false) {
    this.detectedPlatform = this.detectMobilePlatform();
    const mobileUi = this.getIsMobileUi();
    if (mobileUi) {
      if (forceDeviceSync || this.activeInputDevice === 'keyboard') {
        this.activeInputDevice = 'touch';
      }
    } else if (this.activeInputDevice === 'touch') {
      this.activeInputDevice = 'keyboard';
    }
  }

  public setUiModePreference(pref: UiModePreference) {
    this.uiModePreference = pref;
    this.refreshPlatformDetection(true);
    this.virtualMoveX = 0;
    this.virtualMoveY = 0;
    this.virtualActions = {};
    this.saveGameState(true);
    this.emitHud();
  }

  public setGamepadLayoutPreference(pref: GamepadLayoutPreference) {
    this.gamepadLayoutPreference = pref;
    if (this.activeInputDevice === 'playstation' || this.activeInputDevice === 'xbox') {
      this.activeInputDevice = this.getEffectiveGamepadDevice();
    }
    this.saveGameState(true);
    this.emitHud();
  }

  public setSteeringSensitivity(val: number) {
    this.steeringSensitivity = THREE.MathUtils.clamp(Number(val) || 1.0, 0.3, 2.5);
    this.saveGameState(true);
    this.emitHud();
  }

  public setLookSensitivity(val: number) {
    this.lookSensitivity = THREE.MathUtils.clamp(Number(val) || 1.0, 0.3, 2.5);
    this.saveGameState(true);
    this.emitHud();
  }

  public async saveToCloud(
    syncIdInput: string,
  ): Promise<{ ok: boolean; syncId?: string; savedAt?: string; error?: string }> {
    const cleanId = syncIdInput.trim();
    if (cleanId.length < 3) {
      return { ok: false, error: 'Sync ID must be at least 3 characters.' };
    }
    const payload = {
      syncId: cleanId,
      language: this.language,
      saveData: this.buildSerializableSaveData(),
    };
    const res = await this.safeFetchJson('/api/cloud-save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok || !res.data?.ok) {
      return { ok: false, error: String(res.data?.error || res.rawError || `HTTP ${res.status}`) };
    }
    this.cloudSyncId = String(res.data.syncId || cleanId);
    this.cloudLastSavedAt = res.data.savedAt ? String(res.data.savedAt) : new Date().toISOString();
    localStorage.setItem(CLOUD_SYNC_KEY, this.cloudSyncId);
    this.saveGameState(true);
    this.showToast(
      `Cloud Save: ${this.cloudSyncId} (${this.language.toUpperCase()})`,
      'success',
    );
    this.emitHud();
    return { ok: true, syncId: this.cloudSyncId, savedAt: this.cloudLastSavedAt };
  }

  public async loadFromCloud(
    syncIdInput: string,
    silent = false,
  ): Promise<{ ok: boolean; language?: LanguageCode; error?: string }> {
    const cleanId = syncIdInput.trim();
    if (cleanId.length < 3) {
      return { ok: false, error: 'Sync ID must be at least 3 characters.' };
    }
    const res = await this.safeFetchJson(`/api/cloud-save/${encodeURIComponent(cleanId)}`);
    if (!res.ok || !res.data?.ok || !res.data?.record) {
      return { ok: false, error: String(res.data?.error || res.rawError || `HTTP ${res.status}`) };
    }
    const record = res.data.record;
    const validLangs: LanguageCode[] = ['en', 'sk', 'cs', 'de', 'es', 'pl'];
    const cloudLang: LanguageCode = validLangs.includes(record.language) ? record.language : 'en';
    this.language = cloudLang;
    this.applyRestoredSaveData(record.saveData);
    this.cloudSyncId = String(record.syncId || cleanId);
    this.cloudLastSavedAt = record.savedAt ? String(record.savedAt) : null;
    localStorage.setItem(CLOUD_SYNC_KEY, this.cloudSyncId);
    this.saveGameState(true);

    const ui = getUi(this.language);
    if (!this.mission.activeId) {
      this.mission = {
        ...this.mission,
        title: ui.freeRoamTitle,
        objective: ui.freeRoamObjective,
      };
    }
    if (!silent) {
      this.showToast(ui.cloudLoadedToast, 'success');
    }
    this.emitHud();
    return { ok: true, language: cloudLang };
  }

  public unlinkCloud() {
    localStorage.removeItem(CLOUD_SYNC_KEY);
    this.cloudSyncId = '';
    this.cloudLastSavedAt = null;
    this.emitHud();
  }

  public resetAllProgress() {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(CLOUD_SYNC_KEY);
    this.cloudSyncId = '';
    this.cloudLastSavedAt = null;
    this.accounts = {
      dante: createDefaultAccount('dante'),
      elena: createDefaultAccount('elena'),
      kairo: createDefaultAccount('kairo'),
    };
    this.characterId = 'dante';
    this.completedStoryIds = [];
    this.discoveredHiddenIds = [];
    this.completedHiddenIds = [];
    this.nearbyHiddenMission = null;
    this.activeHiddenId = null;
    this.health = 100;
    this.armor = 50;
    this.godMode = false;
    this.wantedStars = 0;
    this.wantedEvading = false;
    this.currentVehicle = null;
    this.playerX = CHARACTERS.dante.homeSpawnX;
    this.playerZ = CHARACTERS.dante.homeSpawnZ;
    this.playerYaw = CHARACTERS.dante.homeSpawnYaw;
    this.playerY = this.world.groundHeightAt(this.playerX, this.playerZ, 2);
    this.cancelMission();
    this.clearGpsWaypoint();
    this.rebuildPlayerCharacter();
    this.vehicles.forEach((v) => {
      if (!v.isAI) {
        v.health = 100;
        v.wrecked = false;
        v.onFire = false;
        v.waterDisabled = false;
        v.rig.fireGroup.visible = false;
        resetVehicleDeformation(v.rig);
      }
    });
    this.showToast(getUi(this.language).welcomeToast, 'info');
    this.emitHud();
  }

  private detectSoftwareWebGL(): boolean {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  }

  private init() {
    this.isSoftwareGl = this.detectSoftwareWebGL();
    if (this.isSoftwareGl) this.quality = 'performance';

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, this.adaptiveDprCap),
    );
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.86;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x5b9bd5);
    this.scene.fog = new THREE.Fog(0x5b9bd5, 580, 3800);

    // Smooth coastal sky-to-ground IBL environment (no harsh white studio light boxes!)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const envScene = new THREE.Scene();
    const envSkyGeo = new THREE.SphereGeometry(20, 24, 16);
    const envSkyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: `
        varying vec3 vPos;
        void main() {
          vPos = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vPos;
        void main() {
          float y = vPos.y;
          vec3 skyTop = vec3(0.32, 0.56, 0.84);
          vec3 horizon = vec3(0.68, 0.78, 0.88);
          vec3 ground = vec3(0.16, 0.20, 0.26);
          vec3 col = y >= 0.0
            ? mix(horizon, skyTop, pow(y, 0.65))
            : mix(horizon * 0.72, ground, pow(-y, 0.5));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const envDome = new THREE.Mesh(envSkyGeo, envSkyMat);
    envScene.add(envDome);
    this.envRT = pmremGenerator.fromScene(envScene, 0.04);
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = 0.42;
    envSkyGeo.dispose();
    envSkyMat.dispose();
    pmremGenerator.dispose();

    // Long far clipping plane for huge 5600m world & high-altitude aviation!
    this.camera = new THREE.PerspectiveCamera(this.camFov, width / height, 0.22, 4800);

    this.hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x263142, 0.48);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfdf8ee, 1.05);
    this.sunLight.position.set(160, 140, 95);
    this.sunLight.castShadow = !this.isSoftwareGl;
    const shadowRes = 1024;
    this.sunLight.shadow.mapSize.set(shadowRes, shadowRes);
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 360;
    const d = 95;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.024;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.fillLight = new THREE.DirectionalLight(0x7dd3fc, 0.16);
    this.fillLight.position.set(-140, 70, -120);
    this.scene.add(this.fillLight);

    this.muzzleLight = new THREE.PointLight(0xfef08a, 0, 14);
    this.scene.add(this.muzzleLight);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso);
    this.world = buildPalmettoBayWorld(this.scene, this.textures);
    this.createRainSystem();

    this.rebuildPlayerCharacter();
    this.spawnInitialEntities();
    this.applyAtmosphere();
    this.applyQualitySettings();
    this.connectMultiplayer();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.emitHud();
    this.tick();
  }

  private createRainSystem() {
    const count = 820;
    this.rainPositions = new Float32Array(count * 2 * 3);
    for (let i = 0; i < count; i++) {
      const rx = (Math.random() - 0.5) * 95;
      const ry = Math.random() * 44;
      const rz = (Math.random() - 0.5) * 95;
      const idx = i * 6;
      this.rainPositions[idx] = rx;
      this.rainPositions[idx + 1] = ry;
      this.rainPositions[idx + 2] = rz;
      this.rainPositions[idx + 3] = rx - 0.25;
      this.rainPositions[idx + 4] = ry - 1.35;
      this.rainPositions[idx + 5] = rz - 0.1;
    }
    this.rainGeo = new THREE.BufferGeometry();
    this.rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    this.rainMat = new THREE.LineBasicMaterial({
      color: 0xcbe7ff,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    this.rainLines = new THREE.LineSegments(this.rainGeo, this.rainMat);
    this.rainLines.frustumCulled = false;
    this.rainLines.visible = false;
    this.scene.add(this.rainLines);
  }

  public exitStartupShowcase() {
    this.startupMode = false;
    this.sound.unlock();
    this.emitHud();
  }

  public setQuality(q: QualityLevel) {
    this.quality = this.isSoftwareGl ? 'performance' : q;
    this.applyQualitySettings();
    this.showToast(`Grafická kvalita: ${this.quality.toUpperCase()}`, 'info');
    this.emitHud();
  }

  public setPaused(p: boolean) {
    this.paused = p;
    if (p && document.pointerLockElement) {
      document.exitPointerLock?.();
    }
  }

  public setCameraMode(mode: CameraMode) {
    this.cameraMode = mode;
    if (this.playerRig) {
      this.playerRig.headGroup.visible = !(mode === 'first' && !this.currentVehicle);
    }
    this.showToast(
      mode === 'first' ? 'Pohľad z prvej osoby (1st Person)' : 'Pohľad z tretej osoby (3rd Person)',
      'info',
    );
    this.emitHud();
  }

  public toggleCameraMode() {
    this.setCameraMode(this.cameraMode === 'third' ? 'first' : 'third');
  }

  private applyQualitySettings() {
    if (this.isSoftwareGl) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    if (this.quality === 'high') {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.adaptiveDprCap));
      this.renderer.shadowMap.enabled = true;
      this.sunLight.castShadow = true;
      if (this.sunLight.shadow.mapSize.x !== 1024) {
        this.sunLight.shadow.mapSize.set(1024, 1024);
        this.sunLight.shadow.map?.dispose();
        this.sunLight.shadow.map = null;
      }
      this.renderer.shadowMap.needsUpdate = true;
    } else if (this.quality === 'medium') {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
      this.renderer.shadowMap.enabled = true;
      this.sunLight.castShadow = true;
      if (this.sunLight.shadow.mapSize.x !== 512) {
        this.sunLight.shadow.mapSize.set(512, 512);
        this.sunLight.shadow.map?.dispose();
        this.sunLight.shadow.map = null;
      }
      this.renderer.shadowMap.needsUpdate = true;
    } else {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
      this.sunLight.castShadow = false;
    }
    this.renderer.setSize(width, height);
  }

  private rebuildPlayerCharacter() {
    if (this.playerRig) {
      this.scene.remove(this.playerRig.group);
    }
    this.playerRig = createCharacterMesh(
      CHARACTERS[this.characterId],
      this.textures.contactShadow,
      this.account.customization,
    );
    this.playerRig.group.position.set(this.playerX, this.playerY, this.playerZ);
    this.playerRig.group.rotation.y = this.playerYaw;
    this.playerRig.parachutePack.visible = this.account.hasParachute;
    this.playerRig.parachuteCanopy.visible = this.parachuteOpen;
    this.playerRig.headGroup.visible = !(this.cameraMode === 'first' && !this.currentVehicle);
    setCharacterWeaponMesh(this.playerRig, this.weaponId);
    this.scene.add(this.playerRig.group);
  }

  private spawnInitialEntities() {
    // Starter showcase & world vehicles
    this.createVehicle('veloce', 56, -12, Math.PI * 0.25, false, 0xff2a6d);
    this.createVehicle('solstice', 64, 24, -Math.PI * 0.35, false, 0x38bdf8);
    this.createVehicle('brawler', -62, 22, -Math.PI * 0.5, false, 0xf59e0b);
    this.createVehicle('taxi', 42, -56, 0, false, 0xfacc15);

    // Emergency & Special Vehicles cleanly parked outside civic stations & Airport
    this.createVehicle('firetruck', -476, 470, -0.4, false, 0xb91c1c);
    this.createVehicle('ambulance', -364, -648, 0.785, false, 0xf1f5f9);
    this.createVehicle('helicopter', 740, 520, 0, false, 0x0369a1);
    this.createVehicle('plane', -820, 1150, Math.PI / 2, false, 0xe2e8f0);
    this.createVehicle('plane', -980, 1660, Math.PI / 2, false, 0xbe123c);
    this.createVehicle('jet', -760, 1660, Math.PI / 2, false, 0x334155);
    this.createVehicle('helicopter', -1120, 1460, 0, false, 0xd97706);
    this.createVehicle('plane', 520, -1120, Math.PI / 2, false, 0xbe123c);

    // Ambient AI Traffic (Cars + Taxis + Calm PBPD Patrols) driving on RIGHT-HAND LANE!
    const trafficTypes: VehicleTypeId[] = [
      'veloce',
      'taxi',
      'brawler',
      'terramax',
      'solstice',
      'pbpd',
      'veloce',
      'taxi',
    ];
    const numEdges = this.world.network.edges.length;
    for (let i = 0; i < 22; i++) {
      const edgeIdx = (i * 2) % numEdges;
      const edge = this.world.network.edges[edgeIdx];
      if (edge.isDirt) continue;
      const isRev = i % 2 === 1;
      const sIdx = Math.floor(edge.samples.length * (isRev ? 0.65 : 0.35));
      const lanePos = getRightLanePointOnEdge(edge, sIdx, isRev);
      const nextIdx = isRev ? Math.max(0, sIdx - 1) : Math.min(edge.samples.length - 1, sIdx + 1);
      const laneNext = getRightLanePointOnEdge(edge, nextIdx, isRev);
      const yaw = Math.atan2(laneNext.x - lanePos.x, laneNext.z - lanePos.z);
      const type = trafficTypes[i % trafficTypes.length];
      const colors = VEHICLE_SPECS[type].colors;
      const veh = this.createVehicle(type, lanePos.x, lanePos.z, yaw, true, colors[i % colors.length]);
      veh.aiEdgeId = edge.id;
      veh.aiSampleIdx = nextIdx;
      veh.aiReverse = isRev;
    }

    // Ambient AI Pedestrians & PBPD Foot Patrols across districts (placed clear of buildings/trees!)
    const pedProfiles = [CHARACTERS.dante, CHARACTERS.elena, CHARACTERS.kairo];
    for (let i = 0; i < 24; i++) {
      const rawX = -550 + ((i * 157) % 1250);
      const rawZ = -650 + ((i * 211) % 1300);
      const spot = this.findClearSpawnSpot(rawX, rawZ, 0.75);
      const isCop = i % 6 === 5;
      const base = pedProfiles[i % pedProfiles.length];
      const jacketPalette = [0xec4899, 0x14b8a6, 0xf97316, 0x8b5cf6, 0xeab308];
      const rig = createCharacterMesh(base, this.textures.contactShadow, {
        ...base.defaults,
        jacketColor: isCop ? 0x0f172a : jacketPalette[i % jacketPalette.length],
        pantsColor: isCop ? 0x1e293b : base.defaults.pantsColor,
      });
      const py = this.world.groundHeightAt(spot.x, spot.z, 2);
      rig.group.position.set(spot.x, py, spot.z);
      this.scene.add(rig.group);
      const citizenMeta = NPC_CITIZEN_NAMES[i % NPC_CITIZEN_NAMES.length];
      this.npcs.push({
        id: this.nextEntityId++,
        name: isCop ? `Strážnik PBPD #${10 + i}` : citizenMeta.name,
        role: isCop ? 'Pešia hliadka PBPD' : citizenMeta.role,
        rig,
        x: spot.x,
        y: py,
        z: spot.z,
        yaw: Math.random() * Math.PI * 2,
        speed: isCop ? 2.4 : 2.0 + Math.random() * 0.75,
        health: isCop ? 85 : 60,
        dead: false,
        respawnTimer: 0,
        isCop,
        panicTimer: 0,
        behavior: 'patrol',
        mood: isCop ? 'ostražitý' : 'pokojný',
        reactionLine: '',
        behaviorTimer: 0,
      });
    }
  }

  private createVehicle(
    type: VehicleTypeId,
    x: number,
    z: number,
    yaw: number,
    isAI: boolean,
    customColor?: number,
  ): VehicleEntity {
    const spec = VEHICLE_SPECS[type];
    const rig = createVehicleMesh(spec, this.textures.contactShadow, customColor, {
      taxiSign: this.textures.taxiSign,
      emsCross: this.textures.emsCross,
      gslLogo: this.textures.gslLogo,
    });
    if (this.atmoLastHeadlightEmissive >= 0) {
      rig.headlightMat.emissiveIntensity = this.atmoLastHeadlightEmissive;
    }
    const y = this.world.groundHeightAt(x, z, 10);
    rig.group.position.set(x, y, z);
    rig.group.rotation.order = 'YXZ';
    rig.group.rotation.y = yaw;
    this.scene.add(rig.group);

    const entity: VehicleEntity = {
      id: this.nextEntityId++,
      type,
      rig,
      x,
      y,
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw,
      steerAngle: 0,
      pitch: 0,
      roll: 0,
      wheelSpin: 0,
      rotorSpeed: 0,
      health: 100,
      maxHealth: 100,
      wrecked: false,
      onFire: false,
      waterDisabled: false,
      isAI,
      isPolice: Boolean(spec.isPolice),
      upgrades: { engineLevel: 0, turboInstalled: false, handlingLevel: 0, neonColor: 'off' },
      aiEdgeId: 0,
      aiReverse: false,
      aiSampleIdx: 0,
      aiCooldown: 0,
      airTime: 0,
      wasAirborne: false,
      airStartX: x,
      airStartZ: z,
    };
    this.vehicles.push(entity);
    return entity;
  }

  // --- Multiplayer WebSocket Sync ---

  private connectMultiplayer() {
    try {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${proto}//${window.location.host}/ws`;
      const ws = new WebSocket(url);
      this.ws = ws;

      ws.addEventListener('open', () => {
        this.syncMultiplayerProfile();
      });

      ws.addEventListener('message', (ev) => {
        try {
          const msg = JSON.parse(String(ev.data));
          if (msg.type === 'world:snapshot' && Array.isArray(msg.players)) {
            const activeIds = new Set<string>();
            msg.players.forEach((p: any) => {
              activeIds.add(p.id);
              this.upsertRemotePlayer(p);
            });
            this.remotePlayers.forEach((rp, id) => {
              if (!activeIds.has(id)) this.removeRemotePlayer(id);
            });
            this.emitHud();
          } else if (msg.type === 'player:update' && msg.player) {
            this.upsertRemotePlayer(msg.player);
          } else if (msg.type === 'player:leave' && msg.id) {
            this.removeRemotePlayer(msg.id);
            this.emitHud();
          } else if (msg.type === 'mission:invite') {
            this.pendingInvite = {
              fromHandle: String(msg.fromHandle || 'Kamarát'),
              missionId: String(msg.missionId || 'm1'),
              missionTitle: String(msg.missionTitle || 'Spoločná misia'),
            };
            this.showToast(`${this.pendingInvite.fromHandle} ťa pozval na misiu!`, 'info');
            this.emitHud();
          } else if (msg.type === 'mission:coop_complete') {
            if (this.mission.activeId === msg.missionId) {
              const reward = Number(msg.reward || this.mission.reward || 1500);
              this.account.cash += reward;
              if (!this.completedStoryIds.includes(msg.missionId)) {
                this.completedStoryIds.push(msg.missionId);
              }
              this.sound.playCashChime();
              this.showToast(`Kamarát ${msg.byHandle} dokončil misiu! +$${reward}`, 'success');
              this.cancelMission();
              this.saveGameState(true);
            }
          }
        } catch {
          // Ignore malformed ws packet
        }
      });
    } catch {
      // Offline mode fallback
    }
  }

  private upsertRemotePlayer(p: any) {
    if (!p?.id) return;
    let rp = this.remotePlayers.get(p.id);
    const charId: CharacterId =
      p.characterId === 'kairo' ? 'kairo' : p.characterId === 'elena' ? 'elena' : 'dante';
    if (!rp) {
      const rig = createCharacterMesh(CHARACTERS[charId], this.textures.contactShadow);
      this.scene.add(rig.group);
      rp = {
        id: p.id,
        handle: String(p.handle || 'Kamarát'),
        characterId: charId,
        x: Number(p.x) || 0,
        y: Number(p.y) || 0,
        z: Number(p.z) || 0,
        yaw: Number(p.yaw) || 0,
        inVehicle: Boolean(p.inVehicle),
        vehicleType: String(p.vehicleType || ''),
        rig,
      };
      this.remotePlayers.set(p.id, rp);
    }
    rp.handle = String(p.handle || rp.handle);
    rp.x = Number(p.x) || 0;
    rp.y = Number(p.y) || 0;
    rp.z = Number(p.z) || 0;
    rp.yaw = Number(p.yaw) || 0;
    rp.inVehicle = Boolean(p.inVehicle);
    rp.vehicleType = String(p.vehicleType || '');

    if (rp.inVehicle && rp.vehicleType && VEHICLE_SPECS[rp.vehicleType as VehicleTypeId]) {
      rp.rig.group.visible = false;
      if (!rp.carRig) {
        rp.carRig = createVehicleMesh(
          VEHICLE_SPECS[rp.vehicleType as VehicleTypeId],
          this.textures.contactShadow,
        );
        this.scene.add(rp.carRig.group);
      }
      rp.carRig.group.visible = true;
      rp.carRig.group.position.set(rp.x, rp.y, rp.z);
      rp.carRig.group.rotation.y = rp.yaw;
    } else {
      rp.rig.group.visible = true;
      rp.rig.group.position.set(rp.x, rp.y, rp.z);
      rp.rig.group.rotation.y = rp.yaw;
      if (rp.carRig) rp.carRig.group.visible = false;
    }
  }

  private removeRemotePlayer(id: string) {
    const rp = this.remotePlayers.get(id);
    if (!rp) return;
    this.scene.remove(rp.rig.group);
    if (rp.carRig) this.scene.remove(rp.carRig.group);
    this.remotePlayers.delete(id);
  }

  public syncMultiplayerProfile() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'profile:sync',
          handle: this.playerHandle,
          friends: this.friends,
        }),
      );
    }
  }

  public setPlayerHandle(handle: string) {
    const clean = handle.trim().slice(0, 24);
    if (!clean) return;
    this.playerHandle = clean;
    this.syncMultiplayerProfile();
    this.saveGameState(true);
    this.emitHud();
  }

  public addFriendHandle(handle: string) {
    const clean = handle.trim().slice(0, 24);
    if (!clean || clean.toLowerCase() === this.playerHandle.toLowerCase()) return;
    if (!this.friends.some((f) => f.toLowerCase() === clean.toLowerCase())) {
      this.friends.push(clean);
      this.syncMultiplayerProfile();
      this.saveGameState(true);
      this.showToast(`Kamarát ${clean} pridaný! Ak je online, objaví sa v meste.`, 'success');
      this.emitHud();
    }
  }

  public removeFriendHandle(handle: string) {
    this.friends = this.friends.filter((f) => f !== handle);
    this.syncMultiplayerProfile();
    this.saveGameState(true);
    this.emitHud();
  }

  public sendCoopMissionInvite(friendHandle: string, missionId: string) {
    const def = STORY_MISSIONS.find((m) => m.id === missionId);
    if (!def) return;
    if (!this.mission.activeId || this.mission.activeId !== missionId) {
      this.startStoryMission(missionId);
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'mission:invite',
          toHandle: friendHandle,
          missionId: def.id,
          missionTitle: def.title,
        }),
      );
      this.showToast(`Pozvánka na "${def.title}" odoslaná hráčovi ${friendHandle}!`, 'info');
    } else {
      this.showToast('Multiplayer server nie je pripojený', 'warning');
    }
  }

  public respondCoopInvite(accept: boolean) {
    if (!this.pendingInvite) return;
    const inv = this.pendingInvite;
    this.pendingInvite = null;
    if (accept) {
      this.startStoryMission(inv.missionId, inv.fromHandle);
    }
    this.emitHud();
  }

  // --- Smartphone Services & Cheat Dialer ---

  public callEmergencyService(service: 'police' | 'ems' | 'fire' | 'taxi') {
    const px = this.currentVehicle ? this.currentVehicle.x : this.playerX;
    const pz = this.currentVehicle ? this.currentVehicle.z : this.playerZ;
    const angle = Math.random() * Math.PI * 2;
    const spot = this.findClearSpawnSpot(px + Math.cos(angle) * 42, pz + Math.sin(angle) * 42, 2.2);
    const sx = spot.x;
    const sz = spot.z;
    const yaw = Math.atan2(px - sx, pz - sz);

    if (service === 'ems') {
      const amb = this.createVehicle('ambulance', sx, sz, yaw, true);
      amb.isServiceUnit = 'ems';
      amb.serviceTimer = 18;
      this.showToast('Záchranka EMS je na ceste! Vylieči ťa po príchode.', 'info');
    } else if (service === 'fire') {
      const ft = this.createVehicle('firetruck', sx, sz, yaw, true);
      ft.isServiceUnit = 'fire';
      ft.serviceTimer = 18;
      this.showToast('Hasiči sú na ceste k tvojej polohe!', 'info');
    } else if (service === 'taxi') {
      const tx = this.createVehicle('taxi', sx, sz, yaw, true);
      tx.isServiceUnit = 'taxi';
      tx.serviceTimer = 22;
      this.showToast('Sunstate Cab Taxík smeruje k tebe!', 'info');
    } else if (service === 'police') {
      const cop = this.createVehicle('pbpd', sx, sz, yaw, true);
      cop.isServiceUnit = 'police';
      cop.serviceTimer = 18;
      this.showToast('Hliadka PBPD vyslaná na miesto.', 'info');
    }
    this.sound.playPhoneBeep(880);
    this.emitHud();
  }

  public dialCheatCode(rawCode: string): { ok: boolean; message: string } {
    const code = rawCode.trim();
    this.sound.playPhoneBeep(980);
    if (code === '3324') {
      this.godMode = !this.godMode;
      if (this.godMode) this.health = 100;
      const msg = this.godMode ? 'CHEAT: Nesmrteľnosť AKTÍVNA!' : 'Nesmrteľnosť vypnutá';
      this.showToast(msg, 'success');
      this.emitHud();
      return { ok: true, message: msg };
    }
    if (code === '2532') {
      this.clearWanted();
      return { ok: true, message: 'CHEAT: Hľadanie PBPD zrušené!' };
    }
    if (code === '4325') {
      this.healAndRepair();
      return { ok: true, message: 'CHEAT: Zdravie, vesta & vozidlo opravené!' };
    }
    if (code === '5342') {
      this.spawnPlayerVehicle('helicopter', true);
      return { ok: true, message: 'CHEAT: SkyHawk Vrtuľník pristavený!' };
    }
    if (code === '7645') {
      this.spawnPlayerVehicle('taxi', true);
      return { ok: true, message: 'CHEAT: Sunstate Cab Taxi pristavený!' };
    }
    if (code === '7726') {
      this.spawnPlayerVehicle('solstice', true);
      return { ok: true, message: 'CHEAT: Solstice Superšport pristavený!' };
    }
    if (code === '8654') {
      this.spawnPlayerVehicle('plane', true);
      return { ok: true, message: 'CHEAT: Coral Wing Lietadlo pristavené!' };
    }
    if (code === '9975') {
      this.spawnPlayerVehicle('jet', true);
      return { ok: true, message: 'CHEAT: Valkyrie Ozbrojená stíhačka pristavená!' };
    }
    this.showToast(`Neznáme číslo: ${code}`, 'warning');
    return { ok: false, message: 'Číslo neexistuje' };
  }

  // --- Events & Gamepad ---

  private bindEvents() {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('wheel', this.handleWheel, { passive: true });
    window.addEventListener('gamepadconnected', this.handleGamepadChange);
    window.addEventListener('gamepaddisconnected', this.handleGamepadChange);
    window.addEventListener('blur', this.handleWindowBlur);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);

    const canvas = this.renderer.domElement;
    canvas.style.touchAction = 'none';
    canvas.addEventListener('mousedown', this.handleCanvasMouseDown);
    canvas.addEventListener('pointerdown', this.handleCanvasPointerDown);
    canvas.addEventListener('pointermove', this.handleCanvasPointerMove);
    canvas.addEventListener('pointerup', this.handleCanvasPointerUp);
    canvas.addEventListener('pointercancel', this.handleCanvasPointerUp);
    canvas.addEventListener('contextmenu', this.handleContextMenu);
    canvas.addEventListener('webglcontextlost', this.handleContextLost);

    if (typeof window !== 'undefined' && window.matchMedia) {
      this.coarseMediaQuery = window.matchMedia('(pointer: coarse)');
      this.coarseMediaQuery.addEventListener('change', this.handlePointerMediaChange);
    }
  }

  private handlePointerMediaChange = () => {
    this.refreshPlatformDetection(false);
    this.emitHud();
  };

  private detectGamepadBrand(pad: Gamepad): 'playstation' | 'xbox' {
    const id = String(pad.id || '');
    if (/xbox|xinput|microsoft|045e|360|one|series/i.test(id)) return 'xbox';
    return 'playstation';
  }

  private getEffectiveGamepadDevice(): 'playstation' | 'xbox' {
    if (this.gamepadLayoutPreference !== 'auto') return this.gamepadLayoutPreference;
    return this.detectedGamepadType;
  }

  private markInputDevice(dev: InputDeviceType) {
    if (this.activeInputDevice !== dev) {
      this.activeInputDevice = dev;
      this.emitHud();
    }
  }

  private handleGamepadChange = () => {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const connectedPad = Array.from(pads).find((p) => Boolean(p && p.connected)) ?? null;
    this.gamepadConnected = Boolean(connectedPad);
    if (connectedPad) {
      this.detectedGamepadType = this.detectGamepadBrand(connectedPad);
    } else if (this.activeInputDevice === 'playstation' || this.activeInputDevice === 'xbox') {
      this.activeInputDevice = this.getIsMobileUi() ? 'touch' : 'keyboard';
    }
    this.emitHud();
  };

  private handleResize = () => {
    if (this.disposed) return;
    const prevMobile = this.getIsMobileUi();
    this.refreshPlatformDetection(false);
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    if (prevMobile !== this.getIsMobileUi()) {
      this.emitHud();
    }
  };

  private handleContextLost = (e: Event) => {
    e.preventDefault();
  };

  private handlePointerLockChange = () => {
    this.pointerLocked = document.pointerLockElement === this.renderer.domElement;
    this.emitHud();
  };

  private handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  private handleWindowBlur = () => {
    this.mouseDown = false;
    this.mouseAiming = false;
    this.isDraggingLook = false;
    this.activeLookPointerId = null;
    this.virtualMoveX = 0;
    this.virtualMoveY = 0;
    this.virtualActions = {};
    this.keys = {};
  };

  private handleCanvasPointerDown = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    this.lastTouchTime = performance.now();
    this.markInputDevice('touch');
    this.sound.unlock();
    if (this.paused || this.startupMode || this.cutscene) return;
    if (this.activeLookPointerId === null) {
      this.activeLookPointerId = e.pointerId;
      this.lastTouchLookX = e.clientX;
      this.lastTouchLookY = e.clientY;
      this.isDraggingLook = true;
      try {
        this.renderer.domElement.setPointerCapture(e.pointerId);
      } catch {
        // Ignore capture failures
      }
    }
  };

  private handleCanvasPointerMove = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    this.lastTouchTime = performance.now();
    if (this.paused || this.startupMode || this.cutscene) return;
    if (e.pointerId !== this.activeLookPointerId) return;
    const dx = e.clientX - this.lastTouchLookX;
    const dy = e.clientY - this.lastTouchLookY;
    this.lastTouchLookX = e.clientX;
    this.lastTouchLookY = e.clientY;
    if (dx === 0 && dy === 0) return;

    const adsSens = (this.isAiming && !this.currentVehicle ? 0.56 : 1.0) * this.lookSensitivity;
    this.camYaw -= dx * 0.0046 * adsSens;
    this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * 0.0034 * adsSens, -0.58, 1.05);
    this.manualLookCooldown = 0.85;
  };

  private handleCanvasPointerUp = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    this.lastTouchTime = performance.now();
    if (e.pointerId === this.activeLookPointerId) {
      this.activeLookPointerId = null;
      this.isDraggingLook = this.mouseDown || this.mouseAiming;
      try {
        this.renderer.domElement.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
    }
  };

  private handleCanvasMouseDown = (e: MouseEvent) => {
    if (performance.now() - this.lastTouchTime < 750) return;
    if (this.paused || this.startupMode || this.cutscene) return;
    this.markInputDevice('keyboard');
    this.sound.unlock();
    if (e.button === 0) {
      this.mouseDown = true;
      this.isDraggingLook = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      if (!this.pointerLocked && !this.getIsMobileUi() && this.renderer.domElement.requestPointerLock) {
        try {
          const p = this.renderer.domElement.requestPointerLock() as unknown;
          if (p && typeof (p as Promise<void>).catch === 'function') {
            (p as Promise<void>).catch(() => {});
          }
        } catch {
          // Ignore restriction
        }
      }
      if (!this.currentVehicle && !this.wasted) {
        this.tryFireWeapon();
      } else if (this.currentVehicle) {
        this.tryFireVehicleAction();
      }
    } else if (e.button === 2) {
      e.preventDefault();
      this.mouseAiming = true;
      this.isDraggingLook = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    }
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this.mouseDown = false;
    } else if (e.button === 2) {
      this.mouseAiming = false;
    } else {
      this.mouseDown = false;
      this.mouseAiming = false;
    }
    this.isDraggingLook = this.mouseDown || this.mouseAiming || this.activeLookPointerId !== null;
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (performance.now() - this.lastTouchTime < 750) return;
    if (this.paused || this.startupMode || this.cutscene) return;
    const dx = this.pointerLocked ? e.movementX : this.isDraggingLook ? e.clientX - this.lastPointerX : 0;
    const dy = this.pointerLocked ? e.movementY : this.isDraggingLook ? e.clientY - this.lastPointerY : 0;
    if (!this.pointerLocked && this.isDraggingLook) {
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    }
    if (dx === 0 && dy === 0) return;
    if (Math.abs(dx) + Math.abs(dy) >= 2) {
      this.markInputDevice('keyboard');
    }

    // In Plane/Jet: pulling mouse down raises nose & climbs!
    if (this.currentVehicle && VEHICLE_SPECS[this.currentVehicle.type].kind === 'plane') {
      this.currentVehicle.pitch = THREE.MathUtils.clamp(
        this.currentVehicle.pitch + dy * 0.0022 * this.steeringSensitivity,
        -0.78,
        0.78,
      );
      this.currentVehicle.yaw -= dx * 0.0018 * this.steeringSensitivity;
      return;
    }

    const adsSens = (this.isAiming && !this.currentVehicle ? 0.56 : 1.0) * this.lookSensitivity;
    this.camYaw -= dx * 0.0032 * adsSens;
    this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * 0.0024 * adsSens, -0.58, 1.05);
    this.manualLookCooldown = 0.85;
  };

  private handleWheel = (e: WheelEvent) => {
    if (this.paused || this.currentVehicle || this.startupMode) return;
    this.markInputDevice('keyboard');
    const order: WeaponId[] = (['fists', 'pistol', 'smg'] as WeaponId[]).filter(
      (w) => this.account.unlockedWeapons[w],
    );
    const idx = order.indexOf(this.weaponId);
    const next = (idx + (e.deltaY > 0 ? 1 : order.length - 1)) % order.length;
    this.setWeapon(order[next]);
  };

  public getActiveControlContext(): ControlContextId {
    if (!this.currentVehicle) return 'on_foot';
    if (this.currentVehicle.type === 'jet') return 'jet';
    const k = VEHICLE_SPECS[this.currentVehicle.type].kind;
    if (k === 'helicopter') return 'helicopter';
    if (k === 'plane') return 'plane';
    return 'car';
  }

  public updateControlBinding(
    ctx: ControlContextId,
    action: ControlActionId,
    patch: Partial<ActionBinding>,
  ) {
    const existing = this.controlsConfig[ctx]?.[action] ?? { key: '', pad: '' };
    this.controlsConfig[ctx] = {
      ...this.controlsConfig[ctx],
      [action]: { ...existing, ...patch },
    };
    this.cachedControlsSnapshot = null;
    this.saveGameState(true);
    this.emitHud();
  }

  public resetControlsConfig(ctx?: ControlContextId) {
    const def = cloneDefaultControls();
    if (ctx) {
      this.controlsConfig[ctx] = def[ctx];
    } else {
      this.controlsConfig = def;
    }
    this.cachedControlsSnapshot = null;
    this.saveGameState(true);
    this.showToast('Ovládanie obnovené na GTA V predvolené', 'info');
    this.emitHud();
  }

  public cycleRadioStation() {
    const idx = RADIO_STATIONS.findIndex((s) => s.id === this.radioId);
    const next = RADIO_STATIONS[(idx + 1) % RADIO_STATIONS.length];
    this.setRadioStation(next.id);
  }

  private getGamepadAxisValue(pad: Gamepad, code: GamepadInputCode | ''): number {
    if (!code) return 0;
    const deadzone = (v: number) => (Math.abs(v) < 0.16 ? 0 : v);
    const lx = deadzone(pad.axes[0] ?? 0);
    const ly = deadzone(pad.axes[1] ?? 0);
    if (code === 'AXIS_LX_NEG') return lx < 0 ? -lx : 0;
    if (code === 'AXIS_LX_POS') return lx > 0 ? lx : 0;
    if (code === 'AXIS_LY_NEG') return ly < 0 ? -ly : 0;
    if (code === 'AXIS_LY_POS') return ly > 0 ? ly : 0;
    if (code.startsWith('BTN_')) {
      const idx = Number(code.slice(4));
      const b = pad.buttons[idx];
      if (!b) return 0;
      return Math.max(b.value ?? 0, b.pressed ? 1 : 0);
    }
    return 0;
  }

  public setVirtualJoystick(x: number, y: number) {
    this.lastTouchTime = performance.now();
    this.sound.unlock();
    this.markInputDevice('touch');
    this.virtualMoveX = THREE.MathUtils.clamp(x, -1, 1);
    this.virtualMoveY = THREE.MathUtils.clamp(y, -1, 1);
  }

  public setVirtualAction(action: ControlActionId, active: boolean) {
    this.lastTouchTime = performance.now();
    this.sound.unlock();
    this.markInputDevice('touch');
    const wasActive = Boolean(this.virtualActions[action]);
    this.virtualActions[action] = active;

    if (active && !wasActive && !this.paused && !this.startupMode && !this.cutscene) {
      if (action === 'fire' && !this.wasted) {
        if (this.currentVehicle) this.tryFireVehicleAction();
        else this.tryFireWeapon();
      } else if (action === 'interact') {
        this.handleInteractOrVehicle();
      } else if (
        action === 'jump' &&
        !this.currentVehicle &&
        !this.onGround &&
        this.account.hasParachute &&
        !this.parachuteOpen
      ) {
        this.parachuteOpen = true;
        this.playerRig.parachuteCanopy.visible = true;
        this.showToast('Parachute opened!', 'info');
      }
    }
  }

  public triggerVirtualDiscrete(
    kind: 'interact' | 'camera' | 'radio' | 'weapon_next' | 'npc_talk' | 'parachute',
  ) {
    this.lastTouchTime = performance.now();
    this.sound.unlock();
    this.markInputDevice('touch');
    if (this.paused || this.startupMode || this.cutscene) return;
    if (kind === 'interact') {
      this.handleInteractOrVehicle();
    } else if (kind === 'camera') {
      this.toggleCameraMode();
    } else if (kind === 'radio') {
      this.cycleRadioStation();
    } else if (kind === 'npc_talk') {
      if (!this.currentVehicle && !this.wasted) this.interactWithNearbyNpc();
    } else if (kind === 'weapon_next' && !this.currentVehicle) {
      const order: WeaponId[] = (['fists', 'pistol', 'smg'] as WeaponId[]).filter(
        (w) => this.account.unlockedWeapons[w],
      );
      const idx = order.indexOf(this.weaponId);
      this.setWeapon(order[(idx + 1) % order.length]);
    } else if (
      kind === 'parachute' &&
      !this.currentVehicle &&
      !this.onGround &&
      this.account.hasParachute &&
      !this.parachuteOpen
    ) {
      this.parachuteOpen = true;
      this.playerRig.parachuteCanopy.visible = true;
      this.showToast('Parachute opened!', 'info');
    }
  }

  private isActionHeld(ctx: ControlContextId, action: ControlActionId, pad: Gamepad | null): number {
    const bind = this.controlsConfig[ctx]?.[action];
    let val = bind?.key && this.keys[bind.key] ? 1 : 0;
    if (this.virtualActions[action]) val = 1;
    if (pad && bind?.pad) {
      val = Math.max(val, this.getGamepadAxisValue(pad, bind.pad));
    }
    return val;
  }

  private isActionTriggeredByKey(ctx: ControlContextId, action: ControlActionId, code: string): boolean {
    const bind = this.controlsConfig[ctx]?.[action];
    return Boolean(bind?.key && bind.key === code);
  }

  private isActionJustPressedPad(
    ctx: ControlContextId,
    action: ControlActionId,
    pad: Gamepad,
  ): boolean {
    const bind = this.controlsConfig[ctx]?.[action];
    if (!bind?.pad || !bind.pad.startsWith('BTN_')) return false;
    const idx = Number(bind.pad.slice(4));
    return Boolean(pad.buttons[idx]?.pressed) && !this.prevGamepadButtons[idx];
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    this.markInputDevice('keyboard');
    if (this.cutscene) {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        this.advanceCutscene();
      } else if (e.code === 'Escape') {
        this.skipCutscene();
      }
      return;
    }
    if (this.paused || this.startupMode) return;
    this.sound.unlock();
    const code = e.code;
    this.keys[code] = true;

    const ctx = this.getActiveControlContext();

    if (
      this.isActionTriggeredByKey(ctx, 'interact', code) ||
      code === 'KeyE' ||
      code === 'KeyF'
    ) {
      if (
        !(
          (ctx === 'plane' || ctx === 'jet' || ctx === 'helicopter') &&
          this.isActionTriggeredByKey(ctx, 'yawRight', code) &&
          code === 'KeyE'
        )
      ) {
        this.handleInteractOrVehicle();
      }
    } else if (this.isActionTriggeredByKey(ctx, 'camera', code) || code === 'KeyV') {
      this.toggleCameraMode();
    } else if (this.isActionTriggeredByKey(ctx, 'radio', code) || code === 'KeyR') {
      this.cycleRadioStation();
    } else if (
      (this.isActionTriggeredByKey(ctx, 'jump', code) || code === 'Space') &&
      !this.currentVehicle &&
      !this.onGround &&
      this.account.hasParachute &&
      !this.parachuteOpen
    ) {
      this.parachuteOpen = true;
      this.playerRig.parachuteCanopy.visible = true;
      this.showToast('Parachute opened!', 'info');
    } else if (code === 'Digit1') {
      this.setWeapon('fists');
    } else if (code === 'Digit2') {
      if (this.account.unlockedWeapons.pistol) this.setWeapon('pistol');
    } else if (code === 'Digit3') {
      if (this.account.unlockedWeapons.smg) this.setWeapon('smg');
    } else if (code === 'KeyG' && !this.currentVehicle && !this.wasted) {
      this.interactWithNearbyNpc();
    } else if (this.isActionTriggeredByKey(ctx, 'fire', code) || code === 'KeyJ') {
      if (!this.currentVehicle && !this.wasted) this.tryFireWeapon();
      else if (this.currentVehicle) this.tryFireVehicleAction();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  private pollGamepad(dt: number): {
    pad: Gamepad | null;
    fire: boolean;
  } {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = Array.from(pads).find((p) => p && p.connected) ?? null;
    if (!pad) {
      if (this.gamepadConnected) {
        this.gamepadConnected = false;
        if (this.activeInputDevice === 'playstation' || this.activeInputDevice === 'xbox') {
          this.activeInputDevice = this.getIsMobileUi() ? 'touch' : 'keyboard';
        }
        this.emitHud();
      }
      return { pad: null, fire: false };
    }
    this.detectedGamepadType = this.detectGamepadBrand(pad);
    if (!this.gamepadConnected) {
      this.gamepadConnected = true;
      this.emitHud();
    }

    const deadzone = (v: number) => (Math.abs(v) < 0.16 ? 0 : v);
    const rx = deadzone(pad.axes[2] ?? 0);
    const ry = deadzone(pad.axes[3] ?? 0);
    const lx = deadzone(pad.axes[0] ?? 0);
    const ly = deadzone(pad.axes[1] ?? 0);

    const anyPadBtn = pad.buttons.some((b) => b.pressed || (b.value ?? 0) > 0.25);
    if (anyPadBtn || Math.abs(rx) > 0.2 || Math.abs(ry) > 0.2 || Math.abs(lx) > 0.25 || Math.abs(ly) > 0.25) {
      this.markInputDevice(this.getEffectiveGamepadDevice());
    }

    const pressed = (idx: number) => Boolean(pad.buttons[idx]?.pressed);
    const justPressed = (idx: number) => pressed(idx) && !this.prevGamepadButtons[idx];

    if (this.paused || this.startupMode) {
      if (justPressed(12)) this.onGamepadUiAction?.('up');
      if (justPressed(13)) this.onGamepadUiAction?.('down');
      if (justPressed(14)) this.onGamepadUiAction?.('left');
      if (justPressed(15)) this.onGamepadUiAction?.('right');
      if (justPressed(0)) {
        if (this.startupMode) this.exitStartupShowcase();
        else this.onGamepadUiAction?.('confirm');
      }
      if (justPressed(1)) this.onGamepadUiAction?.('cancel');
      if (justPressed(8)) this.onGamepadUiAction?.('map');
      if (justPressed(9)) this.onGamepadUiAction?.('settings');
      if (justPressed(3)) this.onGamepadUiAction?.('phone');
      this.prevGamepadButtons = pad.buttons.map((b) => b.pressed);
      return { pad, fire: false };
    }

    const ctx = this.getActiveControlContext();

    // Native GTA V Context-Aware Discrete Actions
    if (this.isActionJustPressedPad(ctx, 'interact', pad)) {
      this.handleInteractOrVehicle();
    }
    if (this.isActionJustPressedPad(ctx, 'camera', pad)) {
      this.toggleCameraMode();
    }
    if (this.isActionJustPressedPad(ctx, 'radio', pad)) {
      this.cycleRadioStation();
    }
    if (
      !this.currentVehicle &&
      !this.onGround &&
      this.account.hasParachute &&
      !this.parachuteOpen &&
      this.isActionJustPressedPad(ctx, 'jump', pad)
    ) {
      this.parachuteOpen = true;
      this.playerRig.parachuteCanopy.visible = true;
      this.showToast('Parachute opened!', 'info');
    }

    if (justPressed(9)) this.onGamepadUiAction?.('settings');
    if (justPressed(10) && !this.currentVehicle && !this.wasted && this.findClosestInteractableNpc()) {
      this.interactWithNearbyNpc();
    }
    if (justPressed(12)) this.onGamepadUiAction?.('phone');
    if (justPressed(13)) this.onGamepadUiAction?.('map');
    if (justPressed(17)) {
      // PS4/PS5 Touchpad: toggles camera
      this.toggleCameraMode();
    }
    if (justPressed(15) && !this.currentVehicle) {
      // D-pad Right cycles weapon on foot (GTA V quick weapon switch)
      const order: WeaponId[] = (['fists', 'pistol', 'smg'] as WeaponId[]).filter(
        (w) => this.account.unlockedWeapons[w],
      );
      const idx = order.indexOf(this.weaponId);
      this.setWeapon(order[(idx + 1) % order.length]);
    }

    // Right Stick Look (with Look Sensitivity & ADS scaling)
    if (rx !== 0 || ry !== 0) {
      const adsScale = (this.isAiming && !this.currentVehicle ? 0.58 : 1.0) * this.lookSensitivity;
      this.camYaw -= rx * dt * 2.5 * adsScale;
      this.camPitch = THREE.MathUtils.clamp(this.camPitch + ry * dt * 1.8 * adsScale, -0.58, 1.05);
      this.manualLookCooldown = 0.85;
    }

    const fire = this.isActionHeld(ctx, 'fire', pad) > 0.35;
    this.prevGamepadButtons = pad.buttons.map((b) => b.pressed);
    return { pad, fire };
  }

  // --- GPS Waypoints ---

  public setGpsWaypoint(x: number, z: number, label: string) {
    this.gpsTarget = { x, z, label };
    this.recomputeGps();
    this.showToast(`GPS cieľ nastavený: ${label}`, 'info');
    this.emitHud();
  }

  public clearGpsWaypoint() {
    this.gpsTarget = null;
    this.gpsRoute = [];
    this.gpsDistance = 0;
    this.gpsTurnHint = '';
    this.world.gpsBeacon.visible = false;
    this.emitHud();
  }

  private recomputeGps() {
    if (!this.gpsTarget) return;
    const px = this.currentVehicle ? this.currentVehicle.x : this.playerX;
    const pz = this.currentVehicle ? this.currentVehicle.z : this.playerZ;
    const res = computeGpsRoute(this.world.network, px, pz, this.gpsTarget.x, this.gpsTarget.z);
    this.gpsRoute = res.points;
    this.gpsDistance = res.distance;
    this.gpsTurnHint = res.turnHint;
  }

  // --- Shop Actions (using active character's separate account!) ---

  public buySnack(itemName: string, cost: number, heal: number, armorBoost = 0) {
    if (this.account.cash < cost) {
      this.showToast(`Potrebuješ $${cost} na ${itemName}`, 'warning');
      return;
    }
    this.account.cash -= cost;
    this.health = Math.min(100, this.health + heal);
    if (armorBoost > 0) this.armor = Math.min(100, this.armor + armorBoost);
    this.sound.playCashChime();
    this.showToast(`Kúpené: ${itemName} (-$${cost})`, 'success');
    this.emitHud();
  }

  public applyVehicleMod(
    action: 'repair' | 'paint' | 'engine' | 'turbo' | 'handling' | 'neon',
    value?: number | NeonColorId,
  ) {
    const veh = this.currentVehicle ?? this.findNearestPlayerVehicle(18);
    if (!veh) {
      this.showToast('Priveď auto blízko k Apex Customs!', 'warning');
      return;
    }

    if (action === 'repair') {
      if (this.account.cash < 450) return this.showToast('Potrebuješ $450 na opravu', 'warning');
      this.account.cash -= 450;
      veh.health = 100;
      veh.wrecked = false;
      veh.onFire = false;
      veh.waterDisabled = false;
      veh.rig.fireGroup.visible = false;
      resetVehicleDeformation(veh.rig);
      this.showToast('Karoséria a motor kompletne opravené (-$450)', 'success');
    } else if (action === 'paint' && typeof value === 'number') {
      if (this.account.cash < 650) return this.showToast('Potrebuješ $650 na nový lak', 'warning');
      this.account.cash -= 650;
      veh.rig.paintMat.color.setHex(value);
      this.showToast('Metalický lak nanesený (-$650)', 'success');
    } else if (action === 'engine') {
      if (veh.upgrades.engineLevel >= 3) return this.showToast('Motor už je na max úrovni!', 'info');
      const cost = 2400 + veh.upgrades.engineLevel * 1400;
      if (this.account.cash < cost) return this.showToast(`Potrebuješ $${cost}`, 'warning');
      this.account.cash -= cost;
      veh.upgrades.engineLevel++;
      this.showToast(`Tuning motora Lv.${veh.upgrades.engineLevel} nainštalovaný!`, 'success');
    } else if (action === 'turbo') {
      if (veh.upgrades.turboInstalled) return this.showToast('Turbo už je namontované!', 'info');
      if (this.account.cash < 4500) return this.showToast('Potrebuješ $4,500 na Turbo kit', 'warning');
      this.account.cash -= 4500;
      veh.upgrades.turboInstalled = true;
      this.showToast('Twin-Turbo Kit namontovaný!', 'success');
    } else if (action === 'handling') {
      if (veh.upgrades.handlingLevel >= 2) return this.showToast('Podvozok je na max!', 'info');
      const cost = 1800 + veh.upgrades.handlingLevel * 1200;
      if (this.account.cash < cost) return this.showToast(`Potrebuješ $${cost}`, 'warning');
      this.account.cash -= cost;
      veh.upgrades.handlingLevel++;
      this.showToast(`Športový podvozok Lv.${veh.upgrades.handlingLevel} nainštalovaný!`, 'success');
    } else if (action === 'neon' && typeof value === 'string') {
      const cost = value === 'off' ? 0 : 1100;
      if (this.account.cash < cost) return this.showToast('Potrebuješ $1,100 na Neón kit', 'warning');
      this.account.cash -= cost;
      veh.upgrades.neonColor = value;
      setVehicleNeon(veh.rig, value);
      this.showToast(`Podsvietenie neón: ${value.toUpperCase()}`, 'success');
    }
    this.sound.playCashChime();
    this.emitHud();
  }

  public buyArmoryItem(item: 'pistol' | 'smg' | 'ammo_pistol' | 'ammo_smg' | 'armor' | 'parachute') {
    const prices = { pistol: 1200, smg: 3400, ammo_pistol: 280, ammo_smg: 540, armor: 1150, parachute: 950 };
    const cost = prices[item];
    if (this.account.cash < cost) return this.showToast(`Potrebuješ $${cost}`, 'warning');

    if (item === 'pistol') {
      this.account.cash -= cost;
      this.account.unlockedWeapons.pistol = true;
      this.account.ammo.pistol = WEAPONS.pistol.maxAmmo;
      this.setWeapon('pistol');
      this.showToast('Kúpená pištoľ Viper 9mm (-$1,200)', 'success');
    } else if (item === 'smg') {
      this.account.cash -= cost;
      this.account.unlockedWeapons.smg = true;
      this.account.ammo.smg = WEAPONS.smg.maxAmmo;
      this.setWeapon('smg');
      this.showToast('Kúpené Tide-9 SMG (-$3,400)', 'success');
    } else if (item === 'ammo_pistol') {
      this.account.cash -= cost;
      this.account.ammo.pistol = WEAPONS.pistol.maxAmmo;
      this.showToast('Náboje 9mm doplnené (-$280)', 'success');
    } else if (item === 'ammo_smg') {
      if (!this.account.unlockedWeapons.smg) return this.showToast('Najprv si kúp Tide-9 SMG', 'warning');
      this.account.cash -= cost;
      this.account.ammo.smg = WEAPONS.smg.maxAmmo;
      this.showToast('Náboje SMG doplnené (-$540)', 'success');
    } else if (item === 'armor') {
      this.account.cash -= cost;
      this.armor = 100;
      this.showToast('Taktická nepriestrelná vesta nasadená (-$1,150)', 'success');
    } else if (item === 'parachute') {
      this.account.cash -= cost;
      this.account.hasParachute = true;
      this.playerRig.parachutePack.visible = true;
      this.showToast('Padák zakúpený! Pri páde stlač SPACE. (-$950)', 'success');
    }
    this.sound.playCashChime();
    this.emitHud();
  }

  public updateStyle(
    patch: Partial<CharacterCustomization>,
    cost: number,
    label: string,
    updateSkinTex = false,
  ) {
    if (this.account.cash < cost) return this.showToast(`Potrebuješ $${cost} na ${label}`, 'warning');
    this.account.cash -= cost;
    this.account.customization = { ...this.account.customization, ...patch };
    applyCharacterCustomization(
      this.playerRig,
      CHARACTERS[this.characterId].skinColor,
      this.account.customization,
      updateSkinTex || patch.beardStyle !== undefined,
      this.characterId === 'elena',
    );
    this.sound.playCashChime();
    this.showToast(`${label} aplikované (-$${cost})`, 'success');
    this.emitHud();
  }

  public bankAction(action: 'deposit' | 'withdraw' | 'heist_job', amount = 500) {
    if (action === 'deposit') {
      const amt = Math.min(this.account.cash, amount);
      if (amt <= 0) return this.showToast('Nemáš hotovosť na vklad', 'warning');
      this.account.cash -= amt;
      this.account.bankBalance += amt;
      this.sound.playCashChime();
      this.showToast(`Vložené $${amt} do Apex Trust`, 'success');
    } else if (action === 'withdraw') {
      const amt = Math.min(this.account.bankBalance, amount);
      if (amt <= 0) return this.showToast('Nedostatok peňazí na účte', 'warning');
      this.account.bankBalance -= amt;
      this.account.cash += amt;
      this.sound.playCashChime();
      this.showToast(`Vybrané $${amt} v hotovosti`, 'success');
    } else if (action === 'heist_job') {
      this.startStoryMission('m9');
    }
    this.emitHud();
  }

  public buyOrTestDriveVehicle(type: VehicleTypeId, purchase: boolean) {
    const spec = VEHICLE_SPECS[type];
    if (purchase) {
      if (this.account.cash < spec.price) {
        return this.showToast(`Potrebuješ $${spec.price.toLocaleString()} na kúpu ${spec.name}`, 'warning');
      }
      this.account.cash -= spec.price;
      if (!this.account.ownedVehicles.includes(type)) {
        this.account.ownedVehicles.push(type);
      }
      this.sound.playCashChime();
      this.saveGameState(true);
    }
    this.spawnPlayerVehicle(type, true);
    this.showToast(
      purchase ? `Kúpené vozidlo ${spec.name} (-$${spec.price.toLocaleString()})` : `Testovacia jazda: ${spec.name}`,
      'success',
    );
    this.emitHud();
  }

  public safehouseAction(action: 'rest' | 'save' | 'time', preset?: TimePreset) {
    if (action === 'rest') {
      this.health = 100;
      this.wantedStars = 0;
      this.wantedEvading = false;
      this.sound.playCashChime();
      this.showToast('Oddych v úkryte — Zdravie 100% & hľadanie zrušené', 'success');
    } else if (action === 'save') {
      this.saveGameState();
    } else if (action === 'time' && preset) {
      this.setTimePreset(preset);
    }
    this.emitHud();
  }

  public buySocialOrCivicService(itemName: string, cost: number, heal: number, repDelta: number, clearWanted = false) {
    if (this.account.cash < cost) {
      return this.showToast(`Potrebuješ $${cost} na ${itemName}`, 'warning');
    }
    this.account.cash -= cost;
    if (heal > 0) this.health = Math.min(100, this.health + heal);
    if (repDelta !== 0) this.gainReputation(repDelta);
    if (clearWanted) {
      this.wantedStars = 0;
      this.wantedEvading = false;
    }
    this.sound.playCashChime();
    this.showToast(`${itemName} vybavené (-$${cost})`, 'success');
    this.emitHud();
  }

  private findNearestPlayerVehicle(maxDist: number): VehicleEntity | null {
    const px = this.currentVehicle ? this.currentVehicle.x : this.playerX;
    const pz = this.currentVehicle ? this.currentVehicle.z : this.playerZ;
    let best: VehicleEntity | null = null;
    let bestD = maxDist;
    for (const v of this.vehicles) {
      if (v.isAI) continue;
      const d = Math.hypot(v.x - px, v.z - pz);
      if (d < bestD) {
        bestD = d;
        best = v;
      }
    }
    return best;
  }

  // --- Standard Controls & Skills ---

  private gainSkill(skill: keyof CharacterSkills, amount: number) {
    this.account.skills[skill] = Math.min(100, this.account.skills[skill] + amount);
  }

  public spawnPlayerVehicle(type: VehicleTypeId, bypassOwnership = false) {
    this.sound.unlock();
    const spec = VEHICLE_SPECS[type];
    if (!bypassOwnership && !this.account.ownedVehicles.includes(type)) {
      this.showToast(
        `${spec.name} ešte nevlastníš! Kúp si ho v Sunstate Motors ($${spec.price.toLocaleString()}).`,
        'warning',
      );
      return;
    }
    const px = this.currentVehicle ? this.currentVehicle.x : this.playerX;
    const pz = this.currentVehicle ? this.currentVehicle.z : this.playerZ;
    const yaw = this.currentVehicle ? this.currentVehicle.yaw : this.playerYaw;
    const spot = this.findClearSpawnSpot(
      px + Math.sin(yaw + Math.PI * 0.5) * 6.5,
      pz + Math.cos(yaw + Math.PI * 0.5) * 6.5,
      Math.max(1.8, spec.width * 0.65),
    );
    const colors = spec.colors;
    const color = colors[Math.floor(Math.random() * colors.length)];
    this.createVehicle(type, spot.x, spot.z, yaw, false, color);
    this.showToast(`Pristavené: ${spec.name}`, 'success');
    if (this.vehicles.length > 36) {
      const oldIdx = this.vehicles.findIndex((v) => v !== this.currentVehicle && v.isAI);
      if (oldIdx >= 0) {
        this.scene.remove(this.vehicles[oldIdx].rig.group);
        this.vehicles.splice(oldIdx, 1);
      }
    }
  }

  public setTimePreset(preset: TimePreset) {
    this.timePreset = preset;
    this.timeHour =
      preset === 'dawn' ? 6.5 : preset === 'noon' ? 12.5 : preset === 'golden' ? 17.5 : 22.5;
    this.applyAtmosphere();
    this.emitHud();
  }

  public toggleAutoTimeCycle() {
    this.autoTimeCycle = !this.autoTimeCycle;
    this.emitHud();
  }

  public setWeatherPreset(preset: WeatherPreset) {
    this.targetWeatherPreset = preset;
    this.autoWeatherCycle = false;
    this.recordWorldEvent(`Počasie sa mení na: ${WEATHER_LABELS_SK[preset]}`);
    this.aiDirectorTimer = Math.min(this.aiDirectorTimer, 1.8);
    this.showToast(`Počasie: ${WEATHER_LABELS_SK[preset]}`, 'info');
    this.emitHud();
  }

  public toggleAutoWeatherCycle() {
    this.autoWeatherCycle = !this.autoWeatherCycle;
    this.showToast(
      this.autoWeatherCycle ? 'Automatické zmeny počasia zapnuté' : 'Manuálne počasie',
      'info',
    );
    this.emitHud();
  }

  public setRadioStation(station: RadioStationId) {
    this.radioId = station;
    this.sound.setRadioStation(station);
    const label = RADIO_STATIONS.find((s) => s.id === station)?.name ?? 'Vypnuté';
    this.showToast(`Rádio: ${label}`, 'info');
    this.emitHud();
  }

  private gainReputation(amount: number) {
    this.account.reputation = Math.max(0, Math.round(this.account.reputation + amount));
  }

  public setCharacter(id: CharacterId) {
    if (this.characterId === id) return;
    // Save outgoing character position
    this.account.savedX = this.currentVehicle ? this.currentVehicle.x : this.playerX;
    this.account.savedZ = this.currentVehicle ? this.currentVehicle.z : this.playerZ;
    this.account.savedYaw = this.currentVehicle ? this.currentVehicle.yaw : this.playerYaw;
    if (this.currentVehicle) {
      this.currentVehicle = null;
    }

    this.characterId = id;
    const targetProf = CHARACTERS[id];
    const targetAcc = this.accounts[id];
    this.playerX = typeof targetAcc.savedX === 'number' ? targetAcc.savedX : targetProf.homeSpawnX;
    this.playerZ = typeof targetAcc.savedZ === 'number' ? targetAcc.savedZ : targetProf.homeSpawnZ;
    this.playerYaw = typeof targetAcc.savedYaw === 'number' ? targetAcc.savedYaw : targetProf.homeSpawnYaw;
    this.playerY = this.world.groundHeightAt(this.playerX, this.playerZ, 2);
    this.camYaw = this.playerYaw + Math.PI;

    if (!this.account.unlockedWeapons[this.weaponId]) {
      this.weaponId = this.account.unlockedWeapons.pistol ? 'pistol' : 'fists';
    }
    this.rebuildPlayerCharacter();
    this.playerRig.group.visible = true;
    this.showToast(`Prepnutá postava: ${targetProf.name} · Domov: ${targetProf.homeName}`, 'info');
    this.saveGameState(true);
    this.emitHud();
  }

  public setWeapon(id: WeaponId) {
    if (!this.account.unlockedWeapons[id]) return;
    this.weaponId = id;
    setCharacterWeaponMesh(this.playerRig, id);
    this.emitHud();
  }

  public clearWanted() {
    this.wantedStars = 0;
    this.wantedCooldown = 0;
    this.wantedEvading = false;
    this.showToast('Hľadanie PBPD zrušené', 'success');
    this.emitHud();
  }

  public healAndRepair() {
    this.health = 100;
    this.armor = 100;
    if (this.currentVehicle) {
      this.currentVehicle.health = 100;
      this.currentVehicle.wrecked = false;
      this.currentVehicle.onFire = false;
      this.currentVehicle.waterDisabled = false;
      this.currentVehicle.rig.fireGroup.visible = false;
      resetVehicleDeformation(this.currentVehicle.rig);
    }
    this.showToast('Zdravie, vesta & vozidlo obnovené', 'success');
    this.emitHud();
  }

  public toggleMute() {
    this.sound.setMuted(!this.sound.isMuted());
    this.emitHud();
  }

  // --- Missions & Cutscenes ---

  public startStoryMission(id: string, coopHostHandle?: string) {
    const def = STORY_MISSIONS.find((m) => m.id === id);
    if (!def) return;
    if (!coopHostHandle && def.requiredCompleted && this.completedStoryIds.length < def.requiredCompleted) {
      this.showToast(
        `Zamknuté! Dokonči najprv ${def.requiredCompleted} príbehových misií.`,
        'warning',
      );
      return;
    }
    this.launchStoryMissionDef(def, coopHostHandle);
  }

  private spawnGslCourierVanOnRoad(targetX: number, targetZ: number): VehicleEntity {
    // Remove leftover old mission vans if player restarted
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      if (this.vehicles[i].type === 'gsl_van' && this.vehicles[i] !== this.currentVehicle) {
        this.scene.remove(this.vehicles[i].rig.group);
        this.vehicles.splice(i, 1);
      }
    }

    const px = this.currentVehicle ? this.currentVehicle.x : this.playerX;
    const pz = this.currentVehicle ? this.currentVehicle.z : this.playerZ;
    let proj = projectPointOntoRoad(this.world.network, px, pz);
    let edge = this.world.network.edges[proj.edgeId];

    // Prefer nearest paved road if player started on a dirt track
    if (!edge || edge.isDirt) {
      let bestDistSq = Infinity;
      for (const e of this.world.network.edges) {
        if (e.isDirt) continue;
        for (let i = 0; i < e.samples.length; i++) {
          const s = e.samples[i];
          const dSq = (s.x - px) ** 2 + (s.z - pz) ** 2;
          if (dSq < bestDistSq) {
            bestDistSq = dSq;
            edge = e;
            proj = {
              edgeId: e.id,
              segIdx: Math.min(e.samples.length - 2, i),
              t: 0,
              point: { x: s.x, z: s.z },
              distFromFrom: 0,
              distToTo: 0,
              distSq: dSq,
            };
          }
        }
      }
    }

    const s0 = edge.samples[Math.max(0, Math.min(edge.samples.length - 2, proj.segIdx))];
    const s1 = edge.samples[Math.max(1, Math.min(edge.samples.length - 1, proj.segIdx + 1))];
    let dx = s1.x - s0.x;
    let dz = s1.z - s0.z;
    if ((targetX - proj.point.x) * dx + (targetZ - proj.point.z) * dz < 0) {
      dx = -dx;
      dz = -dz;
    }
    const len = Math.hypot(dx, dz) || 1;
    const tx = dx / len;
    const tz = dz / len;
    const rx = -tz;
    const rz = tx;
    const laneOffset = edge.width * 0.22;
    const spawnX = proj.point.x + rx * laneOffset;
    const spawnZ = proj.point.z + rz * laneOffset;
    const yaw = Math.atan2(tx, tz);

    const van = this.createVehicle('gsl_van', spawnX, spawnZ, yaw, false, 0xf8fafc);
    this.currentVehicle = van;
    this.parachuteOpen = false;
    this.playerRig.parachuteCanopy.visible = false;
    this.playerRig.group.visible = false;
    this.camYaw = yaw + Math.PI;
    this.currentGear = 1;
    this.engineRpm = 0.22;
    this.shiftDipTimer = 0;
    this.prevVehSpeed = 0;
    this.prevVehYaw = yaw;
    return van;
  }

  private failGslMission(reason: string) {
    if (!this.gslState.active) return;
    this.gslState = { active: false, vanId: null, packageDamage: 0, onRoad: true, graceTimer: 0 };
    this.sound.playPhoneBeep(280);
    this.clearGpsWaypoint();
    this.cancelMission();
    this.showToast(`Misia GSL nesplnená: ${reason} Začni odznova.`, 'warning');
  }

  public launchStoryMissionDef(def: StoryMissionDef, coopHostHandle?: string) {
    const firstStage = def.stages[0];
    const beginGameplay = () => {
      this.activeStoryDef = def;
      this.gslState = { active: false, vanId: null, packageDamage: 0, onRoad: true, graceTimer: 0 };
      this.mission = {
        activeId: def.id,
        isHidden: false,
        title: def.title,
        objective: firstStage.objective,
        targetX: firstStage.targetX,
        targetY: firstStage.targetY ?? null,
        targetZ: firstStage.targetZ,
        stageIndex: 0,
        totalStages: def.stages.length,
        timeLeft: def.timeLimitSec,
        reward: def.reward,
        coopHostHandle,
      };
      const isGsl = Boolean(def.isGslCourier || def.id === 'm21');
      if (isGsl) {
        const van = this.spawnGslCourierVanOnRoad(firstStage.targetX, firstStage.targetZ);
        this.gslState = {
          active: true,
          vanId: van.id,
          packageDamage: 0,
          onRoad: true,
          graceTimer: 1.8,
        };
      }
      if (def.wantedOnStart) this.addWanted(def.wantedOnStart - this.wantedStars);
      this.recordWorldEvent(`Spustená misia: ${def.title}`);
      this.setGpsWaypoint(firstStage.targetX, firstStage.targetZ, def.title);
      this.showToast(
        isGsl
          ? 'Dodávka GSL pristavená! Choď len po ceste, 0% poškodenia auta a max 5% balíka.'
          : `Misia spustená: ${def.title}`,
        'info',
      );
      this.emitHud();
    };

    if (def.introLines.length > 0 && !coopHostHandle) {
      this.cutscene = {
        title: def.title,
        lines: def.introLines,
        stepIndex: 0,
        focusX: this.playerX,
        focusY: this.playerY + 1.5,
        focusZ: this.playerZ,
        onFinish: beginGameplay,
      };
      this.emitHud();
    } else {
      beginGameplay();
    }
  }

  public advanceCutscene() {
    if (!this.cutscene) return;
    if (this.cutscene.stepIndex < this.cutscene.lines.length - 1) {
      this.cutscene.stepIndex++;
      this.emitHud();
    } else {
      const cb = this.cutscene.onFinish;
      this.cutscene = null;
      cb();
      this.emitHud();
    }
  }

  public skipCutscene() {
    if (!this.cutscene) return;
    const cb = this.cutscene.onFinish;
    this.cutscene = null;
    cb();
    this.emitHud();
  }

  public startHiddenMission(id: string) {
    const hm = HIDDEN_MISSIONS.find((m) => m.id === id);
    if (!hm) return;
    if (!this.discoveredHiddenIds.includes(hm.id)) {
      this.discoveredHiddenIds.push(hm.id);
    }
    const prof = CHARACTERS[this.characterId];
    const def = buildHiddenMissionPlayableDef(hm, {
      x: prof.homeSpawnX,
      z: prof.homeSpawnZ,
      name: prof.homeName,
    });
    this.activeHiddenId = hm.id;
    this.activeStoryDef = def;
    const firstStage = def.stages[0];
    this.mission = {
      activeId: def.id,
      isHidden: true,
      title: def.title,
      objective: firstStage.objective,
      targetX: firstStage.targetX,
      targetY: firstStage.targetY ?? null,
      targetZ: firstStage.targetZ,
      stageIndex: 0,
      totalStages: def.stages.length,
      timeLeft: def.timeLimitSec,
      reward: def.reward,
    };
    this.recordWorldEvent(`Spustená náhodná výzva: ${hm.title}`);
    this.setGpsWaypoint(firstStage.targetX, firstStage.targetZ, def.title);
    this.showToast(`Náhodná výzva spustená: ${hm.title}`, 'info');
    this.emitHud();
  }

  public cancelMission() {
    this.activeStoryDef = null;
    this.activeHiddenId = null;
    this.gslState = { active: false, vanId: null, packageDamage: 0, onRoad: true, graceTimer: 0 };
    const ui = getUi(this.language);
    this.mission = {
      activeId: null,
      isHidden: false,
      title: ui.freeRoamTitle,
      objective: ui.freeRoamObjective,
      targetX: null,
      targetY: null,
      targetZ: null,
      stageIndex: 0,
      totalStages: 0,
      timeLeft: 0,
      reward: 0,
    };
    this.world.missionBeacon.visible = false;
    this.emitHud();
  }

  private showToast(text: string, type: 'info' | 'success' | 'warning') {
    this.toastText = text;
    this.toastType = type;
    this.toastTimer = 4.2;
  }

  private getNearbyElevator(): ElevatorSystem | null {
    if (this.currentVehicle) return null;
    for (const el of this.world.elevators) {
      if (
        Math.abs(this.playerX - el.cx) <= el.halfW + 0.65 &&
        Math.abs(this.playerZ - el.cz) <= el.halfD + 0.65 &&
        Math.abs(this.playerY - el.currentY) < 2.4
      ) {
        return el;
      }
    }
    return null;
  }

  private isPointInCustomsBay(x: number, z: number, shopId?: string): boolean {
    for (const bay of this.world.customsBays) {
      if (shopId && bay.shopId !== shopId) continue;
      const dx = x - bay.cx;
      const dz = z - bay.cz;
      const c = Math.cos(bay.yaw);
      const s = Math.sin(bay.yaw);
      const lx = dx * c - dz * s;
      const lz = dx * s + dz * c;
      if (Math.abs(lx) <= bay.halfW && Math.abs(lz) <= bay.halfD) {
        return true;
      }
    }
    return false;
  }

  public openNearbyShopIfAllowed() {
    const { nearby } = this.getNearbyShop();
    if (!nearby) return;
    if (nearby.category === 'customs') {
      const refVeh = this.currentVehicle ?? this.findNearestPlayerVehicle(18);
      if (!refVeh || !this.isPointInCustomsBay(refVeh.x, refVeh.z, nearby.id)) {
        this.showToast('Pre tuning v Apex Customs musíš najprv autom vojsť priamo dnu na zdvihák!', 'warning');
        return;
      }
    }
    this.setPaused(true);
    this.onOpenShop(nearby);
  }

  private getNearbyShop(): { nearby: ShopLocation | null; inside: ShopLocation | null } {
    const px = this.currentVehicle ? this.currentVehicle.x : this.playerX;
    const pz = this.currentVehicle ? this.currentVehicle.z : this.playerZ;
    for (const s of SHOPS) {
      const isArmory = s.category === 'armory';
      const isDealership = s.category === 'dealership';
      const isCustoms = s.category === 'customs';
      const isBank = s.category === 'bank';
      const isPrecinct = s.category === 'precinct';
      const isClub = s.category === 'club';
      const bw = isArmory || isDealership || isCustoms || isBank || isPrecinct ? 36 : 30;
      const bd = isArmory ? 44 : isDealership || isBank || isCustoms || isPrecinct || isClub ? 34 : 30;

      const cx = s.x - Math.sin(s.yaw) * (bd * 0.5 + 1.5);
      const cz = s.z - Math.cos(s.yaw) * (bd * 0.5 + 1.5);
      const dx = px - cx;
      const dz = pz - cz;
      const c = Math.cos(s.yaw);
      const sinY = Math.sin(s.yaw);
      const lx = dx * c - dz * sinY;
      const lz = dx * sinY + dz * c;

      if (Math.abs(lx) <= bw * 0.5 && Math.abs(lz) <= bd * 0.5) {
        return { nearby: s, inside: s };
      }
      const d = Math.hypot(px - s.x, pz - s.z);
      if (d < 6.5) return { nearby: s, inside: null };
    }
    return { nearby: null, inside: null };
  }

  private handleInteractOrVehicle() {
    if (this.wasted) return;

    // 0. Working 3D Elevators (on foot inside elevator cab)
    const elev = this.getNearbyElevator();
    if (elev) {
      elev.targetFloorIdx = (elev.targetFloorIdx + 1) % elev.floors.length;
      elev.moving = true;
      this.showToast(`Výťah ${elev.name}: Smer ${elev.floorNames[elev.targetFloorIdx]}`, 'info');
      return;
    }

    // 1. Check nearby/inside walkable storefront first (Drive-in rule enforced for Apex Customs!)
    const { nearby, inside } = this.getNearbyShop();
    if (nearby) {
      if (nearby.category === 'customs') {
        const refVeh = this.currentVehicle ?? this.findNearestPlayerVehicle(18);
        if (refVeh && this.isPointInCustomsBay(refVeh.x, refVeh.z, nearby.id)) {
          this.setPaused(true);
          this.onOpenShop(nearby);
          return;
        } else if (!this.currentVehicle && inside) {
          this.showToast('Do Apex Customs musíš najprv vojsť autom dnu na zdvihák!', 'warning');
          return;
        }
      } else if (!this.currentVehicle || inside) {
        this.setPaused(true);
        this.onOpenShop(nearby);
        return;
      }
    }

    // 1B. Launch Nearby Discovered Random Mission on E / Y
    if (!this.currentVehicle && this.nearbyHiddenMission && !this.mission.activeId) {
      this.startHiddenMission(this.nearbyHiddenMission.id);
      return;
    }

    // 2. Exit current vehicle (supports mid-air parachute jump & solid wall check!)
    if (this.currentVehicle) {
      const veh = this.currentVehicle;
      const tryLeft = this.resolveWorldCollision(
        veh.x - Math.cos(veh.yaw) * 2.2,
        veh.z + Math.sin(veh.yaw) * 2.2,
        0.28,
        veh.y + 0.2,
      );
      const tryRight = this.resolveWorldCollision(
        veh.x + Math.cos(veh.yaw) * 2.2,
        veh.z - Math.sin(veh.yaw) * 2.2,
        0.28,
        veh.y + 0.2,
      );
      const chosen = !tryLeft.hit ? tryLeft : !tryRight.hit ? tryRight : tryLeft;
      this.playerX = chosen.x;
      this.playerZ = chosen.z;
      this.playerY = Math.max(
        veh.y + 0.2,
        this.world.groundHeightAt(this.playerX, this.playerZ, veh.y + 1),
      );
      this.playerVy = 0;
      this.peakFallVy = 0;
      this.playerYaw = veh.yaw;
      this.currentVehicle = null;
      this.playerRig.group.visible = true;
      this.playerRig.headGroup.visible = this.cameraMode !== 'first';
      this.playerRig.group.position.set(this.playerX, this.playerY, this.playerZ);

      // Auto-equip parachute if ejecting from plane/heli high up
      if (this.playerY > 16 && this.account.hasParachute) {
        this.parachuteOpen = true;
        this.playerRig.parachuteCanopy.visible = true;
        this.showToast('Padák automaticky otvorený!', 'info');
      }
      return;
    }

    // 3. Enter nearest vehicle
    let bestVeh: VehicleEntity | null = null;
    let bestDist = 5.6;
    for (const v of this.vehicles) {
      if (v.wrecked) continue;
      const d = Math.hypot(v.x - this.playerX, v.z - this.playerZ);
      if (d < bestDist && Math.abs(v.y - this.playerY) < 3.5) {
        bestDist = d;
        bestVeh = v;
      }
    }

    if (bestVeh) {
      if (bestVeh.isAI) {
        bestVeh.isAI = false;
        bestVeh.isServiceUnit = undefined;
      }
      this.currentVehicle = bestVeh;
      this.currentGear = 1;
      this.engineRpm = 0.22;
      this.shiftDipTimer = 0;
      this.prevVehSpeed = Math.hypot(bestVeh.vx, bestVeh.vz);
      this.prevVehYaw = bestVeh.yaw;
      this.parachuteOpen = false;
      this.playerRig.parachuteCanopy.visible = false;
      this.playerRig.group.visible = false;
      this.showToast(`Riadiš: ${VEHICLE_SPECS[bestVeh.type].name}`, 'info');
    }
  }

  private addWanted(amount: number) {
    if (amount <= 0) return;
    this.wantedStars = Math.min(5, this.wantedStars + amount);
    this.wantedCooldown = 14 + this.wantedStars * 3;
    this.wantedEvading = false;
    this.recordWorldEvent(`Hráč má hľadanie ${this.wantedStars}/5 hviezdičiek PBPD`);
    this.aiDirectorTimer = Math.min(this.aiDirectorTimer, 1.5);
  }

  private tryFireVehicleAction() {
    if (!this.currentVehicle || this.fireCooldown > 0) return;
    const v = this.currentVehicle;
    const spec = VEHICLE_SPECS[v.type];

    // Fire Truck Water Cannon!
    if (spec.hasWaterCannon) {
      this.fireCooldown = 0.045;
      const nozzleY = v.y + spec.height + 0.25;
      const dirX = Math.sin(v.yaw);
      const dirZ = Math.cos(v.yaw);
      for (let i = 0; i < 3; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.78 });
        const mesh = new THREE.Mesh(this.waterGeo, mat);
        mesh.position.set(v.x + dirX * 1.4, nozzleY, v.z + dirZ * 1.4);
        this.scene.add(mesh);
        this.particles.push({
          mesh,
          vx: v.vx + dirX * (28 + Math.random() * 5),
          vy: 4.5 + Math.random() * 2,
          vz: v.vz + dirZ * (28 + Math.random() * 5),
          life: 0.85,
          maxLife: 0.85,
          isWater: true,
        });
      }
      // Extinguish burning cars ahead!
      for (const other of this.vehicles) {
        if (other !== v && other.onFire && Math.hypot(other.x - (v.x + dirX * 14), other.z - (v.z + dirZ * 14)) < 11) {
          other.onFire = false;
          other.rig.fireGroup.visible = false;
          this.showToast('Požiar vozidla uhasený vodným delom!', 'success');
        }
      }
      return;
    }

    // Armed Jet Cannons!
    if (spec.hasWeapons) {
      this.fireCooldown = 0.14;
      this.sound.playWeapon('smg');
      const fwdX = Math.sin(v.yaw) * Math.cos(v.pitch);
      const fwdY = Math.sin(v.pitch);
      const fwdZ = Math.cos(v.yaw) * Math.cos(v.pitch);
      const origin = new THREE.Vector3(v.x + fwdX * 4, v.y + 1.2, v.z + fwdZ * 4);
      const end = origin.clone().addScaledVector(new THREE.Vector3(fwdX, fwdY, fwdZ), 160);
      const tracerGeo = new THREE.BufferGeometry().setFromPoints([origin, end]);
      const tracer = new THREE.Line(
        tracerGeo,
        new THREE.LineBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.95 }),
      );
      this.scene.add(tracer);
      this.tracers.push({ line: tracer, life: 0.12 });

      for (const other of this.vehicles) {
        if (other === v || other.wrecked) continue;
        const d = Math.hypot(other.x - (v.x + fwdX * 45), other.z - (v.z + fwdZ * 45));
        if (d < 20) {
          this.damageVehicle(other, 45, fwdX, fwdZ);
        }
      }
    }
  }

  private computeCrosshairAimTarget(maxRange: number): {
    point: THREE.Vector3;
    targetType: 'none' | 'npc' | 'vehicle' | 'range';
  } {
    this.camera.updateMatrixWorld();
    this.camera.getWorldPosition(_aimCamOrigin);
    this.camera.getWorldDirection(_aimCamDir);

    const toPlayerProj =
      (this.playerX - _aimCamOrigin.x) * _aimCamDir.x +
      (this.playerY + 1.45 - _aimCamOrigin.y) * _aimCamDir.y +
      (this.playerZ - _aimCamOrigin.z) * _aimCamDir.z;
    const minT = this.cameraMode === 'third' ? Math.max(0.45, toPlayerProj + 0.18) : 0.35;
    _aimRayOrigin.copy(_aimCamOrigin).addScaledVector(_aimCamDir, minT);

    let bestDist = this.raycastWorldColliders(_aimRayOrigin, _aimCamDir, maxRange);
    let targetType: 'none' | 'npc' | 'vehicle' | 'range' = 'none';

    for (const rt of this.world.rangeTargets) {
      const rx = rt.baseX + Math.sin(this.elapsed * 1.4 + rt.phase) * 0.75;
      const toX = rx - _aimRayOrigin.x;
      const toY = rt.baseY - _aimRayOrigin.y;
      const toZ = rt.baseZ - _aimRayOrigin.z;
      const proj = toX * _aimCamDir.x + toY * _aimCamDir.y + toZ * _aimCamDir.z;
      if (proj > 0 && proj < bestDist) {
        const perpSq = toX * toX + toY * toY + toZ * toZ - proj * proj;
        if (perpSq < 0.92 * 0.92) {
          bestDist = proj;
          targetType = 'range';
        }
      }
    }

    for (const npc of this.npcs) {
      if (npc.dead) continue;
      const toX = npc.x - _aimRayOrigin.x;
      const toY = npc.y + 1.05 - _aimRayOrigin.y;
      const toZ = npc.z - _aimRayOrigin.z;
      const proj = toX * _aimCamDir.x + toY * _aimCamDir.y + toZ * _aimCamDir.z;
      if (proj > 0 && proj < bestDist) {
        const perpSq = toX * toX + toY * toY + toZ * toZ - proj * proj;
        if (perpSq < 0.82 * 0.82) {
          bestDist = proj;
          targetType = 'npc';
        }
      }
    }

    for (const v of this.vehicles) {
      if (v === this.currentVehicle) continue;
      const toX = v.x - _aimRayOrigin.x;
      const toY = v.y + 0.9 - _aimRayOrigin.y;
      const toZ = v.z - _aimRayOrigin.z;
      const proj = toX * _aimCamDir.x + toY * _aimCamDir.y + toZ * _aimCamDir.z;
      if (proj > 0 && proj < bestDist) {
        const perpSq = toX * toX + toY * toY + toZ * toZ - proj * proj;
        if (perpSq < 1.85 * 1.85) {
          bestDist = proj;
          targetType = 'vehicle';
        }
      }
    }

    _aimTargetPt.copy(_aimRayOrigin).addScaledVector(_aimCamDir, bestDist);
    return { point: _aimTargetPt, targetType };
  }

  private tryFireWeapon() {
    if (this.fireCooldown > 0) return;
    const spec = WEAPONS[this.weaponId];
    if (this.weaponId !== 'fists') {
      if (this.account.ammo[this.weaponId] <= 0) {
        this.showToast('Došli náboje! Navštív Ironclad Armory', 'warning');
        this.fireCooldown = 0.35;
        return;
      }
      this.account.ammo[this.weaponId]--;
    }

    this.fireCooldown = spec.fireRate;
    this.weaponRecoil = 1.0;
    this.sound.playWeapon(this.weaponId);

    this.playerYaw = this.camYaw + Math.PI;
    this.playerRig.group.rotation.y = this.playerYaw;

    for (const npc of this.npcs) {
      if (!npc.dead && !npc.isCop && Math.hypot(npc.x - this.playerX, npc.z - this.playerZ) < 38) {
        npc.panicTimer = 6;
        npc.behavior = 'flee';
        npc.behaviorTimer = 6;
      }
    }

    const sinY = Math.sin(this.playerYaw);
    const cosY = Math.cos(this.playerYaw);
    const origin = _v1;
    const dir = _v2;

    if (this.weaponId !== 'fists') {
      origin.set(
        this.playerX - 0.26 * cosY + 0.55 * sinY,
        this.playerY + 1.45 - Math.sin(this.camPitch) * 0.22,
        this.playerZ + 0.26 * sinY + 0.55 * cosY,
      );
      this.muzzleTimer = 0.06;
      this.muzzleLight.position.copy(origin);
      this.muzzleLight.intensity = 4.5;
      this.manualLookCooldown = 0.55;
      this.recordWorldEvent(`Streľba zo zbrane (${spec.name})`);

      const aimTarget = this.computeCrosshairAimTarget(spec.range);
      dir.copy(aimTarget.point).sub(origin);
      if (dir.lengthSq() < 0.0001) {
        dir.set(sinY, -Math.sin(this.camPitch), cosY);
      }
      dir.normalize();

      // Skill & ADS-adjusted weapon spread
      const skillTighten = 1 - (this.account.skills.shooting / 100) * 0.55;
      const adsTighten = this.isAiming ? 0.22 : 0.78;
      const spread = spec.spread * skillTighten * adsTighten;
      if (spread > 0) {
        dir.x += (Math.random() - 0.5) * spread;
        dir.y += (Math.random() - 0.5) * spread;
        dir.z += (Math.random() - 0.5) * spread;
        dir.normalize();
      }
    } else {
      origin.set(this.playerX, this.playerY + 1.3, this.playerZ);
      dir.set(sinY, -Math.sin(this.camPitch) * 0.35, cosY).normalize();
    }

    // Solid world wall/furniture occlusion! Bullets stop at the first solid obstacle.
    let bestDist = this.raycastWorldColliders(origin, dir, spec.range);
    let hitRangeTarget: (typeof this.world.rangeTargets)[number] | null = null;
    let hitNpc: NpcEntity | null = null;
    let hitVehicle: VehicleEntity | null = null;

    // Check Shooting Range Targets inside Ironclad Armory!
    if (this.weaponId !== 'fists') {
      for (const rt of this.world.rangeTargets) {
        const rx = rt.baseX + Math.sin(this.elapsed * 1.4 + rt.phase) * 0.75;
        const toX = rx - origin.x;
        const toY = rt.baseY - origin.y;
        const toZ = rt.baseZ - origin.z;
        const proj = toX * dir.x + toY * dir.y + toZ * dir.z;
        if (proj > 0 && proj < bestDist) {
          const perpSq = toX * toX + toY * toY + toZ * toZ - proj * proj;
          if (perpSq < 0.92 * 0.92) {
            bestDist = proj;
            hitRangeTarget = rt;
          }
        }
      }
    }

    for (const npc of this.npcs) {
      if (npc.dead) continue;
      const toX = npc.x - origin.x;
      const toY = npc.y + 1.05 - origin.y;
      const toZ = npc.z - origin.z;
      const proj = toX * dir.x + toY * dir.y + toZ * dir.z;
      if (proj > 0 && proj < bestDist) {
        const perpSq = toX * toX + toY * toY + toZ * toZ - proj * proj;
        if (perpSq < 0.82 * 0.82) {
          bestDist = proj;
          hitNpc = npc;
          hitVehicle = null;
          hitRangeTarget = null;
        }
      }
    }

    for (const v of this.vehicles) {
      if (v === this.currentVehicle) continue;
      const toX = v.x - origin.x;
      const toY = v.y + 0.9 - origin.y;
      const toZ = v.z - origin.z;
      const proj = toX * dir.x + toY * dir.y + toZ * dir.z;
      if (proj > 0 && proj < bestDist) {
        const perpSq = toX * toX + toY * toY + toZ * toZ - proj * proj;
        if (perpSq < 1.85 * 1.85) {
          bestDist = proj;
          hitVehicle = v;
          hitNpc = null;
          hitRangeTarget = null;
        }
      }
    }

    const endPoint = origin.clone().addScaledVector(dir, bestDist);
    if (this.weaponId !== 'fists') {
      const tracerGeo = new THREE.BufferGeometry().setFromPoints([
        origin.clone().addScaledVector(dir, 0.25),
        endPoint,
      ]);
      const tracer = new THREE.Line(
        tracerGeo,
        new THREE.LineBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.9 }),
      );
      this.scene.add(tracer);
      this.tracers.push({ line: tracer, life: 0.07 });
    }

    if (hitRangeTarget) {
      hitRangeTarget.hitFlash = 0.35;
      this.hitMarkerTimer = 0.18;
      this.gainSkill('shooting', 1.2);
      this.account.cash += 10;
      this.sound.playCashChime();
      this.showToast('Zásah na strelnici! +$10 & +Streľba', 'success');
      this.spawnSparks(endPoint.x, endPoint.y, endPoint.z, 0xfacc15, 6);
    } else if (hitNpc) {
      this.hitMarkerTimer = 0.18;
      hitNpc.health -= spec.damage;
      this.gainSkill('shooting', 0.5);
      this.spawnSparks(hitNpc.x, hitNpc.y + 1.1, hitNpc.z, 0xef4444, 6);
      this.addWanted(hitNpc.isCop ? 2 : 1);
      if (hitNpc.health <= 0) {
        hitNpc.dead = true;
        hitNpc.respawnTimer = 18;
        hitNpc.rig.group.rotation.x = Math.PI / 2;
        this.account.cash += hitNpc.isCop ? 25 : 15;
      }
    } else if (hitVehicle) {
      this.hitMarkerTimer = 0.18;
      this.damageVehicle(hitVehicle, spec.damage * 0.55, dir.x, dir.z);
      this.gainSkill('shooting', 0.35);
      this.spawnSparks(endPoint.x, endPoint.y, endPoint.z, 0xfbbf24, 6);
      if (hitVehicle.isPolice) this.addWanted(1);
    } else if (this.weaponId !== 'fists' && bestDist < spec.range) {
      this.spawnSparks(endPoint.x, endPoint.y, endPoint.z, 0xfde68a, 3);
    }
  }

  private damageVehicle(v: VehicleEntity, amount: number, impactDirX = 0, impactDirZ = 1) {
    if (v.wrecked) return;
    if (this.gslState.active && v.id === this.gslState.vanId && amount > 0) {
      v.health = Math.max(0, v.health - amount);
      this.failGslMission('Dodávka GSL utrpela poškodenie! Auto musí mať 0% poškodenia.');
      return;
    }
    if (v === this.currentVehicle && this.godMode) return;
    v.health = Math.max(0, v.health - amount);

    // Transform impact direction into vehicle's local space for visible dent deformation!
    const cos = Math.cos(-v.yaw);
    const sin = Math.sin(-v.yaw);
    const lx = impactDirX * cos - impactDirZ * sin;
    const lz = impactDirX * sin + impactDirZ * cos;
    deformVehicleMesh(v.rig, lx, lz, amount / 90);

    if (v.health <= 22 && !v.onFire) {
      v.onFire = true;
      v.rig.fireGroup.visible = true;
    }

    if (v.health <= 0) {
      v.wrecked = true;
      v.onFire = false;
      v.rig.fireGroup.visible = false;
      v.isAI = false;
      v.rig.paintMat.color.setHex(0x1f2937);
      this.sound.playExplosion();
      this.spawnSparks(v.x, v.y + 1.1, v.z, 0xf97316, 26);
      this.spawnSmoke(v.x, v.y + 1.4, v.z);
      if (v === this.currentVehicle) this.applyPlayerDamage(55);
    }
  }

  private applyPlayerDamage(amount: number) {
    if (this.wasted || this.godMode) return;
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, amount * 0.65);
      this.armor -= absorbed;
      amount -= absorbed;
    }
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.wasted = true;
      this.wastedTimer = 3.2;
      if (this.currentVehicle) {
        this.currentVehicle = null;
        this.playerRig.group.visible = true;
      }
      this.showToast('WASTED — Odvoz do nemocnice Palmetto Bay...', 'warning');
    }
  }

  // --- Simulation Loop (Uncapped FPS via requestAnimationFrame, SoftwareGL safe via afterDraw) ---

  private scheduleNextFrame() {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.frameId = window.setTimeout(() => {
        if (!this.disposed) this.tick();
      }, 40);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private tick = () => {
    if (this.disposed) return;
    const dt = Math.min(this.clock.getDelta(), 0.05);

    this.fpsAccum += dt;
    this.fpsFrames++;
    if (this.fpsAccum >= 0.5) {
      this.currentFps = Math.round(this.fpsFrames / this.fpsAccum);
      this.fpsAccum = 0;
      this.fpsFrames = 0;

      // Non-destructive adaptive pixelRatio & shadow cadence protection on weak GPUs
      if (!this.isSoftwareGl && !this.startupMode) {
        if (this.currentFps < 28) {
          this.lowFpsStreak++;
          if (this.lowFpsStreak >= 2) {
            this.lowFpsStreak = 0;
            if (this.adaptiveDprCap > 0.85) {
              this.adaptiveDprCap = this.adaptiveDprCap > 1.0 ? 1.0 : 0.85;
              this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.adaptiveDprCap));
            }
            if (this.shadowUpdateInterval < 4) {
              this.shadowUpdateInterval++;
            }
          }
        } else {
          this.lowFpsStreak = 0;
        }
      }
    }

    const gp = this.pollGamepad(dt);

    if (this.startupMode) {
      this.elapsed += dt;
      this.updateStartupCamera(dt);
      this.updateAtmosphereAndClouds(dt);
      this.renderScene();
      this.scheduleNextFrame();
      return;
    }

    if (this.cutscene) {
      this.elapsed += dt;
      this.updateCutsceneCamera(dt);
      this.updateAtmosphereAndClouds(dt);
      this.renderScene();
      this.scheduleNextFrame();
      return;
    }

    if (!this.paused) {
      this.elapsed += dt;

      if (this.toastTimer > 0) {
        this.toastTimer -= dt;
        if (this.toastTimer <= 0) this.toastText = '';
      }

      if (this.fireCooldown > 0) this.fireCooldown -= dt;
      if (this.hitMarkerTimer > 0) this.hitMarkerTimer = Math.max(0, this.hitMarkerTimer - dt);
      if (this.manualLookCooldown > 0) this.manualLookCooldown = Math.max(0, this.manualLookCooldown - dt);
      if (this.weaponRecoil > 0) this.weaponRecoil = Math.max(0, this.weaponRecoil - dt * 5.5);
      if (this.muzzleTimer > 0) {
        this.muzzleTimer -= dt;
        if (this.muzzleTimer <= 0) this.muzzleLight.intensity = 0;
      }

      // Hold to spray Fire Truck water or fire SMG / Jet weapons
      const ctxNow = this.getActiveControlContext();
      this.isAiming =
        !this.currentVehicle &&
        !this.wasted &&
        (this.mouseAiming ||
          Boolean(this.virtualActions.aim) ||
          this.isActionHeld('on_foot', 'aim', gp.pad) > 0.35);

      if (
        (this.mouseDown ||
          Boolean(this.virtualActions.fire) ||
          this.isActionHeld(ctxNow, 'fire', gp.pad) > 0.35 ||
          gp.fire) &&
        !this.wasted
      ) {
        if (this.currentVehicle) {
          this.tryFireVehicleAction();
        } else if (WEAPONS[this.weaponId].automatic) {
          this.tryFireWeapon();
        }
      }

      // Continuous Day/Night Cycle (1 real sec = 1 in-game minute, 24 min full day)
      if (this.autoTimeCycle) {
        this.timeHour = (this.timeHour + dt / 60) % 24;
      }
      this.updateAtmosphereAndClouds(dt);

      // Rotating Airport ATC Radar & Working 3D Elevators
      this.world.radarDish.rotation.y += dt * 1.4;
      for (const el of this.world.elevators) {
        if (!el.moving) continue;
        const prevY = el.currentY;
        const targetY = el.floors[el.targetFloorIdx];
        const diff = targetY - el.currentY;
        const step = 11 * dt;
        if (Math.abs(diff) <= step) {
          el.currentY = targetY;
          el.moving = false;
          el.currentFloorIdx = el.targetFloorIdx;
          this.showToast(`Výťah: ${el.floorNames[el.currentFloorIdx]}`, 'info');
        } else {
          el.currentY += Math.sign(diff) * step;
        }
        el.cabGroup.position.y = el.currentY;
        if (
          !this.currentVehicle &&
          Math.abs(this.playerX - el.cx) <= el.halfW + 0.15 &&
          Math.abs(this.playerZ - el.cz) <= el.halfD + 0.15 &&
          Math.abs(this.playerY - (prevY + 0.16)) < 1.8
        ) {
          this.playerY = el.currentY + 0.16;
          this.playerVy = 0;
          this.onGround = true;
        }
      }

      // Animated Shooting Range Targets inside Ironclad Armory
      this.world.rangeTargets.forEach((rt) => {
        rt.mesh.position.x += Math.sin(this.elapsed * 1.4 + rt.phase) * dt * 0.8;
        if (rt.hitFlash > 0) {
          rt.hitFlash -= dt;
          (rt.mesh.material as THREE.MeshBasicMaterial).color.setHex(rt.hitFlash > 0 ? 0xfacc15 : 0xffffff);
        }
      });

      this.world.oceanMesh.position.y = -0.45 + Math.sin(this.elapsed * 1.4) * 0.08;
      Object.values(this.world.beaconMeshes).forEach((m) => (m.rotation.y += dt * 1.2));
      if (this.world.missionBeacon.visible) this.world.missionBeacon.rotation.y += dt * 1.8;
      if (this.world.gpsBeacon.visible) this.world.gpsBeacon.rotation.y -= dt * 1.6;

      if (this.wasted) {
        this.wastedTimer -= dt;
        if (this.wastedTimer <= 0) {
          this.wasted = false;
          this.health = 100;
          this.armor = 25;
          this.account.cash = Math.max(0, this.account.cash - 350);
          this.wantedStars = 0;
          const hosp = this.findClearSpawnSpot(-366, -646, 0.7);
          this.playerX = hosp.x;
          this.playerZ = hosp.z;
          this.playerY = this.world.groundHeightAt(this.playerX, this.playerZ, 2);
          this.playerRig.group.position.set(this.playerX, this.playerY, this.playerZ);
          this.showToast('Prepustený z nemocnice Palmetto General (-$350)', 'info');
        }
      } else if (this.currentVehicle) {
        this.updatePlayerVehicleControl(dt, gp);
      } else {
        this.updatePlayerOnFoot(dt, gp);
      }

      this.updateVehicles(dt);
      this.updateNPCsAndCops(dt);
      this.updateAiDirector(dt);
      this.updateWantedAndMission(dt);
      this.updateGps(dt);
      this.updateParticlesAndTracers(dt);
      this.updateCamera(dt);

      // Multiplayer state broadcast (~12 Hz)
      this.wsTimer += dt;
      if (this.wsTimer >= 0.08 && this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.wsTimer = 0;
        const px = this.currentVehicle ? this.currentVehicle.x : this.playerX;
        const py = this.currentVehicle ? this.currentVehicle.y : this.playerY;
        const pz = this.currentVehicle ? this.currentVehicle.z : this.playerZ;
        const pyaw = this.currentVehicle ? this.currentVehicle.yaw : this.playerYaw;
        this.ws.send(
          JSON.stringify({
            type: 'state:move',
            characterId: this.characterId,
            x: px,
            y: py,
            z: pz,
            yaw: pyaw,
            inVehicle: Boolean(this.currentVehicle),
            vehicleType: this.currentVehicle?.type ?? '',
            activeMissionId: this.mission.activeId,
          }),
        );
      }

      // Engine & Shifting Audio
      const speedMag = this.currentVehicle
        ? Math.hypot(this.currentVehicle.vx, this.currentVehicle.vz)
        : 0;
      const speedNorm = this.currentVehicle
        ? Math.min(1, speedMag / VEHICLE_SPECS[this.currentVehicle.type].maxSpeed)
        : 0;
      const drifting = Boolean(
        this.currentVehicle &&
          this.isActionHeld(ctxNow, 'handbrake', gp.pad) > 0.35 &&
          speedMag > 10,
      );
      let nearestCopDist = 999;
      if (this.wantedStars > 0) {
        for (const v of this.vehicles) {
          if (v.isPolice && v.isAI && !v.wrecked) {
            const d = Math.hypot(
              v.x - (this.currentVehicle ? this.currentVehicle.x : this.playerX),
              v.z - (this.currentVehicle ? this.currentVehicle.z : this.playerZ),
            );
            if (d < nearestCopDist) nearestCopDist = d;
          }
        }
      }
      const sirenStrength =
        this.wantedStars > 0 && nearestCopDist < 95 ? Math.max(0, 1 - nearestCopDist / 95) : 0;
      this.sound.updateVehicleAudio(
        Boolean(this.currentVehicle),
        speedNorm,
        this.currentGear,
        this.engineRpm,
        this.lastThrottle,
        drifting,
        sirenStrength,
        this.elapsed,
      );

      this.hudTimer += dt;
      if (this.hudTimer >= 0.1) {
        this.hudTimer = 0;
        this.emitHud();
      }
    }

    this.renderScene();
    this.scheduleNextFrame();
  };

  private renderScene() {
    if (this.renderer.shadowMap.enabled) {
      this.shadowFrame++;
      if (this.shadowFrame >= this.shadowUpdateInterval) {
        this.shadowFrame = 0;
        this.renderer.shadowMap.needsUpdate = true;
      }
    }
    this.renderer.render(this.scene, this.camera);
  }

  private updateStartupCamera(dt: number) {
    const angle = this.elapsed * 0.25;
    this.camera.position.set(52 + Math.cos(angle) * 20, 8 + Math.sin(angle * 0.5) * 2, 16 + Math.sin(angle) * 20);
    this.camera.lookAt(52, 2.2, 14);
  }

  private updateCutsceneCamera(dt: number) {
    if (!this.cutscene) return;
    const angle = this.elapsed * 0.35;
    this.camera.position.set(
      this.cutscene.focusX + Math.cos(angle) * 7.5,
      this.cutscene.focusY + 1.4,
      this.cutscene.focusZ + Math.sin(angle) * 7.5,
    );
    this.camera.lookAt(this.cutscene.focusX, this.cutscene.focusY + 0.4, this.cutscene.focusZ);
  }

  private updateAtmosphereAndClouds(dt: number) {
    // Smoother, longer-interval automatic weather transitions
    if (this.autoWeatherCycle && !this.startupMode) {
      this.weatherCycleTimer -= dt;
      if (this.weatherCycleTimer <= 0) {
        this.weatherCycleTimer = 180 + Math.random() * 140;
        const adjacentMap: Record<WeatherPreset, WeatherPreset[]> = {
          clear: ['overcast', 'foggy'],
          overcast: ['clear', 'rain', 'foggy'],
          rain: ['overcast', 'storm'],
          storm: ['rain', 'overcast'],
          foggy: ['clear', 'overcast'],
        };
        const nextCandidates = adjacentMap[this.targetWeatherPreset] ?? ['clear', 'overcast'];
        this.targetWeatherPreset = nextCandidates[Math.floor(Math.random() * nextCandidates.length)];
        this.recordWorldEvent(`Počasie sa postupne mení na ${WEATHER_LABELS_SK[this.targetWeatherPreset]}`);
      }
    }

    const targets: Record<WeatherPreset, { rain: number; cloud: number; fog: number; storm: number; wet: number }> = {
      clear: { rain: 0, cloud: 0.18, fog: 0.04, storm: 0, wet: 0 },
      overcast: { rain: 0, cloud: 0.78, fog: 0.22, storm: 0, wet: 0.08 },
      rain: { rain: 0.75, cloud: 0.88, fog: 0.36, storm: 0.18, wet: 0.88 },
      storm: { rain: 1.0, cloud: 0.96, fog: 0.54, storm: 1.0, wet: 1.0 },
      foggy: { rain: 0, cloud: 0.58, fog: 0.95, storm: 0, wet: 0.25 },
    };
    const tgt = targets[this.targetWeatherPreset];
    const transitionRate = 0.045; // gradual ~45s realistic weather crossfade
    this.rainFactor = THREE.MathUtils.damp(this.rainFactor, tgt.rain, transitionRate, dt);
    this.cloudFactor = THREE.MathUtils.damp(this.cloudFactor, tgt.cloud, transitionRate, dt);
    this.fogFactor = THREE.MathUtils.damp(this.fogFactor, tgt.fog, transitionRate, dt);
    this.stormFactor = THREE.MathUtils.damp(this.stormFactor, tgt.storm, transitionRate, dt);
    this.wetness = THREE.MathUtils.damp(this.wetness, tgt.wet, 0.035, dt);

    // Derive live weatherPreset label from smooth blended values
    if (this.stormFactor > 0.55) this.weatherPreset = 'storm';
    else if (this.rainFactor > 0.32) this.weatherPreset = 'rain';
    else if (this.fogFactor > 0.62) this.weatherPreset = 'foggy';
    else if (this.cloudFactor > 0.52) this.weatherPreset = 'overcast';
    else this.weatherPreset = 'clear';

    // Occasional lightning flash + thunder during storms
    if (this.lightningFlash > 0) {
      this.lightningFlash = Math.max(0, this.lightningFlash - dt * 5.2);
    }
    if (this.stormFactor > 0.5 && !this.startupMode) {
      this.lightningCooldown -= dt;
      if (this.lightningCooldown <= 0) {
        this.lightningCooldown = 7 + Math.random() * 11;
        this.lightningFlash = 1.0;
        this.sound.playThunder();
      }
    }

    this.applyAtmosphere();

    // Update instanced clouds opacity, color & wind drift smoothly (1 draw call!)
    const cloudBrightness = 1 - this.cloudFactor * 0.45 - this.stormFactor * 0.22;
    this.world.cloudMats.forEach((m) => {
      m.opacity = THREE.MathUtils.clamp(this.cloudFactor * 0.82, 0.04, 0.88);
      m.color.setRGB(0.88 * cloudBrightness, 0.91 * cloudBrightness, 0.96 * cloudBrightness);
    });
    const windSpeed = 4.5 + this.stormFactor * 10;
    const puffs = this.world.cloudPuffs;
    for (let i = 0; i < puffs.length; i++) {
      const p = puffs[i];
      p.x += dt * windSpeed;
      if (p.x > 2400) p.x = -2400;
      _cloudDummy.position.set(p.x, p.y, p.z);
      _cloudDummy.scale.set(p.sx, p.sy, p.sz);
      _cloudDummy.updateMatrix();
      this.world.cloudInst.setMatrixAt(i, _cloudDummy.matrix);
    }
    this.world.cloudInst.instanceMatrix.needsUpdate = true;

    // Update road wetness sheen subtly
    this.world.roadMat.roughness = THREE.MathUtils.lerp(0.92, 0.38, this.wetness);

    // Update 3D Falling Rain Streaks around camera
    if (this.rainLines && this.rainMat && this.rainPositions && this.rainGeo) {
      const showRain = this.rainFactor > 0.05 && this.quality !== 'performance';
      this.rainLines.visible = showRain;
      if (showRain) {
        this.rainMat.opacity = this.rainFactor * 0.42;
        const cx = this.camera.position.x;
        const cy = this.camera.position.y;
        const cz = this.camera.position.z;
        const fallSpeed = 36 + this.stormFactor * 16;
        const windX = -3.5 - this.stormFactor * 6.5;
        const count = this.rainPositions.length / 6;
        for (let i = 0; i < count; i++) {
          const idx = i * 6;
          let rx = this.rainPositions[idx] + windX * dt;
          let ry = this.rainPositions[idx + 1] - fallSpeed * dt;
          let rz = this.rainPositions[idx + 2];
          if (ry < cy - 16 || ry < 0) ry = cy + 22 + Math.random() * 14;
          if (rx < cx - 48) rx += 96;
          else if (rx > cx + 48) rx -= 96;
          if (rz < cz - 48) rz += 96;
          else if (rz > cz + 48) rz -= 96;

          this.rainPositions[idx] = rx;
          this.rainPositions[idx + 1] = ry;
          this.rainPositions[idx + 2] = rz;
          this.rainPositions[idx + 3] = rx + windX * 0.04;
          this.rainPositions[idx + 4] = ry - 1.35;
          this.rainPositions[idx + 5] = rz - 0.08;
        }
        (this.rainGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      }
    }
  }

  private updatePlayerOnFoot(dt: number, gp: ReturnType<GameEngine['pollGamepad']>) {
    const pad = gp.pad;
    let f =
      this.isActionHeld('on_foot', 'forward', pad) -
      this.isActionHeld('on_foot', 'backward', pad) +
      this.virtualMoveY;
    let r =
      this.isActionHeld('on_foot', 'right', pad) -
      this.isActionHeld('on_foot', 'left', pad) +
      this.virtualMoveX;
    if (this.keys['ArrowUp']) f = Math.max(f, 1);
    if (this.keys['ArrowDown']) f = Math.min(f, -1);
    if (this.keys['ArrowRight']) r = Math.max(r, 1);
    if (this.keys['ArrowLeft']) r = Math.min(r, -1);
    f = THREE.MathUtils.clamp(f, -1, 1);
    r = THREE.MathUtils.clamp(r, -1, 1);

    const sprinting = !this.isAiming && this.isActionHeld('on_foot', 'sprint', pad) > 0.35;
    const staminaMult = 1 + (this.account.skills.stamina / 100) * 0.28;
    const speed = (this.isAiming ? 4.3 : sprinting ? 10.8 : 6.4) * staminaMult;
    const moveLen = Math.hypot(f, r);

    if (moveLen > 0.08) {
      if (sprinting) this.gainSkill('stamina', dt * 1.4);
      const nf = f / Math.max(1, moveLen);
      const nr = r / Math.max(1, moveLen);
      const sinY = Math.sin(this.camYaw);
      const cosY = Math.cos(this.camYaw);
      const moveX = -sinY * nf + cosY * nr;
      const moveZ = -cosY * nf - sinY * nr;

      const targetYaw = this.isAiming ? this.camYaw + Math.PI : Math.atan2(moveX, moveZ);
      let diff = targetYaw - this.playerYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const turnRate = (this.isAiming ? 18 : 13) * (0.65 + 0.35 * this.steeringSensitivity);
      this.playerYaw += diff * Math.min(1, dt * turnRate);

      // Camera follows character smoothly when turning or moving (unless aiming or actively looking around)
      const steppingStraightBack = nf < -0.35 && Math.abs(nr) < 0.15;
      if (!this.isAiming && !this.isDraggingLook && this.manualLookCooldown <= 0 && !steppingStraightBack) {
        const desiredCamYaw = this.playerYaw + Math.PI;
        let camDiff = desiredCamYaw - this.camYaw;
        while (camDiff > Math.PI) camDiff -= Math.PI * 2;
        while (camDiff < -Math.PI) camDiff += Math.PI * 2;
        const turning = Math.abs(nr) > 0.08;
        const followRate = this.cameraMode === 'first' ? 5.2 : turning ? 4.6 : 2.5;
        this.camYaw += camDiff * Math.min(1, dt * followRate);
      }

      // Sub-stepped tight 0.26m radius collision so player can walk flush against walls without ever clipping through
      const totalDx = moveX * speed * dt;
      const totalDz = moveZ * speed * dt;
      const steps = Math.max(1, Math.min(6, Math.ceil(Math.hypot(totalDx, totalDz) / 0.22)));
      for (let s = 0; s < steps; s++) {
        const nextX = THREE.MathUtils.clamp(this.playerX + totalDx / steps, -2450, 1650);
        const nextZ = THREE.MathUtils.clamp(this.playerZ + totalDz / steps, -2100, 2100);
        const res = this.resolveWorldCollision(nextX, nextZ, 0.26, this.playerY);
        const vehPush = this.resolveActorVsVehicles(res.x, res.z, 0.26, this.playerY);
        const finalRes = this.resolveWorldCollision(vehPush.x, vehPush.z, 0.26, this.playerY);
        this.playerX = finalRes.x;
        this.playerZ = finalRes.z;
      }

      this.walkCycle += dt * (sprinting ? 13 : this.isAiming ? 6 : 8);
      const newSin = Math.sin(this.walkCycle);
      if (
        this.onGround &&
        !this.world.isWaterAt(this.playerX, this.playerZ) &&
        ((this.prevWalkSin <= 0 && newSin > 0) || (this.prevWalkSin >= 0 && newSin < 0))
      ) {
        const isSoftGround = this.playerX < -1020 || this.playerX > 760;
        this.sound.playFootstep(sprinting, isSoftGround);
      }
      this.prevWalkSin = newSin;
      const swing = newSin * (this.isAiming ? 0.36 : 0.62);
      this.playerRig.leftLeg.rotation.x = swing;
      this.playerRig.rightLeg.rotation.x = -swing;
    } else {
      if (this.isAiming) {
        const aimYaw = this.camYaw + Math.PI;
        let diff = aimYaw - this.playerYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.playerYaw += diff * Math.min(1, dt * 18);
      }
      const idleVehPush = this.resolveActorVsVehicles(this.playerX, this.playerZ, 0.26, this.playerY);
      const idleWorld = this.resolveWorldCollision(idleVehPush.x, idleVehPush.z, 0.26, this.playerY);
      this.playerX = idleWorld.x;
      this.playerZ = idleWorld.z;
      this.playerRig.leftLeg.rotation.x *= 0.85;
      this.playerRig.rightLeg.rotation.x *= 0.85;
      this.prevWalkSin = 0;
    }

    // Solid player vs alive NPC separation
    for (const npc of this.npcs) {
      if (npc.dead || Math.abs(npc.y - this.playerY) > 1.8) continue;
      const dx = this.playerX - npc.x;
      const dz = this.playerZ - npc.z;
      const d = Math.hypot(dx, dz);
      const minD = 0.92;
      if (d > 0.001 && d < minD) {
        const push = (minD - d) * 0.5;
        const nx = dx / d;
        const nz = dz / d;
        this.playerX += nx * push;
        this.playerZ += nz * push;
        npc.x -= nx * push;
        npc.z -= nz * push;
      }
    }

    // Articulated 2-Segment Arm & Weapon Pose + Recoil + Aim Pitch!
    setCharacterWeaponPose(
      this.playerRig,
      this.weaponId,
      moveLen > 0.08,
      this.walkCycle,
      this.weaponRecoil,
      this.camPitch * 0.85,
      this.isAiming,
    );

    if (this.isActionHeld('on_foot', 'jump', pad) > 0.5 && this.onGround) {
      this.playerVy = 8.4;
      this.onGround = false;
      this.peakFallVy = 0;
    }

    if (this.parachuteOpen) {
      this.playerVy = Math.max(-4.5, this.playerVy - 12 * dt);
      const glideSpeed = 12;
      const glideRes = this.resolveWorldCollision(
        this.playerX + Math.sin(this.playerYaw) * glideSpeed * dt,
        this.playerZ + Math.cos(this.playerYaw) * glideSpeed * dt,
        0.28,
        this.playerY,
      );
      this.playerX = glideRes.x;
      this.playerZ = glideRes.z;
    } else {
      this.playerVy -= 23 * dt;
      if (this.playerVy < this.peakFallVy) this.peakFallVy = this.playerVy;
    }

    this.playerY += this.playerVy * dt;
    const groundY = this.world.groundHeightAt(this.playerX, this.playerZ, this.playerY);
    if (this.playerY <= groundY) {
      if (!this.onGround && !this.parachuteOpen && this.peakFallVy < -14) {
        const dmg = Math.min(95, (-this.peakFallVy - 13) * 4.5);
        this.applyPlayerDamage(dmg);
        this.sound.playCrash(0.5);
      }
      this.playerY = groundY;
      this.playerVy = 0;
      this.peakFallVy = 0;
      this.onGround = true;
      if (this.parachuteOpen) {
        this.parachuteOpen = false;
        this.playerRig.parachuteCanopy.visible = false;
      }
    } else if (this.playerY > groundY + 0.35) {
      this.onGround = false;
    }

    // Gentle ocean & lake swimming float
    if (this.world.isWaterAt(this.playerX, this.playerZ) && this.playerY <= 0.2) {
      this.playerY = 0.0;
      this.onGround = true;
    }

    this.playerRig.group.position.set(this.playerX, this.playerY, this.playerZ);
    this.playerRig.group.rotation.y = this.playerYaw;
    this.playerRig.contactShadow.visible = this.onGround;
  }

  private updatePlayerVehicleControl(dt: number, gp: ReturnType<GameEngine['pollGamepad']>) {
    const v = this.currentVehicle!;
    if (v.wrecked || v.waterDisabled) {
      v.vx *= 0.9;
      v.vz *= 0.9;
      return;
    }

    const pad = gp.pad;
    const ctx = this.getActiveControlContext();
    const spec = VEHICLE_SPECS[v.type];
    let throttle = this.isActionHeld(ctx, 'forward', pad);
    let brake = this.isActionHeld(ctx, 'backward', pad);
    let steer = THREE.MathUtils.clamp(
      this.isActionHeld(ctx, 'left', pad) - this.isActionHeld(ctx, 'right', pad) - this.virtualMoveX,
      -1,
      1,
    );

    if (spec.kind === 'car') {
      if (this.keys['ArrowUp']) throttle = Math.max(throttle, 1);
      if (this.keys['ArrowDown']) brake = Math.max(brake, 1);
      if (this.keys['ArrowLeft']) steer = Math.max(steer, 1);
      if (this.keys['ArrowRight']) steer = Math.min(steer, -1);
    }

    if (spec.kind === 'helicopter') {
      // Helicopter Flight Physics with Custom/GTA V Bindings & Steering Sensitivity
      this.gainSkill('flying', dt * 0.5);
      v.rotorSpeed = 24;
      const rudderYaw =
        this.isActionHeld(ctx, 'yawLeft', pad) - this.isActionHeld(ctx, 'yawRight', pad);
      v.yaw += (steer * 0.65 + rudderYaw * 0.95) * spec.turnSpeed * this.steeringSensitivity * dt;

      const stickTilt = Math.abs(this.virtualMoveY) > 0.08 ? this.virtualMoveY : 0;
      const forwardTilt = THREE.MathUtils.clamp(
        this.isActionHeld(ctx, 'pitchDown', pad) - this.isActionHeld(ctx, 'pitchUp', pad) + stickTilt,
        -1,
        1,
      );
      const lift = throttle - brake;
      v.vy = THREE.MathUtils.damp(v.vy, lift * 20, 4, dt);

      const moveDir = forwardTilt !== 0 ? forwardTilt : throttle * 0.55;
      const fx = Math.sin(v.yaw);
      const fz = Math.cos(v.yaw);
      v.vx = THREE.MathUtils.damp(v.vx, fx * moveDir * spec.maxSpeed, 2.2, dt);
      v.vz = THREE.MathUtils.damp(v.vz, fz * moveDir * spec.maxSpeed, 2.2, dt);
      // Forward tilt lowers nose (-v.pitch in climb angle -> +rotation.x visually!)
      v.pitch = THREE.MathUtils.damp(v.pitch, -moveDir * 0.24, 5, dt);
      v.roll = THREE.MathUtils.damp(v.roll, -steer * 0.3, 5, dt);
    } else if (spec.kind === 'plane') {
      // Airplane & Fighter Jet Physics:
      // Pulling stick DOWN (pitchUp / virtualMoveY < 0) raises nose UP & climbs (+v.pitch)!
      // Pushing stick UP (pitchDown / virtualMoveY > 0) drops nose DOWN & dives (-v.pitch)!
      this.gainSkill('flying', dt * 0.6);
      const fwdSpeed = v.vx * Math.sin(v.yaw) + v.vz * Math.cos(v.yaw);
      const curSpeed = Math.max(0, fwdSpeed);
      let nextSpeed = curSpeed + (throttle * spec.accel - brake * spec.braking - 2.2) * dt;
      nextSpeed = THREE.MathUtils.clamp(nextSpeed, 0, spec.maxSpeed);

      const pitchInput = THREE.MathUtils.clamp(
        this.isActionHeld(ctx, 'pitchUp', pad) -
          this.isActionHeld(ctx, 'pitchDown', pad) -
          this.virtualMoveY,
        -1,
        1,
      );
      if (Math.abs(pitchInput) > 0.04) {
        v.pitch = THREE.MathUtils.clamp(
          v.pitch + pitchInput * 1.18 * this.steeringSensitivity * dt,
          -0.78,
          0.78,
        );
      } else {
        v.pitch = THREE.MathUtils.damp(v.pitch, 0, 1.5, dt);
      }

      const rudderYaw =
        this.isActionHeld(ctx, 'yawLeft', pad) - this.isActionHeld(ctx, 'yawRight', pad);
      v.yaw +=
        (steer + rudderYaw * 0.7) *
        spec.turnSpeed *
        this.steeringSensitivity *
        (0.4 + Math.min(0.85, nextSpeed / 35)) *
        dt;
      const targetRoll = -steer * 0.68 * Math.min(1, nextSpeed / 24);
      v.roll = THREE.MathUtils.damp(v.roll, targetRoll, 5, dt);

      const fx = Math.sin(v.yaw) * Math.cos(v.pitch);
      const fy = Math.sin(v.pitch);
      const fz = Math.cos(v.yaw) * Math.cos(v.pitch);

      v.vx = fx * nextSpeed;
      v.vz = fz * nextSpeed;

      const takeoffRatio = THREE.MathUtils.clamp((nextSpeed - 20) / 18, 0, 1);
      if (takeoffRatio > 0.2) {
        v.vy = THREE.MathUtils.damp(v.vy, fy * nextSpeed + takeoffRatio * 2.2, 4, dt);
      } else {
        v.vy -= 18 * dt;
      }
    } else {
      // Ground Vehicle Physics + Skill & Upgrade Multipliers
      const skillDrive = 1 + (this.account.skills.driving / 100) * 0.22;
      const engineBonus = 1 + v.upgrades.engineLevel * 0.14 + (v.upgrades.turboInstalled ? 0.16 : 0);
      const handlingBonus = 1 + v.upgrades.handlingLevel * 0.18;
      const maxSpeed = spec.maxSpeed * engineBonus;
      const accel = spec.accel * engineBonus;

      const fx = Math.sin(v.yaw);
      const fz = Math.cos(v.yaw);
      const rx = Math.cos(v.yaw);
      const rz = -Math.sin(v.yaw);

      let forwardSpeed = v.vx * fx + v.vz * fz;
      let lateralSpeed = v.vx * rx + v.vz * rz;

      // Progressive type-dependent acceleration curve + natural drag + 6-speed shifting simulation
      const speedRatio = THREE.MathUtils.clamp(Math.abs(forwardSpeed) / maxSpeed, 0, 1);
      const torqueCurve = 1.18 - 0.76 * Math.pow(speedRatio, 1.05);
      this.lastThrottle = throttle;

      if (throttle > 0) {
        forwardSpeed += accel * torqueCurve * throttle * dt;
        if (Math.abs(forwardSpeed) > 15) this.gainSkill('driving', dt * 0.45);
      }
      if (brake > 0) {
        if (forwardSpeed > 1) forwardSpeed -= spec.braking * brake * dt;
        else forwardSpeed -= accel * 0.55 * brake * dt;
      }

      // Rolling & aerodynamic drag
      const coastDrag = throttle === 0 && brake === 0 ? 1.85 : 0.45;
      forwardSpeed -= Math.sign(forwardSpeed) * (coastDrag * 0.35 + speedRatio * 2.15) * dt;
      if (throttle === 0 && brake === 0 && Math.abs(forwardSpeed) < 0.08) forwardSpeed = 0;

      forwardSpeed = THREE.MathUtils.clamp(forwardSpeed, -maxSpeed * 0.42, maxSpeed);

      // Simulate 6-speed automatic gearbox for dynamic engine pitch!
      if (this.shiftDipTimer > 0) this.shiftDipTimer = Math.max(0, this.shiftDipTimer - dt);
      const gearUpper = [0, 0.17, 0.34, 0.52, 0.7, 0.86, 1.02];
      if (forwardSpeed >= -0.5) {
        while (this.currentGear < 6 && speedRatio > gearUpper[this.currentGear]) {
          this.currentGear++;
          this.shiftDipTimer = 0.14;
        }
        while (this.currentGear > 1 && speedRatio < gearUpper[this.currentGear - 1] - 0.055) {
          this.currentGear--;
        }
        const gMin = this.currentGear === 1 ? 0 : gearUpper[this.currentGear - 1] - 0.06;
        const gMax = gearUpper[this.currentGear];
        const inGearFrac = THREE.MathUtils.clamp(
          (speedRatio - gMin) / Math.max(0.08, gMax - gMin),
          0,
          1,
        );
        let targetRpm = 0.24 + inGearFrac * 0.74;
        if (this.shiftDipTimer > 0) targetRpm *= 0.66;
        if (speedRatio >= 0.985 && this.currentGear === 6) targetRpm = 0.94;
        this.engineRpm = THREE.MathUtils.damp(this.engineRpm, targetRpm, 9.5, dt);
      } else {
        this.currentGear = 1;
        const revFrac = Math.min(1, Math.abs(forwardSpeed) / (maxSpeed * 0.36));
        this.engineRpm = THREE.MathUtils.damp(this.engineRpm, 0.25 + revFrac * 0.62, 9, dt);
      }

      const handbrake = this.isActionHeld(ctx, 'handbrake', pad) > 0.35;
      const wetGripMult = 1 - this.wetness * 0.2;
      const grip = (handbrake ? spec.driftGrip : spec.normalGrip) * handlingBonus * skillDrive * wetGripMult;
      lateralSpeed *= Math.exp(-grip * dt);

      const speedFactor = Math.min(1, Math.abs(forwardSpeed) / 7.5);
      const reverseSign = forwardSpeed >= -0.4 ? 1 : -1;
      v.steerAngle = THREE.MathUtils.damp(v.steerAngle, steer * 0.45, 10, dt);
      v.yaw += steer * spec.turnSpeed * handlingBonus * this.steeringSensitivity * speedFactor * reverseSign * dt;

      const nfx = Math.sin(v.yaw);
      const nfz = Math.cos(v.yaw);
      const nrx = Math.cos(v.yaw);
      const nrz = -Math.sin(v.yaw);

      v.vx = nfx * forwardSpeed + nrx * lateralSpeed;
      v.vz = nfz * forwardSpeed + nrz * lateralSpeed;

      const bodyRollTarget = THREE.MathUtils.clamp(-lateralSpeed * 0.02, -0.1, 0.1);
      v.roll = THREE.MathUtils.damp(v.roll, bodyRollTarget, 8, dt);

      if (handbrake && Math.abs(lateralSpeed) > 3.5 && Math.random() < 0.45) {
        this.spawnSmoke(v.x - nfx * 1.6, v.y + 0.25, v.z - nfz * 1.6);
      }
    }
  }

  private updateVehicles(dt: number) {
    const px = this.currentVehicle ? this.currentVehicle.x : this.playerX;
    const pz = this.currentVehicle ? this.currentVehicle.z : this.playerZ;

    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      const spec = VEHICLE_SPECS[v.type];
      const distSqPlayer = (v.x - px) ** 2 + (v.z - pz) ** 2;
      const isFarAI = v.isAI && distSqPlayer > 250 * 250;

      if (v.onFire && !v.wrecked) {
        v.health -= dt * 3.5;
        if (Math.random() < 0.35) this.spawnSmoke(v.x, v.y + 1.5, v.z);
        v.rig.fireGroup.children.forEach((c, idx) => {
          c.scale.y = 0.7 + Math.sin(this.elapsed * 16 + idx) * 0.35;
        });
        if (v.health <= 0) {
          this.damageVehicle(v, 5, 0, 1);
          continue;
        }
      }

      if (v.isAI && !v.wrecked && !v.waterDisabled) {
        if (v.isServiceUnit) {
          this.updateServiceUnitAI(v, dt);
        } else if (v.isPolice && this.wantedStars > 0) {
          this.updatePoliceCarAI(v, dt);
        } else {
          this.updateTrafficCarAI(v, dt);
        }
      }

      // Sub-stepped 3-sphere vehicle capsule collision (culled for distant off-screen AI traffic)
      const moveX = v.vx * dt;
      const moveZ = v.vz * dt;
      let anyHit = false;
      let hitNx = 0;
      let hitNz = 0;

      if (isFarAI) {
        v.x = THREE.MathUtils.clamp(v.x + moveX, -2450, 1650);
        v.z = THREE.MathUtils.clamp(v.z + moveZ, -2150, 2150);
      } else {
        const moveDist = Math.hypot(moveX, moveZ);
        const subSteps = Math.max(1, Math.min(8, Math.ceil(moveDist / 0.72)));
        for (let s = 0; s < subSteps; s++) {
          v.x = THREE.MathUtils.clamp(v.x + moveX / subSteps, -2450, 1650);
          v.z = THREE.MathUtils.clamp(v.z + moveZ / subSteps, -2150, 2150);
          const res = this.resolveVehicleWorldCollision(v);
          if (res.hit) {
            anyHit = true;
            hitNx = res.nx;
            hitNz = res.nz;
          }
        }
      }

      if (anyHit) {
        const vn = v.vx * hitNx + v.vz * hitNz;
        const impactSpeed = Math.abs(vn);
        const isGslVan = this.gslState.active && v.id === this.gslState.vanId;
        if (impactSpeed > (isGslVan ? 1.4 : 6.5)) {
          this.damageVehicle(v, Math.max(isGslVan ? 1.5 : 0, impactSpeed * 1.15), v.vx, v.vz);
          if (v === this.currentVehicle) {
            this.sound.playCrash(impactSpeed / 32);
            this.recordWorldEvent(`Náraz vozidla ${spec.name}`);
          }
          this.spawnSparks(v.x, v.y + 0.8, v.z, 0xfbbf24, 6);
        }
        // Slide tangentially along obstacle normal instead of tunneling or getting stuck
        if (vn < 0) {
          v.vx -= hitNx * vn * 1.18;
          v.vz -= hitNz * vn * 1.18;
        }
        v.vx *= 0.78;
        v.vz *= 0.78;
      }

      // Gravity & Grounding (supports elevated bridges, rooftops & ramps smoothly!)
      if (spec.kind === 'car') {
        v.vy -= 22 * dt;
      } else if (spec.kind === 'helicopter' && v !== this.currentVehicle) {
        v.vy -= 14 * dt;
        v.rotorSpeed = Math.max(0, v.rotorSpeed - dt * 6);
      }

      v.y += v.vy * dt;
      const groundY = this.world.groundHeightAt(v.x, v.z, v.y);
      if (v === this.currentVehicle && spec.kind === 'car') {
        if (v.y > groundY + 0.55) {
          v.airTime += dt;
          if (!v.wasAirborne && v.airTime > 0.12) {
            v.wasAirborne = true;
            v.airStartX = v.x;
            v.airStartZ = v.z;
          }
        }
      }
      if (v.y <= groundY) {
        if (spec.kind !== 'car' && v.vy < -16) {
          this.damageVehicle(v, Math.abs(v.vy) * 2.2, 0, -1);
        }
        if (v === this.currentVehicle && spec.kind === 'car' && v.wasAirborne && v.airTime >= 0.85 && !v.wrecked) {
          const airDist = Math.hypot(v.x - v.airStartX, v.z - v.airStartZ);
          if (airDist >= 11) {
            const bonus = Math.min(25, Math.max(8, Math.round(airDist * 0.45 + v.airTime * 4)));
            this.account.cash += bonus;
            this.gainReputation(5);
            this.sound.playCashChime();
            this.showToast(`Kaskadérsky skok (${Math.round(airDist)}m)! +$${bonus}`, 'success');
          }
        }
        v.airTime = 0;
        v.wasAirborne = false;
        v.y = groundY;
        v.vy = 0;
        if (spec.kind === 'car' && !isFarAI) {
          const fwdPitch =
            (this.world.groundHeightAt(v.x + Math.sin(v.yaw) * 2, v.z + Math.cos(v.yaw) * 2, v.y + 1) -
              groundY) *
            0.35;
          v.pitch = THREE.MathUtils.damp(v.pitch, -THREE.MathUtils.clamp(fwdPitch, -0.4, 0.4), 8, dt);
        } else if (spec.kind === 'helicopter') {
          v.pitch *= 0.9;
          v.roll *= 0.9;
        }
      }

      // Water stall check for land vehicles!
      if (spec.kind === 'car' && this.world.isWaterAt(v.x, v.z) && v.y <= 0.35 && !v.waterDisabled) {
        v.waterDisabled = true;
        v.vx *= 0.15;
        v.vz *= 0.15;
        this.spawnSmoke(v.x, v.y + 0.8, v.z);
        if (v === this.currentVehicle) {
          this.showToast('Motor zatopený vodou! Vystúp z vozidla (E/F).', 'warning');
        }
      }

      // Wheels / Rotors / Propellers
      const speedMag = Math.hypot(v.vx, v.vz);
      v.wheelSpin += speedMag * dt * 2.4;
      v.rig.wheelMeshes.forEach((wg) => (wg.rotation.x = v.wheelSpin));
      v.rig.frontPivots.forEach((fp) => (fp.rotation.y = v.steerAngle));
      if (v.rig.mainRotor) v.rig.mainRotor.rotation.y += v.rotorSpeed * dt;
      if (v.rig.tailRotor) v.rig.tailRotor.rotation.x += v.rotorSpeed * 1.4 * dt;
      if (v.rig.propeller && v === this.currentVehicle) v.rig.propeller.rotation.z += (12 + speedMag) * dt;

      if (v.rig.sirenRedMat && v.rig.sirenBlueMat) {
        const flashOn = v.isPolice ? this.wantedStars > 0 || v.isServiceUnit === 'police' : Boolean(v.isServiceUnit || v === this.currentVehicle);
        const phase = Math.floor(this.elapsed * 9) % 2 === 0;
        v.rig.sirenRedMat.emissiveIntensity = flashOn ? (phase ? 3.2 : 0.25) : 0.15;
        v.rig.sirenBlueMat.emissiveIntensity = flashOn ? (phase ? 0.25 : 3.2) : 0.15;
      }

      v.rig.group.position.set(v.x, v.y, v.z);
      // Negate v.pitch so positive climb pitch (+v.pitch) tilts +Z nose UP visually!
      v.rig.group.rotation.set(-v.pitch, v.yaw, v.roll);
    }

    // Vehicle-to-Vehicle Collisions with Visible Deformation + Re-Clamping against walls!
    for (let i = 0; i < this.vehicles.length; i++) {
      const a = this.vehicles[i];
      for (let j = i + 1; j < this.vehicles.length; j++) {
        const b = this.vehicles[j];
        if (Math.abs(a.y - b.y) > 2.5) continue;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const dist = Math.hypot(dx, dz);
        const minD = (VEHICLE_SPECS[a.type].width + VEHICLE_SPECS[b.type].width) * 0.65;
        if (dist > 0.01 && dist < minD) {
          const nx = dx / dist;
          const nz = dz / dist;
          const overlap = (minD - dist) * 0.5;
          a.x -= nx * overlap;
          a.z -= nz * overlap;
          b.x += nx * overlap;
          b.z += nz * overlap;

          this.resolveVehicleWorldCollision(a);
          this.resolveVehicleWorldCollision(b);

          const relSpeed = Math.hypot(a.vx - b.vx, a.vz - b.vz);
          const sepVel = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
          if (sepVel > 0) {
            const imp = sepVel * 0.54;
            a.vx -= nx * imp;
            a.vz -= nz * imp;
            b.vx += nx * imp;
            b.vz += nz * imp;
            const gslInvolved =
              this.gslState.active &&
              (a.id === this.gslState.vanId || b.id === this.gslState.vanId);
            if (relSpeed > (gslInvolved ? 1.2 : 9)) {
              const dmg = Math.max(gslInvolved ? 1.5 : 0, relSpeed * 1.1);
              this.damageVehicle(a, dmg, nx, nz);
              this.damageVehicle(b, dmg, -nx, -nz);
              if (a === this.currentVehicle || b === this.currentVehicle) {
                this.sound.playCrash(relSpeed / 30);
                if (a.isPolice || b.isPolice) this.addWanted(1);
              }
              this.spawnSparks((a.x + b.x) * 0.5, a.y + 0.8, (a.z + b.z) * 0.5, 0xfbbf24, 6);
            }
          }
        }
      }
    }
  }

  private updateServiceUnitAI(v: VehicleEntity, dt: number) {
    const px = this.currentVehicle ? this.currentVehicle.x : this.playerX;
    const pz = this.currentVehicle ? this.currentVehicle.z : this.playerZ;
    const dx = px - v.x;
    const dz = pz - v.z;
    const dist = Math.hypot(dx, dz);

    if (dist > 10) {
      const desiredYaw = Math.atan2(dx, dz);
      let diff = desiredYaw - v.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      v.yaw += THREE.MathUtils.clamp(diff, -2.5 * dt, 2.5 * dt);
      v.vx = THREE.MathUtils.damp(v.vx, Math.sin(v.yaw) * 22, 4.5, dt);
      v.vz = THREE.MathUtils.damp(v.vz, Math.cos(v.yaw) * 22, 4.5, dt);
    } else {
      v.vx *= 0.85;
      v.vz *= 0.85;
      if (v.isServiceUnit === 'ems') {
        this.health = 100;
        this.showToast('Záchranka EMS dorazila a ošetrila ťa na 100% HP!', 'success');
        v.isServiceUnit = undefined;
      } else if (v.isServiceUnit === 'fire') {
        this.vehicles.forEach((o) => {
          if (o.onFire) {
            o.onFire = false;
            o.rig.fireGroup.visible = false;
          }
        });
        this.showToast('Hasiči dorazili a zabezpečili okolie!', 'success');
        v.isServiceUnit = undefined;
      } else if (v.isServiceUnit === 'taxi') {
        v.isAI = false;
        v.isServiceUnit = undefined;
        this.showToast('Taxík pristavený! Nastúp pomocou E/F.', 'success');
      } else if (v.isServiceUnit === 'police') {
        this.showToast('Jednotka PBPD dorazila na miesto.', 'info');
        v.isServiceUnit = undefined;
      }
    }
  }

  private updateTrafficCarAI(v: VehicleEntity, dt: number) {
    const edge = this.world.network.edges[v.aiEdgeId];
    if (!edge) return;

    const targetPt = getRightLanePointOnEdge(edge, v.aiSampleIdx, v.aiReverse);
    const dx = targetPt.x - v.x;
    const dz = targetPt.z - v.z;
    if (Math.hypot(dx, dz) < 7.5) {
      if (!v.aiReverse) {
        if (v.aiSampleIdx < edge.samples.length - 1) v.aiSampleIdx++;
        else {
          const conns = this.world.network.adjacency.get(edge.to) ?? [];
          const options = conns.filter((c) => c.edgeId !== edge.id);
          const pick = options.length > 0 ? options[Math.floor(Math.random() * options.length)] : conns[0];
          const nextEdge = this.world.network.edges[pick.edgeId];
          v.aiEdgeId = nextEdge.id;
          v.aiReverse = nextEdge.from !== edge.to;
          v.aiSampleIdx = v.aiReverse ? nextEdge.samples.length - 1 : 0;
        }
      } else {
        if (v.aiSampleIdx > 0) v.aiSampleIdx--;
        else {
          const conns = this.world.network.adjacency.get(edge.from) ?? [];
          const options = conns.filter((c) => c.edgeId !== edge.id);
          const pick = options.length > 0 ? options[Math.floor(Math.random() * options.length)] : conns[0];
          const nextEdge = this.world.network.edges[pick.edgeId];
          v.aiEdgeId = nextEdge.id;
          v.aiReverse = nextEdge.from !== edge.from;
          v.aiSampleIdx = v.aiReverse ? nextEdge.samples.length - 1 : 0;
        }
      }
      return;
    }

    const desiredYaw = Math.atan2(dx, dz);
    let diff = desiredYaw - v.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    v.yaw += THREE.MathUtils.clamp(diff, -2.8 * dt, 2.8 * dt);

    const px = this.currentVehicle ? this.currentVehicle.x : this.playerX;
    const pz = this.currentVehicle ? this.currentVehicle.z : this.playerZ;
    const playerDist = Math.hypot(px - v.x, pz - v.z);
    let targetSpeed = playerDist < 12 ? 2.5 : 15.5;

    // Brake smoothly if another vehicle is directly ahead in our lane
    const fwdX = Math.sin(v.yaw);
    const fwdZ = Math.cos(v.yaw);
    for (const other of this.vehicles) {
      if (other === v || Math.abs(other.y - v.y) > 2) continue;
      const odx = other.x - v.x;
      const odz = other.z - v.z;
      const along = odx * fwdX + odz * fwdZ;
      if (along > 0 && along < 15) {
        const lateral = Math.abs(odx * fwdZ - odz * fwdX);
        if (lateral < 2.6) {
          targetSpeed = Math.min(targetSpeed, along < 7.5 ? 0 : 6.0);
          break;
        }
      }
    }

    v.vx = THREE.MathUtils.damp(v.vx, fwdX * targetSpeed, 4.5, dt);
    v.vz = THREE.MathUtils.damp(v.vz, fwdZ * targetSpeed, 4.5, dt);
  }

  private updatePoliceCarAI(v: VehicleEntity, dt: number) {
    const px = this.currentVehicle ? this.currentVehicle.x : this.playerX;
    const pz = this.currentVehicle ? this.currentVehicle.z : this.playerZ;
    const dx = px - v.x;
    const dz = pz - v.z;
    const dist = Math.hypot(dx, dz);

    const desiredYaw = Math.atan2(dx, dz);
    let diff = desiredYaw - v.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    v.yaw += THREE.MathUtils.clamp(diff, -2.6 * dt, 2.6 * dt);

    const chaseSpeed = dist > 20 ? 30 + this.wantedStars * 3 : 16;
    v.vx = THREE.MathUtils.damp(v.vx, Math.sin(v.yaw) * chaseSpeed, 4.5, dt);
    v.vz = THREE.MathUtils.damp(v.vz, Math.cos(v.yaw) * chaseSpeed, 4.5, dt);

    if (!this.currentVehicle && dist < 26 && v.aiCooldown <= 0) {
      v.aiCooldown = 1.6;
      this.applyPlayerDamage(6);
      this.sound.playWeapon('pistol');
      this.spawnSparks(this.playerX, this.playerY + 1.2, this.playerZ, 0xef4444, 4);
    }
    if (v.aiCooldown > 0) v.aiCooldown -= dt;
  }

  private updateNPCsAndCops(dt: number) {
    const px = this.currentVehicle ? this.currentVehicle.x : this.playerX;
    const pz = this.currentVehicle ? this.currentVehicle.z : this.playerZ;
    const pSpeed = this.currentVehicle ? Math.hypot(this.currentVehicle.vx, this.currentVehicle.vz) : 0;

    for (let idx = 0; idx < this.npcs.length; idx++) {
      const npc = this.npcs[idx];
      if (npc.dead) {
        npc.respawnTimer -= dt;
        if (npc.respawnTimer <= 0) {
          npc.dead = false;
          npc.health = npc.isCop ? 85 : 60;
          npc.behavior = 'patrol';
          npc.reactionLine = '';
          npc.rig.group.rotation.x = 0;
          const spot = this.findClearSpawnSpot(-500 + Math.random() * 1100, -600 + Math.random() * 1200, 0.75);
          npc.x = spot.x;
          npc.z = spot.z;
          npc.y = this.world.groundHeightAt(npc.x, npc.z, 2);
        }
        continue;
      }

      const distToPlayer = Math.hypot(npc.x - px, npc.z - pz);
      if (this.currentVehicle && pSpeed > 7 && distToPlayer < 2.2) {
        npc.dead = true;
        npc.respawnTimer = 15;
        npc.rig.group.rotation.x = Math.PI / 2;
        this.sound.playCrash(0.4);
        this.addWanted(npc.isCop ? 2 : 1);
        this.account.cash += 12;
        continue;
      }

      // Fallback local reflexes if AI Director hasn't overridden recently
      if (npc.behaviorTimer > 0) {
        npc.behaviorTimer -= dt;
        if (npc.behaviorTimer <= 0 && npc.behavior !== 'patrol') {
          npc.behavior = 'patrol';
          npc.reactionLine = '';
        }
      }
      if (npc.panicTimer > 0) {
        npc.panicTimer -= dt;
        npc.behavior = 'flee';
      } else if ((this.rainFactor > 0.45 || this.stormFactor > 0.35) && !npc.isCop && npc.behavior === 'patrol') {
        npc.behavior = 'shelter';
      } else if (npc.isCop && this.wantedStars > 0 && distToPlayer < 95) {
        npc.behavior = 'confront';
      }

      let moveMult = 1.0;
      let isStanding = false;

      if (npc.behavior === 'flee') {
        npc.yaw = Math.atan2(npc.x - px, npc.z - pz);
        moveMult = 2.15;
      } else if (npc.behavior === 'shelter') {
        // Head toward nearest awning / civic building shelter
        let bestS = this.world.shelterSpots[0];
        let bestD = Infinity;
        for (const sp of this.world.shelterSpots) {
          const sd = Math.hypot(sp.x - npc.x, sp.z - npc.z);
          if (sd < bestD) {
            bestD = sd;
            bestS = sp;
          }
        }
        if (bestS) {
          if (bestD < 3.2) {
            isStanding = true;
          } else {
            npc.yaw = Math.atan2(bestS.x - npc.x, bestS.z - npc.z);
            moveMult = 1.45;
          }
        }
      } else if (npc.behavior === 'investigate') {
        if (distToPlayer > 7.5) {
          npc.yaw = Math.atan2(px - npc.x, pz - npc.z);
          moveMult = 1.1;
        } else {
          npc.yaw = Math.atan2(px - npc.x, pz - npc.z);
          isStanding = true;
        }
      } else if (npc.behavior === 'cheer') {
        npc.yaw = Math.atan2(px - npc.x, pz - npc.z);
        isStanding = true;
      } else if (npc.behavior === 'confront') {
        npc.yaw = Math.atan2(px - npc.x, pz - npc.z);
        if (distToPlayer > 4.2) {
          moveMult = npc.isCop ? 1.55 : 1.15;
        } else {
          isStanding = true;
        }
      } else if (npc.behavior === 'hail_taxi') {
        npc.yaw = Math.atan2(px - npc.x, pz - npc.z);
        isStanding = distToPlayer < 24;
      } else {
        if (Math.random() < 0.012) npc.yaw += (Math.random() - 0.5) * 1.4;
      }

      if (!isStanding) {
        const nextX = THREE.MathUtils.clamp(npc.x + Math.sin(npc.yaw) * npc.speed * moveMult * dt, -980, 820);
        const nextZ = THREE.MathUtils.clamp(npc.z + Math.cos(npc.yaw) * npc.speed * moveMult * dt, -980, 980);
        if (distToPlayer > 140) {
          npc.x = nextX;
          npc.z = nextZ;
        } else {
          const worldRes = this.resolveWorldCollision(nextX, nextZ, 0.26, npc.y);
          const vehRes = this.resolveActorVsVehicles(worldRes.x, worldRes.z, 0.26, npc.y);
          const finalRes = this.resolveWorldCollision(vehRes.x, vehRes.z, 0.26, npc.y);
          if (worldRes.hit || vehRes.hit) npc.yaw += Math.PI * 0.65;
          npc.x = finalRes.x;
          npc.z = finalRes.z;
        }
      } else if (distToPlayer <= 140) {
        const vehRes = this.resolveActorVsVehicles(npc.x, npc.z, 0.26, npc.y);
        const finalRes = this.resolveWorldCollision(vehRes.x, vehRes.z, 0.26, npc.y);
        npc.x = finalRes.x;
        npc.z = finalRes.z;
      }

      if (distToPlayer > 140) {
        npc.rig.group.position.set(npc.x, npc.y, npc.z);
        npc.rig.group.rotation.y = npc.yaw;
        continue;
      }

      // NPC vs NPC solid separation
      for (let j = idx + 1; j < this.npcs.length; j++) {
        const other = this.npcs[j];
        if (other.dead || Math.abs(other.y - npc.y) > 1.8) continue;
        const dx = npc.x - other.x;
        const dz = npc.z - other.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.001 && d < 0.85) {
          const push = (0.85 - d) * 0.5;
          npc.x += (dx / d) * push;
          npc.z += (dz / d) * push;
          other.x -= (dx / d) * push;
          other.z -= (dz / d) * push;
        }
      }

      npc.y = this.world.groundHeightAt(npc.x, npc.z, npc.y + 1);
      if (isStanding) {
        npc.rig.leftLeg.rotation.x *= 0.8;
        npc.rig.rightLeg.rotation.x *= 0.8;
        if (npc.behavior === 'cheer' || npc.behavior === 'hail_taxi') {
          npc.rig.rightArm.rotation.x = -2.4 + Math.sin(this.elapsed * 9 + npc.id) * 0.45;
          npc.rig.leftArm.rotation.x = npc.behavior === 'cheer' ? -2.2 - Math.sin(this.elapsed * 9 + npc.id) * 0.4 : 0;
        } else {
          npc.rig.leftArm.rotation.x *= 0.85;
          npc.rig.rightArm.rotation.x *= 0.85;
        }
      } else {
        const swing = Math.sin(this.elapsed * (moveMult > 1.5 ? 12 : 6.5) + npc.id) * 0.5;
        npc.rig.leftLeg.rotation.x = swing;
        npc.rig.rightLeg.rotation.x = -swing;
        npc.rig.leftArm.rotation.x = -swing * 0.6;
        npc.rig.rightArm.rotation.x = swing * 0.6;
      }
      npc.rig.group.position.set(npc.x, npc.y, npc.z);
      npc.rig.group.rotation.y = npc.yaw;
    }
  }

  private updateWantedAndMission(dt: number) {
    const px = this.currentVehicle ? this.currentVehicle.x : this.playerX;
    const py = this.currentVehicle ? this.currentVehicle.y : this.playerY;
    const pz = this.currentVehicle ? this.currentVehicle.z : this.playerZ;

    if (this.wantedStars > 0) {
      const activeCops = this.vehicles.filter((v) => v.isPolice && v.isAI && !v.wrecked);
      const desiredCops = Math.min(4, this.wantedStars);

      this.copSpawnTimer -= dt;
      if (activeCops.length < desiredCops && this.copSpawnTimer <= 0) {
        this.copSpawnTimer = 6;
        const angle = Math.random() * Math.PI * 2;
        const sx = THREE.MathUtils.clamp(px + Math.cos(angle) * 85, -1350, 820);
        const sz = THREE.MathUtils.clamp(pz + Math.sin(angle) * 85, -1200, 1200);
        this.createVehicle('pbpd', sx, sz, Math.atan2(px - sx, pz - sz), true);
      }

      let nearestCop = 999;
      for (const cop of activeCops) {
        const d = Math.hypot(cop.x - px, cop.z - pz);
        if (d < nearestCop) nearestCop = d;
      }

      if (nearestCop > 110) {
        this.wantedEvading = true;
        this.wantedCooldown -= dt;
        if (this.wantedCooldown <= 0) {
          this.wantedStars = 0;
          this.wantedEvading = false;
          this.gainReputation(25);
          this.showToast('Unikol si hliadke PBPD! +25 Reputácia', 'success');
        }
      } else {
        this.wantedEvading = false;
        this.wantedCooldown = 10 + this.wantedStars * 2.5;
      }
    }

    // Check Discoverable & Triggerable Random World Missions (NOT auto-completed!)
    let foundNearbyHm: HiddenMissionDef | null = null;
    for (const hm of HIDDEN_MISSIONS) {
      if (this.completedHiddenIds.includes(hm.id)) continue;
      if (Math.hypot(px - hm.x, pz - hm.z) < 16 && Math.abs(py - hm.y) < 12) {
        foundNearbyHm = hm;
        if (!this.discoveredHiddenIds.includes(hm.id)) {
          this.discoveredHiddenIds.push(hm.id);
          this.sound.playPhoneBeep(740);
          this.showToast(`Objavená náhodná misia: "${hm.title}" — Stlač E pre spustenie!`, 'info');
          this.saveGameState(true);
        }
        break;
      }
    }
    this.nearbyHiddenMission = foundNearbyHm;

    // Check Active Story or Random Mission Stages
    if (this.mission.activeId && this.activeStoryDef) {
      this.mission.timeLeft -= dt;
      if (this.mission.timeLeft <= 0) {
        this.showToast(`Misia zlyhala: ${this.mission.title} (čas vypršal)`, 'warning');
        this.cancelMission();
        return;
      }

      // GSL Courier Strict Delivery Rules (road-only, 0% vehicle damage, <= 5% package damage)
      const isGslMission = Boolean(this.activeStoryDef?.isGslCourier || this.mission.activeId === 'm21');
      if (this.gslState.active && isGslMission) {
        const van = this.vehicles.find((vh) => vh.id === this.gslState.vanId);
        if (!van || van.wrecked || van.health < 100) {
          this.failGslMission('Dodávka GSL utrpela poškodenie! Auto musí mať 0% poškodenia.');
          return;
        }
        const proj = projectPointOntoRoad(this.world.network, van.x, van.z);
        const edge = this.world.network.edges[proj.edgeId];
        const distFromRoad = Math.sqrt(proj.distSq);
        const maxRoadDist = (edge ? edge.width * 0.5 : 7) + 2.4;
        this.gslState.onRoad = distFromRoad <= maxRoadDist;

        if (this.gslState.graceTimer > 0) {
          this.gslState.graceTimer -= dt;
        } else if (!this.gslState.onRoad) {
          this.failGslMission('Zišiel si z cesty! Zásielka GSL sa smie viezť výhradne po ceste.');
          return;
        }

        if (this.currentVehicle && this.currentVehicle.id === van.id) {
          const speedMag = Math.hypot(van.vx, van.vz);
          const accelRate = dt > 0 ? Math.abs(speedMag - this.prevVehSpeed) / dt : 0;
          let dYaw = van.yaw - this.prevVehYaw;
          while (dYaw > Math.PI) dYaw -= Math.PI * 2;
          while (dYaw < -Math.PI) dYaw += Math.PI * 2;
          const latG = dt > 0 ? (Math.abs(dYaw) / dt) * speedMag : 0;

          const ctxNow = this.getActiveControlContext();
          const pad = navigator.getGamepads ? Array.from(navigator.getGamepads()).find((p) => p && p.connected) ?? null : null;
          const handbraking = this.isActionHeld(ctxNow, 'handbrake', pad) > 0.35 && speedMag > 8;

          let pkgDmgRate = 0;
          if (handbraking) pkgDmgRate += 0.32;
          if (latG > 13.5) pkgDmgRate += (latG - 13.5) * 0.045;
          if (accelRate > 17.5) pkgDmgRate += (accelRate - 17.5) * 0.035;
          if (van.vy < -5.5) pkgDmgRate += Math.abs(van.vy) * 0.08;

          if (pkgDmgRate > 0) {
            this.gslState.packageDamage = Math.min(6.0, this.gslState.packageDamage + pkgDmgRate * dt);
          }
          this.prevVehSpeed = speedMag;
          this.prevVehYaw = van.yaw;

          if (this.gslState.packageDamage > 5.0) {
            this.failGslMission('Balík GSL prekročil 5% poškodenia kvôli prudkým manévrom!');
            return;
          }
        }
      }

      const stage = this.activeStoryDef.stages[this.mission.stageIndex];
      if (!stage) return;

      this.world.missionBeacon.visible = true;
      this.world.missionBeacon.position.set(stage.targetX, (stage.targetY ?? 10) + 6, stage.targetZ);

      const distXZ = Math.hypot(px - stage.targetX, pz - stage.targetZ);
      const distY = stage.targetY !== undefined ? Math.abs(py - stage.targetY) : 0;
      const vehMatch =
        !stage.requiredVehicleKind ||
        Boolean(this.currentVehicle && VEHICLE_SPECS[this.currentVehicle.type].kind === stage.requiredVehicleKind);

      let stageDone = false;
      if (stage.kind === 'evade_wanted') {
        stageDone = distXZ < stage.radius && this.wantedStars === 0;
      } else if (stage.kind === 'deliver_car') {
        if (this.gslState.active && isGslMission) {
          stageDone =
            distXZ < stage.radius &&
            Boolean(this.currentVehicle && this.currentVehicle.id === this.gslState.vanId) &&
            (this.currentVehicle?.health ?? 0) >= 100 &&
            this.gslState.packageDamage <= 5.0 &&
            this.gslState.onRoad;
        } else {
          stageDone = distXZ < stage.radius && Boolean(this.currentVehicle);
        }
      } else if (stage.kind === 'fly_ring') {
        stageDone = distXZ < stage.radius && distY < 32 && vehMatch;
      } else {
        stageDone = distXZ < stage.radius && vehMatch;
      }

      if (stageDone) {
        if (this.mission.stageIndex < this.activeStoryDef.stages.length - 1) {
          this.mission.stageIndex++;
          const nextS = this.activeStoryDef.stages[this.mission.stageIndex];
          this.mission.objective = nextS.objective;
          this.mission.targetX = nextS.targetX;
          this.mission.targetY = nextS.targetY ?? null;
          this.mission.targetZ = nextS.targetZ;
          this.setGpsWaypoint(nextS.targetX, nextS.targetZ, this.mission.title);
          this.sound.playCashChime();
          this.showToast(`Postup: ${nextS.objective}`, 'info');
        } else {
          // Story or Hidden Mission Completed!
          const def = this.activeStoryDef;
          const hiddenId = this.activeHiddenId;
          const reward = def.reward;
          this.account.cash += reward;
          this.gainReputation(hiddenId ? 55 : 80);
          if (hiddenId) {
            if (!this.discoveredHiddenIds.includes(hiddenId)) this.discoveredHiddenIds.push(hiddenId);
            if (!this.completedHiddenIds.includes(hiddenId)) this.completedHiddenIds.push(hiddenId);
          } else if (!this.completedStoryIds.includes(def.id)) {
            this.completedStoryIds.push(def.id);
          }
          this.wantedStars = 0;
          this.wantedEvading = false;
          this.sound.playCashChime();
          if (this.ws && this.ws.readyState === WebSocket.OPEN && !hiddenId) {
            this.ws.send(JSON.stringify({ type: 'mission:complete', missionId: def.id, reward }));
          }
          this.cancelMission();
          this.saveGameState(true);

          if (def.outroLines.length > 0) {
            this.cutscene = {
              title: `${def.title} — DOKONČENÉ (+$${reward})`,
              lines: def.outroLines,
              stepIndex: 0,
              focusX: px,
              focusY: py + 1.5,
              focusZ: pz,
              onFinish: () => {
                this.showToast(`Misia splnená! Odmena +$${reward}`, 'success');
              },
            };
          } else {
            this.showToast(`Misia splnená! +$${reward} & Reputácia`, 'success');
          }
        }
      }
    } else {
      this.world.missionBeacon.visible = false;
    }
  }

  private updateGps(dt: number) {
    if (!this.gpsTarget) {
      this.world.gpsBeacon.visible = false;
      return;
    }
    this.world.gpsBeacon.visible = true;
    this.world.gpsBeacon.position.set(this.gpsTarget.x, 20, this.gpsTarget.z);

    this.gpsTimer += dt;
    if (this.gpsTimer >= 0.25) {
      this.gpsTimer = 0;
      this.recomputeGps();
      if (this.gpsDistance < 14 && !this.mission.activeId) {
        this.showToast(`Dorazil si do cieľa: ${this.gpsTarget.label}`, 'success');
        this.clearGpsWaypoint();
      }
    }
  }

  private findClearSpawnSpot(x: number, z: number, radius: number, actorY = 0): { x: number; z: number } {
    for (let ring = 0; ring <= 14; ring += 2.2) {
      const steps = ring === 0 ? 1 : 8;
      for (let s = 0; s < steps; s++) {
        const ang = (s / steps) * Math.PI * 2;
        const tx = x + Math.cos(ang) * ring;
        const tz = z + Math.sin(ang) * ring;
        if (this.world.isWaterAt(tx, tz)) continue;
        const res = this.resolveWorldCollision(tx, tz, radius, actorY);
        if (!res.hit) return { x: res.x, z: res.z };
      }
    }
    const fallback = this.resolveWorldCollision(x, z, radius, actorY);
    return { x: fallback.x, z: fallback.z };
  }

  private resolveWorldCollision(
    x: number,
    z: number,
    radius: number,
    actorY = 0,
  ): { x: number; z: number; hit: boolean; nx: number; nz: number } {
    let rx = x;
    let rz = z;
    let hit = false;
    let lastNx = 0;
    let lastNz = 1;

    this.world.queryNearbyColliders(rx, rz, _nearbyColliders);
    this.world.queryNearbyCircleColliders(rx, rz, _nearbyCircles);

    if (_nearbyColliders.length === 0 && _nearbyCircles.length === 0) {
      return { x: rx, z: rz, hit: false, nx: 0, nz: 1 };
    }

    for (let pass = 0; pass < 4; pass++) {
      let passHit = false;

      // 1. Nearby Oriented Bounding Boxes via 48m Spatial Hash Grid
      for (let i = 0; i < _nearbyColliders.length; i++) {
        const b = _nearbyColliders[i];
        if (actorY >= b.maxY - 0.5 || actorY + 1.8 <= b.minY) continue;

        const cos = b.cos ?? Math.cos(b.yaw);
        const sin = b.sin ?? Math.sin(b.yaw);
        const dx = rx - b.cx;
        const dz = rz - b.cz;
        const lx = dx * cos - dz * sin;
        const lz = dx * sin + dz * cos;

        const clampedX = THREE.MathUtils.clamp(lx, -b.halfW, b.halfW);
        const clampedZ = THREE.MathUtils.clamp(lz, -b.halfD, b.halfD);
        const px = lx - clampedX;
        const pz = lz - clampedZ;
        const distSq = px * px + pz * pz;

        if (distSq < radius * radius) {
          hit = true;
          passHit = true;
          let pushedLx = lx;
          let pushedLz = lz;
          let nLx = 0;
          let nLz = 1;
          const dist = Math.sqrt(distSq);
          if (dist > 0.0001) {
            const push = radius - dist;
            nLx = px / dist;
            nLz = pz / dist;
            pushedLx += nLx * push;
            pushedLz += nLz * push;
          } else {
            const penX = b.halfW - Math.abs(lx);
            const penZ = b.halfD - Math.abs(lz);
            if (penX < penZ) {
              nLx = lx >= 0 ? 1 : -1;
              nLz = 0;
              pushedLx = nLx * (b.halfW + radius);
            } else {
              nLx = 0;
              nLz = lz >= 0 ? 1 : -1;
              pushedLz = nLz * (b.halfD + radius);
            }
          }
          rx = b.cx + pushedLx * cos + pushedLz * sin;
          rz = b.cz - pushedLx * sin + pushedLz * cos;
          lastNx = nLx * cos + nLz * sin;
          lastNz = -nLx * sin + nLz * cos;
        }
      }

      // 2. Nearby Circle Colliders via 48m Spatial Hash Grid
      for (let i = 0; i < _nearbyCircles.length; i++) {
        const c = _nearbyCircles[i];
        if (actorY >= c.maxY - 0.5 || actorY + 1.8 <= c.minY) continue;
        const dx = rx - c.cx;
        const dz = rz - c.cz;
        const minR = c.r + radius;
        const distSq = dx * dx + dz * dz;
        if (distSq < minR * minR) {
          hit = true;
          passHit = true;
          const dist = Math.sqrt(distSq);
          const nx = dist > 0.0001 ? dx / dist : 1;
          const nz = dist > 0.0001 ? dz / dist : 0;
          rx = c.cx + nx * minR;
          rz = c.cz + nz * minR;
          lastNx = nx;
          lastNz = nz;
        }
      }

      if (!passHit) break;
    }
    return { x: rx, z: rz, hit, nx: lastNx, nz: lastNz };
  }

  private resolveVehicleWorldCollision(v: VehicleEntity): { hit: boolean; nx: number; nz: number } {
    const spec = VEHICLE_SPECS[v.type];
    const r = spec.width * 0.43;
    const fwdHalf = Math.max(0.35, spec.length * 0.5 - r * 0.92);
    const fx = Math.sin(v.yaw);
    const fz = Math.cos(v.yaw);
    const offsets = [0, fwdHalf, -fwdHalf];
    let hit = false;
    let hitNx = 0;
    let hitNz = 1;

    for (const off of offsets) {
      const sx = v.x + fx * off;
      const sz = v.z + fz * off;
      const res = this.resolveWorldCollision(sx, sz, r, v.y);
      if (res.hit) {
        hit = true;
        v.x += res.x - sx;
        v.z += res.z - sz;
        hitNx = res.nx;
        hitNz = res.nz;
      }
    }
    return { hit, nx: hitNx, nz: hitNz };
  }

  private resolveActorVsVehicles(
    x: number,
    z: number,
    radius: number,
    actorY: number,
    excludeVeh?: VehicleEntity,
  ): { x: number; z: number; hit: boolean } {
    let rx = x;
    let rz = z;
    let hit = false;
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      if (v === excludeVeh) continue;
      const spec = VEHICLE_SPECS[v.type];
      if (actorY >= v.y + spec.height + 0.3 || actorY + 1.8 <= v.y - 0.3) continue;

      const cos = Math.cos(v.yaw);
      const sin = Math.sin(v.yaw);
      const dx = rx - v.x;
      const dz = rz - v.z;
      const lx = dx * cos - dz * sin;
      const lz = dx * sin + dz * cos;
      const hw = spec.width * 0.47;
      const hd = spec.length * 0.48;
      const clampedX = THREE.MathUtils.clamp(lx, -hw, hw);
      const clampedZ = THREE.MathUtils.clamp(lz, -hd, hd);
      const px = lx - clampedX;
      const pz = lz - clampedZ;
      const distSq = px * px + pz * pz;
      if (distSq < radius * radius) {
        hit = true;
        let pushedLx = lx;
        let pushedLz = lz;
        const dist = Math.sqrt(distSq);
        if (dist > 0.0001) {
          const push = radius - dist;
          pushedLx += (px / dist) * push;
          pushedLz += (pz / dist) * push;
        } else {
          pushedLx = (lx >= 0 ? 1 : -1) * (hw + radius);
        }
        rx = v.x + pushedLx * cos + pushedLz * sin;
        rz = v.z - pushedLx * sin + pushedLz * cos;
      }
    }
    return { x: rx, z: rz, hit };
  }

  private raycastWorldColliders(origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number): number {
    let closest = maxDist;

    // Slab intersection against OBB colliders
    for (let i = 0; i < this.world.colliders.length; i++) {
      const b = this.world.colliders[i];
      const cos = Math.cos(b.yaw);
      const sin = Math.sin(b.yaw);
      const ox = origin.x - b.cx;
      const oz = origin.z - b.cz;
      const lox = ox * cos - oz * sin;
      const loz = ox * sin + oz * cos;
      const ldx = dir.x * cos - dir.z * sin;
      const ldz = dir.x * sin + dir.z * cos;

      let tmin = 0;
      let tmax = closest;

      const checkAxis = (p: number, d: number, minB: number, maxB: number): boolean => {
        if (Math.abs(d) < 1e-6) {
          return p >= minB && p <= maxB;
        }
        let t1 = (minB - p) / d;
        let t2 = (maxB - p) / d;
        if (t1 > t2) {
          const tmp = t1;
          t1 = t2;
          t2 = tmp;
        }
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        return tmin <= tmax;
      };

      if (!checkAxis(lox, ldx, -b.halfW, b.halfW)) continue;
      if (!checkAxis(origin.y, dir.y, b.minY, b.maxY)) continue;
      if (!checkAxis(loz, ldz, -b.halfD, b.halfD)) continue;
      if (tmin > 0 && tmin < closest) closest = tmin;
    }

    // Ray-circle intersection against pillars, fountain, trees & props
    for (let i = 0; i < this.world.circleColliders.length; i++) {
      const c = this.world.circleColliders[i];
      const ox = origin.x - c.cx;
      const oz = origin.z - c.cz;
      const a = dir.x * dir.x + dir.z * dir.z;
      if (a < 1e-6) continue;
      const halfB = ox * dir.x + oz * dir.z;
      const cc = ox * ox + oz * oz - c.r * c.r;
      const disc = halfB * halfB - a * cc;
      if (disc < 0) continue;
      const t = (-halfB - Math.sqrt(disc)) / a;
      if (t > 0 && t < closest) {
        const hitY = origin.y + dir.y * t;
        if (hitY >= c.minY && hitY <= c.maxY) {
          closest = t;
        }
      }
    }

    return closest;
  }

  private spawnSmoke(x: number, y: number, z: number) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xcbd5e1, transparent: true, opacity: 0.55 });
    const mesh = new THREE.Mesh(this.smokeGeo, mat);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this.particles.push({
      mesh,
      vx: (Math.random() - 0.5) * 1.4,
      vy: 1.5 + Math.random(),
      vz: (Math.random() - 0.5) * 1.4,
      life: 0.65,
      maxLife: 0.65,
    });
  }

  private spawnSparks(x: number, y: number, z: number, color: number, count: number) {
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
      const mesh = new THREE.Mesh(this.sparkGeo, mat);
      mesh.position.set(x, y, z);
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        vx: (Math.random() - 0.5) * 9,
        vy: 2 + Math.random() * 7,
        vz: (Math.random() - 0.5) * 9,
        life: 0.45,
        maxLife: 0.45,
      });
    }
  }

  private updateParticlesAndTracers(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }
      if (p.isWater) p.vy -= 14 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.scale.setScalar(1 + (1 - p.life / p.maxLife) * 1.2);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = (p.life / p.maxLife) * 0.72;
    }

    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      if (t.life <= 0) {
        this.scene.remove(t.line);
        t.line.geometry.dispose();
        (t.line.material as THREE.Material).dispose();
        this.tracers.splice(i, 1);
      }
    }
  }

  private updateCamera(dt: number) {
    const inCar = Boolean(this.currentVehicle);
    if (this.cameraMode === 'first') {
      if (inCar) {
        const v = this.currentVehicle!;
        const spec = VEHICLE_SPECS[v.type];
        const eyeY = v.y + spec.height * 0.86;
        const fwdX = Math.sin(v.yaw);
        const fwdZ = Math.cos(v.yaw);
        this.camera.position.set(v.x + fwdX * 0.4, eyeY, v.z + fwdZ * 0.4);
        _camLook.set(v.x + fwdX * 30, eyeY + Math.sin(v.pitch) * 15, v.z + fwdZ * 30);
        this.camera.lookAt(_camLook);
      } else {
        const eyeY = this.playerY + 1.66;
        this.camera.position.set(this.playerX, eyeY, this.playerZ);
        _camLook.set(
          this.playerX - Math.sin(this.camYaw) * 20,
          eyeY - Math.sin(this.camPitch) * 15,
          this.playerZ - Math.cos(this.camYaw) * 20,
        );
        this.camera.lookAt(_camLook);
        const fpFov = this.isAiming ? 46 : 60;
        if (Math.abs(this.camera.fov - fpFov) > 0.05) {
          this.camera.fov = THREE.MathUtils.damp(this.camera.fov, fpFov, 11, dt);
          this.camera.updateProjectionMatrix();
        }
      }
      this.sunLight.target.position.set(this.camera.position.x, 0, this.camera.position.z);
      this.sunLight.target.updateMatrixWorld();
      return;
    }

    // Third Person Camera: over-the-shoulder ADS when aiming on foot, smooth follow otherwise!
    const adsOnFoot = !inCar && this.isAiming;
    const targetX = inCar ? this.currentVehicle!.x : this.playerX;
    const rawTargetY =
      (inCar ? this.currentVehicle!.y : this.playerY) + (inCar ? 1.8 : adsOnFoot ? 1.6 : 1.75);
    this.smoothCamY = THREE.MathUtils.damp(this.smoothCamY, rawTargetY, adsOnFoot ? 20 : 16, dt);
    const targetY = this.smoothCamY;
    const targetZ = inCar ? this.currentVehicle!.z : this.playerZ;

    if (inCar && !this.isDraggingLook && this.manualLookCooldown <= 0) {
      const desiredYaw = this.currentVehicle!.yaw + Math.PI;
      let diff = desiredYaw - this.camYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.camYaw += diff * Math.min(1, dt * 12);
    }

    const spec = inCar ? VEHICLE_SPECS[this.currentVehicle!.type] : null;
    const dist = inCar
      ? spec?.kind === 'plane' || spec?.kind === 'helicopter'
        ? 14.5
        : 9.6
      : adsOnFoot
        ? 2.65
        : 5.2;
    const horiz = Math.cos(this.camPitch) * dist;
    const vert = Math.sin(this.camPitch) * dist + (adsOnFoot ? 0.16 : 1.25);

    const shoulderRight = adsOnFoot ? 0.68 : 0;
    const rightX = Math.cos(this.camYaw) * shoulderRight;
    const rightZ = -Math.sin(this.camYaw) * shoulderRight;

    _camDesired.set(
      targetX + Math.sin(this.camYaw) * horiz + rightX,
      Math.max(1.15, targetY + vert),
      targetZ + Math.cos(this.camYaw) * horiz + rightZ,
    );

    const dampK = inCar ? 18 : adsOnFoot ? 22 : 16;
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _camDesired.x, dampK, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _camDesired.y, dampK, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _camDesired.z, dampK, dt);

    _camLook.set(targetX + rightX, targetY, targetZ + rightZ);
    this.camera.lookAt(_camLook);

    this.sunLight.target.position.set(targetX, 0, targetZ);
    this.sunLight.target.updateMatrixWorld();

    const speedMag = inCar ? Math.hypot(this.currentVehicle!.vx, this.currentVehicle!.vz) : 0;
    const targetFov = inCar ? 62 + Math.min(18, speedMag * 0.25) : adsOnFoot ? 44 : 60;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, adsOnFoot ? 11 : 7, dt);
      this.camera.updateProjectionMatrix();
    }
  }

  private applyAtmosphere() {
    const h = this.timeHour;
    let sunIntensity = 1.25;
    let hemiIntensity = 0.5;
    let nightFactor = 0;

    if (h >= 5 && h < 9) {
      const t = (h - 5) / 4;
      _skyColor.copy(_nightSky).lerp(_dawnSky, t);
      this.sunLight.color.copy(_sunNight).lerp(_sunDawn, t);
      sunIntensity = 0.36 + t * 0.6;
      hemiIntensity = 0.3 + t * 0.16;
      nightFactor = 1 - t * 0.85;
    } else if (h >= 9 && h < 16) {
      _skyColor.copy(_noonSky);
      this.sunLight.color.copy(_sunNoon);
      sunIntensity = 1.04;
      hemiIntensity = 0.48;
      nightFactor = 0;
    } else if (h >= 16 && h < 20) {
      const t = (h - 16) / 4;
      _skyColor.copy(_goldenSky).lerp(_nightSky, Math.max(0, t - 0.4) / 0.6);
      this.sunLight.color.copy(_sunGolden).lerp(_sunNight, Math.max(0, t - 0.5) * 2);
      sunIntensity = 0.96 - t * 0.64;
      hemiIntensity = 0.46 - t * 0.18;
      nightFactor = t;
    } else {
      _skyColor.copy(_nightSky);
      this.sunLight.color.copy(_sunNight);
      sunIntensity = 0.32;
      hemiIntensity = 0.28;
      nightFactor = 1;
    }

    const weatherDim = 1 - this.cloudFactor * 0.34 - this.stormFactor * 0.24;
    const sunBoost = this.lightningFlash * 2.2;
    const windowEmissive = 0.02 + Math.max(nightFactor, this.stormFactor * 0.65) * 0.72;

    if (this.stormFactor > 0.1 || this.fogFactor > 0.1 || this.cloudFactor > 0.35) {
      _skyColor.lerp(_stormTint, this.cloudFactor * 0.45 + this.stormFactor * 0.35);
      _skyColor.lerp(_fogTint, this.fogFactor * 0.55);
    }
    if (this.lightningFlash > 0.05) {
      _skyColor.lerp(_lightningTint, this.lightningFlash * 0.65);
    }

    (this.scene.background as THREE.Color).copy(_skyColor);
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.copy(_skyColor);
      this.scene.fog.near = Math.max(18, 680 - nightFactor * 180 - this.fogFactor * 540 - this.rainFactor * 160);
      this.scene.fog.far = Math.max(240, 3800 - nightFactor * 900 - this.fogFactor * 2850 - this.rainFactor * 950);
    }

    const sunAngle = ((h - 6) / 12) * Math.PI;
    const sunX = Math.cos(sunAngle) * 220;
    const sunY = Math.max(30, Math.sin(sunAngle) * 190);
    const sunZ = 90;
    this.sunLight.position.set(sunX, sunY, sunZ);
    this.sunLight.intensity = sunIntensity * weatherDim + sunBoost;
    this.hemiLight.intensity = hemiIntensity * (1 - this.stormFactor * 0.22) + this.lightningFlash * 0.6;

    const skyUniforms = this.world.skyDomeMat.uniforms;
    (skyUniforms.uHorizonColor.value as THREE.Color).copy(_skyColor);
    (skyUniforms.uZenithColor.value as THREE.Color).copy(_skyColor).multiplyScalar(nightFactor > 0.6 ? 0.35 : 0.48);
    (skyUniforms.uSunDir.value as THREE.Vector3).set(sunX, sunY, sunZ).normalize();
    (skyUniforms.uSunColor.value as THREE.Color).copy(this.sunLight.color);
    skyUniforms.uNightFactor.value = nightFactor;

    if (Math.abs(windowEmissive - this.atmoLastWindowEmissive) > 0.008) {
      this.atmoLastWindowEmissive = windowEmissive;
      for (let i = 0; i < this.world.buildingEmissiveMats.length; i++) {
        this.world.buildingEmissiveMats[i].emissiveIntensity = windowEmissive;
      }
    }
    const bulbEmissive = 0.12 + Math.max(nightFactor, this.stormFactor * 0.8) * 1.25;
    if (Math.abs(bulbEmissive - this.atmoLastBulbEmissive) > 0.008) {
      this.atmoLastBulbEmissive = bulbEmissive;
      for (let i = 0; i < this.world.streetLightBulbs.length; i++) {
        this.world.streetLightBulbs[i].emissiveIntensity = bulbEmissive;
      }
    }
    const headEmissive = 0.2 + Math.max(nightFactor, this.rainFactor * 0.85, this.fogFactor * 0.9) * 1.05;
    if (Math.abs(headEmissive - this.atmoLastHeadlightEmissive) > 0.008) {
      this.atmoLastHeadlightEmissive = headEmissive;
      for (let i = 0; i < this.vehicles.length; i++) {
        this.vehicles[i].rig.headlightMat.emissiveIntensity = headEmissive;
      }
    }
  }

  // --- Gemini AI Director, Live NPC Chat & Dynamic Mission Generation ---

  private recordWorldEvent(ev: string) {
    this.recentWorldEvents.unshift(ev);
    if (this.recentWorldEvents.length > 5) this.recentWorldEvents.pop();
  }

  private findClosestInteractableNpc(): NpcEntity | null {
    if (this.currentVehicle || this.wasted) return null;
    let best: NpcEntity | null = null;
    let bestD = 5.4;
    for (const npc of this.npcs) {
      if (npc.dead) continue;
      const d = Math.hypot(npc.x - this.playerX, npc.z - this.playerZ);
      if (d < bestD && Math.abs(npc.y - this.playerY) < 2.6) {
        bestD = d;
        best = npc;
      }
    }
    return best;
  }

  public interactWithNearbyNpc() {
    const npc = this.findClosestInteractableNpc();
    if (!npc) return;
    this.onOpenNpcChat?.({ id: npc.id, name: npc.name, role: npc.role, mood: npc.mood });
  }

  private async safeFetchJson(
    url: string,
    options?: RequestInit,
  ): Promise<{ ok: boolean; status: number; data: any; rawError?: string }> {
    try {
      const resp = await fetch(url, options);
      const rawText = await resp.text();
      if (!rawText || !rawText.trim()) {
        return {
          ok: false,
          status: resp.status,
          data: null,
          rawError: `Empty response (${resp.status})`,
        };
      }
      try {
        const parsed = JSON.parse(rawText);
        return { ok: resp.ok, status: resp.status, data: parsed };
      } catch {
        return {
          ok: false,
          status: resp.status,
          data: null,
          rawError: `Server unavailable (${resp.status})`,
        };
      }
    } catch (err: any) {
      return {
        ok: false,
        status: 0,
        data: null,
        rawError: err?.message || 'Network error',
      };
    }
  }

  private async updateAiDirector(dt: number) {
    this.aiDirectorTimer -= dt;
    if (this.aiDirectorTimer > 0 || this.aiDirectorInFlight) return;
    this.aiDirectorTimer = 10.5;
    this.aiDirectorInFlight = true;

    const px = this.currentVehicle ? this.currentVehicle.x : this.playerX;
    const pz = this.currentVehicle ? this.currentVehicle.z : this.playerZ;
    const nearbyPayload = this.npcs
      .filter((n) => !n.dead)
      .map((n) => ({
        npc: n,
        dist: Math.round(Math.hypot(n.x - px, n.z - pz)),
      }))
      .filter((item) => item.dist <= 165)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 6)
      .map(({ npc, dist }) => ({
        id: npc.id,
        name: npc.name,
        role: npc.role,
        dist,
        behavior: npc.behavior,
        isCop: npc.isCop,
      }));

    if (nearbyPayload.length === 0) {
      this.aiDirectorInFlight = false;
      return;
    }

    try {
      const speedKmh = this.currentVehicle
        ? Math.round(Math.hypot(this.currentVehicle.vx, this.currentVehicle.vz) * 3.6)
        : 0;
      const res = await this.safeFetchJson('/api/ai/npc-director', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: this.language,
          weatherPreset: this.weatherPreset,
          weatherLabel: getWeatherLabel(this.weatherPreset, this.language),
          timeHour: this.timeHour,
          wantedStars: this.wantedStars,
          characterName: CHARACTERS[this.characterId].name,
          playerInVehicle: Boolean(this.currentVehicle),
          vehicleName: this.currentVehicle ? VEHICLE_SPECS[this.currentVehicle.type].name : '',
          playerSpeedKmh: speedKmh,
          playerWeapon: this.weaponId,
          activeMissionTitle: this.mission.title,
          recentEvents: this.recentWorldEvents,
          nearbyNpcs: nearbyPayload,
        }),
      });
      if (!res.ok || !res.data) {
        this.aiDirectorStatus = 'error';
        this.aiDirectorError = String(res.data?.error || res.rawError || `HTTP ${res.status}`);
        return;
      }

      const data = res.data;
      this.aiDirectorStatus = 'active';
      this.aiDirectorError = '';
      if (data.bulletin) this.aiBulletin = String(data.bulletin);
      if (data.policeTactic) this.aiPoliceTactic = String(data.policeTactic);

      if (Array.isArray(data.npcActions)) {
        for (const act of data.npcActions) {
          const targetNpc = this.npcs.find((n) => n.id === Number(act.id));
          if (!targetNpc || targetNpc.dead) continue;
          if (act.behavior) targetNpc.behavior = act.behavior as NpcBehaviorState;
          if (act.line) targetNpc.reactionLine = String(act.line);
          if (act.mood) targetNpc.mood = String(act.mood);
          targetNpc.behaviorTimer = 11;
        }
      }
    } catch (err: any) {
      this.aiDirectorStatus = 'error';
      this.aiDirectorError = err?.message || 'AI Dispatch connection failed.';
    } finally {
      this.aiDirectorInFlight = false;
    }
  }

  public async sendAiChat(
    target: 'copilot' | { npcId: number; npcName: string; npcRole: string; npcMood: string },
    playerMessage: string,
  ): Promise<{ reply: string; mood?: string; tip?: string; error?: string }> {
    const px = this.currentVehicle ? this.currentVehicle.x : this.playerX;
    const pz = this.currentVehicle ? this.currentVehicle.z : this.playerZ;
    let nearestLandmark = 'Palmetto Bay';
    let bestD = Infinity;
    for (const s of SHOPS) {
      const d = Math.hypot(s.x - px, s.z - pz);
      if (d < bestD) {
        bestD = d;
        nearestLandmark = s.name;
      }
    }

    const res = await this.safeFetchJson('/api/ai/npc-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: this.language,
        speakerType: target === 'copilot' ? 'copilot' : 'npc',
        npcName: target === 'copilot' ? 'Palmetto AI' : target.npcName,
        npcRole: target === 'copilot' ? 'Tactical AI Assistant' : target.npcRole,
        npcMood: target === 'copilot' ? 'focused' : target.npcMood,
        playerMessage,
        context: {
          characterName: CHARACTERS[this.characterId].name,
          weatherLabel: getWeatherLabel(this.weatherPreset, this.language),
          timeHour: this.timeHour,
          wantedStars: this.wantedStars,
          cash: this.account.cash,
          activeMission: this.mission.title,
          nearbyLandmark: nearestLandmark,
        },
      }),
    });
    if (!res.ok || !res.data) {
      return { reply: '', error: String(res.data?.error || res.rawError || `AI Error (${res.status})`) };
    }

    const data = res.data;
    if (target !== 'copilot') {
      const npc = this.npcs.find((n) => n.id === target.npcId);
      if (npc && !npc.dead) {
        if (data.newBehavior) npc.behavior = data.newBehavior as NpcBehaviorState;
        if (data.mood) npc.mood = String(data.mood);
        npc.reactionLine = String(data.reply || '').slice(0, 85);
        npc.behaviorTimer = 14;
      }
    }

    return {
      reply: String(data.reply || ''),
      mood: data.mood ? String(data.mood) : undefined,
      tip: data.tip ? String(data.tip) : undefined,
    };
  }

  public async generateAndStartAiMission(
    theme: string,
  ): Promise<{ ok: boolean; title?: string; error?: string }> {
    const locations = [
      ...SHOPS.map((s) => ({ name: s.name, kind: s.category, x: s.x, z: s.z })),
      ...this.world.network.nodes.slice(0, 20).map((n) => ({
        name: n.name || `Junction #${n.id}`,
        kind: 'road_node',
        x: n.x,
        z: n.z,
      })),
    ];

    const res = await this.safeFetchJson('/api/ai/generate-mission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme, locations, language: this.language }),
    });
    if (!res.ok || !res.data?.mission) {
      return {
        ok: false,
        error: String(res.data?.error || res.rawError || 'Failed to generate AI mission.'),
      };
    }
    const m = res.data.mission as StoryMissionDef & { recommendedWeather?: WeatherPreset };
    if (m.recommendedWeather) {
      this.targetWeatherPreset = m.recommendedWeather;
    }
    this.launchStoryMissionDef(m);
    return { ok: true, title: m.title };
  }

  private getSingleFireLabel(ctx: ControlContextId): string {
    if (this.activeInputDevice === 'keyboard') {
      return this.language === 'sk' || this.language === 'cs'
        ? 'Ľavý klik'
        : this.language === 'de'
          ? 'Linksklick'
          : this.language === 'es'
            ? 'Clic Izq.'
            : this.language === 'pl'
              ? 'Lewy klik'
              : 'Left Click';
    }
    return getActiveBindingLabel(ctx, 'fire', this.activeInputDevice, this.controlsConfig, this.language);
  }

  private getSingleNpcTalkLabel(): string {
    if (this.activeInputDevice === 'touch') return getUi(this.language).touchTalk;
    if (this.activeInputDevice === 'keyboard') return 'G';
    if (this.activeInputDevice === 'playstation') return 'L3';
    return 'LS';
  }

  private getContextualPrompt(nearbyShop: ShopLocation | null, insideShop: ShopLocation | null): string {
    const dev = this.activeInputDevice;
    const lang = this.language;
    const ctx = this.getActiveControlContext();
    const bind = (action: ControlActionId, customCtx: ControlContextId = ctx) =>
      getActiveBindingLabel(customCtx, action, dev, this.controlsConfig, lang);
    const sk = lang === 'sk' || lang === 'cs';
    const isTouch = dev === 'touch';

    const elev = this.getNearbyElevator();
    if (elev) {
      if (isTouch) {
        return `${elev.name} (${elev.floorNames[elev.currentFloorIdx]})`;
      }
      const k = bind('interact', 'on_foot');
      return sk
        ? `Výťah ${elev.name} (${elev.floorNames[elev.currentFloorIdx]}) · Stlač [${k}]`
        : `Elevator ${elev.name} (${elev.floorNames[elev.currentFloorIdx]}) · Press [${k}]`;
    }
    if (insideShop) {
      const k = bind('interact', 'on_foot');
      if (insideShop.category === 'customs') {
        const refVeh = this.currentVehicle ?? this.findNearestPlayerVehicle(18);
        if (refVeh && this.isPointInCustomsBay(refVeh.x, refVeh.z, insideShop.id)) {
          return isTouch
            ? `${insideShop.name} · Tuning`
            : sk
              ? `Vozidlo na zdviháku Apex Customs · Stlač [${k}] pre Tuning`
              : `Vehicle on Apex Customs lift · Press [${k}] for Tuning`;
        }
        return sk
          ? `Apex Customs · Vojdi sem autom na zdvihák pre otvorenie tuningu`
          : `Apex Customs · Drive a car onto the lift for Tuning`;
      }
      if (insideShop.category === 'armory') {
        if (isTouch) return `${insideShop.name}`;
        const fKey = this.getSingleFireLabel('on_foot');
        return sk
          ? `Vnútri ${insideShop.name} · Strieľaj [${fKey}] alebo [${k}] pre nákup`
          : `Inside ${insideShop.name} · Shoot [${fKey}] or press [${k}] to shop`;
      }
      if (isTouch) return `${insideShop.name}`;
      return sk
        ? `Vnútri ${insideShop.name} · Stlač [${k}] pre ponuku`
        : `Inside ${insideShop.name} · Press [${k}] for Menu`;
    }
    if (nearbyShop) {
      if (nearbyShop.category === 'customs') {
        return sk
          ? `${nearbyShop.name} · Vojdi autom priamo dnu na zdvihák pre Tuning`
          : `${nearbyShop.name} · Drive inside onto the lift for Tuning`;
      }
      if (isTouch) return nearbyShop.name;
      const k = bind('interact', 'on_foot');
      return sk
        ? `Stlač [${k}] — Otvoriť ${nearbyShop.name}`
        : `Press [${k}] — Open ${nearbyShop.name}`;
    }
    if (!this.currentVehicle && this.nearbyHiddenMission && !this.mission.activeId) {
      const mTitle = getLocalizedMissionTitle(this.nearbyHiddenMission.id, this.nearbyHiddenMission.title, lang);
      if (isTouch) return '';
      const k = bind('interact', 'on_foot');
      return sk
        ? `Náhodná misia: ${mTitle} ($${this.nearbyHiddenMission.reward}) · Stlač [${k}]`
        : `Side Challenge: ${mTitle} ($${this.nearbyHiddenMission.reward}) · Press [${k}]`;
    }
    if (this.currentVehicle) {
      if (isTouch) return '';
      const spec = VEHICLE_SPECS[this.currentVehicle.type];
      const exitK = bind('interact');
      const camK = bind('camera');
      const fireK = this.getSingleFireLabel(ctx);
      if (spec.hasWaterCannon) {
        return sk
          ? `[${exitK}] Vystúpiť · [${fireK}] Vodné delo · [${camK}] Kamera`
          : `[${exitK}] Exit · [${fireK}] Water Cannon · [${camK}] Camera`;
      }
      if (spec.hasWeapons) {
        const upK = bind('pitchUp');
        const dnK = bind('pitchDown');
        return sk
          ? `[${upK}] Nos hore · [${dnK}] Nos dole · [${fireK}] Kanóny · [${exitK}] Vystúpiť`
          : `[${upK}] Nose Up · [${dnK}] Nose Down · [${fireK}] Cannons · [${exitK}] Exit`;
      }
      if (spec.kind === 'plane' || spec.kind === 'helicopter') {
        const upK = bind('pitchUp');
        const dnK = bind('pitchDown');
        return sk
          ? `[${upK}] Nos hore · [${dnK}] Nos dole · [${exitK}] Vystúpiť · [${camK}] Kamera`
          : `[${upK}] Nose Up · [${dnK}] Nose Down · [${exitK}] Exit · [${camK}] Camera`;
      }
      const hbK = bind('handbrake');
      const radK = bind('radio');
      return sk
        ? `[${exitK}] Vystúpiť · [${hbK}] Ručná brzda · [${radK}] Rádio · [${camK}] Kamera`
        : `[${exitK}] Exit · [${hbK}] Handbrake · [${radK}] Radio · [${camK}] Camera`;
    }
    if (!this.onGround && this.account.hasParachute && !this.parachuteOpen) {
      if (isTouch) return '';
      const chuteK = bind('jump', 'on_foot');
      return sk ? `Stlač [${chuteK}] pre otvorenie padáku!` : `Press [${chuteK}] to deploy parachute!`;
    }
    for (const v of this.vehicles) {
      if (!v.wrecked && Math.hypot(v.x - this.playerX, v.z - this.playerZ) < 5.6 && Math.abs(v.y - this.playerY) < 3.5) {
        if (isTouch) return VEHICLE_SPECS[v.type].name;
        const k = bind('interact', 'on_foot');
        return sk
          ? `Stlač [${k}] — Nastúpiť do ${VEHICLE_SPECS[v.type].name}`
          : `Press [${k}] — Enter ${VEHICLE_SPECS[v.type].name}`;
      }
    }
    const talkNpc = this.findClosestInteractableNpc();
    if (talkNpc) {
      if (isTouch) return '';
      const talkK = this.getSingleNpcTalkLabel();
      return sk
        ? `Stlač [${talkK}] — Osloviť ${talkNpc.name} (${talkNpc.role})`
        : `Press [${talkK}] — Talk to ${talkNpc.name} (${talkNpc.role})`;
    }
    return '';
  }

  private emitHud() {
    const px = this.currentVehicle ? this.currentVehicle.x : this.playerX;
    const py = this.currentVehicle ? this.currentVehicle.y : this.playerY;
    const pz = this.currentVehicle ? this.currentVehicle.z : this.playerZ;
    const { nearby, inside } = this.getNearbyShop();

    const blips: MinimapBlip[] = [];
    SHOPS.forEach((s) => {
      blips.push({
        id: s.id,
        x: s.x,
        z: s.z,
        type: 'shop',
        color: s.color,
        label: s.name,
        category: s.category,
      });
    });

    this.vehicles.forEach((v) => {
      if (v === this.currentVehicle || v.wrecked) return;
      if (v.isPolice && this.wantedStars > 0) {
        blips.push({ x: v.x, z: v.z, type: 'police', color: '#ef4444' });
      } else {
        blips.push({ x: v.x, z: v.z, type: 'car', color: '#94a3b8' });
      }
    });

    const onlineFriends: RemoteFriendInfo[] = [];
    this.remotePlayers.forEach((rp) => {
      onlineFriends.push({
        id: rp.id,
        handle: rp.handle,
        characterId: rp.characterId,
        x: rp.x,
        z: rp.z,
      });
      blips.push({
        id: rp.id,
        x: rp.x,
        z: rp.z,
        type: 'friend',
        color: '#22c55e',
        label: rp.handle,
      });
    });

    if (this.mission.targetX !== null && this.mission.targetZ !== null) {
      blips.push({ x: this.mission.targetX, z: this.mission.targetZ, type: 'target', color: '#facc15' });
    }
    if (this.gpsTarget) {
      blips.push({
        x: this.gpsTarget.x,
        z: this.gpsTarget.z,
        type: 'waypoint',
        color: '#22d3ee',
        label: this.gpsTarget.label,
      });
    }

    const speedKmh = this.currentVehicle
      ? Math.round(Math.hypot(this.currentVehicle.vx, this.currentVehicle.vz) * 3.6)
      : 0;

    const ui = getUi(this.language);
    const radioName =
      this.radioId === 'off'
        ? ui.radioOffName
        : RADIO_STATIONS.find((r) => r.id === this.radioId)?.name ?? ui.radioOffName;
    const refVeh = this.currentVehicle ?? this.findNearestPlayerVehicle(18);
    const cutsceneView: CutsceneViewState = this.cutscene
      ? {
          active: true,
          title: this.cutscene.title,
          speaker: this.cutscene.lines[this.cutscene.stepIndex]?.speaker ?? '',
          text: this.cutscene.lines[this.cutscene.stepIndex]?.text ?? '',
          stepIndex: this.cutscene.stepIndex,
          totalSteps: this.cutscene.lines.length,
        }
      : { active: false, title: '', speaker: '', text: '', stepIndex: 0, totalSteps: 0 };

    const aiNearbyNpcs: AiNpcFeedItem[] = this.npcs
      .filter((n) => !n.dead)
      .map((n) => ({
        id: n.id,
        name: n.name,
        role: n.role,
        behavior: n.behavior,
        line: n.reactionLine,
        dist: Math.round(Math.hypot(n.x - px, n.z - pz)),
      }))
      .filter((item) => item.dist <= 95 && (item.line.length > 0 || item.behavior !== 'patrol'))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 4);

    const talkNpc = this.findClosestInteractableNpc();

    const gslVan = this.gslState.active
      ? this.vehicles.find((v) => v.id === this.gslState.vanId)
      : null;
    const gslMission: GslMissionTelemetry | null = this.gslState.active
      ? {
          active: true,
          carDamagePct: Math.max(0, Math.round(100 - (gslVan?.health ?? 100))),
          packageDamagePct: Number(this.gslState.packageDamage.toFixed(2)),
          maxPackageDamagePct: 5.0,
          onRoad: this.gslState.onRoad,
        }
      : null;

    const aimTargetType =
      !this.currentVehicle && !this.wasted && this.weaponId !== 'fists'
        ? this.computeCrosshairAimTarget(WEAPONS[this.weaponId].range).targetType
        : 'none';

    if (!this.cachedControlsSnapshot) {
      this.cachedControlsSnapshot = JSON.parse(JSON.stringify(this.controlsConfig)) as ControlsConfig;
    }

    const profile = CHARACTERS[this.characterId];
    const charCopy = getLocalizedCharacterCopy(this.characterId, this.language);
    const missionCopy = {
      ...this.mission,
      title: this.mission.activeId
        ? getLocalizedMissionTitle(this.mission.activeId, this.mission.title, this.language)
        : ui.freeRoamTitle,
      objective: this.mission.activeId ? this.mission.objective : ui.freeRoamObjective,
    };

    this.onHudUpdate({
      characterId: this.characterId,
      characterName: profile.name,
      characterRole: charCopy.role,
      characterTheme: profile.uiTheme,
      characterLifeStory: charCopy.story,
      characterHomeName: charCopy.homeName,
      reputation: this.account.reputation,
      reputationRank: getLocalizedRank(this.account.reputation, this.characterId, this.language),
      customization: { ...this.account.customization },
      skills: { ...this.account.skills },
      health: Math.round(this.health),
      armor: Math.round(this.armor),
      cash: this.account.cash,
      bankBalance: this.account.bankBalance,
      godMode: this.godMode,
      hasParachute: this.account.hasParachute,
      parachuteReady: !this.currentVehicle && !this.onGround && this.account.hasParachute && !this.parachuteOpen,
      parachuteOpen: this.parachuteOpen,
      wantedStars: this.wantedStars,
      wantedEvading: this.wantedEvading,
      inVehicle: Boolean(this.currentVehicle),
      vehicleKind: this.currentVehicle ? VEHICLE_SPECS[this.currentVehicle.type].kind : null,
      vehicleName: this.currentVehicle ? VEHICLE_SPECS[this.currentVehicle.type].name : '',
      vehicleSpeedKmh: speedKmh,
      vehicleAltitude: Math.max(0, Math.round(py)),
      vehicleHealth: this.currentVehicle ? Math.round(this.currentVehicle.health) : 100,
      vehicleOnFire: Boolean(this.currentVehicle?.onFire),
      vehicleWaterDisabled: Boolean(this.currentVehicle?.waterDisabled),
      vehicleUpgrades: refVeh
        ? { ...refVeh.upgrades }
        : { engineLevel: 0, turboInstalled: false, handlingLevel: 0, neonColor: 'off' },
      cameraMode: this.cameraMode,
      weaponId: this.weaponId,
      weaponName: WEAPONS[this.weaponId].name,
      aimState: {
        isAiming: this.isAiming,
        targetType: aimTargetType,
        hitMarker: this.hitMarkerTimer > 0,
      },
      ammo: { ...this.account.ammo },
      unlockedWeapons: { ...this.account.unlockedWeapons },
      radioId: this.radioId,
      radioName,
      timePreset: this.timePreset,
      timeHour: this.timeHour,
      autoTimeCycle: this.autoTimeCycle,
      weatherPreset: this.weatherPreset,
      targetWeatherPreset: this.targetWeatherPreset,
      weatherLabel: getWeatherLabel(this.weatherPreset, this.language),
      autoWeatherCycle: this.autoWeatherCycle,
      rainIntensity: this.rainFactor,
      aiDirectorStatus: this.aiDirectorStatus,
      aiDirectorError: this.aiDirectorError,
      aiBulletin: this.aiBulletin,
      aiPoliceTactic: this.aiPoliceTactic,
      aiNearbyNpcs,
      nearbyInteractNpc: talkNpc
        ? { id: talkNpc.id, name: talkNpc.name, role: talkNpc.role, mood: talkNpc.mood }
        : null,
      quality: this.quality,
      fps: this.currentFps,
      promptText: this.getContextualPrompt(nearby, inside),
      nearbyShop: nearby,
      insideShop: inside,
      nearbyHiddenMission: this.nearbyHiddenMission,
      toastText: this.toastText,
      toastType: this.toastType,
      mission: missionCopy,
      gslMission,
      completedStoryIds: [...this.completedStoryIds],
      discoveredHiddenIds: [...this.discoveredHiddenIds],
      completedHiddenIds: [...this.completedHiddenIds],
      cutscene: cutsceneView,
      playerX: px,
      playerY: py,
      playerZ: pz,
      playerYaw: this.currentVehicle ? this.currentVehicle.yaw : this.playerYaw,
      blips,
      gpsTarget: this.gpsTarget,
      gpsRoute: this.gpsRoute,
      gpsDistance: this.gpsDistance,
      gpsTurnHint: this.gpsTurnHint,
      pointerLocked: this.pointerLocked,
      wasted: this.wasted,
      soundMuted: this.sound.isMuted(),
      gamepadConnected: this.gamepadConnected,
      activeInputDevice: this.activeInputDevice,
      detectedGamepadType: this.detectedGamepadType,
      gamepadLayoutPreference: this.gamepadLayoutPreference,
      detectedPlatform: this.detectedPlatform,
      uiModePreference: this.uiModePreference,
      isMobileUi: this.getIsMobileUi(),
      steeringSensitivity: this.steeringSensitivity,
      lookSensitivity: this.lookSensitivity,
      language: this.language,
      cloudSyncId: this.cloudSyncId,
      cloudLastSavedAt: this.cloudLastSavedAt,
      activeControlContext: this.getActiveControlContext(),
      controlsConfig: this.cachedControlsSnapshot,
      playerHandle: this.playerHandle,
      friends: [...this.friends],
      onlineFriends,
      pendingInvite: this.pendingInvite,
      ownedVehicles: [...this.account.ownedVehicles],
    });
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.frameId);
    try {
      this.ws?.close();
    } catch {
      // Ignore
    }

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('wheel', this.handleWheel);
    window.removeEventListener('gamepadconnected', this.handleGamepadChange);
    window.removeEventListener('gamepaddisconnected', this.handleGamepadChange);
    window.removeEventListener('blur', this.handleWindowBlur);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    this.coarseMediaQuery?.removeEventListener('change', this.handlePointerMediaChange);

    const canvas = this.renderer.domElement;
    canvas.removeEventListener('mousedown', this.handleCanvasMouseDown);
    canvas.removeEventListener('pointerdown', this.handleCanvasPointerDown);
    canvas.removeEventListener('pointermove', this.handleCanvasPointerMove);
    canvas.removeEventListener('pointerup', this.handleCanvasPointerUp);
    canvas.removeEventListener('pointercancel', this.handleCanvasPointerUp);
    canvas.removeEventListener('contextmenu', this.handleContextMenu);
    canvas.removeEventListener('webglcontextlost', this.handleContextLost);

    this.rainGeo?.dispose();
    this.rainMat?.dispose();
    this.sound.dispose();
    this.textures.dispose();
    this.envRT?.dispose();
    this.renderer.dispose();
    if (canvas.parentElement === this.container) {
      this.container.removeChild(canvas);
    }
  }
}
