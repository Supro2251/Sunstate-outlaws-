import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SoundEngine } from './audio';
import { HIDDEN_MISSIONS, STORY_MISSIONS } from './missions';
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
import { computeGpsRoute, RoadNetwork } from './roadNetwork';
import { createProceduralTextures, ProceduralTexturePack } from './textures';
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
  GpsPoint,
  HudSnapshot,
  MinimapBlip,
  NeonColorId,
  NpcBehaviorState,
  PendingCoopInvite,
  QualityLevel,
  RADIO_STATIONS,
  RadioStationId,
  RemoteFriendInfo,
  ShopLocation,
  SHOPS,
  StoryMissionDef,
  TimePreset,
  VEHICLE_SPECS,
  VehicleTypeId,
  VehicleUpgradeState,
  WEAPONS,
  WeaponId,
  WeatherPreset,
} from './types';
import { buildPalmettoBayWorld, ElevatorSystem, WorldData } from './world';

const SAVE_KEY = 'sunstate_outlaws_save_v2';

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

// Pre-allocated math helpers
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
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

function cloneDefaultControls(): ControlsConfig {
  return JSON.parse(JSON.stringify(DEFAULT_CONTROLS_CONFIG)) as ControlsConfig;
}

function createDefaultAccount(id: CharacterId): CharacterAccount {
  const p = CHARACTERS[id];
  return {
    cash: p.startingCash,
    bankBalance: p.startingBank,
    customization: { ...p.defaults },
    skills: { ...p.startingSkills },
    unlockedWeapons: { fists: true, pistol: true, smg: id === 'elena' },
    ammo: { fists: 0, pistol: 84, smg: id === 'elena' ? 120 : 0 },
    hasParachute: false,
  };
}

export class GameEngine {
  private container: HTMLElement;
  private onHudUpdate: (snapshot: HudSnapshot) => void;
  private onOpenShop: (shop: ShopLocation) => void;
  private onGamepadUiAction?: (action: GamepadUiAction) => void;

  private renderer!: THREE.WebGLRenderer;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
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

