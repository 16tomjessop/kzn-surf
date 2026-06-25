# KZN Surf — Voice + Audio Handoff

Design brief for two additions to the live app:

1. **Two-voice forecast copy** (`Salty` default / `Befok` opt-in)
2. **Read-the-report-aloud** (hands-free / CarPlay)

Visual reference mock: `Surf Journal.dc.html` (frames 01–05). Keep all existing data
fetching, scoring (`rate`, `band`, `components`), saved spots, custom ordering and bank
tuning. This is a **copy + presentation + audio** layer on top — the scoring engine does
not change.

---

## Part 1 — Two-voice system

### Concept

Every rating and headline is generated text. We render it in one of two voices. The
*data never changes* — only the words. Default is **Salty** (everyday, cheeky). **Befok**
is the full-slang, opt-in setting (gate it — see below).

> We deliberately dropped a third "Clean" voice — two is simpler to maintain and to choose
> between.

### State

```js
// add to STATE
STATE.voice = loadVoice();          // 'salty' | 'befok'

function loadVoice() {
  try { return localStorage.getItem('kznsurf-voice') === 'befok' ? 'befok' : 'salty'; }
  catch (e) { return 'salty'; }
}
function setVoice(v) {
  STATE.voice = v;
  try { localStorage.setItem('kznsurf-voice', v); } catch (e) {}
  render();
}
```

### Gating Befok

Befok contains mild profanity / heavy slang. Keep it opt-in so the default install is
App-Store-safe:

- Lives in **Settings**, not the main toolbar.
- First time it's selected, show a one-tap confirm: *"Befok mode is full send — proper
  slang and language. You keen?"* → `[Ja, send it]` / `[Nah]`.
- Persisted in `localStorage` as above.

### The vocabulary table

Single source of truth. Everything (band labels, headline fragments, factor words) reads
from here keyed by **band × voice**. Add to `app.js`:

```js
/* Band labels per voice. Keys match band().cls -> flat | poor | fair | okgood | good | epic */
const VOICE = {
  salty: {
    flat:   'Lake KZN',
    poor:   'Kak',
    fair:   'Meh',
    okgood: 'Surfable',
    good:   'Lekker',
    epic:   'Pumping',
  },
  befok: {
    flat:   'Dead flat, boet',
    poor:   'Kak',
    fair:   'Eish',
    okgood: 'Naah, marginal',
    good:   'Mal',
    epic:   'Befok',
  },
};

/* Look up the rating word for the current voice. */
function ratingWord(bandCls) {
  return (VOICE[STATE.voice] || VOICE.salty)[bandCls] || bandCls;
}
```

> Note: the **colour stays keyed by `band().cls`** (the existing reef/sun/rust scale).
> Only the *word* changes with voice. Never colour by the word.

### Two-axis ratings (Swell vs Wind)

Per the redesign we split the single overall band into **two** independent ratings on the
cards and mastheads:

- **Swell** — summarises everything swell-ish: size, period, direction/peel.
- **Wind** — summarises direction + speed.

You already compute the parts in `rate()` → `parts.{wind,size,period,dir}`. Derive two
sub-scores and band them:

```js
function swellScore(parts) {
  // size + period + direction, re-normalised (weights from WEIGHTS, wind removed)
  const w = WEIGHTS.size + WEIGHTS.period + WEIGHTS.dir;
  return (parts.size * WEIGHTS.size + parts.period * WEIGHTS.period + parts.dir * WEIGHTS.dir) / w;
}
function windScore(parts) {
  return parts.wind;  // already 0..10 on its own axis
}
// usage: ratingWord(band(swellScore(h.parts)).cls), ratingWord(band(windScore(h.parts)).cls)
```

Render each as a pill: dot (coloured by band) + `Swell` / `Wind` label + voiced word.
Keep the existing single `score` for **sorting** spots; show the two-axis read to the user.

### Headlines & summaries (the "morning read")

Home headline + daily summary are built from dominant conditions. Keep the *structure*
identical across voices; swap the words. Build from:

- best window (`goWindow`)
- wind trend (when does it turn — first hour wind drops below `good`)
- swell size (`sizeLabel`)
- tide trend

Examples already written in the mock (use as copy seeds):

| | Salty | Befok |
|---|---|---|
| Headline | "Lekker at dawn, kak by lunch." | "Cooking at sparrows, blown to absolute kak by lunch." |
| Summary | "Tidy SE swell running chest-to-head on the banks, and the dawn NW's got it glassed off proper. Paddle out early, china — the NE sneaks in mid-morning and turns the lot to chop by lunch." | "Proper SE swell grunting chest-to-head on the banks, glassed off by the gods at sparrows. Get your okes wet early, boet — the NE klaps in mid-morning and turns the whole coast into a frothy dog's breakfast by lunch. Eish." |
| Spot line (epic) | "Head-high and grunting — go now, the NW's behaving." | "Head-high and going off its tits, bru — bomb it now before the wind klaps it." |
| Spot line (poor) | "Closing out like a Sunday bottle store — give it a skip." | "Square and shutting the door like a Sunday bottle store — skip it, china." |

**Implementation:** a `phrase(key, ctx)` helper that returns a template string per voice,
interpolating `ctx` (spot name, size word, window, wind dir). Keep phrases in a
`PHRASES[voice]` object alongside `VOICE`. Don't scatter copy through render functions.

---

## Part 2 — Read the report aloud

### Why

