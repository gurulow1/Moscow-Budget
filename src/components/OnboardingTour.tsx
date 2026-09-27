import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn, safeLocalStorage } from '../lib/utils';
import type { AppTab } from '../ui/TabBar';

interface OnboardingTourProps {
  onClose: () => void;
  activeStep: number;
  setActiveStep: (step: number) => void;
  setActiveTab: (tab: AppTab) => void;
}

type Mood = 'happy' | 'waving' | 'thinking' | 'neutral';

const STEPS: { title: string; text: string; target: string | null; mood: Mood }[] = [
  {
    title: 'Привет! Я Фини',
    text: 'За минуту покажу, как устроен МосГорБюджет.Трек. За расчёты, викторины и задания начисляются учебные баллы, они хранятся в этом браузере.',
    target: null,
    mood: 'waving',
  },
  {
    title: 'Профиль и баллы',
    text: 'Кольцо вокруг кнопки профиля — прогресс уровня. В профиле баллы, ночная тема и эта экскурсия, рядом — версия для слабовидящих.',
    target: '#tour-header',
    mood: 'neutral',
  },
  {
    title: 'Выберите пример',
    text: 'Студент, молодой специалист, предприниматель или семья с детьми: пример подставит в калькулятор типичные расходы.',
    target: '#tour-persona',
    mood: 'thinking',
  },
  {
    title: 'Калькулятор вычета',
    text: 'Двигайте ползунки или впишите суммы за учёбу и спорт — сразу увидите, сколько вернёт государство. За первый сохранённый расчёт +100 баллов.',
    target: '#tour-calculator',
    mood: 'happy',
  },
  {
    title: 'Квесты',
    text: 'Квиз дня, викторины, мини-игры и «Виртуальный мэр», где вы решаете, как потратить бюджет района. За каждое задание — учебные баллы.',
    target: '#tour-quests',
    mood: 'neutral',
  },
  {
    title: 'Куда идут деньги',
    text: 'Потоки показывают расходы Москвы в 2026 году. Нажмите на направление, чтобы увидеть подробности, а чек разложит 1 000 ₽ или ваш вычет по тем же долям.',
    target: '#tour-analytics',
    mood: 'thinking',
  },
  {
    title: 'Помощник по бюджету',
    text: 'Спросите о бюджете Москвы или вычетах — помощник ответит простыми словами и подскажет, где посмотреть подробнее.',
    target: '#tour-ai',
    mood: 'waving',
  },
  {
    title: 'Готово, можно исследовать!',
    text: 'Изучайте бюджет, проходите квесты и сверяйтесь с официальными источниками — ссылки есть на каждом экране.',
    target: null,
    mood: 'happy',
  },
];

// The tab that holds each step's target.
const STEP_TAB: Partial<Record<number, AppTab>> = { 2: 'calc', 3: 'calc', 4: 'quests', 5: 'data' };

const MARGIN = 16;
const GAP = 18;
const PAD = 8;

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

