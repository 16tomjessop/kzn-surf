# KZN Surf Redesign Handoff

Use this file as the design brief for updating the live surf forecast app.

## Preview Files

The current approved direction is mocked up in:

- `flow-preview.html`
- `flow-preview.css`
- `flow-preview.js`

Open locally:

```text
http://127.0.0.1:8002/flow-preview.html
```

If no server is running:

```bash
python3 server.py 8002
```

## Product Direction

The app should move from a compact forecast list into a two-level experience:

1. **Home page**
   - Warm, editorial, newspaper-like surf read.
   - Inspired by Option C from `mockups.html`.
   - The first screen should feel like a local morning surf journal, not a dense data dashboard.

2. **Spot detail page**
   - Tapping a spot opens a spot-specific page.
   - The top of the spot page should use the Option D quick-overview pattern.
   - The quick overview should show the best two-hour windows with ratings.
   - Scrolling down reveals the detailed report.

## Target Flow

```text
Home Read
  -> tap spot card
Spot Overview
  -> scroll down
Detailed Report
```

## Home Page Requirements

The home page should include:

- Masthead: `KZN Surf Journal` / `Morning Read`
- Newspaper-style headline describing the day, for example:
  - `Clean early, lumpy by lunch.`
- Short daily summary paragraph using readable surf language.
- Three compact timing facts:
  - Best window
  - Wind shift
  - Tide timing
- Warm surf visual area, similar to the wave illustration in `flow-preview.html`.
- Spot cards for top spots.

Spot cards should show:

- Rating badge
- Spot name
- Short human summary
- Tap affordance

Example:

```text
8.4
Scottburgh
Chest high · WNW offshore · best early
```

## Spot Page Requirements

The spot page should include, in order:

1. Sticky spot masthead
   - Back button
   - Region
   - Spot name
   - Current score badge

2. Quick overview
   - Small label: `Quick overview`
   - Spot-specific headline
   - Short summary paragraph

3. Tide overview card
   - Mini tide visual
   - Tide status
   - Low/high timing

4. Two-hour forecast blocks
   - Example windows:
     - `06-08`
     - `08-10`
     - `10-12`
     - `12-14`
   - Each block should include:
     - Time window
     - Short status label
     - Human forecast detail
     - Rating badge

5. Detailed report section
   - Starts below the quick overview.
   - Label: `Scroll for detail`
   - Heading: `Detailed report`
   - Factor cards:
     - Swell
     - Wind
     - Shape
     - Water
   - Tide curve
   - Hour-by-hour rows

## Visual Direction

Use the visual language from `flow-preview.css`.

Core feel:

- Warm paper background.
- Newspaper/editorial headings.
- Calm surf-journal personality.
- Functional detail once inside a spot.

Preferred typography:

- Serif display headings: Georgia or similar.
- System sans-serif for data, controls, and labels.

Preferred colours:

```css
--ink: #18272b;
--soft-ink: #4f6265;
--muted: #71807b;
--paper: #f3eee2;
--paper-2: #fff9eb;
--line: rgba(24, 39, 43, 0.14);
--reef: #1f9c83;
--reef-2: #77cfa9;
--sun: #e6bd56;
--sand: #eadbbf;
--rust: #d7855d;
```

Rating treatment:

- Good: green / reef.
- Fair-good: yellow / sun.
- Poor: rust / orange-red.
- Ratings should be visible but not make the app feel like a trading dashboard.

## Interaction Notes

The mockup uses simple click behavior in `flow-preview.js`:

- Tapping a spot card updates the detail preview.
- In the real app, this should become actual app state:
  - selected spot
  - selected day
  - selected time window

Recommended implementation model:

```text
STATE.view = 'home' | 'spot'
STATE.selectedSpotId = spot id
STATE.dayIdx = current selected day
```

Home spot cards should call something like:

```js
openSpot(spotId)
```

The back button should return to:

```js
STATE.view = 'home'
```

## Data Mapping

Use the existing forecast scoring logic in `app.js`.

Home page:

- Use each spot's best daylight hour or best two-hour window.
- Sort by best score unless the user has custom ordering enabled.
- Build the daily headline from dominant conditions:
  - wind quality
  - best window
  - tide trend
  - swell size

Spot page:

- Use the selected spot's daylight hours.
- Group hours into two-hour windows.
- Rate each two-hour block using the average or best score within that block.
- Keep the detailed report from the current expanded card, but move it below the quick overview.

## Copy Direction

Prefer local, readable surf language:

- `Clean early, lumpy by lunch.`
- `Go early while the WNW keeps it clean.`
- `More size once the tide drops into shape.`
- `Small and playful before the wind gets into it.`
- `Only sheltered banks worth a look.`

Avoid overly technical first-screen copy. Keep technical data available in the detailed report.

## Implementation Goal

Update the live app so it feels like:

```text
Option C home page
+ Option D spot overview
+ current detailed forecast report below
```

The live app should not remain a simple list of expandable cards. The new hierarchy should be:

```text
Home editorial forecast
Spot cards
Spot detail route/view
Quick overview
Detailed report
```

## Files To Reference

Design reference:

- `flow-preview.html`
- `flow-preview.css`
- `flow-preview.js`

Current live app:

- `index.html`
- `styles.css`
- `app.js`

Keep the existing data fetching, forecast scoring, saved spots, custom ordering, and bank tuning logic unless a change is required to support the new view structure.
