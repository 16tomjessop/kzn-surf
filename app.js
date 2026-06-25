/* =========================================================================
   KZN Surf — South Coast & Durban surf forecast
   No backend. Pulls free Open-Meteo marine + wind data and scores each break
   with an orientation-based rating engine you can tune by hand below.
   ========================================================================= */

/* -------------------------------------------------------------------------
   BREAK PROFILES
   `facing`  = compass bearing the beach looks out to sea (deg). Waves arriving
               from this bearing hit straight on. Offshore wind = facing+180.
   `minH/idealH/maxH` = swell height (m) thresholds: below min = too small,
               around ideal = sweet spot, above max = maxed-out/closing out.
   Edit these as you learn each spot — that's the whole point.
   ------------------------------------------------------------------------- */
const BASE_BREAKS = [
  { id: 'addington', name: 'Addington', region: 'Kwa-Zulu Natal', zone: 'Town', oceanEye: 'addington', camStatus: 'Online',
    lat: -29.8680, lon: 31.0450, facing: 95, minH: 0.5, idealH: 1.4, maxH: 2.8,
    note: 'Ocean Eye spot. Durban beachfront beach break; tune this profile after a few local checks.' },
  { id: 'batterybeach', name: 'Battery Beach', region: 'Kwa-Zulu Natal', zone: 'Town', oceanEye: 'battery-beach', camStatus: 'Online',
    lat: -29.8435, lon: 31.0425, facing: 100, minH: 0.6, idealH: 1.5, maxH: 3.0,
    note: 'Ocean Eye spot. Durban beachfront beach break; same wind pattern as the central beaches.' },
  { id: 'bayofplenty', name: 'Bay of Plenty', region: 'Kwa-Zulu Natal', zone: 'Town', oceanEye: 'bay-of-plenty', camStatus: 'Online',
    lat: -29.8490, lon: 31.0460, facing: 100, minH: 0.6, idealH: 1.6, maxH: 3.2,
    note: 'Ocean Eye spot. Holds a touch more size than North Beach. Likes clean W/NW wind.' },
  { id: 'bikebean', name: 'Bike & Bean', region: 'Kwa-Zulu Natal', zone: 'Town', oceanEye: 'bike-bean', camStatus: 'Online',
    lat: -29.8368, lon: 31.0397, facing: 100, minH: 0.5, idealH: 1.4, maxH: 2.8,
    note: 'Ocean Eye spot. Beachfront banks near the promenade; adjust facing if the cam shows a different bank angle.' },
  { id: 'goldenmile', name: 'Golden Mile', region: 'Kwa-Zulu Natal', zone: 'Town', oceanEye: 'golden-mile', camStatus: 'Online',
    lat: -29.8580, lon: 31.0445, facing: 98, minH: 0.5, idealH: 1.5, maxH: 3.0,
    note: 'Ocean Eye spot. Central Durban beach break with variable sandbanks.' },
  { id: 'newpier', name: 'New Pier', region: 'Kwa-Zulu Natal', zone: 'Town', oceanEye: 'new-pier', camStatus: 'Online',
    lat: -29.8605, lon: 31.0450, facing: 100, minH: 0.6, idealH: 1.7, maxH: 3.4,
    note: 'Ocean Eye spot. Pier-influenced beach break; tune banks as the sand changes.' },
  { id: 'northbeach', name: 'North Beach', region: 'Kwa-Zulu Natal', zone: 'Town', oceanEye: 'north-beach', camStatus: 'Online',
    lat: -29.8535, lon: 31.0440, facing: 100, minH: 0.6, idealH: 1.6, maxH: 3.2,
    note: 'Ocean Eye spot. Beachie. Best on a clean E/ESE swell with light W/NW. NE blows it out.' },
  { id: 'pyc', name: 'PYC', region: 'Kwa-Zulu Natal', zone: 'Town', oceanEye: 'pyc', camStatus: 'Online',
    lat: -29.8700, lon: 31.0465, facing: 95, minH: 0.5, idealH: 1.4, maxH: 2.8,
    note: 'Ocean Eye spot. Durban harbour-side beachfront sandbank; use the cam to tune the takeoff angle.' },
  { id: 'ushaka', name: 'Ushaka', region: 'Kwa-Zulu Natal', zone: 'Town', oceanEye: 'ushaka', camStatus: 'Online',
    lat: -29.8688, lon: 31.0492, facing: 95, minH: 0.5, idealH: 1.4, maxH: 2.8,
    note: 'Ocean Eye spot. Sheltered Durban beach break near the harbour entrance.' },
  { id: 'bogbay', name: 'Bog Bay', region: 'Kwa-Zulu Natal', zone: 'North Coast', oceanEye: 'bog-bay', camStatus: 'Online',
    lat: -29.1555, lon: 31.2345, facing: 115, minH: 0.7, idealH: 1.7, maxH: 3.2,
    note: 'Ocean Eye spot. North Coast beach/reef stretch; more exposed to E/SE swell.' },
  { id: 'lamercysouth', name: 'La Mercy South', region: 'Kwa-Zulu Natal', zone: 'North Coast', oceanEye: 'la-mercy-south', camStatus: 'Online',
    lat: -29.6415, lon: 31.1310, facing: 112, minH: 0.6, idealH: 1.6, maxH: 3.1,
    note: 'Ocean Eye spot. Exposed North Coast beach break; W/NW keeps it cleaner.' },
  { id: 'saltrock', name: 'Salt Rock', region: 'Kwa-Zulu Natal', zone: 'North Coast', oceanEye: 'salt-rock', camStatus: 'Online',
    lat: -29.5045, lon: 31.2340, facing: 115, minH: 0.7, idealH: 1.8, maxH: 3.5,
    note: 'Ocean Eye spot. North Coast beach/point setup with a bit more punch on longer-period swell.' },
  { id: 'sodwanabay', name: 'Sodwana Bay', region: 'Kwa-Zulu Natal', zone: 'North Coast', oceanEye: 'sodwana-bay', camStatus: 'Online',
    lat: -27.5420, lon: 32.6770, facing: 105, minH: 0.6, idealH: 1.6, maxH: 3.2,
    note: 'Ocean Eye spot. Far north KZN beach; exposed to Indian Ocean swell and wind.' },
  { id: 'surfersbay', name: 'Surfers Bay', region: 'Kwa-Zulu Natal', zone: 'North Coast', oceanEye: 'surfers-bay', camStatus: 'Online',
    lat: -29.5275, lon: 31.2250, facing: 115, minH: 0.6, idealH: 1.7, maxH: 3.2,
    note: 'Ocean Eye spot. North Coast beach setup; tune once you compare with the cam.' },
  { id: 'tinleybay', name: 'Tinley Bay', region: 'Kwa-Zulu Natal', zone: 'North Coast', oceanEye: 'tinley-bay', camStatus: 'Repair Scheduled',
    lat: -29.4510, lon: 31.2960, facing: 115, minH: 0.6, idealH: 1.7, maxH: 3.3,
    note: 'Ocean Eye spot. Marked repair scheduled on the Ocean Eye list when imported.' },
  { id: 'tinleyhighrocks', name: 'Tinley High Rocks', region: 'Kwa-Zulu Natal', zone: 'North Coast', oceanEye: 'tinley-high-rocks', camStatus: 'Repair Scheduled',
    lat: -29.4480, lon: 31.3000, facing: 115, minH: 0.7, idealH: 1.8, maxH: 3.4,
    note: 'Ocean Eye spot. Rockier Tinley section; marked repair scheduled on the Ocean Eye list when imported.' },
  { id: 'umdlotinorth', name: 'Umdloti North', region: 'Kwa-Zulu Natal', zone: 'North Coast', oceanEye: 'umdloti-north', camStatus: 'Online',
    lat: -29.6650, lon: 31.1215, facing: 112, minH: 0.6, idealH: 1.6, maxH: 3.1,
    note: 'Ocean Eye spot. Also appears as Umdloti Shop in some Ocean Eye navigation.' },
  { id: 'umdlotisouth', name: 'Umdloti South', region: 'Kwa-Zulu Natal', zone: 'North Coast', oceanEye: 'umdloti-south', camStatus: 'Online',
    lat: -29.6715, lon: 31.1200, facing: 112, minH: 0.6, idealH: 1.6, maxH: 3.1,
    note: 'Ocean Eye spot. Umdloti beach break; check banks after storms.' },
  { id: 'umhlangalaunch', name: 'Umhlanga Launch', region: 'Kwa-Zulu Natal', zone: 'North Coast', oceanEye: 'umhlanga-launch', camStatus: 'Online',
    lat: -29.7288, lon: 31.0885, facing: 110, minH: 0.6, idealH: 1.5, maxH: 3.0,
    note: 'Ocean Eye spot. North of Durban, picks up ESE swell with W/NW wind.' },
  { id: 'umhlanga', name: 'Umhlanga Main', region: 'Kwa-Zulu Natal', zone: 'North Coast', oceanEye: 'umhlanga-main', camStatus: 'Online',
    lat: -29.7280, lon: 31.0880, facing: 110, minH: 0.6, idealH: 1.5, maxH: 3.0,
    note: 'Ocean Eye spot. Picks up ESE swell. Sheltered from a bit of S wind by the point.' },
  { id: 'margate', name: 'Margate', region: 'Kwa-Zulu Natal', zone: 'South Coast', oceanEye: 'margate', camStatus: 'Online',
    lat: -30.8640, lon: 30.3700, facing: 125, minH: 0.7, idealH: 1.8, maxH: 3.4,
    note: 'Ocean Eye spot. South Coast beach break; W/NW is the cleaner wind.' },
  { id: 'salmonbay', name: 'Salmon Bay', region: 'Kwa-Zulu Natal', zone: 'South Coast', oceanEye: 'salmon-bay', camStatus: 'Online',
    lat: -29.5365, lon: 31.2160, facing: 115, minH: 0.6, idealH: 1.7, maxH: 3.2,
    note: 'Ocean Eye spot. Ballito-side beach setup; tune with local observation.' },
  { id: 'sanlameer', name: 'San Lameer', region: 'Kwa-Zulu Natal', zone: 'South Coast', oceanEye: 'san-lameer', camStatus: 'Online',
    lat: -30.9425, lon: 30.2920, facing: 125, minH: 0.7, idealH: 1.8, maxH: 3.4,
    note: 'Ocean Eye spot. Lower South Coast beach/reef mix.' },
  { id: 'scottburgh', name: 'Scottburgh', region: 'Kwa-Zulu Natal', zone: 'South Coast', oceanEye: 'scottburgh', camStatus: 'Online',
    lat: -30.2870, lon: 30.7560, facing: 130, minH: 0.7, idealH: 1.8, maxH: 3.5,
    note: 'Ocean Eye spot. Beach + rivermouth banks. SE groundswell, NW/W offshore.' },
  { id: 'ndesinganepoint', name: 'Ndesingane Point', region: 'Kwa-Zulu Natal', zone: 'South Coast',
    lat: -30.43333, lon: 30.65000, facing: 130, minH: 0.7, idealH: 1.8, maxH: 3.5,
    note: 'Forecast-only South Coast point near Bazley Beach; sometimes spelled Ndasingane. Tune against local checks.' },
  { id: 'southbroom', name: 'Southbroom', region: 'Kwa-Zulu Natal', zone: 'South Coast', oceanEye: 'southbroom', camStatus: 'Online',
    lat: -30.9200, lon: 30.3230, facing: 125, minH: 0.7, idealH: 1.8, maxH: 3.4,
    note: 'Ocean Eye spot. Lower South Coast setup; more exposed to SE swell.' },
  { id: 'tiffanys', name: 'Tiffanys', region: 'Kwa-Zulu Natal', zone: 'South Coast', oceanEye: 'tiffanys', camStatus: 'Online',
    lat: -30.8310, lon: 30.3930, facing: 125, minH: 0.7, idealH: 1.8, maxH: 3.4,
    note: 'Ocean Eye spot. South Coast beach setup; use bank drawing for local peaks.' },
  { id: 'umkomaas', name: 'Umkomaas', region: 'Kwa-Zulu Natal', zone: 'South Coast', oceanEye: 'umkomaas', camStatus: 'Online',
    lat: -30.2065, lon: 30.8000, facing: 128, minH: 0.7, idealH: 1.8, maxH: 3.5,
    note: 'Ocean Eye spot. South of Durban, SE swell and W/NW wind are the useful pattern.' },
  { id: 'gonubie', name: 'Gonubie', region: 'Eastern Cape', zone: 'Eastern Cape', oceanEye: 'gonubie', camStatus: 'Online',
    lat: -32.9390, lon: 28.0210, facing: 145, minH: 0.8, idealH: 2.0, maxH: 4.0,
    note: 'Ocean Eye spot. Eastern Cape point/beach area; longer-period S/SE swell usually has more energy.' },
  { id: 'jeffreysbay', name: 'Jeffreys Bay', region: 'Garden Route', zone: 'Garden Route & Eastern Cape', oceanEye: 'jeffreys-bay', camStatus: 'Online',
    lat: -34.0330, lon: 24.9250, facing: 150, minH: 0.8, idealH: 2.2, maxH: 4.5,
    note: 'Ocean Eye spot. Point setup; south/southwest swell with clean offshore wind is the classic pattern.' },
  { id: 'plettenbergbay', name: 'Plettenberg Bay', region: 'Garden Route', zone: 'Garden Route & Eastern Cape', oceanEye: 'plettenberg-bay', camStatus: 'Online',
    lat: -34.0570, lon: 23.3790, facing: 155, minH: 0.6, idealH: 1.6, maxH: 3.2,
    note: 'Ocean Eye spot. Bay beach setup; tune bank angle against the cam.' },
  { id: 'robbergbeach', name: 'Robberg Beach', region: 'Garden Route', zone: 'Garden Route & Eastern Cape', oceanEye: 'robberg-beach', camStatus: 'Online',
    lat: -34.0825, lon: 23.3735, facing: 165, minH: 0.7, idealH: 1.8, maxH: 3.4,
    note: 'Ocean Eye spot. Exposed Garden Route beach break.' },
  { id: 'stilbaai', name: 'Stilbaai', region: 'Garden Route', zone: 'Garden Route & Eastern Cape', oceanEye: 'stilbaai', camStatus: 'Online',
    lat: -34.3740, lon: 21.4210, facing: 175, minH: 0.7, idealH: 1.8, maxH: 3.6,
    note: 'Ocean Eye spot. South Coast/Garden Route exposure; benefits from clean northerly winds.' },
  { id: 'witsandbreede', name: 'Witsand - Breede', region: 'Garden Route', zone: 'Garden Route & Eastern Cape', oceanEye: 'witsand-breede', camStatus: 'Online',
    lat: -34.3970, lon: 20.8450, facing: 175, minH: 0.6, idealH: 1.7, maxH: 3.4,
    note: 'Ocean Eye spot. Breede River mouth area; banks and tide can matter a lot.' },
  { id: 'bigbay', name: 'Big Bay', region: 'Western Cape', zone: 'West Coast', oceanEye: 'big-bay', camStatus: 'Online',
    lat: -33.7920, lon: 18.4550, facing: 255, minH: 0.7, idealH: 1.8, maxH: 3.6,
    note: 'Ocean Eye spot. West Coast beach break; offshore is easterly to southeasterly.' },
  { id: 'campsbay', name: 'Camps Bay', region: 'Western Cape', zone: 'Atlantic Seaboard & Peninsula', oceanEye: 'camps-bay', camStatus: 'Online',
    lat: -33.9510, lon: 18.3780, facing: 260, minH: 0.8, idealH: 1.8, maxH: 3.2,
    note: 'Ocean Eye spot. Atlantic beach break; exposed to W/SW swell and wind.' },
  { id: 'clifton4th', name: 'Clifton 4th', region: 'Western Cape', zone: 'Atlantic Seaboard & Peninsula', oceanEye: 'clifton-4th', camStatus: 'Online',
    lat: -33.9385, lon: 18.3750, facing: 260, minH: 0.6, idealH: 1.4, maxH: 2.8,
    note: 'Ocean Eye spot. Sheltered Atlantic beach; often smaller than the open west-facing beaches.' },
  { id: 'houtbay', name: 'Hout Bay', region: 'Western Cape', zone: 'Atlantic Seaboard & Peninsula', oceanEye: 'hout-bay', camStatus: 'Online',
    lat: -34.0470, lon: 18.3480, facing: 205, minH: 0.8, idealH: 2.0, maxH: 4.0,
    note: 'Ocean Eye spot. Bay setup with strong local wind effects.' },
  { id: 'kitebeach', name: 'Kite Beach', region: 'Western Cape', zone: 'West Coast', oceanEye: 'kite-beach', camStatus: 'Online',
    lat: -33.8150, lon: 18.4770, facing: 255, minH: 0.7, idealH: 1.8, maxH: 3.6,
    note: 'Ocean Eye spot. West Coast beach near Blouberg; wind-sensitive.' },
  { id: 'llandudno', name: 'Llandudno', region: 'Western Cape', zone: 'Atlantic Seaboard & Peninsula', oceanEye: 'llandudno', camStatus: 'Online',
    lat: -34.0100, lon: 18.3415, facing: 250, minH: 0.8, idealH: 2.0, maxH: 4.0,
    note: 'Ocean Eye spot. Powerful Atlantic beach break; tune size thresholds to what you actually surf.' },
  { id: 'longbeach', name: 'Long Beach', region: 'Western Cape', zone: 'Atlantic Seaboard & Peninsula', oceanEye: 'long-beach', camStatus: 'Online',
    lat: -34.1370, lon: 18.3290, facing: 245, minH: 0.7, idealH: 1.8, maxH: 3.6,
    note: 'Ocean Eye spot. Kommetjie area beach break with Atlantic swell exposure.' },
  { id: 'melkbos', name: 'Melkbos', region: 'Western Cape', zone: 'West Coast', oceanEye: 'melkbos', camStatus: 'Online',
    lat: -33.7270, lon: 18.4430, facing: 255, minH: 0.7, idealH: 1.8, maxH: 3.6,
    note: 'Ocean Eye spot. West Coast beach/reef stretch; easterly winds clean it up.' },
  { id: 'muizenberg', name: 'Muizenberg', region: 'Western Cape', zone: 'False Bay', oceanEye: 'muizenberg', camStatus: 'Online',
    lat: -34.1080, lon: 18.4700, facing: 145, minH: 0.4, idealH: 1.2, maxH: 2.6,
    note: 'Ocean Eye spot. False Bay beach break; generally softer and more beginner-friendly.' },
  { id: 'noordhoek', name: 'Noordhoek', region: 'Western Cape', zone: 'Atlantic Seaboard & Peninsula', oceanEye: 'noordhoek', camStatus: 'Online',
    lat: -34.1020, lon: 18.3570, facing: 245, minH: 0.8, idealH: 2.0, maxH: 4.0,
    note: 'Ocean Eye spot. Exposed Atlantic beach; more power on W/SW swell.' },
  { id: 'seapoint', name: 'Sea Point', region: 'Western Cape', zone: 'Atlantic Seaboard & Peninsula', oceanEye: 'sea-point', camStatus: 'Online',
    lat: -33.9180, lon: 18.3850, facing: 275, minH: 0.8, idealH: 1.8, maxH: 3.5,
    note: 'Ocean Eye spot. Atlantic seaboard reef/shorebreak area; needs local tuning.' },
  { id: 'strand', name: 'Strand', region: 'Western Cape', zone: 'False Bay', oceanEye: 'strand', camStatus: 'Online',
    lat: -34.1140, lon: 18.8270, facing: 185, minH: 0.5, idealH: 1.4, maxH: 3.0,
    note: 'Ocean Eye spot. False Bay beach break; often smaller and cleaner in different wind than the Atlantic.' },
  { id: 'sunsetbeach', name: 'Sunset Beach', region: 'Western Cape', zone: 'West Coast', oceanEye: 'sunset-beach', camStatus: 'Online',
    lat: -33.8560, lon: 18.4910, facing: 255, minH: 0.7, idealH: 1.8, maxH: 3.6,
    note: 'Ocean Eye spot. West Coast beach break; exposed and wind-sensitive.' },
  { id: 'pajezanzibar', name: 'Paje - Zanzibar', region: 'International', zone: 'Mozambique', oceanEye: 'paje-zanzibar', camStatus: 'Online',
    lat: -6.2670, lon: 39.5350, facing: 105, minH: 0.4, idealH: 1.1, maxH: 2.5,
    note: 'Ocean Eye international spot. Forecast profile is approximate; tune after comparing with the cam.' },
  { id: 'pontadoouro', name: 'Ponta Do Ouro', region: 'International', zone: 'Mozambique', oceanEye: 'ponta-do-ouro', camStatus: 'Online',
    lat: -26.8450, lon: 32.8900, facing: 105, minH: 0.6, idealH: 1.6, maxH: 3.2,
    note: 'Ocean Eye international spot. Mozambique point/beach exposure with Indian Ocean swell.' },
];

