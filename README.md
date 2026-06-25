# KZN Surf — South Coast & Durban surf forecast

A no-backend, mobile-first web app (PWA) that forecasts surf for Durban and the
KwaZulu-Natal south coast. It pulls free [Open-Meteo](https://open-meteo.com)
marine + wind data and scores each break with a **transparent, orientation-based
rating engine** you can tune by hand — so you can see *why* a spot is rated the
way it is, unlike Surfline's black box.

## Run it

It's just static files. Any of these work:

```bash
# Option A — Python (built in on macOS)
cd "Surf Forecast App"
python3 -m http.server 8000
# then open http://localhost:8000
```

Or simply double-click `index.html` (forecast still loads; the install/offline
PWA features need to be served over http/https).

## Install to your phone

Open the served URL on your phone → **Share → Add to Home Screen**. It launches
full-screen and caches the last forecast for offline.

## Free hosting (optional)

Drop the folder onto [Netlify Drop](https://app.netlify.com/drop) or push to a
GitHub repo and enable GitHub Pages. No build step.

## How the readout works

Instead of one mystery rating, each break is broken into the axes a surfer
actually reads. The little coloured label (Fair/Good/etc.) is kept only to sort
the list and pick the best window — the **breakdown is the real read**:

- **Size** — in body heights, not metres: Flat → Knee → Waist → Shoulder → Head
  → Overhead (1.5×) → Double overhead. (`sizeLabel` in `app.js`.)
- **Wind direction** — Offshore / Cross-off / Cross-shore / Cross-on / Onshore,
  relative to that beach's facing. (`windDirComp`.)
- **Wind speed** — Light / Moderate / Strong / Howling. (`windSpeedComp`.)
- **Swell** — *will it peel or close out?* Peeling lines / Mostly peeling /
  Shifty peaks / Closing out / Walling-weak, from swell angle + period. (`peelComp`.)
- **Surface** — Glassy / Clean / Some texture / Choppy & messy, from wind plus how
  much wind-chop is riding on the swell. (`cleanComp`.)
- **Spacing** — Long even lines / Decent spacing / Short & shifty / Close & choppy,
  from period. (`spacingComp`.)

Each break has a profile in `app.js` → `BREAKS`:

| field | meaning |
|-------|---------|
| `facing` | compass bearing the beach looks out to sea. Offshore wind = `facing + 180`. |
| `minH / idealH / maxH` | swell-height (m) thresholds used by the sort score. |
| `note` | free-text local knowledge shown when you expand the card. |

The sort score (0–10) is wind-weighted (40% wind / 25% size / 20% period / 15%
direction) because the NE wind is the great spoiler on this coast.

### Tuning it (this is the point)

When the app disagrees with what you see in the water, edit the numbers:

- App says *Good* but it's onshore mush → lower that break's tolerance by nudging
  `facing`, or raise the wind weight in `WEIGHTS`.
- It rates 1m as Flat but it's actually fun → drop `minH` / `idealH`.
- A spot needs more south in the swell to work → that's the `facing` bearing.

All logic lives in the rating functions at the top of `app.js`
(`windQuality`, `sizeQuality`, `dirQuality`, `periodQuality`, `rate`).

## Breaks included

The app includes the Ocean Eye spot catalogue across KwaZulu-Natal, Eastern Cape,
Garden Route, Western Cape, and international spots. Use **All Spots** to browse
or search the catalogue, then star spots to make them appear on **Home**.

## Data & limitations

- Source: Open-Meteo Marine (swell, period, direction, tide via sea-level height)
  + Forecast (wind) APIs. Free, no API key, 7-day range.
- The marine model grid is coarse (~0.1°+), so nearby breaks may share the same
  raw swell — differentiation comes from each break's orientation/wind profile.
- Tide is derived from modelled sea-level height (good for timing highs/lows),
  not a tide-table gauge.
- Ratings are **estimates** to be calibrated against what you actually see.

## Facebook photo capture helper

For a permitted, local browser-assisted workflow that saves visible surf-photo
references into `data/facebook-capture/`, see `tools/facebook-capture/README.md`.
