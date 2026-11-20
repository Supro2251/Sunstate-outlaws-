export type TimePreset = 'dawn' | 'noon' | 'golden' | 'night';
export type WeatherPreset = 'clear' | 'overcast' | 'rain' | 'storm' | 'foggy';
export type NpcBehaviorState =
  | 'patrol'
  | 'flee'
  | 'shelter'
  | 'investigate'
  | 'cheer'
  | 'confront'
  | 'hail_taxi';
export type QualityLevel = 'high' | 'medium' | 'performance';
export type RadioStationId = 'pulse' | 'synthwave' | 'bassline' | 'off';
export type CharacterId = 'dante' | 'elena' | 'kairo';
export type WeaponId = 'fists' | 'pistol' | 'smg';
export type CameraMode = 'third' | 'first';

export type VehicleTypeId =
  | 'veloce'
  | 'solstice'
  | 'brawler'
  | 'terramax'
  | 'taxi'
  | 'ambulance'
  | 'firetruck'
  | 'pbpd'
  | 'helicopter'
  | 'plane'
  | 'jet';

export type VehicleKind = 'car' | 'helicopter' | 'plane';
export type ControlContextId = 'on_foot' | 'car' | 'helicopter' | 'plane' | 'jet';

export type ControlActionId =
  | 'forward'
  | 'backward'
  | 'left'
  | 'right'
  | 'pitchUp'
  | 'pitchDown'
  | 'yawLeft'
  | 'yawRight'
  | 'handbrake'
  | 'sprint'
  | 'jump'
  | 'fire'
  | 'interact'
  | 'camera'
  | 'radio';

export type GamepadInputCode =
  | 'BTN_0' // A / Cross
  | 'BTN_1' // B / Circle
  | 'BTN_2' // X / Square
  | 'BTN_3' // Y / Triangle
  | 'BTN_4' // LB / L1
  | 'BTN_5' // RB / R1
  | 'BTN_6' // LT / L2
  | 'BTN_7' // RT / R2
  | 'BTN_8' // Select / Share
  | 'BTN_9' // Start / Options
  | 'BTN_10' // L3 Stick Click
  | 'BTN_11' // R3 Stick Click
  | 'BTN_12' // D-Pad Up
  | 'BTN_13' // D-Pad Down
  | 'BTN_14' // D-Pad Left
  | 'BTN_15' // D-Pad Right
  | 'BTN_16' // PS Home Button
  | 'BTN_17' // PS4/PS5 Touchpad Click
  | 'AXIS_LX_NEG'
  | 'AXIS_LX_POS'
  | 'AXIS_LY_NEG'
  | 'AXIS_LY_POS';

export interface ActionBinding {
  key: string; // KeyboardEvent.code e.g. 'KeyW'
  pad: GamepadInputCode | '';
}

export type ContextBindings = Partial<Record<ControlActionId, ActionBinding>>;
export type ControlsConfig = Record<ControlContextId, ContextBindings>;

export const ACTION_LABELS_SK: Record<ControlActionId, string> = {
  forward: 'Vpred / Plyn / Stúpanie',
  backward: 'Vzad / Brzda / Klesanie',
  left: 'Doľava / Náklon vľavo',
  right: 'Doprava / Náklon vpravo',
  pitchUp: 'Nos hore (Stúpanie lietadla)',
  pitchDown: 'Nos dole (Klesanie lietadla)',
  yawLeft: 'Smerovka doľava',
  yawRight: 'Smerovka doprava',
  handbrake: 'Ručná brzda / Drift',
  sprint: 'Šprint',
  jump: 'Skok / Padák',
  fire: 'Streľba / Vodné delo / Kanóny',
  interact: 'Nastúpiť / Vystúpiť / Výťah / Obchod',
  camera: 'Kamera (1st / 3rd Person)',
  radio: 'Ďalšia rádiostanica',
};

export const CONTEXT_LABELS_SK: Record<ControlContextId, string> = {
  on_foot: 'Mimo vozidla (Pešo)',
  car: 'Auto & Služobné vozidlá',
  helicopter: 'Vrtuľník (SkyHawk)',
  plane: 'Vrtuľové lietadlo (Coral Wing)',
  jet: 'Bojová stíhačka (Valkyrie)',
};

