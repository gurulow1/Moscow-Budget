import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { BUDGET_FACTS, BUDGET_SECTORS, getBudgetSource } from '../data/budgetFacts';
import type { CityRewardLedger } from '../data/quests';
import { calcDeduction, formatRub, PERSONAS, type TaxCalculation } from '../lib/deduction';
import { cn } from '../lib/utils';
import { SECTOR_COLOR, SECTOR_NAME } from '../ui/sectors';
import LearningAssessment from '../components/LearningAssessment';
import DailyQuizBoard from '../ui/exhibits/DailyQuizBoard';
import LiveSpend from '../ui/exhibits/LiveSpend';
import Receipt from '../ui/exhibits/Receipt';
import Waffle, { tilesOf } from '../ui/exhibits/Waffle';

interface HomeScreenProps {
  savedCalculation: TaxCalculation | null;
  ledger: CityRewardLedger;
  learningPostUnlocked: boolean;
  onStartDailyQuiz: () => void;
}

const NB = ' ';
// Billions → "6,39": round on whole tens of millions so 6 385 never becomes 6,38 through binary rounding.
const trillions = (billions: number) =>
  (Math.round(billions / 10) / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const billions = (value: number) => value.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const ORDER = ['trans', 'edu', 'soc', 'health', 'other'] as const;
const SECTORS = ORDER.map((id) => BUDGET_SECTORS.find((sector) => sector.id === id)!);
const PARTS = SECTORS.map((sector) => ({ id: sector.id, value: sector.amountBillion, color: SECTOR_COLOR[sector.id], ghost: sector.id === 'other' }));
const TILES = tilesOf(PARTS);
const WAFFLE_LABEL = `Из каждых 100 рублей расходов: ${SECTORS.map((sector, i) => `${SECTOR_NAME[sector.id].toLowerCase()} — ${TILES[i]}`).join(', ')}.`;

// The year's spending as a hero: the figure, what has gone since the page opened, and a hundred tiles for each
// hundred rubles. Then the deduction (a receipt that prints) and the quiz of the day (a departures board).
export default function HomeScreen({ savedCalculation, ledger, learningPostUnlocked, onStartDailyQuiz }: HomeScreenProps) {
  const law = getBudgetSource('budgetLaw2026');
  const [active, setActive] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const lit = active ?? pinned;
  const example = PERSONAS[0];
  const calc = savedCalculation ?? { education: example.education, sport: example.sport, deduction: calcDeduction(example.education, example.sport) };

  return (
    <div className="grid grid-cols-1 gap-3 px-4 pt-4 xl:grid-cols-12 lg:gap-5 lg:px-0 lg:pt-7">
      <section className="mgb-card px-5 pb-5 pt-5 xl:col-span-12 lg:px-9 lg:pb-8 lg:pt-8" aria-labelledby="home-spend-title">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:gap-8">
          <div className="min-w-0">
            <p id="home-spend-title" className="m-0 text-[0.9375rem] font-medium text-ink-2 lg:text-[1.125rem]">
              Расходы города за год
            </p>
            <p className="m-0 mt-1 flex items-baseline gap-2 lg:mt-2 lg:gap-3">
              <b className="text-[4.25rem] font-bold leading-[0.95] tracking-[-0.055em] lg:text-[6.5rem] xl:text-[7rem]">
                {trillions(BUDGET_FACTS.expenses.amountBillion)}
              </b>
              <span className="text-[1.5rem] font-bold tracking-[-0.03em] text-ink-2 lg:text-[2.125rem]">трлн{NB}₽</span>
            </p>
          </div>
          <LiveSpend
            className="text-[0.9375rem] leading-snug md:pb-2 md:text-right lg:text-[1.0625rem] md:[&>p:first-child]:justify-end"
            numberClassName="mt-0.5 text-[1.75rem] leading-tight lg:text-[2.5rem]"
          />
        </div>

        <p className="m-0 mt-6 text-[0.9375rem] font-semibold text-ink lg:mt-8 lg:text-[1.0625rem]">Из каждых 100{NB}₽ расходов</p>
        <Waffle
          parts={PARTS}
          label={WAFFLE_LABEL}
          active={lit}
          onActive={setActive}
          className="mx-auto mt-3 w-full max-w-[20rem] [--gap:5px] md:hidden"
        />
        <Waffle
          parts={PARTS}
          label={WAFFLE_LABEL}
          shape="band"
          active={lit}
          onActive={setActive}
          className="mt-4 hidden w-full [--gap:5px] md:grid xl:[--gap:6px]"
        />
        <ul
          className="m-0 mt-4 grid list-none gap-0.5 p-0 md:flex md:flex-wrap md:gap-x-4 md:gap-y-3 lg:mt-5 xl:justify-between"
          aria-label="Расходы по направлениям"
        >
          {SECTORS.map((sector, i) => (
            <li key={sector.id}>
              <button
                type="button"
                aria-pressed={pinned === sector.id}
                onClick={() => setPinned((id) => (id === sector.id ? null : sector.id))}
                onPointerEnter={(event) => event.pointerType === 'mouse' && setActive(sector.id)}
                onPointerLeave={() => setActive(null)}
                className={cn(
                  'mgb-bare flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-opacity duration-200 md:grid md:w-auto md:gap-1 md:py-1',
                  lit && lit !== sector.id && 'opacity-40',
                )}
              >
                <span className="flex min-w-0 flex-1 items-center gap-3 md:gap-2">
                  <span
                    aria-hidden="true"
                    className={cn('mgb-swatch size-3 shrink-0 rounded-[4px] md:size-2.5', sector.id === 'other' && 'ghost')}
                    style={sector.id === 'other' ? undefined : { background: SECTOR_COLOR[sector.id] }}
                  />
                  <span className="grid min-w-0 flex-1 leading-tight">
                    <span className="text-[0.9375rem] font-medium text-ink">{SECTOR_NAME[sector.id]}</span>
                    <span className="text-[0.8125rem] text-ink-3">{billions(sector.amountBillion)} млрд{NB}₽</span>
                  </span>
                </span>
                <b className="shrink-0 text-[1.125rem] font-bold leading-none tracking-[-0.03em] md:order-first md:text-[1.75rem] xl:text-[2rem]">
                  {TILES[i]}
                  <span className="ml-[0.12em] text-[0.7em] text-ink-2">₽</span>
                </b>
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap items-end gap-x-10 gap-y-4 border-t border-line pt-4 lg:mt-7 lg:pt-6">
          <div>
            <span className="block text-[0.8125rem] text-ink-3 lg:text-[0.9375rem]">Доходы</span>
            <b className="text-[1.25rem] font-semibold tracking-[-0.02em] lg:text-[1.625rem]">{trillions(BUDGET_FACTS.income.amountBillion)} трлн{NB}₽</b>
          </div>
          <div>
            <span className="block text-[0.8125rem] text-ink-3 lg:text-[0.9375rem]">Дефицит</span>
            <b className="text-[1.25rem] font-semibold tracking-[-0.02em] lg:text-[1.625rem]">
              {billions(BUDGET_FACTS.deficit.amountBillion)} млрд{NB}₽
            </b>
          </div>
          <a
            href="#data"
            className="inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-ink no-underline hover:underline sm:ml-auto lg:mb-1 lg:text-[1.0625rem]"
          >
            Куда идут деньги
            <ArrowRight size={17} aria-hidden="true" />
          </a>
        </div>
      </section>

      <section
        className="mgb-card grid gap-5 px-5 pt-5 sm:grid-cols-[minmax(0,1fr)_auto] xl:col-span-7 lg:gap-6 lg:px-8 lg:pt-8"
        aria-labelledby="home-deduction-title"
      >
        <div className="flex min-w-0 flex-col sm:pb-6 lg:pb-8">
          <p className="m-0 text-[0.9375rem] font-medium text-ink-2 lg:text-[1rem]">Налоговый вычет</p>
          <h2 id="home-deduction-title" className="m-0 mt-1 text-[1.625rem] font-bold leading-[1.1] tracking-[-0.035em] lg:text-[1.875rem]">
            {savedCalculation ? `Вам вернут ${formatRub(savedCalculation.deduction)}` : 'Часть налогов можно вернуть'}
          </h2>
          <p className="m-0 mt-2 text-[0.9375rem] leading-snug text-ink-2 lg:mt-3 lg:text-[1.0625rem]">
            За учёбу и спорт возвращают 13{NB}% расходов — до 19{NB}500{NB}₽ в год, если доход до 2,4{NB}млн{NB}₽.
          </p>
          <a
            href="#calc"
            className="mgb-cta mt-5 inline-flex h-[3.25rem] items-center justify-center gap-2 self-start whitespace-nowrap rounded-full px-6 text-[1rem] font-semibold no-underline sm:mt-auto lg:h-14 lg:px-7 lg:text-[1.0625rem]"
          >
            {savedCalculation ? 'Открыть расчёт' : 'Посчитать свой'}
            <ArrowRight size={18} aria-hidden="true" className="mgb-cta-arrow" />
          </a>
        </div>
        {/* The receipt is still printing: the card's edge cuts it under the total. */}
        <div className="relative -mx-1 h-[14.5rem] self-end overflow-hidden sm:h-full sm:min-h-[16rem] sm:w-[15.5rem] lg:w-[16.5rem]">
          <Receipt
            className="mx-auto"
            title="НАЛОГОВЫЙ ВЫЧЕТ"
            sub={savedCalculation ? 'ваш расчёт' : `пример · ${example.label.toLowerCase()}`}
            lines={[
              { label: 'Учёба', value: formatRub(calc.education) },
              { label: 'Спорт', value: formatRub(calc.sport) },
            ]}
            totalLabel="ВЕРНУТ"
            total={formatRub(calc.deduction)}
            label={`Чек: учёба ${formatRub(calc.education)}, спорт ${formatRub(calc.sport)}, вернут ${formatRub(calc.deduction)}.`}
          />
        </div>
      </section>

      <DailyQuizBoard ledger={ledger} onStart={onStartDailyQuiz} className="xl:col-span-5" />

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
