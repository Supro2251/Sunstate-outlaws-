import {
  CharacterId,
  ControlActionId,
  ControlContextId,
  LanguageCode,
  NpcBehaviorState,
  TimePreset,
  WeatherPreset,
} from './types';

export const LANGUAGE_OPTIONS: Array<{ code: LanguageCode; label: string; native: string }> = [
  { code: 'en', label: 'English', native: 'English (Default)' },
  { code: 'sk', label: 'Slovak', native: 'Slovenčina' },
  { code: 'cs', label: 'Czech', native: 'Čeština' },
  { code: 'de', label: 'German', native: 'Deutsch' },
  { code: 'es', label: 'Spanish', native: 'Español' },
  { code: 'pl', label: 'Polish', native: 'Polski' },
];

export interface UiStrings {
  // Startup screen
  modeLabel: string;
  startupSubtitle: string;
  badgeVehicles: string;
  badgeBuildings: string;
  badgeController: string;
  badgeCoop: string;
  playAs: string;
  cash: string;
  bank: string;
  skillDrive: string;
  skillShoot: string;
  skillFly: string;
  skillStam: string;
  languageLabel: string;
  cloudQuickLoadTitle: string;
  cloudSyncPlaceholder: string;
  cloudLoadBtn: string;
  cloudLoadedToast: string;
  cloudDefaultNote: string;

  // HUD top & panels
  mapTitle: string;
  phoneTitle: string;
  cameraTitle: string;
  settingsTitle: string;
  helpTitle: string;
  aiDispatchTitle: string;
  aiActive: string;
  aiError: string;
  aiWaiting: string;
  step: string;
  cancelMission: string;
  gslCourier: string;
  gslVan: string;
  gslPkg: string;
  gslRouteOk: string;
  gslOffRoad: string;
  inviteFrom: string;
  accept: string;
  decline: string;
  health: string;
  armor: string;
  bodyHealth: string;
  alt: string;
  fireAlert: string;
  waterAlert: string;
  fistsLabel: string;
  precisionAimActive: string;
  parachuteOpenHint: string;
  parachuteReadyHint: string;
  eliminated: string;
  continueBtn: string;
  skipBtn: string;

  // Prompt action buttons & dock
  startRandomMissionBtn: string;
  openShopMenuBtn: string;
  talkNpcBtn: string;
  hideMenu: string;
  openMenu: string;
  tabVehicles: string;
  tabMissions: string;
  tabWorld: string;
  tabRadio: string;
  radioBtn: string;
  phoneBtn: string;
  mapBtn: string;
  muteSound: string;
  unmuteSound: string;
  inGarage: string;
  storyMissionsTab: string;
  randomMissionsTab: string;
  completedRandomCount: string;
  running: string;
  locked: string;
  start: string;
  repeat: string;
  done: string;
  requiresMissions: string;
  noRandomDiscovered: string;
  weatherPrefix: string;
  autoTimeBtn: string;
  autoWeatherBtn: string;
  graphicsPrefix: string;
  qualHigh: string;
  qualMed: string;
  qualPerf: string;
  cameraPrefix: string;
  settingsShortcutBtn: string;
  nowPlaying: string;
  nextStationBtn: string;
  radioOffName: string;

  // Help modal
  helpHeader: string;
  helpSub: string;
  backToGame: string;
  helpOnFootTitle: string;
  helpVehicleTitle: string;
  helpPhoneNote: string;
  helpCharsNote: string;
  activeDeviceBadge: string;
  deviceKeyboard: string;
  devicePlaystation: string;
  deviceXbox: string;
  deviceTouch: string;
  uiModeTitle: string;
  uiModeAuto: string;
  uiModePc: string;
  uiModeMobile: string;
  uiModeHint: string;
  detectedPlatformLabel: string;
  platformPc: string;
  platformMobile: string;
  touchControlsTip: string;
  touchGas: string;
  touchBrake: string;
  touchDrift: string;
  touchLeft: string;
  touchRight: string;
  touchFire: string;
  touchAim: string;
  touchJump: string;
  touchChute: string;
  touchSprint: string;
  touchEnter: string;
  touchExit: string;
  touchUp: string;
  touchDown: string;
  touchClimb: string;
  touchDive: string;
  touchWeapon: string;
  touchTalk: string;
  touchShop: string;
  touchMission: string;
  mobileLookHint: string;

  // Settings modal
  settingsHeader: string;
  settingsSub: string;
  langSectionTitle: string;
  langDefaultHint: string;
  cloudSectionTitle: string;
  cloudDesc: string;
  cloudSaveBtn: string;
  cloudUnlinkBtn: string;
  cloudSavedAtLabel: string;
  sensitivityTitle: string;
  steeringSensLabel: string;
  lookSensLabel: string;
  resetSensBtn: string;
  controlsTitle: string;
  controllerConnected: string;
  controllerDisconnected: string;
  controllerLayoutLabel: string;
  layoutAuto: string;
  resetDefaultsBtn: string;
  controlsContextTip: string;
  flightTip: string;
  pressKeyPrompt: string;
  pressPadPrompt: string;
  multiplayerTitle: string;
  onlineFriendsCount: string;
  handlePlaceholder: string;
  saveHandleBtn: string;
  friendPlaceholder: string;
  addFriendBtn: string;
  friendsHint: string;
  graphicsQualityTitle: string;
  qualHighFull: string;
  qualMedFull: string;
  qualPerfFull: string;
  resetAllTitle: string;
  resetAllDesc: string;
  resetAllBtn: string;
  confirmDeleteBtn: string;
  cancelBtn: string;

  // Map modal
  mapHeader: string;
  mapSubCoords: string;
  mapSubHeading: string;
  mapSubClick: string;
  centerOnPlayerBtn: string;
  closeBtn: string;
  buildingsListTitle: string;
  miniMapTag: string;

  // Phone modal
  phoneHeader: string;
  tabServices: string;
  tabAiChat: string;
  tabAiMission: string;
  emergencyServicesTitle: string;
  callEms: string;
  callFire: string;
  callPolice: string;
  callTaxi: string;
  cheatDialerTitle: string;
  dialBtn: string;
  cheatListTitle: string;
  cheatListHint: string;
  dispatchPrefix: string;
  aiThinking: string;
  askAiPlaceholder: string;
  aiMissionDesc: string;
  aiMissionPlaceholder: string;
  quickIdeasTitle: string;
  generateMissionBtn: string;
  generatingMissionBtn: string;

  // NPC Chat
  npcDialogTag: string;
  npcTyping: string;
  npcPlaceholder: string;
  sendBtn: string;

  // Shop Modal
  freeRoamTitle: string;
  freeRoamObjective: string;
  welcomeToast: string;
  closeShop: string;
  deposit500: string;
  withdraw500: string;
  bankHeistBtn: string;
  testDriveBtn: string;
  deliverVehicleBtn: string;
  buyVehicleBtn: string;
  restBtn: string;
  saveLocalBtn: string;
  advanceTimeTitle: string;
  armoryRangeTip: string;
}

