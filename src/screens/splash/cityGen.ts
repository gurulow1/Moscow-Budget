// A procedural Moscow for the splash: blocks laid out in districts, buildings by zone (low perimeter blocks in the
// centre, Soviet slabs further out, towers at the edge), trees in parks and yards, cars on the rings and avenues,
// and a ground texture with streets, the river and parks. All in kilometres, the Kremlin at 0,0.

import { BOULEVARD_RING, GARDEN_RING, KREMLIN, MKAD, PARKS, RADIALS, RIVER, TTK, cumulative, type Pt } from './moscow';

type RGB = [number, number, number];

export interface CityPalette {
  land: string;
  plate: string;
  road: string;
  roadEdge: string;
  roadLine: string;
  river: string;
  riverEdge: string;
  riverCore: string;
  park: string;
  parkEdge: string;
  square: string;
  kremlinGround: string;
  centreWalls: RGB[];
  centreRoofs: RGB[];
  panelWalls: RGB[];
  panelRoofs: RGB[];
  towerWalls: RGB[];
  glass: RGB;
  trees: RGB[];
  cars: RGB[];
}

const h = (v: string): RGB => [parseInt(v.slice(1, 3), 16) / 255, parseInt(v.slice(3, 5), 16) / 255, parseInt(v.slice(5, 7), 16) / 255];

export const CITY_LIGHT: CityPalette = {
  land: '#D6DDE7',
  plate: '#E4E9F0',
  road: '#FFFFFF',
  roadEdge: '#BFC9D7',
  roadLine: '#E3B3B8',
  river: '#97C3F2',
  riverEdge: '#7FAEE3',
  riverCore: '#B7D6F7',
  park: '#C6E8D1',
  parkEdge: '#A9D9B9',
  square: '#E6D6D2',
  kremlinGround: '#E9DCD4',
  centreWalls: ['#F2E4C4', '#EBCFA8', '#F1D8D2', '#E8E0D2', '#FFF4DF', '#E9D9B8'].map(h),
  centreRoofs: ['#8D9199', '#A26150', '#6E8F7B', '#9AA2AE', '#B8876B'].map(h),
  panelWalls: ['#F6F2E8', '#E6EDF7', '#F7E6D6', '#E3EFE7', '#FFFFFF', '#ECE6F3', '#F1EDE3'].map(h),
  panelRoofs: ['#8C95A4', '#9AA3B0', '#7D889A', '#A1917E'].map(h),
  towerWalls: ['#F8F9FB', '#DAE5F3', '#F4E8DA', '#E1ECE4', '#D3DDEB'].map(h),
  glass: h('#B4CCEE'),
  trees: ['#58B585', '#46A876', '#6CC394', '#3E9A6B'].map(h),
  cars: ['#D6263A', '#3D7BFD', '#F29A38', '#FFFFFF', '#1C2436', '#16B38A', '#FFFFFF'].map(h),
};

export const CITY_DARK: CityPalette = {
  land: '#0C1119',
  plate: '#121925',
  road: '#5A4A2C',
  roadEdge: '#1E2533',
  roadLine: '#A88444',
  river: '#12335C',
  riverEdge: '#0C2442',
  riverCore: '#1E4A80',
  park: '#10271C',
  parkEdge: '#0D2017',
  square: '#231C1C',
  kremlinGround: '#2A1F1D',
  centreWalls: ['#3A3530', '#3D342B', '#3A302F', '#34322F', '#403A31'].map(h),
  centreRoofs: ['#23262D', '#3A2620', '#1E2A24', '#262B33'].map(h),
  panelWalls: ['#262C38', '#232937', '#2A303C', '#252B36'].map(h),
  panelRoofs: ['#1C212B', '#1A1F29'].map(h),
  towerWalls: ['#242B39', '#202736', '#283040'].map(h),
  glass: h('#1D3358'),
  trees: ['#1B5A3C', '#17503A', '#1F6446', '#144630'].map(h),
  cars: ['#FFD27A', '#FFE7B0', '#FF5A5A', '#FFD27A', '#FF5A5A'].map(h),
};

export interface Road {
  pts: Pt[];
  cum: number[];
  total: number;
  width: number;
}

