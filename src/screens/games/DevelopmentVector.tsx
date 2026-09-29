import { Fragment, useState } from 'react';
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

function vectorOf(i: number) {
  const rights = CONDITIONS.slice(0, i).filter((c) => c.right).length;
  const wrongs = CONDITIONS.slice(0, i).filter((c) => !c.right).length;
  return CONDITIONS[i].right ? RIGHT_VECTORS[rights] : WRONG_VECTORS[wrongs];
}

function Field({ checked, revealed }: { checked: number[]; revealed: boolean }) {
  const reduce = reducedMotion();
  const chosen = [...checked].sort((a, b) => a - b);
  let [x, y] = START;
  const segments = chosen.map((i, n) => {
    const v = revealed ? vectorOf(i) : NEUTRAL;
    const seg = { i, n, x1: x, y1: y, x2: x + v[0], y2: y + v[1] };
    x = seg.x2;
    y = seg.y2;
    return seg;
  });
  const hit = revealed && Math.hypot(x - TARGET[0], y - TARGET[1]) < 6 && segments.length > 0;
  const t = (n: number) => ({ duration: reduce ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] as const, delay: reduce ? 0 : revealed ? n * 0.35 : 0 });

  return (
    <div className="mgb-field" role="img" aria-label={revealed ? (hit ? 'Стрелка попала в цель' : 'Стрелка прошла мимо цели') : `Выбрано условий: ${checked.length}`}>
      <svg viewBox="0 0 600 400">
        {Array.from({ length: 11 }, (_, i) => (
          <line key={`v${i}`} x1={i * 60} y1="0" x2={i * 60} y2="400" className="f-grid" />
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 60 + 10} x2="600" y2={i * 60 + 10} className="f-grid" />
        ))}
        <g className={cn('f-target', hit && 'is-hit')}>
          <circle cx={TARGET[0]} cy={TARGET[1]} r="46" strokeWidth="1.5" />
          <circle cx={TARGET[0]} cy={TARGET[1]} r="30" strokeWidth="1.5" />
          <circle cx={TARGET[0]} cy={TARGET[1]} r="14" className="bull" />
        </g>
        <text x={TARGET[0]} y={TARGET[1] + 72} textAnchor="middle" className="f-label">
          Развитие производства
        </text>
        <circle cx={START[0]} cy={START[1]} r="7" fill="#fff" />
        <text x={START[0]} y={START[1] + 32} textAnchor="middle" className="f-label">
          Старт
        </text>
        {segments.map((s) => {
          const color = !revealed ? '#9FB4FF' : CONDITIONS[s.i].right ? '#34CF9C' : '#FF5A6E';
          const a = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
          const pt = (px: number, py: number) =>
            `${(s.x2 + px * Math.cos(a) - py * Math.sin(a)).toFixed(2)},${(s.y2 + px * Math.sin(a) + py * Math.cos(a)).toFixed(2)}`;
          const head = `M${pt(6, 0)} L${pt(-12, -8)} L${pt(-12, 8)} Z`;
          return (
            <Fragment key={s.i}>
              <motion.line
                className="f-vec"
                initial={false}
                animate={{ x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, stroke: color }}
                transition={t(s.n)}
              />
              <motion.path className="f-head" initial={false} animate={{ d: head, fill: color }} transition={t(s.n)} />
            </Fragment>
          );
        })}
      </svg>
    </div>
  );
}

export default function DevelopmentVector(props: GameProps) {
  const [checked, setChecked] = useState<number[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const toggle = (i: number) => !revealed && setChecked((current) => (current.includes(i) ? current.filter((item) => item !== i) : [...current, i]));
  const exact = CONDITIONS.every((item, i) => item.right === checked.includes(i));

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
                  <span className={cn('absolute top-1 size-5 rounded-full bg-white shadow transition-[left] duration-200', on ? 'left-6' : 'left-1')} />
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
