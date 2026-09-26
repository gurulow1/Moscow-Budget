import { useState, type ReactNode } from 'react';
import { Calculator, Check, ChevronRight, Landmark, Lock, Target, type LucideIcon } from 'lucide-react';
import { cn, plural } from '../lib/utils';
import {
  GAMES,
  MAP_ITEM,
  MAYOR_DISTRICTS,
  PILOT_POINTS_PER_ANSWER,
  QUIZZES,
  QUIZ_PREREQUISITE,
  SPECIALS,
  liveStreak,
  readDistrictBadges,
  routeSteps,
  todayEntry,
  type CityRewardLedger,
  type Difficulty,
  type QuestItem,
} from '../data/quests';

interface QuestsScreenProps {
  calculatorDone: boolean;
  completedActivities: string[];
  ledger: CityRewardLedger;
  onOpen: (flow: string) => void;
  tourClassName?: string;
}

type Kind = 'quizzes' | 'games' | 'specials';

const KINDS: { id: Kind; label: string }[] = [
  { id: 'quizzes', label: 'Викторины' },
  { id: 'games', label: 'Мини-игры' },
  { id: 'specials', label: 'Спецпроекты' },
];

const DIFFICULTY_DOT: Record<Difficulty, string> = { Лёгкий: 'bg-c3', Средний: 'bg-c4', Сложный: 'bg-accent' };

const PILL = 'inline-flex h-11 shrink-0 items-center rounded-full bg-accent-fill px-[1.125rem] text-[0.9375rem] font-semibold text-white no-underline shadow-[0_10px_20px_-14px_var(--mgb-accent)]';
const ROW = 'flex min-h-[4.75rem] w-full items-center gap-3 px-5 py-3.5 text-left text-ink lg:px-6';

function IconTile({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-[0.875rem] bg-accent-soft text-accent">
      <Icon size={24} strokeWidth={1.8} />
    </span>
  );
}

function Done() {
  return (
    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ok-soft text-ok-ink">
      <Check size={15} strokeWidth={3} aria-hidden="true" />
      <span className="sr-only">пройдено</span>
    </span>
  );
}

const Reward = ({ points }: { points: number }) => <span className="shrink-0 text-[0.9375rem] font-semibold">+{points}</span>;

function Row({ title, meta, right, onClick, disabled }: { title: string; meta: ReactNode; right: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cn(ROW, disabled && 'cursor-default')}>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className={cn('text-[1rem] font-semibold leading-[1.35] tracking-[-0.01em]', disabled && 'text-ink-3')}>{title}</span>
        <span className={cn('flex items-center gap-1.5 text-[0.8125rem] leading-snug', disabled ? 'text-ink-3' : 'text-ink-2')}>{meta}</span>
      </span>
      {right}
    </button>
  );
}

const Divider = () => <div aria-hidden="true" className="mx-5 h-px bg-line lg:mx-6" />;

