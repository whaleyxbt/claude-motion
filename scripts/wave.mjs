#!/usr/bin/env node
// Sound check: waveform with every timeline beat drawn on top, plus loudness.
//
//   node scripts/wave.mjs                 public/sfx.wav → out/wave.png
//   node scripts/wave.mjs out/effort.mp4  measure the final mux instead
//   --timeline other.json                 beats from another timeline (default timeline.json)
//
// Every hit in the waveform should sit on (or a hair after) a beat line.
import {execFileSync, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const ti = argv.indexOf('--timeline');
const timelinePath = path.resolve(ti === -1 ? path.join(ROOT, 'timeline.json') : argv.splice(ti, 2)[1]);
const input = path.resolve(argv[0] ?? path.join(ROOT, 'public', 'sfx.wav'));
if (!fs.existsSync(input)) {
  console.error(`${path.relative(ROOT, input)} not found. Run \`npm run sfx\` first.`);
  process.exit(1);
}

const TARGET_LUFS = -14;
const MAX_TRUE_PEAK = -1;
const W = 1800;
const H = 280;

const tl = JSON.parse(fs.readFileSync(timelinePath, 'utf8'));
const beats = [];
const walk = (v, key) => {
  if (key === 'fps' || key === 'duration') return;
  if (typeof v === 'number') beats.push(v);
  else if (Array.isArray(v)) v.forEach((x) => walk(x));
  else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => walk(x, k));
};
walk(tl);

const marks = [...new Set(beats)]
  .map((t) => `drawbox=x=${Math.round((t / tl.duration) * W)}:y=0:w=2:h=ih:color=0xD97757@0.9:t=fill`)
  .join(',');
const seconds = `drawgrid=w=${W / tl.duration}:h=${H}:color=white@0.12`;

fs.mkdirSync(path.join(ROOT, 'out'), {recursive: true});
const png = path.join(ROOT, 'out', 'wave.png');
execFileSync('ffmpeg', [
  '-loglevel', 'error', '-y', '-i', input,
  '-filter_complex',
  `color=c=0x141413:s=${W}x${H}:d=1[bg];` +
    `[0:a]aformat=channel_layouts=mono,showwavespic=s=${W}x${H}:scale=sqrt:colors=0x8A877F[w];` +
    `[bg][w]overlay=format=auto,${seconds},${marks}`,
  '-frames:v', '1', png,
]);

const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', input, '-af', 'ebur128=peak=true', '-f', 'null', '-'], {
  encoding: 'utf8',
});
const summary = r.stderr.slice(r.stderr.lastIndexOf('Summary'));
const lufs = Number(summary.match(/I:\s+(-?[\d.]+) LUFS/)?.[1]);
const peak = Number(summary.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1]);

console.log(`waveform: ${path.relative(ROOT, png)} (${beats.length} beats in coral, grid = 1s)`);
console.log(`loudness: ${lufs} LUFS integrated (target ${TARGET_LUFS} ±1)`);
console.log(`true peak: ${peak} dBFS (keep ≤ ${MAX_TRUE_PEAK})`);
if (Math.abs(lufs - TARGET_LUFS) > 1) console.warn('WARN loudness off target: re-run the cue sheet, check TARGET_LUFS');
if (peak > MAX_TRUE_PEAK) console.warn('WARN true peak too hot: AAC encoding may clip, lower the master ceiling');
