import { BUDGET, clamp01, el, outCubic, rgba, type MountScene } from '../kit';
import { ledBig, ledText, type LedGlyphs } from './ledFont';

// A stadium LED board: how much the budget spends on each resident in a year.
const AMBER = [255, 178, 52];
const HOT = [255, 222, 150];
const RESIDENTS = 13274285; // Росстат, 1 января 2025
const PER = Math.round((BUDGET.expenses * 1e9) / RESIDENTS / 1000) * 1000; // 481 000 ₽
const LINE1 = 'МОСКВА';
const LINE2 = '2026';
const MARQ = 'НА КАЖДОГО ИЗ 13 274 285 ЖИТЕЛЕЙ В ГОД  ·  ШКОЛЫ  ·  МЕТРО  ·  БОЛЬНИЦЫ  ·  ПАРКИ  ·  ДОРОГИ  ·  ';
const fmt = (v: number) => `${String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₽`;

export const mountScoreboard: MountScene = (ctx) => {
  const { stage } = ctx;
  const REDUCE = ctx.reduce;
  const cv = el('canvas', 'st-cv');
  stage.append(cv);
  cv.setAttribute('role', 'img');
  cv.setAttribute('aria-label', 'Светодиодное табло: жителей 13 274 285, на каждого 481 000 рублей в год.');
  const g = cv.getContext('2d');
  let geo: { cols: number; rows: number; pitch: number; x0: number; y0: number } | null = null;
  let k = 1;
  let dimLayer: HTMLCanvasElement | null = null;
  let glow: HTMLCanvasElement | null = null;
  let marq: LedGlyphs | null = null;
  let lastKey = '';

  function resize() {
    const fit = ctx.fitCanvas(cv);
    k = fit.k;
    const r = fit.r;
    const cols = innerWidth >= 1024 ? 104 : 88;
    const rows = 46;
    const pitch = Math.min((r.width * 0.97 - 24) / cols, (r.height * 0.86 - 24) / rows);
    const pw = cols * pitch + 24;
    const ph = rows * pitch + 24;
    geo = { cols, rows, pitch, x0: (r.width - pw) / 2 + 12, y0: (r.height - ph) / 2 + 12 };
    // The unlit grid is drawn once. Its colours can come from the page: a card on the light page makes the board
    // graphite (--led-body, --led-lamp); the start screen keeps it black.
    const css = getComputedStyle(stage);
    dimLayer = el('canvas');
    dimLayer.width = cv.width;
    dimLayer.height = cv.height;
    const d = dimLayer.getContext('2d');
    d.fillStyle = css.getPropertyValue('--led-body').trim() || '#0D0E11';
    d.beginPath();
    d.roundRect((geo.x0 - 12) * k, (geo.y0 - 12) * k, pw * k, ph * k, 14 * k);
    d.fill();
    d.strokeStyle = 'rgba(255,255,255,0.08)';
    d.lineWidth = k;
    d.stroke();
    d.fillStyle = css.getPropertyValue('--led-lamp').trim() || '#26221D';
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        d.beginPath();
        d.arc((geo.x0 + (x + 0.5) * pitch) * k, (geo.y0 + (y + 0.5) * pitch) * k, pitch * 0.34 * k, 0, Math.PI * 2);
        d.fill();
      }
    }
    glow = el('canvas');
    glow.width = cv.width;
    glow.height = cv.height;
    marq = ledText(MARQ);
    lastKey = '';
  }

  function frame(t: number) {
    if (!geo) return;
    const { cols, rows, pitch, x0, y0 } = geo;
    const on = new Uint8Array(cols * rows);
    const hot = new Uint8Array(cols * rows);
    const put = (img: LedGlyphs, cx0: number, ry: number, isHot: boolean) => {
      for (let y = 0; y < img.h; y++) {
        for (let x = 0; x < img.w; x++) {
          if (!img.bits[y * img.w + x]) continue;
          const cx = cx0 + x;
          const cy = ry + y;
          if (cx < 0 || cx >= cols || cy < 0 || cy >= rows) continue;
          on[cy * cols + cx] = 1;
          if (isHot) hot[cy * cols + cx] = 1;
        }
      }
    };
    const l1 = ledText(LINE1);
    const l2 = ledText(LINE2);
    put(l1, 3, 3, false);
    put(l2, cols - 3 - l2.w, 3, false);
    // The big number counts up to 481 000 in whole thousands.
    const cp = REDUCE ? 1 : outCubic(clamp01((t - 0.9) / 1.3));
    const bigText = fmt(Math.round((PER * cp) / 1000) * 1000);
    const big = ledBig(bigText);
    put(big, Math.round((cols - big.w) / 2), 14 + Math.round((15 - big.h) / 2), true);
    // The marquee crawls one lamp at a time along the bottom line.
    const off = REDUCE ? 0 : Math.floor(Math.max(0, t - 1.6) * 20);
    for (let y = 0; y < marq.h; y++) {
      for (let x = 0; x < cols - 6; x++) {
        const mx = (x + off) % marq.w;
        if (marq.bits[y * marq.w + mx]) on[(35 + y) * cols + 3 + x] = 1;
      }
    }
    // Boot: lamps come on in a sweep from the left.
    const sweep = REDUCE ? cols : Math.floor(clamp01((t - 0.3) / 0.6) * (cols + 8));
    const key = `${bigText}|${off}|${sweep}|${cols}`;
    if (key === lastKey) return;
    lastKey = key;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cv.width, cv.height);
    const appear = REDUCE ? 1 : outCubic(clamp01((t - 0.05) / 0.4));
    g.globalAlpha = appear;
    g.drawImage(dimLayer, 0, 0);
    const gg = glow.getContext('2d');
    gg.setTransform(1, 0, 0, 1, 0, 0);
    gg.clearRect(0, 0, glow.width, glow.height);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < Math.min(cols, sweep); x++) {
        const i = y * cols + x;
        if (!on[i]) continue;
        gg.fillStyle = rgba(hot[i] ? HOT : AMBER, 1);
        gg.beginPath();
        gg.arc((x0 + (x + 0.5) * pitch) * k, (y0 + (y + 0.5) * pitch) * k, pitch * 0.38 * k, 0, Math.PI * 2);
        gg.fill();
      }
    }
    // Lit lamps twice: blurred for the glow, then sharp on top.
    g.save();
    g.filter = `blur(${Math.max(2, pitch * 0.9 * k).toFixed(1)}px)`;
    g.globalAlpha = appear * 0.85;
    g.drawImage(glow, 0, 0);
    g.restore();
    g.globalAlpha = appear;
    g.drawImage(glow, 0, 0);
    g.globalAlpha = 1;
  }
  return { frame, resize };
};