const EN_STRINGS: UiStrings = {
  modeLabel: 'PALMETTO BAY & CORAL KEYS COUNTY · MODE',
  startupSubtitle:
    'Expansive 3D open-world action sandbox with road GPS, parks, beaches, airports, enterable interiors, dynamic weather, live AI city, 51 story contracts & 25 discoverable side challenges.',
  badgeVehicles: '12 cars, helis & jets',
  badgeBuildings: 'enterable buildings',
  badgeController: 'PS4 / PS5 & Xbox Ready',
  badgeCoop: 'Co-op multiplayer',
  playAs: 'PLAY AS',
  cash: 'Cash',
  bank: 'Bank',
  skillDrive: 'Drive',
  skillShoot: 'Aim',
  skillFly: 'Fly',
  skillStam: 'Stam',
  languageLabel: 'Language',
  cloudQuickLoadTitle: 'Cloud Save Restore',
  cloudSyncPlaceholder: 'Enter Cloud Sync ID...',
  cloudLoadBtn: 'Load Cloud Save',
  cloudLoadedToast: 'Cloud progress & language restored!',
  cloudDefaultNote: 'Starts in English by default unless restored from a Cloud Save.',

  mapTitle: 'Map & Road GPS',
  phoneTitle: 'Phone, AI & Cheats',
  cameraTitle: 'Camera View 1st/3rd',
  settingsTitle: 'Settings, Controls, Language & Cloud',
  helpTitle: 'Controls & City Guide',
  aiDispatchTitle: 'Palmetto AI Dispatch',
  aiActive: 'Live',
  aiError: 'Offline',
  aiWaiting: 'Standby',
  step: 'Stage',
  cancelMission: 'Abort mission',
  gslCourier: 'GSL COURIER',
  gslVan: 'Van',
  gslPkg: 'Parcel',
  gslRouteOk: 'Route: On-Road OK',
  gslOffRoad: 'OFF-ROAD!',
  inviteFrom: 'Mission invite from',
  accept: 'Accept',
  decline: 'Decline',
  health: 'Health',
  armor: 'Armor',
  bodyHealth: 'Body',
  alt: 'Alt',
  fireAlert: 'FIRE!',
  waterAlert: 'WATER!',
  fistsLabel: 'Fists',
  precisionAimActive: 'Precision Aim active',
  parachuteOpenHint: 'Parachute deployed (Steer to glide)',
  parachuteReadyHint: 'Parachute ready',
  eliminated: 'WASTED',
  continueBtn: 'Continue',
  skipBtn: 'Skip',

  startRandomMissionBtn: 'Start Challenge',
  openShopMenuBtn: 'Open Menu',
  talkNpcBtn: 'Talk',
  hideMenu: 'Hide Menu',
  openMenu: 'Open Menu',
  tabVehicles: 'Vehicles',
  tabMissions: 'Missions',
  tabWorld: 'World & Crew',
  tabRadio: 'Radio',
  radioBtn: 'Radio',
  phoneBtn: 'Phone',
  mapBtn: 'Map',
  muteSound: 'Mute Audio',
  unmuteSound: 'Unmute Audio',
  inGarage: 'Owned',
  storyMissionsTab: 'Story Missions',
  randomMissionsTab: 'Random Missions',
  completedRandomCount: 'Completed random',
  running: 'Active',
  locked: 'Locked',
  start: 'Start',
  repeat: 'Replay',
  done: 'Completed',
  requiresMissions: 'Requires',
  noRandomDiscovered:
    'No random missions discovered yet. Explore Palmetto Bay, parks, piers, airports and rooftops to unlock side challenges.',
  weatherPrefix: 'Weather:',
  autoTimeBtn: 'Auto Time (1m/s)',
  autoWeatherBtn: 'Auto Weather (Smooth)',
  graphicsPrefix: 'Graphics:',
  qualHigh: 'High',
  qualMed: 'Balanced',
  qualPerf: 'Performance',
  cameraPrefix: 'Camera:',
  settingsShortcutBtn: 'Controls & Settings',
  nowPlaying: 'Now playing:',
  nextStationBtn: 'Next Station',
  radioOffName: 'Radio Off',

  helpHeader: 'Palmetto Bay Field Guide & Controls',
  helpSub: 'Sunstate Outlaws: Neon Tide · Coral Keys County',
  backToGame: 'Back to Game',
  helpOnFootTitle: 'On Foot, Combat & Parachute',
  helpVehicleTitle: 'Cars, Helicopters & Aircraft',
  helpPhoneNote:
    'Mobile & AI: Call emergency services, consult Palmetto AI Copilot, generate custom AI missions, or talk to NPCs!',
  helpCharsNote:
    '3 Protagonists & Safehouses: Switch freely between Dante, Elena, and Kairo. Each has their own home, cash, reputation, and UI theme.',
  activeDeviceBadge: 'Active Input',
  deviceKeyboard: 'Keyboard & Mouse',
  devicePlaystation: 'PlayStation Controller',
  deviceXbox: 'Xbox Controller',
  deviceTouch: 'Touch Controls',
  uiModeTitle: 'Interface Mode (PC / Mobile Auto-Switch)',
  uiModeAuto: 'Auto-Detect',
  uiModePc: 'PC Desktop',
  uiModeMobile: 'Mobile Touch',
  uiModeHint:
    'Auto-Detect switches automatically between PC Desktop UI and Mobile Touch Controls based on your device.',
  detectedPlatformLabel: 'Detected Device',
  platformPc: 'PC',
  platformMobile: 'Mobile',
  touchControlsTip:
    'Mobile Touch Active: Drag the 3D viewport to look around. Use the left thumb joystick (or steer buttons in cars) and right thumb action pads. You can still pair a Bluetooth PS/Xbox controller anytime.',
  touchGas: 'GAS',
  touchBrake: 'BRK',
  touchDrift: 'DRIFT',
  touchLeft: 'LEFT',
  touchRight: 'RIGHT',
  touchFire: 'FIRE',
  touchAim: 'AIM',
  touchJump: 'JUMP',
  touchChute: 'CHUTE',
  touchSprint: 'RUN',
  touchEnter: 'ENTER',
  touchExit: 'EXIT',
  touchUp: 'UP',
  touchDown: 'DOWN',
  touchClimb: 'NOS ↑',
  touchDive: 'NOS ↓',
  touchWeapon: 'GUN',
  touchTalk: 'TALK',
  touchShop: 'SHOP',
  touchMission: 'MISSION',
  mobileLookHint: 'Drag open screen to look',

  settingsHeader: 'Settings, Language, Controls & Cloud Save',
  settingsSub: 'Device-specific remapping, steering sensitivity, multi-language & cloud sync',
  langSectionTitle: 'Interface Language',
  langDefaultHint:
    'Game always boots in English by default unless you save your progress & language to the Cloud.',
  cloudSectionTitle: 'Cloud Save (Progress + Language)',
  cloudDesc:
    'Save your full campaign progress, character accounts, controls, and current language to the Cloud so they restore on startup or across sessions.',
  cloudSaveBtn: 'Save to Cloud',
  cloudUnlinkBtn: 'Unlink Cloud',
  cloudSavedAtLabel: 'Last Cloud Save:',
  sensitivityTitle: 'Steering & Look Sensitivity',
  steeringSensLabel: 'Steering / Turning Sensitivity',
  lookSensLabel: 'Camera / Aim Sensitivity',
  resetSensBtn: 'Reset 100%',
  controlsTitle: 'Input Remapping (Per Vehicle & On Foot)',
  controllerConnected: 'Controller Connected',
  controllerDisconnected: 'No Controller Detected',
  controllerLayoutLabel: 'Controller Prompts:',
  layoutAuto: 'Auto-Detect',
  resetDefaultsBtn: 'Reset Context Defaults',
  controlsContextTip:
    'Bindings are isolated per context and filtered to your active device. Select Keyboard, PlayStation, or Xbox above to customize.',
  flightTip:
    'Flight Controls: Pulling stick DOWN raises the nose UP (climb). Pushing stick UP pitches nose DOWN (dive).',
  pressKeyPrompt: 'Press key...',
  pressPadPrompt: 'Press button...',
  multiplayerTitle: 'Multiplayer & Friends',
  onlineFriendsCount: 'Online friends in city:',
  handlePlaceholder: 'Your player handle...',
  saveHandleBtn: 'Save Handle',
  friendPlaceholder: 'Enter friend handle...',
  addFriendBtn: 'Add Friend',
  friendsHint:
    'When a friend from your list joins under their handle, you meet live inside Palmetto Bay automatically!',
  graphicsQualityTitle: 'Graphics Quality',
  qualHighFull: 'High (Shadows + Bloom)',
  qualMedFull: 'Medium (Balanced)',
  qualPerfFull: 'Performance (30+ FPS iGPU)',
  resetAllTitle: 'Reset All Progress',
  resetAllDesc:
    'Erases money, reputation, and progress for all three protagonists (Dante, Elena, Kairo), weapons, and discovered missions.',
  resetAllBtn: 'Reset Game',
  confirmDeleteBtn: 'Confirm Erase',
  cancelBtn: 'Cancel',

  mapHeader: 'Palmetto Bay & Coral Keys Map (Road GPS)',
  mapSubCoords: 'Pos:',
  mapSubHeading: 'Heading:',
  mapSubClick: 'Click anywhere on the map for the shortest road route',
  centerOnPlayerBtn: 'Center on Me',
  closeBtn: 'Close',
  buildingsListTitle: 'Buildings & Landmarks (Click for GPS)',
  miniMapTag: 'Map',

  phoneHeader: 'SUNSTATE MOBILE',
  tabServices: 'Services',
  tabAiChat: 'Palmetto AI',
  tabAiMission: 'AI Mission',
  emergencyServicesTitle: 'Emergency Dispatch & Taxi',
  callEms: 'EMS Ambulance',
  callFire: 'Fire Dept',
  callPolice: 'PBPD Police',
  callTaxi: 'Call Taxi',
  cheatDialerTitle: 'Keypad / Secret Numbers',
  dialBtn: 'Dial Number',
  cheatListTitle: 'Secret Numbers Directory',
  cheatListHint: 'Dial manually on keypad',
  dispatchPrefix: 'City Dispatch:',
  aiThinking: 'Palmetto AI thinking...',
  askAiPlaceholder: 'Ask Palmetto AI...',
  aiMissionDesc:
    'Enter any theme and Palmetto AI will generate a custom 3-stage contract across Palmetto Bay.',
  aiMissionPlaceholder: 'e.g. Fast storm getaway from bank to the harbor...',
  quickIdeasTitle: 'Quick Ideas:',
  generateMissionBtn: 'Generate & Launch Mission',
  generatingMissionBtn: 'AI crafting contract...',

  npcDialogTag: 'AI NPC Dialogue',
  npcTyping: 'typing...',
  npcPlaceholder: 'Write a message...',
  sendBtn: 'Send',

  freeRoamTitle: 'Free Roam — Palmetto Bay',
  freeRoamObjective: 'Explore open roads, enter buildings, or discover random side missions',
  welcomeToast: 'Welcome to Palmetto Bay! Press M for Map, T for Phone, O for Settings.',
  closeShop: 'Close',
  deposit500: 'Deposit $500',
  withdraw500: 'Withdraw $500',
  bankHeistBtn: 'Launch Bank Heist — Gold Rush (+$850)',
  testDriveBtn: 'Test Drive',
  deliverVehicleBtn: 'Deliver',
  buyVehicleBtn: 'Buy',
  restBtn: 'Rest (100% HP & Clear Wanted)',
  saveLocalBtn: 'Save Local Progress',
  advanceTimeTitle: 'Advance Time of Day',
  armoryRangeTip:
    'Tip: Use the live shooting range at the back of the shop to practice aim and earn bonuses.',
};

