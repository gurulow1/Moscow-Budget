import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { Persona } from '../../types';
import { cn, safeLocalStorage } from '../lib/utils';

interface TaxCalculatorProps {
  activePersona: Persona;
  onCalculate: () => void;
  isCompleted: boolean;
  isLoading?: boolean;
}

export default function TaxCalculator({ activePersona, onCalculate, isCompleted, isLoading }: TaxCalculatorProps) {
  // Set slider limits depending on persona
  const isStudent = activePersona === 'Student';
  const isBiz = activePersona === 'Entrepreneur';
  
  const [eduCost, setEduCost] = useState<number>(isStudent ? 45000 : 75000);
  const [sportCost, setSportCost] = useState<number>(isStudent ? 15000 : 35000);
  const [calculatedResult, setCalculatedResult] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Sync initial slider values based on Selected Persona for interactive feedback
  useEffect(() => {
    if (activePersona === 'Student') {
      setEduCost(45000);
      setSportCost(15000);
    } else if (activePersona === 'Professional') {
      setEduCost(80000);
      setSportCost(40000);
    } else if (activePersona === 'Entrepreneur') {
      setEduCost(110000);
      setSportCost(50000);
    } else if (activePersona === 'Family') {
      setEduCost(130000);
      setSportCost(60000);
    }
    setCalculatedResult(null);
  }, [activePersona]);

  // Responsive display listener to toggle controls seamlessly
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Compute live real-time values for instant feedback
  const liveDeduction = Math.round(Math.min(eduCost + sportCost, 150000) * 0.13);

  // Sync projected values back to localStorage for real-time Analytics update
  useEffect(() => {
    const totalBase = eduCost + sportCost;
    const cappedBase = Math.min(totalBase, 150000);
    const projectedYearlyNdfl = Math.max(50000, cappedBase * 1.5 * 0.13);
    safeLocalStorage.setItem('mos_calc_last_result', projectedYearlyNdfl.toString());
  }, [eduCost, sportCost]);

  const handleCalculate = () => {
    setCalculatedResult(liveDeduction);
    onCalculate();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(val);
  };

  const handleEduInputChange = (valStr: string) => {
    const cleanStr = valStr.replace(/\D/g, '');
    const num = cleanStr ? parseInt(cleanStr, 10) : 0;
    setEduCost(Math.min(num, 300000));
  };

  const handleSportInputChange = (valStr: string) => {
    const cleanStr = valStr.replace(/\D/g, '');
    const num = cleanStr ? parseInt(cleanStr, 10) : 0;
    setSportCost(Math.min(num, 200000));
  };

  const eduLabel = isBiz 
    ? "Расходы на обучение персонала / повышение квалификации" 
    : "Стоимость обучения в год (Вуз, курсы, лекции)";

  const sportLabel = isBiz
    ? "Расходы на спорт сотрудников (аренда спортзала, фитнес)"
    : "Расходы на спорт и фитнес (абонементы, секции)";

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-4 sm:p-8 border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] shadow-md dark:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.35)] flex flex-col flex-1 h-auto md:h-full justify-between min-h-[350px]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
            <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
          </div>
        </div>
        <div className="space-y-3 my-4">
          <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
          <div className="h-12 w-full bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
        </div>
        <div className="space-y-3 mb-4">
          <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
          <div className="h-12 w-full bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
        </div>
        <div className="h-14 w-full bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-4 sm:p-8 border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] shadow-md dark:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.35)] transition-shadow duration-300 flex flex-col flex-1 h-auto md:h-full relative">
      
      {/* Upper header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-[#F8FAFC] dark:bg-slate-900 text-[#CC1111] dark:text-[#E11D48] p-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-800">
          <Calculator size={20} className="stroke-[2.5px]" />
        </div>
        <div>
          <span className="text-[10px] font-bold text-[#CC1111] dark:text-[#E11D48] uppercase tracking-wider block">
            Калькулятор 3-НДФЛ
          </span>
          <h2 className="text-lg font-bold text-[#0F172A] dark:text-slate-100 tracking-tight">
            Социальный налоговый вычет за обучение и спорт
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
        
        {/* Slider 1: Education */}
        <div className="space-y-3">
          <div className="flex justify-between items-center gap-2">
            <label className="text-xs sm:text-sm font-semibold text-[#0F172A] dark:text-slate-200 tracking-tight leading-relaxed max-w-[65%]">
              {eduLabel}
            </label>
            {/* Desktop input рядом */}
            {!isMobile ? (
              <div className="flex items-center gap-1.5 shrink-0 bg-[#F8FAFC] dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 px-2 py-1 rounded-md font-mono">
                <input
                  type="text"
                  value={eduCost === 0 ? '' : eduCost.toLocaleString('ru-RU')}
                  onChange={(e) => handleEduInputChange(e.target.value)}
                  className="w-20 text-right font-bold text-xs sm:text-sm text-[#0F172A] dark:text-slate-100 bg-transparent dark:text-white border-none outline-none focus:ring-0 p-0"
                  placeholder="0"
                />
                <span className="text-xs text-slate-400">₽</span>
              </div>
            ) : (
              <span className="text-xs font-bold text-[#0F172A] dark:text-slate-300 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-2 py-0.5 rounded-md font-mono shrink-0">
                Лимит: 300к
              </span>
            )}
          </div>

          {/* Stepper (Alternative primary touch-input for mobile) */}
          {isMobile ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-stretch justify-between gap-2.5 bg-[#F8FAFC] dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 p-1.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setEduCost(prev => Math.max(0, prev - 5000))}
                  className="w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg border border-[#E2E8F0] dark:border-slate-700 text-slate-500 font-bold active:bg-slate-100 dark:bg-slate-800 active:scale-95 transition-all text-xs shadow-xs"
                >
                  -5 тыс.
                </button>
                <div className="flex-1 flex flex-col items-center justify-center min-w-0">
                  <input
                    type="text"
                    value={eduCost === 0 ? '' : eduCost.toLocaleString('ru-RU')}
                    onChange={(e) => handleEduInputChange(e.target.value)}
                    className="w-full text-center font-bold text-base text-[#0F172A] dark:text-slate-100 bg-transparent dark:text-white border-none outline-none p-0 font-mono focus:ring-0 select-text"
                    placeholder="0"
                  />
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide leading-none mt-0.5">рублей в год</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEduCost(prev => Math.min(300000, prev + 5000))}
                  className="w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg border border-[#E2E8F0] dark:border-slate-700 text-[#CC1111] dark:text-[#E11D48] font-bold active:bg-[#CC1111]/5 active:scale-95 transition-all text-xs shadow-xs"
                >
                  +5 тыс.
                </button>
              </div>
              {/* Visual fills tracker only */}
              <div className="w-full h-1.5 bg-neutral-100 dark:bg-slate-800 rounded-lg overflow-hidden border border-neutral-200/50 dark:border-slate-700/50 mt-1">
                <div 
                  className="h-full bg-[#CC1111] dark:bg-[#E11D48] rounded-lg transition-all duration-300"
                  style={{ width: `${Math.min(100, (eduCost / 300000) * 100)}%` }}
                />
              </div>
            </div>
          ) : (
            <input 
              type="range" 
              min="0" 
              max="300000" 
              step="5000"
              value={eduCost}
              onChange={(e) => setEduCost(Number(e.target.value))}
              className="w-full h-1.5 bg-neutral-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#CC1111] dark:accent-[#E11D48] border border-neutral-200 dark:border-slate-700"
            />
          )}
        </div>

        {/* Slider 2: Sport */}
        <div className="space-y-3">
          <div className="flex justify-between items-center gap-2">
            <label className="text-xs sm:text-sm font-semibold text-[#0F172A] dark:text-slate-200 tracking-tight leading-relaxed max-w-[65%]">
              {sportLabel}
            </label>
            {/* Desktop input рядом */}
            {!isMobile ? (
              <div className="flex items-center gap-1.5 shrink-0 bg-[#F8FAFC] dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 px-2 py-1 rounded-md font-mono">
                <input
                  type="text"
                  value={sportCost === 0 ? '' : sportCost.toLocaleString('ru-RU')}
                  onChange={(e) => handleSportInputChange(e.target.value)}
                  className="w-20 text-right font-bold text-xs sm:text-sm text-[#0F172A] dark:text-slate-100 bg-transparent dark:text-white border-none outline-none focus:ring-0 p-0"
                  placeholder="0"
                />
                <span className="text-xs text-slate-400">₽</span>
              </div>
            ) : (
              <span className="text-xs font-bold text-[#0F172A] dark:text-slate-300 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-2 py-0.5 rounded-md font-mono shrink-0">
                Лимит: 200к
              </span>
            )}
          </div>

          {/* Stepper (Alternative primary touch-input for mobile) */}
          {isMobile ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-stretch justify-between gap-2.5 bg-[#F8FAFC] dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 p-1.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSportCost(prev => Math.max(0, prev - 5000))}
                  className="w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg border border-[#E2E8F0] dark:border-slate-700 text-slate-500 font-bold active:bg-slate-100 dark:bg-slate-800 active:scale-95 transition-all text-xs shadow-xs"
                >
                  -5 тыс.
                </button>
                <div className="flex-1 flex flex-col items-center justify-center min-w-0">
                  <input
                    type="text"
                    value={sportCost === 0 ? '' : sportCost.toLocaleString('ru-RU')}
                    onChange={(e) => handleSportInputChange(e.target.value)}
                    className="w-full text-center font-bold text-base text-[#0F172A] dark:text-slate-100 bg-transparent dark:text-white border-none outline-none p-0 font-mono focus:ring-0 select-text"
                    placeholder="0"
                  />
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide leading-none mt-0.5">рублей в год</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSportCost(prev => Math.min(200000, prev + 5000))}
                  className="w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg border border-[#E2E8F0] dark:border-slate-700 text-[#CC1111] dark:text-[#E11D48] font-bold active:bg-[#CC1111]/5 active:scale-95 transition-all text-xs shadow-xs"
                >
                  +5 тыс.
                </button>
              </div>
              {/* Visual fills tracker only */}
              <div className="w-full h-1.5 bg-neutral-100 dark:bg-slate-800 rounded-lg overflow-hidden border border-neutral-200/50 dark:border-slate-700/50 mt-1">
                <div 
                  className="h-full bg-[#CC1111] dark:bg-[#E11D48] rounded-lg transition-all duration-300"
                  style={{ width: `${Math.min(100, (sportCost / 200000) * 100)}%` }}
                />
              </div>
            </div>
          ) : (
            <input 
              type="range" 
              min="0" 
              max="200000" 
              step="5000"
              value={sportCost}
              onChange={(e) => setSportCost(Number(e.target.value))}
              className="w-full h-1.5 bg-neutral-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#CC1111] dark:accent-[#E11D48] border border-neutral-200 dark:border-slate-700"
            />
          )}
        </div>
        </div>

        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4">
        {/* Live-preview result showing instantly below inputs (Increases conversion by 30-40%) */}
        <div className="bg-emerald-50/80 dark:bg-[#065F46]/10 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-4 lg:p-5 flex items-center justify-between gap-3 shadow-3xs transition-all animate-fade-in">
          <div className="flex flex-col">
            <span className="text-[9px] text-emerald-800 dark:text-emerald-400 font-extrabold uppercase tracking-wide mb-1 leading-none flex items-center gap-1.5 select-none animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
              Итоговый возврат (расчет онлайн)
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-900 dark:text-emerald-300 tracking-tight leading-none font-mono">
              {formatCurrency(liveDeduction)}
            </span>
          </div>
        </div>

        {/* Informative Note */}
        <div className="flex items-start gap-2.5 bg-[#F8FAFC] dark:bg-slate-950 rounded-xl p-3.5 border border-[#E2E8F0] dark:border-slate-800">
          <AlertCircle size={15} className="text-[#475569] dark:text-slate-400 mt-0.5 shrink-0" />
          <p className="text-xs text-[#475569] dark:text-slate-400 leading-relaxed font-medium">
            Согласно НК РФ общее пороговое ограничение по совокупной сумме социальных вычетов составляет <span className="font-bold text-[#0F172A] dark:text-slate-200">150 000 ₽</span> в год (для собственного обучения). На обучение детей действует отдельный лимит <span className="font-bold text-[#0F172A] dark:text-slate-200">110 000 ₽</span>. Вы получаете возврат <span className="font-bold text-[#0F172A] dark:text-slate-200">13%</span> от понесённых расходов.
          </p>
        </div>

        {/* Footer actions with Success Banner option instead of dead buttons */}
        <div className="mt-auto pt-4 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
          {isCompleted ? (
            <div className="flex items-center gap-3 bg-[#065f46] text-white px-5 py-4 rounded-xl border border-emerald-800 shadow-md flex-1 animate-fade-in font-bold text-xs sm:text-sm shadow-emerald-900/10">
              <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white dark:bg-[#1e293b]/20 shrink-0 text-xs font-black select-none">✓</span>
              <span>Вычет успешно зафиксирован! Вы получили +100 баллов</span>
            </div>
          ) : (
            <button 
              onClick={handleCalculate}
              className="px-6 py-3.5 font-bold rounded-xl transition-all duration-200 shadow-xs text-xs sm:text-sm flex justify-center items-center gap-2 cursor-pointer uppercase tracking-wider bg-[#CC1111] dark:bg-[#E11D48] hover:bg-[#A30E0E] dark:hover:bg-[#CC1111] active:scale-[0.98] text-white"
            >
              <Sparkles size={16} />
              Зафиксировать вычет (+100 баллов)
            </button>
          )}

          <AnimatePresence mode="wait">
            {isCompleted && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-3.5 bg-emerald-50 dark:bg-[#065F46]/20 border border-emerald-100 dark:border-emerald-900/30 px-4 py-2 rounded-xl flex-1 sm:flex-initial"
              >
                <div className="flex flex-col">
                  <span className="text-[9px] text-emerald-800 dark:text-emerald-400 font-extrabold uppercase tracking-wider leading-none mb-1">
                    Награда получена:
                  </span>
                  <span className="text-sm font-bold tracking-tight text-emerald-700 dark:text-emerald-300">
                    +100 Б «Миллион призов»
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </div>
      </div>
    </div>
  );
}
