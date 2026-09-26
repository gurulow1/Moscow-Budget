import { useId, type ReactNode } from 'react';

interface RangeFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  valueText: string;
  onChange: (value: number) => void;
  /** Color of the filled part and the dot before the label */
  color?: string;
  /** A short note after the label, e.g. residents' demand */
  hint?: ReactNode;
}

// A labelled slider: a 44px touch area over a thin drawn track.
export default function RangeField({ label, value, min, max, step, valueText, onChange, color = 'var(--mgb-c1)', hint }: RangeFieldProps) {
  const id = useId();
  const fill = (value - min) / (max - min);
  return (
    <div className="grid">
      <div className="flex min-h-6 items-center gap-1.5">
        <span aria-hidden="true" className="mr-0.5 size-2.5 shrink-0 rounded-full" style={{ background: color }} />
        <label htmlFor={id} className="min-w-0 text-[0.9375rem] font-semibold leading-tight">
          {label}
        </label>
        {hint && <span className="shrink-0 whitespace-nowrap text-[0.78125rem] font-semibold text-ink-2">{hint}</span>}
        <b className="ml-auto whitespace-nowrap text-[1.0625rem] font-semibold leading-tight tracking-[-0.01em]">{valueText}</b>
      </div>
      <div className="relative -mt-1.5 h-11">
        <div aria-hidden="true" className="absolute inset-x-0 top-[1.1875rem] h-1.5 rounded-full bg-track" />
        <div
          aria-hidden="true"
          className="absolute left-0 top-[1.1875rem] h-1.5 rounded-full"
          style={{ background: color, width: `calc(0.875rem + (100% - 1.75rem) * ${fill})` }}
        />
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-valuetext={valueText}
          onChange={(event) => onChange(Number(event.target.value))}
          className="mgb-range absolute inset-0 m-0 h-11 w-full"
        />
      </div>
    </div>
  );
}
