import { Fragment, useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { Factory } from 'lucide-react';
import { motion } from 'motion/react';
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

// The field: the start at the bottom left, the target at the top right. Three right conditions add up exactly to it.
const START = [80, 330];
const TARGET = [510, 88];
const D = [TARGET[0] - START[0], TARGET[1] - START[1]];
const L = Math.hypot(D[0], D[1]);
const rot = ([x, y]: number[], deg: number) => {
  const a = (deg * Math.PI) / 180;
  return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
};
const R1 = rot([D[0] / 3, D[1] / 3], -9);
const R2 = rot([D[0] / 3, D[1] / 3], 11);
const R3 = [D[0] - R1[0] - R2[0], D[1] - R1[1] - R2[1]];
const RIGHT_VECTORS = [R1, R2, R3];
const WRONG_VECTORS = [
  [150, 70],
  [-60, 120],
];
// Before the check every chosen condition points straight at the target, so the field gives nothing away.
const NEUTRAL = [D[0] / 3, D[1] / 3];
const INK = { neutral: '#9FB4FF', right: '#34CF9C', wrong: '#FF5A6E' };

function vectorOf(i: number) {
  const rights = CONDITIONS.slice(0, i).filter((c) => c.right).length;
  const wrongs = CONDITIONS.slice(0, i).filter((c) => !c.right).length;
  return CONDITIONS[i].right ? RIGHT_VECTORS[rights] : WRONG_VECTORS[wrongs];
}

// Field units (600 × 400) to a place on the screen, so the HTML marks keep a readable size at any width.
const at = (x: number, y: number) => ({ left: `${(x / 6).toFixed(3)}%`, top: `${(y / 4).toFixed(3)}%` });
// Where the beam is when it passes a point: seen from the target, clockwise from twelve o'clock.
const bearing = (x: number, y: number) => ((Math.atan2(y - TARGET[1], x - TARGET[0]) * 180) / Math.PI + 450) % 360;
// A point on the straight course (0 = start, 1 = target), moved sideways by `side` units.
const along = (k: number, side = 0) => [START[0] + D[0] * k - (D[1] / L) * side, START[1] + D[1] * k + (D[0] / L) * side];
const SWEEP_S = 6;
const TICKS = Array.from({ length: 31 }, (_, i) => i * 20);
const BEZEL = Array.from({ length: 36 }, (_, i) => i * 10);

// The radar beam turns around the target and a mark lights up as the beam passes it. One loop drives both and it
// sleeps while the field is off screen. With reduced motion the beam stands still just past the start.
function useSweep() {
  const screen = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = screen.current;
    if (!node) return;
    if (reducedMotion()) {
      node.style.setProperty('--sweep', `${bearing(START[0], START[1]) + 25}deg`);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const a = ((((now - t0) / 1000) % SWEEP_S) / SWEEP_S) * 360;
      node.style.setProperty('--sweep', `${a.toFixed(2)}deg`);
      node.querySelectorAll<HTMLElement>('[data-bearing]').forEach((mark) => {
        const behind = (a - Number(mark.dataset.bearing) + 360) % 360;
        mark.style.setProperty('--ping', behind < 110 ? ((1 - behind / 110) ** 2).toFixed(3) : '0');
      });
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(raf);
      if (entry.isIntersecting) raf = requestAnimationFrame(tick);
    });
    io.observe(node);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);
  return screen;
}

