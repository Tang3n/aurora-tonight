import type { Label } from '@aurora/model/score';

export type Lang = 'en' | 'cs' | 'no';
export const LANGS: Lang[] = ['en', 'cs', 'no'];

/** BCP 47 tag for Intl formatting. */
export const LOCALE: Record<Lang, string> = { en: 'en-GB', cs: 'cs-CZ', no: 'nb-NO' };

export interface Strings {
  changeLocation: string;
  useMyLocation: string;
  searchPlaceholder: string;
  myLocation: string;
  noResults: string;
  locating: string;
  tonight: string;
  eyeChance: string;
  camera: (pct: number) => string;
  labels: Record<Label, string>;
  goNow: string;
  scale: string[];
  sentence: {
    noNight: string;
    clouds: string;
    quiet: (need: string) => string;
    cameraOnly: (from: string, to: string) => string;
    window: (from: string, to: string) => string;
    look: (dir: string, elevation: number) => string;
  };
  north: string;
  south: string;
  dataAge: (what: string, age: string) => string;
  aurora: string;
  weather: string;
  unavailable: (what: string) => string;
  why: string;
  whyText: string;
  look: string;
  lookValue: (dir: string, elevation: number) => string;
  kpNeeded: string;
  magLat: string;
  oval: (min: number) => string;
  low: string;
  high: string;
  you: string;
  hourByHour: string;
  sunTimes: (sunset: string, dark: string, sunrise: string) => string;
  polarNight: string;
  legendEye: string;
  legendCamera: string;
  legendCloud: string;
  now: string;
  tt: { eye: string; camera: string; kp: string; clear: string; height: string; sky: string; overhead: string; live: string };
  f: {
    activity: string;
    clouds: string;
    dark: string;
    moon: string;
    strong: string;
    moderate: string;
    weak: string;
    clear: string;
    partly: string;
    overcast: string;
    darkS: string;
    twilightS: string;
    faint: string;
    bright: string;
    auroraSub: string;
    auroraText: (kp: string, dir: string, elevation: number) => string;
    cloudSub: string;
    cloudText: (clear: number, total: number) => string;
    sunSub: string;
    darkText: (from: string, to: string) => string;
    darkAll: string;
    moonSub: string;
    moonText: (times: string) => string;
    moonDown: string;
    weight: string;
    noData: string;
  };
  space: string;
  live: string;
  bz: string;
  speed: string;
  density: string;
  bzSouth: string;
  bzNorth: string;
  fast: string;
  normal: string;
  slow: string;
  dense: string;
  nextNights: string;
  maxKp: string;
  tonightShort: string;
  sources: string;
  disclaimer: string;
  nav: { tonight: string; go: string };
  home: {
    tonightAt: (place: string) => string;
    bestSpots: (limit: string) => string;
  };
  spot: {
    tonightHere: string;
    navigate: string;
    share: string;
    copied: string;
    elevation: string;
    viewNorth: string;
    viewNorthOpen: string;
    viewNorthUnknown: string;
    coordinates: string;
    fromHome: (minutes: number, km: number, home: string) => string;
    about: string;
    notFound: string;
    back: string;
  };
  alerts: {
    tab: string;
    title: string;
    lead: string;
    enable: string;
    threshold: string;
    thresholdOption: (score: number, label: string) => string;
    permissionDenied: string;
    howItWorks: string;
    notifTitle: (score: number, label: string) => string;
    lastSent: (night: string) => string;
    never: string;
    test: string;
    language: string;
  };
  go: {
    title: string;
    lead: string;
    within: (limit: string) => string;
    home: (score: number) => string;
    drive: (minutes: number, km: number) => string;
    window: (from: string, to: string) => string;
    cameraOnly: string;
    northView: string;
    loading: string;
    failed: string;
    noSpots: string;
    homeBest: string;
    travelNote: string;
    attribution: string;
    mapLabel: string;
    betterNearby: string;
  };
  loading: string;
  failed: (what: string) => string;
}

const deg = (e: number) => `${Math.max(1, Math.round(e))}°`;