const CUSTOM_SPOTS_KEY = 'kznsurf-custom-spots';
let CUSTOM_SPOTS = [];
let BREAKS;

/* Rating weights — wind dominates on this coast (the NE ruins everything). */
const WEIGHTS = { wind: 0.40, size: 0.25, period: 0.20, dir: 0.15 };

/* ------------------------------- helpers -------------------------------- */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const num = (v, fallback = 0) => Number.isFinite(+v) ? +v : fallback;
const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
));

/* smallest angle between two bearings, 0..180 */
function angleDiff(a, b) {
  let d = Math.abs(((a - b) % 360 + 360) % 360);
  return d > 180 ? 360 - d : d;
}

function compass(deg) {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(((deg % 360) / 22.5)) % 16];
}

function bearingFromDelta(dx, dy) {
  return normalizeBearing(Math.atan2(dx, -dy) * 180 / Math.PI);
}

function facingFromBankLine(lineBearing, fallbackFacing) {
  const a = normalizeBearing(lineBearing + 90);
  const b = normalizeBearing(lineBearing + 270);
  return angleDiff(a, fallbackFacing) <= angleDiff(b, fallbackFacing) ? a : b;
}

function normalizeBearing(v) {
  return ((num(v, 0) % 360) + 360) % 360;
}

function normalizeBank(bank, spot, n = 1) {
  return {
    id: bank.id || uid('bank'),
    name: String(bank.name || `Bank ${n}`).trim(),
    facing: normalizeBearing(bank.facing ?? spot.facing),
    minH: Math.max(0.1, num(bank.minH, spot.minH)),
    idealH: Math.max(0.2, num(bank.idealH, spot.idealH)),
    maxH: Math.max(0.3, num(bank.maxH, spot.maxH)),
    peel: bank.peel || 'left-right',
    tide: bank.tide || 'any',
    active: bank.active !== false,
  };
}

function normalizeSpot(spot) {
  const clean = {
    id: spot.id || uid('spot'),
    custom: !!spot.custom,
    isUserSpot: !!spot.isUserSpot,
    name: String(spot.name || 'New spot').trim(),
    region: String(spot.region || 'Custom').trim(),
    oceanEye: spot.oceanEye || '',
    breakType: spot.breakType || inferBreakType(spot.note),
    lat: num(spot.lat),
    lon: num(spot.lon),
    facing: normalizeBearing(spot.facing),
    minH: Math.max(0.1, num(spot.minH, 0.6)),
    idealH: Math.max(0.2, num(spot.idealH, 1.5)),
    maxH: Math.max(0.3, num(spot.maxH, 3.0)),
    note: String(spot.note || '').trim(),
  };
  clean.banks = Array.isArray(spot.banks)
    ? spot.banks.map((bank, i) => normalizeBank(bank, clean, i + 1))
    : [];
  return clean;
}

function loadCustomSpots() {
  try {
    return (JSON.parse(localStorage.getItem(CUSTOM_SPOTS_KEY)) || []).map(s => normalizeSpot({ ...s, custom: true }));
  } catch (e) {
    return [];
  }
}

function saveCustomSpots() {
  CUSTOM_SPOTS = CUSTOM_SPOTS.map(s => normalizeSpot({ ...s, custom: true }));
  try { localStorage.setItem(CUSTOM_SPOTS_KEY, JSON.stringify(CUSTOM_SPOTS)); } catch (e) {}
}

function buildBreakList() {
  const byId = new Map(BASE_BREAKS.map(s => [s.id, normalizeSpot({ ...s, custom: false, isUserSpot: false })]));
  CUSTOM_SPOTS.forEach(saved => {
    const base = byId.get(saved.id);
    if (base) {
      byId.set(saved.id, normalizeSpot({ ...base, ...saved, custom: false, isUserSpot: false }));
    } else {
      byId.set(saved.id, normalizeSpot({ ...saved, custom: true, isUserSpot: true }));
    }
  });
  return [...byId.values()];
}

function rebuildBreaks() {
  BREAKS = buildBreakList();
  syncPrefsWithBreaks();
}

function getStoredSpot(id) {
  return CUSTOM_SPOTS.find(s => s.id === id);
}

function updateStoredSpot(id, fn) {
  const i = CUSTOM_SPOTS.findIndex(s => s.id === id);
  if (i >= 0) {
    CUSTOM_SPOTS[i] = normalizeSpot(fn({ ...CUSTOM_SPOTS[i] }));
  } else {
    const base = BASE_BREAKS.find(s => s.id === id);
    if (!base) return;
    CUSTOM_SPOTS.push(normalizeSpot(fn({ ...base, id, custom: true })));
  }
  saveCustomSpots();
  rebuildBreaks();
}

function deleteCustomSpot(id) {
  CUSTOM_SPOTS = CUSTOM_SPOTS.filter(s => s.id !== id);
  saveCustomSpots();
  rebuildBreaks();
}

function mapUrl(b) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${b.lat},${b.lon}`)}`;
}

CUSTOM_SPOTS = loadCustomSpots();
BREAKS = buildBreakList();

/* ----------------------------- rating engine ---------------------------- */
/* Each returns 0..10. Kept separate + transparent so you can see WHY. */

function windQuality(windDir, windSpeed, facing) {
  const offshore = (facing + 180) % 360;
  const off = angleDiff(windDir, offshore);          // 0 = pure offshore
  let score;
  if (off <= 50) score = 10 - off / 50 * 1.5;
  else if (off <= 75) score = 8.5 - (off - 50) / 25 * 1.5;
  else if (off <= 105) score = 7 - (off - 75) / 30 * 1.5;
  else if (off <= 130) score = 5.5 - (off - 105) / 25 * 2;
  else score = clamp(3.5 - (off - 130) / 50 * 2, 1.5, 3.5);

  if (windSpeed < 5) score += 0.4;                    // light helps, but direction still matters
  else if (windSpeed < 12) score += 0.1;
  else if (windSpeed > 18) score -= (windSpeed - 18) * 0.12;
  if (off > 105) score = Math.min(score, windSpeed < 8 ? 5.2 : 4.2);
  return clamp(score, 0, 10);
}

function sizeQuality(h, b) {
  if (h < b.minH) return clamp((h / b.minH) * 4, 0, 4);
  if (h <= b.idealH) return 4 + (h - b.minH) / (b.idealH - b.minH) * 6; // 4 -> 10
  if (h <= b.maxH)   return 10 - (h - b.idealH) / (b.maxH - b.idealH) * 5; // 10 -> 5
  return clamp(5 - (h - b.maxH) * 2, 0, 5);            // oversized / closing out
}

function dirQuality(swellDir, facing) {
  const off = angleDiff(swellDir, facing);            // 0 = straight in
  if (off <= 45) return 10 - off / 45 * 1.5;          // 10 -> 8.5
  if (off <= 90) return 8.5 - (off - 45) / 45 * 3;    // 8.5 -> 5.5
  return clamp(5.5 - (off - 90) / 45 * 3, 1, 5.5);    // refraction/wrap energy
}

function periodQuality(p) {
  if (p < 6)  return clamp(p, 0, 4);                  // weak windswell
  if (p < 9)  return 4 + (p - 6) / 3 * 3;             // 4 -> 7
  if (p < 13) return 7 + (p - 9) / 4 * 3;             // 7 -> 10
  return 10;                                          // long groundswell
}

/* Combine into a single 0..10 score + the reason it's that score. */
function rate(b, m) {
  // m = { swellH, swellDir, swellPer, windDir, windSpd, gust }
  const wind   = windQuality(m.windDir, m.windSpd, b.facing);
  const size   = sizeQuality(m.swellH, b);
  const period = periodQuality(m.swellPer);
  const dir    = dirQuality(m.swellDir, b.facing);

  let score = wind * WEIGHTS.wind + size * WEIGHTS.size
            + period * WEIGHTS.period + dir * WEIGHTS.dir;

  // WIND GATE: a clean offshore should win even over a bigger onshore day. Cap the
  // ceiling by wind quality so blown-out / onshore hours can't read as "Good", no
  // matter how good the swell is. (wind 10 → cap 10; wind 3 ≈ cap 5.5 = Fair.)
  score = Math.min(score, 3.5 + wind * 0.65);

  // Gate: if it's below rideable size, nothing else matters much.
  if (m.swellH < b.minH) score *= clamp(m.swellH / b.minH, 0, 1);

  return { score: clamp(score, 0, 10), parts: { wind, size, period, dir } };
}

function activeBanks(b) {
  return [];
}

function scoreProfiles(b, m) {
  const banks = activeBanks(b);
  const profiles = banks.length ? banks.map(bank => ({ ...b, ...bank, bank })) : [b];
  return profiles.map(profile => {
    const r = rate(profile, m);
    return { profile, bank: profile.bank || null, score: r.score, parts: r.parts };
  });
}

function bestProfileScore(b, m) {
  return scoreProfiles(b, m).sort((a, z) => z.score - a.score)[0];
}

function profileForHour(b, h) {
  return h?.bank ? { ...b, ...h.bank, bank: h.bank } : b;
}

function band(score) {
  if (score < 2)   return { label: 'Flat',  cls: 'flat'  };
  if (score < 4)   return { label: 'Poor',  cls: 'poor'  };
  if (score < 5.5) return { label: 'Fair',  cls: 'fair'  };
  if (score < 7)   return { label: 'Fair–Good', cls: 'okgood' };
  if (score < 8.5) return { label: 'Good',  cls: 'good'  };
  return { label: 'Epic', cls: 'epic' };
}

/* =========================================================================
   COMPONENT READOUTS — instead of one mystery number, describe each axis the
   way a surfer actually reads it. Each returns { text, cls } where cls is
   good | avg | poor (or a szN size class). Tune the wording/thresholds freely.
   ========================================================================= */

/* Swell size in BODY HEIGHTS, not metres.
   Period-aware: a long-period swell throws a taller face than the same height of
   short windswell, so we estimate a breaking FACE height before labelling.
   Calibrated to "≈1.2 m at 9 s feels chest-to-shoulder". Tune PERIOD_GAIN and
   the threshold table to your breaks. */
function faceHeight(h, p) {
  // shoaling-ish gain: ~0.9 at 6 s rising to ~1.5 at 14 s+
  const gain = clamp(0.9 + (p - 6) * 0.075, 0.85, 1.5);
  return h * gain;
}
function sizeLabel(h, p) {
  const f = faceHeight(h, p);              // estimated wave-face height (m)
  const t = [
    [0.35, 'Flat',             'sz0'],
    [0.65, 'Knee high',        'sz1'],
    [1.00, 'Waist high',       'sz2'],
    [1.40, 'Chest high',       'sz3'],
    [1.70, 'Shoulder high',    'sz4'],
    [2.10, 'Head high',        'sz5'],
    [3.00, 'Overhead (1.5×)',  'sz6'],
    [Infinity, 'Double overhead+', 'sz7'],
  ];
  for (const [max, text, cls] of t) if (f < max) return { text, cls };
}

