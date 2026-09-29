import { Fragment, useState, type CSSProperties, type ReactNode } from 'react';
import { Calculator, Check, Landmark, Lock, Target, type LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  GAMES,
  MAP_ITEM,
  MAYOR_DISTRICTS,
  QUIZZES,
  QUIZ_PREREQUISITE,
  SPECIALS,
  readDistrictBadges,
  routeSteps,
  type CityRewardLedger,
  type Difficulty,
  type QuestItem,
} from '../data/quests';
import DailyQuizBoard from '../ui/exhibits/DailyQuizBoard';

interface QuestsScreenProps {
  calculatorDone: boolean;
  completedActivities: string[];
  ledger: CityRewardLedger;
  onOpen: (flow: string) => void;
  tourClassName?: string;
}

type Kind = 'quizzes' | 'games' | 'specials';

// Each kind of task is a line on a transit map: its own colour, the tasks are its stations.
const LINES: { id: Kind; label: string; color: string }[] = [
  { id: 'quizzes', label: 'Викторины', color: 'var(--mgb-c2)' },
  { id: 'games', label: 'Мини-игры', color: 'var(--mgb-c1)' },
  { id: 'specials', label: 'Спецпроекты', color: 'var(--mgb-c3)' },
];

const ROUTE_HINT: Record<string, string> = { calc: 'налоговый вычет', mayor: 'виртуальный мэр', quiz: 'любая викторина' };

const DIFFICULTY_DOT: Record<Difficulty, string> = { Лёгкий: 'bg-c3', Средний: 'bg-c4', Сложный: 'bg-accent' };

const PILL = 'mgb-cta inline-flex h-11 shrink-0 items-center rounded-full px-[1.125rem] text-[0.9375rem] font-semibold no-underline';

type StopState = 'done' | 'open' | 'locked';

interface Stop {
  id: string;
  title: string;
  meta: ReactNode;
  state: StopState;
  right?: ReactNode;
  onClick?: () => void;
}

function IconTile({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-[0.875rem] bg-accent-soft text-accent">
      <Icon size={24} strokeWidth={1.8} />
    </span>
  );
}

const Reward = ({ points }: { points: number }) => (
  <span className="shrink-0 rounded-full bg-track px-2.5 py-1 text-[0.8125rem] font-semibold leading-none text-ink">+{points}</span>
);

