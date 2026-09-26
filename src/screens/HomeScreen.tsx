import { ArrowRight, Target } from 'lucide-react';
import { BUDGET_FACTS, BUDGET_SECTORS, getBudgetSource } from '../data/budgetFacts';
import { formatRub, type TaxCalculation } from '../lib/deduction';
import { SECTOR_COLOR, SECTOR_SHORT } from '../ui/sectors';
import LearningAssessment from '../components/LearningAssessment';

interface HomeScreenProps {
  savedCalculation: TaxCalculation | null;
  learningPostUnlocked: boolean;
  onStartDailyQuiz: () => void;
}

// Billions → "6,39": round on whole tens of millions so 6 385 never becomes 6,38 through binary rounding.
const trillions = (billions: number) =>
  (Math.round(billions / 10) / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const BAR_ORDER = ['trans', 'edu', 'soc', 'health', 'other'] as const;
const barSectors = BAR_ORDER.map((id) => BUDGET_SECTORS.find((sector) => sector.id === id)!);
const leader = BUDGET_SECTORS.filter((sector) => sector.id !== 'other').sort((a, b) => b.share - a.share)[0];

export default function HomeScreen({ savedCalculation, learningPostUnlocked, onStartDailyQuiz }: HomeScreenProps) {
  const law = getBudgetSource('budgetLaw2026');

  return (
    <div className="grid gap-3 px-4 pt-4 lg:grid-cols-2 lg:items-start">
      <section className="mgb-card px-5 py-[1.125rem] lg:row-span-2" aria-labelledby="home-spend-title">
        <p id="home-spend-title" className="m-0 text-[0.875rem] text-ink-2">Расходы города за год</p>
        <p className="m-0 mt-0.5 flex items-baseline gap-1.5">
          <b className="text-[3rem] font-bold leading-[1.05] tracking-[-0.035em]">{trillions(BUDGET_FACTS.expenses.amountBillion)}</b>
          <span className="text-[1.25rem] font-semibold leading-tight text-ink-2">трлн&nbsp;₽</span>
        </p>
        <div
          role="img"
          aria-label={barSectors.map((sector) => `${sector.name} ${sector.share.toLocaleString('ru-RU')} %`).join(', ')}
          className="mt-3.5 flex h-2.5 gap-[3px] overflow-hidden rounded-[5px]"
        >
          {barSectors.map((sector) => (
            <span key={sector.id} style={{ flex: `${sector.share} 1 0`, background: SECTOR_COLOR[sector.id] }} />
          ))}
        </div>
        <p className="m-0 mt-3 text-[0.875rem] leading-normal text-ink-2">
          Больше всего — {SECTOR_SHORT[leader.id]}:{' '}
          <b className="font-semibold text-ink">{Math.round(leader.share)}&nbsp;₽&nbsp;из&nbsp;каждых&nbsp;100</b>
        </p>
        <div className="mt-3.5 grid grid-cols-2 border-t border-line pt-3">
          <div>
            <span className="block text-[0.8125rem] text-ink-3">Доходы</span>
            <b className="text-[1.125rem] font-semibold tracking-[-0.01em]">{trillions(BUDGET_FACTS.income.amountBillion)} трлн&nbsp;₽</b>
          </div>
          <div className="border-l border-line pl-4">
            <span className="block text-[0.8125rem] text-ink-3">Дефицит</span>
            <b className="text-[1.125rem] font-semibold tracking-[-0.01em]">
              {BUDGET_FACTS.deficit.amountBillion.toLocaleString('ru-RU')} млрд&nbsp;₽
            </b>
          </div>
        </div>
      </section>

      <section className="mgb-card px-5 py-[1.125rem]" aria-labelledby="home-deduction-title">
        <h2 id="home-deduction-title" className="m-0 text-[1.125rem] font-semibold leading-snug tracking-[-0.01em]">
          Ваш налоговый вычет
        </h2>
        {savedCalculation ? (
          <p className="m-0 mt-1 text-[0.9375rem] leading-snug text-ink-2">
            Сохранённый расчёт: <b className="font-semibold text-ink">{formatRub(savedCalculation.deduction)}</b> к возврату
          </p>
        ) : (
          <p className="m-0 mt-1 text-[0.9375rem] leading-snug text-ink-2">Сколько вернёт государство за учёбу и спорт</p>
        )}
        <a
          href="#calc"
          className="mt-4 flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-full bg-accent-fill text-[1rem] font-semibold text-white no-underline shadow-[0_12px_24px_-16px_var(--mgb-accent)]"
        >
          {savedCalculation ? 'Открыть расчёт' : 'Рассчитать за минуту'}
          <ArrowRight size={18} aria-hidden="true" />
        </a>
      </section>

      <button
        type="button"
        onClick={onStartDailyQuiz}
        className="mgb-card flex items-center gap-3.5 px-5 py-[1.125rem] text-left text-ink"
      >
        <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-[0.9375rem] bg-accent-soft text-accent">
          <Target size={24} strokeWidth={1.8} />
        </span>
        <span className="grid gap-1">
          <span className="text-[1.125rem] font-semibold leading-snug tracking-[-0.01em]">Квиз дня</span>
          <span className="text-[0.9375rem] leading-snug text-ink-2">3 вопроса о бюджете · учебные баллы</span>
        </span>
      </button>

      <div className="lg:col-span-2">
        <LearningAssessment postUnlocked={learningPostUnlocked} />
      </div>

      <p className="m-0 px-2 pb-2 pt-1 text-[0.8125rem] leading-relaxed text-ink-3 lg:col-span-2">
        Учебный конкурсный прототип на открытых данных, не официальный сервис города. Параметры бюджета —{' '}
        <a href={law.url} target="_blank" rel="noopener noreferrer" className="text-ink-2 underline underline-offset-2">
          Закон Москвы № 39
        </a>{' '}
        и{' '}
        <a href="https://budget.mos.ru/" target="_blank" rel="noopener noreferrer" className="text-ink-2 underline underline-offset-2">
          budget.mos.ru
        </a>
        .
      </p>
    </div>
  );
}