const en: Strings = {
  changeLocation: 'Change location',
  useMyLocation: 'Use my location',
  searchPlaceholder: 'Search a place…',
  myLocation: 'My location',
  noResults: 'No places found',
  locating: 'Locating…',
  tonight: 'Tonight',
  eyeChance: '% chance to see it',
  camera: (p) => `Phone camera ${p} %`,
  labels: { no: 'No', unlikely: 'Unlikely', maybe: 'Maybe', good: 'Good', great: 'Great' },
  goNow: 'Go now',
  scale: ['No', 'Unlikely', 'Maybe', 'Good', 'Great'],
  sentence: {
    noNight: 'The sun does not set far enough here tonight — no dark sky to see aurora.',
    clouds: 'Clouds cover the sky for most of the night.',
    quiet: (need) => `Too little activity tonight. Here you need about Kp ${need}.`,
    cameraOnly: (a, b) => `Too faint for the eye, but a phone camera may catch it <b>${a} – ${b}</b>.`,
    window: (a, b) => `Best window <b>${a} – ${b}</b>.`,
    look: (dir, e) => (e >= 60 ? 'Look up — it can be right overhead.' : `Look ${dir}, about ${deg(e)} above the horizon.`),
  },
  north: 'north',
  south: 'south',
  dataAge: (w, a) => `${w} ${a} old`,
  aurora: 'Aurora data',
  weather: 'Weather',
  unavailable: (w) => `${w} unavailable`,
  why: 'Why this score?',
  whyText:
    'The score is the chance to see aurora with your own eyes. For every hour we place the auroral oval from the Kp forecast and magnetic local time (Starkov model), measure how far it is from you in <b>magnetic</b> latitude (AACGM), and work out how high above the horizon its lower edge stands and how much light the atmosphere absorbs on the way. That light has to beat a sky brightened by <b>twilight</b> and the <b>Moon</b>, and finally it has to get through the <b>clouds</b> — a cloudy forecast is not a sure no: an all-sky camera in Kilpisjärvi still saw aurora in 42 % of hours forecast as overcast. The uncertainty of the Kp forecast (±1.2) is included. The camera number uses a ten times lower brightness threshold. Checked against five months of camera data in northern Finland; not yet against sightings further south.',
  look: 'Look',
  lookValue: (dir, e) => (e >= 60 ? 'Overhead' : `${cap(dir)}, ${deg(e)} up`),
  kpNeeded: 'Kp needed here',
  magLat: 'Magnetic latitude',
  oval: (m) => `Aurora oval · next ${m} min`,
  low: 'low',
  high: 'high',
  you: 'You',
  hourByHour: 'Tonight, hour by hour',
  sunTimes: (s, d, r) => `Sunset ${s} · Dark from ${d} · Sunrise ${r}`,
  polarNight: 'Polar night — the sun stays below the horizon',
  legendEye: 'Eye',
  legendCamera: 'Phone camera',
  legendCloud: 'Cloud cover (more opaque = cloudier)',
  now: 'now',
  tt: { eye: 'Eye', camera: 'Camera', kp: 'Kp', clear: 'Through clouds', height: 'Aurora height', sky: 'Sky brightness', overhead: 'overhead', live: 'live' },
  f: {
    activity: 'Aurora',
    clouds: 'Clouds',
    dark: 'Darkness',
    moon: 'Moon',
    strong: 'Strong',
    moderate: 'Moderate',
    weak: 'Weak',
    clear: 'Clear',
    partly: 'Partly',
    overcast: 'Overcast',
    darkS: 'Dark',
    twilightS: 'Twilight',
    faint: 'Faint',
    bright: 'Bright',
    auroraSub: 'if the sky is clear',
    auroraText: (kp, dir, e) =>
      e >= 60 ? `At Kp ${kp} the oval reaches over you.` : `At Kp ${kp} its lower edge stands ~${deg(e)} above the ${dir} horizon.`,
    cloudSub: 'chance clouds let it through',
    cloudText: (c, t) => `${c} of ${t} hours tonight are mostly clear.`,
    sunSub: 'sun altitude now',
    darkText: (a, b) => `Fully dark from ${a} to ${b}.`,
    darkAll: 'Dark through the whole night.',
    moonSub: 'illuminated',
    moonText: (x) => `Brightens the sky up to ${x}× tonight.`,
    moonDown: 'Stays below the horizon tonight.',
    weight: 'factor',
    noData: 'No data',
  },
  space: 'Right now in space',
  live: 'Live · 1 min',
  bz: 'Bz (magnetic field)',
  speed: 'Solar wind speed',
  density: 'Density',
  bzSouth: 'Southward — good',
  bzNorth: 'Northward — not helping',
  fast: 'Fast — good',
  normal: 'Normal',
  slow: 'Slow',
  dense: 'Dense — good',
  nextNights: 'Next nights',
  maxKp: 'max Kp',
  tonightShort: 'Tonight',
  sources: 'Data',
  disclaimer: 'A forecast, not a promise — aurora can surprise both ways.',
  nav: { tonight: 'Tonight', go: 'Where to go' },
  home: {
    tonightAt: (place) => `Tonight at ${place}`,
    bestSpots: (limit) => `Best spots within ${limit}`,
  },
  spot: {
    tonightHere: 'Tonight here',
    navigate: 'Navigate',
    share: 'Share link',
    copied: 'Link copied',
    elevation: 'Elevation',
    viewNorth: 'View north',
    viewNorthOpen: 'mapped as open',
    viewNorthUnknown: 'not mapped',
    coordinates: 'Coordinates',
    fromHome: (m, km, home) => `≈ ${m} min · ${km} km from ${home}`,
    about: 'A viewpoint from OpenStreetMap. Check the view north and the road yourself before a night trip; we only know what is mapped.',
    notFound: 'We could not find this viewpoint.',
    back: 'Back to tonight',
  },
  alerts: {
    tab: 'Alerts',
    title: 'Tell me when it is worth going out',
    lead: 'Your phone checks the forecast for your place about every 15 minutes and notifies you once per night.',
    enable: 'Alerts for tonight',
    threshold: 'Notify from',
    thresholdOption: (score, label) => `${score} · ${label}`,
    permissionDenied: 'Notifications are turned off for this app in the system settings.',
    howItWorks: 'Android decides when the check runs (battery, network), so an alert can come a little late.',
    notifTitle: (score, label) => `Aurora tonight: ${score} · ${label}`,
    lastSent: (night) => `Last alert: night of ${night}`,
    never: 'No alert sent yet',
    test: 'Send a test notification',
    language: 'Language',
  },
  go: {
    title: 'Where to go tonight',
    lead: 'Viewpoints within reach, ranked by tonight’s chance to see aurora with the eye.',
    within: (limit) => `Best within ${limit}`,
    home: (score) => `Home: ${score}`,
    drive: (minutes, km) => `≈ ${minutes} min · ${km} km`,
    window: (a, b) => `best ${a} – ${b}`,
    cameraOnly: 'camera only',
    northView: 'view north',
    loading: 'Checking clouds at nearby viewpoints…',
    failed: 'Could not load the cloud forecast for viewpoints.',
    noSpots: 'No viewpoints near this place yet. We cover Rogaland and Trøndelag so far.',
    homeBest: 'Nothing within reach beats staying home tonight.',
    travelNote: 'Travel time is a straight-line estimate; roads around fjords can take longer.',
    attribution: 'Viewpoints © OpenStreetMap contributors (ODbL)',
    mapLabel: 'Map of viewpoints near you, coloured by tonight’s score',
    betterNearby: 'Better nearby',
  },
  loading: 'Loading the sky…',
  failed: (w) => `Couldn't load ${w}. The score assumes the worst for it.`,
};

