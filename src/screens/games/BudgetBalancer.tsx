import { Fragment, useState, type CSSProperties } from 'react';
import { Minus, Plus } from 'lucide-react';
import { BUDGET_FACTS } from '../../data/budgetFacts';
import { cn } from '../../lib/utils';
import { BottomAction, Mark } from '../../ui/Flow';
import { GamePage, GameResult, finish, type GameProps, type Outcome } from './GameKit';
import './games.css';

const SOCIAL_MIN = 50;
const STEP = 5;

const PARTS = [
  { key: 'industry', label: 'Промышленность', color: 'var(--mgb-c4)' },
  { key: 'social', label: 'Социальная сфера', color: 'var(--mgb-c3)' },
  { key: 'transport', label: 'Транспорт', color: 'var(--mgb-c1)' },
] as const;

type Key = (typeof PARTS)[number]['key'];
type Plan = Record<Key, number>;

const START: Plan = { industry: 25, social: 45, transport: 30 };
const pct = (value: number) => `${value} %`;

interface VesselProps {
  label: string;
  color: string;
  value: number;
  /** A line on the glass: the least this vessel must hold. */
  mark?: number;
  onChange: (value: number) => void;
}

// A measuring vessel of glass: the share is the liquid in it. Drag the liquid, use the arrows, or the − and + under it.
function Vessel({ label, color, value, mark, onChange }: VesselProps) {
  const set = (next: number) => onChange(Math.min(100, Math.max(0, next)));
  return (
    <div className="mgb-vessel" style={{ '--c': color, '--v': value } as CSSProperties}>
      <span className="v-read" aria-hidden="true">
        {value}
        <span>%</span>
      </span>
      <div className="v-glass">
        <div className="v-liquid" />
        <div className="v-ticks" aria-hidden="true">
          {Array.from({ length: 9 }, (_, i) => (
            <i key={i} style={{ bottom: `${(i + 1) * 10}%` }} />
          ))}
        </div>
        {mark !== undefined && (
          <div className={cn('v-mark', value >= mark && 'is-ok')} style={{ bottom: `${mark}%` }} aria-hidden="true">
            <b>от {pct(mark)}</b>
          </div>
        )}
        <input
          type="range"
          min={0}
          max={100}
          step={STEP}
          value={value}
          aria-label={label}
          aria-valuetext={pct(value)}
          onChange={(event) => set(Number(event.target.value))}
          className="v-input"
        />
      </div>
      <span className="v-label">{label}</span>
      <div className="v-steps">
        <button type="button" aria-label={`${label}: меньше`} onClick={() => set(value - STEP)} className="mgb-glass grid place-items-center text-ink">
          <Minus size={16} strokeWidth={2.4} aria-hidden="true" />
        </button>
        <button type="button" aria-label={`${label}: больше`} onClick={() => set(value + STEP)} className="mgb-glass grid place-items-center text-ink">
          <Plus size={16} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default function BudgetBalancer(props: GameProps) {
  const [plan, setPlan] = useState<Plan>(START);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const total = plan.industry + plan.social + plan.transport;
  const socialOk = plan.social >= SOCIAL_MIN;
  const socialShare = Math.round((BUDGET_FACTS.socialSphere.amountBillion / BUDGET_FACTS.expenses.amountBillion) * 100);

  if (outcome) {
    return (
      <GameResult
        {...props}
        outcome={outcome}
        title={outcome.win ? 'План утверждён' : 'Нужна доработка'}
        message={
          outcome.win
            ? `Социальная сфера получила ${pct(plan.social)} — приоритет сценария соблюдён.`
            : `Социальной сфере досталось ${pct(plan.social)}, а в этом сценарии нужно не меньше ${pct(SOCIAL_MIN)}.`
        }
        onRetry={() => setOutcome(null)}
      >
        <section className="mgb-card px-5 py-[1.125rem] lg:px-7 lg:py-6" aria-label="Как в жизни">
          <p className="m-0 text-[0.875rem] text-ink-2">Как в бюджете Москвы</p>
          <p className="m-0 mt-1 text-[0.9375rem] leading-[1.45] [text-wrap:pretty] lg:text-[1.0625rem]">
            На социальную сферу в широком смысле в 2026 году предусмотрено около 3,2{' '}трлн{' '}₽ — примерно {socialShare}
            {' '}% всех расходов.
          </p>
        </section>
      </GameResult>
    );
  }

  return (
    <GamePage
      item={props.item}
      onClose={props.onClose}
      headline="Разлейте бюджет по трём сосудам"
      task={`Всего ${pct(100)}: ничего не должно остаться и перелиться. Социальной сфере — не меньше ${pct(SOCIAL_MIN)}.`}
      note="Тяните жидкость вверх и вниз или нажимайте − и +."
      side={
        <div aria-live="polite">
          <p className="m-0 flex items-baseline gap-2">
            <b className={cn('text-[2.75rem] font-bold leading-none tracking-[-0.045em] lg:text-[4rem]', total !== 100 && 'text-accent')}>{total}</b>
            <span className="text-[1.25rem] font-semibold text-ink-2 lg:text-[1.5rem]">из 100 %</span>
          </p>
          <div className="mt-3 grid gap-1.5 text-[0.9375rem] font-semibold leading-snug lg:text-[1rem]">
            <p className={cn('m-0 flex items-center gap-2', total === 100 ? 'text-ok-ink' : 'text-accent')}>
              <Mark ok={total === 100} />
              {total === 100 ? 'Разлито ровно 100 %' : total > 100 ? `Перелили ${pct(total - 100)}` : `Не разлито ${pct(100 - total)}`}
            </p>
            <p className={cn('m-0 flex items-center gap-2', socialOk ? 'text-ok-ink' : 'text-accent')}>
              <Mark ok={socialOk} />
              Социальная сфера {pct(plan.social)} {socialOk ? '— приоритет соблюдён' : `— нужно от ${pct(SOCIAL_MIN)}`}
            </p>
          </div>
        </div>
      }
    >
      <div className="mgb-card px-4 pb-5 pt-6 lg:px-10 lg:pb-8 lg:pt-10">
        <div className="mgb-vessels">
          {PARTS.map((part) => (
            <Fragment key={part.key}>
              <Vessel
                label={part.label}
                color={part.color}
                value={plan[part.key]}
                mark={part.key === 'social' ? SOCIAL_MIN : undefined}
                onChange={(value) => setPlan((current) => ({ ...current, [part.key]: value }))}
              />
            </Fragment>
          ))}
        </div>
      </div>

      <BottomAction
        label={total === 100 ? 'Утвердить план' : 'Нужно ровно 100 %'}
        disabled={total !== 100}
        onClick={() => setOutcome(finish(props, socialOk))}
      />
    </GamePage>
  );
}