// One line: the stations sit on a thick coloured line; a passed station is filled, a closed one is hollow and grey.
function Line({ label, color, stops, hidden }: { label: string; color: string; stops: Stop[]; hidden?: boolean }) {
  const passed = stops.filter((stop) => stop.state === 'done').length;
  return (
    <section className={cn('mgb-card pb-2', hidden && 'hidden lg:block')} style={{ '--line': color } as CSSProperties} aria-label={label}>
      <header className="flex items-center gap-3 px-5 pb-2 pt-5 lg:px-6">
        <span aria-hidden="true" className="mgb-line-badge">
          {stops.length}
        </span>
        <h2 className="m-0 flex-1 text-[1.125rem] font-semibold leading-snug tracking-[-0.01em] lg:text-[1.25rem]">{label}</h2>
        <span className="text-[0.8125rem] text-ink-3 lg:text-[0.875rem]">
          {passed} из {stops.length}
        </span>
      </header>
      <ol className="mgb-line m-0 list-none p-0">
        {stops.map((stop) => (
          <li key={stop.id} data-state={stop.state}>
            <button
              type="button"
              onClick={stop.onClick}
              disabled={stop.state === 'locked'}
              className={cn('mgb-bare flex min-h-[4.5rem] w-full items-center gap-4 py-3 pl-5 pr-5 text-left text-ink lg:pl-6', stop.state === 'locked' && 'cursor-default')}
            >
              <span aria-hidden="true" className="mgb-stop">
                {stop.state === 'done' && <Check size={12} strokeWidth={3.4} />}
              </span>
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className={cn('text-[1rem] font-semibold leading-[1.3] tracking-[-0.01em]', stop.state === 'locked' && 'text-ink-3')}>
                  {stop.title}
                </span>
                <span className={cn('flex items-center gap-1.5 text-[0.8125rem] leading-snug', stop.state === 'locked' ? 'text-ink-3' : 'text-ink-2')}>
                  {stop.meta}
                </span>
              </span>
              {stop.state === 'done' ? <span className="sr-only">пройдено</span> : stop.right}
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function QuestsScreen({ calculatorDone, completedActivities, ledger, onOpen, tourClassName }: QuestsScreenProps) {
  const [kind, setKind] = useState<Kind>('quizzes');
  const done = (id: string) => completedActivities.includes(id);

  const steps = routeSteps(calculatorDone, completedActivities);
  const nowIndex = steps.findIndex((step) => !step.done);
  const firstQuiz = QUIZZES.find((quiz) => !done(quiz.id) && (!QUIZ_PREREQUISITE[quiz.id] || done(QUIZ_PREREQUISITE[quiz.id])));
  const next =
    nowIndex === 0
      ? { icon: Calculator, title: 'Налоговый вычет', action: <a href="#calc" className={PILL}>Открыть</a> }
      : nowIndex === 1
        ? { icon: Landmark, title: 'Виртуальный мэр', action: <button type="button" onClick={() => onOpen('mayor')} className={PILL}>Играть</button> }
        : nowIndex === 2 && firstQuiz
          ? { icon: Target, title: firstQuiz.title, action: <button type="button" onClick={() => onOpen(firstQuiz.id)} className={PILL}>Начать</button> }
          : null;

  const badges = readDistrictBadges().length;

  const itemStop = (item: QuestItem, right?: ReactNode): Stop => ({
    id: item.id,
    title: item.title,
    meta: item.text,
    state: done(item.id) ? 'done' : 'open',
    right: right ?? (item.reward ? <Reward points={item.reward} /> : null),
    onClick: () => onOpen(item.id),
  });

  const stops: Record<Kind, Stop[]> = {
    quizzes: QUIZZES.map((quiz) => {
      const after = QUIZ_PREREQUISITE[quiz.id];
      if (after && !done(after)) {
        const title = QUIZZES.find((item) => item.id === after)?.title;
        return {
          id: quiz.id,
          title: quiz.title,
          meta: `Откроется после «${title}»`,
          state: 'locked',
          right: <Lock size={16} strokeWidth={2} aria-label="Закрыто" className="shrink-0 text-ink-3" />,
        };
      }
      return {
        id: quiz.id,
        title: quiz.title,
        meta: (
          <>
            <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', DIFFICULTY_DOT[quiz.difficulty])} />
            {quiz.difficulty} · {quiz.questions.length} вопроса · 2 мин
          </>
        ),
        state: done(quiz.id) ? 'done' : 'open',
        right: <Reward points={quiz.reward} />,
        onClick: () => onOpen(quiz.id),
      };
    }),
    games: [
      {
        id: 'mayor',
        title: 'Виртуальный мэр',
        meta: 'Распределите бюджет района и проведите заседание',
        state: badges >= MAYOR_DISTRICTS.length ? 'done' : 'open',
        right: (
          <span className="shrink-0 whitespace-nowrap text-[0.8125rem] text-ink-3">
            {badges} из {MAYOR_DISTRICTS.length}
            <span className="sr-only"> знаков районов</span>
          </span>
        ),
        onClick: () => onOpen('mayor'),
      },
      ...GAMES.map((game) => itemStop(game)),
      { ...itemStop(MAP_ITEM, <span className="shrink-0 text-[0.8125rem] font-semibold text-ink-2">Карта</span>), state: 'open' },
    ],
    specials: SPECIALS.map((item) => itemStop(item)),
  };

  return (
    <div className={cn('grid grid-cols-1 gap-3 px-4 pt-4 transition-opacity duration-200 lg:gap-5 lg:px-0 lg:pt-7', tourClassName)}>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-5">
        <DailyQuizBoard ledger={ledger} onStart={() => onOpen('daily')} />

        <section className="mgb-card flex flex-col px-5 py-[1.125rem] lg:px-7 lg:py-7" aria-labelledby="route-title">
          <div className="flex items-baseline justify-between gap-2.5">
            <h2 id="route-title" className="m-0 text-[1.125rem] font-semibold tracking-[-0.01em] lg:text-[1.5rem]">
              Ваш маршрут
            </h2>
            <span className="text-[0.875rem] text-ink-3 lg:text-[1rem]">{nowIndex < 0 ? 'пройден' : `шаг ${nowIndex + 1} из ${steps.length}`}</span>
          </div>
          <ol className="mgb-route relative m-0 mt-5 grid list-none grid-cols-3 p-0 lg:mt-8">
            <span aria-hidden="true" className="mgb-route-track" />
            {steps.slice(0, -1).map((step, i) =>
              step.done && (steps[i + 1].done || i + 1 === nowIndex) ? (
                <span key={step.id} aria-hidden="true" className="mgb-route-done" style={{ left: `${16.67 + 33.33 * i}%` }} />
              ) : null,
            )}
            {steps.map((step, i) => (
              <li key={step.id} className="relative grid justify-items-center gap-2 leading-snug" aria-current={i === nowIndex ? 'step' : undefined}>
                <span aria-hidden="true" className="mgb-route-stop" data-state={step.done ? 'done' : i === nowIndex ? 'now' : 'next'}>
                  {step.done && <Check size={15} strokeWidth={3.2} />}
                </span>
                <span className={cn('text-center text-[0.8125rem] lg:text-[0.9375rem]', step.done ? 'text-ink-2' : i === nowIndex ? 'font-semibold text-ink' : 'text-ink-3')}>
                  {step.label}
                  {step.done && <span className="sr-only"> — пройден</span>}
                  <span className="mt-0.5 hidden text-[0.8125rem] font-normal text-ink-3 lg:block">{ROUTE_HINT[step.id]}</span>
                </span>
              </li>
            ))}
          </ol>
          <span aria-hidden="true" className="block h-4 lg:h-auto lg:min-h-6 lg:flex-1" />
          {next ? (
            <div className="flex items-center gap-3 border-t border-line pt-4">
              <IconTile icon={next.icon} />
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[0.8125rem] text-ink-3">Следующий шаг</p>
                <p className="m-0 text-[1.0625rem] font-semibold leading-snug tracking-[-0.01em]">{next.title}</p>
              </div>
              {next.action}
            </div>
          ) : (
            <p className="m-0 border-t border-line pt-4 text-[0.9375rem] leading-snug text-ink-2">
              Все три шага пройдены. Примите решения в других районах и проверьте себя в оставшихся викторинах.
            </p>
          )}
        </section>
      </div>

      <div className="grid gap-3">
        {/* The phone switches between the three lines; a wide screen shows them side by side. */}
        <div role="group" aria-label="Тип заданий" className="flex rounded-2xl bg-track p-[3px] lg:hidden">
          {LINES.map((line) => {
            const on = line.id === kind;
            return (
              <button
                key={line.id}
                type="button"
                aria-pressed={on}
                onClick={() => setKind(line.id)}
                className={cn(
                  'flex h-[2.625rem] flex-1 items-center justify-center gap-1.5 rounded-[0.8125rem] text-[0.875rem] font-semibold transition-colors duration-200',
                  on ? 'bg-card text-ink shadow-[var(--mgb-seg-shadow)]' : 'text-ink-2',
                )}
              >
                <span aria-hidden="true" className="size-2 rounded-full" style={{ background: line.color }} />
                {line.label}
              </button>
            );
          })}
        </div>

        <div className="grid gap-3 lg:grid-cols-2 lg:items-start lg:gap-5 xl:grid-cols-3">
          {LINES.map((line) => (
            <Fragment key={line.id}>
              <Line label={line.label} color={line.color} stops={stops[line.id]} hidden={line.id !== kind} />
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
