import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../lib/utils';
import { DISTRICTS, MOSCOW as MAP, bbox } from './mapGeo';

// Moscow inside MKAD and just beyond it, from OpenStreetMap (scripts/moscow-districts.py): every district as a tile,
// the river and ponds, the large parks, the metro lines. Some districts can be picked out; the chosen one is lit and the
// view glides to it. Kilometres from the Kremlin, x to the east, y to the south.
export interface MapPick {
  id: string;
  /** The district's name in OpenStreetMap, e.g. «Хамовники». */
  osm: string;
  label: string;
  done?: boolean;
}

interface MoscowMapProps {
  picks: MapPick[];
  selected: string | null;
  onSelect: (id: string) => void;
  /** Glide the view to the chosen district instead of always showing the whole city. */
  follow?: boolean;
  /** The view when not following: x, y, width, height in km; the whole map by default. */
  frame?: number[];
  className?: string;
}

const [MIN_X, MIN_Y, MAX_X, MAX_Y] = MAP.bounds as number[];
const PAD = 1.2;
const CITY = [MIN_X - PAD, MIN_Y - PAD, MAX_X - MIN_X + PAD * 2, MAX_Y - MIN_Y + PAD * 2];
const ease = (x: number) => 1 - Math.pow(1 - x, 3);

export default function MoscowMap({ picks, selected, onSelect, follow = true, frame, className }: MoscowMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<string | null>(null);
  const byName = useMemo(() => new Map(DISTRICTS.map((d) => [d.name, d])), []);
  const chosen = picks.find((p) => p.id === selected);
  const chosenDistrict = chosen ? byName.get(chosen.osm) : undefined;

  // The view: the whole city, or the chosen district with the city around it. It glides between the two.
  const target = useMemo(() => {
    if (!follow || !chosenDistrict) return frame ?? CITY;
    const [x0, y0, x1, y1] = bbox(chosenDistrict.d);
    const w = Math.max(x1 - x0, 5.5) * 2.6;
    const h = w * (CITY[3] / CITY[2]);
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    return [cx - w / 2, cy - h / 2, w, h];
  }, [follow, chosenDistrict, frame]);
  const view = useRef((frame ?? CITY).slice());
  // Labels and outlines keep their size on screen at any zoom and map width: --k is map units per screen pixel.
  const scale = () => {
    const svg = svgRef.current;
    if (!svg || !svg.clientWidth) return;
    const [, , w, h] = view.current;
    svg.style.setProperty('--k', Math.max(w / svg.clientWidth, h / svg.clientHeight).toFixed(5));
  };
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const observer = new ResizeObserver(scale);
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const from = view.current.slice();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.a11yReduceMotion === 'true';
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = reduce ? 1 : Math.min(1, (now - start) / 750);
      const e = ease(p);
      view.current = from.map((v, i) => v + (target[i] - v) * e);
      svg.setAttribute('viewBox', view.current.map((v) => v.toFixed(3)).join(' '));
      scale();
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  const picked = new Map(picks.map((p) => [p.osm, p]));

  return (
    <svg
      ref={svgRef}
      viewBox={(frame ?? CITY).join(' ')}
      preserveAspectRatio="xMidYMid meet"
      role="group"
      aria-label="Карта районов Москвы"
      className={cn('mgb-map block h-full w-full select-none', className)}
    >
      <defs>
        <filter id="mgb-map-lift" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0.35" stdDeviation="0.45" floodColor="#0E1524" floodOpacity="0.28" />
        </filter>
      </defs>
      <g className="mgb-map-tiles">
        {DISTRICTS.map((d) => (picked.has(d.name) ? null : <path key={d.name} d={d.d} className="mgb-map-tile" />))}
      </g>
      <path d={MAP.green} className="mgb-map-green" />
      <path d={MAP.water} className="mgb-map-water" />
      <g className="mgb-map-metro">
        {MAP.metro.map((line: { color: string; d: string }) => (
          <path key={line.color} d={line.d} style={{ stroke: line.color }} />
        ))}
      </g>
      {/* The game's districts over everything else, so they can be tapped. */}
      {picks.map((p) => {
        const d = byName.get(p.osm);
        if (!d) return null;
        const on = p.id === selected;
        return (
          <g
            key={p.id}
            role="button"
            tabIndex={0}
            aria-pressed={on}
            aria-label={`${p.label}${p.done ? ', знак получен' : ''}`}
            className={cn('mgb-map-pick', on && 'is-on', hover === p.id && 'is-hover', p.done && 'is-done')}
            onClick={() => onSelect(p.id)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect(p.id))}
            onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(p.id)}
            onPointerLeave={() => setHover(null)}
          >
            <path d={d.d} filter={on ? 'url(#mgb-map-lift)' : undefined} />
          </g>
        );
      })}
      <g className="mgb-map-labels" aria-hidden="true">
        {picks.map((p) => {
          const d = byName.get(p.osm);
          if (!d) return null;
          const on = p.id === selected;
          return (
            <text key={p.id} x={d.c[0]} y={d.c[1]} className={cn('mgb-map-label', on && 'is-on')}>
              {p.label}
              {p.done ? ' ✓' : ''}
            </text>
          );
        })}
      </g>
    </svg>
  );
}
