import { NB, clamp01, el, hexRgb, mulberry, outCubic, rgba, type MountScene } from '../kit';

// The plan for 2027 and 2028 as a weather forecast: spending grows and the deficit clears.
export const mountForecast: MountScene = (ctx) => {
  const { stage, bg } = ctx;
  const DARK = ctx.dark;
  const REDUCE = ctx.reduce;
  const cv = el('canvas');
  bg.append(cv);
  const g = cv.getContext('2d');
  const wrap = el('div', 'fc-wrap');
  wrap.innerHTML = `
    <div class="fc-col"><div class="fc-year">2027</div><div class="fc-sky">облачно</div><div class="fc-num">6,7<span>трлн${NB}₽</span></div><div class="fc-line"></div><div class="fc-def">дефицит</div><div class="fc-val">372${NB}млрд${NB}₽</div></div>
    <div class="fc-col"><div class="fc-year">2028</div><div class="fc-sky">проясняется</div><div class="fc-num">7,1<span>трлн${NB}₽</span></div><div class="fc-line"></div><div class="fc-def">дефицит</div><div class="fc-val">195${NB}млрд${NB}₽</div></div>`;
  stage.append(wrap);
  const cols = [...wrap.children] as HTMLElement[];
  ctx.reveal(cols[0], 0.35, { y: 18 });
  ctx.reveal(cols[1], 0.5, { y: 18 });
  const SKY = DARK ? [hexRgb('#07132E'), hexRgb('#132C63'), hexRgb('#0B1C45')] : [hexRgb('#1B53BC'), hexRgb('#3572D4'), hexRgb('#1C4CAB')];
  let W = 0;
  let H = 0;
  let k = 1;
  let clouds: { s: number; x: number; y: number; v: number; a: number; right: boolean }[] = [];
  let sprites: HTMLCanvasElement[] = [];

  // A cloud: soft overlapping puffs, blurred once into a sprite.
  function makeSprite(seed: number, w: number) {
    const rnd = mulberry(seed);
    const c = el('canvas');
    const h = w * 0.62;
    c.width = Math.round(w);
    c.height = Math.round(h);
    const x = c.getContext('2d');
    x.filter = `blur(${Math.round(w * 0.035)}px)`;
    for (let i = 0; i < 9; i++) {
      const px = w * (0.2 + rnd() * 0.6);
      const py2 = h * (0.4 + rnd() * 0.25);
      const r = w * (0.12 + rnd() * 0.12);
      const gr = x.createRadialGradient(px, py2 - r * 0.3, r * 0.1, px, py2, r);
      gr.addColorStop(0, DARK ? 'rgba(150,166,200,0.95)' : 'rgba(176,192,224,0.95)');
      gr.addColorStop(0.7, DARK ? 'rgba(96,112,150,0.85)' : 'rgba(128,148,190,0.85)');
      gr.addColorStop(1, 'rgba(120,140,180,0)');
      x.fillStyle = gr;
      x.beginPath();
      x.arc(px, py2, r, 0, Math.PI * 2);
      x.fill();
    }
    return c;
  }

  function resize() {
    k = Math.min(window.devicePixelRatio || 1, 2);
    const box = ctx.box();
    W = Math.round(box.w * k);
    H = Math.round(box.h * k);
    cv.width = W;
    cv.height = H;
    const sr = ctx.rect(stage);
    const base = Math.max(sr.width, sr.height) * k;
    sprites = [0, 1, 2, 3].map((i) => makeSprite(21 + i * 7, base * (0.42 + i * 0.06)));
    const rnd = mulberry(4);
    // More cloud over 2027 (left), a thinning few over 2028 (right); all inside the stage.
    clouds = Array.from({ length: 8 }, (_, i) => {
      const left = i < 5;
      return { s: i % 4, x: left ? rnd() * 0.55 : 0.5 + rnd() * 0.5, y: rnd(), v: 0.006 + rnd() * 0.008, a: left ? 0.55 + rnd() * 0.25 : 0.45 + rnd() * 0.25, right: !left };
    });
  }

  function frame(t: number) {
    if (!W) return;
    g.setTransform(1, 0, 0, 1, 0, 0);
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, rgba(SKY[0], 1));
    sky.addColorStop(0.55, rgba(SKY[1], 1));
    sky.addColorStop(1, rgba(SKY[2], 1));
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    // The sun (a moon at night) in the clearing, top right.
    const sr = ctx.rect(stage);
    const sx = (sr.left + sr.width * 0.8) * k;
    const sy = (sr.top + sr.height * 0.08) * k;
    const R = Math.min(W, H) * 0.06;
    const pulse = REDUCE ? 1 : 1 + 0.04 * Math.sin(t * 0.8);
    const halo = g.createRadialGradient(sx, sy, R * 0.5, sx, sy, R * 6 * pulse);
    halo.addColorStop(0, DARK ? 'rgba(220,230,255,0.35)' : 'rgba(255,226,150,0.55)');
    halo.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = halo;
    g.fillRect(0, 0, W, H);
    g.fillStyle = DARK ? '#EEF2FF' : '#FFF4D6';
    g.beginPath();
    g.arc(sx, sy, R, 0, Math.PI * 2);
    g.fill();
    // Clouds drift slowly; the ones over 2028 thin out as it clears.
    const clear = REDUCE ? 1 : outCubic(clamp01((t - 0.6) / 2.4));
    for (const c of clouds) {
      const img = sprites[c.s];
      const tt = REDUCE ? 0 : t;
      const x = ((((c.x + c.v * tt) % 1.3) + 1.3) % 1.3) - 0.15;
      const a = c.a * (c.right ? 1 - 0.8 * clear : 1);
      g.globalAlpha = a;
      g.drawImage(img, (sr.left + x * sr.width) * k - img.width / 2, (sr.top + (0.12 + c.y * 0.5) * sr.height) * k - img.height / 2);
    }
    g.globalAlpha = 1;
    // A deeper band at the bottom keeps the white text readable.
    const band = g.createLinearGradient(0, H * 0.55, 0, H);
    band.addColorStop(0, 'rgba(0,0,0,0)');
    band.addColorStop(1, DARK ? 'rgba(3,8,22,0.55)' : 'rgba(10,30,90,0.35)');
    g.fillStyle = band;
    g.fillRect(0, H * 0.55, W, H * 0.45);
  }
  return { frame, resize };
};
