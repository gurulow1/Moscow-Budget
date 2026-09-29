import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { DEDUCTION_LIMIT, NDFL_RATE, formatRub } from '../../lib/deduction';
import { cn } from '../../lib/utils';
import { BottomAction, Mark } from '../../ui/Flow';
import { GamePage, GameResult, finish, type GameProps, type Outcome } from './GameKit';
import './games.css';

const TARGET = 100_000;
const MAX = 250_000;
const STEP = 5_000;
const CELLS = 6;

// A sum written into boxes, one digit each, like on a paper form; a digit that changes flashes.
function Digits({ value, accent, label }: { value: number; accent?: boolean; label: string }) {
  const text = String(value);
  const pad = CELLS - text.length;
  return (
    <span className="flex items-center gap-2">
      <span className={cn('mgb-digits', accent && 'is-accent')} role="img" aria-label={`${label}: ${formatRub(value)}`}>
        {Array.from({ length: CELLS }, (_, i) => {
          const ch = i < pad ? '' : text[i - pad];
          return (
            <span key={`${i}-${ch}`} className={cn(!ch && 'is-blank', ch && 'is-hot')}>
              {ch || '0'}
            </span>
          );
        })}
      </span>
      <span className="font-mono text-[1.125rem] font-bold text-[#1C2A6B]">₽</span>
    </span>
  );
}

export default function FiscalExpert(props: GameProps) {
  const [spent, setSpent] = useState(85_000);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const accepted = Math.min(spent, DEDUCTION_LIMIT);
  const refund = Math.round(accepted * NDFL_RATE);
  const enough = spent >= TARGET;
  const set = (value: number) => setSpent(Math.min(MAX, Math.max(0, value)));

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
    <GamePage
      item={props.item}
      onClose={props.onClose}
      headline="Заполните черновик декларации"
      task={`Впишите расходы на обучение и спорт за год. Для задания нужно заявить от ${formatRub(TARGET)}.`}
      note="Для вычета нужна справка об оплате от вуза или спортклуба: с 2024 года договор и чеки не требуются. Итог определяет ФНС."
      side={
        <p aria-live="polite" className={cn('m-0 flex items-center gap-2 text-[1rem] font-semibold lg:text-[1.125rem]', enough ? 'text-ok-ink' : 'text-accent')}>
          <Mark ok={enough} />
          {enough ? 'Сумма подходит для задания' : `Не хватает ${formatRub(TARGET - spent)}`}
        </p>
      }
    >
      <section className="mgb-paper px-5 pb-6 pt-5 lg:px-9 lg:pb-9 lg:pt-8" aria-label="Черновик декларации">
        <div className="flex justify-between gap-3">
          <p className="mgb-paper-head m-0">Учебный черновик · 3-НДФЛ</p>
          <p className="mgb-paper-head m-0">стр. 001</p>
        </div>
        <h3 className="m-0 mt-2 text-[1.25rem] font-bold leading-tight tracking-[-0.02em] lg:text-[1.625rem]">Социальные налоговые вычеты</h3>
        <div className="mgb-paper-rule mt-4 grid gap-4 pt-4 lg:mt-6 lg:gap-6 lg:pt-6">
          <div className="mgb-form-row">
            <span className="flex justify-between gap-3">
              <span className="fr-label">Расходы на обучение и спорт за год</span>
              <span className="fr-code">010</span>
            </span>
            <Digits value={spent} label="Расходы" />
          </div>
          <div className="mgb-form-row">
            <span className="flex justify-between gap-3">
              <span className="fr-label">Принимается к вычету, не больше {formatRub(DEDUCTION_LIMIT)}</span>
              <span className="fr-code">020</span>
            </span>
            <Digits value={accepted} label="Принимается к вычету" />
          </div>
          <div className="mgb-form-row">
            <span className="flex justify-between gap-3">
              <span className="fr-label">Налог к возврату, 13 % при доходе до 2,4 млн ₽</span>
              <span className="fr-code">030</span>
            </span>
            <Digits value={refund} accent label="Налог к возврату" />
          </div>
        </div>
        <p className="m-0 mt-5 font-mono text-[0.75rem] text-[#6D7280] lg:mt-7">
          Подпись <span className="inline-block w-28 border-b border-[#9EA3AE] align-baseline" /> Дата{' '}
          <span className="inline-block w-16 border-b border-[#9EA3AE] align-baseline" />
        </p>
      </section>

      <div className="mt-4 flex items-center gap-3 lg:mt-6">
        <button type="button" aria-label="Меньше на 5 000 ₽" onClick={() => set(spent - STEP)} className="mgb-glass grid size-11 shrink-0 place-items-center rounded-full text-ink">
          <Minus size={18} strokeWidth={2.4} aria-hidden="true" />
        </button>
        <div className="relative h-11 flex-1">
          <div aria-hidden="true" className="absolute inset-x-0 top-[1.1875rem] h-1.5 rounded-full bg-track" />
          <div
            aria-hidden="true"
            className="absolute left-0 top-[1.1875rem] h-1.5 rounded-full bg-c1"
            style={{ width: `calc(0.875rem + (100% - 1.75rem) * ${spent / MAX})` }}
          />
          <span
            aria-hidden="true"
            className="absolute top-3 h-5 w-0.5 rounded bg-ok-ink"
            style={{ left: `calc(0.875rem + (100% - 1.75rem) * ${TARGET / MAX})` }}
          />
          <input
            type="range"
            min={0}
            max={MAX}
            step={STEP}
            value={spent}
            aria-label="Расходы на обучение и спорт за год"
            aria-valuetext={formatRub(spent)}
            onChange={(event) => set(Number(event.target.value))}
            className="mgb-range absolute inset-0 m-0 h-11 w-full"
          />
        </div>
        <button type="button" aria-label="Больше на 5 000 ₽" onClick={() => set(spent + STEP)} className="mgb-glass grid size-11 shrink-0 place-items-center rounded-full text-ink">
          <Plus size={18} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>

      <BottomAction label={enough ? 'Заявить расходы' : `Нужно от ${formatRub(TARGET)}`} disabled={!enough} onClick={() => setOutcome(finish(props, true))} />
    </GamePage>
  );
}
