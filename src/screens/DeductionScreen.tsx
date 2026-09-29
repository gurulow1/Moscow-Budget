import { useId, useState, type CSSProperties } from 'react';
import { Banknote, Check, FileText, Smartphone, type LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  AMOUNT_STEP,
  DEDUCTION_LIMIT,
  EDUCATION_MAX,
  NDFL_RATE,
  PERSONAS,
  SPORT_MAX,
  calcDeduction,
  formatRub,
  type TaxCalculation,
} from '../lib/deduction';
import { getBudgetSource } from '../data/budgetFacts';
import Receipt from '../ui/exhibits/Receipt';
import RollingNumber from '../ui/exhibits/RollingNumber';

interface DeductionScreenProps {
  savedCalculation: TaxCalculation | null;
  isCompleted: boolean;
  onSave: (calculation: TaxCalculation) => void;
  tourPersonaClass?: string;
  tourCalculatorClass?: string;
}

const NB = ' ';
const EDU = 'var(--mgb-c2)';
const SPORT = 'var(--mgb-c4)';

// How it works since 2024: one certificate instead of the contract and receipts, and the simplified way
// where the tax office itself puts a ready application into the personal account.
const STEPS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: FileText,
    title: 'Возьмите справку об оплате',
    text: 'Её выдают вуз, школа или спортклуб. С 2024 года договор и чеки не нужны.',
  },
  {
    icon: Smartphone,
    title: 'Подтвердите заявление',
    text: 'Если организация передала сведения в налоговую, готовое заявление придёт в личный кабинет на nalog.gov.ru. Если нет — подайте декларацию 3-НДФЛ.',
  },
  {
    icon: Banknote,
    title: 'Получите деньги на счёт',
    text: 'Налог вернут после проверки. Заявить можно в течение трёх лет после года, когда были расходы.',
  },
];

interface AmountFieldProps {
  label: string;
  value: number;
  max: number;
  color: string;
  onChange: (value: number) => void;
  divided?: boolean;
}

