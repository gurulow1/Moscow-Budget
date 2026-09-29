// Runs one scene inside the start screen's frame: mounts it, reveals the frame's words on the scene clock,
// draws every frame, re-measures on any size change, and takes everything down again on stop.
import { clamp01, outCubic, outExpo, type MountScene, type RevealOptions, type SceneContext } from './kit';

interface PlayOptions {
  /** The frame; its [data-r] nodes appear at data-r seconds (plus `pre`), rising data-y px and sharpening from data-b px of blur. */
  root: HTMLElement;
  wrap: HTMLElement;
  stage: HTMLElement;
  bg: HTMLElement;
  mount: MountScene;
  pre: number;
  dark: boolean;
  reduce: boolean;
  plain: boolean;
}

interface Reveal {
  el: HTMLElement;
  d: number;
  dur: number;
  y: number;
  b: number;
  last: number;
}

type SeekWindow = Window & { __splashSeek?: (t: number) => void };

// Canvas scenes draw text in these faces; loading them first keeps the first frames from using a fallback.
const FACES = ['400 16px Onest', '700 16px Onest', '600 16px "JetBrains Mono"', '700 16px "JetBrains Mono"'];
const SAMPLE = 'МосГорБюджет 0123456789 ₽';

function fontsLoaded() {
  const fonts = document.fonts;
  if (!fonts) return Promise.resolve();
  const all = Promise.all(FACES.map((face) => fonts.load(face, SAMPLE))).then(
    () => fonts.ready,
    () => undefined,
  );
  // A slow network never holds the screen: after a moment the scene starts with whatever is there.
  return Promise.race([all, new Promise((resolve) => window.setTimeout(resolve, 1200))]);
}

// Put a node back the way it was: no children, the same attributes.
function snapshot(node: HTMLElement) {
  const attrs = node.getAttributeNames().map((name) => [name, node.getAttribute(name)] as const);
  return () => {
    node.replaceChildren();
    for (const name of node.getAttributeNames()) if (!attrs.some(([a]) => a === name)) node.removeAttribute(name);
    for (const [name, value] of attrs) node.setAttribute(name, value);
  };
}

/** Takes the scene down; pause() and resume() hold and restart its clock (a card that scrolls out of view). */
export type ScenePlayback = (() => void) & { pause(): void; resume(): void };

export function playScene({ root, wrap, stage, bg, mount, pre, dark, reduce, plain }: PlayOptions): ScenePlayback {
  // Development captures: `?seek` stops the clock and window.__splashSeek(t) draws any moment.
  const seek = import.meta.env.DEV && new URLSearchParams(window.location.search).has('seek');
  const reveals: Reveal[] = [];
  const cleanups: (() => void)[] = [snapshot(stage), snapshot(bg)];
  let clock = 0;

  const ctx: SceneContext = {
    stage,
    bg,
    dark,
    reduce,
    plain,
    seek,
    now: () => clock,
    reveal(node: HTMLElement, at: number, opts: RevealOptions = {}) {
      node.setAttribute('data-r', '');
      reveals.push({ el: node, d: at, dur: opts.dur ?? 0.9, y: opts.y ?? 16, b: opts.b ?? 7, last: -1 });
    },
    listen(target, type, fn) {
      target.addEventListener(type, fn);
      cleanups.push(() => target.removeEventListener(type, fn));
    },
    box: () => ({ w: bg.clientWidth, h: bg.clientHeight }),
    rect(node) {
      const r = node.getBoundingClientRect();
      const b = bg.getBoundingClientRect();
      return { left: r.left - b.left, top: r.top - b.top, width: r.width, height: r.height, right: r.right - b.left, bottom: r.bottom - b.top };
    },
    fitCanvas(cv) {
      const r = stage.getBoundingClientRect();
      const k = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(r.width * k);
      cv.height = Math.round(r.height * k);
      return { r, k };
    },
  };

  // The frame's own words first (the scene adds its parts when it mounts).
  const frameNodes = [...root.querySelectorAll<HTMLElement>('[data-r]')];
  for (const node of frameNodes) {
    reveals.push({ el: node, d: parseFloat(node.dataset.r) + pre, dur: 0.9, y: parseFloat(node.dataset.y ?? '16'), b: parseFloat(node.dataset.b ?? '7'), last: -1 });
  }
  cleanups.push(() => {
    for (const node of frameNodes) {
      node.style.opacity = '';
      node.style.transform = '';
      node.style.filter = '';
    }
  });

  const scene = mount(ctx);

  function applyReveals(t: number) {
    for (const r of reveals) {
      const p = reduce ? 1 : clamp01((t - r.d) / r.dur);
      if (p === r.last) continue;
      r.last = p;
      if (p >= 1) {
        r.el.style.opacity = '1';
        r.el.style.transform = '';
        r.el.style.filter = '';
        continue;
      }
      const e = outExpo(p);
      r.el.style.opacity = String(outCubic(Math.min(1, p * 1.4)));
      r.el.style.transform = r.y ? `translateY(${((1 - e) * r.y).toFixed(2)}px)` : '';
      r.el.style.filter = r.b ? `blur(${((1 - e) * r.b).toFixed(2)}px)` : '';
    }
  }

  let alive = true;
  let ready = false;
  let paused = false;
  let dirty = true;
  let raf = 0;
  let last = -1;
  const draw = () => {
    if (dirty) {
      dirty = false;
      scene.resize();
    }
    applyReveals(clock);
    scene.frame(clock);
  };
  // The clock only runs while frames are drawn: a hidden tab resumes where it was, so the entrance is never missed.
  const tick = (now: number) => {
    if (last >= 0) clock += Math.min((now - last) / 1000, 0.1);
    last = now;
    draw();
    raf = requestAnimationFrame(tick);
  };

  // Any size change (window, fonts arriving, the low-vision text size) measures again before the next frame.
  const measure = () => {
    dirty = true;
    if (seek && ready) {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    }
  };
  const observer = new ResizeObserver(measure);
  observer.observe(wrap);
  observer.observe(stage);
  ctx.listen(window, 'resize', measure);
  document.fonts?.ready.then(() => alive && measure());

  fontsLoaded().then(() => {
    if (!alive) return;
    ready = true;
    if (seek) {
      (window as SeekWindow).__splashSeek = (t: number) => {
        clock = t;
        draw();
      };
      draw();
    } else if (!paused) raf = requestAnimationFrame(tick);
  });

  const stop = () => {
    alive = false;
    cancelAnimationFrame(raf);
    observer.disconnect();
    scene.stop?.();
    cleanups.forEach((undo) => undo());
    if (seek) delete (window as SeekWindow).__splashSeek;
  };
  return Object.assign(stop, {
    pause() {
      if (paused || seek) return;
      paused = true;
      cancelAnimationFrame(raf);
    },
    resume() {
      if (!paused || !alive) return;
      paused = false;
      last = -1;
      if (ready) raf = requestAnimationFrame(tick);
    },
  });
}
