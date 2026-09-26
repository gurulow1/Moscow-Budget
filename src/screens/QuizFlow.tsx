import { useEffect, useRef, useState } from 'react';
import { cn, plural } from '../lib/utils';
import {
  PILOT_POINTS_PER_ANSWER,
  isDailyQuizId,
  passMark,
  shuffleOptions,
  sourceLink,
  todayEntry,
  type CityRewardLedger,
  type Quiz,
  type QuizQuestion,
} from '../data/quests';
import { BottomAction, Divider, FlowPage, FlowTop, ListRow, Mark, PrimaryButton, SecondaryButton } from '../ui/Flow';

interface QuizFlowProps {
  quiz: Quiz;
  ledger: CityRewardLedger;
  /** Gives the points once per activity id; true when they were given now. */
  onComplete: (id: string, points: number) => boolean;
  /** Records the first daily result of the day; true when this run was the first. */
  onDailyResult: (quizId: string, correctAnswers: number) => boolean;
  onClose: () => void;
  onToQuests: () => void;
}

interface Result {
  score: number;
  passed: boolean;
  awarded: boolean;
  firstToday: boolean;
}

const LETTERS = 'АБВГД';
const days = (n: number) => `${n} ${plural(n, ['день', 'дня', 'дней'])}`;

function SourceLink({ question, withDate }: { question: QuizQuestion; withDate?: boolean }) {
  if (!question.sourceId) return null;
  const source = sourceLink(question.sourceId);
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 inline-block text-[0.8125rem] leading-snug text-ink-3 underline underline-offset-[3px]"
    >
      {source.label}
      {withDate && ` · проверено ${source.checked}`} ↗
    </a>
  );
}

