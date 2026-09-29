import { useEffect, useState, type CSSProperties } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { BUDGET_FACTS } from '../../data/budgetFacts';
import { sourceLink } from '../../data/quests';
import { cn } from '../../lib/utils';
import { BottomAction } from '../../ui/Flow';
import { reducedMotion } from '../../ui/exhibits/useEntrance';
import AnswerCards from '../quiz/AnswerCards';
import { GamePage, GameResult, finish, type GameProps, type Outcome } from './GameKit';
import './games.css';

const NB = ' ';
const bn = (value: number) => `${value.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}${NB}млрд${NB}₽`;
const figure = (value: number) => value.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// Three sections as stories: a big figure on the direction's colour, waves running under it.
const STORIES = [
  {
    id: 'health',
    title: 'Здравоохранение',
    color: 'var(--mgb-c4)',
    value: BUDGET_FACTS.healthcare.amountBillion,
    text: 'Без учёта оплаты медицинской помощи из Фонда ОМС. Это поликлиники, больницы и цифровая медицина (ЕМИАС).',
  },
  {
    id: 'transport',
    title: 'Транспорт',
    color: 'var(--mgb-c1)',
    value: BUDGET_FACTS.transport.amountBillion,
    text: 'Строятся и продлеваются линии метро, город закупает электробусы и трамваи, развивает МЦД.',
  },
  {
    id: 'education',
    title: 'Образование',
    color: 'var(--mgb-c2)',
    value: BUDGET_FACTS.education.amountBillion,
    text: 'Школы переходят на единый московский стандарт, работает «Московская электронная школа» (МЭШ).',
  },
];

const QUESTION = {
  text: 'Какая программа получит больше всего денег в 2026 году?',
  options: ['Развитие транспортной системы', 'Развитие городской среды', 'Спорт Москвы'],
  right: 0,
};

const DWELL = 6000;

export default function AnalyticSurfing(props: GameProps) {
  const [index, setIndex] = useState(0);
  const [read, setRead] = useState<string[]>([STORIES[0].id]);
  const [asking, setAsking] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const allRead = read.length === STORIES.length;
  const source = sourceLink('openBudget2026');
  const story = STORIES[index];

  const go = (next: number) => {
    const i = Math.min(STORIES.length - 1, Math.max(0, next));
    setIndex(i);
    setRead((current) => (current.includes(STORIES[i].id) ? current : [...current, STORIES[i].id]));
  };

  // Like stories: each one moves on by itself after a few seconds, unless motion is reduced.
  useEffect(() => {
    if (asking || reducedMotion() || index === STORIES.length - 1) return;
    const timer = window.setTimeout(() => go(index + 1), DWELL);
    return () => window.clearTimeout(timer);
  }, [index, asking]);

  if (outcome) {
    return (
      <GameResult
        {...props}
        outcome={outcome}
        title={outcome.win ? 'Верно' : 'Неверно'}
        message={`Транспорт — крупнейшая программа бюджета: ${bn(BUDGET_FACTS.transport.amountBillion)}. Городская среда — ${bn(BUDGET_FACTS.urbanEnvironment.amountBillion)}, спорт — ${bn(BUDGET_FACTS.sport.amountBillion)}.`}
        onRetry={() => {
          setPicked(null);
          setOutcome(null);
        }}
        retryLabel={outcome.win ? 'Ответить ещё раз' : undefined}
      />
    );
  }

  if (asking) {
    return (
      <GamePage
        item={props.item}
        onClose={props.onClose}
        headline={QUESTION.text}
        task="Контрольный вопрос по разделам, которые вы прочитали."
        side={
          <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-[0.8125rem] text-ink-3 underline underline-offset-[3px] lg:text-[0.875rem]">
            {source.label} · проверено {source.checked} ↗
          </a>
        }
      >
        <AnswerCards options={QUESTION.options} picked={picked} correct={QUESTION.right} onPick={setPicked} reduce={reducedMotion()} />
        <BottomAction
          label={picked === null ? 'Выберите ответ' : 'Показать итог'}
          disabled={picked === null}
          onClick={() => setOutcome(finish(props, picked === QUESTION.right))}
        />
      </GamePage>
    );
  }

  return (
    <GamePage
      item={props.item}
      onClose={props.onClose}
      headline="Пролистайте три раздела бюджета"
      task="Крупнейшие направления 2026 года — по одному на экран. Потом один вопрос."
      side={
        <ol className="m-0 grid list-none gap-1.5 p-0">
          {STORIES.map((item, i) => {
            const done = read.includes(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => go(i)}
                  aria-current={i === index ? 'step' : undefined}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-ink transition-colors duration-200',
                    i === index ? 'bg-card shadow-[var(--mgb-seg-shadow)]' : 'bg-transparent',
                  )}
                >
                  <span aria-hidden="true" className="size-3 shrink-0 rounded-full" style={{ background: item.color }} />
                  <span className="flex-1 text-[1rem] font-semibold">{item.title}</span>
                  <span className="text-[0.875rem] text-ink-3">{bn(item.value)}</span>
                  <span className={cn('grid size-6 shrink-0 place-items-center rounded-full', done ? 'bg-ok-soft text-ok-ink' : 'bg-track')}>
                    {done && <Check size={13} strokeWidth={3} aria-hidden="true" />}
                    <span className="sr-only">{done ? 'прочитано' : 'не прочитано'}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      }
    >
      <section
        className="mgb-story"
        style={{ '--c': story.color } as CSSProperties}
        aria-roledescription="история"
        aria-label={`${story.title}, ${index + 1} из ${STORIES.length}`}
      >
        <div className="s-bars" aria-hidden="true">
          {STORIES.map((item, i) => (
            <span key={item.id} className={cn(i < index && 'is-done', i === index && (index === STORIES.length - 1 || reducedMotion() ? 'is-done' : 'is-now'))}>
              <i key={i === index ? `now-${index}` : 'x'} />
            </span>
          ))}
        </div>
        <p className="s-kicker m-0">
          Раздел {index + 1} из {STORIES.length}
        </p>
        <p className="s-num m-0" aria-live="polite">
          {figure(story.value)}
        </p>
        <p className="s-unit m-0">млрд ₽ в 2026 году</p>
        <h3 className="s-title m-0">{story.title}</h3>
        <p className="s-text m-0">{story.text}</p>
        <div className="s-waves" aria-hidden="true">
          <i />
          <i />
        </div>
        <div className="absolute right-4 top-9 z-[2] flex gap-2">
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label="Предыдущий раздел"
            className="grid size-10 place-items-center rounded-full bg-white/20 text-white backdrop-blur disabled:opacity-35"
          >
            <ChevronLeft size={20} strokeWidth={2.4} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            disabled={index === STORIES.length - 1}
            aria-label="Следующий раздел"
            className="grid size-10 place-items-center rounded-full bg-white/20 text-white backdrop-blur disabled:opacity-35"
          >
            <ChevronRight size={20} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>
      </section>

      <BottomAction label={allRead ? 'К вопросу' : `Прочитано ${read.length} из ${STORIES.length}`} disabled={!allRead} onClick={() => setAsking(true)} />
    </GamePage>
  );
}
