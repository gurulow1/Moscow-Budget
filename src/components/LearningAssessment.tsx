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
    question: 'Как отличить официальную цифру от учебной модели внутри проекта?',
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
      <section className="glass-surface rounded-[26px] p-5 md:p-6" aria-labelledby="assessment-title">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0F9F91]">{mode === 'pre' ? 'Входная диагностика' : 'Итоговая диагностика'}</span>
            <h2 id="assessment-title" className="text-lg font-black text-[#172033] mt-1">{question.competency}</h2>
          </div>
          <span className="rounded-full bg-[#E8F7F4] px-3 py-1 text-xs font-black text-[#0B766E]">{questionIndex + 1}/{questions.length}</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-5">
          <div className="h-full rounded-full bg-[#0F9F91] transition-all" style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }} />
        </div>
        <p className="text-base md:text-lg font-bold text-[#172033] leading-snug">{question.question}</p>
        <div className="grid gap-2.5 mt-5">
          {question.options.map((option, index) => (
            <button
              key={option}
              type="button"
              onClick={() => answer(index)}
              className="rounded-[18px] border border-slate-200/90 bg-white/70 px-4 py-3 text-left text-sm font-semibold text-[#334155] transition hover:border-[#0F9F91]/50 hover:bg-[#EAF9F6]"
            >
              {option}
            </button>
          ))}
        </div>
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex mt-4 text-[11px] font-bold text-[#64748B] hover:text-[#0B766E]">
          Источник вопроса: {source.publisher} ↗
        </a>
      </section>
    );
  }

  if (!record) {
    return (
      <section className="glass-surface rounded-[26px] p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4" aria-labelledby="assessment-intro-title">
        <div className="flex gap-3.5">
          <div className="w-11 h-11 shrink-0 rounded-2xl bg-[#DDF7F1] text-[#0B766E] flex items-center justify-center"><BarChart3 size={21} /></div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0F9F91]">Измеримый результат</span>
            <h2 id="assessment-intro-title" className="text-lg font-black text-[#172033] mt-1">Что вы знаете до обучения?</h2>
            <p className="text-sm text-[#64748B] mt-1 max-w-2xl">5 вопросов, около 2 минут. После практики повторим диагностику и покажем прирост знаний в процентных пунктах.</p>
          </div>
        </div>
        <button type="button" onClick={() => start('pre')} className="teal-action rounded-full px-5 py-2.5 text-sm font-black flex items-center justify-center gap-2 shrink-0">
          Пройти входной тест <ArrowRight size={16} />
        </button>
      </section>
    );
  }

  const prePercent = record.preScore * 20;
  if (record.postScore === undefined) {
    return (
      <section className="glass-surface rounded-[26px] p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4" aria-labelledby="assessment-wait-title">
        <div className="flex gap-3.5">
          <div className="w-11 h-11 shrink-0 rounded-2xl bg-[#E8F7F4] text-[#0B766E] flex items-center justify-center"><CheckCircle2 size={21} /></div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0F9F91]">Входной результат · {prePercent}%</span>
            <h2 id="assessment-wait-title" className="text-lg font-black text-[#172033] mt-1">Теперь закрепите знания на практике</h2>
            <p className="text-sm text-[#64748B] mt-1">Сохраните расчёт и завершите одну миссию или квиз — после этого откроется итоговый срез.</p>
          </div>
        </div>
        <button
          type="button"
          disabled={!postUnlocked}
          onClick={() => start('post')}
          className={cn(
            'rounded-full px-5 py-2.5 text-sm font-black flex items-center justify-center gap-2 shrink-0',
            postUnlocked ? 'teal-action' : 'bg-slate-100 text-slate-400 cursor-not-allowed',
          )}
        >
          {postUnlocked ? <><span>Пройти итоговый тест</span><ArrowRight size={16} /></> : <><LockKeyhole size={15} /><span>Сначала практика</span></>}
        </button>
      </section>
    );
  }

  const postPercent = record.postScore * 20;
  const delta = postPercent - prePercent;
  return (
    <section className="glass-surface rounded-[26px] p-5 md:p-6" aria-labelledby="assessment-result-title">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0F9F91]">Образовательный результат зафиксирован</span>
          <h2 id="assessment-result-title" className="text-lg font-black text-[#172033] mt-1">Вход {prePercent}% → итог {postPercent}%</h2>
          <p className="text-sm text-[#64748B] mt-1">Прирост: <strong className={delta >= 0 ? 'text-[#0B766E]' : 'text-amber-700'}>{delta > 0 ? '+' : ''}{delta} п.п.</strong> Результат хранится локально в конкурсном прототипе.</p>
        </div>
        <div className="rounded-[20px] bg-[#E8F7F4] border border-[#BDEDE4] px-5 py-3 text-center shrink-0">
          <span className="block text-[10px] uppercase font-black tracking-wider text-[#0B766E]">эффект обучения</span>
          <span className="text-2xl font-black text-[#0F9F91]">{delta > 0 ? '+' : ''}{delta} п.п.</span>
        </div>
      </div>
    </section>
  );
}
