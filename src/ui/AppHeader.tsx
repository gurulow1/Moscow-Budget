import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Eye, MessageCircle, UserRound } from 'lucide-react';
import { cn } from '../lib/utils';
import type { LevelInfo } from '../lib/progress';

interface AppHeaderProps {
  title: string;
  sub: string;
  balance: number;
  level: LevelInfo;
  accessibilityEnabled: boolean;
  onOpenAccessibility: () => void;
  onOpenProfile: () => void;
  profileClassName?: string;
  helperClassName?: string;
  className?: string;
}

const RING = 2 * Math.PI * 16;
const ROUND = 'mgb-glass relative grid size-11 shrink-0 place-items-center rounded-full text-ink transition-opacity duration-200';

// One header for every tab: the actions sit on the brand line, so a long title never wraps next to them.
export default function AppHeader({
  title,
  sub,
  balance,
  level,
  accessibilityEnabled,
  onOpenAccessibility,
  onOpenProfile,
  profileClassName,
  helperClassName,
  className,
}: AppHeaderProps) {
  const previousBalance = useRef(balance);
  const [gained, setGained] = useState<number | null>(null);

  useEffect(() => {
    const delta = balance - previousBalance.current;
    previousBalance.current = balance;
    if (delta <= 0) return;
    setGained(delta);
    const timer = window.setTimeout(() => setGained(null), 2400);
    return () => window.clearTimeout(timer);
  }, [balance]);

  return (
    <header className={cn('px-5 pt-3', className)}>
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="m-0 text-[0.875rem] font-bold tracking-[-0.01em] text-ink-2 lg:hidden">
          МосГорБюджет<span className="text-accent">.Трек</span>
        </p>
        <div className="relative ml-auto flex items-center gap-2">
          <button
            id="tour-ai"
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open_mos_ai_chat'))}
            aria-label="Помощник по бюджету"
            className={cn(ROUND, helperClassName)}
          >
            <MessageCircle size={20} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <div id="tour-header" className={cn('flex items-center gap-2 rounded-full transition-opacity duration-200', profileClassName)}>
            <button
              type="button"
              onClick={onOpenAccessibility}
              aria-label="Версия для слабовидящих"
              aria-pressed={accessibilityEnabled}
              className={ROUND}
            >
              <Eye size={20} strokeWidth={1.8} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onOpenProfile}
              aria-label={`Мой прогресс: уровень ${level.level}, ${balance} из ${level.nextLevelXp} баллов`}
              className={ROUND}
            >
              <svg viewBox="0 0 40 40" aria-hidden="true" className="absolute inset-0 size-full fill-none">
                <circle cx="20" cy="20" r="16" strokeWidth="2.4" className="stroke-track" />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  transform="rotate(-90 20 20)"
                  className="stroke-accent transition-[stroke-dashoffset] duration-500"
                  strokeDasharray={RING}
                  strokeDashoffset={RING * (1 - Math.min(100, level.progress) / 100)}
                />
              </svg>
              <UserRound size={17} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>
          <AnimatePresence>
            {gained !== null && (
              <motion.span
                role="status"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute right-0 top-full z-20 mt-2 whitespace-nowrap rounded-full bg-ok-soft px-2.5 py-1 text-[0.8125rem] font-semibold text-ok-ink"
              >
                +{gained} баллов
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
      <h1 className="m-0 mt-1 text-[1.875rem] font-bold leading-[1.15] tracking-[-0.03em] text-ink">{title}</h1>
      <p className="m-0 mt-1 text-[0.9375rem] text-ink-2">{sub}</p>
    </header>
  );
}
