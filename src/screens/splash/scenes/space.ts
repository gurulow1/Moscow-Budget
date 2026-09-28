import { NB, clamp01, el, hexRgb, inOutCubic, mix, mulberry, rgba, type MountScene } from '../kit';

// The whole budget in 5000-ruble packs, stacked: the stack grows past the edge of space (160 km).
const MARKS = [
  { h: 0.54, name: 'ОСТАНКИНСКАЯ БАШНЯ', v: `540${NB}М` },
  { h: 5.642, name: 'ЭЛЬБРУС', v: `5642${NB}М` },
  { h: 11, name: 'САМОЛЁТЫ', v: `11${NB}КМ` },
  { h: 35, name: 'МЕТЕОЗОНДЫ', v: `35${NB}КМ` },
  { h: 100, name: 'ГРАНИЦА КОСМОСА', v: `100${NB}КМ`, space: true },
];
// Altitude runs on a log scale so the first metres and the last kilometres both get screen time.
const U = (h: number) => Math.log10(1 + h / 0.05);
const Hof = (u: number) => 0.05 * (Math.pow(10, u) - 1);
const TOP = 159.6;
const UTOP = U(TOP);
const MARK_U = MARKS.map((m) => U(m.h));
const SKY = [
  [0, '#12224E', '#4467C4'],
  [2.34, '#0A1638', '#2A4796'],
  [2.85, '#060C22', '#182C6A'],
  [3.3, '#02040C', '#0B1843'],
].map(([u, a, b]) => [u as number, hexRgb(a as string), hexRgb(b as string)] as const);
const skyAt = (u: number) => {
  if (u <= SKY[0][0]) return [SKY[0][1], SKY[0][2]];
  for (let i = 1; i < SKY.length; i++) {
    if (u <= SKY[i][0]) {
      const p = (u - SKY[i - 1][0]) / (SKY[i][0] - SKY[i - 1][0]);
      return [mix(SKY[i - 1][1], SKY[i][1], p), mix(SKY[i - 1][2], SKY[i][2], p)];
    }
  }
  return [SKY[SKY.length - 1][1], SKY[SKY.length - 1][2]];
};
const fmt = (h: number) => (h < 1 ? `${Math.round(h * 1000)}${NB}м` : h < 10 ? `${h.toFixed(1).replace('.', ',')}${NB}км` : `${Math.round(h)}${NB}км`);

