import React from 'react';
import {AbsoluteFill, Easing, useCurrentFrame} from 'remotion';
import {band, C, clamp01, easeOut, F, FPS, lerp, prog, sp} from '../lib';
import {Background} from '../components/Background';
import {Grain, Mask} from '../components/primitives';
import {useFonts} from '../components/useFonts';
import {FRAMES, HANDLE, PROMPT, Scenes, SH, STL, SW} from './scenes';

const PULL = Easing.bezier(0.7, 0, 0.18, 1);
const MINI = 0.44;
const MINI_CY = 664;
const PAD = 34;
const TOP_BAR = 64;
const ABOVE = 64;
const BELOW = 124;

export const Showcase: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const {s4, s5} = STL;

  // Hero: the full-screen video pulls back into the terminal that rendered it,
  // then restarts inside it.
  const pull = prog(t, s4.pullStart, s4.impact, PULL);
  const hit = Math.max(0, t - s4.impact);
  const after = t >= s4.impact;
  const inner = after ? hit : Math.min(t, s4.impact);
  const s = lerp(1, MINI, pull);
  const cy = lerp(SH / 2, MINI_CY, pull);
  const shake = after ? Math.exp(-hit * 7) : 0;
  const sx = Math.sin(t * 93) * 16 * shake;
  const sy = Math.cos(t * 71) * 12 * shake;
  const flash = after ? 0.6 * Math.exp(-hit * 9) : 0;
  const ring = band(hit, 0, 0.9);

  const w = SW * MINI;
  const h = SH * MINI;
  const win = {
    x: (SW - w) / 2 - PAD,
    y: MINI_CY - h / 2 - TOP_BAR - ABOVE,
    w: w + PAD * 2,
    h: h + TOP_BAR + ABOVE + BELOW,
  };
  const chrome = band(pull, 0.45, 1);
  const land = sp(frame, s4.impact, {damping: 8, stiffness: 200});
  const bump = after ? 1 + 0.035 * Math.sin(land * Math.PI) : 1;
  const dim = 1 - 0.4 * prog(t, s5.line1, s5.line1 + 0.6);

  const rise = (at: number) => prog(t, at, at + 0.8, easeOut);
  const line = (at: number) => {
    const k = sp(frame, at, {damping: 14, stiffness: 140});
    return {opacity: clamp01(k * 1.5), transform: `translateY(${(1 - k) * 30}px)`};
  };

  return (
    <AbsoluteFill style={{background: C.bg}}>
      <Background t={t} glow={0.35 + 0.65 * Math.exp(-hit * 1.6) * (after ? 1 : 0)} glowY={36} />
      <AbsoluteFill style={{transform: `translate(${sx}px, ${sy}px) scale(${bump})`, transformOrigin: `50% ${MINI_CY}px`}}>
        {chrome > 0 && (
          <div
            style={{
              position: 'absolute',
              left: win.x,
              top: win.y,
              width: win.w,
              height: win.h,
              borderRadius: 26,
              background: 'linear-gradient(180deg, rgba(40,39,36,0.96), rgba(24,23,22,0.96))',
              border: `1px solid ${C.lineHi}`,
              boxShadow: `0 40px 120px rgba(0,0,0,0.6), 0 0 ${80 * (1 - ring)}px rgba(217,119,87,${0.5 * (1 - ring) * (after ? 1 : 0)})`,
              opacity: chrome,
              transform: `scale(${lerp(1.5, 1, chrome)})`,
              fontFamily: F.mono,
              overflow: 'hidden',
            }}
          >
            <div style={{height: TOP_BAR, display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px', borderBottom: `1px solid ${C.line}`}}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{width: 14, height: 14, borderRadius: 7, background: i === 0 ? C.coral : C.faint}} />
              ))}
              <span style={{flex: 1, textAlign: 'center', fontSize: 19, color: C.muted, marginRight: 60}}>~/motion — claude</span>
            </div>
            <div style={{height: ABOVE, display: 'flex', alignItems: 'center', padding: `0 ${PAD}px`, fontSize: 19, color: C.creamDim, whiteSpace: 'nowrap'}}>
              <span style={{color: C.coral, marginRight: 12}}>&gt;</span>
              {PROMPT}
            </div>
            <div style={{position: 'absolute', left: PAD, bottom: 26, fontSize: 19, lineHeight: '34px', color: C.creamDim}}>
              <div>
                <span style={{color: C.coral}}>✓</span> rendered {FRAMES}/{FRAMES} frames
              </div>
              <div>
                <span style={{color: C.coral}}>✓</span> out/<span style={{color: C.cream}}>this-video.mp4</span>
              </div>
            </div>
          </div>
        )}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: SW,
            height: SH,
            transform: `translate(0px, ${cy - SH / 2}px) scale(${s})`,
            transformOrigin: '50% 50%',
            borderRadius: 40 * pull,
            overflow: 'hidden',
            boxShadow: pull > 0 ? `0 0 0 ${2 / s}px ${C.lineHi}` : undefined,
            opacity: dim,
          }}
        >
          <Scenes t={inner} />
        </div>
        {after && ring < 1 && (
          <svg width={SW} height={SH} style={{position: 'absolute', inset: 0}}>
            <circle cx={SW / 2} cy={MINI_CY} r={lerp(320, 1300, ring)} fill="none" stroke={C.coral} strokeWidth={lerp(14, 1, ring)} opacity={1 - ring} />
          </svg>
        )}
      </AbsoluteFill>

      <div style={{position: 'absolute', left: 0, width: SW, top: 1300, textAlign: 'center'}}>
        <div style={{fontFamily: F.serif, fontSize: 112, lineHeight: 1.02, color: C.cream, letterSpacing: '-0.02em'}}>
          <div>
            <Mask k={rise(s5.line1)}>This whole video</Mask>
          </div>
          <div>
            <Mask k={rise(s5.line2)}>
              was made by <i style={{color: C.coral}}>code.</i>
            </Mask>
          </div>
        </div>
        <div style={{fontFamily: F.sans, fontSize: 40, color: C.creamDim, marginTop: 34, ...line(s5.sub)}}>
          Every pixel. Every sound. Just prompts.
        </div>
        <div style={{fontFamily: F.mono, fontSize: 24, letterSpacing: '0.2em', color: C.muted, marginTop: 40, textTransform: 'uppercase', ...line(s5.handle)}}>
          {HANDLE} · made with Claude Code
        </div>
      </div>

      <AbsoluteFill style={{background: C.cream, opacity: flash, mixBlendMode: 'screen', pointerEvents: 'none'}} />
      <Grain frame={frame} />
    </AbsoluteFill>
  );
};
