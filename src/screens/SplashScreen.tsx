import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Eye } from 'lucide-react';
import { BUDGET_FACTS, BUDGET_SECTORS, getBudgetSource } from '../data/budgetFacts';
import { SECTOR_COLOR, SECTOR_SHORT } from '../ui/sectors';
import Aurora from '../ui/Aurora';
import { startCitySplash } from './splash/citySplash';

interface SplashScreenProps {
  onEnter: (withTour: boolean) => void;
  onOpenAccessibility: () => void;
  accessibilityEnabled: boolean;
  reduceMotion: boolean;
}

const NB = ' ';
// Billions → "6,39": round on whole tens of millions so 6 385 never becomes 6,38 through binary rounding.
const trillions = (billions: number) =>
  (Math.round(billions / 10) / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const BAR_ORDER = ['trans', 'edu', 'soc', 'health', 'other'] as const;
const barSectors = BAR_ORDER.map((id) => BUDGET_SECTORS.find((sector) => sector.id === id)!);
const leader = BUDGET_SECTORS.filter((sector) => sector.id !== 'other').sort((a, b) => b.share - a.share)[0];

const STATS = [
  { label: 'Расходы 2026', value: trillions(BUDGET_FACTS.expenses.amountBillion), unit: `трлн${NB}₽` },
  { label: 'Доходы', value: trillions(BUDGET_FACTS.income.amountBillion), unit: `трлн${NB}₽` },
  { label: 'Дефицит', value: BUDGET_FACTS.deficit.amountBillion.toLocaleString('ru-RU'), unit: `млрд${NB}₽` },
];

// Hidden parts keep their place, so the lettering drawn on the canvas never has to move when they appear.
function Reveal({ show, delay, className, children }: { show: boolean; delay: number; className?: string; children: ReactNode }) {
  return (
    <motion.div
      className={className}
      initial={false}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ delay: show ? delay : 0, duration: 0.5, ease: 'easeOut' }}
      inert={!show}
      aria-hidden={!show}
    >
      {children}
    </motion.div>
  );
}

