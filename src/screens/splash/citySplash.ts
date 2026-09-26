// The splash animation: a small top-down city grows (roads, the river, houses, parks, cars), the camera pulls back,
// and every house, tree and car flies into the «МосГорБюджет.Трек» lettering. Plain canvas 2D, one particle per object.

type RGB = [number, number, number];
type Kind = 'house' | 'tree' | 'car';

interface Obj {
  kind: Kind;
  // World position: pixels at zoom 1, origin in the middle of the canvas. Houses: footprint centre.
  x: number;
  y: number;
  w: number; // house footprint / car length / tree diameter
  h: number; // house footprint / car width / tree diameter
  ext: number; // house height, drawn as a front facade
  color: RGB;
  side: RGB;
  // Ready-made fill styles, so drawing a frame doesn't build thousands of strings.
  fill: string;
  sideFill: string;
  hiFill: string;
  appear: number;
  seed: number;
  tower: boolean;
  // Cars drive along a road: axis 0 is horizontal, 1 vertical.
  axis: 0 | 1;
  dir: 1 | -1;
  speed: number;
  lo: number;
  hi: number;
  // Flight into the lettering.
  spare: boolean;
  tx: number;
  ty: number;
  tc: RGB;
  delay: number;
  dur: number;
  bend: number;
  launched: boolean;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  sext: number;
  srot: number;
  sc: RGB;
  twinkle: number;
}

// A straight piece of road; roads stop at the river except on bridges.
interface Segment {
  axis: 0 | 1;
  at: number;
  from: number;
  to: number;
}

interface World {
  objs: Obj[];
  segs: Segment[];
  road: number;
  riverHalf: number;
  blocks: { x: number; y: number; w: number; h: number; park: boolean }[];
  half: { w: number; h: number };
}

interface Palette {
  road: string;
  roadLine: string;
  block: string;
  park: string;
  river: RGB;
  riverHi: string;
  shadow: string;
  roofs: RGB[];
  accentRoofs: RGB[];
  towerRoof: RGB;
  towerSide: RGB;
  trees: RGB[];
  cars: RGB[];
  window: RGB;
  windowOff: RGB;
  ink: RGB;
  accent: RGB;
  glint: RGB;
}

