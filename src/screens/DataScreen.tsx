import { useEffect, useState } from 'react';
import { ChevronRight, Star } from 'lucide-react';
import { BUDGET_FACTS, TOTAL_EXPENSES_BILLION } from '../data/budgetFacts';
import {
  DISTRICT_SCENARIOS,
  MY_DISTRICT_KEY,
  SECTORS,
  sectorParts,
  splitByShares,
  type SectorId,
} from '../data/spending';
import { sourceLink } from '../data/quests';
import { formatRub, type TaxCalculation } from '../lib/deduction';
import { cn, safeLocalStorage } from '../lib/utils';
import { SECTOR_COLOR, SECTOR_NAME } from '../ui/sectors';
import Sheet from '../ui/Sheet';

interface DataScreenProps {
  savedCalculation: TaxCalculation | null;
  active: boolean;
}

type OpenSheet = { kind: 'sector'; id: SectorId } | { kind: 'district'; id: string } | null;

const NB = '\u00A0';
const billions = (value: number) => value.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const share = (value: number) => value.toLocaleString('ru-RU', { minimumFractionDigits: 1 });
const rubles = (value: number) => `${value.toLocaleString('ru-RU')}${NB}₽`;

// ---------- Sankey: the whole year's spending on the left, the five directions on the right ----------

const VIEW_H = 224;
const BAR_H = 190;
const GAP = 7;
const X_LEFT = 7;
const X_RIGHT = 104;
const X_MID = 55.5;

const BANDS = (() => {
  let left = 17;
  let right = 2;
  return SECTORS.map((sector) => {
    const h = (BAR_H * sector.amountBillion) / TOTAL_EXPENSES_BILLION;
    const band = { id: sector.id as SectorId, l0: left, l1: left + h, r0: right, r1: right + h };
    left += h;
    right += h + GAP;
    return band;
  });
})();

// Label blocks keep at least 27 units apart, so two thin directions never overprint each other.
const LABEL_Y = BANDS.reduce<number[]>((ys, band) => {
  const center = (band.r0 + band.r1) / 2;
  ys.push(ys.length ? Math.max(center, ys[ys.length - 1] + 27) : center);
  return ys;
}, []);

// Tap areas: horizontal strips that meet halfway between neighbouring directions.
const HIT = BANDS.map((band, i) => ({
  top: i === 0 ? 0 : (BANDS[i - 1].r1 + band.r0) / 2,
  bottom: i === BANDS.length - 1 ? VIEW_H : (band.r1 + BANDS[i + 1].r0) / 2,
}));

const bandPath = (b: (typeof BANDS)[number]) =>
  `M${X_LEFT},${b.l0} C${X_MID},${b.l0} ${X_MID},${b.r0} ${X_RIGHT},${b.r0} L${X_RIGHT},${b.r1} C${X_MID},${b.r1} ${X_MID},${b.l1} ${X_LEFT},${b.l1} Z`;

const dotsPath = (b: (typeof BANDS)[number]) => {
  const left = (b.l0 + b.l1) / 2;
  const right = (b.r0 + b.r1) / 2;
  return `M${X_LEFT},${left} C${X_MID},${left} ${X_MID},${right} ${X_RIGHT},${right}`;
};

function Flows({ onPick }: { onPick: (id: SectorId) => void }) {
  const [active, setActive] = useState<SectorId | null>(null);
  return (
    <div className="mgb-flows relative aspect-[250/224]" data-active={active ?? undefined}>
      <svg viewBox={`0 0 250 ${VIEW_H}`} aria-hidden="true" className="block size-full overflow-visible">
        <rect x="0" y="17" width={X_LEFT} height={BAR_H} rx="2" style={{ fill: 'var(--mgb-ink)' }} />
        {BANDS.map((band) => (
          <path
            key={band.id}
            d={bandPath(band)}
            className="mgb-band"
            data-on={band.id === active ? '' : undefined}
            style={{ fill: SECTOR_COLOR[band.id] }}
          />
        ))}
        {BANDS.map((band) => (
          <path key={band.id} d={dotsPath(band)} className="mgb-flow-dots" />
        ))}
        {BANDS.map((band) => (
          <rect key={band.id} x={X_RIGHT} y={band.r0} width="5" height={band.r1 - band.r0} style={{ fill: SECTOR_COLOR[band.id] }} />
        ))}
        {SECTORS.map((sector, i) => (
          <g key={sector.id}>
            <text x="116" y={LABEL_Y[i] - 3.3} style={{ font: '600 11px var(--font-sans)', fill: 'var(--mgb-ink)' }}>
              {SECTOR_NAME[sector.id]}
            </text>
            <text x="116" y={LABEL_Y[i] + 8.7} style={{ font: '500 9.6px var(--font-mono)', fill: 'var(--mgb-ink-2)' }}>
              {`${billions(sector.amountBillion)} млрд · ${share(sector.share)} %`}
            </text>
          </g>
        ))}
      </svg>
      {SECTORS.map((sector, i) => (
        <button
          key={sector.id}
          type="button"
          onClick={() => onPick(sector.id as SectorId)}
          onPointerEnter={() => setActive(sector.id as SectorId)}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive(sector.id as SectorId)}
          onBlur={() => setActive(null)}
          aria-label={`${SECTOR_NAME[sector.id]}: ${billions(sector.amountBillion)} млрд ₽, ${share(sector.share)} % расходов. Подробнее`}
          className="absolute inset-x-0 rounded-xl"
          style={{ top: `${(HIT[i].top / VIEW_H) * 100}%`, height: `${((HIT[i].bottom - HIT[i].top) / VIEW_H) * 100}%` }}
        />
      ))}
    </div>
  );
}

