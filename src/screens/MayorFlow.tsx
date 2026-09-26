import { Fragment, useEffect, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { cn } from '../lib/utils';
import { MAYOR_DISTRICTS, addDistrictBadge, readDistrictBadges, routeSteps, type MayorDistrict } from '../data/quests';
import {
  TARGET_DEFICIT,
  TARGET_INDEX,
  forecast,
  meetingEvent,
  outcome,
  passes,
  type Allocation,
  type MeetingOption,
  type Outcome,
} from '../lib/mayor';
import RangeField from '../ui/RangeField';
import { BottomAction, Divider, FlowPage, FlowTop, ListRow, Mark, PrimaryButton, SecondaryButton } from '../ui/Flow';

interface MayorFlowProps {
  initialDistrictId?: string | null;
  calculatorDone: boolean;
  completedActivities: string[];
  onComplete: (id: string, points: number) => boolean;
  onClose: () => void;
  onToQuests: () => void;
}

interface Decision {
  option: MeetingOption;
  result: Outcome;
  win: boolean;
  awarded: boolean;
}

export const MAYOR_REWARD = 150;

const mln = (value: number) => `${value}\u00A0млн\u00A0₽`;
const pct = (value: number) => `${value}\u00A0%`;
const signed = (value: number) => `${value > 0 ? '+' : '−'}${Math.abs(value)}`;

// The three spheres in the app's order; each keeps its color from «Данные».
const SPHERES: { key: keyof Allocation; label: string; color: string; weight: keyof MayorDistrict['preferenceMultiplier'] }[] = [
  { key: 'education', label: 'Образование', color: 'var(--mgb-c2)', weight: 'education' },
  { key: 'transport', label: 'Транспорт', color: 'var(--mgb-c1)', weight: 'transport' },
  { key: 'healthcare', label: 'Здоровье и спорт', color: 'var(--mgb-c4)', weight: 'healthcare' },
];

function Stats({ comfort, efficiency, deficitPct }: Outcome) {
  const cols = [
    { label: 'Комфорт', value: comfort, ok: comfort >= TARGET_INDEX, note: `цель ≥\u00A0${TARGET_INDEX}\u00A0%`, grow: 1 },
    { label: 'Эффективность', value: efficiency, ok: efficiency >= TARGET_INDEX, note: `цель ≥\u00A0${TARGET_INDEX}\u00A0%`, grow: 1.35 },
    { label: 'Дефицит', value: deficitPct, ok: deficitPct <= TARGET_DEFICIT, note: `цель ≤\u00A0${TARGET_DEFICIT}\u00A0%`, grow: 1 },
  ];
  return (
    <dl className="m-0 mt-3 flex border-t border-line pt-3">
      {cols.map((col, i) => (
        <div key={col.label} className={cn('grid min-w-0 gap-0.5', i > 0 && 'border-l border-line pl-3')} style={{ flex: `${col.grow} 1 0` }}>
          <dt className="whitespace-nowrap text-[0.8125rem] leading-snug text-ink-2">{col.label}</dt>
          <dd className="m-0 flex items-center gap-1.5">
            <b className={cn('whitespace-nowrap text-[1.5rem] font-bold leading-tight tracking-[-0.02em]', col.ok ? 'text-ink' : 'text-accent')}>
              {pct(col.value)}
            </b>
            <Mark ok={col.ok} />
            <span className="sr-only">{col.ok ? 'в цели' : 'вне цели'}</span>
          </dd>
          <dd className="m-0 whitespace-nowrap text-[0.75rem] leading-snug text-ink-2">{col.note}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function MayorFlow({
  initialDistrictId,
  calculatorDone,
  completedActivities,
  onComplete,
  onClose,
  onToQuests,
}: MayorFlowProps) {
  const [districtIndex, setDistrictIndex] = useState(() =>
    Math.max(0, MAYOR_DISTRICTS.findIndex((item) => item.id === initialDistrictId)),
  );
  const [plan, setPlan] = useState<Allocation>({ education: 35, transport: 35, healthcare: 40 });
  const [step, setStep] = useState<'plan' | 'meeting' | 'result'>('plan');
  const [choice, setChoice] = useState<number | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const district = MAYOR_DISTRICTS[districtIndex];
  const f = forecast(district, plan);
  const event = meetingEvent(district, f);
  const budget = district.budget;

  useEffect(() => {
    window.scrollTo({ top: 0 });
    if (step !== 'plan') titleRef.current?.focus({ preventScroll: true });
  }, [step]);

  // A district opened from the map may sit past the edge of the chip row.
  const chipsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = chipsRef.current;
    const chip = row?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (row && chip) row.scrollLeft = chip.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2;
  }, [districtIndex, step]);

  const toPlan = () => {
    setStep('plan');
    setChoice(null);
  };

  const confirm = () => {
    if (choice === null) return;
    const option = event.options[choice];
    const result = outcome(f, option);
    const win = passes(result);
    const awarded = win ? onComplete(`mayor-success-${district.id}`, MAYOR_REWARD) : false;
    if (win) addDistrictBadge(district.id);
    setDecision({ option, result, win, awarded });
    setStep('result');
  };

  if (step === 'result' && decision) {
    const { option, result, win, awarded } = decision;
    const misses = [
      result.comfort < TARGET_INDEX && `комфорт ${pct(result.comfort)} при цели от\u00A0${TARGET_INDEX}\u00A0%`,
      result.efficiency < TARGET_INDEX && `эффективность ${pct(result.efficiency)} при цели от\u00A0${TARGET_INDEX}\u00A0%`,
      result.deficitPct > TARGET_DEFICIT && `дефицит ${pct(result.deficitPct)} при допустимых ${TARGET_DEFICIT}\u00A0%`,
    ].filter(Boolean);
    const next = MAYOR_DISTRICTS[(districtIndex + 1) % MAYOR_DISTRICTS.length];
    const steps = routeSteps(calculatorDone, completedActivities);
    const nextStep = steps.find((item) => !item.done);
    return (
      <FlowPage className="pb-[calc(2rem_+_env(safe-area-inset-bottom))]">
        <FlowTop ref={titleRef} icon="close" label="Закрыть игру" onPress={onClose} title="Итог заседания" />
        <div className="mt-[1.125rem] grid gap-3">
          <section className="mgb-card px-5 py-[1.125rem]" aria-label="Решение">
            <p className="m-0 text-[0.875rem] text-ink-2">
              {district.name} · выбор «{option.label}»
            </p>
            <div className="mt-2.5 flex items-center gap-3">
              <Mark ok={win} size={40} />
              <h2 className="m-0 text-[1.75rem] font-bold leading-[1.15] tracking-[-0.025em]">{win ? 'Решение принято' : 'Нужна доработка'}</h2>
            </div>
            <p className="m-0 mt-2.5 text-[0.9375rem] leading-[1.45] text-ink-2 [text-wrap:pretty]">
              {win
                ? `Район ${district.name} получил понятный приоритет «${district.primaryDemand}»${
                    result.deficitPct === 0 ? ', бюджет без дефицита.' : `, дефицит ${pct(result.deficitPct)} в допустимых пределах.`
                  }`
                : `Не хватило: ${misses.join(', ')}. Вернитесь к распределению и попробуйте другой компромисс.`}
            </p>
            <Stats {...result} />
          </section>

          <section className="mgb-card" aria-label="Награды">
            <ListRow
              title="Учебные баллы"
              note={!win ? 'начисляются за принятый сценарий района' : awarded ? 'за первый принятый сценарий района' : 'за этот район уже начислены'}
              right={<b className="shrink-0 text-[1.0625rem] font-bold">{awarded ? `+${MAYOR_REWARD}` : '0'}</b>}
            />
            <Divider />
            <ListRow
              title="Знак района"
              note={win ? `«Инвестор ${district.name}» · виден на карте районов` : 'откроется, когда сценарий примут'}
              right={
                win ? (
                  <b className="shrink-0 whitespace-nowrap text-[1.0625rem] font-bold">
                    {readDistrictBadges().length} из {MAYOR_DISTRICTS.length}
                  </b>
                ) : (
                  <Lock size={16} strokeWidth={2} aria-label="Закрыт" className="shrink-0 text-ink-3" />
                )
              }
            />
            {win && (
              <>
                <Divider />
                <ListRow
                  title="Маршрут"
                  note={nextStep ? `Шаг «Решение» пройден, дальше — «${nextStep.label}»` : 'Все три шага пройдены'}
                  right={
                    <b className="shrink-0 whitespace-nowrap text-[1.0625rem] font-bold">
                      {steps.filter((item) => item.done).length} из {steps.length}
                    </b>
                  }
                />
              </>
            )}
          </section>

          {win ? (
            <>
              <PrimaryButton onClick={onToQuests}>К квестам</PrimaryButton>
              <SecondaryButton
                onClick={() => {
                  setDistrictIndex((districtIndex + 1) % MAYOR_DISTRICTS.length);
                  toPlan();
                }}
              >
                Следующий район: {next.name}
              </SecondaryButton>
            </>
          ) : (
            <>
              <PrimaryButton onClick={toPlan}>Изменить распределение</PrimaryButton>
              <SecondaryButton onClick={onToQuests}>К квестам</SecondaryButton>
            </>
          )}
        </div>
      </FlowPage>
    );
  }

  if (step === 'meeting') {
    return (
      <FlowPage>
        <FlowTop ref={titleRef} icon="back" label="Изменить распределение" onPress={toPlan} title="Заседание" step="шаг 2 из 3" />
        <div className="mt-4 grid gap-3">
          <section className="mgb-card px-5 py-[1.125rem]" aria-labelledby="mayor-event-title">
            <p className="m-0 text-[0.875rem] font-bold text-ink-2">
              {district.name} · {f.total} из {mln(budget)}
            </p>
            <h2 id="mayor-event-title" className="m-0 mt-2 text-[1.5rem] font-bold leading-tight tracking-[-0.02em]">
              {event.title}
            </h2>
            <p className="m-0 mt-2 text-[0.9375rem] leading-[1.45] text-ink-2 [text-wrap:pretty]">{event.body}</p>
            <Stats comfort={f.comfort} efficiency={f.efficiency} deficitPct={f.deficitPct} />
          </section>

          <div role="radiogroup" aria-label="Варианты решения" className="grid gap-2.5">
            {event.options.map((option, i) => {
              const on = choice === i;
              const chips = [
                { text: `комфорт ${signed(option.comfortDelta)}`, good: option.comfortDelta > 0, show: true },
                { text: `эффективность ${signed(option.efficiencyDelta)}`, good: option.efficiencyDelta > 0, show: true },
                // A cut in the deficit only shows while there is a deficit to cut.
                {
                  text: `дефицит ${signed(option.deficitDelta)} п.п.`,
                  good: option.deficitDelta < 0,
                  show: option.deficitDelta > 0 || (option.deficitDelta < 0 && f.deficitPct > 0),
                },
              ].filter((chip) => chip.show);
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setChoice(i)}
                  className={cn(
                    'grid w-full gap-1.5 rounded-3xl border-[1.5px] bg-card px-[1.125rem] py-4 text-left text-ink transition-[border-color,box-shadow] duration-200',
                    on ? 'border-accent shadow-[0_0_0_3px_var(--mgb-accent-soft),var(--mgb-shadow)]' : 'border-line shadow-[var(--mgb-shadow)]',
                  )}
                >
                  <span className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className={cn('grid size-6 shrink-0 place-items-center rounded-full border-2', on ? 'border-accent' : 'border-track')}
                    >
                      <span className={cn('size-2.5 rounded-full bg-accent transition-opacity', on ? 'opacity-100' : 'opacity-0')} />
                    </span>
                    <span className="text-[1.0625rem] font-semibold leading-tight tracking-[-0.01em]">{option.label}</span>
                  </span>
                  <span className="text-[0.875rem] leading-[1.45] text-ink-2 [text-wrap:pretty]">{option.description}</span>
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    {chips.map((chip) => (
                      <span
                        key={chip.text}
                        className={cn(
                          'inline-flex h-7 items-center whitespace-nowrap rounded-full px-2.5 text-[0.8125rem] font-semibold',
                          chip.good ? 'bg-ok-soft text-ok-ink' : 'bg-accent-soft text-accent',
                        )}
                      >
                        {chip.text}
                      </span>
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <BottomAction label={choice === null ? 'Выберите вариант' : 'Зафиксировать решение'} disabled={choice === null} onClick={confirm} />
      </FlowPage>
    );
  }

  // The district's limit as one bar: the three spheres, then the reserve; past the limit the overspend is hatched.
  const scale = Math.max(f.total, budget);
  const status =
    f.total <= budget
      ? { text: f.total === budget ? 'Ровно в лимите' : `В лимите · резерв ${mln(budget - f.total)}`, className: 'text-ok-ink' }
      : {
          text: `Дефицит ${mln(f.deficitMln)} · ${pct(f.deficitPct)}${f.danger ? ` — больше ${TARGET_DEFICIT}\u00A0%` : ' — допустимо'}`,
          className: f.danger ? 'text-accent' : 'text-streak-ink',
        };

  return (
    <FlowPage className="px-0">
      <div className="px-4">
        <FlowTop icon="close" label="Закрыть игру" onPress={onClose} title="Виртуальный мэр" step="шаг 1 из 3" />
      </div>
      <div ref={chipsRef} role="group" aria-label="Район" className="mgb-scroll-x relative mt-3.5 flex gap-2 px-4">
        {MAYOR_DISTRICTS.map((item, i) => {
          const on = i === districtIndex;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={on}
              onClick={() => setDistrictIndex(i)}
              className={cn(
                'h-11 shrink-0 whitespace-nowrap rounded-full px-4 text-[0.875rem] font-semibold transition-colors duration-200',
                on ? 'bg-card text-ink shadow-[var(--mgb-seg-shadow)]' : 'bg-track text-ink-2',
              )}
            >
              {item.name}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 px-4 pt-3">
        <section className="mgb-card px-5 py-[1.125rem]" aria-label="Бюджет района">
          <p className="m-0 text-[0.875rem] text-ink-2">Бюджет района</p>
          <p className="m-0 mt-0.5 flex items-baseline gap-1.5">
            <b className="text-[2.5rem] font-bold leading-[1.05] tracking-[-0.035em]">{f.total}</b>
            <span className="text-[1.25rem] font-semibold leading-tight text-ink-2">из {mln(budget)}</span>
          </p>
          <div aria-hidden="true" className="relative mt-3.5">
            <div className="flex h-3 gap-[3px] overflow-hidden rounded-md">
              {SPHERES.map((sphere) => (
                <span key={sphere.key} style={{ flex: `${plan[sphere.key]} 1 0`, background: sphere.color }} />
              ))}
              {f.total < budget && <span className="bg-track" style={{ flex: `${budget - f.total} 1 0` }} />}
            </div>
            {f.total > budget && (
              <>
                <span
                  className="absolute inset-y-0 right-0 rounded-r-md"
                  style={{
                    left: `${(budget / scale) * 100}%`,
                    background: 'repeating-linear-gradient(-45deg, rgba(255,255,255,.7) 0 3px, transparent 3px 7px)',
                  }}
                />
                <span className="absolute -inset-y-1 -ml-px w-0.5 rounded-sm bg-ink" style={{ left: `${(budget / scale) * 100}%` }} />
              </>
            )}
          </div>
          <p aria-live="polite" className={cn('m-0 mt-2.5 text-[0.875rem] font-semibold leading-snug', status.className)}>
            {status.text}
          </p>
          <Stats comfort={f.comfort} efficiency={f.efficiency} deficitPct={f.deficitPct} />
        </section>

        <section className="mgb-card px-5 py-[1.125rem]" aria-labelledby="mayor-demand">
          <p className="m-0 text-[0.8125rem] leading-snug text-ink-2">Запрос жителей</p>
          <h2 id="mayor-demand" className="m-0 mt-0.5 text-[1rem] font-semibold leading-snug tracking-[-0.01em]">
            {district.primaryDemand}
          </h2>
          <div className="mt-2.5 grid gap-1">
            {SPHERES.map((sphere) => (
              <Fragment key={sphere.key}>
                <RangeField
                  label={sphere.label}
                  color={sphere.color}
                  hint={`спрос ×${district.preferenceMultiplier[sphere.weight].toLocaleString('ru-RU', { minimumFractionDigits: 1 })}`}
                  min={5}
                  max={100}
                  step={5}
                  value={plan[sphere.key]}
                  valueText={mln(plan[sphere.key])}
                  onChange={(value) => setPlan((current) => ({ ...current, [sphere.key]: value }))}
                />
              </Fragment>
            ))}
          </div>
          <p className="m-0 mt-1 text-[0.8125rem] leading-[1.45] text-ink-2 [text-wrap:pretty]">
            Комфорт растёт от сфер с высоким спросом, эффективность — от транспорта, образования и резерва.
          </p>
        </section>
      </div>

      <BottomAction
        label="Провести заседание"
        onClick={() => {
          setChoice(null);
          setStep('meeting');
        }}
      />
    </FlowPage>
  );
}
