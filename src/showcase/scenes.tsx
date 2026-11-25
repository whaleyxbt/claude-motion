import React from 'react';
import {AbsoluteFill, Easing} from 'remotion';
import tl from '../../showcase.json';
import {band, C, clamp01, easeIn, easeInOut, easeOut, F, FPS, lerp, prog, rand, sp} from '../lib';
import {Background} from '../components/Background';
import {Mask, Roll, Spark} from '../components/primitives';
import {BarGeom, PromptBar} from '../components/PromptBar';

export const STL = tl;
export const SW = 1080;
export const SH = 1920;
export const FRAMES = Math.round(STL.duration * FPS);
export const PROMPT = 'make a video that surprises people';

// Sample data for testing the pipeline: a fictional creator and invented numbers.
export const HANDLE = '@noorbuilds';
const STATS = [
  {to: 48, fmt: (n: number) => `${Math.round(n)}`, label: 'videos shipped'},
  {to: 1.2, fmt: (n: number) => `${n.toFixed(1)}M`, label: 'views'},
  {to: 18.4, fmt: (n: number) => `${n.toFixed(1)}K`, label: 'new subscribers'},
];

const center: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  width: SW,
  textAlign: 'center',
};

/* ---------- scene 1: hook, prompt bar that docks to the top ---------- */

const barGeom = (t: number, frame: number): BarGeom => {
  const {s1} = STL;
  const dock = prog(t, s1.dockStart, s1.dockEnd, easeInOut);
  const press = sp(frame, s1.enter, {damping: 9, stiffness: 230, mass: 0.7});
  const squash = press * (1 - band(t, s1.enter + 0.08, s1.enter + 0.35)) * 0.03;
  const w = lerp(900, 840, dock) * (1 - squash);
  return {x: (SW - w) / 2, y: lerp(1120, 96, dock), w, h: lerp(96, 78, dock)};
};

const Hook: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const {s1, s4} = STL;
  const out = prog(t, s1.exit, s1.exit + 0.35, easeIn);
  const g = barGeom(t, frame);
  const k = clamp01((t - s1.typeStart) / (s1.typeEnd - s1.typeStart));
  const typing = k > 0 && k < 1;
  const caretOn = typing || Math.floor(t * 4.8) % 2 === 0;
  const barOut = prog(t, s4.enter - 0.2, s4.enter + 0.2, easeIn);
  const breathe = 1 + Math.sin(t * 1.6) * 0.008;
  return (
    <>
      {out < 1 && (
        <div style={{...center, top: 330, opacity: 1 - out}}>
          <div style={{display: 'flex', justifyContent: 'center', marginBottom: 60, transform: `translateY(${-out * 60}px)`}}>
            <Spark size={120} rotate={t * 24} k={1} />
          </div>
          <div style={{transform: `scale(${breathe})`}}>
            <div style={{fontFamily: F.serif, fontSize: 96, color: C.creamDim, lineHeight: 1.05, letterSpacing: '-0.02em'}}>
              <Mask k={1} out={out}>I asked Claude Code</Mask>
            </div>
            <div style={{fontFamily: F.serif, fontSize: 158, color: C.cream, lineHeight: 1, letterSpacing: '-0.02em'}}>
              <Mask k={1} out={prog(t, s1.exit + 0.04, s1.exit + 0.4, easeIn)}>
                for <i style={{color: C.coral}}>one</i> video.
              </Mask>
            </div>
          </div>
        </div>
      )}
      {barOut < 1 && (
        <>
          <PromptBar
            g={g}
            text={PROMPT}
            chars={k * PROMPT.length}
            caretOn={caretOn && t < s1.enter}
            tagA="ready"
            tagB="working"
            tagK={sp(frame, s1.enter, {damping: 12, stiffness: 190, mass: 0.75})}
            tagOpacity={1}
            opacity={1 - barOut}
            lift={1}
          />
          <div style={{position: 'absolute', left: g.x + 16, top: g.y + g.h / 2 - 15, opacity: 1 - barOut}}>
            <Spark size={30} rotate={t * 90} weight={10} />
          </div>
        </>
      )}
    </>
  );
};

/* ---------- scene 2: the numbers ---------- */

