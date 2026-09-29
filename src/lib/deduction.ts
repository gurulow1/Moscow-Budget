import type { Persona } from '../../types';

export interface TaxCalculation {
  education: number;
  sport: number;
  deduction: number;
}

export const DEDUCTION_LIMIT = 150_000;
export const NDFL_RATE = 0.13;
export const EDUCATION_MAX = 300_000;
export const SPORT_MAX = 200_000;
export const AMOUNT_STEP = 5_000;

export const calcDeduction = (education: number, sport: number) =>
  Math.round(Math.min(education + sport, DEDUCTION_LIMIT) * NDFL_RATE);

export const PERSONAS: { id: Persona; label: string; education: number; sport: number; note: string }[] = [
  {
    id: 'Student',
    label: 'Студент',
    education: 45_000,
    sport: 15_000,
    note: 'Стартовый пример: небольшие расходы на своё обучение и спорт.',
  },
  {
    id: 'Professional',
    label: 'Молодой специалист',
    education: 80_000,
    sport: 40_000,
    note: 'Повышение квалификации и физкультурные услуги.',
  },
  {
    id: 'Entrepreneur',
    label: 'Предприниматель',
    education: 110_000,
    sport: 50_000,
    note: 'Только НДФЛ с подходящих доходов: расходы бизнеса, гранты и субсидии не считаются.',
  },
  {
    id: 'Family',
    label: 'Семья с детьми',
    education: 70_000,
    sport: 90_000,
    note: 'Своя учёба и спорт детей: всё вместе упирается в лимит 150 000 ₽. Обучение ребёнка — отдельный лимит 110 000 ₽, здесь его нет.',
  },
];

const rubFormat = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });
export const formatRub = (value: number) => rubFormat.format(value);
