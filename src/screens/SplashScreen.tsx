import { useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Calculator, ChartNoAxesColumn, Eye, Target, type LucideIcon } from 'lucide-react';
import { BUDGET_FACTS, getBudgetSource } from '../data/budgetFacts';
import { SECTORS } from '../data/spending';
import { SECTOR_COLOR } from '../ui/sectors';
import Aurora from '../ui/Aurora';

interface SplashScreenProps {
  onEnter: (withTour: boolean) => void;
  onOpenAccessibility: () => void;
  accessibilityEnabled: boolean;
}

const NB = '\u00A0';
// Billions → "6,39": round on whole tens of millions so 6 385 never becomes 6,38 through binary rounding.
const trillions = (billions: number) =>
  (Math.round(billions / 10) / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: ChartNoAxesColumn, title: 'Куда идут деньги', text: 'Расходы по направлениям и ваш чек' },
  { icon: Calculator, title: 'Налоговый вычет', text: 'Сколько вернут за учёбу и спорт' },
  { icon: Target, title: 'Квесты', text: 'Квиз дня, игры и «Виртуальный мэр»' },
];

// Content rises in one after another; with reduced motion MotionConfig keeps only the fade.
function Rise({ delay, children }: { delay: number; children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.45, ease: 'easeOut' }}>
      {children}
    </motion.div>
  );
}

export default function SplashScreen({ onEnter, onOpenAccessibility, accessibilityEnabled }: SplashScreenProps) {
  const [leaving, setLeaving] = useState<boolean | null>(null);
  const law = getBudgetSource('budgetLaw2026');

  return (
    <motion.div
      className="fixed inset-0 z-[400] overflow-y-auto bg-page text-ink"
      animate={{ opacity: leaving === null ? 1 : 0 }}
      transition={{ duration: 0.22 }}
      onAnimationComplete={() => leaving !== null && onEnter(leaving)}
    >
      <Aurora />
      <div className="mx-auto flex min-h-dvh w-full max-w-[30rem] flex-col px-4 pb-[calc(1.25rem_+_env(safe-area-inset-bottom))] pt-[calc(0.75rem_+_env(safe-area-inset-top))]">
        <div className="flex min-h-11 items-center justify-between gap-3 px-1">
          <p className="m-0 text-[0.875rem] font-bold tracking-[-0.01em] text-ink-2">
            МосГорБюджет<span className="text-accent">.Трек</span>
          </p>
          <button
            type="button"
            onClick={onOpenAccessibility}
            aria-pressed={accessibilityEnabled}
            className="mgb-glass flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[0.875rem] font-semibold text-ink"
          >
            <Eye size={18} strokeWidth={1.9} aria-hidden="true" />
            Для слабовидящих
          </button>
        </div>

        <main className="flex flex-1 flex-col justify-center gap-3 py-4">
          <Rise delay={0.05}>
            <h1 className="m-0 px-1 text-[2rem] font-bold leading-[1.1] tracking-[-0.035em]">
              Разберитесь в{NB}бюджете Москвы
            </h1>
            <p className="m-0 mt-2.5 px-1 text-[1rem] leading-[1.45] text-ink-2 [text-wrap:pretty]">
              Куда идут деньги города, сколько вернут вам и как решать за район.
            </p>
          </Rise>

          <Rise delay={0.15}>
            <section className="mgb-card mt-1 px-5 py-4" aria-label="Бюджет 2026 года">
              <p className="m-0 text-[0.875rem] text-ink-2">Расходы города в 2026 году</p>
              <p className="m-0 mt-0.5 flex items-baseline gap-1.5">
                <b className="text-[2.75rem] font-bold leading-[1.05] tracking-[-0.035em]">{trillions(BUDGET_FACTS.expenses.amountBillion)}</b>
                <span className="text-[1.25rem] font-semibold leading-tight text-ink-2">трлн{NB}₽</span>
              </p>
              <div aria-hidden="true" className="mt-3 flex h-2.5 gap-[3px] overflow-hidden rounded-[5px]">
                {SECTORS.map((sector) => (
                  <span key={sector.id} style={{ flex: `${sector.amountBillion} 1 0`, background: SECTOR_COLOR[sector.id] }} />
                ))}
              </div>
              <div className="mt-3.5 grid grid-cols-2 border-t border-line pt-3">
                <div>
                  <span className="block text-[0.8125rem] text-ink-3">Доходы</span>
                  <b className="text-[1.0625rem] font-semibold">{trillions(BUDGET_FACTS.income.amountBillion)}{NB}трлн{NB}₽</b>
                </div>
                <div className="border-l border-line pl-4">
                  <span className="block text-[0.8125rem] text-ink-3">Дефицит</span>
                  <b className="text-[1.0625rem] font-semibold">
                    {BUDGET_FACTS.deficit.amountBillion.toLocaleString('ru-RU')}
                    {NB}млрд{NB}₽
                  </b>
                </div>
              </div>
            </section>
          </Rise>

          <Rise delay={0.25}>
            <ul className="mgb-card m-0 list-none p-0" aria-label="Что есть в приложении">
              {FEATURES.map(({ icon: Icon, title, text }, i) => (
                <li key={title}>
                  {i > 0 && <div aria-hidden="true" className="mx-5 h-px bg-line" />}
                  <div className="flex items-center gap-3.5 px-5 py-3">
                    <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-[0.875rem] bg-accent-soft text-accent">
                      <Icon size={22} strokeWidth={1.8} />
                    </span>
                    <span className="grid gap-0.5">
                      <span className="text-[1rem] font-semibold leading-snug">{title}</span>
                      <span className="text-[0.875rem] leading-snug text-ink-2">{text}</span>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </Rise>
        </main>

        <Rise delay={0.35}>
          <div className="grid gap-2.5">
            <button
              type="button"
              onClick={() => setLeaving(false)}
              className="h-14 rounded-full bg-accent-fill text-[1rem] font-semibold text-white shadow-[0_12px_24px_-16px_var(--mgb-accent)]"
            >
              Начать
            </button>
            <button
              type="button"
              onClick={() => setLeaving(true)}
              className="h-[3.25rem] rounded-full border border-line bg-card text-[1rem] font-semibold text-ink"
            >
              Начать с экскурсии
            </button>
            <p className="m-0 mt-1 px-2 text-center text-[0.8125rem] leading-relaxed text-ink-3">
              Учебный прототип на открытых данных, не официальный сервис города. Данные —{' '}
              <a href={law.url} target="_blank" rel="noopener noreferrer" className="text-ink-2 underline underline-offset-2">
                Закон Москвы № 39
              </a>
              .
            </p>
          </div>
        </Rise>
      </div>
    </motion.div>
  );
}
