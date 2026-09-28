import { NB, clamp01, el, hexRgb, outCubic, outExpo, type MountScene } from '../kit';

// «6,39» in liquid glass over a slow light of the sector colours. WebGL2; without it the number is plain text.
const VS = `#version 300 es
in vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }`;

const FS = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uDark, uGlass;
uniform vec3 uBase;
uniform vec3 uCol[5];
uniform vec4 uBlob[5];
uniform sampler2D uCover, uHeight;
uniform vec4 uRect;
uniform vec2 uLight;
uniform float uBevel, uRefr, uShadowDy;
out vec4 o;
vec3 aurora(vec2 p) {
  vec3 c = uBase;
  for (int i = 0; i < 5; i++) {
    vec2 d = (p - uBlob[i].xy) / uBlob[i].z;
    float w = uBlob[i].w * exp(-dot(d, d) * 1.6);
    c = uDark > 0.5 ? c + uCol[i] * w : mix(c, uCol[i], w);
  }
  return c;
}
vec2 R(vec2 p) { return (p - uRect.xy) / uRect.zw; }
float H(vec2 p) { return texture(uHeight, R(p)).r; }
void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec3 bg = aurora(p);
  float sh = H(p - vec2(0.0, uShadowDy)) * uGlass;
  bg *= 1.0 - (uDark > 0.5 ? 0.3 : 0.13) * sh;
  float m = texture(uCover, R(p)).r;
  vec3 col = bg;
  if (m > 0.001) {
    float e = 1.25;
    vec2 g = vec2(H(p + vec2(e, 0.0)) - H(p - vec2(e, 0.0)), H(p + vec2(0.0, e)) - H(p - vec2(0.0, e))) / (2.0 * e);
    vec3 n = normalize(vec3(-g * uBevel * 1.7, 1.0));
    float edge = 1.0 - n.z;
    vec2 L2 = normalize(uLight);
    float facing = dot(normalize(n.xy + 1e-6), L2) * smoothstep(0.0, 0.06, edge);
    float near = max(facing, 0.0), far = max(-facing, 0.0);
    vec2 off = -n.xy * uRefr * uGlass;
    vec3 refr = vec3(aurora(p + off * 1.12).r, aurora(p + off).g, aurora(p + off * 0.88).b);
    vec3 glass = uDark > 0.5 ? refr * 1.22 + 0.045 : mix(refr, vec3(1.0), 0.2);
    glass += refr * far * edge * (uDark > 0.5 ? 1.6 : 0.6);
    vec3 L = normalize(vec3(L2 * 0.8, 0.6));
    vec3 Rf = reflect(vec3(0.0, 0.0, -1.0), n);
    float spec = pow(max(dot(Rf, L), 0.0), 24.0);
    glass += spec * (uDark > 0.5 ? 0.75 : 0.65) + near * edge * (uDark > 0.5 ? 0.7 : 0.8);
    glass *= 1.0 - far * edge * (uDark > 0.5 ? 0.0 : 0.3);
    float line = smoothstep(0.03, 0.5, m) * (1.0 - smoothstep(0.5, 0.97, m));
    glass += line * (uDark > 0.5 ? 0.35 : 0.5);
    col = mix(bg, glass, smoothstep(0.0, 0.55, m) * uGlass);
  }
  float gr = fract(sin(dot(floor(p), vec2(12.9898, 78.233))) * 43758.5453);
  col += (gr - 0.5) / 255.0;
  o = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

const UNIFORMS = ['uRes', 'uDark', 'uGlass', 'uBase', 'uCol', 'uBlob', 'uCover', 'uHeight', 'uRect', 'uLight', 'uBevel', 'uRefr', 'uShadowDy'];

// Three passes of a box blur: close to a Gaussian, and fast enough to run on every resize.
function blur(src: Float32Array, w: number, h: number, r: number) {
  const a = src;
  const b = new Float32Array(w * h);
  const inv = 1 / (2 * r + 1);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let acc = 0;
      for (let k = 0; k <= r && k < w; k++) acc += a[row + k];
      for (let x = 0; x < w; x++) {
        b[row + x] = acc * inv;
        if (x + r + 1 < w) acc += a[row + x + r + 1];
        if (x - r >= 0) acc -= a[row + x - r];
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let k = 0; k <= r && k < h; k++) acc += b[k * w + x];
      for (let y = 0; y < h; y++) {
        a[y * w + x] = acc * inv;
        if (y + r + 1 < h) acc += b[(y + r + 1) * w + x];
        if (y - r >= 0) acc -= b[(y - r) * w + x];
      }
    }
  }
  return a;
}