const SK_STRINGS: UiStrings = {
  modeLabel: 'PALMETTO BAY & CORAL KEYS COUNTY · REŽIM',
  startupSubtitle:
    'Rozsiahly 3D otvorený svet s GPS po cestách, parkami, plážami, letiskami, vstupnými budovami, plynulým počasím, AI mestom, 51 príbehovými a 25 náhodnými výzvami.',
  badgeVehicles: '12 áut, vrtuľníkov & stíhačiek',
  badgeBuildings: 'vstupných budov',
  badgeController: 'PS4 / PS5 & Xbox ovládač',
  badgeCoop: 'Co-op multiplayer',
  playAs: 'HRAŤ ZA',
  cash: 'Hotovosť',
  bank: 'Banka',
  skillDrive: 'Šofér',
  skillShoot: 'Muška',
  skillFly: 'Let',
  skillStam: 'Výdrž',
  languageLabel: 'Jazyk',
  cloudQuickLoadTitle: 'Obnovenie z Cloudu',
  cloudSyncPlaceholder: 'Zadaj Cloud Sync ID...',
  cloudLoadBtn: 'Načítať z Cloudu',
  cloudLoadedToast: 'Cloud postup aj uložený jazyk boli načítané!',
  cloudDefaultNote: 'Hra štartuje predvolene v angličtine, pokiaľ si postup a jazyk neuložíš na Cloud.',

  mapTitle: 'Mapa a GPS',
  phoneTitle: 'Mobil, AI & Cheaty',
  cameraTitle: 'Kamera 1st/3rd',
  settingsTitle: 'Nastavenia, Ovládanie, Jazyk & Cloud',
  helpTitle: 'Ovládanie a návod',
  aiDispatchTitle: 'Palmetto AI Dispečing',
  aiActive: 'Aktívny',
  aiError: 'Offline',
  aiWaiting: 'Čaká',
  step: 'Krok',
  cancelMission: 'Zrušiť misiu',
  gslCourier: 'GSL KURIÉR',
  gslVan: 'Dodávka',
  gslPkg: 'Balík',
  gslRouteOk: 'Trasa: Po ceste OK',
  gslOffRoad: 'MIMO CESTY!',
  inviteFrom: 'Pozvánka do misie od',
  accept: 'Prijať',
  decline: 'Odmietnuť',
  health: 'Zdravie',
  armor: 'Vesta',
  bodyHealth: 'Karoséria',
  alt: 'Výška',
  fireAlert: 'HORÍ!',
  waterAlert: 'VODA!',
  fistsLabel: 'Päste',
  precisionAimActive: 'Presné mierenie aktívne',
  parachuteOpenHint: 'Padák otvorený (riadenie letu)',
  parachuteReadyHint: 'Padák pripravený',
  eliminated: 'ELIMINOVANÝ',
  continueBtn: 'Pokračovať',
  skipBtn: 'Preskočiť',

  startRandomMissionBtn: 'Spustiť výzvu',
  openShopMenuBtn: 'Otvoriť menu',
  talkNpcBtn: 'Osloviť',
  hideMenu: 'Skryť menu',
  openMenu: 'Otvoriť menu',
  tabVehicles: 'Vozidlá',
  tabMissions: 'Misie',
  tabWorld: 'Svet & Postavy',
  tabRadio: 'Rádio',
  radioBtn: 'Rádio',
  phoneBtn: 'Mobil',
  mapBtn: 'Mapa',
  muteSound: 'Stlmiť zvuk',
  unmuteSound: 'Zapnúť zvuk',
  inGarage: 'Garáž',
  storyMissionsTab: 'Príbehové misie',
  randomMissionsTab: 'Náhodné misie',
  completedRandomCount: 'Dokončené náhodné',
  running: 'Beží',
  locked: 'Zamknuté',
  start: 'Spustiť',
  repeat: 'Opakovať',
  done: 'Dokončená',
  requiresMissions: 'Vyžaduje',
  noRandomDiscovered:
    'Zatiaľ si neobjavil žiadnu náhodnú misiu. Preskúmaj Palmetto Bay, parky, móla, letiská a strechy.',
  weatherPrefix: 'Počasie:',
  autoTimeBtn: 'Auto čas (1m/s)',
  autoWeatherBtn: 'Auto počasie (plynulé)',
  graphicsPrefix: 'Grafika:',
  qualHigh: 'Vysoká',
  qualMed: 'Stredná',
  qualPerf: 'Výkon',
  cameraPrefix: 'Kamera:',
  settingsShortcutBtn: 'Ovládanie & Nastavenia',
  nowPlaying: 'Práve hrá:',
  nextStationBtn: 'Ďalšia stanica',
  radioOffName: 'Rádio vypnuté',

  helpHeader: 'Sprievodca mestom Palmetto Bay & Ovládanie',
  helpSub: 'Sunstate Outlaws: Neon Tide · Coral Keys County',
  backToGame: 'Späť do hry',
  helpOnFootTitle: 'Chôdza, Boj & Padák',
  helpVehicleTitle: 'Autá, Vrtuľníky & Lietadlá',
  helpPhoneNote:
    'Mobil & AI: Zavolaj záchranku, použi Palmetto AI asistenta, vygeneruj AI misiu alebo sa rozprávaj s NPC!',
  helpCharsNote:
    '3 Postavy & Úkryty: Prepínaj medzi Dantem, Elenou a Kairom. Každý má vlastný dom, peniaze, reputáciu a farebnú tému.',
  activeDeviceBadge: 'Aktívne ovládanie',
  deviceKeyboard: 'Klávesnica a Myš',
  devicePlaystation: 'PlayStation Ovládač',
  deviceXbox: 'Xbox Ovládač',
  deviceTouch: 'Dotykové ovládanie',
  uiModeTitle: 'Režim rozhrania (Automatické prepínanie PC / Mobil)',
  uiModeAuto: 'Automaticky',
  uiModePc: 'PC rozhranie',
  uiModeMobile: 'Mobil (Dotyk)',
  uiModeHint:
    'Hra automaticky rozpozná, či hráš na PC alebo mobile, a prepne rozhranie aj ovládacie prvky.',
  detectedPlatformLabel: 'Zistené zariadenie',
  platformPc: 'PC',
  platformMobile: 'Mobil',
  touchControlsTip:
    'Dotykové ovládanie pre mobil: Potiahnutím po voľnej obrazovke sa rozhliadaš. Vľavo ovládaš pohyb/zatáčanie, vpravo sú tlačidlá pre plyn, brzdu, streľbu, skok a nástup. Cez Bluetooth vieš kedykoľvek pripojiť aj PS/Xbox ovládač.',
  touchGas: 'PLYN',
  touchBrake: 'BRZDA',
  touchDrift: 'DRIFT',
  touchLeft: 'VĽAVO',
  touchRight: 'VPRAVO',
  touchFire: 'STRIEĽAŤ',
  touchAim: 'MIERIŤ',
  touchJump: 'SKOK',
  touchChute: 'PADÁK',
  touchSprint: 'ŠPRINT',
  touchEnter: 'NASTÚPIŤ',
  touchExit: 'VYSTÚPIŤ',
  touchUp: 'HORE',
  touchDown: 'DOLE',
  touchClimb: 'NOS ↑',
  touchDive: 'NOS ↓',
  touchWeapon: 'ZBRAŇ',
  touchTalk: 'HOVOR',
  touchShop: 'MENU',
  touchMission: 'MISIA',
  mobileLookHint: 'Potiahni obrazovku pre rozhľad',

  settingsHeader: 'Nastavenia, Jazyk, Ovládanie & Cloud Save',
  settingsSub: 'Mapovanie podľa zariadenia, citlivosť zatáčania, viacjazyčnosť a cloud synchronizácia',
  langSectionTitle: 'Jazyk rozhrania hry',
  langDefaultHint:
    'Hra sa vždy predvolene spúšťa v angličtine, pokiaľ si svoj postup a jazyk neuložíš na Cloud.',
  cloudSectionTitle: 'Cloud Save (Postup + Jazyk)',
  cloudDesc:
    'Ulož postup, peniaze, mapovanie tlačidiel a aktuálny jazyk na Cloud. Pri načítaní z Cloudu sa obnoví aj uložený jazyk.',
  cloudSaveBtn: 'Uložiť na Cloud',
  cloudUnlinkBtn: 'Odpojiť Cloud',
  cloudSavedAtLabel: 'Posledné Cloud uloženie:',
  sensitivityTitle: 'Nastavenie citlivosti (Zatáčanie & Kamera)',
  steeringSensLabel: 'Citlivosť zatáčania / riadenia',
  lookSensLabel: 'Citlivosť kamery a mierenia',
  resetSensBtn: 'Predvolené 100%',
  controlsTitle: 'Mapovanie tlačidiel (Podľa vozidla a zariadenia)',
  controllerConnected: 'Ovládač pripojený',
  controllerDisconnected: 'Ovládač nepripojený',
  controllerLayoutLabel: 'Typ ovládača:',
  layoutAuto: 'Automaticky',
  resetDefaultsBtn: 'Obnoviť predvolené',
  controlsContextTip:
    'Každý režim má oddelenú tabuľku. Zobrazujú sa len tlačidlá pre zvolené/aktívne zariadenie (Klávesnica, PlayStation alebo Xbox).',
  flightTip:
    'Letecké riadenie: Potiahnutím páčky DOLE zdvihneš nos HORE (stúpanie). Zatlačením HORE klesáš.',
  pressKeyPrompt: 'Stlač kláves...',
  pressPadPrompt: 'Stlač tlačidlo...',
  multiplayerTitle: 'Multiplayer & Kamaráti',
  onlineFriendsCount: 'Online priatelia v meste:',
  handlePlaceholder: 'Tvoja prezývka...',
  saveHandleBtn: 'Uložiť meno',
  friendPlaceholder: 'Zadaj prezývku kamaráta...',
  addFriendBtn: 'Pridať kamaráta',
  friendsHint:
    'Keď sa kamarát zo zoznamu pripojí pod svojou prezývkou, stretneš ho priamo v Palmetto Bay!',
  graphicsQualityTitle: 'Grafická kvalita',
  qualHighFull: 'Vysoká (Tiene + Bloom)',
  qualMedFull: 'Stredná (Vyvážená)',
  qualPerfFull: 'Výkon (30+ FPS iGPU)',
  resetAllTitle: 'Začať hru úplne odznova',
  resetAllDesc:
    'Vymaže peniaze, reputáciu a postup všetkých troch postáv (Dante, Elena, Kairo), zbrane aj objavené misie.',
  resetAllBtn: 'Resetovať hru',
  confirmDeleteBtn: 'Potvrdiť zmazanie',
  cancelBtn: 'Zrušiť',

  mapHeader: 'Mapa Palmetto Bay & Coral Keys County (GPS po cestách)',
  mapSubCoords: 'Pozícia:',
  mapSubHeading: 'Smer:',
  mapSubClick: 'Klikni na mapu pre najkratšiu trasu po cestách',
  centerOnPlayerBtn: 'Na hráča',
  closeBtn: 'Zavrieť',
  buildingsListTitle: 'Budovy & Lokality (Klik pre GPS)',
  miniMapTag: 'Mapa',

  phoneHeader: 'SUNSTATE MOBIL',
  tabServices: 'Služby',
  tabAiChat: 'Palmetto AI',
  tabAiMission: 'AI Misia',
  emergencyServicesTitle: 'Záchranné zložky & Taxík',
  callEms: 'Záchranka EMS',
  callFire: 'Hasiči',
  callPolice: 'Polícia PBPD',
  callTaxi: 'Zavolať Taxík',
  cheatDialerTitle: 'Klávesnica / Tajné čísla',
  dialBtn: 'Vytočiť číslo',
  cheatListTitle: 'Zoznam tajných čísel',
  cheatListHint: 'Vytoč ručne na klávesnici',
  dispatchPrefix: 'Mestský dispečing:',
  aiThinking: 'Palmetto AI premýšľa...',
  askAiPlaceholder: 'Opýtaj sa Palmetto AI...',
  aiMissionDesc:
    'Zadaj ľubovoľnú tému a Palmetto AI vytvorí novú 3-etapovú misiu priamo v meste.',
  aiMissionPlaceholder: 'Napr.: Rýchly útek z banky v búrke až do prístavu...',
  quickIdeasTitle: 'Rýchle nápady:',
  generateMissionBtn: 'Vygenerovať a spustiť misiu',
  generatingMissionBtn: 'AI pripravuje kontrakt...',

  npcDialogTag: 'AI NPC Dialóg',
  npcTyping: 'odpovedá...',
  npcPlaceholder: 'Napíš správu občanovi...',
  sendBtn: 'Odoslať',

  freeRoamTitle: 'Voľná jazda — Palmetto Bay',
  freeRoamObjective: 'Preskúmaj otvorené cesty, vojdi do budov alebo objav náhodnú misiu',
  welcomeToast: 'Vitaj v Palmetto Bay! Stlač M pre Mapu, T pre Mobil, O pre Nastavenia.',
  closeShop: 'Zavrieť',
  deposit500: 'Vložiť $500',
  withdraw500: 'Vybrať $500',
  bankHeistBtn: 'Spustiť Bankovú Lúpež — Zlatá horúčka (+$850)',
  testDriveBtn: 'Vyskúšať',
  deliverVehicleBtn: 'Pristaviť',
  buyVehicleBtn: 'Kúpiť',
  restBtn: 'Oddych (100% HP & Bez polície)',
  saveLocalBtn: 'Uložiť lokálny postup',
  advanceTimeTitle: 'Posunúť dennú dobu',
  armoryRangeTip:
    'Tip: V zadnej časti obchodu je živá strelnica s pohyblivými terčmi pre tréning mušky.',
};