  // Input & Gamepad
  private keys: Record<string, boolean> = {};
  private mouseDown = false;
  private isDraggingLook = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private pointerLocked = false;
  private gamepadConnected = false;
  private prevGamepadButtons: boolean[] = [];
  private controlsConfig: ControlsConfig = cloneDefaultControls();

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
  };
  private playerX = 48;
  private playerY = 0.08;
  private playerZ = 16;
  private playerVy = 0;
  private peakFallVy = 0;
  private playerYaw = Math.PI;
  private onGround = true;
  private parachuteOpen = false;
  private walkCycle = 0;
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

  // Vehicles & NPCs
  private vehicles: VehicleEntity[] = [];
  private npcs: NpcEntity[] = [];
  private currentVehicle: VehicleEntity | null = null;
  private nextEntityId = 1;

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
  private weatherCycleTimer = 58;
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
  private aiBulletin = 'Palmetto Bay · Mestský AI dispečing pripravený.';
  private aiPoliceTactic = 'Bežná hliadka obvodov PBPD';
  private aiDirectorTimer = 3.0;
  private aiDirectorInFlight = false;
  private recentWorldEvents: string[] = [];
  private onOpenNpcChat?: (npc: { id: number; name: string; role: string; mood: string }) => void;

  // GPS, Story Missions, Hidden Missions & Cutscenes
  private gpsTarget: { x: number; z: number; label: string } | null = null;
  private gpsRoute: GpsPoint[] = [];
  private gpsDistance = 0;
  private gpsTurnHint = '';
  private completedStoryIds: string[] = [];
  private completedHiddenIds: string[] = [];
  private activeStoryDef: StoryMissionDef | null = null;
  private mission: ActiveMissionState = {
    activeId: null,
    isHidden: false,
    title: 'Voľná jazda — Palmetto Bay',
    objective: 'Preskúmaj mesto, otvor Mapu (M) alebo Mobil (T)',
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
  private toastText = 'Vitaj v Palmetto Bay! Stlač M pre Mapu, T pre Mobil, G pre AI rozhovor s NPC.';
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
    this.init();
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
      if (saved.characterId === 'dante' || saved.characterId === 'elena') {
        this.characterId = saved.characterId;
      }
      if (saved.accounts?.dante) {
        this.accounts.dante = { ...createDefaultAccount('dante'), ...saved.accounts.dante };
      }
      if (saved.accounts?.elena) {
        this.accounts.elena = { ...createDefaultAccount('elena'), ...saved.accounts.elena };
      }
      if (Array.isArray(saved.completedStoryIds)) this.completedStoryIds = saved.completedStoryIds;
      if (Array.isArray(saved.completedHiddenIds)) this.completedHiddenIds = saved.completedHiddenIds;
      if (typeof saved.playerHandle === 'string' && saved.playerHandle.trim()) {
        this.playerHandle = saved.playerHandle.trim();
      }
      if (Array.isArray(saved.friends)) this.friends = saved.friends;
      if (typeof saved.timeHour === 'number') this.timeHour = saved.timeHour;
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

  public saveGameState(silent = false) {
    try {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({
          characterId: this.characterId,
          accounts: this.accounts,
          completedStoryIds: this.completedStoryIds,
          completedHiddenIds: this.completedHiddenIds,
          playerHandle: this.playerHandle,
          friends: this.friends,
          timeHour: this.timeHour,
          controlsConfig: this.controlsConfig,
        }),
      );
      if (!silent) this.showToast('Postup hry bol úspešne uložený!', 'success');
    } catch {
      if (!silent) this.showToast('Nepodarilo sa uložiť do prehliadača', 'warning');
    }
  }

  public resetAllProgress() {
    localStorage.removeItem(SAVE_KEY);
    this.accounts = {
      dante: createDefaultAccount('dante'),
      elena: createDefaultAccount('elena'),
    };
    this.characterId = 'dante';
    this.completedStoryIds = [];
    this.completedHiddenIds = [];
    this.health = 100;
    this.armor = 50;
    this.godMode = false;
    this.wantedStars = 0;
    this.wantedEvading = false;
    this.currentVehicle = null;
    this.playerX = 48;
    this.playerZ = 16;
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
    this.showToast('Celý postup bol vymazaný! Nový štart v Palmetto Bay.', 'info');
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
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.86;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
    this.camera = new THREE.PerspectiveCamera(this.camFov, width / height, 0.15, 4800);

    this.hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x263142, 0.48);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfdf8ee, 1.05);
    this.sunLight.position.set(160, 140, 95);
    this.sunLight.castShadow = !this.isSoftwareGl;
    const shadowRes = this.isSoftwareGl ? 1024 : 2048;
    this.sunLight.shadow.mapSize.set(shadowRes, shadowRes);
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 480;
    const d = 160;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.00045;
    this.sunLight.shadow.normalBias = 0.022;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.fillLight = new THREE.DirectionalLight(0x7dd3fc, 0.16);
    this.fillLight.position.set(-140, 70, -120);
    this.scene.add(this.fillLight);

    this.muzzleLight = new THREE.PointLight(0xfef08a, 0, 14);
    this.scene.add(this.muzzleLight);

    if (!this.isSoftwareGl) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        0.07,
        0.16,
        1.12,
      );
      this.composer.addPass(this.bloomPass);
    }

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
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.sunLight.castShadow = true;
      if (this.sunLight.shadow.mapSize.x !== 2048) {
        this.sunLight.shadow.mapSize.set(2048, 2048);
        this.sunLight.shadow.map?.dispose();
        this.sunLight.shadow.map = null;
      }
      if (this.bloomPass) this.bloomPass.enabled = true;
    } else if (this.quality === 'medium') {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
      this.renderer.shadowMap.enabled = true;
      this.sunLight.castShadow = true;
      if (this.sunLight.shadow.mapSize.x !== 1024) {
        this.sunLight.shadow.mapSize.set(1024, 1024);
        this.sunLight.shadow.map?.dispose();
        this.sunLight.shadow.map = null;
      }
      if (this.bloomPass) this.bloomPass.enabled = false;
    } else {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
      this.sunLight.castShadow = false;
      if (this.bloomPass) this.bloomPass.enabled = false;
    }
    this.renderer.setSize(width, height);
    this.composer?.setSize(width, height);
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

    // Ambient AI Traffic (Cars + Taxis + Calm PBPD Patrols) riding curved spline network
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
    for (let i = 0; i < 20; i++) {
      const edgeIdx = (i * 2) % numEdges;
      const edge = this.world.network.edges[edgeIdx];
      if (edge.isDirt) continue;
      const sIdx = Math.floor(edge.samples.length * 0.4);
      const p = edge.samples[sIdx];
      const pNext = edge.samples[Math.min(edge.samples.length - 1, sIdx + 1)];
      const yaw = Math.atan2(pNext.x - p.x, pNext.z - p.z);
      const type = trafficTypes[i % trafficTypes.length];
      const colors = VEHICLE_SPECS[type].colors;
      const veh = this.createVehicle(type, p.x, p.z, yaw, true, colors[i % colors.length]);
      veh.aiEdgeId = edge.id;
      veh.aiSampleIdx = sIdx;
      veh.aiReverse = false;
    }

    // Ambient AI Pedestrians & PBPD Foot Patrols across districts (placed clear of buildings/trees!)
    const pedProfiles = [CHARACTERS.dante, CHARACTERS.elena];
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
    });
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
    const charId: CharacterId = p.characterId === 'elena' ? 'elena' : 'dante';
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
    if (code === '5342') {
      this.spawnPlayerVehicle('helicopter');
      return { ok: true, message: 'CHEAT: SkyHawk Vrtuľník pristavený!' };
    }
    if (code === '7645') {
      this.spawnPlayerVehicle('taxi');
      return { ok: true, message: 'CHEAT: Sunstate Cab Taxi pristavený!' };
    }
    if (code === '7726') {
      this.spawnPlayerVehicle('solstice');
      return { ok: true, message: 'CHEAT: Solstice Superšport pristavený!' };
    }
    if (code === '8654') {
      this.spawnPlayerVehicle('plane');
      return { ok: true, message: 'CHEAT: Coral Wing Lietadlo pristavené!' };
    }
    if (code === '9975') {
      this.spawnPlayerVehicle('jet');
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
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);

    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', this.handleCanvasMouseDown);
    canvas.addEventListener('webglcontextlost', this.handleContextLost);
  }

  private handleGamepadChange = () => {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    this.gamepadConnected = Array.from(pads).some((p) => Boolean(p && p.connected));
    this.emitHud();
  };

  private handleResize = () => {
    if (this.disposed) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.composer?.setSize(width, height);
    this.bloomPass?.resolution.set(width, height);
  };

  private handleContextLost = (e: Event) => {
    e.preventDefault();
  };

  private handlePointerLockChange = () => {
    this.pointerLocked = document.pointerLockElement === this.renderer.domElement;
    this.emitHud();
  };

  private handleCanvasMouseDown = (e: MouseEvent) => {
    if (this.paused || this.startupMode || this.cutscene) return;
    this.sound.unlock();
    if (e.button === 0) {
      this.mouseDown = true;
      this.isDraggingLook = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      if (!this.pointerLocked && this.renderer.domElement.requestPointerLock) {
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
    }
  };

  private handleMouseUp = () => {
    this.mouseDown = false;
    this.isDraggingLook = false;
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (this.paused || this.startupMode || this.cutscene) return;
    const dx = this.pointerLocked ? e.movementX : this.isDraggingLook ? e.clientX - this.lastPointerX : 0;
    const dy = this.pointerLocked ? e.movementY : this.isDraggingLook ? e.clientY - this.lastPointerY : 0;
    if (!this.pointerLocked && this.isDraggingLook) {
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    }
    if (dx === 0 && dy === 0) return;

    // In Plane/Jet: pulling mouse down raises nose & climbs!
    if (this.currentVehicle && VEHICLE_SPECS[this.currentVehicle.type].kind === 'plane') {
      this.currentVehicle.pitch = THREE.MathUtils.clamp(
        this.currentVehicle.pitch + dy * 0.0022,
        -0.78,
        0.78,
      );
      this.currentVehicle.yaw -= dx * 0.0018;
      return;
    }

    this.camYaw -= dx * 0.0032;
    this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * 0.0024, -0.35, 1.05);
    this.manualLookCooldown = 0.85;
  };

  private handleWheel = (e: WheelEvent) => {
    if (this.paused || this.currentVehicle || this.startupMode) return;
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

  private isActionHeld(ctx: ControlContextId, action: ControlActionId, pad: Gamepad | null): number {
    const bind = this.controlsConfig[ctx]?.[action];
    let val = bind?.key && this.keys[bind.key] ? 1 : 0;
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
    } else if (this.isActionTriggeredByKey(ctx, 'radio', code)) {
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
      this.showToast('Padák otvorený!', 'info');
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
        this.emitHud();
      }
      return { pad: null, fire: false };
    }
    if (!this.gamepadConnected) {
      this.gamepadConnected = true;
      this.emitHud();
    }

    const deadzone = (v: number) => (Math.abs(v) < 0.16 ? 0 : v);
    const rx = deadzone(pad.axes[2] ?? 0);
    const ry = deadzone(pad.axes[3] ?? 0);

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
      this.showToast('Padák otvorený!', 'info');
    }

    if (justPressed(9)) this.onGamepadUiAction?.('settings');
    if (justPressed(12)) this.onGamepadUiAction?.('phone');
    if (justPressed(13)) this.onGamepadUiAction?.('map');
    if (justPressed(15) && !this.currentVehicle) {
      // D-pad Right cycles weapon on foot (GTA V quick weapon switch)
      const order: WeaponId[] = (['fists', 'pistol', 'smg'] as WeaponId[]).filter(
        (w) => this.account.unlockedWeapons[w],
      );
      const idx = order.indexOf(this.weaponId);
      this.setWeapon(order[(idx + 1) % order.length]);
    }

    // Right Stick Look
    if (rx !== 0 || ry !== 0) {
      this.camYaw -= rx * dt * 2.5;
      this.camPitch = THREE.MathUtils.clamp(this.camPitch + ry * dt * 1.8, -0.35, 1.05);
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
      if (this.account.cash < 150) return this.showToast('Potrebuješ $150 na opravu', 'warning');
      this.account.cash -= 150;
      veh.health = 100;
      veh.wrecked = false;
      veh.onFire = false;
      veh.waterDisabled = false;
      veh.rig.fireGroup.visible = false;
      resetVehicleDeformation(veh.rig);
      this.showToast('Karoséria a motor kompletne opravené (-$150)', 'success');
    } else if (action === 'paint' && typeof value === 'number') {
      if (this.account.cash < 200) return this.showToast('Potrebuješ $200 na nový lak', 'warning');
      this.account.cash -= 200;
      veh.rig.paintMat.color.setHex(value);
      this.showToast('Metalický lak nanesený (-$200)', 'success');
    } else if (action === 'engine') {
      if (veh.upgrades.engineLevel >= 3) return this.showToast('Motor už je na max úrovni!', 'info');
      const cost = 600 + veh.upgrades.engineLevel * 350;
      if (this.account.cash < cost) return this.showToast(`Potrebuješ $${cost}`, 'warning');
      this.account.cash -= cost;
      veh.upgrades.engineLevel++;
      this.showToast(`Tuning motora Lv.${veh.upgrades.engineLevel} nainštalovaný!`, 'success');
    } else if (action === 'turbo') {
      if (veh.upgrades.turboInstalled) return this.showToast('Turbo už je namontované!', 'info');
      if (this.account.cash < 950) return this.showToast('Potrebuješ $950 na Turbo kit', 'warning');
      this.account.cash -= 950;
      veh.upgrades.turboInstalled = true;
      this.showToast('Twin-Turbo Kit namontovaný!', 'success');
    } else if (action === 'handling') {
      if (veh.upgrades.handlingLevel >= 2) return this.showToast('Podvozok je na max!', 'info');
      const cost = 450 + veh.upgrades.handlingLevel * 300;
      if (this.account.cash < cost) return this.showToast(`Potrebuješ $${cost}`, 'warning');
      this.account.cash -= cost;
      veh.upgrades.handlingLevel++;
      this.showToast(`Športový podvozok Lv.${veh.upgrades.handlingLevel} nainštalovaný!`, 'success');
    } else if (action === 'neon' && typeof value === 'string') {
      const cost = value === 'off' ? 0 : 350;
      if (this.account.cash < cost) return this.showToast('Potrebuješ $350 na Neón kit', 'warning');
      this.account.cash -= cost;
      veh.upgrades.neonColor = value;
      setVehicleNeon(veh.rig, value);
      this.showToast(`Podsvietenie neón: ${value.toUpperCase()}`, 'success');
    }
    this.sound.playCashChime();
    this.emitHud();
  }

  public buyArmoryItem(item: 'pistol' | 'smg' | 'ammo_pistol' | 'ammo_smg' | 'armor' | 'parachute') {
    const prices = { pistol: 300, smg: 750, ammo_pistol: 120, ammo_smg: 220, armor: 350, parachute: 250 };
    const cost = prices[item];
    if (this.account.cash < cost) return this.showToast(`Potrebuješ $${cost}`, 'warning');

    if (item === 'pistol') {
      this.account.cash -= cost;
      this.account.unlockedWeapons.pistol = true;
      this.account.ammo.pistol = WEAPONS.pistol.maxAmmo;
      this.setWeapon('pistol');
      this.showToast('Kúpená pištoľ Viper 9mm (-$300)', 'success');
    } else if (item === 'smg') {
      this.account.cash -= cost;
      this.account.unlockedWeapons.smg = true;
      this.account.ammo.smg = WEAPONS.smg.maxAmmo;
      this.setWeapon('smg');
      this.showToast('Kúpené Tide-9 SMG (-$750)', 'success');
    } else if (item === 'ammo_pistol') {
      this.account.cash -= cost;
      this.account.ammo.pistol = WEAPONS.pistol.maxAmmo;
      this.showToast('Náboje 9mm doplnené (-$120)', 'success');
    } else if (item === 'ammo_smg') {
      if (!this.account.unlockedWeapons.smg) return this.showToast('Najprv si kúp Tide-9 SMG', 'warning');
      this.account.cash -= cost;
      this.account.ammo.smg = WEAPONS.smg.maxAmmo;
      this.showToast('Náboje SMG doplnené (-$220)', 'success');
    } else if (item === 'armor') {
      this.account.cash -= cost;
      this.armor = 100;
      this.showToast('Taktická nepriestrelná vesta nasadená (-$350)', 'success');
    } else if (item === 'parachute') {
      this.account.cash -= cost;
      this.account.hasParachute = true;
      this.playerRig.parachutePack.visible = true;
      this.showToast('Padák zakúpený! Pri páde stlač SPACE.', 'success');
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
        return this.showToast(`Potrebuješ $${spec.price} na kúpu ${spec.name}`, 'warning');
      }
      this.account.cash -= spec.price;
      this.sound.playCashChime();
    }
    this.spawnPlayerVehicle(type);
    this.showToast(
      purchase ? `Kúpené vozidlo ${spec.name} (-$${spec.price})` : `Testovacia jazda: ${spec.name}`,
      'success',
    );
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

  public spawnPlayerVehicle(type: VehicleTypeId) {
    this.sound.unlock();
    const px = this.currentVehicle ? this.currentVehicle.x : this.playerX;
    const pz = this.currentVehicle ? this.currentVehicle.z : this.playerZ;
    const yaw = this.currentVehicle ? this.currentVehicle.yaw : this.playerYaw;
    const spec = VEHICLE_SPECS[type];
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

  public setCharacter(id: CharacterId) {
    if (this.characterId === id) return;
    this.characterId = id;
    if (!this.account.unlockedWeapons[this.weaponId]) {
      this.weaponId = this.account.unlockedWeapons.pistol ? 'pistol' : 'fists';
    }
    this.rebuildPlayerCharacter();
    this.playerRig.group.visible = !this.currentVehicle;
    this.showToast(`Aktívna postava: ${CHARACTERS[id].name}`, 'info');
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
    this.launchStoryMissionDef(def, coopHostHandle);
  }

  public launchStoryMissionDef(def: StoryMissionDef, coopHostHandle?: string) {
    const firstStage = def.stages[0];
    const beginGameplay = () => {
      this.activeStoryDef = def;
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
      if (def.wantedOnStart) this.addWanted(def.wantedOnStart - this.wantedStars);
      this.recordWorldEvent(`Spustená misia: ${def.title}`);
      this.setGpsWaypoint(firstStage.targetX, firstStage.targetZ, def.title);
      this.showToast(`Misia spustená: ${def.title}`, 'info');
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

  public cancelMission() {
    this.activeStoryDef = null;
    this.mission = {
      activeId: null,
      isHidden: false,
      title: 'Voľná jazda — Palmetto Bay',
      objective: 'Preskúmaj mesto, otvor Mapu (M) alebo Mobil (T)',
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
      const bw = isArmory || isDealership || isCustoms || isBank ? 36 : 30;
      const bd = isArmory ? 44 : isDealership || isBank || isCustoms ? 34 : 30;

      const cx = s.x - Math.sin(s.yaw) * (bd * 0.5 + 1.5);
      const cz = s.z - Math.cos(s.yaw) * (bd * 0.5 + 1.5);
      const dx = px - cx;
      const dz = pz - cz;
      const c = Math.cos(s.yaw);
      const sinY = Math.sin(s.yaw);
      const lx = dx * c - dz * sinY;
      const lz = dx * sinY + dz * c;

      if (Math.abs(lx) <= bw * 0.52 && Math.abs(lz) <= bd * 0.52) {
        return { nearby: s, inside: s };
      }
      const d = Math.hypot(px - s.x, pz - s.z);
      if (d < 6.8) return { nearby: s, inside: null };
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

    // 2. Exit current vehicle (supports mid-air parachute jump & solid wall check!)
    if (this.currentVehicle) {
      const veh = this.currentVehicle;
      const tryLeft = this.resolveWorldCollision(
        veh.x - Math.cos(veh.yaw) * 2.6,
        veh.z + Math.sin(veh.yaw) * 2.6,
        0.55,
        veh.y + 0.2,
      );
      const tryRight = this.resolveWorldCollision(
        veh.x + Math.cos(veh.yaw) * 2.6,
        veh.z - Math.sin(veh.yaw) * 2.6,
        0.55,
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

    if (this.weaponId !== 'fists') {
      this.muzzleTimer = 0.06;
      this.muzzleLight.position.set(this.playerX, this.playerY + 1.5, this.playerZ);
      this.muzzleLight.intensity = 4.5;
      this.manualLookCooldown = 0.55;
      this.playerYaw = this.camYaw + Math.PI;
      this.playerRig.group.rotation.y = this.playerYaw;
      this.recordWorldEvent(`Streľba zo zbrane (${spec.name})`);
    }

    // Skill-adjusted weapon spread
    const skillTighten = 1 - (this.account.skills.shooting / 100) * 0.55;
    const spread = spec.spread * skillTighten;

    const origin = _v1.set(this.playerX, this.playerY + 1.45, this.playerZ);
    const dir = _v2
      .set(
        Math.sin(this.playerYaw) + (Math.random() - 0.5) * spread,
        -this.camPitch * 0.65 + (Math.random() - 0.5) * spread,
        Math.cos(this.playerYaw) + (Math.random() - 0.5) * spread,
      )
      .normalize();

    // Solid world wall/furniture occlusion! Bullets stop at the first solid obstacle.
    let bestDist = this.raycastWorldColliders(origin, dir, spec.range);
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
          if (perpSq < 0.9 * 0.9) {
            rt.hitFlash = 0.35;
            this.gainSkill('shooting', 1.2);
            this.account.cash += 25;
            this.sound.playCashChime();
            this.showToast('Zásah na strelnici! +$25 & +Streľba', 'success');
            this.spawnSparks(rx, rt.baseY, rt.baseZ, 0xfacc15, 6);
            break;
          }
        }
      }
    }

    for (const npc of this.npcs) {
      if (npc.dead) continue;
      const toX = npc.x - origin.x;
      const toY = npc.y + 1.0 - origin.y;
      const toZ = npc.z - origin.z;
      const proj = toX * dir.x + toY * dir.y + toZ * dir.z;
      if (proj > 0 && proj < bestDist) {
        const perpSq = toX * toX + toY * toY + toZ * toZ - proj * proj;
        if (perpSq < 0.78 * 0.78) {
          bestDist = proj;
          hitNpc = npc;
          hitVehicle = null;
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
        if (perpSq < 1.8 * 1.8) {
          bestDist = proj;
          hitVehicle = v;
          hitNpc = null;
        }
      }
    }

    const endPoint = origin.clone().addScaledVector(dir, bestDist);
    if (this.weaponId !== 'fists') {
      const tracerGeo = new THREE.BufferGeometry().setFromPoints([
        origin.clone().addScaledVector(dir, 0.7),
        endPoint,
      ]);
      const tracer = new THREE.Line(
        tracerGeo,
        new THREE.LineBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.9 }),
      );
      this.scene.add(tracer);
      this.tracers.push({ line: tracer, life: 0.07 });
    }

    if (hitNpc) {
      hitNpc.health -= spec.damage;
      this.gainSkill('shooting', 0.5);
      this.spawnSparks(hitNpc.x, hitNpc.y + 1.1, hitNpc.z, 0xef4444, 6);
      this.addWanted(hitNpc.isCop ? 2 : 1);
      if (hitNpc.health <= 0) {
        hitNpc.dead = true;
        hitNpc.respawnTimer = 18;
        hitNpc.rig.group.rotation.x = Math.PI / 2;
        this.account.cash += hitNpc.isCop ? 150 : 85;
      }
    } else if (hitVehicle) {
      this.damageVehicle(hitVehicle, spec.damage * 0.55, dir.x, dir.z);
      this.gainSkill('shooting', 0.35);
      this.spawnSparks(endPoint.x, endPoint.y, endPoint.z, 0xfbbf24, 6);
      if (hitVehicle.isPolice) this.addWanted(1);
    }
  }

  private damageVehicle(v: VehicleEntity, amount: number, impactDirX = 0, impactDirZ = 1) {
    if (v.wrecked) return;
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
      if (this.manualLookCooldown > 0) this.manualLookCooldown = Math.max(0, this.manualLookCooldown - dt);
      if (this.weaponRecoil > 0) this.weaponRecoil = Math.max(0, this.weaponRecoil - dt * 5.5);
      if (this.muzzleTimer > 0) {
        this.muzzleTimer -= dt;
        if (this.muzzleTimer <= 0) this.muzzleLight.intensity = 0;
      }

      // Hold to spray Fire Truck water or fire SMG / Jet weapons
      const ctxNow = this.getActiveControlContext();
      if (
        (this.mouseDown || this.isActionHeld(ctxNow, 'fire', gp.pad) > 0.35 || gp.fire) &&
        !this.wasted
      ) {
        if (this.currentVehicle) {
          this.tryFireVehicleAction();
        } else if (WEAPONS[this.weaponId].automatic) {
          this.tryFireWeapon();
        }
      }

      // 3x Real-Time Continuous Day/Night Cycle (1 real sec = 3 game secs)
      if (this.autoTimeCycle) {
        this.timeHour = (this.timeHour + dt * (3 / 3600)) % 24;
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
          this.account.cash = Math.max(0, this.account.cash - 150);
          this.wantedStars = 0;
          const hosp = this.findClearSpawnSpot(-366, -646, 0.7);
          this.playerX = hosp.x;
          this.playerZ = hosp.z;
          this.playerY = this.world.groundHeightAt(this.playerX, this.playerZ, 2);
          this.playerRig.group.position.set(this.playerX, this.playerY, this.playerZ);
          this.showToast('Prepustený z nemocnice Palmetto General (-$150)', 'info');
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

      // Engine Audio
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
      const sirenStrength = this.wantedStars > 0 ? Math.max(0.1, 1 - nearestCopDist / 110) : 0;
      this.sound.updateVehicleAudio(Boolean(this.currentVehicle), speedNorm, drifting, sirenStrength, this.elapsed);

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
    if (this.composer && this.quality === 'high' && !this.isSoftwareGl) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
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
    // Smooth automatic weather transitions
    if (this.autoWeatherCycle && !this.startupMode) {
      this.weatherCycleTimer -= dt;
      if (this.weatherCycleTimer <= 0) {
        this.weatherCycleTimer = 52 + Math.random() * 28;
        const pool: WeatherPreset[] = ['clear', 'overcast', 'rain', 'storm', 'foggy', 'clear'];
        const nextCandidates = pool.filter((p) => p !== this.targetWeatherPreset);
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
    const transitionRate = 0.22; // smooth ~10s weather crossfade
    this.rainFactor = THREE.MathUtils.damp(this.rainFactor, tgt.rain, transitionRate, dt);
    this.cloudFactor = THREE.MathUtils.damp(this.cloudFactor, tgt.cloud, transitionRate, dt);
    this.fogFactor = THREE.MathUtils.damp(this.fogFactor, tgt.fog, transitionRate, dt);
    this.stormFactor = THREE.MathUtils.damp(this.stormFactor, tgt.storm, transitionRate, dt);
    this.wetness = THREE.MathUtils.damp(this.wetness, tgt.wet, 0.14, dt);

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

    // Update cloud opacity & darkness smoothly
    const cloudBrightness = 1 - this.cloudFactor * 0.45 - this.stormFactor * 0.22;
    this.world.cloudMats.forEach((m) => {
      m.opacity = THREE.MathUtils.clamp(this.cloudFactor * 0.82, 0.04, 0.88);
      m.color.setRGB(0.88 * cloudBrightness, 0.91 * cloudBrightness, 0.96 * cloudBrightness);
    });
    const windSpeed = 4.5 + this.stormFactor * 10;
    this.world.cloudGroup.children.forEach((c) => {
      c.position.x += dt * windSpeed;
      if (c.position.x > 2400) c.position.x = -2400;
    });

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
      this.isActionHeld('on_foot', 'backward', pad);
    let r =
      this.isActionHeld('on_foot', 'right', pad) -
      this.isActionHeld('on_foot', 'left', pad);
    if (this.keys['ArrowUp']) f = Math.max(f, 1);
    if (this.keys['ArrowDown']) f = Math.min(f, -1);
    if (this.keys['ArrowRight']) r = Math.max(r, 1);
    if (this.keys['ArrowLeft']) r = Math.min(r, -1);

    const sprinting = this.isActionHeld('on_foot', 'sprint', pad) > 0.35;
    const staminaMult = 1 + (this.account.skills.stamina / 100) * 0.28;
    const speed = (sprinting ? 10.8 : 6.4) * staminaMult;
    const moveLen = Math.hypot(f, r);

    if (moveLen > 0.08) {
      if (sprinting) this.gainSkill('stamina', dt * 1.4);
      const nf = f / Math.max(1, moveLen);
      const nr = r / Math.max(1, moveLen);
      const sinY = Math.sin(this.camYaw);
      const cosY = Math.cos(this.camYaw);
      const moveX = -sinY * nf + cosY * nr;
      const moveZ = -cosY * nf - sinY * nr;

      const targetYaw = Math.atan2(moveX, moveZ);
      let diff = targetYaw - this.playerYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.playerYaw += diff * Math.min(1, dt * 13);

      // Camera follows character smoothly when turning or moving (unless actively looking around)
      const steppingStraightBack = nf < -0.35 && Math.abs(nr) < 0.15;
      if (!this.isDraggingLook && this.manualLookCooldown <= 0 && !steppingStraightBack) {
        const desiredCamYaw = this.playerYaw + Math.PI;
        let camDiff = desiredCamYaw - this.camYaw;
        while (camDiff > Math.PI) camDiff -= Math.PI * 2;
        while (camDiff < -Math.PI) camDiff += Math.PI * 2;
        const turning = Math.abs(nr) > 0.08;
        const followRate = this.cameraMode === 'first' ? 5.2 : turning ? 4.6 : 2.5;
        this.camYaw += camDiff * Math.min(1, dt * followRate);
      }

      const nextX = THREE.MathUtils.clamp(this.playerX + moveX * speed * dt, -2450, 1650);
      const nextZ = THREE.MathUtils.clamp(this.playerZ + moveZ * speed * dt, -2100, 2100);
      const res = this.resolveWorldCollision(nextX, nextZ, 0.52, this.playerY);
      const vehPush = this.resolveActorVsVehicles(res.x, res.z, 0.52, this.playerY);
      const finalRes = this.resolveWorldCollision(vehPush.x, vehPush.z, 0.52, this.playerY);
      this.playerX = finalRes.x;
      this.playerZ = finalRes.z;

      this.walkCycle += dt * (sprinting ? 13 : 8);
      const swing = Math.sin(this.walkCycle) * 0.62;
      this.playerRig.leftLeg.rotation.x = swing;
      this.playerRig.rightLeg.rotation.x = -swing;
    } else {
      const idleVehPush = this.resolveActorVsVehicles(this.playerX, this.playerZ, 0.52, this.playerY);
      const idleWorld = this.resolveWorldCollision(idleVehPush.x, idleVehPush.z, 0.52, this.playerY);
      this.playerX = idleWorld.x;
      this.playerZ = idleWorld.z;
      this.playerRig.leftLeg.rotation.x *= 0.85;
      this.playerRig.rightLeg.rotation.x *= 0.85;
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

    // Articulated 2-Segment Arm & Weapon Pose + Recoil!
    setCharacterWeaponPose(
      this.playerRig,
      this.weaponId,
      moveLen > 0.08,
      this.walkCycle,
      this.weaponRecoil,
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
        0.55,
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
    let steer =
      this.isActionHeld(ctx, 'left', pad) - this.isActionHeld(ctx, 'right', pad);

    if (spec.kind === 'car') {
      if (this.keys['ArrowUp']) throttle = Math.max(throttle, 1);
      if (this.keys['ArrowDown']) brake = Math.max(brake, 1);
      if (this.keys['ArrowLeft']) steer = Math.max(steer, 1);
      if (this.keys['ArrowRight']) steer = Math.min(steer, -1);
    }

    if (spec.kind === 'helicopter') {
      // Helicopter Flight Physics with Custom/GTA V Bindings
      this.gainSkill('flying', dt * 0.5);
      v.rotorSpeed = 24;
      const rudderYaw =
        this.isActionHeld(ctx, 'yawLeft', pad) - this.isActionHeld(ctx, 'yawRight', pad);
      v.yaw += (steer * 0.65 + rudderYaw * 0.95) * spec.turnSpeed * dt;

      const forwardTilt =
        this.isActionHeld(ctx, 'pitchDown', pad) - this.isActionHeld(ctx, 'pitchUp', pad);
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
      // Pulling stick DOWN (pitchUp) raises nose UP & climbs (+v.pitch)!
      // Pushing stick UP (pitchDown) drops nose DOWN & dives (-v.pitch)!
      this.gainSkill('flying', dt * 0.6);
      const fwdSpeed = v.vx * Math.sin(v.yaw) + v.vz * Math.cos(v.yaw);
      const curSpeed = Math.max(0, fwdSpeed);
      let nextSpeed = curSpeed + (throttle * spec.accel - brake * spec.braking - 2.2) * dt;
      nextSpeed = THREE.MathUtils.clamp(nextSpeed, 0, spec.maxSpeed);

      const pitchInput =
        this.isActionHeld(ctx, 'pitchUp', pad) - this.isActionHeld(ctx, 'pitchDown', pad);
      if (Math.abs(pitchInput) > 0.04) {
        v.pitch = THREE.MathUtils.clamp(v.pitch + pitchInput * 1.18 * dt, -0.78, 0.78);
      } else {
        v.pitch = THREE.MathUtils.damp(v.pitch, 0, 1.5, dt);
      }

      const rudderYaw =
        this.isActionHeld(ctx, 'yawLeft', pad) - this.isActionHeld(ctx, 'yawRight', pad);
      v.yaw +=
        (steer + rudderYaw * 0.7) *
        spec.turnSpeed *
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

      if (throttle > 0) {
        forwardSpeed += accel * throttle * dt;
        if (Math.abs(forwardSpeed) > 15) this.gainSkill('driving', dt * 0.45);
      }
      if (brake > 0) {
        if (forwardSpeed > 1) forwardSpeed -= spec.braking * brake * dt;
        else forwardSpeed -= accel * 0.55 * brake * dt;
      }
      if (throttle === 0 && brake === 0) forwardSpeed *= Math.pow(0.45, dt);

      forwardSpeed = THREE.MathUtils.clamp(forwardSpeed, -maxSpeed * 0.42, maxSpeed);

      const handbrake = this.isActionHeld(ctx, 'handbrake', pad) > 0.35;
      const wetGripMult = 1 - this.wetness * 0.2;
      const grip = (handbrake ? spec.driftGrip : spec.normalGrip) * handlingBonus * skillDrive * wetGripMult;
      lateralSpeed *= Math.exp(-grip * dt);

      const speedFactor = Math.min(1, Math.abs(forwardSpeed) / 7.5);
      const reverseSign = forwardSpeed >= -0.4 ? 1 : -1;
      v.steerAngle = THREE.MathUtils.damp(v.steerAngle, steer * 0.45, 10, dt);
      v.yaw += steer * spec.turnSpeed * handlingBonus * speedFactor * reverseSign * dt;

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
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      const spec = VEHICLE_SPECS[v.type];

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

      // Sub-stepped 3-sphere vehicle capsule collision against solid buildings, pillars, trees & walls
      const moveX = v.vx * dt;
      const moveZ = v.vz * dt;
      const moveDist = Math.hypot(moveX, moveZ);
      const subSteps = Math.max(1, Math.min(8, Math.ceil(moveDist / 0.72)));
      let anyHit = false;
      let hitNx = 0;
      let hitNz = 0;

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

      if (anyHit) {
        const vn = v.vx * hitNx + v.vz * hitNz;
        const impactSpeed = Math.abs(vn);
        if (impactSpeed > 6.5) {
          this.damageVehicle(v, impactSpeed * 1.15, v.vx, v.vz);
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
      if (v.y <= groundY) {
        if (spec.kind !== 'car' && v.vy < -16) {
          this.damageVehicle(v, Math.abs(v.vy) * 2.2, 0, -1);
        }
        v.y = groundY;
        v.vy = 0;
        if (spec.kind === 'car') {
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
            if (relSpeed > 9) {
              const dmg = relSpeed * 1.1;
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

    const targetPt = edge.samples[v.aiSampleIdx];
    const dx = targetPt.x - v.x;
    const dz = targetPt.z - v.z;
    if (Math.hypot(dx, dz) < 9.5) {
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
    v.yaw += THREE.MathUtils.clamp(diff, -2.5 * dt, 2.5 * dt);

    const px = this.currentVehicle ? this.currentVehicle.x : this.playerX;
    const pz = this.currentVehicle ? this.currentVehicle.z : this.playerZ;
    const playerDist = Math.hypot(px - v.x, pz - v.z);
    const targetSpeed = playerDist < 12 ? 3.0 : 16.0;

    v.vx = THREE.MathUtils.damp(v.vx, Math.sin(v.yaw) * targetSpeed, 4.5, dt);
    v.vz = THREE.MathUtils.damp(v.vz, Math.cos(v.yaw) * targetSpeed, 4.5, dt);
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
        this.account.cash += 50;
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
        const worldRes = this.resolveWorldCollision(nextX, nextZ, 0.46, npc.y);
        const vehRes = this.resolveActorVsVehicles(worldRes.x, worldRes.z, 0.46, npc.y);
        const finalRes = this.resolveWorldCollision(vehRes.x, vehRes.z, 0.46, npc.y);
        if (worldRes.hit || vehRes.hit) npc.yaw += Math.PI * 0.65;
        npc.x = finalRes.x;
        npc.z = finalRes.z;
      } else {
        const vehRes = this.resolveActorVsVehicles(npc.x, npc.z, 0.46, npc.y);
        const finalRes = this.resolveWorldCollision(vehRes.x, vehRes.z, 0.46, npc.y);
        npc.x = finalRes.x;
        npc.z = finalRes.z;
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
          this.showToast('Unikol si hliadke PBPD!', 'success');
        }
      } else {
        this.wantedEvading = false;
        this.wantedCooldown = 10 + this.wantedStars * 2.5;
      }
    }

    // Check 25 Hidden World Discoveries!
    for (const hm of HIDDEN_MISSIONS) {
      if (this.completedHiddenIds.includes(hm.id)) continue;
      if (Math.hypot(px - hm.x, pz - hm.z) < 15 && Math.abs(py - hm.y) < 12) {
        this.completedHiddenIds.push(hm.id);
        this.account.cash += hm.reward;
        this.sound.playCashChime();
        this.showToast(`Skrytá misia "${hm.title}" nájdená! +$${hm.reward}`, 'success');
        this.saveGameState(true);
      }
    }

    // Check Active Story Mission Stages
    if (this.mission.activeId && this.activeStoryDef) {
      this.mission.timeLeft -= dt;
      if (this.mission.timeLeft <= 0) {
        this.showToast(`Misia zlyhala: ${this.mission.title} (čas vypršal)`, 'warning');
        this.cancelMission();
        return;
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
        stageDone = distXZ < stage.radius && Boolean(this.currentVehicle);
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
          // Story Mission Completed!
          const def = this.activeStoryDef;
          const reward = def.reward;
          this.account.cash += reward;
          if (!this.completedStoryIds.includes(def.id)) {
            this.completedStoryIds.push(def.id);
          }
          this.wantedStars = 0;
          this.wantedEvading = false;
          this.sound.playCashChime();
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
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
            this.showToast(`Misia splnená! Odmena +$${reward}`, 'success');
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
    if (this.gpsTimer >= 0.45) {
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

    for (let pass = 0; pass < 2; pass++) {
      // 1. Oriented Bounding Boxes (Buildings, walls, shelves, bridges, pillars, props)
      for (let i = 0; i < this.world.colliders.length; i++) {
        const b = this.world.colliders[i];
        if (actorY >= b.maxY - 0.5 || actorY + 1.8 <= b.minY) continue;

        const cos = Math.cos(b.yaw);
        const sin = Math.sin(b.yaw);
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

      // 2. Circle Colliders (Fountain, monument, trees, streetlights, turntables, chairs, mannequins)
      for (let i = 0; i < this.world.circleColliders.length; i++) {
        const c = this.world.circleColliders[i];
        if (actorY >= c.maxY - 0.5 || actorY + 1.8 <= c.minY) continue;
        const dx = rx - c.cx;
        const dz = rz - c.cz;
        const minR = c.r + radius;
        const distSq = dx * dx + dz * dz;
        if (distSq < minR * minR) {
          hit = true;
          const dist = Math.sqrt(distSq);
          const nx = dist > 0.0001 ? dx / dist : 1;
          const nz = dist > 0.0001 ? dz / dist : 0;
          rx = c.cx + nx * minR;
          rz = c.cz + nz * minR;
          lastNx = nx;
          lastNz = nz;
        }
      }
    }
    return { x: rx, z: rz, hit, nx: lastNx, nz: lastNz };
  }

  private resolveVehicleWorldCollision(v: VehicleEntity): { hit: boolean; nx: number; nz: number } {
    const spec = VEHICLE_SPECS[v.type];
    const r = spec.width * 0.46;
    const fwdHalf = Math.max(0.4, spec.length * 0.5 - r * 0.85);
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
      const hw = spec.width * 0.52;
      const hd = spec.length * 0.52;
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
      }
      this.sunLight.target.position.set(this.camera.position.x, 0, this.camera.position.z);
      this.sunLight.target.updateMatrixWorld();
      return;
    }

    // Third Person Camera: smoothly follows behind vehicle & turning character!
    const targetX = inCar ? this.currentVehicle!.x : this.playerX;
    const rawTargetY = (inCar ? this.currentVehicle!.y : this.playerY) + (inCar ? 1.8 : 1.75);
    this.smoothCamY = THREE.MathUtils.damp(this.smoothCamY, rawTargetY, 16, dt);
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
    const dist = inCar ? (spec?.kind === 'plane' || spec?.kind === 'helicopter' ? 14.5 : 9.6) : 5.2;
    const horiz = Math.cos(this.camPitch) * dist;
    const vert = Math.sin(this.camPitch) * dist + 1.25;

    _camDesired.set(
      targetX + Math.sin(this.camYaw) * horiz,
      Math.max(1.2, targetY + vert),
      targetZ + Math.cos(this.camYaw) * horiz,
    );

    const dampK = inCar ? 18 : 16;
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _camDesired.x, dampK, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _camDesired.y, dampK, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _camDesired.z, dampK, dt);

    _camLook.set(targetX, targetY, targetZ);
    this.camera.lookAt(_camLook);

    this.sunLight.target.position.set(targetX, 0, targetZ);
    this.sunLight.target.updateMatrixWorld();

    const speedMag = inCar ? Math.hypot(this.currentVehicle!.vx, this.currentVehicle!.vz) : 0;
    const targetFov = inCar ? 62 + Math.min(18, speedMag * 0.25) : 60;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 7, dt);
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
      const stormTint = new THREE.Color(0x3b485b);
      const fogTint = new THREE.Color(0x94a3b8);
      _skyColor.lerp(stormTint, this.cloudFactor * 0.45 + this.stormFactor * 0.35);
      _skyColor.lerp(fogTint, this.fogFactor * 0.55);
    }
    if (this.lightningFlash > 0.05) {
      _skyColor.lerp(new THREE.Color(0xdbeafe), this.lightningFlash * 0.65);
    }

    this.scene.background = _skyColor.clone();
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

    this.world.buildingEmissiveMats.forEach((m) => (m.emissiveIntensity = windowEmissive));
    this.world.streetLightBulbs.forEach((m) => (m.emissiveIntensity = 0.12 + Math.max(nightFactor, this.stormFactor * 0.8) * 1.25));
    this.vehicles.forEach((v) => (v.rig.headlightMat.emissiveIntensity = 0.2 + Math.max(nightFactor, this.rainFactor * 0.85, this.fogFactor * 0.9) * 1.05));
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
      const resp = await fetch('/api/ai/npc-director', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weatherPreset: this.weatherPreset,
          weatherLabel: WEATHER_LABELS_SK[this.weatherPreset],
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
      const data = await resp.json();
      if (!resp.ok) {
        this.aiDirectorStatus = 'error';
        this.aiDirectorError = String(data?.error || `HTTP ${resp.status}`);
        return;
      }

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
      this.aiDirectorError = err?.message || 'Nepodarilo sa spojiť s AI režisérom.';
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

    try {
      const resp = await fetch('/api/ai/npc-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          speakerType: target === 'copilot' ? 'copilot' : 'npc',
          npcName: target === 'copilot' ? 'Palmetto AI' : target.npcName,
          npcRole: target === 'copilot' ? 'Taktický AI asistent' : target.npcRole,
          npcMood: target === 'copilot' ? 'sústredený' : target.npcMood,
          playerMessage,
          context: {
            characterName: CHARACTERS[this.characterId].name,
            weatherLabel: WEATHER_LABELS_SK[this.weatherPreset],
            timeHour: this.timeHour,
            wantedStars: this.wantedStars,
            cash: this.account.cash,
            activeMission: this.mission.title,
            nearbyLandmark: nearestLandmark,
          },
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        return { reply: '', error: String(data?.error || `Chyba AI (${resp.status})`) };
      }

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
    } catch (err: any) {
      return { reply: '', error: err?.message || 'Zlyhalo sieťové spojenie s AI.' };
    }
  }

  public async generateAndStartAiMission(
    theme: string,
  ): Promise<{ ok: boolean; title?: string; error?: string }> {
    const locations = [
      ...SHOPS.map((s) => ({ name: s.name, kind: s.category, x: s.x, z: s.z })),
      ...this.world.network.nodes.slice(0, 20).map((n) => ({
        name: n.name || `Križovatka #${n.id}`,
        kind: 'road_node',
        x: n.x,
        z: n.z,
      })),
    ];

    try {
      const resp = await fetch('/api/ai/generate-mission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme, locations }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.mission) {
        return { ok: false, error: String(data?.error || 'AI misia sa nepodarila vytvoriť.') };
      }
      const m = data.mission as StoryMissionDef & { recommendedWeather?: WeatherPreset };
      if (m.recommendedWeather) {
        this.targetWeatherPreset = m.recommendedWeather;
      }
      this.launchStoryMissionDef(m);
      return { ok: true, title: m.title };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Chyba spojenia pri generovaní misie.' };
    }
  }

  private getContextualPrompt(nearbyShop: ShopLocation | null, insideShop: ShopLocation | null): string {
    const elev = this.getNearbyElevator();
    if (elev) {
      return `Výťah ${elev.name} (${elev.floorNames[elev.currentFloorIdx]}) · Stlač E alebo Y na jazdu`;
    }
    if (insideShop) {
      if (insideShop.category === 'customs') {
        const refVeh = this.currentVehicle ?? this.findNearestPlayerVehicle(18);
        if (refVeh && this.isPointInCustomsBay(refVeh.x, refVeh.z, insideShop.id)) {
          return `Vozidlo na zdviháku Apex Customs · Stlač E alebo Y pre Tuning`;
        }
        return `Apex Customs · Vojdi sem autom na zdvihák pre otvorenie tuningu`;
      }
      if (insideShop.category === 'armory') {
        return `Vnútri ${insideShop.name} · Strieľaj na terče (Klik/RT) alebo stlač E pre nákup`;
      }
      return `Vnútri ${insideShop.name} · Prechádzaj sa alebo stlač E pre ponuku`;
    }
    if (nearbyShop) {
      if (nearbyShop.category === 'customs') {
        return `${nearbyShop.name} · Vojdi autom priamo dnu na zdvihák pre Tuning`;
      }
      return `Stlač E — Otvoriť ${nearbyShop.name} (${nearbyShop.shortLabel})`;
    }
    if (this.currentVehicle) {
      const spec = VEHICLE_SPECS[this.currentVehicle.type];
      if (spec.hasWaterCannon) return 'E/Y Vystúpiť · Klik/RT Vodné delo · V Kamera · T Mobil';
      if (spec.hasWeapons) return 'W/S Plyn · A/D Náklon · S/K Nos hore / W/I Nos dole · Klik/RT Kanóny';
      if (spec.kind === 'plane' || spec.kind === 'helicopter') return 'Lietanie: Páčka dole = Nos hore · Páčka hore = Nos dole · E/Y Vystúpiť';
      return 'E/Y Vystúpiť · Space/RB Ručná brzda · V/Select Kamera · T Mobil';
    }
    if (!this.onGround && this.account.hasParachute && !this.parachuteOpen) {
      return 'Stlač SPACE / A pre otvorenie padáku!';
    }
    for (const v of this.vehicles) {
      if (!v.wrecked && Math.hypot(v.x - this.playerX, v.z - this.playerZ) < 5.6 && Math.abs(v.y - this.playerY) < 3.5) {
        return `Stlač E / F / Y — Nastúpiť do ${VEHICLE_SPECS[v.type].name}`;
      }
    }
    const talkNpc = this.findClosestInteractableNpc();
    if (talkNpc) {
      return `Stlač G — Osloviť ${talkNpc.name} (${talkNpc.role})`;
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

    const radioName = RADIO_STATIONS.find((r) => r.id === this.radioId)?.name ?? 'Off';
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

    this.onHudUpdate({
      characterId: this.characterId,
      characterName: CHARACTERS[this.characterId].name,
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
      ammo: { ...this.account.ammo },
      unlockedWeapons: { ...this.account.unlockedWeapons },
      radioId: this.radioId,
      radioName,
      timePreset: this.timePreset,
      timeHour: this.timeHour,
      autoTimeCycle: this.autoTimeCycle,
      weatherPreset: this.weatherPreset,
      targetWeatherPreset: this.targetWeatherPreset,
      weatherLabel: WEATHER_LABELS_SK[this.weatherPreset],
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
      toastText: this.toastText,
      toastType: this.toastType,
      mission: { ...this.mission },
      completedStoryIds: [...this.completedStoryIds],
      completedHiddenIds: [...this.completedHiddenIds],
      cutscene: cutsceneView,
      playerX: px,
      playerY: py,
      playerZ: pz,
      playerYaw: this.playerYaw,
      blips,
      gpsTarget: this.gpsTarget,
      gpsRoute: this.gpsRoute,
      gpsDistance: this.gpsDistance,
      gpsTurnHint: this.gpsTurnHint,
      pointerLocked: this.pointerLocked,
      wasted: this.wasted,
      soundMuted: this.sound.isMuted(),
      gamepadConnected: this.gamepadConnected,
      activeControlContext: this.getActiveControlContext(),
      controlsConfig: JSON.parse(JSON.stringify(this.controlsConfig)) as ControlsConfig,
      playerHandle: this.playerHandle,
      friends: [...this.friends],
      onlineFriends,
      pendingInvite: this.pendingInvite,
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
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);

    const canvas = this.renderer.domElement;
    canvas.removeEventListener('mousedown', this.handleCanvasMouseDown);
    canvas.removeEventListener('webglcontextlost', this.handleContextLost);

    this.rainGeo?.dispose();
    this.rainMat?.dispose();
    this.sound.dispose();
    this.textures.dispose();
    this.envRT?.dispose();
    this.composer?.dispose();
    this.renderer.dispose();
    if (canvas.parentElement === this.container) {
      this.container.removeChild(canvas);
    }
  }
}
