import { useState } from 'react';
import { ArrowRight, BarChart3, CheckCircle2, LockKeyhole } from 'lucide-react';
import { BUDGET_FACTS, formatBudgetAmount, getBudgetSource, type DataSourceId } from '../data/budgetFacts';
import { cn, safeLocalStorage } from '../lib/utils';

const STORAGE_KEY = 'mos_learning_assessment_v1';

interface AssessmentRecord {
  preScore: number;
  preCompletedAt: string;
  postScore?: number;
  postCompletedAt?: string;
}

interface AssessmentQuestion {
  competency: string;
  question: string;
  options: string[];
  correct: number;
  sourceId: DataSourceId;
}

const PRE_QUESTIONS: AssessmentQuestion[] = [
  {
    competency: 'Параметры бюджета',
    question: 'Какой объём расходов предусмотрен бюджетом Москвы на 2026 год?',
    options: [formatBudgetAmount(BUDGET_FACTS.income.amountBillion), formatBudgetAmount(BUDGET_FACTS.expenses.amountBillion), formatBudgetAmount(BUDGET_FACTS.socialSphere.amountBillion)],
    correct: 1,
    sourceId: BUDGET_FACTS.expenses.sourceId,
  },
  {
    competency: 'Бюджетный баланс',
    question: 'Что означает плановый дефицит бюджета?',
    options: ['Расходы выше доходов', 'Доходы выше расходов', 'Все расходы отменены'],
    correct: 0,
    sourceId: BUDGET_FACTS.deficit.sourceId,
  },
  {
    competency: 'Масштаб программ',
    question: 'Какая из этих программ получает наибольшее финансирование в 2026 году?',
    options: ['Образование', 'Транспортная система', 'Здравоохранение'],
    correct: 1,
    sourceId: BUDGET_FACTS.transport.sourceId,
  },
  {
    competency: 'Работа с источником',
    question: 'Где корректнее всего сверять официальные цифры бюджета Москвы?',
    options: ['В случайном посте', 'На портале «Открытый бюджет Москвы»', 'В рекламном буклете банка'],
    correct: 1,
    sourceId: 'budgetParameters2026',
  },
  {
    competency: 'Социальные расходы',
    question: 'Каков общий масштаб расходов на социальную сферу в широком смысле?',
    options: ['Около 810 млрд ₽', 'Около 3,2 трлн ₽', 'Около 6,4 трлн ₽'],
    correct: 1,
    sourceId: BUDGET_FACTS.socialSphere.sourceId,
  },
];

const POST_QUESTIONS: AssessmentQuestion[] = [
  {
    competency: 'Параметры бюджета',
    question: 'Какой объём доходов запланирован в бюджете Москвы на 2026 год?',
    options: [formatBudgetAmount(BUDGET_FACTS.deficit.amountBillion), formatBudgetAmount(BUDGET_FACTS.income.amountBillion), formatBudgetAmount(BUDGET_FACTS.expenses.amountBillion)],
    correct: 1,
    sourceId: BUDGET_FACTS.income.sourceId,
  },
  {
    competency: 'Бюджетный баланс',
    question: `Расходы — ${formatBudgetAmount(BUDGET_FACTS.expenses.amountBillion)}, доходы — ${formatBudgetAmount(BUDGET_FACTS.income.amountBillion)}. Каков разрыв?`,
    options: ['47,6 млрд ₽', formatBudgetAmount(BUDGET_FACTS.deficit.amountBillion), '1,3 трлн ₽'],
    correct: 1,
    sourceId: BUDGET_FACTS.deficit.sourceId,
  },
  {
    competency: 'Масштаб программ',
    question: 'Какая пара указана верно?',
    options: [
      `Образование — ${formatBudgetAmount(BUDGET_FACTS.education.amountBillion)}`,
      `Здравоохранение — ${formatBudgetAmount(BUDGET_FACTS.transport.amountBillion)}`,
      `Транспорт — ${formatBudgetAmount(BUDGET_FACTS.sport.amountBillion)}`,
    ],
    correct: 0,
    sourceId: BUDGET_FACTS.education.sourceId,
  },
  {
    competency: 'Работа с источником',
    question: 'Как отличить официальный показатель от сценарного расчёта внутри проекта?',
    options: ['По количеству эмодзи', 'По статусу и прямой ссылке на первоисточник', 'Никак'],
    correct: 1,
    sourceId: 'budgetParameters2026',
  },
  {
    competency: 'Социальные расходы',
    question: 'Верно ли, что 810 млрд ₽ на программу соцподдержки и около 3,2 трлн ₽ на социальную сферу — это один показатель?',
    options: ['Да, это полные синонимы', 'Нет, 3,2 трлн ₽ — более широкая совокупность расходов', 'Оба числа не относятся к бюджету'],
    correct: 1,
    sourceId: BUDGET_FACTS.socialSphere.sourceId,
  },
];

