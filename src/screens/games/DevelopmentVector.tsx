import { Fragment, useId, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { cn } from '../../lib/utils';
import { BottomAction } from '../../ui/Flow';
import { reducedMotion } from '../../ui/exhibits/useEntrance';
import { GamePage, GameResult, Review, finish, type GameProps, type Outcome } from './GameKit';
import './games.css';

// Three conditions match the city's industrial support, two are the distractors from the «промышленность» quiz.
const CONDITIONS = [
  {
    title: 'Модернизация цехов и станков',
    text: 'Роботизация и переход с импортных станков с ЧПУ на отечественные.',
    right: true,
    why: 'Главная цель промышленных субсидий Москвы — обновить производство и заменить импортное оборудование.',
  },
  {
    title: 'Оплата рекламы за рубежом',
    text: 'Компенсация рекламных кампаний предприятия в других странах.',
    right: false,
    why: 'Реклама за рубежом не входит в цели промышленных субсидий города.',
  },
  {
    title: 'Новые высокотехнологичные рабочие места',
    text: 'Трудоустройство выпускников профильных московских вузов.',
    right: true,
    why: 'Город поддерживает производства, которые создают квалифицированные рабочие места.',
  },
  {
    title: 'Покрытие штрафов предприятия',
    text: 'Выплата штрафов за нарушения из бюджетных денег.',
    right: false,
    why: 'Штрафы — ответственность предприятия; бюджет их не компенсирует.',
  },
  {
    title: 'Снижение вредных выбросов',
    text: 'Системы очистки и фильтрации на заводах внутри МКАД.',
    right: true,
    why: 'Экологическая модернизация — одно из условий поддержки производств в городе.',
  },
];

const RIGHT_COUNT = CONDITIONS.filter((item) => item.right).length;

// The scene, side on: flat mountains grow out of the meadow and a small climber walks along their tops, left to right,
// from the works to the flag on «Развитие производства». Every chosen condition grows one more mountain: a right one is
// a peak a step higher than the last, a wrong one is a drop, so the climber loses height and ends under the summit, at
// the cliff. Too few right ones and the range stops short. Units: 600 × 400, y down.
type Pt = [number, number];
const W = 600;
const H = 400;
const GROUND = 326;
const START: Pt = [104, GROUND];
const SUMMIT: Pt = [404, 106];
const STEP_X = (SUMMIT[0] - START[0]) / 3;
const RISES = [60, 90, 70]; // adds up to the summit's height
const FALLS = [55, 45];
const BUMP = 16;
const SNOWLINE = 190;
const INK = { plan: '#3D7BFD', right: '#16B38A', wrong: '#E23A4F' };

interface Leg {
  i: number;
  n: number;
  right: boolean;
  a: Pt;
  mid: Pt;
  end: Pt;
}

const lerp = (a: Pt, b: Pt, k: number): Pt => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const rankOf = (i: number, right: boolean) => CONDITIONS.slice(0, i).filter((c) => c.right === right).length;

// The mountains for the chosen conditions. Before the check they are neutral: every one grows a third of the way up
// (more than three share the way evenly), so the picture gives nothing away; the check gives every leg its real shape.
function planLegs(chosen: number[], revealed: boolean): Leg[] {
  let a = START;
  const share = Math.max(3, chosen.length);
  return chosen.map((i, n) => {
    const right = CONDITIONS[i].right;
    let mid: Pt;
    let end: Pt;
    if (!revealed) {
      end = lerp(START, SUMMIT, (n + 1) / share);
      mid = n === share - 1 ? lerp(a, end, 0.5) : [a[0] + (end[0] - a[0]) * 0.6, a[1] + (end[1] - a[1]) * 0.6 - BUMP];
    } else if (right) {
      const rank = rankOf(i, true);
      end = [a[0] + STEP_X, a[1] - RISES[rank]];
      mid = rank === 2 ? lerp(a, end, 0.5) : [a[0] + STEP_X * 0.6, a[1] - RISES[rank] - BUMP];
    } else {
      mid = a;
      end = [a[0], Math.min(GROUND, a[1] + FALLS[rankOf(i, false)])];
    }
    const leg = { i, n, right, a, mid, end };
    a = end;
    return leg;
  });
}

// Timing, in seconds: a toggle grows the range, the check reshapes it, then the climber walks the legs.
const GROW = 0.7;
const MORPH = 0.8;
const PAUSE = 0.15;
const legTime = (leg: Leg) => (leg.right ? 1.05 : 0.5);
const climbTime = (checked: number[]) =>
  reducedMotion() ? 0 : MORPH + planLegs([...checked].sort((a, b) => a - b), true).reduce((sum, leg) => sum + legTime(leg) + PAUSE, 0);
const easeInOut = (p: number) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);
const outBack = (p: number) => 1 + 2.2 * (p - 1) ** 3 + 1.2 * (p - 1) ** 2;
// Scene units to a place over the picture, so the HTML labels keep a readable size at any width.
const at = (x: number, y: number) => ({ left: `${((x / W) * 100).toFixed(3)}%`, top: `${((y / H) * 100).toFixed(3)}%` });

