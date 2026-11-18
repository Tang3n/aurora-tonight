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
  outOf100: string;
  labels: Record<Label, string>;
  goNow: string;
  scale: string[];
  sentence: {
    noNight: string;
    clouds: string;
    quiet: (need: string) => string;
    window: (from: string, to: string) => string;
    look: (dir: string, high: boolean) => string;
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
  lookValue: (dir: string, high: boolean) => string;
  kpNeeded: string;
  magLat: string;
  oval: (min: number) => string;
  low: string;
  high: string;
  you: string;
  hourByHour: string;
  sunTimes: (sunset: string, dark: string, sunrise: string) => string;
  polarNight: string;
  legendChance: string;
  legendCloud: string;
  now: string;
  tt: { aurora: string; clouds: string; dark: string; moon: string; full: string; twilight: string; up: string; down: string };
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
    peakAt: (t: string) => string;
    kpText: (need: string, above: boolean) => string;
    cloudSub: string;
    cloudText: (clear: number, total: number) => string;
    sunSub: string;
    darkText: (from: string, to: string) => string;
    darkAll: string;
    moonSub: string;
    moonUp: (pct: number) => string;
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

const en: Strings = {
  changeLocation: 'Change location',
  useMyLocation: 'Use my location',
  searchPlaceholder: 'Search a place…',
  myLocation: 'My location',
  noResults: 'No places found',
  locating: 'Locating…',
  tonight: 'Tonight',
  outOf100: 'out of 100',
  labels: { no: 'No', unlikely: 'Unlikely', maybe: 'Maybe', good: 'Good', great: 'Great' },
  goNow: 'Go now',
  scale: ['No', 'Unlikely', 'Maybe', 'Good', 'Great'],
  sentence: {
    noNight: 'The sun does not set far enough here tonight — no dark sky to see aurora.',
    clouds: 'Clouds cover the sky for most of the night.',
    quiet: (need) => `Too little activity tonight. You need about Kp ${need} here.`,
    window: (a, b) => `Best window <b>${a} – ${b}</b>.`,
    look: (dir, high) => (high ? `Look ${dir} and up — it may reach high in the sky.` : `Look ${dir}, low over the horizon.`),
  },
  north: 'north',
  south: 'south',
  dataAge: (w, a) => `${w} ${a} old`,
  aurora: 'Aurora data',
  weather: 'Weather',
  unavailable: (w) => `${w} unavailable`,
  why: 'Why this score?',
  whyText:
    'Each hour gets four factors between 0 and 1 — <b>activity</b> (forecast Kp vs. what your latitude needs, plus the live OVATION model and solar wind for the current hour), <b>sky</b> (cloud layers; low cloud blocks most), <b>darkness</b> (sun below −6° to −15°) and <b>moon</b> (bright and high costs up to 30 %). They are multiplied, so a single blocker means no aurora.',
  look: 'Look',
  lookValue: (dir, high) => (high ? `${cap(dir)}, high` : `${cap(dir)}, low`),
  kpNeeded: 'Kp needed here',
  magLat: 'Magnetic latitude',
  oval: (m) => `Aurora oval · next ${m} min`,
  low: 'low',
  high: 'high',
  you: 'You',
  hourByHour: 'Tonight, hour by hour',
  sunTimes: (s, d, r) => `Sunset ${s} · Dark from ${d} · Sunrise ${r}`,
  polarNight: 'Polar night — the sun stays below the horizon',
  legendChance: 'Chance to see aurora',
  legendCloud: 'Cloud cover (more opaque = cloudier)',
  now: 'now',
  tt: { aurora: 'Aurora (Kp)', clouds: 'Clouds', dark: 'Darkness', moon: 'Moon', full: 'full', twilight: 'twilight', up: 'up', down: 'set' },
  f: {
    activity: 'Aurora activity',
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
    peakAt: (t) => `peak ${t}`,
    kpText: (n, above) => `You need about Kp ${n} here. Tonight's peak is ${above ? 'above' : 'below'} that.`,
    cloudSub: 'cloud cover',
    cloudText: (c, t) => `${c} of ${t} hours tonight are mostly clear.`,
    sunSub: 'sun altitude now',
    darkText: (a, b) => `Fully dark from ${a} to ${b}.`,
    darkAll: 'Dark through the whole night.',
    moonSub: 'illuminated',
    moonUp: (p) => `The moon is up for ${p} % of the night.`,
    moonDown: 'The moon stays below the horizon tonight.',
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
  outOf100: 'ze 100',
  labels: { no: 'Ne', unlikely: 'Spíš ne', maybe: 'Možná', good: 'Dobré', great: 'Výborné' },
  goNow: 'Vyraz hned',
  scale: ['Ne', 'Spíš ne', 'Možná', 'Dobré', 'Výborné'],
  sentence: {
    noNight: 'Slunce tu dnes nezapadne dost hluboko — chybí tmavá obloha.',
    clouds: 'Většinu noci zakryjí oblohu mraky.',
    quiet: (n) => `Dnes je příliš malá aktivita. Tady potřebuješ zhruba Kp ${n}.`,
    window: (a, b) => `Nejlepší okno <b>${a} – ${b}</b>.`,
    look: (dir, high) => (high ? `Dívej se na ${dir} a výš — může vystoupat vysoko.` : `Dívej se na ${dir}, nízko nad obzor.`),
  },
  north: 'sever',
  south: 'jih',
  dataAge: (w, a) => `${w} staré ${a}`,
  aurora: 'Data o záři',
  weather: 'Počasí',
  unavailable: (w) => `${w} nedostupné`,
  why: 'Proč takové skóre?',
  whyText:
    'Každá hodina dostane čtyři faktory od 0 do 1 — <b>aktivitu</b> (předpověď Kp proti tomu, co potřebuje tvoje šířka, a pro aktuální hodinu i živý model OVATION a sluneční vítr), <b>oblohu</b> (vrstvy mraků; nízké blokují nejvíc), <b>tmu</b> (slunce pod −6° až −15°) a <b>Měsíc</b> (jasný a vysoko ubere až 30 %). Násobí se, takže jediná překážka znamená žádnou záři.',
  look: 'Kam se dívat',
  lookValue: (dir, high) => (high ? `${cap(dir)}, vysoko` : `${cap(dir)}, nízko`),
  kpNeeded: 'Potřebné Kp',
  magLat: 'Magnetická šířka',
  oval: (m) => `Ovál záře · dalších ${m} min`,
  low: 'nízká',
  high: 'vysoká',
  you: 'Ty',
  hourByHour: 'Dnešní noc po hodinách',
  sunTimes: (s, d, r) => `Západ ${s} · Tma od ${d} · Východ ${r}`,
  polarNight: 'Polární noc — slunce zůstává pod obzorem',
  legendChance: 'Šance vidět záři',
  legendCloud: 'Oblačnost (sytější = víc mraků)',
  now: 'teď',
  tt: { aurora: 'Záře (Kp)', clouds: 'Mraky', dark: 'Tma', moon: 'Měsíc', full: 'úplná', twilight: 'soumrak', up: 'nad obzorem', down: 'zapadlý' },
  f: {
    activity: 'Aktivita záře',
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
    peakAt: (t) => `vrchol ${t}`,
    kpText: (n, above) => `Tady potřebuješ zhruba Kp ${n}. Dnešní vrchol je ${above ? 'nad' : 'pod'} touto hranicí.`,
    cloudSub: 'oblačnost',
    cloudText: (c, t) => `${c} z ${t} hodin dnešní noci je převážně jasno.`,
    sunSub: 'výška slunce teď',
    darkText: (a, b) => `Úplná tma od ${a} do ${b}.`,
    darkAll: 'Tma po celou noc.',
    moonSub: 'osvětlení',
    moonUp: (p) => `Měsíc je nad obzorem ${p} % noci.`,
    moonDown: 'Měsíc dnes zůstane pod obzorem.',
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
  outOf100: 'av 100',
  labels: { no: 'Nei', unlikely: 'Lite sannsynlig', maybe: 'Kanskje', good: 'Bra', great: 'Svært bra' },
  goNow: 'Gå ut nå',
  scale: ['Nei', 'Lite', 'Kanskje', 'Bra', 'Svært bra'],
  sentence: {
    noNight: 'Sola går ikke langt nok ned her i natt — himmelen blir ikke mørk.',
    clouds: 'Skyer dekker himmelen det meste av natten.',
    quiet: (n) => `For lite aktivitet i kveld. Du trenger omtrent Kp ${n} her.`,
    window: (a, b) => `Beste tidsrom <b>${a} – ${b}</b>.`,
    look: (dir, high) => (high ? `Se mot ${dir} og opp — det kan nå høyt på himmelen.` : `Se mot ${dir}, lavt over horisonten.`),
  },
  north: 'nord',
  south: 'sør',
  dataAge: (w, a) => `${w} ${a} gamle`,
  aurora: 'Nordlysdata',
  weather: 'Værdata',
  unavailable: (w) => `${w} utilgjengelig`,
  why: 'Hvorfor denne poengsummen?',
  whyText:
    'Hver time får fire faktorer mellom 0 og 1 — <b>aktivitet</b> (Kp-prognose mot det breddegraden din trenger, pluss OVATION-modellen og solvinden for inneværende time), <b>himmel</b> (skylag; lave skyer blokkerer mest), <b>mørke</b> (sola under −6° til −15°) og <b>måne</b> (lys og høy koster opptil 30 %). De ganges sammen, så én hindring betyr ikke nordlys.',
  look: 'Se mot',
  lookValue: (dir, high) => (high ? `${cap(dir)}, høyt` : `${cap(dir)}, lavt`),
  kpNeeded: 'Kp som trengs her',
  magLat: 'Magnetisk breddegrad',
  oval: (m) => `Nordlysovalen · neste ${m} min`,
  low: 'lav',
  high: 'høy',
  you: 'Du',
  hourByHour: 'I natt, time for time',
  sunTimes: (s, d, r) => `Solnedgang ${s} · Mørkt fra ${d} · Soloppgang ${r}`,
  polarNight: 'Mørketid — sola blir under horisonten',
  legendChance: 'Sjanse for nordlys',
  legendCloud: 'Skydekke (tettere = mer skyet)',
  now: 'nå',
  tt: { aurora: 'Nordlys (Kp)', clouds: 'Skyer', dark: 'Mørke', moon: 'Måne', full: 'helt', twilight: 'skumring', up: 'oppe', down: 'nede' },
  f: {
    activity: 'Nordlysaktivitet',
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
    peakAt: (t) => `topp ${t}`,
    kpText: (n, above) => `Du trenger omtrent Kp ${n} her. Kveldens topp er ${above ? 'over' : 'under'} det.`,
    cloudSub: 'skydekke',
    cloudText: (c, t) => `${c} av ${t} timer i natt er stort sett klare.`,
    sunSub: 'solhøyde nå',
    darkText: (a, b) => `Helt mørkt fra ${a} til ${b}.`,
    darkAll: 'Mørkt hele natten.',
    moonSub: 'opplyst',
    moonUp: (p) => `Månen er oppe ${p} % av natten.`,
    moonDown: 'Månen holder seg under horisonten i natt.',
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
