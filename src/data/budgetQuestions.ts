import { BUDGET_FACTS, formatBudgetAmount, type DataSourceId } from './budgetFacts';

export interface BudgetQuestion {
  id: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  topic: string;
  reward: number;
  sourceId: DataSourceId;
}

// Curated facts only. Budget figures come from Moscow Law No. 39 of 01.11.2025
// and the Open Budget of Moscow overview for 2026. Deduction limits come from FNS.
export const BUDGET_QUESTIONS_BANK: BudgetQuestion[] = [
  {
    id: 'budget-income-2026',
    sourceId: 'budgetParameters2026',
    question: 'Какой объём доходов предусмотрен бюджетом Москвы на 2026 год?',
    options: [`Около ${formatBudgetAmount(BUDGET_FACTS.income.amountBillion, 2)}`, `Около ${formatBudgetAmount(BUDGET_FACTS.socialSphere.amountBillion, 2)}`, `Около ${formatBudgetAmount(BUDGET_FACTS.deficit.amountBillion, 2)}`],
    correct: 0,
    explanation: `План доходов на 2026 год — ${formatBudgetAmount(BUDGET_FACTS.income.amountBillion)}. Источник: Закон города Москвы № 39 от 01.11.2025.`,
    topic: 'Параметры бюджета',
    reward: 50,
  },
  {
    id: 'budget-expenses-2026',
    sourceId: 'budgetLaw2026',
    question: 'Какой объём расходов предусмотрен бюджетом Москвы на 2026 год?',
    options: [`Около ${formatBudgetAmount(BUDGET_FACTS.income.amountBillion, 2)}`, `Около ${formatBudgetAmount(BUDGET_FACTS.expenses.amountBillion, 2)}`, `Около ${formatBudgetAmount(BUDGET_FACTS.socialSupport.amountBillion, 2)}`],
    correct: 1,
    explanation: `План расходов на 2026 год — ${formatBudgetAmount(BUDGET_FACTS.expenses.amountBillion)}. Источник: Закон города Москвы № 39 от 01.11.2025.`,
    topic: 'Параметры бюджета',
    reward: 50,
  },
  {
    id: 'budget-deficit-2026',
    sourceId: 'budgetLaw2026',
    question: 'Каков плановый дефицит бюджета Москвы на 2026 год?',
    options: [formatBudgetAmount(BUDGET_FACTS.deficit.amountBillion), '44,8 млрд ₽', formatBudgetAmount(BUDGET_FACTS.transport.amountBillion, 2)],
    correct: 0,
    explanation: `Разница между плановыми расходами и доходами составляет ${formatBudgetAmount(BUDGET_FACTS.deficit.amountBillion)}.`,
    topic: 'Параметры бюджета',
    reward: 50,
  },
  {
    id: 'social-sphere-2026',
    sourceId: 'openBudget2026',
    question: 'Сколько в 2026 году планируется направить на социальную сферу Москвы в целом?',
    options: [`Около ${formatBudgetAmount(BUDGET_FACTS.socialSupport.amountBillion, 2)}`, `Около ${formatBudgetAmount(BUDGET_FACTS.socialSphere.amountBillion, 2)}`, `Около ${formatBudgetAmount(BUDGET_FACTS.expenses.amountBillion, 2)}`],
    correct: 1,
    explanation: `На социальную сферу в широком смысле предусмотрено около ${formatBudgetAmount(BUDGET_FACTS.socialSphere.amountBillion)} — примерно половина расходов бюджета.`,
    topic: 'Социальная сфера',
    reward: 50,
  },
  {
    id: 'education-2026',
    sourceId: 'openBudget2026',
    question: 'Какой объём предусмотрен на программу развития образования Москвы в 2026 году?',
    options: [formatBudgetAmount(BUDGET_FACTS.healthcare.amountBillion), formatBudgetAmount(BUDGET_FACTS.education.amountBillion), formatBudgetAmount(BUDGET_FACTS.sport.amountBillion)],
    correct: 1,
    explanation: `На развитие образования предусмотрено ${formatBudgetAmount(BUDGET_FACTS.education.amountBillion)}. Источник: портал «Открытый бюджет Москвы».`,
    topic: 'Образование',
    reward: 50,
  },
  {
    id: 'health-2026',
    sourceId: 'openBudget2026',
    question: 'Какой объём предусмотрен на развитие здравоохранения Москвы в 2026 году?',
    options: [formatBudgetAmount(BUDGET_FACTS.healthcare.amountBillion), formatBudgetAmount(BUDGET_FACTS.socialSupport.amountBillion), formatBudgetAmount(BUDGET_FACTS.digital.amountBillion)],
    correct: 0,
    explanation: `На развитие здравоохранения предусмотрено ${formatBudgetAmount(BUDGET_FACTS.healthcare.amountBillion)} без учёта оплаты медицинской помощи из Фонда ОМС.`,
    topic: 'Здравоохранение',
    reward: 50,
  },
  {
    id: 'social-support-2026',
    sourceId: 'openBudget2026',
    question: 'Какой объём предусмотрен на социальную поддержку жителей Москвы в 2026 году?',
    options: [formatBudgetAmount(BUDGET_FACTS.urbanEnvironment.amountBillion), formatBudgetAmount(BUDGET_FACTS.socialSupport.amountBillion), formatBudgetAmount(BUDGET_FACTS.education.amountBillion)],
    correct: 1,
    explanation: `На программу социальной поддержки жителей предусмотрено ${formatBudgetAmount(BUDGET_FACTS.socialSupport.amountBillion)}.`,
    topic: 'Социальная поддержка',
    reward: 50,
  },
  {
    id: 'digital-2026',
    sourceId: 'openBudget2026',
    question: 'Сколько предусмотрено на развитие цифровой среды и инноваций Москвы в 2026 году?',
    options: ['96,7 млрд ₽', formatBudgetAmount(BUDGET_FACTS.digital.amountBillion), formatBudgetAmount(BUDGET_FACTS.healthcare.amountBillion)],
    correct: 1,
    explanation: `Плановый объём программы развития цифровой среды и инноваций — ${formatBudgetAmount(BUDGET_FACTS.digital.amountBillion)}.`,
    topic: 'Цифровизация',
    reward: 50,
  },
  {
    id: 'urban-environment-2026',
    sourceId: 'openBudget2026',
    question: 'Сколько предусмотрено на развитие городской среды Москвы в 2026 году?',
    options: [formatBudgetAmount(BUDGET_FACTS.urbanEnvironment.amountBillion), '149,2 млрд ₽', formatBudgetAmount(BUDGET_FACTS.socialSupport.amountBillion)],
    correct: 0,
    explanation: `На развитие городской среды предусмотрено ${formatBudgetAmount(BUDGET_FACTS.urbanEnvironment.amountBillion)}.`,
    topic: 'Городская среда',
    reward: 50,
  },
  {
    id: 'sport-2026',
    sourceId: 'openBudget2026',
    question: 'Сколько предусмотрено на программу «Спорт Москвы» в 2026 году?',
    options: ['118,6 млрд ₽', formatBudgetAmount(BUDGET_FACTS.sport.amountBillion), '303,6 млрд ₽'],
    correct: 1,
    explanation: `На программу «Спорт Москвы» предусмотрено ${formatBudgetAmount(BUDGET_FACTS.sport.amountBillion)}.`,
    topic: 'Спорт',
    reward: 50,
  },
  {
    id: 'budget-period',
    sourceId: 'budgetLaw2026',
    question: 'На какой период принят действующий закон о бюджете Москвы?',
    options: ['Только на 2026 год', 'На 2026 год и плановый период 2027–2028 годов', 'На 2026–2030 годы'],
    correct: 1,
    explanation: 'Закон устанавливает бюджет на 2026 год и плановые показатели на 2027 и 2028 годы.',
    topic: 'Бюджетный процесс',
    reward: 50,
  },
  {
    id: 'official-portal',
    sourceId: 'budgetParameters2026',
    question: 'Где опубликованы интерактивные данные о бюджете Москвы?',
    options: ['budget.mos.ru', 'nalog.gov.ru', 'cbr.ru'],
    correct: 0,
    explanation: 'Официальный городской источник — портал «Открытый бюджет Москвы» budget.mos.ru.',
    topic: 'Открытые данные',
    reward: 50,
  },
  {
    id: 'social-deduction-limit',
    sourceId: 'fnsSocialDeduction',
    question: 'Каков общий лимит расходов для большинства социальных налоговых вычетов начиная с расходов 2024 года?',
    options: ['120 000 ₽', '150 000 ₽', '250 000 ₽'],
    correct: 1,
    explanation: 'ФНС указывает общий лимит 150 000 ₽; отдельные виды расходов имеют особые правила.',
    topic: 'Налоговые вычеты',
    reward: 50,
  },
  {
    id: 'child-education-limit',
    sourceId: 'fnsSocialDeduction',
    question: 'Какой лимит расходов на обучение одного ребёнка учитывается для социального вычета?',
    options: ['50 000 ₽', '110 000 ₽', '150 000 ₽'],
    correct: 1,
    explanation: 'Лимит составляет 110 000 ₽ на ребёнка в общей сумме на обоих родителей. Источник: ФНС России.',
    topic: 'Налоговые вычеты',
    reward: 50,
  },
  {
    id: 'deduction-caveat',
    sourceId: 'fnsSocialDeduction',
    question: 'Всегда ли социальный вычет означает возврат ровно 13% от расходов?',
    options: ['Да, без исключений', 'Нет, возврат зависит от налоговой базы, ставки и уплаченного НДФЛ', 'Возврат не связан с НДФЛ'],
    correct: 1,
    explanation: 'Калькулятор может дать ориентир, но фактическая сумма зависит от конкретной налоговой ситуации.',
    topic: 'Налоговые вычеты',
    reward: 50,
  },
];

export function getRandomBudgetQuestion(): BudgetQuestion {
  const index = Math.floor(Math.random() * BUDGET_QUESTIONS_BANK.length);
  return BUDGET_QUESTIONS_BANK[index];
}
