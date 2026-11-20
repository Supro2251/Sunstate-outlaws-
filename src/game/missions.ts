import { HiddenMissionDef, StoryMissionDef } from './types';

export const STORY_MISSIONS: StoryMissionDef[] = [
  {
    id: 'm1',
    index: 1,
    title: '01. Prvá jazda po Palmetto Bay',
    durationLabel: '5 min',
    difficulty: 1,
    timeLimitSec: 360,
    reward: 1200,
    introLines: [
      { speaker: 'Dante Vance', text: 'Čas ukázať Palmetto Bay, kto tu ovláda asfalt.' },
      { speaker: 'Elena Cruz', text: 'Prevezmi zásielku z QuickStop 24 a doruč ju do úkrytu.' },
    ],
    outroLines: [
      { speaker: 'Dante Vance', text: 'Čistá práca. Peniaze sú na účte.' },
    ],
    stages: [
      { objective: 'Choď do QuickStop 24 po balík', targetX: -150, targetZ: -230, radius: 16, kind: 'reach' },
      { objective: "Doruč zásielku do Dante's Hideout", targetX: -914, targetZ: 369, radius: 18, kind: 'reach' },
    ],
  },
  {
    id: 'm2',
    index: 2,
    title: '02. Káva z Flamingo Boulevard',
    durationLabel: '5 min',
    difficulty: 1,
    timeLimitSec: 360,
    reward: 1400,
    introLines: [
      { speaker: 'Elena Cruz', text: 'Klient čaká pri plážovom móle Sunset Sands.' },
    ],
    outroLines: [
      { speaker: 'Elena Cruz', text: 'Výborne, reputácia na pobreží rastie.' },
    ],
    stages: [
      { objective: 'Vyzdvihni kontakt pri SunSip Mart', targetX: 674, targetZ: 165, radius: 16, kind: 'reach' },
      { objective: 'Zavez ho na mólo Sunset Sands', targetX: 920, targetZ: 0, radius: 16, kind: 'reach' },
    ],
  },
  {
    id: 'm3',
    index: 3,
    title: '03. Tuning na mieru',
    durationLabel: '6 min',
    difficulty: 1,
    timeLimitSec: 420,
    reward: 1800,
    introLines: [
      { speaker: 'Dante Vance', text: 'Ak chceme vyhrávať úniky, potrebujeme lepší motor v Apex Customs.' },
    ],
    outroLines: [
      { speaker: 'Mechanik', text: 'Kára je naladená a pripravená na ulice.' },
    ],
    stages: [
      { objective: 'Dostaň sa autom do Apex Customs Prístav', targetX: -198, targetZ: 638, radius: 22, kind: 'deliver_car' },
      { objective: 'Odvez testovacie kolo cez kruhový objazd v centre', targetX: 0, targetZ: 0, radius: 34, kind: 'reach' },
    ],
  },
  {
    id: 'm4',
    index: 4,
    title: '04. Kalibrácia na strelnici',
    durationLabel: '6 min',
    difficulty: 2,
    timeLimitSec: 420,
    reward: 2100,
    introLines: [
      { speaker: 'Elena Cruz', text: 'V Ironclad Armory majú novú strelnicu. Zlepšíme mušku.' },
    ],
    outroLines: [
      { speaker: 'Inštruktor', text: 'Presné zásahy. Si pripravený na ostrú akciu.' },
    ],
    stages: [
      { objective: 'Navštív Ironclad Armory & Strelnicu', targetX: 285, targetZ: 371, radius: 16, kind: 'reach' },
      { objective: 'Vyzbroj sa a ohlás sa pri prístavnom sklade', targetX: 40, targetZ: 960, radius: 16, kind: 'reach' },
    ],
  },
  {
    id: 'm5',
    index: 5,
    title: '05. Nočná hliadka',
    durationLabel: '8 min',
    difficulty: 2,
    timeLimitSec: 480,
    reward: 2500,
    wantedOnStart: 2,
    introLines: [
      { speaker: 'Dante Vance', text: 'PBPD zablokovali hlavný most. Musíme im ujsť cez okresné cesty!' },
    ],
    outroLines: [
      { speaker: 'Dante Vance', text: 'Stratili nás v zákrutách. Skvelá jazda.' },
    ],
    stages: [
      { objective: 'Prejdi cez Koralový most pri Sunset Sands', targetX: 1045, targetZ: -220, radius: 28, kind: 'reach' },
      { objective: 'Striasť sa 2-hviezdičkového prenasledovania PBPD', targetX: 538, targetZ: -869, radius: 26, kind: 'evade_wanted' },
    ],
  },
  {
    id: 'm6',
    index: 6,
    title: '06. Kuriér z prístavu',
    durationLabel: '10 min',
    difficulty: 2,
    timeLimitSec: 600,
    reward: 3000,
    introLines: [
      { speaker: 'Elena Cruz', text: 'Loď práve vyložila kontajner na južnom móle. Rýchlo tam!' },
    ],
    outroLines: [
      { speaker: 'Elena Cruz', text: 'Zásielka je bezpečne v Marina Loft.' },
    ],
    stages: [
      { objective: 'Prevezmi kódovaný kufor v Priemyselnom prístave', targetX: -60, targetZ: 1080, radius: 18, kind: 'reach' },
      { objective: 'Prejdi po diaľničnom nadjazde na sever', targetX: -84, targetZ: -650, radius: 26, kind: 'reach' },
      { objective: 'Doruč kufor do Marina Loft', targetX: 538, targetZ: -869, radius: 18, kind: 'reach' },
    ],
  },
  {
    id: 'm7',
    index: 7,
    title: '07. Letecká škola Coral Keys',
    durationLabel: '10 min',
    difficulty: 3,
    timeLimitSec: 600,
    reward: 3600,
    introLines: [
      { speaker: 'Elena Cruz', text: 'Vyzdvihni vrtuľník na heliporte a preleť kontrolné body nad zálivom.' },
    ],
    outroLines: [
      { speaker: 'Elena Cruz', text: 'Máš pevnú ruku na knipli.' },
    ],
    stages: [
      { objective: 'Nasadni do vrtuľníka na pobrežnom heliporte', targetX: 740, targetZ: 520, radius: 22, kind: 'reach' },
      { objective: 'Preleť nad Apex Trust Tower', targetX: -358, targetZ: -358, targetY: 110, radius: 42, kind: 'fly_ring', requiredVehicleKind: 'helicopter' },
      { objective: 'Pristaň na streche alebo pri Marina Loft', targetX: 538, targetZ: -869, radius: 28, kind: 'reach' },
    ],
  },
  {
    id: 'm8',
    index: 8,
    title: '08. Požiar na promenáde',
    durationLabel: '10 min',
    difficulty: 3,
    timeLimitSec: 600,
    reward: 4000,
    introLines: [
      { speaker: 'Dispečer', text: 'V južnom sklade vypukol požiar! Použi hasičské auto a vodné delo.' },
    ],
    outroLines: [
      { speaker: 'Veliteľ zásahu', text: 'Oheň uhasený. Mesto ti ďakuje!' },
    ],
    stages: [
      { objective: 'Vezmi hasičské auto pri stanici v centre', targetX: -476, targetZ: 470, radius: 22, kind: 'reach' },
      { objective: 'Dostaň sa k miestu požiaru v prístave a použi vodné delo', targetX: 340, targetZ: 980, radius: 22, kind: 'reach' },
    ],
  },
  {
    id: 'm9',
    index: 9,
    title: '09. Zlatá horúčka v Apex Trust',
    durationLabel: '12 min',
    difficulty: 3,
    timeLimitSec: 720,
    reward: 4800,
    introLines: [
      { speaker: 'Dante Vance', text: 'Dnes robíme prvý väčší prepad obrneného transportu pri banke.' },
    ],
    outroLines: [
      { speaker: 'Dante Vance', text: 'Treba vychladnúť, polícia nám bola v pätách.' },
    ],
    stages: [
      { objective: 'Zídi k Apex Trust Banke a zachyť signál', targetX: -319, targetZ: -306, radius: 18, kind: 'reach' },
      { objective: 'Unikni po lesnej ceste do západných kopcov', targetX: -1250, targetZ: -450, radius: 26, kind: 'reach' },
      { objective: "Ukry sa v Dante's Hideout", targetX: -914, targetZ: 369, radius: 20, kind: 'evade_wanted' },
    ],
  },
  {
    id: 'm10',
    index: 10,
    title: '10. Záchranný výjazd EMS',
    durationLabel: '12 min',
    difficulty: 3,
    timeLimitSec: 720,
    reward: 5200,
    introLines: [
      { speaker: 'Sanitka EMS', text: 'Nehoda na horskom priesmyku! Sanitka potrebuje rýchleho vodiča.' },
    ],
    outroLines: [
      { speaker: 'Doktor', text: 'Pacient stabilizovaný načas!' },
    ],
    stages: [
      { objective: 'Prevezmi sanitku pred nemocnicou', targetX: -364, targetZ: -648, radius: 22, kind: 'reach' },
      { objective: 'Vyzdvihni zraneného na západnej lúke', targetX: -1320, targetZ: 120, radius: 22, kind: 'reach' },
      { objective: 'Prevez ho späť do centra Palmetto Bay', targetX: -364, targetZ: -648, radius: 22, kind: 'reach' },
    ],
  },
  {
    id: 'm11',
    index: 11,
    title: '11. Súboj na letisku Coral Keys',
    durationLabel: '15 min',
    difficulty: 3,
    timeLimitSec: 900,
    reward: 6000,
    introLines: [
      { speaker: 'Elena Cruz', text: 'Na južnom letisku stojí vrtuľové lietadlo. Preleť ponad celý ostrov.' },
    ],
    outroLines: [
      { speaker: 'Elena Cruz', text: 'Takto sa lieta nad Coral Keys!' },
    ],
    stages: [
      { objective: 'Choď na letiskovú dráhu Coral Keys', targetX: -820, targetZ: 1150, radius: 26, kind: 'reach' },
      { objective: 'Vzlietni a preleť ponad Sunset Pier', targetX: 980, targetZ: 0, targetY: 95, radius: 48, kind: 'fly_ring', requiredVehicleKind: 'plane' },
      { objective: 'Pristaň na severnom letisku pri Marina Loft', targetX: 520, targetZ: -1120, radius: 36, kind: 'reach' },
    ],
  },
  {
    id: 'm12',
    index: 12,
    title: '12. Kráľ diaľnice',
    durationLabel: '15 min',
    difficulty: 4,
    timeLimitSec: 900,
    reward: 6800,
    introLines: [
      { speaker: 'Dante Vance', text: 'Pouliční pretekári si myslia, že majú najrýchlejšie autá v štáte.' },
    ],
    outroLines: [
      { speaker: 'Dante Vance', text: 'Koruna kráľa Palmetto Bay je naša.' },
    ],
    stages: [
      { objective: 'Štartuj pri Sunstate Motors', targetX: 252, targetZ: 812, radius: 22, kind: 'deliver_car' },
      { objective: 'Prejdi cez nadjazdovú križovatku Juh', targetX: 448, targetZ: 15, radius: 28, kind: 'reach' },
      { objective: 'Prejdi po pobrežnej Flamingo Blvd', targetX: 700, targetZ: -450, radius: 28, kind: 'reach' },
      { objective: 'Dojdi do cieľa na Bayview Ridge', targetX: -120, targetZ: -1120, radius: 25, kind: 'reach' },
    ],
  },
  {
    id: 'm13',
    index: 13,
    title: '13. Zásielka z oblakov',
    durationLabel: '16 min',
    difficulty: 4,
    timeLimitSec: 960,
    reward: 7500,
    introLines: [
      { speaker: 'Elena Cruz', text: 'Kúp si padák v Ironclad Armory, vyskoč z lietadla a pristaň na streche mrakodrapu!' },
    ],
    outroLines: [
      { speaker: 'Elena Cruz', text: 'Presný zoskok priamo na cieľ.' },
    ],
    stages: [
      { objective: 'Skontroluj výbavu v Ironclad Armory (Padák)', targetX: 285, targetZ: 371, radius: 18, kind: 'reach' },
      { objective: 'Vyleť do vzduchu nad centrom Palmetto Bay', targetX: -358, targetZ: -358, targetY: 135, radius: 55, kind: 'fly_ring' },
      { objective: 'Pristaň s padákom na streche alebo pri veži Apex Trust', targetX: -358, targetZ: -358, radius: 34, kind: 'reach' },
    ],
  },
  {
    id: 'm14',
    index: 14,
    title: '14. Lesná pasca',
    durationLabel: '18 min',
    difficulty: 4,
    timeLimitSec: 1080,
    reward: 8200,
    wantedOnStart: 3,
    introLines: [
      { speaker: 'Dante Vance', text: 'Kontraband musíme prepašovať cez lesné cesty mimo hlavných radarov.' },
    ],
    outroLines: [
      { speaker: 'Dante Vance', text: 'Off-road skratka zachránila celý náklad.' },
    ],
    stages: [
      { objective: 'Zober dodávku pri severnom lese', targetX: -1180, targetZ: -980, radius: 24, kind: 'reach' },
      { objective: 'Prejdi cez lesný podjazd a lúky', targetX: -1280, targetZ: -180, radius: 28, kind: 'reach' },
      { objective: 'Striasť sa 3-hviezdičkového PBPD a doručiť náklad do prístavu', targetX: -198, targetZ: 638, radius: 26, kind: 'evade_wanted' },
    ],
  },
  {
    id: 'm15',
    index: 15,
    title: '15. Stíhačka Valkyrie',
    durationLabel: '20 min',
    difficulty: 4,
    timeLimitSec: 1200,
    reward: 9500,
    introLines: [
      { speaker: 'Elena Cruz', text: 'Vojenská stíhačka pristála na odľahlej dráhe. Otestuj jej rýchlosť!' },
    ],
    outroLines: [
      { speaker: 'Elena Cruz', text: 'Nadzvuková sila pod kontrolou.' },
    ],
    stages: [
      { objective: 'Nasadni do stíhačky na južnej dráhe', targetX: -820, targetZ: 1150, radius: 28, kind: 'reach' },
      { objective: 'Preleť nad východným oceánom', targetX: 1200, targetZ: -600, targetY: 140, radius: 60, kind: 'fly_ring', requiredVehicleKind: 'plane' },
      { objective: 'Preleť ponad západné hory', targetX: -1200, targetZ: -800, targetY: 140, radius: 60, kind: 'fly_ring', requiredVehicleKind: 'plane' },
      { objective: 'Bezpečne pristaň na základni', targetX: -820, targetZ: 1150, radius: 40, kind: 'reach' },
    ],
  },
  {
    id: 'm16',
    index: 16,
    title: '16. Veľká nočná výmena',
    durationLabel: '22 min',
    difficulty: 4,
    timeLimitSec: 1320,
    reward: 11000,
    introLines: [
      { speaker: 'Dante Vance', text: 'Štyri miesta odberu po celom okrese Coral Keys. Buď v strehu!' },
    ],
    outroLines: [
      { speaker: 'Dante Vance', text: 'Všetky štyri kufríky sú u nás.' },
    ],
    stages: [
      { objective: 'Bod 1: Severný autoservis Apex Customs', targetX: 203, targetZ: -607, radius: 22, kind: 'reach' },
      { objective: 'Bod 2: Plážový salón InkWave Parlor', targetX: 683, targetZ: -257, radius: 22, kind: 'reach' },
      { objective: 'Bod 3: Autosalón Sunstate Motors', targetX: 252, targetZ: 812, radius: 22, kind: 'reach' },
      { objective: 'Bod 4: Úkryt Dante Vance', targetX: -914, targetZ: 369, radius: 22, kind: 'reach' },
    ],
  },
  {
    id: 'm17',
    index: 17,
    title: '17. Útok na konvoj PBPD',
    durationLabel: '25 min',
    difficulty: 5,
    timeLimitSec: 1500,
    reward: 13500,
    wantedOnStart: 4,
    introLines: [
      { speaker: 'Elena Cruz', text: 'Polícia preváža náš zabavený trezor. Štvorhviezdičkový poplach je istý.' },
    ],
    outroLines: [
      { speaker: 'Elena Cruz', text: 'Neuveriteľný únik pred celou jednotkou PBPD!' },
    ],
    stages: [
      { objective: 'Zachyť konvoj na južnom bulvári', targetX: 460, targetZ: 680, radius: 26, kind: 'reach' },
      { objective: 'Prevezmi trezor a prejdi cez centrum', targetX: 0, targetZ: 0, radius: 32, kind: 'reach' },
      { objective: 'Unikni pred 4-hviezdičkovým PBPD na sever', targetX: 538, targetZ: -869, radius: 32, kind: 'evade_wanted' },
    ],
  },
  {
    id: 'm18',
    index: 18,
    title: '18. Operácia Modrý príliv',
    durationLabel: '25 min',
    difficulty: 5,
    timeLimitSec: 1500,
    reward: 16000,
    introLines: [
      { speaker: 'Dante Vance', text: 'Kombinovaná akcia: autom po diaľnici, potom vrtuľníkom cez záliv.' },
    ],
    outroLines: [
      { speaker: 'Dante Vance', text: 'Toto sa zapíše do histórie Sunstate.' },
    ],
    stages: [
      { objective: 'Stretni kontakt v Velvet Fit', targetX: 240, targetZ: -242, radius: 18, kind: 'reach' },
      { objective: 'Prejdi cez západný podjazd', targetX: -500, targetZ: -645, radius: 26, kind: 'reach' },
      { objective: 'Vyzdvihni vrtuľník na pláži a leť ponad prístav', targetX: 740, targetZ: 520, radius: 26, kind: 'reach' },
      { objective: 'Doruč dáta na strechu Apex Trust', targetX: -358, targetZ: -358, radius: 34, kind: 'reach' },
    ],
  },
  {
    id: 'm19',
    index: 19,
    title: '19. Finále v Apex Trust Tower',
    durationLabel: '30 min',
    difficulty: 5,
    timeLimitSec: 1800,
    reward: 22000,
    wantedOnStart: 4,
    introLines: [
      { speaker: 'Elena Cruz', text: 'Najväčšia lúpež desaťročia v Palmetto Bay. Trezor Apex Trust je náš cieľ!' },
      { speaker: 'Dante Vance', text: 'Priprav zbrane, rýchle auto a čistú únikovú trasu.' },
    ],
    outroLines: [
      { speaker: 'Dante Vance', text: 'Sme za vodou! Miliónový ťah vyšiel bez chyby.' },
    ],
    stages: [
      { objective: 'Vybav sa v Ironclad Armory', targetX: 285, targetZ: 371, radius: 20, kind: 'reach' },
      { objective: 'Preraz k trezoru Apex Trust Banky', targetX: -319, targetZ: -306, radius: 22, kind: 'reach' },
      { objective: 'Prevez zlato na južné letisko', targetX: -820, targetZ: 1150, radius: 30, kind: 'reach' },
      { objective: 'Vzlietni a zbav sa PBPD nad oceánom', targetX: 1100, targetZ: 0, targetY: 120, radius: 60, kind: 'evade_wanted' },
    ],
  },
  {
    id: 'm20',
    index: 20,
    title: '20. Legenda Neon Tide (Grand Finále)',
    durationLabel: '30 min',
    difficulty: 5,
    timeLimitSec: 1800,
    reward: 35000,
    wantedOnStart: 5,
    introLines: [
      { speaker: 'Dante Vance', text: 'Celé PBPD na úrovni 5 hviezd ide po nás. Toto je posledná veľká jazda.' },
      { speaker: 'Elena Cruz', text: 'Prejdeme všetky okresy a ukážeme, komu patrí Coral Keys.' },
    ],
    outroLines: [
      { speaker: 'Dante Vance', text: 'Palmetto Bay je naše. Legenda Sunstate Outlaws!' },
    ],
    stages: [
      { objective: 'Získaj dáta v Crown Tailors', targetX: -270, targetZ: 150, radius: 20, kind: 'reach' },
      { objective: 'Prebojuj sa cez Flamingo Blvd', targetX: 674, targetZ: 165, radius: 25, kind: 'reach' },
      { objective: 'Prejdi cez lesný priesmyk na západ', targetX: -1240, targetZ: -380, radius: 28, kind: 'reach' },
      { objective: 'Zoskoč alebo pristaň v Marina Loft a unikni 5-hviezdičkovému PBPD', targetX: 538, targetZ: -869, radius: 30, kind: 'evade_wanted' },
    ],
  },
];

