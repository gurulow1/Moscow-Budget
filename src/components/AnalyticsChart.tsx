import { useState, useEffect, useMemo } from 'react';
import { PieChart as PieChartIcon, Info, Map as MapIcon, Wallet, Activity, ArrowUpRight, CheckCircle2, Star, StarOff, Trophy, ListOrdered } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, safeLocalStorage } from '../lib/utils';

// Global Data — based on Moscow Budget 2026: Expenses = 6.38 trln RUB
// Sources: Education 814.6B, Transport 1.29T, Healthcare 615B, Social 810B, Others ~2.85T
const SECTORS = [
  { id: 'edu', name: 'Образование', value: 13, color: '#2563EB', kpis: ['🎓 814,6 млрд ₽', '✏️ Программа «Мой Колледж»'] },
  { id: 'trans', name: 'Транспортная система', value: 20, color: '#8B5CF6', kpis: ['🚇 1,29 трлн ₽', '⚡ +700 электробусов'] },
  { id: 'health', name: 'Здравоохранение', value: 10, color: '#CC1111', kpis: ['🏥 615 млрд ₽', '❤️ Реновация поликлиник'] },
  { id: 'soc', name: 'Социальная поддержка', value: 13, color: '#10B981', kpis: ['🤝 810 млрд ₽', '👴 4,5 млн получателей'] },
  { id: 'other', name: 'Прочие расходы', value: 44, color: '#F59E0B', kpis: ['🏙️ ЖКХ, культура, спорт, безопасность', '💡 Цифровизация и экономика'] },
];

const SUBCATEGORIES: Record<string, { name: string; value: number }[]> = {
  edu: [
    { name: 'Школы и детские сады (общее образование)', value: 55 },
    { name: 'Колледжи и среднее профобразование («Мой Колледж»)', value: 25 },
    { name: 'ВУЗы, высшее образование и наука', value: 20 },
  ],
  trans: [
    { name: 'Строительство метро (Троицкая, Рублево-Архангельская)', value: 60 },
    { name: 'Наземный транспорт (700+ электробусов КАМАЗ-52222)', value: 25 },
    { name: 'Пригородные сообщения, МЦД и БКЛ', value: 15 },
  ],
  health: [
    { name: 'Поликлиники и амбулаторное лечение (новый стандарт)', value: 45 },
    { name: 'Стационарная и высокотехнологичная помощь', value: 35 },
    { name: 'Развитие ЕМИАС и цифровой медицины', value: 20 },
  ],
  soc: [
    { name: 'Прямые выплаты и компенсации льготникам', value: 65 },
    { name: 'Программа «Московское долголетие» и клубы', value: 20 },
    { name: 'Реабилитация, социнтеграция и адресная помощь', value: 15 },
  ],
  other: [
    { name: 'ЖКХ, коммунальная инфраструктура и энергосбережение', value: 30 },
    { name: 'Культура, спорт, безопасность и городская среда', value: 35 },
    { name: 'Экономика, цифровизация и инновации', value: 35 },
  ],
};

const DISTRICTS = [
  { id: 'ЦАО', label: 'ЦАО', fund: '540 млрд ₽', fundValue: 540, perCapita: '143 500 ₽/чел', value: 540, obj: 'Развитие ИТ-кластера на Китай-Городе и благоустройство пешеходных улиц.', share: '24%', rank: 1, color: '#1E3A8A' },
  { id: 'САО', label: 'САО', fund: '410 млрд ₽', fundValue: 410, perCapita: '131 000 ₽/чел', value: 410, obj: 'Реконструкция транспортных узлов, ТПУ и благоустройство парка Северного Речного Вокзала.', share: '18%', rank: 2, color: '#312E81' },
  { id: 'ЗАО', label: 'ЗАО', fund: '420 млрд ₽', fundValue: 420, perCapita: '128 000 ₽/чел', value: 420, obj: 'Субсидирование научно-технических лабораторий МГУ и запуск инкубаторов Раменках.', share: '19%', rank: 3, color: '#0F172A' },
  { id: 'ТиНАО', label: 'ТиНАО', fund: '490 млрд ₽', fundValue: 490, perCapita: '122 000 ₽/чел', value: 490, obj: 'Строительство новых центров притяжения, школ, больниц и проведение скоростного трамвая.', share: '22%', rank: 4, color: '#CC1111' },
  { id: 'ВАО', label: 'ВАО', fund: '380 млрд ₽', fundValue: 380, perCapita: '112 000 ₽/чел', value: 380, obj: 'Экологическая модернизация производств в промзонах и озеленение Измайловского парка.', share: '17%', rank: 5, color: '#0284C7' },
];

