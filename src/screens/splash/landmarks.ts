// Moscow landmarks for the splash, drawn as flat illustrations. Each one draws in its own units:
// the origin is the middle of its base, the height is about 100 units, up is negative y.
// `d` (0…1) plays the details after the building has risen: the star lights up, domes pop, windows switch on.

export type LandmarkId = 'kremlin' | 'basil' | 'msu' | 'city' | 'ostankino' | 'shukhov';

export interface LandmarkColors {
  brick: string;
  brickShade: string;
  stone: string;
  gate: string;
  roof: string;
  roofShade: string;
  gold: string;
  goldShade: string;
  star: string;
  starGlow: string;
  clock: string;
  basilTent: string;
  domes: [string, string][];
  msu: string;
  msuShade: string;
  window: string;
  windowLit: string;
  glass: [string, string][];
  glassLine: string;
  concrete: string;
  concreteShade: string;
  deck: string;
  lattice: string;
  antennaRed: string;
  antennaWhite: string;
}

export const LANDMARK_LIGHT: LandmarkColors = {
  brick: '#C4473D',
  brickShade: '#9C3128',
  stone: '#F4EEE4',
  gate: '#4A1E18',
  roof: '#3E8E6A',
  roofShade: '#2B6A4E',
  gold: '#E6B64A',
  goldShade: '#B98A26',
  star: '#E0283C',
  starGlow: 'rgba(255, 70, 90, 0.9)',
  clock: '#1E2A55',
  basilTent: '#5E9C6E',
  domes: [
    ['#D8403A', '#3C9B6B'],
    ['#3F74C8', '#F4F1EA'],
    ['#E7B743', '#3C9B6B'],
    ['#3C9B6B', '#F0D25A'],
  ],
  msu: '#F0E6D4',
  msuShade: '#CDBB9E',
  window: '#AFC0D8',
  windowLit: '#8FB2EA',
  glass: [
    ['#A9C7F4', '#6E96D8'],
    ['#C2D8F8', '#86A8E0'],
    ['#E9C067', '#B98A2B'],
    ['#9ED2DC', '#5EA3B5'],
    ['#6F8FC8', '#43629E'],
  ],
  glassLine: 'rgba(255, 255, 255, 0.45)',
  concrete: '#EEF1F5',
  concreteShade: '#C7CFDB',
  deck: '#3B4B68',
  lattice: '#3B4A63',
  antennaRed: '#E0413A',
  antennaWhite: '#FFFFFF',
};

export const LANDMARK_DARK: LandmarkColors = {
  brick: '#8E2F29',
  brickShade: '#62201B',
  stone: '#D9D0C2',
  gate: '#1A0907',
  roof: '#2A6B4F',
  roofShade: '#1C4A37',
  gold: '#F2C45A',
  goldShade: '#B4861F',
  star: '#FF3B52',
  starGlow: 'rgba(255, 60, 85, 1)',
  clock: '#0F1733',
  basilTent: '#3F7A52',
  domes: [
    ['#C23A34', '#2F8A5C'],
    ['#3563B0', '#DCD8CF'],
    ['#E0AE3A', '#2F8A5C'],
    ['#2F8A5C', '#E3C24A'],
  ],
  msu: '#5A5247',
  msuShade: '#3F382F',
  window: '#2E3444',
  windowLit: '#FFD27A',
  glass: [
    ['#2E4E82', '#1B3159'],
    ['#37598F', '#20396A'],
    ['#8E6A22', '#5E4412'],
    ['#2E6674', '#1B4550'],
    ['#27406E', '#15264A'],
  ],
  glassLine: 'rgba(160, 200, 255, 0.28)',
  concrete: '#8E97A8',
  concreteShade: '#636C7D',
  deck: '#1C2536',
  lattice: '#A8B6CE',
  antennaRed: '#FF4B4B',
  antennaWhite: '#E8ECF4',
};

type Ctx = CanvasRenderingContext2D;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOutBack = (t: number) => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2);

function poly(ctx: Ctx, color: string, ...pts: number[]) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
  ctx.fill();
}

