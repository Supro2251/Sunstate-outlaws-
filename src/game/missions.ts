import { HiddenMissionDef, StoryMissionDef } from './types';

export const STORY_MISSIONS: StoryMissionDef[] = [
  {
    id: 'm1',
    index: 1,
    title: '01. Prvá jazda po Palmetto Bay',
    durationLabel: '5 min',
    difficulty: 1,
    timeLimitSec: 360,
    reward: 180,
    requiredCompleted: 0,
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
    reward: 220,
    requiredCompleted: 0,
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
    difficulty: 2,
    timeLimitSec: 420,
    reward: 260,
    requiredCompleted: 0,
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
    difficulty: 1,
    timeLimitSec: 420,
    reward: 290,
    requiredCompleted: 1,
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
    difficulty: 3,
    timeLimitSec: 480,
    reward: 420,
    wantedOnStart: 2,
    requiredCompleted: 2,
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
    reward: 460,
    requiredCompleted: 3,
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
    reward: 580,
    requiredCompleted: 4,
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
    difficulty: 2,
    timeLimitSec: 600,
    reward: 520,
    requiredCompleted: 5,
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
    difficulty: 4,
    timeLimitSec: 720,
    reward: 850,
    requiredCompleted: 6,
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
    difficulty: 2,
    timeLimitSec: 720,
    reward: 640,
    requiredCompleted: 7,
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
    reward: 820,
    requiredCompleted: 8,
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
    reward: 980,
    requiredCompleted: 9,
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
    difficulty: 3,
    timeLimitSec: 960,
    reward: 920,
    requiredCompleted: 10,
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
    reward: 1150,
    wantedOnStart: 3,
    requiredCompleted: 11,
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
    difficulty: 3,
    timeLimitSec: 1200,
    reward: 1280,
    requiredCompleted: 12,
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
    reward: 1450,
    requiredCompleted: 13,
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
    difficulty: 4,
    timeLimitSec: 1500,
    reward: 1650,
    wantedOnStart: 4,
    requiredCompleted: 14,
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
    difficulty: 3,
    timeLimitSec: 1500,
    reward: 1550,
    requiredCompleted: 15,
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
    reward: 2100,
    wantedOnStart: 4,
    requiredCompleted: 16,
    introLines: [
      { speaker: 'Elena Cruz', text: 'Najväčšia lúpež desaťročia v Palmetto Bay. Trezor Apex Trust je náš cieľ!' },
      { speaker: 'Dante Vance', text: 'Priprav zbrane, rýchle auto a čistú únikovú trasu.' },
    ],
    outroLines: [
      { speaker: 'Dante Vance', text: 'Únik sa podaril! Celý štát o nás vie.' },
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
    title: '20. Legenda Neon Tide',
    durationLabel: '30 min',
    difficulty: 4,
    timeLimitSec: 1800,
    reward: 2600,
    wantedOnStart: 4,
    requiredCompleted: 17,
    introLines: [
      { speaker: 'Dante Vance', text: 'Jednotky PBPD idú po nás v plnej sile. Toto je skúška celého tímu.' },
      { speaker: 'Elena Cruz', text: 'Prejdeme všetky okresy a ukážeme, komu patrí Coral Keys.' },
    ],
    outroLines: [
      { speaker: 'Dante Vance', text: 'Prvá kapitola uzavretá. Čakajú nás ešte väčšie operácie!' },
    ],
    stages: [
      { objective: 'Získaj dáta v Crown Tailors', targetX: -270, targetZ: 150, radius: 20, kind: 'reach' },
      { objective: 'Prebojuj sa cez Flamingo Blvd', targetX: 674, targetZ: 165, radius: 25, kind: 'reach' },
      { objective: 'Prejdi cez lesný priesmyk na západ', targetX: -1240, targetZ: -380, radius: 28, kind: 'reach' },
      { objective: 'Pristaň v Marina Loft a unikni PBPD', targetX: 538, targetZ: -869, radius: 30, kind: 'evade_wanted' },
    ],
  },
  {
    id: 'm21',
    index: 21,
    title: '21. Kuriér GSL: Zásielka bez škrabanca',
    durationLabel: '10 min',
    difficulty: 3,
    timeLimitSec: 600,
    reward: 1250,
    requiredCompleted: 0,
    isGslCourier: true,
    introLines: [
      {
        speaker: 'Dispečing GSL Express',
        text: 'Máme pre teba VIP zásielku v dodávke GSL. Musíš ísť prísne iba po ceste — žiadne skratky mimo vozovky!',
      },
      {
        speaker: 'Dispečing GSL Express',
        text: 'Dodávka musí doraziť do cieľa s 0% poškodením a krehký balík vzadu nesmie presiahnuť 5.0% poškodenia z prudkých manévrov.',
      },
    ],
    outroLines: [
      {
        speaker: 'Dispečing GSL Express',
        text: 'Perfektná jazda! Nulový škrabanec a balík v top stave. Odmena $1,250 je na účte.',
      },
    ],
    stages: [
      {
        objective: 'Doruč zásielku v dodávke GSL po ceste na križovatku pri SunSip Mart (Flamingo Blvd)',
        targetX: 668,
        targetZ: 185,
        radius: 18,
        kind: 'deliver_car',
      },
    ],
  },

  // --- 30 NEW CAMPAIGN MISSIONS (m22 - m51) FOR MULTI-10-HOUR PROGRESSION ---
  {
    id: 'm22',
    index: 22,
    title: '22. Kairo: Nočné mixy v Pulse Studio',
    durationLabel: '8 min',
    difficulty: 1,
    timeLimitSec: 480,
    reward: 550,
    requiredCompleted: 18,
    introLines: [
      { speaker: 'Kairo Delgado', text: 'Potrebujem nové zvukové karty zo severného salónu priamo do môjho štúdia v centre.' },
    ],
    outroLines: [
      { speaker: 'Kairo Delgado', text: 'Frekvencia čistá. Teraz máme signál na celé mesto.' },
    ],
    stages: [
      { objective: 'Vyzdvihni aparatúru pri InkWave Parlor', targetX: 683, targetZ: -257, radius: 18, kind: 'reach' },
      { objective: 'Doruč ju do Pulse Studio Loft', targetX: -62, targetZ: -118, radius: 18, kind: 'reach' },
    ],
  },
  {
    id: 'm23',
    index: 23,
    title: '23. Prepad na Koralovom moste',
    durationLabel: '12 min',
    difficulty: 4,
    timeLimitSec: 720,
    reward: 1450,
    wantedOnStart: 3,
    requiredCompleted: 19,
    introLines: [
      { speaker: 'Dante Vance', text: 'Cez most ide súkromný kuriér s čiernymi dátami. Zachytíme ho!' },
    ],
    outroLines: [
      { speaker: 'Dante Vance', text: 'Polícia nestihla ani uzavrieť pruhy.' },
    ],
    stages: [
      { objective: 'Prejdi cez Koralový most pri ostrove', targetX: 1045, targetZ: -220, radius: 26, kind: 'reach' },
      { objective: 'Zaveď dáta cez južný diaľničný nadjazd', targetX: 448, targetZ: 15, radius: 26, kind: 'reach' },
      { objective: 'Zmizni PBPD v Dante Hideout', targetX: -914, targetZ: 369, radius: 24, kind: 'evade_wanted' },
    ],
  },
  {
    id: 'm24',
    index: 24,
    title: '24. Taxi VIP: Obchodný magnát',
    durationLabel: '9 min',
    difficulty: 2,
    timeLimitSec: 540,
    reward: 780,
    requiredCompleted: 20,
    introLines: [
      { speaker: 'Dispečer Taxislužby', text: 'VIP klient pri Sunset Sands potrebuje odvoz k banke a potom na mólo.' },
    ],
    outroLines: [
      { speaker: 'VIP Klient', text: 'Presne na minútu. Tu máš poctivé prepitné.' },
    ],
    stages: [
      { objective: 'Vyzdvihni klienta na móle Sunset Sands', targetX: 920, targetZ: 0, radius: 20, kind: 'deliver_car' },
      { objective: 'Odvez ho pred Apex Trust Banku', targetX: -319, targetZ: -306, radius: 20, kind: 'deliver_car' },
      { objective: 'Zakonči jazdu pri parkovisku Midtown', targetX: 460, targetZ: -160, radius: 22, kind: 'deliver_car' },
    ],
  },
  {
    id: 'm25',
    index: 25,
    title: '25. Pobrežná kontrola z vrtuľníka',
    durationLabel: '14 min',
    difficulty: 3,
    timeLimitSec: 840,
    reward: 1320,
    requiredCompleted: 21,
    introLines: [
      { speaker: 'Elena Cruz', text: 'Skontroluj pobrežie a prístav z výšky pomocou vrtuľníka SkyHawk.' },
    ],
    outroLines: [
      { speaker: 'Elena Cruz', text: 'Všetky majáky a móla sú zmapované.' },
    ],
    stages: [
      { objective: 'Vyzdvihni vrtuľník na heliporte', targetX: 740, targetZ: 520, radius: 24, kind: 'reach' },
      { objective: 'Preleť ponad Priemyselný prístav', targetX: -60, targetZ: 1080, targetY: 85, radius: 48, kind: 'fly_ring', requiredVehicleKind: 'helicopter' },
      { objective: 'Preleť ponad Bayview Ridge na severe', targetX: -120, targetZ: -1120, targetY: 95, radius: 48, kind: 'fly_ring', requiredVehicleKind: 'helicopter' },
      { objective: 'Pristaň na severnom letisku', targetX: 520, targetZ: -1120, radius: 34, kind: 'reach' },
    ],
  },
  {
    id: 'm26',
    index: 26,
    title: '26. Ranný závoz do kaviarne',
    durationLabel: '7 min',
    difficulty: 1,
    timeLimitSec: 450,
    reward: 620,
    requiredCompleted: 22,
    introLines: [
      { speaker: 'Matej Kováč', text: 'Došla nám pražená káva aj mlieko. Zvez to zo skladu pri prístave!' },
    ],
    outroLines: [
      { speaker: 'Matej Kováč', text: 'Zachránil si rannú smenu v Palmetto Bay!' },
    ],
    stages: [
      { objective: 'Prevezmi zásoby pri prístavnom termináli', targetX: 40, targetZ: 960, radius: 18, kind: 'reach' },
      { objective: 'Doruč tovar k QuickStop 24 v centre', targetX: -150, targetZ: -230, radius: 18, kind: 'reach' },
    ],
  },
  {
    id: 'm27',
    index: 27,
    title: '27. Špionážne vysielače',
    durationLabel: '16 min',
    difficulty: 4,
    timeLimitSec: 960,
    reward: 1680,
    wantedOnStart: 2,
    requiredCompleted: 23,
    introLines: [
      { speaker: 'Kairo Delgado', text: 'Polícia rozmiestnila odposluchy. Musíš prejsť tri uzly a zmiasť signál.' },
    ],
    outroLines: [
      { speaker: 'Kairo Delgado', text: 'Ich radary práve slepia falošné stopy.' },
    ],
    stages: [
      { objective: 'Uzol 1: Západný podjazd', targetX: -500, targetZ: -645, radius: 22, kind: 'reach' },
      { objective: 'Uzol 2: Západný most cez rieku', targetX: -640, targetZ: -640, radius: 22, kind: 'reach' },
      { objective: 'Uzol 3: Parkovisko Suburbs', targetX: -780, targetZ: 120, radius: 22, kind: 'reach' },
      { objective: 'Uteč do Pulse Studio Loft bez polície', targetX: -62, targetZ: -118, radius: 22, kind: 'evade_wanted' },
    ],
  },
  {
    id: 'm28',
    index: 28,
    title: '28. Hasiči: Výbuch v dokoch',
    durationLabel: '11 min',
    difficulty: 2,
    timeLimitSec: 660,
    reward: 940,
    requiredCompleted: 24,
    introLines: [
      { speaker: 'Veliteľ zásahu', text: 'Cisterny pri východnom móle horia. Vezmi hasičské auto!' },
    ],
    outroLines: [
      { speaker: 'Veliteľ zásahu', text: 'Skvelá práca, prístav je znova bezpečný.' },
    ],
    stages: [
      { objective: 'Vyzdvihni hasičské auto na stanici', targetX: -476, targetZ: 470, radius: 22, kind: 'reach' },
      { objective: 'Prejdi cez Port Causeway', targetX: 460, targetZ: 540, radius: 26, kind: 'reach' },
      { objective: 'Zasiahni pri východných dokoch', targetX: 340, targetZ: 980, radius: 24, kind: 'reach' },
    ],
  },
  {
    id: 'm29',
    index: 29,
    title: '29. Nočný šprint cez predmestia',
    durationLabel: '14 min',
    difficulty: 4,
    timeLimitSec: 840,
    reward: 1750,
    requiredCompleted: 25,
    introLines: [
      { speaker: 'Dante Vance', text: 'Nová pouličná liga štartuje na okraji predmestia. Čistý čas rozhodne!' },
    ],
    outroLines: [
      { speaker: 'Dante Vance', text: 'Nikto z Coral Keys na nás nemá.' },
    ],
    stages: [
      { objective: 'Štart na parkovisku Suburbs', targetX: -780, targetZ: 120, radius: 20, kind: 'deliver_car' },
      { objective: 'Prejdi cez južné letisko', targetX: -820, targetZ: 1150, radius: 28, kind: 'deliver_car' },
      { objective: 'Preleť asfaltom k Sunstate Motors', targetX: 252, targetZ: 812, radius: 24, kind: 'deliver_car' },
      { objective: 'Cieľ na Flamingo Boulevard', targetX: 700, targetZ: -450, radius: 24, kind: 'deliver_car' },
    ],
  },
  {
    id: 'm30',
    index: 30,
    title: '30. Letecký poštár Coral Wing',
    durationLabel: '13 min',
    difficulty: 2,
    timeLimitSec: 780,
    reward: 1120,
    requiredCompleted: 26,
    introLines: [
      { speaker: 'Elena Cruz', text: 'Zdravotné zásoby musia letieť vrtuľovým lietadlom medzi oboma dráhami.' },
    ],
    outroLines: [
      { speaker: 'Elena Cruz', text: 'Hladké pristátie, náklad neporušený.' },
    ],
    stages: [
      { objective: 'Nastúp do lietadla na južnej dráhe', targetX: -820, targetZ: 1150, radius: 28, kind: 'reach' },
      { objective: 'Preleť ponad Koralový most', targetX: 1045, targetZ: -220, targetY: 95, radius: 52, kind: 'fly_ring', requiredVehicleKind: 'plane' },
      { objective: 'Pristaň na severnej dráhe Coral Keys', targetX: 520, targetZ: -1120, radius: 38, kind: 'reach' },
    ],
  },
  {
    id: 'm31',
    index: 31,
    title: '31. Zásah v západných lesoch',
    durationLabel: '16 min',
    difficulty: 4,
    timeLimitSec: 960,
    reward: 1890,
    wantedOnStart: 3,
    requiredCompleted: 27,
    introLines: [
      { speaker: 'Dante Vance', text: 'Konkurencia si urobila sklad v severnom lese. Vezmi tovar a zmizni.' },
    ],
    outroLines: [
      { speaker: 'Dante Vance', text: 'V lese nás policajné autá nikdy nedobehnú.' },
    ],
    stages: [
      { objective: 'Doraz do severného lesa', targetX: -1180, targetZ: -980, radius: 24, kind: 'reach' },
      { objective: 'Prejdi po lesnej ceste na západný okraj', targetX: -1250, targetZ: -450, radius: 26, kind: 'reach' },
      { objective: 'Unikni pred 3-hviezdičkovým PBPD do prístavu', targetX: -198, targetZ: 638, radius: 26, kind: 'evade_wanted' },
    ],
  },
  {
    id: 'm32',
    index: 32,
    title: '32. Módny kontrakt pre Crown Tailors',
    durationLabel: '8 min',
    difficulty: 1,
    timeLimitSec: 480,
    reward: 690,
    requiredCompleted: 28,
    introLines: [
      { speaker: 'Nina Šimková', text: 'Kolekcia mešká z Threads & Co do Crown Tailors. Prevez ju opatrne.' },
    ],
    outroLines: [
      { speaker: 'Nina Šimková', text: 'Všetky obleky dorazili bez pokrčenia!' },
    ],
    stages: [
      { objective: 'Vyzdvihni kolekciu v Threads & Co', targetX: -533, targetZ: -167, radius: 18, kind: 'reach' },
      { objective: 'Doruč ju do Crown Tailors', targetX: -270, targetZ: 150, radius: 18, kind: 'reach' },
    ],
  },
  {
    id: 'm33',
    index: 33,
    title: '33. Obrnený trezor na cestách',
    durationLabel: '18 min',
    difficulty: 5,
    timeLimitSec: 1080,
    reward: 2450,
    wantedOnStart: 4,
    requiredCompleted: 29,
    introLines: [
      { speaker: 'Dante Vance', text: 'Bankový transport mieri z centra do prístavu. Priprav sa na tvrdú naháňačku!' },
    ],
    outroLines: [
      { speaker: 'Dante Vance', text: 'Zlaté prúty sú bezpečne ukryté.' },
    ],
    stages: [
      { objective: 'Zachyť transport pri Apex Trust Banke', targetX: -319, targetZ: -306, radius: 22, kind: 'reach' },
      { objective: 'Prejdi cez priemyselný prístav', targetX: -60, targetZ: 1080, radius: 26, kind: 'reach' },
      { objective: 'Unikni pred 4-hviezdičkovým PBPD na západné lúky', targetX: -1320, targetZ: 120, radius: 28, kind: 'evade_wanted' },
    ],
  },
  {
    id: 'm34',
    index: 34,
    title: '34. Sanitka v nočnej búrke',
    durationLabel: '10 min',
    difficulty: 2,
    timeLimitSec: 600,
    reward: 980,
    requiredCompleted: 30,
    introLines: [
      { speaker: 'Katarína Nováková', text: 'Zranený pilot čaká na pláži pri ostrovnom moste! Ponáhľaj sa.' },
    ],
    outroLines: [
      { speaker: 'Katarína Nováková', text: 'Ďalší zachránený život v Coral Keys.' },
    ],
    stages: [
      { objective: 'Vezmi sanitku pri nemocnici', targetX: -364, targetZ: -648, radius: 22, kind: 'reach' },
      { objective: 'Nalož pacienta pri Koralovom moste', targetX: 1045, targetZ: -220, radius: 24, kind: 'reach' },
      { objective: 'Dopraviť ho späť do nemocnice', targetX: -364, targetZ: -648, radius: 22, kind: 'reach' },
    ],
  },
  {
    id: 'm35',
    index: 35,
    title: '35. Stíhačka nad tromi zálivmi',
    durationLabel: '16 min',
    difficulty: 4,
    timeLimitSec: 960,
    reward: 1980,
    requiredCompleted: 31,
    introLines: [
      { speaker: 'Elena Cruz', text: 'Vojenský radar testuje rýchlosť stíhačky Valkyrie v troch kontrolných bodoch.' },
    ],
    outroLines: [
      { speaker: 'Elena Cruz', text: 'Nadzvukový rekord Coral Keys pokorený!' },
    ],
    stages: [
      { objective: 'Nastúp do stíhačky na južnej dráhe', targetX: -820, targetZ: 1150, radius: 28, kind: 'reach' },
      { objective: 'Preleť nad východným oceánom', targetX: 1200, targetZ: -600, targetY: 140, radius: 60, kind: 'fly_ring', requiredVehicleKind: 'plane' },
      { objective: 'Preleť ponad Apex Trust Tower', targetX: -358, targetZ: -358, targetY: 135, radius: 55, kind: 'fly_ring', requiredVehicleKind: 'plane' },
      { objective: 'Pristaň späť na južnom letisku', targetX: -820, targetZ: 1150, radius: 42, kind: 'reach' },
    ],
  },
  {
    id: 'm36',
    index: 36,
    title: '36. Krátka pochôdzka pre baristu',
    durationLabel: '7 min',
    difficulty: 1,
    timeLimitSec: 450,
    reward: 740,
    requiredCompleted: 32,
    introLines: [
      { speaker: 'Kairo Delgado', text: 'Zober účtovníctvo zo SharpClip k Velvet Fit skôr, než zatvoria.' },
    ],
    outroLines: [
      { speaker: 'Kairo Delgado', text: 'Rýchle a čisté.' },
    ],
    stages: [
      { objective: 'Navštív SharpClip v severnej štvrti', targetX: 138, targetZ: -520, radius: 18, kind: 'reach' },
      { objective: 'Odovzdaj obálku vo Velvet Fit', targetX: 240, targetZ: -242, radius: 18, kind: 'reach' },
    ],
  },
  {
    id: 'm37',
    index: 37,
    title: '37. Sabotáž nelegálneho skladu',
    durationLabel: '16 min',
    difficulty: 4,
    timeLimitSec: 960,
    reward: 2150,
    wantedOnStart: 3,
    requiredCompleted: 33,
    introLines: [
      { speaker: 'Elena Cruz', text: 'V Ironclad Armory nám nechali informácie o pašerákoch v dokoch.' },
    ],
    outroLines: [
      { speaker: 'Elena Cruz', text: 'Konkurencia prišla o celý náklad.' },
    ],
    stages: [
      { objective: 'Vyzbroj sa v Ironclad Armory', targetX: 285, targetZ: 371, radius: 18, kind: 'reach' },
      { objective: 'Zabezpeč východné doky', targetX: 340, targetZ: 980, radius: 22, kind: 'reach' },
      { objective: 'Zmizni PBPD smerom na sever do Marina Loft', targetX: 538, targetZ: -869, radius: 26, kind: 'evade_wanted' },
    ],
  },
  {
    id: 'm38',
    index: 38,
    title: '38. Kuriér GSL II: Dlhá pobrežná trasa',
    durationLabel: '14 min',
    difficulty: 3,
    timeLimitSec: 840,
    reward: 1950,
    requiredCompleted: 34,
    isGslCourier: true,
    introLines: [
      {
        speaker: 'Dispečing GSL Express',
        text: 'Druhý VIP kontrakt GSL! Dodávka musí ísť výhradne po ceste, bez jediného škrabanca (0%) a s maximálne 5% otrasmi balíka.',
      },
    ],
    outroLines: [
      {
        speaker: 'Dispečing GSL Express',
        text: 'Majstrovské riadenie! Takto vyzerá elitný kuriér GSL.',
      },
    ],
    stages: [
      {
        objective: 'Prejdi v dodávke GSL po ceste cez kruhový objazd v centre',
        targetX: 0,
        targetZ: 0,
        radius: 28,
        kind: 'deliver_car',
      },
      {
        objective: 'Doruč zásielku po ceste k severnému servisu Apex Customs',
        targetX: 203,
        targetZ: -607,
        radius: 20,
        kind: 'deliver_car',
      },
    ],
  },
  {
    id: 'm39',
    index: 39,
    title: '39. VIP párty na Flamingo Blvd',
    durationLabel: '10 min',
    difficulty: 2,
    timeLimitSec: 600,
    reward: 1180,
    requiredCompleted: 35,
    introLines: [
      { speaker: 'Kairo Delgado', text: 'Pozvali ma hrať na pobrežnú párty. Odvez aparatúru zo štúdia!' },
    ],
    outroLines: [
      { speaker: 'Kairo Delgado', text: 'Klub je plný a reputácia stúpa.' },
    ],
    stages: [
      { objective: 'Vyzdvihni mixpult v Pulse Studio Loft', targetX: -62, targetZ: -118, radius: 18, kind: 'reach' },
      { objective: 'Odvez ho na Flamingo Boulevard', targetX: 700, targetZ: -450, radius: 22, kind: 'reach' },
      { objective: 'Zastav sa pri InkWave Parlor na afterparty', targetX: 683, targetZ: -257, radius: 18, kind: 'reach' },
    ],
  },
  {
    id: 'm40',
    index: 40,
    title: '40. Vrtuľníková evakuácia zo strechy',
    durationLabel: '18 min',
    difficulty: 5,
    timeLimitSec: 1080,
    reward: 2750,
    wantedOnStart: 4,
    requiredCompleted: 36,
    introLines: [
      { speaker: 'Elena Cruz', text: 'Klientský tím uviazol na streche mrakodrapu. Vezmi vrtuľník a vyzdvihni ich!' },
    ],
    outroLines: [
      { speaker: 'Elena Cruz', text: 'Únik zo vzduchu vyšiel na sekundu presne!' },
    ],
    stages: [
      { objective: 'Nasadni do vrtuľníka na heliporte', targetX: 740, targetZ: 520, radius: 24, kind: 'reach' },
      { objective: 'Pristaň na vrchole Apex Trust Tower', targetX: -358, targetZ: -358, targetY: 96, radius: 42, kind: 'fly_ring', requiredVehicleKind: 'helicopter' },
      { objective: 'Odleť ponad západné hory a striasť sa PBPD', targetX: -1200, targetZ: -800, targetY: 130, radius: 60, kind: 'evade_wanted' },
    ],
  },
  {
    id: 'm41',
    index: 41,
    title: '41. Nočný nákup súčiastok',
    durationLabel: '8 min',
    difficulty: 1,
    timeLimitSec: 480,
    reward: 860,
    requiredCompleted: 37,
    introLines: [
      { speaker: 'Tomáš Bielik', text: 'Dante potrebuje nové turbotlakové hadice z južného prístavu na sever.' },
    ],
    outroLines: [
      { speaker: 'Tomáš Bielik', text: 'Všetko pasuje na milimeter.' },
    ],
    stages: [
      { objective: 'Vyzdvihni diely v Apex Customs Prístav', targetX: -198, targetZ: 638, radius: 20, kind: 'reach' },
      { objective: 'Zavez ich do Apex Customs Sever', targetX: 203, targetZ: -607, radius: 20, kind: 'reach' },
    ],
  },
  {
    id: 'm42',
    index: 42,
    title: '42. Bleskový prejazd cez 5 štvrtí',
    durationLabel: '16 min',
    difficulty: 4,
    timeLimitSec: 960,
    reward: 2350,
    requiredCompleted: 38,
    introLines: [
      { speaker: 'Dante Vance', text: 'Časovka cez celé Palmetto Bay. Každý prejazdový bod sa počíta!' },
    ],
    outroLines: [
      { speaker: 'Dante Vance', text: 'Nový traťový rekord zapísaný v našej knihe.' },
    ],
    stages: [
      { objective: 'Bod 1: Kruhový objazd v centre', targetX: 0, targetZ: 0, radius: 28, kind: 'deliver_car' },
      { objective: 'Bod 2: Sunset Sands Mólo', targetX: 920, targetZ: 0, radius: 26, kind: 'deliver_car' },
      { objective: 'Bod 3: Bayview Ridge', targetX: -120, targetZ: -1120, radius: 28, kind: 'deliver_car' },
      { objective: 'Bod 4: Západná lúka', targetX: -1320, targetZ: 120, radius: 28, kind: 'deliver_car' },
      { objective: 'Cieľ: Sunstate Motors', targetX: 252, targetZ: 812, radius: 24, kind: 'deliver_car' },
    ],
  },
  {
    id: 'm43',
    index: 43,
    title: '43. Hliadka pobrežných vôd',
    durationLabel: '11 min',
    difficulty: 2,
    timeLimitSec: 660,
    reward: 1300,
    requiredCompleted: 39,
    introLines: [
      { speaker: 'Elena Cruz', text: 'Zober lietadlo Coral Wing a skontroluj lode v južnom a východnom zálive.' },
    ],
    outroLines: [
      { speaker: 'Elena Cruz', text: 'Záliv je čistý, žiadne neoznačené plavidlá.' },
    ],
    stages: [
      { objective: 'Nastúp do lietadla na južnom letisku', targetX: -820, targetZ: 1150, radius: 28, kind: 'reach' },
      { objective: 'Preleť ponad východný oceán', targetX: 1200, targetZ: -600, targetY: 110, radius: 60, kind: 'fly_ring', requiredVehicleKind: 'plane' },
      { objective: 'Pristaň na severnom letisku', targetX: 520, targetZ: -1120, radius: 38, kind: 'reach' },
    ],
  },
  {
    id: 'm44',
    index: 44,
    title: '44. Útok na dátový konvoj',
    durationLabel: '18 min',
    difficulty: 5,
    timeLimitSec: 1080,
    reward: 2890,
    wantedOnStart: 4,
    requiredCompleted: 40,
    introLines: [
      { speaker: 'Kairo Delgado', text: 'Šifrované servery opúšťajú centrum. Zachytime ich a zotrieme stopy!' },
    ],
    outroLines: [
      { speaker: 'Kairo Delgado', text: 'Máme kľúče k celej finančnej sieti mesta.' },
    ],
    stages: [
      { objective: 'Zachyť signál pri Port Causeway', targetX: 460, targetZ: 540, radius: 24, kind: 'reach' },
      { objective: 'Prebojuj sa cez diaľničný nadjazd', targetX: 448, targetZ: 15, radius: 26, kind: 'reach' },
      { objective: 'Unikni pred 4-hviezdičkovým PBPD na sever', targetX: 538, targetZ: -869, radius: 28, kind: 'evade_wanted' },
    ],
  },
  {
    id: 'm45',
    index: 45,
    title: '45. Rýchla pošta pre Sunstate Motors',
    durationLabel: '9 min',
    difficulty: 2,
    timeLimitSec: 540,
    reward: 1150,
    requiredCompleted: 41,
    introLines: [
      { speaker: 'Dante Vance', text: 'Treba vyzdvihnúť papiere k novému superšportu z banky do autosalónu.' },
    ],
    outroLines: [
      { speaker: 'Dante Vance', text: 'Zmluvy sú podpísané.' },
    ],
    stages: [
      { objective: 'Zájdi do Apex Trust Banky', targetX: -319, targetZ: -306, radius: 18, kind: 'reach' },
      { objective: 'Odovzdaj zmluvy v Sunstate Motors', targetX: 252, targetZ: 812, radius: 20, kind: 'reach' },
    ],
  },
  {
    id: 'm46',
    index: 46,
    title: '46. Letecký zoskok na prístav',
    durationLabel: '15 min',
    difficulty: 4,
    timeLimitSec: 900,
    reward: 2550,
    requiredCompleted: 42,
    introLines: [
      { speaker: 'Elena Cruz', text: 'Vyleť nad prístav s padákom a pristaň priamo medzi kontajnermi.' },
    ],
    outroLines: [
      { speaker: 'Elena Cruz', text: 'Nenápadný vstup z neba, presne ako zo sna.' },
    ],
    stages: [
      { objective: 'Over si padák v Ironclad Armory', targetX: 285, targetZ: 371, radius: 18, kind: 'reach' },
      { objective: 'Preleť vysoko nad priemyselným prístavom', targetX: -60, targetZ: 1080, targetY: 135, radius: 55, kind: 'fly_ring' },
      { objective: 'Pristaň s padákom na móle v prístave', targetX: 40, targetZ: 960, radius: 34, kind: 'reach' },
    ],
  },
  {
    id: 'm47',
    index: 47,
    title: '47. Horský únik cez lesný podjazd',
    durationLabel: '14 min',
    difficulty: 3,
    timeLimitSec: 840,
    reward: 2250,
    wantedOnStart: 3,
    requiredCompleted: 43,
    introLines: [
      { speaker: 'Dante Vance', text: 'PBPD zablokovali centrum. Prebijeme sa lesom na sever!' },
    ],
    outroLines: [
      { speaker: 'Dante Vance', text: 'Lesné cesty poznáme lepšie než ktokoľvek z nich.' },
    ],
    stages: [
      { objective: 'Prejdi cez lesný podjazd', targetX: -500, targetZ: -645, radius: 26, kind: 'reach' },
      { objective: 'Prejdi cez severný les', targetX: -1180, targetZ: -980, radius: 28, kind: 'reach' },
      { objective: 'Striasť sa PBPD na Bayview Ridge', targetX: -120, targetZ: -1120, radius: 30, kind: 'evade_wanted' },
    ],
  },
  {
    id: 'm48',
    index: 48,
    title: '48. Zásah hasičov v predmestí',
    durationLabel: '10 min',
    difficulty: 2,
    timeLimitSec: 600,
    reward: 1450,
    requiredCompleted: 44,
    introLines: [
      { speaker: 'Dispečer', text: 'Požiar suchého porastu pri západnom lese! Hasičské auto je pripravené.' },
    ],
    outroLines: [
      { speaker: 'Veliteľ zásahu', text: 'Les je zachránený pred veľkým požiarom!' },
    ],
    stages: [
      { objective: 'Vezmi hasičské auto na stanici', targetX: -476, targetZ: 470, radius: 22, kind: 'reach' },
      { objective: 'Doraz k lesnému okraju na západe', targetX: -1250, targetZ: -450, radius: 26, kind: 'reach' },
    ],
  },
  {
    id: 'm49',
    index: 49,
    title: '49. Stíhačka nad Coral Keys: Búrka',
    durationLabel: '20 min',
    difficulty: 5,
    timeLimitSec: 1200,
    reward: 3200,
    wantedOnStart: 4,
    requiredCompleted: 45,
    introLines: [
      { speaker: 'Elena Cruz', text: 'Vzdušný priestor nad Coral Keys je pod poplachom. Ukáž silu stíhačky!' },
    ],
    outroLines: [
      { speaker: 'Elena Cruz', text: 'Obloha nad celým zálivom je pod našou kontrolou.' },
    ],
    stages: [
      { objective: 'Vzlietni zo južnej letiskovej dráhy', targetX: -820, targetZ: 1150, radius: 28, kind: 'reach' },
      { objective: 'Preleť nad západnými horami', targetX: -1200, targetZ: -800, targetY: 145, radius: 60, kind: 'fly_ring', requiredVehicleKind: 'plane' },
      { objective: 'Preleť ponad východný oceán', targetX: 1200, targetZ: -600, targetY: 145, radius: 60, kind: 'fly_ring', requiredVehicleKind: 'plane' },
      { objective: 'Unikni prenasledovaniu a pristaň na základni', targetX: -820, targetZ: 1150, radius: 42, kind: 'evade_wanted' },
    ],
  },
  {
    id: 'm50',
    index: 50,
    title: '50. Tajná dohoda troch postáv',
    durationLabel: '16 min',
    difficulty: 3,
    timeLimitSec: 960,
    reward: 2750,
    requiredCompleted: 46,
    introLines: [
      { speaker: 'Kairo Delgado', text: 'Dante, Elena aj ja musíme zjednotiť všetky tri základne pred finálnym úderom.' },
    ],
    outroLines: [
      { speaker: 'Dante Vance', text: 'Tím je na sto percent pripravený. Ostáva posledná misia!' },
    ],
    stages: [
      { objective: 'Vyzdvihni plány v Pulse Studio Loft', targetX: -62, targetZ: -118, radius: 20, kind: 'reach' },
      { objective: 'Schváľ trasu v Marina Loft', targetX: 538, targetZ: -869, radius: 20, kind: 'reach' },
      { objective: "Zabezpeč vozidlá v Dante's Hideout", targetX: -914, targetZ: 369, radius: 20, kind: 'reach' },
    ],
  },
  {
    id: 'm51',
    index: 51,
    title: '51. Veľké finále: Králi Sunstate (Grand Finale)',
    durationLabel: '30 min',
    difficulty: 5,
    timeLimitSec: 1800,
    reward: 5000,
    wantedOnStart: 5,
    requiredCompleted: 47,
    introLines: [
      { speaker: 'Dante Vance', text: 'Celé PBPD na úrovni 5 hviezd ide po nás. Toto je vrchol celej kampane!' },
      { speaker: 'Elena Cruz', text: 'Prejdeme po zemi aj vo vzduchu cez celý ostrov Coral Keys.' },
      { speaker: 'Kairo Delgado', text: 'Všetky siete sú naše. Drž sa volantu aj knipla!' },
    ],
    outroLines: [
      { speaker: 'Dante Vance', text: 'Dokázali sme to! Palmetto Bay a celé Coral Keys patrí navždy Sunstate Outlaws!' },
    ],
    stages: [
      { objective: 'Vyzbroj sa naplno v Ironclad Armory', targetX: 285, targetZ: 371, radius: 20, kind: 'reach' },
      { objective: 'Preber hlavný trezor v Apex Trust Banke', targetX: -319, targetZ: -306, radius: 22, kind: 'reach' },
      { objective: 'Prebojuj sa cez Flamingo Blvd na pobrežie', targetX: 700, targetZ: -450, radius: 26, kind: 'reach' },
      { objective: 'Presuň sa k južnému letisku Coral Keys', targetX: -820, targetZ: 1150, radius: 30, kind: 'reach' },
      { objective: 'Pristaň v Marina Loft a unikni 5-hviezdičkovému PBPD', targetX: 538, targetZ: -869, radius: 32, kind: 'evade_wanted' },
    ],
  },
];

// 25 Hidden World Side-Missions discovered by exploring roads, bridges, trails, and rooftops
export const HIDDEN_MISSIONS: HiddenMissionDef[] = [
  { id: 'h1', title: 'Tajný skok na móle', district: 'Sunset Sands', x: 960, y: 1, z: 0, reward: 140, description: 'Objavil si extrémny skokanský mostík na konci móla!' },
  { id: 'h2', title: 'Pašerák v prístave', district: 'Priemyselný prístav', x: 380, y: 1, z: 1020, reward: 180, description: 'Skrytý kontajner s cenným nákladom.' },
  { id: 'h3', title: 'Lesná skrýša', district: 'Západné lesy', x: -1350, y: 2, z: -620, reward: 210, description: 'Tajný kemp na konci poľnej cesty v lese.' },
  { id: 'h4', title: 'Rozhľadňa na lúke', district: 'Západné lúky', x: -1380, y: 5, z: 140, reward: 190, description: 'Výhľad na celé údolie Palmetto Bay.' },
  { id: 'h5', title: 'Tajomstvo podjazdu', district: 'Centrum', x: -160, y: 1, z: 260, reward: 160, description: 'Stratený kufrík pod diaľničným mostom.' },
  { id: 'h6', title: 'Strešná záhrada', district: 'Centrum', x: -310, y: 74, z: -310, reward: 340, description: 'Pristál si na vrchole mrakodrapu Apex Trust Tower!' },
  { id: 'h7', title: 'Plážový poklad Juh', district: 'Coral Keys', x: 860, y: 1, z: 740, reward: 170, description: 'Zabudnutá truhlica v piesku.' },
  { id: 'h8', title: 'Plážový poklad Sever', district: 'Coral Keys', x: 820, y: 1, z: -720, reward: 170, description: 'Zlaté hodinky pri severných palmách.' },
  { id: 'h9', title: 'Starý rybársky vrak', district: 'Záliv', x: 920, y: 1, z: 360, reward: 180, description: 'Staré mólo na južnej pláži.' },
  { id: 'h10', title: 'Severná vyhliadka', district: 'Bayview Ridge', x: -420, y: 4, z: -1160, reward: 220, description: 'Tajná horská serpentína.' },
  { id: 'h11', title: 'Hangár 42', district: 'Letisko Coral Keys', x: -910, y: 1, z: 1180, reward: 260, description: 'Opustený letecký hangár so zásobami.' },
  { id: 'h12', title: 'Žeriavový terminál', district: 'Prístav', x: 120, y: 1, z: 1120, reward: 200, description: 'Špeciálny náklad pod prístavným žeriavom.' },
  { id: 'h13', title: 'Kruhová záhada', district: 'Centrum', x: 0, y: 1, z: 0, reward: 120, description: 'Tajná obálka pri centrálnom monumente.' },
  { id: 'h14', title: 'Lúčna skratka', district: 'Južné lúky', x: -1120, y: 2, z: 760, reward: 195, description: 'Skratka pomedzi borovice a palmy.' },
  { id: 'h15', title: 'Severný most', district: 'Severný kanál', x: 380, y: 4, z: -980, reward: 215, description: 'Technická schránka na mostnom pilieri.' },
  { id: 'h16', title: 'Vila na útese', district: 'Západný útes', x: -1440, y: 7, z: -180, reward: 280, description: 'Zabudnutý kufrík pri lesnom zráze.' },
  { id: 'h17', title: 'Nočný klub zátoka', district: 'Flamingo Blvd', x: 740, y: 1, z: -480, reward: 185, description: 'VIP žetóny za neónovým hotelom.' },
  { id: 'h18', title: 'Podchod Juh', district: 'Port Causeway', x: 460, y: 1, z: 540, reward: 175, description: 'Ukrytý balíček v betónovom podchode.' },
  { id: 'h19', title: 'Lesná čistinka', district: 'Severný les', x: -860, y: 2, z: -980, reward: 210, description: 'Táborák a zabudnutá brašna.' },
  { id: 'h20', title: 'Pobrežný maják', district: 'Severné pobrežie', x: 640, y: 1, z: -1140, reward: 265, description: 'Najsevernejší bod Coral Keys.' },
  { id: 'h21', title: 'Parkovisko Midtown', district: 'Midtown', x: 460, y: 1, z: -160, reward: 160, description: 'Zamknutý kufor na parkovisku.' },
  { id: 'h22', title: 'Parkovisko Suburbs', district: 'Suburbs', x: -780, y: 1, z: 120, reward: 160, description: 'Cenné súčiastky v rohu parkoviska.' },
  { id: 'h23', title: 'Most cez rieku', district: 'Západná rieka', x: -640, y: 5, z: -640, reward: 240, description: 'Tajné miesto pri mostnom oblúku.' },
  { id: 'h24', title: 'Priemyselná rampa', district: 'Prístav', x: -240, y: 1, z: 980, reward: 195, description: 'Schovaný trezor za kontajnermi.' },
  { id: 'h25', title: 'Korunný klenot', district: 'Ostrovček Coral', x: 1150, y: 1, z: -220, reward: 380, description: 'Pristál si na vzdialenom ostrovčeku v zálive!' },
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