const cs: Strings = {
  changeLocation: 'Změnit místo',
  useMyLocation: 'Použít moji polohu',
  searchPlaceholder: 'Hledat místo…',
  myLocation: 'Moje poloha',
  noResults: 'Nic nenalezeno',
  locating: 'Zjišťuji polohu…',
  tonight: 'Dnes v noci',
  eyeChance: '% šance ji uvidět',
  camera: (p) => `Fotoaparát mobilu ${p} %`,
  labels: { no: 'Ne', unlikely: 'Spíš ne', maybe: 'Možná', good: 'Dobré', great: 'Výborné' },
  goNow: 'Vyraz hned',
  scale: ['Ne', 'Spíš ne', 'Možná', 'Dobré', 'Výborné'],
  sentence: {
    noNight: 'Slunce tu dnes nezapadne dost hluboko — chybí tmavá obloha.',
    clouds: 'Většinu noci zakryjí oblohu mraky.',
    quiet: (n) => `Dnes je příliš malá aktivita. Tady potřebuješ zhruba Kp ${n}.`,
    cameraOnly: (a, b) => `Pro oko příliš slabá, ale fotoaparát mobilu ji může zachytit <b>${a} – ${b}</b>.`,
    window: (a, b) => `Nejlepší okno <b>${a} – ${b}</b>.`,
    look: (dir, e) => (e >= 60 ? 'Dívej se nahoru — může být přímo nad hlavou.' : `Dívej se na ${dir}, zhruba ${deg(e)} nad obzor.`),
  },
  north: 'sever',
  south: 'jih',
  dataAge: (w, a) => `${w} staré ${a}`,
  aurora: 'Data o záři',
  weather: 'Počasí',
  unavailable: (w) => `${w} nedostupné`,
  why: 'Proč takové skóre?',
  whyText:
    'Skóre je šance, že záři uvidíš vlastníma očima. Pro každou hodinu umístíme ovál podle předpovědi Kp a magnetického místního času (Starkovův model), změříme jeho vzdálenost v <b>magnetické</b> šířce (AACGM) a spočítáme, jak vysoko nad obzorem stojí jeho spodní okraj a kolik světla cestou pohltí atmosféra. To světlo musí přebít oblohu zjasněnou <b>soumrakem</b> a <b>Měsícem</b> a nakonec musí projít <b>mraky</b> — zatažená předpověď neznamená jisté ne: celooblohová kamera v Kilpisjärvi viděla záři i ve 42 % hodin hlášených jako zatažené. Počítá se i s nejistotou předpovědi Kp (±1,2). Číslo pro fotoaparát používá desetkrát nižší práh jasu. Ověřeno na pěti měsících dat z kamery v severním Finsku; jižněji zatím ne.',
  look: 'Kam se dívat',
  lookValue: (dir, e) => (e >= 60 ? 'Nad hlavu' : `${cap(dir)}, ${deg(e)} nad obzor`),
  kpNeeded: 'Potřebné Kp',
  magLat: 'Magnetická šířka',
  oval: (m) => `Ovál záře · dalších ${m} min`,
  low: 'nízká',
  high: 'vysoká',
  you: 'Ty',
  hourByHour: 'Dnešní noc po hodinách',
  sunTimes: (s, d, r) => `Západ ${s} · Tma od ${d} · Východ ${r}`,
  polarNight: 'Polární noc — slunce zůstává pod obzorem',
  legendEye: 'Oko',
  legendCamera: 'Fotoaparát mobilu',
  legendCloud: 'Oblačnost (sytější = víc mraků)',
  now: 'teď',
  tt: { eye: 'Oko', camera: 'Fotoaparát', kp: 'Kp', clear: 'Přes mraky', height: 'Výška záře', sky: 'Jas oblohy', overhead: 'nad hlavou', live: 'živě' },
  f: {
    activity: 'Záře',
    clouds: 'Mraky',
    dark: 'Tma',
    moon: 'Měsíc',
    strong: 'Silná',
    moderate: 'Střední',
    weak: 'Slabá',
    clear: 'Přes mraky',
    partly: 'Polojasno',
    overcast: 'Zataženo',
    darkS: 'Tma',
    twilightS: 'Soumrak',
    faint: 'Slabý',
    bright: 'Jasný',
    auroraSub: 'při jasné obloze',
    auroraText: (kp, dir, e) =>
      e >= 60 ? `Při Kp ${kp} sahá ovál až nad tebe.` : `Při Kp ${kp} je spodní okraj ~${deg(e)} nad obzorem na ${dir === 'sever' ? 'severu' : 'jihu'}.`,
    cloudSub: 'šance, že ji mraky nezakryjí',
    cloudText: (c, t) => `${c} z ${t} hodin dnešní noci je převážně jasno.`,
    sunSub: 'výška slunce teď',
    darkText: (a, b) => `Úplná tma od ${a} do ${b}.`,
    darkAll: 'Tma po celou noc.',
    moonSub: 'osvětlení',
    moonText: (x) => `Dnes zjasní oblohu až ${x}×.`,
    moonDown: 'Dnes zůstane pod obzorem.',
    weight: 'faktor',
    noData: 'Bez dat',
  },
  space: 'Právě teď ve vesmíru',
  live: 'Živě · 1 min',
  bz: 'Bz (magnetické pole)',
  speed: 'Rychlost slunečního větru',
  density: 'Hustota',
  bzSouth: 'Jižní — dobré',
  bzNorth: 'Severní — nepomáhá',
  fast: 'Rychlý — dobré',
  normal: 'Normální',
  slow: 'Pomalý',
  dense: 'Hustý — dobré',
  nextNights: 'Další noci',
  maxKp: 'max. Kp',
  tonightShort: 'Dnes',
  sources: 'Data',
  disclaimer: 'Je to předpověď, ne slib — záře umí překvapit oběma směry.',
  nav: { tonight: 'Dnes v noci', go: 'Kam vyrazit' },
  home: {
    tonightAt: (place) => `Dnes v noci · ${place}`,
    bestSpots: (limit) => `Nejlepší místa do ${limit}`,
  },
  spot: {
    tonightHere: 'Dnes v noci tady',
    navigate: 'Navigovat',
    share: 'Sdílet odkaz',
    copied: 'Odkaz zkopírován',
    elevation: 'Nadmořská výška',
    viewNorth: 'Výhled na sever',
    viewNorthOpen: 'zmapovaný jako otevřený',
    viewNorthUnknown: 'nezmapováno',
    coordinates: 'Souřadnice',
    fromHome: (m, km, home) => `≈ ${m} min · ${km} km od místa ${home}`,
    about: 'Vyhlídka z OpenStreetMap. Výhled na sever a cestu si před noční výpravou ověř sám; víme jen to, co je zmapované.',
    notFound: 'Tuhle vyhlídku jsme nenašli.',
    back: 'Zpět na dnešní noc',
  },
  alerts: {
    tab: 'Upozornění',
    title: 'Dej mi vědět, až se vyplatí vyrazit',
    lead: 'Telefon zhruba každých 15 minut zkontroluje předpověď pro tvé místo a upozorní tě nejvýš jednou za noc.',
    enable: 'Upozornění na dnešní noc',
    threshold: 'Upozornit od',
    thresholdOption: (score, label) => `${score} · ${label}`,
    permissionDenied: 'Oznámení jsou pro tuto aplikaci vypnutá v nastavení systému.',
    howItWorks: 'Kdy kontrola proběhne, řídí Android (baterie, síť), takže upozornění může přijít s malým zpožděním.',
    notifTitle: (score, label) => `Polární záře dnes: ${score} · ${label}`,
    lastSent: (night) => `Poslední upozornění: noc ${night}`,
    never: 'Zatím žádné upozornění',
    test: 'Poslat zkušební oznámení',
    language: 'Jazyk',
  },
  go: {
    title: 'Kam dnes vyrazit',
    lead: 'Vyhlídky v dosahu seřazené podle dnešní šance vidět záři pouhým okem.',
    within: (limit) => `Nejlepší do ${limit}`,
    home: (score) => `Doma: ${score}`,
    drive: (minutes, km) => `≈ ${minutes} min · ${km} km`,
    window: (a, b) => `nejlépe ${a} – ${b}`,
    cameraOnly: 'jen fotoaparát',
    northView: 'výhled na sever',
    loading: 'Zjišťuji oblačnost na vyhlídkách v okolí…',
    failed: 'Předpověď oblačnosti pro vyhlídky se nepodařilo načíst.',
    noSpots: 'U tohoto místa zatím vyhlídky nemáme. Pokrýváme Rogaland a Trøndelag.',
    homeBest: 'Dnes nic v dosahu nepřekoná zůstat doma.',
    travelNote: 'Doba cesty je odhad vzdušnou čarou; silnice kolem fjordů mohou trvat déle.',
    attribution: 'Vyhlídky © přispěvatelé OpenStreetMap (ODbL)',
    mapLabel: 'Mapa vyhlídek v okolí obarvená podle dnešního skóre',
    betterNearby: 'Lepší v okolí',
  },
  loading: 'Načítám oblohu…',
  failed: (w) => `Nepodařilo se načíst: ${w}. Skóre pro ně počítá s nejhorším.`,
};

