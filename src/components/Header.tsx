import { motion, AnimatePresence } from 'motion/react';
import { User, LandPlot, ShieldCheck, Trophy, Sparkles, BookOpen, Layers, CheckCircle2, Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn, safeLocalStorage } from '../lib/utils';

function AnimatedNumber({ value }: { value: number }) {
  return (
    <span className="relative inline-flex h-[1.3em] overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-100%", opacity: 0, position: "absolute" }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className="inline-block font-mono font-bold"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

const getLevelInfo = (xp: number) => {
  if (xp <= 150) {
    return { level: 1, title: "Налоговый новичок", min: 0, max: 150, progress: (xp / 150) * 100, nextLevelXp: 150 };
  } else if (xp <= 400) {
    return { level: 2, title: "Бюджетный эксперт", min: 150, max: 400, progress: ((xp - 150) / 250) * 100, nextLevelXp: 400 };
  } else if (xp <= 750) {
    return { level: 3, title: "Финансовый аналитик", min: 400, max: 750, progress: ((xp - 400) / 350) * 100, nextLevelXp: 750 };
  } else if (xp <= 1200) {
    return { level: 4, title: "Бюджетный стратег", min: 750, max: 1200, progress: ((xp - 750) / 450) * 100, nextLevelXp: 1200 };
  } else {
    return { level: 5, title: "Городской стратег", min: 1200, max: 2500, progress: 100, nextLevelXp: 2500 };
  }
};

interface HeaderProps {
  balance: number;
  totalXp?: number;
  completedActivities?: string[];
}

export default function Header({ balance, totalXp = 100, completedActivities = [] }: HeaderProps) {
  const [prevBalance, setPrevBalance] = useState(balance);
  const [floatingPoints, setFloatingPoints] = useState<number | null>(null);
  
  // Toggle profile dropdown Menu on Desktop clicked
  const [profileOpen, setProfileOpen] = useState(false);

  // Manual dark mode state & sync (Audit #14 / Theme Request)
  const [isDark, setIsDark] = useState(() => {
    const saved = safeLocalStorage.getItem('mos_theme');
    return saved === 'dark';
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      safeLocalStorage.setItem('mos_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      safeLocalStorage.setItem('mos_theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    if (balance > prevBalance) {
      setFloatingPoints(balance - prevBalance);
      setPrevBalance(balance);
      
      const timer = setTimeout(() => {
        setFloatingPoints(null);
      }, 2200);
      return () => clearTimeout(timer);
    } else if (balance < prevBalance) {
      setPrevBalance(balance);
    }
  }, [balance, prevBalance]);

  const lvlInfo = getLevelInfo(totalXp);
  const solvedCount = completedActivities.filter(id => id.startsWith('quiz-')).length;

  return (
    <>
      {/* DESKTOP HEADER */}
      <header className="hidden md:flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 py-4 px-6 bg-white dark:bg-slate-900 rounded-2xl border border-[#E2E8F0] dark:border-slate-800 shadow-xs relative z-30 select-none">
        
        {/* Left side: Site title in official style */}
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <div className="flex items-center justify-center bg-[#CC1111] w-10 h-10 rounded-xl text-white shadow-sm shrink-0">
            <LandPlot size={20} className="stroke-[2.5px]" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-col 2xl:flex-row 2xl:items-baseline 2xl:gap-x-2 text-base lg:text-lg font-extrabold text-[#0F172A] dark:text-white tracking-tight leading-tight">
              <span>Открытый бюджет города Москвы</span>
              <span className="hidden 2xl:inline text-neutral-300 dark:text-slate-600 font-normal">//</span>
              <span className="text-[#CC1111] dark:text-red-500 font-bold">Игровые сервисы</span>
            </div>
            <span className="text-xs text-[#475569] dark:text-slate-400 font-black tracking-widest block sm:mt-1 uppercase">
              Официальный интерактивный портал
            </span>
          </div>
        </div>
         
        {/* Right side: User Account & Balance widget */}
        <div className="flex flex-wrap xl:flex-nowrap items-center justify-end gap-2 lg:gap-3 shrink-0">
          
          {/* Audit #10: Desktop Mini Search Bar */}
          <div className="relative hidden xl:block w-[220px]">
            <input
              type="text"
              placeholder="Поиск по бюджету... (Enter)"
              className="w-full text-base xl:text-xs font-semibold pl-8 pr-3 py-2 bg-[#F8FAFC] dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus:border-[#CC1111]/60 focus:bg-white dark:bg-[#1e293b] dark:focus:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = e.currentTarget.value;
                  if (val.trim()) {
                    window.dispatchEvent(new CustomEvent('open_mos_ai_chat', { detail: { initialQuery: val } }));
                    e.currentTarget.value = '';
                  }
                }
              }}
            />
            <svg
              className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 stroke-[2.5px]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          {/* XP Progress Bar Widget in Header */}
          <div className="hidden lg:flex flex-col gap-1 text-right min-w-[140px]">
            <span className="text-[9px] font-black text-[#CC1111] uppercase tracking-wider">
              {lvlInfo.title}
            </span>
            <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-slate-700">
              <span className="font-mono text-[10px]">Lvl {lvlInfo.level} • {totalXp} XP</span>
            </div>
            {/* Visual Progress Line */}
            <div className="w-32 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
              <div 
                className="h-full bg-linear-to-r from-[#CC1111] to-[#E11D48] rounded-full transition-all duration-300"
                style={{ width: `${lvlInfo.progress}%` }}
              />
            </div>
          </div>

          {/* Balance Widget */}
          <div className="relative shrink-[0.5]">
            <div className="flex items-center justify-between sm:justify-start gap-2 lg:gap-3 pl-3 pr-3 py-2 bg-[#F8FAFC] dark:bg-slate-950/50 hover:bg-neutral-100/30 dark:hover:bg-slate-800/30 border border-[#E2E8F0] dark:border-slate-800 rounded-xl transition-all duration-200 min-w-0">
              <span className="text-xs font-black text-[#475569] dark:text-slate-400 uppercase tracking-wider shrink-0 lg:block hidden">
                Баланс:
              </span>
              <div className="flex items-center gap-1.5 min-w-max justify-end sm:justify-start">
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-linear-to-br from-amber-400 to-amber-600 flex items-center justify-center text-[10px] sm:text-[11px] text-white font-black shadow-xs shrink-0">
                  <span className="drop-shadow-xs">₽</span>
                </div>
                <span className="font-black text-[#CC1111] dark:text-red-500 text-sm sm:text-base lg:text-lg tabular-nums tracking-tight">
                  <AnimatedNumber value={balance} />
                </span>
                <span className="text-[10px] font-bold text-[#475569] dark:text-slate-400 leading-tight shrink-0 hidden xl:block truncate max-w-[120px]">
                  баллов "Миллион призов"
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-[#475569] dark:text-slate-400 leading-tight shrink-0 xl:hidden">
                  баллов
                </span>
              </div>

              {/* Floating Points Notification */}
              <AnimatePresence>
                {floatingPoints && (
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.8 }}
                    animate={{ opacity: 1, y: -45, scale: 1.1 }}
                    exit={{ opacity: 0, y: -60, scale: 0.9 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="absolute right-4 bottom-full font-bold text-emerald-600 bg-white dark:bg-[#1e293b] border border-emerald-100 px-2.5 py-1 rounded-full shadow-md text-xs z-20 flex items-center gap-1"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                    +{floatingPoints} баллов
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          {/* Light/Dark Mode Switcher in Desktop Header */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="hidden md:flex items-center justify-center w-10 h-10 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 hover:bg-[#F1F5F9] dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-[#CC1111] dark:hover:text-red-400 transition-all cursor-pointer active:scale-95 duration-100 shrink-0 outline-none"
            title={isDark ? "Включить светлую тему" : "Включить темную тему"}
          >
            {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-600" />}
          </button>
          
          {/* User profile from Mos.ID - CLickable with Dropdown menu (Audit #8) */}
          <div className="relative shrink-0">
            <button 
              onClick={() => setProfileOpen(!profileOpen)}
              className={cn(
                "flex items-center gap-2.5 pl-2 pr-3 py-1.5 bg-[#F8FAFC] dark:bg-slate-950 rounded-xl border transition-all cursor-pointer select-none outline-none overflow-hidden",
                profileOpen ? "border-[#CC1111] dark:border-red-500 bg-[#CC1111]/5 dark:bg-red-950/20" : "border-[#E2E8F0] dark:border-slate-800 hover:bg-[#F1F5F9] dark:hover:bg-slate-900"
              )}
            >
              <div className="bg-[#CC1111] dark:bg-red-600 text-white p-2.5 rounded-lg relative shrink-0">
                <User size={16} className="stroke-[2.5px] text-white" />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
              </div>
              <div className="flex flex-col items-start leading-none text-left min-w-0 pr-1">
                <span className="text-[13px] font-black text-[#0F172A] dark:text-white truncate max-w-[80px] lg:max-w-[120px]">Алексей М.</span>
                <span className="text-[9px] font-bold text-[#CC1111] dark:text-red-400 uppercase tracking-wider mt-1.5 flex items-center gap-0.5">
                  <ShieldCheck size={11} className="text-emerald-500 dark:text-emerald-400 shrink-0" />
                  <span className="hidden sm:inline">Мой профиль</span>
                  <span className="sm:hidden">Профиль</span>
                </span>
              </div>
            </button>

            {/* Profile drop Menu layout */}
            <AnimatePresence>
              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40 cursor-default" onClick={() => setProfileOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#1e293b] border border-[#E2E8F0] dark:border-slate-800 shadow-lg rounded-2xl p-4 z-50 flex flex-col gap-3.5"
                  >
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#CC1111] to-[#E11D48] text-white font-extrabold flex items-center justify-center text-sm shadow-sm select-none">
                        АМ
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-[#0F172A] dark:text-slate-100 leading-snug">Алексей Морозов</h4>
                        <span className="text-[9px] bg-emerald-50 text-emerald-800 font-extrabold border border-emerald-200 uppercase tracking-wider px-2 py-0.5 rounded leading-none block w-max mt-1">
                          Mos.ID подтвержден
                        </span>
                      </div>
                    </div>

                    {/* Level HUD widget inside dropdown */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 rounded-xl p-3 flex flex-col gap-2">
                      <div className="flex justify-between items-center text-xs font-black leading-none">
                        <span className="text-slate-500 uppercase text-[9px]">Текущий Уровень:</span>
                        <span className="text-[#CC1111]">Lvl {lvlInfo.level}</span>
                      </div>
                      <span className="text-sm font-black text-[#0F172A] dark:text-slate-100 leading-none mb-1">
                        {lvlInfo.title}
                      </span>
                      
                      {/* Mini Bar */}
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-linear-to-r from-[#CC1111] to-[#10B981] rounded-full"
                          style={{ width: `${lvlInfo.progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] text-[#64748B] font-extrabold font-mono mt-0.5 leading-none">
                        <span>{lvlInfo.min} XP</span>
                        <span>{totalXp} / {lvlInfo.nextLevelXp} XP</span>
                      </div>
                    </div>

                    {/* Statistics Checklist metrics */}
                    <div className="space-y-2 text-xs font-bold text-slate-700">
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                        <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                          <Trophy size={13} className="text-[#CC1111]" />
                          Полученные баллы:
                        </span>
                        <span className="font-mono text-[#0F172A] dark:text-slate-100">{balance} Б</span>
                      </div>
                      
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                        <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                          <BookOpen size={13} className="text-[#CC1111]" />
                          Решенные квизы:
                        </span>
                        <span className="font-mono text-[#0F172A] dark:text-slate-100">{solvedCount} из 5</span>
                      </div>

                      <div className="flex justify-between items-center py-1.5">
                        <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                          <Layers size={13} className="text-[#CC1111]" />
                          Уровень доступа:
                        </span>
                        <span className="text-emerald-600 font-black">Максимальный</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 font-semibold text-center leading-relaxed">
                      Авторизация выполнена в защищенной игровой зоне бюджета Москвы.
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

          </div>
        </div>
      </header>

      {/* MOBILE COMPACT HEADER */}
      <header className="flex md:hidden items-center justify-between h-14 px-3.5 bg-white dark:bg-slate-900 rounded-xl border border-[#E2E8F0] dark:border-slate-800 shadow-xs w-full relative z-20 select-none">
        
        {/* Left aspect: Only icon logo */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center bg-[#CC1111] w-8.5 h-8.5 rounded-xl text-white shadow-sm shrink-0">
            <LandPlot size={17} className="stroke-[2.5px]" />
          </div>
          <span className="text-[11px] font-black text-[#0F172A] dark:text-white tracking-tight">Мой бюджет</span>
        </div>

        {/* Right aspect: Balance and profile info */}
        <div className="flex items-center gap-1.5 min-w-0 justify-end">
          
          {/* Balance element */}
          <div className="relative flex items-center gap-1 px-1.5 py-1.5 bg-[#F8FAFC] dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 rounded-lg min-w-max shrink-0">
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-[10px] text-white font-black shadow-xs shrink-0">
              <span className="drop-shadow-xs">₽</span>
            </div>
            <span className="font-black text-[#CC1111] text-xs font-mono tracking-tight leading-none">
              <AnimatedNumber value={balance} />
            </span>
            <span className="text-[9px] font-black text-[#475569] dark:text-slate-400 leading-none shrink-0 pr-0.5">Б</span>

            {/* Floating points */}
            <AnimatePresence>
              {floatingPoints && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: -28, scale: 1.05 }}
                  exit={{ opacity: 0, y: -40, scale: 0.95 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="absolute right-0 bottom-full font-bold text-emerald-600 bg-white dark:bg-[#1e293b] border border-emerald-100 px-1.5 py-0.5 rounded-full shadow-md text-[9px] z-50 whitespace-nowrap"
                >
                  +{floatingPoints} Б
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Compact Theme Switcher in Mobile Header */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-1.5 rounded-lg border border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:text-[#CC1111] dark:hover:text-red-400 active:scale-90 transition-all cursor-pointer shrink-0 outline-none"
            title={isDark ? "Светлая тема" : "Темная тема"}
          >
            {isDark ? <Sun size={12} className="text-amber-500" /> : <Moon size={12} className="text-slate-500" />}
          </button>

          {/* Aleksey User block copy */}
          <div className="flex items-center gap-1 pl-1 pr-1.5 py-1.5 bg-[#F8FAFC] dark:bg-slate-950 rounded-lg border border-[#E2E8F0] dark:border-slate-800 min-w-0 shrink-0">
            <div className="bg-[#CC1111]/10 text-[#CC1111] dark:text-red-500 p-1 rounded-md shrink-0">
              <User size={11} className="stroke-[2.5px]" />
            </div>
          </div>

        </div>
      </header>

      {/* MOBILE XP WIDGET BAR - UNDER MAIN SHAPKA (Audit #8: Level 1 • Налоговый новичок • 100/150 XP progress bar) */}
      <div className="flex md:hidden flex-col gap-1 px-3.5 py-2 bg-gradient-to-r from-slate-900 to-[#1E293B] rounded-xl border border-white/5 text-white shadow-xs select-none">
        <div className="flex items-center justify-between text-[10px] font-black tracking-tight leading-none">
          <span className="text-amber-400 font-black">Lvl {lvlInfo.level} • {lvlInfo.title}</span>
          <span className="text-slate-400 font-mono">{totalXp}/{lvlInfo.nextLevelXp} XP</span>
        </div>
        {/* Progress bar line height 4px */}
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1 border border-slate-700/50">
          <div 
            className="bg-gradient-to-r from-[#CC1111] to-[#E11D48] h-full rounded-full transition-all duration-300"
            style={{ width: `${lvlInfo.progress}%` }}
          />
        </div>
      </div>
    </>
  );
}
