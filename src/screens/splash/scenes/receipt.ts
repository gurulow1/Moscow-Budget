import { NB, clamp01, el, outCubic, outQuart, type MountScene } from '../kit';

// A receipt prints out: part of the tax comes back.
export const mountReceipt: MountScene = (ctx) => {
  const { stage } = ctx;
  const REDUCE = ctx.reduce;
  const wrap = el('div', 'rc-wrap');
  const rc = el('div', 'rc');
  const slotBar = el('div', 'rc-slot');
  const clip = el('div', 'rc-clip');
  const shadow = el('div', 'rc-shadow');
  const paper = el(
    'div',
    'rc-paper',
    `
      <div class="rc-title">НАЛОГОВЫЙ ВЫЧЕТ</div>
      <div class="rc-sub">социальный · пример</div>
      <div class="rc-hr"></div>
      <div class="rc-row"><span>Учёба</span><span>90${NB}000${NB}₽</span></div>
      <div class="rc-row"><span>Спорт</span><span>60${NB}000${NB}₽</span></div>
      <div class="rc-hr"></div>
      <div class="rc-row"><span>Лимит за год</span><span>150${NB}000${NB}₽</span></div>
      <div class="rc-row"><span>Ставка НДФЛ</span><span>13${NB}%</span></div>
      <div class="rc-hr2"></div>
      <div class="rc-total"><span>ВЕРНУТ</span><b><span>19${NB}500${NB}₽</span></b></div>
      <div class="rc-hr2"></div>
      <div class="rc-code"></div>
      <div class="rc-foot">СПАСИБО ЗА ПОКУПКИ ГОРОДУ</div>`,
  );
  shadow.append(paper);
  clip.append(shadow);
  rc.append(slotBar, clip);
  wrap.append(rc);
  stage.append(wrap);
  rc.setAttribute('role', 'img');
  rc.setAttribute('aria-label', 'Пример чека: учёба 90 000 ₽ и спорт 60 000 ₽, лимит 150 000 ₽, ставка 13 %, вернут 19 500 ₽.');
  const hl = paper.querySelector<HTMLElement>('.rc-total b');
  ctx.reveal(slotBar, 0.25, { y: 0, b: 0, dur: 0.5 });
  let ph = 300;

  function resize() {
    const r = stage.getBoundingClientRect();
    const pw = Math.min(r.width * 0.84, innerWidth >= 1024 ? 380 : 312);
    paper.style.setProperty('--pw', pw.toFixed(1) + 'px');
    paper.style.setProperty('--pf', Math.max(11.5, pw / 23.5).toFixed(2) + 'px');
    slotBar.style.width = (pw + 28).toFixed(1) + 'px';
    rc.style.transform = '';
    ph = paper.getBoundingClientRect().height;
    // A short stage scales the whole printer down rather than cutting the receipt.
    const total = ph + 14 + 28;
    const s = Math.min(1, (r.height * 0.96) / total);
    rc.style.transform = s < 1 ? `scale(${s.toFixed(4)})` : '';
  }

  function frame(t: number) {
    const p = REDUCE ? 1 : outCubic(clamp01((t - 0.4) / 1.25));
    shadow.style.transform = `translateY(${(-(1 - p) * (ph + 10)).toFixed(2)}px)`;
    const h = REDUCE ? 1 : outQuart(clamp01((t - 1.6) / 0.45));
    hl.style.setProperty('--hl', h.toFixed(4));
  }
  return { frame, resize };
};
