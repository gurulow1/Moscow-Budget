import { clamp01, el, hexRgb, inOutCubic, outCubic, outExpo, rgba, type MountScene } from '../kit';

// Count five rubles; the fifth fills and floods the screen with the transport blue.
export const mountFifth: MountScene = (ctx) => {
  const { stage, bg } = ctx;
  const DARK = ctx.dark;
  const REDUCE = ctx.reduce;
  const cv = el('canvas');
  bg.append(cv);
  const c2d = cv.getContext('2d');
  const holder = el('div');
  holder.setAttribute('role', 'img');
  holder.setAttribute('aria-label', 'Пять рублей, пятый закрашен: каждый пятый рубль бюджета — на транспорт.');
  stage.append(holder);
  const LIGHT_BG = hexRgb(DARK ? '#08090D' : '#FCFCFD');
  const INK = hexRgb(DARK ? '#F2F4F8' : '#0E1524');
  const BLUE = hexRgb(DARK ? '#16328A' : '#1F56D8');
  const FILL = hexRgb(DARK ? '#3D6FEA' : '#1F56D8');
  let W = 0;
  let H = 0;
  let k = 1;
  let box = { w: 0, h: 0 };
  let geo: { d: number; xs: number[]; y: number } | null = null;

  function resize() {
    k = Math.min(window.devicePixelRatio || 1, 2);
    box = ctx.box();
    W = Math.round(box.w * k);
    H = Math.round(box.h * k);
    cv.width = W;
    cv.height = H;
    const r = ctx.rect(stage);
    const d = Math.min(r.width / 6.1, r.height / 2.4, 120);
    const gap = d * 0.22;
    const total = d * 5 + gap * 4;
    const x0 = r.left + (r.width - total) / 2 + d / 2;
    const y = r.top + r.height / 2;
    geo = { d, xs: [0, 1, 2, 3, 4].map((i) => x0 + i * (d + gap)), y };
  }

  const T = { appear: 0.08, count: 0.42, fill: 0.9, flood: 1.05, floodDur: 0.8 };
  function coin(x: number, y: number, d: number, stroke: string | null, width: number, fill: string | null, glyphColor: string, scale: number) {
    const r = (d / 2) * scale * k;
    c2d.beginPath();
    c2d.arc(x * k, y * k, r, 0, Math.PI * 2);
    if (fill) {
      c2d.fillStyle = fill;
      c2d.fill();
    }
    if (stroke) {
      c2d.lineWidth = width * k;
      c2d.strokeStyle = stroke;
      c2d.stroke();
    }
    c2d.fillStyle = glyphColor;
    c2d.font = `600 ${(d * 0.42 * scale * k).toFixed(1)}px Onest, "Segoe UI", sans-serif`;
    c2d.textAlign = 'center';
    c2d.textBaseline = 'middle';
    c2d.fillText('₽', x * k, y * k + d * 0.02 * k);
  }
  function drawCoins(t: number, blue: boolean) {
    const { d, xs, y } = geo;
    for (let i = 0; i < 5; i++) {
      const a = REDUCE ? 1 : outExpo(clamp01((t - T.appear - i * 0.07) / 0.5));
      if (a <= 0) continue;
      // The count: each coin flashes as it is counted; the fifth fills.
      const ci = REDUCE ? 0 : clamp01(1 - Math.abs(t - (T.count + i * 0.11)) / 0.14);
      const fillP = i === 4 ? (REDUCE ? 1 : outCubic(clamp01((t - T.fill) / 0.22))) : 0;
      // Later, every few seconds the count runs again, quietly.
      const loop = REDUCE ? 0 : t > 3.2 ? (t - 3.2) % 4.6 : 99;
      const ambient = clamp01(1 - Math.abs(loop - i * 0.14) / 0.2);
      const pop = i === 4 ? (REDUCE ? 1 : 1 + 0.12 * Math.sin(Math.PI * clamp01((t - T.fill) / 0.35))) + 0.05 * ambient : 1;
      const scale = (0.6 + 0.4 * a) * pop;
      c2d.globalAlpha = a;
      if (!blue) {
        const stroke = rgba(INK, 0.28 + 0.6 * ci);
        if (fillP > 0) coin(xs[i], y, d, null, 0, rgba(FILL, 1), rgba([255, 255, 255], fillP), scale);
        if (fillP < 1) coin(xs[i], y, d, stroke, 1.6 + ci, null, rgba(INK, (0.35 + 0.5 * ci) * (1 - fillP)), scale);
      } else if (i === 4) {
        coin(xs[i], y, d, null, 0, '#FFFFFF', rgba(BLUE, 1), scale);
      } else {
        coin(xs[i], y, d, rgba([255, 255, 255], 0.45 + 0.4 * ambient), 1.6, null, rgba([255, 255, 255], 0.6 + 0.3 * ambient), scale);
      }
    }
    c2d.globalAlpha = 1;
  }

  function frame(t: number) {
    if (!geo) return;
    c2d.setTransform(1, 0, 0, 1, 0, 0);
    const fp = REDUCE ? 1 : inOutCubic(clamp01((t - T.flood) / T.floodDur));
    const fx = geo.xs[4];
    const fy = geo.y;
    const far = Math.max(Math.hypot(fx, fy), Math.hypot(box.w - fx, fy), Math.hypot(fx, box.h - fy), Math.hypot(box.w - fx, box.h - fy));
    const R = geo.d / 2 + (far - geo.d / 2) * fp;
    if (fp < 1) {
      c2d.fillStyle = rgba(LIGHT_BG, 1);
      c2d.fillRect(0, 0, W, H);
      drawCoins(t, false);
    }
    // The flood: a circle from the fifth coin out to the farthest corner, the coins redrawn inside it in white.
    if (fp > 0) {
      c2d.save();
      c2d.beginPath();
      c2d.arc(fx * k, fy * k, R * k, 0, Math.PI * 2);
      c2d.clip();
      c2d.fillStyle = rgba(BLUE, 1);
      c2d.fillRect(0, 0, W, H);
      drawCoins(t, true);
      c2d.restore();
    }
  }
  return { frame, resize };
};
