import { useCallback, useState, useEffect, useRef } from 'react';
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

const FinyMascot = ({ mood }: { mood: 'happy' | 'waving' | 'thinking' | 'neutral' }) => {
  return (
    <div aria-hidden="true" className="relative size-14 shrink-0 select-none">
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        className="w-full h-full"
      >
        <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-[0_4px_12px_rgba(214,38,58,0.3)]">
          <defs>
            <radialGradient id="bodyGrad" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FF5A6D" />
              <stop offset="80%" stopColor="#D6263A" />
              <stop offset="100%" stopColor="#A3141F" />
            </radialGradient>
            <radialGradient id="screenGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          
          {/* Main outer body */}
          <circle cx="50" cy="50" r="45" fill="url(#bodyGrad)" stroke="#ff8080" strokeWidth="2" />
          
          {/* Face screen */}
          <ellipse cx="50" cy="50" rx="32" ry="24" fill="url(#screenGrad)" stroke="#475569" strokeWidth="2" />
          
          {/* Facial features based on mood */}
          {mood === 'happy' && (
            <>
              {/* Happy eyes ^ ^ */}
              <path d="M30 48 Q37 36 41 48" stroke="#10B981" strokeWidth="4" strokeLinecap="round" fill="none" filter="url(#glow)" />
              <path d="M59 48 Q63 36 70 48" stroke="#10B981" strokeWidth="4" strokeLinecap="round" fill="none" filter="url(#glow)" />
              {/* Smile */}
              <path d="M44 58 Q50 64 56 58" stroke="#10B981" strokeWidth="3" strokeLinecap="round" fill="none" filter="url(#glow)" />
              {/* Cute blush */}
              <circle cx="26" cy="54" r="4" fill="#f43f5e" opacity="0.6" />
              <circle cx="74" cy="54" r="4" fill="#f43f5e" opacity="0.6" />
            </>
          )}
          
          {mood === 'thinking' && (
            <>
              {/* Thinking eyes (one flat, one looking up) */}
              <path d="M28 44 H40" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round" fill="none" filter="url(#glow)" />
              <circle cx="62" cy="46" r="4.5" fill="#F59E0B" filter="url(#glow)" />
              {/* Mouth line */}
              <path d="M44 58 L56 58" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" fill="none" filter="url(#glow)" />
            </>
          )}
          
          {mood === 'waving' && (
            <>
              {/* Happy eye + wink */}
              <path d="M30 48 Q37 36 41 48" stroke="#3B82F6" strokeWidth="4" strokeLinecap="round" fill="none" filter="url(#glow)" />
              <path d="M58 48 L70 48" stroke="#3B82F6" strokeWidth="4" strokeLinecap="round" fill="none" filter="url(#glow)" />
              {/* Waving wave lines next to robot */}
              <path d="M45 58 Q50 63 55 58" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" fill="none" filter="url(#glow)" />
            </>
          )}
          
          {mood === 'neutral' && (
            <>
              {/* Open digital eyes */}
              <circle cx="36" cy="46" r="4.5" fill="#f8fafc" filter="url(#glow)" />
              <circle cx="64" cy="46" r="4.5" fill="#f8fafc" filter="url(#glow)" />
              {/* Soft smile */}
              <path d="M44 56 Q50 61 56 56" stroke="#f8fafc" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </>
          )}
        </svg>
      </motion.div>
    </div>
  );
};

export default function OnboardingTour({ onClose, activeStep, setActiveStep, setActiveTab }: OnboardingTourProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const scrollTimerRef = useRef<number | null>(null);
  const focusDialog = useCallback((node: HTMLDivElement | null) => {
    node?.focus();
  }, []);

  const steps = [
    {
      title: "Добро пожаловать в МосГорБюджет.Трек!",
      text: "Я ваш гид Фини. Покажу, как устроен интерактивный маршрут по бюджету Москвы. За расчёты, викторины и ежедневные задания начисляются учебные баллы, они хранятся в этом браузере.",
      targetSelector: null,
      mood: "waving" as const,
    },
    {
      title: "Ваш профиль и баланс баллов",
      text: "Кольцо у кнопки профиля показывает прогресс уровня. В профиле — баллы, ночная тема и эта экскурсия, рядом кнопка версии для слабовидящих.",
      targetSelector: "#tour-header",
      mood: "neutral" as const,
    },
    {
      title: "Чекап профиля и выбор роли",
      text: "Выберите профиль: Студент, Молодой специалист, Предприниматель или Семья с детьми. Выбор меняет стартовый пример расходов в калькуляторе и помогает собрать персональный маршрут.",
      targetSelector: "#tour-persona",
      mood: "thinking" as const,
    },
    {
      title: "Интерактивный калькулятор 3-НДФЛ",
      text: "Используйте этот калькулятор для расчета социальных вычетов за обучение и спорт. Завершите первую симуляцию расчета по вашей роли, чтобы моментально забрать стартовые +100 баллов!",
      targetSelector: "#tour-calculator",
      mood: "happy" as const,
    },
    {
      title: "Игровой центр и квесты",
      text: "Выполняйте задания, проходите викторины по финансовой грамотности, играйте в симулятор районного бюджета и исследуйте карту Москвы. За достижения начисляются учебные баллы.",
      targetSelector: "#tour-quests",
      mood: "neutral" as const,
    },
    {
      title: "Куда идут деньги",
      text: "Потоки показывают, куда идут расходы Москвы в 2026 году. Нажмите на направление, чтобы увидеть подробности, а чек разложит 1 000 ₽ или ваш вычет по тем же долям.",
      targetSelector: "#tour-analytics",
      mood: "thinking" as const,
    },
    {
      title: "Интерактивный бюджетный справочник",
      text: "Откройте помощника, чтобы получить ответ по бюджетным темам или запустить экспресс-квиз.",
      targetSelector: "#tour-ai",
      mood: "waving" as const,
    },
    {
      title: "Вы готовы исследовать бюджет!",
      text: "Экскурсия завершена. Теперь можно изучать бюджетные показатели, проходить квесты и сверяться со ссылками на официальные источники.",
      targetSelector: null,
      mood: "happy" as const,
    }
  ];

  // Open the tab that holds the current step's target.
  useEffect(() => {
    if (activeStep === 2 || activeStep === 3) {
      setActiveTab('calc');
    } else if (activeStep === 4) {
      setActiveTab('quests');
    } else if (activeStep === 5) {
      setActiveTab('data');
    }
  }, [activeStep, setActiveTab]);

  // Responsive display listener
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update target element dimensions and coordinates
  useEffect(() => {
    if (activeStep === 0 || activeStep === steps.length - 1) {
      setTargetRect(null);
      return;
    }

    const currentStepObj = steps[activeStep];
    if (!currentStepObj || !currentStepObj.targetSelector) return;

    const getTargetElement = () => {
      const selector = isMobile
        ? currentStepObj.targetSelector!.replace(/$/, '-mobile')
        : currentStepObj.targetSelector!;
      return document.querySelector(selector) || document.querySelector(currentStepObj.targetSelector!);
    };

    const updatePosition = (shouldScroll = false) => {
      const el = getTargetElement();
      if (el) {
        if (shouldScroll) {
          const initialRect = el.getBoundingClientRect();
          const isLargeTarget = initialRect.height > window.innerHeight * 0.6;
          el.scrollIntoView({ behavior: 'auto', block: isLargeTarget ? 'start' : 'center' });
        }

        setTargetRect(el.getBoundingClientRect());
      }
    };

    // Delay slightly to allow mobile tabs to animate and update layouts
    const timer = window.setTimeout(() => updatePosition(true), 250);

    const handleViewportChange = () => {
      if (scrollTimerRef.current !== null) {
        window.clearTimeout(scrollTimerRef.current);
      }
      scrollTimerRef.current = window.setTimeout(() => updatePosition(false), 50);
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, { passive: true });
    return () => {
      clearTimeout(timer);
      if (scrollTimerRef.current !== null) {
        window.clearTimeout(scrollTimerRef.current);
        scrollTimerRef.current = null;
      }
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange);
    };
  }, [activeStep, isMobile]);

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    } else {
      safeLocalStorage.setItem('mos_onboarding_completed_v3', 'true');
      onClose();
    }
  };

  const handlePrev = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleSkip = () => {
    safeLocalStorage.setItem('mos_onboarding_completed_v3', 'true');
    onClose();
  };

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        safeLocalStorage.setItem('mos_onboarding_completed_v3', 'true');
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const currentStepData = steps[activeStep];
  if (!currentStepData) return null;

  // Calculate dynamic styling for the floating guide card on desktop
  const getTooltipStyle = () => {
    if (isMobile) {
      const placeAtTop = targetRect !== null && targetRect.top > window.innerHeight * 0.55;
      return {
        position: 'fixed' as const,
        ...(placeAtTop ? { top: '16px' } : { bottom: '80px' }),
        left: '16px',
        right: '16px',
        maxHeight: 'calc(100vh - 112px)',
        overflowY: 'auto' as const,
        zIndex: 250,
      };
    }

    if (!targetRect) {
      // Centered layout for start/finish modals
      return {
        position: 'fixed' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 250,
        width: '450px',
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: 'calc(100vh - 32px)',
        overflowY: 'auto' as const,
      };
    }

    const tooltipWidth = 420;
    const tooltipHeight = 300;
    const gap = 16;
    const isLargeTarget = targetRect.height > window.innerHeight * 0.6;

    let top = isLargeTarget ? window.innerHeight - tooltipHeight - 24 : targetRect.bottom + gap;
    let left = targetRect.left + (targetRect.width - tooltipWidth) / 2;

    // Boundary constraints (horizontal)
    if (left < 16) left = 16;
    if (left + tooltipWidth > window.innerWidth - 16) {
      left = window.innerWidth - tooltipWidth - 16;
    }

    // Place tooltip above target if there's no space below.
    if (!isLargeTarget && top + tooltipHeight > window.innerHeight - 16 && targetRect.top > tooltipHeight + gap) {
      top = targetRect.top - tooltipHeight - gap;
    }

    // Final vertical clamp so the card can never run off the top or bottom of the screen.
    const maxTop = window.innerHeight - tooltipHeight - 16;
    if (top > maxTop) top = Math.max(16, maxTop);
    if (top < 16) top = 16;

    return {
      position: 'fixed' as const,
      top: `${top}px`,
      left: `${left}px`,
      width: `${tooltipWidth}px`,
      maxWidth: 'calc(100vw - 32px)',
      maxHeight: `calc(100vh - ${top + 16}px)`,
      overflowY: 'auto' as const,
      zIndex: 250,
    };
  };

  return (
    <div className="fixed inset-0 z-[200] overflow-visible pointer-events-none">
      {/* 1. Backdrop behind the active step card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="tour-backdrop fixed inset-0 bg-[rgba(8,11,18,0.4)] pointer-events-none"
      />

      {/* 2. A frame around the element the step is about */}
      {targetRect && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed pointer-events-none rounded-[1.25rem] border-2 border-accent shadow-[0_0_0_4px_var(--mgb-accent-soft)]"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            zIndex: 210,
          }}
        />
      )}

      {/* 3. The guide card */}
      <AnimatePresence mode="wait">
        <motion.div
          ref={focusDialog}
          key={activeStep}
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-title"
          aria-describedby="onboarding-description"
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.97, y: isMobile ? 16 : 0 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: isMobile ? 16 : 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          style={getTooltipStyle()}
          className="mgb-card pointer-events-auto flex flex-col gap-3.5 px-5 py-[1.125rem] text-ink outline-none backdrop-blur-xl"
        >
          <div className="flex items-start gap-3.5 pr-10">
            <FinyMascot mood={currentStepData.mood} />
            <div className="min-w-0 flex-1">
              <p className="m-0 text-[0.8125rem] font-semibold text-accent">
                Фини · шаг {activeStep + 1} из {steps.length}
              </p>
              <h3 id="onboarding-title" className="m-0 mt-0.5 text-[1.125rem] font-semibold leading-snug tracking-[-0.01em]">
                {currentStepData.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            aria-label="Пропустить экскурсию"
            className="mgb-glass absolute right-3.5 top-3.5 grid size-10 place-items-center rounded-full text-ink"
          >
            <X size={16} strokeWidth={2.4} aria-hidden="true" />
          </button>

          <p id="onboarding-description" className="m-0 text-[0.9375rem] leading-[1.45] text-ink-2 [text-wrap:pretty]">
            {currentStepData.text}
          </p>

          <div className="flex items-center justify-between gap-3 border-t border-line pt-3.5">
            <div aria-hidden="true" className="flex shrink-0 gap-1.5">
              {steps.map((_, idx) => (
                <span
                  key={idx}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    idx === activeStep ? 'w-4 bg-accent' : idx < activeStep ? 'w-1.5 bg-c3' : 'w-1.5 bg-track',
                  )}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {activeStep > 0 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="flex h-11 items-center gap-1 rounded-full border border-line bg-card px-3.5 text-[0.875rem] font-semibold text-ink"
                >
                  <ChevronLeft size={16} strokeWidth={2.4} aria-hidden="true" />
                  Назад
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                className="flex h-11 items-center gap-1 rounded-full bg-accent-fill px-4 text-[0.875rem] font-semibold text-white shadow-[0_10px_20px_-14px_var(--mgb-accent)]"
              >
                {activeStep === 0 ? 'Начать экскурсию' : activeStep === steps.length - 1 ? 'Поехали!' : 'Далее'}
                {activeStep < steps.length - 1 && <ChevronRight size={16} strokeWidth={2.4} aria-hidden="true" />}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
