import { BUDGET_FACTS, BUDGET_SECTORS, TOTAL_EXPENSES_BILLION } from './budgetFacts';

export type SectorId = 'trans' | 'edu' | 'soc' | 'health' | 'other';

// The flow order on «Данные» and «Главная»: the four named directions by size, the rest last.
export const SECTOR_ORDER: SectorId[] = ['trans', 'edu', 'soc', 'health', 'other'];

export const SECTORS = SECTOR_ORDER.map((id) => BUDGET_SECTORS.find((sector) => sector.id === id)!);

export interface SectorPart {
  name: string;
  /** Billions of rubles */
  amountBillion: number;
  official: boolean;
}

// Inside the four directions the split is an illustration for learning; «Другие программы» lists real programs.
const MODEL_SPLIT: Record<Exclude<SectorId, 'other'>, { name: string; percent: number }[]> = {
  edu: [
    { name: 'Школы и детские сады', percent: 55 },
    { name: 'Колледжи и профобразование', percent: 25 },
    { name: 'Вузы, высшее образование и наука', percent: 20 },
  ],
  trans: [
    { name: 'Строительство метро', percent: 60 },
    { name: 'Наземный транспорт и электробусы', percent: 25 },
    { name: 'МЦД, БКЛ и пригородное сообщение', percent: 15 },
  ],
  health: [
    { name: 'Поликлиники и амбулаторная помощь', percent: 45 },
    { name: 'Стационарная и высокотехнологичная помощь', percent: 35 },
    { name: 'ЕМИАС и цифровая медицина', percent: 20 },
  ],
  soc: [
    { name: 'Выплаты и компенсации льготникам', percent: 65 },
    { name: '«Московское долголетие» и клубы', percent: 20 },
    { name: 'Реабилитация и адресная помощь', percent: 15 },
  ],
};

export function sectorParts(id: SectorId): SectorPart[] {
  const sector = SECTORS.find((item) => item.id === id)!;
  if (id !== 'other') {
    return MODEL_SPLIT[id].map((part) => ({
      name: part.name,
      amountBillion: (sector.amountBillion * part.percent) / 100,
      official: false,
    }));
  }
  const programs = [BUDGET_FACTS.urbanEnvironment, BUDGET_FACTS.digital, BUDGET_FACTS.sport];
  const named = programs.reduce((sum, fact) => sum + fact.amountBillion, 0);
  return [
    ...programs.map((fact) => ({ name: fact.label, amountBillion: fact.amountBillion, official: true })),
    { name: 'Остальные программы и расходы', amountBillion: sector.amountBillion - named, official: true },
  ];
}

// Splits a sum into whole rubles by the directions' shares; the rounding never loses or adds a ruble.
export function splitByShares(total: number): Record<SectorId, number> {
  const raw = SECTORS.map((sector) => (total * sector.amountBillion) / TOTAL_EXPENSES_BILLION);
  const floors = raw.map(Math.floor);
  let rest = total - floors.reduce((sum, value) => sum + value, 0);
  raw
    .map((value, i) => ({ i, fraction: value - floors[i] }))
    .sort((a, b) => b.fraction - a.fraction)
    .forEach(({ i }) => {
      if (rest > 0) {
        floors[i] += 1;
        rest -= 1;
      }
    });
  return Object.fromEntries(SECTORS.map((sector, i) => [sector.id, floors[i]])) as Record<SectorId, number>;
}

// ---------- Administrative districts: scenario values for comparing scale, not budget data ----------

export interface DistrictScenario {
  id: string;
  fundBillion: number;
  perCapita: number;
  priority: string;
}

export const DISTRICT_SCENARIOS: DistrictScenario[] = [
  { id: 'ЦАО', fundBillion: 540, perCapita: 143_500, priority: 'Развитие ИТ-кластера на Китай-городе и благоустройство пешеходных улиц.' },
  { id: 'САО', fundBillion: 410, perCapita: 131_000, priority: 'Реконструкция транспортных узлов, ТПУ и благоустройство парка Северного речного вокзала.' },
  { id: 'ЗАО', fundBillion: 420, perCapita: 128_000, priority: 'Субсидирование научно-технических лабораторий МГУ и запуск инкубаторов в Раменках.' },
  { id: 'ТиНАО', fundBillion: 490, perCapita: 122_000, priority: 'Строительство новых центров притяжения, школ, больниц и скоростного трамвая.' },
  { id: 'ВАО', fundBillion: 380, perCapita: 112_000, priority: 'Экологическая модернизация производств в промзонах и озеленение Измайловского парка.' },
];

export const MY_DISTRICT_KEY = 'mos_my_district';