export const DEFAULT_CONTROLS_CONFIG: ControlsConfig = {
  on_foot: {
    forward: { key: 'KeyW', pad: 'AXIS_LY_NEG' },
    backward: { key: 'KeyS', pad: 'AXIS_LY_POS' },
    left: { key: 'KeyA', pad: 'AXIS_LX_NEG' },
    right: { key: 'KeyD', pad: 'AXIS_LX_POS' },
    sprint: { key: 'ShiftLeft', pad: 'BTN_0' }, // GTA 5: A / Cross = Sprint
    jump: { key: 'Space', pad: 'BTN_2' }, // GTA 5: X / Square = Jump
    fire: { key: 'KeyJ', pad: 'BTN_7' }, // GTA 5: RT / R2 = Fire
    interact: { key: 'KeyE', pad: 'BTN_3' }, // GTA 5: Y / Triangle = Enter Vehicle / Interact
    camera: { key: 'KeyV', pad: 'BTN_8' }, // GTA 5: Select = Camera
  },
  car: {
    forward: { key: 'KeyW', pad: 'BTN_7' }, // GTA 5: RT / R2 = Accelerate
    backward: { key: 'KeyS', pad: 'BTN_6' }, // GTA 5: LT / L2 = Brake / Reverse
    left: { key: 'KeyA', pad: 'AXIS_LX_NEG' },
    right: { key: 'KeyD', pad: 'AXIS_LX_POS' },
    handbrake: { key: 'Space', pad: 'BTN_5' }, // GTA 5: RB / R1 = Handbrake
    fire: { key: 'KeyJ', pad: 'BTN_4' }, // GTA 5: LB / L1 = Fire / Water Cannon
    interact: { key: 'KeyE', pad: 'BTN_3' }, // GTA 5: Y / Triangle = Exit
    camera: { key: 'KeyV', pad: 'BTN_8' }, // Select = Camera
    radio: { key: 'KeyR', pad: 'BTN_14' }, // D-Pad Left = Radio
  },
  helicopter: {
    forward: { key: 'KeyW', pad: 'BTN_7' }, // GTA 5: RT / R2 = Collective Up
    backward: { key: 'KeyS', pad: 'BTN_6' }, // GTA 5: LT / L2 = Collective Down
    pitchUp: { key: 'KeyK', pad: 'AXIS_LY_POS' }, // Pull Stick Down = Tilt Back / Nose Up
    pitchDown: { key: 'KeyI', pad: 'AXIS_LY_NEG' }, // Push Stick Up = Tilt Forward / Nose Down
    left: { key: 'KeyA', pad: 'AXIS_LX_NEG' },
    right: { key: 'KeyD', pad: 'AXIS_LX_POS' },
    yawLeft: { key: 'KeyQ', pad: 'BTN_4' }, // LB = Yaw Left
    yawRight: { key: 'KeyE', pad: 'BTN_5' }, // RB = Yaw Right
    interact: { key: 'KeyF', pad: 'BTN_3' }, // Y = Exit / Parachute
    camera: { key: 'KeyV', pad: 'BTN_8' },
  },
  plane: {
    forward: { key: 'KeyW', pad: 'BTN_7' }, // GTA 5: RT = Throttle
    backward: { key: 'KeyS', pad: 'BTN_6' }, // GTA 5: LT = Airbrake
    pitchUp: { key: 'KeyK', pad: 'AXIS_LY_POS' }, // Pull Stick Down -> Nose UP & Climb
    pitchDown: { key: 'KeyI', pad: 'AXIS_LY_NEG' }, // Push Stick Up -> Nose DOWN & Dive
    left: { key: 'KeyA', pad: 'AXIS_LX_NEG' }, // Bank Left
    right: { key: 'KeyD', pad: 'AXIS_LX_POS' }, // Bank Right
    yawLeft: { key: 'KeyQ', pad: 'BTN_4' }, // LB = Rudder Left
    yawRight: { key: 'KeyE', pad: 'BTN_5' }, // RB = Rudder Right
    interact: { key: 'KeyF', pad: 'BTN_3' }, // Y = Exit / Parachute
    camera: { key: 'KeyV', pad: 'BTN_8' },
  },
  jet: {
    forward: { key: 'KeyW', pad: 'BTN_7' }, // GTA 5: RT = Afterburner Throttle
    backward: { key: 'KeyS', pad: 'BTN_6' }, // GTA 5: LT = Airbrake
    pitchUp: { key: 'KeyK', pad: 'AXIS_LY_POS' }, // Pull Stick Down -> Nose UP & Climb
    pitchDown: { key: 'KeyI', pad: 'AXIS_LY_NEG' }, // Push Stick Up -> Nose DOWN & Dive
    left: { key: 'KeyA', pad: 'AXIS_LX_NEG' },
    right: { key: 'KeyD', pad: 'AXIS_LX_POS' },
    yawLeft: { key: 'KeyQ', pad: 'BTN_4' },
    yawRight: { key: 'KeyE', pad: 'BTN_5' },
    fire: { key: 'Space', pad: 'BTN_0' }, // GTA 5: A / Cross = Fire Jet Cannons
    interact: { key: 'KeyF', pad: 'BTN_3' },
    camera: { key: 'KeyV', pad: 'BTN_8' },
  },
};

export function formatKeyCodeLabel(code: string): string {
  if (!code) return '—';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
  if (code === 'Space') return 'Medzerník';
  if (code === 'ArrowUp') return 'Šípka ↑';
  if (code === 'ArrowDown') return 'Šípka ↓';
  if (code === 'ArrowLeft') return 'Šípka ←';
  if (code === 'ArrowRight') return 'Šípka →';
  return code;
}

