import { Fragment, useEffect, useId, useRef, useState, type CSSProperties, type RefObject } from 'react';
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

// The scene: a small mountain on a slab. The enterprise stands at the foot, «Развитие производства» is the summit.
// Every chosen condition is one leg of the climb; the three right ones lead from camp to camp up to the top, the wrong
// ones make the climber slip down and aside, so the rest of the route misses the summit. Units: 600 × 420.
const W = 600;
const H = 420;
const START = [96, 318];
const TARGET = [428, 98];
const D = [TARGET[0] - START[0], TARGET[1] - START[1]];
const rot = ([x, y]: number[], deg: number) => {
  const a = (deg * Math.PI) / 180;
  return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
};
const R1 = rot([D[0] / 3, D[1] / 3], -9);
const R2 = rot([D[0] / 3, D[1] / 3], 11);
const R3 = [D[0] - R1[0] - R2[0], D[1] - R1[1] - R2[1]];
const RIGHT_VECTORS = [R1, R2, R3];
// A slip: down the slope and aside. Any mix of legs still ends on the slope or the meadow.
const WRONG_VECTORS = [
  [58, 40],
  [-62, 30],
];
const INK = { right: '#16B38A', wrong: '#E23A4F' };

function vectorOf(i: number) {
  const rights = CONDITIONS.slice(0, i).filter((c) => c.right).length;
  const wrongs = CONDITIONS.slice(0, i).filter((c) => !c.right).length;
  return CONDITIONS[i].right ? RIGHT_VECTORS[rights] : WRONG_VECTORS[wrongs];
}

// A leg takes STEP seconds: WALK on the move, then a short stop at the marker.
const WALK = 0.95;
const STEP = 1.15;
const climbTime = (legs: number) => (reducedMotion() ? 0 : legs * STEP);
const easeInOut = (p: number) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);
// Scene units to a place over the picture, so the HTML labels keep a readable size at any width.
const at = (x: number, y: number) => ({ left: `${((x / W) * 100).toFixed(3)}%`, top: `${((y / H) * 100).toFixed(3)}%` });

// The massif: one outline, split along a spine into the lit and the shaded face.
const RIDGE_L = 'M-10 262 L70 236 L140 206 L200 178 L250 156 L300 132 L340 118 L372 106 L420 88';
const RIDGE_R = 'L452 108 L490 124 L530 154 L570 182 L610 200';
const SPINE = 'L436 150 L462 214 L486 280 L500 340';
const TREES = [
  [10, 322, 30],
  [470, 330, 26],
  [512, 334, 38],
  [536, 344, 52],
  [562, 332, 32],
  [586, 350, 46],
  [404, 392, 26],
  [424, 396, 34],
  [566, 394, 40],
];
// A fir in two tiers; `half` keeps only the shaded right side.
const fir = (x: number, y: number, h: number, half = false) => {
  const [a, b, c, d] = [h * 0.19, h * 0.11, h * 0.27, y - h * 0.46];
  return half ? `M${x} ${y - h} L${x + a} ${d} L${x + b} ${d} L${x + c} ${y} L${x} ${y} Z` : `M${x} ${y - h} L${x - a} ${d} L${x - b} ${d} L${x - c} ${y} L${x + c} ${y} L${x + b} ${d} L${x + a} ${d} Z`;
};
const STARS = [
  [40, 30], [96, 62], [150, 22], [214, 48], [262, 18], [318, 40], [520, 26], [566, 64], [590, 20], [70, 110], [236, 96],
];

