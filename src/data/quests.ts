import { BUDGET_QUESTIONS_BANK } from './budgetQuestions';
import { BUDGET_FACTS, DATA_SOURCES, formatBudgetAmount, type DataSourceId } from './budgetFacts';
import { readStoredStringArray, safeLocalStorage } from '../lib/utils';

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  topic?: string;
  sourceId?: DataSourceId;
}

export type Difficulty = 'Лёгкий' | 'Средний' | 'Сложный';

export interface Quiz {
  id: string;
  title: string;
  reward: number;
  topic: string;
  difficulty: Difficulty;
  questions: QuizQuestion[];
}

export const QUIZZES: Quiz[] = [
  {
    id: 'quiz-1',
    title: 'Доходы бюджета Москвы',
    reward: 100,
    topic: 'Ключевые параметры бюджета Москвы на 2026 год',
    difficulty: 'Лёгкий',
    questions: [
      {
        question: 'Какой объём доходов предусмотрен бюджетом Москвы на 2026 год?',
        options: [formatBudgetAmount(BUDGET_FACTS.income.amountBillion), formatBudgetAmount(BUDGET_FACTS.socialSphere.amountBillion), formatBudgetAmount(BUDGET_FACTS.deficit.amountBillion)],
        correct: 0,
        explanation: `План доходов — ${formatBudgetAmount(BUDGET_FACTS.income.amountBillion)} по Закону города Москвы № 39 от 01.11.2025.`,
        sourceId: BUDGET_FACTS.income.sourceId,
      },
      {
        question: 'Какой объём расходов предусмотрен бюджетом Москвы на 2026 год?',
        options: [formatBudgetAmount(BUDGET_FACTS.expenses.amountBillion), formatBudgetAmount(BUDGET_FACTS.socialSupport.amountBillion), formatBudgetAmount(BUDGET_FACTS.income.amountBillion)],
        correct: 0,
        explanation: `План расходов — ${formatBudgetAmount(BUDGET_FACTS.expenses.amountBillion)}.`,
        sourceId: BUDGET_FACTS.expenses.sourceId,
      },
      {
        question: 'Каков плановый дефицит бюджета Москвы на 2026 год?',
        options: [formatBudgetAmount(BUDGET_FACTS.deficit.amountBillion), '44,8 млрд ₽', formatBudgetAmount(BUDGET_FACTS.transport.amountBillion)],
        correct: 0,
        explanation: `Плановый дефицит составляет ${formatBudgetAmount(BUDGET_FACTS.deficit.amountBillion)} — разницу между расходами и доходами.`,
        sourceId: BUDGET_FACTS.deficit.sourceId,
      },
    ],
  },
  {
    id: 'quiz-2',
    title: 'Расходы на промышленность и субсидии',
    reward: 120,
    topic: 'ГРБС, Фонды развития и промышленное импортозамещение',
    difficulty: 'Средний',
    questions: [
      {
        question: 'Какая ключевая цель предоставления субсидий промышленным организациям из бюджета Москвы?',
        options: ['Возмещение затрат на покупку оборудования и импортозамещение', 'Оплата рекламных кампаний за рубежом', 'Покрытие штрафов предприятий'],
        correct: 0,
        explanation: 'Субсидии Москвы направлены на модернизацию производств, компенсацию процентов по кредитам на оборудование и развитие инжиниринга.',
      },
      {
        question: 'Что такое ГРБС в контексте распределения промышленных субсидий?',
        options: ['Государственный реестр банковских счетов', 'Главный распорядитель бюджетных средств', 'Городской совет по бюджетным спорам'],
        correct: 1,
        explanation: 'ГРБС (например, Департамент инвестиционной и промышленной политики) распределяет лимиты бюджетных обязательств до конечных получателей.',
      },
      {
        question: 'В какой форме чаще всего предоставляется финансовая поддержка ИТ-промышленности Москвы?',
        options: ['Прямой выкуп акций', 'Гранты Мэра и льготные займы под пониженный % через Фонд развития промышленности', 'Выдача наличных денег'],
        correct: 1,
        explanation: 'Московский Фонд развития промышленности предоставляет целевые займы по ставкам значительно ниже банковских.',
      },
    ],
  },
  {
    id: 'quiz-3',
    title: 'Налоговые вычеты и НДФЛ 2026',
    reward: 100,
    topic: 'Индексация социальных вычетов, лимиты и правила возврата',
    difficulty: 'Сложный',
    questions: [
      {
        question: 'Каков совокупный лимит для социальных налоговых вычетов (обучение, спорт, медицина) введен в действие?',
        options: ['120 000 рублей', '150 000 рублей', '250 000 рублей'],
        correct: 1,
        explanation: 'В рамках обновленного законодательства лимит увеличен со 120 тыс. до 150 тыс. рублей.',
        sourceId: 'fnsSocialDeduction',
      },
      {
        question: 'Какую максимальную сумму чистыми можно вернуть за год за свое обучение при ставке НДФЛ 13%?',
        options: ['15 600 рублей', '19 500 рублей', '50 000 рублей'],
        correct: 1,
        explanation: '13% от максимального лимита в 150 000 рублей составляет ровно 19 500 рублей.',
        sourceId: 'fnsSocialDeduction',
      },
      {
        question: 'В течение какого срока после окончания года можно подать декларацию 3-НДФЛ на вычет?',
        options: ['В течение 6 месяцев', 'В течение 3 лет', 'Только до 30 апреля следующего года'],
        correct: 1,
        explanation: 'Налогоплательщик имеет право вернуть излишне уплаченный налог в течение 3 лет с момента понесенных расходов.',
        sourceId: 'fnsSocialDeduction',
      },
    ],
  },
  {
    id: 'quiz-4',
    title: 'Государственные программы Москвы',
    reward: 110,
    topic: 'Расходование бюджета, транспорт, здравоохранение и образование',
    difficulty: 'Средний',
    questions: [
      {
        question: 'Какая программа занимает лидирующие позиции по объему финансирования в бюджете Москвы?',
        options: ['Развитие транспортной системы', 'Развитие культурно-туристической среды', 'Стимулирование экономической активности'],
        correct: 0,
        explanation: `Транспортная система — крупнейшая из перечисленных программ: ${formatBudgetAmount(BUDGET_FACTS.transport.amountBillion)} в 2026 году.`,
        sourceId: BUDGET_FACTS.transport.sourceId,
      },
      {
        question: 'На основе какого документа формируется программный бюджет города Москвы?',
        options: ['На основе устных поручений', 'На основе 3-летнего Закона о бюджете города Москвы', 'На основе годовых отчетов коммерческих банков'],
        correct: 1,
        explanation: 'Бюджет Москвы утверждается Московской городской Думой на очередной финансовый год и плановый период.',
        sourceId: 'budgetLaw2026',
      },
      {
        question: 'Какой объём предусмотрен на развитие здравоохранения Москвы в 2026 году?',
        options: [formatBudgetAmount(BUDGET_FACTS.healthcare.amountBillion), formatBudgetAmount(BUDGET_FACTS.sport.amountBillion), '96,7 млрд ₽'],
        correct: 0,
        explanation: `На развитие здравоохранения предусмотрено ${formatBudgetAmount(BUDGET_FACTS.healthcare.amountBillion)} без учёта оплаты медицинской помощи из Фонда ОМС.`,
        sourceId: BUDGET_FACTS.healthcare.sourceId,
      },
    ],
  },
  {
    id: 'quiz-5',
    title: 'Открытые данные и бюджетный процесс',
    reward: 100,
    topic: 'Официальные источники и период бюджетного планирования',
    difficulty: 'Лёгкий',
    questions: [
      {
        question: 'Какой документ устанавливает ключевые параметры бюджета Москвы на 2026 год?',
        options: ['Закон города Москвы № 39 от 01.11.2025', 'Письмо ФНС', 'Решение коммерческого банка'],
        correct: 0,
        explanation: 'Доходы, расходы и дефицит установлены Законом города Москвы № 39 от 1 ноября 2025 года.',
        sourceId: 'budgetLaw2026',
      },
      {
        question: 'Где опубликованы интерактивные данные о бюджете Москвы?',
        options: ['budget.mos.ru', 'nalog.gov.ru', 'cbr.ru'],
        correct: 0,
        explanation: 'Официальный городской источник — портал «Открытый бюджет Москвы» budget.mos.ru.',
        sourceId: 'budgetParameters2026',
      },
      {
        question: 'На какой период принят Закон города Москвы № 39?',
        options: ['Только на 2026 год', 'На 2026 год и плановый период 2027–2028 годов', 'До 2030 года'],
        correct: 1,
        explanation: 'Закон устанавливает бюджет на 2026 год и плановые показатели на 2027 и 2028 годы.',
        sourceId: 'budgetLaw2026',
      },
    ],
  },
];