export function formatPadCodeLabel(pad: GamepadInputCode | ''): string {
  const map: Record<GamepadInputCode, string> = {
    BTN_0: 'A / ×',
    BTN_1: 'B / ○',
    BTN_2: 'X / □',
    BTN_3: 'Y / △',
    BTN_4: 'LB / L1',
    BTN_5: 'RB / R1',
    BTN_6: 'LT / L2',
    BTN_7: 'RT / R2',
    BTN_8: 'Share / View',
    BTN_9: 'Options / Start',
    BTN_10: 'L3 (Ľavá páčka)',
    BTN_11: 'R3 (Pravá páčka)',
    BTN_12: 'D-Pad ↑',
    BTN_13: 'D-Pad ↓',
    BTN_14: 'D-Pad ←',
    BTN_15: 'D-Pad →',
    BTN_16: 'PS Tlačidlo',
    BTN_17: 'Touchpad (PS4/PS5)',
    AXIS_LX_NEG: 'Ľavá páčka ←',
    AXIS_LX_POS: 'Ľavá páčka →',
    AXIS_LY_NEG: 'Ľavá páčka ↑',
    AXIS_LY_POS: 'Ľavá páčka ↓',
  };
  return pad ? map[pad] : '—';
}

export type HairStyleId = 'fade' | 'slick' | 'waves' | 'buzz';
export type BeardStyleId = 'clean' | 'stubble' | 'goatee' | 'full';
export type TattooStyleId = 'none' | 'serpent' | 'compass' | 'sunstate';
export type NeonColorId = 'off' | 'cyan' | 'pink' | 'lime' | 'amber';

export type ShopCategory =
  | 'convenience'
  | 'customs'
  | 'armory'
  | 'clothing'
  | 'barber'
  | 'tattoo'
  | 'bank'
  | 'dealership'
  | 'safehouse'
  | 'cafe'
  | 'club'
  | 'precinct';

export interface ShopLocation {
  id: string;
  name: string;
  category: ShopCategory;
  x: number;
  z: number;
  yaw: number;
  color: string;
  accentHex: number;
  shortLabel: string;
  description: string;
}

export interface VehicleSpec {
  id: VehicleTypeId;
  name: string;
  category: string;
  kind: VehicleKind;
  price: number;
  maxSpeed: number;
  accel: number;
  braking: number;
  turnSpeed: number;
  driftGrip: number;
  normalGrip: number;
  length: number;
  width: number;
  height: number;
  colors: number[];
  isPolice?: boolean;
  isEmergency?: boolean;
  isTaxi?: boolean;
  hasWaterCannon?: boolean;
  hasWeapons?: boolean;
}

export interface CharacterSkills {
  driving: number;
  shooting: number;
  flying: number;
  stamina: number;
}

export interface CharacterCustomization {
  jacketColor: number;
  shirtColor: number;
  pantsColor: number;
  hairStyle: HairStyleId;
  hairColor: number;
  beardStyle: BeardStyleId;
  tattooStyle: TattooStyleId;
  shadesColor: number;
}

export interface CharacterTheme {
  accentHex: string;
  secondaryHex: string;
  textAccentClass: string;
  borderAccentClass: string;
  buttonBgClass: string;
  badgeBgClass: string;
  panelGlowClass: string;
}

export interface CharacterAccount {
  cash: number;
  bankBalance: number;
  reputation: number;
  savedX?: number;
  savedZ?: number;
  savedYaw?: number;
  customization: CharacterCustomization;
  skills: CharacterSkills;
  unlockedWeapons: Record<WeaponId, boolean>;
  ammo: Record<WeaponId, number>;
  hasParachute: boolean;
}

export interface CharacterProfile {
  id: CharacterId;
  name: string;
  role: string;
  lifeStory: string;
  homeShopId: string;
  homeName: string;
  homeSpawnX: number;
  homeSpawnZ: number;
  homeSpawnYaw: number;
  strengthNote: string;
  weaknessNote: string;
  skinColor: number;
  startingCash: number;
  startingBank: number;
  startingReputation: number;
  startingSkills: CharacterSkills;
  defaults: CharacterCustomization;
  uiTheme: CharacterTheme;
}

export function getReputationRank(rep: number, characterId: CharacterId): string {
  if (characterId === 'kairo') {
    if (rep >= 1500) return 'Ikona Neon Tide';
    if (rep >= 750) return 'Majster siete';
    if (rep >= 300) return 'Nočný producent';
    return 'Klubový nováčik';
  }
  if (characterId === 'elena') {
    if (rep >= 1500) return 'Veliteľka Coral Keys';
    if (rep >= 750) return 'Eso oblohy';
    if (rep >= 300) return 'Elitná operátorka';
    return 'Pobrežná pilotka';
  }
  if (rep >= 1500) return 'Kráľ Palmetto Bay';
  if (rep >= 750) return 'Legenda asfaltu';
  if (rep >= 300) return 'Rešpektovaný jazdec';
  return 'Pouličný nováčik';
}

