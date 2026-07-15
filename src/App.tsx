import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Header from './components/Header';
import PersonaSelector from './components/PersonaSelector';
import TaxCalculator, { type TaxCalculation } from './components/TaxCalculator';
import QuestDashboard from './components/QuestDashboard';
import AnalyticsChart from './components/AnalyticsChart';
import BudgetAIChatDrawer from './components/BudgetAIChatDrawer';
import SplashPortal from './components/SplashPortal';
import OnboardingTour from './components/OnboardingTour';
import LearningAssessment from './components/LearningAssessment';
import { Persona } from '../types';
import { Calculator, Target, PieChart as PieChartIcon, Check, Sparkles } from 'lucide-react';
import { cn, readStoredNumber, readStoredStringArray, safeLocalStorage } from './lib/utils';

export default function App() {
  const [balance, setBalance] = useState<number>(() => {
    return readStoredNumber('mos_game_balance_v3');
  });
  
  useEffect(() => {
    safeLocalStorage.setItem('mos_game_balance_v3', balance.toString());
  }, [balance]);

  const [persona, setPersona] = useState<Persona>('Student');
  const [calculatorTaskCompleted, setCalculatorTaskCompleted] = useState(() => {
    const saved = safeLocalStorage.getItem('mos_calc_completed_v3');
    return saved === 'true';
  });
  const [savedCalculation, setSavedCalculation] = useState<TaxCalculation | null>(() => {
    const raw = safeLocalStorage.getItem('mos_calc_last_model');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<TaxCalculation>;
      if (
        Number.isFinite(parsed.education) &&
        Number.isFinite(parsed.sport) &&
        Number.isFinite(parsed.deduction)
      ) {
        return {
          education: Number(parsed.education),
          sport: Number(parsed.sport),
          deduction: Number(parsed.deduction),
        };
      }
    } catch {
      // Ignore stale local demo data and start with a clean calculation.
    }
    return null;
  });
  
  const [completedActivities, setCompletedActivities] = useState<string[]>(() => {
    return readStoredStringArray('mos_completed_activities_v3');
  });

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  useEffect(() => {
    safeLocalStorage.setItem('mos_completed_activities_v3', JSON.stringify(completedActivities));
  }, [completedActivities]);

  const [totalXp, setTotalXp] = useState<number>(() => {
    return readStoredNumber('mos_total_xp_v3', balance);
  });

  useEffect(() => {
    safeLocalStorage.setItem('mos_total_xp_v3', totalXp.toString());
  }, [totalXp]);

  useEffect(() => {
    if (balance > totalXp) {
      setTotalXp(balance);
    }
  }, [balance, totalXp]);

  const [activeMobileTab, setActiveMobileTab] = useState<'calc' | 'quests' | 'analytics'>('calc');
  
  // Onboarding Tour State
  const [tourStep, setTourStep] = useState<number | null>(null);

  useEffect(() => {
    const handleStartTour = () => {
      setTourStep(0);
    };
    window.addEventListener('start_mos_onboarding', handleStartTour);
    return () => window.removeEventListener('start_mos_onboarding', handleStartTour);
  }, []);

  useEffect(() => {
    const handleFocusCalculator = () => {
      setActiveMobileTab('calc');
      window.requestAnimationFrame(() => {
        document.getElementById('tour-calculator')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    };
    window.addEventListener('focus_mos_calculator', handleFocusCalculator);
    return () => window.removeEventListener('focus_mos_calculator', handleFocusCalculator);
  }, []);

  const getTourClass = (stepId: number) => {
    if (tourStep === null) return '';
    if (tourStep === stepId) {
      return 'relative z-[220] ring-4 ring-[#CC1111]/30 transition-all duration-300';
    }
    return 'blur-[2px] opacity-20 pointer-events-none scale-[0.98] transition-all duration-500';
  };

  const handleCalculate = (calculation: TaxCalculation) => {
    setSavedCalculation(calculation);
    safeLocalStorage.setItem('mos_calc_last_model', JSON.stringify(calculation));
    if (!calculatorTaskCompleted) {
      setCalculatorTaskCompleted(true);
      safeLocalStorage.setItem('mos_calc_completed_v3', 'true');
      setBalance(prev => prev + 100);
    }
  };

  const handleResetDemo = () => {
    [
      'mos_game_balance_v3',
      'mos_total_xp_v3',
      'mos_calc_completed_v3',
      'mos_calc_last_model',
      'mos_calc_last_deduction',
      'mos_completed_activities_v3',
      'mos_unlocked_nfts_v3',
      'mos_ai_chat_history',
      'mos_ai_drawer_history',
      'mos_my_district',
      'mos_splash_seen_v3',
      'mos_onboarding_completed_v3',
      'mos_learning_assessment_v1',
      'mos_city_rewards_preview_v1',
    ].forEach(key => safeLocalStorage.removeItem(key));
    window.location.reload();
  };

  const quizzesIds = ['quiz-1', 'quiz-2', 'quiz-3', 'quiz-4', 'quiz-5'];
  const availableQuizzesCount = quizzesIds.filter(id => !completedActivities.includes(id)).length;
  const hasLearningPractice = calculatorTaskCompleted && completedActivities.some(id =>
    id.startsWith('quiz-') || id.startsWith('daily-quiz-') || id.startsWith('mayor-success-'),
  );

  const showMobileTab = (tab: 'calc' | 'quests' | 'analytics', visibleClass = 'block') =>
    isMobile && activeMobileTab !== tab ? 'hidden' : visibleClass;

  const [showSplash, setShowSplash] = useState(() => safeLocalStorage.getItem('mos_splash_seen_v3') !== 'true');

  if (showSplash) {
    return (
      <SplashPortal 
        onEnter={() => {
          setShowSplash(false);
          safeLocalStorage.setItem('mos_splash_seen_v3', 'true');
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-[#172033] dark:text-slate-100 flex flex-col md:py-6 relative pb-20 md:pb-0">
      
      {/* Expose the tour component globally above everything else */}
      {tourStep !== null && (
        <OnboardingTour
          activeStep={tourStep}
          setActiveStep={setTourStep}
          onClose={() => setTourStep(null)}
          setActiveMobileTab={setActiveMobileTab}
        />
      )}

      <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 mx-auto flex flex-col gap-4 md:gap-6 flex-1 pb-16 md:pb-4 relative z-10">
        {/* Header (local demo profile and learning points) */}
        <div className={cn("py-2 md:py-0 transition-all duration-500", getTourClass(1))} id="tour-header">
          <Header balance={balance} totalXp={totalXp} completedActivities={completedActivities} onReset={handleResetDemo} />
        </div>
        
        {/* One responsive tree: each module stays mounted, so tab changes do not erase user work. */}
        <main className="flex-1 px-0.5 pb-36 relative overflow-x-hidden flex flex-col gap-4 md:gap-6">
          <div className={cn(showMobileTab('calc'), "transition-all duration-300", getTourClass(2))} id="tour-persona">
            <PersonaSelector activePersona={persona} onSelect={setPersona} />
          </div>

          <div className={cn(showMobileTab('calc'), "transition-all duration-300")}>
            <LearningAssessment postUnlocked={hasLearningPractice} />
          </div>

          <div className={cn(showMobileTab('calc', 'flex flex-col'), "transition-all duration-300", getTourClass(3))} id="tour-calculator">
            <TaxCalculator
              activePersona={persona}
              onCalculate={handleCalculate}
              isCompleted={calculatorTaskCompleted}
              savedCalculation={savedCalculation}
            />
          </div>

          <div className={cn(showMobileTab('quests', 'flex flex-col'), "transition-all duration-300", getTourClass(4))} id="tour-quests">
            <QuestDashboard
              isCalculatorCompleted={calculatorTaskCompleted}
              balance={balance}
              setBalance={setBalance}
              completedActivities={completedActivities}
              setCompletedActivities={setCompletedActivities}
              totalXp={totalXp}
              setTotalXp={setTotalXp}
            />
          </div>

          <div className={cn(showMobileTab('analytics'), "transition-all duration-300", getTourClass(5))} id="tour-analytics">
            <AnalyticsChart />
          </div>
        </main>

        {/* Project footer, hidden on mobile for compact layout */}
        <footer className="hidden md:flex mt-8 pt-6 border-t border-[#E2E8F0] text-center flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-[#475569]">
          <span>МосГорБюджет.Трек</span>
          <div className="flex items-center gap-4">
            <a href="https://budget.mos.ru" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 transition-colors">Портал бюджета</a>
            <span>•</span>
            <a href="https://ag.mos.ru" target="_blank" rel="noopener noreferrer" className="hover:text-[#CC1111] transition-colors text-[#475569] font-bold">Активный Гражданин</a>
          </div>
        </footer>

      </div>

      {/* MOBILE PRIMARY ACTION: a small floating island keeps the content breathable. */}
      <AnimatePresence>
        {activeMobileTab === 'calc' && (
          <motion.div 
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className={cn(
              "md:hidden fixed bottom-[5.25rem] left-4 right-20 h-12 glass-island rounded-full p-1 z-40 transition-all duration-500",
              tourStep !== null && "blur-xs opacity-20 pointer-events-none"
            )}
          >
            <button
              onClick={() => {
                document.getElementById('tour-calculator')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={cn(
                "w-full h-full rounded-full text-center text-xs font-extrabold tracking-tight flex items-center justify-center gap-2 px-4 transition-all",
                calculatorTaskCompleted 
                  ? "bg-[#DDF7F1] text-[#0B766E] font-extrabold"
                  : "teal-action active:scale-95 duration-100"
              )}
            >
              {calculatorTaskCompleted ? (
                <>
                  <Check size={16} className="text-emerald-600 stroke-[3px]" /> Расчёт сохранён
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Перейти к расчёту
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MOBILE BOTTOM NAVIGATION: floating capsule, light active state, no full-width rails. */}
      <div className={cn(
        "md:hidden fixed bottom-3 left-4 right-4 glass-island rounded-full z-50 h-14 flex items-center justify-around px-2 pb-safe transition-all duration-500",
        tourStep !== null && "blur-xs opacity-20 pointer-events-none"
      )}>
        {/* Tab 1: Calculator */}
        <button 
          onClick={() => setActiveMobileTab('calc')}
          aria-current={activeMobileTab === 'calc' ? 'page' : undefined}
          className={cn(
            "relative flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-all outline-none h-11 rounded-full",
            activeMobileTab === 'calc' ? "bg-[#DDF7F1] text-[#0B766E]" : "text-slate-400 dark:text-slate-500"
          )}
        >
          {activeMobileTab === 'calc' && (
            <motion.div 
              layoutId="mobileTabActiveLine"
              className="absolute bottom-1 w-5 h-0.5 bg-[#0F9F91] rounded-full"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <Calculator size={18} className={cn("transition-transform", activeMobileTab === 'calc' ? "scale-110 drop-shadow-sm" : "")} />
          <span className="text-[10px] font-extrabold tracking-tight">Калькулятор</span>
        </button>
        
        {/* Tab 2: Quests Track inside available red badge overlay */}
        <button 
          onClick={() => setActiveMobileTab('quests')}
          aria-current={activeMobileTab === 'quests' ? 'page' : undefined}
          className={cn(
            "relative flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-all outline-none h-11 rounded-full",
            activeMobileTab === 'quests' ? "bg-[#DDF7F1] text-[#0B766E]" : "text-slate-400 dark:text-slate-500"
          )}
        >
          {activeMobileTab === 'quests' && (
            <motion.div 
              layoutId="mobileTabActiveLine"
              className="absolute bottom-1 w-5 h-0.5 bg-[#0F9F91] rounded-full"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <div className="relative">
            <Target size={18} className={cn("transition-transform", activeMobileTab === 'quests' ? "scale-110 drop-shadow-sm" : "")} />
            {/* Red circle available quiz count notification badge */}
            {availableQuizzesCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-[#CC1111] dark:bg-red-600 text-white text-[9px] font-black h-4 min-w-4 px-1 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-950 animate-pulse">
                {availableQuizzesCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-extrabold tracking-tight">Квесты</span>
        </button>
        
        {/* Tab 3: Analytics */}
        <button 
          onClick={() => setActiveMobileTab('analytics')}
          aria-current={activeMobileTab === 'analytics' ? 'page' : undefined}
          className={cn(
            "relative flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-all outline-none h-11 rounded-full",
            activeMobileTab === 'analytics' ? "bg-[#DDF7F1] text-[#0B766E]" : "text-slate-400 dark:text-slate-500"
          )}
        >
          {activeMobileTab === 'analytics' && (
            <motion.div 
              layoutId="mobileTabActiveLine"
              className="absolute bottom-1 w-5 h-0.5 bg-[#0F9F91] rounded-full"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <PieChartIcon size={18} className={cn("transition-transform", activeMobileTab === 'analytics' ? "scale-110 drop-shadow-sm" : "")} />
          <span className="text-[10px] font-extrabold tracking-tight">Аналитика</span>
        </button>
      </div>
      
      {/* Global local-reference drawer and mobile FAB button */}
      <BudgetAIChatDrawer activeMobileTab={activeMobileTab} tourStep={tourStep} />
    </div>
  );
}