// The grown range as SVG paths, from its ridge (the start, then every leg's middle and end).
const xy = (p: Pt) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
const footOf = (last: Pt): Pt => [last[0] + (GROUND - last[1]) * 0.62, GROUND + 2];
const rangePath = (r: Pt[]) => (r.length < 2 ? '' : `M${r.map(xy).join(' L')} L${xy(footOf(r[r.length - 1]))} L${xy([START[0], GROUND + 2])} Z`);
const atY = (p: Pt, q: Pt, y: number): Pt => (Math.abs(q[1] - p[1]) < 0.01 ? q : lerp(p, q, Math.min(1, Math.max(0, (y - p[1]) / (q[1] - p[1])))));
function rangeDetail(ridge: Pt[]) {
  const r = ridge.filter((p, j) => j === 0 || Math.hypot(p[0] - ridge[j - 1][0], p[1] - ridge[j - 1][1]) > 0.5);
  let shade = '';
  let snow = '';
  for (let j = 1; j < r.length; j++) {
    const top = r[j];
    const next = r[j + 1] ?? footOf(top);
    if (!(top[1] < r[j - 1][1] - 0.5 && next[1] > top[1] + 0.5)) continue;
    // The side away from the sun is darker: a wedge from each top down to the meadow.
    shade += `M${xy(top)} L${xy(next)} L${xy([top[0] + (GROUND - top[1]) * 0.24, GROUND + 2])} Z `;
    // Snow on the high tops (the summit has its own).
    if (top[1] < SNOWLINE && top[0] < SUMMIT[0] - 2) {
      const y = top[1] + 20;
      const [l, rr] = [atY(top, r[j - 1], y), atY(top, next, y)];
      const w = rr[0] - l[0];
      snow += `M${xy(l)} L${xy(top)} L${xy(rr)} L${xy([rr[0] - w * 0.3, y + 5])} L${xy([l[0] + w * 0.5, y - 3])} L${xy([l[0] + w * 0.22, y + 6])} Z `;
    }
  }
  return { shade, snow };
}
// A point on a leg, by the share of its length walked.
function along(leg: Leg, k: number): Pt {
  const l1 = Math.hypot(leg.mid[0] - leg.a[0], leg.mid[1] - leg.a[1]);
  const l2 = Math.hypot(leg.end[0] - leg.mid[0], leg.end[1] - leg.mid[1]);
  const s = k * (l1 + l2);
  return s <= l1 && l1 > 0 ? lerp(leg.a, leg.mid, s / l1) : lerp(leg.mid, leg.end, l2 > 0 ? (s - l1) / l2 : 1);
}