export interface WeaponSpec {
  id: WeaponId;
  name: string;
  damage: number;
  range: number;
  fireRate: number;
  automatic: boolean;
  spread: number;
  maxAmmo: number;
}

export interface RadioStation {
  id: RadioStationId;
  name: string;
  genre: string;
  bpm: number;
}

export interface MissionStageDef {
  objective: string;
  targetX: number;
  targetZ: number;
  targetY?: number;
  radius: number;
  kind: 'reach' | 'fly_ring' | 'evade_wanted' | 'deliver_car' | 'shoot_targets';
  requiredVehicleKind?: VehicleKind;
}

export interface StoryMissionDef {
  id: string;
  index: number;
  title: string;
  durationLabel: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  timeLimitSec: number;
  reward: number;
  wantedOnStart?: number;
  introLines: Array<{ speaker: string; text: string }>;
  outroLines: Array<{ speaker: string; text: string }>;
  stages: MissionStageDef[];
}

export interface HiddenMissionDef {
  id: string;
  title: string;
  district: string;
  x: number;
  y: number;
  z: number;
  reward: number;
  description: string;
}

export interface ActiveMissionState {
  activeId: string | null;
  isHidden: boolean;
  title: string;
  objective: string;
  targetX: number | null;
  targetY: number | null;
  targetZ: number | null;
  stageIndex: number;
  totalStages: number;
  timeLeft: number;
  reward: number;
  coopHostHandle?: string;
}

export interface CutsceneViewState {
  active: boolean;
  title: string;
  speaker: string;
  text: string;
  stepIndex: number;
  totalSteps: number;
}

export interface MinimapBlip {
  id?: string;
  x: number;
  z: number;
  type: 'police' | 'car' | 'target' | 'shop' | 'waypoint' | 'friend' | 'hidden';
  color: string;
  label?: string;
  category?: ShopCategory;
}

export interface GpsPoint {
  x: number;
  z: number;
}

export interface VehicleUpgradeState {
  engineLevel: number;
  turboInstalled: boolean;
  handlingLevel: number;
  neonColor: NeonColorId;
}

export interface RemoteFriendInfo {
  id: string;
  handle: string;
  characterId: CharacterId;
  x: number;
  z: number;
}

export interface PendingCoopInvite {
  fromHandle: string;
  missionId: string;
  missionTitle: string;
}

export interface AiNpcFeedItem {
  id: number;
  name: string;
  role: string;
  behavior: NpcBehaviorState;
  line: string;
  dist: number;
}

export interface HudSnapshot {
  characterId: CharacterId;
  characterName: string;
  characterRole: string;
  characterLifeStory: string;
  characterHomeName: string;
  characterTheme: CharacterTheme;
  reputation: number;
  reputationRank: string;
  customization: CharacterCustomization;
  skills: CharacterSkills;
  health: number;
  armor: number;
  cash: number;
  bankBalance: number;
  godMode: boolean;
  hasParachute: boolean;
  parachuteReady: boolean;
  parachuteOpen: boolean;
  wantedStars: number;
  wantedEvading: boolean;
  inVehicle: boolean;
  vehicleKind: VehicleKind | null;
  activeControlContext: ControlContextId;
  vehicleName: string;
  vehicleSpeedKmh: number;
  vehicleAltitude: number;
  vehicleHealth: number;
  vehicleOnFire: boolean;
  vehicleWaterDisabled: boolean;
  vehicleUpgrades: VehicleUpgradeState;
  cameraMode: CameraMode;
  weaponId: WeaponId;
  weaponName: string;
  ammo: Record<WeaponId, number>;
  unlockedWeapons: Record<WeaponId, boolean>;
  radioId: RadioStationId;
  radioName: string;
  timePreset: TimePreset;
  timeHour: number;
  autoTimeCycle: boolean;
  weatherPreset: WeatherPreset;
  targetWeatherPreset: WeatherPreset;
  weatherLabel: string;
  autoWeatherCycle: boolean;
  rainIntensity: number;
  aiDirectorStatus: 'idle' | 'active' | 'error';
  aiDirectorError: string;
  aiBulletin: string;
  aiPoliceTactic: string;
  aiNearbyNpcs: AiNpcFeedItem[];
  nearbyInteractNpc: { id: number; name: string; role: string; mood: string } | null;
  quality: QualityLevel;
  fps: number;
  promptText: string;
  nearbyShop: ShopLocation | null;
  insideShop: ShopLocation | null;
  nearbyHiddenMission: HiddenMissionDef | null;
  toastText: string;
  toastType: 'info' | 'success' | 'warning';
  mission: ActiveMissionState;
  completedStoryIds: string[];
  discoveredHiddenIds: string[];
  completedHiddenIds: string[];
  cutscene: CutsceneViewState;
  playerX: number;
  playerY: number;
  playerZ: number;
  playerYaw: number;
  blips: MinimapBlip[];
  gpsTarget: { x: number; z: number; label: string } | null;
  gpsRoute: GpsPoint[];
  gpsDistance: number;
  gpsTurnHint: string;
  pointerLocked: boolean;
  wasted: boolean;
  soundMuted: boolean;
  gamepadConnected: boolean;
  controlsConfig: ControlsConfig;
  playerHandle: string;
  friends: string[];
  onlineFriends: RemoteFriendInfo[];
  pendingInvite: PendingCoopInvite | null;
}

