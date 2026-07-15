import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, X, Sparkles, HelpCircle } from 'lucide-react';
import { cn, safeLocalStorage } from '../lib/utils';

interface OnboardingTourProps {
  onClose: () => void;
  activeStep: number;
  setActiveStep: (step: number) => void;
  setActiveMobileTab: (tab: 'calc' | 'quests' | 'analytics') => void;
}

const FinyMascot = ({ mood }: { mood: 'happy' | 'waving' | 'thinking' | 'neutral' }) => {
  return (
    <div className="relative w-16 h-16 shrink-0 select-none mx-auto sm:mx-0">
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        className="w-full h-full"
      >
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_4px_12px_rgba(204,17,17,0.3)]">
          <defs>
            <radialGradient id="bodyGrad" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ff4d4d" />
              <stop offset="80%" stopColor="#CC1111" />
              <stop offset="100%" stopColor="#880000" />
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

export default function OnboardingTour({ onClose, activeStep, setActiveStep, setActiveMobileTab }: OnboardingTourProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const scrollTimerRef = useRef<number | null>(null);

  const steps = [
    {
      title: "Добро пожаловать в МосГорБюджет.Трек!",
      text: "Я ваш гид Фини. Покажу, как устроен интерактивный маршрут по бюджету Москвы. За знания и ежедневные задания начисляются городские баллы — их можно использовать в программах «Миллион призов» и «Активный гражданин».",
      targetSelector: null,
      mood: "waving" as const,
    },
    {
      title: "Ваш профиль и баланс баллов",
      text: "В шапке находится профиль участника. Здесь собраны уровень, опыт и баллы маршрута.",
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
      text: "Выполняйте задания, проходите викторины по финансовой грамотности, играйте в симулятор районного бюджета и исследуйте карту Москвы. Достижения пополняют баланс городских баллов.",
      targetSelector: "#tour-quests",
      mood: "neutral" as const,
    },
    {
      title: "Интерактивная аналитика бюджета",
      text: "Исследуйте структуру расходов Москвы на 2026 год. Режим вычета показывает, как меняется масштаб разных направлений.",
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

  // Sync tab switching on mobile based on current step
  useEffect(() => {
    if (activeStep === 2 || activeStep === 3) {
      setActiveMobileTab('calc');
    } else if (activeStep === 4) {
      setActiveMobileTab('quests');
    } else if (activeStep === 5) {
      setActiveMobileTab('analytics');
    } else if (activeStep === 6) {
      // FAB chat button is visible on calc/analytics tab, go back to calc
      setActiveMobileTab('calc');
    }
  }, [activeStep, setActiveMobileTab]);

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
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);

        if (shouldScroll) {
          const isLargeTarget = rect.height > window.innerHeight * 0.6;
          el.scrollIntoView({ behavior: 'smooth', block: isLargeTarget ? 'start' : 'center' });
        }
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

  const currentStepData = steps[activeStep];
  if (!currentStepData) return null;

  // Calculate dynamic styling for the floating guide card on desktop
  const getTooltipStyle = () => {
    if (isMobile) {
      return {
        position: 'fixed' as const,
        bottom: '80px',
        left: '16px',
        right: '16px',
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
      maxHeight: 'calc(100vh - 32px)',
      overflowY: 'auto' as const,
      zIndex: 250,
      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    };
  };

  return (
    <div className="fixed inset-0 z-[200] overflow-visible pointer-events-none select-none">
      {/* 1. Global blurring backdrop overlay behind the active step card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-950/20 backdrop-blur-[1px] pointer-events-none"
      />

      {/* 2. Highlights overlay frame (draws transparent highlight around the targeted element) */}
      {targetRect && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed pointer-events-none rounded-2xl border-2 border-[#CC1111] shadow-[0_0_0_9999px_rgba(15,23,42,0.45),0_0_20px_rgba(204,17,17,0.4)]"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            zIndex: 210,
            transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      )}

      {/* 3. The Guide Card UI itself */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, scale: 0.95, y: isMobile ? 20 : 0 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: isMobile ? 20 : 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          style={getTooltipStyle()}
          className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] pointer-events-auto flex flex-col gap-4 select-none relative overflow-hidden"
        >
          {/* Subtle Moscow coat of arms decorative red background glow */}
          <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-[#CC1111]/5 blur-2xl pointer-events-none" />

          {/* Top Row: Mascot & Step Progress */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <FinyMascot mood={currentStepData.mood} />
            
            <div className="flex-1 text-center sm:text-left min-w-0">
              <div className="flex items-center justify-center sm:justify-between flex-wrap gap-1 mb-1">
                <span className="text-[10px] font-black uppercase text-[#CC1111] dark:text-red-400 tracking-wider">
                  Ассистент Фини • Шаг {activeStep + 1} из {steps.length}
                </span>
                
                {activeStep > 0 && activeStep < steps.length - 1 && (
                  <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/45 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md font-bold tracking-tight">
                    Интерактив
                  </span>
                )}
              </div>
              
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
                {currentStepData.title}
              </h3>
            </div>

            {/* Skip X icon inside Welcome/Main Tour */}
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 outline-none"
              title="Пропустить обучение"
            >
              <X size={16} className="stroke-[2.5px]" />
            </button>
          </div>

          {/* Text Message */}
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            {currentStepData.text}
          </p>

          {/* Bottom Actions Bar */}
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 mt-1">
            {/* Left page indicator dots */}
            <div className="flex gap-1.5 shrink-0">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all duration-300",
                    idx === activeStep 
                      ? "bg-[#CC1111] w-4" 
                      : idx < activeStep 
                        ? "bg-emerald-500" 
                        : "bg-slate-200 dark:bg-slate-700"
                  )}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-2">
              {activeStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="px-3 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-extrabold text-xs rounded-xl flex items-center gap-1 transition-all outline-none"
                >
                  <ChevronLeft size={14} className="stroke-[3px]" />
                  Назад
                </button>
              )}

              <button
                onClick={handleNext}
                className={cn(
                  "px-4 py-2 font-extrabold text-xs rounded-xl flex items-center gap-1 transition-all outline-none text-white",
                  activeStep === steps.length - 1 
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-700/10" 
                    : "bg-[#CC1111] hover:bg-[#A30E0E]"
                )}
              >
                {activeStep === 0 ? (
                  <>Начать экскурсию <ChevronRight size={14} className="stroke-[3px]" /></>
                ) : activeStep === steps.length - 1 ? (
                  <>Поехали! <Sparkles size={14} className="animate-pulse" /></>
                ) : (
                  <>Далее <ChevronRight size={14} className="stroke-[3px]" /></>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