// A quiz opens after another one is passed.
export const QUIZ_PREREQUISITE: Record<string, string> = { 'quiz-4': 'quiz-1', 'quiz-5': 'quiz-2' };

// A quiz counts when at least 60 % of the answers are right: 2 of 3.
export const passMark = (questionCount: number) => Math.ceil(questionCount * 0.6);

export const getMoscowDateKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(new Date());

export const DAILY_QUIZ_REWARD = 150;
export const PILOT_POINTS_PER_ANSWER = 5;

// One pick for everybody for the whole Moscow day, so the city pilot compares like with like.
export function getDailyQuiz(): Quiz {
  const dateKey = getMoscowDateKey();
  const seed = Number(dateKey.replaceAll('-', ''));
  const count = Math.min(3, BUDGET_QUESTIONS_BANK.length);
  return {
    id: `daily-quiz-${dateKey}`,
    title: 'Квиз дня',
    reward: DAILY_QUIZ_REWARD,
    topic: 'Подборка дня из проверенного банка вопросов',
    difficulty: 'Средний',
    questions: Array.from({ length: count }, (_, offset) => {
      const item = BUDGET_QUESTIONS_BANK[(seed + offset * 7) % BUDGET_QUESTIONS_BANK.length];
      return {
        question: item.question,
        options: item.options,
        correct: item.correct,
        explanation: item.explanation,
        topic: item.topic,
        sourceId: item.sourceId,
      };
    }),
  };
}

