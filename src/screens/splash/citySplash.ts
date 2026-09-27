// The splash: Moscow's landmarks rise on the skyline over a real 3D city (WebGL), the camera climbs into an aerial
// view over the centre, and then the buildings, trees and cars fly up into the «МосГорБюджет.Трек» lettering.
// Three layers share one camera: the sky (2D), the city (WebGL) and the landmarks, names and flying dots (2D).

import { CITY_DARK, CITY_LIGHT, drawGround, generateCity, type Road } from './cityGen';
import { createCityRenderer, type CityRenderer, type GlLook } from './cityGl';
import { LANDMARKS, LANDMARK_DARK, LANDMARK_LIGHT, type LandmarkId } from './landmarks';
import type { Pt } from './moscow';

type RGB = [number, number, number];

const hex = (value: string): RGB => [parseInt(value.slice(1, 3), 16), parseInt(value.slice(3, 5), 16), parseInt(value.slice(5, 7), 16)];
const unit = (value: string): [number, number, number] => hex(value).map((c) => c / 255) as [number, number, number];
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
const RISE_END = 5.3; // the aerial view settles
const ASSEMBLE = 5.7; // the city takes off
const FLY_SPREAD = 0.6;
const FLY_DUR = 1.05;
const FORMED = ASSEMBLE + FLY_SPREAD + FLY_DUR + 0.2;
const GLINT_END = FORMED + 1.5;
const MAX_POINTS = 1300;
const NEAR = 0.3;
const PITCH_END = 0.98;
const TARGET_END: Pt = [-1.9, 0.6];

// ---------- Palettes for the 2D layers ----------

interface Palette {
  sky: [string, string];
  fog: string;
  haze: string;
  cloud: string;
  distant: string;
  sun: boolean;
  stars: boolean;
  shadow: string;
  labelBg: string;
  labelInk: string;
  bird: string;
  ink: RGB;
  accent: RGB;
  glint: RGB;
}

const LIGHT: Palette = {
  sky: ['#BCD2FF', '#FBE9EF'],
  fog: '#F1ECF2',
  haze: 'rgba(255, 255, 255, 0.85)',
  cloud: 'rgba(255, 255, 255, 0.85)',
  distant: 'rgba(196, 210, 236, 0.7)',
  sun: true,
  stars: false,
  shadow: 'rgba(38, 58, 108, 0.18)',
  labelBg: 'rgba(255, 255, 255, 0.92)',
  labelInk: '#0E1524',
  bird: 'rgba(14, 21, 36, 0.55)',
  ink: hex('#0E1524'),
  accent: hex('#D6263A'),
  glint: hex('#FFFFFF'),
};

const DARK: Palette = {
  sky: ['#050811', '#1B2745'],
  fog: '#1B2745',
  haze: 'rgba(40, 56, 96, 0.7)',
  cloud: 'rgba(120, 140, 180, 0.16)',
  distant: 'rgba(40, 54, 86, 0.85)',
  sun: false,
  stars: true,
  shadow: 'rgba(0, 0, 0, 0.45)',
  labelBg: 'rgba(22, 27, 38, 0.92)',
  labelInk: '#F2F4F8',
  bird: 'rgba(200, 210, 230, 0.5)',
  ink: hex('#F2F4F8'),
  accent: hex('#FF4B60'),
  glint: hex('#9CC2FF'),
};

// Landmarks stand in a composed row for the skyline shot and walk to their real places as the camera climbs.
const SCENE: { id: LandmarkId; row: Pt; geo: Pt; h: number; start: number }[] = [
  { id: 'msu', row: [-8, 2.5], geo: [-6, -5.6], h: 4.4, start: 0.2 },
  { id: 'shukhov', row: [-4.3, 0.4], geo: [-0.5, -3.7], h: 3.3, start: 0.45 },
  { id: 'kremlin', row: [0, -1.6], geo: [0.02, 0.02], h: 3.4, start: 0.7 },
  { id: 'ostankino', row: [1.6, 8], geo: [-0.6, 7.9], h: 7.4, start: 0.95 },
  { id: 'basil', row: [4.8, -2.2], geo: [0.45, -0.12], h: 3.1, start: 1.2 },
  { id: 'city', row: [7.8, 3.4], geo: [-5.1, 0.8], h: 5.2, start: 1.45 },
];

