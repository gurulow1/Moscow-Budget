import type { LucideIcon } from 'lucide-react';
import { Calculator, ChartNoAxesColumn, House, Target } from 'lucide-react';
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

// Tabs are plain hash links: the address keeps the open tab, and Back returns to the previous one.
export default function TabBar({ active, questsBadge, dimmed }: TabBarProps) {
  return (
    <nav
      aria-label="Разделы"
      className={cn(
        'mgb-glass fixed bottom-[calc(1.25rem_+_env(safe-area-inset-bottom))] left-1/2 z-40 flex h-[4.25rem] w-[calc(min(100vw,30rem)_-_2rem)] -translate-x-1/2 overflow-hidden rounded-[2.125rem] p-1.5',
        // On a wide screen the bar becomes a side rail with the brand on top.
        'lg:bottom-auto lg:left-6 lg:top-6 lg:h-auto lg:w-56 lg:translate-x-0 lg:flex-col lg:gap-1 lg:rounded-[1.75rem] lg:p-2',
        'a11y-mobile-navigation transition-opacity duration-200',
        dimmed && 'pointer-events-none opacity-20',
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-50"
        style={{ background: 'radial-gradient(120px circle at 22% 0%, var(--mgb-glass-hi), transparent 70%)' }}
      />
      <p className="relative z-[1] m-0 hidden px-4 pb-3 pt-2 text-[0.9375rem] font-bold tracking-[-0.01em] text-ink-2 lg:block">
        МосГорБюджет<span className="text-accent">.Трек</span>
      </p>
      {APP_TABS.map(({ id, label, icon: Icon }) => {
        const isActive = id === active;
        return (
          <a
            key={id}
            href={`#${id}`}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'relative z-[1] grid flex-1 content-center justify-items-center gap-[3px] rounded-[1.75rem] text-[0.6875rem] leading-normal no-underline transition-colors duration-200',
              'lg:flex lg:h-12 lg:flex-none lg:items-center lg:justify-start lg:gap-3 lg:rounded-2xl lg:px-4 lg:text-[0.9375rem]',
              isActive
                ? 'font-semibold text-ink shadow-[inset_0_1px_1px_var(--mgb-glass-hi),0_6px_16px_-10px_rgba(0,0,0,0.4)]'
                : 'font-medium text-ink-3',
            )}
            style={isActive ? { background: 'var(--mgb-blob)' } : undefined}
          >
            <span className="relative">
              <Icon size={23} strokeWidth={1.8} aria-hidden="true" />
              {id === 'quests' && questsBadge > 0 && (
                <span aria-hidden="true" className="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent-fill px-1 text-[0.5625rem] font-bold leading-none text-white">
                  {questsBadge}
                </span>
              )}
            </span>
            {label}
            {id === 'quests' && questsBadge > 0 && <span className="sr-only">, новых викторин: {questsBadge}</span>}
          </a>
        );
      })}
    </nav>
  );
}
