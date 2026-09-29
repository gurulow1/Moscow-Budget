import type { CSSProperties } from 'react';
import { cn } from '../../lib/utils';
import { useEntrance } from './useEntrance';
import './exhibits.css';

export interface WafflePart {
  id: string;
  value: number;
  color: string;
  /** Drawn as empty glass: the rest, behind the parts that matter. */
  ghost?: boolean;
}

// Whole tiles out of 100 by the largest remainders, so the tiles always add up to exactly 100.
export function tilesOf(parts: WafflePart[]) {
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  const raw = parts.map((part) => (part.value / total) * 100);
  const tiles = raw.map(Math.floor);
  let rest = 100 - tiles.reduce((sum, n) => sum + n, 0);
  raw
    .map((value, i) => ({ i, fraction: value - tiles[i] }))
    .sort((a, b) => b.fraction - a.fraction)
    .forEach(({ i }) => {
      if (rest-- > 0) tiles[i] += 1;
    });
  return tiles;
}

interface WaffleProps {
  parts: WafflePart[];
  label: string;
  /** 10 × 10 square filled row by row, or a 25 × 4 band filled column by column (the parts then read left to right). */
  shape?: 'square' | 'band';
  /** The part to light up; the other tiles fade. */
  active?: string | null;
  onActive?: (id: string | null) => void;
  className?: string;
}

// A hundred tiles: every tile is one ruble of each hundred.
export default function Waffle({ parts, label, shape = 'square', active, onActive, className }: WaffleProps) {
  const [ref, entrance] = useEntrance<HTMLDivElement>(0.35);
  const tiles = tilesOf(parts);
  const cells = parts.flatMap((part, p) => Array.from({ length: tiles[p] }, () => part));
  const band = shape === 'band';

  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      className={cn('mgb-waffle', band && 'band', entrance === 'in' && 'is-in', entrance === 'still' && 'is-still', className)}
      onPointerOver={(event) => {
        if (event.pointerType !== 'mouse' || !onActive) return;
        const id = (event.target as HTMLElement).dataset.s;
        if (id) onActive(id);
      }}
      onPointerLeave={() => onActive?.(null)}
    >
      {cells.map((part, i) => (
        <span
          key={i}
          data-s={part.id}
          className={part.ghost ? 'ghost' : undefined}
          data-dim={active && active !== part.id ? '' : undefined}
          style={{ '--c': part.color, '--i': band ? Math.floor(i / 4) * 2.4 + (i % 4) : i } as CSSProperties}
        />
      ))}
    </div>
  );
}
