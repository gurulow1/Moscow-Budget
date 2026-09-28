// The start-screen scenes: words, colours and button look of each, their order, and which one this visit shows.
// One fact per scene: no number in an eyebrow, headline or caption appears in two scenes.
import type { AppTab } from '../../ui/TabBar';
import { safeLocalStorage } from '../../lib/utils';
import { NB, type MountScene } from './kit';
import { mountBlocks } from './scenes/blocks';
import { mountBoard } from './scenes/board';
import { mountFifth } from './scenes/fifth';
import { mountForecast } from './scenes/forecast';
import { mountGalton } from './scenes/galton';
import { mountGlass } from './scenes/glass';
import { YEAR, mountHourglass } from './scenes/hourglass';
import { mountReceipt } from './scenes/receipt';
import { mountRing } from './scenes/ring';
import { mountScales } from './scenes/scales';
import { mountScoreboard } from './scenes/scoreboard';
import { mountSecond } from './scenes/second';
import { mountSpace } from './scenes/space';

type TokenName = 'bg' | 'ink' | 'ink-2' | 'ink-3' | 'line' | 'btn-bg' | 'btn-fg' | 'link' | 'mark';
export type Tokens = Record<TokenName, string>;

export interface SceneDef {
  mount: MountScene;
  /** How the main button is dressed (see splash.css). */
  skin: 'glass' | 'ink' | 'board' | 'white' | 'red';
  cta: string;
  /** The tab the main button opens; the app's current tab when not set. */
  target?: AppTab;
  /** Seconds the scene plays before the frame's words appear. */
  pre?: number;
  eyebrow: string;
  headline: string;
  caption: string;
  note: string;
  day: Partial<Tokens>;
  night: Partial<Tokens>;
}

const BASE: { day: Tokens; night: Tokens } = {
  day: { bg: '#FCFCFD', ink: '#0E1524', 'ink-2': '#4B566E', 'ink-3': '#6B7590', line: 'rgba(14, 21, 36, 0.1)', 'btn-bg': '#D6263A', 'btn-fg': '#FFFFFF', link: '#D6263A', mark: '#D6263A' },
  night: { bg: '#08090D', ink: '#F2F4F8', 'ink-2': '#A2ABBE', 'ink-3': '#7E879B', line: 'rgba(255, 255, 255, 0.1)', 'btn-bg': '#D93448', 'btn-fg': '#FFFFFF', link: '#FF5A6E', mark: '#FF5A6E' },
};
const SPACE_UI: Partial<Tokens> = { bg: '#060A16', ink: '#FFFFFF', 'ink-2': 'rgba(255,255,255,0.86)', 'ink-3': 'rgba(255,255,255,0.7)', line: 'rgba(255,255,255,0.14)', 'btn-bg': '#FFFFFF', 'btn-fg': '#0B1633', link: '#FFFFFF', mark: '#FF6B7C' };
const SKY_UI: Partial<Tokens> = { bg: '#1C4CAB', ink: '#FFFFFF', 'ink-2': 'rgba(255,255,255,0.92)', 'ink-3': 'rgba(255,255,255,0.8)', line: 'rgba(255,255,255,0.2)', 'btn-bg': '#FFFFFF', 'btn-fg': '#1B53BC', link: '#FFFFFF', mark: '#FFFFFF' };
const SKY_UI_N: Partial<Tokens> = { ...SKY_UI, bg: '#0B1C45', 'btn-fg': '#0B1C45', mark: '#FF6B7C' };

const NOTE = 'Учебный проект, не официальный сервис города.';
const OPEN_BUDGET = `${NOTE} Данные — «Открытый бюджет Москвы», 2026.`;

