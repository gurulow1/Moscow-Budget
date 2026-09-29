import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react';
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
import { BottomAction, Divider, FlowPage, FlowTop, ListRow, PrimaryButton, SecondaryButton } from '../ui/Flow';
import MoscowMap from '../ui/MoscowMap';
import { GAME_DISTRICT_OSM } from '../ui/mapGeo';
import Stamp from '../ui/exhibits/Stamp';
import DistrictShape from './mayor/DistrictShape';
import Fader from './mayor/Fader';
import Gauge from './mayor/Gauge';
import './mayor/mayor.css';

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

const NB = ' ';
const mln = (value: number) => `${value}${NB}млн${NB}₽`;
const pct = (value: number) => `${value}${NB}%`;
const signed = (value: number) => `${value > 0 ? '+' : '−'}${Math.abs(value)}`;
const TANK_STEP = 5;
// The deficit dial ends at a quarter of the limit; a bigger overspend pins the needle.
const DEFICIT_SCALE = 25;

// The three spheres in the app's order; each keeps its color from «Данные».
const SPHERES: { key: keyof Allocation; label: string; color: string; weight: keyof MayorDistrict['preferenceMultiplier'] }[] = [
  { key: 'education', label: 'Образование', color: 'var(--mgb-c2)', weight: 'education' },
  { key: 'transport', label: 'Транспорт', color: 'var(--mgb-c1)', weight: 'transport' },
  { key: 'healthcare', label: 'Здоровье и спорт', color: 'var(--mgb-c4)', weight: 'healthcare' },
];

// The three dials of the console; a preview shows where a meeting choice would move each needle.
function Dials({ comfort, efficiency, deficitPct, preview }: Outcome & { preview?: Outcome | null }) {
  return (
    <div className="grid grid-cols-3 gap-1.5 sm:gap-3 lg:gap-6">
      <Gauge label="Комфорт" value={comfort} max={100} target={TARGET_INDEX} direction="up" preview={preview?.comfort} />
      <Gauge label="Эффективность" value={efficiency} max={100} target={TARGET_INDEX} direction="up" preview={preview?.efficiency} />
      <Gauge label="Дефицит" value={deficitPct} max={DEFICIT_SCALE} target={TARGET_DEFICIT} direction="down" preview={preview?.deficitPct} />
    </div>
  );
}