export const VEHICLE_SPECS: Record<VehicleTypeId, VehicleSpec> = {
  veloce: {
    id: 'veloce',
    name: 'Veloce GT',
    category: 'Športové kupé',
    kind: 'car',
    price: 1200,
    maxSpeed: 58,
    accel: 36,
    braking: 46,
    turnSpeed: 2.75,
    driftGrip: 2.5,
    normalGrip: 8.6,
    length: 4.5,
    width: 2.0,
    height: 1.26,
    colors: [0xc81e4b, 0x0ea5e9, 0xd97706, 0xe2e8f0, 0x4f46e5],
  },
  solstice: {
    id: 'solstice',
    name: 'Solstice Roadster',
    category: 'Superšport',
    kind: 'car',
    price: 2400,
    maxSpeed: 74,
    accel: 47,
    braking: 55,
    turnSpeed: 2.95,
    driftGrip: 2.7,
    normalGrip: 9.4,
    length: 4.5,
    width: 2.08,
    height: 1.16,
    colors: [0xbe123c, 0x0284c7, 0xeab308, 0x7e22ce, 0x059669],
  },
  brawler: {
    id: 'brawler',
    name: 'Brawler V8',
    category: 'Muscle Car',
    kind: 'car',
    price: 950,
    maxSpeed: 52,
    accel: 34,
    braking: 40,
    turnSpeed: 2.45,
    driftGrip: 2.0,
    normalGrip: 7.5,
    length: 4.8,
    width: 2.1,
    height: 1.38,
    colors: [0xc2410c, 0x1e293b, 0xb91c1c, 0x0369a1, 0xca8a04],
  },
  terramax: {
    id: 'terramax',
    name: 'TerraMax 4x4',
    category: 'Pobrežné SUV',
    kind: 'car',
    price: 1100,
    maxSpeed: 46,
    accel: 28,
    braking: 38,
    turnSpeed: 2.25,
    driftGrip: 3.1,
    normalGrip: 8.8,
    length: 5.0,
    width: 2.25,
    height: 1.75,
    colors: [0x047857, 0x334155, 0xdbeafe, 0x5b21b6, 0x0369a1],
  },
  taxi: {
    id: 'taxi',
    name: 'Sunstate Cab Taxi',
    category: 'Taxík',
    kind: 'car',
    price: 700,
    maxSpeed: 48,
    accel: 30,
    braking: 42,
    turnSpeed: 2.55,
    driftGrip: 2.8,
    normalGrip: 8.6,
    length: 4.6,
    width: 2.02,
    height: 1.38,
    colors: [0xeab308],
    isTaxi: true,
  },
  ambulance: {
    id: 'ambulance',
    name: 'Sunstate EMS Sanitka',
    category: 'Záchranka',
    kind: 'car',
    price: 0,
    maxSpeed: 50,
    accel: 30,
    braking: 42,
    turnSpeed: 2.3,
    driftGrip: 3.2,
    normalGrip: 8.8,
    length: 5.4,
    width: 2.28,
    height: 2.25,
    colors: [0xf1f5f9],
    isEmergency: true,
  },
  firetruck: {
    id: 'firetruck',
    name: 'Palmetto Hasičské Auto',
    category: 'Hasiči · Vodné delo',
    kind: 'car',
    price: 0,
    maxSpeed: 44,
    accel: 24,
    braking: 36,
    turnSpeed: 1.95,
    driftGrip: 3.6,
    normalGrip: 8.4,
    length: 6.8,
    width: 2.45,
    height: 2.65,
    colors: [0xb91c1c],
    isEmergency: true,
    hasWaterCannon: true,
  },
  pbpd: {
    id: 'pbpd',
    name: 'PBPD Interceptor',
    category: 'Policajné auto',
    kind: 'car',
    price: 0,
    maxSpeed: 56,
    accel: 37,
    braking: 46,
    turnSpeed: 2.8,
    driftGrip: 2.9,
    normalGrip: 9.3,
    length: 4.7,
    width: 2.05,
    height: 1.42,
    colors: [0x0f172a],
    isPolice: true,
    isEmergency: true,
  },
  helicopter: {
    id: 'helicopter',
    name: 'SkyHawk Vrtuľník',
    category: 'Helikoptéra',
    kind: 'helicopter',
    price: 5500,
    maxSpeed: 64,
    accel: 30,
    braking: 30,
    turnSpeed: 2.2,
    driftGrip: 4,
    normalGrip: 4,
    length: 6.4,
    width: 2.2,
    height: 2.6,
    colors: [0x0369a1, 0xd97706, 0x1e293b],
  },
  plane: {
    id: 'plane',
    name: 'Coral Wing Lietadlo',
    category: 'Vrtuľové lietadlo',
    kind: 'plane',
    price: 4800,
    maxSpeed: 92,
    accel: 34,
    braking: 26,
    turnSpeed: 1.9,
    driftGrip: 4,
    normalGrip: 4,
    length: 6.8,
    width: 8.4,
    height: 2.2,
    colors: [0xe2e8f0, 0xbe123c],
  },
  jet: {
    id: 'jet',
    name: 'Valkyrie Ozbrojená Stíhačka',
    category: 'Bojová stíhačka',
    kind: 'plane',
    price: 9500,
    maxSpeed: 145,
    accel: 64,
    braking: 40,
    turnSpeed: 2.4,
    driftGrip: 4,
    normalGrip: 4,
    length: 8.2,
    width: 7.4,
    height: 2.3,
    colors: [0x334155],
    hasWeapons: true,
  },
};

