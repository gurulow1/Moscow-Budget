// WebGL2 renderer for the splash city: a textured ground plane, instanced buildings with lit faces and windows,
// instanced trees and cars. The camera matches the 2D projector in citySplash.ts exactly, so the overlays line up.

import { TEX_HALF, type City } from './cityGen';

export interface GlCamera {
  x: number; // camera position, km
  y: number;
  z: number;
  cp: number; // cos / sin of the pitch
  sp: number;
  f: number; // focal length, CSS px
  w: number; // viewport, CSS px
  h: number;
  cy: number; // principal point, CSS px from the top
}

export interface GlLook {
  light: [number, number, number];
  ambient: number;
  diffuse: number;
  fog: [number, number, number];
  fogNear: number;
  fogFar: number;
  night: number;
  sink: number;
  land: [number, number, number];
  water: [number, number, number];
  windowLit: [number, number, number];
  windowDark: [number, number, number];
}

const NEAR = 0.05;
const FAR = 400;

const CAMERA_GLSL = `
uniform vec3 uCam;
uniform float uCP, uSP, uF, uW, uH, uCY;
out float vDepth;
vec4 project(vec3 world) {
  vec3 v = world - uCam;
  float xc = v.x;
  float yc = v.y * uSP + v.z * uCP;
  float d = v.y * uCP - v.z * uSP;
  vDepth = d;
  float a = (${FAR.toFixed(1)} + ${NEAR.toFixed(2)}) / (${FAR.toFixed(1)} - ${NEAR.toFixed(2)});
  float b = -2.0 * ${FAR.toFixed(1)} * ${NEAR.toFixed(2)} / (${FAR.toFixed(1)} - ${NEAR.toFixed(2)});
  return vec4(2.0 * uF / uW * xc, 2.0 * uF / uH * yc + (1.0 - 2.0 * uCY / uH) * d, a * d + b, d);
}
`;

const FOG_GLSL = `
uniform vec3 uFog;
uniform float uFogNear, uFogFar;
in float vDepth;
vec3 fogged(vec3 c) { return mix(c, uFog, smoothstep(uFogNear, uFogFar, vDepth)); }
`;

const BOX_VS = `#version 300 es
in vec3 aPos;
in vec3 aNormal;
in vec4 aA; // x y w d
in vec4 aB; // h baseZ angle appear
in vec4 aC; // roof rgb kind
in vec4 aD; // wall rgb seed
uniform float uTime, uSink;
out vec3 vNormal;
out vec3 vRoof;
out vec3 vWall;
out vec2 vUV;
out float vKind;
out float vSeed;
${CAMERA_GLSL}
void main() {
  float g = clamp((uTime - aB.w) / 0.7, 0.0, 1.0);
  g = 1.0 + 2.2 * pow(g - 1.0, 3.0) + 1.2 * pow(g - 1.0, 2.0);
  float height = aB.x * max(g, 0.0) * (1.0 - uSink);
  float c = cos(aB.z), s = sin(aB.z);
  vec2 local = vec2(aPos.x * aA.z, aPos.y * aA.w);
  vec2 xy = vec2(local.x * c - local.y * s, local.x * s + local.y * c) + aA.xy;
  vNormal = vec3(aNormal.x * c - aNormal.y * s, aNormal.x * s + aNormal.y * c, aNormal.z);
  vUV = vec2(abs(aNormal.x) > 0.5 ? local.y : local.x, aPos.z * height);
  vRoof = aC.rgb;
  vWall = aD.rgb;
  vKind = aC.a;
  vSeed = aD.a;
  gl_Position = project(vec3(xy, aB.y + aPos.z * height));
}
`;

