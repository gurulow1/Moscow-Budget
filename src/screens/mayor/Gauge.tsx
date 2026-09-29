import { cn } from '../../lib/utils';

interface GaugeProps {
  label: string;
  value: number;
  /** The end of the scale. */
  max: number;
  /** Where the good zone starts (up) or ends (down). */
  target: number;
  direction: 'up' | 'down';
  /** A second, ghost needle: where the value would go after a choice. */
  preview?: number | null;
  className?: string;
}

const CX = 100;
const CY = 100;
const R = 78;

// A point on the dial for a share of the scale: 0 on the left, 1 on the right.
const at = (f: number, r = R) => {
  const a = Math.PI * (1 - f);
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)];
};
const arc = (f0: number, f1: number, r = R) => {
  const [x0, y0] = at(f0, r);
  const [x1, y1] = at(f1, r);
  return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 0 1 ${x1.toFixed(2)},${y1.toFixed(2)}`;
};

// A dashboard dial: the scale with its good zone, a coloured arc up to the value and a needle that swings there
// with a little overshoot, like a real instrument.
export default function Gauge({ label, value, max, target, direction, preview, className }: GaugeProps) {
  const f = Math.min(1, Math.max(0, value / max));
  const t = target / max;
  const ok = direction === 'up' ? value >= target : value <= target;
  const pf = preview == null ? null : Math.min(1, Math.max(0, preview / max));
  const zone = direction === 'up' ? arc(t, 1, R + 12) : arc(0, t, R + 12);
  return (
    <div className={cn('mgb-gauge', ok ? 'is-ok' : 'is-bad', className)}>
      <svg viewBox="0 0 200 112" aria-hidden="true">
        <path d={arc(0, 1)} className="g-track" pathLength={100} />
        <path d={arc(0, 1)} className="g-value" pathLength={100} style={{ strokeDasharray: `${(f * 100).toFixed(2)} 200` }} />
        <path d={zone} className="g-zone" />
        {Array.from({ length: 11 }, (_, i) => {
          const [x0, y0] = at(i / 10, R - 13);
          const [x1, y1] = at(i / 10, R - (i % 5 === 0 ? 22 : 18));
          return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} className="g-tick" />;
        })}
        {pf !== null && (
          <g className="g-needle is-ghost" style={{ transform: `rotate(${(pf * 180).toFixed(2)}deg)` }}>
            <path d={`M${CX},${CY - 2.5} L${CX - R + 16},${CY} L${CX},${CY + 2.5} Z`} />
          </g>
        )}
        <g className="g-needle" style={{ transform: `rotate(${(f * 180).toFixed(2)}deg)` }}>
          <path d={`M${CX + 3},${CY - 1.8} L${CX - R + 14},${CY} L${CX + 3},${CY + 1.8} Z`} />
        </g>
        <circle cx={CX} cy={CY} r="7" className="g-hub" />
        <circle cx={CX} cy={CY} r="2.6" className="g-hub-dot" />
      </svg>
      <div className="g-read">
        <b>
          {value}
          <span>%</span>
        </b>
        <span className="g-label">{label}</span>
        <span className="g-target">
          цель {direction === 'up' ? '≥' : '≤'}
          {' '}
          {target}
          {' '}%
        </span>
      </div>
      <span className="sr-only">
        {label}: {value} %, {ok ? 'в цели' : 'вне цели'}
      </span>
    </div>
  );
}
