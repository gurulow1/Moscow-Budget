// A simplified map of Moscow for the splash, in kilometres: x to the east, y to the north, the Kremlin at 0,0.
// Shapes are drawn from memory of the real map and smoothed; they are meant to be recognisable, not surveyed.

export type Pt = [number, number];

// Catmull-Rom through the control points; closed rings wrap around.
function smooth(points: Pt[], closed: boolean, perSegment = 10): Pt[] {
  const out: Pt[] = [];
  const n = points.length;
  const get = (i: number) => (closed ? points[(i + n) % n] : points[Math.max(0, Math.min(n - 1, i))]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1);
    const p1 = get(i);
    const p2 = get(i + 1);
    const p3 = get(i + 2);
    for (let s = 0; s < perSegment; s++) {
      const t = s / perSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(closed ? out[0] : points[n - 1]);
  return out;
}

export const MKAD = smooth(
  [
    [-2.5, 17.6], [3, 16.8], [8.5, 14.2], [12.2, 9.5], [13.8, 3.5], [13.6, -3.5], [11.8, -9.8], [7.5, -15],
    [2.5, -17.9], [-3.5, -19.2], [-8.8, -16.5], [-12.8, -11.8], [-15.4, -5.5], [-15.9, 1.5], [-14, 8], [-9.5, 13.8],
  ],
  true,
  12,
);

export const TTK = smooth(
  [
    [0.6, 5.4], [3.6, 4.4], [5.3, 1.6], [5.2, -1.8], [3.8, -4.4], [0.6, -5.6], [-2.6, -5.2], [-4.9, -3.2],
    [-5.7, -0.2], [-4.6, 3.0], [-2.3, 4.9],
  ],
  true,
);

export const GARDEN_RING = smooth(
  [[0, 2.25], [1.7, 1.6], [2.45, 0.1], [1.9, -1.6], [0.3, -2.4], [-1.4, -2.0], [-2.3, -0.5], [-1.9, 1.2]],
  true,
);

// The Boulevard Ring is a horseshoe that ends at the river.
export const BOULEVARD_RING = smooth(
  [[1.25, -0.9], [1.45, 0.3], [0.9, 1.2], [-0.2, 1.45], [-1.1, 0.9], [-1.35, -0.2], [-1.0, -1.0]],
  false,
);

// The Moskva: in from the north-west, the Serebryany Bor and Luzhniki loops, past the Kremlin, the Nagatino loop, out to the south-east.
export const RIVER = smooth(
  [
    [-17.5, 6.5], [-14.5, 7.2], [-12, 5.2], [-12.8, 2.8], [-10.6, 1.4], [-11.4, -0.6], [-9, -0.9], [-7, 0.6],
    [-5.4, 1.2], [-4.3, 0.2], [-3.6, -1.6], [-4.2, -3.2], [-5.6, -3.9], [-5.2, -5.0], [-3.6, -4.4], [-2.4, -2.9],
    [-1.2, -1.4], [0.2, -0.55], [1.5, -0.8], [2.7, -2.0], [3.5, -3.9], [2.9, -6.1], [3.6, -7.9], [5.6, -8.6],
    [7.3, -7.4], [8.7, -8.6], [9.4, -11], [11.5, -13.2], [14, -14.8], [17, -16],
  ],
  false,
  8,
);

function inside(p: Pt, ring: Pt[]) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

// The outbound avenues: from the Garden Ring straight out to MKAD, by compass bearing.
const BEARINGS = [-38, -8, 18, 52, 80, 112, 140, 165, 185, 212, 238, 265, 292, 318];
export const RADIALS: Pt[][] = BEARINGS.map((deg) => {
  const a = (deg * Math.PI) / 180;
  const dir: Pt = [Math.sin(a), Math.cos(a)];
  let r = 2.4;
  while (r < 30 && inside([dir[0] * r, dir[1] * r], MKAD)) r += 0.2;
  const line: Pt[] = [];
  for (let k = 0; k <= 16; k++) {
    const d = 2.4 + ((r - 2.4) * k) / 16;
    line.push([dir[0] * d, dir[1] * d]);
  }
  return line;
});

// Big green areas as soft ellipses: centre, radii.
export const PARKS: { c: Pt; rx: number; ry: number }[] = [
  { c: [6.5, 10], rx: 3.2, ry: 2.3 }, // Лосиный Остров
  { c: [9.3, 3.2], rx: 1.8, ry: 1.4 }, // Измайлово
  { c: [3.2, 5.8], rx: 1.2, ry: 0.9 }, // Сокольники
  { c: [-4.2, -12.5], rx: 1.5, ry: 3 }, // Битцевский лес
  { c: [10.6, -5.6], rx: 1.4, ry: 1.1 }, // Кузьминки
  { c: [-11.3, 2.2], rx: 1.3, ry: 1 }, // Серебряный Бор
  { c: [-2.8, 8.6], rx: 1.2, ry: 1 }, // Тимирязевский лес
  { c: [5.2, -8.4], rx: 1, ry: 0.8 }, // Коломенское
  { c: [-7.4, -4.9], rx: 1.2, ry: 0.8 }, // Воробьёвы горы
  { c: [-2.1, -2.6], rx: 0.8, ry: 0.5 }, // Парк Горького
];

// The Kremlin's triangle: the river side, Alexander Garden and Red Square.
export const KREMLIN: Pt[] = [[-0.45, -0.3], [0.35, -0.3], [0.12, 0.45]];

export const cumulative = (line: Pt[]) => {
  const out = [0];
  for (let i = 1; i < line.length; i++) out.push(out[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]));
  return out;
};