export interface City {
  buildings: Float32Array; // 16 floats each: x y w d | h baseZ angle appear | roof rgb kind | wall rgb seed
  buildingCount: number;
  trees: Float32Array; // 8 floats each: x y r h | rgb appear
  treeCount: number;
  roads: Road[];
  blocks: { x: number; y: number; s: number; a: number }[];
}

function prng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function inside(p: Pt, ring: Pt[]) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

// A coarse grid of line segments, so "is this point near a road or the river" stays fast for thousands of blocks.
class SegmentIndex {
  private cells = new Map<number, number[]>();
  private segs: number[] = [];
  private readonly size = 0.6;
  add(pts: Pt[], half: number) {
    for (let i = 1; i < pts.length; i++) {
      const id = this.segs.length / 5;
      const [ax, ay] = pts[i - 1];
      const [bx, by] = pts[i];
      this.segs.push(ax, ay, bx, by, half);
      const x0 = Math.floor((Math.min(ax, bx) - half) / this.size);
      const x1 = Math.floor((Math.max(ax, bx) + half) / this.size);
      const y0 = Math.floor((Math.min(ay, by) - half) / this.size);
      const y1 = Math.floor((Math.max(ay, by) + half) / this.size);
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
        const key = (x + 500) * 1000 + (y + 500);
        const list = this.cells.get(key);
        if (list) list.push(id);
        else this.cells.set(key, [id]);
      }
    }
  }
  near(x: number, y: number, pad: number) {
    const cx = Math.floor(x / this.size);
    const cy = Math.floor(y / this.size);
    for (let gx = cx - 1; gx <= cx + 1; gx++) for (let gy = cy - 1; gy <= cy + 1; gy++) {
      const list = this.cells.get((gx + 500) * 1000 + (gy + 500));
      if (!list) continue;
      for (const id of list) {
        const o = id * 5;
        const ax = this.segs[o];
        const ay = this.segs[o + 1];
        const dx = this.segs[o + 2] - ax;
        const dy = this.segs[o + 3] - ay;
        const len = dx * dx + dy * dy || 1;
        const u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len));
        const ex = ax + dx * u - x;
        const ey = ay + dy * u - y;
        const lim = this.segs[o + 4] + pad;
        if (ex * ex + ey * ey < lim * lim) return true;
      }
    }
    return false;
  }
}

// Road widths in km (generous, so they read from the air).
export const ROAD_WIDTH = { mkad: 0.16, ttk: 0.12, garden: 0.13, boulevard: 0.1, radial: 0.085 };
export const RIVER_HALF = 0.13;
const CITY_RADIUS = 16;

// Places kept free of ordinary buildings: the Kremlin with Red Square, and the spots where the landmarks stand.
export const RESERVED: { c: Pt; r: number }[] = [
  { c: [-6, -5.6], r: 0.45 },
  { c: [-5.1, 0.8], r: 0.45 },
  { c: [-0.6, 7.9], r: 0.35 },
  { c: [-0.5, -3.7], r: 0.3 },
  { c: [0.45, -0.1], r: 0.22 },
];
const RED_SQUARE: Pt[] = [[0.28, 0.42], [0.55, 0.3], [0.52, -0.2], [0.33, -0.28]];

