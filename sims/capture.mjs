#!/usr/bin/env node
// Frame-accurate capture of a sim page to mp4: steps window.SIM.render(t) for
// every frame in headless Chromium, screenshots, pipes to ffmpeg, then muxes
// a music track if given.
//
//   node sims/capture.mjs <name> [--config post.json] [--out out/sims/x.mp4]
//        [--size 1080x1350] [--dpr 1.3333] [--fps 60] [--from 0] [--to <duration>]
//        (--size is the layout in CSS px; --dpr multiplies the output: 1080x1350
//         at the default 4/3 gives a 1440x1800 video. Default 60 fps, crf 16.)
//        [--music music/track.mp3 [--music-start auto|SEC] [--no-sync] [--lufs -21]] [--crf 21]
//        [--still 12.5]   (--still: one PNG, no video)
//        [--stills 0,4,9,14 --cols 3]               (tiled review sheet)
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const argv = process.argv.slice(2);
const name = argv[0];
const opt = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i === -1 ? d : argv[i + 1];
};
if (!name) {
  console.error('usage: node sims/capture.mjs <name> [--config f.json] [--out f.mp4] [--music f.wav]');
  process.exit(1);
}
const html = path.join(HERE, 'dist', `${name}.html`);
if (!fs.existsSync(html)) {
  console.error(`missing ${html}; run node sims/build.mjs ${name}`);
  process.exit(1);
}
const [W, H] = opt('size', '1080x1350').split('x').map(Number);
const config = opt('config') ? JSON.parse(fs.readFileSync(opt('config'), 'utf8')) : {};
// --music <file> [--music-start auto|SECONDS]: analyse the track (sims/beats.py),
// cut the window so the drop lands ~40% in, and give the beat map to the director.
const music = opt('music');
let beats = null;
if (music) {
  const dur = Number(opt('to', config.duration ?? 30)) - Number(opt('from', 0));
  const ms = opt('music-start', 'auto');
  const cache = path.join(ROOT, 'out/beats', `${path.basename(music).replace(/\.[^.]+$/, '')}-${ms}-${dur}.json`);
  fs.mkdirSync(path.dirname(cache), {recursive: true});
  const {execFileSync} = await import('node:child_process');
  if (!fs.existsSync(cache) || fs.statSync(cache).mtimeMs < fs.statSync(music).mtimeMs) {
    execFileSync('python3', [path.join(HERE, 'beats.py'), music, '--duration', String(dur), '--start', ms, '-o', cache], {stdio: 'inherit'});
  }
  beats = JSON.parse(fs.readFileSync(cache, 'utf8'));
  if (!opt('no-sync')) config.beats = beats;
}
const still = opt('still');
const stamp = new Date().toISOString().slice(5, 16).replace(/[-:T]/g, '');
const out = path.resolve(opt('out', path.join(ROOT, 'out/sims', still ? `${name}-${still}.png` : `${name}-${stamp}.mp4`)));
fs.mkdirSync(path.dirname(out), {recursive: true});

// Browser: $CHROMIUM if set, else /usr/bin/chromium if present, else the one
// Playwright installs (`npx playwright install chromium`).
const exe = process.env.CHROMIUM || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const browser = await chromium.launch({
  executablePath: exe,
  args: ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', ...(process.platform === 'linux' ? ['--use-angle=gl'] : []), '--enable-webgl', '--hide-scrollbars'],
});
const dpr = Number(opt('dpr', 4 / 3));
const page = await browser.newPage({viewport: {width: W, height: H}, deviceScaleFactor: dpr});
page.on('console', (m) => m.type() === 'error' && console.error('[page]', m.text()));
page.on('pageerror', (e) => console.error('[page error]', e.message));
await page.addInitScript((cfg) => {
  window.__CAPTURE = true;
  window.__SIM_CONFIG = cfg;
}, config);
await page.goto('file://' + html);
await page.waitForFunction(() => window.SIM && window.SIM.ready, null, {timeout: 60000});
const info = await page.evaluate(() => {
  const gl = document.createElement('canvas').getContext('webgl2');
  const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
  return {
    duration: window.SIM.duration,
    fps: window.SIM.fps,
    gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown',
  };
});
console.log(`gpu: ${info.gpu}`);

const stills = opt('stills');
if (stills) {
  const ts = stills.split(',').map(Number);
  const dir = out.replace(/\.(png|mp4)$/, '') + '-frames';
  fs.mkdirSync(dir, {recursive: true});
  for (const [i, t] of ts.entries()) {
    await page.evaluate((x) => window.SIM.render(x), t);
    await page.screenshot({path: path.join(dir, `${String(i).padStart(2, '0')}.png`)});
  }
  await browser.close();
  const cols = Math.min(ts.length, Number(opt('cols', 3)));
  const sheet = out.endsWith('.png') ? out : out.replace(/\.mp4$/, '') + '-sheet.png';
  const tw = Math.round(W * 0.4);
  const th = Math.round(H * 0.4);
  await new Promise((r) =>
    spawn('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', '1', '-i', path.join(dir, '%02d.png'),
      '-vf', `scale=${tw}:${th},tile=${cols}x${Math.ceil(ts.length / cols)}:padding=4:color=0x333333`, '-frames:v', '1', sheet],
      {stdio: 'inherit'}).on('close', r),
  );
  console.log(`→ ${path.relative(ROOT, sheet)}  (full frames in ${path.relative(ROOT, dir)})`);
  process.exit(0);
}

if (still !== undefined) {
  await page.evaluate((t) => window.SIM.render(t), Number(still));
  await page.screenshot({path: out});
  await browser.close();
  console.log(`→ ${path.relative(ROOT, out)}`);
  process.exit(0);
}

const fps = Number(opt('fps', 60));
const from = Number(opt('from', 0));
const to = Number(opt('to', info.duration));
const frames = Math.round((to - from) * fps);
const silent = music ? out.replace(/\.mp4$/, '-silent.mp4') : out;

const ff = spawn(
  'ffmpeg',
  ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(opt('crf', 16)), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', silent],
  {stdio: ['pipe', 'inherit', 'inherit']},
);
const t0 = Date.now();
for (let i = 0; i < frames; i++) {
  await page.evaluate((t) => window.SIM.render(t), from + i / fps);
  const buf = await page.screenshot({type: 'jpeg', quality: 97});
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % fps === 0) process.stdout.write(`\r${i}/${frames} frames  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
await browser.close();
console.log(`\r${frames}/${frames} frames  ${((Date.now() - t0) / 1000).toFixed(0)} s`);

if (music) {
  await new Promise((r, j) =>
    spawn(
      'ffmpeg',
      ['-loglevel', 'error', '-y', '-i', silent, '-ss', String(beats.start), '-i', music, '-map', '0:v', '-map', '1:a',
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-af', `loudnorm=I=${opt('lufs', -21)}:TP=-3,afade=t=in:d=0.04,afade=t=out:st=${(to - from - 0.6).toFixed(2)}:d=0.6`,
        '-shortest', '-movflags', '+faststart', out],
      {stdio: 'inherit'},
    ).on('close', (c) => (c === 0 ? r() : j(new Error('mux failed')))),
  );
  fs.rmSync(silent);
}
console.log(`→ ${path.relative(ROOT, out)}`);
