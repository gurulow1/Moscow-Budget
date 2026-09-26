import { BUDGET_FACTS, formatBudgetAmount } from '../data/budgetFacts';
import { BUDGET_SECTORS } from '../data/budgetFacts';

// Ready answers from the open data, matched by word stems: used when the AI helper is unavailable.

export interface HelperAction {
  label: string;
  /** An app address, e.g. #quests/daily */
  href: string;
}

export interface HelperAnswer {
  text: string;
  action?: HelperAction;
}

const NB = '\u00A0';
const bn = (value: number) => `${value.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}${NB}млрд${NB}₽`;
const share = (id: string) => `${BUDGET_SECTORS.find((sector) => sector.id === id)!.share.toLocaleString('ru-RU')}${NB}%`;
const has = (text: string, stems: string[]) => stems.some((stem) => text.includes(stem));

const TO_DATA: HelperAction = { label: 'Куда идут деньги', href: '#data' };

export const TOUR_STEMS = ['экскурси', 'гид', 'обучени', 'фини'];

// Actions the AI may attach to an answer (the server returns only the id).
export type HelperActionId = 'calc' | 'data' | 'quiz' | 'mayor';

export const ACTION_LINKS: Record<HelperActionId, HelperAction> = {
  calc: { label: 'Рассчитать вычет', href: '#calc' },
  data: TO_DATA,
  quiz: { label: 'Начать квиз дня', href: '#quests/daily' },
  mayor: { label: 'Сыграть в «Виртуального мэра»', href: '#quests/mayor' },
};

export function answer(query: string): HelperAnswer {
  const s = query.toLowerCase();

  if (has(s, ['викторин', 'квиз', 'тест', 'игр', 'вызов'])) {
    return {
      text: 'Квиз дня — три вопроса из проверенного банка, одна подборка на весь день. За верный ответ — 5 баллов городского пилота, за пройденный квиз — учебные баллы.',
      action: { label: 'Начать квиз дня', href: '#quests/daily' },
    };
  }

  if (has(s, ['мэр', 'район', 'округ'])) {
    return {
      text: 'В игре **«Виртуальный мэр»** вы распределяете бюджет района между образованием, транспортом и здоровьем, а затем проводите заседание. За принятый сценарий — знак района.',
      action: { label: 'Сыграть в «Виртуального мэра»', href: '#quests/mayor' },
    };
  }

  if (has(s, ['вычет', 'ндфл', 'возврат'])) {
    return {
      text: `Общий лимит для большинства социальных вычетов — **150${NB}000${NB}₽** в год, на обучение ребёнка — **110${NB}000${NB}₽** на обоих родителей. Вернуть можно до 13 % от расходов в пределах лимита, но не больше уплаченного НДФЛ. Источник: ФНС России.`,
      action: { label: 'Рассчитать вычет', href: '#calc' },
    };
  }

  if (has(s, ['транспорт', 'метро', 'электробус', 'дорог', 'мцд', 'бкл', 'трамва'])) {
    return {
      text: `На развитие транспортной системы в 2026 году — **${bn(BUDGET_FACTS.transport.amountBillion)}**, это ${share('trans')} всех расходов и крупнейшая программа бюджета. Источник: Открытый бюджет Москвы.`,
      action: TO_DATA,
    };
  }

  if (has(s, ['социал', 'пенси', 'льгот', 'выплат', 'семь', 'поддержк', 'долголет'])) {
    return {
      text: `На социальную сферу в широком смысле предусмотрено около **${formatBudgetAmount(BUDGET_FACTS.socialSphere.amountBillion)}** — примерно половина расходов. Из них программа социальной поддержки жителей — **${bn(BUDGET_FACTS.socialSupport.amountBillion)}**. Источник: Открытый бюджет Москвы.`,
      action: TO_DATA,
    };
  }

  if (has(s, ['школ', 'колледж', 'детск', 'образован', 'мэш', 'вуз'])) {
    return {
      text: `На развитие образования в 2026 году — **${bn(BUDGET_FACTS.education.amountBillion)}**, это ${share('edu')} всех расходов. Источник: Открытый бюджет Москвы.`,
      action: TO_DATA,
    };
  }

  if (has(s, ['больниц', 'клиник', 'поликлин', 'врач', 'здоров', 'медицин', 'емиас', 'лекарств'])) {
    return {
      text: `На развитие здравоохранения — **${bn(BUDGET_FACTS.healthcare.amountBillion)}** без учёта оплаты медицинской помощи из Фонда ОМС. Источник: Открытый бюджет Москвы.`,
      action: TO_DATA,
    };
  }

  if (has(s, ['промышлен', 'инвест', 'завод', 'технопарк', 'субсид', 'бизнес', 'цифров', 'инновац'])) {
    return {
      text: `На программу «Экономическое развитие и инвестиционная привлекательность» в 2026 году — **226,5${NB}млрд${NB}₽**, на развитие цифровой среды и инноваций — **${bn(BUDGET_FACTS.digital.amountBillion)}**. Условия конкретной поддержки смотрите на страницах программ.`,
    };
  }

  if (has(s, ['эколог', 'парк', 'озелен', 'дерев', 'воздух', 'река', 'двор', 'благоустр', 'городск'])) {
    return {
      text: `На программу «Развитие городской среды» — **${bn(BUDGET_FACTS.urbanEnvironment.amountBillion)}**. Состав мероприятий — в официальной программе на budget.mos.ru.`,
    };
  }

  if (has(s, ['спорт', 'лужник', 'площадк', 'тренир', 'арен', 'фитнес'])) {
    return {
      text: `На программу «Спорт Москвы» в 2026 году — **${bn(BUDGET_FACTS.sport.amountBillion)}**. Источник: Открытый бюджет Москвы.`,
    };
  }

  if (has(s, ['доход', 'бюджет', 'налог', 'дефицит', 'расход', 'деньг', 'сколько'])) {
    return {
      text: `Бюджет Москвы на 2026 год: доходы — **${formatBudgetAmount(BUDGET_FACTS.income.amountBillion, 2)}**, расходы — **${formatBudgetAmount(BUDGET_FACTS.expenses.amountBillion, 2)}**, дефицит — **${bn(BUDGET_FACTS.deficit.amountBillion)}**. Источник: Закон Москвы № 39 от 01.11.2025.`,
      action: TO_DATA,
    };
  }

  return {
    text: 'Пока я отвечаю готовыми справками по темам: **бюджет**, **вычет**, **транспорт**, **образование**, **здоровье**, **соцподдержка**, **городская среда**, **спорт**. Первичные данные — на budget.mos.ru, о вычетах — на nalog.gov.ru.',
  };
}

export const SUGGESTIONS = [
  'Каков бюджет Москвы?',
  'Как получить налоговый вычет?',
  'Сколько тратится на транспорт?',
  'Что с образованием?',
  'Здравоохранение',
  'Соцподдержка',
  'Городская среда',
  'Сыграть в квиз',
];
