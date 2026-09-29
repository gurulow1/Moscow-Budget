import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { useEntrance } from './useEntrance';
import './exhibits.css';

export type ReceiptLine = { label: string; value: string; muted?: boolean } | 'hr';

interface ReceiptProps {
  title: string;
  sub?: string;
  lines: ReceiptLine[];
  totalLabel: string;
  total: ReactNode;
  /** What a screen reader hears instead of the paper. */
  label: string;
  foot?: string;
  size?: 'md' | 'lg';
  className?: string;
}

// The start screen's receipt as a living object: it prints once when first seen, then every changed figure
// flashes yellow for a moment.
export default function Receipt({ title, sub, lines, totalLabel, total, label, foot, size = 'md', className }: ReceiptProps) {
  const [ref, entrance] = useEntrance<HTMLDivElement>(0.2);
  const settled = useRef(false);
  useEffect(() => {
    settled.current = true;
  }, []);

  return (
    <div ref={ref} className={cn('mgb-rc', size === 'lg' && 'lg', entrance === 'in' && 'is-in', entrance === 'still' && 'is-still', className)}>
      <div className="mgb-rc-slot" aria-hidden="true" />
      <div className="mgb-rc-clip">
        <div className="mgb-rc-feed">
          <div role="img" aria-label={label} className="mgb-rc-paper">
            <div className="mgb-rc-title">{title}</div>
            {sub && <div className="mgb-rc-sub">{sub}</div>}
            <div className="mgb-rc-hr" />
            {lines.map((line, i) =>
              line === 'hr' ? (
                <div key={i} className="mgb-rc-hr" />
              ) : (
                <div key={line.label} className={cn('mgb-rc-row', line.muted && 'muted')}>
                  <span>{line.label}</span>
                  <span key={line.value} className={settled.current ? 'flash' : undefined}>
                    {line.value}
                  </span>
                </div>
              ),
            )}
            <div className="mgb-rc-hr2" />
            <div className="mgb-rc-total">
              <span>{totalLabel}</span>
              <b>
                <span className="relative">{total}</span>
              </b>
            </div>
            <div className="mgb-rc-hr2" />
            <div className="mgb-rc-code" />
            {foot && <div className="mgb-rc-foot">{foot}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