export const CHARACTERS: Record<CharacterId, CharacterProfile> = {
  dante: {
    id: 'dante',
    name: 'Dante Vance',
    role: 'Pouličný pretekár & Kuriér',
    lifeStory:
      'Bývalý víťaz ilegálnych šprintov na pobrežnej diaľnici, ktorý si vybudoval vlastnú dielňu v úkryte na západe mesta a pozná každú skratku cez lesy aj prístav.',
    homeShopId: 'dantes_hideout',
    homeName: "Dante's Hideout (Západ)",
    homeSpawnX: -885,
    homeSpawnZ: 365,
    homeSpawnYaw: -Math.PI * 0.5,
    strengthNote: 'Silný šofér a výdrž',
    weaknessNote: 'Slabšia presnosť streľby a pilotovanie',
    skinColor: 0xd99b78,
    startingCash: 2500,
    startingBank: 4800,
    startingReputation: 240,
    startingSkills: { driving: 64, shooting: 34, flying: 26, stamina: 60 },
    defaults: {
      jacketColor: 0x0e7490,
      shirtColor: 0xe2e8f0,
      pantsColor: 0x1e293b,
      hairStyle: 'fade',
      hairColor: 0x171717,
      beardStyle: 'stubble',
      tattooStyle: 'none',
      shadesColor: 0x0f172a,
    },
    uiTheme: {
      accentHex: '#22d3ee',
      secondaryHex: '#f59e0b',
      textAccentClass: 'text-cyan-300',
      borderAccentClass: 'border-cyan-400/45',
      buttonBgClass: 'bg-cyan-400 hover:bg-cyan-300 text-slate-950',
      badgeBgClass: 'bg-cyan-950/90 text-cyan-200 border-cyan-400/40',
      panelGlowClass: 'border-cyan-500/30',
    },
  },
  elena: {
    id: 'elena',
    name: 'Elena Cruz',
    role: 'Taktická pilotka & Strelkyňa',
    lifeStory:
      'Bývalá záchranárska pilotka z Coral Keys, ktorá býva v luxusnom Marina Lofte pri severnom kanáli a riadi letecké operácie s chladnou presnosťou.',
    homeShopId: 'marina_loft',
    homeName: 'Marina Loft (Severné pobrežie)',
    homeSpawnX: 525,
    homeSpawnZ: -842,
    homeSpawnYaw: 1.18,
    strengthNote: 'Presná streľba a pilotovanie lietadiel',
    weaknessNote: 'Slabšia kontrola auta v šmyku',
    skinColor: 0xc6865c,
    startingCash: 3100,
    startingBank: 7200,
    startingReputation: 380,
    startingSkills: { driving: 36, shooting: 68, flying: 64, stamina: 44 },
    defaults: {
      jacketColor: 0xbe123c,
      shirtColor: 0x0f172a,
      pantsColor: 0x334155,
      hairStyle: 'waves',
      hairColor: 0x29170b,
      beardStyle: 'clean',
      tattooStyle: 'none',
      shadesColor: 0x1e1b4b,
    },
    uiTheme: {
      accentHex: '#fb7185',
      secondaryHex: '#facc15',
      textAccentClass: 'text-rose-300',
      borderAccentClass: 'border-rose-400/45',
      buttonBgClass: 'bg-rose-400 hover:bg-rose-300 text-slate-950',
      badgeBgClass: 'bg-rose-950/90 text-rose-200 border-rose-400/40',
      panelGlowClass: 'border-rose-500/30',
    },
  },
  kairo: {
    id: 'kairo',
    name: 'Kairo Delgado',
    role: 'Nočný DJ & Hacker z centra',
    lifeStory:
      'Rezidentný DJ podzemných klubov a digitálny stratég. Vo svojom štúdiovom lofte priamo v centre Palmetto Bay mixuje beaty a sleduje policajné frekvencie.',
    homeShopId: 'pulse_studio_loft',
    homeName: 'Pulse Studio Loft (Centrum)',
    homeSpawnX: -62,
    homeSpawnZ: -118,
    homeSpawnYaw: 0.4,
    strengthNote: 'Vysoká výdrž, nočný prehľad a taktická streľba',
    weaknessNote: 'Menšie skúsenosti s ťažkým letectvom',
    skinColor: 0xb97b56,
    startingCash: 4200,
    startingBank: 6500,
    startingReputation: 310,
    startingSkills: { driving: 52, shooting: 58, flying: 32, stamina: 72 },
    defaults: {
      jacketColor: 0x6d28d9,
      shirtColor: 0x111827,
      pantsColor: 0x0f172a,
      hairStyle: 'slick',
      hairColor: 0x0f172a,
      beardStyle: 'goatee',
      tattooStyle: 'compass',
      shadesColor: 0x4c1d95,
    },
    uiTheme: {
      accentHex: '#c084fc',
      secondaryHex: '#34d399',
      textAccentClass: 'text-purple-300',
      borderAccentClass: 'border-purple-400/45',
      buttonBgClass: 'bg-purple-400 hover:bg-purple-300 text-slate-950',
      badgeBgClass: 'bg-purple-950/90 text-purple-200 border-purple-400/40',
      panelGlowClass: 'border-purple-500/30',
    },
  },
};