export function generateCity(pal: CityPalette): City {
  const rand = prng(1147);
  const roads = new SegmentIndex();
  roads.add(MKAD, ROAD_WIDTH.mkad / 2);
  roads.add(TTK, ROAD_WIDTH.ttk / 2);
  roads.add(GARDEN_RING, ROAD_WIDTH.garden / 2);
  roads.add(BOULEVARD_RING, ROAD_WIDTH.boulevard / 2 + 0.04);
  RADIALS.forEach((line) => roads.add(line, ROAD_WIDTH.radial / 2));
  const river = new SegmentIndex();
  river.add(RIVER, RIVER_HALF + 0.05);

  const inPark = (x: number, y: number, pad: number) =>
    PARKS.some(({ c, rx, ry }) => ((x - c[0]) / (rx + pad)) ** 2 + ((y - c[1]) / (ry + pad)) ** 2 < 1);
  const reserved = (x: number, y: number, pad: number) =>
    inside([x, y], KREMLIN) || inside([x, y], RED_SQUARE) || RESERVED.some(({ c, r }) => Math.hypot(x - c[0], y - c[1]) < r + pad);

  // Districts: each seed owns the blocks closest to it and lays them out on its own grid and angle.
  const seeds: { x: number; y: number; a: number; s: number }[] = [];
  const cellFor = (r: number) => (r < 2.4 ? 0.26 : r < 6.5 ? 0.38 : 0.48);
  for (let ring = 0; ring < 8; ring++) {
    const r = ring === 0 ? 0 : ring * 2.3;
    const count = ring === 0 ? 1 : Math.round(ring * 6.5);
    for (let k = 0; k < count; k++) {
      const a = (k / count) * Math.PI * 2 + rand() * 0.5;
      const rr = r + (rand() - 0.5) * 1.2;
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      // Near the centre streets follow the radial pattern; further out the grids turn freely.
      const angle = rr < 6 ? Math.atan2(y, x) + (rand() - 0.5) * 0.3 : rand() * Math.PI;
      seeds.push({ x, y, a: angle, s: cellFor(Math.hypot(x, y)) * (0.9 + rand() * 0.25) });
    }
  }
  const nearestSeed = (x: number, y: number) => {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < seeds.length; i++) {
      const d = (seeds[i].x - x) ** 2 + (seeds[i].y - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  };

  const out: number[] = [];
  const trees: number[] = [];
  const blocks: City['blocks'] = [];
  const appearAt = (x: number, y: number) => 0.2 + (Math.hypot(x, y) / CITY_RADIUS) * 2.3 + rand() * 0.25;
  const pick = <T,>(list: T[]) => list[(rand() * list.length) | 0];

  const addBuilding = (x: number, y: number, w: number, d: number, height: number, angle: number, roof: RGB, wall: RGB, kind = 0, baseZ = 0) => {
    out.push(x, y, w, d, height, baseZ, angle, appearAt(x, y), roof[0], roof[1], roof[2], kind, wall[0], wall[1], wall[2], rand());
  };
  const addTree = (x: number, y: number, scale = 1) => {
    const c = pick(pal.trees);
    trees.push(x, y, (0.028 + rand() * 0.02) * scale, (0.05 + rand() * 0.035) * scale, c[0], c[1], c[2], appearAt(x, y) + 0.1);
  };

  seeds.forEach((seed, index) => {
    const { s, a } = seed;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const reach = 3.6;
    const n = Math.ceil(reach / s);
    for (let i = -n; i <= n; i++) {
      for (let j = -n; j <= n; j++) {
        const lx = i * s;
        const ly = j * s;
        const x = seed.x + lx * ca - ly * sa;
        const y = seed.y + lx * sa + ly * ca;
        const r = Math.hypot(x, y);
        if (r > CITY_RADIUS || nearestSeed(x, y) !== index) continue;
        if (!inside([x, y], MKAD)) continue;
        if (river.near(x, y, s * 0.45) || roads.near(x, y, s * 0.42) || inPark(x, y, s * 0.2) || reserved(x, y, s * 0.3)) continue;
        blocks.push({ x, y, s, a });
        const L = s * 0.8;
        const local = (u: number, v: number): Pt => [x + u * ca - v * sa, y + u * sa + v * ca];
        const roll = rand();

        if (roll < 0.06) {
          // A small square with trees.
          for (let k = 0; k < 6; k++) {
            const [tx, ty] = local((rand() - 0.5) * L * 0.8, (rand() - 0.5) * L * 0.8);
            addTree(tx, ty);
          }
          continue;
        }
        if (r < 2.4) {
          // Old centre: buildings around a courtyard, low and warm-coloured.
          const depth = L * 0.24;
          for (let side = 0; side < 4; side++) {
            const parts = 1 + ((rand() * 3) | 0);
            const along = side % 2 === 0;
            for (let p = 0; p < parts; p++) {
              const len = L / parts - 0.008;
              const offset = -L / 2 + (L / parts) * (p + 0.5);
              const [bx, by] = along
                ? local(offset, (side === 0 ? -1 : 1) * (L / 2 - depth / 2))
                : local((side === 1 ? -1 : 1) * (L / 2 - depth / 2), offset);
              const w = along ? len : depth;
              const dd = along ? depth : len;
              addBuilding(bx, by, w, dd, 0.028 + rand() * 0.03, a, pick(pal.centreRoofs), pick(pal.centreWalls));
            }
          }
          if (rand() < 0.5) {
            const [tx, ty] = local((rand() - 0.5) * L * 0.3, (rand() - 0.5) * L * 0.3);
            addTree(tx, ty, 0.8);
          }
        } else if (r < 7 && roll < 0.7) {
          // Soviet microdistrict: parallel slabs, sometimes a tower.
          const slabs = 2 + ((rand() * 2) | 0);
          const turn = rand() < 0.5 ? 0 : Math.PI / 2;
          const cw = Math.cos(turn);
          const sw = Math.sin(turn);
          for (let k = 0; k < slabs; k++) {
            const v = -L / 2 + (L / slabs) * (k + 0.5);
            const [bx, by] = local(-v * sw, v * cw);
            addBuilding(bx, by, L * 0.82, L * 0.13, 0.048 + rand() * 0.035, a + turn, pick(pal.panelRoofs), pick(pal.panelWalls));
          }
          if (rand() < 0.35) {
            const [bx, by] = local(L * 0.32, L * 0.32);
            addBuilding(bx, by, L * 0.2, L * 0.2, 0.09 + rand() * 0.05, a, pick(pal.panelRoofs), pick(pal.panelWalls));
          }
          for (let k = 0; k < 3; k++) {
            const [tx, ty] = local((rand() - 0.5) * L, (rand() - 0.5) * L * 0.3);
            addTree(tx, ty);
          }
        } else {
          // Outskirts: towers, one of them glass now and then.
          const count = 2 + ((rand() * 3) | 0);
          for (let k = 0; k < count; k++) {
            const u = (k % 2 ? 0.25 : -0.25) * L + (rand() - 0.5) * L * 0.1;
            const v = (k < 2 ? -0.25 : 0.25) * L + (rand() - 0.5) * L * 0.1;
            const [bx, by] = local(u, v);
            const glass = rand() < 0.08;
            const size = L * (0.2 + rand() * 0.08);
            addBuilding(bx, by, size, size, 0.08 + rand() * 0.08 + (glass ? 0.07 : 0), a, pick(pal.panelRoofs), glass ? pal.glass : pick(pal.towerWalls), glass ? 1 : 0);
          }
          for (let k = 0; k < 3; k++) {
            const [tx, ty] = local((rand() - 0.5) * L * 0.9, (rand() - 0.5) * L * 0.9);
            addTree(tx, ty);
          }
        }
      }
    }
  });

  // Parks: dense trees.
  for (const { c, rx, ry } of PARKS) {
    const count = Math.round(Math.PI * rx * ry * 70);
    for (let k = 0; k < count; k++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * 0.92;
      const x = c[0] + Math.cos(a) * rx * d;
      const y = c[1] + Math.sin(a) * ry * d;
      if (Math.hypot(x, y) > CITY_RADIUS + 3 || river.near(x, y, 0.02)) continue;
      addTree(x, y, 1.15);
    }
  }
  // The Boulevard Ring is a line of trees.
  const bcum = cumulative(BOULEVARD_RING);
  for (let d = 0; d < bcum[bcum.length - 1]; d += 0.045) {
    let i = 1;
    while (i < bcum.length - 1 && bcum[i] < d) i++;
    const [ax, ay] = BOULEVARD_RING[i - 1];
    const [bx, by] = BOULEVARD_RING[i];
    const u = (d - bcum[i - 1]) / (bcum[i] - bcum[i - 1] || 1);
    const x = ax + (bx - ax) * u;
    const y = ay + (by - ay) * u;
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const nx = -(by - ay) / len;
    const ny = (bx - ax) / len;
    addTree(x + nx * 0.02, y + ny * 0.02, 0.8);
  }

  const road = (pts: Pt[], width: number): Road => {
    const cum = cumulative(pts);
    return { pts, cum, total: cum[cum.length - 1], width };
  };
  return {
    buildings: new Float32Array(out),
    buildingCount: out.length / 16,
    trees: new Float32Array(trees),
    treeCount: trees.length / 8,
    roads: [
      road(TTK, ROAD_WIDTH.ttk),
      road(GARDEN_RING, ROAD_WIDTH.garden),
      road(BOULEVARD_RING, ROAD_WIDTH.boulevard),
      road(MKAD, ROAD_WIDTH.mkad),
      ...RADIALS.map((line) => road(line, ROAD_WIDTH.radial)),
    ],
    blocks,
  };
}

// The ground texture covers ±TEX_HALF km around the Kremlin.
export const TEX_HALF = 17;

export function drawGround(ctx: CanvasRenderingContext2D, size: number, pal: CityPalette, city: City) {
  const k = size / (TEX_HALF * 2);
  const X = (x: number) => (x + TEX_HALF) * k;
  const Y = (y: number) => (TEX_HALF - y) * k;
  const path = (pts: Pt[], close = false) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
    if (close) ctx.closePath();
  };

  ctx.fillStyle = pal.land;
  ctx.fillRect(0, 0, size, size);

  // Block plates: the streets are the gaps between them.
  ctx.fillStyle = pal.plate;
  for (const b of city.blocks) {
    const L = b.s * 0.86;
    ctx.save();
    ctx.translate(X(b.x), Y(b.y));
    ctx.rotate(-b.a);
    ctx.fillRect((-L / 2) * k, (-L / 2) * k, L * k, L * k);
    ctx.restore();
  }

  ctx.fillStyle = pal.kremlinGround;
  path(KREMLIN, true);
  ctx.fill();
  ctx.fillStyle = pal.square;
  path(RED_SQUARE, true);
  ctx.fill();
  for (const { c, r } of RESERVED) {
    ctx.beginPath();
    ctx.arc(X(c[0]), Y(c[1]), r * k * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const { c, rx, ry } of PARKS) {
    ctx.fillStyle = pal.parkEdge;
    ctx.beginPath();
    ctx.ellipse(X(c[0]), Y(c[1]), (rx + 0.06) * k, (ry + 0.06) * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.park;
    ctx.beginPath();
    ctx.ellipse(X(c[0]), Y(c[1]), rx * k, ry * k, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // The river with its embankments.
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  path(RIVER);
  ctx.strokeStyle = pal.riverEdge;
  ctx.lineWidth = (RIVER_HALF * 2 + 0.05) * k;
  ctx.stroke();
  ctx.strokeStyle = pal.river;
  ctx.lineWidth = RIVER_HALF * 2 * k;
  ctx.stroke();
  ctx.strokeStyle = pal.riverCore;
  ctx.lineWidth = RIVER_HALF * 0.7 * k;
  ctx.stroke();

  // Big roads over everything, so they become bridges where they cross the river.
  const bigRoad = (pts: Pt[], width: number, closed: boolean) => {
    path(pts, closed);
    ctx.strokeStyle = pal.roadEdge;
    ctx.lineWidth = (width + 0.03) * k;
    ctx.stroke();
    ctx.strokeStyle = pal.road;
    ctx.lineWidth = width * k;
    ctx.stroke();
    ctx.strokeStyle = pal.roadLine;
    ctx.lineWidth = Math.max(1, 0.008 * k);
    ctx.setLineDash([0.05 * k, 0.05 * k]);
    ctx.stroke();
    ctx.setLineDash([]);
  };
  RADIALS.forEach((line) => bigRoad(line, ROAD_WIDTH.radial, false));
  bigRoad(MKAD, ROAD_WIDTH.mkad, true);
  bigRoad(TTK, ROAD_WIDTH.ttk, true);
  bigRoad(GARDEN_RING, ROAD_WIDTH.garden, true);
  // The Boulevard Ring: a green strip between two carriageways.
  path(BOULEVARD_RING);
  ctx.strokeStyle = pal.road;
  ctx.lineWidth = (ROAD_WIDTH.boulevard + 0.03) * k;
  ctx.stroke();
  ctx.strokeStyle = pal.park;
  ctx.lineWidth = ROAD_WIDTH.boulevard * 0.55 * k;
  ctx.stroke();
}