export const isDailyQuizId = (id: string) => id.startsWith('daily-quiz-');

// The bank lists the right answer first in several questions; each run shows the options in a new order.
export function shuffleOptions(question: QuizQuestion): QuizQuestion {
  const order = question.options.map((_, index) => index);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { ...question, options: order.map((index) => question.options[index]), correct: order.indexOf(question.correct) };
}

const SOURCE_SHORT: Record<DataSourceId, string> = {
  budgetLaw2026: 'Закон Москвы № 39',
  openBudget2026: 'Открытый бюджет Москвы',
  budgetParameters2026: 'Открытый бюджет Москвы',
  fnsSocialDeduction: 'ФНС России',
};

export function sourceLink(id: DataSourceId) {
  const source = DATA_SOURCES[id];
  return { label: SOURCE_SHORT[id], url: source.url, checked: source.checkedAt.split('-').reverse().join('.') };
}

// ---------- City pilot: 5 points per right answer in the first daily quiz of the day ----------

export interface DailyEntry {
  date: string;
  quizId: string;
  correctAnswers: number;
  points: number;
}

export interface CityRewardLedger {
  streak: number;
  entries: DailyEntry[];
}

const LEDGER_KEY = 'mos_city_rewards_preview_v1';

export function readLedger(): CityRewardLedger {
  const raw = safeLocalStorage.getItem(LEDGER_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as CityRewardLedger;
      if (Number.isFinite(parsed.streak) && Array.isArray(parsed.entries)) return parsed;
    } catch {
      // Ignore stale prototype data.
    }
  }
  return { streak: 0, entries: [] };
}

export const saveLedger = (ledger: CityRewardLedger) => safeLocalStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));

const dayGap = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

