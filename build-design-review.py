#!/usr/bin/env python3
import os
ROOT = os.path.dirname(os.path.abspath(__file__))

html = open(os.path.join(ROOT, "index.html")).read()
css  = open(os.path.join(ROOT, "styles.css")).read()
js   = open(os.path.join(ROOT, "app.js")).read()

# --- offline mock: feed the app realistic Open-Meteo-shaped data, no network ---
STUB = r"""
/* ============================================================================
   DESIGN-REVIEW MODE — stubs the data fetch with baked-in sample conditions so
   the whole UI renders offline (no server / no API key). Delete this block and
   un-stub fetch to go back to live data. The app code below is identical to the
   real app.js.
   ============================================================================ */
(function () {
  function pad(n){ return n < 10 ? '0'+n : ''+n; }
  function isoDay(off){ var d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+off);
    return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  var DAYS = 7, T = [];
  for (var o=0;o<DAYS;o++){ for (var h=0;h<24;h++){ T.push(isoDay(o)+'T'+pad(h)+':00'); } }
  var SR=[], SS=[]; for (var o2=0;o2<DAYS;o2++){ SR.push(isoDay(o2)+'T06:50'); SS.push(isoDay(o2)+'T17:05'); }
  function series(fn){ return T.map(function(iso,i){ return fn(+iso.slice(11,13), i); }); }
  function marineFor(s){ return { hourly: { time:T,
    swell_wave_height:      series(function(h){ return 1.1 + 0.35*Math.sin((h-3)/3.0) + (s%3)*0.06; }),
    swell_wave_direction:   series(function( ){ return 150 + (s*4)%26; }),
    swell_wave_period:      series(function(h){ return 9 + 2*Math.sin(h/5) + (s%2); }),
    wave_height:            series(function(h){ return 1.4 + 0.4*Math.sin((h-3)/3.0); }),
    wave_period:            series(function( ){ return 9; }),
    sea_level_height_msl:   series(function(h){ return 0.6*Math.sin((h-3)/3.8); }),
    sea_surface_temperature:series(function( ){ return 22; })
  } }; }
  function windFor(s){ return { hourly: { time:T,
    /* offshore & light at dawn, onshore & up midday, easing in the evening */
    wind_speed_10m:     series(function(h){ return h<9 ? 4 : (h<16 ? 16 : 9); }),
    wind_direction_10m: series(function(h){ return h<9 ? 300 : (h<16 ? 70 : 110); }),
    wind_gusts_10m:     series(function(h){ return h<9 ? 8 : 20; })
  }, daily: { sunrise:SR, sunset:SS } }; }
  window.fetch = function (url) {
    url = '' + url;
    var m = url.match(/latitude=([^&]+)/);
    var count = m ? m[1].split(',').length : 1;
    var marine = url.indexOf('marine') >= 0;
    var out = [];
    for (var k=0;k<count;k++){ out.push(marine ? marineFor(k) : windFor(k)); }
    var body = count === 1 ? out[0] : out;
    return Promise.resolve({ json: function(){ return Promise.resolve(body); } });
  };
})();
"""

EXPAND = r"""
/* design review: auto-open one spot so the detail view (graph, tide, matrix,
   cam panel) is visible too */
(function ready(){
  if (typeof STATE !== 'undefined' && STATE.days && STATE.days.length){
    STATE.expanded = 'northbeach'; render();
  } else { setTimeout(ready, 40); }
})();
"""

# inline CSS
html = html.replace('<link rel="stylesheet" href="styles.css" />',
                    '<style>\n' + css + '\n</style>')
# drop PWA/icon links (not needed standalone, avoids 404s)
for line in ['<link rel="manifest" href="manifest.json" />',
             '<link rel="apple-touch-icon" href="icon.svg" />',
             '<link rel="icon" href="icon.svg" type="image/svg+xml" />']:
    html = html.replace('  ' + line + '\n', '')
# inline JS (stub + app + auto-expand)
html = html.replace('<script src="app.js"></script>',
                    '<script>\n' + STUB + '\n' + js + '\n' + EXPAND + '\n</script>')

out = os.path.join(ROOT, "design-review.html")
open(out, "w").write(html)
print("wrote", out, "(", len(html), "bytes )")
