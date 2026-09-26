import { ArrowRight, Target } from 'lucide-react';
import { BUDGET_FACTS, BUDGET_SECTORS, getBudgetSource } from '../data/budgetFacts';
import { formatRub, type TaxCalculation } from '../lib/deduction';
import { SECTOR_COLOR, SECTOR_NAME, SECTOR_SHORT } from '../ui/sectors';
import LearningAssessment from '../components/LearningAssessment';

interface HomeScreenProps {
  savedCalculation: TaxCalculation | null;
  learningPostUnlocked: boolean;
  onStartDailyQuiz: () => void;
}

// Billions → "6,39": round on whole tens of millions so 6 385 never becomes 6,38 through binary rounding.
const trillions = (billions: number) =>
  (Math.round(billions / 10) / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const billions = (value: number) => value.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const BAR_ORDER = ['trans', 'edu', 'soc', 'health', 'other'] as const;
const barSectors = BAR_ORDER.map((id) => BUDGET_SECTORS.find((sector) => sector.id === id)!);
const leader = BUDGET_SECTORS.filter((sector) => sector.id !== 'other').sort((a, b) => b.share - a.share)[0];

// Phone: one column. Wide screen: a dashboard — the year's spending with its breakdown on the left,
// the two things to do (deduction, quiz of the day) on the right.
export default function HomeScreen({ savedCalculation, learningPostUnlocked, onStartDailyQuiz }: HomeScreenProps) {
  const law = getBudgetSource('budgetLaw2026');

  return (
    <div className="grid gap-3 px-4 pt-4 xl:grid-cols-12 lg:gap-5 lg:px-0 lg:pt-7">
      <section className="mgb-card px-5 py-[1.125rem] xl:col-span-7 xl:row-span-2 lg:px-8 lg:py-7" aria-labelledby="home-spend-title">
        <p id="home-spend-title" className="m-0 text-[0.875rem] text-ink-2 lg:text-[1rem]">Расходы города за год</p>
        <p className="m-0 mt-0.5 flex items-baseline gap-1.5 lg:gap-2.5">
          <b className="text-[3rem] font-bold leading-[1.05] tracking-[-0.035em] lg:text-[4.5rem]">{trillions(BUDGET_FACTS.expenses.amountBillion)}</b>
          <span className="text-[1.25rem] font-semibold leading-tight text-ink-2 lg:text-[1.75rem]">трлн&nbsp;₽</span>
        </p>
        <div
          role="img"
          aria-label={barSectors.map((sector) => `${sector.name} ${sector.share.toLocaleString('ru-RU')} %`).join(', ')}
          className="mt-3.5 flex h-2.5 gap-[3px] overflow-hidden rounded-[5px] lg:mt-5 lg:h-3.5 lg:rounded-[7px]"
        >
          {barSectors.map((sector) => (
            <span key={sector.id} style={{ flex: `${sector.share} 1 0`, background: SECTOR_COLOR[sector.id] }} />
          ))}
        </div>
        <p className="m-0 mt-3 text-[0.875rem] leading-normal text-ink-2 lg:text-[1rem]">
          Больше всего — {SECTOR_SHORT[leader.id]}:{' '}
          <b className="font-semibold text-ink">{Math.round(leader.share)}&nbsp;₽&nbsp;из&nbsp;каждых&nbsp;100</b>
        </p>

        {/* The breakdown behind the bar; the phone keeps it on the «Данные» tab. */}
        <div className="mt-5 hidden lg:block">
          <ul className="m-0 grid list-none gap-2.5 p-0" aria-label="Расходы по направлениям">
            {barSectors.map((sector) => (
              <li key={sector.id} className="flex items-center gap-3 text-[1rem]">
                <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ background: SECTOR_COLOR[sector.id] }} />
                <span className="min-w-0 flex-1 text-ink-2">{SECTOR_NAME[sector.id]}</span>
                <span className="shrink-0 font-semibold">{billions(sector.amountBillion)}&nbsp;млрд&nbsp;₽</span>
                <span className="w-[3.75rem] shrink-0 text-right text-ink-3">{sector.share.toLocaleString('ru-RU')}&nbsp;%</span>
              </li>
            ))}
          </ul>
          <a href="#data" className="mt-3.5 inline-flex items-center gap-1.5 text-[1rem] font-semibold text-ink no-underline hover:underline">
            Подробнее — куда идут деньги
            <ArrowRight size={17} aria-hidden="true" />
          </a>
        </div>

        <div className="mt-3.5 grid grid-cols-2 border-t border-line pt-3 lg:mt-6 lg:pt-5">
          <div>
            <span className="block text-[0.8125rem] text-ink-3 lg:text-[0.9375rem]">Доходы</span>
            <b className="text-[1.125rem] font-semibold tracking-[-0.01em] lg:text-[1.625rem]">{trillions(BUDGET_FACTS.income.amountBillion)} трлн&nbsp;₽</b>
          </div>
          <div className="border-l border-line pl-4 lg:pl-8">
            <span className="block text-[0.8125rem] text-ink-3 lg:text-[0.9375rem]">Дефицит</span>
            <b className="text-[1.125rem] font-semibold tracking-[-0.01em] lg:text-[1.625rem]">
              {BUDGET_FACTS.deficit.amountBillion.toLocaleString('ru-RU')} млрд&nbsp;₽
            </b>
          </div>
        </div>
      </section>

      <section className="mgb-card px-5 py-[1.125rem] xl:col-span-5 lg:flex lg:flex-col lg:px-7 lg:py-7" aria-labelledby="home-deduction-title">
        <h2 id="home-deduction-title" className="m-0 text-[1.125rem] font-semibold leading-snug tracking-[-0.01em] lg:text-[1.5rem]">
          Ваш налоговый вычет
        </h2>
        {savedCalculation ? (
          <p className="m-0 mt-1 text-[0.9375rem] leading-snug text-ink-2 lg:mt-2 lg:text-[1.0625rem] xl:flex-1">
            Сохранённый расчёт: <b className="font-semibold text-ink">{formatRub(savedCalculation.deduction)}</b> к возврату
          </p>
        ) : (
          <p className="m-0 mt-1 text-[0.9375rem] leading-snug text-ink-2 lg:mt-2 lg:text-[1.0625rem] xl:flex-1">Сколько вернёт государство за учёбу и спорт</p>
        )}
        <a
          href="#calc"
          className="mt-4 flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-full bg-accent-fill text-[1rem] font-semibold text-white no-underline shadow-[0_12px_24px_-16px_var(--mgb-accent)] lg:mt-6 lg:h-14 lg:text-[1.0625rem]"
        >
          {savedCalculation ? 'Открыть расчёт' : 'Рассчитать за минуту'}
          <ArrowRight size={18} aria-hidden="true" />
        </a>
      </section>

      <button
        type="button"
        onClick={onStartDailyQuiz}
        className="mgb-card flex items-center gap-3.5 px-5 py-[1.125rem] text-left text-ink transition-transform duration-200 xl:col-span-5 lg:gap-5 lg:px-7 lg:py-7 lg:hover:-translate-y-0.5"
      >
        <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-[0.9375rem] bg-accent-soft text-accent lg:size-16 lg:rounded-[1.25rem]">
          <Target size={24} strokeWidth={1.8} className="lg:size-8" />
        </span>
        <span className="grid min-w-0 flex-1 gap-1">
          <span className="text-[1.125rem] font-semibold leading-snug tracking-[-0.01em] lg:text-[1.5rem]">Квиз дня</span>
          <span className="text-[0.9375rem] leading-snug text-ink-2 lg:text-[1.0625rem]">3 вопроса о бюджете · учебные баллы</span>
        </span>
        <ArrowRight size={22} aria-hidden="true" className="hidden shrink-0 text-ink-3 lg:block" />
      </button>

      <div className="xl:col-span-12">
        <LearningAssessment postUnlocked={learningPostUnlocked} />
      </div>

      <p className="m-0 px-2 pb-2 pt-1 text-[0.8125rem] leading-relaxed text-ink-3 xl:col-span-12 lg:px-1 lg:text-[0.875rem]">
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
