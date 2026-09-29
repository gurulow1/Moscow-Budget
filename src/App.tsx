import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';
import HelperChat from './components/HelperChat';
import OnboardingTour from './components/OnboardingTour';
import ProfileSheet from './components/ProfileSheet';
import AccessibilityPanel, {
  applyAccessibilitySettings,
  readAccessibilitySettings,
} from './components/AccessibilityPanel';
import AppHeader from './ui/AppHeader';
import Aurora from './ui/Aurora';
import TabBar, { APP_TABS, SideNav, type AppTab } from './ui/TabBar';
import HomeScreen from './screens/HomeScreen';
import DeductionScreen from './screens/DeductionScreen';
import QuestsScreen from './screens/QuestsScreen';
import DataScreen from './screens/DataScreen';
import SplashScreen from './screens/SplashScreen';
import BudgetBalancer from './screens/games/BudgetBalancer';
import Auditor from './screens/games/Auditor';
import InvestStrategist from './screens/games/InvestStrategist';
import DeductionClick from './screens/games/DeductionClick';
import DevelopmentVector from './screens/games/DevelopmentVector';
import NeedsProfile from './screens/games/NeedsProfile';
import FiscalExpert from './screens/games/FiscalExpert';
import AnalyticSurfing from './screens/games/AnalyticSurfing';
import DistrictMap from './screens/games/DistrictMap';
import QuizFlow from './screens/QuizFlow';
import MayorFlow from './screens/MayorFlow';
import { BUDGET_FACTS } from './data/budgetFacts';
import {
  GAMES,
  MAP_ITEM,
  QUIZZES,
  QUIZ_PREREQUISITE,
  SPECIALS,
  getDailyQuiz,
  readLedger,
  saveLedger,
  todayEntry,
  withDailyResult,
} from './data/quests';
import { cn, readStoredNumber, readStoredStringArray, safeLocalStorage } from './lib/utils';
import { getLevelInfo, QUIZ_IDS } from './lib/progress';
import type { TaxCalculation } from './lib/deduction';
import { useTheme } from './lib/theme';

const QUEST_ITEMS = [...GAMES, ...SPECIALS];
const GAME_VIEWS: Record<string, typeof BudgetBalancer> = {
  'game-1': BudgetBalancer,
  'game-2': Auditor,
  'game-3': InvestStrategist,
  'game-4': DeductionClick,
  'game-5': DevelopmentVector,
  'special-1': NeedsProfile,
  'special-2': FiscalExpert,
  'special-3': AnalyticSurfing,
};

// The address holds the tab and, on «Квесты», an open step: #quests/daily, #quests/quiz-2, #quests/mayor/tverskoy.
interface Route {
  tab: AppTab;
  flow: string | null;
  arg: string | null;
}

const readRoute = (): Route => {
  const [tab = '', flow = '', arg = ''] = window.location.hash.slice(1).split('/');
  if (!APP_TABS.some((item) => item.id === tab)) return { tab: 'home', flow: null, arg: null };
  return { tab: tab as AppTab, flow: (tab === 'quests' && flow) || null, arg: arg || null };
};

const goTo = (tab: AppTab) => {
  if (window.location.hash !== `#${tab}`) window.location.hash = tab;
};

const readSavedCalculation = (): TaxCalculation | null => {
  const raw = safeLocalStorage.getItem('mos_calc_last_model');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<TaxCalculation>;
    if (Number.isFinite(parsed.education) && Number.isFinite(parsed.sport) && Number.isFinite(parsed.deduction)) {
      return { education: Number(parsed.education), sport: Number(parsed.sport), deduction: Number(parsed.deduction) };
    }
  } catch {
    // Ignore stale local demo data and start with a clean calculation.
  }
  return null;
};

