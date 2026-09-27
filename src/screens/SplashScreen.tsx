import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Eye } from 'lucide-react';
import { BUDGET_FACTS, BUDGET_SECTORS, getBudgetSource } from '../data/budgetFacts';
import { SECTOR_COLOR, SECTOR_SHORT } from '../ui/sectors';
import Aurora from '../ui/Aurora';

interface SplashScreenProps {
  onEnter: (withTour: boolean) => void;
  onOpenAccessibility: () => void;
  accessibilityEnabled: boolean;
  reduceMotion: boolean;
}

const NB = '\u00A0';
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

// The intro is a 15-second film of the app's own screens, cut where it dips back to the plain background,
// so the entrance takes over without a seam. Wide for computers, tall for phones; light and night.
// `safe` is how much of each edge may be cropped: the film keeps its content clear of the edges and of the
// header buttons that sit over its top.
const INTRO = {
  wide: { aspect: 16 / 9, safeX: 0.03, safeY: 0.035 },
  tall: { aspect: 390 / 760, safeX: 0.01, safeY: 0.025 },
} as const;
const STALL_MS = 3000;

function pickIntro(dark: boolean) {
  const screen = window.innerWidth / window.innerHeight;
  const kind = Math.abs(Math.log(screen / INTRO.wide.aspect)) <= Math.abs(Math.log(screen / INTRO.tall.aspect)) ? 'wide' : 'tall';
  const base = `/splash/intro-${kind}-${dark ? 'dark' : 'light'}`;
  return { kind, src: `${base}.mp4`, poster: `${base}.jpg` } as const;
}

// Cover the screen while the crop stays in the film's empty margins; otherwise show it whole with soft edges.
function introStyle(kind: keyof typeof INTRO): CSSProperties {
  const { aspect, safeX, safeY } = INTRO[kind];
  const r = window.innerWidth / window.innerHeight / aspect;
  if (r >= 1 ? (1 - 1 / r) / 2 <= safeY : (1 - r) / 2 <= safeX) return { inset: 0, width: '100%', height: '100%', objectFit: 'cover' };
  const fade = (to: string) => `linear-gradient(${to}, transparent, #000 7%, #000 93%, transparent)`;
  const centred: CSSProperties = { left: '50%', top: '50%', transform: 'translate(-50%, -50%)', maxWidth: 'none' };
  return r >= 1
    ? { ...centred, height: '100%', width: `${100 * aspect}dvh`, maskImage: fade('to right'), WebkitMaskImage: fade('to right') }
    : { ...centred, width: '100%', height: `${100 / aspect}vw`, maskImage: fade('to bottom'), WebkitMaskImage: fade('to bottom') };
}

function Reveal({ show, delay, className, children }: { show: boolean; delay: number; className?: string; children: ReactNode }) {
  return (
    <motion.div
      className={className}
      initial={false}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ delay: show ? delay : 0, duration: 0.55, ease: 'easeOut' }}
      inert={!show}
      aria-hidden={!show}
    >
      {children}
    </motion.div>
  );
}

