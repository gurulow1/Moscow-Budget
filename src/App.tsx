import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Header from './components/Header';
import PersonaSelector from './components/PersonaSelector';
import TaxCalculator from './components/TaxCalculator';
import QuestDashboard from './components/QuestDashboard';
import AnalyticsChart from './components/AnalyticsChart';
import BudgetAIChatDrawer from './components/BudgetAIChatDrawer';
import SplashPortal from './components/SplashPortal';
import OnboardingTour from './components/OnboardingTour';
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
  
  const [completedActivities, setCompletedActivities] = useState<string[]>(() => {
    return readStoredStringArray('mos_completed_activities_v3');
  });

  const [isDataLoading, setIsDataLoading] = useState(false);

  useEffect(() => {
    setIsDataLoading(true);
    const timer = setTimeout(() => {
      setIsDataLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [persona]);
  
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

  const getTourClass = (stepId: number) => {
    if (tourStep === null) return '';
    if (tourStep === stepId) {
      return 'relative z-[220] ring-4 ring-[#CC1111]/30 transition-all duration-300';
    }
    return 'blur-[2px] opacity-20 pointer-events-none scale-[0.98] transition-all duration-500';
  };

  const handleCalculate = () => {
    if (!calculatorTaskCompleted) {
      setCalculatorTaskCompleted(true);
      safeLocalStorage.setItem('mos_calc_completed_v3', 'true');
      setBalance(prev => prev + 100);
    }
  };

  const quizzesIds = ['quiz-1', 'quiz-2', 'quiz-3', 'quiz-4', 'quiz-5'];
  const availableQuizzesCount = quizzesIds.filter(id => !completedActivities.includes(id)).length;

  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return (
      <SplashPortal 
        onEnter={() => {
          setShowSplash(false);
          const completed = safeLocalStorage.getItem('mos_onboarding_completed_v3');
          if (completed !== 'true') {
            setTourStep(0);
          }
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-[#0F172A] dark:text-slate-100 flex flex-col md:py-6 relative pb-16 md:pb-0">
      
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-950">
          <span><strong>Конкурсный прототип:</strong> не является официальным сервисом и не подключён к городским информационным системам.</span>
          <a href="https://budget.mos.ru/news/14617" target="_blank" rel="noopener noreferrer" className="shrink-0 font-bold text-[#CC1111] hover:underline">
            Источник данных →
          </a>
        </div>
        
        {/* Header (local demo profile and learning points) */}
        <div className={cn("py-2 md:py-0 transition-all duration-500", getTourClass(1))} id="tour-header">
          <Header balance={balance} totalXp={totalXp} completedActivities={completedActivities} />
        </div>
        
        {/* DESKTOP LAYOUT (md Breakpoint & Above) */}
        <main className="hidden md:grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Block 1: Persona switcher card */}
          <div className={cn("lg:col-span-12 transition-all duration-500", getTourClass(2))} id="tour-persona">
            <PersonaSelector activePersona={persona} onSelect={setPersona} isLoading={isDataLoading} />
          </div>
          
          {/* Block 2: Interactive Tax Calculator */}
          <div className={cn("lg:col-span-12 flex flex-col transition-all duration-500", getTourClass(3))} id="tour-calculator">
            <TaxCalculator 
              activePersona={persona} 
              onCalculate={handleCalculate} 
              isCompleted={calculatorTaskCompleted} 
              isLoading={isDataLoading}
            />
          </div>
          
          {/* Block 3: Gamified Quests Dashboard */}
          <div className={cn("lg:col-span-12 flex flex-col transition-all duration-500", getTourClass(4))} id="tour-quests">
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
          
          {/* Block 4: Budget breakdown visualization */}
          <div className={cn("lg:col-span-12 transition-all duration-500", getTourClass(5))} id="tour-analytics">
            <AnalyticsChart isLoading={isDataLoading} />
          </div>

        </main>

        {/* MOBILE ACTIVE TAB LAYOUT */}
        <main className="md:hidden flex-1 px-0.5 pb-36 relative overflow-x-hidden flex flex-col">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeMobileTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="space-y-4 w-full flex-1"
            >
              {activeMobileTab === 'calc' && (
                <>
                  <div className={cn("transition-all duration-500", getTourClass(2))} id="tour-persona-mobile">
                    <PersonaSelector activePersona={persona} onSelect={setPersona} isLoading={isDataLoading} />
                  </div>
                  <div className={cn("transition-all duration-500", getTourClass(3))} id="tour-calculator-mobile">
                    <TaxCalculator 
                      activePersona={persona} 
                      onCalculate={handleCalculate} 
                      isCompleted={calculatorTaskCompleted} 
                      isLoading={isDataLoading}
                    />
                  </div>
                </>
              )}
              
              {activeMobileTab === 'quests' && (
                <div className={cn("transition-all duration-500", getTourClass(4))} id="tour-quests-mobile">
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
              )}
              
              {activeMobileTab === 'analytics' && (
                <div className={cn("transition-all duration-500", getTourClass(5))} id="tour-analytics-mobile">
                  <AnalyticsChart isLoading={isDataLoading} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Project footer, hidden on mobile for compact layout */}
        <footer className="hidden md:flex mt-8 pt-6 border-t border-[#E2E8F0] text-center flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-[#475569]">
          <span>МосГорБюджет.Трек — конкурсный прототип, не официальный сервис Правительства Москвы</span>
          <div className="flex items-center gap-4">
            <a href="https://budget.mos.ru" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 transition-colors">Портал бюджета</a>
            <span>•</span>
            <a href="https://ag.mos.ru" target="_blank" rel="noopener noreferrer" className="hover:text-[#CC1111] transition-colors text-[#475569] font-bold">Активный Гражданин</a>
          </div>
        </footer>

      </div>

      {/* MOBILE STICKY BOTTOM ACTIONS BAR (Audit #2: Height 56px (h-14), sits above the 14h mobile navigation tray) */}
      <AnimatePresence>
        {activeMobileTab === 'calc' && (
          <motion.div 
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className={cn(
              "md:hidden fixed bottom-14 left-0 right-0 h-14 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-stretch z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] transition-all duration-500",
              tourStep !== null && "blur-xs opacity-20 pointer-events-none"
            )}
          >
            <button
              onClick={() => {
                handleCalculate();
                if (!calculatorTaskCompleted) {
                  const el = document.getElementById('tour-calculator-mobile');
                  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
              disabled={calculatorTaskCompleted}
              className={cn(
                "w-full text-center text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 px-6 transition-all",
                calculatorTaskCompleted 
                  ? "bg-slate-100 dark:bg-slate-800 text-[#0F172A] dark:text-slate-300 font-extrabold" 
                  : "bg-[#CC1111] hover:bg-[#A30E0E] text-white active:scale-95 duration-100"
              )}
            >
              {calculatorTaskCompleted ? (
                <>
                  <Check size={16} className="text-emerald-600 stroke-[3px]" /> Награда +100 Б успешно получена
                </>
              ) : (
                <>
                  <Sparkles size={16} className="animate-pulse" /> Рассчитать вычет и забрать 100 Б
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MOBILE BOTTOM NAVIGATION BAR with high contrast active states, slide-top indicator lines, and red quiz badges */}
      <div className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-950 border-t border-[#E2E8F0] dark:border-slate-800 z-50 h-14 flex items-center justify-around px-2 shadow-lg pb-safe transition-all duration-500",
        tourStep !== null && "blur-xs opacity-20 pointer-events-none"
      )}>
        {/* Tab 1: Calculator */}
        <button 
          onClick={() => setActiveMobileTab('calc')}
          className={cn(
            "relative flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all outline-none h-full",
            activeMobileTab === 'calc' ? "text-[#CC1111] dark:text-red-500" : "text-slate-400 dark:text-slate-500"
          )}
        >
          {activeMobileTab === 'calc' && (
            <motion.div 
              layoutId="mobileTabActiveLine"
              className="absolute top-0 w-8 h-1 bg-[#CC1111] rounded-full"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <Calculator size={18} className={cn("transition-transform", activeMobileTab === 'calc' ? "scale-110 drop-shadow-sm" : "")} />
          <span className="text-[10px] font-extrabold tracking-tight">Калькулятор</span>
        </button>
        
        {/* Tab 2: Quests Track inside available red badge overlay */}
        <button 
          onClick={() => setActiveMobileTab('quests')}
          className={cn(
            "relative flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all outline-none h-full",
            activeMobileTab === 'quests' ? "text-[#CC1111] dark:text-red-500" : "text-slate-400 dark:text-slate-500"
          )}
        >
          {activeMobileTab === 'quests' && (
            <motion.div 
              layoutId="mobileTabActiveLine"
              className="absolute top-0 w-8 h-1 bg-[#CC1111] rounded-full"
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
          className={cn(
            "relative flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all outline-none h-full",
            activeMobileTab === 'analytics' ? "text-[#CC1111] dark:text-red-500" : "text-slate-400 dark:text-slate-500"
          )}
        >
          {activeMobileTab === 'analytics' && (
            <motion.div 
              layoutId="mobileTabActiveLine"
              className="absolute top-0 w-8 h-1 bg-[#CC1111] rounded-full"
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
