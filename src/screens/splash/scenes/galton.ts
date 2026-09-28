import { NB, clamp01, el, hexRgb, mulberry, outCubic, rgba, shuffle, type MountScene } from '../kit';

// About half the budget goes to people: a hundred balls bounce through the pegs and split almost evenly.
const R = 7;
const T_IN = 0.14;
const HOP = 0.07;
const T_OUT = 0.3;

export const mountGalton: MountScene = (ctx) => {
  const { stage } = ctx;
  const DARK = ctx.dark;
  const REDUCE = ctx.reduce;
  const cv = el('canvas', 'st-cv');
  stage.append(cv);
  cv.setAttribute('role', 'img');
  cv.setAttribute('aria-label', 'Сто шариков скачут по штырькам и делятся почти поровну: половина — на людей, то есть на социальную сферу, половина — на город и остальное.');
  const g = cv.getContext('2d');
  const BINS = [
    { name: 'на людей', v: `3,2${NB}трлн${NB}₽`, c: DARK ? '#FF7A8A' : '#E0485C', n: 50 },
    { name: 'на город и остальное', v: 'другая половина', c: DARK ? '#7F8AA1' : '#9AA4B6', n: 50 },
  ].map((b) => ({ ...b, rgb: hexRgb(b.c) }));
  const INK = hexRgb(DARK ? '#F2F4F8' : '#0E1524');
  const rnd = mulberry(9);
  const balls: { bin: number; m: number; rel: number; moves: number[] }[] = [];
  BINS.forEach((b, i) => {
    for (let j = 0; j < b.n; j++) balls.push({ bin: i, m: 0, rel: 0, moves: [] });
  });
  shuffle(balls, rnd);
  const seen = [0, 0];
  // Paths look natural: most balls end near the middle, a few stray to the sides.
  const pick = (bin: number) => {
    const u = rnd();
    const side = u < 0.55 ? 0 : u < 0.88 ? 1 : 2;
    return bin === 0 ? 3 - side : 4 + side;
  };
  balls.forEach((b, i) => {
    b.m = seen[b.bin]++;
    b.rel = 0.4 + i * 0.03;
    const right = pick(b.bin);
    b.moves = shuffle(
      Array.from({ length: R }, (_, j) => (j < right ? 1 : 0)),
      rnd,
    );
  });
  let geo: { cx: number; dx: number; dy: number; top: number; floor: number; binW: number; ballD: number; nc: number; gap: number; pegR: number } | null = null;
  let k = 1;

  function resize() {
    const fit = ctx.fitCanvas(cv);
    k = fit.k;
    const r = fit.r;
    const Bw = Math.min(r.width * 0.96, 560);
    const dx = Math.min(Bw / 9, r.height / ((R + 6.2) * 0.9));
    const dy = dx * 0.9;
    const binW = Math.min(Bw * 0.38, dx * 4.2);
    const ballD = binW / 8.4;
    const top = (r.height - dy * (R + 6.2)) / 2 + dy * 1.55;
    const floor = top + dy * R + dy * 3.3;
    geo = { cx: r.width / 2, dx, dy, top, floor, binW, ballD, nc: 8, gap: dx * 0.5, pegR: Math.max(1.6, dx * 0.07) };
  }
  const yRow = (j: number) => geo.top + j * geo.dy;
  const binLeft = (i: number) => (i === 0 ? geo.cx - geo.gap / 2 - geo.binW : geo.cx + geo.gap / 2);
  function stackPos(b: (typeof balls)[number]) {
    const { binW, ballD, nc, floor } = geo;
    const col = b.m % nc;
    const row = Math.floor(b.m / nc);
    return [binLeft(b.bin) + (binW - nc * ballD) / 2 + (col + 0.5) * ballD, floor - (row + 0.5) * ballD];
  }
  // Where a ball is at time t: dropping in, hopping peg to peg, then rolling into its place in the bin.
  function pos(b: (typeof balls)[number], t: number) {
    const { cx, dx, dy } = geo;
    const s = t - b.rel;
    if (s < 0) return null;
    const ballR = geo.ballD / 2;
    const lift = geo.pegR + ballR;
    if (s < T_IN) {
      const p = s / T_IN;
      return [cx, yRow(0) - lift - dy * 1.1 * (1 - p * p)];
    }
    const s2 = s - T_IN;
    const n = Math.min(R, Math.floor(s2 / HOP));
    let rights = 0;
    for (let j = 0; j < n; j++) rights += b.moves[j];
    const xAt = (j: number, rgt: number) => cx + ((2 * rgt - j) * dx) / 2;
    if (n < R) {
      const p = (s2 - n * HOP) / HOP;
      const xa = xAt(n, rights);
      const xb = xAt(n + 1, rights + b.moves[n]);
      const ya = yRow(n) - lift;
      const yb = yRow(n + 1) - lift;
      return [xa + (xb - xa) * p, ya + (yb - ya) * p * p - Math.sin(Math.PI * p) * dy * 0.3];
    }
    const [sx, sy] = stackPos(b);
    const xr = xAt(R, rights);
    const yr = yRow(R) - lift;
    const p = clamp01((s2 - R * HOP) / T_OUT);
    return [xr + (sx - xr) * outCubic(p), yr + (sy - yr) * p * p];
  }

  function frame(t: number) {
    if (!geo) return;
    const { cx, dx, dy, floor, binW, ballD, pegR } = geo;
    const S = (v: number) => v * k;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cv.width, cv.height);
    const a0 = REDUCE ? 1 : outCubic(clamp01((t - 0.1) / 0.5));
    g.globalAlpha = a0;
    // The funnel and the pegs.
    g.strokeStyle = rgba(INK, 0.3);
    g.lineWidth = S(1.5);
    g.beginPath();
    g.moveTo(S(cx - dx * 0.9), S(yRow(0) - dy * 1.5));
    g.lineTo(S(cx - dx * 0.22), S(yRow(0) - dy * 0.7));
    g.moveTo(S(cx + dx * 0.9), S(yRow(0) - dy * 1.5));
    g.lineTo(S(cx + dx * 0.22), S(yRow(0) - dy * 0.7));
    g.stroke();
    g.fillStyle = rgba(INK, DARK ? 0.42 : 0.32);
    for (let j = 0; j < R; j++) {
      for (let i = 0; i <= j; i++) {
        g.beginPath();
        g.arc(S(cx + (i - j / 2) * dx), S(yRow(j)), S(pegR), 0, Math.PI * 2);
        g.fill();
      }
    }
    // Two bins with a divider between them.
    g.strokeStyle = rgba(INK, 0.24);
    g.lineWidth = S(1.2);
    g.beginPath();
    for (const i of [0, 1]) {
      const l = binLeft(i);
      g.moveTo(S(l), S(floor - dy * 2.7));
      g.lineTo(S(l), S(floor));
      g.lineTo(S(l + binW), S(floor));
      g.lineTo(S(l + binW), S(floor - dy * 2.7));
    }
    g.stroke();
    g.globalAlpha = 1;
    const r = (ballD / 2) * 0.9;
    const counts = [0, 0];
    for (const b of balls) {
      const p = pos(b, REDUCE ? 99 : t);
      if (!p) continue;
      if (REDUCE || t - b.rel > T_IN + R * HOP + T_OUT) counts[b.bin]++;
      g.fillStyle = rgba(BINS[b.bin].rgb, 1);
      g.beginPath();
      g.arc(S(p[0]), S(p[1]), S(r), 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.beginPath();
      g.arc(S(p[0] - r * 0.3), S(p[1] - r * 0.32), S(r * 0.34), 0, Math.PI * 2);
      g.fill();
    }
    // Each bin's caption brightens as it fills.
    const fs = Math.max(10.5, Math.min(15, binW * 0.1));
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    BINS.forEach((b, i) => {
      const x = S(binLeft(i) + binW / 2);
      g.globalAlpha = a0 * (0.35 + 0.65 * (counts[i] / b.n));
      g.fillStyle = i === 0 ? rgba(b.rgb, 1) : rgba(INK, 0.9);
      g.font = `700 ${S(fs * 1.12)}px Onest, "Segoe UI", sans-serif`;
      g.fillText(b.v, x, S(floor + fs * 1.55));
      g.fillStyle = rgba(INK, 0.6);
      g.font = `600 ${S(fs * 0.9)}px Onest, "Segoe UI", sans-serif`;
      g.fillText(b.name, x, S(floor + fs * 2.75));
    });
    g.globalAlpha = 1;
  }
  return { frame, resize };
};
