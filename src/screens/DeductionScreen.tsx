import { useId, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  AMOUNT_STEP,
  DEDUCTION_LIMIT,
  EDUCATION_MAX,
  PERSONAS,
  SPORT_MAX,
  calcDeduction,
  formatRub,
  type TaxCalculation,
} from '../lib/deduction';
import { getBudgetSource } from '../data/budgetFacts';

interface DeductionScreenProps {
  savedCalculation: TaxCalculation | null;
  isCompleted: boolean;
  onSave: (calculation: TaxCalculation) => void;
  tourPersonaClass?: string;
  tourCalculatorClass?: string;
}

interface AmountFieldProps {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
  divided?: boolean;
}

// A slider for the thumb and an editable figure for an exact sum; both stay in 0…max.
function AmountField({ label, value, max, onChange, divided }: AmountFieldProps) {
  const id = useId();
  const fill = value / max;
  return (
    <div className={cn('grid gap-1.5', divided && 'mt-4 border-t border-line pt-4')}>
      <div className="flex items-baseline justify-between gap-2.5">
        <label htmlFor={`${id}-range`} className="text-[0.9375rem] text-ink-2">
          {label}
        </label>
        <span className="flex items-baseline gap-1 text-[1.25rem] font-semibold tracking-[-0.01em]">
          <input
            aria-label={`${label}, сумма в рублях`}
            inputMode="numeric"
            value={value.toLocaleString('ru-RU')}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, '');
              onChange(Math.min(Number(digits || 0), max));
            }}
            className="w-[5.75em] rounded-lg bg-transparent p-0 text-right font-semibold text-ink outline-none"
          />
          ₽
        </span>
      </div>
      <div className="relative h-11">
        <div aria-hidden="true" className="absolute inset-x-0 top-[1.1875rem] h-1.5 rounded-full bg-track" />
        <div
          aria-hidden="true"
          className="absolute left-0 top-[1.1875rem] h-1.5 rounded-full bg-c1"
          style={{ width: `calc(0.875rem + (100% - 1.75rem) * ${fill})` }}
        />
        <input
          id={`${id}-range`}
          type="range"
          min={0}
          max={max}
          step={AMOUNT_STEP}
          value={value}
          aria-valuetext={formatRub(value)}
          onChange={(event) => onChange(Number(event.target.value))}
          className="mgb-range absolute inset-0 m-0 h-11 w-full"
        />
      </div>
    </div>
  );
}

export default function DeductionScreen({
  savedCalculation,
  isCompleted,
  onSave,
  tourPersonaClass,
  tourCalculatorClass,
}: DeductionScreenProps) {
  const [education, setEducation] = useState(savedCalculation?.education ?? PERSONAS[0].education);
  const [sport, setSport] = useState(savedCalculation?.sport ?? PERSONAS[0].sport);

  const persona = PERSONAS.find((item) => item.education === education && item.sport === sport) ?? null;
  const deduction = calcDeduction(education, sport);
  const base = Math.min(education + sport, DEDUCTION_LIMIT);
  const isSaved = Boolean(
    savedCalculation && savedCalculation.education === education && savedCalculation.sport === sport,
  );
  const fns = getBudgetSource('fnsSocialDeduction');

  return (
    <div>
      <div id="tour-persona" className={cn('transition-opacity duration-200', tourPersonaClass)}>
        <div role="group" aria-label="Пример пользователя" className="mgb-scroll-x mt-4 flex gap-2 px-4">
          {PERSONAS.map((item) => {
            const isOn = persona?.id === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={isOn}
                onClick={() => {
                  setEducation(item.education);
                  setSport(item.sport);
                }}
                className={cn(
                  'h-11 shrink-0 whitespace-nowrap rounded-full px-4 text-[0.875rem] font-semibold transition-colors duration-200',
                  isOn ? 'bg-card text-ink shadow-[var(--mgb-seg-shadow)]' : 'bg-track text-ink-2',
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <p className="m-0 mt-2 min-h-[1.25rem] px-5 text-[0.8125rem] leading-snug text-ink-2">
          {persona ? persona.note : 'Свои суммы: пример пользователя не выбран.'}
        </p>
      </div>

      <div
        id="tour-calculator"
        className={cn('grid gap-3 px-4 pt-3 transition-opacity duration-200 lg:grid-cols-2 lg:items-start', tourCalculatorClass)}
      >
        <div className="mgb-card px-5 py-[1.125rem] lg:row-span-3">
          <AmountField label="Обучение" value={education} max={EDUCATION_MAX} onChange={setEducation} />
          <AmountField label="Спорт и фитнес" value={sport} max={SPORT_MAX} onChange={setSport} divided />
        </div>

        <section aria-label="Результат расчёта" className="mgb-card border-transparent bg-accent-soft px-5 py-[1.125rem] shadow-none">
          <p className="m-0 text-[0.875rem] text-ink-2">Можно вернуть</p>
          <p className="m-0 mt-0.5 text-[3.5rem] font-bold leading-[1.05] tracking-[-0.035em] text-accent">{formatRub(deduction)}</p>
          <div className="mt-3 grid gap-2 text-[0.875rem] leading-normal text-ink-2">
            <span aria-hidden="true" className="block h-1.5 overflow-hidden rounded-full bg-[rgba(128,128,128,0.18)]">
              <span
                className="block h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
                style={{ width: `${(base / DEDUCTION_LIMIT) * 100}%` }}
              />
            </span>
            <span>
              {education + sport >= DEDUCTION_LIMIT
                ? `Лимит ${formatRub(DEDUCTION_LIMIT)} исчерпан`
                : `${formatRub(base)} из ${formatRub(DEDUCTION_LIMIT)} лимита`}
            </span>
          </div>
          <p className="m-0 mt-3 text-[0.8125rem] leading-snug text-ink-2">Учебный расчёт. Итог определяет ФНС.</p>
        </section>

        {isSaved ? (
          <p className="m-0 flex h-14 items-center justify-center gap-2 rounded-full bg-ok-soft text-[1rem] font-semibold text-ok-ink">
            <Check size={18} strokeWidth={2.6} aria-hidden="true" />
            Расчёт сохранён
          </p>
        ) : (
          <button
            type="button"
            onClick={() => onSave({ education, sport, deduction })}
            className="h-14 rounded-full bg-accent-fill text-[1rem] font-semibold text-white shadow-[0_12px_24px_-16px_var(--mgb-accent)]"
          >
            {isCompleted ? 'Сохранить изменения' : 'Сохранить расчёт · +100 баллов'}
          </button>
        )}

        <p className="m-0 px-2 text-[0.8125rem] leading-relaxed text-ink-2">
          Общий лимит для большинства социальных вычетов — 150 000 ₽ в год, обучение ребёнка считается отдельно,
          до 110 000 ₽. Возврат зависит от дохода и уплаченного НДФЛ.{' '}
          <a href={fns.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-ink underline underline-offset-2">
            Условия на сайте ФНС
          </a>
        </p>
      </div>
    </div>
  );
}
