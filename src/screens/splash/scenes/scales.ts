import { NB, clamp01, el, hexRgb, mix, outCubic, rgba, sectorRgb, type MountScene } from '../kit';

// Education and social support weigh almost the same: coins land on two pans, the beam swings and settles level.
const COINS = 8;
const GAP = 0.075;
const FALL = 0.3;
// The beam: a spring back to level, damping, the torque of the loads, and stops at ±0.3 rad.
const K = 27;
const C = 1.3;
const G = 95;
const MAXA = 0.3;

export const mountScales: MountScene = (ctx) => {
  const { stage } = ctx;
  const DARK = ctx.dark;
  const REDUCE = ctx.reduce;
  const SECTOR = sectorRgb(DARK);
  const cv = el('canvas', 'st-cv');
  stage.append(cv);
  cv.setAttribute('role', 'img');
  cv.setAttribute('aria-label', 'Весы: слева образование, 814,6 миллиарда рублей, справа соцподдержка, 810 миллиардов. Коромысло качается и замирает почти ровно.');
  const g = cv.getContext('2d');
  const SIDE = [
    { name: 'ОБРАЗОВАНИЕ', v: '814,6', m: 814.6, rgb: hexRgb(SECTOR.c2), t0: 0.5 },
    { name: 'СОЦПОДДЕРЖКА', v: '810,0', m: 810, rgb: hexRgb(SECTOR.c3), t0: 1.3 },
  ];
  const INK = hexRgb(DARK ? '#F2F4F8' : '#1C1F26');
  const METAL = DARK ? ['#D9DEE7', '#9AA2B1', '#6E7687'] : ['#5A616E', '#2E333C', '#1B1E24'];
  const GOLD = DARK ? '#E6BE68' : '#B8892F';
  const EQ = (G * (1 - SIDE[1].m / SIDE[0].m)) / K;
  let sim = { t: 0, th: 0, w: 0 };
  const load = (t: number, s: (typeof SIDE)[number]) => {
    let n = 0;
    for (let i = 0; i < COINS; i++) if (t >= s.t0 + i * GAP + FALL) n++;
    return (n / COINS) * (s.m / SIDE[0].m);
  };
  // Stepped at 240 Hz from the start, so a given moment always shows the same angle.
  function angle(t: number) {
    if (REDUCE) return EQ;
    if (t < sim.t) sim = { t: 0, th: 0, w: 0 };
    const dt = 1 / 240;
    while (sim.t + dt <= t) {
      const air = sim.t > 5 ? 0.16 * Math.sin(sim.t * 0.9) * Math.sin(sim.t * 1.7 + 1) : 0;
      const acc = G * (load(sim.t, SIDE[0]) - load(sim.t, SIDE[1])) - K * sim.th - C * sim.w + air;
      sim.w += acc * dt;
      sim.th += sim.w * dt;
      if (sim.th > MAXA) {
        sim.th = MAXA;
        if (sim.w > 0) sim.w *= -0.25;
      }
      if (sim.th < -MAXA) {
        sim.th = -MAXA;
        if (sim.w < 0) sim.w *= -0.25;
      }
      sim.t += dt;
    }
    return sim.th;
  }
  let geo: { Sw: number; cx: number; py: number; half: number; hang: number; panW: number; baseY: number } | null = null;
  let k = 1;

  function resize() {
    const fit = ctx.fitCanvas(cv);
    k = fit.k;
    const r = fit.r;
    const Sw = Math.min(r.width * 0.98, r.height * 1.12, 640);
    const top = (r.height - Sw * 0.86) / 2;
    geo = { Sw, cx: r.width / 2, py: top + Sw * 0.2, half: Sw * 0.36, hang: Sw * 0.3, panW: Sw * 0.28, baseY: top + Sw * 0.8 };
  }
  const metal = (x0: number, y0: number, x1: number, y1: number) => {
    const m = g.createLinearGradient(x0, y0, x1, y1);
    m.addColorStop(0, METAL[0]);
    m.addColorStop(0.5, METAL[1]);
    m.addColorStop(1, METAL[2]);
    return m;
  };

  function frame(t: number) {
    if (!geo) return;
    const { Sw, cx, py, half, hang, panW, baseY } = geo;
    const S = (v: number) => v * k;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cv.width, cv.height);
    const a0 = REDUCE ? 1 : outCubic(clamp01((t - 0.05) / 0.5));
    g.globalAlpha = a0;
    const th = angle(t);
    const ends = [
      [cx - half * Math.cos(th), py + half * Math.sin(th)],
      [cx + half * Math.cos(th), py - half * Math.sin(th)],
    ];
    // Base and pillar.
    g.fillStyle = rgba(INK, DARK ? 0.25 : 0.12);
    g.beginPath();
    g.ellipse(S(cx), S(baseY + Sw * 0.03), S(Sw * 0.2), S(Sw * 0.018), 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = metal(S(cx - Sw * 0.16), 0, S(cx + Sw * 0.16), 0);
    g.beginPath();
    g.roundRect(S(cx - Sw * 0.16), S(baseY), S(Sw * 0.32), S(Sw * 0.03), S(Sw * 0.012));
    g.fill();
    g.fillStyle = metal(S(cx - Sw * 0.014), 0, S(cx + Sw * 0.014), 0);
    g.fillRect(S(cx - Sw * 0.012), S(py), S(Sw * 0.024), S(baseY - py));
    // The dial above the pivot: ticks and a needle that turns with the beam.
    const dialR = Sw * 0.13;
    g.strokeStyle = rgba(INK, 0.35);
    g.lineWidth = S(1);
    for (let i = -4; i <= 4; i++) {
      const a = -Math.PI / 2 + i * 0.09;
      const r0 = dialR * (i === 0 ? 0.86 : 0.91);
      g.beginPath();
      g.moveTo(S(cx + Math.cos(a) * r0), S(py - Sw * 0.02 + Math.sin(a) * r0));
      g.lineTo(S(cx + Math.cos(a) * dialR), S(py - Sw * 0.02 + Math.sin(a) * dialR));
      g.stroke();
    }
    g.strokeStyle = GOLD;
    g.lineWidth = S(Math.max(1.5, Sw * 0.005));
    g.lineCap = 'round';
    const na = -Math.PI / 2 - th;
    g.beginPath();
    g.moveTo(S(cx), S(py));
    g.lineTo(S(cx + Math.cos(na) * dialR * 0.95), S(py + Math.sin(na) * dialR * 0.95));
    g.stroke();
    // Strings and pans, then the coins on them.
    const panY = ends.map((e) => e[1] + hang);
    ends.forEach((e, i) => {
      const [ex, ey] = e;
      const py2 = panY[i];
      g.strokeStyle = rgba(INK, DARK ? 0.5 : 0.45);
      g.lineWidth = S(1);
      g.beginPath();
      g.moveTo(S(ex), S(ey));
      g.lineTo(S(ex - panW * 0.46), S(py2));
      g.moveTo(S(ex), S(ey));
      g.lineTo(S(ex + panW * 0.46), S(py2));
      g.stroke();
      // Coins: a stack that lands one by one.
      const s = SIDE[i];
      const cw = panW * 0.34;
      const ch = cw * 0.3;
      const thick = panW * 0.055;
      for (let c = 0; c < COINS; c++) {
        const start = s.t0 + c * GAP;
        const p = REDUCE ? 1 : clamp01((t - start) / FALL);
        if (p <= 0) continue;
        const yLand = py2 - thick * (c + 1) - Sw * 0.004;
        const y = yLand - (1 - p * p) * Sw * 0.45;
        g.globalAlpha = a0 * clamp01(p * 4);
        g.fillStyle = rgba(mix(s.rgb, [0, 0, 0], 0.25), 1);
        g.beginPath();
        g.ellipse(S(ex), S(y + thick), S(cw), S(ch), 0, 0, Math.PI);
        g.lineTo(S(ex - cw), S(y));
        g.ellipse(S(ex), S(y), S(cw), S(ch), 0, Math.PI, 0, true);
        g.fill();
        g.fillStyle = rgba(s.rgb, 1);
        g.fillRect(S(ex - cw), S(y), S(cw * 2), S(thick));
        g.fillStyle = rgba(mix(s.rgb, [255, 255, 255], 0.28), 1);
        g.beginPath();
        g.ellipse(S(ex), S(y), S(cw), S(ch), 0, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = a0;
      // The pan: a shallow dish.
      g.fillStyle = metal(S(ex - panW / 2), 0, S(ex + panW / 2), 0);
      g.beginPath();
      g.ellipse(S(ex), S(py2), S(panW / 2), S(panW * 0.1), 0, 0, Math.PI);
      g.ellipse(S(ex), S(py2), S(panW / 2), S(panW * 0.035), 0, Math.PI, 0, true);
      g.fill();
      // Label under the pan.
      const fs = Math.max(10.5, Math.min(15, Sw * 0.03));
      g.textAlign = 'center';
      g.textBaseline = 'alphabetic';
      g.fillStyle = rgba(INK, 0.55);
      g.font = `600 ${S(fs * 0.78)}px Onest, "Segoe UI", sans-serif`;
      g.fillText(s.name, S(ex), S(py2 + panW * 0.12 + fs * 1.3));
      g.fillStyle = rgba(s.rgb, 1);
      g.font = `700 ${S(fs * 1.35)}px Onest, "Segoe UI", sans-serif`;
      g.fillText(s.v, S(ex), S(py2 + panW * 0.12 + fs * 2.75));
      g.fillStyle = rgba(INK, 0.55);
      g.font = `600 ${S(fs * 0.78)}px Onest, "Segoe UI", sans-serif`;
      g.fillText(`млрд${NB}₽`, S(ex), S(py2 + panW * 0.12 + fs * 3.9));
    });
    // The beam over the strings, and the gold pivot.
    g.save();
    g.translate(S(cx), S(py));
    g.rotate(-th);
    g.fillStyle = metal(0, S(-Sw * 0.012), 0, S(Sw * 0.012));
    g.beginPath();
    g.moveTo(S(-half), S(-Sw * 0.005));
    g.lineTo(S(0), S(-Sw * 0.013));
    g.lineTo(S(half), S(-Sw * 0.005));
    g.lineTo(S(half), S(Sw * 0.005));
    g.lineTo(S(0), S(Sw * 0.013));
    g.lineTo(S(-half), S(Sw * 0.005));
    g.closePath();
    g.fill();
    for (const x of [-half, half]) {
      g.fillStyle = GOLD;
      g.beginPath();
      g.arc(S(x), 0, S(Sw * 0.009), 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
    g.fillStyle = GOLD;
    g.beginPath();
    g.arc(S(cx), S(py), S(Sw * 0.018), 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.45)';
    g.beginPath();
    g.arc(S(cx - Sw * 0.005), S(py - Sw * 0.005), S(Sw * 0.007), 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
  }
  return { frame, resize };
};