function Field({ checked, revealed }: { checked: number[]; revealed: boolean }) {
  const reduce = reducedMotion();
  const screen = useSweep();
  const uid = useId().replace(/:/g, '');
  const chosen = [...checked].sort((a, b) => a - b);
  let [x, y] = START;
  const segments = chosen.map((i, n) => {
    const v = revealed ? vectorOf(i) : NEUTRAL;
    const color = !revealed ? INK.neutral : CONDITIONS[i].right ? INK.right : INK.wrong;
    const seg = { i, n, x1: x, y1: y, x2: x + v[0], y2: y + v[1], color };
    x = seg.x2;
    y = seg.y2;
    return seg;
  });
  const miss = Math.hypot(x - TARGET[0], y - TARGET[1]);
  const hit = revealed && miss < 6 && segments.length > 0;
  const left = hit ? 0 : miss / L;
  const over = !revealed && segments.length > 3;
  // After the check the legs turn one by one; the readouts and the effects wait until the route has settled.
  const settle = reduce || !revealed ? 0 : segments.length * 0.35 + 0.7;
  const t = (n: number) => ({ duration: reduce ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] as const, delay: reduce ? 0 : revealed ? n * 0.35 : 0 });
  const route = `M${START.join(' ')}${segments.map((s) => ` L${s.x2.toFixed(1)} ${s.y2.toFixed(1)}`).join('')}`;
  const state = revealed
    ? hit
      ? { text: 'В цели', tone: 'ok' }
      : { text: 'Мимо цели', tone: 'bad' }
    : segments.length === 0
      ? { text: 'Курс не задан', tone: '' }
      : { text: 'Курс проложен', tone: '' };
  // The miss: from the end of the route to the target's outer rim.
  const [mx, my] = [TARGET[0] + ((x - TARGET[0]) / (miss || 1)) * 34, TARGET[1] + ((y - TARGET[1]) / (miss || 1)) * 34];

  return (
    <div
      className={cn('mgb-nav', revealed && (hit ? 'is-hit' : 'is-miss'))}
      role="img"
      aria-label={revealed ? (hit ? 'Курс привёл в цель' : 'Курс прошёл мимо цели') : `Выбрано условий: ${checked.length}`}
      style={{ '--settle': `${settle}s` } as CSSProperties}
    >
      <div className="nav-bar" aria-hidden="true">
        <span className="nav-title">
          <i />
          Курс субсидии
        </span>
        <span className="nav-pips">
          {CONDITIONS.map((_, n) => {
            const s = segments[n];
            return <i key={n} style={s ? { background: s.color, boxShadow: `0 0 0.5rem ${s.color}` } : undefined} />;
          })}
        </span>
      </div>

      <div ref={screen} className="nav-screen" aria-hidden="true">
        <div className="nav-sweep" style={at(TARGET[0], TARGET[1])} />
        <svg viewBox="0 0 600 400">
          <defs>
            <pattern id={`${uid}d`} width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1.1" className="f-dot" />
            </pattern>
            <radialGradient id={`${uid}g`}>
              <stop offset="0" stopColor="#34CF9C" stopOpacity="0.3" />
              <stop offset="1" stopColor="#34CF9C" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="600" height="400" fill={`url(#${uid}d)`} />
          {[100, 200, 300, 400, 500].map((v) => (
            <line key={`v${v}`} x1={v} y1="0" x2={v} y2="400" className="f-major" />
          ))}
          {[100, 200, 300].map((v) => (
            <line key={`h${v}`} x1="0" y1={v} x2="600" y2={v} className="f-major" />
          ))}
          {TICKS.map((v) => {
            const len = v % 100 === 0 ? 10 : 5;
            return (
              <Fragment key={v}>
                <line x1={v} y1="0" x2={v} y2={len} className="f-tick" />
                <line x1={v} y1={400 - len} x2={v} y2="400" className="f-tick" />
                {v <= 400 && <line x1="0" y1={v} x2={len} y2={v} className="f-tick" />}
                {v <= 400 && <line x1={600 - len} y1={v} x2="600" y2={v} className="f-tick" />}
              </Fragment>
            );
          })}
          {/* Range rings: one, two and three right steps away from the target. */}
          {[1, 2, 3].map((k) => (
            <circle key={k} cx={TARGET[0]} cy={TARGET[1]} r={(L * k) / 3} className="f-ring" />
          ))}
          {/* The straight course, marked at every third. */}
          <line x1={along(0.04)[0]} y1={along(0.04)[1]} x2={along(0.925)[0]} y2={along(0.925)[1]} className="f-course" />
          {[1 / 3, 2 / 3].map((k) => (
            <line key={k} x1={along(k, -8)[0]} y1={along(k, -8)[1]} x2={along(k, 8)[0]} y2={along(k, 8)[1]} className="f-third" />
          ))}

          <g className="f-target">
            <circle cx={TARGET[0]} cy={TARGET[1]} r="66" fill={`url(#${uid}g)`} />
            {BEZEL.map((deg) => {
              const a = (deg * Math.PI) / 180;
              const r0 = deg % 30 === 0 ? 41 : 45;
              return (
                <line
                  key={deg}
                  x1={TARGET[0] + Math.cos(a) * r0}
                  y1={TARGET[1] + Math.sin(a) * r0}
                  x2={TARGET[0] + Math.cos(a) * 49}
                  y2={TARGET[1] + Math.sin(a) * 49}
                  className="f-bezel"
                />
              );
            })}
            <circle cx={TARGET[0]} cy={TARGET[1]} r="32" className="f-rim" />
            <circle cx={TARGET[0]} cy={TARGET[1]} r="19" className="f-rim" />
            <circle cx={TARGET[0]} cy={TARGET[1]} r="9" className="f-bull" />
            {hit &&
              [0, 1].map((k) => (
                <circle key={k} cx={TARGET[0]} cy={TARGET[1]} r="19" className="f-ripple" style={{ animationDelay: `calc(var(--settle) + ${k * 1.3}s)` }} />
              ))}
          </g>

          {segments.map((s) => {
            const a = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
            const [cx, cy] = [(s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2];
            const pt = (px: number, py: number) =>
              `${(cx + px * Math.cos(a) - py * Math.sin(a)).toFixed(2)},${(cy + px * Math.sin(a) + py * Math.cos(a)).toFixed(2)}`;
            const chevron = `M${pt(-5, -7)} L${pt(3, 0)} L${pt(-5, 7)}`;
            const from = { x1: s.x1, y1: s.y1, x2: s.x1, y2: s.y1 };
            const to = { x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, stroke: s.color };
            return (
              <Fragment key={s.i}>
                <motion.line className="f-glow" initial={from} animate={to} transition={t(s.n)} />
                <motion.line className="f-vec" initial={from} animate={to} transition={t(s.n)} />
                <motion.path className="f-chev" initial={{ d: chevron, opacity: 0 }} animate={{ d: chevron, opacity: 1 }} transition={t(s.n)} />
              </Fragment>
            );
          })}
          {revealed && !hit && segments.length > 0 && <line x1={x} y1={y} x2={mx} y2={my} className="f-miss" />}
          {revealed && segments.length > 0 && <path key={route} d={route} pathLength={1} className="f-comet" />}
        </svg>

        <span className="nav-start" data-bearing={bearing(START[0], START[1]).toFixed(1)} style={at(START[0], START[1])} />
        <span className="nav-tag" style={at(START[0], START[1] + 20)}>
          <Factory aria-hidden="true" />
          Предприятие
        </span>
        <span className="nav-tag is-target" style={at(TARGET[0], TARGET[1] + 54)}>
          Развитие производства
        </span>
        {segments.map((s) => (
          <motion.span
            key={s.i}
            className="nav-node"
            data-bearing={bearing(s.x2, s.y2).toFixed(1)}
            initial={{ ...at(s.x1, s.y1), scale: 0.4, opacity: 0 }}
            animate={{ ...at(s.x2, s.y2), scale: 1, opacity: 1 }}
            transition={t(s.n)}
            style={{ '--c': s.color } as CSSProperties}
          >
            {s.n + 1}
          </motion.span>
        ))}
      </div>

      <div className="nav-foot" aria-hidden="true">
        <span className="nav-read">
          <small>{over ? 'Перелёт' : 'До цели'}</small>
          {Math.round(left * 100)}
          <span>%</span>
        </span>
        <span className="nav-meter">
          <i className={cn(over && 'is-over')} style={{ width: `${over ? 100 : Math.max(0, 1 - left) * 100}%` }} />
        </span>
        <span className={cn('nav-state', state.tone && `is-${state.tone}`)}>{state.text}</span>
      </div>
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
        <p aria-live="polite" className={cn('m-0 mt-3 text-center text-[1rem] font-semibold lg:text-[1.125rem]', exact ? 'text-ok-ink' : 'text-accent')}>
          {exact ? 'В цель: все условия верные' : 'Мимо: красные отрезки уводят в сторону'}
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
