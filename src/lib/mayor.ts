import type { MayorDistrict } from '../data/quests';

export interface Allocation {
  education: number;
  transport: number;
  healthcare: number;
}

export interface Forecast {
  total: number;
  deficitMln: number;
  /** 0–100, share of the district's limit */
  deficitPct: number;
  comfort: number;
  efficiency: number;
  /** Overspend beyond 8 % of the limit */
  danger: boolean;
}

export interface MeetingOption {
  id: string;
  label: string;
  description: string;
  comfortDelta: number;
  efficiencyDelta: number;
  deficitDelta: number;
}

export interface MeetingEvent {
  title: string;
  body: string;
  options: MeetingOption[];
}

export interface Outcome {
  comfort: number;
  efficiency: number;
  deficitPct: number;
}

// Targets of a decision: comfort and efficiency from 55 %, deficit up to 8 %.
export const TARGET_INDEX = 55;
export const TARGET_DEFICIT = 8;

// Residents' comfort grows with the spheres they ask for; efficiency with transport, education and the reserve.
export function forecast(district: MayorDistrict, plan: Allocation): Forecast {
  const budget = district.budget;
  const weights = district.preferenceMultiplier;
  const total = plan.education + plan.transport + plan.healthcare;
  const deficitMln = Math.max(0, total - budget);
  const deficitPct = Math.min(100, Math.round((deficitMln / budget) * 100));

  const rawComfort = plan.education * weights.education + plan.transport * weights.transport + plan.healthcare * weights.healthcare;
  let comfort = Math.min(100, Math.max(15, Math.round((rawComfort / (budget * 1.45)) * 100)));
  if (total > budget * 1.15) comfort = Math.max(10, comfort - Math.round((total - budget * 1.15) * 0.7));

  const rawEfficiency = plan.transport * 1.4 + plan.education + Math.max(0, budget - total) * 0.5;
  let efficiency = Math.min(100, Math.max(10, Math.round((rawEfficiency / (budget * 1.35)) * 100)));
  if (total > budget * 1.1) efficiency = Math.max(10, efficiency - Math.round((total - budget * 1.1) * 0.9));

  return { total, deficitMln, deficitPct, comfort, efficiency, danger: total > budget * 1.08 };
}

const pct = (value: number) => `${value}\u00A0%`;

// The meeting's dilemma depends on the plan: a deficit, unhappy residents, or a good plan to make public.
export function meetingEvent(district: MayorDistrict, f: Forecast): MeetingEvent {
  if (f.danger) {
    return {
      title: 'Срочное заседание: растёт дефицит',
      body: `В заявке не хватает ${f.deficitMln}\u00A0млн\u00A0₽. Выберите, чем пожертвовать сейчас: скоростью проекта или резервом следующего квартала.`,
      options: [
        { id: 'reserve', label: 'Сохранить резерв', description: 'Снизить нагрузку на бюджет и объяснить перенос части работ.', comfortDelta: -4, efficiencyDelta: 8, deficitDelta: -4 },
        { id: 'speed', label: 'Ускорить проект', description: 'Сохранить темп работ, приняв более высокий риск дефицита.', comfortDelta: 8, efficiencyDelta: -8, deficitDelta: 3 },
      ],
    };
  }
  if (f.comfort < TARGET_INDEX) {
    return {
      title: 'Обратная связь жителей: нужен понятный приоритет',
      body: `Индекс комфорта сейчас ${pct(f.comfort)}. Перед утверждением бюджета выберите, как ответить на запрос «${district.primaryDemand}».`,
      options: [
        { id: 'listen', label: 'Провести слушания', description: 'Добавить адресные меры и объяснить жителям компромисс.', comfortDelta: 8, efficiencyDelta: -3, deficitDelta: 0 },
        { id: 'pace', label: 'Сохранить темп инвестиций', description: 'Удержать темп инфраструктурных работ, оставив коммуникацию на потом.', comfortDelta: 2, efficiencyDelta: 7, deficitDelta: 0 },
      ],
    };
  }
  const lead =
    f.efficiency >= TARGET_INDEX
      ? 'Оба индекса выше проходного ориентира.'
      : `Комфорт выше ориентира, а эффективность пока ${pct(f.efficiency)}.`;
  return {
    title: 'Открытая повестка: как закрепить результат',
    body: `${lead} Выберите публичное действие перед публикацией решения по району ${district.name}.`,
    options: [
      { id: 'open', label: 'Открыть данные', description: 'Опубликовать понятное объяснение приоритетов и ограничений.', comfortDelta: 6, efficiencyDelta: -2, deficitDelta: 0 },
      { id: 'reserve', label: 'Сохранить резерв', description: 'Оставить запас на следующий квартал и снизить риск пересмотра.', comfortDelta: -2, efficiencyDelta: 8, deficitDelta: -1 },
    ],
  };
}

const clamp = (value: number) => Math.min(100, Math.max(0, value));

export const outcome = (f: Forecast, option: MeetingOption): Outcome => ({
  comfort: clamp(f.comfort + option.comfortDelta),
  efficiency: clamp(f.efficiency + option.efficiencyDelta),
  deficitPct: clamp(f.deficitPct + option.deficitDelta),
});

export const passes = (o: Outcome) =>
  o.deficitPct <= TARGET_DEFICIT && o.comfort >= TARGET_INDEX && o.efficiency >= TARGET_INDEX;