const BOX_FS = `#version 300 es
precision highp float;
in vec3 vNormal;
in vec3 vRoof;
in vec3 vWall;
in vec2 vUV;
in float vKind;
in float vSeed;
uniform vec3 uLight;
uniform float uAmbient, uDiffuse, uNight;
uniform vec3 uWinLit, uWinDark;
${FOG_GLSL}
out vec4 outColor;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec3 n = normalize(vNormal);
  float light = uAmbient + uDiffuse * max(dot(n, normalize(uLight)), 0.0);
  vec3 col;
  if (n.z > 0.5) {
    col = vRoof * (light + 0.08);
  } else {
    col = vWall * light;
    // Windows: a grid on every wall, faded out when a window is smaller than a pixel.
    vec2 cell = vUV / vec2(0.0105, 0.0095);
    vec2 f = fract(cell);
    float win = step(0.22, f.x) * step(f.x, 0.78) * step(0.28, f.y) * step(f.y, 0.78);
    vec2 fw = fwidth(cell);
    float sharp = 1.0 - smoothstep(0.35, 0.9, max(fw.x, fw.y));
    float lit = step(hash(floor(cell) + vSeed * 91.0), mix(0.12, 0.5, uNight));
    vec3 glassDay = mix(uWinDark, vec3(0.78, 0.86, 0.96), vKind);
    vec3 w = mix(glassDay, uWinLit, lit * uNight);
    col = mix(col, w, win * sharp * mix(0.55, 0.95, uNight));
    col += uWinLit * uNight * (1.0 - sharp) * 0.32;
    if (vKind > 0.5) col = mix(col, vec3(0.75, 0.84, 0.97) * light, 0.25 * (1.0 - uNight));
    // A little darkness at the foot of each wall.
    col *= mix(0.78, 1.0, smoothstep(0.0, 0.018, vUV.y));
  }
  outColor = vec4(fogged(col), 1.0);
}
`;

const TREE_VS = `#version 300 es
in vec3 aPos;
in vec3 aNormal;
in vec4 aA; // x y r h
in vec4 aB; // rgb appear
uniform float uTime, uSink;
out vec3 vNormal;
out vec3 vColor;
${CAMERA_GLSL}
void main() {
  float g = clamp((uTime - aB.w) / 0.5, 0.0, 1.0);
  g = 1.0 + 2.2 * pow(g - 1.0, 3.0) + 1.2 * pow(g - 1.0, 2.0);
  vec3 p = vec3(aPos.xy * aA.z, aPos.z * aA.w) * max(g, 0.0) * (1.0 - uSink);
  vNormal = aNormal;
  vColor = aB.rgb;
  gl_Position = project(vec3(aA.xy, 0.0) + p);
}
`;

const TREE_FS = `#version 300 es
precision highp float;
in vec3 vNormal;
in vec3 vColor;
uniform vec3 uLight;
uniform float uAmbient, uDiffuse;
${FOG_GLSL}
out vec4 outColor;
void main() {
  float light = uAmbient + uDiffuse * max(dot(normalize(vNormal), normalize(uLight)), 0.0);
  outColor = vec4(fogged(vColor * light), 1.0);
}
`;

const CAR_VS = `#version 300 es
in vec3 aPos;
in vec3 aNormal;
in vec4 aA; // x y angle size
in vec4 aB; // rgb glow
out vec3 vNormal;
out vec3 vColor;
out float vGlow;
${CAMERA_GLSL}
void main() {
  float c = cos(aA.z), s = sin(aA.z);
  vec2 local = vec2(aPos.x * 0.034, aPos.y * 0.016) * aA.w;
  vec2 xy = vec2(local.x * c - local.y * s, local.x * s + local.y * c) + aA.xy;
  vNormal = vec3(aNormal.x * c - aNormal.y * s, aNormal.x * s + aNormal.y * c, aNormal.z);
  vColor = aB.rgb;
  vGlow = aB.a;
  gl_Position = project(vec3(xy, aPos.z * 0.013 * aA.w));
}
`;

const CAR_FS = `#version 300 es
precision highp float;
in vec3 vNormal;
in vec3 vColor;
in float vGlow;
uniform vec3 uLight;
uniform float uAmbient, uDiffuse;
${FOG_GLSL}
out vec4 outColor;
void main() {
  float light = uAmbient + uDiffuse * max(dot(normalize(vNormal), normalize(uLight)), 0.0);
  vec3 col = mix(vColor * light, vColor * 1.25, vGlow);
  outColor = vec4(fogged(col), 1.0);
}
`;

const GROUND_VS = `#version 300 es
in vec2 aPos;
out vec2 vWorld;
${CAMERA_GLSL}
void main() {
  vWorld = aPos;
  gl_Position = project(vec3(aPos, 0.0));
}
`;