The report is already written as spoken-language sentences — it reads like a radio
bulletin. Surfers check conditions then drive 30–60 min pre-dawn, deciding which spot en
route. Hands-free "where's firing" is the core moment. Pair with CarPlay / Android Auto.

### Scope (v1 — keep it tight)

- A **"▶ Play the report"** button on the Home read.
- Generates a ~20–30s spoken summary: headline → top 2–3 spots with go-windows → the one
  limiting factor.
- Uses **device Text-to-Speech** (Web Speech API / native) — free, offline, no API key.
- A player UI: waveform/progress, play-pause, prev-next spot, "Now reading: {spot}".

### Building the spoken script

Reuse the same data, but write a **separate spoken string** — do not just read the screen
copy (see TTS caveat). Suggested structure:

```js
function buildReportScript() {
  const day = STATE.days[STATE.dayIdx];
  const ranked = [...day.breaks].sort((a,b) => (b.best?.score ?? 0) - (a.best?.score ?? 0));
  const top = ranked.slice(0, 3);

  const intro = `Morning. Here's your KZN surf report for ${fmtDay(day.date)}.`;
  const spots = top.map(c => {
    const b = c.break, best = c.best;
    const w = windowShort(daylightHours(c, day));
    const size = sizeLabel(best.swellH, best.swellPer).text;
    const limiter = limitingFactor(b, best);   // see below
    return `${b.name}. ${ratingSpoken(best.score)}. ${size}, ${w}. ${limiter}.`;
  });
  return [intro, ...spots].join(' ');
}
```

`limitingFactor(b, hour)` = the single worst-scoring component (wind / size / peel / clean)
turned into a phrase ("wind gets onshore by ten", "needs more size", "closing out"). This
is the most useful spoken sentence — make it consistent.

### ⚠ TTS + slang caveat (decide early)

Default TTS voices mangle slang and Zulu/Afrikaans place names ("befok", "kak", "Umhlanga",
"Scottburgh"). Two options:

- **(A) Recommended:** spoken script uses a **cleaner register** even when the screen is
  Befok — keep the personality visual, keep the audio intelligible.
- **(B)** Spell words phonetically for the synth (e.g. "um-SHLANG-ah") and keep a short
  slang allow-list. More work, more charm.

Either way: maintain a `SPOKEN_OVERRIDES` map for place-name pronunciation.

### Player UI (mock frames 04 & 05)

State:

```js
STATE.audio = {
  playing: false,
  spotIdx: 0,      // which spot in the report is being read
  progress: 0,     // 0..1
};
```

- **Home player (frame 04):** card with `Now reading` label, current spot name + line,
  waveform scrubber (played portion in `--reef`), `0:12 / 0:28`, transport row
  (prev / play-pause / next), an "In this report" queue, and an **Auto-play on CarPlay**
  toggle.
- **CarPlay (frame 05):** landscape. Left = Now Playing tile (large spot name, spoken line,
  waveform, 70px play target). Right = "Up next" queue with big rating badges. Everything
  arm's-length legible; **ratings carry colour first, word second** on this screen.

### Web Speech API sketch

```js
const synth = window.speechSynthesis;
let utter = null;

function playReport() {
  stopReport();
  utter = new SpeechSynthesisUtterance(buildReportScript());
  utter.rate = 1.0; utter.pitch = 1.0;
  // pick a local en-ZA / en-GB voice if available
  const v = synth.getVoices().find(v => /en-ZA|en-GB/.test(v.lang));
  if (v) utter.voice = v;
  utter.onstart = () => { STATE.audio.playing = true; render(); };
  utter.onend   = () => { STATE.audio.playing = false; render(); };
  synth.speak(utter);
}
function stopReport() { synth.cancel(); STATE.audio.playing = false; }
```

> Web Speech doesn't give a real waveform — drive the progress bar off `onboundary`
> events (word index / total), and render the waveform as a static decorative scrubber.

### CarPlay / Android Auto (later)

- Out of scope for a pure web build; needs the native shell. Expose `buildReportScript()`
  and the queue model so the native layer can drive `MPNowPlayingInfo` / Android Auto media
  session.
- Auto-trigger: on CarPlay connect in the morning, greet + play. Make it a setting.

---

## Routing recap (from the earlier redesign)

```text
STATE.view = 'home' | 'spot'
STATE.selectedSpotId
STATE.dayIdx
STATE.voice = 'salty' | 'befok'
STATE.audio = { playing, spotIdx, progress }
```

- Home = editorial morning read + ranked spot cards (two-axis ratings + human line).
- Tap card → `openSpot(id)` → spot overview (quick overview + two-hour windows) →
  scroll → detailed report (factor cards, factor×time grid, tide, hour-by-hour).
- Back → `STATE.view = 'home'`.

## Build order (suggested)

1. `VOICE` table + `ratingWord()` + voice state/persist + Settings toggle (gated Befok).
2. Swap all rating labels and headlines to read through the voice layer.
3. Two-axis Swell/Wind pills on cards + mastheads.
4. `buildReportScript()` + `limitingFactor()` + the "In this report" queue model.
5. Home audio player UI wired to Web Speech.
6. CarPlay/native hooks (separate milestone).

## Don't

- Don't colour ratings by the voiced word — colour by `band().cls`.
- Don't read screen copy verbatim aloud — use `buildReportScript()` (pronunciation).
- Don't default to Befok. Don't surface it without the confirm gate.
- Don't touch the scoring engine, fetch, saved spots, or bank tuning.
