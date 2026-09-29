import { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import { reducedMotion, useEntrance } from './useEntrance';
import './exhibits.css';

const LETTERS = ' АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЫЭЮЯ';
const DIGITS = ' 0123456789';
const FLIP = 0.068;
const STAG = 0.026;
const ROW_LAG = 0.12;

// The same in-between letters every time: they come from a hash, not from Math.random.
const hash = (a: number, b: number, c: number) => {
  let h = Math.imul(a + 1, 374761393) ^ Math.imul(b + 7, 668265263) ^ Math.imul(c + 13, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
};

interface Cell {
  t: HTMLElement;
  b: HTMLElement;
  ft: HTMLElement;
  fb: HTMLElement;
  fti: HTMLElement;
  fbi: HTMLElement;
  key: string;
}

interface FlapBoardProps {
  /** One string per row; each is padded or cut to `cols` characters. */
  rows: string[];
  cols: number;
  /** Rows drawn in amber, like figures on a departures board. */
  amber?: number[];
  /** Columns from this one on are amber in every row (the figures after a name). */
  amberFrom?: number;
  /** What a screen reader hears. */
  label: string;
  className?: string;
}

// A split-flap board: when first seen, and whenever its text changes, every cell flips through a few letters
// to the new one, left to right, row after row.
export default function FlapBoard({ rows, cols, amber = [], amberFrom, label, className }: FlapBoardProps) {
  const [ref, entrance] = useEntrance<HTMLDivElement>(0.4);
  const cells = useRef<Cell[][]>([]);
  const shown = useRef<string[]>(rows.map(() => ' '.repeat(cols)));
  const text = rows.map((row) => row.slice(0, cols).padEnd(cols, ' '));
  const target = text.join('\n');

  useEffect(() => {
    const board = ref.current;
    if (!board) return;
    cells.current = [...board.querySelectorAll<HTMLElement>('.mgb-flap-row')].map((row) =>
      [...row.querySelectorAll<HTMLElement>('.cell')].map((cell) => {
        const q = (s: string) => cell.querySelector<HTMLElement>(s)!;
        return { t: q('.t i'), b: q('.b i'), ft: q('.ft'), fb: q('.fb'), fti: q('.ft i'), fbi: q('.fb i'), key: '' };
      }),
    );
  }, [ref, rows.length, cols]);

  useEffect(() => {
    if (entrance === 'wait') return;
    const from = shown.current;
    const to = target.split('\n');
    shown.current = to;
    const grid = cells.current;
    const paint = (cell: Cell, a: string, b: string, p: number) => {
      const key = a + b + (p < 0 ? '' : (Math.round(p * 40) / 40).toFixed(3));
      if (key === cell.key) return;
      cell.key = key;
      cell.t.textContent = b;
      if (p < 0) {
        cell.b.textContent = b;
        cell.ft.style.visibility = 'hidden';
        cell.fb.style.visibility = 'hidden';
        return;
      }
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
    };
    if (entrance === 'still' || reducedMotion()) {
      grid.forEach((row, r) => row.forEach((cell, c) => paint(cell, to[r][c], to[r][c], -1)));
      return;
    }
    const round = hash(target.length, to.join('').charCodeAt(0) || 0, 3);
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = (now - t0) / 1000;
      let busy = false;
      grid.forEach((row, r) =>
        row.forEach((cell, c) => {
          const a = from[r]?.[c] ?? ' ';
          const b = to[r][c];
          if (a === b) return paint(cell, b, b, -1);
          const since = t - c * STAG - r * ROW_LAG;
          if (since < 0) return paint(cell, a, a, -1);
          const flips = 2 + (hash(c, r, round) % 4);
          const pool = /\d/.test(b) ? DIGITS : LETTERS;
          const seq = (i: number) => (i === 0 ? a : i > flips ? b : pool[hash(c * 31 + r, round, i) % pool.length]);
          const u = since / FLIP;
          const n = Math.floor(u);
          if (n > flips) return paint(cell, b, b, -1);
          busy = true;
          paint(cell, seq(n), seq(n + 1), u - n);
        }),
      );
      if (busy || t < 0.2) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [entrance, target]);

  return (
    <div ref={ref} role="img" aria-label={label} className={cn('mgb-flap', className)}>
      {text.map((_, r) => (
        <div key={r} className={cn('mgb-flap-row', amber.includes(r) && 'amber')}>
          {Array.from({ length: cols }, (_, c) => (
            <span key={c} className={cn('cell', amberFrom !== undefined && c >= amberFrom && 'amber')}>
              <span className="t">
                <i />
              </span>
              <span className="b">
                <i />
              </span>
              <span className="ft">
                <i />
              </span>
              <span className="fb">
                <i />
              </span>
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