export const SCENES = {
  glass: {
    mount: mountGlass,
    skin: 'glass',
    cta: 'Исследовать',
    eyebrow: 'Бюджет Москвы · 2026',
    headline: `Столько город потратит за${NB}год`,
    caption: `На всё сразу: от${NB}метро и${NB}больниц до${NB}детских садов и${NB}парков.`,
    note: `${NOTE} Данные — Закон г.${NB}Москвы №${NB}39 от${NB}01.11.2025.`,
    day: { bg: '#F3F5F9', 'ink-2': '#3F4A61', 'ink-3': '#5F6984' },
    night: { bg: '#05070B', 'ink-2': '#B3BBCC', 'ink-3': '#8A93A7' },
  },
  second: {
    mount: mountSecond,
    skin: 'ink',
    cta: 'Узнать, на что',
    target: 'data',
    eyebrow: 'Прямо сейчас',
    headline: 'Пока вы здесь, Москва потратила',
    caption: `Это в${NB}среднем: годовой бюджет, делённый на${NB}31${NB}536${NB}000${NB}секунд.`,
    note: `${NOTE} Расчёт по${NB}Закону г.${NB}Москвы №${NB}39.`,
    day: { 'btn-bg': '#0E1524', 'btn-fg': '#FCFCFD' },
    night: { bg: '#050608', 'btn-bg': '#F2F4F8', 'btn-fg': '#050608' },
  },
  board: {
    mount: mountBoard,
    skin: 'board',
    cta: 'Исследовать',
    eyebrow: 'Табло направлений',
    headline: 'Куда ещё отправляются деньги',
    caption: `Ещё четыре городские программы на${NB}2026${NB}год. Медицина — без${NB}учёта денег Фонда${NB}ОМС.`,
    note: OPEN_BUDGET,
    day: { bg: '#EEF0F3', 'btn-bg': '#111318', 'btn-fg': '#FFB547' },
    night: { bg: '#050608', 'btn-bg': '#FFB547', 'btn-fg': '#111318' },
  },
  space: {
    mount: mountSpace,
    skin: 'white',
    cta: 'Исследовать',
    eyebrow: 'Если сложить пятитысячными',
    headline: `Бюджет Москвы улетел бы в${NB}космос`,
    caption: `12,8${NB}млн пачек по${NB}12,5${NB}мм — стопка высотой 160${NB}км. Космос начинается на${NB}100.`,
    note: `${NOTE} Весь бюджет-2026 купюрами по${NB}5000${NB}₽, пачка из${NB}100${NB}купюр — 12,5${NB}мм.`,
    day: SPACE_UI,
    night: SPACE_UI,
  },
  fifth: {
    mount: mountFifth,
    skin: 'white',
    cta: 'Исследовать',
    pre: 1.3,
    eyebrow: 'Транспорт',
    headline: `Каждый пятый рубль${NB}— на${NB}транспорт`,
    caption: `1,3${NB}трлн${NB}₽ в${NB}2026${NB}году — на${NB}метро, дороги и${NB}наземный транспорт.`,
    note: OPEN_BUDGET,
    day: { bg: '#1F56D8', ink: '#FFFFFF', 'ink-2': 'rgba(255,255,255,0.9)', 'ink-3': 'rgba(255,255,255,0.8)', line: 'rgba(255,255,255,0.2)', 'btn-bg': '#FFFFFF', 'btn-fg': '#1F56D8', link: '#FFFFFF', mark: '#FFFFFF' },
    night: { bg: '#16328A', ink: '#FFFFFF', 'ink-2': 'rgba(255,255,255,0.88)', 'ink-3': 'rgba(255,255,255,0.78)', line: 'rgba(255,255,255,0.2)', 'btn-bg': '#FFFFFF', 'btn-fg': '#16328A', link: '#FFFFFF', mark: '#FFFFFF' },
  },
  scales: {
    mount: mountScales,
    skin: 'ink',
    cta: 'Исследовать',
    eyebrow: 'Образование и соцподдержка',
    headline: `Почти поровну — разница 4,6${NB}млрд${NB}₽`,
    caption: `814,6${NB}млрд${NB}₽ на${NB}образование и${NB}810${NB}млрд${NB}₽ на${NB}соцподдержку: разница меньше процента.`,
    note: OPEN_BUDGET,
    day: { bg: '#F6F4EF', 'btn-bg': '#1C1F26', 'btn-fg': '#FFFFFF' },
    night: { bg: '#0B0B0D', 'btn-bg': '#E6BE68', 'btn-fg': '#141210' },
  },
  galton: {
    mount: mountGalton,
    skin: 'red',
    cta: 'Исследовать',
    eyebrow: 'Социальная сфера',
    headline: `Половина бюджета${NB}— на${NB}людей`,
    caption: `Школы, больницы, соцподдержка, культура и${NB}спорт — больше 3,2${NB}трлн${NB}₽.`,
    note: OPEN_BUDGET,
    day: {},
    night: {},
  },
  receipt: {
    mount: mountReceipt,
    skin: 'ink',
    cta: 'Посчитать свой вычет',
    target: 'calc',
    eyebrow: 'Вам лично',
    headline: 'Часть налогов можно вернуть',
    caption: `13% от${NB}расходов на${NB}учёбу, спорт и${NB}лечение возвращаются — до${NB}19${NB}500${NB}₽ в${NB}год.`,
    note: `${NOTE} Лимит вычетов — 150${NB}000${NB}₽ в${NB}год (ФНС). Чек — пример.`,
    day: { bg: '#ECEEF2', 'btn-bg': '#0E1524', 'btn-fg': '#FFFFFF' },
    night: { bg: '#07080B', 'btn-bg': '#F2F4F8', 'btn-fg': '#07080B' },
  },
  blocks: {
    mount: mountBlocks,
    skin: 'ink',
    cta: 'Исследовать',
    eyebrow: 'Дефицит',
    headline: `Расходы не помещаются в${NB}доходы`,
    caption: `Доходы — 5,94${NB}трлн${NB}₽, а${NB}нужно больше. Всё, что выше края, — дефицит 448${NB}млрд${NB}₽.`,
    note: `${NOTE} Данные — Закон г.${NB}Москвы №${NB}39 от${NB}01.11.2025.`,
    day: { bg: '#F4F5F8', 'btn-bg': '#0E1524', 'btn-fg': '#FFFFFF' },
    night: { bg: '#07080B', 'btn-bg': '#F2F4F8', 'btn-fg': '#07080B' },
  },
  scoreboard: {
    mount: mountScoreboard,
    skin: 'board',
    cta: 'Исследовать',
    eyebrow: 'Ваша доля',
    headline: `Сколько город тратит на${NB}каждого`,
    caption: `Весь бюджет, поделённый на${NB}всех жителей, — в${NB}среднем на${NB}одного человека в${NB}год.`,
    note: `${NOTE} Жителей — 13${NB}274${NB}285 (Росстат, 1${NB}января 2025).`,
    day: { bg: '#EEF0F3', 'btn-bg': '#111318', 'btn-fg': '#FFB547' },
    night: { bg: '#050608', 'btn-bg': '#FFB547', 'btn-fg': '#111318' },
  },
  ring: {
    mount: mountRing,
    skin: 'red',
    cta: 'Исследовать',
    eyebrow: 'Доходы бюджета',
    headline: `85% — налоги с${NB}работы и${NB}бизнеса`,
    caption: `Около 85${NB}рублей из${NB}100: налог на${NB}прибыль, НДФЛ и${NB}налоги малого бизнеса.`,
    note: `${NOTE} Данные — mos.ru о${NB}структуре доходов бюджета Москвы.`,
    day: {},
    night: {},
  },
  forecast: {
    mount: mountForecast,
    skin: 'white',
    cta: 'Исследовать',
    eyebrow: 'Прогноз на два года',
    headline: 'Дефицит рассеивается',
    caption: `По закону о${NB}бюджете расходы растут, а${NB}дефицит к${NB}2028${NB}году сокращается почти вдвое.`,
    note: `${NOTE} Плановый период Закона г.${NB}Москвы №${NB}39.`,
    day: SKY_UI,
    night: SKY_UI_N,
  },
  hourglass: {
    mount: mountHourglass,
    skin: 'ink',
    cta: 'Исследовать',
    eyebrow: `Сегодня, ${YEAR.date}`,
    headline: `Год бюджета прошёл на${NB}${YEAR.pct}%`,
    caption: `Если тратить поровну, к${NB}сегодняшнему дню ушло около ${YEAR.spent}${NB}трлн${NB}₽.`,
    note: `${NOTE} Расчёт: годовой бюджет × доля прошедшего года.`,
    day: { bg: '#F5F1EA', 'ink-3': '#6F6A62', 'btn-bg': '#2A2118', 'btn-fg': '#F5F1EA' },
    night: { bg: '#0B0A08', 'btn-bg': '#E9B45C', 'btn-fg': '#1A1510' },
  },
} satisfies Record<string, SceneDef>;