export const WEAPONS: Record<WeaponId, WeaponSpec> = {
  fists: {
    id: 'fists',
    name: 'Päste / Súboj',
    damage: 36,
    range: 3.0,
    fireRate: 0.4,
    automatic: false,
    spread: 0,
    maxAmmo: 0,
  },
  pistol: {
    id: 'pistol',
    name: 'Viper 9mm',
    damage: 45,
    range: 85,
    fireRate: 0.25,
    automatic: false,
    spread: 0.018,
    maxAmmo: 140,
  },
  smg: {
    id: 'smg',
    name: 'Tide-9 SMG',
    damage: 30,
    range: 75,
    fireRate: 0.095,
    automatic: true,
    spread: 0.048,
    maxAmmo: 280,
  },
};

export const RADIO_STATIONS: RadioStation[] = [
  { id: 'pulse', name: 'Pulse FM 104.2', genre: 'Miami Electro-Pop', bpm: 122 },
  { id: 'synthwave', name: 'Synthwave Coast', genre: 'Neon Retrowave', bpm: 108 },
  { id: 'bassline', name: 'Bassline Radio', genre: 'Sunstate Trap', bpm: 92 },
  { id: 'off', name: 'Rádio vypnuté', genre: 'Zvuky mesta a motora', bpm: 0 },
];