export default function SplashScreen({ onEnter, onOpenAccessibility, accessibilityEnabled, reduceMotion }: SplashScreenProps) {
  const [intro] = useState(() => {
    const quiet =
      reduceMotion ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
    return quiet ? null : pickIntro(document.documentElement.classList.contains('dark'));
  });
  const [formed, setFormed] = useState(intro === null);
  const [leaving, setLeaving] = useState<boolean | null>(null);
  const [, setViewport] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const enterRef = useRef<HTMLButtonElement>(null);
  const focusEnter = useRef(false);
  const law = getBudgetSource('budgetLaw2026');

  const finish = useCallback((moveFocus = false) => {
    focusEnter.current = moveFocus;
    setFormed(true);
  }, []);

  useEffect(() => {
    if (formed) {
      videoRef.current?.pause();
      if (focusEnter.current) enterRef.current?.focus();
    }
  }, [formed]);

  // A refused autoplay, a broken file or a slow network never holds the entrance: if the film has not moved
  // for a few seconds, it is dropped. While the page is hidden nothing is judged (Chrome pauses silent video
  // in background pages), and the film starts once the page is shown.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || formed) return;
    video.muted = true;
    let alive = true;
    let watchdog = 0;
    let retry = 0;
    let last = video.currentTime;
    const watch = () => {
      window.clearTimeout(watchdog);
      watchdog = window.setTimeout(() => {
        if (document.hidden || video.currentTime > last + 0.1) {
          last = video.currentTime;
          watch();
        } else finish();
      }, STALL_MS);
    };
    const start = () => {
      if (!video.paused || video.ended) return;
      video.play().catch((error: DOMException) => {
        if (error.name === 'NotAllowedError') finish();
        // Interrupted (the page was backgrounded for a moment): one more try while the watchdog runs.
        else if (alive) retry = window.setTimeout(() => video.paused && video.play().catch(() => {}), 400);
      });
    };
    const shown = () => !document.hidden && start();
    document.addEventListener('visibilitychange', shown);
    start();
    watch();
    return () => {
      alive = false;
      window.clearTimeout(watchdog);
      window.clearTimeout(retry);
      document.removeEventListener('visibilitychange', shown);
    };
  }, [finish, formed]);

  useEffect(() => {
    const onResize = () => setViewport((n) => n + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[400] overflow-y-auto bg-page text-ink"
      animate={{ opacity: leaving === null ? 1 : 0 }}
      transition={{ duration: 0.25 }}
      onAnimationComplete={() => leaving !== null && onEnter(leaving)}
    >
      <Aurora />
      <div className="relative min-h-dvh w-full" onClick={() => !formed && finish()}>
        {intro && (
          <motion.video
            ref={videoRef}
            aria-hidden="true"
            className="pointer-events-none fixed"
            style={introStyle(intro.kind)}
            src={intro.src}
            poster={intro.poster}
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            initial={false}
            animate={{ opacity: formed ? 0 : 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            onEnded={() => finish()}
            onError={() => finish()}
          />
        )}

        <div className="relative mx-auto flex min-h-dvh w-full max-w-[76rem] flex-col px-4 pb-[calc(1.25rem_+_env(safe-area-inset-bottom))] pt-[calc(0.75rem_+_env(safe-area-inset-top))] sm:px-8 lg:pb-8 lg:pt-6">
          <header className="flex min-h-11 items-center justify-between gap-3">
            {formed ? (
              <span />
            ) : (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  finish(true);
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

            {/* The same name, bar and order as the film's last shot. */}
            <Reveal show={formed} delay={0} className="flex w-full flex-col items-center">
              <p
                aria-hidden="true"
                className="m-0 whitespace-nowrap text-[clamp(1.75rem,8.4vw,5.5rem)] font-extrabold leading-none tracking-[-0.045em] text-ink"
              >
                МосГорБюджет<span className="text-accent">.Трек</span>
              </p>
              <div aria-hidden="true" className="mt-4 flex h-2 w-[min(40%,20rem)] gap-[3px] overflow-hidden rounded-[4px] sm:mt-6 sm:h-2.5">
                {barSectors.map((sector) => (
                  <span key={sector.id} style={{ flex: `${sector.share} 1 0`, background: SECTOR_COLOR[sector.id] }} />
                ))}
              </div>
            </Reveal>

            <Reveal show={formed} delay={0.1} className="w-full max-w-[40rem]">
              <p className="m-0 text-center text-[1.0625rem] leading-[1.45] text-ink-2 [text-wrap:balance] sm:text-[1.25rem]">
                Бюджет Москвы простым языком: куда идут деньги города, сколько вернут вам и{NB}как решать за{NB}район.
              </p>
            </Reveal>

            <Reveal show={formed} delay={0.2} className="w-full max-w-[46rem]">
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

            <Reveal show={formed} delay={0.3} className="grid w-full max-w-[46rem] gap-2.5 sm:grid-cols-2 sm:gap-3">
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

          <Reveal show={formed} delay={0.4}>
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
