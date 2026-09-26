// Each spending direction keeps one color across the app (the canvas palette, light and night).
export const SECTOR_COLOR: Record<string, string> = {
  trans: 'var(--mgb-c1)',
  edu: 'var(--mgb-c2)',
  soc: 'var(--mgb-c3)',
  health: 'var(--mgb-c4)',
  other: 'var(--mgb-c5)',
};

export const SECTOR_SHORT: Record<string, string> = {
  trans: 'транспорт',
  edu: 'образование',
  soc: 'соцподдержка',
  health: 'здравоохранение',
  other: 'другие программы',
};

export const SECTOR_NAME: Record<string, string> = {
  trans: 'Транспорт',
  edu: 'Образование',
  soc: 'Соцподдержка',
  health: 'Здравоохранение',
  other: 'Другие программы',
};
