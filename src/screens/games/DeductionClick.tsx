import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { DEDUCTION_LIMIT, NDFL_RATE, formatRub } from '../../lib/deduction';
import { cn } from '../../lib/utils';
import { BottomAction } from '../../ui/Flow';
import { GamePage, GameResult, Task, finish, type GameProps, type Outcome } from './GameKit';

const EXPENSES = [
  { id: 'study', label: 'Обучение в вузе', value: 50_000 },
  { id: 'sport', label: 'Спортивный абонемент', value: 30_000 },
  { id: 'health', label: 'Лечение и стоматология', value: 80_000 },
];

export default function DeductionClick(props: GameProps) {
  const [added, setAdded] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const spent = EXPENSES.filter((item) => added.includes(item.id)).reduce((sum, item) => sum + item.value, 0);
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
        message={`Расходы ${formatRub(spent)}, но к вычету принимают не больше ${formatRub(DEDUCTION_LIMIT)}. Вернуть можно до ${formatRub(refund)} — 13 % от лимита, если за год уплачено не меньше НДФЛ.`}
        onRetry={() => {
          setAdded([]);
          setOutcome(null);
        }}
      >
        <section className="mgb-card px-5 py-[1.125rem]" aria-label="Исключения">
          <p className="m-0 text-[0.875rem] text-ink-2">Что считается отдельно</p>
          <p className="m-0 mt-1 text-[0.9375rem] leading-[1.45] [text-wrap:pretty]">
            Обучение ребёнка — свой лимит 110 000 ₽, дорогостоящее лечение — без лимита. Остальные социальные расходы делят общие 150 000 ₽.
          </p>
        </section>
      </GameResult>
    );
  }

  return (
    <GamePage item={props.item} onClose={props.onClose}>
      <Task>Соберите черновик 3-НДФЛ: добавьте расходы и дойдите до лимита социального вычета 150 000 ₽.</Task>

      <div role="group" aria-label="Расходы" className="flex flex-wrap gap-2">
        {EXPENSES.map((item) => {
          const on = added.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(item.id)}
              className={cn(
                'flex h-11 items-center gap-1.5 rounded-full px-4 text-[0.875rem] font-semibold transition-colors duration-200',
                on ? 'bg-ok-soft text-ok-ink' : 'bg-card text-ink shadow-[var(--mgb-seg-shadow)]',
              )}
            >
              {on ? <Check size={16} strokeWidth={2.6} aria-hidden="true" /> : <Plus size={16} strokeWidth={2.4} aria-hidden="true" />}
              {item.label} · {item.value / 1000}{'\u00A0'}тыс.
            </button>
          );
        })}
      </div>

      <section className="mgb-card px-5 py-[1.125rem]" aria-labelledby="receipt-3ndfl">
        <h2 id="receipt-3ndfl" className="m-0 mb-2 text-[1rem] font-semibold leading-snug">
          Черновик 3-НДФЛ
        </h2>
        {added.length === 0 ? (
          <p className="m-0 py-2 text-[0.875rem] text-ink-3">Пока пусто — добавьте расходы выше</p>
        ) : (
          <ul className="m-0 list-none p-0 font-mono text-[0.8125rem] leading-[1.7]">
            {EXPENSES.filter((item) => added.includes(item.id)).map((item) => (
              <li key={item.id} className="flex gap-1.5 text-ink-2">
                <span>{item.label}</span>
                <span aria-hidden="true" className="flex-1 -translate-y-1 border-b border-dotted border-ink-3 opacity-70" />
                <span className="font-semibold text-ink">{formatRub(item.value)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 border-t border-line pt-3">
          <span aria-hidden="true" className="block h-1.5 overflow-hidden rounded-full bg-track">
            <span className="block h-full rounded-full bg-c1 transition-[width] duration-300" style={{ width: `${(base / DEDUCTION_LIMIT) * 100}%` }} />
          </span>
          <p aria-live="polite" className="m-0 mt-2 text-[0.875rem] leading-snug text-ink-2">
            {reached
              ? `Лимит ${formatRub(DEDUCTION_LIMIT)} исчерпан${spent > DEDUCTION_LIMIT ? `: ${formatRub(spent - DEDUCTION_LIMIT)} сверх лимита не учитываются` : ''}`
              : `${formatRub(spent)} из ${formatRub(DEDUCTION_LIMIT)} лимита`}
          </p>
          <p className="m-0 mt-2 text-[0.875rem] text-ink-2">Можно вернуть</p>
          <p className="m-0 text-[2.5rem] font-bold leading-[1.05] tracking-[-0.035em] text-accent">{formatRub(refund)}</p>
        </div>
      </section>

      <BottomAction label={reached ? 'Завершить расчёт' : 'Дойдите до лимита'} disabled={!reached} onClick={() => setOutcome(finish(props, true))} />
    </GamePage>
  );
}