function box(ctx: Ctx, color: string, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function starPath(ctx: Ctx, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

function glowStar(ctx: Ctx, c: LandmarkColors, x: number, y: number, r: number, glow: number) {
  ctx.save();
  if (glow > 0) {
    ctx.shadowColor = c.starGlow;
    ctx.shadowBlur = 18 * glow;
  }
  starPath(ctx, x, y, r);
  ctx.fillStyle = c.star;
  ctx.fill();
  ctx.restore();
  starPath(ctx, x, y, r * 0.5);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fill();
}

// A small deterministic noise for windows, so they don't flicker between frames.
const hash = (a: number, b: number) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

function windows(ctx: Ctx, c: LandmarkColors, x0: number, y0: number, x1: number, y1: number, cols: number, rows: number, d: number, seed: number) {
  const cw = (x1 - x0) / cols;
  const rh = (y1 - y0) / rows;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const lit = hash(i + seed, j) < d * 0.85;
      ctx.fillStyle = lit ? c.windowLit : c.window;
      ctx.fillRect(x0 + cw * (i + 0.28), y0 + rh * (j + 0.25), cw * 0.44, rh * 0.5);
    }
  }
}

// ---------- The Kremlin: a stretch of wall with its swallowtail merlons, towers and the Spasskaya ----------

function kremlinTower(ctx: Ctx, c: LandmarkColors, x: number, w: number, body: number, tent: number) {
  box(ctx, c.brick, x - w / 2, -body, w, body);
  box(ctx, c.brickShade, x + w * 0.12, -body, w * 0.38, body);
  box(ctx, c.stone, x - w / 2 - 0.8, -body - 1.6, w + 1.6, 1.6);
  poly(ctx, c.roof, x - w / 2, -body - 1.6, x + w / 2, -body - 1.6, x, -tent);
  poly(ctx, c.roofShade, x, -body - 1.6, x + w / 2, -body - 1.6, x, -tent);
  ctx.fillStyle = c.gold;
  ctx.beginPath();
  ctx.arc(x, -tent - 0.9, 0.9, 0, Math.PI * 2);
  ctx.fill();
}

