import { useEffect, useState } from 'react';
import { BUDGET_FACTS } from '../../data/budgetFacts';
import { cn } from '../../lib/utils';
import RollingNumber from './RollingNumber';

// A year's spending over the seconds of a year: about 202 467 ₽ a second.
export const SPEND_PER_SECOND = Math.round((BUDGET_FACTS.expenses.amountBillion * 1e9) / 31_536_000);
const OPENED = performance.now();
const seconds = () => Math.floor((performance.now() - OPENED) / 1000) + 1;

// How much the city has spent since the page was opened; the digits roll once a second.
export default function LiveSpend({ className, numberClassName }: { className?: string; numberClassName?: string }) {
  const [n, setN] = useState(seconds);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) setN(seconds());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className={className}>
      <p className="m-0 flex items-center gap-2.5 text-ink-2">
        <span aria-hidden="true" className="mgb-pulse">
          <i />
          <i />
        </span>
        Пока вы здесь, город потратил
        <span className="sr-only"> — в среднем {SPEND_PER_SECOND.toLocaleString('ru-RU')} рублей каждую секунду</span>
      </p>
      <p aria-hidden="true" className={cn('m-0 font-bold tracking-[-0.03em] text-ink', numberClassName)}>
        <RollingNumber value={n * SPEND_PER_SECOND} />
        <span className="ml-[0.18em] text-ink-2">₽</span>
      </p>
    </div>
  );
}
