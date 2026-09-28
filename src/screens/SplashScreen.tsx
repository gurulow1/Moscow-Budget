import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Eye } from 'lucide-react';
import type { AppTab } from '../ui/TabBar';
import { cn } from '../lib/utils';
import { SCENES, pickScene, sceneTokens, type SceneDef } from './splash/catalog';
import { playScene } from './splash/player';
import './splash/splash.css';

interface SplashScreenProps {
  onEnter: (withTour: boolean, tab?: AppTab) => void;
  onOpenAccessibility: () => void;
  accessibilityEnabled: boolean;
  reduceMotion: boolean;
}

// The start screen opens every visit with a different scene: one real fact, its own look and effect, while the
// name, headline, buttons and note always stay in the same places. The low-vision mode gets the plain first scene.
export default function SplashScreen({ onEnter, onOpenAccessibility, accessibilityEnabled, reduceMotion }: SplashScreenProps) {
  const [picked] = useState(pickScene);
  const id = accessibilityEnabled ? 'glass' : picked;
  const scene: SceneDef = SCENES[id];
  const dark = document.documentElement.classList.contains('dark');
  const reduce = reduceMotion || accessibilityEnabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tokens = sceneTokens(scene, dark);
  const [leaving, setLeaving] = useState<{ tour: boolean; tab?: AppTab } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(
    () =>
      playScene({
        root: frameRef.current,
        wrap: frameRef.current,
        stage: stageRef.current,
        bg: backdropRef.current,
        mount: scene.mount,
        pre: scene.pre ?? 0,
        dark,
        reduce,
        plain: accessibilityEnabled,
      }),
    [scene, dark, reduce, accessibilityEnabled],
  );

  // Phone browsers tint their bars to the page: follow the scene while it is on screen, then give the colour back.
  useEffect(() => {
    const metas = [...document.querySelectorAll('meta[name="theme-color"]')];
    const before = metas.map((meta) => meta.getAttribute('content'));
    metas.forEach((meta) => meta.setAttribute('content', tokens.bg));
    return () => metas.forEach((meta, i) => meta.setAttribute('content', before[i] ?? ''));
  }, [tokens.bg]);

  const leave = (tour: boolean, tab?: AppTab) => setLeaving((current) => current ?? { tour, tab });
  const style = Object.fromEntries(Object.entries(tokens).map(([name, value]) => [`--s-${name}`, value])) as CSSProperties;

  return (
    <motion.div
      className={cn('mgb-splash fixed inset-0 z-[400] overflow-y-auto', `skin-${scene.skin}`, !reduce && 'anim')}
      data-scene={id}
      style={style}
      initial={false}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onAnimationComplete={() => leaving && onEnter(leaving.tour, leaving.tab)}
      inert={leaving !== null}
    >
      <div ref={frameRef} className="frame">
        <div ref={backdropRef} className="backdrop" aria-hidden="true" />
        <div className="page">
          <header className="bar" data-r="0.05" data-y="0" data-b="0">
            <div className="mark">
              МосГорБюджет<span>.Трек</span>
            </div>
            <button type="button" className="a11y" onClick={onOpenAccessibility} aria-pressed={accessibilityEnabled}>
              <Eye strokeWidth={1.8} aria-hidden="true" />
              Для слабовидящих
            </button>
          </header>
          <main className="hero">
            <div className="top">
              <p className="eyebrow" data-r="0.12">
                {scene.eyebrow}
              </p>
              <h1 className="headline" data-r="0.2">
                {scene.headline}
              </h1>
            </div>
            <div ref={stageRef} className="stage" />
            <div className="bottom">
              <p className="caption" data-r="0.95" data-y="10">
                {scene.caption}
              </p>
              <div className="actions" data-r="1.05">
                <button type="button" className="primary" onClick={() => leave(false, scene.target)}>
                  {scene.cta}
                </button>
                <button type="button" className="link" onClick={() => leave(true)}>
                  <span>Начать с экскурсии</span>
                  <ChevronRight strokeWidth={2} aria-hidden="true" />
                </button>
              </div>
            </div>
          </main>
          <p className="note" data-r="1.15" data-y="0" data-b="0">
            {scene.note}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
