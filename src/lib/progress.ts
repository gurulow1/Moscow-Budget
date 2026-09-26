export interface LevelInfo {
  level: number;
  title: string;
  min: number;
  nextLevelXp: number;
  /** 0–100 */
  progress: number;
}

const LEVELS = [
  { level: 1, title: 'Налоговый новичок', min: 0, max: 150 },
  { level: 2, title: 'Бюджетный эксперт', min: 150, max: 400 },
  { level: 3, title: 'Финансовый аналитик', min: 400, max: 750 },
  { level: 4, title: 'Бюджетный стратег', min: 750, max: 1200 },
] as const;

export function getLevelInfo(xp: number): LevelInfo {
  const current = LEVELS.find((item) => xp <= item.max);
  if (!current) {
    return { level: 5, title: 'Городской стратег', min: 1200, nextLevelXp: 2500, progress: 100 };
  }
  return {
    level: current.level,
    title: current.title,
    min: current.min,
    nextLevelXp: current.max,
    progress: ((xp - current.min) / (current.max - current.min)) * 100,
  };
}

export const QUIZ_IDS = ['quiz-1', 'quiz-2', 'quiz-3', 'quiz-4', 'quiz-5'];