export const mountSpace: MountScene = (ctx) => {
  const { stage, bg } = ctx;
  const REDUCE = ctx.reduce;
  const cv = el('canvas');
  bg.append(cv);
  const g = cv.getContext('2d');
  const wrap = el('div', 'sp-wrap');
  wrap.setAttribute('aria-hidden', 'true');
  const read = el('div', 'sp-read', `0${NB}м`);
  const lab = el('div', 'sp-lab', 'высота стопки');
  wrap.append(read, lab);
  stage.append(wrap);
  stage.setAttribute('role', 'img');
  stage.setAttribute('aria-label', 'Стопка пятитысячных купюр на весь бюджет растёт выше Останкинской башни, Эльбруса, самолётов и метеозондов и уходит за границу космоса: 160 километров.');
  ctx.reveal(wrap, 0.2, { y: 8, b: 4 });
  let W = 0;
  let H = 0;
  let k = 1;
  let geo: { anchor: number; P: number; colW: number; cx: number; left: number; right: number; top: number; ucam0: number; readB: number } | null = null;
  let stars: { x: number; y: number; s: number; a: number }[] = [];

  function resize() {
    k = Math.min(window.devicePixelRatio || 1, 2);
    const box = ctx.box();
    W = Math.round(box.w * k);
    H = Math.round(box.h * k);
    cv.width = W;
    cv.height = H;
    const r = ctx.rect(stage);
    const anchor = r.top + r.height * 0.55;
    const P = Math.max(box.h * 0.34, 230);
    const colW = Math.min(r.width * 0.19, 92);
    const rf = Math.min(r.width / 4.4, r.height * 0.16, 76);
    read.style.fontSize = rf.toFixed(1) + 'px';
    geo = { anchor, P, colW, cx: r.left + r.width / 2, left: r.left, right: r.right, top: r.top, ucam0: (box.h * 0.98 - anchor) / P, readB: r.top + rf * 1.05 + 26 };
    const rnd = mulberry(11);
    stars = Array.from({ length: 180 }, () => ({ x: rnd() * box.w, y: rnd() * box.h * 0.92, s: 0.45 + rnd() * rnd() * 1.4, a: 0.3 + rnd() * 0.7 }));
  }

  let lastRead = '';
  const climb = (t: number) => (REDUCE ? 1 : inOutCubic(clamp01((t - 0.3) / 3.6)));
  function frame(t: number) {
    if (!geo) return;
    const { anchor, P, colW, cx } = geo;
    const e = climb(t);
    const uTop = UTOP * e;
    const ucam = Math.max(geo.ucam0, uTop);
    const txt = e >= 1 ? `160${NB}км` : fmt(Hof(uTop));
    if (txt !== lastRead) {
      read.textContent = txt;
      lastRead = txt;
    }
    const speed = Math.abs(Math.max(geo.ucam0, UTOP * climb(t + 1 / 60)) - ucam) * P * 60;
    const Y = (u: number) => (anchor + (ucam - u) * P) * k;
    g.setTransform(1, 0, 0, 1, 0, 0);
    const [top, bot] = skyAt(ucam);
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, rgba(top, 1));
    sky.addColorStop(1, rgba(bot, 1));
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);

    // Stars come out as the air thins. They never twinkle.
    const sa = clamp01((ucam - 2.45) / 0.85);
    if (sa > 0) {
      g.fillStyle = '#FFFFFF';
      for (const s of stars) {
        g.globalAlpha = sa * s.a;
        g.beginPath();
        g.arc(s.x * k, s.y * k, s.s * k, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
    }
    // Later a satellite crosses the sky now and then, far above the stack.
    if (!REDUCE && e >= 1) {
      const tt = t - 4.6;
      const p = tt > 0 ? (tt % 12) / 6 : 2;
      if (p < 1) {
        const sx = (-0.05 + p * 1.1) * W;
        const sy = (0.1 + p * 0.05) * H;
        const tail = g.createLinearGradient(sx - 60 * k, sy - 3 * k, sx, sy);
        tail.addColorStop(0, 'rgba(255,255,255,0)');
        tail.addColorStop(1, `rgba(255,255,255,${(0.35 * Math.sin(Math.PI * p)).toFixed(3)})`);
        g.strokeStyle = tail;
        g.lineWidth = k;
        g.beginPath();
        g.moveTo(sx - 60 * k, sy - 3 * k);
        g.lineTo(sx, sy);
        g.stroke();
        g.fillStyle = `rgba(255,255,255,${(0.9 * Math.sin(Math.PI * p)).toFixed(3)})`;
        g.beginPath();
        g.arc(sx, sy, 1.4 * k, 0, Math.PI * 2);
        g.fill();
      }
    }

    // Markers: a line across the stage and a caption for each height the stack passes.
    const gutL = (geo.left + 4) * k;
    const gutR = (geo.right - 4) * k;
    const fs = Math.max(9.5, Math.min(12, (geo.right - geo.left) / 34));
    g.font = `600 ${fs * k}px "JetBrains Mono", ui-monospace, monospace`;
    g.textBaseline = 'alphabetic';
    MARKS.forEach((m, i) => {
      const y = Y(MARK_U[i]);
      if (y < -40 * k || y > H + 40 * k) return;
      const passed = uTop >= MARK_U[i];
      // Markers live in the stage only: they fade out before they reach the headline.
      const vis = clamp01((y / k - geo.readB) / 40);
      if (vis <= 0) return;
      const a = (passed ? 0.92 : 0.5) * vis;
      const col = m.space ? [140, 186, 255] : [255, 255, 255];
      g.strokeStyle = rgba(col, m.space ? a * 0.9 : a * 0.45);
      g.lineWidth = k;
      g.setLineDash(m.space ? [] : [3 * k, 5 * k]);
      g.beginPath();
      g.moveTo(gutL, y);
      g.lineTo((cx - colW / 2 - 12) * k, y);
      g.moveTo((cx + colW / 2 + 12 + colW * 0.22) * k, y);
      g.lineTo(gutR, y);
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = rgba(col, a);
      g.textAlign = 'left';
      g.fillText(m.name, gutL, y - 7 * k);
      g.textAlign = 'right';
      g.fillText(m.v, gutR, y - 7 * k);
    });

    // The stack: a front face, a darker side and a lit top, with the edges of the packs as fine lines.
    const yT = Y(uTop);
    const y0 = Math.min(H + 20 * k, Y(0));
    if (y0 > yT + 1) {
      const x0 = (cx - colW / 2) * k;
      const w = colW * k;
      const side = colW * 0.22 * k;
      const face = g.createLinearGradient(x0, 0, x0 + w, 0);
      face.addColorStop(0, '#E98A62');
      face.addColorStop(0.55, '#D86E4A');
      face.addColorStop(1, '#C45B3C');
      g.fillStyle = face;
      g.fillRect(x0, yT, w, y0 - yT);
      g.fillStyle = '#8E3A26';
      g.beginPath();
      g.moveTo(x0 + w, yT);
      g.lineTo(x0 + w + side, yT - side * 0.55);
      g.lineTo(x0 + w + side, y0);
      g.lineTo(x0 + w, y0);
      g.closePath();
      g.fill();
      g.fillStyle = '#F6A988';
      g.beginPath();
      g.moveTo(x0, yT);
      g.lineTo(x0 + side, yT - side * 0.55);
      g.lineTo(x0 + w + side, yT - side * 0.55);
      g.lineTo(x0 + w, yT);
      g.closePath();
      g.fill();
      // Pack edges: fixed to the stack, so they slide by as it grows; at speed they blur into the face.
      const contrast = 0.22 * clamp01(1 - speed / 500);
      if (contrast > 0.005) {
        const step = 0.018;
        const iMin = Math.max(0, Math.floor((ucam - (H / k - anchor) / P) / step));
        const iMax = Math.floor(Math.min(uTop, ucam + anchor / P) / step);
        g.fillStyle = `rgba(90,30,16,${contrast.toFixed(3)})`;
        for (let i = iMin; i <= iMax; i++) {
          const y = Y(i * step);
          if (y > yT + 2 * k && y < y0) g.fillRect(x0, y, w + side, Math.max(1, 0.8 * k));
        }
      }
    }

    // Past a hundred kilometres the curve of the Earth rises into view.
    const la = clamp01((ucam - 3.02) / 0.48);
    if (la > 0) {
      const R = Math.max(W, H) * 3.2;
      const limbTop = H - H * 0.13 * la;
      const cxE = W / 2;
      const cyE = limbTop + R;
      g.save();
      g.shadowColor = `rgba(90,150,255,${(0.75 * la).toFixed(3)})`;
      g.shadowBlur = 36 * k;
      g.fillStyle = '#050A18';
      g.beginPath();
      g.arc(cxE, cyE, R, 0, Math.PI * 2);
      g.fill();
      g.restore();
      const rim = g.createLinearGradient(0, limbTop - 2 * k, 0, limbTop + 26 * k);
      rim.addColorStop(0, `rgba(120,175,255,${(0.9 * la).toFixed(3)})`);
      rim.addColorStop(0.25, `rgba(60,110,220,${(0.45 * la).toFixed(3)})`);
      rim.addColorStop(1, 'rgba(5,10,24,0)');
      g.save();
      g.beginPath();
      g.arc(cxE, cyE, R, 0, Math.PI * 2);
      g.clip();
      g.fillStyle = rim;
      g.fillRect(0, limbTop - 2 * k, W, 30 * k);
      g.restore();
    }
  }
  return { frame, resize };
};
