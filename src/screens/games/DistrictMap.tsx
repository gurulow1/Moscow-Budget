import { useEffect, useState } from 'react';
import { MAYOR_DISTRICTS, readDistrictBadges, type QuestItem } from '../../data/quests';
import { cn } from '../../lib/utils';
import { BottomAction, FlowPage, FlowTop } from '../../ui/Flow';
import MoscowMap from '../../ui/MoscowMap';
import { GAME_DISTRICT_OSM, districtByName } from '../../ui/mapGeo';
import DistrictShape from '../mayor/DistrictShape';
import '../mayor/mayor.css';

interface DistrictMapProps {
  item: QuestItem;
  onClose: () => void;
  onOpenMayor: (districtId: string) => void;
}

const NB = ' ';
// Moscow inside MKAD, in km from the Kremlin.
const MKAD = [-19.5, -19.5, 39, 39];

// The whole city from OpenStreetMap with the game's five districts lit; beside it, the chosen district's passport.
export default function DistrictMap({ item, onClose, onOpenMayor }: DistrictMapProps) {
  const [selected, setSelected] = useState(MAYOR_DISTRICTS[0].id);
  const [badges] = useState(readDistrictBadges);
  const district = MAYOR_DISTRICTS.find((entry) => entry.id === selected)!;
  const osm = GAME_DISTRICT_OSM[district.id];
  const okrug = districtByName.get(osm)?.okrug;
  const hasBadge = badges.includes(district.id);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  const stats = [
    { label: 'Лимит бюджета', value: `${district.budget}`, unit: `млн${NB}₽` },
    { label: 'Сборы НДФЛ в год', value: `${district.revenueFromNdfMln}`, unit: `млн${NB}₽` },
    { label: 'Безработица', value: district.unemploymentRate.replace('.', ',').replace('%', ''), unit: '%' },
  ];

  return (
    <FlowPage className="lg:max-w-[76rem]">
      <FlowTop icon="close" label="Закрыть карту" onPress={onClose} title={item.title} />

      <div className="mt-4 grid gap-3 lg:mt-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start lg:gap-6">
        <section className="mgb-card relative h-[22rem] sm:h-[28rem] lg:sticky lg:top-6 lg:h-[min(44rem,calc(100dvh-10rem))]" aria-label="Карта районов Москвы">
          <MoscowMap
            picks={MAYOR_DISTRICTS.map((entry) => ({ id: entry.id, osm: GAME_DISTRICT_OSM[entry.id], label: entry.name, done: badges.includes(entry.id) }))}
            selected={selected}
            onSelect={setSelected}
            follow={false}
            frame={MKAD}
          />
          <p className="pointer-events-none absolute bottom-3 left-4 right-4 m-0 text-[0.75rem] leading-snug text-ink-3 lg:bottom-5 lg:left-6">
            Москва в МКАД · пять районов игры · ✓ — знак района · © участники OpenStreetMap
          </p>
        </section>

        <div className="grid gap-3">
          <div role="group" aria-label="Район" className="mgb-scroll-x -mx-4 flex gap-2 px-4 lg:mx-0 lg:px-0">
            {MAYOR_DISTRICTS.map((entry) => {
              const on = entry.id === selected;
              const got = badges.includes(entry.id);
              return (
                <button
                  key={entry.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSelected(entry.id)}
                  className={cn(
                    'flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full pl-2 pr-4 text-[0.875rem] font-semibold transition-colors duration-200',
                    on ? 'bg-card text-ink shadow-[var(--mgb-seg-shadow)]' : 'bg-track text-ink-2',
                  )}
                >
                  <DistrictShape osm={GAME_DISTRICT_OSM[entry.id]} tone={on ? 'accent' : got ? 'ok' : 'ghost'} className="size-7" />
                  {entry.name}
                  {got && <span className="sr-only">, знак получен</span>}
                </button>
              );
            })}
          </div>

          <section className="mgb-card px-5 pb-5 pt-5 lg:px-7 lg:pb-7 lg:pt-6" aria-labelledby="district-title">
            <div className="flex items-center gap-4">
              <span className={cn('mgb-medal w-20 shrink-0 lg:w-24', !hasBadge && 'is-empty')}>
                <DistrictShape osm={osm} tone={hasBadge ? 'ok' : 'accent'} />
              </span>
              <div className="min-w-0">
                <p className="m-0 text-[0.875rem] text-ink-2">Паспорт района{okrug ? ` · ${okrug}` : ''}</p>
                <h2 id="district-title" className="m-0 mt-0.5 text-[1.75rem] font-bold leading-tight tracking-[-0.03em] lg:text-[2.125rem]">
                  {district.name}
                </h2>
                <p className={cn('m-0 mt-1 text-[0.875rem] font-semibold', hasBadge ? 'text-ok-ink' : 'text-ink-3')}>
                  {hasBadge ? `Знак «Инвестор ${district.name}» получен` : 'Знака района пока нет'}
                </p>
              </div>
            </div>

            <dl className="m-0 mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4">
              {stats.map((stat) => (
                <div key={stat.label} className="min-w-0">
                  <dt className="text-[0.75rem] leading-tight text-ink-3 lg:text-[0.8125rem]">{stat.label}</dt>
                  <dd className="m-0 mt-1 whitespace-nowrap">
                    <b className="text-[1.5rem] font-bold tracking-[-0.03em] lg:text-[1.875rem]">{stat.value}</b>
                    <span className="ml-1 text-[0.8125rem] font-semibold text-ink-2">{stat.unit}</span>
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-4 grid gap-3 border-t border-line pt-4">
              <div>
                <p className="m-0 text-[0.8125rem] text-ink-3">Запрос жителей</p>
                <p className="m-0 text-[1.0625rem] font-semibold leading-snug">{district.primaryDemand}</p>
              </div>
              <div>
                <p className="m-0 text-[0.8125rem] text-ink-3">Главный проект</p>
                <p className="m-0 text-[1.0625rem] font-semibold leading-snug">{district.mainProject}</p>
              </div>
              <p className="m-0 text-[0.9375rem] leading-[1.5] text-ink-2 [text-wrap:pretty]">{district.description}</p>
            </div>
          </section>
          <p className="m-0 px-2 text-[0.8125rem] leading-relaxed text-ink-3">Цифры районов — демо-данные для игры, не городская статистика.</p>
        </div>
      </div>

      <BottomAction label={`Управлять районом ${district.name}`} onClick={() => onOpenMayor(district.id)} />
    </FlowPage>
  );
}