export const mountGlass: MountScene = (ctx) => {
  const { stage, bg } = ctx;
  const DARK = ctx.dark;
  const REDUCE = ctx.reduce;
  const wrap = el('div', 'g-wrap');
  const slot = el('p', 'g-slot', '6,39');
  const unit = el('p', 'g-unit', `трлн${NB}₽`);
  wrap.append(slot, unit);
  stage.append(wrap);
  ctx.reveal(unit, 0.85, { y: 10 });

  // The low-vision mode keeps the number as plain text and paints nothing behind it.
  const cv = ctx.plain ? null : el('canvas');
  if (cv) bg.append(cv);
  const gl = cv ? cv.getContext('webgl2', { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: ctx.seek }) : null;
  let ok = !!gl;
  const U: Record<string, WebGLUniformLocation> = {};
  const tex: Record<string, WebGLTexture> = {};
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
    return s;
  };
  if (ok) {
    try {
      const prog = gl.createProgram();
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'program');
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'a');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      for (const n of UNIFORMS) U[n] = gl.getUniformLocation(prog, n);
      ['cover', 'height'].forEach((name, i) => {
        const t = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + i);
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        tex[name] = t;
      });
      gl.uniform1i(U.uCover, 0);
      gl.uniform1i(U.uHeight, 1);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    } catch (err) {
      console.error(err);
      ok = false;
    }
  }
  if (!ok) {
    stage.classList.add('g-fallback');
    if (!ctx.plain) {
      bg.style.background = DARK
        ? 'radial-gradient(60% 45% at 25% 30%, rgba(47,99,230,.35), transparent 70%), radial-gradient(50% 40% at 80% 30%, rgba(106,75,224,.3), transparent 70%), #05070B'
        : 'radial-gradient(60% 45% at 25% 30%, rgba(61,123,253,.28), transparent 70%), radial-gradient(50% 40% at 80% 30%, rgba(124,92,245,.24), transparent 70%), radial-gradient(55% 40% at 75% 80%, rgba(22,179,138,.2), transparent 70%), #F3F5F9';
    }
  }

  const hex = (h: string) => hexRgb(h).map((v) => v / 255);
  const mixc = (a: number[], b: number[], k: number) => a.map((v, i) => v + (b[i] - v) * k);
  const DAY = ['#3D7BFD', '#7C5CF5', '#16B38A', '#F29A38', '#FF6B7A'].map((c) => mixc(hex(c), [1, 1, 1], 0.18));
  const NIGHT = ['#2F63E6', '#6A4BE0', '#119C77', '#D9801F', '#C42A3E'].map(hex);
  const BASE = DARK ? hex('#05070B') : hex('#F3F5F9');
  const BLOBS = [
    { x: -0.34, y: -0.1, ax: 0.07, ay: 0.05, px: 23, py: 29, ph: 0.2, r: 0.46, w: DARK ? 0.46 : 0.62 },
    { x: 0.34, y: -0.16, ax: 0.06, ay: 0.06, px: 31, py: 19, ph: 1.7, r: 0.4, w: DARK ? 0.4 : 0.55 },
    { x: 0.3, y: 0.24, ax: 0.07, ay: 0.05, px: 27, py: 35, ph: 3.1, r: 0.38, w: DARK ? 0.32 : 0.5 },
    { x: -0.3, y: 0.3, ax: 0.05, ay: 0.06, px: 21, py: 33, ph: 4.4, r: 0.36, w: DARK ? 0.3 : 0.48 },
    { x: 0.02, y: 0.04, ax: 0.08, ay: 0.04, px: 37, py: 25, ph: 5.2, r: 0.22, w: DARK ? 0.22 : 0.26 },
  ];
  let W = 0;
  let Hh = 0;
  let dpr = 1;
  let fontPx = 100;
  let rect = [0, 0, 1, 1];

  // The number drawn once as a coverage mask, and blurred into a height map for the bevel.
  function buildMasks() {
    const r = ctx.rect(slot);
    const cs = getComputedStyle(slot);
    fontPx = parseFloat(cs.fontSize) * dpr;
    const pad = Math.ceil(fontPx * 0.32);
    const rx = Math.floor(r.left * dpr - pad);
    const ry = Math.floor(r.top * dpr - pad);
    const rw = Math.ceil(r.width * dpr + pad * 2);
    const rh = Math.ceil(r.height * dpr + pad * 2);
    rect = [rx, ry, rw, rh];
    const c = el('canvas');
    c.width = rw;
    c.height = rh;
    const x = c.getContext('2d', { willReadFrequently: true });
    const ls = (parseFloat(cs.letterSpacing) || 0) * dpr;
    x.font = `${cs.fontWeight} ${fontPx}px Onest, "Segoe UI", sans-serif`;
    if ('letterSpacing' in x) x.letterSpacing = `${ls}px`;
    x.textAlign = 'center';
    x.textBaseline = 'alphabetic';
    const m = x.measureText(slot.textContent);
    x.fillStyle = '#fff';
    x.fillText(slot.textContent, rw / 2 + ('letterSpacing' in x ? ls / 2 : 0), rh / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
    const data = x.getImageData(0, 0, rw, rh).data;
    const cover = new Uint8Array(rw * rh);
    const f = new Float32Array(rw * rh);
    for (let i = 0; i < rw * rh; i++) {
      cover[i] = data[i * 4 + 3];
      f[i] = data[i * 4 + 3] / 255;
    }
    // A float height map: 8 bits would leave steps in the highlights.
    const height = blur(f, rw, rh, Math.max(2, Math.round(fontPx * 0.05)));
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex.cover);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, rw, rh, 0, gl.RED, gl.UNSIGNED_BYTE, cover);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, tex.height);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, rw, rh, 0, gl.RED, gl.FLOAT, height);
  }

  function resize() {
    const s = stage.getBoundingClientRect();
    const fs = Math.min(s.width / 2.2, s.height * 0.5, 420);
    slot.style.fontSize = fs.toFixed(1) + 'px';
    unit.style.fontSize = Math.max(19, Math.min(fs * 0.15, 36)).toFixed(1) + 'px';
    if (!ok) return;
    dpr = Math.min(window.devicePixelRatio || 1, innerWidth < 700 ? 2 : 1.5);
    const box = ctx.box();
    W = Math.round(box.w * dpr);
    Hh = Math.round(box.h * dpr);
    cv.width = W;
    cv.height = Hh;
    gl.viewport(0, 0, W, Hh);
    buildMasks();
  }

  // The light drifts on its own; a mouse takes it over.
  let pointer: number[] | null = null;
  let lightX = -0.55;
  let lightY = -0.8;
  ctx.listen(window, 'pointermove', (event) => {
    const e = event as PointerEvent;
    if (e.pointerType === 'mouse') pointer = [(e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1];
  });

  function frame(t: number) {
    if (!ok || !W) return;
    const bloom = REDUCE ? 1 : outExpo(clamp01(t / 1.8));
    const glass = REDUCE ? 1 : outCubic(clamp01((t - 0.3) / 1.1));
    const S = Math.sqrt(W * Hh);
    const sr = ctx.rect(slot);
    const sx = (sr.left + sr.width / 2) * dpr;
    const sy = (sr.top + sr.height / 2) * dpr;
    const blobs = new Float32Array(20);
    const cols = new Float32Array(15);
    BLOBS.forEach((b, i) => {
      const tt = REDUCE ? 0 : t;
      const x = b.x + b.ax * Math.sin((tt / b.px) * Math.PI * 2 + b.ph);
      const y = b.y + b.ay * Math.cos((tt / b.py) * Math.PI * 2 + b.ph * 1.3);
      const k = 0.3 + 0.7 * bloom;
      blobs.set([sx + x * k * W, sy + y * k * Hh, b.r * S * (0.5 + 0.5 * bloom), b.w * bloom], i * 4);
      cols.set(DARK ? NIGHT[i] : DAY[i], i * 3);
    });
    const lt = REDUCE ? 0 : t;
    let lx = -0.55 + 0.25 * Math.sin(lt / 7);
    let ly = -0.8 + 0.2 * Math.cos(lt / 9);
    if (pointer) {
      lx = pointer[0] * 0.9;
      ly = pointer[1] * 0.9 - 0.2;
    }
    lightX += (lx - lightX) * 0.08;
    lightY += (ly - lightY) * 0.08;
    if (ctx.seek) {
      lightX = lx;
      lightY = ly;
    }
    gl.uniform2f(U.uRes, W, Hh);
    gl.uniform1f(U.uDark, DARK ? 1 : 0);
    gl.uniform1f(U.uGlass, glass);
    gl.uniform3fv(U.uBase, BASE);
    gl.uniform3fv(U.uCol, cols);
    gl.uniform4fv(U.uBlob, blobs);
    gl.uniform4f(U.uRect, rect[0], rect[1], rect[2], rect[3]);
    gl.uniform2f(U.uLight, lightX, lightY);
    gl.uniform1f(U.uBevel, fontPx * 0.05);
    gl.uniform1f(U.uRefr, fontPx * 0.16);
    gl.uniform1f(U.uShadowDy, fontPx * 0.045);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // Give the GPU memory back at once instead of waiting for the garbage collector.
  const stop = () => gl?.getExtension('WEBGL_lose_context')?.loseContext();
  return { frame, resize, stop };
};
