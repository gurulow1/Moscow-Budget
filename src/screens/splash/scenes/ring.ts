import { clamp01, el, hexRgb, inOutCubic, outCubic, outExpo, rgba, type MountScene } from '../kit';

// About 85 of every 100 rubles of income are taxes on work and business: a ring that sweeps in, hover for the rest.
export const mountRing: MountScene = (ctx) => {
  const { stage } = ctx;
  const DARK = ctx.dark;
  const REDUCE = ctx.reduce;
  const fig = el('figure', 'r-ring');
  fig.setAttribute('role', 'img');
  fig.setAttribute('aria-label', 'Кольцо доходов: 85 процентов — налог на прибыль, НДФЛ и налоги малого бизнеса, 15 процентов — остальные доходы.');
  const cv = el('canvas');
  cv.setAttribute('aria-hidden', 'true');
  const center = el('div', 'r-center');
  center.setAttribute('aria-hidden', 'true');
  const label = el('div', 'r-label', '<i></i><span></span>');
  const num = el('div', 'r-num');
  const cap = el('div', 'r-cap');
  center.append(label, num, cap);
  fig.append(cv, center);
  stage.append(fig);
  const labelText = label.querySelector('span');
  const c2d = cv.getContext('2d');
  const SEG = [
    { share: 85, a: hexRgb(DARK ? '#6E9BFF' : '#3D7BFD'), b: hexRgb(DARK ? '#A58BFF' : '#7C5CF5'), name: 'Налоги с работы и бизнеса' },
    { share: 15, a: hexRgb(DARK ? '#39404F' : '#DCE1E9'), b: hexRgb(DARK ? '#39404F' : '#DCE1E9'), name: 'Остальные доходы' },
  ];
  const GLOW = DARK ? 0.5 : 0.32;
  const DROP = DARK ? 0 : 1;
  const T = { start: 0.3, dur: 1.4 };
  let S = 0;
  let k = 1;
  let hover = -1;
  let hoverAt = 0;

  function resize() {
    const r = stage.getBoundingClientRect();
    S = Math.min(r.width, r.height) * 0.86;
    fig.style.width = fig.style.height = S + 'px';
    fig.style.setProperty('--size', S + 'px');
    k = Math.min(window.devicePixelRatio || 1, 2);
    const px = Math.round(S * 1.32 * k);
    if (cv.width !== px) {
      cv.width = px;
      cv.height = px;
    }
  }

  let shown = '';
  function frame(t: number) {
    const sp = REDUCE ? 1 : clamp01((t - T.start) / T.dur);
    const sweep = inOutCubic(sp);
    const e = outExpo(sp);
    const W = cv.width;
    c2d.setTransform(1, 0, 0, 1, 0, 0);
    c2d.clearRect(0, 0, W, W);
    const cx = W / 2;
    const cy = W / 2;
    const scale = 0.9 + 0.1 * e;
    const rot = (1 - e) * -0.75;
    const Rout = S * 0.465 * k * scale;
    const th = S * 0.12 * k * scale;
    const Rin = Rout - th;
    const gapA = (S * 0.02 * k) / (Rout - th / 2);
    let a = -Math.PI / 2 + rot;
    const end = a + Math.PI * 2 * sweep;
    c2d.lineCap = 'round';
    SEG.forEach((s, i) => {
      const span = (Math.PI * 2 * s.share) / 100;
      const a0 = a + gapA / 2;
      const a1 = Math.min(a + span - gapA / 2, end);
      a += span;
      if (a1 - a0 < 0.01) return;
      const lift = hover === i ? outCubic(clamp01((t - hoverAt) / 0.3)) : 0;
      const dim = hover >= 0 && hover !== i ? 0.35 : 1;
      c2d.save();
      c2d.globalAlpha = clamp01(sp * 5) * dim;
      c2d.shadowColor = i === 1 ? rgba(DARK ? [0, 0, 0] : [60, 72, 100], DARK ? 0.5 : 0.14) : rgba(s.b, GLOW);
      c2d.shadowBlur = S * 0.08 * k;
      c2d.shadowOffsetY = DROP * S * 0.03 * k;
      // A thick arc with round ends, the colour running along it.
      const g = c2d.createConicGradient(a0, cx, cy);
      const f = Math.max(0.001, (a1 - a0) / (Math.PI * 2));
      g.addColorStop(0, rgba(s.a, 1));
      g.addColorStop(f, rgba(s.b, 1));
      g.addColorStop(Math.min(1, f + 0.0001), rgba(s.b, 1));
      g.addColorStop(1, rgba(s.b, 1));
      c2d.strokeStyle = g;
      c2d.lineWidth = th + lift * S * 0.02 * k;
      const rm = (Rout + Rin) / 2;
      const capA = th / 2 / rm;
      c2d.beginPath();
      c2d.arc(cx, cy, rm, a0 + capA, Math.max(a0 + capA + 0.001, a1 - capA));
      c2d.stroke();
      c2d.restore();
      // Now and then a soft light runs along the big arc.
      if (i === 0 && sp >= 1 && !REDUCE) {
        const q = ((t - T.start - T.dur) % 4.2) / 1.6;
        if (q >= 0 && q < 1) {
          const at = a0 + (a1 - a0) * outCubic(q);
          c2d.save();
          c2d.globalAlpha = 0.55 * Math.sin(Math.PI * q);
          c2d.strokeStyle = 'rgba(255,255,255,0.9)';
          c2d.lineWidth = th * 0.34;
          c2d.beginPath();
          c2d.arc(cx, cy, rm, Math.max(a0 + capA, at - 0.22), Math.max(a0 + capA + 0.001, at));
          c2d.stroke();
          c2d.restore();
        }
      }
    });
    // Centre: the share, counted up with the sweep; the hovered part shows its own name.
    let l: string;
    let n: string;
    let c: string;
    if (hover === 1) {
      l = SEG[1].name;
      n = '15%';
      c = 'пошлины, аренда<br>и другое';
    } else {
      l = 'Доходы города';
      n = Math.round(85 * (REDUCE ? 1 : inOutCubic(sp))) + '%';
      c = 'налоги с работы<br>и бизнеса';
    }
    const key = l + n + c;
    if (key !== shown) {
      shown = key;
      labelText.textContent = l;
      num.textContent = n;
      cap.innerHTML = c;
    }
    const intro = REDUCE ? 1 : clamp01((t - 0.42) / 0.7);
    center.style.opacity = String(outCubic(intro));
    center.style.transform = `scale(${(0.96 + 0.04 * outExpo(intro)).toFixed(4)})`;
  }

  const segmentAt = (ev: MouseEvent) => {
    const r = cv.getBoundingClientRect();
    const x = ev.clientX - (r.left + r.width / 2);
    const y = ev.clientY - (r.top + r.height / 2);
    const d = Math.hypot(x, y) / S;
    if (d < 0.3 || d > 0.56) return -1;
    let a = Math.atan2(y, x) + Math.PI / 2;
    if (a < 0) a += Math.PI * 2;
    return a < Math.PI * 2 * 0.85 ? 0 : 1;
  };
  const setHover = (i: number) => {
    if (i !== hover) {
      hover = i;
      hoverAt = ctx.now();
    }
  };
  let tapTimer = 0;
  cv.addEventListener('pointermove', (ev) => {
    if (ev.pointerType === 'mouse') setHover(segmentAt(ev));
  });
  cv.addEventListener('pointerleave', (ev) => {
    if (ev.pointerType === 'mouse') setHover(-1);
  });
  // A tap shows the other part for a few seconds.
  cv.addEventListener('click', (ev) => {
    setHover(segmentAt(ev));
    window.clearTimeout(tapTimer);
    tapTimer = window.setTimeout(() => setHover(-1), 3000);
  });
  return { frame, resize, stop: () => window.clearTimeout(tapTimer) };
};
