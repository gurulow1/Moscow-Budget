import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
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
import { amounts } from './quiz/amounts';
import AnswerCards from './quiz/AnswerCards';
import QuizProgress, { type StepState } from './quiz/QuizProgress';
import FlapBoard from '../ui/exhibits/FlapBoard';

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
  const reduce = document.documentElement.dataset.a11yReduceMotion === 'true' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const current = questions[index];
  const answered = picked !== null;
  const isLast = index === questions.length - 1;
  const need = passMark(questions.length);
  const values = useMemo(() => amounts(current.options), [current]);

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

  const right = answered && picked === current.correct;
  const stepStates: StepState[] = questions.map((question, i) =>
    i < index ? (answers[i] === question.correct ? 'right' : 'wrong') : i > index ? 'empty' : !answered ? 'current' : right ? 'right' : 'wrong',
  );

  if (result) {
    const todayPoints = todayEntry(ledger)?.points ?? result.score * PILOT_POINTS_PER_ANSWER;
    return (
      <FlowPage className="pb-[calc(2rem_+_env(safe-area-inset-bottom))]">
        <FlowTop ref={titleRef} icon="close" label="Закрыть итог" onPress={onClose} title={daily ? 'Итог квиза дня' : 'Итог викторины'} />
        <div className="mt-[1.125rem] grid gap-3">
          <section className="mgb-card mgb-board border-0 px-5 pb-5 pt-5 lg:px-7 lg:pb-7 lg:pt-6" aria-label="Результат">
            <div className="relative flex items-center justify-between gap-3">
              <span className="mgb-board-label text-[0.6875rem] lg:text-[0.75rem]">{daily ? 'Квиз дня' : 'Викторина'}</span>
              <span className="flex gap-1.5" aria-hidden="true">
                {questions.map((question, i) => (
                  <span key={question.question} className={cn('size-2 rounded-full', answers[i] === question.correct ? 'bg-[#FFB547]' : 'bg-[rgba(243,239,230,0.2)]')} />
                ))}
              </span>
            </div>
            {!daily && <p className="relative m-0 mt-2 text-[1.125rem] font-bold leading-snug tracking-[-0.02em] text-[#F7F4EE] lg:text-[1.375rem]">{quiz.title}</p>}
            <div className="relative mt-4 [container-type:inline-size]">
              <FlapBoard
                rows={[`ВЕРНО ${result.score} ИЗ ${questions.length}`, result.passed ? 'ЗАСЧИТАНО' : `НУЖНО ${need} ИЗ ${questions.length}`]}
                cols={13}
                amber={[1]}
                label={`Верных ответов: ${result.score} из ${questions.length}. ${result.passed ? 'Засчитано' : `Не засчитано: нужно ${need} из ${questions.length}`}.`}
                className="[--cw:min(2.5rem,calc(100cqw/14.2))]"
              />
            </div>
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

  return (
    <FlowPage className="lg:max-w-[72rem]">
      <FlowTop icon="close" label={daily ? 'Закрыть квиз' : 'Закрыть викторину'} onPress={onClose}>
        <QuizProgress states={stepStates} />
        <span className="relative shrink-0 text-[0.9375rem] font-semibold text-ink-2">
          {index + 1} из {questions.length}
          <AnimatePresence>
            {daily && right && (
              <motion.span
                key={index}
                aria-hidden="true"
                className="absolute -top-5 right-0 whitespace-nowrap text-[0.875rem] font-bold text-streak-ink"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: [0, 1, 1, 0], y: [6, 0, -4, -10] }}
                transition={{ duration: 1.4, times: [0, 0.15, 0.7, 1] }}
              >
                +{PILOT_POINTS_PER_ANSWER} баллов
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </FlowTop>

      {/* Phone: question, answers, verdict. Wide screen, like the start screen: the question and the verdict on the
          left, the answers as the object on the right. */}
      <div className="mt-5 grid flex-1 grid-rows-[auto_1fr_auto] [grid-template-areas:'q'_'a'_'v'] lg:mt-12 lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:gap-x-16 lg:[grid-template-areas:'q_a'_'v_a']">
        <div className="[grid-area:q]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[0.875rem] font-bold text-ink-2 lg:text-[1rem]">{daily ? 'Квиз дня' : 'Викторина'}</span>
            <span className="rounded-full bg-track px-2.5 py-1.5 text-[0.78125rem] font-semibold leading-none text-ink-2 lg:text-[0.875rem]">{current.topic ?? quiz.title}</span>
          </div>
          <h1
            ref={titleRef}
            id="quiz-question"
            tabIndex={-1}
            className="m-0 mt-2.5 text-[1.625rem] font-bold leading-[1.2] tracking-[-0.025em] outline-none [text-wrap:balance] sm:text-[1.875rem] lg:mt-4 lg:text-[2.75rem] lg:leading-[1.08] lg:tracking-[-0.04em]"
          >
            {current.question}
          </h1>
        </div>

        {/* The answers are the picture: big cards that take the free height; sums also get bars to one scale. */}
        <div className="mt-4 flex min-h-[17rem] flex-col [grid-area:a] lg:mt-0 lg:min-h-[27rem]">
          <Fragment key={index}>
            <AnswerCards options={current.options} values={values} picked={picked} correct={current.correct} onPick={pick} reduce={reduce} />
          </Fragment>
        </div>

        <div aria-live="polite" className="mt-3 min-h-[3rem] [grid-area:v] lg:mt-8">
          <AnimatePresence mode="wait" initial={false}>
            {answered ? (
              <motion.div
                key="answer"
                className={cn('mgb-card px-5 py-4 lg:px-6 lg:py-5', right ? 'mgb-verdict-ok' : 'mgb-verdict-bad')}
                initial={reduce ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut', delay: reduce ? 0 : 0.25 }}
              >
                <p className={cn('m-0 flex items-center gap-2 text-[1.0625rem] font-bold lg:text-[1.1875rem]', right ? 'text-ok-ink' : 'text-accent')}>
                  <Mark ok={right} />
                  {right ? 'Верно' : `Неверно — правильный ответ ${LETTERS[current.correct]}`}
                </p>
                <p className="m-0 mt-1.5 text-[0.9375rem] leading-[1.45] text-ink-2 [text-wrap:pretty] lg:text-[1.0625rem]">{current.explanation}</p>
                <SourceLink question={current} withDate />
              </motion.div>
            ) : (
              <motion.p
                key="hint"
                className="m-0 px-1 pt-2 text-center text-[0.9375rem] leading-[1.4] text-ink-3 [text-wrap:balance] lg:px-0 lg:text-left lg:text-[1.0625rem]"
                exit={{ opacity: 0 }}
              >
                {values ? 'Полосы под суммами — в одном масштабе' : 'Один ответ верный'}
                {daily && ` · ${PILOT_POINTS_PER_ANSWER} баллов за верный`}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      <BottomAction
        label={!answered ? 'Выберите ответ' : isLast ? 'Показать итог' : 'Дальше'}
        disabled={!answered}
        onClick={next}
      />
    </FlowPage>
  );
}
