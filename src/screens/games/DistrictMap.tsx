import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { MAYOR_DISTRICTS, readDistrictBadges, type QuestItem } from '../../data/quests';
import { cn } from '../../lib/utils';
import { BottomAction, FlowPage, FlowTop } from '../../ui/Flow';

interface DistrictMapProps {
  item: QuestItem;
  onClose: () => void;
  onOpenMayor: (districtId: string) => void;
}

// A schematic of the five game districts, roughly where they lie in Moscow; not to scale.
const SHAPES: Record<string, { d: string; x: number; y: number }> = {
  krylatskoe: { d: 'M60,110 L195,110 L185,195 L65,170 Z', x: 128, y: 148 },
  tverskoy: { d: 'M210,150 L310,150 L310,210 L210,210 Z', x: 260, y: 184 },
  sokolniki: { d: 'M315,100 L415,70 L435,145 L315,145 Z', x: 372, y: 118 },
  hamovniki: { d: 'M130,225 L205,212 L245,280 L170,300 Z', x: 187, y: 258 },
  vyhino: { d: 'M315,215 L435,215 L460,310 L350,315 Z', x: 390, y: 268 },
};

const SHORT_NAME: Record<string, string> = { vyhino: 'Выхино' };

export default function DistrictMap({ item, onClose, onOpenMayor }: DistrictMapProps) {
  const [selected, setSelected] = useState(MAYOR_DISTRICTS[0].id);
  const [badges] = useState(readDistrictBadges);
  const district = MAYOR_DISTRICTS.find((entry) => entry.id === selected)!;
  const hasBadge = badges.includes(district.id);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <FlowPage className="px-0">
      <div className="px-4">
        <FlowTop icon="close" label="Закрыть карту" onPress={onClose} title={item.title} />
      </div>

      <div className="mt-4 grid gap-3 px-4">
        <section className="mgb-card px-3 py-3" aria-label="Схема районов">
          <svg viewBox="40 55 440 285" aria-hidden="true" className="block h-auto w-full">
            {/* Москва-река: past Krylatskoe, around Khamovniki, south of the centre. */}
            <path
              d="M40,175 C90,190 110,200 150,208 S215,200 250,218 S300,240 305,275 S300,320 330,338"
              fill="none"
              strokeWidth="7"
              strokeLinecap="round"
              style={{ stroke: 'var(--mgb-c1)', opacity: 0.22 }}
            />
            {MAYOR_DISTRICTS.map((entry) => {
              const shape = SHAPES[entry.id];
              const on = entry.id === selected;
              const won = badges.includes(entry.id);
              return (
                <g key={entry.id} onClick={() => setSelected(entry.id)} className="cursor-pointer">
                  <path
                    d={shape.d}
                    strokeWidth={on ? 3 : 1.5}
                    strokeLinejoin="round"
                    className="transition-[fill] duration-200"
                    style={{
                      fill: on ? 'var(--mgb-accent)' : won ? 'var(--mgb-ok-soft)' : 'var(--mgb-track)',
                      stroke: on ? 'var(--mgb-accent)' : won ? 'var(--mgb-c3)' : 'var(--mgb-line)',
                    }}
                  />
                  <text
                    x={shape.x}
                    y={shape.y}
                    textAnchor="middle"
                    style={{ font: '600 16px var(--font-sans)', fill: on ? '#fff' : 'var(--mgb-ink)' }}
                  >
                    {SHORT_NAME[entry.id] ?? entry.name}
                  </text>
                  {won && (
                    <g transform={`translate(${shape.x - 9}, ${shape.y + 7})`}>
                      <circle cx="9" cy="9" r="9" style={{ fill: on ? '#fff' : 'var(--mgb-c3)' }} />
                      <path d="M5 9.2l2.7 2.7L13 6.5" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: on ? 'var(--mgb-accent)' : '#fff' }} />
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
          <p className="m-0 px-2 pb-1 text-[0.8125rem] leading-snug text-ink-3">Схема, не в масштабе. Голубая линия — Москва-река, галочка — знак района из «Виртуального мэра».</p>
        </section>
      </div>

      <div role="group" aria-label="Район" className="mgb-scroll-x mt-3 flex gap-2 px-4">
        {MAYOR_DISTRICTS.map((entry) => {
          const on = entry.id === selected;
          return (
            <button
              key={entry.id}
              type="button"
              aria-pressed={on}
              onClick={() => setSelected(entry.id)}
              className={cn(
                'flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[0.875rem] font-semibold transition-colors duration-200',
                on ? 'bg-card text-ink shadow-[var(--mgb-seg-shadow)]' : 'bg-track text-ink-2',
              )}
            >
              {entry.name}
              {badges.includes(entry.id) && (
                <>
                  <Check size={14} strokeWidth={3} aria-hidden="true" className="text-ok-ink" />
                  <span className="sr-only">, знак получен</span>
                </>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid gap-3 px-4">
        <section className="mgb-card px-5 py-[1.125rem]" aria-labelledby="district-title">
          <p className="m-0 text-[0.875rem] text-ink-2">Паспорт района</p>
          <h2 id="district-title" className="m-0 mt-0.5 text-[1.5rem] font-bold leading-tight tracking-[-0.02em]">
            {district.name}
          </h2>
          <dl className="m-0 mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-3">
            {[
              ['Лимит бюджета', `${district.budget} млн ₽`],
              ['Сборы НДФЛ в год', `${district.revenueFromNdfMln} млн ₽`],
              ['Безработица', district.unemploymentRate.replace('.', ',').replace('%', ' %')],
              ['Знак района', hasBadge ? 'получен' : 'ещё нет'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[0.8125rem] text-ink-3">{label}</dt>
                <dd className={cn('m-0 text-[1.0625rem] font-semibold', label === 'Знак района' && hasBadge && 'text-ok-ink')}>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="m-0 mt-3.5 border-t border-line pt-3 text-[0.8125rem] text-ink-3">Запрос жителей</p>
          <p className="m-0 mt-0.5 text-[1rem] font-semibold leading-snug">{district.primaryDemand}</p>
          <p className="m-0 mt-2.5 text-[0.8125rem] text-ink-3">Главный проект</p>
          <p className="m-0 mt-0.5 text-[1rem] font-semibold leading-snug">{district.mainProject}</p>
          <p className="m-0 mt-2.5 text-[0.9375rem] leading-[1.5] text-ink-2 [text-wrap:pretty]">{district.description}</p>
        </section>
        <p className="m-0 px-2 text-[0.8125rem] leading-relaxed text-ink-3">Цифры районов — демо-данные для игры, не городская статистика.</p>
      </div>

      <BottomAction label={`Управлять районом ${district.name}`} onClick={() => onOpenMayor(district.id)} />
    </FlowPage>
  );
}
