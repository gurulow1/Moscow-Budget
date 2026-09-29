import { useLayoutEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import './exhibits.css';

const H = 1.15;

// A number whose digits roll up on strips when it changes, like a mechanical counter. Only ever counts forward
// per digit (9 → 0 rolls on to the next 0), so the strips hold two runs of 0–9.
export default function RollingNumber({ value, className }: { value: number; className?: string }) {
  const text = Math.max(0, Math.round(value)).toString();
  const box = useRef<HTMLSpanElement>(null);
  const pos = useRef<number[]>([]);
  const timer = useRef(0);

  useLayoutEffect(() => {
    const strips = [...(box.current?.querySelectorAll<HTMLElement>('.strip') ?? [])].reverse();
    const digits = [...text].reverse().map(Number);
    const moved: HTMLElement[] = [];
    strips.forEach((strip, j) => {
      const target = digits[j];
      const from = pos.current[j];
      if (from === undefined) {
        strip.style.transform = `translateY(${-target * H}em)`;
        pos.current[j] = target;
        return;
      }
      if (from === target) return;
      const to = from + ((target - from + 10) % 10);
      strip.classList.add('go');
      strip.style.transform = `translateY(${-to * H}em)`;
      pos.current[j] = target;
      moved.push(strip);
    });
    pos.current.length = strips.length;
    // Once rolled, jump back into the first run without a transition.
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      strips.forEach((strip, j) => {
        strip.classList.remove('go');
        strip.style.transform = `translateY(${-pos.current[j] * H}em)`;
      });
    }, 700);
    return () => window.clearTimeout(timer.current);
  }, [text]);

  const cols = [...text];
  return (
    <span ref={box} className={cn('mgb-roll', className)}>
      {cols.map((_, i) => {
        const fromRight = cols.length - 1 - i;
        return (
          <span key={fromRight} className="contents">
            <span className="col">
              <span className="strip">
                {Array.from({ length: 20 }, (_, d) => (
                  <span key={d}>{d % 10}</span>
                ))}
              </span>
            </span>
            {fromRight > 0 && fromRight % 3 === 0 && <span className="gap" />}
          </span>
        );
      })}
    </span>
  );
}
