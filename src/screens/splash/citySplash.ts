// The splash: Moscow's landmarks rise on the skyline, the camera climbs and tilts down until the city map
// (rings, the river, avenues, parks) lies flat, and then the map breaks into dots that fly into «МосГорБюджет.Трек».
// One perspective camera over a ground plane in kilometres; landmarks are upright billboards standing on it.

import { LANDMARKS, LANDMARK_DARK, LANDMARK_LIGHT, type LandmarkId } from './landmarks';
import { BOULEVARD_RING, GARDEN_RING, KREMLIN, MKAD, PARKS, RADIALS, RIVER, TTK, cumulative, parkOutline, type Pt } from './moscow';

type RGB = [number, number, number];

const hex = (value: string): RGB => [parseInt(value.slice(1, 3), 16), parseInt(value.slice(3, 5), 16), parseInt(value.slice(5, 7), 16)];
const mix = (a: RGB, b: RGB, k: number): RGB => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const rgb = (c: RGB, alpha = 1) =>
  alpha >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${alpha.toFixed(3)})`;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

function prng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Timeline, seconds ----------

const SIDE_END = 3.2; // the skyline shot ends, the camera starts to climb
const RISE_END = 5.1; // the map lies flat
const ASSEMBLE = 5.45; // the map breaks into dots
const FLY_SPREAD = 0.6;
const FLY_DUR = 1.05;
const FORMED = ASSEMBLE + FLY_SPREAD + FLY_DUR + 0.2;
const GLINT_END = FORMED + 1.5;
const MAX_POINTS = 1300;
const NEAR = 0.3;

// ---------- Palettes ----------

interface Palette {
  sky: [string, string];
  ground: [string, string];
  city: string;
  distant: string;
  haze: string;
  cloud: string;
  sun: boolean;
  stars: boolean;
  mkad: string;
  ttk: string;
  garden: string;
  boulevard: string;
  radial: string;
  river: string;
  riverCore: string;
  park: string;
  kremlin: string;
  cars: string[];
  shadow: string;
  labelBg: string;
  labelInk: string;
  bird: string;
  ink: RGB;
  accent: RGB;
  glint: RGB;
}

const LIGHT: Palette = {
  sky: ['#BCD2FF', '#FFE6EC'],
  ground: ['rgba(246, 248, 252, 0.95)', 'rgba(214, 224, 240, 0.95)'],
  city: 'rgba(255, 255, 255, 0.5)',
  distant: 'rgba(196, 210, 236, 0.75)',
  haze: 'rgba(255, 255, 255, 0.9)',
  cloud: 'rgba(255, 255, 255, 0.85)',
  sun: true,
  stars: false,
  mkad: '#243049',
  ttk: '#5A6784',
  garden: '#D6263A',
  boulevard: '#16B38A',
  radial: '#A3AEC4',
  river: '#86B8F6',
  riverCore: '#D8E9FF',
  park: '#BDEBD0',
  kremlin: '#D6263A',
  cars: ['#D6263A', '#F29A38', '#3D7BFD'],
  shadow: 'rgba(38, 58, 108, 0.16)',
  labelBg: 'rgba(255, 255, 255, 0.9)',
  labelInk: '#0E1524',
  bird: 'rgba(14, 21, 36, 0.55)',
  ink: hex('#0E1524'),
  accent: hex('#D6263A'),
  glint: hex('#FFFFFF'),
};

const DARK: Palette = {
  sky: ['#050811', '#1B2745'],
  ground: ['rgba(20, 27, 42, 0.97)', 'rgba(8, 11, 17, 0.97)'],
  city: 'rgba(120, 150, 210, 0.07)',
  distant: 'rgba(40, 54, 86, 0.85)',
  haze: 'rgba(40, 56, 96, 0.7)',
  cloud: 'rgba(120, 140, 180, 0.16)',
  sun: false,
  stars: true,
  mkad: '#E6EAF2',
  ttk: '#9AA5BD',
  garden: '#FF4B60',
  boulevard: '#34CF9C',
  radial: '#4E586D',
  river: '#3A78D6',
  riverCore: '#7FB0F5',
  park: '#1B4A35',
  kremlin: '#FF4B60',
  cars: ['#FFB561', '#FF6B6B', '#FFE3A3'],
  shadow: 'rgba(0, 0, 0, 0.45)',
  labelBg: 'rgba(22, 27, 38, 0.9)',
  labelInk: '#F2F4F8',
  bird: 'rgba(200, 210, 230, 0.5)',
  ink: hex('#F2F4F8'),
  accent: hex('#FF4B60'),
  glint: hex('#9CC2FF'),
};

// ---------- The scene ----------

// Landmarks stand in a composed row for the skyline shot and slide to their real places as the map flattens.
const SCENE: { id: LandmarkId; row: Pt; geo: Pt; h: number; start: number }[] = [
  { id: 'msu', row: [-8, 2.5], geo: [-6, -5.6], h: 4.4, start: 0.2 },
  { id: 'shukhov', row: [-4.3, 0.4], geo: [-0.5, -3.7], h: 3.3, start: 0.45 },
  { id: 'kremlin', row: [0, -1.6], geo: [0.05, 0.05], h: 3.4, start: 0.7 },
  { id: 'ostankino', row: [1.6, 8], geo: [-0.6, 7.9], h: 7.4, start: 0.95 },
  { id: 'basil', row: [4.8, -2.2], geo: [0.45, -0.1], h: 3.1, start: 1.2 },
  { id: 'city', row: [7.8, 3.4], geo: [-5.1, 0.8], h: 5.2, start: 1.45 },
];

interface MapLine {
  pts: Pt[];
  cum: number[];
  total: number;
  color: string;
  width: number;
  reveal: [number, number];
}

interface Car {
  line: MapLine;
  offset: number;
  speed: number;
  color: string;
}

interface Dot {
  sx: number;
  sy: number;
  size: number;
  color: RGB;
  tx: number;
  ty: number;
  tc: RGB;
  delay: number;
  dur: number;
  bend: number;
  spare: boolean;
}

// Points of the lettering, sampled on a hexagonal grid inside the box.
function sampleLogo(box: { x: number; y: number; w: number; h: number }) {
  const main = 'МосГорБюджет';
  const tail = '.Трек';
  const bw = Math.max(1, Math.round(box.w));
  const bh = Math.max(1, Math.round(box.h));
  const off = document.createElement('canvas');
  off.width = bw;
  off.height = bh;
  const ctx = off.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { points: [] as { x: number; y: number; accent: boolean }[], step: 4 };

  const family = '"Onest", "Segoe UI", system-ui, sans-serif';
  ctx.font = `800 100px ${family}`;
  const mainW = ctx.measureText(main).width;
  const tailW = ctx.measureText(tail).width;
  const twoLines = bw < 620;
  const size = twoLines ? Math.min((100 * bw * 0.97) / mainW, bh / 2.05) : Math.min((100 * bw * 0.97) / (mainW + tailW), bh / 1.1);
  ctx.font = `800 ${size}px ${family}`;
  ctx.textBaseline = 'middle';
  const k = size / 100;
  if (twoLines) {
    const left = (bw - mainW * k) / 2;
    ctx.fillStyle = '#f00';
    ctx.fillText(main, left, bh / 2 - size * 0.5);
    ctx.fillStyle = '#0f0';
    ctx.fillText(tail, left + mainW * k - tailW * k, bh / 2 + size * 0.52);
  } else {
    const left = (bw - (mainW + tailW) * k) / 2;
    ctx.fillStyle = '#f00';
    ctx.fillText(main, left, bh / 2);
    ctx.fillStyle = '#0f0';
    ctx.fillText(tail, left + mainW * k, bh / 2);
  }

  const data = ctx.getImageData(0, 0, bw, bh).data;
  const sample = (step: number) => {
    const points: { x: number; y: number; accent: boolean }[] = [];
    for (let row = 0, y = step / 2; y < bh; y += step * 0.866, row++) {
      for (let x = row % 2 ? step : step / 2; x < bw; x += step) {
        const i = ((y | 0) * bw + (x | 0)) * 4;
        if (data[i + 3] > 150) points.push({ x: box.x + x, y: box.y + y, accent: data[i + 1] > data[i] });
      }
    }
    return points;
  };
  let step = Math.max(2.8, Math.min(6, size * 0.05));
  let points = sample(step);
  if (points.length > MAX_POINTS) {
    step *= Math.sqrt(points.length / MAX_POINTS);
    points = sample(step);
  }
  return { points, step };
}

export interface CitySplashOptions {
  canvas: HTMLCanvasElement;
  // The logo box and the canvas size, both in the canvas's own CSS pixels.
  measure: () => { width: number; height: number; logo: { x: number; y: number; w: number; h: number } };
  dark: boolean;
  reduced: boolean;
  onFormed: () => void;
}

export function startCitySplash({ canvas, measure, dark, reduced, onFormed }: CitySplashOptions) {
  const pal = dark ? DARK : LIGHT;
  const lc = dark ? LANDMARK_DARK : LANDMARK_LIGHT;
  const ctx = canvas.getContext('2d');
  let raf = 0;
  let start = 0;
  let skipped = reduced;
  let formedSent = false;
  let destroyed = false;

  let W = 0;
  let H = 0;
  let f = 1000;
  let portrait = false;
  let pan: [number, number] = [0, 0];
  let distTop = 60;
  let starts = SCENE.map((item) => item.start);
  let logoBox = { x: 0, y: 0, w: 0, h: 0 };
  let logoSpan = { left: 0, right: 0 };
  let targets: { x: number; y: number; accent: boolean }[] = [];
  let step = 4;
  let dots: Dot[] = [];
  let flyers: Dot[] = [];

  const rand = prng(20260927);
  const stars = Array.from({ length: 90 }, () => ({ x: rand(), y: rand(), r: 0.4 + rand() * 1.1, p: rand() * 6 }));
  const skyline = Array.from({ length: 37 }, () => rand());
  const clouds = Array.from({ length: 5 }, () => ({ x: rand(), y: 0.08 + rand() * 0.2, s: 0.7 + rand() * 0.7, v: 0.006 + rand() * 0.01 }));

  const line = (pts: Pt[], color: string, width: number, reveal: [number, number]): MapLine => {
    const cum = cumulative(pts);
    return { pts, cum, total: cum[cum.length - 1], color, width, reveal };
  };
  const lines = {
    radials: RADIALS.map((pts, i) => line(pts, pal.radial, 1.3, [0.3 + i * 0.05, 2.2 + i * 0.05])),
    river: line(RIVER, pal.river, 6, [0.2, 2.6]),
    mkad: line(MKAD, pal.mkad, 3.4, [3.2, 4.7]),
    ttk: line(TTK, pal.ttk, 2.6, [3.35, 4.6]),
    garden: line(GARDEN_RING, pal.garden, 2.4, [3.5, 4.6]),
    boulevard: line(BOULEVARD_RING, pal.boulevard, 2, [3.6, 4.7]),
  };
  const allLines = [...lines.radials, lines.mkad, lines.ttk, lines.garden, lines.boulevard];
  const parks = PARKS.map((park, i) => ({ park, outline: parkOutline(park, i * 1.7) }));

  const cars: Car[] = [];
  const addCars = (target: MapLine, count: number, speed: number) => {
    for (let i = 0; i < count; i++) {
      const dir = i % 2 ? 1 : -1;
      cars.push({ line: target, offset: rand() * target.total, speed: dir * speed * (0.7 + rand() * 0.6), color: pal.cars[i % pal.cars.length] });
    }
  };
  addCars(lines.mkad, 26, 1.1);
  addCars(lines.ttk, 12, 0.8);
  lines.radials.forEach((radial) => addCars(radial, 3, 0.9));

  const sendFormed = () => {
    if (formedSent) return;
    formedSent = true;
    onFormed();
  };

  // ---------- Camera ----------

  function cam(t: number) {
    const side = clamp01(t / SIDE_END);
    const rise = easeInOutCubic(clamp01((t - SIDE_END) / (RISE_END - SIDE_END)));
    const panX = lerp(pan[0], pan[1], easeInOutSine(side));
    const pitch0 = lerp(0.035, 0.065, side);
    return {
      rise,
      pitch: lerp(pitch0, Math.PI / 2, rise),
      dist: lerp(24, distTop, easeInOutSine(rise)),
      tx: lerp(panX, -1, rise),
      ty: lerp(0, -0.9, rise),
      cy: lerp(H * (portrait ? 0.7 : 0.74), H * 0.5, rise),
    };
  }

  type Cam = ReturnType<typeof cam>;
  type Proj = { sx: number; sy: number; depth: number };
  type Projector = (x: number, y: number, z?: number) => Proj;

  function projector(c: Cam): Projector {
    const cp = Math.cos(c.pitch);
    const sp = Math.sin(c.pitch);
    const cx = c.tx;
    const cyw = c.ty - c.dist * cp;
    const cz = c.dist * sp;
    return (x, y, z = 0) => {
      const vx = x - cx;
      const vy = y - cyw;
      const vz = z - cz;
      const depth = vy * cp - vz * sp;
      return { depth, sx: W / 2 + (f * vx) / depth, sy: c.cy - (f * (vy * sp + vz * cp)) / depth };
    };
  }

  // A polyline on the ground, cut where it passes behind the camera.
  function tracePath(proj: Projector, pts: Pt[], upto: number) {
    if (!ctx) return;
    let pen = false;
    let prev: Pt | null = null;
    let prevP: Proj | null = null;
    for (let i = 0; i < upto; i++) {
      const pt = pts[i];
      const p = proj(pt[0], pt[1]);
      if (prev && prevP) {
        const inA = prevP.depth >= NEAR;
        const inB = p.depth >= NEAR;
        if (inA && inB) {
          if (!pen) ctx.moveTo(prevP.sx, prevP.sy);
          ctx.lineTo(p.sx, p.sy);
          pen = true;
        } else if (inA !== inB) {
          const k = (NEAR - prevP.depth) / (p.depth - prevP.depth);
          const cut = proj(lerp(prev[0], pt[0], k), lerp(prev[1], pt[1], k));
          if (inA) {
            if (!pen) ctx.moveTo(prevP.sx, prevP.sy);
            ctx.lineTo(cut.sx, cut.sy);
            pen = false;
          } else {
            ctx.moveTo(cut.sx, cut.sy);
            ctx.lineTo(p.sx, p.sy);
            pen = true;
          }
        } else pen = false;
      }
      prev = pt;
      prevP = p;
    }
  }

  // The drawn part of a line: whole points up to the reveal, plus the moving tip.
  function revealed(ln: MapLine, t: number): { pts: Pt[]; count: number } {
    const k = easeInOutSine(clamp01((t - ln.reveal[0]) / (ln.reveal[1] - ln.reveal[0])));
    if (k <= 0) return { pts: ln.pts, count: 0 };
    if (k >= 1) return { pts: ln.pts, count: ln.pts.length };
    const reach = ln.total * k;
    let i = 1;
    while (i < ln.cum.length && ln.cum[i] <= reach) i++;
    if (i >= ln.pts.length) return { pts: ln.pts, count: ln.pts.length };
    const a = ln.pts[i - 1];
    const b = ln.pts[i];
    const seg = ln.cum[i] - ln.cum[i - 1] || 1;
    const u = (reach - ln.cum[i - 1]) / seg;
    const pts = ln.pts.slice(0, i);
    pts.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u)]);
    return { pts, count: pts.length };
  }

  function pointAt(ln: MapLine, dist: number): Pt {
    let lo = 0;
    let hi = ln.cum.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (ln.cum[mid] <= dist) lo = mid;
      else hi = mid;
    }
    const seg = ln.cum[hi] - ln.cum[lo] || 1;
    const u = (dist - ln.cum[lo]) / seg;
    return [lerp(ln.pts[lo][0], ln.pts[hi][0], u), lerp(ln.pts[lo][1], ln.pts[hi][1], u)];
  }

  // ---------- Setup ----------

  function sizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function setup() {
    const m = measure();
    W = m.width;
    H = m.height;
    logoBox = m.logo;
    sizeCanvas();
    portrait = W < H;
    f = portrait ? H * 1.5 : Math.min(H * 1.7, W * 1.12);
    pan = portrait ? [-8.5, 8.5] : [-0.8, 0.8];
    // At the top the whole MKAD fits the screen.
    distTop = Math.max((f * 18.6) / (H * 0.45), (f * 15) / (W * 0.46));
    // On a phone the camera pans along the skyline, so each landmark rises as it comes into view.
    starts = SCENE.map((item) => {
      if (!portrait) return item.start;
      const e = clamp01((item.row[0] - 2.8 - pan[0]) / (pan[1] - pan[0]));
      return Math.max(0.15, (SIDE_END * Math.acos(1 - 2 * e)) / Math.PI);
    });
    const logo = sampleLogo(m.logo);
    targets = logo.points;
    step = logo.step;
    dots = [];
    flyers = [];
  }

  // The flat map, frozen into dots that will fly: along every line, inside the parks, and the pins.
  function buildDots() {
    const proj = projector(cam(ASSEMBLE));
    const sources: { sx: number; sy: number; size: number; color: RGB }[] = [];
    const sourceLines = [lines.river, ...allLines];
    const screenLines = sourceLines.map((ln) => ln.pts.map(([x, y]) => proj(x, y)));
    const length = screenLines.reduce(
      (sum, pts) => sum + pts.slice(1).reduce((s, p, i) => s + Math.hypot(p.sx - pts[i].sx, p.sy - pts[i].sy), 0),
      0,
    );
    const spacing = Math.max(2.4, Math.min(9, length / (Math.max(targets.length, 60) * 1.45)));
    sourceLines.forEach((ln, n) => {
      const pts = screenLines[n];
      const color = hex(ln.color);
      let carry = 0;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        const seg = Math.hypot(b.sx - a.sx, b.sy - a.sy);
        let d = carry;
        while (d < seg) {
          const u = d / seg;
          sources.push({ sx: lerp(a.sx, b.sx, u), sy: lerp(a.sy, b.sy, u), size: Math.max(1.6, ln.width * 0.95), color });
          d += spacing;
        }
        carry = d - seg;
      }
    });
    const parkColor = hex(pal.park);
    for (const { park } of parks) {
      for (let x = park.c[0] - park.rx; x <= park.c[0] + park.rx; x += 0.55) {
        for (let y = park.c[1] - park.ry; y <= park.c[1] + park.ry; y += 0.55) {
          if (((x - park.c[0]) / park.rx) ** 2 + ((y - park.c[1]) / park.ry) ** 2 > 0.8) continue;
          const p = proj(x, y);
          sources.push({ sx: p.sx, sy: p.sy, size: 3, color: parkColor });
        }
      }
    }
    for (const item of SCENE) {
      const p = proj(item.geo[0], item.geo[1]);
      sources.push({ sx: p.sx, sy: p.sy, size: 7, color: pal.accent });
    }

    // Exactly one flying dot per point of the lettering, picked evenly over the map; the rest fade where they are.
    const r = prng(11);
    const order = sources.map((_, i) => ({ i, key: r() })).sort((a, b) => a.key - b.key).map((item) => item.i);
    while (order.length < targets.length && sources.length) order.push(order[order.length % sources.length]);
    dots = order.map((index, k) => {
      const s = sources[index];
      return { ...s, tx: 0, ty: 0, tc: s.color, delay: r() * 0.4, dur: FLY_DUR, bend: 0, spare: k >= targets.length };
    });
    flyers = dots.filter((dot) => !dot.spare).sort((a, b) => a.sx - b.sx || a.sy - b.sy);
    const sorted = [...targets].sort((a, b) => a.x - b.x || a.y - b.y);
    const n = Math.max(1, flyers.length);
    flyers.forEach((dot, i) => {
      const p = sorted[i];
      dot.tx = p.x;
      dot.ty = p.y;
      dot.tc = mix(p.accent ? pal.accent : pal.ink, dot.color, 0.14);
      dot.delay = (i / n) * FLY_SPREAD * 0.85 + r() * FLY_SPREAD * 0.15;
      dot.dur = FLY_DUR * (0.85 + r() * 0.3);
      dot.bend = (r() - 0.5) * 0.8;
    });
    logoSpan = { left: sorted.length ? sorted[0].x : 0, right: sorted.length ? sorted[sorted.length - 1].x : 0 };
  }

  // ---------- Drawing ----------

  function drawSky(c: Cam, proj: Projector, t: number) {
    if (!ctx) return;
    const far = proj(c.tx, c.ty + 3000);
    const horizon = far.depth > 0 ? far.sy : -1;
    const fade = 1 - clamp01(c.rise * 1.6);
    if (horizon > 0 && fade > 0) {
      ctx.globalAlpha = fade;
      const sky = ctx.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, pal.sky[0]);
      sky.addColorStop(1, pal.sky[1]);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, horizon);

      if (pal.sun) {
        const sx = W * 0.8;
        const sy = horizon - H * 0.2;
        const sun = ctx.createRadialGradient(sx, sy, 0, sx, sy, H * 0.22);
        sun.addColorStop(0, 'rgba(255, 244, 214, 0.95)');
        sun.addColorStop(0.18, 'rgba(255, 226, 180, 0.6)');
        sun.addColorStop(1, 'rgba(255, 220, 200, 0)');
        ctx.fillStyle = sun;
        ctx.fillRect(sx - H * 0.22, sy - H * 0.22, H * 0.44, H * 0.44);
      }
      if (pal.stars) {
        for (const s of stars) {
          ctx.fillStyle = `rgba(255, 255, 255, ${(0.35 + 0.45 * Math.sin(t * 2 + s.p) ** 2).toFixed(3)})`;
          ctx.fillRect(s.x * W, s.y * horizon * 0.95, s.r, s.r);
        }
        ctx.fillStyle = 'rgba(255, 244, 220, 0.9)';
        ctx.beginPath();
        ctx.arc(W * 0.82, horizon * 0.28, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = pal.sky[0];
        ctx.beginPath();
        ctx.arc(W * 0.82 + 7, horizon * 0.28 - 4, 14, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = pal.cloud;
      for (const cl of clouds) {
        const x = (((cl.x + t * cl.v) % 1.3) - 0.15) * W;
        const y = horizon - (0.3 - cl.y) * H - H * 0.08;
        const s = cl.s * Math.min(W, H) * 0.07;
        ctx.beginPath();
        ctx.ellipse(x, y, s * 1.6, s * 0.55, 0, 0, Math.PI * 2);
        ctx.ellipse(x - s * 0.7, y + s * 0.1, s * 0.8, s * 0.45, 0, 0, Math.PI * 2);
        ctx.ellipse(x + s * 0.5, y - s * 0.3, s * 0.9, s * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // A small flock crossing the sky.
      ctx.strokeStyle = pal.bird;
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let b = 0; b < 6; b++) {
        const bx = (-0.1 + t * 0.09 + (b % 3) * 0.035) * W;
        const by = horizon - H * (0.34 + (b % 2) * 0.03 + b * 0.008) + Math.sin(t * 1.3 + b) * 3;
        const flap = Math.sin(t * 9 + b * 1.7) * 3;
        const s = 5 + (b % 3);
        ctx.moveTo(bx - s, by - flap);
        ctx.quadraticCurveTo(bx - s * 0.4, by - 1, bx, by + 1);
        ctx.quadraticCurveTo(bx + s * 0.4, by - 1, bx + s, by - flap);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // Far-off blocks of the city along the horizon, behind the landmarks.
    if (horizon > 0 && fade > 0) {
      ctx.globalAlpha = fade;
      ctx.fillStyle = pal.distant;
      const unit = Math.max(W, H) / 160;
      let x = -((c.tx * f) / 40) % (unit * 6) - unit * 6;
      let n = 0;
      ctx.beginPath();
      while (x < W + unit * 6) {
        const w = unit * (2.2 + (skyline[n % skyline.length] * 3.4));
        const h = unit * (1.2 + skyline[(n * 7 + 3) % skyline.length] * 5.5);
        ctx.rect(x, horizon - h, w - unit * 0.35, h + 2);
        x += w;
        n++;
      }
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // The ground: solid under a low camera, see-through once the map lies flat.
    const groundTop = Math.max(0, horizon);
    const groundAlpha = 1 - clamp01(c.rise * 1.25);
    if (groundAlpha > 0) {
      ctx.globalAlpha = groundAlpha;
      const ground = ctx.createLinearGradient(0, groundTop, 0, H);
      ground.addColorStop(0, pal.ground[0]);
      ground.addColorStop(1, pal.ground[1]);
      ctx.fillStyle = ground;
      ctx.fillRect(0, groundTop, W, H - groundTop);
      if (horizon > 0) {
        const haze = ctx.createLinearGradient(0, horizon - 30, 0, horizon + 70);
        haze.addColorStop(0, 'rgba(255,255,255,0)');
        haze.addColorStop(0.35, pal.haze);
        haze.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = haze;
        ctx.fillRect(0, horizon - 30, W, 100);
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawMap(c: Cam, proj: Projector, t: number, alpha: number) {
    if (!ctx || alpha <= 0) return;
    const widthScale = lerp(1.5, 1, c.rise) * (portrait ? 0.85 : 1);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // The city inside MKAD and the TTK gets a light fill once the ring is drawn.
    for (const ring of [lines.mkad, lines.ttk]) {
      const k = clamp01((t - ring.reveal[1] + 0.2) / 0.5);
      if (k <= 0) continue;
      ctx.globalAlpha = alpha * k;
      ctx.fillStyle = pal.city;
      ctx.beginPath();
      tracePath(proj, ring.pts, ring.pts.length);
      ctx.fill();
    }

    // Parks bloom from their centres.
    const bloom = easeOutCubic(clamp01((t - 3.7) / 1.1));
    if (bloom > 0) {
      ctx.globalAlpha = alpha * bloom * 0.9;
      ctx.fillStyle = pal.park;
      for (const { park, outline } of parks) {
        const pts: Pt[] = outline.map(([x, y]) => [park.c[0] + (x - park.c[0]) * bloom, park.c[1] + (y - park.c[1]) * bloom]);
        ctx.beginPath();
        tracePath(proj, pts, pts.length);
        ctx.fill();
      }
    }

    // The river, with light ripples running downstream.
    const river = revealed(lines.river, t);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = pal.river;
    ctx.lineWidth = lines.river.width * widthScale;
    ctx.beginPath();
    tracePath(proj, river.pts, river.count);
    ctx.stroke();
    ctx.strokeStyle = pal.riverCore;
    ctx.lineWidth = 1.4 * widthScale;
    ctx.setLineDash([10, 16]);
    ctx.lineDashOffset = -t * 26;
    ctx.stroke();
    ctx.setLineDash([]);

    const heads: { p: Proj; color: string }[] = [];
    for (const ln of [...allLines, lines.river]) {
      const part = ln === lines.river ? river : revealed(ln, t);
      if (part.count < 2) continue;
      if (ln !== lines.river) {
        ctx.strokeStyle = ln.color;
        ctx.lineWidth = ln.width * widthScale;
        ctx.beginPath();
        tracePath(proj, part.pts, part.count);
        ctx.stroke();
      }
      if (part.count < ln.pts.length && ln.reveal[0] >= SIDE_END) {
        const tip = part.pts[part.count - 1];
        const p = proj(tip[0], tip[1]);
        if (p.depth >= NEAR) heads.push({ p, color: ln.color });
      }
    }
    // A glowing head runs in front of every line while it is being drawn.
    for (const { p, color } of heads) {
      ctx.globalAlpha = alpha * 0.35;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = alpha;

    const kremlin = clamp01((t - 4.2) / 0.5);
    if (kremlin > 0) {
      ctx.globalAlpha = alpha * kremlin;
      ctx.fillStyle = pal.kremlin;
      ctx.beginPath();
      tracePath(proj, [...KREMLIN, KREMLIN[0]], KREMLIN.length + 1);
      ctx.fill();
    }

    // Traffic: small lights running along the drawn parts of the rings and avenues.
    ctx.globalAlpha = alpha;
    for (const car of cars) {
      const k = clamp01((t - car.line.reveal[0]) / (car.line.reveal[1] - car.line.reveal[0]));
      if (k < 0.2) continue;
      const along = car.offset + car.speed * t;
      const wrapped = ((along % car.line.total) + car.line.total) % car.line.total;
      if (wrapped > car.line.total * k) continue;
      const [x, y] = pointAt(car.line, wrapped);
      const p = proj(x, y);
      if (p.depth < NEAR || p.sx < -10 || p.sx > W + 10 || p.sy < -10 || p.sy > H + 10) continue;
      const r = Math.max(1, Math.min(3.2, (f / p.depth) * 0.09)) * (dark ? 1.2 : 1);
      if (dark) {
        ctx.fillStyle = car.color + '44';
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r * 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = car.color;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawLandmarks(c: Cam, proj: Projector, t: number) {
    if (!ctx) return;
    const slide = easeInOutCubic(clamp01((c.rise - 0.2) / 0.6));
    const fade = 1 - clamp01((c.pitch - 0.9) / 0.45);
    const labels = 1 - clamp01(c.rise * 5);

    const items = SCENE.map((item, i) => {
      const x = lerp(item.row[0], item.geo[0], slide);
      const y = lerp(item.row[1], item.geo[1], slide);
      const h = item.h * lerp(1, 0.55, slide);
      return { item, i, h, base: proj(x, y, 0), top: proj(x, y, h) };
    }).sort((a, b) => b.base.depth - a.base.depth);

    for (const { item, i, h, base, top } of items) {
      if (base.depth < NEAR || fade <= 0) continue;
      const lm = LANDMARKS[item.id];
      const grow = easeOutCubic(clamp01((t - starts[i]) / 0.85));
      if (grow <= 0) continue;
      const detail = clamp01((t - starts[i] - 0.55) / 0.8);
      const sx = ((f / base.depth) * h) / 100; // units → px across
      const sy = (base.sy - top.sy) / 100; // units → px up, foreshortened as the camera climbs
      if (sy <= 0.02) continue;
      const halfPx = lm.half * sx;
      if (base.sx + halfPx < -40 || base.sx - halfPx > W + 40) continue;

      ctx.globalAlpha = fade;
      // A soft shadow on the ground and, at night, a warm uplight.
      ctx.fillStyle = pal.shadow;
      ctx.beginPath();
      ctx.ellipse(base.sx, base.sy, halfPx * 1.05, Math.max(2, halfPx * 0.08), 0, 0, Math.PI * 2);
      ctx.fill();
      if (dark && detail > 0) {
        const glow = ctx.createRadialGradient(base.sx, base.sy, 0, base.sx, base.sy, halfPx * 1.3);
        glow.addColorStop(0, `rgba(255, 190, 110, ${(0.28 * detail).toFixed(3)})`);
        glow.addColorStop(1, 'rgba(255, 190, 110, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(base.sx - halfPx * 1.3, base.sy - halfPx * 1.3, halfPx * 2.6, halfPx * 1.4);
      }

      // Rise out of the ground: clip at the base line and slide up.
      ctx.save();
      ctx.beginPath();
      ctx.rect(base.sx - halfPx - 30, -H, halfPx * 2 + 60, base.sy + H);
      ctx.clip();
      ctx.translate(base.sx, base.sy + (1 - grow) * sy * (lm.top + 6));
      ctx.scale(sx, sy);
      lm.draw(ctx, lc, detail, t);
      ctx.restore();

      // A bright seam on the ground while it rises.
      if (grow < 1) {
        ctx.strokeStyle = rgb(pal.accent, (1 - grow) * 0.8);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(base.sx - halfPx, base.sy);
        ctx.lineTo(base.sx + halfPx, base.sy);
        ctx.stroke();
      }

      // The name, once it stands.
      const la = clamp01((t - starts[i] - 0.8) / 0.35) * labels * fade;
      if (la > 0) {
        const fontPx = portrait ? 12 : Math.max(12, Math.min(15, W / 110));
        ctx.font = `600 ${fontPx}px "Onest", "Segoe UI", system-ui, sans-serif`;
        const tw = ctx.measureText(lm.name).width;
        const ly = base.sy - (lm.top + 8) * sy - fontPx * 1.3;
        const pw = tw + fontPx * 1.3;
        const ph = fontPx * 1.9;
        ctx.globalAlpha = la;
        ctx.fillStyle = pal.labelBg;
        ctx.beginPath();
        ctx.roundRect(base.sx - pw / 2, ly - ph / 2, pw, ph, ph / 2);
        ctx.fill();
        ctx.fillStyle = pal.labelInk;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(lm.name, base.sx, ly + 0.5);
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
      }
      ctx.globalAlpha = 1;
    }

    // Pins take their place on the map as the buildings lie down.
    const pins = clamp01((c.rise - 0.55) / 0.3);
    if (pins > 0) {
      for (const item of SCENE) {
        const p = proj(item.geo[0], item.geo[1]);
        if (p.depth < NEAR) continue;
        const pulse = (t * 0.9 + item.geo[0] * 0.1 + 10) % 1;
        ctx.globalAlpha = pins * (1 - pulse) * 0.6;
        ctx.strokeStyle = rgb(pal.accent);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, 5 + pulse * 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = pins;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgb(pal.accent);
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawDots(t: number) {
    if (!ctx) return;
    const size = step * 0.86;
    const glintAt = FORMED < t && t < GLINT_END ? (t - FORMED) / (GLINT_END - FORMED) : -1;
    const band = logoSpan.left - 120 + (logoSpan.right - logoSpan.left + 240) * glintAt;
    for (const dot of dots) {
      if (dot.spare) {
        const k = clamp01((t - ASSEMBLE - dot.delay) / 0.45);
        if (k >= 1) continue;
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = rgb(dot.color);
        ctx.beginPath();
        ctx.arc(dot.sx + (dot.sx - W / 2) * 0.08 * k, dot.sy + (dot.sy - H / 2) * 0.08 * k, (dot.size / 2) * (1 - k * 0.5), 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      const e = easeInOutCubic(clamp01((t - ASSEMBLE - dot.delay) / dot.dur));
      const dx = dot.tx - dot.sx;
      const dy = dot.ty - dot.sy;
      const arc = Math.sin(Math.PI * e);
      const x = dot.sx + dx * e - dy * dot.bend * arc * 0.35;
      const y = dot.sy + dy * e + dx * dot.bend * arc * 0.35 - arc * 22;
      let color = mix(dot.color, dot.tc, clamp01(e * 1.15));
      if (glintAt >= 0) {
        const d = Math.abs(dot.tx + (dot.ty - logoSpan.left) * 0.25 - band);
        if (d < 46) color = mix(color, pal.glint, (1 - d / 46) * 0.65);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = rgb(color);
      const s = lerp(dot.size, size, e);
      if (e > 0.6) ctx.fillRect(x - s / 2, y - s / 2, s, s);
      else {
        ctx.beginPath();
        ctx.arc(x, y, s / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function frame(now: number) {
    if (destroyed || !ctx) return;
    if (!start) start = now;
    let t = (now - start) / 1000;
    if (skipped && t < FORMED) {
      start = now - FORMED * 1000;
      t = FORMED;
    }
    ctx.clearRect(0, 0, W, H);
    if (t >= ASSEMBLE && !dots.length) buildDots();

    if (t < ASSEMBLE + 0.25) {
      const c = cam(t);
      const proj = projector(c);
      const mapAlpha = (t < ASSEMBLE ? 1 : 1 - (t - ASSEMBLE) / 0.25) * lerp(0.55, 1, c.rise);
      drawSky(c, proj, t);
      drawMap(c, proj, t, mapAlpha);
      if (t < ASSEMBLE) drawLandmarks(c, proj, t);
    }
    if (dots.length) drawDots(reduced ? FORMED : t);

    if (t >= FORMED) {
      sendFormed();
      if (t < GLINT_END && !reduced) raf = requestAnimationFrame(frame);
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function restart(jumpToEnd: boolean) {
    cancelAnimationFrame(raf);
    setup();
    if (jumpToEnd) skipped = true;
    start = 0;
    raf = requestAnimationFrame(frame);
  }

  let resizeTimer = 0;
  const onResize = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const m = measure();
      if (Math.abs(m.width - W) < 2 && Math.abs(m.logo.w - logoBox.w) < 2) {
        // Only the height changed (a phone's address bar): keep playing and move the lettering with the layout.
        const dx = m.logo.x - logoBox.x;
        const dy = m.logo.y - logoBox.y;
        logoBox = m.logo;
        H = m.height;
        sizeCanvas();
        for (const p of targets) {
          p.x += dx;
          p.y += dy;
        }
        for (const dot of flyers) {
          dot.tx += dx;
          dot.ty += dy;
        }
        logoSpan = { left: logoSpan.left + dx, right: logoSpan.right + dx };
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(frame);
        return;
      }
      const elapsed = start ? (performance.now() - start) / 1000 : 0;
      restart(formedSent || elapsed > 1.2);
    }, 150);
  };

  // Wait for the brand font (briefly) so the lettering is sampled in Onest.
  const fontReady = Promise.race([
    document.fonts?.load(`800 100px "Onest"`).catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, 1200)),
  ]);
  fontReady.then(() => {
    if (destroyed) return;
    restart(reduced);
    window.addEventListener('resize', onResize);
  });

  return {
    skip() {
      skipped = true;
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
    },
  };
}
