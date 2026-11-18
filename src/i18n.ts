import type { Label } from './model/score';

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
    'The score is the chance to see aurora with your own eyes. For every hour we place the auroral oval from the Kp forecast and magnetic local time (Starkov model), measure how far it is from you in <b>magnetic</b> latitude (AACGM), and work out how high above the horizon its lower edge stands and how much light the atmosphere absorbs on the way. That light has to beat a sky brightened by <b>twilight</b> and the <b>Moon</b>, and finally the sky must be <b>clear</b>. The uncertainty of the Kp forecast (±1.2) is included. The camera number uses a ten times lower brightness threshold. Not yet calibrated against observations — treat it as a score.',
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
  tt: { eye: 'Eye', camera: 'Camera', kp: 'Kp', clear: 'Clear sky', height: 'Aurora height', sky: 'Sky brightness', overhead: 'overhead', live: 'live' },
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
    cloudSub: 'clear sky',
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
    'Skóre je šance, že záři uvidíš vlastníma očima. Pro každou hodinu umístíme ovál podle předpovědi Kp a magnetického místního času (Starkovův model), změříme jeho vzdálenost v <b>magnetické</b> šířce (AACGM) a spočítáme, jak vysoko nad obzorem stojí jeho spodní okraj a kolik světla cestou pohltí atmosféra. To světlo musí přebít oblohu zjasněnou <b>soumrakem</b> a <b>Měsícem</b> a nakonec musí být <b>jasno</b>. Počítá se i s nejistotou předpovědi Kp (±1,2). Číslo pro fotoaparát používá desetkrát nižší práh jasu. Zatím není ověřené na pozorováních — ber ho jako skóre.',
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
  tt: { eye: 'Oko', camera: 'Fotoaparát', kp: 'Kp', clear: 'Jasno', height: 'Výška záře', sky: 'Jas oblohy', overhead: 'nad hlavou', live: 'živě' },
  f: {
    activity: 'Záře',
    clouds: 'Mraky',
    dark: 'Tma',
    moon: 'Měsíc',
    strong: 'Silná',
    moderate: 'Střední',
    weak: 'Slabá',
    clear: 'Jasno',
    partly: 'Polojasno',
    overcast: 'Zataženo',
    darkS: 'Tma',
    twilightS: 'Soumrak',
    faint: 'Slabý',
    bright: 'Jasný',
    auroraSub: 'při jasné obloze',
    auroraText: (kp, dir, e) =>
      e >= 60 ? `Při Kp ${kp} sahá ovál až nad tebe.` : `Při Kp ${kp} je spodní okraj ~${deg(e)} nad obzorem na ${dir === 'sever' ? 'severu' : 'jihu'}.`,
    cloudSub: 'jasná obloha',
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
    'Poengsummen er sjansen for å se nordlys med egne øyne. For hver time plasserer vi nordlysovalen ut fra Kp-prognosen og magnetisk lokaltid (Starkov-modellen), måler avstanden i <b>magnetisk</b> breddegrad (AACGM) og regner ut hvor høyt over horisonten underkanten står og hvor mye lys atmosfæren tar. Lyset må slå en himmel som er lysere på grunn av <b>skumring</b> og <b>måne</b>, og til slutt må det være <b>klart</b>. Usikkerheten i Kp-prognosen (±1,2) er tatt med. Kameratallet bruker en ti ganger lavere lysterskel. Ennå ikke kalibrert mot observasjoner — se det som en poengsum.',
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
  tt: { eye: 'Øyet', camera: 'Kamera', kp: 'Kp', clear: 'Klar himmel', height: 'Nordlysets høyde', sky: 'Himmelens lysstyrke', overhead: 'rett over', live: 'direkte' },
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
    cloudSub: 'klar himmel',
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
  loading: 'Laster himmelen…',
  failed: (w) => `Klarte ikke å laste ${w}. Poengsummen antar det verste.`,
};

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const STRINGS: Record<Lang, Strings> = { en, cs, no };

export function detectLang(): Lang {
  const nav = navigator.language.toLowerCase();
  if (nav.startsWith('cs') || nav.startsWith('sk')) return 'cs';
  if (nav.startsWith('nb') || nav.startsWith('nn') || nav.startsWith('no')) return 'no';
  return 'en';
}