const GROUND_FS = `#version 300 es
precision highp float;
in vec2 vWorld;
uniform sampler2D uTex;
uniform vec3 uLand, uWater;
uniform float uTime, uNight;
${FOG_GLSL}
out vec4 outColor;
void main() {
  vec2 uv = vec2((vWorld.x + ${TEX_HALF.toFixed(1)}) / ${(TEX_HALF * 2).toFixed(1)}, (${TEX_HALF.toFixed(1)} - vWorld.y) / ${(TEX_HALF * 2).toFixed(1)});
  vec3 col = uLand;
  if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) col = texture(uTex, uv).rgb;
  // Moving glints on the water.
  float water = 1.0 - smoothstep(0.05, 0.14, distance(col, uWater));
  float wave = sin(vWorld.x * 38.0 + vWorld.y * 21.0 - uTime * 2.4) * sin(vWorld.x * 17.0 - vWorld.y * 33.0 + uTime * 1.7);
  col += water * smoothstep(0.55, 1.0, wave) * mix(0.16, 0.22, uNight);
  outColor = vec4(fogged(col), 1.0);
}
`;

// A unit box without its bottom: x, y in [-0.5, 0.5], z in [0, 1]. Position then normal per vertex.
function boxMesh() {
  const v: number[] = [];
  const face = (a: number[], b: number[], c: number[], d: number[], n: number[]) => {
    for (const p of [a, b, c, a, c, d]) v.push(...p, ...n);
  };
  const [x0, x1, y0, y1] = [-0.5, 0.5, -0.5, 0.5];
  face([x0, y0, 1], [x1, y0, 1], [x1, y1, 1], [x0, y1, 1], [0, 0, 1]);
  face([x0, y0, 0], [x1, y0, 0], [x1, y0, 1], [x0, y0, 1], [0, -1, 0]);
  face([x1, y1, 0], [x0, y1, 0], [x0, y1, 1], [x1, y1, 1], [0, 1, 0]);
  face([x1, y0, 0], [x1, y1, 0], [x1, y1, 1], [x1, y0, 1], [1, 0, 0]);
  face([x0, y1, 0], [x0, y0, 0], [x0, y0, 1], [x0, y1, 1], [-1, 0, 0]);
  return new Float32Array(v);
}

// A small crown for trees: an octahedron lifted off the ground.
function treeMesh() {
  const top = [0, 0, 1];
  const bottom = [0, 0, 0.18];
  const ring = [[1, 0, 0.55], [0, 1, 0.55], [-1, 0, 0.55], [0, -1, 0.55]];
  const v: number[] = [];
  const tri = (a: number[], b: number[], c: number[]) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const wx = c[0] - a[0], wy = c[1] - a[1], wz = c[2] - a[2];
    let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;
    // Point every face away from the middle of the crown.
    const cx = (a[0] + b[0] + c[0]) / 3, cy = (a[1] + b[1] + c[1]) / 3, cz = (a[2] + b[2] + c[2]) / 3 - 0.55;
    if (nx * cx + ny * cy + nz * cz < 0) { nx = -nx; ny = -ny; nz = -nz; }
    for (const p of [a, b, c]) v.push(...p, nx, ny, nz);
  };
  for (let i = 0; i < 4; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % 4];
    tri(top, a, b);
    tri(bottom, b, a);
  }
  return new Float32Array(v);
}

function compile(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const make = (type: number, src: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'shader');
    return shader;
  };
  const program = gl.createProgram()!;
  gl.attachShader(program, make(gl.VERTEX_SHADER, vs));
  gl.attachShader(program, make(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'link');
  return program;
}