function drawKremlin(ctx: Ctx, c: LandmarkColors, d: number, time: number) {
  // Wall and merlons
  box(ctx, c.brick, -104, -19, 208, 19);
  box(ctx, c.brickShade, -104, -4, 208, 4);
  ctx.fillStyle = c.brick;
  for (let x = -103.5; x <= 100; x += 6.5) {
    ctx.beginPath();
    ctx.moveTo(x, -19);
    ctx.lineTo(x, -25);
    ctx.lineTo(x + 2.1, -23.2);
    ctx.lineTo(x + 4.2, -25);
    ctx.lineTo(x + 4.2, -19);
    ctx.closePath();
    ctx.fill();
  }
  kremlinTower(ctx, c, -100, 13, 30, 41);
  kremlinTower(ctx, c, 100, 13, 30, 41);
  kremlinTower(ctx, c, -56, 11, 27, 37);
  kremlinTower(ctx, c, 56, 11, 27, 37);

  // Spasskaya tower
  box(ctx, c.brick, -13, -44, 26, 44);
  box(ctx, c.brickShade, 4, -44, 9, 44);
  ctx.fillStyle = c.gate;
  ctx.beginPath();
  ctx.moveTo(-4.5, 0);
  ctx.lineTo(-4.5, -11);
  ctx.arc(0, -11, 4.5, Math.PI, 0);
  ctx.lineTo(4.5, 0);
  ctx.closePath();
  ctx.fill();
  box(ctx, c.stone, -14.5, -46.2, 29, 2.2);
  for (const x of [-13, 13]) poly(ctx, c.stone, x - 1.6, -46.2, x + 1.6, -46.2, x, -53);
  box(ctx, c.brick, -11, -60, 22, 13.8);
  box(ctx, c.brickShade, 3.5, -60, 7.5, 13.8);
  // Clock
  ctx.fillStyle = c.gold;
  ctx.beginPath();
  ctx.arc(0, -53, 6.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c.clock;
  ctx.beginPath();
  ctx.arc(0, -53, 5.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = c.gold;
  ctx.lineWidth = 0.9;
  ctx.lineCap = 'round';
  const minute = time * 0.9;
  ctx.beginPath();
  ctx.moveTo(0, -53);
  ctx.lineTo(Math.sin(minute) * 4, -53 - Math.cos(minute) * 4);
  ctx.moveTo(0, -53);
  ctx.lineTo(Math.sin(minute / 12 + 1) * 2.6, -53 - Math.cos(minute / 12 + 1) * 2.6);
  ctx.stroke();
  for (const x of [-10, 10]) poly(ctx, c.stone, x - 1.3, -60, x + 1.3, -60, x, -66);
  // Upper tiers, the tent and the star
  box(ctx, c.brick, -8.5, -70, 17, 10);
  ctx.fillStyle = c.gate;
  for (const x of [-5.6, -1.2, 3.2]) {
    ctx.beginPath();
    ctx.moveTo(x, -61.5);
    ctx.lineTo(x, -66.3);
    ctx.arc(x + 1.2, -66.3, 1.2, Math.PI, 0);
    ctx.lineTo(x + 2.4, -61.5);
    ctx.closePath();
    ctx.fill();
  }
  box(ctx, c.stone, -7, -77, 14, 7);
  ctx.fillStyle = c.gate;
  for (const x of [-4.6, -0.8, 3]) ctx.fillRect(x, -75.5, 1.6, 4);
  poly(ctx, c.roof, -6.8, -77, 6.8, -77, 0, -95);
  poly(ctx, c.roofShade, 0, -77, 6.8, -77, 0, -95);
  ctx.strokeStyle = c.gold;
  ctx.lineWidth = 0.35;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  for (const k of [-4.5, -2.2, 2.2, 4.5]) {
    ctx.moveTo(k, -77);
    ctx.lineTo(0, -95);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = c.gold;
  ctx.beginPath();
  ctx.arc(0, -95.4, 1.1, 0, Math.PI * 2);
  ctx.fill();
  glowStar(ctx, c, 0, -99.8, 4.4, d);
}

// ---------- St Basil's: the gallery, the central tent and four striped onion domes that pop up ----------

function onion(ctx: Ctx, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x - r * 0.62, y);
  ctx.bezierCurveTo(x - r * 1.28, y - r * 0.55, x - r * 1.1, y - r * 1.4, x, y - r * 2.3);
  ctx.bezierCurveTo(x + r * 1.1, y - r * 1.4, x + r * 1.28, y - r * 0.55, x + r * 0.62, y);
  ctx.closePath();
}

function stripedDome(ctx: Ctx, c: LandmarkColors, x: number, y: number, r: number, colors: [string, string], tilt: number) {
  onion(ctx, x, y, r);
  ctx.fillStyle = colors[0];
  ctx.fill();
  ctx.save();
  onion(ctx, x, y, r);
  ctx.clip();
  ctx.translate(x, y - r);
  ctx.rotate(tilt);
  ctx.fillStyle = colors[1];
  for (let i = -6; i <= 6; i++) ctx.fillRect(i * r * 0.56, -r * 3, r * 0.26, r * 6);
  ctx.restore();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.4, y - r * 1.2, r * 0.22, r * 0.5, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = c.gold;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x, y - r * 2.3);
  ctx.lineTo(x, y - r * 2.3 - 5);
  ctx.moveTo(x - 1.6, y - r * 2.3 - 3.2);
  ctx.lineTo(x + 1.6, y - r * 2.3 - 3.2);
  ctx.stroke();
}

const BASIL_DOMES = [
  { x: -36, top: 42, w: 10, r: 8.4, tilt: -0.55 },
  { x: -18, top: 55, w: 11, r: 9.4, tilt: 0.55 },
  { x: 18, top: 51, w: 11, r: 9.1, tilt: -0.5 },
  { x: 36, top: 41, w: 10, r: 8.2, tilt: 0.6 },
];

function drawBasil(ctx: Ctx, c: LandmarkColors, d: number) {
  box(ctx, c.stone, -54, -8, 108, 8);
  box(ctx, c.brick, -50, -26, 100, 18);
  box(ctx, c.brickShade, 20, -26, 30, 18);
  ctx.fillStyle = c.stone;
  for (let x = -46; x < 46; x += 8) {
    ctx.beginPath();
    ctx.moveTo(x, -10);
    ctx.lineTo(x, -18);
    ctx.arc(x + 2.2, -18, 2.2, Math.PI, 0);
    ctx.lineTo(x + 4.4, -10);
    ctx.closePath();
    ctx.fill();
  }
  box(ctx, c.stone, -51, -27.6, 102, 1.8);

  BASIL_DOMES.forEach((dome, i) => {
    box(ctx, c.brick, dome.x - dome.w / 2, -dome.top, dome.w, dome.top - 26);
    box(ctx, c.brickShade, dome.x + dome.w * 0.1, -dome.top, dome.w * 0.4, dome.top - 26);
    box(ctx, c.stone, dome.x - dome.w / 2 - 0.8, -dome.top - 1.4, dome.w + 1.6, 1.4);
    const pop = easeOutBack(clamp01(d * 1.9 - i * 0.2));
    if (pop <= 0) return;
    ctx.save();
    ctx.translate(dome.x, -dome.top - 1.4);
    ctx.scale(pop, pop);
    stripedDome(ctx, c, 0, 0, dome.r, c.domes[i], dome.tilt);
    ctx.restore();
  });

  // Central tower with rows of white kokoshniks, the tent and a small gold cupola.
  box(ctx, c.brick, -9, -60, 18, 34);
  box(ctx, c.brickShade, 2, -60, 7, 34);
  ctx.fillStyle = c.stone;
  for (const [y, n] of [[-44, 3], [-54, 2]] as const) {
    for (let k = 0; k < n; k++) {
      const x = -9 + (18 / n) * (k + 0.5);
      ctx.beginPath();
      ctx.arc(x, y, 18 / n / 2 - 0.4, Math.PI, 0);
      ctx.fill();
    }
  }
  poly(ctx, c.basilTent, -9.5, -60, 9.5, -60, 0, -86);
  poly(ctx, c.roofShade, 0, -60, 9.5, -60, 0, -86);
  ctx.fillStyle = c.gold;
  for (let row = 0; row < 5; row++) {
    const y = -63 - row * 4.6;
    const half = 9.5 * (1 - (row * 4.6 + 3) / 26);
    for (let x = -half + 1.6; x < half - 1; x += 3.2) ctx.fillRect(x, y, 0.9, 0.9);
  }
  const cupola = easeOutBack(clamp01(d * 1.9 - 0.9));
  if (cupola > 0) {
    ctx.save();
    ctx.translate(0, -86);
    ctx.scale(cupola, cupola);
    onion(ctx, 0, 0, 3.4);
    ctx.fillStyle = c.gold;
    ctx.fill();
    ctx.strokeStyle = c.gold;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -7.8);
    ctx.lineTo(0, -12);
    ctx.moveTo(-1.5, -10.4);
    ctx.lineTo(1.5, -10.4);
    ctx.stroke();
    ctx.restore();
  }
}

