import { useEffect, useRef, useState } from 'react';

export type Entrance = 'wait' | 'in' | 'still';

export const reducedMotion = () =>
  document.documentElement.dataset.a11yReduceMotion === 'true' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// An exhibit plays its entrance once, the first time it is really seen: on screen, on a shown tab and not under the
// start screen (the app waits there as `inert`). With reduced motion it is simply there.
export function useEntrance<T extends Element>(threshold = 0.3) {
  const ref = useRef<T>(null);
  const [state, setState] = useState<Entrance>(() => (reducedMotion() ? 'still' : 'wait'));

  useEffect(() => {
    const node = ref.current;
    if (!node || state !== 'wait') return;
    let seen = false;
    const check = () => {
      if (seen && !node.closest('[inert]')) setState('in');
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        seen = entry.isIntersecting;
        check();
      },
      { threshold },
    );
    observer.observe(node);
    window.addEventListener('mgb:enter', check);
    return () => {
      observer.disconnect();
      window.removeEventListener('mgb:enter', check);
    };
  }, [state, threshold]);

  return [ref, state] as const;
}