// One loop grows the range towards the chosen shape and, after the check, walks the climber along its tops, drawing
// the trail under his feet and showing each leg's number as he reaches it.
function useRange(root: RefObject<HTMLDivElement | null>, legs: Leg[], revealed: boolean, onDone: () => void) {
  const shown = useRef<Pt[]>([]);
  const key = `${revealed}|${legs.map((l) => `${xy(l.mid)} ${xy(l.end)}`).join('|')}`;
  useLayoutEffect(() => {
    const box = root.current;
    if (!box) return;
    const find = <T extends Element>(sel: string) => box.querySelector(sel) as T;
    const land = [find<SVGPathElement>('.p-range'), find<SVGPathElement>('.p-range-clip')];
    const shade = find<SVGPathElement>('.p-range-shade');
    const snow = find<SVGPathElement>('.p-range-snow');
    const man = find<SVGGElement>('.p-man');
    const marks = [...box.querySelectorAll<HTMLElement>('.peak-mark')];
    const trails = [...box.querySelectorAll<SVGPathElement>('.p-walk')];
    const target = legs.flatMap((l) => [l.mid, l.end]);
    const from = target.map((p, j) => shown.current[j] ?? ([p[0], GROUND + 2] as Pt));
    const reduce = reducedMotion();
    const grow = reduce ? 0 : revealed ? MORPH : GROW;
    const ease = revealed ? easeInOut : outBack;
    const plan: { leg: Leg; t: number; dur: number }[] = [];
    let total = grow;
    for (const leg of legs) {
      plan.push({ leg, t: total, dur: legTime(leg) });
      total += legTime(leg) + PAUSE;
    }
    if (!revealed) total = grow;

    const draw = (t: number) => {
      const k = grow ? ease(Math.min(1, t / grow)) : 1;
      const pts = target.map((p, j): Pt => [from[j][0] + (p[0] - from[j][0]) * k, from[j][1] + (p[1] - from[j][1]) * k]);
      shown.current = pts;
      const ridge = [START, ...pts];
      const d = rangePath(ridge);
      land.forEach((path) => path.setAttribute('d', d));
      const detail = rangeDetail(ridge);
      shade.setAttribute('d', detail.shade);
      snow.setAttribute('d', detail.snow);
      marks.forEach((mark) => {
        const p = pts[Number(mark.dataset.leg) * 2 + 1];
        if (p) Object.assign(mark.style, at(p[0], p[1]));
      });
      if (!revealed) return;
      let pos = START;
      let walking = false;
      plan.forEach(({ leg, t: ts, dur }) => {
        const p = Math.min(1, Math.max(0, (t - ts) / dur));
        const walked = leg.right ? easeInOut(p) : p * p;
        trails.filter((path) => Number(path.dataset.leg) === leg.n).forEach((path) => (path.style.strokeDashoffset = String(1 - walked)));
        marks.find((mark) => Number(mark.dataset.leg) === leg.n)?.classList.toggle('is-hidden', p < 1);
        if (t >= ts) {
          pos = along(leg, walked);
          walking = walking || (leg.right && p > 0 && p < 1);
        }
      });
      const bob = walking ? Math.abs(Math.sin(t * Math.PI * 5.2)) * 1.5 : 0;
      man.setAttribute('transform', `translate(${pos[0].toFixed(2)} ${(pos[1] - bob).toFixed(2)})`);
      man.classList.toggle('is-walk', walking);
    };

    draw(reduce ? total : 0);
    if (reduce || total === 0) {
      if (revealed) onDone();
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      // A frame's timestamp can be a little older than t0.
      const t = Math.max(0, (now - t0) / 1000);
      draw(t);
      if (t < total) raf = requestAnimationFrame(tick);
      else if (revealed) onDone();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // `key` stands for `legs` and `revealed`.
  }, [key]);
}

// The goal: a fixed peak on the right with a cliff towards the climber. Right legs meet its summit.
const GOAL = 'M404 106 L428 124 L446 118 L490 166 L528 182 L610 236 V328 L400 328 L404 290 L396 250 L402 206 L394 166 L400 132 Z';
const GOAL_SHADE = 'M404 106 L428 124 L446 118 L490 166 L528 182 L610 236 V328 L474 328 Z';
const GOAL_SNOW = 'M400 132 L404 106 L428 124 L446 118 L452 124 L440 134 L430 128 L420 140 L411 130 L402 142 Z';
const TREES = [
  [468, 332, 26],
  [548, 334, 38],
  [574, 338, 28],
  [236, 374, 24],
  [256, 378, 34],
  [520, 376, 30],
];
// A fir in two tiers; `half` keeps only the shaded right side.
const fir = (x: number, y: number, h: number, half = false) => {
  const [a, b, c, d] = [h * 0.19, h * 0.11, h * 0.27, y - h * 0.46];
  return half ? `M${x} ${y - h} L${x + a} ${d} L${x + b} ${d} L${x + c} ${y} L${x} ${y} Z` : `M${x} ${y - h} L${x - a} ${d} L${x - b} ${d} L${x - c} ${y} L${x + c} ${y} L${x + b} ${d} L${x + a} ${d} Z`;
};
const STARS = [
  [40, 30], [96, 62], [150, 22], [214, 48], [262, 18], [318, 40], [520, 26], [566, 64], [590, 20], [70, 110], [236, 96],
];

function Field({ checked, revealed }: { checked: number[]; revealed: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g, '');
  const [done, setDone] = useState(false);
  const legs = planLegs(
    [...checked].sort((a, b) => a - b),
    revealed,
  );
  const last = legs[legs.length - 1];
  const hit = revealed && !!last && Math.hypot(last.end[0] - SUMMIT[0], last.end[1] - SUMMIT[1]) < 1;
  useRange(root, legs, revealed, () => setDone(true));
  const url = (id: string) => `url(#${uid}${id})`;

  return (
    <div
      ref={root}
      className={cn('mgb-peak', done && (hit ? 'is-hit' : 'is-miss'))}
      role="img"
      aria-label={revealed ? (hit ? 'Альпинист поднялся на вершину' : 'Альпинист не дошёл до вершины') : `Выбрано условий: ${checked.length}`}
    >
      <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <defs>
          <linearGradient id={`${uid}sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="st-sky1" />
            <stop offset="0.55" className="st-sky2" />
            <stop offset="1" className="st-sky3" />
          </linearGradient>
          <radialGradient id={`${uid}sun`}>
            <stop offset="0" className="st-sun1" />
            <stop offset="1" className="st-sun2" />
          </radialGradient>
          {/* One gradient for every mountain, in scene units, so a grown range and the goal peak join seamlessly. */}
          <linearGradient id={`${uid}rock`} gradientUnits="userSpaceOnUse" x1="0" y1="100" x2="0" y2="330">
            <stop offset="0" className="st-lit1" />
            <stop offset="1" className="st-lit2" />
          </linearGradient>
          <linearGradient id={`${uid}far`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="st-far1" />
            <stop offset="1" className="st-far2" />
          </linearGradient>
          <linearGradient id={`${uid}meadow`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="st-md1" />
            <stop offset="1" className="st-md2" />
          </linearGradient>
          <clipPath id={`${uid}clip`}>
            <path className="p-range-clip" />
          </clipPath>
        </defs>

        <rect width={W} height={H} fill={url('sky')} />
        {STARS.map(([sx, sy], k) => (
          <circle key={k} cx={sx} cy={sy} r={k % 3 === 0 ? 1.4 : 1} className="p-star" />
        ))}
        <circle cx="408" cy="104" r="130" fill={url('sun')} className="p-glow" />
        <circle cx="408" cy="104" r="30" className="p-sun" />
        <g className="p-cloud is-a">
          <path d="M64 70 C64 58 78 52 88 58 C92 44 114 40 124 54 C132 46 150 48 152 62 C164 62 170 70 166 76 L68 76 C64 76 62 74 64 70 Z" />
        </g>
        <g className="p-cloud is-c">
          <path d="M236 112 C236 104 246 100 252 104 C256 96 270 95 275 103 C282 100 292 105 290 113 L240 113 C237 113 235 113 236 112 Z" />
        </g>
        <g className="p-cloud is-b">
          <path d="M500 150 C500 140 512 136 520 141 C525 131 542 130 549 140 C558 136 570 142 568 152 L504 152 C501 152 499 152 500 150 Z" />
        </g>

        {/* Far ranges in the haze, then soft hills. */}
        <path d="M-10 262 L44 222 L92 240 L150 196 L206 234 L262 210 L318 246 L366 214 L420 250 L470 222 L528 248 L610 214 V330 H-10 Z" fill={url('far')} />
        <path d="M-10 300 C40 276 90 272 140 290 S240 270 300 292 S420 280 480 296 S570 282 610 290 V330 H-10 Z" className="p-mid" />

        {/* The grown range sits behind the goal peak, so a right route meets its summit without a seam. */}
        <path className="p-range" fill={url('rock')} />
        <g clipPath={url('clip')}>
          <path className="p-range-shade p-shade" />
          <path className="p-range-snow p-snow" />
        </g>
        <path d={GOAL} fill={url('rock')} />
        <path d={GOAL_SHADE} className="p-shade" />
        <path d={GOAL_SNOW} className="p-snow" />

        <path d="M-10 324 C80 318 170 330 260 324 S460 318 610 326 V380 H-10 Z" fill={url('meadow')} />
        <path d="M-10 324 C80 318 170 330 260 324 S460 318 610 326" className="p-edge" />
        <path d="M-10 352 C100 344 200 360 320 352 S520 344 610 354 V380 H-10 Z" className="p-near" />
        {TREES.map(([tx, ty, th], k) => (
          <g key={k}>
            <path d={fir(tx, ty, th)} className="p-tree" />
            <path d={fir(tx, ty, th, true)} className="p-tree-s" />
          </g>
        ))}
        {/* The enterprise at the foot: a small works with a saw-tooth roof. */}
        <g className="p-works">
          <rect x="64" y="278" width="7" height="22" className="w-chimney" />
          <path d="M28 328 V298 L44 290 V298 L60 290 V298 L76 290 V328 Z" className="w-body" />
          <path d="M28 298 L44 290 V298 Z M44 298 L60 290 V298 Z M60 298 L76 290 V298 Z" className="w-roof" />
          <rect x="34" y="307" width="8" height="7" rx="1" className="w-win" />
          <rect x="48" y="307" width="8" height="7" rx="1" className="w-win" />
          <rect x="62" y="307" width="8" height="7" rx="1" className="w-win" />
        </g>
        {/* The slab the miniature stands on. */}
        <rect x="-10" y="380" width={W + 20} height="20" className="p-slab" />
        <line x1="-10" y1="380.5" x2={W + 10} y2="380.5" className="p-slab-edge" />

        {/* The goal flag, just past the summit. */}
        <line x1="413" y1="113" x2="413" y2="66" className="p-pole" />
        <path d="M413 67 C423 64 431 72 443 68 L443 82 C431 86 423 78 413 81 Z" className="p-flag" />

        {revealed &&
          legs.map((leg) => (
            <Fragment key={leg.i}>
              {[true, false].map((under) => (
                <path
                  key={String(under)}
                  d={`M${xy(leg.a)} L${xy(leg.mid)} L${xy(leg.end)}`}
                  pathLength={1}
                  data-leg={leg.n}
                  className={cn('p-walk', under && 'is-under')}
                  stroke={under ? undefined : leg.right ? INK.right : INK.wrong}
                  style={{ strokeDashoffset: done ? 0 : 1 }}
                />
              ))}
            </Fragment>
          ))}
        {done && !hit && last && <line x1={last.end[0]} y1={last.end[1] - 34} x2={SUMMIT[0]} y2={SUMMIT[1] + 4} className="p-miss" />}

        {/* The climber, feet at the origin, facing right. */}
        <g className={cn('p-man', done && hit && 'is-cheer')} transform={`translate(${START[0]} ${START[1]})`}>
          <g transform="scale(1.25)">
            <line x1="-1" y1="-11" x2="-2.6" y2="0" className="m-leg is-back" />
            <line x1="0.6" y1="-11" x2="2.4" y2="0" className="m-leg is-front" />
            <rect x="-8" y="-22" width="6" height="11.5" rx="2" className="m-pack" />
            <rect x="-3.4" y="-22.5" width="7.2" height="12.5" rx="2.6" className="m-coat" />
            <line x1="1.6" y1="-19" x2="5.6" y2="-13.5" className="m-arm" />
            <line x1="6" y1="-17" x2="7.6" y2="0" className="m-pole" />
            <circle cx="0.6" cy="-26" r="3.5" className="m-face" />
            <path d="M-2.9 -26.6 A3.6 3.6 0 0 1 4.1 -26.6 Z" className="m-hat" />
          </g>
        </g>
      </svg>

      <span className="peak-tag is-works" style={at(16, 334)}>
        Предприятие
      </span>
      <span className="peak-tag is-goal" style={at(450, 74)}>
        Развитие производства
      </span>
      {legs.map((leg) => (
        <span
          key={`${revealed ? 'r' : 'p'}${leg.i}`}
          data-leg={leg.n}
          className={cn('peak-mark', revealed && !done && 'is-hidden')}
          style={{ ...at(leg.end[0], leg.end[1]), '--c': !revealed ? INK.plan : leg.right ? INK.right : INK.wrong } as CSSProperties}
        >
          {leg.n + 1}
        </span>
      ))}
    </div>
  );
}

export default function DevelopmentVector(props: GameProps) {
  const [checked, setChecked] = useState<number[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const toggle = (i: number) => !revealed && setChecked((current) => (current.includes(i) ? current.filter((item) => item !== i) : [...current, i]));
  const exact = CONDITIONS.every((item, i) => item.right === checked.includes(i));
  const order = [...checked].sort((a, b) => a - b);

  if (outcome) {
    const extra = CONDITIONS.filter((item, i) => !item.right && checked.includes(i)).length;
    const missed = CONDITIONS.filter((item, i) => item.right && !checked.includes(i)).length;
    return (
      <GameResult
        {...props}
        outcome={outcome}
        title={outcome.win ? 'Вектор настроен' : 'Нужна доработка'}
        message={
          outcome.win
            ? 'Все три условия совпадают с целями промышленной поддержки Москвы — стрелка попала в цель.'
            : [extra > 0 && `лишних условий: ${extra}`, missed > 0 && `не хватает: ${missed}`].filter(Boolean).join(', ').replace(/^./, (c) => c.toUpperCase()) + '.'
        }
        onRetry={() => {
          setChecked([]);
          setRevealed(false);
          setOutcome(null);
        }}
      >
        <Review
          title="Разбор условий"
          rows={CONDITIONS.map((item, i) => ({
            ok: item.right === checked.includes(i),
            title: `${item.title} — ${item.right ? 'подходит' : 'не подходит'}`,
            text: item.why,
          }))}
        />
      </GameResult>
    );
  }

  return (
    <GamePage
      item={props.item}
      onClose={props.onClose}
      headline="Наведите субсидию на цель"
      task="Включите условия, при которых город даёт промышленному предприятию субсидию. Каждое условие — отрезок пути; верные вместе приведут в цель."
      note={`Верных условий ${RIGHT_COUNT}.`}
      side={
        <div role="group" aria-label="Условия субсидии" className="grid gap-2">
          {CONDITIONS.map((item, i) => {
            const on = checked.includes(i);
            const tone = revealed ? (item.right === on ? 'ok' : 'bad') : null;
            return (
              <button
                key={item.title}
                type="button"
                role="switch"
                aria-checked={on}
                onClick={() => toggle(i)}
                className={cn(
                  'mgb-bare flex items-center gap-3.5 rounded-[1.25rem] border-[1.5px] bg-card px-4 py-3 text-left text-ink shadow-[var(--mgb-shadow)] transition-[border-color,background-color] duration-200',
                  tone === 'ok' ? 'border-c3' : tone === 'bad' ? 'border-accent bg-accent-soft' : on ? 'border-c1' : 'border-line',
                  revealed && 'cursor-default',
                )}
              >
                <span aria-hidden="true" className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200', on ? 'bg-c1' : 'bg-track')}>
                  {/* The knob carries the number of this leg on the field. */}
                  <span
                    className={cn(
                      'absolute top-1 grid size-5 place-items-center rounded-full bg-white font-mono text-[0.6875rem] font-bold leading-none text-c1 shadow transition-[left] duration-200',
                      on ? 'left-6' : 'left-1',
                    )}
                  >
                    {on && order.indexOf(i) + 1}
                  </span>
                </span>
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="text-[0.9375rem] font-semibold leading-tight lg:text-[1rem]">{item.title}</span>
                  <span className="text-[0.8125rem] leading-snug text-ink-2">{item.text}</span>
                </span>
                {tone && (
                  <span className={cn('shrink-0 text-[0.8125rem] font-semibold', tone === 'ok' ? (on ? 'text-ok-ink' : 'text-ink-3') : 'text-accent')}>
                    {tone === 'ok' ? (on ? 'верно' : 'не нужно') : on ? 'лишнее' : 'пропущено'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      }
    >
      <Field checked={checked} revealed={revealed} />
      {revealed && (
        <p
          aria-live="polite"
          className={cn('mgb-climb-note m-0 mt-3 text-center text-[1rem] font-semibold lg:text-[1.125rem]', exact ? 'text-ok-ink' : 'text-accent')}
          style={{ animationDelay: `${climbTime(checked)}s` }}
        >
          {exact ? 'На вершине: все условия верные' : 'Мимо: лишние условия тянут вниз, без верных хребет обрывается'}
        </p>
      )}

      <BottomAction
        label={revealed ? 'Показать итог' : checked.length === 0 ? 'Включите условия' : `Проверить курс · ${checked.length}`}
        disabled={checked.length === 0}
        onClick={() => (revealed ? setOutcome(finish(props, exact)) : setRevealed(true))}
      />
    </GamePage>
  );
}