// ---------- Moscow State University: the stepped tower, wings and the spire with its star ----------

function drawMsu(ctx: Ctx, c: LandmarkColors, d: number) {
  const block = (x0: number, x1: number, y0: number, y1: number, cols: number, rows: number, seed: number) => {
    box(ctx, c.msu, x0, y1, x1 - x0, y0 - y1);
    box(ctx, c.msuShade, x0 + (x1 - x0) * 0.62, y1, (x1 - x0) * 0.38, y0 - y1);
    if (cols) windows(ctx, c, x0 + 1, y1 + 1, x1 - 1, y0 - 1, cols, rows, d, seed);
    box(ctx, c.msuShade, x0 - 0.6, y1 - 1, x1 - x0 + 1.2, 1);
  };
  // Wings and their small towers
  block(-78, -32, 0, -18, 10, 4, 1);
  block(32, 78, 0, -18, 10, 4, 2);
  for (const x of [-60, 60]) {
    block(x - 6, x + 6, -18, -34, 3, 3, x);
    block(x - 4, x + 4, -34, -41, 0, 0, 0);
    poly(ctx, c.gold, x - 1.6, -41, x + 1.6, -41, x, -52);
  }
  // The main tower
  block(-32, 32, 0, -30, 12, 6, 3);
  block(-23, 23, -30, -50, 9, 5, 4);
  block(-15, 15, -50, -63, 6, 3, 5);
  block(-10, 10, -63, -71, 0, 0, 0);
  ctx.fillStyle = c.msuShade;
  for (let x = -8.5; x <= 8.5; x += 2.4) ctx.fillRect(x, -70, 0.6, 6);
  block(-6, 6, -71, -77, 0, 0, 0);
  poly(ctx, c.gold, -3, -77, 3, -77, 0, -94);
  poly(ctx, c.goldShade, 0, -77, 3, -77, 0, -94);
  ctx.strokeStyle = c.gold;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.arc(0, -98, 3.6, 0, Math.PI * 2);
  ctx.stroke();
  glowStar(ctx, c, 0, -98, 2.9, d * 0.8);
}