/* Wind DIRECTION quality relative to the beach (offshore = clean groomer). */
function windDirComp(windDir, facing) {
  const off = angleDiff(windDir, (facing + 180) % 360); // 0 = pure offshore
  let text, cls;
  if (off < 50)       { text = 'Offshore';    cls = 'good'; }
  else if (off < 75)  { text = 'Cross-off';   cls = 'good'; }
  else if (off < 105) { text = 'Cross-shore'; cls = 'avg';  }
  else if (off < 130) { text = 'Cross-on';    cls = 'poor'; }
  else                { text = 'Onshore';     cls = 'poor'; }
  return { text, cls };
}

/* Wind STRENGTH as its own axis. */
function windSpeedComp(windSpeed) {
  let text, cls;
  if (windSpeed < 8)       { text = 'Light';    cls = 'good'; }
  else if (windSpeed < 18) { text = 'Moderate'; cls = 'avg';  }
  else if (windSpeed < 28) { text = 'Strong';   cls = 'poor'; }
  else                     { text = 'Howling';  cls = 'poor'; }
  return { text: `${text} · ${Math.round(windSpeed)}km/h`, cls };
}

/* Swell DIRECTION → will it PEEL or CLOSE OUT?
   Calibrated to: these beach breaks mostly CLOSE OUT on a straight E/SE swell —
   they need some angle to peel. So square-on swell reads poor unless it's long
   enough period to at least be punchy. */
function peelComp(swellDir, swellPer, facing) {
  const off = angleDiff(swellDir, facing);   // 0 = straight onto the beach
  if (off < 20) {                            // square-on — banks shut down
    return swellPer >= 12
      ? { text: 'Square & punchy', cls: 'avg' }
      : { text: 'Closing out',     cls: 'poor' };
  }
  if (off <= 55 && swellPer >= 8) return { text: 'Peeling lines',  cls: 'good' };
  if (off > 75)                   return { text: 'Walling / weak',  cls: 'avg' };
  if (swellPer >= 9)              return { text: 'Mostly peeling',  cls: 'good' };
  return { text: 'Shifty peaks',  cls: 'avg' };
}

/* CLEANNESS — glassy vs choppy, from wind + how much wind-chop rides the swell.
   waveH-swellH approximates the local wind-sea sitting on top of the groundswell. */
function cleanComp(windDir, windSpeed, facing, waveH, swellH) {
  const off = angleDiff(windDir, (facing + 180) % 360);
  const windSea = Math.max(0, waveH - swellH);
  if (windSpeed < 6)                                   return { text: 'Glassy', cls: 'good' };
  if (off < 60 && windSpeed < 12 && windSea < 0.4)     return { text: 'Clean',  cls: 'good' };
  if (off > 110 || windSpeed > 22 || windSea > 0.8)    return { text: 'Choppy & messy', cls: 'poor' };
  return { text: 'Some texture', cls: 'avg' };
}

/* SPACING between waves, from period — even corduroy lines vs shifty slop. */
function spacingComp(swellPer) {
  if (swellPer >= 12) return { text: 'Long, even lines', cls: 'good' };
  if (swellPer >= 9)  return { text: 'Decent spacing',   cls: 'good' };
  if (swellPer >= 7)  return { text: 'Short & shifty',   cls: 'avg'  };
  return { text: 'Close & choppy', cls: 'poor' };
}

/* Bundle all readouts for one hour at one break. */
function components(b, h) {
  const p = profileForHour(b, h);
  return {
    size:    sizeLabel(h.swellH, h.swellPer),
    windDir: windDirComp(h.windDir, p.facing),
    windSpd: windSpeedComp(h.windSpd),
    peel:    peelComp(h.swellDir, h.swellPer, p.facing),
    clean:   cleanComp(h.windDir, h.windSpd, p.facing, h.waveH, h.swellH),
    spacing: spacingComp(h.swellPer),
  };
}

/* Numeric factor scores for the overlap graph. Each axis is 0..10 so it can be
   plotted on the same rating scale, and the aligned score powers the text callout. */
function windDirectionScore(windDir, facing) {
  const off = angleDiff(windDir, (facing + 180) % 360);
  if (off <= 50)  return 10 - off / 50 * 1.5;          // offshore -> cross-off
  if (off <= 75)  return 8.5 - (off - 50) / 25 * 1.5;  // cross-off -> usable
  if (off <= 105) return 7 - (off - 75) / 30 * 1.5;    // cross-shore
  if (off <= 130) return 5.5 - (off - 105) / 25 * 2;   // cross-on
  return clamp(3.5 - (off - 130) / 50 * 3.5, 0, 3.5);  // onshore
}

function windSpeedScore(windSpeed) {
  if (windSpeed < 8)  return 10;
  if (windSpeed < 18) return 10 - (windSpeed - 8) / 10 * 3;
  if (windSpeed < 28) return 7 - (windSpeed - 18) / 10 * 4.5;
  return clamp(2.5 - (windSpeed - 28) * 0.12, 0, 2.5);
}

function peelScore(swellDir, swellPer, facing) {
  const off = angleDiff(swellDir, facing);
  if (off < 20) return swellPer >= 12 ? 5.8 : 2.4;
  if (off <= 55) return clamp(7 + (swellPer - 8) * 0.45, 7, 10);
  if (off > 75) return clamp(5 - (off - 75) * 0.04 + (swellPer - 9) * 0.15, 3.5, 5.5);
  return swellPer >= 9 ? 7.5 : 5.5;
}

function cleanScore(windDir, windSpeed, facing, waveH, swellH) {
  const off = angleDiff(windDir, (facing + 180) % 360);
  const windSea = Math.max(0, waveH - swellH);
  let score = 9.5;
  score -= clamp((windSpeed - 4) * 0.18, 0, 4);
  score -= clamp(windSea * 2.2, 0, 3);
  if (off > 60) score -= clamp((off - 60) / 80 * 4, 0, 4);
  if (off < 50 && windSpeed < 12) score += 1;
  return clamp(score, 0, 10);
}

function spacingScore(swellPer) {
  if (swellPer < 6)  return clamp(swellPer, 0, 4);
  if (swellPer < 9)  return 4 + (swellPer - 6) / 3 * 3;
  if (swellPer < 12) return 7 + (swellPer - 9) / 3 * 2;
  return 10;
}

function factorScores(b, h) {
  const p = profileForHour(b, h);
  const scores = {
    wind:    windDirectionScore(h.windDir, p.facing),
    speed:   windSpeedScore(h.windSpd),
    swell:   peelScore(h.swellDir, h.swellPer, p.facing),
    surface: cleanScore(h.windDir, h.windSpd, p.facing, h.waveH, h.swellH),
    spacing: spacingScore(h.swellPer),
    size:    sizeQuality(h.swellH, p),
  };
  scores.aligned = Math.min(scores.wind, scores.speed, scores.swell,
    scores.surface, scores.spacing, scores.size);
  return scores;
}


/* ------------------------------- data fetch ----------------------------- */
const API_MARINE = 'https://marine-api.open-meteo.com/v1/marine';
const API_WIND   = 'https://api.open-meteo.com/v1/forecast';
const TZ = 'Africa/Johannesburg';
const FORECAST_DAYS = 14;   // Open-Meteo serves marine + wind out to 16; 14 keeps
                            // a useful 2-week view. Multi-model consensus thins
                            // out past ~7–10 days, so confidence drops gracefully.

/* MULTI-MODEL CONSENSUS — instead of trusting one model, we pull swell from a
   few independent wave models and wind from a few weather models, average them,
   and read the spread as a confidence signal. The single best_match request is
   still fetched separately as the baseline + tide/SST, so if these extra calls
   ever fail the app falls straight back to today's behaviour. */
// Verified valid against the live Open-Meteo API for this coastline.
// Waves: ECMWF WAM, DWD GWAM, NCEP GFS-Wave. Wind: ECMWF IFS, GFS, ICON.
const WAVE_MODELS = ['ecmwf_wam025', 'gwam', 'ncep_gfswave025'];
const WIND_MODELS = ['ecmwf_ifs025', 'gfs_global', 'icon_global'];

const mean = a => a.reduce((s, x) => s + x, 0) / a.length;

// Circular mean for compass bearings (so 350° and 10° average to 0°, not 180°).
function circMeanDeg(a) {
  if (!a.length) return null;
  let sx = 0, sy = 0;
  for (const d of a) { const r = d * Math.PI / 180; sx += Math.cos(r); sy += Math.sin(r); }
  return ((Math.atan2(sy, sx) * 180 / Math.PI) % 360 + 360) % 360;
}

// Pull one variable across all requested models at hour-index k (Open-Meteo
// suffixes each variable with the model id when models= is set).
function modelValues(hourly, base, models, k) {
  const out = [];
  for (const mdl of models) {
    const v = hourly?.[`${base}_${mdl}`]?.[k];
    if (typeof v === 'number' && isFinite(v)) out.push(v);
  }
  return out;
}

// Confidence = how tightly the models agree on swell height (the axis surfers
// care about most). Relative spread → High / Medium / Low. Thresholds tunable.
function swellConfidence(heights) {
  if (heights.length < 2) return { label: '—', cls: 'conf-unknown', n: heights.length };
  const m = mean(heights);
  const rel = m > 0 ? (Math.max(...heights) - Math.min(...heights)) / m : 0;
  if (rel <= 0.25) return { label: 'High',   cls: 'conf-high', n: heights.length };
  if (rel <= 0.50) return { label: 'Medium', cls: 'conf-med',  n: heights.length };
  return { label: 'Low', cls: 'conf-low', n: heights.length };
}

/* Persisted prefs: how to order spots, and the user's own custom order. */
const PREFS = loadPrefs();
function loadPrefs() {
  let p = {};
  try { p = JSON.parse(localStorage.getItem('kznsurf-prefs')) || {}; } catch (e) {}
  const ids = BREAKS.map(b => b.id);
  // keep only known ids, then append any new breaks not yet in saved order
  const order = (p.order || []).filter(id => ids.includes(id));
  ids.forEach(id => { if (!order.includes(id)) order.push(id); });
  const favs = (p.favs || []).filter(id => ids.includes(id));
  return {
    view: p.view === 'spots' ? 'spots' : 'home',
    spotSearch: String(p.spotSearch || ''),
    regionFilter: p.regionFilter || 'all',
    order,
    favs,
  };
}
function syncPrefsWithBreaks() {
  const ids = BREAKS.map(b => b.id);
  PREFS.order = (PREFS.order || []).filter(id => ids.includes(id));
  ids.forEach(id => { if (!PREFS.order.includes(id)) PREFS.order.push(id); });
  PREFS.favs = (PREFS.favs || []).filter(id => ids.includes(id));
  savePrefs();
}
function savePrefs() {
  try { localStorage.setItem('kznsurf-prefs', JSON.stringify(PREFS)); } catch (e) {}
}
function toggleFav(id) {
  const i = PREFS.favs.indexOf(id);
  if (i < 0) PREFS.favs.push(id); else PREFS.favs.splice(i, 1);
  savePrefs(); render();
}

function loadVoice() {
  return 'befok';
}

let STATE = {
  days: [],
  dayIdx: 0,
  expanded: null,
  updated: null,
  voice: loadVoice(),
  audio: { playing: false, spotIdx: 0, progress: 0 },
};

/* Per-render handle on the expanded card's day data, so the stat-block taps can
   draw a metric graph without re-rendering the whole card. */
let STAT_DETAIL = null;

async function fetchAll() {
  const lats = BREAKS.map(b => b.lat).join(',');
  const lons = BREAKS.map(b => b.lon).join(',');

  const marineUrl = `${API_MARINE}?latitude=${lats}&longitude=${lons}`
    + `&hourly=swell_wave_height,swell_wave_direction,swell_wave_period,wave_height,`
    + `wave_period,sea_level_height_msl,sea_surface_temperature`
    + `&forecast_days=${FORECAST_DAYS}&timezone=${encodeURIComponent(TZ)}`;
  const windUrl = `${API_WIND}?latitude=${lats}&longitude=${lons}`
    + `&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m`
    + `&daily=sunrise,sunset&forecast_days=${FORECAST_DAYS}&timezone=${encodeURIComponent(TZ)}`;

  // Consensus layers: swell across several wave models, wind across several
  // weather models. Kept as separate, optional requests so the baseline above
  // (and tide/SST) is never at the mercy of these.
  const multiMarineUrl = `${API_MARINE}?latitude=${lats}&longitude=${lons}`
    + `&hourly=swell_wave_height,swell_wave_direction,swell_wave_period`
    + `&models=${WAVE_MODELS.join(',')}`
    + `&forecast_days=${FORECAST_DAYS}&timezone=${encodeURIComponent(TZ)}`;
  const multiWindUrl = `${API_WIND}?latitude=${lats}&longitude=${lons}`
    + `&hourly=wind_speed_10m,wind_direction_10m`
    + `&models=${WIND_MODELS.join(',')}`
    + `&forecast_days=${FORECAST_DAYS}&timezone=${encodeURIComponent(TZ)}`;

  const optional = url => fetch(url).then(r => r.json()).catch(() => null);
  const [marineRes, windRes, multiMarineRes, multiWindRes] = await Promise.all([
    fetch(marineUrl).then(r => r.json()),
    fetch(windUrl).then(r => r.json()),
    optional(multiMarineUrl),
    optional(multiWindUrl),
  ]);

  // Multi-location requests return an array; single returns an object.
  const asArr = x => (x == null ? null : (Array.isArray(x) ? x : [x]));
  return {
    marine: asArr(marineRes),
    wind:   asArr(windRes),
    multiMarine: asArr(multiMarineRes),
    multiWind:   asArr(multiWindRes),
  };
}

/* Build a per-break, per-hour series merged from the two datasets. */
function buildSeries(marine, wind, multiMarine, multiWind) {
  return BREAKS.map((b, i) => {
    const mh = marine[i].hourly, wh = wind[i].hourly;
    const mmh = multiMarine?.[i]?.hourly;   // per-model swell
    const wwh = multiWind?.[i]?.hourly;     // per-model wind

    const windByTime = {}; wh.time.forEach((t, k) => { windByTime[t] = k; });
    const mmByTime = {}; mmh?.time?.forEach((t, k) => { mmByTime[t] = k; });
    const wwByTime = {}; wwh?.time?.forEach((t, k) => { wwByTime[t] = k; });

    const hours = mh.time.map((t, k) => {
      const wk = windByTime[t];
      const m = {
        time: t,
        swellH: mh.swell_wave_height[k] ?? mh.wave_height[k] ?? 0,
        swellDir: mh.swell_wave_direction[k] ?? 0,
        swellPer: mh.swell_wave_period[k] ?? 0,
        waveH: mh.wave_height[k] ?? 0,
        waveP: mh.wave_period?.[k] ?? 0,
        tide: mh.sea_level_height_msl?.[k] ?? null,
        waterTemp: mh.sea_surface_temperature?.[k] ?? null,
        windDir: wk != null ? wh.wind_direction_10m[wk] : 0,
        windSpd: wk != null ? wh.wind_speed_10m[wk] : 0,
        gust: wk != null ? wh.wind_gusts_10m[wk] : 0,
        conf: { label: '—', cls: 'conf-unknown', n: 1 },
      };

      // Swell consensus: average the wave models, read spread as confidence.
      const mk = mmByTime[t];
      if (mmh && mk != null) {
        const hs = modelValues(mmh, 'swell_wave_height', WAVE_MODELS, mk);
        const ps = modelValues(mmh, 'swell_wave_period', WAVE_MODELS, mk);
        const ds = modelValues(mmh, 'swell_wave_direction', WAVE_MODELS, mk);
        if (hs.length) { m.swellH = mean(hs); m.conf = swellConfidence(hs); }
        if (ps.length) m.swellPer = mean(ps);
        if (ds.length) m.swellDir = circMeanDeg(ds);
      }

      // Wind consensus across the weather models.
      const wwk = wwByTime[t];
      if (wwh && wwk != null) {
        const ws = modelValues(wwh, 'wind_speed_10m', WIND_MODELS, wwk);
        const wd = modelValues(wwh, 'wind_direction_10m', WIND_MODELS, wwk);
        if (ws.length) m.windSpd = mean(ws);
        if (wd.length) m.windDir = circMeanDeg(wd);
      }

      const r = bestProfileScore(b, m);
      return { ...m, score: r.score, parts: r.parts, bank: r.bank };
    });

    return { break: b, hours, daily: wind[i].daily };
  });
}

