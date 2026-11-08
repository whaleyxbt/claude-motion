# Agent guide

This repo is a motion design toolkit for coding agents, built on [Remotion](https://remotion.dev) (React → video). It gives you taste rules with numbers, a loop for reviewing your own frames, and a procedural sound engine synced to the timeline. `EffortVideo` (22 s, 1080×1080, 60 fps) is a finished example to read and take apart, not a template you have to follow.

## Read first

The skills in `.claude/skills/` are the core of this repo. Claude Code and Cursor load them automatically; other agents should read them before touching a video.

- `motion-design/SKILL.md`: easing, springs, timing, type, color, texture, transitions, with numbers.
- `review-loop/SKILL.md`: how to look at your own renders and what to check. Mandatory before saying a video is done.
- `sound-design/SKILL.md`: writing a cue sheet for the `sfx` engine, levels, mastering, adding generators.
- `web-sims/SKILL.md`: simulations and 3D pieces built as one HTML page and captured frame by frame to 60 fps (`sims/`).

## Making a video

1. Agree on the message, a storyboard and the one hero moment with the user. Ask for format (1:1, 16:9, 9:16), length, brand colors and fonts if they matter.
2. Write every beat into a timeline JSON before any component code, one file per video (the example keeps its own at `timeline.json`).
3. Register a `<Composition>` in `src/Root.tsx` and put the scenes in their own folder under `src/`. Reuse `src/components/` (`Mask`, `Roll`, `Grain`, `Background`, `WobbleFilter`, `Spark`) and the helpers in `src/lib.ts` (easings, `prog`, `band`, `sp`).
4. Define the video's palette and fonts in one place, the way `C` and `F` are defined in `src/lib.ts`.
5. Run the review loop until a full pass is clean.
6. Write a cue sheet `sfx/cues/<name>.py` against the same timeline and render the sound.
7. Render, mux, and check loudness on the final file.
8. Add the piece to `examples/` with the prompt you were given.

## Simulations and 3D

When the idea is a simulation (agents, particles, a machine the camera flies through) rather than motion graphics, use the `sims/` pipeline instead of Remotion: one HTML page per piece, `render(t)` pure in time, `node sims/capture.mjs` steps it frame by frame into an mp4. Guide and commands: `sims/README.md`; workflow: `web-sims/SKILL.md`. Capture needs a Chromium: `npx playwright install chromium` once, or set `$CHROMIUM`.

## Tools

| Command | What it does |
|---|---|
| `npm run studio` | live preview of every composition |
| `npx remotion render <Id> out/<name>-silent.mp4 --scale=0.5` | fast draft render |
| `npm run sheet -- --video <mp4> --timeline <json>` | contact sheets at every beat → `out/sheets/` |
| `python3 -m sfx --list` | sound generators and what each is for |
| `python3 -m sfx sfx/cues/<name>.py` | render a cue sheet → mastered WAV (−14 LUFS) |
| `npm run wave -- <wav or mp4> --timeline <json>` | waveform with beat markers + loudness check |
| `npm run typecheck` | TypeScript check |

Mux picture and sound:

```bash
ffmpeg -y -i out/<name>-silent.mp4 -i public/<name>.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -movflags +faststart -shortest out/<name>.mp4
```

The example has shortcuts: `npm run draft`, `npm run sfx`, `npm run build` (sound + render + mux → `out/effort.mp4`), `npm run cover`, `npm run gif`.

Requirements: Node 20+, Python 3, ffmpeg. On Windows, run `python` wherever these docs say `python3`. If `/usr/bin/chromium` (or `$REMOTION_BROWSER`) exists it's used; otherwise Remotion downloads its own browser on first render.

## Layout

```
.claude/skills/          the rules: motion-design, review-loop, sound-design
sfx/                     sound engine: synth.py (generators), mix.py (placement, mastering), loudness.py
sfx/cues/effort.py       example cue sheet
scripts/sheet.mjs        contact sheets for visual review
scripts/wave.mjs         waveform + loudness check
src/lib.ts               easings and animation helpers, plus the example's palette (C), fonts (F), timeline (TL)
src/components/          reusable pieces: primitives (Mask, Roll, Spark, Grain, WobbleFilter), Background, useFonts
src/EffortVideo.tsx      example piece; its scenes in src/scenes/, its timeline in timeline.json
src/ArticleCover.tsx     example still: a 2000×800 cover drawn from the same timeline
examples/                gallery: prompt, process and result for each piece
sims/                    web sims → video: kit/, build.mjs, capture.mjs, beats.py, examples crawlers/ dossier/ engine/
sfx/dsp.py               filters, oscillators, reverb for longer sound scripts (used by sims/engine/sound.py)
```

## Conventions

- Animation is a pure function of `useCurrentFrame()`. No CSS animations, `Math.random()` or `Date`.
- No hardcoded start times, in components or in cue sheets; read them from the timeline.
- Colors and fonts only from the video's palette object.
- Match the existing code style: small helpers, inline styles, comments only for non-obvious constraints.