export default function App() {
  const [accessibilitySettings, setAccessibilitySettings] = useState(readAccessibilitySettings);
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { isDark, toggle: toggleTheme } = useTheme();
  const [route, setRoute] = useState<Route>(readRoute);
  const tab = route.tab;

  useLayoutEffect(() => {
    applyAccessibilitySettings(accessibilitySettings);
  }, [accessibilitySettings]);

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(readRoute());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // A step opened from inside the app closes with Back, so the phone's Back button does the same.
  const flowOpenedHere = useRef(false);
  const openFlow = useCallback((flow: string) => {
    flowOpenedHere.current = true;
    window.location.hash = `quests/${flow}`;
  }, []);
  const closeFlow = useCallback(() => {
    if (flowOpenedHere.current) window.history.back();
    else window.location.replace('#quests');
  }, []);
  const toQuests = useCallback(() => {
    flowOpenedHere.current = false;
    window.location.replace('#quests');
  }, []);

  const [balance, setBalance] = useState<number>(() => readStoredNumber('mos_game_balance_v3'));
  useEffect(() => {
    safeLocalStorage.setItem('mos_game_balance_v3', balance.toString());
  }, [balance]);

  const [calculatorTaskCompleted, setCalculatorTaskCompleted] = useState(
    () => safeLocalStorage.getItem('mos_calc_completed_v3') === 'true',
  );
  const [savedCalculation, setSavedCalculation] = useState<TaxCalculation | null>(readSavedCalculation);

  const [completedActivities, setCompletedActivities] = useState<string[]>(() =>
    readStoredStringArray('mos_completed_activities_v3'),
  );
  useEffect(() => {
    safeLocalStorage.setItem('mos_completed_activities_v3', JSON.stringify(completedActivities));
  }, [completedActivities]);

  const [totalXp, setTotalXp] = useState<number>(() => readStoredNumber('mos_total_xp_v3', balance));
  useEffect(() => {
    safeLocalStorage.setItem('mos_total_xp_v3', totalXp.toString());
  }, [totalXp]);
  useEffect(() => {
    if (balance > totalXp) setTotalXp(balance);
  }, [balance, totalXp]);

  const [ledger, setLedger] = useState(readLedger);
  useEffect(() => {
    saveLedger(ledger);
  }, [ledger]);


  // Points for a quiz, a game or a district are given once per activity.
  const completeActivity = (id: string, points: number) => {
    if (completedActivities.includes(id)) return false;
    setCompletedActivities((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setBalance((prev) => prev + points);
    return true;
  };

  const recordDailyResult = (quizId: string, correctAnswers: number) => {
    const first = !todayEntry(ledger);
    setLedger((current) => withDailyResult(current, quizId, correctAnswers));
    return first;
  };

  const [tourStep, setTourStep] = useState<number | null>(null);

  const closeAccessibility = useCallback(() => setAccessibilityOpen(false), []);
  const openAccessibility = useCallback(() => {
    setTourStep(null);
    setProfileOpen(false);
    setAccessibilitySettings((current) => (current.enabled ? current : { ...current, enabled: true }));
    setAccessibilityOpen(true);
  }, []);
  const closeProfile = useCallback(() => setProfileOpen(false), []);

  useEffect(() => {
    const handleStartTour = () => {
      setProfileOpen(false);
      setTourStep(0);
    };
    window.addEventListener('start_mos_onboarding', handleStartTour);
    return () => window.removeEventListener('start_mos_onboarding', handleStartTour);
  }, []);

  const startDailyQuiz = useCallback(() => openFlow('daily'), [openFlow]);

  const handleSaveCalculation = (calculation: TaxCalculation) => {
    setSavedCalculation(calculation);
    safeLocalStorage.setItem('mos_calc_last_model', JSON.stringify(calculation));
    if (!calculatorTaskCompleted) {
      setCalculatorTaskCompleted(true);
      safeLocalStorage.setItem('mos_calc_completed_v3', 'true');
      setBalance((prev) => prev + 100);
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
      'mos_interests_v1',
    ].forEach((key) => safeLocalStorage.removeItem(key));
    window.location.hash = '';
    window.location.reload();
  };

  const level = getLevelInfo(totalXp);
  const availableQuizzesCount = QUIZ_IDS.filter((id) => !completedActivities.includes(id)).length;
  const hasLearningPractice =
    calculatorTaskCompleted &&
    completedActivities.some((id) => id.startsWith('quiz-') || id.startsWith('daily-quiz-') || id.startsWith('mayor-success-'));

  const HEADINGS: Record<AppTab, { title: string; sub: string }> = {
    home: { title: 'Бюджет Москвы', sub: '2026 год · закон № 39 от 01.11.2025' },
    calc: { title: 'Налоговый вычет', sub: 'за учёбу и спорт · при доходе до 2,4 млн ₽ в год' },
    quests: { title: 'Квесты', sub: `Уровень ${level.level} · ${totalXp} из ${level.nextLevelXp} баллов` },
    data: {
      title: 'Куда идут деньги',
      sub: `расходы 2026 года · ${BUDGET_FACTS.expenses.amountBillion.toLocaleString('ru-RU')} млрд ₽`,
    },
  };

  const renderFlow = () => {
    const { flow, arg } = route;
    if (!flow) return null;
    if (flow === 'daily' || QUIZZES.some((quiz) => quiz.id === flow)) {
      const quiz = flow === 'daily' ? getDailyQuiz() : QUIZZES.find((item) => item.id === flow)!;
      const after = QUIZ_PREREQUISITE[quiz.id];
      if (after && !completedActivities.includes(after)) return null;
      return (
        <Fragment key={quiz.id}>
          <QuizFlow
            quiz={quiz}
            ledger={ledger}
            onComplete={completeActivity}
            onDailyResult={recordDailyResult}
            onClose={closeFlow}
            onToQuests={toQuests}
          />
        </Fragment>
      );
    }
    if (flow === 'mayor') {
      return (
        <Fragment key={arg ?? 'mayor'}>
          <MayorFlow
            initialDistrictId={arg}
            calculatorDone={calculatorTaskCompleted}
            completedActivities={completedActivities}
            onComplete={completeActivity}
            onClose={closeFlow}
            onToQuests={toQuests}
          />
        </Fragment>
      );
    }
    if (flow === MAP_ITEM.id) {
      return (
        <Fragment key={flow}>
          <DistrictMap item={MAP_ITEM} onClose={closeFlow} onOpenMayor={(districtId) => openFlow(`mayor/${districtId}`)} />
        </Fragment>
      );
    }
    const item = QUEST_ITEMS.find((entry) => entry.id === flow);
    if (!item) return null;
    const GameView = GAME_VIEWS[item.id];
    return (
      <Fragment key={item.id}>
        <GameView item={item} onComplete={completeActivity} onClose={closeFlow} onToQuests={toQuests} />
      </Fragment>
    );
  };
  const flowView = renderFlow();

  // The tour lifts its current target above the backdrop and fades the rest.
  const getTourClass = (stepId: number) => {
    if (tourStep === null) return '';
    return tourStep === stepId ? 'relative z-[220]' : 'pointer-events-none opacity-20';
  };

  const reducedMotion = accessibilitySettings.enabled && accessibilitySettings.reduceMotion ? 'always' : 'user';

  // The start screen opens on every visit: it is the way into the app, not a one-time intro.
  const [showSplash, setShowSplash] = useState(true);
  // Exhibits under the start screen wait for this to play their entrance.
  useEffect(() => {
    if (!showSplash) window.dispatchEvent(new Event('mgb:enter'));
  }, [showSplash]);

  return (
    <MotionConfig reducedMotion={reducedMotion}>
      {/* The app is already in place under the start screen, so leaving it fades straight into the home screen. */}
      <div inert={showSplash}>
        <Aurora />

        {tourStep !== null && (
          <OnboardingTour
            activeStep={tourStep}
            setActiveStep={setTourStep}
            onClose={() => setTourStep(null)}
            setActiveTab={goTo}
          />
        )}

        {flowView}

        {/* An open step replaces the tabs; the tabs stay mounted underneath and keep their state. */}
        <div
          hidden={flowView !== null}
          className="mx-auto min-h-dvh w-full max-w-[30rem] pb-[calc(7.5rem_+_env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] lg:max-w-none lg:pb-12 lg:pl-[19rem] lg:pr-10"
        >
          {/* On a wide screen the content is centred in the space right of the sidebar. */}
          <div className="lg:mx-auto lg:max-w-[76rem]">
            <AppHeader
              title={HEADINGS[tab].title}
              sub={HEADINGS[tab].sub}
              balance={balance}
              level={level}
              accessibilityEnabled={accessibilitySettings.enabled}
              onOpenAccessibility={openAccessibility}
              onOpenProfile={() => setProfileOpen(true)}
              profileClassName={getTourClass(1)}
              helperClassName={getTourClass(6)}
            />

            {/* Every screen stays mounted, so switching tabs never loses a half-finished quiz or calculation. */}
            <main>
              <section hidden={tab !== 'home'} aria-label="Главная">
                <HomeScreen
                  savedCalculation={savedCalculation}
                  ledger={ledger}
                  learningPostUnlocked={hasLearningPractice}
                  onStartDailyQuiz={startDailyQuiz}
                />
              </section>
              <section hidden={tab !== 'calc'} aria-label="Налоговый вычет">
                <DeductionScreen
                  savedCalculation={savedCalculation}
                  isCompleted={calculatorTaskCompleted}
                  onSave={handleSaveCalculation}
                  tourPersonaClass={getTourClass(2)}
                  tourCalculatorClass={getTourClass(3)}
                />
              </section>
              <section hidden={tab !== 'quests'} aria-label="Квесты" id="tour-quests">
                <QuestsScreen
                  calculatorDone={calculatorTaskCompleted}
                  completedActivities={completedActivities}
                  ledger={ledger}
                  onOpen={openFlow}
                  tourClassName={getTourClass(4)}
                />
              </section>
              <section
                hidden={tab !== 'data'}
                aria-label="Куда идут деньги"
                id="tour-analytics"
                className={cn('transition-opacity duration-200', getTourClass(5))}
              >
                <DataScreen savedCalculation={savedCalculation} active={tab === 'data' && flowView === null} />
              </section>
            </main>
          </div>
        </div>

        {flowView === null && (
          <>
            <TabBar active={tab} questsBadge={availableQuizzesCount} dimmed={tourStep !== null} />
            <SideNav active={tab} questsBadge={availableQuizzesCount} dimmed={tourStep !== null} />
          </>
        )}
        <HelperChat />

      </div>

      {showSplash && (
        <SplashScreen
          onEnter={(withTour, target) => {
            setShowSplash(false);
            if (target) goTo(target);
            if (withTour) setTourStep(0);
          }}
          onOpenAccessibility={openAccessibility}
          accessibilityEnabled={accessibilitySettings.enabled}
          reduceMotion={accessibilitySettings.enabled && accessibilitySettings.reduceMotion}
        />
      )}

      <ProfileSheet
        open={profileOpen}
        onClose={closeProfile}
        balance={balance}
        totalXp={totalXp}
        completedActivities={completedActivities}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onOpenAccessibility={openAccessibility}
        onStartTour={() => window.dispatchEvent(new CustomEvent('start_mos_onboarding'))}
        onReset={handleResetDemo}
      />
      <AccessibilityPanel
        open={accessibilityOpen}
        settings={accessibilitySettings}
        onChange={setAccessibilitySettings}
        onClose={closeAccessibility}
      />
    </MotionConfig>
  );
}