/* Group hours into days, tag daylight + tide extremes + best window. */
function groupDays(series) {
  const dates = [...new Set(series[0].hours.map(h => h.time.slice(0, 10)))];
  return dates.map((date, di) => {
    const sunrise = series[0].daily?.sunrise?.[di];
    const sunset  = series[0].daily?.sunset?.[di];
    const srH = sunrise ? +sunrise.slice(11, 13) : 6;
    const ssH = sunset  ? +sunset.slice(11, 13)  : 18;

    const breaks = series.map(s => {
      const dayHours = s.hours.filter(h => h.time.startsWith(date));
      const light = dayHours.filter(h => {
        const hr = +h.time.slice(11, 13);
        return hr >= srH && hr <= ssH;
      });
      // best daylight window
      let best = null;
      light.forEach(h => { if (!best || h.score > best.score) best = h; });

      // tide extremes within the day
      const tides = findTides(dayHours);
      return { break: s.break, dayHours, light, best, tides };
    });
    return { date, di, sunrise, sunset, breaks };
  });
}

function findTides(hours) {
  const out = [];
  for (let i = 1; i < hours.length - 1; i++) {
    const a = hours[i - 1].tide, b = hours[i].tide, c = hours[i + 1].tide;
    if (a == null || b == null || c == null) continue;
    // strict on the left so a flat (plateau) peak is marked once, not at every hour
    if (b > a && b >= c) out.push({ type: 'High', time: hours[i].time, v: b });
    else if (b < a && b <= c) out.push({ type: 'Low', time: hours[i].time, v: b });
  }
  return out;
}

/* nearest hour to "now" in SAST, for the current reading */
function nowIndex(dayHours) {
  const now = new Date();
  const sast = new Date(now.getTime() + (now.getTimezoneOffset() + 120) * 60000);
  const hr = sast.getHours();
  let idx = 0, bestDiff = 99;
  dayHours.forEach((h, k) => {
    const d = Math.abs(+h.time.slice(11, 13) - hr);
    if (d < bestDiff) { bestDiff = d; idx = k; }
  });
  return idx;
}

/* -------------------------------- render -------------------------------- */
const $ = sel => document.querySelector(sel);
const fmtTime = t => t.slice(11, 16);
function shiftTime(t, mins) {
  const d = new Date(t);
  d.setMinutes(d.getMinutes() + mins);
  return d.toTimeString().slice(0, 5);
}
/* one coloured condition chip: green/orange/red by its own quality */
const compChip = (label, x) =>
  `<div class="comp ${x.cls}"><span class="ck">${label}</span><span class="cv">${x.text}</span></div>`;
const fmtDay = date => {
  const d = new Date(date + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tmrw';
  return d.toLocaleDateString('en-ZA', { weekday: 'short' });
};

const VOICE = {
  befok: {
    flat: 'Dead flat, boet',
    poor: 'Kak',
    fair: 'Eish',
    okgood: 'Naah, marginal',
    good: 'Mal',
    epic: 'Befok',
  },
};

/* Per-axis vocabularies. The slang above (Befok/Mal…) is the OVERALL verdict,
   where "befok/pumping" = great. But that same energy slang inverts on a single
   axis: "pumping wind" reads as strong wind (bad), not good wind. So swell and
   wind each get their own unambiguous word — high score always = better surf.
   Swell describes the energy on offer; wind describes what it does to the face. */
const SWELL_WORDS = {
  flat:   'Flat',
  poor:   'Weak',
  fair:   'Soft',
  okgood: 'Workable',
  good:   'Solid',
  epic:   'Firing',
};
const WIND_WORDS = {
  flat:   'Howling',     // worst: strong onshore, surface destroyed
  poor:   'Blown out',
  fair:   'Bumpy',
  okgood: 'Textured',
  good:   'Clean',
  epic:   'Glassy',      // best: light / offshore, groomed face
};

// Each key is a POOL of phrasings. phrase() picks one deterministically from a
// seed (spot + day), so the copy stays put within a day but reads differently
// from one day — and one spot — to the next, instead of the same line every time.
const PHRASES = {
  befok: {
    headlineGood: [
      ({ spot, size, wind }) => `${spot} is looking lekker: ${size} with ${wind} wind.`,
      ({ spot, size, wind }) => `${spot} is going off, boet — ${size} and ${wind} wind.`,
      ({ spot, size, wind }) => `Befok day at ${spot}: ${size} lines, ${wind} wind.`,
      ({ spot, size, wind }) => `${spot} is pumping, bru — ${size} with ${wind} wind.`,
      ({ spot, size, wind }) => `Get to ${spot}, china — ${size} and ${wind} wind, it's mal.`,
      ({ spot, size, wind }) => `${spot} is cooking: ${size} sets, ${wind} wind. Send it.`,
      ({ spot, size, wind }) => `${size} and clean at ${spot} on a ${wind} wind. Lekker.`,
      ({ spot, size, wind }) => `${spot} is the spot today, boet — ${size} with ${wind} wind.`,
      ({ spot, size, wind }) => `Proper ${size} at ${spot}, ${wind} wind. Don't snooze.`,
      ({ spot, size, wind }) => `${spot} is firing, bru: ${size} lines, ${wind} wind.`,
      ({ spot, size, wind }) => `${spot} has it: ${size} swell, ${wind} wind. Go.`,
      ({ spot, size, wind }) => `Lines for days at ${spot}: ${size}, ${wind} wind. Lekker.`,
      ({ spot, size, wind }) => `Clean ${size} surf at ${spot}, with ${wind} wind. Proper shout.`,
    ],
    headlineOk: [
      ({ spot }) => `${spot} might cook if you don't faff around.`,
      ({ spot }) => `${spot} is alright, boet — pick your moment.`,
      ({ spot }) => `Not befok, but ${spot} will give you a few.`,
      ({ spot }) => `${spot} is surfable if you're not a wimp about it.`,
      ({ spot }) => `Time it lekker and ${spot} comes good.`,
      ({ spot, size, wind }) => `${spot} has its moments — ${size}, ${wind} wind.`,
      ({ spot, size, wind }) => `Worth a paddle at ${spot}: ${size}, ${wind} wind.`,
      ({ spot }) => `${spot} is fair, bru. Catch the window and jol.`,
      ({ spot }) => `A couple to be had at ${spot} if you're patient.`,
      ({ spot }) => `${spot} won't klap you, but it's rideable.`,
      ({ spot }) => `${spot} has a window if you time it right, boet.`,
      ({ spot }) => `Not perfect, but ${spot} will give you a few.`,
      ({ spot, size, wind }) => `Worth a look at ${spot}: ${size} and ${wind} wind.`,
    ],
    headlinePoor: [
      ({ spot }) => `Bit kak out there. ${spot} is the least tragic punt.`,
      ({ spot }) => `Eish, slim pickings. ${spot} is the best of a bad lot.`,
      ({ spot }) => `Proper kak today, boet. ${spot} if you must.`,
      ({ spot }) => `Flat-ish and fickle. ${spot} edges the rest, barely.`,
      ({ spot }) => `Save your energy, bru — ${spot} is the only vague shout.`,
      ({ spot }) => `${spot} is barely worth the wax, but it's the pick.`,
      ({ spot }) => `Tough one. ${spot} is the least disappointing.`,
      ({ spot }) => `Lake KZN vibes. ${spot} if you're gatvol of the couch.`,
      ({ spot }) => `Not much doing. ${spot} is your least kak option.`,
      ({ spot }) => `Coffee weather, boet. ${spot} if you're desperate.`,
      ({ spot }) => `A scratchy one today. ${spot} is the least grumpy option.`,
      ({ spot }) => `Marginal everywhere; ${spot} is the pick of a poor day.`,
      ({ spot }) => `Save your energy — ${spot} is the only vaguely surfable shout.`,
    ],
    summary: [
      ({ spot, window, wind, swell }) => `${spot} is the shout for ${window}. Wind is ${wind}; swell is ${swell}. Go early, boet.`,
      ({ spot, window, wind, swell }) => `Make it ${spot} for ${window}. Wind is ${wind}; swell is ${swell}. Beat the okes out there.`,
      ({ spot, window, wind, swell }) => `${spot} is the move, bru, for ${window}. Wind is ${wind}; swell is ${swell}. Don't faff.`,
      ({ spot, window, wind, swell }) => `Top read is ${spot} for ${window}. Wind is ${wind}; swell is ${swell}. Wax up and jol.`,
      ({ spot, window, wind, swell }) => `${spot} leads it for ${window}. Wind is ${wind}; swell is ${swell}. First in, best dressed, china.`,
      ({ spot, window, wind, swell }) => `For ${window}, get to ${spot}. Wind is ${wind}; swell is ${swell}. Send it, don't think.`,
      ({ spot, window, wind, swell }) => `${spot} is the pick for ${window}. Wind is ${wind}; swell is ${swell}. Paddle out and stop reading.`,
      ({ spot, window, wind, swell }) => `Aim for ${spot} round ${window}. Wind is ${wind}; swell is ${swell}. Get amongst it, boet.`,
      ({ spot, window, wind, swell }) => `${spot} is where it's at for ${window}. Wind is ${wind}; swell is ${swell}. Keep it lekker.`,
      ({ spot, window, wind, swell }) => `Plan is ${spot} for ${window}. Wind is ${wind}; swell is ${swell}. Less talk, more surf.`,
      ({ spot, window, wind, swell }) => `${spot} is the standout for ${window}. Wind is ${wind}; swell is ${swell}. Surf it, don't study it.`,
      ({ spot, window, wind, swell }) => `For ${window}, ${spot} is where I'd be. Wind is ${wind}; swell is ${swell}. Trust the window, bru.`,
      ({ spot, window, wind, swell }) => `${spot} leads the pack for ${window}. Wind is ${wind}; swell is ${swell}. Wax up and go.`,
    ],
    spotEpic: [
      ({ size, wind }) => `${size} and going off, with ${wind} wind.`,
      ({ size, wind }) => `${size} and befok, ${wind} wind. Get there, boet.`,
      ({ size, wind }) => `${size} walls, ${wind} wind. It's mal, bru.`,
      ({ size, wind }) => `${size} and pumping on a ${wind} wind. Send it.`,
      ({ size, wind }) => `Proper ${size}, ${wind} wind. Stop reading, start paddling.`,
    ],
    spotPoor: [
      ({ swell }) => `${swell}. Eish, keep expectations tidy.`,
      ({ swell }) => `${swell}. Kak, boet — maybe just a coffee.`,
      ({ swell }) => `${swell}. One for the mal okes only.`,
      ({ swell }) => `${swell}. Save your energy for a better day, bru.`,
      ({ swell }) => `${swell}. Lake KZN, basically.`,
    ],
    boardLongboard: [
      ({ at }) => `Small and clean ${at}, boet — log it and cruise.`,
      ({ at }) => `Knee-high and glassy ${at}. Bring the long log.`,
      () => `Gutless but lekker clean — noseride city.`,
      ({ at }) => `Clean little peelers ${at}. Longboard jol.`,
      () => `Soft and rolling; get the nine-foot, bru.`,
      ({ at }) => `Proper clean, just no push ${at}. Log day, china.`,
      () => `Mellow and peeling — hang ten and chill.`,
      ({ at }) => `Tiny but tidy ${at}; wax the log, boet.`,
      ({ size }) => `${size} and friendly. Single-fin glide, lekker.`,
      ({ at }) => `Ankle-slappers with shape ${at}. Log or stay home.`,
    ],
    boardShortboard: [
      ({ at }) => `Right in the slot ${at} — grab the daily driver, boet.`,
      ({ at }) => `Punchy and clean ${at}, bru. Thruster weather.`,
      ({ size }) => `${size} with snap; your go-to's gonna love it.`,
      ({ at }) => `Clean and rippable ${at} — get mal on the shortie.`,
      () => `Just enough push for the thruster. Jol.`,
      ({ at }) => `Bread-and-butter ${at}, boet; wax the usual stick.`,
      ({ at }) => `Open faces, decent push ${at}. Shortboard playground.`,
      () => `Crisp and carvable — daily driver's day out.`,
      ({ at }) => `Snappy little walls ${at}. Perfect for the go-to, china.`,
      () => `Standard fun. Shortboard and send.`,
    ],
    boardStepUp: [
      ({ size, at }) => `${size} and meaning it ${at} — reach for the step-up, boet.`,
      ({ at }) => `Got grunt ${at}, bru; bring the bigger stick.`,
      () => `Long-period power. Respect it.`,
      ({ at }) => `Solid and serious ${at}. Step-up turf.`,
      () => `Heavier than usual — size up or get worked.`,
      ({ at }) => `Proper energy ${at}. Step-up earns its keep.`,
      () => `Drawn-out and powerful — don't go under-gunned, bru.`,
      ({ size, at }) => `${size} and clean ${at}. Extra foam helps.`,
      ({ at }) => `Pushing hard ${at}. Time for the step-up.`,
      () => `Substance, not just size. Step up and commit, china.`,
    ],
    boardMidlength: [
      ({ at }) => `Long-period and lined-up ${at} — made for the midlength, boet.`,
      ({ at }) => `Clean, spaced sets ${at}. Glide it on the mid.`,
      () => `Drawn-out and gentle — egg it all day.`,
      ({ at }) => `Smooth and organised ${at}. Midlength trim, lekker.`,
      () => `Lined-up walls, no klap. Midlength magic.`,
      ({ at }) => `Glassy and rolling ${at}; bring the 7'0 and flow.`,
      () => `Long-period mellow — the mid's happy place.`,
      ({ at }) => `Open and cruisy ${at}. One for the mid glide, china.`,
      () => `Clean spacing, soft power. Egg it, boet.`,
      ({ at }) => `Peeling and patient ${at}. Midlength heaven.`,
    ],
    boardFish: [
      ({ at }) => `Soft and mushy ${at}, boet — pull out the fish.`,
      () => `Gutless but fun; the fish'll make the most of it.`,
      ({ at }) => `Weak and crumbly ${at}. Go wide — fish day, china.`,
      () => `Not much power, so go fat. Fish or groveler.`,
      ({ at }) => `Mushy peaks ${at}. Speed-and-glide on the fish.`,
      ({ at }) => `Short-period slop with shape ${at}; fish it and jol, bru.`,
      () => `Low energy — float the flats on a fish.`,
      ({ at }) => `Crumbly and slow ${at}. The fish keeps it moving.`,
      () => `Make your own speed. Twin-fin weather, boet.`,
      ({ at }) => `Soft fat little walls ${at}. Groveler or fish, all smiles.`,
    ],
    reportIntro: [
      ({ day }) => `Morning. KZN surf report for ${day}.`,
      ({ day }) => `Howzit boet. Here's ${day} along the coast.`,
      ({ day }) => `Morning, china. Let's check ${day}.`,
      ({ day }) => `Right bru, here's the ${day} read.`,
      ({ day }) => `Morning. ${day}'s surf, coming up.`,
    ],
  },
};

const SPOKEN_OVERRIDES = {
  Umhlanga: 'um-shlanga',
  Umdloti: 'um-dlo-tee',
  Umkomaas: 'um-ko-maas',
  Scottburgh: 'scott-burra',
};

function ratingWord(bandCls) {
  return VOICE.befok[bandCls] || bandCls;
}

// Stable string hash → non-negative int, used to pick a phrasing from a seed.
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Pick one phrasing for `key`. `seed` (e.g. spot id + date) keeps the choice
// steady within a day while varying it from day to day and spot to spot.
function phrase(key, ctx = {}, seed = '') {
  const pack = PHRASES.befok;
  const variants = pack[key];
  if (!variants) return '';
  const arr = Array.isArray(variants) ? variants : [variants];
  const fn = arr[hashStr(`${key}|befok|${seed}`) % arr.length];
  return typeof fn === 'function' ? fn(ctx) : '';
}

function swellScore(parts) {
  const w = WEIGHTS.size + WEIGHTS.period + WEIGHTS.dir;
  return (parts.size * WEIGHTS.size + parts.period * WEIGHTS.period + parts.dir * WEIGHTS.dir) / w;
}

function windScore(parts) {
  return parts.wind;
}

function axisRatings(h) {
  const swellBand = band(swellScore(h.parts || { size: 0, period: 0, dir: 0 }));
  const windBand = band(windScore(h.parts || { wind: 0 }));
  return {
    swell: { label: SWELL_WORDS[swellBand.cls] || swellBand.label, cls: swellBand.cls },
    wind: { label: WIND_WORDS[windBand.cls] || windBand.label, cls: windBand.cls },
  };
}

function ratingPills(h) {
  const axes = axisRatings(h);
  const pill = (label, x) => `<span class="axis-pill ${x.cls}"><i></i><b>${label}</b>${x.label}</span>`;
  return `<div class="axis-pills">${pill('Swell', axes.swell)}${pill('Wind', axes.wind)}</div>`;
}

function windSimple(h, b) {
  const p = profileForHour(b, h);
  const off = angleDiff(h.windDir, (p.facing + 180) % 360);
  let direction;
  if (off < 50) direction = 'offshore';
  else if (off < 75) direction = 'cross-offshore';
  else if (off < 105) direction = 'cross-shore';
  else if (off < 130) direction = 'cross-onshore';
  else direction = 'onshore';

  let strength;
  if (h.windSpd < 8) strength = 'light';
  else if (h.windSpd < 18) strength = 'moderate';
  else if (h.windSpd < 28) strength = 'strong';
  else strength = 'howling';
  return `${strength} ${direction}`;
}

function swellApproach(h, b) {
  const p = profileForHour(b, h);
  const off = angleDiff(h.swellDir, p.facing);
  const pick = (arr, key) => arr[hashStr(`${b.id}|${h.time}|${key}`) % arr.length];
  if (off < 20) return pick([
    'straight-on for this spot',
    'square on the bank',
    'coming in pretty straight',
    'a bit shutdown-prone',
    'straight enough to close sections',
  ], 'approach-straight');
  if (off <= 55) return pick([
    'angled enough to run',
    'lined up with some wall',
    'coming in with a useful angle',
    'peeling enough to link a few',
    'running down the bank nicely',
  ], 'approach-run');
  if (off <= 90) return pick([
    'side-on and a little shifty',
    'running sideways and a bit cheeky',
    'angled but not perfectly organised',
    'a touch sideways with some wobble',
    'shifty but still worth watching',
  ], 'approach-side');
  return pick([
    'mostly wrapping in',
    'wrapping and losing a bit of punch',
    'bending in with less drive',
    'sneaking in around the corner',
    'a little soft from the wrap',
  ], 'approach-wrap');
}

function periodSimple(p, h, b) {
  const pick = (arr, key) => arr[hashStr(`${b.id}|${h.time}|${key}`) % arr.length];
  if (p >= 12) return pick([
    'long-period lines',
    'spaced-out groundswell',
    'properly spaced lines',
    'longer-period pulses',
    'cleaner pulses with time between sets',
    'organised groundswell lines',
  ], 'period-long');
  if (p >= 9) return pick([
    'decent spacing',
    'tidy spacing',
    'organised enough between sets',
    'fairly clean intervals',
    'enough period to stand up properly',
    'workable lines between the lulls',
  ], 'period-mid');
  if (p >= 7) return pick([
    'shorter-period peaks',
    'quick little pulses',
    'peaky shorter-period energy',
    'a quicker, punchier rhythm',
    'short-period runners',
    'a bit rushed between sets',
  ], 'period-short');
  return pick([
    'short, choppy spacing',
    'windy little chop lines',
    'messy short-period bumps',
    'stacked-up little peaks',
    'noisy windswell spacing',
    'short-period crumble',
  ], 'period-chop');
}

function swellSimple(h, b) {
  return `${sizeLabel(h.swellH, h.swellPer).text}; ${periodSimple(h.swellPer, h, b)}; ${swellApproach(h, b)}`;
}

function surfSummary(h, b) {
  return {
    wind: windSimple(h, b),
    swell: swellSimple(h, b),
  };
}

/* =========================================================================
   BOARD CALL — read the conditions AND the kind of break, then suggest what
   to wax up. Thresholds and pairings are deliberately simple; tune to taste.
   ========================================================================= */

// Work the break's character out of its note when it isn't set explicitly.
function inferBreakType(note = '') {
  const n = String(note).toLowerCase();
  if (/river\s?mouth/.test(n)) return 'rivermouth';
  if (/\breef\b/.test(n))      return 'reef';
  if (/\bpoint\b/.test(n))     return 'point';
  return 'beach';
}

// Locative words the phrasings drop in, so a point reads unlike a beachie.
function breakWords(t) {
  switch (t) {
    case 'point':      return { kind: 'point',      at: 'down the point' };
    case 'reef':       return { kind: 'reef',       at: 'over the reef' };
    case 'rivermouth': return { kind: 'rivermouth', at: 'at the rivermouth' };
    default:           return { kind: 'beachie',    at: 'on the bank' };
  }
}

// Groomed face? Offshore-ish and not blown out.
function isCleanSurface(b, h) {
  const w = windSimple(h, b);
  return /offshore/.test(w) && !/^(strong|howling)/.test(w);
}

// Which board the day is begging for. Reefs and points hold size and have
// more push, so they reach for the step-up a notch sooner than a beachie.
function boardCall(h, b) {
  const sz = +sizeLabel(h.swellH, h.swellPer).cls.slice(2); // 0 (flat) .. 7 (DOH+)
  const per = h.swellPer;
  const clean = isCleanSurface(b, h);
  const stepUpFrom = (b.breakType === 'reef' || b.breakType === 'point') ? 5 : 6;
  if (sz >= stepUpFrom)   return 'boardStepUp';    // overhead+ power → step-up
  if (sz <= 2 && clean)   return 'boardLongboard'; // small & clean → log
  if (per >= 11 && clean) return 'boardMidlength'; // long-period glass → midlength
  if (per < 8 || !clean)  return 'boardFish';      // short-period / mushy → fish
  return 'boardShortboard';                        // the everyday sweet spot
}

// One line — "just the saying" — for the best hour at a spot.
function renderBoardCall(b, h, day) {
  if (!h) return '';
  const bw = breakWords(b.breakType || inferBreakType(b.note));
  const line = phrase(boardCall(h, b), {
    size: sizeLabel(h.swellH, h.swellPer).text.toLowerCase(),
    wind: windSimple(h, b),
    at: bw.at,
    kind: bw.kind,
  }, `${b.id}|${day?.date || ''}|board`);
  return line ? `<p class="board-call"><span aria-hidden="true">🏄</span> ${line}</p>` : '';
}

function spokenSpotName(name) {
  return SPOKEN_OVERRIDES[name] || name;
}

function limitingFactor(b, h) {
  const co = components(b, h);
  const options = [
    { key: 'wind', cls: co.windDir.cls, text: co.windDir.cls === 'poor' ? 'wind is the spoiler' : `wind is ${windSimple(h, b)}` },
    { key: 'size', cls: co.size.cls === 'sz0' || co.size.cls === 'sz1' ? 'poor' : 'good', text: `${co.size.text} sets` },
    { key: 'shape', cls: co.peel.cls, text: `shape is ${co.peel.text.toLowerCase()}` },
    { key: 'surface', cls: co.clean.cls, text: `surface is ${co.clean.text.toLowerCase()}` },
  ];
  const rank = { poor: 0, avg: 1, good: 2 };
  options.sort((a, b) => (rank[a.cls] ?? 1) - (rank[b.cls] ?? 1));
  return options[0].text;
}

function reportQueue(day = STATE.days[STATE.dayIdx]) {
  if (!day) return [];
  const byId = Object.fromEntries(day.breaks.map(c => [c.break.id, c]));
  return PREFS.order
    .map(id => byId[id])
    .filter(c => c?.best && PREFS.favs.includes(c.break.id))
    .slice(0, 3);
}

function buildReportScript(day = STATE.days[STATE.dayIdx]) {
  const top = reportQueue(day);
  const intro = phrase('reportIntro', { day: day ? fmtDay(day.date) : 'today' }, day?.date || 'today');
  const spots = top.map(c => {
    const b = c.break, best = c.best;
    const size = sizeLabel(best.swellH, best.swellPer).text;
    const w = windowShort(daylightHours(c, day));
    return `${spokenSpotName(b.name)}. ${ratingWord(band(best.score).cls)}. ${size}, ${windSimple(best, b)}, ${w}. ${limitingFactor(b, best)}.`;
  });
  return [intro, ...spots].join(' ');
}

function audioLine(day = STATE.days[STATE.dayIdx]) {
  const q = reportQueue(day);
  const item = q[STATE.audio.spotIdx] || q[0];
  if (!item?.best) return 'Star spots to build your spoken report.';
  const b = item.break, h = item.best;
  return `${b.name}: ${sizeLabel(h.swellH, h.swellPer).text}, ${windSimple(h, b)}, ${windowShort(daylightHours(item, day))}.`;
}

function stopReport() {
  window.speechSynthesis?.cancel?.();
  STATE.audio.playing = false;
  STATE.audio.progress = 0;
  render();
}

function playReport() {
  if (!('speechSynthesis' in window)) return;
  if (!reportQueue().length) return;
  window.speechSynthesis.cancel();
  const script = buildReportScript();
  const utter = new SpeechSynthesisUtterance(script);
  const voices = window.speechSynthesis.getVoices?.() || [];
  const voice = voices.find(v => /en-ZA|en-GB/.test(v.lang));
  if (voice) utter.voice = voice;
  utter.rate = 1;
  utter.pitch = 1;
  const words = script.split(/\s+/).length || 1;
  utter.onstart = () => { STATE.audio.playing = true; STATE.audio.progress = 0.08; render(); };
  utter.onboundary = e => {
    if (e.name !== 'word') return;
    STATE.audio.progress = clamp((script.slice(0, e.charIndex).split(/\s+/).length || 1) / words, 0, 1);
    render();
  };
  utter.onend = () => { STATE.audio.playing = false; STATE.audio.progress = 1; render(); };
  utter.onerror = () => { STATE.audio.playing = false; render(); };
  window.speechSynthesis.speak(utter);
}

function renderAudioPlayer(cards, day) {
  const queue = reportQueue(day);
  if (!queue.length) {
    return `
      <section class="audio-card empty">
        <div class="audio-head"><span>Read the report</span></div>
        <b class="now-reading">Star your favourite spots to build the spoken forecast.</b>
      </section>`;
  }
  const playing = STATE.audio.playing;
  const pct = Math.round((STATE.audio.progress || 0) * 100);
  const items = queue.map((c, i) => {
    const b = c.break, h = c.best;
    return `<li class="${i === STATE.audio.spotIdx ? 'on' : ''}">
      <span>${i + 1}</span><b>${b.name}</b><em>${ratingWord(band(h.score).cls)}</em>
    </li>`;
  }).join('');
  return `
    <section class="audio-card">
      <div class="audio-head">
        <span>Read the report</span>
        <button class="audio-play" id="playReportBtn" type="button">${playing ? 'Pause' : 'Play'}</button>
      </div>
      <b class="now-reading">Now reading: ${audioLine(day)}</b>
      <div class="waveform" style="--progress:${pct}%"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
      <ol class="audio-queue">${items}</ol>
    </section>`;
}

/* =========================================================================
   ASK — answer plain questions like "is it good on Tuesday morning?" by parsing
   a day + time-of-day (+ optional spot) out of the text and reading the same
   scored forecast the cards use. No network, no LLM — pure local matching.
   ========================================================================= */

const fmtDayLong = date => {
  const lbl = fmtDay(date);
  if (lbl === 'Today') return 'today';
  if (lbl === 'Tmrw') return 'tomorrow';
  return new Date(date + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'long' });
};

