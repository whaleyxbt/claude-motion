# Web sims → 60 fps video

Some videos aren't motion graphics, they're simulations: 256 agents crawling
a wall of websites, a rocket engine you can fly through. Those are easier to
build as a web page than as a Remotion composition, so this folder is a second
pipeline for them:

1. A sim is **one HTML page** (`sims/<name>/main.js`, bundled to
   `sims/dist/<name>.html` with three.js and fonts inlined, works offline).
2. Its `render(t)` is a **pure function of time**. Heavy work (agents, paths,
   collisions) is simulated once at 60 Hz when the page loads, so any frame can
   be drawn on demand.
3. `capture.mjs` opens it in headless Chromium, **steps `render(t)` frame by
   frame** and pipes screenshots to ffmpeg: frame-exact 60 fps at any size,
   however slow a frame is to draw.

Open the HTML file in a browser and it plays live and loops (space pauses,
←/→ seek, r restarts, f fullscreen).

## Examples

| | What it shows | Tricks worth stealing |
|---|---|---|
| [`crawlers`](crawlers/) | One spider agent doubles every 2 beats (1 → 256) across 16 made-up websites; every word a foot lands on lights up; the camera pulls back to the whole wall. [On X](https://x.com/whaleyxbt/status/2106099822088331481) | Real DOM text as terrain: every word is wrapped and measured, feet hit-test it. Procedural legs (2-bone IK, alternating gait). Doublings snap to the music's beat grid. |
| [`dossier`](dossier/) | The same swarm aimed at one fictional person: each public page leaks one detail, the nearest agent walks to it, a red thread carries it into a dossier. [On X](https://x.com/whaleyxbt/status/2106420024286031963) | "Hunter" agents steered to a target by a set time; screen-space threads from world-space words; facts land on the beat. |
| [`engine`](engine/) | A methane rocket engine running above a sunset cloud deck: the skirt opens, chapters light the flows, the camera flies through the chamber and throat into the plume, then the engine comes apart and back together. | three.js with sky + environment lighting, clipping-plane cutaway, glowing flow tubes, a plume volume with shock diamonds, a Python sound script on the same `timeline.json`. |

Everything in the examples is invented: no real people, brands or domains
(`.example`). Caption figures in `engine` are rounded textbook values.

## Commands

```bash
npm install
npx playwright install chromium          # once; or set $CHROMIUM to your own build

node sims/build.mjs                      # all sims → sims/dist/<name>.html
node sims/build.mjs engine               # one sim

# review sheet: one frame per listed second, tiled
node sims/capture.mjs engine --stills 0,4,8,12,16,20 --cols 3 --out out/sims/engine-review.png

# video: 1080x1350 layout → 1440x1800 at 60 fps (default dpr 4/3, crf 16)
node sims/capture.mjs engine --size 1080x1350 --out out/sims/engine.mp4

# with a music track: beats.py finds tempo, bars and the drop, places the
# window so the drop lands ~40 % in, and passes the beat map to the sim
node sims/capture.mjs crawlers --music path/to/track.mp3 --to 20 --out out/sims/crawlers.mp4

# with a generated sound bed (engine)
python3 sims/engine/sound.py
node sims/capture.mjs engine --music out/sims/engine/ambient.wav --music-start 0 --no-sync --lufs -24 --out out/sims/engine.mp4
```

Other flags: `--config post.json` (merged over the sim's `DEFAULTS`),
`--still 12.5` (one PNG), `--fps`, `--dpr`, `--crf`, `--from`/`--to`,
`--lufs` (loudness of the muxed audio, default −21).

Every example has `watermark` in its `DEFAULTS`. Set it to your own handle,
or to `''`, in the sim or in a `--config` file.

Full configs are trusted input: examples can include HTML in them. Use
`capture.mjs --config` or edit the sim's defaults; `?config=` in shared URLs
is ignored, including in capture mode. The simple URL options (`title`,
`accent`, `seed`, `theme`, `duration`, `nodirector`) still work.
Story captions treat `tag` and `text` as plain text, with `*word*` highlighting;
`kind` supports `hero` and `num` (other values fall back to `hero`).

Run the config and caption security tests with `npm run test:sims` (requires
the same Chromium installation or `$CHROMIUM` as capture). After updating
the kit, run `npm run sims` and replace any hosted HTML with the rebuilt
files from `sims/dist/`; existing copies do not update automatically.

## Making a new sim

Copy the example closest to what you want and change it. The contract:

```js
import {runSim} from '../kit/runtime.js';

const DEFAULTS = {duration: 20, fps: 60, hud: {enabled: false}, director: {enabled: false}, /* your params */};

runSim(DEFAULTS, async ({cfg, canvas, capture}) => {
  // build the scene, precompute anything stateful
  return {
    render(t) { /* draw frame t from scratch */ return {}; },
    resize() {},
  };
});
```

- `render(t)` must be pure: no `Math.random` (use `rng(seed)` from
  `kit/util.js` at setup), no `Date`, no state carried between frames.
  Capture calls it at arbitrary times.
- Anything that moves by its own rules (agents, particles that collide,
  steering) is simulated once at load into typed arrays, then `render` reads
  them.
- Frame 0 is the thumbnail on X. It must already be busy and beautiful.
- Lay out for 1080 px wide (CSS px); `--dpr` sets the output resolution.
- One NaN pixel blacks out the whole frame through bloom: clamp `pow()` bases
  in shaders.
- `cfg.beats` (with `--music`) holds `beats`, `downbeats`, `kicks` and `drop`
  in seconds from the clip start. Snap your big moments to them.

Kit: `kit/runtime.js` (boot, config merge, live loop, `window.SIM` for
capture), `kit/stage3d.js` (three.js renderer, bloom, camera),
`kit/util.js` (easing, keyframes, seeded rng), `kit/hud.js` and
`kit/director.js` (an optional instrument HUD and auto camera cuts; the
examples turn both off).

Review before you render the full clip: make a `--stills` sheet at the key
moments, look at every tile (see `.claude/skills/review-loop`), fix, repeat.
