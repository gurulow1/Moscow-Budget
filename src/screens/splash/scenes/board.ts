import { el, type MountScene } from '../kit';

// A split-flap departures board: four more city programs, one after another.
const ITEMS = [
  ['ЗДРАВООХРАНЕНИЕ', '615,0'],
  ['ГОРОДСКАЯ СРЕДА', '263,2'],
  ['ЦИФРОВАЯ СРЕДА', '243,1'],
  ['СПОРТ', '173,3'],
];
const N = 15;
const LETTERS = ' АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЫЭЮЯ';
const DIGITS = ' 0123456789';

const text = (k: number) => {
  const [name, amt] = ITEMS[((k % ITEMS.length) + ITEMS.length) % ITEMS.length];
  return name.padEnd(N, ' ') + amt.padStart(N, ' ');
};

// The same flaps on every visit: the in-between letters come from a hash, not from Math.random.
const hash = (a: number, b: number, c: number) => {
  let h = Math.imul(a + 1, 374761393) ^ Math.imul(b + 7, 668265263) ^ Math.imul(c + 13, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
};

export const mountBoard: MountScene = (ctx) => {
  const { stage } = ctx;
  const REDUCE = ctx.reduce;
  const wrap = el('div', 'b-wrap');
  const board = el('div', 'b-board');
  const head = el('div', 'b-head', '<span>НАПРАВЛЕНИЕ</span><span>МЛРД ₽</span>');
  const rowName = el('div', 'b-row');
  const rowAmt = el('div', 'b-row b-amt');
  const foot = el('div', 'b-foot');
  const dots = el('div', 'b-dots', ITEMS.map(() => '<span></span>').join(''));
  foot.append(dots, el('span', null, 'БЮДЖЕТ 2026'));
  board.append(head, rowName, rowAmt, foot);
  board.setAttribute('role', 'img');
  board.setAttribute('aria-label', 'Табло: крупные программы бюджета Москвы на 2026 год, млрд рублей. ' + ITEMS.map(([n, a]) => `${n.toLowerCase()} — ${a}`).join(', '));
  wrap.append(board);
  stage.append(wrap);
  ctx.reveal(board, 0.3, { y: 14, b: 0 });
  const cells: { t: HTMLElement; b: HTMLElement; ft: HTMLElement; fb: HTMLElement; fti: HTMLElement; fbi: HTMLElement; key: string }[] = [];
  for (let c = 0; c < N * 2; c++) {
    const cell = el('span', 'cell', '<span class="t"><i></i></span><span class="b"><i></i></span><span class="ft"><i></i></span><span class="fb"><i></i></span>');
    (c < N ? rowName : rowAmt).appendChild(cell);
    const q = (s: string) => cell.querySelector<HTMLElement>(s);
    cells.push({ t: q('.t i'), b: q('.b i'), ft: q('.ft'), fb: q('.fb'), fti: q('.ft i'), fbi: q('.fb i'), key: '' });
  }
  const dotEls = [...dots.children];
  const T0 = 0.55;
  const HOLD = 3.6;
  const FLIP = 0.068;
  const STAG = 0.026;

  // What a cell shows at time t: the character under the flap, the one coming, and how far the flap has fallen.
  function stateOf(c: number, t: number): [string, string, number] {
    if (t < T0) return [' ', ' ', -1];
    const k = Math.floor((t - T0) / HOLD);
    const target = text(k)[c];
    const prev = k === 0 ? ' ' : text(k - 1)[c];
    if (REDUCE || target === prev) return [target, target, -1];
    const since = t - T0 - k * HOLD - c * STAG - (c >= N ? 0.12 : 0);
    if (since < 0) return [prev, prev, -1];
    const F = 2 + (hash(c, k, 0) % 4);
    const pool = c < N ? LETTERS : DIGITS;
    const seq = (i: number) => (i === 0 ? prev : i > F ? target : pool[hash(c, k, i) % pool.length]);
    const u = since / FLIP;
    const n = Math.floor(u);
    if (n > F) return [target, target, -1];
    return [seq(n), seq(n + 1), u - n];
  }

  function frame(t: number) {
    for (let c = 0; c < cells.length; c++) {
      const cell = cells[c];
      const [a, b, p] = stateOf(c, t);
      const key = a + b + (p < 0 ? '' : (Math.round(p * 40) / 40).toFixed(3));
      if (key === cell.key) continue;
      cell.key = key;
      if (p < 0) {
        cell.t.textContent = b;
        cell.b.textContent = b;
        cell.ft.style.visibility = 'hidden';
        cell.fb.style.visibility = 'hidden';
        continue;
      }
      cell.t.textContent = b;
      cell.b.textContent = a;
      if (p < 0.5) {
        cell.fti.textContent = a;
        cell.ft.style.visibility = 'visible';
        cell.ft.style.transform = `rotateX(${(-p * 180).toFixed(1)}deg)`;
        cell.fb.style.visibility = 'hidden';
      } else {
        cell.fbi.textContent = b;
        cell.fb.style.visibility = 'visible';
        cell.fb.style.transform = `rotateX(${((1 - p) * 180).toFixed(1)}deg)`;
        cell.ft.style.visibility = 'hidden';
      }
    }
    const k = t < T0 ? -1 : Math.floor((t - T0) / HOLD) % ITEMS.length;
    dotEls.forEach((d, i) => d.classList.toggle('on', i === k));
  }

  function resize() {
    const r = stage.getBoundingClientRect();
    // 15 cells plus gaps and padding across the board; never taller than the stage allows.
    const cw = Math.min((r.width * 0.98) / (N * 1.1 + 1.16), (r.height * 0.9) / 5.2, 44);
    board.style.setProperty('--cw', cw.toFixed(2) + 'px');
  }
  return { frame, resize };
};