// 25 Hidden World Side-Missions discovered by exploring roads, bridges, trails, and rooftops
export const HIDDEN_MISSIONS: HiddenMissionDef[] = [
  { id: 'h1', title: 'Tajný skok na móle', district: 'Sunset Sands', x: 960, y: 1, z: 0, reward: 800, description: 'Objavil si extrémny skokanský mostík na konci móla!' },
  { id: 'h2', title: 'Pašerák v prístave', district: 'Priemyselný prístav', x: 380, y: 1, z: 1020, reward: 950, description: 'Skrytý kontajner s cenným nákladom.' },
  { id: 'h3', title: 'Lesná skrýša', district: 'Západné lesy', x: -1350, y: 2, z: -620, reward: 1100, description: 'Tajný kemp na konci poľnej cesty v lese.' },
  { id: 'h4', title: 'Rozhľadňa na lúke', district: 'Západné lúky', x: -1380, y: 5, z: 140, reward: 1000, description: 'Výhľad na celé údolie Palmetto Bay.' },
  { id: 'h5', title: 'Tajomstvo podjazdu', district: 'Centrum', x: -160, y: 1, z: 260, reward: 850, description: 'Stratený kufrík pod diaľničným mostom.' },
  { id: 'h6', title: 'Strešná záhrada', district: 'Centrum', x: -310, y: 74, z: -310, reward: 2200, description: 'Pristál si na vrchole mrakodrapu Apex Trust Tower!' },
  { id: 'h7', title: 'Plážový poklad Juh', district: 'Coral Keys', x: 860, y: 1, z: 740, reward: 900, description: 'Zabudnutá truhlica v piesku.' },
  { id: 'h8', title: 'Plážový poklad Sever', district: 'Coral Keys', x: 820, y: 1, z: -720, reward: 900, description: 'Zlaté hodinky pri severných palmách.' },
  { id: 'h9', title: 'Starý rybársky vrak', district: 'Záliv', x: 920, y: 1, z: 360, reward: 950, description: 'Staré mólo na južnej pláži.' },
  { id: 'h10', title: 'Severná vyhliadka', district: 'Bayview Ridge', x: -420, y: 4, z: -1160, reward: 1200, description: 'Tajná horská serpentína.' },
  { id: 'h11', title: 'Hangár 42', district: 'Letisko Coral Keys', x: -910, y: 1, z: 1180, reward: 1400, description: 'Opustený letecký hangár s hotovosťou.' },
  { id: 'h12', title: 'Žeriavový terminál', district: 'Prístav', x: 120, y: 1, z: 1120, reward: 1100, description: 'Špeciálny náklad pod prístavným žeriavom.' },
  { id: 'h13', title: 'Kruhová záhada', district: 'Centrum', x: 0, y: 1, z: 0, reward: 700, description: 'Tajná obálka pri centrálnom monumente.' },
  { id: 'h14', title: 'Lúčna skratka', district: 'Južné lúky', x: -1120, y: 2, z: 760, reward: 1050, description: 'Skratka pomedzi borovice a palmy.' },
  { id: 'h15', title: 'Severný most', district: 'Severný kanál', x: 380, y: 4, z: -980, reward: 1150, description: 'Technická schránka na mostnom pilieri.' },
  { id: 'h16', title: 'Vila na útese', district: 'Západný útes', x: -1440, y: 7, z: -180, reward: 1500, description: 'Zabudnutá hotovosť pri lesnom zráze.' },
  { id: 'h17', title: 'Nočný klub zátoka', district: 'Flamingo Blvd', x: 740, y: 1, z: -480, reward: 1000, description: 'VIP žetóny za neónovým hotelom.' },
  { id: 'h18', title: 'Podchod Juh', district: 'Port Causeway', x: 460, y: 1, z: 540, reward: 950, description: 'Ukrytý balíček v betónovom podchode.' },
  { id: 'h19', title: 'Lesná čistinka', district: 'Severný les', x: -860, y: 2, z: -980, reward: 1150, description: 'Táborák a zabudnutá brašna.' },
  { id: 'h20', title: 'Pobrežný maják', district: 'Severné pobrežie', x: 640, y: 1, z: -1140, reward: 1450, description: 'Najsevernejší bod Coral Keys.' },
  { id: 'h21', title: 'Parkovisko Midtown', district: 'Midtown', x: 460, y: 1, z: -160, reward: 850, description: 'Zamknutý kufor na parkovisku.' },
  { id: 'h22', title: 'Parkovisko Suburbs', district: 'Suburbs', x: -780, y: 1, z: 120, reward: 850, description: 'Cenné súčiastky v rohu parkoviska.' },
  { id: 'h23', title: 'Most cez rieku', district: 'Západná rieka', x: -640, y: 5, z: -640, reward: 1300, description: 'Tajné miesto pri mostnom oblúku.' },
  { id: 'h24', title: 'Priemyselná rampa', district: 'Prístav', x: -240, y: 1, z: 980, reward: 1050, description: 'Schovaný trezor za kontajnermi.' },
  { id: 'h25', title: 'Korunný klenot', district: 'Ostrovček Coral', x: 1150, y: 1, z: -220, reward: 2500, description: 'Pristál si na vzdialenom ostrovčeku v zálive!' },
];

