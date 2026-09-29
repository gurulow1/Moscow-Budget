import { useId } from 'react';
import { bbox, districtByName } from '../../ui/mapGeo';
import { cn } from '../../lib/utils';

// A district's real outline (OpenStreetMap) as a small raised tile: a darker copy underneath for its edge,
// a lit top face on it.
export default function DistrictShape({ osm, className, tone = 'accent' }: { osm: string; className?: string; tone?: 'accent' | 'ok' | 'ghost' }) {
  const id = useId().replace(/:/g, '');
  const district = districtByName.get(osm);
  if (!district) return null;
  const [x0, y0, x1, y1] = bbox(district.d);
  const size = Math.max(x1 - x0, y1 - y0);
  const pad = size * 0.12;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const half = size / 2 + pad;
  const lift = size * 0.035;
  return (
    <svg viewBox={`${cx - half} ${cy - half} ${half * 2} ${half * 2}`} aria-hidden="true" className={cn('mgb-shape', `is-${tone}`, className)}>
      <defs>
        <linearGradient id={`top-${id}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" className="s-top-a" />
          <stop offset="1" className="s-top-b" />
        </linearGradient>
      </defs>
      <path d={district.d} className="s-edge" transform={`translate(0 ${lift.toFixed(3)})`} />
      <path d={district.d} fill={`url(#top-${id})`} className="s-top" />
    </svg>
  );
}
