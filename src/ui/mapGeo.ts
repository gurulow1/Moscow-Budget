import MAP from '../data/moscowDistricts.json';

// Moscow's districts from OpenStreetMap (scripts/moscow-districts.py): kilometres from the Kremlin, x to the east, y to the south.
export interface District {
  name: string;
  okrug: string;
  d: string;
  c: number[];
  area: number;
}

export const MOSCOW = MAP;
export const DISTRICTS = MAP.districts as District[];
export const districtByName = new Map(DISTRICTS.map((d) => [d.name, d]));

// The bounding box of a path's points, from its absolute moves and relative lines.
export function bbox(d: string) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const part of d.split('M').slice(1)) {
    const [head, rel = ''] = part.replace(/z/g, '').split('l');
    let [x, y] = head.trim().split(/\s+/).map(Number);
    const nums = rel.trim() ? rel.trim().split(/\s+/).map(Number) : [];
    const visit = () => {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    };
    visit();
    for (let i = 0; i + 1 < nums.length; i += 2) {
      x += nums[i];
      y += nums[i + 1];
      visit();
    }
  }
  return [minX, minY, maxX, maxY];
}

// The game's five districts under their OpenStreetMap names.
export const GAME_DISTRICT_OSM: Record<string, string> = {
  hamovniki: 'Хамовники',
  sokolniki: 'Сокольники',
  tverskoy: 'Тверской',
  krylatskoe: 'Крылатское',
  vyhino: 'Выхино-Жулебино',
};