export function buildHiddenMissionPlayableDef(
  hm: HiddenMissionDef,
  homeTarget: { name: string; x: number; z: number },
): StoryMissionDef {
  const isAerial = hm.y > 20 || hm.id === 'h6' || hm.id === 'h25';
  const isPursuit = ['h2', 'h5', 'h11', 'h14', 'h17', 'h24'].includes(hm.id);
  const idxNum = Number(hm.id.replace('h', '')) || 1;
  const fallbackTargets: Array<{ name: string; x: number; z: number }> = [
    homeTarget,
    { name: 'Parkovisko Midtown', x: 460, z: -160 },
    { name: 'Priemyselný prístav', x: -60, z: 1080 },
    { name: 'Sunset Sands Mólo', x: 920, z: 0 },
  ];
  const delivery = fallbackTargets[idxNum % fallbackTargets.length];

  return {
    id: hm.id,
    index: 100 + idxNum,
    title: `Náhodná misia: ${hm.title}`,
    durationLabel: 'Časovaná výzva (3–5 min)',
    difficulty: isPursuit ? 3 : 2,
    timeLimitSec: isAerial ? 320 : 240,
    reward: hm.reward,
    wantedOnStart: isPursuit ? 2 : 0,
    introLines: [],
    outroLines: [],
    stages: isAerial
      ? [
          {
            objective: `Zabezpeč zásielku pri ${hm.title} a presuň sa na bezpečný bod (${delivery.name})`,
            targetX: delivery.x,
            targetZ: delivery.z,
            radius: 26,
            kind: 'reach',
          },
        ]
      : [
          {
            objective: `Vyzdvihni náklad v oblasti ${hm.district}`,
            targetX: hm.x,
            targetZ: hm.z,
            radius: 18,
            kind: 'reach',
          },
          {
            objective: isPursuit
              ? `Striasť sa PBPD a doručiť náklad na ${delivery.name}`
              : `Rýchlo doručiť náklad na ${delivery.name}`,
            targetX: delivery.x,
            targetZ: delivery.z,
            radius: 24,
            kind: isPursuit ? 'evade_wanted' : 'deliver_car',
          },
        ],
  };
}