const CS_STRINGS: UiStrings = {
  ...SK_STRINGS,
  modeLabel: 'PALMETTO BAY & CORAL KEYS COUNTY · REŽIM',
  startupSubtitle:
    'Rozsáhlý 3D otevřený svět s GPS po silnicích, parky, plážemi, letišti, vstupními budovami, plynulým počasím, AI městem, 51 příběhovými a 25 náhodnými výzvami.',
  playAs: 'HRÁT ZA',
  cash: 'Hotovost',
  skillShoot: 'Muška',
  skillStam: 'Výdrž',
  languageLabel: 'Jazyk',
  cloudQuickLoadTitle: 'Obnovení z Cloudu',
  cloudSyncPlaceholder: 'Zadej Cloud Sync ID...',
  cloudLoadBtn: 'Načíst z Cloudu',
  cloudLoadedToast: 'Cloud postup i uložený jazyk byly načteny!',
  cloudDefaultNote: 'Hra startuje vždy v angličtině, pokud si postup a jazyk neuložíš na Cloud.',
  mapTitle: 'Mapa a GPS',
  settingsTitle: 'Nastavení, Ovládání, Jazyk & Cloud',
  helpTitle: 'Ovládání a průvodce',
  aiDispatchTitle: 'Palmetto AI Dispečink',
  aiActive: 'Aktivní',
  aiWaiting: 'Čeká',
  cancelMission: 'Zrušit misi',
  accept: 'Přijmout',
  decline: 'Odmítnout',
  health: 'Zdraví',
  bodyHealth: 'Karoserie',
  alt: 'Výška',
  fistsLabel: 'Pěsti',
  precisionAimActive: 'Přesné míření aktivní',
  parachuteOpenHint: 'Padák otevřen',
  parachuteReadyHint: 'Padák připraven',
  continueBtn: 'Pokračovat',
  skipBtn: 'Přeskočit',
  startRandomMissionBtn: 'Spustit výzvu',
  openShopMenuBtn: 'Otevřít menu',
  talkNpcBtn: 'Oslovit',
  hideMenu: 'Skrýt menu',
  openMenu: 'Otevřít menu',
  tabVehicles: 'Vozidla',
  tabMissions: 'Mise',
  tabWorld: 'Svět & Postavy',
  tabRadio: 'Rádio',
  storyMissionsTab: 'Příběhové mise',
  randomMissionsTab: 'Náhodné mise',
  completedRandomCount: 'Dokončené náhodné',
  running: 'Běží',
  locked: 'Zamčeno',
  repeat: 'Opakovat',
  done: 'Dokončena',
  requiresMissions: 'Vyžaduje',
  noRandomDiscovered: 'Zatím jsi neobjevil žádnou náhodnou misi. Prozkoumej město, parky, mola a střechy.',
  weatherPrefix: 'Počasí:',
  qualHigh: 'Vysoká',
  qualMed: 'Střední',
  qualPerf: 'Výkon',
  settingsShortcutBtn: 'Ovládání & Nastavení',
  nowPlaying: 'Právě hraje:',
  nextStationBtn: 'Další stanice',
  radioOffName: 'Rádio vypnuto',
  helpHeader: 'Průvodce městem Palmetto Bay & Ovládání',
  backToGame: 'Zpět do hry',
  deviceKeyboard: 'Klávesnice a Myš',
  devicePlaystation: 'PlayStation Ovladač',
  deviceXbox: 'Xbox Ovladač',
  deviceTouch: 'Dotykové ovládání',
  uiModeTitle: 'Režim rozhraní (Automatické přepínání PC / Mobil)',
  uiModeAuto: 'Automaticky',
  uiModePc: 'PC rozhraní',
  uiModeMobile: 'Mobil (Dotyk)',
  uiModeHint:
    'Hra automaticky rozpozná, zda hraješ na PC nebo mobilu, a přepne rozhraní i ovládací prvky.',
  detectedPlatformLabel: 'Zjištěné zařízení',
  platformPc: 'PC',
  platformMobile: 'Mobil',
  touchControlsTip:
    'Dotykové ovládání: Tažením prstu po volné obrazovce se rozhlížíš. Vlevo ovládáš pohyb/zatáčení, vpravo máš tlačítka pro plyn, brzdu, střelbu, skok a nástup.',
  touchGas: 'PLYN',
  touchBrake: 'BRZDA',
  touchFire: 'STŘÍLET',
  touchAim: 'MÍŘIT',
  touchWeapon: 'ZBRAŇ',
  touchEnter: 'NASTOUPIT',
  touchExit: 'VYSTOUPIT',
  touchUp: 'NAHORU',
  touchDown: 'DOLŮ',
  settingsHeader: 'Nastavení, Jazyk, Ovládání & Cloud Save',
  langSectionTitle: 'Jazyk rozhraní hry',
  langDefaultHint: 'Hra se vždy spouští v angličtině, pokud si postup a jazyk neuložíš na Cloud.',
  cloudSaveBtn: 'Uložit na Cloud',
  cloudUnlinkBtn: 'Odpojit Cloud',
  sensitivityTitle: 'Nastavení citlivosti (Zatáčení & Kamera)',
  steeringSensLabel: 'Citlivost zatáčení / řízení',
  lookSensLabel: 'Citlivost kamery a míření',
  controlsTitle: 'Mapování tlačítek (Dle vozidla a zařízení)',
  controllerConnected: 'Ovladač připojen',
  controllerDisconnected: 'Ovladač nepřipojen',
  pressKeyPrompt: 'Stiskni klávesu...',
  pressPadPrompt: 'Stiskni tlačítko...',
  friendPlaceholder: 'Zadej přezdívku kamaráda...',
  addFriendBtn: 'Přidat kamaráda',
  resetAllTitle: 'Začít hru úplně odznovu',
  resetAllBtn: 'Resetovat hru',
  confirmDeleteBtn: 'Potvrdit smazání',
  cancelBtn: 'Zrušit',
  centerOnPlayerBtn: 'Na hráče',
  closeBtn: 'Zavřít',
  callEms: 'Záchranka EMS',
  callFire: 'Hasiči',
  callTaxi: 'Zavolat Taxi',
  dialBtn: 'Vytočit číslo',
  sendBtn: 'Odeslat',
  freeRoamTitle: 'Volná jízda — Palmetto Bay',
};

