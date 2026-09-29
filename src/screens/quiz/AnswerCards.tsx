import { motion } from 'motion/react';
import { Check, X } from 'lucide-react';
import { cn } from '../../lib/utils';

// The answers as big cards that share the free height, so the question never sits over an empty box.
// Sums of money get a bar under the figure, all bars to one scale, so the size of each answer is visible.
// After the answer the right card fills with green from the left; a wrong pick turns red and shakes.
interface AnswerCardsProps {
  options: string[];
  /** The options as rubles when every one is a sum. */
  values?: number[] | null;
  picked: number | null;
  correct: number;
  onPick: (i: number) => void;
  reduce: boolean;
}

const LETTERS = 'АБВГД';

export default function AnswerCards({ options, values, picked, correct, onPick, reduce }: AnswerCardsProps) {
  const answered = picked !== null;
  const max = values ? Math.max(...values) : 0;

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
              'mgb-answer relative flex min-h-[4.5rem] flex-1 items-center gap-3.5 overflow-hidden rounded-[1.5rem] px-4 py-3 text-left text-ink lg:gap-4 lg:px-5',
              answered ? 'cursor-default' : 'cursor-pointer',
              isMine && !isRight && 'mgb-answer-bad',
            )}
          >
            {/* The green that pours in behind the right answer. */}
            <motion.span
              aria-hidden="true"
              className="mgb-answer-fill absolute inset-0 origin-left"
              initial={false}
              animate={{ scaleX: isRight ? 1 : 0 }}
              transition={{ duration: reduce ? 0 : 0.55, ease: [0.2, 0.8, 0.2, 1], delay: reduce ? 0 : 0.08 }}
            />
            <motion.span
              layout={!reduce}
              aria-hidden="true"
              className={cn(
                'relative grid size-10 shrink-0 place-items-center rounded-full text-[1rem] font-bold transition-colors duration-300',
                isRight ? 'bg-ok-ink text-white' : isMine ? 'bg-accent text-white' : 'bg-track text-ink-2',
              )}
            >
              {isRight ? <Check size={19} strokeWidth={3} /> : isMine ? <X size={18} strokeWidth={3} /> : LETTERS[i]}
            </motion.span>
            {values ? (
              <motion.span layout={!reduce} className="relative grid min-w-0 flex-1 gap-2">
                <span className="text-[1.5rem] font-bold leading-none tracking-[-0.035em] sm:text-[1.875rem]">{text}</span>
                <span aria-hidden="true" className="mgb-scale" data-state={isRight ? 'right' : isMine ? 'wrong' : undefined}>
                  <motion.span
                    initial={reduce ? false : { scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: reduce ? 0 : 0.9, ease: [0.16, 1, 0.3, 1], delay: reduce ? 0 : 0.25 + 0.08 * i }}
                    style={{ width: `${Math.max(1.5, (values[i] / max) * 100)}%` }}
                  />
                </span>
              </motion.span>
            ) : (
              <motion.span layout={!reduce} className="relative min-w-0 flex-1 text-[1.0625rem] font-semibold leading-[1.3] tracking-[-0.01em] [text-wrap:pretty] sm:text-[1.1875rem]">
                {text}
              </motion.span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
