import { useId } from 'react';
import { cn } from '../../lib/utils';
import { useEntrance } from './useEntrance';
import './exhibits.css';

interface StampProps {
  /** The word in the middle, e.g. «ПРИНЯТО». */
  word: string;
  /** The small line under it. */
  sub?: string;
  tone: 'ok' | 'bad';
  className?: string;
}

const RING = 'МОСГОРБЮДЖЕТ · ТРЕК · 2026 · ';

// A round rubber stamp: two rings, the name around the edge, the verdict in the middle. The ink is uneven the way a
// real stamp is (a fixed noise, so it looks the same every time), and it lands with a thud when first seen.
export default function Stamp({ word, sub, tone, className }: StampProps) {
  const [ref, entrance] = useEntrance<HTMLDivElement>(0.3);
  const id = useId().replace(/:/g, '');
  const size = word.length > 9 ? 17 : 21;
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn('mgb-stamp', `is-${tone}`, entrance === 'in' && 'is-in', entrance === 'still' && 'is-still', className)}
    >
      <svg viewBox="0 0 160 160">
        <defs>
          <filter id={`ink-${id}`} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="grain" />
            <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.5 1.62" result="holes" />
            <feComposite in="SourceGraphic" in2="holes" operator="in" result="inked" />
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="1" seed="3" result="wobble" />
            <feDisplacementMap in="inked" in2="wobble" scale="2.4" />
          </filter>
          <path id={`ring-${id}`} d="M80,80 m-61,0 a61,61 0 1,1 122,0 a61,61 0 1,1 -122,0" />
        </defs>
        <g filter={`url(#ink-${id})`} fill="currentColor" stroke="currentColor">
          <circle cx="80" cy="80" r="75" fill="none" strokeWidth="4.2" />
          <circle cx="80" cy="80" r="51" fill="none" strokeWidth="2" />
          <text fontSize="12" fontWeight="800" letterSpacing="1.9" stroke="none" fontFamily="var(--font-mono)">
            <textPath href={`#ring-${id}`}>{RING + RING.slice(0, 14)}</textPath>
          </text>
          <rect x="6" y={sub ? 62 : 66} width="148" height={sub ? 36 : 28} rx="3" fill="var(--stamp-paper)" stroke="none" />
          <rect x="6" y={sub ? 62 : 66} width="148" height={sub ? 36 : 28} rx="3" fill="none" strokeWidth="2.6" />
          <text x="80" y={sub ? 83 : 86.5} textAnchor="middle" fontSize={size} fontWeight="800" letterSpacing="1.2" stroke="none" fontFamily="var(--font-sans)">
            {word}
          </text>
          {sub && (
            <text x="80" y="94" textAnchor="middle" fontSize="8.5" fontWeight="700" letterSpacing="1.4" stroke="none" fontFamily="var(--font-mono)">
              {sub}
            </text>
          )}
        </g>
      </svg>
    </div>
  );
}