const DE_STRINGS: UiStrings = {
  ...EN_STRINGS,
  modeLabel: 'PALMETTO BAY & CORAL KEYS COUNTY · MODUS',
  startupSubtitle:
    'Große 3D-Open-World mit Straßen-GPS, Parks, Stränden, Flughäfen, betretbaren Gebäuden, dynamischem Wetter, KI-Stadt, 51 Story-Missionen & 25 Nebenaufgaben.',
  badgeVehicles: '12 Autos, Helis & Jets',
  badgeBuildings: 'betretbare Gebäude',
  badgeController: 'PS4 / PS5 & Xbox Support',
  playAs: 'SPIELEN ALS',
  cash: 'Bargeld',
  bank: 'Bank',
  skillDrive: 'Fahren',
  skillShoot: 'Zielen',
  skillFly: 'Flug',
  skillStam: 'Ausd.',
  languageLabel: 'Sprache',
  cloudQuickLoadTitle: 'Cloud-Spielstand laden',
  cloudSyncPlaceholder: 'Cloud Sync ID eingeben...',
  cloudLoadBtn: 'Aus Cloud laden',
  cloudLoadedToast: 'Cloud-Fortschritt & Sprache geladen!',
  cloudDefaultNote: 'Startet standardmäßig auf Englisch, außer bei geladenem Cloud-Spielstand.',
  aiDispatchTitle: 'Palmetto KI-Leitstelle',
  aiActive: 'Aktiv',
  step: 'Schritt',
  cancelMission: 'Mission abbrechen',
  accept: 'Annehmen',
  decline: 'Ablehnen',
  health: 'Gesundheit',
  armor: 'Rüstung',
  bodyHealth: 'Zustand',
  alt: 'Höhe',
  fireAlert: 'FEUER!',
  waterAlert: 'WASSER!',
  fistsLabel: 'Fäuste',
  precisionAimActive: 'Präzises Zielen aktiv',
  continueBtn: 'Weiter',
  skipBtn: 'Überspringen',
  startRandomMissionBtn: 'Starten',
  openShopMenuBtn: 'Menü öffnen',
  talkNpcBtn: 'Sprechen',
  hideMenu: 'Menü ausblenden',
  openMenu: 'Menü öffnen',
  tabVehicles: 'Fahrzeuge',
  tabMissions: 'Missionen',
  tabWorld: 'Welt & Crew',
  tabRadio: 'Radio',
  muteSound: 'Stummschalten',
  unmuteSound: 'Ton einschalten',
  inGarage: 'Besitz',
  storyMissionsTab: 'Story-Missionen',
  randomMissionsTab: 'Zufallsmissionen',
  running: 'Läuft',
  locked: 'Gesperrt',
  start: 'Starten',
  repeat: 'Wiederholen',
  done: 'Erledigt',
  weatherPrefix: 'Wetter:',
  graphicsPrefix: 'Grafik:',
  qualHigh: 'Hoch',
  qualMed: 'Mittel',
  qualPerf: 'Leistung',
  cameraPrefix: 'Kamera:',
  settingsShortcutBtn: 'Steuerung & Einstellungen',
  nowPlaying: 'Läuft gerade:',
  nextStationBtn: 'Nächster Sender',
  radioOffName: 'Radio Aus',
  helpHeader: 'Palmetto Bay Stadtführer & Steuerung',
  backToGame: 'Zurück zum Spiel',
  deviceKeyboard: 'Tastatur & Maus',
  deviceTouch: 'Touch-Steuerung',
  uiModeTitle: 'Oberflächen-Modus (PC / Mobil)',
  uiModeAuto: 'Automatisch',
  uiModePc: 'PC Desktop',
  uiModeMobile: 'Mobil (Touch)',
  detectedPlatformLabel: 'Erkanntes Gerät',
  platformPc: 'PC',
  platformMobile: 'Mobil',
  touchGas: 'GAS',
  touchBrake: 'BREMSE',
  touchFire: 'FEUERN',
  touchAim: 'ZIELEN',
  touchJump: 'SPRUNG',
  touchSprint: 'SPRINT',
  touchEnter: 'EINSTEIGEN',
  touchExit: 'AUSSTEIGEN',
  settingsHeader: 'Einstellungen, Sprache, Steuerung & Cloud Save',
  langSectionTitle: 'Sprache der Benutzeroberfläche',
  langDefaultHint: 'Das Spiel startet immer auf Englisch, bis du deinen Spielstand in der Cloud speicherst.',
  cloudSaveBtn: 'In Cloud speichern',
  cloudUnlinkBtn: 'Cloud trennen',
  sensitivityTitle: 'Lenk- & Kamera-Empfindlichkeit',
  steeringSensLabel: 'Lenkempfindlichkeit / Kurvenverhalten',
  lookSensLabel: 'Kamera- & Ziel-Empfindlichkeit',
  controlsTitle: 'Tastenbelegung (Pro Fahrzeug & Gerät)',
  controllerConnected: 'Controller verbunden',
  controllerDisconnected: 'Kein Controller',
  pressKeyPrompt: 'Taste drücken...',
  pressPadPrompt: 'Knopf drücken...',
  resetAllTitle: 'Fortschritt komplett zurücksetzen',
  resetAllBtn: 'Zurücksetzen',
  confirmDeleteBtn: 'Löschen bestätigen',
  cancelBtn: 'Abbrechen',
  centerOnPlayerBtn: 'Zentrieren',
  closeBtn: 'Schließen',
  sendBtn: 'Senden',
  freeRoamTitle: 'Freie Fahrt — Palmetto Bay',
};

