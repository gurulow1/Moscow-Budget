import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Check, X } from 'lucide-react';
import { cn } from '../../lib/utils';

// Money answers as coin stacks drawn to one scale: the sums are compared before anything is chosen. After the
// answer the right stack turns gold from the bottom up; a wrong pick turns red, shakes and drops its top coins.
interface CoinStacksProps {
  options: string[];
  values: number[];
  picked: number | null;
  correct: number;
  onPick: (i: number) => void;
  dark: boolean;
  reduce: boolean;
  /** After an answer: the screen point on top of the right stack, for a coin to fly from. */
  onReveal?: (x: number, y: number) => void;
}

type Paint = [top: string, side: string, edge: string];
const PALETTE: Record<'light' | 'dark', { neutral: Paint; gold: Paint; red: Paint; shadow: string; glyph: string }> = {
  light: { neutral: ['#EEF1F6', '#C8CFDA', '#A7B0BF'], gold: ['#FFE08A', '#E6B13D', '#BF8A1C'], red: ['#FF9CA5', '#E2485C', '#AE3048'], shadow: 'rgba(20,28,50,0.18)', glyph: 'rgba(14,21,36,0.16)' },
  dark: { neutral: ['#66718A', '#414A5E', '#2C3242'], gold: ['#FFD66B', '#D69E28', '#9E6E10'], red: ['#FF7F8E', '#C63B51', '#882235'], shadow: 'rgba(0,0,0,0.55)', glyph: 'rgba(0,0,0,0.25)' },
};
const LETTERS = 'АБВГД';

