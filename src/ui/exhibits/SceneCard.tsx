import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { SCENES, sceneTokens, type SceneId } from '../../screens/splash/catalog';
import { playScene } from '../../screens/splash/player';
import { cn } from '../../lib/utils';
import { useEntrance } from './useEntrance';
import '../../screens/splash/splash.css';
import './exhibits.css';

// Night is a class on <html>; a scene is drawn for one of the two, so it is mounted again when that changes.
function useIsDark() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => setDark(root.classList.contains('dark')));
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

interface SceneCardProps {
  id: SceneId;
  /** Words on top and the scene under them, or words on the left and the scene on the right (wide screens). */
  layout?: 'stack' | 'side';
  source?: string;
  className?: string;
  stageClassName?: string;
}

// A start-screen scene as a card: its colours, its object and its effect, playing once when the card is first
// seen and resting while it is scrolled away. The words are the scene's own, from the catalog.
export default function SceneCard({ id, layout = 'stack', source, className, stageClassName }: SceneCardProps) {
  const scene = SCENES[id];
  const dark = useIsDark();
  const [ref, entrance] = useEntrance<HTMLElement>(0.25);
  const stageRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const tokens = sceneTokens(scene, dark);
  const style = Object.fromEntries(Object.entries(tokens).map(([name, value]) => [`--s-${name}`, value])) as CSSProperties;

  useEffect(() => {
    const card = ref.current;
    if (entrance === 'wait' || !card || !stageRef.current || !bgRef.current) return;
    const playback = playScene({
      root: card,
      wrap: card,
      stage: stageRef.current,
      bg: bgRef.current,
      mount: scene.mount,
      pre: 0,
      dark,
      reduce: entrance === 'still',
      plain: false,
    });
    const observer = new IntersectionObserver(([entry]) => (entry.isIntersecting ? playback.resume() : playback.pause()));
    observer.observe(card);
    return () => {
      observer.disconnect();
      playback();
    };
  }, [entrance, dark, scene, ref]);

  const side = layout === 'side';
  return (
    <section
      ref={ref}
      aria-labelledby={`scene-${id}-title`}
      className={cn('mgb-card mgb-splash mgb-scene-card', side && 'is-side', className)}
      style={style}
    >
      <div ref={bgRef} className="backdrop" aria-hidden="true" />
      <div className="sc-words">
        <p className="sc-eyebrow">{scene.eyebrow}</p>
        <h2 id={`scene-${id}-title`} className="sc-title">
          {scene.headline}
        </h2>
        <p className="sc-caption">{scene.caption}</p>
        {source && <p className="sc-source">{source}</p>}
      </div>
      <div ref={stageRef} className={cn('sc-stage', stageClassName)} />
    </section>
  );
}