export const todayEntry = (ledger: CityRewardLedger) => ledger.entries.find((entry) => entry.date === getMoscowDateKey()) ?? null;

// The first result of the day counts; a retry the same day changes nothing.
export function withDailyResult(ledger: CityRewardLedger, quizId: string, correctAnswers: number): CityRewardLedger {
  const today = getMoscowDateKey();
  if (ledger.entries.some((entry) => entry.date === today)) return ledger;
  const previous = ledger.entries.at(-1)?.date;
  return {
    streak: previous && dayGap(previous, today) === 1 ? ledger.streak + 1 : 1,
    entries: [...ledger.entries, { date: today, quizId, correctAnswers, points: correctAnswers * PILOT_POINTS_PER_ANSWER }],
  };
}

// A streak is alive while the last quiz was today or yesterday.
export function liveStreak(ledger: CityRewardLedger) {
  const last = ledger.entries.at(-1)?.date;
  return last && dayGap(last, getMoscowDateKey()) <= 1 ? ledger.streak : 0;
}

// ---------- Mini-games and special projects (still in the legacy layout) ----------

export interface QuestItem {
  id: string;
  title: string;
  text: string;
  reward?: number;
}

export const GAMES: QuestItem[] = [
  { id: 'game-1', title: 'Балансировщик бюджета', text: 'Не меньше 50\u00A0% — на социальную сферу', reward: 150 },
  { id: 'game-2', title: 'Финансовый аудитор', text: 'Найдите нарушение в трёх расходных ордерах', reward: 150 },
  { id: 'game-3', title: 'Инвест-стратег', text: 'Оцените приоритеты научно-производственного развития', reward: 150 },
  { id: 'game-4', title: 'Вычет-клик', text: 'Соберите черновик 3-НДФЛ в пределах лимита', reward: 150 },
  { id: 'game-5', title: 'Вектор развития', text: 'Настройте условия промышленных субсидий', reward: 150 },
];

export const SPECIALS: QuestItem[] = [
  { id: 'special-1', title: 'Профиль городских потребностей', text: 'Выберите темы бюджета, которые вам ближе', reward: 80 },
  { id: 'special-2', title: 'Фискальный эксперт 3-НДФЛ', text: 'Подтвердите расходы больше 100\u00A0000\u00A0₽ в год', reward: 120 },
  { id: 'special-3', title: 'Аналитический сёрфинг', text: 'Проверьте расходы на здравоохранение и транспорт', reward: 100 },
];

// Topics chosen in «Профиль городских потребностей»; shown in the profile.
export const INTERESTS = [
  { id: 'transport', label: 'Транспорт', text: 'Метро, МЦД, электробусы и дороги' },
  { id: 'education', label: 'Образование', text: 'Школы, колледжи и вузы' },
  { id: 'health', label: 'Здоровье и спорт', text: 'Поликлиники, больницы и спортплощадки' },
  { id: 'social', label: 'Соцподдержка', text: 'Выплаты, льготы, «Московское долголетие»' },
  { id: 'city', label: 'Городская среда', text: 'Парки, дворы и благоустройство' },
];

const INTERESTS_KEY = 'mos_interests_v1';

export const readInterests = () => readStoredStringArray(INTERESTS_KEY).filter((id) => INTERESTS.some((item) => item.id === id));
export const saveInterests = (ids: string[]) => safeLocalStorage.setItem(INTERESTS_KEY, JSON.stringify(ids));

export const MAP_ITEM: QuestItem ={ id: 'map', title: 'Карта районов', text: 'Пять районов и их программы · демо-данные' };

// ---------- Виртуальный мэр ----------

export interface MayorDistrict {
  id: string;
  name: string;
  coatOfArms: string;
  description: string;
  /** Millions of rubles */
  budget: number;
  primaryDemand: string;
  preferenceMultiplier: { education: number; transport: number; healthcare: number };
  mainProject: string;
  revenueFromNdfMln: number;
  unemploymentRate: string;
}

