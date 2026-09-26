import { useState } from 'react';
import { DEDUCTION_LIMIT, NDFL_RATE, formatRub } from '../../lib/deduction';
import { BottomAction, Mark } from '../../ui/Flow';
import RangeField from '../../ui/RangeField';
import { GamePage, GameResult, Task, finish, type GameProps, type Outcome } from './GameKit';

const TARGET = 100_000;

export default function FiscalExpert(props: GameProps) {
  const [spent, setSpent] = useState(85_000);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const accepted = Math.min(spent, DEDUCTION_LIMIT);
  const refund = Math.round(accepted * NDFL_RATE);
  const enough = spent >= TARGET;

  if (outcome) {
    return (
      <GameResult
        {...props}
        outcome={outcome}
        title="Расходы заявлены"
        message={`Заявлено ${formatRub(spent)}, к вычету примут ${formatRub(accepted)}. Вернуть можно до ${formatRub(refund)}, если за год уплачено не меньше НДФЛ.`}
        onRetry={() => setOutcome(null)}
        retryLabel="Изменить сумму"
      />
    );
  }

  return (
    <GamePage item={props.item} onClose={props.onClose}>
      <Task note="Для вычета нужны договор, чеки и справка об оплате. Итог определяет ФНС.">
        Укажите расходы на обучение и спорт за год. Для задания нужно заявить от {formatRub(TARGET)}.
      </Task>

      <section className="mgb-card px-5 py-[1.125rem]" aria-label="Расходы за год">
        <RangeField
          label="Обучение и спорт за год"
          min={0}
          max={250_000}
          step={5_000}
          value={spent}
          valueText={formatRub(spent)}
          onChange={setSpent}
        />
        <p aria-live="polite" className={`m-0 mt-1 flex items-center gap-2 text-[0.875rem] font-semibold ${enough ? 'text-ok-ink' : 'text-accent'}`}>
          <Mark ok={enough} />
          {enough ? 'Сумма подходит для задания' : `Не хватает ${formatRub(TARGET - spent)}`}
        </p>
        <div className="mt-3 grid grid-cols-2 border-t border-line pt-3">
          <div>
            <span className="block text-[0.8125rem] text-ink-3">Примут к вычету</span>
            <b className="text-[1.125rem] font-semibold tracking-[-0.01em]">{formatRub(accepted)}</b>
          </div>
          <div className="border-l border-line pl-4">
            <span className="block text-[0.8125rem] text-ink-3">Можно вернуть</span>
            <b className="text-[1.125rem] font-semibold tracking-[-0.01em] text-accent">{formatRub(refund)}</b>
          </div>
        </div>
        {spent > DEDUCTION_LIMIT && (
          <p className="m-0 mt-2 text-[0.8125rem] leading-snug text-ink-3">
            Всё, что больше {formatRub(DEDUCTION_LIMIT)}, налог не уменьшает.
          </p>
        )}
      </section>

      <BottomAction label={enough ? 'Заявить расходы' : `Нужно от ${formatRub(TARGET)}`} disabled={!enough} onClick={() => setOutcome(finish(props, true))} />
    </GamePage>
  );
}