// Fini: floats, blinks now and then and waves on the greeting steps.
function Fini({ mood }: { mood: Mood }) {
  const uid = useId().replace(/:/g, '');
  const eye = mood === 'thinking' ? '#F5A524' : mood === 'waving' ? '#5E9BFF' : '#34D399';
  return (
    <div aria-hidden="true" className="relative size-16 shrink-0 select-none">
      <motion.span
        className="absolute inset-1 rounded-full bg-accent"
        animate={{ scale: [1, 1.18, 1], opacity: [0.28, 0, 0.28] }}
        transition={{ repeat: Infinity, duration: 2.6, ease: 'easeOut' }}
      />
      <motion.svg
        viewBox="0 0 100 100"
        className="relative size-full drop-shadow-[0_6px_14px_rgba(214,38,58,0.35)]"
        animate={{ y: [0, -4, 0], rotate: mood === 'thinking' ? [0, -4, 0] : 0 }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
      >
        <defs>
          <radialGradient id={`${uid}-body`} cx="32%" cy="28%" r="75%">
            <stop offset="0%" stopColor="#FF6B7D" />
            <stop offset="75%" stopColor="#D6263A" />
            <stop offset="100%" stopColor="#A3141F" />
          </radialGradient>
          <linearGradient id={`${uid}-screen`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1F2A40" />
            <stop offset="100%" stopColor="#0B1220" />
          </linearGradient>
        </defs>
        {/* Antenna with a blinking light */}
        <line x1="50" y1="9" x2="50" y2="2" stroke="#A3141F" strokeWidth="3" strokeLinecap="round" />
        <motion.circle cx="50" cy="3" r="3.2" fill="#FFD27A" animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.4 }} />
        {mood === 'waving' && (
          <motion.g
            style={{ transformBox: 'fill-box', transformOrigin: '10% 90%' }}
            animate={{ rotate: [0, 24, -8, 24, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, repeatDelay: 0.6, ease: 'easeInOut' }}
          >
            <ellipse cx="92" cy="40" rx="7" ry="9" fill="#D6263A" stroke="#FF8A96" strokeWidth="1.5" />
          </motion.g>
        )}
        <circle cx="50" cy="54" r="42" fill={`url(#${uid}-body)`} stroke="#FF8A96" strokeWidth="1.5" />
        <ellipse cx="38" cy="36" rx="13" ry="7" fill="#FFFFFF" opacity="0.18" />
        <rect x="20" y="36" width="60" height="40" rx="18" fill={`url(#${uid}-screen)`} />
        <motion.g
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          animate={{ scaleY: [1, 1, 0.12, 1] }}
          transition={{ repeat: Infinity, duration: 3.8, times: [0, 0.9, 0.95, 1] }}
        >
          {mood === 'happy' || mood === 'waving' ? (
            <>
              <path d="M31 55 Q37 45 43 55" stroke={eye} strokeWidth="4.5" strokeLinecap="round" fill="none" />
              <path d="M57 55 Q63 45 69 55" stroke={eye} strokeWidth="4.5" strokeLinecap="round" fill="none" />
            </>
          ) : mood === 'thinking' ? (
            <>
              <path d="M31 53 H43" stroke={eye} strokeWidth="4.5" strokeLinecap="round" />
              <circle cx="63" cy="51" r="5" fill={eye} />
            </>
          ) : (
            <>
              <circle cx="37" cy="53" r="5" fill={eye} />
              <circle cx="63" cy="53" r="5" fill={eye} />
            </>
          )}
        </motion.g>
        {mood === 'thinking' ? (
          <path d="M44 66 H56" stroke={eye} strokeWidth="3" strokeLinecap="round" />
        ) : (
          <path d="M43 64 Q50 70 57 64" stroke={eye} strokeWidth="3" strokeLinecap="round" fill="none" />
        )}
        {(mood === 'happy' || mood === 'waving') && (
          <>
            <circle cx="27" cy="63" r="3.5" fill="#FF6B7D" opacity="0.65" />
            <circle cx="73" cy="63" r="3.5" fill="#FF6B7D" opacity="0.65" />
          </>
        )}
      </motion.svg>
    </div>
  );
}

// The part of the target that is on screen, with a little air around it.
function visibleBox(rect: DOMRect, vw: number, vh: number): Box {
  const top = Math.max(rect.top - PAD, 6);
  const left = Math.max(rect.left - PAD, 6);
  const bottom = Math.min(rect.bottom + PAD, vh - 6);
  const right = Math.min(rect.right + PAD, vw - 6);
  return { top, left, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max));

// Beside the target if it fits, otherwise below or above, otherwise in the corner away from the sidebar.
function placeCard(spot: Box | null, card: { w: number; h: number }, vw: number, vh: number, mobile: boolean) {
  const { w, h } = card;
  if (mobile) {
    const left = (vw - w) / 2;
    const bottom = vh - h - 12;
    const coversTarget = spot !== null && spot.top + spot.height > bottom - 8;
    return { left, top: coversTarget && spot.top > h + 24 ? 12 : bottom };
  }
  if (!spot) return { left: (vw - w) / 2, top: (vh - h) / 2 };

  const midY = clamp(spot.top + spot.height / 2 - h / 2, MARGIN, vh - h - MARGIN);
  const midX = clamp(spot.left + spot.width / 2 - w / 2, MARGIN, vw - w - MARGIN);
  const options = {
    right: { left: spot.left + spot.width + GAP, top: midY, ok: spot.left + spot.width + GAP + w <= vw - MARGIN },
    left: { left: spot.left - GAP - w, top: midY, ok: spot.left - GAP - w >= MARGIN },
    below: { left: midX, top: spot.top + spot.height + GAP, ok: spot.top + spot.height + GAP + h <= vh - MARGIN },
    above: { left: midX, top: spot.top - GAP - h, ok: spot.top - GAP - h >= MARGIN },
  };
  const tall = spot.height > spot.width * 0.8;
  const order = tall ? (['right', 'left', 'below', 'above'] as const) : (['below', 'above', 'right', 'left'] as const);
  const pick = order.map((key) => options[key]).find((option) => option.ok);
  return pick ?? { left: vw - w - MARGIN, top: vh - h - MARGIN };
}

export default function OnboardingTour({ onClose, activeStep, setActiveStep, setActiveTab }: OnboardingTourProps) {
  const [view, setView] = useState({ vw: window.innerWidth, vh: window.innerHeight });
  const [spot, setSpot] = useState<Box | null>(null);
  const [cardSize, setCardSize] = useState({ w: 400, h: 320 });
  const [direction, setDirection] = useState(1);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);

  const step = STEPS[activeStep];
  const mobile = view.vw < 768;
  const last = activeStep === STEPS.length - 1;

  const finish = () => {
    safeLocalStorage.setItem('mos_onboarding_completed_v3', 'true');
    onClose();
  };
  const go = (next: number) => {
    if (next < 0) return;
    if (next >= STEPS.length) return finish();
    setDirection(next > activeStep ? 1 : -1);
    setActiveStep(next);
  };

  useEffect(() => {
    const tab = STEP_TAB[activeStep];
    if (tab) setActiveTab(tab);
  }, [activeStep, setActiveTab]);

  useEffect(() => {
    const onResize = () => setView({ vw: window.innerWidth, vh: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Follow the target: scroll it into view once, then keep the spotlight on it while the page moves.
  useEffect(() => {
    const selector = step?.target;
    if (!selector) {
      setSpot(null);
      return;
    }
    const measure = (scroll: boolean) => {
      const el = document.querySelector(selector);
      if (!el) return;
      if (scroll) {
        const rect = el.getBoundingClientRect();
        el.scrollIntoView({ behavior: 'auto', block: rect.height > window.innerHeight * 0.6 ? 'start' : 'center' });
      }
      setSpot(visibleBox(el.getBoundingClientRect(), window.innerWidth, window.innerHeight));
    };
    // The tab switch needs a moment to lay out.
    const first = window.setTimeout(() => measure(true), 220);
    let frame = 0;
    const onMove = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => measure(false));
    };
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, { passive: true });
    return () => {
      window.clearTimeout(first);
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove);
    };
  }, [step?.target]);

  // The card's real size decides where it fits.
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const update = () => setCardSize({ w: el.offsetWidth, h: el.offsetHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    cardRef.current?.focus();
  }, []);

  // «Назад» disappears on the first step; keep the focus inside the card.
  useEffect(() => {
    if (activeStep === 0 && document.activeElement === backRef.current) nextRef.current?.focus();
  }, [activeStep]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish();
      if (event.key === 'ArrowRight') go(activeStep + 1);
      if (event.key === 'ArrowLeft') go(activeStep - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!step) return null;

  const { vw, vh } = view;
  const width = mobile ? Math.min(vw - 24, 480) : Math.min(416, vw - 32);
  const place = placeCard(spot, { w: width, h: cardSize.h }, vw, vh, mobile);
  const spring = { type: 'spring' as const, stiffness: 190, damping: 28 };
  const hole = spot ?? { top: vh / 2, left: vw / 2, width: 0, height: 0 };

  return (
    <div className="pointer-events-none fixed inset-0 z-[230]">
      {/* The spotlight: everything is dimmed except a rounded window over the step's target. */}
      <motion.div
        className="tour-backdrop fixed rounded-[1.375rem]"
        style={{ boxShadow: '0 0 0 200vmax rgba(8, 11, 18, 0.52)' }}
        initial={{ opacity: 0, ...hole }}
        animate={{ opacity: 1, ...hole }}
        transition={{ ...spring, opacity: { duration: 0.25 } }}
      />
      {spot && (
        <motion.div
          className="fixed rounded-[1.375rem] border-2 border-accent"
          initial={false}
          animate={{ ...spot, opacity: 1 }}
          transition={spring}
        >
          <motion.span
            className="absolute -inset-[2px] rounded-[inherit] border-2 border-accent"
            animate={{ opacity: [0.7, 0], scale: [1, 1.035] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeOut' }}
          />
        </motion.div>
      )}

      <motion.div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-description"
        tabIndex={-1}
        className="mgb-card pointer-events-auto fixed flex flex-col gap-4 px-5 pb-4 pt-5 text-ink outline-none"
        style={{ width }}
        initial={{ opacity: 0, scale: 0.94, top: place.top, left: place.left }}
        animate={{ opacity: 1, scale: 1, top: place.top, left: place.left }}
        transition={{ ...spring, opacity: { duration: 0.2 } }}
      >
        <button
          type="button"
          onClick={finish}
          aria-label="Пропустить экскурсию"
          className="mgb-glass absolute right-3.5 top-3.5 z-[1] grid size-10 place-items-center rounded-full text-ink"
        >
          <X size={16} strokeWidth={2.4} aria-hidden="true" />
        </button>

        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={activeStep}
            custom={direction}
            initial={{ opacity: 0, x: 18 * direction }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 * direction }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="grid gap-3"
          >
            <div className="flex items-center gap-3.5 pr-11">
              <Fini mood={step.mood} />
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[0.8125rem] font-semibold text-accent">
                  Фини · шаг {activeStep + 1} из {STEPS.length}
                </p>
                <h3 id="onboarding-title" className="m-0 mt-0.5 text-[1.1875rem] font-bold leading-snug tracking-[-0.015em]">
                  {step.title}
                </h3>
              </div>
            </div>
            <p id="onboarding-description" className="m-0 text-[0.9375rem] leading-[1.5] text-ink-2 [text-wrap:pretty]">
              {step.text}
            </p>
          </motion.div>
        </AnimatePresence>

        <div aria-hidden="true" className="flex gap-1">
          {STEPS.map((_, i) => (
            <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-track">
              <motion.span
                className={cn('block h-full rounded-full', i < activeStep ? 'bg-c3' : 'bg-accent')}
                initial={false}
                animate={{ width: i <= activeStep ? '100%' : '0%' }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              />
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            ref={backRef}
            type="button"
            onClick={() => go(activeStep - 1)}
            className={cn(
              'flex h-11 items-center gap-1 rounded-full border border-line bg-card px-4 text-[0.9375rem] font-semibold text-ink',
              activeStep === 0 && 'invisible',
            )}
            aria-hidden={activeStep === 0}
            tabIndex={activeStep === 0 ? -1 : undefined}
          >
            <ChevronLeft size={17} strokeWidth={2.4} aria-hidden="true" />
            Назад
          </button>
          <button
            ref={nextRef}
            type="button"
            onClick={() => go(activeStep + 1)}
            className="flex h-11 items-center gap-1 rounded-full bg-accent-fill px-5 text-[0.9375rem] font-semibold text-white shadow-[0_10px_20px_-14px_var(--mgb-accent)]"
          >
            {activeStep === 0 ? 'Начать экскурсию' : last ? 'Поехали!' : 'Далее'}
            {!last && <ChevronRight size={17} strokeWidth={2.4} aria-hidden="true" />}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
