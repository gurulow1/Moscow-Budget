import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { cn } from '../lib/utils';
import { DISTRICTS, MOSCOW as MAP, bbox } from './mapGeo';

// Moscow inside MKAD and just beyond it (scripts/moscow-districts.py) drawn as an object rather than a survey: the city
// is one slab with a side and a shadow, the districts are parted by smooth white lines, the river and the big parks
// lie on it. Some districts can be picked; the chosen one rises out of the slab in red, and the view glides to it.
// Kilometres from the Kremlin, x to the east, y to the south.
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
// Room around the slab for its side, its shadow and the name tags.
const PAD = 2;
const CITY = [MIN_X - PAD, MIN_Y - PAD, MAX_X - MIN_X + PAD * 2, MAX_Y - MIN_Y + PAD * 2];
const ease = (x: number) => 1 - Math.pow(1 - x, 3);
// Sides are drawn as a few copies of the outline between the foot and the top.
const SIDE_STEPS = [0, 0.2, 0.4, 0.6, 0.8];
const BORDERS = DISTRICTS.map((d) => d.d).join('');

export default function MoscowMap({ picks, selected, onSelect, follow = true, frame, className }: MoscowMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
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

  // Sides, lines and lifts keep their size on screen at any zoom and map width: --k is map units per screen pixel.
  // The name tags are HTML, placed above their districts on every frame of the glide; a tag that would be cut by
  // the edge hides.
  const place = () => {
    const svg = svgRef.current;
    const W = svg?.clientWidth ?? 0;
    const H = svg?.clientHeight ?? 0;
    if (!svg || !W) return;
    const [vx, vy, vw, vh] = view.current;
    const k = Math.max(vw / W, vh / H);
    svg.style.setProperty('--k', k.toFixed(5));
    const ox = (W - vw / k) / 2;
    const oy = (H - vh / k) / 2;
    for (const tag of labelsRef.current?.children ?? []) {
      const el = tag as HTMLElement;
      const x = ox + (Number(el.dataset.x) - vx) / k;
      // The chosen district stands 7 px higher (--lift in index.css).
      const y = oy + (Number(el.dataset.y) - vy) / k - (el.classList.contains('is-on') ? 7 : 0);
      const half = el.offsetWidth / 2 + 4;
      const inside = x - half > 0 && x + half < W && y - el.offsetHeight - 12 > 0 && y < H;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      el.style.opacity = inside ? '' : '0';
    }
  };
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const observer = new ResizeObserver(place);
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
      place();
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  // Tags change width when the chosen one changes.
  useEffect(place, [selected, picks.length]);

  // The chosen district is drawn last, so its lifted tile and shadow lie over its neighbours.
  const order = [...picks].sort((a, b) => Number(a.id === selected) - Number(b.id === selected));

  return (
    <div className={cn('mgb-map relative h-full w-full select-none overflow-hidden', className)}>
      <svg
        ref={svgRef}
        viewBox={(frame ?? CITY).join(' ')}
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label="Карта районов Москвы"
        className="block h-full w-full"
      >
        <defs>
          <linearGradient id="mgb-map-top" gradientUnits="userSpaceOnUse" x1={MIN_X} y1={MIN_Y} x2={MAX_X} y2={MAX_Y}>
            <stop offset="0" className="m-top-a" />
            <stop offset="1" className="m-top-b" />
          </linearGradient>
          <linearGradient id="mgb-map-on" x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0" className="m-on-a" />
            <stop offset="1" className="m-on-b" />
          </linearGradient>
          <filter id="mgb-map-blur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="0.3" />
          </filter>
          <filter id="mgb-map-slab-blur" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="0.9" />
          </filter>
        </defs>
        {/* The slab: its shadow on the card, its side, its top. */}
        <path d={MAP.land} className="mgb-map-slab-shadow" filter="url(#mgb-map-slab-blur)" />
        {SIDE_STEPS.map((t) => (
          <path key={t} d={MAP.land} className="mgb-map-slab-side" style={{ '--t': t } as CSSProperties} />
        ))}
        <path d={MAP.land} className="mgb-map-slab-top" />
        <path d={MAP.green} className="mgb-map-green" />
        <path d={BORDERS} className="mgb-map-borders" />
        <path d={MAP.water} className="mgb-map-water" />
        {/* The game's districts over everything else, so they can be tapped. */}
        {order.map((p) => {
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
              <path d={d.d} className="p-shadow" filter="url(#mgb-map-blur)" />
              {SIDE_STEPS.map((t) => (
                <path key={t} d={d.d} className="p-side" style={{ '--t': t } as CSSProperties} />
              ))}
              <path d={d.d} className="p-top" style={{ '--t': 1 } as CSSProperties} />
            </g>
          );
        })}
      </svg>
      <div ref={labelsRef} aria-hidden="true">
        {picks.map((p) => {
          const d = byName.get(p.osm);
          if (!d) return null;
          const on = p.id === selected;
          return (
            <button
              key={p.id}
              type="button"
              tabIndex={-1}
              data-x={d.c[0]}
              data-y={d.top}
              onClick={() => onSelect(p.id)}
              className={cn('mgb-map-label', on && 'is-on', p.done && 'is-done')}
            >
              {p.label}
              {p.done && (
                <svg viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M2.5 6.2 5 8.6l4.5-5" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
