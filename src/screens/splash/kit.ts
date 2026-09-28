// Shared pieces of the start-screen scenes: easing, colours, DOM helpers, the budget and the scene contract.
import { BUDGET_FACTS } from '../../data/budgetFacts';

export const NB = ' ';

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const outExpo = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
export const outCubic = (x: number) => 1 - Math.pow(1 - x, 3);
export const outQuart = (x: number) => 1 - Math.pow(1 - x, 4);
export const outQuint = (x: number) => 1 - Math.pow(1 - x, 5);
export const inOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const outBack = (x: number) => {
  const c = 1.6;
  return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
};

export type Rgb = number[];
export const hexRgb = (hex: string): Rgb => {
  const h = hex.trim().replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
export const rgba = (c: Rgb, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
export const mix = (a: Rgb, b: Rgb, k: number): Rgb => a.map((v, i) => Math.round(v + (b[i] - v) * k));

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string | null, html?: string) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html != null) node.innerHTML = html;
  return node;
}

// Deterministic random numbers, so a layout is the same on every visit.
export const mulberry = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
export function shuffle<T>(arr: T[], rnd: () => number) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 2026 budget, bn ₽ (Закон г. Москвы № 39 от 01.11.2025).
export const BUDGET = {
  expenses: BUDGET_FACTS.expenses.amountBillion,
  income: BUDGET_FACTS.income.amountBillion,
  deficit: BUDGET_FACTS.deficit.amountBillion,
};

// The four big directions in the app's colours (--mgb-c1…c4 in src/index.css).
export const sectorRgb = (dark: boolean) =>
  dark
    ? { c1: '#5E8FFF', c2: '#9D82FF', c3: '#34CF9C', c4: '#FFAF57' }
    : { c1: '#3D7BFD', c2: '#7C5CF5', c3: '#16B38A', c4: '#F29A38' };

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

export interface RevealOptions {
  dur?: number;
  y?: number;
  b?: number;
}

export interface SceneContext {
  /** The scene's place in the frame, between the headline and the caption. */
  stage: HTMLElement;
  /** A layer behind the whole frame, for scenes that paint the screen. */
  bg: HTMLElement;
  dark: boolean;
  /** Reduced motion: every scene shows its final state at once. */
  reduce: boolean;
  /** Low-vision mode: text only, nothing painted behind it. */
  plain: boolean;
  /** Development captures: frames are drawn on demand, so WebGL keeps its buffer. */
  seek: boolean;
  /** Seconds on the scene clock. */
  now(): number;
  /** Fades a node in at `at` seconds, rising and sharpening as it comes. */
  reveal(node: HTMLElement, at: number, opts?: RevealOptions): void;
  /** Adds a listener that is removed with the scene. */
  listen(target: EventTarget, type: string, fn: (event: Event) => void): void;
  /** Size of the background layer. */
  box(): { w: number; h: number };
  /** A node's box in background-layer coordinates. */
  rect(node: Element): Box;
  /** Sizes a canvas on the stage to the stage, at the device pixel ratio (at most 2). */
  fitCanvas(cv: HTMLCanvasElement): { r: DOMRect; k: number };
}

export interface Scene {
  frame(t: number): void;
  resize(): void;
  stop?(): void;
}

export type MountScene = (ctx: SceneContext) => Scene;