const ASK_WINDOWS = [
  { re: /\b(dawn|sunrise|first light|daybreak|early)\b/,    label: 'at dawn',     from: 5,  to: 8  },
  { re: /\b(morning|am)\b/,                                 label: 'in the morning',   from: 6,  to: 11 },
  { re: /\b(midday|noon|lunch|middle of the day)\b/,        label: 'around midday',    from: 11, to: 14 },
  { re: /\b(afternoon|arvo|pm)\b/,                          label: 'in the afternoon', from: 12, to: 17 },
  { re: /\b(evening|sunset|sundowner|dusk|tonight|late)\b/, label: 'in the evening',   from: 15, to: 19 },
];

const ASK_DOW = [
  { re: /\bsun(day)?\b/,    d: 0 }, { re: /\bmon(day)?\b/,      d: 1 },
  { re: /\btues?(day)?\b/,  d: 2 }, { re: /\bwed(nesday)?\b/,   d: 3 },
  { re: /\bthur?s?(day)?\b/,d: 4 }, { re: /\bfri(day)?\b/,      d: 5 },
  { re: /\bsat(urday)?\b/,  d: 6 },
];

const ASK_LIMIT = {
  wind:    'the wind direction is off',
  speed:   'the wind’s too strong',
  swell:   'the swell angle isn’t lined up',
  surface: 'the surface will be bumpy',
  spacing: 'the swell lines are short and close together',
  size:    'the size isn’t ideal',
};

const ASK_SPOT_ALIASES = {
  scottburgh: ['scottborough', 'scottsborough', 'scottsburgh', 'scottburgh beach', 'scottburgh main'],
  northbeach: ['northbeach', 'durban north beach'],
};

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function askSpotTerms(b) {
  return [
    b.name,
    b.id,
    b.id.replace(/-/g, ' '),
    b.oceanEye,
    b.oceanEye ? b.oceanEye.replace(/-/g, ' ') : '',
    ...(ASK_SPOT_ALIASES[b.id] || []),
  ].filter(Boolean);
}

function findAskSpotIds(text) {
  const matches = [];
  BREAKS.forEach(b => {
    askSpotTerms(b).forEach(term => {
      const words = String(term).toLowerCase().trim().split(/\s+/).map(escapeRegExp);
      if (!words.length) return;
      const re = new RegExp(`\\b${words.join('\\s+')}\\b`, 'i');
      const m = text.match(re);
      if (m) matches.push({ id: b.id, idx: m.index, len: term.length });
    });
  });
  matches.sort((a, b) => a.idx - b.idx || b.len - a.len);
  const seen = new Set();
  return matches
    .filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; })
    .map(m => m.id);
}

function askTodayIdx() {
  const i = STATE.days.findIndex(d => fmtDay(d.date) === 'Today');
  return i < 0 ? 0 : i;
}

function findNextDow(dow, fromIdx) {
  for (let i = Math.max(0, fromIdx); i < STATE.days.length; i++) {
    if (new Date(STATE.days[i].date + 'T00:00:00').getDay() === dow) return i;
  }
  return -1;
}

