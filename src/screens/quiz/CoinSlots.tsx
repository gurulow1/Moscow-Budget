import { Fragment, forwardRef } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export type CoinState = 'empty' | 'current' | 'gold' | 'miss';

// A coin slot: dashed while waiting, gold once earned, a quiet cross for a miss.
export const Coin = forwardRef<HTMLSpanElement, { state: CoinState; size?: number; delay?: number; reduce?: boolean }>(function Coin(
  { state, size = 30, delay = 0, reduce = false },
  ref,
) {
  return (
    <span ref={ref} className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <span
        aria-hidden="true"
        className={cn('absolute inset-0 rounded-full border-2 border-dashed', state === 'current' ? 'mgb-coin-wait border-accent' : 'border-track')}
      />
      {state === 'gold' && (
        <motion.span
          aria-hidden="true"
          className="mgb-coin absolute inset-0 grid place-items-center rounded-full font-extrabold"
          style={{ fontSize: size * 0.5 }}
          initial={reduce ? false : { scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 460, damping: 18, delay }}
        >
          ₽
        </motion.span>
      )}
      {state === 'miss' && (
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 grid place-items-center rounded-full bg-track text-ink-3"
          initial={reduce ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25, delay }}
        >
          <X size={size * 0.45} strokeWidth={2.6} />
        </motion.span>
      )}
    </span>
  );
});

// The quiz progress as coins to collect: one slot per question.
export function CoinSlots({ states, slotRefs, reduce }: { states: CoinState[]; slotRefs: { current: (HTMLSpanElement | null)[] }; reduce: boolean }) {
  const earned = states.filter((s) => s === 'gold').length;
  return (
    <div className="flex flex-1 items-center gap-2" role="img" aria-label={`Монет собрано: ${earned} из ${states.length}`}>
      {states.map((state, i) => (
        <Fragment key={i}>
          <Coin
            ref={(el: HTMLSpanElement | null) => {
              slotRefs.current[i] = el;
            }}
            state={state}
            reduce={reduce}
          />
        </Fragment>
      ))}
    </div>
  );
}
