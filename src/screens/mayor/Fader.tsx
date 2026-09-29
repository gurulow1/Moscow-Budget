import { useId, type CSSProperties } from 'react';

interface FaderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  color: string;
  valueText: string;
  /** The residents' demand for this sphere, e.g. 1.6. */
  demand: number;
  onChange: (value: number) => void;
}

// A mixing-desk fader: a groove lit from the bottom in the sphere's colour and a ridged cap. The real control is a
// native vertical range over it, so dragging, arrows and screen readers all work.
export default function Fader({ label, value, min, max, step, color, valueText, demand, onChange }: FaderProps) {
  const id = useId();
  const fill = (value - min) / (max - min);
  const hot = demand >= 1.5;
  return (
    <div className="mgb-fader" style={{ '--c': color, '--f': fill } as CSSProperties}>
      <span className="fd-value" aria-hidden="true">
        {valueText}
      </span>
      <div className="fd-body">
        <span className="fd-scale" aria-hidden="true">
          {[100, 75, 50, 25, 0].map((mark) => (
            <i key={mark} />
          ))}
        </span>
        <span className="fd-slot">
          <span className="fd-fill" aria-hidden="true" />
          <span className="fd-cap" aria-hidden="true" />
          <input
            id={id}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            aria-valuetext={`${valueText}, спрос ×${demand.toLocaleString('ru-RU')}`}
            onChange={(event) => onChange(Number(event.target.value))}
            className="fd-input"
          />
        </span>
      </div>
      <label htmlFor={id} className="fd-label">
        {label}
      </label>
      <span className={hot ? 'fd-demand is-hot' : 'fd-demand'}>спрос ×{demand.toLocaleString('ru-RU', { minimumFractionDigits: 1 })}</span>
    </div>
  );
}