const ES_STRINGS: UiStrings = {
  ...EN_STRINGS,
  modeLabel: 'PALMETTO BAY & CORAL KEYS COUNTY · MODO',
  startupSubtitle:
    'Mundo abierto 3D con GPS por carretera, parques, playas, aeropuertos, edificios accesibles, clima dinámico, ciudad IA, 51 misiones de historia y 25 retos.',
  badgeVehicles: '12 coches, helis y cazas',
  badgeBuildings: 'edificios accesibles',
  playAs: 'JUGAR COMO',
  cash: 'Efectivo',
  bank: 'Banco',
  skillDrive: 'Cond.',
  skillShoot: 'Puntería',
  skillFly: 'Vuelo',
  skillStam: 'Resist.',
  languageLabel: 'Idioma',
  cloudQuickLoadTitle: 'Cargar desde la Nube',
  cloudSyncPlaceholder: 'ID de Cloud Sync...',
  cloudLoadBtn: 'Cargar Nube',
  cloudLoadedToast: '¡Progreso e idioma restaurados desde la Nube!',
  cloudDefaultNote: 'Inicia siempre en inglés por defecto salvo que cargues una partida en la Nube.',
  aiDispatchTitle: 'Despacho IA Palmetto',
  aiActive: 'Activo',
  step: 'Paso',
  cancelMission: 'Cancelar misión',
  accept: 'Aceptar',
  decline: 'Rechazar',
  health: 'Salud',
  armor: 'Blindaje',
  fistsLabel: 'Puños',
  continueBtn: 'Continuar',
  skipBtn: 'Saltar',
  startRandomMissionBtn: 'Iniciar reto',
  openShopMenuBtn: 'Abrir menú',
  talkNpcBtn: 'Hablar',
  hideMenu: 'Ocultar menú',
  openMenu: 'Abrir menú',
  tabVehicles: 'Vehículos',
  tabMissions: 'Misiones',
  tabWorld: 'Mundo y Crew',
  tabRadio: 'Radio',
  storyMissionsTab: 'Historia',
  randomMissionsTab: 'Aleatorias',
  weatherPrefix: 'Clima:',
  graphicsPrefix: 'Gráficos:',
  qualHigh: 'Alto',
  qualMed: 'Medio',
  qualPerf: 'Rendimiento',
  settingsHeader: 'Ajustes, Idioma, Controles y Guardado en la Nube',
  langSectionTitle: 'Idioma de la interfaz',
  cloudSaveBtn: 'Guardar en la Nube',
  cloudUnlinkBtn: 'Desvincular',
  sensitivityTitle: 'Sensibilidad de giro y cámara',
  steeringSensLabel: 'Sensibilidad de giro / dirección',
  lookSensLabel: 'Sensibilidad de cámara y puntería',
  controlsTitle: 'Asignación de botones (Por vehículo y dispositivo)',
  deviceKeyboard: 'Teclado y Ratón',
  deviceTouch: 'Controles táctiles',
  uiModeTitle: 'Modo de interfaz (PC / Móvil)',
  uiModeAuto: 'Automático',
  uiModePc: 'PC Escritorio',
  uiModeMobile: 'Móvil Táctil',
  detectedPlatformLabel: 'Dispositivo',
  platformPc: 'PC',
  platformMobile: 'Móvil',
  touchGas: 'ACEL.',
  touchBrake: 'FRENO',
  touchFire: 'FUEGO',
  touchAim: 'APUNTAR',
  touchJump: 'SALTO',
  touchEnter: 'ENTRAR',
  touchExit: 'SALIR',
  closeBtn: 'Cerrar',
  sendBtn: 'Enviar',
  freeRoamTitle: 'Modo Libre — Palmetto Bay',
};