const TOTAL_BUDGET = 6.38; // trillion rubles — Moscow 2026 expenses (official)

export default function AnalyticsChart({ isLoading }: { isLoading?: boolean }) {
  const [isPersonal, setIsPersonal] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState(DISTRICTS[0]);
  const [personalTax, setPersonalTax] = useState(50000);
  
  // Interactive Display Mode Tool Toggle "% / ₽"
  const [displayUnit, setDisplayUnit] = useState<'percent' | 'currency'>('percent');
  
  // Drill-down Category sector state
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [hoveredSector, setHoveredSector] = useState<string | null>(null);
  
  // My District settings
  const [myDistrict, setMyDistrict] = useState<string>(() => {
    return safeLocalStorage.getItem('mos_my_district') || '';
  });

  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // Read the latest calculated NDFL from local storage
    const savedCalculated = safeLocalStorage.getItem('mos_calc_last_result');
    if (savedCalculated && !isNaN(Number(savedCalculated))) {
      setPersonalTax(Number(savedCalculated)); 
    } 
  }, []);

  // Responsive boundary check for replacing pie-charts with stacked-bars
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(val);
  };

  const getAbsoluteRubleValue = (percentage: number) => {
    if (isPersonal) {
      return personalTax * (percentage / 100);
    } else {
      // 5 trillion * percent
      return (TOTAL_BUDGET * (percentage / 100)) * 1000 * 1000 * 1000 * 1000;
    }
  };

  const currentData = useMemo(() => {
    return SECTORS.map(s => {
      let displayValue = '';
      const rubleValue = getAbsoluteRubleValue(s.value);
      
      if (displayUnit === 'percent') {
        displayValue = `${s.value}%`;
      } else {
        if (isPersonal) {
          displayValue = formatCurrency(rubleValue);
        } else {
          // trillion rubles representation
          displayValue = `${(TOTAL_BUDGET * (s.value / 100)).toFixed(2)} трлн ₽`;
        }
      }
      return { ...s, displayValue, absoluteRubles: rubleValue };
    });
  }, [isPersonal, personalTax, displayUnit]);

  // SVG Donut Calculations
  const donutRadius = 38;
  const donutCircumference = 2 * Math.PI * donutRadius; // ~ 238.76

  const donutSlices = useMemo(() => {
    let accumulatedPercent = 0;
    const gapSize = 1.8; // pixel spacer gap
    
    return SECTORS.map((sector) => {
      const percentage = sector.value;
      const segmentLength = (percentage / 100) * donutCircumference - gapSize;
      const strokeDasharray = `${segmentLength} ${donutCircumference - segmentLength}`;
      const strokeDashoffset = donutCircumference - ((accumulatedPercent / 100) * donutCircumference) + (gapSize / 2);
      accumulatedPercent += percentage;
      
      return {
        ...sector,
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [donutCircumference]);

  const activeSectorObj = useMemo(() => {
    const activeId = hoveredSector || selectedSector;
    return SECTORS.find(s => s.id === activeId) || null;
  }, [hoveredSector, selectedSector]);

  // Calculate proportional district funding based on NDFL
  const calculatedDistrictFund = useMemo(() => {
    const share = personalTax * (selectedDistrict.value / 5000);
    return formatCurrency(share);
  }, [selectedDistrict, personalTax]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-4 sm:p-8 border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] shadow-md dark:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.35)] flex flex-col gap-8 min-h-[400px]">
        <div className="flex flex-col lg:flex-row justify-between gap-5 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
              <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
            </div>
          </div>
          <div className="h-10 w-44 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 w-full bg-slate-100 dark:bg-slate-900 rounded-2xl animate-pulse" />
            ))}
          </div>
          <div className="lg:col-span-5 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/40 p-6 rounded-2xl">
            <div className="h-44 w-44 rounded-full border-8 border-slate-200 dark:border-slate-800 animate-pulse flex items-center justify-center">
              <div className="h-20 w-20 rounded-full bg-slate-100 dark:bg-slate-800" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleToggleMyDistrict = (distId: string) => {
    if (myDistrict === distId) {
      setMyDistrict('');
      safeLocalStorage.removeItem('mos_my_district');
    } else {
      setMyDistrict(distId);
      safeLocalStorage.setItem('mos_my_district', distId);
      
      // Auto-focus and scroll to selected district in the list dynamically (P2-7)
      setTimeout(() => {
        const el = document.getElementById(`district-row-${distId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Add a temporary glow animation outline
          el.classList.add('ring-4', 'ring-amber-500/60', 'border-amber-500');
          setTimeout(() => {
            el.classList.remove('ring-4', 'ring-amber-500/60', 'border-amber-500');
          }, 1800);
        }
      }, 100);
    }
  };

  return (
    <div id="analytics_dashboard" className="bg-white dark:bg-[#1e293b] rounded-2xl p-4 sm:p-8 border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] shadow-md dark:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.35)] flex flex-col gap-8">
      
      {/* 1. Header & Toggle Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-[#F1F5F9] pb-5">
        <div className="flex items-center gap-3">
          <div className="bg-[#CC1111]/10 text-[#CC1111] p-3 rounded-2xl border border-[#CC1111]/20 shrink-0">
            <PieChartIcon size={24} className="stroke-[2.5px]" />
          </div>
          <div>
            <span className="text-[10px] font-black text-[#CC1111] uppercase tracking-widest block mb-0.5">
              Финансовый Анализ
            </span>
            <h2 className="text-xl font-black text-[#0F172A] dark:text-slate-100 tracking-tight">
              Интерактивная карта распределения расходов
            </h2>
            <p className="text-[#475569] text-xs sm:text-sm leading-relaxed mt-0.5">
              Изучите структуру расходов города Москвы на 2026 год, погружайтесь в подкатегории и управляйте масштабом. Доли приведены по профильным госпрограммам; при этом на социальную сферу города в целом направлено около половины бюджета (≈3,2 трлн ₽).
            </p>
          </div>
        </div>

        {/* Display switches */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* % / ₽ Unit Switcher (Audit #5) */}
          <div className="inline-flex bg-[#F1F5F9] p-1 rounded-xl border border-[#E2E8F0] dark:border-slate-800 relative">
            <button
              onClick={() => setDisplayUnit('percent')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-black transition-all select-none outline-none",
                displayUnit === 'percent' ? "bg-white dark:bg-[#1e293b] text-[#CC1111] shadow-xs" : "text-[#475569] hover:text-[#0F172A] dark:text-slate-100"
              )}
            >
              %
            </button>
            <button
              onClick={() => setDisplayUnit('currency')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-black transition-all select-none outline-none",
                displayUnit === 'currency' ? "bg-white dark:bg-[#1e293b] text-[#CC1111] shadow-xs" : "text-[#475569] hover:text-[#0F172A] dark:text-slate-100"
              )}
            >
              ₽
            </button>
          </div>

          {/* Premium Segmented Control Selector */}
          <div className="inline-flex bg-[#F1F5F9] p-1 rounded-xl border border-[#E2E8F0] dark:border-slate-800 relative">
            <button
              onClick={() => setIsPersonal(false)}
              className={cn(
                "relative flex justify-center items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-colors duration-200 z-10 outline-none select-none",
                !isPersonal ? "text-[#0F172A] dark:text-slate-100" : "text-[#64748B] hover:text-[#0F172A] dark:text-slate-100"
              )}
            >
              <Activity size={14} />
              Бюджет Москвы
              {!isPersonal && (
                <motion.div
                  layoutId="active_analytic_toggle"
                  className="absolute inset-0 bg-white dark:bg-[#1e293b] rounded-lg shadow-xs ring-1 ring-black/5 -z-10"
                  transition={{ type: "spring", stiffness: 385, damping: 30 }}
                />
              )}
            </button>
            <button
              onClick={() => setIsPersonal(true)}
              className={cn(
                "relative flex justify-center items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-colors duration-200 z-10 outline-none select-none",
                isPersonal ? "text-white" : "text-[#64748B] hover:text-[#0F172A] dark:text-slate-100"
              )}
            >
              <Wallet size={14} />
              Мой вклад
              {isPersonal && (
                <motion.div
                  layoutId="active_analytic_toggle"
                  className="absolute inset-0 bg-[#0F172A] rounded-lg shadow-xs -z-10"
                  transition={{ type: "spring", stiffness: 385, damping: 30 }}
                />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Audit #16: Explain calculation dynamic banner when my contribution is active */}
      {isPersonal && (
        <motion.div 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-start gap-3 -mt-3.5"
        >
          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/45 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
            <Wallet size={16} />
          </div>
          <div className="text-xs sm:text-sm">
            <h4 className="font-extrabold text-[#0F172A] dark:text-slate-100">Откуда берутся эти цифры?</h4>
            <p className="text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Исходя из ваших расчетных данных НДФЛ в размере <span className="font-mono text-[#0F172A] dark:text-slate-200 font-extrabold">{formatCurrency(personalTax)}</span>, ваш индивидуальный вклад деликатно распределяется пропорционально фактическим расходам Правительства Москвы. Например: ваш вклад в <span className="text-slate-800 dark:text-slate-300 font-bold">Образование (13% бюджета)</span> составляет <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(personalTax * 0.13)}</span>, а в <span className="text-slate-800 dark:text-slate-300 font-bold">Здравоохранение (10%)</span> составляет <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(personalTax * 0.10)}</span>.
            </p>
          </div>
        </motion.div>
      )}

      {/* 2. Main Budget Sectors layout (Stacked / Ring responsive integration) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Aspect: Sectors with active drills */}
        <div className="lg:col-span-12 xl:col-span-7 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-[#0F172A] dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#CC1111]" />
              Отраслевые группы расходов
            </h3>
            {selectedSector && (
              <button 
                onClick={() => setSelectedSector(null)}
                className="text-xs font-bold text-[#CC1111] hover:text-[#A30E0E] transition-colors"
              >
                ← Вернуться в общий бюджет
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {currentData.map((item) => {
              const isSelected = selectedSector === item.id;
              const isAnySelected = selectedSector !== null;
              const rubleAmountFormatted = isPersonal 
                ? formatCurrency(item.absoluteRubles) 
                : `${(TOTAL_BUDGET * (item.value / 100)).toFixed(2)} трлн ₽`;
              
              return (
                <motion.div 
                  key={item.name}
                  layout="position"
                  onClick={() => setSelectedSector(isSelected ? null : item.id)}
                  onMouseEnter={() => setHoveredSector(item.id)}
                  onMouseLeave={() => setHoveredSector(null)}
                  className={cn(
                    "border rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer select-none flex flex-col border-slate-200 dark:border-slate-700/50",
                    isSelected 
                      ? "bg-slate-50 dark:bg-slate-800/50 border-[#CC1111] ring-4 ring-[#CC1111]/5 sm:col-span-2" 
                      : isAnySelected 
                        ? "opacity-55 hover:opacity-100 bg-white dark:bg-[#1e293b]" 
                        : "bg-white dark:bg-[#1e293b] hover:border-slate-300"
                  )}
                >
                  <div className="flex flex-1">
                    {/* Color Bar left border indicator */}
                    <div className="w-2 shrink-0" style={{ backgroundColor: item.color }} />
                    <div className="flex-1 p-4 flex flex-col justify-between gap-3">
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <h4 className="font-extrabold text-[#0F172A] dark:text-white text-sm tracking-tight">{item.name}</h4>
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mt-0.5">
                            {displayUnit === 'percent' 
                              ? `Объем: ${rubleAmountFormatted}` 
                              : `Доля: ${item.value}% бюджета`
                            }
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[9px] uppercase font-black text-[#64748B] tracking-widest block mb-0.5">
                            {displayUnit === 'percent' 
                              ? (isPersonal ? "Мой вклад (%)" : "Доля бюджета")
                              : (isPersonal ? "Моя доля (НДФЛ)" : "Объем финансирования")
                            }
                          </span>
                          <span className="text-sm font-black font-mono text-[#0F172A] dark:text-white tracking-tight">
                            {displayUnit === 'percent' ? `${item.value}%` : rubleAmountFormatted}
                          </span>
                        </div>
                      </div>

                      {/* Display quick-KPI tags */}
                      <div className="flex flex-wrap gap-1.5">
                        {item.kpis.map((k, idx) => (
                          <span key={idx} className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 text-[#0F172A] dark:text-slate-100 text-[9px] font-extrabold px-2 py-0.5 rounded-md tracking-tight">
                            {k}
                          </span>
                        ))}
                      </div>

                      {/* Expandable Drill Down area directly inside card (Audit #5) */}
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="border-t border-slate-200 dark:border-slate-700/50 mt-3 pt-3 space-y-3"
                          >
                            <div className="flex justify-between items-center bg-[#CC1111]/5 px-3 py-1.5 rounded-lg border border-[#CC1111]/15">
                              <span className="text-[10px] uppercase font-black text-[#CC1111] tracking-wider leading-none">
                                🕵️ Детализация подкатегорий программы:
                              </span>
                              <span className="text-[9px] font-black text-slate-500 uppercase">
                                кликните для скрытия
                              </span>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                              {SUBCATEGORIES[item.id]?.map((sub, sIdx) => {
                                const subPercentOfBudget = (item.value * (sub.value / 100)).toFixed(1);
                                const subRubleAmount = isPersonal 
                                  ? formatCurrency(item.absoluteRubles * (sub.value / 100))
                                  : `${((TOTAL_BUDGET * (item.value / 100)) * (sub.value / 100)).toFixed(2)} трлн ₽`;
                                
                                return (
                                  <div key={sIdx} className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700/50 rounded-xl p-3 flex flex-col gap-2">
                                    <div className="flex justify-between items-start gap-2">
                                      <span className="text-xs font-bold text-[#0F172A] dark:text-slate-100">{sub.name}</span>
                                      <span className="text-xs font-black font-mono text-[#CC1111]">{sub.value}%</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                                      <span>Итого от всего бюджета: <strong className="text-slate-700 font-bold">{subPercentOfBudget}%</strong></span>
                                      <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{subRubleAmount}</span>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ width: `${sub.value}%`, backgroundColor: item.color }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right Aspect: Interactive SVG Donut on Desktop, beautifully adapted Stacked cards on Mobile */}
        <div className="lg:col-span-12 xl:col-span-5 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/50">
          <div className="w-full text-center mb-4">
            <span className="text-[10px] font-black uppercase text-[#CC1111] tracking-widest block">визуальный дашборд</span>
            <h4 className="text-sm font-black text-[#0F172A] dark:text-slate-100 mt-0.5">
              {isMobile ? "Карта распределения" : "Круговой секторный обзор"}
            </h4>
          </div>

          {isMobile ? (
            /* MOBILE STACKED VERICAL PROGRESS-BARS (Audit #5: donut chart unreadable under 320px) */
            <div className="w-full space-y-3.5">
              <p className="text-[11px] text-[#475569] leading-relaxed font-semibold italic flex items-center gap-1">
                <Info size={13} className="text-[#CC1111]" />
                Показана оптимизированная таблица распределения инвестиций
              </p>
              {currentData.map((s) => {
                const isSelected = selectedSector === s.id;
                const progressRuble = isPersonal ? formatCurrency(s.absoluteRubles) : displayUnit === 'percent' ? `${s.value}%` : `${(TOTAL_BUDGET * (s.value / 100)).toFixed(2)} трлн ₽`;
                return (
                  <div 
                    key={s.id} 
                    onClick={() => setSelectedSector(isSelected ? null : s.id)} 
                    className={cn(
                      "bg-white dark:bg-[#1e293b] p-3 rounded-xl border transition-all duration-200 cursor-pointer",
                      isSelected ? "border-[#CC1111] ring-3 ring-[#CC1111]/5" : "border-slate-200 dark:border-slate-700/50"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="text-xs font-bold text-[#0F172A] dark:text-slate-100">{s.name}</span>
                      </div>
                      <span className="text-xs font-black text-[#0F172A] dark:text-slate-100 font-mono">{progressRuble}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${s.value}%`, backgroundColor: s.color }} />
                    </div>
                    {isSelected && (
                      <div className="mt-2 text-[10px] font-bold text-[#CC1111] flex items-center justify-between">
                        <span>Раскрыта детализация подкатегорий во второй панели</span>
                        <span>{s.value}%</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* DESKTOP HOVER/TAP INTERACTIVE DONUT */
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
              
              {/* Interactive SVG Ring */}
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {donutSlices.map((slice) => {
                  const isSelected = selectedSector === slice.id;
                  const isHovered = hoveredSector === slice.id;
                  const isActive = isSelected || isHovered;
                  const isAnySelected = selectedSector !== null;
                  
                  return (
                    <motion.circle
                      key={slice.id}
                      cx="50"
                      cy="50"
                      r={donutRadius}
                      fill="transparent"
                      stroke={slice.color}
                      strokeWidth={isActive ? 11 : 8.5}
                      strokeDasharray={slice.strokeDasharray}
                      strokeDashoffset={slice.strokeDashoffset}
                      strokeLinecap="butt"
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSector(isSelected ? null : slice.id);
                      }}
                      onMouseEnter={() => setHoveredSector(slice.id)}
                      onMouseLeave={() => setHoveredSector(null)}
                      animate={{
                        strokeWidth: isActive ? 11 : 8.5,
                        opacity: isAnySelected && !isSelected ? 0.35 : 1,
                      }}
                      style={{
                        transformOrigin: '50px 50px',
                        scale: isActive ? 1.05 : 1,
                      }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    />
                  );
                })}
              </svg>

              {/* Center information display details (Hover/tap readout with Rubles Amount) */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4 text-center">
                <AnimatePresence mode="wait">
                  {activeSectorObj ? (
                    <motion.div
                      key={activeSectorObj.id}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      className="flex flex-col items-center max-w-[80%]"
                    >
                      <span className="text-[9px] uppercase font-black tracking-widest text-[#64748B] mb-0.5 leading-none">
                        {activeSectorObj.name}
                      </span>
                      
                      {displayUnit === 'percent' ? (
                        <>
                          <span 
                            className="text-2xl sm:text-3xl font-black font-mono tracking-tight leading-none"
                            style={{ color: activeSectorObj.color }}
                          >
                            {activeSectorObj.value}%
                          </span>
                          <span className="text-[10px] font-bold text-slate-800 dark:text-slate-300 font-mono mt-1 w-full truncate text-center">
                            {isPersonal 
                              ? formatCurrency(getAbsoluteRubleValue(activeSectorObj.value))
                              : `${(TOTAL_BUDGET * (activeSectorObj.value / 100)).toFixed(2)} трлн ₽`
                            }
                          </span>
                        </>
                      ) : (
                        <>
                          <span 
                            className="text-lg sm:text-xl font-black font-mono tracking-tight leading-none"
                            style={{ color: activeSectorObj.color }}
                          >
                            {isPersonal 
                              ? formatCurrency(getAbsoluteRubleValue(activeSectorObj.value))
                              : `${(TOTAL_BUDGET * (activeSectorObj.value / 100)).toFixed(1)} трлн ₽`
                            }
                          </span>
                          <span className="text-[10px] font-bold text-slate-800 dark:text-slate-300 font-mono mt-1 w-full truncate text-center">
                            {activeSectorObj.value}% бюджета
                          </span>
                        </>
                      )}

                      <span className="text-[8px] font-bold text-[#64748B] uppercase tracking-wide mt-1 animate-pulse">
                        кликните для drill-down
                      </span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="default"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center"
                    >
                      <span className="text-[11px] uppercase font-black tracking-widest text-[#64748B] leading-none">
                        БЮДЖЕТ МОСКВЫ
                      </span>
                      {displayUnit === 'percent' ? (
                        <span className="text-3xl font-black font-mono text-[#0F172A] dark:text-white tracking-tight mt-1">
                          100%
                        </span>
                      ) : (
                        <span className="text-lg font-black font-mono text-[#0F172A] dark:text-white tracking-tight mt-1">
                          {isPersonal ? formatCurrency(personalTax) : `${TOTAL_BUDGET.toFixed(2)} трлн ₽`}
                        </span>
                      )}
                      <span className="text-[8px] font-bold text-[#CC1111] uppercase tracking-wide mt-1.5 animate-pulse">
                        выберите сектор
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          )}

          {!isMobile && (
            <div className="mt-4 flex flex-col items-center text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                интерактивные подсказки
              </span>
              <p className="text-[10px] text-[#475569] font-semibold leading-relaxed max-w-[280px]">
                Наведите курсор на сектор для просмотра сумм в рублях. Кликните для детализации подкатегорий.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* 3. Geographic Analytics comparisons and Rankings table (Audit #11) */}
      <div className="border-t border-[#F1F5F9] pt-6 flex flex-col gap-6">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#CC1111]/10 text-[#CC1111] p-2 rounded-xl border border-[#CC1111]/20">
              <MapIcon size={20} className="stroke-[2.5px]" />
            </div>
            <div>
              <span className="text-[10px] font-black text-[#CC1111] uppercase tracking-wider block mb-0.5">Территориальный паспорт</span>
              <h3 className="text-base font-black text-[#0F172A] dark:text-slate-100 tracking-tight">Развитие административных округов г. Москвы</h3>
            </div>
          </div>
          
          <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-black text-[10px] uppercase tracking-wider px-3 py-1 rounded-lg w-max shrink-0">
            📊 Социальный норматив: на душу населения
          </div>
        </div>

        {/* Home District highlight tag alert */}
        {myDistrict && (
          <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-[#0F172A] dark:text-slate-100 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs font-bold">
              <Star size={15} className="text-amber-500 fill-amber-500 animate-pulse" />
              <span>Ваш домашний округ — <strong className="text-[#CC1111] font-black">{myDistrict}</strong>. Показываем приоритетные данные финансирования на душу населения!</span>
            </div>
            <button 
              onClick={() => {
                setMyDistrict('');
                safeLocalStorage.removeItem('mos_my_district');
              }}
              className="text-[10px] font-extrabold text-[#CC1111] uppercase tracking-wider hover:underline"
            >
              Сбросить
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Comparative District ranking (Audit #11) */}
          <div className="lg:col-span-7 flex flex-col gap-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4.5 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5 leading-none">
                <Trophy size={14} className="text-[#CC1111]" />
                Рейтинг округов по финансированию на душу населения
              </span>
              <span className="text-[10px] text-slate-400 font-bold tracking-tight">план 2026 г.</span>
            </div>

            <div className="space-y-2.5">
              {DISTRICTS.map((dist, idx) => {
                const isSelected = selectedDistrict.id === dist.id;
                const isHome = myDistrict === dist.id;
                
                return (
                  <div 
                    key={dist.id}
                    id={`district-row-${dist.id}`}
                    onClick={() => setSelectedDistrict(dist)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 cursor-pointer select-none",
                      isSelected 
                        ? "bg-white dark:bg-[#1e293b] border-[#CC1111] shadow-xs animate-pulse-once" 
                        : "bg-white dark:bg-[#1e293b]/80 border-slate-200 dark:border-slate-700/50 hover:border-slate-300"
                    )}
                  >
                    <div className="w-6 h-6 rounded-full bg-slate-900 border border-slate-800 text-white font-mono text-xs font-black flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-[#0F172A] dark:text-slate-100">{dist.label}</span>
                        {isHome && (
                          <span className="text-[8px] bg-amber-100 text-amber-800 font-black px-1.5 py-0.2 rounded uppercase tracking-wider border border-amber-200">
                            мой округ
                          </span>
                        )}
                        {isSelected && (
                          <span className="text-[8px] bg-[#CC1111]/10 text-[#CC1111] font-black px-1.5 py-0.2 rounded uppercase tracking-wider border border-[#CC1111]/20">
                            выбран
                          </span>
                        )}
                      </div>
                      <span 
                        className="text-[10px] text-[#475569] dark:text-slate-400 font-semibold leading-relaxed block mt-0.5 line-clamp-2"
                        title={dist.obj}
                      >
                        Флагман: {dist.obj}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-slate-800 dark:text-slate-100 font-mono block leading-none">{dist.perCapita}</span>
                      <span className="text-[9px] font-bold text-slate-400 font-mono mt-0.5 block leading-none">Общий: {dist.fund}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dynamic Passport district card and "My District" Selector Widget */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5 shadow-xs relative overflow-hidden">
            
            <div>
              <div className="flex justify-between items-start gap-3">
                <span className="text-[10px] uppercase font-black text-[#CC1111] tracking-widest block mb-1">
                  ПАСПОРТ РАЗВИТИЯ
                </span>
                
                {/* Pin/Favorite My District button */}
                <button
                  onClick={() => handleToggleMyDistrict(selectedDistrict.id)}
                  title={myDistrict === selectedDistrict.id ? "Убрать из домашнего округа" : "Установить как мой домашний округ"}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all outline-none select-none shrink-0",
                    myDistrict === selectedDistrict.id 
                      ? "bg-amber-500 border-amber-500 text-white shadow-xs" 
                      : "bg-[#F8FAFC] border-slate-200 dark:border-slate-700/50 text-[#475569] hover:bg-slate-50 dark:bg-slate-800/50 hover:border-slate-300"
                  )}
                >
                  {myDistrict === selectedDistrict.id ? (
                    <>
                      <Star size={11} className="fill-white" /> Убрать
                    </>
                  ) : (
                    <>
                      <StarOff size={11} /> В мой округ
                    </>
                  )}
                </button>
              </div>

              <h3 className="text-lg font-black text-[#0F172A] dark:text-slate-100 tracking-tight mb-4 mt-1">
                Гид по округу: {selectedDistrict.label}
              </h3>

              <div className="space-y-4">
                
                <div>
                  <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block mb-0.5">Общее финансирование из бюджета:</span>
                  <span className="text-lg font-black font-mono text-[#0F172A] dark:text-slate-100 tracking-tight block">
                    {selectedDistrict.fund}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block mb-0.5">В пересчете на 1 жителя округа:</span>
                  <span className="text-lg font-black font-mono text-[#CC1111] tracking-tight block">
                    {selectedDistrict.perCapita}
                  </span>
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-0.5">
                    * Показывает соотношение общих целевых муниципальных расходов к фактической численности населения префектуры.
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block mb-1.5">Флагманский проект в 2026 году:</span>
                  <div className="bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-3">
                    <p className="text-xs font-bold text-[#0F172A] dark:text-slate-100 leading-relaxed">
                      {selectedDistrict.obj}
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Quick manual select picker */}
            <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-5 gap-1.5">
              {DISTRICTS.map((dist) => {
                const isActive = selectedDistrict.id === dist.id;
                const isHome = myDistrict === dist.id;
                return (
                  <button
                    key={dist.id}
                    onClick={() => setSelectedDistrict(dist)}
                    className={cn(
                      "py-1.5 rounded-lg font-extrabold text-[10px] tracking-tight border text-center transition-all duration-150 outline-none select-none relative",
                      isActive 
                        ? "bg-[#CC1111] border-[#CC1111] text-white shadow-3xs scale-105" 
                        : "bg-[#F8FAFC] border-slate-200 dark:border-slate-700/50 text-[#475569] hover:bg-slate-50 dark:bg-slate-800/50"
                    )}
                  >
                    {isHome && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border border-white" />
                    )}
                    {dist.label}
                  </button>
                );
              })}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
