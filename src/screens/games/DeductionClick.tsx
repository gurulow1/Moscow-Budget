import { useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Plus } from 'lucide-react';
import { DEDUCTION_LIMIT, NDFL_RATE, formatRub } from '../../lib/deduction';
import { cn } from '../../lib/utils';
import { BottomAction } from '../../ui/Flow';
import RollingNumber from '../../ui/exhibits/RollingNumber';
import { reducedMotion } from '../../ui/exhibits/useEntrance';
import { GamePage, GameResult, finish, type GameProps, type Outcome } from './GameKit';
import './games.css';

const EXPENSES = [
  { id: 'study', label: 'Обучение в вузе', value: 50_000, color: 'var(--mgb-c2)' },
  { id: 'sport', label: 'Спортивный абонемент', value: 30_000, color: 'var(--mgb-c4)' },
  { id: 'health', label: 'Лечение и стоматология', value: 80_000, color: 'var(--mgb-c3)' },
];

// The well holds 200 000 ₽; its rim is the yearly limit.
const DEPTH = 200_000;
const RIM = DEDUCTION_LIMIT / DEPTH;
const NB = ' ';

export default function DeductionClick(props: GameProps) {
  const [added, setAdded] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const reduce = reducedMotion();

  const items = added.map((id) => EXPENSES.find((item) => item.id === id)!);
  const spent = items.reduce((sum, item) => sum + item.value, 0);
  const base = Math.min(spent, DEDUCTION_LIMIT);
  const refund = Math.round(base * NDFL_RATE);
  const reached = spent >= DEDUCTION_LIMIT;

  const toggle = (id: string) => setAdded((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  if (outcome) {
    return (
      <GameResult
        {...props}
        outcome={outcome}
        title="Вычет рассчитан"
        message={`Расходы ${formatRub(spent)}, но к вычету принимают не больше ${formatRub(DEDUCTION_LIMIT)}. Вернуть можно до ${formatRub(refund)} — 13 % от лимита при доходе до 2,4 млн ₽, если за год уплачено не меньше НДФЛ.`}
        onRetry={() => {
          setAdded([]);
          setOutcome(null);
        }}
      >
        <section className="mgb-card px-5 py-[1.125rem] lg:px-7 lg:py-6" aria-label="Исключения">
          <p className="m-0 text-[0.875rem] text-ink-2">Что считается отдельно</p>
          <p className="m-0 mt-1 text-[0.9375rem] leading-[1.45] [text-wrap:pretty] lg:text-[1.0625rem]">
            Обучение ребёнка — свой лимит 110 000 ₽, дорогостоящее лечение — без лимита. Остальные социальные расходы делят общие 150 000 ₽.
          </p>
        </section>
      </GameResult>
    );
  }

  let below = 0;
  return (
    <GamePage
      item={props.item}
      onClose={props.onClose}
      headline="Заполните лимит вычета"
      task={`Бросайте расходы в колодец. Его край — лимит социального вычета ${formatRub(DEDUCTION_LIMIT)}: всё, что выше, налог не уменьшает.`}
      side={
        <div className="grid gap-4">
          <div role="group" aria-label="Расходы" className="grid gap-2">
            {EXPENSES.map((item) => {
              const on = added.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(item.id)}
                  className={cn('mgb-paper flex items-center gap-3 px-4 py-3 text-left transition-opacity duration-200', on && 'opacity-60')}
                  style={{ '--c': item.color } as CSSProperties}
                >
                  <span aria-hidden="true" className="h-9 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
                  <span className="grid min-w-0 flex-1">
                    <span className="text-[0.9375rem] font-semibold leading-tight">{item.label}</span>
                    <span className="font-mono text-[0.8125rem] text-[#6D7280]">{formatRub(item.value)}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn('grid size-8 shrink-0 place-items-center rounded-full', on ? 'bg-[#0B7A58] text-white' : 'bg-[rgba(34,38,46,0.08)] text-[#22262E]')}
                  >
                    {on ? <Check size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={2.6} />}
                  </span>
                </button>
              );
            })}
          </div>
          <div aria-live="polite" className="grid grid-cols-2 gap-4 border-t border-line pt-4">
            <div>
              <span className="block text-[0.8125rem] text-ink-3 lg:text-[0.9375rem]">Учтено</span>
              <b className="block text-[1.75rem] font-bold leading-tight tracking-[-0.03em] lg:text-[2.25rem]">{base.toLocaleString('ru-RU')}</b>
              <span className="text-[0.8125rem] text-ink-3">из 150{NB}000{NB}₽</span>
            </div>
            <div>
              <span className="block text-[0.8125rem] text-ink-3 lg:text-[0.9375rem]">Можно вернуть</span>
              <b className="text-[1.75rem] font-bold leading-tight tracking-[-0.03em] text-accent lg:text-[2.25rem]">
                <RollingNumber value={refund} />
                {NB}₽
              </b>
            </div>
          </div>
        </div>
      }
    >
      <div className="mgb-card px-4 pb-5 pt-10 lg:px-8 lg:pb-8 lg:pt-14">
        <div className="mgb-well-wrap">
          <div className="mgb-well-scale" aria-hidden="true">
            {[0, 50_000, 100_000, 150_000, 200_000].map((mark) => (
              <span key={mark} style={{ bottom: `${(mark / DEPTH) * 100}%` }} className={cn(mark === DEDUCTION_LIMIT && 'font-bold text-ink')}>
                {mark === DEDUCTION_LIMIT ? 'лимит' : `${mark / 1000}${NB}тыс.`}
              </span>
            ))}
          </div>
          <div className="mgb-well" role="img" aria-label={`В колодце ${formatRub(spent)}, лимит ${formatRub(DEDUCTION_LIMIT)}`}>
            <div className={cn('w-rim', spent > DEDUCTION_LIMIT && 'is-over')} style={{ bottom: `${RIM * 100}%` }} />
            <AnimatePresence initial={false}>
              {items.map((item) => {
                const from = below;
                below += item.value;
                const over = Math.max(0, below - Math.max(from, DEDUCTION_LIMIT));
                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    layout={!reduce}
                    onClick={() => toggle(item.id)}
                    aria-label={`Убрать: ${item.label}`}
                    initial={reduce ? false : { y: -420, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={reduce ? { opacity: 0 } : { y: -260, opacity: 0, transition: { duration: 0.3 } }}
                    transition={{ type: 'spring', stiffness: 420, damping: 24, mass: 0.9 }}
                    className="w-block text-left"
                    style={{ '--c': item.color, height: `calc(${(item.value / DEPTH) * 100}% - 4px)` } as CSSProperties}
                  >
                    {over > 0 && <span className="w-over" style={{ height: `${(over / item.value) * 100}%` }} />}
                    <span className="relative">{item.label}</span>
                    <span className="relative">{formatRub(item.value)}</span>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
        {spent > DEDUCTION_LIMIT && (
          <p className="m-0 mt-4 text-center text-[0.875rem] font-semibold text-accent lg:text-[1rem]">
            {formatRub(spent - DEDUCTION_LIMIT)} выше края — не учитываются
          </p>
        )}
      </div>

      <BottomAction label={reached ? 'Завершить расчёт' : 'Дойдите до края'} disabled={!reached} onClick={() => setOutcome(finish(props, true))} />
    </GamePage>
  );
}