export type SceneId = keyof typeof SCENES;

// The hourglass counts through 2026 only; once the year is over it leaves the rotation.
const ORDER = (
  ['glass', 'second', 'board', 'space', 'fifth', 'scales', 'galton', 'receipt', 'blocks', 'scoreboard', 'ring', 'forecast', 'hourglass'] as SceneId[]
).filter((id) => id !== 'hourglass' || YEAR.f < 1);

export const sceneTokens = (scene: SceneDef, dark: boolean): Tokens => ({ ...BASE[dark ? 'night' : 'day'], ...(dark ? scene.night : scene.day) });

// Every visit shows the next scene; the first visit opens with the glass. `?scene=` shows one on purpose.
// Picked once per page load, so a second render (React's strict mode) never skips a scene.
let picked: SceneId | null = null;
export function pickScene(): SceneId {
  if (picked) return picked;
  const forced = new URLSearchParams(window.location.search).get('scene');
  if (forced && forced in SCENES) return (picked = forced as SceneId);
  const last = parseInt(safeLocalStorage.getItem('mgb_scene') ?? '-1', 10);
  const i = Number.isFinite(last) ? last + 1 : 0;
  safeLocalStorage.setItem('mgb_scene', String(i));
  return (picked = ORDER[((i % ORDER.length) + ORDER.length) % ORDER.length]);
}
