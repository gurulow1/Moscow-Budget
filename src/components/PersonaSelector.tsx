import { motion } from 'motion/react';
import { GraduationCap, Briefcase, Rocket, Users, Info, Lightbulb } from 'lucide-react';
import { type ElementType } from 'react';
import { Persona } from '../../types';
import { cn } from '../lib/utils';

interface PersonaSelectorProps {
  activePersona: Persona;
  onSelect: (p: Persona) => void;
  isLoading?: boolean;
}

const PERSONAS: { id: Persona; label: string; icon: ElementType; color: string; description: string; suggestion: string }[] = [
  { 
    id: 'Student', 
    label: 'Студент', 
    icon: GraduationCap, 
    color: 'text-blue-600 dark:text-blue-400',
    description: 'Доступные льготы на обучение, спорт, льготный проезд и стипендиальные программы.',
    suggestion: 'Рекомендуется: «Налоговый вычет за обучение в вузе и абонемент в фитнес-клуб».'
  },
  { 
    id: 'Professional', 
    label: 'Молодой специалист', 
    icon: Rocket, 
    color: 'text-emerald-600 dark:text-emerald-400',
    description: 'Субсидии на приобретение жилья, повышение квалификации и налоговые льготы 3-НДФЛ.',
    suggestion: 'Рекомендуется: «Вычет за профессиональное обучение, ДМС и спортивные секции».'
  },
  { 
    id: 'Entrepreneur', 
    label: 'Предприниматель', 
    icon: Briefcase, 
    color: 'text-amber-600 dark:text-amber-400',
    description: 'Гранты Правительства Москвы для малого бизнеса, компенсации процентов по кредитам и льготная аренда.',
    suggestion: 'Рекомендуется: «Калькулятор налоговых каникул и расчет субсидий на оборудование».'
  },
  { 
    id: 'Family', 
    label: 'Семья с детьми', 
    icon: Users, 
    color: 'text-purple-600 dark:text-purple-400',
    description: 'Материнский капитал, бесплатное питание в школах, компенсация детского сада и семейные программы.',
    suggestion: 'Рекомендуется: «Вычет за обучение детей, кружки, спортивные секции и летние лагеря».'
  },
];

export default function PersonaSelector({ activePersona, onSelect, isLoading }: PersonaSelectorProps) {
  const currentPersonaInfo = PERSONAS.find(p => p.id === activePersona) || PERSONAS[0];

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-6 lg:p-8 border border-[#E2E8F0] dark:border-slate-800 shadow-xs flex flex-col gap-5">
        <div className="space-y-2">
          <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
          <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
          <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 w-28 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
          ))}
        </div>
        <div className="h-16 w-full bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 lg:p-8 border border-[#E2E8F0] dark:border-[rgba(255,255,255,0.08)] shadow-md dark:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.35)] transition-shadow duration-300">
      <div className="flex flex-col gap-5">
        
        {/* Title and Short Description */}
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#CC1111] dark:text-[#E11D48] uppercase tracking-wider block mb-1">
              Персонализированный бюджет
            </span>
            <h2 className="text-xl font-bold text-[#0F172A] dark:text-slate-100 tracking-tight">Финансовый чекап профиля</h2>
            <p className="text-[#475569] dark:text-slate-400 text-xs sm:text-sm mt-0.5">
              Выберите ваш социальный статус, чтобы кастомизировать расчет вычетов, аналитику и отслеживать бюджетные треки.
            </p>
          </div>
        </div>
        
        {/* Navigation Tabs (Wrap on small screens for solid touch access) */}
        <div className="w-full">
          <div className="flex flex-wrap items-center gap-2 pb-1.5">
            {PERSONAS.map((p) => {
              const isActive = activePersona === p.id;
              const Icon = p.icon;
              return (
                <button
                  key={p.id}
                  onClick={() => onSelect(p.id)}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 outline-none select-none border tracking-tight btn-interactive",
                    isActive 
                      ? "bg-[#CC1111] dark:bg-[#E11D48] border-[#CC1111] dark:border-[#E11D48] text-white shadow-xs cursor-default scale-[1.02]" 
                      : "bg-white dark:bg-[#1E293B] border-[#E2E8F0] dark:border-slate-700 text-[#475569] dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800 hover:text-[#0F172A] dark:text-slate-100 dark:hover:text-white cursor-pointer"
                  )}
                >
                  <Icon size={14} className={cn("stroke-[2.5px]", isActive ? "text-white" : p.color)} />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic description area on selection change */}
        <motion.div 
          key={activePersona}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-[#F8FAFC] dark:bg-slate-950 p-4 rounded-xl border border-[#E2E8F0] dark:border-slate-800"
        >
          <div className="md:col-span-8 flex items-start gap-3">
            <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-[#E2E8F0] dark:border-slate-800 mt-0.5 shrink-0">
              <Info size={15} className="text-[#475569] dark:text-slate-400" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#475569] dark:text-slate-400 tracking-wider">Ваш профиль льгот</span>
              <p className="text-xs sm:text-sm font-medium text-[#0F172A] dark:text-slate-200 mt-0.5 leading-relaxed">
                {currentPersonaInfo.description}
              </p>
            </div>
          </div>
          
          <div className="md:col-span-4 border-t md:border-t-0 md:border-l border-[#E2E8F0] dark:border-slate-800 pt-3 md:pt-0 md:pl-4 flex items-start gap-2.5">
            <Lightbulb size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-[#475569] dark:text-slate-400 font-medium italic">
              {currentPersonaInfo.suggestion}
            </p>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