// A slider for the thumb and an editable figure for an exact sum; both stay in 0…max.
function AmountField({ label, value, max, color, onChange, divided }: AmountFieldProps) {
  const id = useId();
  const fill = value / max;
  return (
    <div className={cn('grid gap-1', divided && 'mt-3 lg:mt-4')}>
      <div className="flex items-baseline justify-between gap-2.5">
        <label htmlFor={`${id}-range`} className="flex items-center gap-2 text-[0.9375rem] text-ink-2 lg:text-[1.0625rem]">
          <span aria-hidden="true" className="size-2.5 rounded-[3px]" style={{ background: color }} />
          {label}
        </label>
        <span className="flex items-baseline gap-1 text-[1.25rem] font-semibold tracking-[-0.01em] lg:text-[1.625rem]">
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
          className="absolute left-0 top-[1.1875rem] h-1.5 rounded-full"
          style={{ background: color, width: `calc(0.875rem + (100% - 1.75rem) * ${fill})` }}
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

const SEGMENTS = DEDUCTION_LIMIT / AMOUNT_STEP;

// The yearly limit as a level meter: 30 segments of 5 000 ₽. Study fills first, then sport; what does not fit
// is named under the meter.
function LimitMeter({ education, sport }: { education: number; sport: number }) {
  const total = education + sport;
  const eduSeg = Math.min(SEGMENTS, Math.round(education / AMOUNT_STEP));
  const sportSeg = Math.min(SEGMENTS - eduSeg, Math.round(sport / AMOUNT_STEP));
  const over = Math.max(0, total - DEDUCTION_LIMIT);
  const counted = Math.min(total, DEDUCTION_LIMIT);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="m-0 text-[0.9375rem] font-semibold lg:text-[1.0625rem]">Лимит на год</p>
        <p className="m-0 text-[0.875rem] text-ink-2 lg:text-[1rem]">
          <b className="font-semibold text-ink">{counted.toLocaleString('ru-RU')}</b> из {formatRub(DEDUCTION_LIMIT)}
        </p>
      </div>
      <div
        role="img"
        aria-label={`Учтено ${formatRub(counted)} из лимита ${formatRub(DEDUCTION_LIMIT)}${over ? `, сверх лимита ${formatRub(over)}` : ''}.`}
        className="mgb-meter mt-3"
        data-full={over > 0 ? '' : undefined}
      >
        {Array.from({ length: SEGMENTS }, (_, i) => {
          const kind = i < eduSeg ? 'edu' : i < eduSeg + sportSeg ? 'sport' : null;
          return (
            <span
              key={i}
              data-on={kind ?? undefined}
              style={{ '--c': kind === 'edu' ? EDU : kind === 'sport' ? SPORT : undefined, '--i': i } as CSSProperties}
            />
          );
        })}
      </div>
      <p
        className={cn(
          'm-0 mt-2.5 min-h-[1.25rem] text-[0.8125rem] leading-snug lg:text-[0.9375rem]',
          over ? 'font-semibold text-accent' : 'text-ink-3',
        )}
      >
        {over
          ? `Сверх лимита ${formatRub(over)} — с них налог не вернут`
          : `Каждое деление — ${formatRub(AMOUNT_STEP)}. Свободно ещё ${formatRub(DEDUCTION_LIMIT - counted)}`}
      </p>
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
  const counted = Math.min(education + sport, DEDUCTION_LIMIT);
  const isSaved = Boolean(
    savedCalculation && savedCalculation.education === education && savedCalculation.sport === sport,
  );
  const fns = getBudgetSource('fnsSocialDeduction');
  const rate = `${Math.round(NDFL_RATE * 100)}${NB}%`;

  return (
    <div>
      <div id="tour-persona" className={cn('transition-opacity duration-200', tourPersonaClass)}>
        <div role="group" aria-label="Пример пользователя" className="mgb-scroll-x mt-4 flex gap-2 px-4 lg:mt-7 lg:gap-2.5 lg:px-0">
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
                  'h-11 shrink-0 whitespace-nowrap rounded-full px-4 text-[0.875rem] font-semibold transition-colors duration-200 lg:h-12 lg:px-5 lg:text-[1rem]',
                  isOn ? 'bg-card text-ink shadow-[var(--mgb-seg-shadow)]' : 'bg-track text-ink-2',
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <p className="m-0 mt-2 min-h-[1.25rem] px-5 text-[0.8125rem] leading-snug text-ink-2 lg:mt-3 lg:px-1 lg:text-[1rem]">
          {persona ? persona.note : 'Свои суммы: пример пользователя не выбран.'}
        </p>
      </div>

      <div
        id="tour-calculator"
        className={cn('grid gap-3 px-4 pt-3 transition-opacity duration-200 xl:grid-cols-12 lg:gap-5 lg:px-0 lg:pt-5', tourCalculatorClass)}
      >
        <div className="mgb-card px-5 py-[1.125rem] xl:col-span-7 lg:px-8 lg:py-8">
          <LimitMeter education={education} sport={sport} />
          <div className="mt-5 border-t border-line pt-4 lg:mt-7 lg:pt-6">
            <AmountField label="Обучение" value={education} max={EDUCATION_MAX} color={EDU} onChange={setEducation} />
            <AmountField label="Спорт и фитнес" value={sport} max={SPORT_MAX} color={SPORT} onChange={setSport} divided />
          </div>
        </div>

        {/* The result is the receipt itself: it prints once and reprints every figure that changes. */}
        <section aria-label="Результат расчёта" className="flex flex-col items-center gap-3 xl:col-span-5 xl:row-span-2 lg:gap-4">
          <Receipt
            size="lg"
            className="-mb-4"
            title="НАЛОГОВЫЙ ВЫЧЕТ"
            sub={persona ? `пример · ${persona.label.toLowerCase()}` : 'ваши суммы'}
            lines={[
              { label: 'Учёба', value: formatRub(education) },
              { label: 'Спорт', value: formatRub(sport) },
              'hr',
              { label: 'Лимит за год', value: formatRub(DEDUCTION_LIMIT) },
              { label: 'Учтено', value: formatRub(counted) },
              { label: 'Ставка НДФЛ', value: rate },
            ]}
            totalLabel="ВЕРНУТ"
            total={
              <>
                <RollingNumber value={deduction} />
                {NB}₽
              </>
            }
            foot="УЧЕБНЫЙ РАСЧЁТ · ИТОГ ОПРЕДЕЛИТ ФНС"
            label={`Чек: учёба ${formatRub(education)}, спорт ${formatRub(sport)}, учтено ${formatRub(counted)} из лимита ${formatRub(DEDUCTION_LIMIT)}, ставка ${rate}. Вернут ${formatRub(deduction)}.`}
          />
          <p aria-live="polite" className="sr-only">
            Можно вернуть {formatRub(deduction)}
          </p>

          {isSaved ? (
            <p className="m-0 flex h-14 w-full max-w-[26rem] items-center justify-center gap-2 rounded-full bg-ok-soft text-[1rem] font-semibold text-ok-ink lg:text-[1.0625rem]">
              <Check size={18} strokeWidth={2.6} aria-hidden="true" />
              Расчёт сохранён
            </p>
          ) : (
            <button
              type="button"
              onClick={() => onSave({ education, sport, deduction })}
              className="mgb-cta h-14 w-full max-w-[26rem] rounded-full text-[1rem] font-semibold lg:text-[1.0625rem]"
            >
              {isCompleted ? 'Сохранить изменения' : 'Сохранить расчёт · +100 баллов'}
            </button>
          )}

          <p className="m-0 max-w-[26rem] px-2 text-[0.8125rem] leading-relaxed text-ink-2 lg:text-[0.9375rem]">
            Ставка 13{NB}% — при доходе до 2,4{NB}млн{NB}₽ в год, с большего дохода вернут больше. Обучение ребёнка — отдельный
            лимит 110{NB}000{NB}₽. Возврат не больше уплаченного НДФЛ.{' '}
            <a href={fns.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-ink underline underline-offset-2">
              Условия на сайте ФНС
            </a>
          </p>
        </section>

        <section className="mgb-card px-5 py-5 xl:col-span-7 lg:px-8 lg:py-7" aria-labelledby="deduction-steps-title">
          <h2 id="deduction-steps-title" className="m-0 text-[1.125rem] font-semibold leading-snug tracking-[-0.01em] lg:text-[1.25rem]">
            Как получить вычет
          </h2>
          <ol className="mgb-steps m-0 mt-4 grid list-none gap-4 p-0 md:grid-cols-3 md:gap-5 lg:mt-5">
            {STEPS.map((step, i) => (
              <li key={step.title} className="relative grid content-start gap-2 md:gap-3">
                <span className="flex items-center gap-3">
                  <span aria-hidden="true" className="mgb-step-icon grid size-11 shrink-0 place-items-center rounded-[0.875rem] lg:size-12">
                    <step.icon size={22} strokeWidth={1.8} />
                  </span>
                  <span aria-hidden="true" className="font-mono text-[0.8125rem] font-semibold tracking-[0.08em] text-ink-3">
                    0{i + 1}
                  </span>
                </span>
                <span className="grid gap-1">
                  <span className="text-[1rem] font-semibold leading-snug">{step.title}</span>
                  <span className="text-[0.875rem] leading-snug text-ink-2 lg:text-[0.9375rem]">{step.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
