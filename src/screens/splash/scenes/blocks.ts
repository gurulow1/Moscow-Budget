import { NB, clamp01, el, hexRgb, mix, outCubic, rgba, sectorRgb, type MountScene } from '../kit';

// Spending falls into the well of income and does not fit: what sticks out above the rim is the deficit.
// 43 pieces from a drop-valid solver: [shape, cells…], cell = row × 10 + column, row 0 at the bottom.
const PIECES: [string, ...number[]][] = [["J",0,1,2,10],["Z",3,4,12,13],["L",5,6,7,17],["I",8,18,28,38],["I",9,19,29,39],["T",11,21,22,31],["S",14,23,24,33],["O",15,16,25,26],["J",20,30,40,41],["S",27,36,37,46],["T",32,42,43,52],["L",34,44,53,54],["I",35,45,55,65],["O",47,48,57,58],["L",49,59,68,69],["S",50,51,61,62],["T",56,66,67,76],["Z",60,70,71,81],["O",63,64,73,74],["Z",72,82,83,93],["I",75,85,95,105],["J",77,78,79,87],["L",80,90,91,92],["I",84,94,104,114],["Z",86,96,97,107],["O",88,89,98,99],["T",100,101,102,111],["S",103,112,113,122],["T",106,116,117,126],["J",108,109,119,129],["Z",110,120,121,131],["J",115,123,124,125],["S",118,127,128,137],["T",130,140,141,150],["O",132,133,142,143],["L",134,144,153,154],["S",135,136,146,147],["O",138,139,148,149],["I",145,155,165,175],["O",151,152,161,162],["L",156,157,166,176],["Z",158,159,167,168],["O",163,164,173,174]];
const COLS = 10;
// 16 rows of income hold 160 cells; 172 cells of spending leave 12 above the rim, 7 %.
const RIM = 16;
// Pieces take the colour of the direction whose share of spending they fall into, bottom first.
const SHARES = [20.31, 12.76, 12.69, 9.63, 44.61];