export default function QuestsScreen({ calculatorDone, completedActivities, ledger, onOpen, tourClassName }: QuestsScreenProps) {
  const [kind, setKind] = useState<Kind>('quizzes');
  const done = (id: string) => completedActivities.includes(id);

  const streak = liveStreak(ledger);
  const today = todayEntry(ledger);

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

  const itemRow = (item: QuestItem, right?: ReactNode) => (
    <Row
      title={item.title}
      meta={item.text}
      onClick={() => onOpen(item.id)}
      right={right ?? (done(item.id) ? <Done /> : item.reward ? <Reward points={item.reward} /> : null)}
    />
  );

  const lists: Record<Kind, ReactNode[]> = {
    quizzes: QUIZZES.map((quiz) => {
      const after = QUIZ_PREREQUISITE[quiz.id];
      if (after && !done(after)) {
        const title = QUIZZES.find((item) => item.id === after)?.title;
        return (
          <Row
            title={quiz.title}
            meta={`Откроется после «${title}»`}
            disabled
            right={<Lock size={16} strokeWidth={2} aria-label="Закрыто" className="shrink-0 text-ink-3" />}
          />
        );
      }
      return (
        <Row
          title={quiz.title}
          onClick={() => onOpen(quiz.id)}
          meta={
            <>
              <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', DIFFICULTY_DOT[quiz.difficulty])} />
              {quiz.difficulty} · {quiz.questions.length} вопроса · 2 мин
            </>
          }
          right={done(quiz.id) ? <Done /> : <Reward points={quiz.reward} />}
        />
      );
    }),
    games: [
      <Row
        title="Виртуальный мэр"
        meta="Распределите бюджет района и проведите заседание"
        onClick={() => onOpen('mayor')}
        right={
          <span className="shrink-0 whitespace-nowrap text-[0.8125rem] text-ink-3">
            {badges} из {MAYOR_DISTRICTS.length}
            <span className="sr-only"> знаков районов</span>
          </span>
        }
      />,
      ...GAMES.map((game) => itemRow(game)),
      itemRow(MAP_ITEM, <ChevronRight size={18} strokeWidth={2} aria-hidden="true" className="shrink-0 text-ink-3" />),
    ],
    specials: SPECIALS.map((item) => itemRow(item)),
  };

  return (
    <div className={cn('grid gap-3 px-4 pt-4 transition-opacity duration-200 lg:gap-5 lg:px-0 lg:pt-7', tourClassName)}>
      <div className="grid gap-3 lg:grid-cols-2 lg:gap-5">
        {/* With the large font of the low-vision mode the button moves under the text. */}
        <section className="mgb-card flex flex-wrap items-center gap-3.5 px-5 py-[1.125rem] lg:gap-5 lg:px-7 lg:py-7" aria-labelledby="daily-quiz-title">
          <div className="min-w-[12rem] flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="daily-quiz-title" className="m-0 text-[1.125rem] font-semibold leading-snug tracking-[-0.01em] lg:text-[1.5rem]">
                Квиз дня
              </h2>
              {streak > 0 && (
                <span className="rounded-full bg-streak-bg px-[0.5625rem] py-[0.3125rem] text-[0.75rem] font-semibold leading-none text-streak-ink">
                  серия {streak} {plural(streak, ['день', 'дня', 'дней'])}
                </span>
              )}
            </div>
            <p className="m-0 mt-1 text-[0.9375rem] leading-snug text-ink-2 [text-wrap:pretty] lg:mt-2 lg:text-[1.0625rem]">
              {today
                ? `Сегодня ${today.correctAnswers} из 3 верных${today.points > 0 ? ` · +${today.points}\u00A0${plural(today.points, ['балл', 'балла', 'баллов'])}` : ''}`
                : `3 вопроса · ${PILOT_POINTS_PER_ANSWER}\u00A0баллов за верный ответ`}
            </p>
          </div>
          <button type="button" onClick={() => onOpen('daily')} className={PILL}>
            {today ? 'Ещё раз' : 'Начать'}
          </button>
        </section>

        <section className="mgb-card px-5 py-[1.125rem] lg:px-7 lg:py-6" aria-labelledby="route-title">
          <div className="flex items-baseline justify-between gap-2.5">
            <h2 id="route-title" className="m-0 text-[0.875rem] font-normal text-ink-2">
              Ваш маршрут
            </h2>
            <span className="text-[0.875rem] text-ink-3">{nowIndex < 0 ? 'пройден' : `шаг ${nowIndex + 1} из ${steps.length}`}</span>
          </div>
          <ol className="relative m-0 mt-3 grid list-none grid-cols-3 p-0">
            <span aria-hidden="true" className="absolute left-[16.67%] right-[16.67%] top-[0.6875rem] h-0.5 bg-track" />
            {steps.slice(0, -1).map((step, i) =>
              step.done && (steps[i + 1].done || i + 1 === nowIndex) ? (
                <span key={step.id} aria-hidden="true" className="absolute top-[0.6875rem] h-0.5 w-[33.33%] bg-c3" style={{ left: `${16.67 + 33.33 * i}%` }} />
              ) : null,
            )}
            {steps.map((step, i) => (
              <li key={step.id} className="relative grid justify-items-center gap-1.5 leading-snug" aria-current={i === nowIndex ? 'step' : undefined}>
                {step.done ? (
                  <span className="grid size-6 place-items-center rounded-full bg-c3 text-white">
                    <Check size={14} strokeWidth={3} aria-hidden="true" />
                  </span>
                ) : i === nowIndex ? (
                  <span className="grid size-6 place-items-center rounded-full border-2 border-accent bg-card">
                    <span className="size-2 rounded-full bg-accent" />
                  </span>
                ) : (
                  <span className="size-6 rounded-full border-2 border-track bg-card" />
                )}
                <span className={cn('text-[0.8125rem]', step.done ? 'text-ink-2' : i === nowIndex ? 'font-semibold text-ink' : 'text-ink-3')}>
                  {step.label}
                  {step.done && <span className="sr-only"> — пройден</span>}
                </span>
              </li>
            ))}
          </ol>
          {next ? (
            <div className="mt-3.5 flex items-center gap-3 border-t border-line pt-3.5">
              <IconTile icon={next.icon} />
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[0.8125rem] text-ink-3">Следующий шаг</p>
                <p className="m-0 text-[1.0625rem] font-semibold leading-snug tracking-[-0.01em]">{next.title}</p>
              </div>
              {next.action}
            </div>
          ) : (
            <p className="m-0 mt-3.5 border-t border-line pt-3.5 text-[0.9375rem] leading-snug text-ink-2">
              Все три шага пройдены. Примите решения в других районах и проверьте себя в оставшихся викторинах.
            </p>
          )}
        </section>
      </div>

      <div className="grid gap-3">
        {/* The phone switches between the three lists; a wide screen shows them side by side. */}
        <div role="group" aria-label="Тип заданий" className="flex rounded-2xl bg-track p-[3px] lg:hidden">
          {KINDS.map((item) => {
            const on = item.id === kind;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={on}
                onClick={() => setKind(item.id)}
                className={cn(
                  'h-[2.625rem] flex-1 rounded-[0.8125rem] text-[0.875rem] font-semibold transition-colors duration-200',
                  on ? 'bg-card text-ink shadow-[var(--mgb-seg-shadow)]' : 'text-ink-2',
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="grid gap-3 lg:grid-cols-2 lg:items-start lg:gap-5 xl:grid-cols-3">
          {KINDS.map((item) => (
            <section
              key={item.id}
              className={cn('mgb-card', item.id !== kind && 'hidden lg:block')}
              aria-labelledby={`quests-${item.id}-title`}
            >
              <h2 id={`quests-${item.id}-title`} className="m-0 hidden px-6 pb-1 pt-5 text-[1.125rem] font-semibold leading-snug tracking-[-0.01em] lg:block">
                {item.label}
              </h2>
              {lists[item.id].map((row, i) => (
                <div key={i}>
                  {i > 0 && <Divider />}
                  {row}
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