export const MAYOR_DISTRICTS: MayorDistrict[] = [
  {
    id: 'hamovniki',
    name: 'Хамовники',
    coatOfArms: '🏰',
    description: 'Престижный исторический район Москвы с высокой плотностью университетов (МПГУ, Сеченовка) и культурных объектов. Требует высочайшего качества школьного образования и бережной интеграции спортплощадок.',
    budget: 150,
    primaryDemand: 'Модернизация школ и ИТ-классов',
    preferenceMultiplier: { education: 1.6, transport: 0.8, healthcare: 1.1 },
    mainProject: 'Капремонт лицейских корпусов',
    revenueFromNdfMln: 850,
    unemploymentRate: '0.12%',
  },
  {
    id: 'sokolniki',
    name: 'Сокольники',
    coatOfArms: '🌲',
    description: 'Главные «зелёные легкие» Восточного округа Москвы. Сердцем района является легендарный парк Сокольники. Население ждет расширения спортивных зон для воркаута и экологического мониторинга.',
    budget: 100,
    primaryDemand: 'Экологический контроль и уличный спорт',
    preferenceMultiplier: { education: 0.9, transport: 0.9, healthcare: 1.7 },
    mainProject: 'Эко-велокольцо и спортивный кластер',
    revenueFromNdfMln: 420,
    unemploymentRate: '0.18%',
  },
  {
    id: 'tverskoy',
    name: 'Тверской',
    coatOfArms: '🔔',
    description: 'Самое сердце столицы. Главный узел наземного и подземного общественного транспорта. Огромный ежедневный туристический и деловой поток требует беспрецедентного финансирования инфраструктуры.',
    budget: 200,
    primaryDemand: 'Электробусы и умные остановки',
    preferenceMultiplier: { education: 0.7, transport: 1.8, healthcare: 1.0 },
    mainProject: 'Транспортная хорда и эко-электробусы',
    revenueFromNdfMln: 1450,
    unemploymentRate: '0.08%',
  },
  {
    id: 'krylatskoe',
    name: 'Крылатское',
    coatOfArms: '🚴',
    description: 'Живописный и экологичный район на западе Москвы, известный велодорогой, олимпийскими спортобъектами и холмами. Жители ценят здоровый образ жизни и чистоту.',
    budget: 80,
    primaryDemand: 'Горнолыжный спуск и велополоса',
    preferenceMultiplier: { education: 1.1, transport: 0.7, healthcare: 1.6 },
    mainProject: 'Реновация олимпийского велотрека',
    revenueFromNdfMln: 480,
    unemploymentRate: '0.15%',
  },
  {
    id: 'vyhino',
    name: 'Выхино-Жулебино',
    coatOfArms: '🚉',
    description: 'Один из наиболее населенных спальных районов Москвы на юго-востоке. Важнейшая транспортная артерия «Выхино» испытывает пиковые логистические нагрузки спального квартала.',
    budget: 120,
    primaryDemand: 'Развязка ТПУ и школы в новых кварталах',
    preferenceMultiplier: { education: 1.2, transport: 1.5, healthcare: 0.9 },
    mainProject: 'Развитие мультимодального ТПУ',
    revenueFromNdfMln: 590,
    unemploymentRate: '0.22%',
  },
];

// District badges («Инвестор …») for accepted mayor scenarios.
const BADGES_KEY = 'mos_unlocked_nfts_v3';

export const readDistrictBadges = () => readStoredStringArray(BADGES_KEY);

export function addDistrictBadge(districtId: string) {
  const badges = readDistrictBadges();
  if (!badges.includes(districtId)) safeLocalStorage.setItem(BADGES_KEY, JSON.stringify([...badges, districtId]));
}

// ---------- Route: my situation → decision → check ----------

export const isMayorWin = (id: string) => id.startsWith('mayor-success-');

export function routeSteps(calculatorDone: boolean, completedActivities: string[]) {
  return [
    { id: 'calc', label: 'Моя ситуация', done: calculatorDone },
    { id: 'mayor', label: 'Решение', done: completedActivities.some(isMayorWin) },
    { id: 'quiz', label: 'Проверка', done: completedActivities.some((id) => id.startsWith('quiz-')) },
  ] as const;
}