export default function SplashScreen({ onEnter, onOpenAccessibility, accessibilityEnabled, reduceMotion }: SplashScreenProps) {
  const [leaving, setLeaving] = useState<boolean | null>(null);
  const [formed, setFormed] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const enterRef = useRef<HTMLButtonElement>(null);
  const splashRef = useRef<ReturnType<typeof startCitySplash> | null>(null);
  const focusEnter = useRef(false);
  const law = getBudgetSource('budgetLaw2026');

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    const logo = logoRef.current;
    if (!canvas || !stage || !logo) return;
    const splash = startCitySplash({
      canvas,
      dark: document.documentElement.classList.contains('dark'),
      reduced: reduceMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      measure: () => {
        const box = stage.getBoundingClientRect();
        const spot = logo.getBoundingClientRect();
        return {
          width: box.width,
          height: box.height,
          logo: { x: spot.left - box.left, y: spot.top - box.top, w: spot.width, h: spot.height },
        };
      },
      onFormed: () => setFormed(true),
    });
    splashRef.current = splash;
    return () => splash.destroy();
  }, [reduceMotion]);

  useEffect(() => {
    if (formed && focusEnter.current) enterRef.current?.focus();
  }, [formed]);

  const skip = (moveFocus = false) => {
    if (formed) return;
    focusEnter.current = moveFocus;
    splashRef.current?.skip();
  };

  return (
    <motion.div
      className="fixed inset-0 z-[400] overflow-y-auto bg-page text-ink"
      animate={{ opacity: leaving === null ? 1 : 0 }}
      transition={{ duration: 0.25 }}
      onAnimationComplete={() => leaving !== null && onEnter(leaving)}
    >
      <Aurora />
      <div ref={stageRef} className="relative min-h-dvh w-full" onClick={() => skip()}>
        <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />

        <div className="relative mx-auto flex min-h-dvh w-full max-w-[76rem] flex-col px-4 pb-[calc(1.25rem_+_env(safe-area-inset-bottom))] pt-[calc(0.75rem_+_env(safe-area-inset-top))] sm:px-8 lg:pb-8 lg:pt-6">
          <header className="flex min-h-11 items-center justify-between gap-3">
            {formed ? (
              <span />
            ) : (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  skip(true);
                }}
                className="mgb-glass h-11 rounded-full px-4 text-[0.875rem] font-semibold text-ink"
              >
                Пропустить
              </button>
            )}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpenAccessibility();
              }}
              aria-pressed={accessibilityEnabled}
              className="mgb-glass flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[0.875rem] font-semibold text-ink"
            >
              <Eye size={18} strokeWidth={1.9} aria-hidden="true" />
              Для слабовидящих
            </button>
          </header>

          <main className="flex flex-1 flex-col items-center justify-center gap-5 py-6 sm:gap-7">
            <h1 className="sr-only">МосГорБюджет.Трек</h1>
            {/* The canvas assembles the lettering inside this box. */}
            <div ref={logoRef} aria-hidden="true" className="h-[7rem] w-full max-w-[68rem] sm:h-[8rem] lg:h-[9rem]" />

            <Reveal show={formed} delay={0} className="w-full max-w-[40rem]">
              <p className="m-0 text-center text-[1.0625rem] leading-[1.45] text-ink-2 [text-wrap:balance] sm:text-[1.25rem]">
                Бюджет Москвы простым языком: куда идут деньги города, сколько вернут вам и{NB}как решать за{NB}район.
              </p>
            </Reveal>

            <Reveal show={formed} delay={0.12} className="w-full max-w-[46rem]">
              <section className="mgb-card px-5 py-4 sm:px-7 sm:py-5" aria-label="Бюджет Москвы на 2026 год">
                <dl className="m-0 grid grid-cols-3 gap-3 sm:gap-6">
                  {STATS.map((stat, i) => (
                    <div key={stat.label} className={i > 0 ? 'border-l border-line pl-3 sm:pl-6' : ''}>
                      <dt className="text-[0.8125rem] text-ink-3 sm:text-[0.875rem]">{stat.label}</dt>
                      <dd className="m-0 mt-0.5 flex flex-wrap items-baseline gap-x-1.5">
                        <b className="text-[1.5rem] font-bold leading-tight tracking-[-0.03em] sm:text-[2.25rem]">{stat.value}</b>
                        <span className="text-[0.8125rem] font-semibold text-ink-2 sm:text-[1rem]">{stat.unit}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
                <div aria-hidden="true" className="mt-4 flex h-2.5 gap-[3px] overflow-hidden rounded-[5px]">
                  {barSectors.map((sector) => (
                    <span key={sector.id} style={{ flex: `${sector.share} 1 0`, background: SECTOR_COLOR[sector.id] }} />
                  ))}
                </div>
                <p className="m-0 mt-2.5 text-[0.875rem] leading-normal text-ink-2">
                  Больше всего — {SECTOR_SHORT[leader.id]}:{' '}
                  <b className="font-semibold text-ink">
                    {Math.round(leader.share)}
                    {NB}₽ из{NB}каждых{NB}100
                  </b>
                </p>
              </section>
            </Reveal>

            <Reveal show={formed} delay={0.24} className="grid w-full max-w-[46rem] gap-2.5 sm:grid-cols-2 sm:gap-3">
              <button
                ref={enterRef}
                type="button"
                onClick={() => setLeaving(false)}
                className="flex h-14 items-center justify-center gap-2 rounded-full bg-accent-fill text-[1.0625rem] font-semibold text-white shadow-[0_14px_28px_-16px_var(--mgb-accent)]"
              >
                Войти
                <ArrowRight size={19} strokeWidth={2.2} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setLeaving(true)}
                className="mgb-glass h-14 rounded-full text-[1.0625rem] font-semibold text-ink"
              >
                Войти с экскурсией
              </button>
            </Reveal>
          </main>

          <Reveal show={formed} delay={0.34}>
            <p className="m-0 px-2 text-center text-[0.8125rem] leading-relaxed text-ink-3">
              Учебный прототип на открытых данных, не официальный сервис города. Данные —{' '}
              <a href={law.url} target="_blank" rel="noopener noreferrer" className="text-ink-2 underline underline-offset-2">
                Закон Москвы № 39
              </a>
              .
            </p>
          </Reveal>
        </div>
      </div>
    </motion.div>
  );
}