// The district's limit as segments of 5 mln ₽ in the spheres' colours; past the white line the overspend is striped red.
function Tank({ plan, budget }: { plan: Allocation; budget: number }) {
  const total = plan.education + plan.transport + plan.healthcare;
  const cells = Math.ceil(Math.max(total, budget) / TANK_STEP);
  const limit = budget / TANK_STEP;
  const colored: (string | null)[] = [];
  for (const sphere of SPHERES) for (let i = 0; i < plan[sphere.key] / TANK_STEP; i++) colored.push(sphere.color);
  return (
    <div aria-hidden="true" className="mgb-tank">
      {Array.from({ length: cells }, (_, i) => (
        <Fragment key={i}>
          {i === limit && <i />}
          <span
            data-c={i < limit && colored[i] ? '' : undefined}
            data-over={i >= limit && colored[i] ? '' : undefined}
            style={{ '--c': colored[i] ?? undefined } as CSSProperties}
          />
        </Fragment>
      ))}
    </div>
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
  const [badges, setBadges] = useState(readDistrictBadges);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const district = MAYOR_DISTRICTS[districtIndex];
  const f = forecast(district, plan);
  const event = meetingEvent(district, f);
  const budget = district.budget;
  const now: Outcome = { comfort: f.comfort, efficiency: f.efficiency, deficitPct: f.deficitPct };

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
    if (win) {
      addDistrictBadge(district.id);
      setBadges(readDistrictBadges());
    }
    setDecision({ option, result, win, awarded });
    setStep('result');
  };

  if (step === 'result' && decision) {
    const { option, result, win, awarded } = decision;
    const misses = [
      result.comfort < TARGET_INDEX && `комфорт ${pct(result.comfort)} при цели от${NB}${TARGET_INDEX}${NB}%`,
      result.efficiency < TARGET_INDEX && `эффективность ${pct(result.efficiency)} при цели от${NB}${TARGET_INDEX}${NB}%`,
      result.deficitPct > TARGET_DEFICIT && `дефицит ${pct(result.deficitPct)} при допустимых ${TARGET_DEFICIT}${NB}%`,
    ].filter(Boolean);
    const next = MAYOR_DISTRICTS[(districtIndex + 1) % MAYOR_DISTRICTS.length];
    const steps = routeSteps(calculatorDone, completedActivities);
    const nextStep = steps.find((item) => !item.done);
    const rows: [string, string, boolean?][] = [
      ...SPHERES.map((sphere) => [sphere.label, mln(plan[sphere.key])] as [string, string]),
      ['Итого', `${f.total} из ${mln(budget)}`],
      ['Решение заседания', `«${option.label}»`],
    ];
    const indices = [
      { label: 'Комфорт', value: result.comfort, ok: result.comfort >= TARGET_INDEX },
      { label: 'Эффективность', value: result.efficiency, ok: result.efficiency >= TARGET_INDEX },
      { label: 'Дефицит', value: result.deficitPct, ok: result.deficitPct <= TARGET_DEFICIT },
    ];
    return (
      <FlowPage className="pb-[calc(2rem_+_env(safe-area-inset-bottom))] lg:max-w-[68rem]">
        <FlowTop ref={titleRef} icon="close" label="Закрыть игру" onPress={onClose} title="Итог заседания" />
        <div className="mt-[1.125rem] grid gap-3 lg:mt-10 lg:grid-cols-2 lg:items-start lg:gap-8">
          {/* The decree on paper, stamped. */}
          <section className="mgb-paper px-6 pb-40 pt-6 lg:px-8 lg:pb-36 lg:pt-8" aria-label="Постановление">
            <p className="mgb-paper-head m-0">Постановление · учебное</p>
            <h2 className="m-0 mt-3 text-[1.75rem] font-bold leading-[1.1] tracking-[-0.03em] lg:text-[2.25rem]">
              О бюджете района {district.name}
            </h2>
            <dl className="m-0 mt-4 grid gap-1 font-mono text-[0.8125rem] lg:text-[0.9375rem]">
              {rows.map(([label, value]) => (
                <div key={label} className="flex gap-2">
                  <dt className="text-[#4E5462]">{label}</dt>
                  <span aria-hidden="true" className="flex-1 -translate-y-1 border-b border-dotted border-[#B9BCC4]" />
                  <dd className="m-0 text-right font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mgb-paper-rule mt-4 grid grid-cols-3 gap-2 pt-3">
              {indices.map((item) => (
                <div key={item.label}>
                  <span className="block text-[0.75rem] text-[#6D7280]">{item.label}</span>
                  <b className={cn('text-[1.375rem] font-bold tracking-[-0.02em]', item.ok ? 'text-[#0B7A58]' : 'text-[#CF2A3D]')}>{pct(item.value)}</b>
                </div>
              ))}
            </div>
            <p className="m-0 mt-4 text-[0.9375rem] leading-[1.5] text-[#4E5462] [text-wrap:pretty] lg:text-[1rem]">
              {win
                ? `Район получил понятный приоритет «${district.primaryDemand}»${
                    result.deficitPct === 0 ? ', бюджет без дефицита.' : `, дефицит ${pct(result.deficitPct)} в допустимых пределах.`
                  }`
                : `Не хватило: ${misses.join(', ')}. Вернитесь к распределению и попробуйте другой компромисс.`}
            </p>
            <p className="absolute bottom-7 left-6 m-0 font-mono text-[0.75rem] text-[#6D7280] lg:left-8">
              Виртуальный мэр <span className="inline-block w-24 border-b border-[#9EA3AE] align-baseline" />
            </p>
            <Stamp
              word={win ? 'ПРИНЯТО' : 'ДОРАБОТАТЬ'}
              sub={win ? 'ВИРТУАЛЬНЫЙ МЭР' : 'ВЕРНУТЬ В ПЛАН'}
              tone={win ? 'ok' : 'bad'}
              className="absolute bottom-3 right-5 lg:right-7"
            />
          </section>

          <div className="grid gap-3">
            <section className="mgb-card px-5 py-5 lg:px-7 lg:py-6" aria-labelledby="badges-title">
              <h3 id="badges-title" className="m-0 text-[1rem] font-semibold lg:text-[1.125rem]">
                Знаки районов · {badges.length} из {MAYOR_DISTRICTS.length}
              </h3>
              <p className="m-0 mt-0.5 text-[0.8125rem] leading-snug text-ink-2 lg:text-[0.9375rem]">
                {win ? `«Инвестор ${district.name}» — в коллекции и на карте районов` : 'Знак района дают за принятый сценарий'}
              </p>
              <ul className="m-0 mt-4 grid list-none grid-cols-5 gap-2.5 p-0 lg:gap-3.5">
                {MAYOR_DISTRICTS.map((item) => {
                  const got = badges.includes(item.id);
                  return (
                    <li key={item.id} className="grid justify-items-center gap-1.5 text-center">
                      <span className={cn('mgb-medal w-full', !got && 'is-empty', item.id === district.id && win && 'ring-2 ring-c3 ring-offset-2 ring-offset-[var(--mgb-card)]')}>
                        <DistrictShape osm={GAME_DISTRICT_OSM[item.id]} tone={got ? 'ok' : 'ghost'} />
                      </span>
                      <span className={cn('text-[0.6875rem] font-semibold leading-tight lg:text-[0.75rem]', got ? 'text-ink' : 'text-ink-3')}>{item.name}</span>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="mgb-card" aria-label="Награды">
              <ListRow
                title="Учебные баллы"
                note={!win ? 'начисляются за принятый сценарий района' : awarded ? 'за первый принятый сценарий района' : 'за этот район уже начислены'}
                right={<b className="shrink-0 text-[1.0625rem] font-bold">{awarded ? `+${MAYOR_REWARD}` : '0'}</b>}
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
        </div>
      </FlowPage>
    );
  }

  if (step === 'meeting') {
    const preview = choice === null ? null : outcome(f, event.options[choice]);
    return (
      <FlowPage className="lg:max-w-[76rem]">
        <FlowTop ref={titleRef} icon="back" label="Изменить распределение" onPress={toPlan} title="Заседание" step="шаг 2 из 3" />
        <div className="mt-4 grid gap-3 lg:mt-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-6">
          <section className="mgb-paper px-6 py-6 lg:px-8 lg:py-8" aria-labelledby="mayor-event-title">
            <p className="mgb-paper-head m-0">Повестка заседания · {district.name}</p>
            <h2 id="mayor-event-title" className="m-0 mt-3 text-[1.625rem] font-bold leading-[1.1] tracking-[-0.03em] [text-wrap:balance] lg:text-[2.25rem]">
              {event.title}
            </h2>
            <p className="m-0 mt-3 text-[0.9375rem] leading-[1.5] text-[#4E5462] [text-wrap:pretty] lg:text-[1.0625rem]">{event.body}</p>
            <dl className="mgb-paper-rule m-0 mt-5 grid gap-1 pt-3 font-mono text-[0.8125rem] lg:text-[0.875rem]">
              {SPHERES.map((sphere) => (
                <div key={sphere.key} className="flex gap-2">
                  <dt className="text-[#4E5462]">{sphere.label}</dt>
                  <span aria-hidden="true" className="flex-1 -translate-y-1 border-b border-dotted border-[#B9BCC4]" />
                  <dd className="m-0 font-semibold">{mln(plan[sphere.key])}</dd>
                </div>
              ))}
              <div className="flex gap-2">
                <dt className="text-[#4E5462]">Заявка</dt>
                <span aria-hidden="true" className="flex-1 -translate-y-1 border-b border-dotted border-[#B9BCC4]" />
                <dd className={cn('m-0 font-semibold', f.total > budget && 'text-[#CF2A3D]')}>
                  {f.total} из {mln(budget)}
                </dd>
              </div>
            </dl>
          </section>

          <div className="grid gap-3">
            <section className="mgb-console px-3 pb-4 pt-4 sm:px-5 lg:px-7 lg:pb-6 lg:pt-6" aria-label="Показатели района">
              <div className="flex items-center justify-between gap-3 px-1">
                <span className="mgb-console-label">Пульт мэра</span>
                <span className="mgb-console-label">{preview ? 'жёлтая стрелка — после решения' : 'выберите решение'}</span>
              </div>
              <div className="mt-3">
                <Dials {...now} preview={preview} />
              </div>
            </section>

            <div role="radiogroup" aria-label="Варианты решения" className="grid gap-2.5 sm:grid-cols-2">
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
                      'mgb-answer grid content-start gap-2 rounded-[1.5rem] px-5 py-4 text-left text-ink lg:px-6 lg:py-5',
                      on && 'border-accent shadow-[0_0_0_3px_var(--mgb-accent-soft),var(--mgb-shadow)]',
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <span aria-hidden="true" className={cn('grid size-6 shrink-0 place-items-center rounded-full border-2', on ? 'border-accent' : 'border-track')}>
                        <span className={cn('size-2.5 rounded-full bg-accent transition-opacity', on ? 'opacity-100' : 'opacity-0')} />
                      </span>
                      <span className="text-[1.125rem] font-bold leading-tight tracking-[-0.015em] lg:text-[1.25rem]">{option.label}</span>
                    </span>
                    <span className="text-[0.875rem] leading-[1.45] text-ink-2 [text-wrap:pretty] lg:text-[0.9375rem]">{option.description}</span>
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
        </div>
        <BottomAction label={choice === null ? 'Выберите решение' : 'Зафиксировать решение'} disabled={choice === null} onClick={confirm} />
      </FlowPage>
    );
  }

  const status =
    f.total <= budget
      ? { text: f.total === budget ? 'ровно в лимите' : `резерв ${mln(budget - f.total)}`, className: 'text-[#34CF9C]' }
      : {
          text: `дефицит ${mln(f.deficitMln)}${f.danger ? ` — больше ${TARGET_DEFICIT}${NB}%` : ' — допустимо'}`,
          className: f.danger ? 'text-[#FF7384]' : 'text-[#FFB547]',
        };

  return (
    <FlowPage className="lg:max-w-[76rem]">
      <FlowTop icon="close" label="Закрыть игру" onPress={onClose} title="Виртуальный мэр" step="шаг 1 из 3" />
      <div ref={chipsRef} role="group" aria-label="Район" className="mgb-scroll-x relative -mx-4 mt-3.5 flex gap-2 px-4 lg:mt-6">
        {MAYOR_DISTRICTS.map((item, i) => {
          const on = i === districtIndex;
          const got = badges.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={on}
              onClick={() => setDistrictIndex(i)}
              className={cn(
                'flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full pl-2 pr-4 text-[0.875rem] font-semibold transition-colors duration-200 lg:h-12 lg:text-[0.9375rem]',
                on ? 'bg-card text-ink shadow-[var(--mgb-seg-shadow)]' : 'bg-track text-ink-2',
              )}
            >
              <DistrictShape osm={GAME_DISTRICT_OSM[item.id]} tone={on ? 'accent' : got ? 'ok' : 'ghost'} className="size-7 lg:size-8" />
              {item.name}
              {got && <span className="sr-only">, знак получен</span>}
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid gap-3 lg:mt-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-6">
        <section className="mgb-card" aria-labelledby="mayor-district">
          <div className="relative h-52 border-b border-line lg:h-[19rem]">
            <MoscowMap
              picks={MAYOR_DISTRICTS.map((item) => ({ id: item.id, osm: GAME_DISTRICT_OSM[item.id], label: item.name, done: badges.includes(item.id) }))}
              selected={district.id}
              onSelect={(id) => setDistrictIndex(MAYOR_DISTRICTS.findIndex((item) => item.id === id))}
            />
          </div>
          <div className="px-5 py-4 lg:px-7 lg:py-6">
            <p className="m-0 text-[0.875rem] text-ink-2 lg:text-[0.9375rem]">Бюджет района · {mln(budget)}</p>
            <h2 id="mayor-district" className="m-0 mt-0.5 text-[1.75rem] font-bold leading-tight tracking-[-0.03em] lg:text-[2.25rem]">
              {district.name}
            </h2>
            <p className="m-0 mt-3 text-[0.8125rem] text-ink-3 lg:text-[0.875rem]">Запрос жителей</p>
            <p className="m-0 text-[1.0625rem] font-semibold leading-snug lg:text-[1.1875rem]">{district.primaryDemand}</p>
            <p className="m-0 mt-2 text-[0.875rem] leading-[1.5] text-ink-2 [text-wrap:pretty] lg:text-[0.9375rem]">{district.description}</p>
            <p className="m-0 mt-2 text-[0.75rem] text-ink-3">Цифры района — демо-данные для игры. Карта — © участники OpenStreetMap.</p>
          </div>
        </section>

        <section className="mgb-console px-3 pb-5 pt-4 sm:px-5 lg:px-7 lg:pb-7 lg:pt-6" aria-label="Пульт мэра">
          <div className="flex items-center justify-between gap-3 px-1">
            <span className="mgb-console-label">Пульт мэра</span>
            <span className="mgb-console-label">{district.name}</span>
          </div>
          <div className="mt-3">
            <Dials {...now} />
          </div>

          <div className="mgb-console-rule mt-4 px-1 pt-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="mgb-console-label">Бюджет района</span>
              <span aria-live="polite" className="text-[0.875rem] lg:text-[1rem]">
                <b className="font-semibold">{f.total}</b> <span className="text-[rgba(243,239,230,0.6)]">из {mln(budget)}</span>
                <span className={cn('ml-2 font-semibold', status.className)}>· {status.text}</span>
              </span>
            </div>
            <div className="mt-2.5">
              <Tank plan={plan} budget={budget} />
            </div>
          </div>

          <div className="mgb-console-rule mt-5 grid grid-cols-3 gap-2 pt-5">
            {SPHERES.map((sphere) => (
              <Fragment key={sphere.key}>
                <Fader
                  label={sphere.label}
                  color={sphere.color}
                  demand={district.preferenceMultiplier[sphere.weight]}
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
          <p className="m-0 mt-4 px-1 text-center text-[0.8125rem] leading-[1.45] text-[rgba(243,239,230,0.55)] [text-wrap:balance]">
            Комфорт растёт от сфер с высоким спросом (он подсвечен), эффективность — от транспорта, образования и резерва.
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
