import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Check, X } from 'lucide-react';
import { cn } from '../../lib/utils';

// Word answers as big cards that share the free height, so the question never sits over an empty box.
// After the answer the right card fills with gold from the left; a wrong pick turns red and shakes.
interface AnswerCardsProps {
  options: string[];
  picked: number | null;
  correct: number;
  onPick: (i: number) => void;
  reduce: boolean;
  /** After an answer: the screen point of the right card's letter, for a coin to fly from. */
  onReveal?: (x: number, y: number) => void;
}

const LETTERS = 'АБВГД';

export default function AnswerCards({ options, picked, correct, onPick, reduce, onReveal }: AnswerCardsProps) {
  const answered = picked !== null;
  const badges = useRef<(HTMLSpanElement | null)[]>([]);
  const revealRef = useRef(onReveal);
  revealRef.current = onReveal;

  useEffect(() => {
    if (picked === null) return;
    const timer = window.setTimeout(() => {
      const r = badges.current[correct]?.getBoundingClientRect();
      if (r) revealRef.current?.(r.left + r.width / 2, r.top + r.height / 2);
    }, reduce ? 0 : 260);
    return () => window.clearTimeout(timer);
  }, [picked, correct, reduce]);

  return (
    <div role="group" aria-label="Варианты ответа" className="flex min-h-[17rem] flex-1 flex-col gap-2.5">
      {options.map((text, i) => {
        const isRight = answered && i === correct;
        const isMine = answered && i === picked;
        return (
          <motion.button
            key={text}
            layout={!reduce}
            type="button"
            aria-pressed={i === picked}
            onClick={() => !answered && onPick(i)}
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={
              isMine && !isRight && !reduce
                ? { opacity: 1, y: 0, x: [0, -9, 8, -6, 4, -2, 0] }
                : { opacity: answered && !isRight && !isMine ? 0.5 : 1, y: 0, x: 0 }
            }
            transition={{
              ...(isMine && !isRight ? { duration: 0.5, ease: 'easeOut' } : { delay: answered ? 0 : 0.06 * i, duration: 0.4, ease: 'easeOut' }),
              // Room for the explanation: the cards shrink smoothly, their letters and words keep their shape.
              layout: { duration: 0.35, ease: [0.2, 0.8, 0.2, 1] },
            }}
            whileTap={answered ? undefined : { scale: 0.98 }}
            className={cn(
              'mgb-answer relative flex min-h-[4.5rem] flex-1 items-center gap-3.5 overflow-hidden rounded-[1.5rem] px-4 py-3 text-left text-ink',
              answered ? 'cursor-default' : 'cursor-pointer',
              isMine && !isRight && 'mgb-answer-bad',
            )}
          >
            {/* The gold that pours in behind the right answer. */}
            <motion.span
              aria-hidden="true"
              className="mgb-answer-fill absolute inset-0 origin-left"
              initial={false}
              animate={{ scaleX: isRight ? 1 : 0 }}
              transition={{ duration: reduce ? 0 : 0.55, ease: [0.2, 0.8, 0.2, 1], delay: reduce ? 0 : 0.08 }}
            />
            <motion.span
              layout={!reduce}
              ref={(el: HTMLSpanElement | null) => {
                badges.current[i] = el;
              }}
              aria-hidden="true"
              className={cn(
                'relative grid size-10 shrink-0 place-items-center rounded-full text-[1rem] font-bold transition-colors duration-300',
                isRight ? 'bg-ok-ink text-white' : isMine ? 'bg-accent text-white' : 'bg-track text-ink-2',
              )}
            >
              {isRight ? <Check size={19} strokeWidth={3} /> : isMine ? <X size={18} strokeWidth={3} /> : LETTERS[i]}
            </motion.span>
            <motion.span layout={!reduce} className="relative min-w-0 flex-1 text-[1.0625rem] font-semibold leading-[1.3] tracking-[-0.01em] [text-wrap:pretty] sm:text-[1.1875rem]">
              {text}
            </motion.span>
          </motion.button>
        );
      })}
    </div>
  );
}