function parseAsk(raw) {
  if (!STATE.days.length) return { error: 'Still loading the forecast — give it a second and ask again.' };
  const text = ' ' + raw.toLowerCase().trim() + ' ';

  // ---- spot (supports one or more named/aliased spots) ----
  const spotIds = findAskSpotIds(text);
  const spotId = spotIds[0] || null;

  // ---- time of day ----
  let window = null;
  let m = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);     // "6am", "6:30 pm"
  if (!m) m = text.match(/\bat\s+(\d{1,2})(?::00)?\b(?!\s*days?)/); // "at 7" (not "in 2 days")
  if (m) {
    let h = +m[1];
    const ap = m[3];
    if (ap === 'pm' && h < 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    if (h >= 0 && h <= 23) window = { label: `around ${String(h).padStart(2, '0')}:00`, from: Math.max(0, h - 1), to: h + 1 };
  }
  if (!window) for (const w of ASK_WINDOWS) if (w.re.test(text)) { window = { label: w.label, from: w.from, to: w.to }; break; }

  // ---- day ----
  const todayIdx = askTodayIdx();
  let dayIdx = null;
  const inN = text.match(/\bin (\d{1,2}) days?\b/);
  if (/\b(today|tonight|this morning|this afternoon|this evening|this arvo|now)\b/.test(text)) dayIdx = todayIdx;
  else if (/\b(day after tomorrow|overmorrow)\b/.test(text)) dayIdx = todayIdx + 2;
  else if (/\b(tomorrow|tmrw|tmw|tmoz)\b/.test(text)) dayIdx = todayIdx + 1;
  else if (inN) dayIdx = todayIdx + Math.min(20, +inN[1]);
  else if (/\bweekend\b/.test(text)) dayIdx = findNextDow(6, todayIdx);
  else for (const o of ASK_DOW) if (o.re.test(text)) { dayIdx = findNextDow(o.d, todayIdx); break; }
  if (dayIdx == null) dayIdx = todayIdx;

  if (dayIdx < 0 || dayIdx >= STATE.days.length) {
    const last = STATE.days[STATE.days.length - 1];
    return { error: `That's past my forecast — I can only see to ${fmtDayLong(last.date)} (${STATE.days.length} days out). Try a sooner day.` };
  }
  return { dayIdx, window, spotId, spotIds };
}

function askVerdict(score) {
  if (score >= 8.5) return { yn: 'Yes',        lead: 'pumping',      cls: 'epic' };
  if (score >= 7)   return { yn: 'Yes',        lead: 'looking good', cls: 'good' };
  if (score >= 5.5) return { yn: 'Maybe',      lead: 'rideable',     cls: 'okgood' };
  if (score >= 4)   return { yn: 'Not really', lead: 'marginal',     cls: 'fair' };
  return { yn: 'No', lead: 'not worth it', cls: 'poor' };
}