export const mountBlocks: MountScene = (ctx) => {
  const { stage } = ctx;
  const DARK = ctx.dark;
  const REDUCE = ctx.reduce;
  const SECTOR = sectorRgb(DARK);
  const cv = el('canvas', 'st-cv');
  stage.append(cv);
  cv.setAttribute('role', 'img');
  cv.setAttribute('aria-label', 'Блоки расходов падают в стакан доходов и не помещаются: сверху торчат 7 процентов — дефицит 448 миллиардов рублей.');
  const g = cv.getContext('2d');
  const total = PIECES.length * 4;
  const band = PIECES.map((_, i) => {
    const mid = ((i * 4 + 2) / total) * 100;
    let acc = 0;
    for (let s = 0; s < 5; s++) {
      acc += SHARES[s];
      if (mid < acc) return s;
    }
    return 4;
  });
  const COLORS = [SECTOR.c1, SECTOR.c2, SECTOR.c3, SECTOR.c4, DARK ? '#465064' : '#B9C1CF'].map(hexRgb);
  const RED = hexRgb(DARK ? '#FF5A6E' : '#E5484D');
  const INK = hexRgb(DARK ? '#F2F4F8' : '#0E1524');
  const SPAWN = 0.32;
  const EVERY = 0.056;
  const FALL = 0.3;
  const landed = SPAWN + (PIECES.length - 1) * EVERY + FALL;
  let geo: { cell: number; x0: number; yb: number } | null = null;
  let k = 1;

  function resize() {
    const fit = ctx.fitCanvas(cv);
    k = fit.k;
    const r = fit.r;
    const cell = Math.min((r.width * 0.54) / COLS, (r.height * 0.9) / 19.2);
    geo = { cell, x0: (r.width - cell * COLS) / 2, yb: r.height / 2 + cell * 9.4 };
  }
  function rr(x: number, y: number, w: number, h: number, rad: number) {
    g.beginPath();
    g.moveTo(x + rad, y);
    g.arcTo(x + w, y, x + w, y + h, rad);
    g.arcTo(x + w, y + h, x, y + h, rad);
    g.arcTo(x, y + h, x, y, rad);
    g.arcTo(x, y, x + w, y, rad);
    g.closePath();
  }

  function frame(t: number) {
    if (!geo) return;
    const { cell, x0, yb } = geo;
    const S = (v: number) => v * k;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cv.width, cv.height);
    const wellIn = REDUCE ? 1 : outCubic(clamp01((t - 0.1) / 0.5));
    const over = REDUCE ? 1 : clamp01((t - landed - 0.05) / 0.45);

    // The well: glass walls, and the dashed rim where income ends.
    g.globalAlpha = wellIn;
    g.fillStyle = rgba(INK, DARK ? 0.04 : 0.035);
    rr(S(x0 - 3), S(yb - RIM * cell - 3), S(cell * COLS + 6), S(RIM * cell + 6), S(6));
    g.fill();
    g.strokeStyle = rgba(INK, DARK ? 0.35 : 0.28);
    g.lineWidth = S(2);
    g.beginPath();
    g.moveTo(S(x0 - 4), S(yb - RIM * cell - 10));
    g.lineTo(S(x0 - 4), S(yb + 4 - 8));
    g.arcTo(S(x0 - 4), S(yb + 4), S(x0 + 4), S(yb + 4), S(8));
    g.lineTo(S(x0 + cell * COLS - 4), S(yb + 4));
    g.arcTo(S(x0 + cell * COLS + 4), S(yb + 4), S(x0 + cell * COLS + 4), S(yb - 4), S(8));
    g.lineTo(S(x0 + cell * COLS + 4), S(yb - RIM * cell - 10));
    g.stroke();
    const rimY = S(yb - RIM * cell);
    g.strokeStyle = over > 0 ? rgba(mix(INK, RED, over), 0.55 + 0.35 * over) : rgba(INK, 0.45);
    g.lineWidth = S(1.5);
    g.setLineDash([S(5), S(5)]);
    g.beginPath();
    g.moveTo(S(x0 - 16), rimY);
    g.lineTo(S(x0 + cell * COLS + 16), rimY);
    g.stroke();
    g.setLineDash([]);

    // Labels either side of the well.
    const fs = Math.max(10, Math.min(15, cell * 0.62));
    g.textBaseline = 'alphabetic';
    g.textAlign = 'right';
    g.fillStyle = rgba(INK, 0.55);
    g.font = `600 ${S(fs * 0.82)}px Onest, "Segoe UI", sans-serif`;
    g.fillText('ДОХОДЫ', S(x0 - 14), rimY + S(fs * 1.35));
    g.fillStyle = rgba(INK, 0.9);
    g.font = `700 ${S(fs)}px Onest, "Segoe UI", sans-serif`;
    g.fillText(`5,94${NB}трлн${NB}₽`, S(x0 - 14), rimY + S(fs * 2.55));
    g.globalAlpha = 1;
    if (over > 0) {
      const oy = S(yb - (RIM + 1.4) * cell);
      g.globalAlpha = over;
      g.textAlign = 'left';
      g.fillStyle = rgba(RED, 0.85);
      g.font = `600 ${S(fs * 0.82)}px Onest, "Segoe UI", sans-serif`;
      g.fillText('ДЕФИЦИТ', S(x0 + cell * COLS + 14), oy - S(fs * 0.2));
      g.fillStyle = rgba(RED, 1);
      g.font = `700 ${S(fs)}px Onest, "Segoe UI", sans-serif`;
      g.fillText(`448${NB}млрд${NB}₽`, S(x0 + cell * COLS + 14), oy + S(fs * 1.05));
      g.globalAlpha = 1;
    }

    // Pieces fall one by one under gravity and land with a short flash.
    const gap = Math.max(1, cell * 0.08);
    const rad = cell * 0.17;
    const pulse = over > 0 && !REDUCE ? 0.5 + 0.5 * Math.sin(((t - landed) / 2.4) * Math.PI * 2 - Math.PI / 2) : 0;
    for (let i = 0; i < PIECES.length; i++) {
      const s = SPAWN + i * EVERY;
      if (!REDUCE && t < s) break;
      const p = REDUCE ? 1 : clamp01((t - s) / FALL);
      const cells = PIECES[i].slice(1) as number[];
      const topRow = Math.max(...cells.map((c) => Math.floor(c / COLS)));
      const startOff = yb - (topRow + 1) * cell + cell * 2.5;
      const off = -startOff * (1 - p * p);
      const flash = REDUCE ? 0 : clamp01(1 - (t - s - FALL) / 0.35) * (p >= 1 ? 1 : 0);
      const base = COLORS[band[i]];
      for (const c of cells) {
        const row = Math.floor(c / COLS);
        const col = c % COLS;
        const isOver = row >= RIM;
        let color = base;
        if (isOver && over > 0) color = mix(base, RED, over);
        if (flash > 0) color = mix(color, [255, 255, 255], 0.35 * flash);
        const x = x0 + col * cell + gap / 2;
        const y = yb - (row + 1) * cell + gap / 2 + off;
        if (isOver && over > 0) {
          g.save();
          g.shadowColor = rgba(RED, (0.35 + 0.35 * pulse) * over);
          g.shadowBlur = S(cell * (0.5 + 0.4 * pulse));
          g.fillStyle = rgba(color, 1);
          rr(S(x), S(y), S(cell - gap), S(cell - gap), S(rad));
          g.fill();
          g.restore();
        } else {
          g.fillStyle = rgba(color, 1);
          rr(S(x), S(y), S(cell - gap), S(cell - gap), S(rad));
          g.fill();
        }
        // A lighter top edge gives each cell a little volume.
        g.fillStyle = 'rgba(255,255,255,0.22)';
        rr(S(x + 1.5), S(y + 1.2), S(cell - gap - 3), S(Math.max(1.5, cell * 0.12)), S(rad * 0.6));
        g.fill();
      }
    }
  }
  return { frame, resize };
};
