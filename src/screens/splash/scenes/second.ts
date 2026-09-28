import { BUDGET, NB, clamp01, el, outCubic, outQuint, type MountScene } from '../kit';

// How much the city spends while you are on the page: a counter that rolls once a second.
export const mountSecond: MountScene = (ctx) => {
  const { stage } = ctx;
  const REDUCE = ctx.reduce;
  const wrap = el('div', 's-wrap');
  const count = el('p', 'count');
  const live = el('p', 'live', `<span class="pulse" aria-hidden="true"><i></i><i></i></span><span>+202${NB}467${NB}₽ каждую секунду</span>`);
  wrap.append(count, live);
  stage.append(wrap);
  ctx.reveal(count, 0.34, { y: 10 });
  ctx.reveal(live, 1.0, { y: 8 });
  const ping = live.querySelectorAll<HTMLElement>('.pulse i')[1];
  // A year's spending over the seconds of a year: 202 467 ₽ a second.
  const RATE = Math.round((BUDGET.expenses * 1e9) / 31536000);
  const T0 = 0.95;
  const ROLL = REDUCE ? 0.001 : 0.55;
  const STAGGER = REDUCE ? 0 : 0.018;
  const COLS = 11;
  const cols: { col: HTMLElement; strip: HTMLElement; shown: number; w: number }[] = [];
  const gaps: { el: HTMLElement; w: number }[] = [];
  // Each digit is a strip 0–9–0–9 that rolls up; new columns open as the number grows.
  for (let j = COLS - 1; j >= 0; j--) {
    const col = el('span', 'col');
    const strip = el('span', 'strip');
    for (let d = 0; d < 20; d++) strip.appendChild(el('b', null, String(d % 10)));
    col.appendChild(strip);
    count.appendChild(col);
    cols[j] = { col, strip, shown: -1, w: -1 };
    if (j % 3 === 0 && j > 0) {
      const g = el('span', 'gap');
      count.appendChild(g);
      gaps[j] = { el: g, w: -1 };
    }
  }
  count.appendChild(el('span', 'cur', '₽'));

  let DW = 0;
  let GW = 0;
  function measure() {
    const probe = el('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;font:inherit';
    count.appendChild(probe);
    let w = 0;
    for (let d = 0; d < 10; d++) {
      probe.textContent = String(d);
      w = Math.max(w, probe.getBoundingClientRect().width);
    }
    const fs = parseFloat(getComputedStyle(count).fontSize);
    probe.remove();
    DW = w * 0.96;
    GW = fs * 0.2;
    cols.forEach((c) => (c.w = -1));
    gaps.forEach((g) => g && (g.w = -1));
  }
  function resize() {
    const r = stage.getBoundingClientRect();
    const em = 8 * 0.6 + 2 * 0.2 + 0.72;
    count.style.setProperty('--fs', Math.min((r.width * 0.98) / em, r.height * 0.3, 190).toFixed(1) + 'px');
    measure();
  }

  const value = (n: number) => (n < 0 ? 0 : RATE * (n + 1));
  const digit = (v: number, j: number) => Math.floor(v / Math.pow(10, j)) % 10;
  let said = -1;
  function frame(t: number) {
    const n = t < T0 ? -1 : Math.floor(t - T0);
    const tickAt = T0 + n;
    const v0 = value(n - 1);
    const v1 = value(n);
    const len1 = Math.max(1, String(v1).length);
    for (let j = 0; j < COLS; j++) {
      const c = cols[j];
      const need = j < len1;
      const firstTick = j === 0 ? -1 : Math.ceil(Math.pow(10, j) / RATE) - 1;
      const born = firstTick < 0 ? -Infinity : T0 + firstTick;
      const open = need ? (born === -Infinity ? 1 : outQuint(clamp01((t - born) / 0.55))) : 0;
      const w = DW * open;
      if (Math.abs(w - c.w) > 0.01) {
        c.col.style.width = w.toFixed(2) + 'px';
        c.w = w;
      }
      c.col.style.opacity = open < 1 ? String(outCubic(open)) : '';
      if (!need) continue;
      const d0 = digit(v0, j);
      const d1 = digit(v1, j);
      const steps = n < 0 ? 0 : (d1 - d0 + 10) % 10;
      const r = n < 0 ? 1 : outQuint(clamp01((t - tickAt - j * STAGGER) / ROLL));
      const pos = d0 + steps * r;
      if (Math.abs(pos - c.shown) > 0.0005) {
        c.strip.style.transform = `translateY(${(-pos * 1.12).toFixed(4)}em)`;
        c.shown = pos;
      }
    }
    for (let j = 3; j < COLS; j += 3) {
      const g = gaps[j];
      if (!g) continue;
      const gw = GW * (cols[j].w / (DW || 1));
      if (Math.abs(gw - g.w) > 0.01) {
        g.el.style.width = gw.toFixed(2) + 'px';
        g.w = gw;
      }
    }
    if (v1 !== said) {
      said = v1;
      count.setAttribute('aria-label', `${v1.toLocaleString('ru-RU')} рублей`);
    }
    const pp = clamp01((n < 0 ? 9 : t - tickAt) / 0.9);
    ping.style.opacity = String((1 - pp) * 0.55);
    ping.style.transform = `scale(${1 + pp * 2.2})`;
  }
  return { frame, resize };
};