export const SHOPS: ShopLocation[] = [
  {
    id: 'quickstop_24',
    name: 'QuickStop 24',
    category: 'convenience',
    x: -150,
    z: -230,
    yaw: 2.356,
    color: '#22d3ee',
    accentHex: 0x22d3ee,
    shortLabel: '24/7',
    description: 'Veľký supermarket s uličkami, nápojmi a snackmi',
  },
  {
    id: 'sunsip_mart',
    name: 'SunSip Mart',
    category: 'convenience',
    x: 674,
    z: 165,
    yaw: 0.381,
    color: '#22d3ee',
    accentHex: 0x22d3ee,
    shortLabel: 'MART',
    description: 'Plážový obchodný dom na Flamingo Blvd',
  },
  {
    id: 'apex_customs_south',
    name: 'Apex Customs · Prístav',
    category: 'customs',
    x: -198,
    z: 638,
    yaw: 2.356,
    color: '#a855f7',
    accentHex: 0xa855f7,
    shortLabel: 'SERVIS',
    description: 'Vojdi autom dnu na zdvihák pre opravu, turbo a tuning',
  },
  {
    id: 'apex_customs_north',
    name: 'Apex Customs · Sever',
    category: 'customs',
    x: 203,
    z: -607,
    yaw: -2.356,
    color: '#a855f7',
    accentHex: 0xa855f7,
    shortLabel: 'SERVIS',
    description: 'Vojdi autom priamo do dielne pre lakovanie a výkon',
  },
  {
    id: 'ironclad_armory',
    name: 'Ironclad Armory & Strelnica',
    category: 'armory',
    x: 285,
    z: 371,
    yaw: -2.715,
    color: '#ef4444',
    accentHex: 0xef4444,
    shortLabel: 'ZBRANE',
    description: 'Rozľahlý obchod so zbraňami, padákom a strelnicou',
  },
  {
    id: 'threads_co',
    name: 'Threads & Co.',
    category: 'clothing',
    x: -533,
    z: -167,
    yaw: -0.391,
    color: '#f472b6',
    accentHex: 0xf472b6,
    shortLabel: 'OBLEČENIE',
    description: 'Veľký obchodný dom s uličkami oblečenia a poschodím s výťahom',
  },
  {
    id: 'velvet_fit',
    name: 'Velvet Fit',
    category: 'clothing',
    x: 240,
    z: -242,
    yaw: 3.142,
    color: '#f472b6',
    accentHex: 0xf472b6,
    shortLabel: 'MÓDA',
    description: 'Butiková galéria so stojanmi oblečenia a VIP terasou',
  },
  {
    id: 'crown_tailors',
    name: 'Crown Tailors',
    category: 'clothing',
    x: -270,
    z: 150,
    yaw: 2.356,
    color: '#f472b6',
    accentHex: 0xf472b6,
    shortLabel: 'OBLEKY',
    description: 'Dvojposchodový módny dom s kabínkami a výťahom',
  },
  {
    id: 'sharpclip_studio',
    name: 'SharpClip Studio',
    category: 'barber',
    x: 138,
    z: -520,
    yaw: 1.571,
    color: '#fb923c',
    accentHex: 0xfb923c,
    shortLabel: 'HOLIČSTVO',
    description: 'Moderný salón so zrkadlami, kreslami a stylingom',
  },
  {
    id: 'inkwave_parlor',
    name: 'InkWave Parlor',
    category: 'tattoo',
    x: 683,
    z: -257,
    yaw: 0.391,
    color: '#c084fc',
    accentHex: 0xc084fc,
    shortLabel: 'TETOVANIE',
    description: 'Tetovacie štúdio s galériou motívov a salónikom',
  },
  {
    id: 'apex_trust_atm',
    name: 'Apex Trust Tower',
    category: 'bank',
    x: -319,
    z: -306,
    yaw: 1.989,
    color: '#38bdf8',
    accentHex: 0x38bdf8,
    shortLabel: 'BANKA & VÝŤAH',
    description: 'Mramorové lobby mrakodrapu s bankou a výťahom na strechu',
  },
  {
    id: 'sunstate_motors',
    name: 'Sunstate Motors',
    category: 'dealership',
    x: 252,
    z: 812,
    yaw: 0.785,
    color: '#facc15',
    accentHex: 0xfacc15,
    shortLabel: 'AUTOSALÓN',
    description: 'Veľký autosalón s pódiami, autami dnu a strešným heliportom',
  },
  {
    id: 'dantes_hideout',
    name: "Dante's Hideout",
    category: 'safehouse',
    x: -914,
    z: 369,
    yaw: -2.938,
    color: '#22c55e',
    accentHex: 0x22c55e,
    shortLabel: 'ÚKRYT & VÝŤAH',
    description: 'Bezpečné sídlo s garážou, obývačkou a výťahom na terasu',
  },
  {
    id: 'marina_loft',
    name: 'Marina Loft',
    category: 'safehouse',
    x: 538,
    z: -869,
    yaw: 1.182,
    color: '#22c55e',
    accentHex: 0x22c55e,
    shortLabel: 'DOM ELENA · VÝŤAH',
    description: 'Luxusný pobrežný apartmán Eleny Cruz s výťahom na strechu',
  },
  {
    id: 'pulse_studio_loft',
    name: 'Pulse Studio Loft',
    category: 'safehouse',
    x: -72,
    z: -102,
    yaw: 2.75,
    color: '#c084fc',
    accentHex: 0xc084fc,
    shortLabel: 'DOM KAIRO · ŠTÚDIO',
    description: 'Centrálny DJ & hackerský loft Kaira Delgada so zvukovou réžiou a výťahom',
  },
  {
    id: 'palmetto_bistro',
    name: 'Palmetto Roastery Café',
    category: 'cafe',
    x: 92,
    z: 96,
    yaw: -2.356,
    color: '#f59e0b',
    accentHex: 0xf59e0b,
    shortLabel: 'KAVIAREŇ',
    description: 'Pobrežná kaviareň s teplými nápojmi, koláčikmi a posedením pri parku',
  },
  {
    id: 'pbpd_precinct',
    name: 'PBPD Ústredie Palmetto',
    category: 'precinct',
    x: 112,
    z: -332,
    yaw: 1.571,
    color: '#38bdf8',
    accentHex: 0x38bdf8,
    shortLabel: 'POLÍCIA PBPD',
    description: 'Hlavná budova polície PBPD s recepciou, celami a výbavou ochranných viest',
  },
  {
    id: 'neon_reef_club',
    name: 'Neon Reef Beach Club',
    category: 'club',
    x: 694,
    z: -18,
    yaw: -1.571,
    color: '#ec4899',
    accentHex: 0xec4899,
    shortLabel: 'NOČNÝ KLUB',
    description: 'Veľký plážový klub s DJ pultom, barom a VIP poschodím',
  },
];