const hex = (value: string): RGB => [
  parseInt(value.slice(1, 3), 16),
  parseInt(value.slice(3, 5), 16),
  parseInt(value.slice(5, 7), 16),
];
const mix = (a: RGB, b: RGB, k: number): RGB => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const rgb = (c: RGB, alpha = 1) =>
  alpha >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${alpha.toFixed(3)})`;
const shade = (c: RGB, k: number): RGB => mix(c, [0, 0, 0], k);

const LIGHT: Palette = {
  road: 'rgba(255,255,255,0.72)',
  roadLine: 'rgba(14,21,36,0.08)',
  block: 'rgba(226,233,246,0.5)',
  park: 'rgba(150,222,184,0.55)',
  river: hex('#A9CFF7'),
  riverHi: 'rgba(255,255,255,0.75)',
  shadow: 'rgba(38,58,108,0.16)',
  roofs: ['#FFFFFF', '#F7F9FD', '#EEF3FB', '#E7EEF9'].map(hex),
  accentRoofs: ['#FFD9DF', '#D6E5FF', '#FFE6C4', '#D9F2E6'].map(hex),
  towerRoof: hex('#CFE0FF'),
  towerSide: hex('#8EAEE6'),
  trees: ['#4CC48A', '#3BB47B', '#63D19B', '#2FA56E'].map(hex),
  cars: ['#D6263A', '#D6263A', '#3D7BFD', '#F29A38', '#FFFFFF', '#16B38A', '#1C2436'].map(hex),
  window: hex('#D5E4FF'),
  windowOff: hex('#C3CEE2'),
  ink: hex('#0E1524'),
  accent: hex('#D6263A'),
  glint: hex('#FFFFFF'),
};

const DARK: Palette = {
  road: 'rgba(38,46,64,0.95)',
  roadLine: 'rgba(255,255,255,0.07)',
  block: 'rgba(22,28,40,0.9)',
  park: 'rgba(22,58,42,0.9)',
  river: hex('#12304F'),
  riverHi: 'rgba(120,170,230,0.35)',
  shadow: 'rgba(0,0,0,0.38)',
  roofs: ['#2C3548', '#283042', '#323D53', '#2A3244'].map(hex),
  accentRoofs: ['#4A2A34', '#243A5E', '#4A3A24', '#1F4034'].map(hex),
  towerRoof: hex('#2E4670'),
  towerSide: hex('#172642'),
  trees: ['#1F8F5E', '#24A06A', '#18744D', '#2BB077'].map(hex),
  cars: ['#FF4B60', '#FF4B60', '#5E8FFF', '#FFAF57', '#E8ECF4', '#34CF9C'].map(hex),
  window: hex('#FFD27A'),
  windowOff: hex('#1C2331'),
  ink: hex('#F2F4F8'),
  accent: hex('#FF4B60'),
  glint: hex('#9CC2FF'),
};

// Timeline, seconds.
const PULL_END = 3.1;
const FLY_START = 2.9;
const FLY_SPREAD = 0.65;
const FLY_DUR = 1.2;
const FORMED = FLY_START + FLY_SPREAD + FLY_DUR + 0.25;
const GLINT_END = FORMED + 1.6;
const MAX_POINTS = 1300;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);

function prng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The river bends across the city a little above the middle.
const riverY = (x: number, w: number, h: number) => -h * 0.1 + Math.sin((x / w) * Math.PI * 2.2 + 0.7) * h * 0.1;

function newObj(kind: Kind, x: number, y: number, w: number, h: number, color: RGB, side: RGB, seed: number): Obj {
  return {
    kind, x, y, w, h, ext: 0, color, side, fill: rgb(color), sideFill: rgb(side), hiFill: rgb(mix(color, [255, 255, 255], 0.28)), appear: 0, seed, tower: false, axis: 0, dir: 1, speed: 0, lo: 0, hi: 0,
    spare: false, tx: 0, ty: 0, tc: color, delay: 0, dur: FLY_DUR, bend: 0, launched: false,
    sx: 0, sy: 0, sw: 0, sh: 0, sext: 0, srot: 0, sc: color, twinkle: 0,
  };
}

function buildWorld(width: number, height: number, block: number, pal: Palette): World {
  const rand = prng(20260927);
  const half = { w: width * 0.54, h: height * 0.54 };
  const road = Math.max(5, block * 0.14);
  const riverHalf = Math.max(road * 1.1, height * 0.032);
  const towersAt = { x: width * 0.2, y: height * 0.16 };

  const line = (from: number, to: number) => {
    const out: number[] = [];
    for (let v = from - rand() * block * 0.5; v < to + block; v += block * (0.8 + rand() * 0.45)) out.push(v);
    return out;
  };
  const xs = line(-half.w, half.w);
  const ys = line(-half.h, half.h);

  const objs: Obj[] = [];
  const blocks: World['blocks'] = [];
  const nearRiver = (x: number, y: number, pad: number) => Math.abs(y - riverY(x, width, height)) < riverHalf + pad;

  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const bx = xs[i] + road / 2;
      const by = ys[j] + road / 2;
      const bw = xs[i + 1] - xs[i] - road;
      const bh = ys[j + 1] - ys[j] - road;
      if (bw < road || bh < road) continue;
      const riverside = nearRiver(bx + bw / 2, by + bh / 2, Math.max(bw, bh) * 0.7);
      const park = rand() < (riverside ? 0.45 : 0.17);
      blocks.push({ x: bx, y: by, w: bw, h: bh, park });

      if (park) {
        const step = block * 0.21;
        for (let ty = by + step * 0.55; ty < by + bh - step * 0.3; ty += step) {
          for (let tx = bx + step * 0.55; tx < bx + bw - step * 0.3; tx += step) {
            if (rand() > 0.8) continue;
            const x = tx + (rand() - 0.5) * step * 0.35;
            const y = ty + (rand() - 0.5) * step * 0.35;
            if (nearRiver(x, y, step * 0.4)) continue;
            const d = step * (0.62 + rand() * 0.28);
            const color = pal.trees[(rand() * pal.trees.length) | 0];
            objs.push(newObj('tree', x, y, d, d, color, shade(color, 0.18), rand()));
          }
        }
        continue;
      }

      const nx = Math.max(1, Math.min(4, Math.round(bw / (block * 0.3))));
      const ny = Math.max(1, Math.min(4, Math.round(bh / (block * 0.3))));
      const lw = bw / nx;
      const lh = bh / ny;
      const gap = block * 0.05;
      for (let a = 0; a < nx; a++) {
        for (let b = 0; b < ny; b++) {
          if (rand() < 0.06) continue;
          const w = lw - gap * (1.2 + rand());
          const h = lh - gap * (1.2 + rand());
          const x = bx + lw * (a + 0.5);
          const y = by + lh * (b + 0.5);
          if (nearRiver(x, y, Math.max(w, h) * 0.6)) continue;
          const tower = Math.hypot(x - towersAt.x, (y - towersAt.y) * 1.3) < block * 1.25;
          const accent = !tower && rand() < 0.13;
          const color = tower ? pal.towerRoof : (accent ? pal.accentRoofs : pal.roofs)[(rand() * 4) | 0];
          const side = tower ? pal.towerSide : shade(color, accent ? 0.22 : 0.2);
          const house = newObj('house', x, y, w, h, color, side, rand());
          house.tower = tower;
          house.ext = Math.min(w, h) * (tower ? 1.1 + rand() * 0.9 : 0.25 + rand() * 0.55);
          objs.push(house);
        }
      }
    }
  }

  // Road pieces: every third avenue crosses the river on a bridge, the rest stop at the embankment.
  const segs: Segment[] = [];
  const cut = riverHalf + road * 0.8;
  xs.forEach((x, i) => {
    const ry = riverY(x, width, height);
    if (i % 3 === 1) segs.push({ axis: 1, at: x, from: -half.h, to: half.h });
    else {
      segs.push({ axis: 1, at: x, from: -half.h, to: ry - cut });
      segs.push({ axis: 1, at: x, from: ry + cut, to: half.h });
    }
  });
  ys.forEach((y) => {
    let from: number | null = null;
    for (let x = -half.w; x <= half.w + 6; x += 6) {
      const dry = x > half.w || Math.abs(y - riverY(x, width, height)) < cut;
      if (!dry && from === null) from = x;
      if (dry && from !== null) {
        segs.push({ axis: 0, at: y, from, to: Math.min(x, half.w) });
        from = null;
      }
    }
  });

  // Cars: a few per piece of road, in both directions.
  const laneOffset = road * 0.23;
  const carLen = road * 0.62;
  const carWid = road * 0.34;
  for (const seg of segs) {
    const length = seg.to - seg.from;
    if (length < road * 2) continue;
    const share = length / (block * 2.3);
    const count = Math.floor(share) + (rand() < share % 1 ? 1 : 0);
    for (let k = 0; k < count; k++) {
      const dir: 1 | -1 = rand() < 0.5 ? 1 : -1;
      const along = seg.from + rand() * length;
      const across = seg.at + dir * laneOffset;
      const color = pal.cars[(rand() * pal.cars.length) | 0];
      const car = newObj('car', seg.axis ? across : along, seg.axis ? along : across, carLen, carWid, color, shade(color, 0.3), rand());
      car.axis = seg.axis;
      car.dir = dir;
      car.speed = block * (0.45 + rand() * 0.5);
      car.lo = seg.from;
      car.hi = seg.to;
      objs.push(car);
    }
  }
  // Back to front, so nearer houses cover the ones behind them.
  objs.sort((a, b) => a.y + a.h / 2 - (b.y + b.h / 2));

  return { objs, segs, road, riverHalf, blocks, half };
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
  const size = twoLines
    ? Math.min((100 * bw * 0.97) / mainW, bh / 2.05)
    : Math.min((100 * bw * 0.97) / (mainW + tailW), bh / 1.1);
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
  // About 1 300 points at most: enough to read the lettering, light enough for weak laptops and phones.
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
  const ctx = canvas.getContext('2d');
  let raf = 0;
  let start = 0;
  let skipped = reduced;
  let formedSent = false;
  let destroyed = false;

  let width = 0;
  let height = 0;
  let world: World | null = null;
  let flyers: Obj[] = [];
  let step = 4;
  let zoom0 = 2.5;
  let pan0 = { x: 0, y: 0 };
  let paired = false;
  let logoSpan = { left: 0, right: 0 };
  let logoBox = { x: 0, y: 0, w: 0, h: 0 };

  const sendFormed = () => {
    if (formedSent) return;
    formedSent = true;
    onFormed();
  };

  function sizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function setup() {
    const m = measure();
    width = m.width;
    height = m.height;
    logoBox = m.logo;
    sizeCanvas();

    const logo = sampleLogo(m.logo);
    step = logo.step;
    const want = logo.points.length * 1.12;
    // Pick the block size so the city has a little more objects than the lettering has points.
    let block = Math.sqrt((width * height * 1.17 * 7) / Math.max(want, 60));
    let built = buildWorld(width, height, block, pal);
    for (let tries = 0; tries < 3 && Math.abs(built.objs.length / want - 1) > 0.08; tries++) {
      block *= Math.sqrt(built.objs.length / want);
      built = buildWorld(width, height, block, pal);
    }
    world = built;

    zoom0 = width < 640 ? 3.2 : 3;
    pan0 = { x: width * 0.08, y: -height * 0.05 };
    const rand = prng(7);
    const reach = Math.hypot(width, height) * 0.5 * zoom0;
    for (const obj of world.objs) {
      const sx = (obj.x - pan0.x) * zoom0;
      const sy = (obj.y - pan0.y) * zoom0;
      obj.appear = 0.15 + Math.min(1, Math.hypot(sx, sy) / reach) * 1.9 + rand() * 0.25;
      obj.twinkle = rand() * Math.PI * 2;
    }

    // Pair objects with points: the objects furthest from the centre are spare and melt away,
    // the rest are matched left to right so the swarm doesn't cross itself.
    const points = logo.points;
    const byDistance = [...world.objs].sort((a, b) => Math.hypot(a.x, a.y * 1.4) - Math.hypot(b.x, b.y * 1.4));
    const used = byDistance.slice(0, points.length);
    byDistance.slice(points.length).forEach((obj) => (obj.spare = true));
    used.sort((a, b) => a.x - b.x || a.y - b.y);
    const sortedPoints = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
    const n = Math.max(1, used.length);
    used.forEach((obj, i) => {
      const p = sortedPoints[i];
      obj.tx = p.x;
      obj.ty = p.y;
      const target = p.accent ? pal.accent : pal.ink;
      obj.tc = mix(target, obj.color, p.accent ? 0.12 : 0.16);
      obj.delay = (i / n) * FLY_SPREAD * 0.8 + rand() * FLY_SPREAD * 0.2;
      obj.dur = FLY_DUR * (0.85 + rand() * 0.3);
      obj.bend = (rand() - 0.5) * 0.7;
    });
    for (const obj of world.objs) if (obj.spare) obj.delay = rand() * FLY_SPREAD;
    flyers = used;
    logoSpan = {
      left: sortedPoints.length ? sortedPoints[0].x : 0,
      right: sortedPoints.length ? sortedPoints[sortedPoints.length - 1].x : 0,
    };
    paired = true;
  }

  const cam = (t: number) => {
    const e = easeInOutSine(clamp01(t / PULL_END));
    // The background keeps drifting back a touch while the objects fly.
    const extra = 1 - 0.05 * clamp01((t - PULL_END) / 1.5);
    return {
      zoom: (1 + (zoom0 - 1) * (1 - e)) * extra,
      x: pan0.x * (1 - e),
      y: pan0.y * (1 - e),
    };
  };

  const carPos = (obj: Obj, t: number) => {
    const travel = obj.dir * obj.speed * Math.max(0, t - 0.4);
    const length = obj.hi - obj.lo;
    const base = (obj.axis ? obj.y : obj.x) - obj.lo + travel;
    const v = obj.lo + (((base % length) + length) % length);
    return obj.axis ? { x: obj.x, y: v } : { x: v, y: obj.y };
  };

  function drawRoundRect(x: number, y: number, w: number, h: number, r: number) {
    if (!ctx) return;
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
    ctx.fill();
  }

  function drawWorld(t: number) {
    if (!ctx || !world) return;
    const { zoom, x: cx, y: cy } = cam(t);
    const ground = 1 - easeInOutSine(clamp01((t - FLY_START) / 0.9));
    const reveal = easeOutCubic(clamp01(t / 0.7));
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-cx, -cy);
    const view = { l: cx - width / 2 / zoom, r: cx + width / 2 / zoom, t: cy - height / 2 / zoom, b: cy + height / 2 / zoom };
    const { half, road } = world;

    if (ground > 0.01) {
      ctx.globalAlpha = ground * reveal;
      ctx.fillStyle = pal.block;
      for (const b of world.blocks) if (!b.park) drawRoundRect(b.x, b.y, b.w, b.h, road * 0.35);
      ctx.fillStyle = pal.park;
      for (const b of world.blocks) if (b.park) drawRoundRect(b.x, b.y, b.w, b.h, road * 0.5);

      // The river, with slow ripples moving downstream.
      const { riverHalf } = world;
      ctx.beginPath();
      for (let x = -half.w; x <= half.w; x += 12) ctx.lineTo(x, riverY(x, width, height) - riverHalf);
      for (let x = half.w; x >= -half.w; x -= 12) ctx.lineTo(x, riverY(x, width, height) + riverHalf);
      ctx.closePath();
      ctx.fillStyle = rgb(pal.river);
      ctx.fill();
      ctx.strokeStyle = pal.riverHi;
      ctx.lineWidth = road * 0.12;
      ctx.lineCap = 'round';
      ctx.setLineDash([road * 1.6, road * 2.4]);
      ctx.lineDashOffset = -t * road * 1.4;
      for (const k of [-0.45, 0.15, 0.55]) {
        ctx.beginPath();
        for (let x = -half.w; x <= half.w; x += 12) ctx.lineTo(x, riverY(x, width, height) + riverHalf * k);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      ctx.fillStyle = pal.road;
      for (const seg of world.segs) {
        if (seg.axis) ctx.fillRect(seg.at - road / 2, seg.from, road, seg.to - seg.from);
        else ctx.fillRect(seg.from, seg.at - road / 2, seg.to - seg.from, road);
      }
      ctx.strokeStyle = pal.roadLine;
      ctx.lineWidth = Math.max(0.6, road * 0.06);
      ctx.setLineDash([road * 0.5, road * 0.55]);
      ctx.beginPath();
      for (const seg of world.segs) {
        if (seg.axis) {
          ctx.moveTo(seg.at, seg.from);
          ctx.lineTo(seg.at, seg.to);
        } else {
          ctx.moveTo(seg.from, seg.at);
          ctx.lineTo(seg.to, seg.at);
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    // Objects still on the ground: cars first, then houses and trees from back to front.
    const pad = 60 / zoom;
    for (const obj of world.objs) {
      if (obj.kind !== 'car' || obj.launched) continue;
      const grow = clamp01((t - obj.appear) / 0.4);
      if (grow <= 0) continue;
      const pos = carPos(obj, t);
      if (pos.x < view.l - pad || pos.x > view.r + pad || pos.y < view.t - pad || pos.y > view.b + pad) continue;
      const melt = obj.spare ? 1 - clamp01((t - FLY_START - obj.delay) / 0.5) : 1;
      if (melt <= 0) continue;
      ctx.globalAlpha = grow * melt;
      const len = obj.w * melt;
      const wid = obj.h * melt;
      ctx.fillStyle = pal.shadow;
      if (obj.axis) {
        ctx.fillRect(pos.x - wid / 2 + wid * 0.25, pos.y - len / 2 + wid * 0.3, wid, len);
        ctx.fillStyle = obj.fill;
        drawRoundRect(pos.x - wid / 2, pos.y - len / 2, wid, len, wid * 0.35);
        ctx.fillStyle = obj.sideFill;
        ctx.fillRect(pos.x - wid * 0.32, pos.y - len * 0.12, wid * 0.64, len * 0.3);
      } else {
        ctx.fillRect(pos.x - len / 2 + wid * 0.25, pos.y - wid / 2 + wid * 0.3, len, wid);
        ctx.fillStyle = obj.fill;
        drawRoundRect(pos.x - len / 2, pos.y - wid / 2, len, wid, wid * 0.35);
        ctx.fillStyle = obj.sideFill;
        ctx.fillRect(pos.x - len * 0.12, pos.y - wid * 0.32, len * 0.3, wid * 0.64);
      }
    }
    ctx.globalAlpha = 1;

    for (const obj of world.objs) {
      if (obj.kind === 'car' || obj.launched) continue;
      const g = clamp01((t - obj.appear) / 0.55);
      if (g <= 0) continue;
      if (obj.x < view.l - pad - obj.w || obj.x > view.r + pad + obj.w || obj.y < view.t - pad - obj.ext || obj.y > view.b + pad + obj.h) continue;
      const melt = obj.spare ? 1 - clamp01((t - FLY_START - obj.delay) / 0.5) : 1;
      if (melt <= 0) continue;
      if (obj.kind === 'tree') {
        const r = (obj.w / 2) * easeOutBack(g) * melt;
        ctx.globalAlpha = Math.min(1, g * 2) * melt;
        ctx.fillStyle = pal.shadow;
        ctx.beginPath();
        ctx.arc(obj.x + r * 0.25, obj.y + r * 0.3, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = obj.fill;
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, r, 0, Math.PI * 2);
        ctx.fill();
        if (r * zoom > 5) {
          ctx.fillStyle = obj.hiFill;
          ctx.beginPath();
          ctx.arc(obj.x - r * 0.3, obj.y - r * 0.3, r * 0.38, 0, Math.PI * 2);
          ctx.fill();
        }
        continue;
      }
      // A house rises from its footprint: shadow, facade, then the roof.
      const s = (0.7 + 0.3 * easeOutCubic(g)) * melt;
      const w = obj.w * s;
      const h = obj.h * s;
      const ext = obj.ext * easeOutCubic(g) * melt;
      const x = obj.x - w / 2;
      const y = obj.y - h / 2;
      ctx.globalAlpha = Math.min(1, g * 2.5) * melt;
      ctx.fillStyle = pal.shadow;
      ctx.fillRect(x + ext * 0.45, y + ext * 0.1, w, h);
      ctx.fillStyle = obj.sideFill;
      ctx.fillRect(x, y + h - ext, w, ext);
      if (ext * zoom > 9 && w * zoom > 12) drawWindows(obj, x, y + h - ext, w, ext);
      ctx.fillStyle = obj.fill;
      ctx.fillRect(x, y - ext, w, h);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawWindows(obj: Obj, x: number, y: number, w: number, ext: number) {
    if (!ctx) return;
    const size = Math.max(1.4, Math.min(w, ext) * 0.13);
    const gapX = size * 1.9;
    const gapY = size * 2;
    const cols = Math.max(1, Math.floor((w - size) / gapX));
    const rows = Math.max(1, Math.floor((ext - size) / gapY));
    const startX = x + (w - (cols - 1) * gapX - size) / 2;
    let seed = (obj.seed * 1e6) | 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        seed = (seed * 16807) % 2147483647;
        const lit = dark ? seed % 10 < 4 : seed % 10 < 7;
        ctx.fillStyle = rgb(lit ? (obj.tower && !dark ? [238, 245, 255] : pal.window) : pal.windowOff);
        ctx.fillRect(startX + c * gapX, y + size * 0.9 + r * gapY, size, size * 1.2);
      }
    }
  }

  // Take-off: remember where and how big the object is on screen right now.
  function launch(obj: Obj, t: number) {
    if (!world) return;
    const { zoom, x: cx, y: cy } = cam(t);
    let wx = obj.x;
    let wy = obj.y;
    if (obj.kind === 'car') {
      const pos = carPos(obj, t);
      wx = pos.x;
      wy = pos.y;
    }
    obj.sx = width / 2 + (wx - cx) * zoom;
    obj.sy = height / 2 + (wy - cy) * zoom;
    obj.sw = obj.w * zoom;
    obj.sh = obj.h * zoom;
    obj.sext = obj.ext * zoom;
    obj.srot = obj.kind === 'car' && obj.axis ? Math.PI / 2 : 0;
    obj.sc = obj.color;
    if (obj.kind === 'house') obj.sy -= obj.sext / 2;
    obj.launched = true;
  }

  function drawFlyers(t: number) {
    if (!ctx) return;
    const size = step * 0.86;
    const glintAt = FORMED < t && t < GLINT_END ? (t - FORMED) / (GLINT_END - FORMED) : -1;
    const { left: logoLeft, right: logoRight } = logoSpan;
    const band = logoLeft - 120 + (logoRight - logoLeft + 240) * glintAt;

    for (const obj of flyers) {
      if (!obj.launched) continue;
      const p = clamp01((t - FLY_START - obj.delay) / obj.dur);
      const e = easeInOutCubic(p);
      // A gentle arc instead of a straight line.
      const dx = obj.tx - obj.sx;
      const dy = obj.ty - obj.sy;
      const bend = obj.bend * Math.sin(Math.PI * e);
      const x = obj.sx + dx * e - dy * bend * 0.35;
      const y = obj.sy + dy * e + dx * bend * 0.35 - Math.sin(Math.PI * e) * 18;
      let color = mix(obj.sc, obj.tc, clamp01(e * 1.15));
      if (glintAt >= 0) {
        const d = Math.abs(obj.tx + (obj.ty - logoLeft) * 0.25 - band);
        if (d < 46) color = mix(color, pal.glint, (1 - d / 46) * 0.65);
      }
      ctx.fillStyle = rgb(color);

      if (obj.kind === 'tree') {
        const r = (obj.sw / 2) * (1 - e) + size * 0.55 * e;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      const w = obj.sw * (1 - e) + size * e;
      const h = obj.sh * (1 - e) + size * e;
      if (obj.kind === 'car') {
        const rot = obj.srot * (1 - e);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        drawRoundRect(-w / 2, -h / 2, w, h, Math.min(w, h) * 0.3);
        ctx.restore();
        continue;
      }
      const facade = obj.sext * Math.pow(1 - e, 2);
      if (facade > 0.3) {
        ctx.fillStyle = rgb(mix(obj.side, obj.tc, e));
        ctx.fillRect(x - w / 2, y + h / 2 - facade / 2, w, facade);
        ctx.fillStyle = rgb(color);
      }
      ctx.fillRect(x - w / 2, y - h / 2 - facade / 2, w, h);
    }
  }

  // The finished lettering, drawn without the city (reduced motion, skip, resize after the end).
  function drawFormed(t: number) {
    for (const obj of flyers) {
      obj.launched = true;
      obj.sx = obj.tx;
      obj.sy = obj.ty;
      obj.sw = step * 0.86;
      obj.sh = step * 0.86;
      obj.sext = 0;
      obj.srot = 0;
      obj.sc = obj.tc;
    }
    drawFlyers(t);
  }

  function frame(now: number) {
    if (destroyed || !ctx) return;
    if (!start) start = now;
    let t = (now - start) / 1000;
    if (skipped && t < FORMED) {
      start = now - FORMED * 1000;
      t = FORMED;
    }
    ctx.clearRect(0, 0, width, height);
    if (t >= FORMED) {
      drawFormed(reduced ? 0 : t);
      sendFormed();
      if (t < GLINT_END && !reduced) raf = requestAnimationFrame(frame);
      return;
    }
    if (world && paired) {
      for (const obj of flyers) if (!obj.launched && t >= FLY_START + obj.delay) launch(obj, t);
    }
    drawWorld(t);
    drawFlyers(t);
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
      if (Math.abs(m.width - width) < 2 && Math.abs(m.logo.w - logoBox.w) < 2) {
        // Only the height changed (a phone's address bar): keep playing and move the lettering with the layout.
        const dx = m.logo.x - logoBox.x;
        const dy = m.logo.y - logoBox.y;
        logoBox = m.logo;
        height = m.height;
        sizeCanvas();
        for (const obj of flyers) {
          obj.tx += dx;
          obj.ty += dy;
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