const Stats: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const {s2} = STL;
  if (t < s2.title - 0.1 || t > s2.exit + 0.7) return null;
  const exitAt = (i: number) => prog(t, s2.exit + i * 0.05, s2.exit + 0.4 + i * 0.05, easeIn);
  const row = (i: number, value: React.ReactNode, label: string) => {
    const at = s2.stats[i];
    const k = sp(frame, at, {damping: 11, stiffness: 210, mass: 0.7});
    const o = exitAt(i + 1);
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: 130,
          top: 700 + i * 270,
          opacity: clamp01(k * 1.4) * (1 - o),
          transform: `translateY(${(1 - k) * 70 - o * 90}px)`,
        }}
      >
        <div style={{fontFamily: F.serif, fontSize: 176, lineHeight: 1, color: C.cream, letterSpacing: '-0.02em'}}>
          {value}
        </div>
        <div style={{fontFamily: F.mono, fontSize: 26, letterSpacing: '0.22em', color: C.muted, textTransform: 'uppercase', marginTop: 10}}>
          {label}
        </div>
      </div>
    );
  };
  const count = (i: number) => STATS[i].to * prog(t, s2.stats[i], s2.stats[i] + 0.9, easeOut);
  const titleOut = exitAt(0);
  return (
    <>
      <div style={{...center, top: 300, fontFamily: F.serif, fontSize: 176, color: C.cream, lineHeight: 1, letterSpacing: '-0.02em'}}>
        <Mask k={prog(t, s2.title, s2.title + 0.8, easeOut)} out={titleOut}>
          From <i style={{color: C.coral}}>zero.</i>
        </Mask>
      </div>
      {STATS.map((s, i) => row(i, s.fmt(count(i)), s.label))}
      {row(
        3,
        <span>
          <Roll a="6 hours" b="20 min" k={prog(t, s2.stats[3] + 0.55, s2.stats[3] + 1.0, easeInOut)} />
        </span>,
        'per video, now',
      )}
    </>
  );
};

/* ---------- scene 3: how — four pieces of the pipeline ---------- */

const CardArt: React.FC<{i: number; t: number}> = ({i, t}) => {
  if (i === 0) {
    const head = (t * 0.35) % 1;
    return (
      <svg width={300} height={120} viewBox="0 0 300 120">
        <line x1={0} y1={60} x2={300} y2={60} stroke={C.lineHi} strokeWidth={3} />
        {[0.06, 0.15, 0.3, 0.38, 0.52, 0.6, 0.71, 0.86, 0.94].map((x, j) => (
          <circle key={j} cx={x * 300} cy={60} r={j === 6 ? 10 : 6} fill={j === 6 ? C.coral : C.creamDim} />
        ))}
        <line x1={head * 300} y1={20} x2={head * 300} y2={100} stroke={C.coralHi} strokeWidth={3} />
      </svg>
    );
  }
  if (i === 1) {
    return (
      <svg width={300} height={120} viewBox="0 0 300 120">
        {Array.from({length: 30}, (_, j) => {
          const h = 12 + 90 * rand(j + 3) * (0.55 + 0.45 * Math.sin(t * 7 + j * 0.7) ** 2);
          return <rect key={j} x={j * 10 + 2} y={60 - h / 2} width={6} height={h} rx={3} fill={j % 7 === 3 ? C.coral : C.creamDim} />;
        })}
      </svg>
    );
  }
  if (i === 2) {
    return (
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 88px)', gap: 10}}>
        {Array.from({length: 6}, (_, j) => (
          <div
            key={j}
            style={{
              height: 54,
              borderRadius: 8,
              border: `1px solid ${C.lineHi}`,
              background: `linear-gradient(135deg, ${C.panelHi}, rgba(217,119,87,${0.08 + 0.1 * rand(j + 9)}))`,
            }}
          />
        ))}
      </div>
    );
  }
  const p = (t * 0.25) % 1;
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18}}>
      <svg width={96} height={96} viewBox="0 0 96 96">
        <circle cx={48} cy={48} r={44} fill="none" stroke={C.coral} strokeWidth={4} />
        <path d="M39 30 L68 48 L39 66 Z" fill={C.cream} />
      </svg>
      <div style={{width: 260, height: 6, borderRadius: 3, background: C.faint}}>
        <div style={{width: `${p * 100}%`, height: 6, borderRadius: 3, background: C.coral}} />
      </div>
    </div>
  );
};

const CARDS = ['timeline.json', 'sound.wav', 'contact sheets', 'render.mp4'];