function answerAsk(p) {
  if (p.error) return { html: `<div class="ask-card poor"><div class="ask-verdict">${esc(p.error)}</div></div>` };
  const day = STATE.days[p.dayIdx];
  const spotIds = p.spotIds?.length ? p.spotIds : (p.spotId ? [p.spotId] : []);

  // candidates: named spots, else the user's favourites, else every spot
  let cards;
  if (spotIds.length) {
    const wanted = new Set(spotIds);
    cards = day.breaks.filter(c => wanted.has(c.break.id));
  }
  else {
    const favs = day.breaks.filter(c => PREFS.favs.includes(c.break.id));
    cards = favs.length ? favs : day.breaks;
  }

  const evals = cards.map(c => {
    let hrs = (c.light && c.light.length) ? c.light : c.dayHours;
    let outOfLight = false;
    if (p.window) {
      const win = hrs.filter(h => { const hr = +h.time.slice(11, 13); return hr >= p.window.from && hr <= p.window.to; });
      if (win.length) hrs = win; else outOfLight = true;   // window outside daylight → fall back
    }
    let bestH = null;
    hrs.forEach(h => { if (!bestH || h.score > bestH.score) bestH = h; });
    return { card: c, bestH, outOfLight };
  }).filter(e => e.bestH);

  if (!evals.length) return { html: `<div class="ask-card poor"><div class="ask-verdict">No forecast for that spot and day.</div></div>` };
  evals.sort((a, b) => b.bestH.score - a.bestH.score);

  const top = evals[0];
  const b = top.card.break;
  const h = top.bestH;
  const v = askVerdict(h.score);
  const read = surfSummary(h, b);
  const size = sizeLabel(h.swellH, h.swellPer).text;
  const when = `${fmtDayLong(day.date)}${(p.window && !top.outOfLight) ? ' ' + p.window.label : ''}`;
  const namedSpots = spotIds
    .map(id => BREAKS.find(x => x.id === id)?.name)
    .filter(Boolean);
  const spotPhrase = spotIds.length === 1
    ? b.name
    : spotIds.length > 1
      ? `${b.name} (best of ${namedSpots.join(' / ')})`
      : `${b.name}${evals.length > 1 ? ' (your best bet)' : ''}`;

  let why = '';
  if (h.score < 7) {
    const fs = factorScores(b, h);
    let worst = 'wind';
    ['wind', 'speed', 'swell', 'surface', 'spacing', 'size'].forEach(k => { if (fs[k] < fs[worst]) worst = k; });
    why = ` — ${ASK_LIMIT[worst]}`;
  }

  return {
    html: `
      <div class="ask-card ${v.cls}">
        <div class="ask-verdict"><b>${v.yn}</b> — ${esc(spotPhrase)} is ${v.lead} ${esc(when)}${why}.</div>
        <div class="ask-detail">${esc(size)} · ${esc(read.wind)} · ${esc(read.swell)}</div>
        <div class="ask-peak">Best around ${fmtTime(h.time)} · ${ratingWord(band(h.score).cls)}</div>
        ${top.outOfLight ? `<div class="ask-note">That time's after dark — showing the daylight read instead.</div>` : ''}
        <button class="ask-view" type="button" data-ask-day="${p.dayIdx}" data-ask-spot="${esc(b.id)}">View ${fmtDay(day.date)} forecast →</button>
      </div>`,
  };
}

function runAsk(raw) {
  const ansEl = $('#askAnswer');
  if (!ansEl) return;
  if (!raw.trim()) { ansEl.hidden = true; ansEl.innerHTML = ''; return; }
  ansEl.hidden = false;
  ansEl.innerHTML = answerAsk(parseAsk(raw)).html;
  const view = ansEl.querySelector('.ask-view');
  if (view) view.onclick = () => {
    STATE.dayIdx = +view.dataset.askDay;
    STATE.expanded = view.dataset.askSpot;
    if (!PREFS.favs.includes(view.dataset.askSpot) && PREFS.view !== 'spots') { PREFS.view = 'spots'; savePrefs(); }
    render();
    const card = document.querySelector(`.break-card[data-id="${CSS.escape(view.dataset.askSpot)}"]`);
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
}

function setupAsk() {
  const form = $('#askForm');
  if (!form || form.dataset.wired) return;
  form.dataset.wired = '1';
  const input = $('#askInput');
  const clear = $('#askClear');
  const answer = $('#askAnswer');
  const syncClear = () => {
    if (clear) clear.hidden = !input.value.trim() && (!answer || answer.hidden);
  };
  const ask = () => { runAsk(input.value); syncClear(); };
  form.onsubmit = e => { e.preventDefault(); ask(); };
  input.oninput = syncClear;
  if (clear) clear.onclick = () => {
    input.value = '';
    runAsk('');
    syncClear();
    input.focus();
  };
  document.querySelectorAll('.ask-eg').forEach(ch => ch.onclick = () => { input.value = ch.textContent; ask(); });
  syncClear();
}

function renderTabs() {
  const nav = $('#dayTabs');
  nav.innerHTML = STATE.days.map((d, i) =>
    `<button class="day-tab ${i === STATE.dayIdx ? 'active' : ''}" data-day="${i}">
       <span class="dt-name">${fmtDay(d.date)}</span>
       <span class="dt-date">${d.date.slice(8)}/${d.date.slice(5,7)}</span>
     </button>`).join('');
  nav.querySelectorAll('.day-tab').forEach(btn =>
    btn.onclick = () => { STATE.dayIdx = +btn.dataset.day; render(); });
}

function renderViewTabs() {
  document.querySelectorAll('.view-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === PREFS.view);
    btn.onclick = () => {
      PREFS.view = btn.dataset.view;
      STATE.expanded = null;
      savePrefs();
      render();
    };
  });
}

function spotRegions() {
  return ['all', ...[...new Set(BREAKS.map(b => b.region))].sort()];
}

function renderControls() {
  const el = $('#controls');
  const onSpots = PREFS.view === 'spots';
  const regions = spotRegions();
  el.innerHTML = onSpots ? `<div class="spot-filters">
      <label class="search-field"><span>Search</span><input id="spotSearch" value="${esc(PREFS.spotSearch)}" placeholder="Find a spot"></label>
      <label class="search-field region-field"><span>Region</span><select id="regionFilter">
        ${regions.map(r => `<option value="${esc(r)}" ${PREFS.regionFilter === r ? 'selected' : ''}>${r === 'all' ? 'All regions' : esc(r)}</option>`).join('')}
      </select></label>
    </div>` : '';
  const search = $('#spotSearch');
  if (search) search.oninput = () => {
    PREFS.spotSearch = search.value;
    savePrefs();
    renderBreaks();
  };
  const regionFilter = $('#regionFilter');
  if (regionFilter) regionFilter.onchange = () => {
    PREFS.regionFilter = regionFilter.value;
    savePrefs();
    renderBreaks();
  };
}

function moveBreak(id, dir) {
  const i = PREFS.order.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= PREFS.order.length) return;
  [PREFS.order[i], PREFS.order[j]] = [PREFS.order[j], PREFS.order[i]];
  savePrefs(); render();
}

function surfHeadline(card, day) {
  if (!card?.best) return 'Keep an eye on the wind.';
  const b = card.break;
  const h = card.best;
  const size = sizeLabel(h.swellH, h.swellPer).text.toLowerCase();
  const read = surfSummary(h, b);
  const seed = `${b.id}|${day?.date || ''}`;
  if (h.score >= 7) return phrase('headlineGood', { spot: b.name, size, wind: read.wind }, seed);
  if (h.score >= 5.5) return phrase('headlineOk', { spot: b.name, size, wind: read.wind }, seed);
  return phrase('headlinePoor', { spot: b.name, size, wind: read.wind }, seed);
}

function renderHomeRead(cards, day) {
  const top = cards[0];
  if (!top?.best) return '';
  const h = top.best;
  const b = top.break;
  const read = surfSummary(h, b);
  return `
    <section class="home-read">
      <span class="eyebrow">Daily surf read · ${fmtDay(day.date)} ${day.date.slice(8)}/${day.date.slice(5, 7)}</span>
      <h2>${surfHeadline(top, day)}</h2>
      <p>${phrase('summary', {
        spot: b.name,
        window: windowShort(daylightHours(top, day)).toLowerCase(),
        wind: read.wind,
        swell: read.swell,
      }, `${b.id}|${day?.date || ''}`)}</p>
      ${renderBoardCall(b, h, day)}
      <div class="today-strip">
        <div><span>Best window</span><b>${windowShort(daylightHours(top, day))}</b></div>
        <div><span>Wind</span><b>${read.wind}</b></div>
        <div><span>Swell</span><b>${read.swell}</b></div>
        <div><span>Model agreement</span><b class="${h.conf?.cls || ''}">${confText(h)}</b></div>
      </div>
    </section>`;
}

// Confidence wording from the multi-model spread (blank when only one model ran).
function confText(h) {
  const c = h?.conf;
  if (!c || c.cls === 'conf-unknown') return 'single model';
  return `${c.label}${c.n ? ` · ${c.n} models` : ''}`;
}
function confBadge(h) {
  const c = h?.conf;
  if (!c || c.cls === 'conf-unknown') return '';
  return `<span class="conf-badge ${c.cls}" title="Agreement across ${c.n} forecast models">${c.label} confidence</span>`;
}

function renderSpotOverview(c, b, cur, day, tide) {
  const co = components(b, cur);
  const bnd = band(cur.score);
  const read = surfSummary(cur, b);
  const hours = c.dayHours || [];
  const slotWindows = [[4, 6], [6, 8], [8, 10], [10, 12], [12, 14], [14, 16], [16, 18]];
  const slots = [];
  const isToday = fmtDay(day.date) === 'Today';
  const curHour = cur ? +cur.time.slice(11, 13) : null;
  slotWindows.forEach(([start, end]) => {
    const block = hours.filter(h => {
      const hr = +h.time.slice(11, 13);
      return hr >= start && hr < end;
    });
    if (!block.length) return;
    const avg = block.reduce((sum, h) => sum + h.score, 0) / block.length;
    const first = block[0];
    const isNow = isToday && curHour >= start && curHour < end;
    const displayScore = isNow ? cur.score : avg;
    const cls = displayScore >= 8.5 ? 'best'
      : displayScore >= 7 ? 'good'
      : displayScore >= 5.5 ? 'ok'
      : displayScore >= 4 ? 'watch'
      : 'poor';
    const slotRead = surfSummary(isNow ? cur : first, b);
    slots.push(`
      <article class="slot ${cls} ${isNow ? 'now' : ''}">
        <time>${String(start).padStart(2, '0')}-${String(end).padStart(2, '0')}</time>
        <div>
          <b>${ratingWord(band(displayScore).cls)}${isNow ? '<small class="slot-now">Now</small>' : ''}</b>
          <span><strong>Wind:</strong> ${slotRead.wind}</span>
          <span><strong>Swell:</strong> ${slotRead.swell}</span>
        </div>
      </article>`);
  });
  const firstLight = day?.sunrise ? shiftTime(day.sunrise, -30) : null;
  const sunrise = day?.sunrise ? fmtTime(day.sunrise) : null;
  const sunset = day?.sunset ? fmtTime(day.sunset) : null;
  return `
    <section class="quick-read">
      <span>Quick overview</span>
      <h3>${ratingWord(bnd.cls)}: ${co.size.text} with ${read.wind} wind.</h3>
      <p>${windowShort(daylightHours(c, day))}. Swell is ${read.swell}, with ${co.clean.text.toLowerCase()} surface.</p>
      ${renderBoardCall(b, cur, day)}
      ${ratingPills(cur)}
      ${confBadge(cur)}
    </section>
    <section class="two-hour-overview" aria-label="Two hour overview">
      ${firstLight ? `<div class="sun-time first-light">First light ${firstLight}</div>` : ''}
      ${sunrise ? `<div class="sun-time sunrise">Sunrise ${sunrise}</div>` : ''}
      ${slots.join('')}
      ${sunset ? `<div class="sun-time sunset">Sunset ${sunset}</div>` : ''}
    </section>
    ${tide ? `<section class="tide-overview"><div class="detail-sub">Tide</div>${tide}</section>` : ''}
    <section class="detail-report">
      <div class="report-title">
        <h3>Detailed report</h3>
      </div>
    </section>`;
}

function renderSpotDayStrip(b) {
  const days = STATE.days.map((day, i) => ({
    day,
    i,
    card: day.breaks.find(c => c.break.id === b.id),
  })).filter(x => x.card?.best);
  if (days.length < 2) return '';
  return `
    <section class="spot-days" aria-label="${esc(b.name)} forecast days">
      <div class="spot-days-head">
        <span>Same spot</span>
        <b>${esc(b.name)}</b>
      </div>
      <div class="spot-day-list">
        ${days.map(({ day, i, card }) => {
          const best = card.best;
          const bnd = band(best.score);
          return `
            <button class="spot-day ${i === STATE.dayIdx ? 'active' : ''}" type="button"
              data-spot-day="${i}" data-spot-id="${esc(b.id)}">
              <span>${fmtDay(day.date)} ${day.date.slice(8)}/${day.date.slice(5, 7)}</span>
              <b>${ratingWord(bnd.cls)}</b>
              <em>${sizeLabel(best.swellH, best.swellPer).text} · ${windowShort(daylightHours(card, day))}</em>
            </button>`;
        }).join('')}
      </div>
    </section>`;
}

function renderBreaks() {
  const day = STATE.days[STATE.dayIdx];
  const list = $('#breakList');
  const isToday = fmtDay(day.date) === 'Today';
  const isHome = PREFS.view !== 'spots';
  const showReorder = !isHome;

  // Home uses the user's saved order and keeps its daily read scoped to favourites.
  const byId = Object.fromEntries(day.breaks.map(c => [c.break.id, c]));
  const orderedCards = PREFS.order.map(id => byId[id]).filter(Boolean);
  let cards = [...orderedCards];
  const isFav = id => PREFS.favs.includes(id);
  if (isHome) {
    cards = cards.filter(c => isFav(c.break.id));
  } else {
    const q = PREFS.spotSearch.trim().toLowerCase();
    cards = cards.filter(c => {
      const b = c.break;
      const regionOk = PREFS.regionFilter === 'all' || b.region === PREFS.regionFilter;
      const haystack = `${b.name} ${b.region} ${b.zone || ''}`.toLowerCase();
      return regionOk && (!q || haystack.includes(q));
    });
  }
  if (STATE.expanded) {
    const selected = orderedCards.find(c => c.break.id === STATE.expanded);
    if (selected && (!isHome || isFav(selected.break.id))) cards = [selected, ...cards.filter(c => c.break.id !== STATE.expanded)];
  }
  const readPool = isHome ? cards : day.breaks;
  const recommendedCards = [...readPool]
    .filter(c => c?.best)
    .sort((a, b) => (b.best?.score ?? 0) - (a.best?.score ?? 0));

  if (!cards.length) {
    list.innerHTML = isHome ? `
      ${renderHomeRead(recommendedCards, day)}
      ${renderAudioPlayer([], day)}
      <section class="empty-state">
        <h2>Your Home is ready</h2>
        <p>Star spots from All Spots and they will live here.</p>
        <button class="cam-btn primary" id="showAllSpots" type="button">Browse all spots</button>
      </section>` : `
      <section class="empty-state">
        <h2>No spots found</h2>
        <p>Try a different search or region.</p>
      </section>`;
    const showAll = $('#showAllSpots');
    if (showAll) showAll.onclick = () => { PREFS.view = 'spots'; savePrefs(); render(); };
    return;
  }

  const intro = isHome ? renderHomeRead(recommendedCards, day) + renderAudioPlayer(cards, day) : '';
  list.innerHTML = intro + cards.map(c => {
    const b = c.break;
    // current reading if today, otherwise the day's best window
    const cur = isToday ? c.dayHours[nowIndex(c.dayHours)] : c.best;
    if (!cur) return '';
    const bnd = band(cur.score);
    const co = components(b, cur);
    const bestTxt = windowShort(daylightHours(c, day));
    const expanded = STATE.expanded === b.id;
    const readLabel = isToday ? `Now ${fmtTime(cur.time)}` : `Best ${fmtTime(cur.time)}`;
    const windLabel = isToday ? 'Now wind' : 'Best wind';

    return `
    <article class="break-card ${expanded ? 'open' : ''}" data-id="${b.id}">
      <div class="card-head">
        <div class="card-main">
          <div class="bname">
            <button class="fav ${isFav(b.id) ? 'on' : ''}" data-fav aria-label="Pin to top">${isFav(b.id) ? '★' : '☆'}</button>
            <span class="spot-title">${b.name}</span> <span class="region">${b.region}</span>
            ${b.camStatus ? `<span class="cam-status ${b.camStatus === 'Online' ? 'online' : 'repair'}">${esc(b.camStatus)}</span>` : ''}
            ${b.oceanEye ? `<a class="cam-ico" data-cam href="https://oceaneye.co.za/spots/${b.oceanEye}/" target="_blank" rel="noopener" title="Live cam (Ocean Eye)" aria-label="Live cam">📹</a>` : ''}
          </div>
          <div class="swell-line">${readLabel} · Wind: ${surfSummary(cur, b).wind} · Swell: ${surfSummary(cur, b).swell}</div>
          ${ratingPills(cur)}
          <div class="comp-grid">
            ${compChip('Size', co.size)}
            ${compChip(windLabel, co.windDir)}
            ${compChip('Speed', co.windSpd)}
            ${compChip('Swell', co.peel)}
            ${compChip('Surface', co.clean)}
            ${compChip('Spacing', co.spacing)}
          </div>
        </div>
        <div class="card-side">
          ${showReorder ? `<div class="reorder">
              <button class="rbtn" data-move="up" aria-label="Move up">▲</button>
              <button class="rbtn" data-move="down" aria-label="Move down">▼</button>
            </div>` : `<span class="best">${bestTxt}</span>`}
          <span class="chev">${expanded ? '▴' : '▾'}</span>
        </div>
      </div>
      ${expanded ? renderDetail(c, b, cur, isToday, day) : ''}
    </article>`;
  }).join('');

  // stash the open card's day data for the metric-graph taps
  STAT_DETAIL = null;
  if (STATE.expanded) {
    const oc = cards.find(c => c.break.id === STATE.expanded);
    if (oc) {
      const ocur = isToday ? oc.dayHours[nowIndex(oc.dayHours)] : oc.best;
      if (ocur) STAT_DETAIL = { id: oc.break.id, hours: daylightHours(oc, day), cur: ocur, isToday };
    }
  }

  list.querySelectorAll('.break-card').forEach(card => {
    const id = card.dataset.id;
    card.querySelector('.card-head').onclick = () => {
      STATE.expanded = STATE.expanded === id ? null : id;
      render();
    };
    card.querySelectorAll('.rbtn').forEach(btn => btn.onclick = e => {
      e.stopPropagation();
      moveBreak(id, btn.dataset.move === 'up' ? -1 : 1);
    });
    const fav = card.querySelector('[data-fav]');
    if (fav) fav.onclick = e => { e.stopPropagation(); toggleFav(id); };

    // tap a stat block → toggle a graph of that value through the day
    const statBtns = card.querySelectorAll('[data-metric]');
    statBtns.forEach(btn => btn.onclick = e => {
      e.stopPropagation();
      const wrap = card.querySelector('[data-stat-graph]');
      if (!wrap || !STAT_DETAIL || STAT_DETAIL.id !== id) return;
      const key = btn.dataset.metric;
      const isOpen = wrap.dataset.open === key && !wrap.hidden;
      statBtns.forEach(x => x.classList.remove('active'));
      if (isOpen) { wrap.hidden = true; wrap.dataset.open = ''; wrap.innerHTML = ''; return; }
      wrap.hidden = false;
      wrap.dataset.open = key;
      btn.classList.add('active');
      wrap.innerHTML = metricGraph(STAT_DETAIL.hours, key, STAT_DETAIL.cur, STAT_DETAIL.isToday);
    });
    // let the cam link open in a new tab without toggling the card
    const cam = card.querySelector('[data-cam]');
    if (cam) cam.onclick = e => e.stopPropagation();
    // pop the cam out into its own signed-in window, docked to the right
    const pop = card.querySelector('[data-popcam]');
    if (pop) pop.onclick = () => {
      const w = 540, h = 680;
      const left = Math.max(0, (screen.availWidth || 1280) - w - 20);
      window.open(pop.dataset.popcam, 'oceaneye_cam',
        `popup=yes,width=${w},height=${h},left=${left},top=80`);
    };
  });
  list.querySelectorAll('[data-spot-day]').forEach(btn => btn.onclick = e => {
    e.stopPropagation();
    STATE.dayIdx = +btn.dataset.spotDay;
    STATE.expanded = btn.dataset.spotId;
    render();
  });
  const playBtn = $('#playReportBtn');
  if (playBtn) playBtn.onclick = e => {
    e.stopPropagation();
    if (STATE.audio.playing) stopReport(); else playReport();
  };
}

function renderDetail(c, b, cur, isToday, day) {
  /* --- hard numbers --- */
  // A stat block. Pass a metric key to make it tappable — it opens a graph of
  // that value across the day (wired up in renderBreaks).
  const stat = (k, v, metric) => metric
    ? `<button class="stat tappable" type="button" data-metric="${metric}" title="Tap to graph ${k.toLowerCase()} through the day"><span class="sk">${k}</span><span class="sv">${v}</span></button>`
    : `<div class="stat"><span class="sk">${k}</span><span class="sv">${v}</span></div>`;
  const stats = `
    <div class="stat-grid">
      ${stat('Swell', `${cur.swellH.toFixed(1)} m`, 'swellH')}
      ${stat('Period', `${Math.round(cur.swellPer)} s`, 'swellPer')}
      ${stat('Swell dir', `${compass(cur.swellDir)} ${Math.round(cur.swellDir)}°`, 'swellDir')}
      ${stat('Total sea', `${cur.waveH.toFixed(1)} m`, 'waveH')}
      ${stat('Wind', `${compass(cur.windDir)} ${Math.round(cur.windSpd)} km/h`, 'windSpd')}
      ${stat('Gusts', `${Math.round(cur.gust)} km/h`, 'gust')}
      ${stat('Water', cur.waterTemp != null ? `${Math.round(cur.waterTemp)}°C` : '—', cur.waterTemp != null ? 'waterTemp' : null)}
      ${stat('Tide now', cur.tide != null ? `${cur.tide.toFixed(1)} m` : '—', cur.tide != null ? 'tide' : null)}
      ${stat('Window', windowShort(daylightHours(c, day)))}
    </div>
    <div class="stat-hint">Tap any value above to see how it changes through the day.</div>
    <div class="stat-graph" data-stat-graph hidden></div>`;

  /* --- tide mini-graph for the day --- */
  const tide = tideGraph(c, cur, isToday);

  /* --- hour-by-hour table, TRANSPOSED so time runs along the x-axis (factors as
         rows), matching the factor matrix --- */
  const thours = daylightHours(c, day);
  const tcomps = thours.map(h => components(b, h));
  const thead = `<tr><th class="rl">Time</th>${thours.map(h => `<th>${fmtTime(h.time)}</th>`).join('')}</tr>`;
  const trow = (label, key) =>
    `<tr><td class="rl">${label}</td>${tcomps.map(x => `<td class="${x[key].cls}">${x[key].text}</td>`).join('')}</tr>`;
  const table = `
    <div class="hr-table-wrap">
      <table class="hr-table hr-wide">
        <thead>${thead}</thead>
        <tbody>
          ${trow('Size', 'size')}
          ${trow('Wind', 'windDir')}
          ${trow('Speed', 'windSpd')}
          ${trow('Swell', 'peel')}
          ${trow('Surface', 'clean')}
          ${trow('Spacing', 'spacing')}
        </tbody>
      </table>
    </div>`;

  /* --- conditions-through-the-day graph + factor breakdown --- */
  const graph = qualityGraph(c, b, day, cur, isToday);
  const matrix = factorMatrix(c, b, day);

  const daylight = (day?.sunrise && day?.sunset)
    ? `☀ ${fmtTime(day.sunrise)} – ${fmtTime(day.sunset)}` : '';

  return `
    <div class="detail">
      ${stats}
      ${renderSpotOverview(c, b, cur, day, tide)}
      ${camPanel(b)}
      ${graph}
      ${matrix}
      <div class="detail-sub">Hour by hour</div>
      ${table}
      <div class="detail-meta">
        <div><b>Faces</b> ${compass(profileForHour(b, cur).facing)} (${Math.round(profileForHour(b, cur).facing)}°) · <b>Offshore</b> ${compass((profileForHour(b, cur).facing + 180) % 360)} ${daylight ? '· ' + daylight : ''}</div>
        <div class="note">${b.note}</div>
      </div>
      ${renderSpotDayStrip(b)}
    </div>`;
}

/* daylight hours for a break-day */
function daylightHours(c, day) {
  const srH = day?.sunrise ? +day.sunrise.slice(11, 13) : 5;
  const ssH = day?.sunset ? +day.sunset.slice(11, 13) : 18;
  return c.dayHours.filter(h => { const hr = +h.time.slice(11, 13); return hr >= srH && hr <= ssH; });
}

/* TAPPABLE STAT METRICS — each maps a per-hour data key to how it's drawn and
   labelled when the user taps the stat block to see it across the day. */
const STAT_METRICS = {
  swellH:    { label: 'Swell height',    color: '#1f9c83', fmt: v => `${v.toFixed(1)} m`,        axis: v => v.toFixed(1) },
  swellPer:  { label: 'Period',          color: '#2d7dd2', fmt: v => `${Math.round(v)} s`,       axis: v => Math.round(v) },
  swellDir:  { label: 'Swell direction', color: '#7b61ff', dir: true, fmt: v => `${compass(v)} ${Math.round(v)}°`, axis: v => `${Math.round(v)}°` },
  waveH:     { label: 'Total sea',       color: '#0d6b4f', fmt: v => `${v.toFixed(1)} m`,        axis: v => v.toFixed(1) },
  windSpd:   { label: 'Wind speed',      color: '#d7855d', fmt: v => `${Math.round(v)} km/h`,    axis: v => Math.round(v) },
  gust:      { label: 'Gusts',           color: '#e6973a', fmt: v => `${Math.round(v)} km/h`,    axis: v => Math.round(v) },
  waterTemp: { label: 'Water temp',      color: '#d94f45', fmt: v => `${Math.round(v)}°C`,       axis: v => Math.round(v) + '°' },
  tide:      { label: 'Tide',            color: '#2d7dd2', fmt: v => `${v.toFixed(1)} m`,         axis: v => v.toFixed(1) },
};

/* Line graph of a single metric across the day's daylight hours. Returns an SVG
   string, drawn on tap of a stat block. Auto-scales the y-axis to the data. */
function metricGraph(hours, key, cur, isToday) {
  const cfg = STAT_METRICS[key];
  if (!cfg) return '';
  const pts = hours
    .map(h => ({ time: h.time, v: h[key] }))
    .filter(p => p.v != null && !Number.isNaN(p.v));
  if (pts.length < 3) return `<div class="mg-empty">Not enough data to graph ${cfg.label.toLowerCase()} today.</div>`;

  const vals = pts.map(p => p.v);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (max - min < 1e-6) { max += 1; min -= 1; }          // flat-line guard
  const padV = (max - min) * 0.15;
  min -= padV; max += padV;
  const span = max - min || 1;

  const W = 700, H = 165, padL = 48, padR = 14, padTop = 26, padBot = 26;
  const plotW = W - padL - padR, plotH = H - padTop - padBot, baseY = padTop + plotH;
  const X = i => padL + (pts.length === 1 ? plotW / 2 : i / (pts.length - 1) * plotW);
  const Y = v => padTop + (1 - (v - min) / span) * plotH;

  const line = pts.map((p, i) => `${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ');
  const area = `${padL},${baseY.toFixed(1)} ${line} ${(padL + plotW).toFixed(1)},${baseY.toFixed(1)}`;

  // y grid + axis labels at low / mid / high
  const axis = [max - padV, (max + min) / 2, min + padV].map(v =>
    `<line x1="${padL}" y1="${Y(v).toFixed(1)}" x2="${W - padR}" y2="${Y(v).toFixed(1)}" class="mg-grid"/>
     <text x="${padL - 6}" y="${(Y(v) + 4).toFixed(1)}" class="mg-axis" text-anchor="end">${cfg.axis(v)}</text>`
  ).join('');

  const ticks = pts.map((p, i) => ({ p, i }))
    .filter(o => +o.p.time.slice(11, 13) % 3 === 0)
    .map(o => `<text x="${X(o.i).toFixed(1)}" y="${H - 6}" class="mg-tick" text-anchor="middle">${o.p.time.slice(11, 13)}h</text>`)
    .join('');

  const dots = pts.map((p, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="2.2" class="mg-dot" style="fill:${cfg.color}"/>`).join('');

  let nowM = '';
  if (isToday) {
    const ni = pts.findIndex(p => p.time === cur.time);
    if (ni >= 0) {
      const nx = X(ni).toFixed(1);
      nowM = `<line x1="${nx}" y1="${(padTop - 6).toFixed(1)}" x2="${nx}" y2="${baseY.toFixed(1)}" class="mg-now"/>
        <circle cx="${nx}" cy="${Y(pts[ni].v).toFixed(1)}" r="4" class="mg-nowpt" style="fill:${cfg.color}"/>
        <text x="${nx}" y="${(padTop - 11).toFixed(1)}" class="mg-nowt" text-anchor="middle">now</text>`;
    }
  }

  const hi = pts.reduce((a, p) => (p.v > a.v ? p : a), pts[0]);
  const lo = pts.reduce((a, p) => (p.v < a.v ? p : a), pts[0]);
  const curVal = cur[key] != null && !Number.isNaN(cur[key]) ? cfg.fmt(cur[key]) : '—';

  return `
    <div class="mg-head">
      <span class="mg-title"><i style="background:${cfg.color}"></i>${cfg.label} through the day</span>
      <span class="mg-cur">${isToday ? 'Now' : 'Best'}: ${curVal}</span>
    </div>
    <svg class="mg-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${cfg.label} by time of day">
      ${axis}
      <polyline points="${area}" class="mg-area" style="fill:${cfg.color}"/>
      <polyline points="${line}" class="mg-line" style="stroke:${cfg.color}"/>
      ${dots}${nowM}${ticks}
    </svg>
    <div class="mg-foot">High ${cfg.fmt(hi.v)} at ${fmtTime(hi.time)} · Low ${cfg.fmt(lo.v)} at ${fmtTime(lo.time)}</div>`;
}

/* CONDITIONS THROUGH THE DAY — a quality curve (0–10) across daylight so you can
   read the SHAPE of the day against your own schedule: when it's good, and how
   long it holds. No single "best hour" — you decide based on when you can get there. */
function qualityGraph(c, b, day, cur, isToday) {
  const hours = daylightHours(c, day);
  if (hours.length < 3) return '';

  const N = hours.length;
  const W = 760, H = 245, padL = 72, padR = 18, padTop = 18, padBot = 34;
  const plotW = W - padL - padR;
  const plotH = H - padTop - padBot;
  const x = i => padL + (N === 1 ? plotW / 2 : i / (N - 1) * plotW);
  const y = score => padTop + (1 - clamp(score, 0, 10) / 10) * plotH;
  const scores = hours.map(h => factorScores(b, h));

  const bands = [
    { from: 8.5, to: 10,  label: 'Excellent', cls: 'excellent' },
    { from: 7.0, to: 8.5, label: 'Good',      cls: 'good' },
    { from: 5.5, to: 7.0, label: 'OK',        cls: 'ok' },
    { from: 4.0, to: 5.5, label: 'Fair',      cls: 'fair' },
    { from: 0.0, to: 4.0, label: 'Poor',      cls: 'poor' },
  ];

  const bandRects = bands.map(band => {
    const yy = y(band.to);
    const hh = y(band.from) - y(band.to);
    return `<rect x="${padL}" y="${yy.toFixed(1)}" width="${plotW}" height="${hh.toFixed(1)}" class="q-band ${band.cls}"/>`;
  }).join('');

  const yAxis = bands.map(band => {
    const yy = (y(band.from) + y(band.to)) / 2 + 4;
    return `<text x="${padL - 8}" y="${yy.toFixed(1)}" class="q-ylabel" text-anchor="end">${band.label}</text>`;
  }).join('') + [4, 5.5, 7, 8.5].map(v =>
    `<line x1="${padL}" y1="${y(v).toFixed(1)}" x2="${W - padR}" y2="${y(v).toFixed(1)}" class="q-grid"/>`
  ).join('');

  const ticks = hours.map((h, i) => {
    const hr = +h.time.slice(11, 13);
    const tick = hr % 2 === 0 ? `<text x="${x(i).toFixed(1)}" y="${H - 8}" class="q-tick" text-anchor="middle">${hr}h</text>` : '';
    return `${tick}<line x1="${x(i).toFixed(1)}" y1="${padTop}" x2="${x(i).toFixed(1)}" y2="${H - padBot}" class="q-vgrid"/>`;
  }).join('');

  const series = [
    { key: 'wind',    label: 'Wind dir',    colour: '#49a7ff', width: 2.0, dash: '' },
    { key: 'speed',   label: 'Wind speed',  colour: '#8ad7ff', width: 2.0, dash: '5 4' },
    { key: 'swell',   label: 'Swell',       colour: '#36d399', width: 2.0, dash: '' },
    { key: 'surface', label: 'Surface',     colour: '#b6f36c', width: 2.0, dash: '' },
    { key: 'spacing', label: 'Spacing',     colour: '#ffd166', width: 2.0, dash: '4 4' },
    { key: 'size',    label: 'Size',        colour: '#ff8a5c', width: 2.0, dash: '' },
  ];

  const lines = series.map(s => {
    const pts = scores.map((sc, i) => `${x(i).toFixed(1)},${y(sc[s.key]).toFixed(1)}`).join(' ');
    const dash = s.dash ? `stroke-dasharray:${s.dash};` : '';
    return `<polyline points="${pts}" class="q-varline ${s.key}" style="stroke:${s.colour};stroke-width:${s.width};${dash}"/>`;
  }).join('');

  let nowM = '';
  if (isToday) {
    const ni = hours.findIndex(h => h.time === cur.time);
    if (ni >= 0) {
      const nx = x(ni).toFixed(1);
      nowM = `<line x1="${nx}" y1="${padTop}" x2="${nx}" y2="${H - padBot}" class="q-now"/>
        <text x="${nx}" y="${padTop - 5}" class="q-nowt" text-anchor="middle">now</text>`;
    }
  }

  const legend = series.map(s =>
    `<span class="q-legend-item"><i style="background:${s.colour}"></i>${s.label}</span>`
  ).join('');

  return `
    <div class="detail-sub">Condition overlap graph</div>
    <div class="go-cap">${overlapSummary(hours, scores)}</div>
    <svg class="q-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Surf conditions by time">
      ${bandRects}${ticks}${yAxis}
      <line x1="${padL}" y1="${padTop}" x2="${padL}" y2="${H - padBot}" class="q-axis"/>
      <line x1="${padL}" y1="${H - padBot}" x2="${W - padR}" y2="${H - padBot}" class="q-axis"/>
      ${lines}${nowM}
    </svg>
    <div class="q-legend">${legend}</div>
    <div class="go-legend">Use the lines to see which factor is helping or spoiling each hour.</div>`;
}

function overlapWindow(hours, scores, threshold) {
  let bestStart = -1, bestEnd = -1, curStart = -1;
  for (let i = 0; i <= scores.length; i++) {
    if (i < scores.length && scores[i].aligned >= threshold) {
      if (curStart < 0) curStart = i;
    } else if (curStart >= 0) {
      if (i - curStart > bestEnd - bestStart) { bestStart = curStart; bestEnd = i; }
      curStart = -1;
    }
  }
  if (bestStart < 0) return null;
  const start = fmtTime(hours[bestStart].time);
  const endHr = +hours[bestEnd - 1].time.slice(11, 13) + 1;
  return { start, end: `${String(endHr).padStart(2, '0')}:00`, dur: bestEnd - bestStart };
}

function overlapSummary(hours, scores) {
  const good = overlapWindow(hours, scores, 7);
  if (good) return `🟢 <b>All lined up ${good.start}–${good.end}</b> (~${good.dur}h)`;
  const ok = overlapWindow(hours, scores, 5.5);
  if (ok) return `🟡 Mostly workable ${ok.start}–${ok.end} (~${ok.dur}h) — one factor is holding it back`;
  return '🔴 No proper overlap today — at least one key factor stays poor.';
}

/* Longest contiguous "go" window in the day's daylight hours, by quality level.
   Returns { kind:'good'|'ok'|'none', start, end, dur }. */
function goWindow(hours) {
  const run = (thr) => {
    let bs = -1, be = -1, cs = -1;
    for (let i = 0; i <= hours.length; i++) {
      if (i < hours.length && hours[i].score >= thr) { if (cs < 0) cs = i; }
      else { if (cs >= 0 && i - cs > be - bs) { bs = cs; be = i; } cs = -1; }
    }
    return bs < 0 ? null : { s: bs, e: be - 1 };
  };
  const fmt = (r) => {
    const start = fmtTime(hours[r.s].time);
    const endHr = (+hours[r.e].time.slice(11, 13) + 1);     // through the end of the last good hour
    const end = `${String(endHr).padStart(2, '0')}:00`;
    return { start, end, dur: r.e - r.s + 1 };
  };
  const good = run(7);
  if (good) return { kind: 'good', ...fmt(good) };
  const ok = run(5.5);
  if (ok) return { kind: 'ok', ...fmt(ok) };
  return { kind: 'none' };
}

/* Caption above the curve (rich). */
function windowSummary(hours) {
  const w = goWindow(hours);
  if (w.kind === 'good') return `🟢 <b>Good ${w.start}–${w.end}</b> (~${w.dur}h)`;
  if (w.kind === 'ok')   return `🟡 Rideable ${w.start}–${w.end} (~${w.dur}h) — never quite "good"`;
  return '🔴 Marginal / blown out all day.';
}

/* Short window label for cards / stats (no single-hour pick). */
function windowShort(hours) {
  const w = goWindow(hours);
  if (w.kind === 'good') return `Good ${w.start}–${w.end}`;
  if (w.kind === 'ok')   return `OK ${w.start}–${w.end}`;
  return 'Flat / blown';
}

/* FACTOR BY FACTOR — every indicator stacked on the same hourly timeline so you
   can scan DOWN a column to see WHY a time is good or bad and how long each factor
   holds. (No "best hour" pick — that's what the curve above is for.) */
function factorMatrix(c, b, day) {
  const hours = daylightHours(c, day);
  if (hours.length < 3) return '';
  const scores = hours.map(h => factorScores(b, h));
  const heatClass = score => {
    if (score >= 8.5) return 'best';
    if (score >= 7) return 'good';
    if (score >= 5.5) return 'ok';
    if (score >= 4) return 'watch';
    return 'poor';
  };
  const N = hours.length;
  const rows = [
    { label: 'Wind',    cells: scores.map(x => heatClass(x.wind)) },
    { label: 'Speed',   cells: scores.map(x => heatClass(x.speed)) },
    { label: 'Swell',   cells: scores.map(x => heatClass(x.swell)) },
    { label: 'Surface', cells: scores.map(x => heatClass(x.surface)) },
    { label: 'Spacing', cells: scores.map(x => heatClass(x.spacing)) },
    { label: 'Size',    cells: scores.map(x => heatClass(x.size)) },
  ];
  const head = hours.map(h => `<div class="gm-h">${+h.time.slice(11, 13)}</div>`).join('');
  const body = rows.map(r =>
    `<div class="gm-label">${r.label}</div>` +
    r.cells.map(cls => `<div class="gm-cell ${cls} ${r.tall ? 'tall' : ''}"></div>`).join('')
  ).join('');
  return `
    <div class="detail-sub">Factor by factor</div>
    <div class="go-matrix-wrap">
      <div class="go-matrix" style="grid-template-columns:58px repeat(${N},minmax(20px,1fr))">
        <div class="gm-corner"></div>${head}
        ${body}
      </div>
    </div>
    <div class="go-legend"><span class="lg best"></span>best <span class="lg good"></span>good <span class="lg ok"></span>ok <span class="lg watch"></span>watch <span class="lg poor"></span>poor — scan down a column to see what's limiting it.</div>`;
}

/* Live cam (Ocean Eye). The feed is login-gated and browsers block the login from
   carrying into a cross-origin iframe, so the reliable path is a real pop-out window
   (first-party, where you're signed in). */
function camPanel(b) {
  if (!b.oceanEye) return '';
  const url = `https://oceaneye.co.za/spots/${b.oceanEye}/`;
  return `
    <div class="cam">
      <button class="cam-btn primary" data-popcam="${url}">📹 Watch Ocean Eye Cams</button>
    </div>`;
}

/* SVG tide curve for the day, with high/low markers and a "now" line. */
function tideGraph(c, cur, isToday) {
  const hrs = c.dayHours.filter(h => h.tide != null);
  if (hrs.length < 4) return '';
  const vals = hrs.map(h => h.tide);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = (max - min) || 1;
  const W = 700, H = 130, pad = 18, padTop = 22;
  const X = i => pad + i / (hrs.length - 1) * (W - 2 * pad);
  const Y = v => padTop + (1 - (v - min) / span) * (H - padTop - pad);

  const line = hrs.map((h, i) => `${X(i).toFixed(1)},${Y(h.tide).toFixed(1)}`).join(' ');
  const area = `${pad},${H - pad} ${line} ${(W - pad).toFixed(1)},${H - pad}`;

  // hour ticks every 6h
  const ticks = hrs.map((h, i) => ({ h, i }))
    .filter(o => +o.h.time.slice(11, 13) % 6 === 0)
    .map(o => `<text x="${X(o.i).toFixed(1)}" y="${H - 4}" class="tide-tick" text-anchor="middle">${o.h.time.slice(11, 13)}h</text>`)
    .join('');

  // y-axis scale in metres (high-water and low-water marks)
  const axis = `
    <text x="4" y="${(Y(max) + 4).toFixed(1)}" class="tide-axis">${max.toFixed(1)}m</text>
    <text x="4" y="${(Y(min) + 4).toFixed(1)}" class="tide-axis">${min.toFixed(1)}m</text>`;

  // high/low markers, now with the height in metres
  const marks = c.tides.map(t => {
    const i = hrs.findIndex(h => h.time === t.time);
    if (i < 0) return '';
    const yv = Y(t.v), high = t.type === 'High';
    const ly = high ? yv - 10 : yv + 18;
    return `<circle cx="${X(i).toFixed(1)}" cy="${yv.toFixed(1)}" r="4" class="tide-pt"/>
      <text x="${X(i).toFixed(1)}" y="${ly.toFixed(1)}" class="tide-lbl" text-anchor="middle">${high ? 'H' : 'L'} ${t.v.toFixed(1)}m · ${fmtTime(t.time)}</text>`;
  }).join('');

  // now line
  let nowM = '';
  if (isToday) {
    const ni = hrs.findIndex(h => h.time === cur.time);
    if (ni >= 0) {
      const nx = X(ni).toFixed(1);
      nowM = `<line x1="${nx}" y1="${padTop - 6}" x2="${nx}" y2="${H - pad}" class="tide-now"/>
        <circle cx="${nx}" cy="${Y(hrs[ni].tide).toFixed(1)}" r="3.5" class="tide-nowpt"/>`;
    }
  }

  return `<svg class="tide-svg" viewBox="0 0 ${W} ${H}">
    <polyline points="${area}" class="tide-area"/>
    <polyline points="${line}" class="tide-line"/>
    ${nowM}${marks}${ticks}${axis}
  </svg>`;
}

function render() {
  renderViewTabs();
  renderTabs();
  renderControls();
  renderBreaks();
  if (STATE.updated) {
    $('#updated').textContent = 'Updated ' + STATE.updated.toLocaleTimeString('en-ZA',
      { hour: '2-digit', minute: '2-digit' });
  }
}

async function load() {
  $('#breakList').innerHTML = '<div class="loading">Loading forecast…</div>';
  try {
    const { marine, wind, multiMarine, multiWind } = await fetchAll();
    const series = buildSeries(marine, wind, multiMarine, multiWind);
    STATE.days = groupDays(series);
    STATE.updated = new Date();
    if (STATE.dayIdx >= STATE.days.length) STATE.dayIdx = 0;
    render();
  } catch (e) {
    $('#breakList').innerHTML =
      `<div class="loading error">Couldn't load forecast.<br><small>${e.message}</small><br>
       <button id="retry">Retry</button></div>`;
    const rb = document.getElementById('retry');
    if (rb) rb.onclick = load;
  }
}

/* Local dev should reload the whole page, because design/code changes live in
   app.js/styles.css. Hosted use keeps this as a forecast-data refresh. */
const LOCAL_DEV_HOSTS = ['127.0.0.1', 'localhost', '::1'];
const isLocalDev = LOCAL_DEV_HOSTS.includes(location.hostname);
$('#refreshBtn').onclick = () => { if (isLocalDev) location.reload(); else load(); };
setupAsk();
load();

/* PWA service worker. For local development, disable it completely so design/code
   changes appear on a normal browser refresh. Offline caching only runs on a real
   hosted URL. */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  if (isLocalDev) {
    navigator.serviceWorker.getRegistrations()
      .then(regs => Promise.all(regs.map(r => r.unregister())))
      .then(() => caches?.keys?.())
      .then(keys => keys ? Promise.all(keys.map(k => caches.delete(k))) : null)
      .catch(() => {});
  } else {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