// ---------- Moscow City: a cluster of glass towers; windows switch on after it rises ----------

const CITY_TOWERS = [
  { x: -58, w: 12, h: 44, glass: 0 },
  { x: -44, w: 11, h: 56, glass: 1 },
  { x: -29, w: 13, h: 76, glass: 4, slope: true },
  { x: -10, w: 14, h: 70, glass: 0 },
  { x: 8, w: 16, h: 92, glass: 1, spire: true },
  { x: 28, w: 14, h: 80, glass: 2, steps: true },
  { x: 47, w: 13, h: 62, glass: 3, twist: true },
  { x: 62, w: 12, h: 40, glass: 0 },
];

function drawCity(ctx: Ctx, c: LandmarkColors, d: number, time: number) {
  CITY_TOWERS.forEach((t, n) => {
    const [light, deep] = c.glass[t.glass];
    const x0 = t.x - t.w / 2;
    const grad = ctx.createLinearGradient(x0, 0, x0 + t.w, 0);
    grad.addColorStop(0, light);
    grad.addColorStop(1, deep);
    ctx.fillStyle = grad;
    ctx.beginPath();
    if (t.slope) {
      ctx.moveTo(x0, 0);
      ctx.lineTo(x0, -t.h + 6);
      ctx.lineTo(x0 + t.w, -t.h);
      ctx.lineTo(x0 + t.w, 0);
    } else if (t.steps) {
      ctx.moveTo(x0, 0);
      ctx.lineTo(x0, -t.h + 8);
      ctx.lineTo(x0 + 2.5, -t.h + 8);
      ctx.lineTo(x0 + 2.5, -t.h + 4);
      ctx.lineTo(x0 + 5, -t.h + 4);
      ctx.lineTo(x0 + 5, -t.h);
      ctx.lineTo(x0 + t.w - 5, -t.h);
      ctx.lineTo(x0 + t.w - 5, -t.h + 4);
      ctx.lineTo(x0 + t.w, -t.h + 4);
      ctx.lineTo(x0 + t.w, 0);
    } else {
      ctx.rect(x0, -t.h, t.w, t.h);
    }
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.clip();
    if (t.twist) {
      ctx.strokeStyle = c.glassLine;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      for (let y = 0; y > -t.h - 20; y -= 5) {
        ctx.moveTo(x0 - 4, y);
        ctx.lineTo(x0 + t.w + 4, y - 9);
      }
      ctx.stroke();
    } else {
      ctx.fillStyle = c.glassLine;
      for (let y = -3; y > -t.h; y -= 3.2) ctx.fillRect(x0, y, t.w, 0.45);
    }
    // Lit windows: a few per floor, more as the details play.
    ctx.fillStyle = c.windowLit;
    for (let y = -4; y > -t.h + 2; y -= 3.2) {
      for (let x = x0 + 1; x < x0 + t.w - 1.5; x += 2.2) {
        if (hash(x * 3 + n, y) < d * 0.38) ctx.fillRect(x, y, 1.3, 1.5);
      }
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.fillRect(x0 + 1, -t.h, t.w * 0.18, t.h);
    ctx.restore();

    if (t.spire) {
      ctx.strokeStyle = c.concreteShade;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(t.x, -t.h);
      ctx.lineTo(t.x, -t.h - 9);
      ctx.stroke();
      const blink = Math.sin(time * 5) > 0.3 ? 1 : 0.25;
      ctx.fillStyle = `rgba(255, 70, 70, ${blink})`;
      ctx.beginPath();
      ctx.arc(t.x, -t.h - 9.5, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// ---------- Ostankino tower: the flared legs, the shaft, the observation deck and a blinking antenna ----------

function drawOstankino(ctx: Ctx, c: LandmarkColors, d: number, time: number) {
  ctx.fillStyle = c.concrete;
  ctx.beginPath();
  ctx.moveTo(-17, 0);
  ctx.quadraticCurveTo(-6, -5, -4.2, -30);
  ctx.lineTo(4.2, -30);
  ctx.quadraticCurveTo(6, -5, 17, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = c.concreteShade;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -30);
  ctx.lineTo(4.2, -30);
  ctx.quadraticCurveTo(6, -5, 17, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = c.deck;
  for (const [x, h] of [[-9, 6], [-2, 8], [5, 7]] as const) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, -h + 2);
    ctx.arc(x + 2, -h + 2, 2, Math.PI, 0);
    ctx.lineTo(x + 4, 0);
    ctx.closePath();
    ctx.fill();
  }
  poly(ctx, c.concrete, -4.2, -30, 4.2, -30, 2.6, -62, -2.6, -62);
  poly(ctx, c.concreteShade, 0, -30, 4.2, -30, 2.6, -62, 0, -62);
  box(ctx, c.deck, -7.5, -66, 15, 4);
  ctx.fillStyle = c.windowLit;
  for (let x = -6.5; x < 6.5; x += 1.6) if (hash(x, 7) < 0.3 + d * 0.7) ctx.fillRect(x, -64.8, 0.9, 1.5);
  box(ctx, c.concrete, -5.5, -68, 11, 2);
  poly(ctx, c.concrete, -2.2, -68, 2.2, -68, 1.5, -80, -1.5, -80);
  for (let k = 0; k < 5; k++) {
    const y0 = -80 - k * 4;
    const w = 1.5 - k * 0.14;
    box(ctx, k % 2 ? c.antennaWhite : c.antennaRed, -w / 2, y0 - 4, w, 4);
  }
  const blink = 0.35 + 0.65 * Math.max(0, Math.sin(time * 4));
  ctx.save();
  ctx.shadowColor = 'rgba(255, 60, 60, 0.9)';
  ctx.shadowBlur = 10 * blink;
  ctx.fillStyle = `rgba(255, 70, 70, ${blink})`;
  ctx.beginPath();
  ctx.arc(0, -100.6, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---------- Shukhov tower: six stacked hyperboloids of straight steel lines ----------

const SHUKHOV_WIDTHS = [40, 32, 25, 19, 14, 10.5, 8];
const SHUKHOV_LEVELS = [0, -17, -33, -48, -62, -75, -86];

function drawShukhov(ctx: Ctx, c: LandmarkColors) {
  ctx.strokeStyle = c.lattice;
  ctx.lineCap = 'round';
  for (let s = 0; s < 6; s++) {
    const r0 = SHUKHOV_WIDTHS[s] / 2;
    const r1 = SHUKHOV_WIDTHS[s + 1] / 2;
    const yb = SHUKHOV_LEVELS[s];
    const yt = SHUKHOV_LEVELS[s + 1];
    ctx.lineWidth = 0.55;
    ctx.beginPath();
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const xb = r0 * Math.cos(a);
      ctx.moveTo(xb, yb);
      ctx.lineTo(r1 * Math.cos(a + 0.9), yt);
      ctx.moveTo(xb, yb);
      ctx.lineTo(r1 * Math.cos(a - 0.9), yt);
    }
    ctx.stroke();
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-r1, yt);
    ctx.lineTo(r1, yt);
    ctx.stroke();
  }
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-20, 0);
  ctx.lineTo(20, 0);
  ctx.moveTo(0, -86);
  ctx.lineTo(0, -97);
  ctx.stroke();
}

export interface Landmark {
  id: LandmarkId;
  name: string;
  top: number; // units above the base, including the star or antenna
  half: number; // half width in units
  draw: (ctx: Ctx, c: LandmarkColors, d: number, time: number) => void;
}

export const LANDMARKS: Record<LandmarkId, Landmark> = {
  kremlin: { id: 'kremlin', name: 'Кремль', top: 105, half: 108, draw: drawKremlin },
  basil: { id: 'basil', name: 'Собор Василия Блаженного', top: 99, half: 56, draw: (ctx, c, d) => drawBasil(ctx, c, d) },
  msu: { id: 'msu', name: 'МГУ', top: 102, half: 80, draw: (ctx, c, d) => drawMsu(ctx, c, d) },
  city: { id: 'city', name: 'Москва-Сити', top: 103, half: 70, draw: drawCity },
  ostankino: { id: 'ostankino', name: 'Останкинская башня', top: 102, half: 18, draw: drawOstankino },
  shukhov: { id: 'shukhov', name: 'Шуховская башня', top: 98, half: 21, draw: (ctx, c) => drawShukhov(ctx, c) },
};
