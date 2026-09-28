// Answers that are sums of money («5,94 трлн ₽», «Около 447,6 млрд ₽», «150 000 рублей») become coin stacks
// drawn to scale; this reads them as rubles.
const UNIT: Record<string, number> = { трлн: 1e12, млрд: 1e9, млн: 1e6, тыс: 1e3 };
const AMOUNT = /^(?:около\s+)?(\d[\d ]*(?:,\d+)?)\s*(трлн|млрд|млн|тыс)?\.?\s*(?:₽|руб\.?|рублей)$/i;

export function parseRubles(text: string): number | null {
  const match = text.replace(/[  ]/g, ' ').trim().match(AMOUNT);
  if (!match) return null;
  const value = parseFloat(match[1].replace(/ /g, '').replace(',', '.'));
  return value * (match[2] ? UNIT[match[2].toLowerCase()] : 1);
}

// All options as rubles, or null when any of them is not a sum.
export function amounts(options: string[]) {
  const values = options.map(parseRubles);
  return values.every((v) => v !== null && v > 0) ? (values as number[]) : null;
}