function readRecord(): AssessmentRecord | null {
  const raw = safeLocalStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as AssessmentRecord;
    return Number.isFinite(value.preScore) ? value : null;
  } catch {
    return null;
  }
}

export default function LearningAssessment({ postUnlocked }: { postUnlocked: boolean }) {
  const [record, setRecord] = useState<AssessmentRecord | null>(readRecord);
  const [mode, setMode] = useState<'pre' | 'post' | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const questions = mode === 'post' ? POST_QUESTIONS : PRE_QUESTIONS;
  const question = questions[questionIndex];

  const start = (nextMode: 'pre' | 'post') => {
    setMode(nextMode);
    setQuestionIndex(0);
    setAnswers([]);
  };

  const answer = (option: number) => {
    const nextAnswers = [...answers, option];
    if (questionIndex < questions.length - 1) {
      setAnswers(nextAnswers);
      setQuestionIndex(index => index + 1);
      return;
    }

    const score = nextAnswers.reduce(
      (total, selected, index) => total + Number(selected === questions[index].correct),
      0,
    );
    const now = new Date().toISOString();
    const nextRecord: AssessmentRecord = mode === 'post' && record
      ? { ...record, postScore: score, postCompletedAt: now }
      : { preScore: score, preCompletedAt: now };
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecord));
    setRecord(nextRecord);
    setMode(null);
    window.dispatchEvent(new CustomEvent('mos_learning_assessment_updated', { detail: nextRecord }));
  };

  if (mode) {
    const source = getBudgetSource(question.sourceId);
    return (
      <section className="mgb-card px-5 py-[1.125rem]" aria-labelledby="assessment-title">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[0.875rem] font-bold text-ink-2">{mode === 'pre' ? 'Входной тест' : 'Итоговый тест'}</span>
          <span className="text-[0.9375rem] font-semibold text-ink-2">
            {questionIndex + 1} из {questions.length}
          </span>
        </div>
        <div aria-hidden="true" className="mt-2.5 grid grid-cols-5 gap-1.5">
          {questions.map((item, index) => (
            <span
              key={item.competency}
              className={cn('h-1.5 rounded-full', index < questionIndex ? 'bg-ink' : index === questionIndex ? 'bg-accent' : 'bg-track')}
            />
          ))}
        </div>
        <span className="mt-4 inline-block rounded-full bg-track px-2.5 py-1.5 text-[0.78125rem] font-semibold leading-none text-ink-2">
          {question.competency}
        </span>
        <h2 id="assessment-title" className="m-0 mt-3 text-[1.25rem] font-bold leading-snug tracking-[-0.02em]">
          {question.question}
        </h2>
        <div role="group" aria-label="Варианты ответа" className="mt-4 grid gap-2.5">
          {question.options.map((option, index) => (
            <button
              key={option}
              type="button"
              onClick={() => answer(index)}
              className="flex min-h-14 items-center gap-3 rounded-[1.25rem] border-[1.5px] border-line bg-card px-4 py-2.5 text-left text-ink shadow-[var(--mgb-shadow)]"
            >
              <span aria-hidden="true" className="grid size-[1.875rem] shrink-0 place-items-center rounded-full bg-track text-[0.875rem] font-bold text-ink-2">
                {'АБВ'[index]}
              </span>
              <span className="text-[1rem] font-semibold leading-snug">{option}</span>
            </button>
          ))}
        </div>
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="mt-3.5 inline-block text-[0.8125rem] text-ink-2 underline underline-offset-[3px]">
          Источник вопроса: {source.publisher} ↗
        </a>
      </section>
    );
  }

  if (!record) {
    return (
      <section className="mgb-card px-5 py-[1.125rem]" aria-labelledby="assessment-intro-title">
        <div className="flex items-center gap-3.5">
          <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-[0.9375rem] bg-ok-soft text-ok-ink">
            <BarChart3 size={23} strokeWidth={1.8} />
          </span>
          <div>
            <h2 id="assessment-intro-title" className="m-0 text-[1.125rem] font-semibold leading-snug tracking-[-0.01em]">
              Что вы знаете до обучения?
            </h2>
            <p className="m-0 mt-1 text-[0.9375rem] leading-snug text-ink-2">5 вопросов, около 2 минут. После практики покажем прирост знаний.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => start('pre')}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-track text-[1rem] font-semibold text-ink"
        >
          Пройти входной тест <ArrowRight size={18} aria-hidden="true" />
        </button>
      </section>
    );
  }

  const prePercent = record.preScore * 20;
  if (record.postScore === undefined) {
    return (
      <section className="mgb-card px-5 py-[1.125rem]" aria-labelledby="assessment-wait-title">
        <div className="flex items-center gap-3.5">
          <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-[0.9375rem] bg-ok-soft text-ok-ink">
            <CheckCircle2 size={23} strokeWidth={1.8} />
          </span>
          <div>
            <p className="m-0 text-[0.875rem] text-ink-2">Входной тест · {prePercent}&nbsp;%</p>
            <h2 id="assessment-wait-title" className="m-0 mt-0.5 text-[1.125rem] font-semibold leading-snug tracking-[-0.01em]">
              Теперь закрепите знания на практике
            </h2>
          </div>
        </div>
        <p className="m-0 mt-3 text-[0.9375rem] leading-snug text-ink-2">
          Сохраните расчёт вычета и пройдите викторину, квиз дня или сценарий мэра — тогда откроется итоговый тест.
        </p>
        <button
          type="button"
          disabled={!postUnlocked}
          onClick={() => start('post')}
          className={cn(
            'mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[1rem] font-semibold',
            postUnlocked ? 'bg-accent-fill text-white' : 'cursor-not-allowed bg-track text-ink-3',
          )}
        >
          {postUnlocked ? (
            <>
              Пройти итоговый тест <ArrowRight size={18} aria-hidden="true" />
            </>
          ) : (
            <>
              <LockKeyhole size={17} aria-hidden="true" /> Сначала практика
            </>
          )}
        </button>
      </section>
    );
  }

  const postPercent = record.postScore * 20;
  const delta = postPercent - prePercent;
  return (
    <section className="mgb-card px-5 py-[1.125rem]" aria-labelledby="assessment-result-title">
      <p id="assessment-result-title" className="m-0 text-[0.875rem] text-ink-2">
        Результат обучения
      </p>
      <p className="m-0 mt-0.5 flex items-baseline gap-2">
        <b className={cn('text-[3rem] font-bold leading-[1.05] tracking-[-0.035em]', delta >= 0 ? 'text-ok-ink' : 'text-streak-ink')}>
          {delta > 0 ? '+' : ''}
          {delta}
        </b>
        <span className="text-[1.25rem] font-semibold text-ink-2">п.п.</span>
      </p>
      <p className="m-0 mt-2 text-[0.9375rem] leading-snug text-ink-2">
        Входной тест {prePercent}&nbsp;% → итоговый {postPercent}&nbsp;%. Результат сохранён в этом браузере.
      </p>
    </section>
  );
}