export function createCityRenderer(canvas: HTMLCanvasElement, city: City, ground: HTMLCanvasElement, carCount: number) {
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: true });
  if (!gl) return null;

  const programs = {
    box: compile(gl, BOX_VS, BOX_FS),
    tree: compile(gl, TREE_VS, TREE_FS),
    car: compile(gl, CAR_VS, CAR_FS),
    ground: compile(gl, GROUND_VS, GROUND_FS),
  };

  const buffer = (data: Float32Array, usage: number = gl.STATIC_DRAW) => {
    const b = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, usage);
    return b;
  };
  const attrib = (program: WebGLProgram, name: string, size: number, stride: number, offset: number, divisor = 0) => {
    const loc = gl.getAttribLocation(program, name);
    if (loc < 0) return;
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride * 4, offset * 4);
    gl.vertexAttribDivisor(loc, divisor);
  };

  const box = boxMesh();
  const tree = treeMesh();

  const vaoBuildings = gl.createVertexArray()!;
  gl.bindVertexArray(vaoBuildings);
  buffer(box);
  attrib(programs.box, 'aPos', 3, 6, 0);
  attrib(programs.box, 'aNormal', 3, 6, 3);
  buffer(city.buildings);
  attrib(programs.box, 'aA', 4, 16, 0, 1);
  attrib(programs.box, 'aB', 4, 16, 4, 1);
  attrib(programs.box, 'aC', 4, 16, 8, 1);
  attrib(programs.box, 'aD', 4, 16, 12, 1);

  const vaoTrees = gl.createVertexArray()!;
  gl.bindVertexArray(vaoTrees);
  buffer(tree);
  attrib(programs.tree, 'aPos', 3, 6, 0);
  attrib(programs.tree, 'aNormal', 3, 6, 3);
  buffer(city.trees);
  attrib(programs.tree, 'aA', 4, 8, 0, 1);
  attrib(programs.tree, 'aB', 4, 8, 4, 1);

  const carData = new Float32Array(carCount * 8);
  const vaoCars = gl.createVertexArray()!;
  gl.bindVertexArray(vaoCars);
  buffer(box);
  attrib(programs.car, 'aPos', 3, 6, 0);
  attrib(programs.car, 'aNormal', 3, 6, 3);
  const carBuffer = buffer(carData, gl.DYNAMIC_DRAW);
  attrib(programs.car, 'aA', 4, 8, 0, 1);
  attrib(programs.car, 'aB', 4, 8, 4, 1);

  const vaoGround = gl.createVertexArray()!;
  gl.bindVertexArray(vaoGround);
  const G = 160;
  buffer(new Float32Array([-G, -G, G, -G, G, G, -G, -G, G, G, -G, G]));
  attrib(programs.ground, 'aPos', 2, 2, 0);
  gl.bindVertexArray(null);

  const texture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ground);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
  if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));

  const uniforms = (program: WebGLProgram, cam: GlCamera, look: GlLook, time: number) => {
    gl.useProgram(program);
    const u = (name: string) => gl.getUniformLocation(program, name);
    gl.uniform3f(u('uCam'), cam.x, cam.y, cam.z);
    gl.uniform1f(u('uCP'), cam.cp);
    gl.uniform1f(u('uSP'), cam.sp);
    gl.uniform1f(u('uF'), cam.f);
    gl.uniform1f(u('uW'), cam.w);
    gl.uniform1f(u('uH'), cam.h);
    gl.uniform1f(u('uCY'), cam.cy);
    gl.uniform3f(u('uFog'), ...look.fog);
    gl.uniform1f(u('uFogNear'), look.fogNear);
    gl.uniform1f(u('uFogFar'), look.fogFar);
    gl.uniform3f(u('uLight'), ...look.light);
    gl.uniform1f(u('uAmbient'), look.ambient);
    gl.uniform1f(u('uDiffuse'), look.diffuse);
    gl.uniform1f(u('uNight'), look.night);
    gl.uniform1f(u('uTime'), time);
    gl.uniform1f(u('uSink'), look.sink);
  };

  return {
    resize(width: number, height: number, dpr: number) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    },
    render(cam: GlCamera, look: GlLook, time: number, cars: Float32Array, carsShown: number) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);

      uniforms(programs.ground, cam, look, time);
      gl.uniform3f(gl.getUniformLocation(programs.ground, 'uLand'), ...look.land);
      gl.uniform3f(gl.getUniformLocation(programs.ground, 'uWater'), ...look.water);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(gl.getUniformLocation(programs.ground, 'uTex'), 0);
      gl.bindVertexArray(vaoGround);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      uniforms(programs.box, cam, look, time);
      gl.uniform3f(gl.getUniformLocation(programs.box, 'uWinLit'), ...look.windowLit);
      gl.uniform3f(gl.getUniformLocation(programs.box, 'uWinDark'), ...look.windowDark);
      gl.bindVertexArray(vaoBuildings);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 30, city.buildingCount);

      uniforms(programs.tree, cam, look, time);
      gl.bindVertexArray(vaoTrees);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 24, city.treeCount);

      if (carsShown > 0) {
        uniforms(programs.car, cam, look, time);
        gl.bindBuffer(gl.ARRAY_BUFFER, carBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, cars, 0, carsShown * 8);
        gl.bindVertexArray(vaoCars);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 30, carsShown);
      }
      gl.bindVertexArray(null);
    },
    destroy() {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

export type CityRenderer = NonNullable<ReturnType<typeof createCityRenderer>>;