export default function QuizFlow({ quiz, ledger, onComplete, onDailyResult, onClose, onToQuests }: QuizFlowProps) {
  const daily = isDailyQuizId(quiz.id);
  const [questions, setQuestions] = useState(() => quiz.questions.map(shuffleOptions));
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const current = questions[index];
  const answered = picked !== null;
  const isLast = index === questions.length - 1;
  const need = passMark(questions.length);

  // Each new question and the result start at the top with focus on their heading.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    titleRef.current?.focus({ preventScroll: true });
  }, [index, result]);

  const pick = (option: number) => {
    if (answered) return;
    setPicked(option);
    setAnswers((prev) => {
      const next = prev.slice(0, index);
      next[index] = option;
      return next;
    });
  };

  const next = () => {
    if (!isLast) {
      setIndex(index + 1);
      setPicked(null);
      return;
    }
    const score = questions.reduce((sum, question, i) => sum + (answers[i] === question.correct ? 1 : 0), 0);
    const passed = score >= need;
    const firstToday = daily ? onDailyResult(quiz.id, score) : false;
    const awarded = passed ? onComplete(quiz.id, quiz.reward) : false;
    setResult({ score, passed, awarded, firstToday });
  };

  const restart = () => {
    setQuestions(quiz.questions.map(shuffleOptions));
    setIndex(0);
    setPicked(null);
    setAnswers([]);
    setResult(null);
  };

  if (result) {
    const todayPoints = todayEntry(ledger)?.points ?? result.score * PILOT_POINTS_PER_ANSWER;
    return (
      <FlowPage className="pb-[calc(2rem_+_env(safe-area-inset-bottom))]">
        <FlowTop ref={titleRef} icon="close" label="Закрыть итог" onPress={onClose} title={daily ? 'Итог квиза дня' : 'Итог викторины'} />
        <div className="mt-[1.125rem] grid gap-3">
          <section className="mgb-card px-5 py-[1.125rem]" aria-label="Результат">
            {!daily && <p className="m-0 mb-1 text-[0.875rem] font-semibold text-ink-2">{quiz.title}</p>}
            <p className="m-0 text-[0.875rem] text-ink-2">Верных ответов</p>
            <p className="m-0 mt-0.5 flex items-baseline gap-2">
              <b className="text-[3rem] font-bold leading-[1.05] tracking-[-0.035em]">{result.score}</b>
              <span className="text-[1.25rem] font-semibold leading-tight text-ink-2">из {questions.length}</span>
            </p>
            <span
              className={cn(
                'mt-3 inline-block rounded-full px-[0.6875rem] py-[0.4375rem] text-[0.8125rem] font-semibold leading-none',
                result.passed ? 'bg-ok-soft text-ok-ink' : 'bg-accent-soft text-accent',
              )}
            >
              {result.passed ? 'Засчитано' : `Не засчитано: нужно ${need} из ${questions.length}`}
            </span>
          </section>

          <section className="mgb-card" aria-label="Награды">
            <ListRow
              title="Учебные баллы"
              note={
                !result.passed
                  ? `начисляются от ${need} верных ответов`
                  : result.awarded
                    ? daily
                      ? 'за пройденный квиз, один раз в день'
                      : 'за первое прохождение викторины'
                    : daily
                      ? 'сегодня уже начислены'
                      : 'за эту викторину уже начислены'
              }
              right={<b className="shrink-0 text-[1.0625rem] font-bold">{result.awarded ? `+${quiz.reward}` : '0'}</b>}
            />
            {daily && (
              <>
                <Divider />
                <ListRow
                  title="Городской пилот"
                  note={
                    result.firstToday
                      ? `${PILOT_POINTS_PER_ANSWER} за верный ответ · пока не передаются в городские сервисы`
                      : 'засчитан первый результат дня'
                  }
                  right={<b className="shrink-0 text-[1.0625rem] font-bold">{todayPoints > 0 ? `+${todayPoints}` : '0'}</b>}
                />
                <Divider />
                <ListRow
                  title="Серия"
                  note="квиз дня без пропусков"
                  right={<b className="shrink-0 whitespace-nowrap text-[1.0625rem] font-bold">{days(ledger.streak)}</b>}
                />
              </>
            )}
          </section>

          <section className="mgb-card" aria-labelledby="quiz-review-title">
            <h2 id="quiz-review-title" className="m-0 px-5 pb-0.5 pt-4 text-[0.875rem] font-normal text-ink-2">
              Разбор ответов
            </h2>
            {questions.map((question, i) => {
              const mine = answers[i];
              const ok = mine === question.correct;
              return (
                <div key={question.question}>
                  {i > 0 && <Divider />}
                  <div className="flex gap-3 px-5 py-3.5">
                    <Mark ok={ok} size={28} />
                    <div className="min-w-0 flex-1">
                      <p className="m-0 text-[0.9375rem] font-semibold leading-snug">{question.question}</p>
                      <p className="m-0 mt-1 text-[0.875rem] leading-snug text-ink-2">
                        Ответ: <b className="font-semibold text-ink">{question.options[question.correct]}</b>
                      </p>
                      {!ok && (
                        <p className="m-0 mt-0.5 text-[0.875rem] leading-snug text-accent">
                          Ваш ответ: {mine === undefined ? '—' : question.options[mine]}
                        </p>
                      )}
                      <SourceLink question={question} />
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          <PrimaryButton onClick={onToQuests}>К квестам</PrimaryButton>
          <SecondaryButton onClick={restart}>Пройти ещё раз</SecondaryButton>
        </div>
      </FlowPage>
    );
  }

  const right = answered && picked === current.correct;

  return (
    <FlowPage>
      <FlowTop icon="close" label={daily ? 'Закрыть квиз' : 'Закрыть викторину'} onPress={onClose}>
        <div aria-hidden="true" className="grid flex-1 gap-1.5" style={{ gridTemplateColumns: `repeat(${questions.length}, minmax(0, 1fr))` }}>
          {questions.map((question, i) => (
            <span
              key={question.question}
              className={cn('h-1.5 rounded-[3px] transition-colors duration-200', i < index ? 'bg-ink' : i === index ? 'bg-accent' : 'bg-track')}
            />
          ))}
        </div>
        <span className="shrink-0 text-[0.9375rem] font-semibold text-ink-2">
          {index + 1} из {questions.length}
        </span>
      </FlowTop>

      {/* The question takes the free height, so the answers sit low, under the thumb. */}
      <section className="mgb-card mt-4 flex min-h-[15rem] flex-1 flex-col px-[1.375rem] pb-5 pt-[1.375rem]" aria-labelledby="quiz-question">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[0.875rem] font-bold text-ink-2">{daily ? 'Квиз дня' : 'Викторина'}</span>
          <span className="rounded-full bg-track px-2.5 py-1.5 text-[0.78125rem] font-semibold leading-none text-ink-2">
            {current.topic ?? quiz.title}
          </span>
        </div>
        <h1
          ref={titleRef}
          id="quiz-question"
          tabIndex={-1}
          className="m-0 mt-3.5 text-[1.625rem] font-bold leading-[1.28] tracking-[-0.02em] outline-none [text-wrap:pretty]"
        >
          {current.question}
        </h1>
        <div aria-live="polite" className="mt-auto border-t border-line pt-4">
          {answered ? (
            <>
              <p className={cn('m-0 text-[1rem] font-bold', right ? 'text-ok-ink' : 'text-accent')}>{right ? 'Верно' : 'Неверно'}</p>
              <p className="m-0 mt-1 text-[0.9375rem] leading-[1.45] text-ink-2 [text-wrap:pretty]">{current.explanation}</p>
              <SourceLink question={current} withDate />
            </>
          ) : (
            <p className="m-0 text-[0.875rem] leading-[1.45] text-ink-2 [text-wrap:pretty]">
              {daily
                ? `Выберите ответ ниже. За верный — ${PILOT_POINTS_PER_ANSWER}\u00A0баллов, после ответа покажем объяснение и источник.`
                : 'Выберите ответ ниже. После ответа покажем объяснение и источник.'}
            </p>
          )}
        </div>
      </section>

      <div role="group" aria-label="Варианты ответа" className="mt-3 grid gap-2.5">
        {current.options.map((text, i) => {
          const isRight = answered && i === current.correct;
          const isMine = answered && i === picked;
          return (
            <button
              key={text}
              type="button"
              aria-pressed={i === picked}
              onClick={() => pick(i)}
              className={cn(
                'flex min-h-16 w-full items-center gap-3 rounded-[1.25rem] border-[1.5px] px-4 py-3 text-left text-ink transition-[background-color,border-color,opacity] duration-200',
                isRight
                  ? 'border-c3 bg-ok-soft'
                  : isMine
                    ? 'border-accent bg-accent-soft'
                    : 'border-line bg-card shadow-[var(--mgb-shadow)]',
                answered && !isRight && !isMine && 'opacity-55',
                answered && 'cursor-default',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'grid size-[1.875rem] shrink-0 place-items-center rounded-full text-[0.875rem] font-bold',
                  isRight ? 'bg-c3 text-white' : isMine ? 'bg-accent text-white' : 'bg-track text-ink-2',
                )}
              >
                {LETTERS[i]}
              </span>
              <span className="min-w-0 flex-1 text-[1.0625rem] font-semibold leading-[1.3] tracking-[-0.01em]">{text}</span>
              {(isRight || isMine) && (
                <span className={cn('shrink-0 text-[0.8125rem] font-semibold', isRight ? 'text-ok-ink' : 'text-accent')}>
                  {isRight ? 'верный ответ' : 'ваш ответ'}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <BottomAction
        label={!answered ? 'Выберите ответ' : isLast ? 'Показать итог' : 'Дальше'}
        disabled={!answered}
        onClick={next}
      />
    </FlowPage>
  );
}
