import { BUDGET, NB, clamp01, el, hexRgb, mulberry, outBack, outCubic, rgba, type MountScene } from '../kit';

// The glass knows today's date: how much of the year's budget has run through, if it were spent evenly.
export const YEAR = (() => {
  const now = new Date();
  const start = new Date(2026, 0, 1);
  const end = new Date(2027, 0, 1);
  const f = clamp01((now.getTime() - start.getTime()) / (end.getTime() - start.getTime()));
  const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const tr = (v: number) => v.toFixed(2).replace('.', ',');
  return {
    f,
    date: `${now.getDate()}${NB}${MONTHS[now.getMonth()]}`,
    pct: Math.round(f * 100),
    spent: tr((BUDGET.expenses / 1000) * f),
  };
})();

// Half-width of a bulb at s (0 at the cap, 1 at the neck), as a share of the widest point.
const prof = (s: number) => {
  const body = Math.pow(Math.max(0, 1 - Math.pow(s, 2.1)), 0.62);
  const shoulder = Math.sin((Math.min(1, s / 0.1) * Math.PI) / 2);
  return body * (0.78 + 0.22 * shoulder);
};

export const mountHourglass: MountScene = (ctx) => {
  const { stage } = ctx;
  const DARK = ctx.dark;
  const REDUCE = ctx.reduce;
  const cv = el('canvas', 'st-cv');
  stage.append(cv);
  cv.setAttribute('role', 'img');
  cv.setAttribute('aria-label', `Песочные часы года: в нижней колбе ${YEAR.pct} процентов песка, наверху — остальное.`);
  const g = cv.getContext('2d');
  const SAND_TOP = hexRgb(DARK ? '#F2C06A' : '#EDB65B');
  const SAND_BOT = hexRgb(DARK ? '#C98A2E' : '#C98B2E');
  const INK = hexRgb(DARK ? '#F2F4F8' : '#1F1A14');
  let geo: { cx: number; cy: number; Hg: number; maxHW: number; neck: number; cap: number; bulb: number } | null = null;
  let k = 1;
  let grain: HTMLCanvasElement | null = null;
  let table: { N: number; area: Float64Array; hw: (s: number) => number } | null = null;

  function resize() {
    const fit = ctx.fitCanvas(cv);
    k = fit.k;
    const r = fit.r;
    const Hg = Math.min(r.height * 0.9, r.width * 1.25, 560);
    const maxHW = Math.min(Hg * 0.26, r.width / 2 - 84);
    const neck = Hg * 0.012;
    const cap = Hg * 0.035;
    const cx = r.width / 2;
    const cy = r.height / 2;
    const bulb = Hg / 2 - cap;
    geo = { cx, cy, Hg, maxHW, neck, cap, bulb };
    // Area from level s down to the neck in the upper bulb (the lower bulb is its mirror).
    const N = 400;
    const hw = (s: number) => neck + (maxHW - neck) * prof(s);
    const area = new Float64Array(N + 1);
    for (let i = N - 1; i >= 0; i--) area[i] = area[i + 1] + 2 * hw((i + 0.5) / N) * (bulb / N);
    table = { N, area, hw };
    // A fixed grain texture: it never moves, so the sand never shimmers.
    grain = el('canvas');
    grain.width = cv.width;
    grain.height = cv.height;
    const gg = grain.getContext('2d');
    const rnd = mulberry(3);
    for (let i = 0; i < (cv.width * cv.height) / 90; i++) {
      gg.fillStyle = rnd() < 0.5 ? 'rgba(120,70,10,0.28)' : 'rgba(255,240,200,0.3)';
      gg.fillRect(Math.floor(rnd() * cv.width), Math.floor(rnd() * cv.height), 1, 1);
    }
  }
  // Level s in the upper bulb that holds `a` of sand.
  const levelFor = (a: number) => {
    const { N, area } = table;
    let i = 0;
    while (i < N && area[i] > a) i++;
    return i / N;
  };
  function glassPath(inset = 0) {
    const { cx, cy, bulb, cap, Hg } = geo;
    const top = cy - Hg / 2 + cap;
    const bot = cy + Hg / 2 - cap;
    const steps = 90;
    g.beginPath();
    for (let i = 0; i <= steps; i++) {
      const s = i / steps;
      const y = top + s * bulb;
      const x = cx - Math.max(0, table.hw(s) - inset);
      if (i) g.lineTo(x * k, y * k);
      else g.moveTo(x * k, y * k);
    }
    for (let i = steps; i >= 0; i--) {
      const s = i / steps;
      g.lineTo((cx - Math.max(0, table.hw(s) - inset)) * k, (bot - s * bulb) * k);
    }
    for (let i = 0; i <= steps; i++) {
      const s = i / steps;
      g.lineTo((cx + Math.max(0, table.hw(s) - inset)) * k, (bot - s * bulb) * k);
    }
    for (let i = steps; i >= 0; i--) {
      const s = i / steps;
      g.lineTo((cx + Math.max(0, table.hw(s) - inset)) * k, (top + s * bulb) * k);
    }
    g.closePath();
  }

  function frame(t: number) {
    if (!geo) return;
    const { cx, cy, Hg, maxHW, cap, bulb } = geo;
    const S = (v: number) => v * k;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cv.width, cv.height);
    const appear = REDUCE ? 1 : outCubic(clamp01((t - 0.15) / 0.7));
    const f = YEAR.f * (REDUCE ? 1 : outCubic(clamp01((t - 0.5) / 1.7)));
    // Entrance: the glass settles upright.
    const rot = (1 - (REDUCE ? 1 : outBack(clamp01((t - 0.15) / 0.9)))) * -0.1;
    g.translate(S(cx), S(cy));
    g.rotate(rot);
    g.translate(-S(cx), -S(cy));
    g.globalAlpha = appear;

    const TOTAL = table.area[Math.round(table.N * 0.24)];
    const sTop = levelFor(TOTAL * (1 - f));
    const top = cy - Hg / 2 + cap;
    const bot = cy + Hg / 2 - cap;
    const yTop = top + sTop * bulb;
    const wTop = table.hw(sTop);
    // Lower bulb: a flat fill from the bottom up to qB, plus a mound under the stream.
    const want = TOTAL * f;
    const moundH = (w: number) => Math.min(bulb * 0.14, w * 0.5) * clamp01(f * 6);
    const filled = (q: number) => table.area[0] - table.area[Math.round(q * table.N)] + 1.33 * table.hw(q) * moundH(table.hw(q));
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (filled(mid) > want) hi = mid;
      else lo = mid;
    }
    const qB = f > 0.002 ? lo : 0;
    const yB = bot - qB * bulb;
    const mh = f > 0.002 ? moundH(table.hw(qB)) : 0;

    g.save();
    glassPath(3);
    g.clip();
    const sand = g.createLinearGradient(0, S(top), 0, S(bot));
    sand.addColorStop(0, rgba(SAND_TOP, 1));
    sand.addColorStop(1, rgba(SAND_BOT, 1));
    g.fillStyle = sand;
    // Upper sand, with a dip where it drains.
    if (f < 0.999) {
      const dip = Math.min(bulb * 0.07, (cy - yTop) * 0.45);
      g.beginPath();
      g.moveTo(S(cx - wTop - 4), S(yTop));
      g.quadraticCurveTo(S(cx), S(yTop + dip * 2), S(cx + wTop + 4), S(yTop));
      g.lineTo(S(cx + maxHW), S(cy));
      g.lineTo(S(cx - maxHW), S(cy));
      g.closePath();
      g.fill();
    }
    // Lower sand.
    if (f > 0.002) {
      g.beginPath();
      g.moveTo(S(cx - maxHW - 4), S(yB));
      g.quadraticCurveTo(S(cx), S(yB - mh * 2), S(cx + maxHW + 4), S(yB));
      g.lineTo(S(cx + maxHW + 4), S(bot + 4));
      g.lineTo(S(cx - maxHW - 4), S(bot + 4));
      g.closePath();
      g.fill();
    }
    g.globalCompositeOperation = 'source-atop';
    g.drawImage(grain, 0, 0);
    g.globalCompositeOperation = 'source-over';
    // The stream: a thread of sand from the neck to the top of the mound, with grains sliding down it.
    if (f > 0.002 && f < 0.999) {
      const y1 = yB - mh;
      const sw = Math.max(1.6, Hg * 0.005);
      g.fillStyle = rgba(SAND_BOT, 0.9);
      g.fillRect(S(cx - sw / 2), S(cy), S(sw), S(y1 - cy));
      if (!REDUCE) {
        const L = y1 - cy;
        g.fillStyle = rgba(SAND_TOP, 1);
        for (let i = 0; i < 9; i++) {
          const y = cy + ((t * 120 + i * (L / 9)) % L);
          g.fillRect(S(cx - sw * 0.9), S(y), S(sw * 1.8), S(sw * 1.2));
        }
      }
    }
    g.restore();

    // Glass: a faint body, a crisp outline and two highlights.
    g.fillStyle = DARK ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.35)';
    glassPath(0);
    g.fill();
    g.strokeStyle = DARK ? 'rgba(255,255,255,0.32)' : 'rgba(31,26,20,0.28)';
    g.lineWidth = S(1.6);
    g.stroke();
    g.strokeStyle = DARK ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.95)';
    g.lineWidth = S(Math.max(2, Hg * 0.009));
    g.lineCap = 'round';
    for (const dir of [-1, 1]) {
      g.beginPath();
      for (let i = 0; i <= 30; i++) {
        const s = 0.1 + (i / 30) * 0.55;
        const y = dir < 0 ? top + s * bulb : bot - s * bulb;
        const x = cx - table.hw(s) * 0.74;
        if (i) g.lineTo(S(x), S(y));
        else g.moveTo(S(x), S(y));
      }
      g.stroke();
    }
    // Caps top and bottom.
    const capW = maxHW * 2 + Hg * 0.07;
    for (const y of [cy - Hg / 2, cy + Hg / 2 - cap]) {
      const cg = g.createLinearGradient(0, S(y), 0, S(y + cap));
      cg.addColorStop(0, DARK ? '#4A4036' : '#3A3027');
      cg.addColorStop(1, DARK ? '#2A241E' : '#1E1812');
      g.fillStyle = cg;
      g.beginPath();
      g.roundRect(S(cx - capW / 2), S(y), S(capW), S(cap), S(cap * 0.45));
      g.fill();
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;

    // Labels: what is left above, what has run through below.
    const a = REDUCE ? 1 : clamp01((t - 0.9) / 0.6);
    if (a > 0) {
      const fs = Math.max(11, Math.min(16, Hg * 0.036));
      const spentNow = ((BUDGET.expenses / 1000) * f).toFixed(2).replace('.', ',');
      const leftNow = ((BUDGET.expenses / 1000) * (1 - f)).toFixed(2).replace('.', ',');
      const lx = cx - maxHW - Hg * 0.035;
      const rx = cx + maxHW + Hg * 0.035;
      const block = (x: number, y: number, align: CanvasTextAlign, title: string, value: string) => {
        g.textAlign = align;
        g.fillStyle = rgba(INK, 0.55);
        g.font = `600 ${S(fs * 0.74)}px Onest, "Segoe UI", sans-serif`;
        g.fillText(title, S(x), S(y));
        g.fillStyle = rgba(INK, 0.95);
        g.font = `700 ${S(fs * 1.25)}px Onest, "Segoe UI", sans-serif`;
        g.fillText(value, S(x), S(y + fs * 1.45));
        g.fillStyle = rgba(INK, 0.6);
        g.font = `600 ${S(fs * 0.8)}px Onest, "Segoe UI", sans-serif`;
        g.fillText(`трлн${NB}₽`, S(x), S(y + fs * 2.55));
      };
      g.globalAlpha = a;
      g.textBaseline = 'alphabetic';
      block(lx, cy - Hg * 0.24, 'right', 'ОСТАЛОСЬ', leftNow);
      block(rx, cy + Hg * 0.2, 'left', 'ПОТРАЧЕНО', `≈${NB}${spentNow}`);
      g.globalAlpha = 1;
    }
  }
  return { frame, resize };
};