interface Car {
  road: Road;
  offset: number;
  speed: number;
  lane: number;
  color: [number, number, number];
  glow: number;
}

interface Dot {
  sx: number;
  sy: number;
  size: number;
  color: RGB;
  round: boolean;
  tx: number;
  ty: number;
  tc: RGB;
  delay: number;
  dur: number;
  bend: number;
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
  // An empty, absolutely positioned element: the splash puts its canvases inside.
  layer: HTMLElement;
  // The logo box and the stage size, both in the layer's own CSS pixels.
  measure: () => { width: number; height: number; logo: { x: number; y: number; w: number; h: number } };
  dark: boolean;
  reduced: boolean;
  onFormed: () => void;
}

export function startCitySplash({ layer, measure, dark, reduced, onFormed }: CitySplashOptions) {
  const pal = dark ? DARK : LIGHT;
  const cityPal = dark ? CITY_DARK : CITY_LIGHT;
  const lc = dark ? LANDMARK_DARK : LANDMARK_LIGHT;

  const makeCanvas = () => {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
    layer.appendChild(canvas);
    return canvas;
  };
  const skyCanvas = makeCanvas();
  const glCanvas = makeCanvas();
  const topCanvas = makeCanvas();
  const sky = skyCanvas.getContext('2d');
  const top = topCanvas.getContext('2d');

  let raf = 0;
  let start = 0;
  let skipped = reduced;
  let formedSent = false;
  let destroyed = false;

  // ---------- The city ----------

  const city = generateCity(cityPal);
  let renderer: CityRenderer | null = null;
  const cars: Car[] = [];
  const carRand = prng(5);
  const density = [9, 10, 6, 2.6];
  city.roads.forEach((road, i) => {
    const count = Math.round(road.total * (density[i] ?? 4.5));
    for (let k = 0; k < count; k++) {
      const dir = k % 2 ? 1 : -1;
      const tone = cityPal.cars[(carRand() * cityPal.cars.length) | 0];
      cars.push({
        road,
        offset: carRand() * road.total,
        speed: dir * (0.32 + carRand() * 0.3),
        lane: dir * road.width * (0.18 + carRand() * 0.12),
        color: dark ? (dir > 0 ? [1, 0.86, 0.55] : [1, 0.33, 0.33]) : tone,
        glow: dark ? 1 : 0,
      });
    }
  });
  const carData = new Float32Array(cars.length * 8);

  if (!reduced) {
    try {
      const size = Math.min(2048, window.innerWidth < 700 ? 1536 : 2048);
      const texture = document.createElement('canvas');
      texture.width = size;
      texture.height = size;
      const tctx = texture.getContext('2d');
      if (tctx) {
        drawGround(tctx, size, cityPal, city);
        renderer = createCityRenderer(glCanvas, city, texture, cars.length);
      }
    } catch {
      renderer = null;
    }
    // Without WebGL2 the splash goes straight to the lettering.
    if (!renderer) skipped = true;
  }

  const rand = prng(20260927);
  const stars = Array.from({ length: 90 }, () => ({ x: rand(), y: rand(), r: 0.4 + rand() * 1.1, p: rand() * 6 }));
  const skyline = Array.from({ length: 37 }, () => rand());
  const clouds = Array.from({ length: 5 }, () => ({ x: rand(), y: 0.08 + rand() * 0.2, s: 0.7 + rand() * 0.7, v: 0.006 + rand() * 0.01 }));

  let W = 0;
  let H = 0;
  let f = 1000;
  let portrait = false;
  let pan: [number, number] = [0, 0];
  let distEnd = 16;
  let starts = SCENE.map((item) => item.start);
  let logoBox = { x: 0, y: 0, w: 0, h: 0 };
  let logoSpan = { left: 0, right: 0 };
  let targets: { x: number; y: number; accent: boolean }[] = [];
  let step = 4;
  let dots: Dot[] = [];

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
    const pitch0 = lerp(0.056, 0.078, side);
    return {
      rise,
      pitch: lerp(pitch0, PITCH_END, rise),
      dist: lerp(24, distEnd, easeInOutSine(rise)),
      tx: lerp(panX, TARGET_END[0], rise),
      ty: lerp(0, TARGET_END[1], rise),
      cy: lerp(H * (portrait ? 0.76 : 0.74), H * (portrait ? 0.56 : 0.58), rise),
    };
  }

  type Cam = ReturnType<typeof cam>;
  type Proj = { sx: number; sy: number; depth: number };
  type Projector = (x: number, y: number, z?: number) => Proj;

  const cameraPos = (c: Cam) => ({ x: c.tx, y: c.ty - c.dist * Math.cos(c.pitch), z: c.dist * Math.sin(c.pitch) });

  function projector(c: Cam): Projector {
    const cp = Math.cos(c.pitch);
    const sp = Math.sin(c.pitch);
    const p = cameraPos(c);
    return (x, y, z = 0) => {
      const vx = x - p.x;
      const vy = y - p.y;
      const vz = z - p.z;
      const depth = vy * cp - vz * sp;
      return { depth, sx: W / 2 + (f * vx) / depth, sy: c.cy - (f * (vy * sp + vz * cp)) / depth };
    };
  }

  function look(c: Cam, t: number): GlLook {
    const sink = easeInOutCubic(clamp01((t - ASSEMBLE - 0.05) / 0.55));
    return dark
      ? {
          light: [0.3, -0.6, 0.74],
          ambient: 0.42,
          diffuse: 0.28,
          fog: unit(pal.fog),
          fogNear: lerp(9, 26, c.rise),
          fogFar: lerp(34, 70, c.rise),
          night: 1,
          sink,
          land: unit(cityPal.land),
          water: unit(cityPal.river),
          windowLit: [1, 0.82, 0.48],
          windowDark: [0.07, 0.09, 0.13],
        }
      : {
          light: [0.55, -0.5, 0.67],
          ambient: 0.56,
          diffuse: 0.52,
          fog: unit(pal.fog),
          fogNear: lerp(9, 28, c.rise),
          fogFar: lerp(36, 75, c.rise),
          night: 0,
          sink,
          land: unit(cityPal.land),
          water: unit(cityPal.river),
          windowLit: [1, 0.86, 0.55],
          windowDark: [0.62, 0.7, 0.8],
        };
  }

  function carsAt(t: number) {
    const grow = clamp01((t - 0.9) / 0.6);
    cars.forEach((car, i) => {
      const road = car.road;
      let d = (car.offset + car.speed * t) % road.total;
      if (d < 0) d += road.total;
      let lo = 0;
      let hi = road.cum.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (road.cum[mid] <= d) lo = mid;
        else hi = mid;
      }
      const [ax, ay] = road.pts[lo];
      const [bx, by] = road.pts[hi];
      const seg = road.cum[hi] - road.cum[lo] || 1;
      const u = (d - road.cum[lo]) / seg;
      const dx = (bx - ax) / seg;
      const dy = (by - ay) / seg;
      const o = i * 8;
      carData[o] = ax + (bx - ax) * u - dy * car.lane;
      carData[o + 1] = ay + (by - ay) * u + dx * car.lane;
      carData[o + 2] = Math.atan2(dy, dx);
      carData[o + 3] = grow;
      carData[o + 4] = car.color[0];
      carData[o + 5] = car.color[1];
      carData[o + 6] = car.color[2];
      carData[o + 7] = car.glow;
    });
  }

  // ---------- Setup ----------

  function sizeCanvases() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const [canvas, ctx] of [[skyCanvas, sky], [topCanvas, top]] as const) {
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    renderer?.resize(W, H, dpr);
  }

  function setup() {
    const m = measure();
    W = m.width;
    H = m.height;
    logoBox = m.logo;
    sizeCanvases();
    portrait = W < H;
    f = portrait ? H * 1.5 : Math.min(H * 1.7, W * 1.12);
    pan = portrait ? [-8.5, 8.5] : [-0.8, 0.8];
    distEnd = ((portrait ? 5 : 10.2) * f) / (W / 2);
    starts = SCENE.map((item) => {
      if (!portrait) return item.start;
      const e = clamp01((item.row[0] - 2.8 - pan[0]) / (pan[1] - pan[0]));
      return Math.max(0.15, (SIDE_END * Math.acos(1 - 2 * e)) / Math.PI);
    });
    const logo = sampleLogo(m.logo);
    targets = logo.points;
    step = logo.step;
    dots = [];
    glCanvas.style.opacity = '1';
  }

  // The city at take-off, turned into dots: the roofs of buildings, the crowns of trees and the cars.
  function buildDots() {
    const c = cam(ASSEMBLE);
    const proj = projector(c);
    const L = look(c, ASSEMBLE);
    const shade = L.ambient + 0.08 + L.diffuse * 0.74;
    const sources: Omit<Dot, 'tx' | 'ty' | 'tc' | 'delay' | 'dur' | 'bend'>[] = [];
    const onScreen = (p: Proj) => p.depth > NEAR && p.sx > -20 && p.sx < W + 20 && p.sy > -20 && p.sy < H + 20;
    const b = city.buildings;
    for (let i = 0; i < city.buildingCount; i++) {
      const o = i * 16;
      const p = proj(b[o], b[o + 1], b[o + 5] + b[o + 4]);
      if (!onScreen(p)) continue;
      const size = Math.max(1.8, Math.min(9, Math.sqrt(b[o + 2] * b[o + 3]) * (f / p.depth)));
      sources.push({ sx: p.sx, sy: p.sy, size, color: [b[o + 8] * 255 * shade, b[o + 9] * 255 * shade, b[o + 10] * 255 * shade], round: false });
    }
    const tr = city.trees;
    for (let i = 0; i < city.treeCount; i++) {
      const o = i * 8;
      const p = proj(tr[o], tr[o + 1], tr[o + 3] * 0.7);
      if (!onScreen(p)) continue;
      const size = Math.max(1.6, Math.min(6, tr[o + 2] * 2 * (f / p.depth)));
      sources.push({ sx: p.sx, sy: p.sy, size, color: [tr[o + 4] * 255 * shade, tr[o + 5] * 255 * shade, tr[o + 6] * 255 * shade], round: true });
    }
    carsAt(ASSEMBLE);
    for (let i = 0; i < cars.length; i++) {
      const p = proj(carData[i * 8], carData[i * 8 + 1], 0.01);
      if (!onScreen(p)) continue;
      sources.push({ sx: p.sx, sy: p.sy, size: 2.2, color: [cars[i].color[0] * 255, cars[i].color[1] * 255, cars[i].color[2] * 255], round: false });
    }

    // One flying dot per point of the lettering, picked evenly over the city.
    const r = prng(11);
    const order = sources.map((_, i) => ({ i, key: r() })).sort((a, z) => a.key - z.key).map((item) => item.i);
    const chosen = order.slice(0, targets.length);
    while (chosen.length < targets.length && sources.length) chosen.push(order[chosen.length % sources.length]);
    const flyers = chosen.map((index) => sources[index]).sort((a, z) => a.sx - z.sx || a.sy - z.sy);
    const sorted = [...targets].sort((a, z) => a.x - z.x || a.y - z.y);
    const n = Math.max(1, flyers.length);
    dots = flyers.map((s, i) => {
      const p = sorted[i];
      return {
        ...s,
        tx: p.x,
        ty: p.y,
        tc: mix(p.accent ? pal.accent : pal.ink, s.color, 0.14),
        delay: (i / n) * FLY_SPREAD * 0.85 + r() * FLY_SPREAD * 0.15,
        dur: FLY_DUR * (0.85 + r() * 0.3),
        bend: (r() - 0.5) * 0.8,
      };
    });
    logoSpan = { left: sorted.length ? sorted[0].x : 0, right: sorted.length ? sorted[sorted.length - 1].x : 0 };
  }

  // ---------- Drawing ----------

  function drawSky(c: Cam, proj: Projector, t: number) {
    if (!sky) return;
    sky.clearRect(0, 0, W, H);
    const far = proj(c.tx, c.ty + 3000);
    const horizon = far.depth > 0 ? far.sy : -1;
    const fade = 1 - clamp01(c.rise * 1.6);
    if (horizon <= 0 || fade <= 0) return;
    sky.globalAlpha = fade;
    const grad = sky.createLinearGradient(0, 0, 0, horizon + 40);
    grad.addColorStop(0, pal.sky[0]);
    grad.addColorStop(1, pal.sky[1]);
    sky.fillStyle = grad;
    sky.fillRect(0, 0, W, horizon + 40);

    if (pal.sun) {
      const sx = W * 0.8;
      const sy = horizon - H * 0.2;
      const sun = sky.createRadialGradient(sx, sy, 0, sx, sy, H * 0.22);
      sun.addColorStop(0, 'rgba(255, 244, 214, 0.95)');
      sun.addColorStop(0.18, 'rgba(255, 226, 180, 0.6)');
      sun.addColorStop(1, 'rgba(255, 220, 200, 0)');
      sky.fillStyle = sun;
      sky.fillRect(sx - H * 0.22, sy - H * 0.22, H * 0.44, H * 0.44);
    }
    if (pal.stars) {
      for (const s of stars) {
        sky.fillStyle = `rgba(255, 255, 255, ${(0.35 + 0.45 * Math.sin(t * 2 + s.p) ** 2).toFixed(3)})`;
        sky.fillRect(s.x * W, s.y * horizon * 0.95, s.r, s.r);
      }
      sky.fillStyle = 'rgba(255, 244, 220, 0.9)';
      sky.beginPath();
      sky.arc(W * 0.82, horizon * 0.28, 16, 0, Math.PI * 2);
      sky.fill();
      sky.fillStyle = pal.sky[0];
      sky.beginPath();
      sky.arc(W * 0.82 + 7, horizon * 0.28 - 4, 14, 0, Math.PI * 2);
      sky.fill();
    }
    sky.fillStyle = pal.cloud;
    for (const cl of clouds) {
      const x = (((cl.x + t * cl.v) % 1.3) - 0.15) * W;
      const y = horizon - (0.3 - cl.y) * H - H * 0.08;
      const s = cl.s * Math.min(W, H) * 0.07;
      sky.beginPath();
      sky.ellipse(x, y, s * 1.6, s * 0.55, 0, 0, Math.PI * 2);
      sky.ellipse(x - s * 0.7, y + s * 0.1, s * 0.8, s * 0.45, 0, 0, Math.PI * 2);
      sky.ellipse(x + s * 0.5, y - s * 0.3, s * 0.9, s * 0.6, 0, 0, Math.PI * 2);
      sky.fill();
    }
    sky.strokeStyle = pal.bird;
    sky.lineWidth = 1.4;
    sky.lineCap = 'round';
    sky.beginPath();
    for (let b = 0; b < 6; b++) {
      const bx = (-0.1 + t * 0.09 + (b % 3) * 0.035) * W;
      const by = horizon - H * (0.34 + (b % 2) * 0.03 + b * 0.008) + Math.sin(t * 1.3 + b) * 3;
      const flap = Math.sin(t * 9 + b * 1.7) * 3;
      const s = 5 + (b % 3);
      sky.moveTo(bx - s, by - flap);
      sky.quadraticCurveTo(bx - s * 0.4, by - 1, bx, by + 1);
      sky.quadraticCurveTo(bx + s * 0.4, by - 1, bx + s, by - flap);
    }
    sky.stroke();
    // Far-off blocks of the city along the horizon.
    sky.fillStyle = pal.distant;
    const u = Math.max(W, H) / 160;
    let x = -((c.tx * f) / 40) % (u * 6) - u * 6;
    let n = 0;
    sky.beginPath();
    while (x < W + u * 6) {
      const w = u * (2.2 + skyline[n % skyline.length] * 3.4);
      const hh = u * (1.2 + skyline[(n * 7 + 3) % skyline.length] * 5.5);
      sky.rect(x, horizon - hh, w - u * 0.35, hh + 2);
      x += w;
      n++;
    }
    sky.fill();
    const haze = sky.createLinearGradient(0, horizon - 40, 0, horizon + 20);
    haze.addColorStop(0, 'rgba(255,255,255,0)');
    haze.addColorStop(1, pal.haze);
    sky.fillStyle = haze;
    sky.fillRect(0, horizon - 40, W, 60);
    sky.globalAlpha = 1;
  }

  function drawLandmarks(c: Cam, proj: Projector, t: number) {
    if (!top) return;
    const slide = easeInOutCubic(clamp01((c.rise - 0.15) / 0.65));
    const fade = 1 - clamp01((t - ASSEMBLE) / 0.3);
    const labels = 1 - clamp01(c.rise * 5);

    const items = SCENE.map((item, i) => {
      const x = lerp(item.row[0], item.geo[0], slide);
      const y = lerp(item.row[1], item.geo[1], slide);
      const h = item.h * lerp(1, 0.42, slide);
      return { item, i, h, base: proj(x, y, 0), top: proj(x, y, h) };
    }).sort((a, b) => b.base.depth - a.base.depth);

    for (const { item, i, h, base, top: head } of items) {
      if (base.depth < NEAR || fade <= 0) continue;
      const lm = LANDMARKS[item.id];
      const grow = easeOutCubic(clamp01((t - starts[i]) / 0.85));
      if (grow <= 0) continue;
      const detail = clamp01((t - starts[i] - 0.55) / 0.8);
      const sx = ((f / base.depth) * h) / 100;
      const sy = (base.sy - head.sy) / 100;
      if (sy <= 0.02) continue;
      const halfPx = lm.half * sx;
      if (base.sx + halfPx < -40 || base.sx - halfPx > W + 40) continue;

      top.globalAlpha = fade;
      top.fillStyle = pal.shadow;
      top.beginPath();
      top.ellipse(base.sx, base.sy, halfPx * 1.05, Math.max(2, halfPx * lerp(0.08, 0.35, c.rise)), 0, 0, Math.PI * 2);
      top.fill();
      if (dark && detail > 0) {
        const glow = top.createRadialGradient(base.sx, base.sy, 0, base.sx, base.sy, halfPx * 1.3);
        glow.addColorStop(0, `rgba(255, 190, 110, ${(0.28 * detail).toFixed(3)})`);
        glow.addColorStop(1, 'rgba(255, 190, 110, 0)');
        top.fillStyle = glow;
        top.fillRect(base.sx - halfPx * 1.3, base.sy - halfPx * 1.3, halfPx * 2.6, halfPx * 1.4);
      }

      top.save();
      top.beginPath();
      top.rect(base.sx - halfPx - 30, -H, halfPx * 2 + 60, base.sy + H);
      top.clip();
      top.translate(base.sx, base.sy + (1 - grow) * sy * (lm.top + 6));
      top.scale(sx, sy);
      lm.draw(top, lc, detail, t);
      top.restore();

      if (grow < 1) {
        top.strokeStyle = rgb(pal.accent, (1 - grow) * 0.8);
        top.lineWidth = 2;
        top.beginPath();
        top.moveTo(base.sx - halfPx, base.sy);
        top.lineTo(base.sx + halfPx, base.sy);
        top.stroke();
      }

      const la = clamp01((t - starts[i] - 0.8) / 0.35) * labels * fade;
      if (la > 0) {
        const fontPx = portrait ? 12 : Math.max(12, Math.min(15, W / 110));
        top.font = `600 ${fontPx}px "Onest", "Segoe UI", system-ui, sans-serif`;
        const tw = top.measureText(lm.name).width;
        const ly = base.sy - (lm.top + 8) * sy - fontPx * 1.3;
        const pw = tw + fontPx * 1.3;
        const ph = fontPx * 1.9;
        top.globalAlpha = la;
        top.fillStyle = pal.labelBg;
        top.beginPath();
        top.roundRect(base.sx - pw / 2, ly - ph / 2, pw, ph, ph / 2);
        top.fill();
        top.fillStyle = pal.labelInk;
        top.textAlign = 'center';
        top.textBaseline = 'middle';
        top.fillText(lm.name, base.sx, ly + 0.5);
        top.textAlign = 'start';
        top.textBaseline = 'alphabetic';
      }
      top.globalAlpha = 1;
    }
  }

  function drawDots(t: number) {
    if (!top) return;
    const size = step * 0.86;
    const glintAt = FORMED < t && t < GLINT_END ? (t - FORMED) / (GLINT_END - FORMED) : -1;
    const band = logoSpan.left - 120 + (logoSpan.right - logoSpan.left + 240) * glintAt;
    const appear = clamp01((t - ASSEMBLE) / 0.25);
    for (const dot of dots) {
      const e = easeInOutCubic(clamp01((t - ASSEMBLE - dot.delay) / dot.dur));
      const dx = dot.tx - dot.sx;
      const dy = dot.ty - dot.sy;
      const arc = Math.sin(Math.PI * e);
      const x = dot.sx + dx * e - dy * dot.bend * arc * 0.35;
      const y = dot.sy + dy * e + dx * dot.bend * arc * 0.35 - arc * 26;
      let color = mix(dot.color, dot.tc, clamp01(e * 1.15));
      if (glintAt >= 0) {
        const d = Math.abs(dot.tx + (dot.ty - logoSpan.left) * 0.25 - band);
        if (d < 46) color = mix(color, pal.glint, (1 - d / 46) * 0.65);
      }
      top.globalAlpha = e > 0 ? 1 : appear;
      top.fillStyle = rgb(color);
      const s = lerp(dot.size, size, e);
      if (!dot.round || e > 0.6) top.fillRect(x - s / 2, y - s / 2, s, s);
      else {
        top.beginPath();
        top.arc(x, y, s / 2, 0, Math.PI * 2);
        top.fill();
      }
    }
    top.globalAlpha = 1;
  }

  function frame(now: number) {
    if (destroyed || !top) return;
    if (!start) start = now;
    let t = (now - start) / 1000;
    if (skipped && t < FORMED) {
      start = now - FORMED * 1000;
      t = FORMED;
    }
    top.clearRect(0, 0, W, H);
    if (t >= ASSEMBLE && !dots.length) buildDots();

    const glAlpha = 1 - clamp01((t - ASSEMBLE - 0.25) / 0.4);
    glCanvas.style.opacity = glAlpha.toFixed(3);
    if (glAlpha > 0 && renderer) {
      const c = cam(t);
      const proj = projector(c);
      const p = cameraPos(c);
      carsAt(t);
      renderer.render(
        { x: p.x, y: p.y, z: p.z, cp: Math.cos(c.pitch), sp: Math.sin(c.pitch), f, w: W, h: H, cy: c.cy },
        look(c, t),
        t,
        carData,
        t > 0.9 ? cars.length : 0,
      );
      drawSky(c, proj, t);
      drawLandmarks(c, proj, t);
    } else {
      sky?.clearRect(0, 0, W, H);
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
        sizeCanvases();
        for (const p of targets) {
          p.x += dx;
          p.y += dy;
        }
        for (const dot of dots) {
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
    restart(skipped);
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
      renderer?.destroy();
      layer.replaceChildren();
    },
  };
}