interface Geo {
  w: number;
  h: number;
  rx: number;
  ry: number;
  /** Coin thickness: the stacks keep their coin counts and get thinner coins when the stage gets shorter. */
  th: number;
  base: number;
  xs: number[];
  counts: number[];
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const outCubic = (x: number) => 1 - Math.pow(1 - x, 3);

function coin(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, th: number, [top, side, edge]: Paint) {
  g.fillStyle = side;
  g.beginPath();
  g.ellipse(x, y + th, rx, ry, 0, 0, Math.PI);
  g.lineTo(x - rx, y);
  g.ellipse(x, y, rx, ry, 0, Math.PI, 0, true);
  g.closePath();
  g.fill();
  g.strokeStyle = edge;
  g.lineWidth = 1;
  g.beginPath();
  g.ellipse(x, y + th, rx, ry, 0, 0.08, Math.PI - 0.08);
  g.stroke();
  const sheen = g.createLinearGradient(x - rx, y - ry, x + rx, y + ry);
  sheen.addColorStop(0, top);
  sheen.addColorStop(1, side);
  g.fillStyle = sheen;
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
}

export default function CoinStacks({ options, values, picked, correct, onPick, dark, reduce, onReveal }: CoinStacksProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
  const live = useRef({ start: performance.now(), answeredAt: -1, picked: null as number | null, hover: -1, lift: values.map(() => 0), geo: null as Geo | null, th: 0 });
  const raf = useRef(0);
  const answered = picked !== null;

  const draw = useCallback(
    (now: number) => {
      const cv = canvasRef.current;
      const g = cv?.getContext('2d');
      const s = live.current;
      const G = s.geo;
      if (!cv || !g || !G) return false;
      const k = cv.width / G.w;
      const P = PALETTE[dark ? 'dark' : 'light'];
      const t = (now - s.start) / 1000;
      const since = s.answeredAt < 0 ? -1 : (now - s.answeredAt) / 1000;
      let busy = false;
      // Height changes (the explanation opening under the stacks) ease in instead of jumping.
      s.th = s.th ? s.th + (G.th - s.th) * 0.2 : G.th;
      if (Math.abs(s.th - G.th) > 0.01) busy = true;
      const th = s.th;
      g.setTransform(k, 0, 0, k, 0, 0);
      g.clearRect(0, 0, G.w, G.h);
      G.xs.forEach((cx0, i) => {
        const n = G.counts[i];
        const isRight = i === correct;
        const isMine = i === s.picked;
        const target = s.hover === i && s.answeredAt < 0 ? 1 : 0;
        s.lift[i] += (target - s.lift[i]) * 0.22;
        if (Math.abs(target - s.lift[i]) > 0.01) busy = true;
        const lift = s.lift[i] * 6;
        if (!reduce && t < 0.1 * i + 0.014 * n + 0.4) busy = true;
        if (since >= 0 && since < 1.3 && !reduce) busy = true;
        const fade = since >= 0 && !isRight && !isMine ? 1 - 0.62 * (reduce ? 1 : clamp01(since / 0.3)) : 1;
        const shake = since >= 0 && isMine && !isRight && !reduce ? 7 * Math.sin(since * 38) * Math.exp(-since * 5.5) : 0;
        const cx = cx0 + shake;
        // A soft shadow on the ground, and a warm light behind the right stack once it is shown.
        g.globalAlpha = fade;
        g.fillStyle = P.shadow;
        g.beginPath();
        g.ellipse(cx0, G.base + th + G.ry * 0.35, G.rx * 1.15, G.ry * 0.9, 0, 0, Math.PI * 2);
        g.fill();
        if (since >= 0 && isRight) {
          const glow = reduce ? 1 : clamp01(since / 0.5);
          const top = G.base - n * th;
          const halo = g.createRadialGradient(cx0, (top + G.base) / 2, 0, cx0, (top + G.base) / 2, Math.max(G.rx * 2.2, (G.base - top) * 0.8));
          halo.addColorStop(0, `rgba(255, 196, 60, ${(dark ? 0.28 : 0.34) * glow})`);
          halo.addColorStop(1, 'rgba(255, 196, 60, 0)');
          g.fillStyle = halo;
          g.fillRect(cx0 - G.rx * 3, top - G.rx * 2, G.rx * 6, G.base - top + G.rx * 4);
        }
        for (let c = 0; c < n; c++) {
          const drop = reduce ? 1 : clamp01((t - 0.1 * i - 0.014 * c) / 0.3);
          if (drop <= 0) break;
          let x = cx;
          let y = G.base - (c + 1) * th - lift - 70 * (1 - outCubic(drop));
          let alpha = fade * clamp01(drop * 3);
          let paint = P.neutral;
          if (since >= 0 && isRight && (reduce || since > 0.05 + 0.014 * c)) paint = P.gold;
          if (since >= 0 && isMine && !isRight && (reduce || since > 0.006 * c)) paint = P.red;
          // The two top coins of a wrong pick slide off and fall.
          const falls = since >= 0 && isMine && !isRight && !reduce && n > 3 && c >= n - 2;
          g.save();
          if (falls) {
            const f = clamp01((since - 0.12 - (n - 1 - c) * 0.08) / 0.75);
            const dir = c === n - 1 ? 1 : -1;
            x += dir * (G.rx * 1.6) * outCubic(f);
            y += 320 * f * f - 18 * Math.sin(Math.PI * Math.min(1, f * 1.6));
            alpha *= 1 - clamp01((f - 0.55) / 0.45);
            g.translate(x, y);
            g.rotate(dir * f * 1.2);
            g.translate(-x, -y);
          }
          g.globalAlpha = alpha;
          coin(g, x, y, G.rx, G.ry, th, paint);
          if (c === n - 1 && !falls) {
            g.fillStyle = P.glyph;
            g.font = `700 ${(G.ry * 1.5).toFixed(1)}px Onest, "Segoe UI", sans-serif`;
            g.textAlign = 'center';
            g.textBaseline = 'middle';
            g.translate(x, y + 0.5);
            g.scale(1.25, 0.72);
            g.fillText('₽', 0, 0);
          }
          g.restore();
        }
        g.globalAlpha = 1;
      });
      return busy;
    },
    [correct, dark, reduce],
  );

  const kick = useCallback(() => {
    if (raf.current) return;
    const tick = (now: number) => {
      raf.current = 0;
      if (draw(now)) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, [draw]);

  // One scale for every stack: the biggest sum fills the height, the rest are drawn to it (at least one coin).
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const cv = canvasRef.current;
    if (!wrap || !cv) return;
    const measure = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (!w || !h) return;
      const colW = w / values.length;
      const rx = Math.min(colW * 0.36, 58);
      const ry = rx * 0.3;
      const base = h - 58 - ry;
      const room = base - 64 - ry;
      const prev = live.current.geo;
      // Coins are counted once per width; later only their thickness follows the height.
      let counts = prev?.w === w ? prev.counts : null;
      let th = Math.max(5, Math.min(8.5, rx * 0.19));
      if (!counts) {
        const max = Math.max(...values);
        counts = values.map((v) => Math.max(1, Math.round((v / max) * Math.floor(room / th))));
      } else th = Math.min(th, room / Math.max(...counts));
      const next: Geo = { w, h, rx, ry, th, base, xs: values.map((_, i) => colW * (i + 0.5)), counts };
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
        cv.width = Math.round(w * dpr);
        cv.height = Math.round(h * dpr);
      }
      live.current.geo = next;
      setGeo(next);
      kick();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [values, kick]);

  // The answer starts its animation once; later renders of the parent must not restart it.
  const revealRef = useRef(onReveal);
  revealRef.current = onReveal;
  useEffect(() => {
    const s = live.current;
    s.picked = picked;
    if (picked === null) {
      s.answeredAt = -1;
      return;
    }
    s.answeredAt = performance.now();
    kick();
    const G = s.geo;
    if (!G) return;
    const timer = window.setTimeout(
      () => {
        const r = canvasRef.current?.getBoundingClientRect();
        if (r) revealRef.current?.(r.left + G.xs[correct], r.top + G.base - G.counts[correct] * G.th);
      },
      reduce ? 0 : 120 + 14 * G.counts[correct],
    );
    return () => window.clearTimeout(timer);
  }, [picked, correct, kick, reduce]);

  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    },
    [],
  );

  return (
    <div ref={wrapRef} className="relative min-h-[17rem] w-full flex-1">
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />
      {geo &&
        options.map((text, i) => {
          const top = geo.base - geo.counts[i] * geo.th - geo.ry;
          const isRight = answered && i === correct;
          const isMine = answered && i === picked;
          const settle = reduce ? 0 : 0.1 * i + 0.014 * geo.counts[i] + 0.22;
          return (
            <button
              key={text}
              type="button"
              aria-pressed={i === picked}
              aria-label={`${LETTERS[i]}: ${text}`}
              onClick={() => !answered && onPick(i)}
              onPointerEnter={(e) => {
                if (e.pointerType !== 'mouse') return;
                live.current.hover = i;
                kick();
              }}
              onPointerLeave={() => {
                live.current.hover = -1;
                kick();
              }}
              className={cn('mgb-bare absolute top-0 flex h-full flex-col items-center rounded-3xl', answered ? 'cursor-default' : 'cursor-pointer')}
              style={{ left: geo.xs[i] - geo.w / options.length / 2, width: geo.w / options.length }}
            >
              <motion.span
                className="absolute flex flex-col items-center text-center transition-[bottom] duration-300 ease-out"
                style={{ bottom: geo.h - top + 10 }}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: answered && !isRight && !isMine ? 0.45 : 1, y: 0 }}
                transition={{ delay: answered ? 0 : settle, duration: 0.35, ease: 'easeOut' }}
              >
                {(isRight || isMine) && (
                  <motion.span
                    className={cn('mb-1.5 grid size-7 place-items-center rounded-full text-white', isRight ? 'bg-ok-ink' : 'bg-accent')}
                    initial={reduce ? false : { scale: 0.3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 22, delay: reduce ? 0 : isRight ? 0.12 + 0.014 * geo.counts[i] : 0.05 }}
                  >
                    {isRight ? <Check size={16} strokeWidth={3} /> : <X size={15} strokeWidth={3} />}
                  </motion.span>
                )}
                <b className="whitespace-nowrap text-[1.0625rem] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[1.25rem]">{text.replace(/^Около\s+/i, '≈ ')}</b>
              </motion.span>
              <span
                aria-hidden="true"
                className={cn(
                  'absolute bottom-3 grid size-9 place-items-center rounded-full text-[0.9375rem] font-bold transition-colors duration-300',
                  isRight ? 'bg-ok-ink text-white' : isMine ? 'bg-accent text-white' : 'bg-card text-ink-2 shadow-[var(--mgb-shadow)]',
                )}
              >
                {LETTERS[i]}
              </span>
            </button>
          );
        })}
    </div>
  );
}
