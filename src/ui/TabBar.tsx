import type { LucideIcon } from 'lucide-react';
import { Calculator, ChartNoAxesColumn, House, MessageCircle, Target } from 'lucide-react';
import { cn } from '../lib/utils';

export type AppTab = 'home' | 'calc' | 'quests' | 'data';

export const APP_TABS: { id: AppTab; label: string; icon: LucideIcon }[] = [
  { id: 'home', label: 'Главная', icon: House },
  { id: 'calc', label: 'Вычет', icon: Calculator },
  { id: 'quests', label: 'Квесты', icon: Target },
  { id: 'data', label: 'Данные', icon: ChartNoAxesColumn },
];

interface TabBarProps {
  active: AppTab;
  questsBadge: number;
  dimmed?: boolean;
}

const ACTIVE = 'font-semibold text-ink shadow-[inset_0_1px_1px_var(--mgb-glass-hi),0_6px_16px_-10px_rgba(0,0,0,0.4)]';

const Glow = () => (
  <span
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-50"
    style={{ background: 'radial-gradient(120px circle at 22% 0%, var(--mgb-glass-hi), transparent 70%)' }}
  />
);

function TabIcon({ id, icon: Icon, questsBadge, size }: { id: AppTab; icon: LucideIcon; questsBadge: number; size: number }) {
  return (
    <span className="relative">
      <Icon size={size} strokeWidth={1.8} aria-hidden="true" />
      {id === 'quests' && questsBadge > 0 && (
        <span aria-hidden="true" className="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent-fill px-1 text-[0.5625rem] font-bold leading-none text-white">
          {questsBadge}
        </span>
      )}
    </span>
  );
}

// Tabs are plain hash links: the address keeps the open tab, and Back returns to the previous one.
// The floating bottom bar is for phones and tablets; a wide screen gets SideNav instead.
export default function TabBar({ active, questsBadge, dimmed }: TabBarProps) {
  return (
    <>
      <div aria-hidden="true" className="mgb-bottom-veil [--veil:7.5rem] lg:hidden" />
      <nav
        aria-label="Разделы"
        className={cn(
          'mgb-glass fixed bottom-[calc(1.25rem_+_env(safe-area-inset-bottom))] left-1/2 z-40 flex h-[4.25rem] w-[calc(min(100vw,30rem)_-_2rem)] -translate-x-1/2 overflow-hidden rounded-[2.125rem] p-1.5 lg:hidden',
          'a11y-mobile-navigation transition-opacity duration-200',
          dimmed && 'pointer-events-none opacity-20',
        )}
      >
        <Glow />
        {APP_TABS.map(({ id, label, icon }) => {
          const isActive = id === active;
          return (
            <a
              key={id}
              href={`#${id}`}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'relative z-[1] grid flex-1 content-center justify-items-center gap-[3px] rounded-[1.75rem] text-[0.6875rem] leading-normal no-underline transition-colors duration-200',
                isActive ? ACTIVE : 'font-medium text-ink-3',
              )}
              style={isActive ? { background: 'var(--mgb-blob)' } : undefined}
            >
              <TabIcon id={id} icon={icon} questsBadge={questsBadge} size={23} />
              {label}
              {id === 'quests' && questsBadge > 0 && <span className="sr-only">, новых викторин: {questsBadge}</span>}
            </a>
          );
        })}
      </nav>
    </>
  );
}

// The desktop sidebar: brand, sections and a way into the budget helper, full height on the left.
export function SideNav({ active, questsBadge, dimmed }: TabBarProps) {
  return (
    <aside
      className={cn(
        'mgb-glass fixed inset-y-4 left-4 z-40 hidden w-[15.5rem] flex-col rounded-[1.75rem] p-3 lg:flex',
        'transition-opacity duration-200',
        dimmed && 'pointer-events-none opacity-20',
      )}
    >
      <Glow />
      <p className="relative m-0 px-3 pb-6 pt-3 text-[1.125rem] font-bold tracking-[-0.02em] text-ink">
        МосГорБюджет<span className="text-accent">.Трек</span>
      </p>
      <nav aria-label="Разделы" className="relative grid gap-1">
        {APP_TABS.map(({ id, label, icon }) => {
          const isActive = id === active;
          return (
            <a
              key={id}
              href={`#${id}`}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex h-12 items-center gap-3 rounded-2xl px-3.5 text-[1rem] no-underline transition-colors duration-200',
                isActive ? ACTIVE : 'font-medium text-ink-2 hover:bg-[var(--mgb-blob)] hover:text-ink',
              )}
              style={isActive ? { background: 'var(--mgb-blob)' } : undefined}
            >
              <TabIcon id={id} icon={icon} questsBadge={questsBadge} size={21} />
              {label}
              {id === 'quests' && questsBadge > 0 && <span className="sr-only">, новых викторин: {questsBadge}</span>}
            </a>
          );
        })}
      </nav>

      <div className="relative mt-auto grid gap-3">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('open_mos_ai_chat'))}
          className="grid gap-2 rounded-[1.375rem] border border-line bg-card p-4 text-left text-ink shadow-[var(--mgb-shadow)] transition-transform duration-200 hover:-translate-y-0.5"
        >
          <span aria-hidden="true" className="grid size-10 place-items-center rounded-[0.875rem] bg-accent-soft text-accent">
            <MessageCircle size={20} strokeWidth={1.9} />
          </span>
          <span className="text-[1rem] font-semibold leading-snug tracking-[-0.01em]">Помощник по бюджету</span>
          <span className="text-[0.875rem] leading-snug text-ink-2">Спросите, куда идут деньги города или сколько вернут за учёбу</span>
        </button>
        <p className="m-0 px-3 pb-1 text-[0.75rem] leading-snug text-ink-3">Учебный прототип на открытых данных, не официальный сервис города</p>
      </div>
    </aside>
  );
}