const How: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const {s3} = STL;
  if (t < s3.line1 - 0.1 || t > s3.exit + 0.7) return null;
  const out = (d: number) => prog(t, s3.exit + d, s3.exit + 0.35 + d, easeIn);
  return (
    <>
      <div style={{...center, top: 300, fontFamily: F.serif, fontSize: 150, color: C.cream, lineHeight: 1.05, letterSpacing: '-0.02em'}}>
        <div>
          <Mask k={prog(t, s3.line1, s3.line1 + 0.8, easeOut)} out={out(0)}>No editor.</Mask>
        </div>
        <div>
          <Mask k={prog(t, s3.line2, s3.line2 + 0.8, easeOut)} out={out(0.04)}>
            Just <i style={{color: C.coral}}>prompts.</i>
          </Mask>
        </div>
      </div>
      {CARDS.map((label, i) => {
        const k = sp(frame, s3.cards[i], {damping: 11, stiffness: 220, mass: 0.7});
        const o = out(0.06 + i * 0.03);
        const x = 120 + (i % 2) * 440;
        const y = 760 + Math.floor(i / 2) * 440;
        return (
          <div
            key={label}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: 400,
              height: 400,
              borderRadius: 28,
              background: `linear-gradient(180deg, ${C.panelHi}, ${C.panel})`,
              border: `1px solid ${C.lineHi}`,
              boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
              opacity: clamp01(k * 1.4) * (1 - o),
              transform: `translateY(${(1 - k) * 80 - o * 100}px) scale(${0.92 + 0.08 * k})`,
              display: 'flex',
              flexDirection: 'column',
              padding: 34,
              boxSizing: 'border-box',
            }}
          >
            <div style={{fontFamily: F.mono, fontSize: 24, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.creamDim}}>
              {label}
            </div>
            <div style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <CardArt i={i} t={t} />
            </div>
          </div>
        );
      })}
    </>
  );
};

/* ---------- scene 4: the render counter ---------- */

const CODE = [
  'const k = prog(t, s2.title, s2.title + 0.8, easeOut);',
  "mix.put(s4['impact'], impact(), 0.34)",
  '<Mask k={k} out={out}>From <i>zero.</i></Mask>',
  'npx remotion render Showcase out/showcase.mp4',
  "mix.typing(s1['typeStart'], s1['typeEnd'], 34)",
  'const g = barGeom(t, frame);',
  'transform: `scale(${lerp(1, 0.44, pull)})`',
  'put(s4["countStart"], riser(1.4), 0.24)',
  'node scripts/sheet.mjs --video out/draft.mp4',
  'sp(frame, at, {damping: 11, stiffness: 210})',
  '✓ review pass clean — 0 issues',
  'ffmpeg -i showcase-silent.mp4 -i showcase.wav',
];

export const renderProgress = (t: number) =>
  prog(t, STL.s4.countStart, STL.s4.countEnd, Easing.bezier(0.5, 0, 0.75, 1));

const Render: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const {s4} = STL;
  if (t < s4.enter - 0.1) return null;
  const k = sp(frame, s4.enter, {damping: 15, stiffness: 160});
  const p = renderProgress(t);
  const n = Math.floor(p * FRAMES);
  const done = band(t, s4.countEnd, s4.countEnd + 0.12);
  const scroll = Math.max(0, t - s4.enter) ** 2 * 420;
  return (
    <>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          opacity: 0.55 * k,
          maskImage: 'radial-gradient(ellipse 60% 55% at 50% 50%, #000 0%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 55% at 50% 50%, #000 0%, transparent 80%)',
        }}
      >
        <div style={{position: 'absolute', left: 90, top: 1920 - (scroll % 2400), fontFamily: F.mono, fontSize: 24, lineHeight: '50px', color: C.faint, whiteSpace: 'pre'}}>
          {Array.from({length: 96}, (_, j) => CODE[(j * 5) % CODE.length]).join('\n')}
        </div>
      </div>
      <div style={{...center, top: 720, opacity: k, transform: `translateY(${(1 - k) * 60}px)`}}>
        <div style={{fontFamily: F.mono, fontSize: 28, letterSpacing: '0.24em', color: C.creamDim}}>
          <Roll a="RENDERING" b={<span style={{color: C.coral}}>✓ DONE</span>} k={done} />
        </div>
        <div style={{fontFamily: F.mono, fontSize: 190, fontWeight: 600, color: C.cream, marginTop: 30, letterSpacing: '-0.04em'}}>
          {String(n).padStart(3, '0')}
          <span style={{color: C.muted, fontWeight: 400}}>/{FRAMES}</span>
        </div>
        <div style={{margin: '50px auto 0', width: 820, height: 12, borderRadius: 6, background: C.faint}}>
          <div
            style={{
              width: `${p * 100}%`,
              height: 12,
              borderRadius: 6,
              background: C.coral,
              boxShadow: `0 0 ${20 + 30 * p}px ${C.coral}`,
            }}
          />
        </div>
      </div>
    </>
  );
};

/** The inner video: everything before the pull-back, drawn at time t. */
export const Scenes: React.FC<{t: number}> = ({t}) => {
  const frame = t * FPS;
  const glow = 0.25 + 0.5 * renderProgress(t);
  return (
    <AbsoluteFill style={{width: SW, height: SH, overflow: 'hidden'}}>
      <Background t={t} glow={glow} glowY={52} />
      <Hook t={t} frame={frame} />
      <Stats t={t} frame={frame} />
      <How t={t} frame={frame} />
      <Render t={t} frame={frame} />
    </AbsoluteFill>
  );
};
