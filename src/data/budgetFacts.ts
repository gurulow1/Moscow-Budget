export type EvidenceStatus = 'official' | 'derived' | 'educational-model';

export const DATA_SOURCES = {
  budgetLaw2026: {
    title: 'Закон города Москвы № 39 от 01.11.2025',
    url: 'https://www.mos.ru/upload/documents/files/7547/Zakon_goroda_Moskvi_39_ot_01-11-2025.pdf',
    publisher: 'Официальный портал Мэра и Правительства Москвы',
    publishedAt: '2025-11-01',
    checkedAt: '2026-07-15',
  },
  openBudget2026: {
    title: 'Бюджет Москвы на 2026–2028 годы',
    url: 'https://budget.mos.ru/news/14617',
    publisher: 'Открытый бюджет города Москвы',
    publishedAt: '2025-11-01',
    checkedAt: '2026-07-15',
  },
  budgetParameters2026: {
    title: 'Основные параметры бюджета',
    url: 'https://budget.mos.ru/budget',
    publisher: 'Открытый бюджет города Москвы',
    publishedAt: '2025-11-11',
    checkedAt: '2026-07-15',
  },
  fnsSocialDeduction: {
    title: 'Социальные налоговые вычеты',
    url: 'https://www.nalog.gov.ru/rn77/taxation/taxes/ndfl/nalog_vichet/soc_nv/soc_nv_ob/',
    publisher: 'ФНС России',
    publishedAt: '2024-01-01',
    checkedAt: '2026-07-15',
  },
} as const;

export type DataSourceId = keyof typeof DATA_SOURCES;

export interface BudgetFact {
  id: string;
  label: string;
  amountBillion: number;
  period: 2026;
  status: EvidenceStatus;
  sourceId: DataSourceId;
  note?: string;
}

export const BUDGET_FACTS = {
  income: {
    id: 'income-2026',
    label: 'Доходы бюджета Москвы',
    amountBillion: 5937.4,
    period: 2026,
    status: 'official',
    sourceId: 'budgetParameters2026',
  },
  expenses: {
    id: 'expenses-2026',
    label: 'Расходы бюджета Москвы',
    amountBillion: 6385,
    period: 2026,
    status: 'official',
    sourceId: 'budgetLaw2026',
  },
  deficit: {
    id: 'deficit-2026',
    label: 'Плановый дефицит',
    amountBillion: 447.6,
    period: 2026,
    status: 'official',
    sourceId: 'budgetLaw2026',
  },
  socialSphere: {
    id: 'social-sphere-2026',
    label: 'Социальная сфера в широком смысле',
    amountBillion: 3200,
    period: 2026,
    status: 'official',
    sourceId: 'openBudget2026',
    note: 'Около половины всех расходов бюджета.',
  },
  education: {
    id: 'education-program-2026',
    label: 'Развитие образования',
    amountBillion: 814.6,
    period: 2026,
    status: 'official',
    sourceId: 'openBudget2026',
  },
  transport: {
    id: 'transport-program-2026',
    label: 'Развитие транспортной системы',
    amountBillion: 1296.8,
    period: 2026,
    status: 'official',
    sourceId: 'openBudget2026',
  },
  healthcare: {
    id: 'healthcare-program-2026',
    label: 'Развитие здравоохранения',
    amountBillion: 615,
    period: 2026,
    status: 'official',
    sourceId: 'openBudget2026',
    note: 'Без учёта оплаты медицинской помощи из Фонда ОМС.',
  },
  socialSupport: {
    id: 'social-support-program-2026',
    label: 'Социальная поддержка жителей',
    amountBillion: 810,
    period: 2026,
    status: 'official',
    sourceId: 'openBudget2026',
  },
  digital: {
    id: 'digital-program-2026',
    label: 'Цифровая среда и инновации',
    amountBillion: 243.1,
    period: 2026,
    status: 'official',
    sourceId: 'openBudget2026',
  },
  urbanEnvironment: {
    id: 'urban-environment-program-2026',
    label: 'Развитие городской среды',
    amountBillion: 263.2,
    period: 2026,
    status: 'official',
    sourceId: 'openBudget2026',
  },
  sport: {
    id: 'sport-program-2026',
    label: 'Спорт Москвы',
    amountBillion: 173.3,
    period: 2026,
    status: 'official',
    sourceId: 'openBudget2026',
  },
} as const satisfies Record<string, BudgetFact>;

export type BudgetFactId = keyof typeof BUDGET_FACTS;

const CORE_SECTOR_FACT_IDS = ['education', 'transport', 'healthcare', 'socialSupport'] as const;
const coreSectorTotal = CORE_SECTOR_FACT_IDS.reduce(
  (sum, id) => sum + BUDGET_FACTS[id].amountBillion,
  0,
);

export const TOTAL_EXPENSES_BILLION = BUDGET_FACTS.expenses.amountBillion;

export const BUDGET_SECTORS = [
  { id: 'edu', name: 'Образование', factId: 'education', color: '#2563EB' },
  { id: 'trans', name: 'Транспортная система', factId: 'transport', color: '#8B5CF6' },
  { id: 'health', name: 'Здравоохранение', factId: 'healthcare', color: '#CC1111' },
  { id: 'soc', name: 'Социальная поддержка', factId: 'socialSupport', color: '#10B981' },
  {
    id: 'other',
    name: 'Другие расходы и программы',
    factId: null,
    color: '#F59E0B',
  },
].map((sector) => {
  const amountBillion = sector.factId
    ? BUDGET_FACTS[sector.factId].amountBillion
    : TOTAL_EXPENSES_BILLION - coreSectorTotal;
  return {
    ...sector,
    amountBillion,
    share: Number(((amountBillion / TOTAL_EXPENSES_BILLION) * 100).toFixed(1)),
    status: sector.factId ? ('official' as const) : ('derived' as const),
    sourceId: sector.factId
      ? BUDGET_FACTS[sector.factId].sourceId
      : ('budgetLaw2026' as const),
  };
});

export function getBudgetSource(sourceId: DataSourceId) {
  return DATA_SOURCES[sourceId];
}

export function formatBudgetAmount(amountBillion: number, maximumFractionDigits = 1) {
  const value = amountBillion >= 1000 ? amountBillion / 1000 : amountBillion;
  const unit = amountBillion >= 1000 ? 'трлн ₽' : 'млрд ₽';
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits }).format(value)} ${unit}`;
}