const no: Strings = {
  changeLocation: 'Bytt sted',
  useMyLocation: 'Bruk min posisjon',
  searchPlaceholder: 'Søk etter sted…',
  myLocation: 'Min posisjon',
  noResults: 'Fant ingen steder',
  locating: 'Finner posisjon…',
  tonight: 'I kveld',
  eyeChance: '% sjanse å se det',
  camera: (p) => `Mobilkamera ${p} %`,
  labels: { no: 'Nei', unlikely: 'Lite sannsynlig', maybe: 'Kanskje', good: 'Bra', great: 'Svært bra' },
  goNow: 'Gå ut nå',
  scale: ['Nei', 'Lite', 'Kanskje', 'Bra', 'Svært bra'],
  sentence: {
    noNight: 'Sola går ikke langt nok ned her i natt — himmelen blir ikke mørk.',
    clouds: 'Skyer dekker himmelen det meste av natten.',
    quiet: (n) => `For lite aktivitet i kveld. Her trenger du omtrent Kp ${n}.`,
    cameraOnly: (a, b) => `For svakt for øyet, men et mobilkamera kan fange det <b>${a} – ${b}</b>.`,
    window: (a, b) => `Beste tidsrom <b>${a} – ${b}</b>.`,
    look: (dir, e) => (e >= 60 ? 'Se opp — det kan være rett over deg.' : `Se mot ${dir}, omtrent ${deg(e)} over horisonten.`),
  },
  north: 'nord',
  south: 'sør',
  dataAge: (w, a) => `${w} ${a} gamle`,
  aurora: 'Nordlysdata',
  weather: 'Værdata',
  unavailable: (w) => `${w} utilgjengelig`,
  why: 'Hvorfor denne poengsummen?',
  whyText:
    'Poengsummen er sjansen for å se nordlys med egne øyne. For hver time plasserer vi nordlysovalen ut fra Kp-prognosen og magnetisk lokaltid (Starkov-modellen), måler avstanden i <b>magnetisk</b> breddegrad (AACGM) og regner ut hvor høyt over horisonten underkanten står og hvor mye lys atmosfæren tar. Lyset må slå en himmel som er lysere på grunn av <b>skumring</b> og <b>måne</b>, og til slutt må det komme gjennom <b>skyene</b> — et skyet varsel er ikke et sikkert nei: et allsky-kamera i Kilpisjärvi så nordlys i 42 % av timene som var varslet overskyet. Usikkerheten i Kp-prognosen (±1,2) er tatt med. Kameratallet bruker en ti ganger lavere lysterskel. Sjekket mot fem måneder med kameradata i Nord-Finland; ennå ikke lenger sør.',
  look: 'Se mot',
  lookValue: (dir, e) => (e >= 60 ? 'Rett opp' : `${cap(dir)}, ${deg(e)} opp`),
  kpNeeded: 'Kp som trengs her',
  magLat: 'Magnetisk breddegrad',
  oval: (m) => `Nordlysovalen · neste ${m} min`,
  low: 'lav',
  high: 'høy',
  you: 'Du',
  hourByHour: 'I natt, time for time',
  sunTimes: (s, d, r) => `Solnedgang ${s} · Mørkt fra ${d} · Soloppgang ${r}`,
  polarNight: 'Mørketid — sola blir under horisonten',
  legendEye: 'Øyet',
  legendCamera: 'Mobilkamera',
  legendCloud: 'Skydekke (tettere = mer skyet)',
  now: 'nå',
  tt: { eye: 'Øyet', camera: 'Kamera', kp: 'Kp', clear: 'Gjennom skyer', height: 'Nordlysets høyde', sky: 'Himmelens lysstyrke', overhead: 'rett over', live: 'direkte' },
  f: {
    activity: 'Nordlys',
    clouds: 'Skyer',
    dark: 'Mørke',
    moon: 'Måne',
    strong: 'Sterk',
    moderate: 'Moderat',
    weak: 'Svak',
    clear: 'Klart',
    partly: 'Delvis',
    overcast: 'Overskyet',
    darkS: 'Mørkt',
    twilightS: 'Skumring',
    faint: 'Svak',
    bright: 'Lys',
    auroraSub: 'ved klar himmel',
    auroraText: (kp, dir, e) =>
      e >= 60 ? `Ved Kp ${kp} når ovalen over deg.` : `Ved Kp ${kp} står underkanten ~${deg(e)} over horisonten i ${dir}.`,
    cloudSub: 'sjanse for at skyene slipper det gjennom',
    cloudText: (c, t) => `${c} av ${t} timer i natt er stort sett klare.`,
    sunSub: 'solhøyde nå',
    darkText: (a, b) => `Helt mørkt fra ${a} til ${b}.`,
    darkAll: 'Mørkt hele natten.',
    moonSub: 'opplyst',
    moonText: (x) => `Gjør himmelen opptil ${x}× lysere i natt.`,
    moonDown: 'Holder seg under horisonten i natt.',
    weight: 'faktor',
    noData: 'Ingen data',
  },
  space: 'Akkurat nå i rommet',
  live: 'Direkte · 1 min',
  bz: 'Bz (magnetfelt)',
  speed: 'Solvindhastighet',
  density: 'Tetthet',
  bzSouth: 'Sørgående — bra',
  bzNorth: 'Nordgående — hjelper ikke',
  fast: 'Rask — bra',
  normal: 'Normal',
  slow: 'Langsom',
  dense: 'Tett — bra',
  nextNights: 'Neste netter',
  maxKp: 'maks Kp',
  tonightShort: 'I natt',
  sources: 'Data',
  disclaimer: 'En prognose, ikke et løfte — nordlyset kan overraske begge veier.',
  nav: { tonight: 'I natt', go: 'Hvor dra' },
  home: {
    tonightAt: (place) => `I natt · ${place}`,
    bestSpots: (limit) => `Beste steder innen ${limit}`,
  },
  spot: {
    tonightHere: 'I natt her',
    navigate: 'Naviger',
    share: 'Del lenke',
    copied: 'Lenke kopiert',
    elevation: 'Høyde',
    viewNorth: 'Utsikt mot nord',
    viewNorthOpen: 'kartlagt som åpen',
    viewNorthUnknown: 'ikke kartlagt',
    coordinates: 'Koordinater',
    fromHome: (m, km, home) => `≈ ${m} min · ${km} km fra ${home}`,
    about: 'Et utsiktspunkt fra OpenStreetMap. Sjekk utsikten mot nord og veien selv før en nattetur; vi vet bare det som er kartlagt.',
    notFound: 'Fant ikke dette utsiktspunktet.',
    back: 'Tilbake til i natt',
  },
  alerts: {
    tab: 'Varsler',
    title: 'Si fra når det er verdt å gå ut',
    lead: 'Telefonen sjekker prognosen for stedet ditt omtrent hvert 15. minutt og varsler deg høyst én gang per natt.',
    enable: 'Varsel for i natt',
    threshold: 'Varsle fra',
    thresholdOption: (score, label) => `${score} · ${label}`,
    permissionDenied: 'Varsler er slått av for denne appen i systeminnstillingene.',
    howItWorks: 'Android bestemmer når sjekken kjøres (batteri, nett), så et varsel kan komme litt sent.',
    notifTitle: (score, label) => `Nordlys i natt: ${score} · ${label}`,
    lastSent: (night) => `Siste varsel: natten ${night}`,
    never: 'Ingen varsel sendt ennå',
    test: 'Send et testvarsel',
    language: 'Språk',
  },
  go: {
    title: 'Hvor du bør dra i natt',
    lead: 'Utsiktspunkter innen rekkevidde, rangert etter sjansen for å se nordlys med øyet i natt.',
    within: (limit) => `Best innen ${limit}`,
    home: (score) => `Hjemme: ${score}`,
    drive: (minutes, km) => `≈ ${minutes} min · ${km} km`,
    window: (a, b) => `best ${a} – ${b}`,
    cameraOnly: 'bare kamera',
    northView: 'utsikt mot nord',
    loading: 'Sjekker skyene ved utsiktspunkter i nærheten…',
    failed: 'Klarte ikke å hente skyvarselet for utsiktspunktene.',
    noSpots: 'Ingen utsiktspunkter her ennå. Foreløpig dekker vi Rogaland og Trøndelag.',
    homeBest: 'Ingenting innen rekkevidde slår å bli hjemme i natt.',
    travelNote: 'Reisetiden er anslått i luftlinje; veier rundt fjorder kan ta lengre tid.',
    attribution: 'Utsiktspunkter © OpenStreetMap-bidragsytere (ODbL)',
    mapLabel: 'Kart over utsiktspunkter i nærheten, farget etter nattens poengsum',
    betterNearby: 'Bedre i nærheten',
  },
  loading: 'Laster himmelen…',
  failed: (w) => `Klarte ikke å laste ${w}. Poengsummen antar det verste.`,
};

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const STRINGS: Record<Lang, Strings> = { en, cs, no };

/** Pick our language from a BCP 47 tag (navigator.language on the web, the OS locale on mobile). */
export function langFromLocale(tag: string): Lang {
  const nav = tag.toLowerCase();
  if (nav.startsWith('cs') || nav.startsWith('sk')) return 'cs';
  if (nav.startsWith('nb') || nav.startsWith('nn') || nav.startsWith('no')) return 'no';
  return 'en';
}