const PL_STRINGS: UiStrings = {
  ...EN_STRINGS,
  modeLabel: 'PALMETTO BAY & CORAL KEYS COUNTY · TRYB',
  startupSubtitle:
    'Rozległy otwarty świat 3D z GPS drogowym, parkami, plażami, lotniskami, budynkami do wejścia, zmienną pogodą, miastem AI, 51 misjami fabularnymi i 25 wyzwaniami.',
  badgeVehicles: '12 aut, śmigłowców i odrzutowców',
  badgeBuildings: 'budynków do wejścia',
  playAs: 'GRAJ JAKO',
  cash: 'Gotówka',
  bank: 'Bank',
  skillDrive: 'Jazda',
  skillShoot: 'Celność',
  skillFly: 'Lot',
  skillStam: 'Wytrz.',
  languageLabel: 'Język',
  cloudQuickLoadTitle: 'Wczytaj z Chmury',
  cloudSyncPlaceholder: 'Wpisz Cloud Sync ID...',
  cloudLoadBtn: 'Wczytaj z Chmury',
  cloudLoadedToast: 'Postęp i język przywrócone z Chmury!',
  cloudDefaultNote: 'Gra zawsze uruchamia się po angielsku, chyba że zapiszesz postęp i język w Chmurze.',
  aiDispatchTitle: 'Dyspozytornia AI Palmetto',
  aiActive: 'Aktywna',
  step: 'Etap',
  cancelMission: 'Anuluj misję',
  accept: 'Akceptuj',
  decline: 'Odrzuć',
  health: 'Zdrowie',
  armor: 'Kamizelka',
  fistsLabel: 'Pięści',
  continueBtn: 'Dalej',
  skipBtn: 'Pomiń',
  startRandomMissionBtn: 'Rozpocznij',
  openShopMenuBtn: 'Otwórz menu',
  talkNpcBtn: 'Rozmawiaj',
  hideMenu: 'Ukryj menu',
  openMenu: 'Otwórz menu',
  tabVehicles: 'Pojazdy',
  tabMissions: 'Misje',
  tabWorld: 'Świat i Postacie',
  tabRadio: 'Radio',
  storyMissionsTab: 'Fabularne',
  randomMissionsTab: 'Losowe',
  weatherPrefix: 'Pogoda:',
  graphicsPrefix: 'Grafika:',
  qualHigh: 'Wysoka',
  qualMed: 'Średnia',
  qualPerf: 'Wydajność',
  settingsHeader: 'Ustawienia, Język, Sterowanie i Chmura',
  langSectionTitle: 'Język interfejsu gry',
  cloudSaveBtn: 'Zapisz w Chmurze',
  cloudUnlinkBtn: 'Odłącz Chmurę',
  sensitivityTitle: 'Czułość skrętu i kamery',
  steeringSensLabel: 'Czułość skręcania / kierowania',
  lookSensLabel: 'Czułość kamery i celowania',
  controlsTitle: 'Mapowanie klawiszy (Wg pojazdu i urządzenia)',
  deviceKeyboard: 'Klawiatura i Mysz',
  deviceTouch: 'Sterowanie dotykowe',
  uiModeTitle: 'Tryb interfejsu (PC / Mobilny)',
  uiModeAuto: 'Automatycznie',
  uiModePc: 'PC Komputer',
  uiModeMobile: 'Telefon (Dotyk)',
  detectedPlatformLabel: 'Wykryto urządzenie',
  platformPc: 'PC',
  platformMobile: 'Telefon',
  touchGas: 'GAZ',
  touchBrake: 'HAMULEC',
  touchFire: 'OGIEŃ',
  touchAim: 'CELUJ',
  touchJump: 'SKOK',
  touchEnter: 'WSIĄDŹ',
  touchExit: 'WYSIĄDŹ',
  closeBtn: 'Zamknij',
  sendBtn: 'Wyślij',
  freeRoamTitle: 'Swobodna jazda — Palmetto Bay',
};

const ALL_UI: Record<LanguageCode, UiStrings> = {
  en: EN_STRINGS,
  sk: SK_STRINGS,
  cs: CS_STRINGS,
  de: DE_STRINGS,
  es: ES_STRINGS,
  pl: PL_STRINGS,
};

export function getUi(lang: LanguageCode): UiStrings {
  return ALL_UI[lang] ?? EN_STRINGS;
}

export function getWeatherLabel(preset: WeatherPreset, lang: LanguageCode): string {
  const table: Record<LanguageCode, Record<WeatherPreset, string>> = {
    en: { clear: 'Clear', overcast: 'Overcast', rain: 'Rain', storm: 'Storm', foggy: 'Foggy' },
    sk: { clear: 'Jasno', overcast: 'Oblačno', rain: 'Dážď', storm: 'Búrka', foggy: 'Hmla' },
    cs: { clear: 'Jasno', overcast: 'Oblačno', rain: 'Déšť', storm: 'Bouře', foggy: 'Mlha' },
    de: { clear: 'Klar', overcast: 'Bewölkt', rain: 'Regen', storm: 'Sturm', foggy: 'Nebel' },
    es: { clear: 'Despejado', overcast: 'Nublado', rain: 'Lluvia', storm: 'Tormenta', foggy: 'Niebla' },
    pl: { clear: 'Bezchmurnie', overcast: 'Pochmurno', rain: 'Deszcz', storm: 'Burza', foggy: 'Mgła' },
  };
  return (table[lang] ?? table.en)[preset];
}

export function getTimeLabel(preset: TimePreset, lang: LanguageCode): string {
  const table: Record<LanguageCode, Record<TimePreset, string>> = {
    en: { dawn: 'Dawn', noon: 'Noon', golden: 'Golden Hr', night: 'Night' },
    sk: { dawn: 'Úsvit', noon: 'Poludnie', golden: 'Zlatá hod.', night: 'Noc' },
    cs: { dawn: 'Úsvit', noon: 'Poledne', golden: 'Zlatá hod.', night: 'Noc' },
    de: { dawn: 'Morgen', noon: 'Mittag', golden: 'Abendrot', night: 'Nacht' },
    es: { dawn: 'Alba', noon: 'Mediodía', golden: 'Atardecer', night: 'Noche' },
    pl: { dawn: 'Świt', noon: 'Południe', golden: 'Złota godz.', night: 'Noc' },
  };
  return (table[lang] ?? table.en)[preset];
}

export function getBehaviorLabel(b: NpcBehaviorState, lang: LanguageCode): string {
  const table: Record<LanguageCode, Record<NpcBehaviorState, string>> = {
    en: {
      patrol: 'Patrol',
      flee: 'Fleeing',
      shelter: 'Shelter',
      investigate: 'Investigating',
      cheer: 'Cheering',
      confront: 'Confronting',
      hail_taxi: 'Hailing Taxi',
    },
    sk: {
      patrol: 'Hliadka',
      flee: 'Útek',
      shelter: 'Úkryt',
      investigate: 'Skúma',
      cheer: 'Fandí',
      confront: 'Konfrontuje',
      hail_taxi: 'Volá taxi',
    },
    cs: {
      patrol: 'Hlídka',
      flee: 'Útěk',
      shelter: 'Úkryt',
      investigate: 'Zkoumá',
      cheer: 'Fandí',
      confront: 'Konfrontuje',
      hail_taxi: 'Volá taxi',
    },
    de: {
      patrol: 'Streife',
      flee: 'Flucht',
      shelter: 'Schutz',
      investigate: 'Prüft',
      cheer: 'Jubelt',
      confront: 'Konfrontiert',
      hail_taxi: 'Ruft Taxi',
    },
    es: {
      patrol: 'Patrulla',
      flee: 'Huyendo',
      shelter: 'Refugio',
      investigate: 'Investiga',
      cheer: 'Anima',
      confront: 'Confronta',
      hail_taxi: 'Pide Taxi',
    },
    pl: {
      patrol: 'Patrol',
      flee: 'Ucieczka',
      shelter: 'Schronienie',
      investigate: 'Bada',
      cheer: 'Kibicuje',
      confront: 'Konfrontuje',
      hail_taxi: 'Wzywa taxi',
    },
  };
  return (table[lang] ?? table.en)[b];
}

export function getActionLabel(action: ControlActionId, lang: LanguageCode): string {
  const en: Record<ControlActionId, string> = {
    forward: 'Forward / Throttle / Climb',
    backward: 'Reverse / Brake / Descend',
    left: 'Steer Left / Bank Left',
    right: 'Steer Right / Bank Right',
    pitchUp: 'Pitch Nose Up (Climb)',
    pitchDown: 'Pitch Nose Down (Dive)',
    yawLeft: 'Rudder / Yaw Left',
    yawRight: 'Rudder / Yaw Right',
    handbrake: 'Handbrake / Drift',
    sprint: 'Sprint',
    jump: 'Jump / Parachute',
    aim: 'Precision Aim (ADS)',
    fire: 'Fire / Water Cannon / Jet Guns',
    interact: 'Enter / Exit / Elevator / Shop',
    camera: 'Camera (1st / 3rd Person)',
    radio: 'Next Radio Station',
  };
  const sk: Record<ControlActionId, string> = {
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
    aim: 'Presné mierenie (ADS)',
    fire: 'Streľba / Vodné delo / Kanóny',
    interact: 'Nastúpiť / Vystúpiť / Výťah / Obchod',
    camera: 'Kamera (1st / 3rd Person)',
    radio: 'Ďalšia rádiostanica',
  };
  const de: Record<ControlActionId, string> = {
    ...en,
    forward: 'Vorwärts / Gas / Steigen',
    backward: 'Rückwärts / Bremse / Sinken',
    left: 'Links lenken / Neigen',
    right: 'Rechts lenken / Neigen',
    handbrake: 'Handbremse / Drift',
    sprint: 'Sprinten',
    jump: 'Springen / Fallschirm',
    aim: 'Präzises Zielen',
    fire: 'Feuern / Wasserwerfer',
    interact: 'Einsteigen / Interagieren',
    camera: 'Kamera wechseln',
    radio: 'Nächster Radiosender',
  };
  if (lang === 'sk' || lang === 'cs') return sk[action];
  if (lang === 'de') return de[action];
  return en[action];
}

