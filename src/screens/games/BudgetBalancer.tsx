import { Fragment, useState } from 'react';
import { BUDGET_FACTS } from '../../data/budgetFacts';
import { cn } from '../../lib/utils';
import { BottomAction, Mark } from '../../ui/Flow';
import RangeField from '../../ui/RangeField';
import { GamePage, GameResult, Task, finish, type GameProps, type Outcome } from './GameKit';

const SOCIAL_MIN = 50;

const PARTS = [
  { key: 'industry', label: 'Промышленность', color: 'var(--mgb-c4)' },
  { key: 'social', label: 'Социальная сфера', color: 'var(--mgb-c3)' },
  { key: 'transport', label: 'Транспорт', color: 'var(--mgb-c1)' },
] as const;

type Plan = Record<(typeof PARTS)[number]['key'], number>;

const START: Plan = { industry: 25, social: 45, transport: 30 };
const pct = (value: number) => `${value}\u00A0%`;

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
        <section className="mgb-card px-5 py-[1.125rem]" aria-label="Как в жизни">
          <p className="m-0 text-[0.875rem] text-ink-2">Как в бюджете Москвы</p>
          <p className="m-0 mt-1 text-[0.9375rem] leading-[1.45] [text-wrap:pretty]">
            На социальную сферу в широком смысле в 2026 году предусмотрено около 3,2{'\u00A0'}трлн{'\u00A0'}₽ — примерно {socialShare}
            {'\u00A0'}% всех расходов.
          </p>
        </section>
      </GameResult>
    );
  }

  return (
    <GamePage item={props.item} onClose={props.onClose}>
      <Task>
        Разделите {pct(100)} условного бюджета между тремя направлениями. Социальная сфера должна получить не меньше {pct(SOCIAL_MIN)}.
      </Task>

      <section className="mgb-card px-5 py-[1.125rem]" aria-label="Распределение">
        <p className="m-0 flex items-baseline gap-1.5">
          <b className={cn('text-[2.5rem] font-bold leading-[1.05] tracking-[-0.035em]', total !== 100 && 'text-accent')}>{total}</b>
          <span className="text-[1.25rem] font-semibold leading-tight text-ink-2">из 100 %</span>
        </p>
        <div aria-hidden="true" className="relative mt-3.5 flex h-3 gap-[3px] overflow-hidden rounded-md bg-track">
          {PARTS.map((part) => (
            <span key={part.key} style={{ flex: `${plan[part.key]} 1 0`, background: part.color }} />
          ))}
          {total < 100 && <span className="bg-track" style={{ flex: `${100 - total} 1 0` }} />}
        </div>
        <div aria-live="polite" className="mt-2.5 grid gap-1 text-[0.875rem] font-semibold leading-snug">
          <p className={cn('m-0 flex items-center gap-2', total === 100 ? 'text-ok-ink' : 'text-accent')}>
            <Mark ok={total === 100} />
            {total === 100 ? 'Ровно 100 %' : total > 100 ? `Лишние ${pct(total - 100)}` : `Не распределено ${pct(100 - total)}`}
          </p>
          <p className={cn('m-0 flex items-center gap-2', socialOk ? 'text-ok-ink' : 'text-accent')}>
            <Mark ok={socialOk} />
            Социальная сфера {pct(plan.social)} {socialOk ? '— приоритет соблюдён' : `— нужно от ${pct(SOCIAL_MIN)}`}
          </p>
        </div>
        <div className="mt-3 grid gap-1 border-t border-line pt-3">
          {PARTS.map((part) => (
            <Fragment key={part.key}>
              <RangeField
                label={part.label}
                color={part.color}
                min={0}
                max={100}
                step={5}
                value={plan[part.key]}
                valueText={pct(plan[part.key])}
                onChange={(value) => setPlan((current) => ({ ...current, [part.key]: value }))}
              />
            </Fragment>
          ))}
        </div>
      </section>

      <BottomAction
        label={total === 100 ? 'Утвердить план' : 'Нужно ровно 100 %'}
        disabled={total !== 100}
        onClick={() => setOutcome(finish(props, socialOk))}
      />
    </GamePage>
  );
}