interface Leg {
  i: number;
  n: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

// The climb: one loop moves the climber and draws each leg under his feet, so the line never runs ahead of him.
function useClimb(scene: RefObject<SVGSVGElement | null>, legs: Leg[], revealed: boolean, onDone: () => void) {
  useEffect(() => {
    const svg = scene.current;
    const man = svg?.querySelector<SVGGElement>('.p-man');
    if (!svg || !man || !revealed || legs.length === 0) return;
    const lines = [...svg.querySelectorAll<SVGPathElement>('.p-walk')];
    const place = (x: number, y: number, face: number) => man.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${face} 1)`);
    const last = legs[legs.length - 1];
    if (reducedMotion()) {
      place(last.x2, last.y2, last.x2 >= last.x1 ? 1 : -1);
      onDone();
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      // A frame's timestamp can be a little older than t0.
      const t = Math.max(0, (now - t0) / 1000);
      const k = Math.min(legs.length - 1, Math.floor(t / STEP));
      const p = easeInOut(Math.min(1, Math.max(0, (t - k * STEP) / WALK)));
      lines.forEach((line) => {
        const j = Number(line.dataset.leg);
        line.style.strokeDashoffset = String(j < k ? 0 : j === k ? 1 - p : 1);
      });
      const s = legs[k];
      const bob = p < 1 ? Math.abs(Math.sin(p * Math.PI * 5)) * 1.6 : 0;
      place(s.x1 + (s.x2 - s.x1) * p, s.y1 + (s.y2 - s.y1) * p - bob, s.x2 >= s.x1 ? 1 : -1);
      man.classList.toggle('is-walk', p > 0 && p < 1);
      if (t < legs.length * STEP) raf = requestAnimationFrame(tick);
      else onDone();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // The route is fixed once the check has started, so the climb only follows `revealed`.
  }, [revealed]);
}

function Field({ checked, revealed }: { checked: number[]; revealed: boolean }) {
  const reduce = reducedMotion();
  const scene = useRef<SVGSVGElement>(null);
  const uid = useId().replace(/:/g, '');
  const [done, setDone] = useState(false);
  const chosen = [...checked].sort((a, b) => a - b);
  // Before the check the plan is neutral: the chosen legs split the straight way to the summit evenly.
  let [x, y] = START;
  const legs: Leg[] = chosen.map((i, n) => {
    const v = revealed ? vectorOf(i) : [D[0] / chosen.length, D[1] / chosen.length];
    const leg = { i, n, x1: x, y1: y, x2: x + v[0], y2: y + v[1], color: CONDITIONS[i].right ? INK.right : INK.wrong };
    x = leg.x2;
    y = leg.y2;
    return leg;
  });
  const hit = revealed && Math.hypot(x - TARGET[0], y - TARGET[1]) < 6 && legs.length > 0;
  useClimb(scene, legs, revealed, () => setDone(true));
  const url = (id: string) => `url(#${uid}${id})`;
  return (
    <div
      className={cn('mgb-peak', done && (hit ? 'is-hit' : 'is-miss'))}
      role="img"
      aria-label={revealed ? (hit ? 'Альпинист поднялся на вершину' : 'Маршрут прошёл мимо вершины') : `Выбрано условий: ${checked.length}`}
    >
      <svg ref={scene} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
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
          <linearGradient id={`${uid}lit`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="st-lit1" />
            <stop offset="1" className="st-lit2" />
          </linearGradient>
          <linearGradient id={`${uid}shade`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="st-shade1" />
            <stop offset="1" className="st-shade2" />
          </linearGradient>
          <linearGradient id={`${uid}far`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="st-far1" />
            <stop offset="1" className="st-far2" />
          </linearGradient>
          <linearGradient id={`${uid}mist`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="st-mist1" />
            <stop offset="1" className="st-mist2" />
          </linearGradient>
          <linearGradient id={`${uid}meadow`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="st-md1" />
            <stop offset="1" className="st-md2" />
          </linearGradient>
        </defs>

        <rect width={W} height={H} fill={url('sky')} />
        {STARS.map(([sx, sy], k) => (
          <circle key={k} cx={sx} cy={sy} r={k % 3 === 0 ? 1.4 : 1} className="p-star" />
        ))}
        <circle cx="428" cy="92" r="130" fill={url('sun')} className="p-glow" />
        <circle cx="428" cy="92" r="30" className="p-sun" />
        <g className="p-cloud is-a">
          <path d="M104 86 C104 74 118 68 128 74 C132 60 154 56 164 70 C172 62 190 64 192 78 C204 78 210 86 206 92 L108 92 C104 92 102 90 104 86 Z" />
        </g>
        <g className="p-cloud is-b">
          <path d="M500 150 C500 140 512 136 520 141 C525 131 542 130 549 140 C558 136 570 142 568 152 L504 152 C501 152 499 152 500 150 Z" />
        </g>

        {/* Far ranges, fading into the haze. */}
        <path d="M-10 214 C40 196 80 188 120 198 S190 186 230 196 S320 176 360 190 S470 168 520 184 S590 170 610 176 V330 H-10 Z" fill={url('far')} />
        <path d="M-10 250 L44 206 L96 180 L140 156 L176 176 L214 196 L250 226 L290 262 V330 H-10 Z" className="p-mid" />
        <path d="M140 156 L176 176 L214 196 L250 226 L290 262 V330 L200 330 L168 246 Z" className="p-mid-s" />

        <path d={`${RIDGE_L} ${SPINE} L-10 340 Z`} fill={url('lit')} />
        <path d={`M420 88 ${RIDGE_R} L610 340 L500 340 L486 280 L462 214 L436 150 Z`} fill={url('shade')} />
        <path d="M200 178 L250 156 L292 250 L244 296 Z M340 118 L372 106 L394 196 L360 228 Z M70 236 L140 206 L150 282 L96 300 Z" className="p-facet" />
        <path d="M352 114 L372 106 L420 88 L432 134 L422 127 L412 141 L400 126 L386 136 L375 121 L363 127 Z" className="p-snow" />
        <path d="M420 88 L452 108 L476 117 L467 127 L457 121 L447 135 L438 129 L432 134 Z" className="p-snow-s" />
        <rect x="-10" y="262" width={W + 20} height="60" fill={url('mist')} />

        <path d="M-10 312 C60 300 130 306 190 314 S320 302 400 310 S540 318 610 306 V400 H-10 Z" fill={url('meadow')} />
        <path d="M-10 312 C60 300 130 306 190 314 S320 302 400 310 S540 318 610 306" className="p-edge" />
        {/* Nearer ground: a second roll of meadow. */}
        <path d="M-10 368 C90 352 200 376 300 364 S500 348 610 362 V400 H-10 Z" className="p-near" />
        {TREES.map(([tx, ty, th], k) => (
          <g key={k}>
            <path d={fir(tx, ty, th)} className="p-tree" />
            <path d={fir(tx, ty, th, true)} className="p-tree-s" />
          </g>
        ))}
        {/* The enterprise at the foot: a small works with a saw-tooth roof. */}
        <g className="p-works">
          <rect x="66" y="270" width="7" height="22" className="w-chimney" />
          <path d="M30 318 V288 L46 280 V288 L62 280 V288 L78 280 V318 Z" className="w-body" />
          <path d="M30 288 L46 280 V288 Z M46 288 L62 280 V288 Z M62 288 L78 280 V288 Z" className="w-roof" />
          <rect x="36" y="298" width="8" height="7" rx="1" className="w-win" />
          <rect x="50" y="298" width="8" height="7" rx="1" className="w-win" />
          <rect x="64" y="298" width="8" height="7" rx="1" className="w-win" />
        </g>
        {/* The slab the miniature stands on. */}
        <rect x="-10" y="400" width={W + 20} height="20" className="p-slab" />
        <line x1="-10" y1="400.5" x2={W + 10} y2="400.5" className="p-slab-edge" />

        {/* The goal: a flag on the summit. */}
        <line x1="420" y1="89" x2="420" y2="50" className="p-pole" />
        <path d="M420 51 C430 48 438 56 450 52 L450 66 C438 70 430 62 420 65 Z" className="p-flag" />

        {!revealed && legs.length > 0 && (
          <path d={`M${START.join(' ')}${legs.map((s) => ` L${s.x2.toFixed(1)} ${s.y2.toFixed(1)}`).join('')}`} className="p-plan" />
        )}
        {revealed &&
          legs.map((s) => (
            <Fragment key={s.i}>
              <path d={`M${s.x1} ${s.y1} L${s.x2} ${s.y2}`} pathLength={1} data-leg={s.n} className="p-walk is-under" style={{ strokeDashoffset: done ? 0 : 1 }} />
              <path d={`M${s.x1} ${s.y1} L${s.x2} ${s.y2}`} pathLength={1} data-leg={s.n} className="p-walk" stroke={s.color} style={{ strokeDashoffset: done ? 0 : 1 }} />
            </Fragment>
          ))}
        {done && !hit && <line x1={x} y1={y} x2={TARGET[0]} y2={TARGET[1]} className="p-miss" />}

        {/* The climber, feet at the origin, facing right. */}
        <g className={cn('p-man', done && hit && 'is-cheer')} transform={`translate(${START[0]} ${START[1]}) scale(1 1)`}>
          <g transform="scale(1.2)">
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

      <span className="peak-tag is-works" style={at(22, 328)}>
        Предприятие
      </span>
      <span className="peak-tag is-goal" style={at(410, 48)}>
        Развитие производства
      </span>
      {legs.map((s) => (
        <span
          key={`${revealed ? 'r' : 'p'}${s.i}`}
          className="peak-mark"
          style={{
            ...at(s.x2, s.y2),
            '--c': revealed ? s.color : '#3D7BFD',
            animationDelay: revealed && !reduce ? `${s.n * STEP + WALK}s` : undefined,
          } as CSSProperties}
        >
          {s.n + 1}
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
          style={{ animationDelay: `${climbTime(checked.length)}s` }}
        >
          {exact ? 'На вершине: все условия верные' : 'Мимо: красные переходы уводят вниз и в сторону'}
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