export function getContextLabel(ctx: ControlContextId, lang: LanguageCode): string {
  const en: Record<ControlContextId, string> = {
    on_foot: 'On Foot',
    car: 'Cars & Emergency Vehicles',
    helicopter: 'Helicopter (SkyHawk)',
    plane: 'Prop Plane (Coral Wing)',
    jet: 'Fighter Jet (Valkyrie)',
  };
  const sk: Record<ControlContextId, string> = {
    on_foot: 'Mimo vozidla (Pešo)',
    car: 'Auto & Služobné vozidlá',
    helicopter: 'Vrtuľník (SkyHawk)',
    plane: 'Vrtuľové lietadlo (Coral Wing)',
    jet: 'Bojová stíhačka (Valkyrie)',
  };
  const de: Record<ControlContextId, string> = {
    on_foot: 'Zu Fuß',
    car: 'Autos & Einsatzfahrzeuge',
    helicopter: 'Hubschrauber (SkyHawk)',
    plane: 'Propellerflugzeug',
    jet: 'Kampfjet (Valkyrie)',
  };
  const es: Record<ControlContextId, string> = {
    on_foot: 'A pie',
    car: 'Coches y Servicio',
    helicopter: 'Helicóptero (SkyHawk)',
    plane: 'Avioneta (Coral Wing)',
    jet: 'Caza (Valkyrie)',
  };
  const pl: Record<ControlContextId, string> = {
    on_foot: 'Pieszo',
    car: 'Auta i Służby',
    helicopter: 'Śmigłowiec (SkyHawk)',
    plane: 'Samolot (Coral Wing)',
    jet: 'Myśliwiec (Valkyrie)',
  };
  if (lang === 'sk' || lang === 'cs') return sk[ctx];
  if (lang === 'de') return de[ctx];
  if (lang === 'es') return es[ctx];
  if (lang === 'pl') return pl[ctx];
  return en[ctx];
}

export function getLocalizedCharacterCopy(
  id: CharacterId,
  lang: LanguageCode,
): { role: string; story: string; strength: string; weakness: string; homeName: string } {
  if (lang === 'sk' || lang === 'cs') {
    const skMap: Record<CharacterId, { role: string; story: string; strength: string; weakness: string; homeName: string }> = {
      dante: {
        role: 'Pouličný pretekár & Kuriér',
        story: 'Bývalý víťaz ilegálnych šprintov na pobrežnej diaľnici s vlastnou dielňou na západe mesta.',
        strength: 'Silný šofér a výdrž',
        weakness: 'Slabšia presnosť streľby a pilotovanie',
        homeName: "Dante's Hideout (Západ)",
      },
      elena: {
        role: 'Taktická pilotka & Strelkyňa',
        story: 'Bývalá záchranárska pilotka z Coral Keys bývajúca v luxusnom Marina Lofte pri severnom kanáli.',
        strength: 'Presná streľba a pilotovanie lietadiel',
        weakness: 'Slabšia kontrola auta v šmyku',
        homeName: 'Marina Loft (Severné pobrežie)',
      },
      kairo: {
        role: 'Nočný DJ & Hacker z centra',
        story: 'Rezidentný DJ podzemných klubov a digitálny stratég vo svojom štúdiu priamo v centre Palmetto Bay.',
        strength: 'Vysoká výdrž, nočný prehľad a taktická streľba',
        weakness: 'Menšie skúsenosti s ťažkým letectvom',
        homeName: 'Pulse Studio Loft (Centrum)',
      },
    };
    return skMap[id];
  }
  const enMap: Record<CharacterId, { role: string; story: string; strength: string; weakness: string; homeName: string }> = {
    dante: {
      role: 'Street Racer & Courier',
      story:
        'Former coastal highway sprint champion running his own western hideout garage who knows every forest and harbor shortcut.',
      strength: 'High driving control & stamina',
      weakness: 'Lower shooting precision & flight handling',
      homeName: "Dante's Hideout (West)",
    },
    elena: {
      role: 'Tactical Pilot & Marksman',
      story:
        'Ex-Coast Guard rescue pilot from Coral Keys based at the luxury Marina Loft along the northern canal.',
      strength: 'Sharp shooting & aircraft mastery',
      weakness: 'Less drift recovery in tight corners',
      homeName: 'Marina Loft (North Coast)',
    },
    kairo: {
      role: 'Nightlife DJ & Downtown Hacker',
      story:
        'Underground club resident DJ and cyber strategist tracking PBPD dispatch frequencies from his central studio loft.',
      strength: 'High stamina, urban awareness & tactical aim',
      weakness: 'Limited heavy aircraft experience',
      homeName: 'Pulse Studio Loft (Downtown)',
    },
  };
  return enMap[id];
}

export function getLocalizedRank(rep: number, characterId: CharacterId, lang: LanguageCode): string {
  if (lang === 'sk' || lang === 'cs') {
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
  if (characterId === 'kairo') {
    if (rep >= 1500) return 'Neon Tide Icon';
    if (rep >= 750) return 'Grid Mastermind';
    if (rep >= 300) return 'Night Producer';
    return 'Club Rookie';
  }
  if (characterId === 'elena') {
    if (rep >= 1500) return 'Coral Keys Commander';
    if (rep >= 750) return 'Sky Ace';
    if (rep >= 300) return 'Elite Operator';
    return 'Coastal Pilot';
  }
  if (rep >= 1500) return 'King of Palmetto Bay';
  if (rep >= 750) return 'Asphalt Legend';
  if (rep >= 300) return 'Respected Driver';
  return 'Street Rookie';
}

export function getLocalizedMissionTitle(id: string, fallbackTitle: string, lang: LanguageCode): string {
  if (lang === 'sk' || lang === 'cs') return fallbackTitle;
  const enTitles: Record<string, string> = {
    m1: '01. First Run Through Palmetto Bay',
    m2: '02. Flamingo Boulevard Pickup',
    m3: '03. Custom Garage Tuning',
    m4: '04. Armory Range Calibration',
    m5: '05. Night Patrol Blockade',
    m6: '06. Harbor Container Courier',
    m7: '07. Coral Keys Sky Patrol',
    m8: '08. Forest Run & Canyon Evade',
    m9: '09. Gold Rush: Apex Trust Heist',
    m10: '10. Flamingo Coast Sprint',
    m11: '11. Rooftop Extraction',
    m12: '12. Stormy Pier Drop',
    m13: '13. Downtown Grid Blackout',
    m14: '14. Sunset Runway Clearance',
    m15: '15. Armored Convoy Intercept',
    m16: '16. EMS Emergency Dash',
    m17: '17. Redrock Canyon Trail',
    m18: '18. Midnight Club VIP Run',
    m19: '19. Valkyrie Airspace Breach',
    m20: '20. Sunstate Finale: Neon Dawn',
    m21: '21. GSL Express: Zero-Damage Courier',
  };
  if (enTitles[id]) return enTitles[id];
  if (id.startsWith('m')) {
    const num = id.slice(1);
    return `${num.padStart(2, '0')}. Sunstate Operation #${num}`;
  }
  if (id.startsWith('h')) {
    const num = id.slice(1);
    return `Side Challenge #${num}`;
  }
  return fallbackTitle;
}