// ---------- Screen ----------

export default function DataScreen({ savedCalculation, active }: DataScreenProps) {
  const [sheet, setSheet] = useState<OpenSheet>(null);
  const [mode, setMode] = useState<'thousand' | 'mine'>('thousand');
  const [myDistrict, setMyDistrict] = useState(() => safeLocalStorage.getItem(MY_DISTRICT_KEY) ?? '');

  // Leaving the tab (e.g. with the phone's Back button) closes an open sheet.
  useEffect(() => {
    if (!active) setSheet(null);
  }, [active]);

  const deduction = savedCalculation?.deduction ?? 0;
  const personal = mode === 'mine' && deduction > 0;
  const receiptTotal = personal ? deduction : 1000;
  const receipt = splitByShares(receiptTotal);
  const perThousand = splitByShares(1000);
  const leader = SECTORS.filter((sector) => sector.id !== 'other').sort((a, b) => b.amountBillion - a.amountBillion)[0].id;

  const toggleMyDistrict = (id: string) => {
    const next = myDistrict === id ? '' : id;
    setMyDistrict(next);
    if (next) safeLocalStorage.setItem(MY_DISTRICT_KEY, next);
    else safeLocalStorage.removeItem(MY_DISTRICT_KEY);
  };

  const law = sourceLink('budgetLaw2026');
  const openBudget = sourceLink('openBudget2026');

  const sectorSheet = sheet?.kind === 'sector' ? SECTORS.find((item) => item.id === sheet.id)! : null;
  const districtSheet = sheet?.kind === 'district' ? DISTRICT_SCENARIOS.find((item) => item.id === sheet.id)! : null;

  return (
    <div className="grid gap-3 px-4 pt-4 xl:grid-cols-12 lg:items-start lg:gap-5 lg:px-0 lg:pt-7">
      <section className="mgb-card px-5 py-[1.125rem] xl:col-span-7 xl:row-span-2 lg:px-8 lg:py-7" aria-labelledby="flows-title">
        <h2 id="flows-title" className="sr-only">
          Расходы по направлениям. Нажмите на направление, чтобы открыть подробности
        </h2>
        <Flows onPick={(id) => setSheet({ kind: 'sector', id })} />
        <p className="m-0 mt-3 text-[0.875rem] leading-normal text-ink-2 lg:mt-4 lg:text-[1rem]">
          = доходы {billions(BUDGET_FACTS.income.amountBillion)} + дефицит {billions(BUDGET_FACTS.deficit.amountBillion)}
          {NB}млрд{NB}₽
        </p>
      </section>

      <section className="mgb-card px-5 py-[1.125rem] xl:col-span-5 lg:px-7 lg:py-6" aria-labelledby="receipt-title">
        {deduction > 0 && (
          <div role="group" aria-label="Сумма чека" className="mb-3.5 flex rounded-[0.875rem] bg-track p-[3px]">
            {[
              { id: 'thousand' as const, label: `На 1${NB}000${NB}₽` },
              { id: 'mine' as const, label: 'На ваш вычет' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={mode === item.id}
                onClick={() => setMode(item.id)}
                className={cn(
                  'h-9 flex-1 rounded-[0.6875rem] text-[0.8125rem] font-semibold transition-colors duration-200',
                  mode === item.id ? 'bg-card text-ink shadow-[var(--mgb-seg-shadow)]' : 'text-ink-2',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
        <h2 id="receipt-title" className="m-0 mb-2 text-[1rem] font-semibold leading-snug lg:mb-3 lg:text-[1.125rem]">
          {personal ? `Ваш вычет ${formatRub(deduction)} по тем же долям` : `Условный чек на 1${NB}000${NB}₽ расходов`}
        </h2>
        <ul className="m-0 list-none p-0 font-mono text-[0.8125rem] leading-[1.55] lg:text-[0.9375rem] lg:leading-[1.7]">
          {SECTORS.map((sector) => (
            <li key={sector.id}>
              <button
                type="button"
                onClick={() => setSheet({ kind: 'sector', id: sector.id as SectorId })}
                className="flex w-full gap-1.5 py-0.5 text-left text-ink-2"
              >
                <span className={cn(sector.id === leader && 'font-semibold text-ink')}>{SECTOR_NAME[sector.id]}</span>
                <span aria-hidden="true" className="flex-1 -translate-y-1 border-b border-dotted border-ink-3 opacity-70" />
                <span className="font-semibold text-ink">{rubles(receipt[sector.id as SectorId])}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="m-0 mt-2 text-[0.8125rem] leading-snug text-ink-3">
          {personal
            ? 'Для сравнения масштаба: вычет возвращает уплаченный НДФЛ, а не оплачивает эти расходы.'
            : 'Учебная модель по структуре расходов 2026 года'}
        </p>
        {deduction === 0 && (
          <a href="#calc" className="mt-2 inline-block text-[0.8125rem] font-semibold leading-snug text-ink underline underline-offset-2">
            Сохраните расчёт вычета — покажем ваш чек
          </a>
        )}
      </section>

      <section className="mgb-card xl:col-span-5" aria-labelledby="districts-title">
        <div className="px-5 pb-1 pt-4 lg:px-7 lg:pt-6">
          <h2 id="districts-title" className="m-0 text-[1rem] font-semibold leading-snug lg:text-[1.125rem]">
            Сценарии округов
          </h2>
          <p className="m-0 mt-0.5 text-[0.8125rem] leading-snug text-ink-2">Условные значения для сравнения масштаба, не данные бюджета</p>
        </div>
        {DISTRICT_SCENARIOS.map((district, i) => (
          <div key={district.id}>
            {i > 0 && <div aria-hidden="true" className="mx-5 h-px bg-line lg:mx-7" />}
            <button
              type="button"
              onClick={() => setSheet({ kind: 'district', id: district.id })}
              className="flex min-h-[4.25rem] w-full items-center gap-3 px-5 py-3 text-left text-ink lg:px-7"
            >
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="flex items-center gap-2 text-[1rem] font-semibold leading-snug">
                  {district.id}
                  {myDistrict === district.id && (
                    <span className="rounded-full bg-streak-bg px-2 py-[0.1875rem] text-[0.6875rem] font-semibold leading-none text-streak-ink">
                      мой округ
                    </span>
                  )}
                </span>
                <span className="line-clamp-1 text-[0.8125rem] leading-snug text-ink-2">{district.priority}</span>
              </span>
              <span className="grid shrink-0 justify-items-end">
                <b className="whitespace-nowrap text-[0.9375rem] font-semibold">{rubles(district.perCapita)}</b>
                <span className="text-[0.75rem] text-ink-3">на жителя</span>
              </span>
              <ChevronRight size={18} strokeWidth={2} aria-hidden="true" className="shrink-0 text-ink-3" />
            </button>
          </div>
        ))}
      </section>

      <p className="m-0 px-2 pb-2 pt-1 text-[0.8125rem] leading-relaxed text-ink-3 xl:col-span-12 lg:px-1 lg:text-[0.875rem]">
        Суммы направлений —{' '}
        <a href={openBudget.url} target="_blank" rel="noopener noreferrer" className="text-ink-2 underline underline-offset-2">
          {openBudget.label}
        </a>
        , итог расходов —{' '}
        <a href={law.url} target="_blank" rel="noopener noreferrer" className="text-ink-2 underline underline-offset-2">
          {law.label}
        </a>
        . Проверено {law.checked}.
      </p>

      <Sheet open={sectorSheet !== null} title={sectorSheet ? SECTOR_NAME[sectorSheet.id] : ''} onClose={() => setSheet(null)}>
        {sectorSheet && <SectorDetails id={sectorSheet.id as SectorId} perThousand={perThousand[sectorSheet.id as SectorId]} />}
      </Sheet>

      <Sheet open={districtSheet !== null} title={districtSheet ? `Округ ${districtSheet.id}` : ''} onClose={() => setSheet(null)}>
        {districtSheet && (
          <div className="grid gap-3">
            <section className="mgb-card px-5 py-[1.125rem]" aria-label="Сценарий">
              <div className="grid grid-cols-2">
                <div>
                  <p className="m-0 text-[0.8125rem] text-ink-3">Условный объём</p>
                  <b className="text-[1.25rem] font-semibold tracking-[-0.01em]">
                    {districtSheet.fundBillion}
                    {NB}млрд{NB}₽
                  </b>
                </div>
                <div className="border-l border-line pl-4">
                  <p className="m-0 text-[0.8125rem] text-ink-3">На жителя</p>
                  <b className="text-[1.25rem] font-semibold tracking-[-0.01em]">{rubles(districtSheet.perCapita)}</b>
                </div>
              </div>
              <p className="m-0 mt-3.5 border-t border-line pt-3 text-[0.8125rem] text-ink-3">Приоритет сценария</p>
              <p className="m-0 mt-0.5 text-[0.9375rem] leading-[1.45]">{districtSheet.priority}</p>
            </section>
            <button
              type="button"
              aria-pressed={myDistrict === districtSheet.id}
              onClick={() => toggleMyDistrict(districtSheet.id)}
              className={cn(
                'flex h-[3.25rem] items-center justify-center gap-2 rounded-full text-[1rem] font-semibold',
                myDistrict === districtSheet.id ? 'bg-streak-bg text-streak-ink' : 'border border-line bg-card text-ink',
              )}
            >
              <Star size={18} strokeWidth={2} aria-hidden="true" className={cn(myDistrict === districtSheet.id && 'fill-current')} />
              {myDistrict === districtSheet.id ? 'Мой округ' : 'Сделать моим округом'}
            </button>
            <p className="m-0 px-2 text-[0.8125rem] leading-relaxed text-ink-2">
              Сценарные значения нужны, чтобы сравнить масштаб округов между собой. Это не данные бюджета Москвы.
            </p>
          </div>
        )}
      </Sheet>
    </div>
  );
}

function SectorDetails({ id, perThousand }: { id: SectorId; perThousand: number }) {
  const sector = SECTORS.find((item) => item.id === id)!;
  const fact = sector.factId ? BUDGET_FACTS[sector.factId as keyof typeof BUDGET_FACTS] : null;
  const source = sourceLink(sector.sourceId);
  const parts = sectorParts(id);
  const largest = Math.max(...parts.map((part) => part.amountBillion));
  const note = fact && 'note' in fact ? fact.note : null;

  return (
    <div className="grid gap-3">
      <section className="mgb-card px-5 py-[1.125rem]" aria-label="Расходы 2026 года">
        <p className="m-0 text-[0.875rem] text-ink-2">
          {fact ? `Госпрограмма «${fact.label}»` : 'Все расходы вне четырёх крупных направлений'}
        </p>
        <p className="m-0 mt-0.5 flex items-baseline gap-1.5">
          <b className="text-[2.5rem] font-bold leading-[1.05] tracking-[-0.035em]">{billions(sector.amountBillion)}</b>
          <span className="text-[1.25rem] font-semibold leading-tight text-ink-2">млрд{NB}₽</span>
        </p>
        <p className="m-0 mt-2 text-[0.9375rem] leading-snug text-ink-2">
          {share(sector.share)}
          {NB}% всех расходов · {perThousand}
          {NB}₽ из каждой 1{NB}000{NB}₽
        </p>
        {note && <p className="m-0 mt-1 text-[0.8125rem] leading-snug text-ink-3">{note}</p>}
        {!fact && (
          <p className="m-0 mt-1 text-[0.8125rem] leading-snug text-ink-3">
            Расчёт: все расходы бюджета минус образование, транспорт, здравоохранение и соцподдержка.
          </p>
        )}
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-[0.8125rem] leading-snug text-ink-3 underline underline-offset-[3px]"
        >
          {source.label} · проверено {source.checked} ↗
        </a>
      </section>

      <section className="mgb-card px-5 py-[1.125rem]" aria-labelledby="sector-parts-title">
        <h3 id="sector-parts-title" className="m-0 text-[1rem] font-semibold leading-snug">
          Из чего складывается
        </h3>
        <ul className="m-0 mt-3 grid list-none gap-3 p-0">
          {parts.map((part) => (
            <li key={part.name} className="grid gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[0.9375rem] leading-snug">{part.name}</span>
                <span className="shrink-0 whitespace-nowrap text-[0.9375rem] font-semibold">
                  {part.official ? '' : '≈'}
                  {billions(part.amountBillion)}
                  {NB}млрд
                </span>
              </div>
              <span aria-hidden="true" className="block h-1.5 overflow-hidden rounded-full bg-track">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${(part.amountBillion / largest) * 100}%`, background: SECTOR_COLOR[id] }}
                />
              </span>
            </li>
          ))}
        </ul>
        <p className="m-0 mt-3 text-[0.8125rem] leading-snug text-ink-3">
          {id === 'other'
            ? 'Три крупные программы — по данным Открытого бюджета Москвы, остальное — расчёт.'
            : 'Деление внутри направления примерное: это учебная модель, а не данные бюджета.'}
        </p>
      </section>
    </div>
  );
}
