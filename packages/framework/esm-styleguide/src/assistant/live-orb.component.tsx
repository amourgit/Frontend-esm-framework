'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../page-background/page-background.utils.js';

export type LiveOrbVariant = 'white' | 'black' | 'webgl' | 'custom';

export type LiveOrbOptions = {
  /** Material preset. Default `"white"`. */
  variant?: LiveOrbVariant;
  /** Body hex — used when `variant="custom"`. */
  color?: string;
  /** Eye hex — used when `variant="custom"`. */
  eyeColor?: string;
  /** Unlit wash stops — used when `variant="webgl"`. */
  colors?: string[];
  /** The head turns and the eyes follow the pointer. Default `true`. */
  interactive?: boolean;
  /** Occasional blink. Default `true`. */
  blink?: boolean;
  /** Glowing headphone ear-cups on both sides of the head. Default `true`. */
  ears?: boolean;
  /**
   * Neon ring of the ear-cups: two hex stops blended around the ring.
   * Default green → yellow (`variant="webgl"` reuses its own palette).
   */
  earColors?: string[];
  /** Fires when WebGL is ready (`true`) or torn down (`false`). */
  onHasGl?: (ok: boolean) => void;
};

export type LiveOrbInstance = {
  setOptions: (options: Partial<LiveOrbOptions>) => void;
  destroy: () => void;
};

export const WHITE = { color: '#F4F4F5', eyeColor: '#09090B' } as const;
export const BLACK = { color: '#18181B', eyeColor: '#F4F4F5' } as const;
export const CUSTOM_DEFAULT = {
  color: '#7C5CFF',
  eyeColor: '#FAFAFA',
} as const;
/** Violet / foam / dust-rose — stock unlit wash. */
export const WEBGL_COLORS = ['#7C6AF7', '#7DD3C7', '#E8B4D4'];
/** Neon ring of the ear-cups: green → yellow (measured on the EGEN mascot). */
export const EAR_COLORS = ['#3DBA2E', '#F2E62F'];

const VERT = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

/**
 * Zoom of the whole head in its square box (1 = previous size). The camera is
 * pulled in, so every part (skull, eyes, line, ears, halo) grows by the same
 * factor and the proportions stay exactly as designed.
 */
export const HEAD_ZOOM = 1.09;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_speed;
uniform mat3 u_rot;
uniform float u_blink;
uniform float u_mode;
uniform float u_ears;
uniform vec3 u_body;
uniform vec3 u_eye;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;
uniform vec3 u_ear1;
uniform vec3 u_ear2;

// ---- Camera ---------------------------------------------------------------
const float CAM_DIST = 6.0;
const float HALF_VIEW = ${(1.5 / HEAD_ZOOM).toFixed(4)};

// ---- Head (local space, +z = face) ----------------------------------------
const vec3 HEAD_R = vec3(1.0, 0.74, 0.86);

// ---- Face (decals projected on the head surface) --------------------------
const float EYE_X = 0.455;
const float EYE_Y = 0.075;
const float EYE_RX = 0.118;
const float EYE_RY = 0.128;
const float LINE_HALF = 0.021;

// ---- Ear-cups (headphones) -------------------------------------------------
const vec3 EAR_C = vec3(1.02, -0.10, 0.02);
const float EAR_R = 0.385;
const float EAR_HT = 0.072;
const float EAR_ROUND = 0.045;
const float RECESS_R = 0.335;
const float RECESS_D = 0.020;
const float RING_R = 0.272;
const float RING_T = 0.034;
const float RING_X = 0.062;
// cos / sin of the toe-in (cup faces slightly forward)
const float EC = 0.9287;
const float ES = 0.3709;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}

vec3 wash(vec3 n, float t) {
  vec2 q = n.xy * 2.2 + n.z * 0.85;
  vec2 w1 = vec2(
    fbm(q * 1.4 + vec2(t * 0.22, t * 0.18)),
    fbm(q * 1.4 + vec2(-t * 0.16, t * 0.24) + 4.1)
  );
  q += (w1 - 0.5) * 0.72;
  float f = fbm(q * 2.1 + vec2(0.0, t * 0.12));
  float g = fbm(q * 4.6 - vec2(t * 0.2, 0.0));
  vec3 col = mix(u_c1, u_c2, smoothstep(0.28, 0.72, f));
  return mix(col, u_c3, pow(smoothstep(0.42, 0.9, g), 1.4));
}

float smin(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}

float smax(float a, float b, float k) {
  return -smin(-a, -b, k);
}

float sdEllipsoid(vec3 p, vec3 r) {
  float k0 = length(p / r);
  float k1 = length(p / (r * r));
  return k0 * (k0 - 1.0) / max(k1, 1e-4);
}

// Ear frame: x = cup axis (outward, toed-in), (y, z) = radial plane. Mirrored.
vec3 earFrame(vec3 p) {
  vec3 q = vec3(abs(p.x), p.y, p.z) - EAR_C;
  return vec3(EC * q.x + ES * q.z, q.y, -ES * q.x + EC * q.z);
}

float sdCup(vec3 e) {
  float rr = EAR_ROUND;
  float rad = length(e.yz);
  vec2 w = vec2(rad - EAR_R + rr, abs(e.x) - EAR_HT + rr);
  float d = min(max(w.x, w.y), 0.0) + length(max(w, 0.0)) - rr;
  // shallow recess in the outer face: the rim stays proud around it
  float rec = max(rad - RECESS_R, (EAR_HT - RECESS_D) - e.x);
  return smax(d, -rec, 0.012);
}

float sdRing(vec3 e) {
  vec2 t = vec2(length(e.yz) - RING_R, e.x - RING_X);
  return length(t) - RING_T;
}

// x = distance to the whole shape, y = distance to the neon ring
vec2 map(vec3 p) {
  float d = sdEllipsoid(p, HEAD_R);
  float dr = 1e3;
  if (u_ears > 0.5) {
    vec3 e = earFrame(p);
    d = smin(d, sdCup(e), 0.045);
    dr = sdRing(e);
    d = min(d, dr);
  }
  return vec2(d, dr);
}

vec3 calcNormal(vec3 p) {
  const vec2 k = vec2(1.0, -1.0);
  const float h = 0.0016;
  return normalize(
    k.xyy * map(p + k.xyy * h).x +
    k.yyx * map(p + k.yyx * h).x +
    k.yxy * map(p + k.yxy * h).x +
    k.xxx * map(p + k.xxx * h).x
  );
}

float calcAO(vec3 p, vec3 n) {
  float occ = 0.0;
  float s = 1.0;
  for (int i = 1; i <= 4; i++) {
    float h = 0.045 * float(i);
    occ += (h - map(p + n * h).x) * s;
    s *= 0.72;
  }
  return clamp(1.0 - 2.4 * occ, 0.0, 1.0);
}

float softShadow(vec3 ro, vec3 rd) {
  float res = 1.0;
  float t = 0.05;
  for (int i = 0; i < 22; i++) {
    float h = map(ro + rd * t).x;
    res = min(res, 9.0 * h / t);
    t += clamp(h, 0.02, 0.22);
    if (res < 0.002 || t > 2.6) break;
  }
  return clamp(res, 0.0, 1.0);
}

void main() {
  vec2 uv = (gl_FragCoord.xy / u_resolution.xy) * 2.0 - 1.0;
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  uv.x *= aspect;

  float kView = HALF_VIEW / CAM_DIST;
  float pixAng = 2.0 * kView / max(u_resolution.y, 1.0);

  vec3 rdW = normalize(vec3(uv * kView, -1.0));
  vec3 roW = vec3(0.0, 0.0, CAM_DIST);
  // world -> head space (u_rot is head -> world; v * M == transpose(M) * v)
  vec3 ro = roW * u_rot;
  vec3 rd = rdW * u_rot;

  // bounding sphere
  float bnd = 1.55;
  float b = dot(ro, rd);
  float c = dot(ro, ro) - bnd * bnd;
  float disc = b * b - c;
  if (disc < 0.0) {
    gl_FragColor = vec4(0.0);
    return;
  }
  float sq = sqrt(disc);
  float tEnd = -b + sq;
  float t = max(-b - sq, 0.0);

  float minD = 1e3;
  float tMin = t;
  float glow = 0.0;
  bool hit = false;
  vec2 m = vec2(1e3);

  for (int i = 0; i < 80; i++) {
    vec3 p = ro + rd * t;
    m = map(p);
    float eps = max(0.0007, 0.35 * t * pixAng);
    if (m.x < eps) {
      hit = true;
      break;
    }
    if (m.x < minD) {
      minD = m.x;
      tMin = t;
    }
    float stp = m.x * 0.85;
    glow += exp(-m.y * m.y * 150.0) * stp;
    t += stp;
    if (t > tEnd) break;
  }

  vec3 glowCol = mix(u_ear1, u_ear2, 0.5);
  float ga = (u_ears > 0.5) ? (1.0 - exp(-glow * 3.0)) * 0.8 : 0.0;

  float cov = 0.0;
  vec3 col = vec3(0.0);

  if (hit) {
    cov = 1.0;
    vec3 pl = ro + rd * t;
    vec3 nl = calcNormal(pl);
    vec3 nW = normalize(u_rot * nl);
    vec3 v = -rdW;

    // lights are fixed in the world: turning the head re-shades it
    vec3 keyW = normalize(vec3(-0.5, 0.72, 0.78));
    vec3 fillW = normalize(vec3(0.85, 0.05, 0.45));
    vec3 keyL = keyW * u_rot;
    float sh = softShadow(pl + nl * 0.012, keyL);
    float ao = calcAO(pl, nl);

    float ndl = dot(nW, keyW);
    float wrap = clamp((ndl + 0.35) / 1.35, 0.0, 1.0);
    float fill = clamp((dot(nW, fillW) + 0.3) / 1.3, 0.0, 1.0);
    float sky = nW.y * 0.5 + 0.5;
    vec3 amb = mix(vec3(0.60, 0.61, 0.64), vec3(0.80, 0.81, 0.84), sky);
    vec3 lightSum = amb * ao
      + vec3(1.0, 0.975, 0.94) * 0.62 * wrap * mix(0.55, 1.0, sh) * (0.55 + 0.45 * ao)
      + vec3(0.82, 0.86, 1.0) * 0.12 * fill * ao;

    vec3 hv = normalize(keyW + v);
    float ndh = max(dot(nW, hv), 0.0);
    float specK = (pow(ndh, 64.0) * 0.55 + pow(ndh, 14.0) * 0.10) * sh;
    float ndv = max(dot(nW, v), 0.0);
    float fres = 0.04 + 0.96 * pow(1.0 - ndv, 5.0);
    vec3 refl = reflect(-v, nW);
    vec3 env = mix(vec3(0.30, 0.31, 0.34), vec3(0.96, 0.97, 0.99), smoothstep(-0.25, 0.95, refl.y));

    float px = t * pixAng;
    vec3 body = (u_mode > 0.5) ? wash(nl, u_time * u_speed) : u_body;

    // ---- ear materials ------------------------------------------------------
    float plate = 0.0;
    float ringMask = 0.0;
    vec3 ringCol = vec3(0.0);
    float spill = 0.0;
    if (u_ears > 0.5) {
      vec3 e = earFrame(pl);
      float rad = length(e.yz);
      float outward = smoothstep(0.02, 0.05, e.x);
      plate = (1.0 - smoothstep(RECESS_R - 0.006 - px, RECESS_R + 0.004 + px, rad)) * outward;
      float dRing = sdRing(e);
      ringMask = 1.0 - smoothstep(0.0, 0.01 + px, dRing);
      float ang = atan(e.z, e.y);
      float gradT = 0.5 + 0.5 * sin(ang + (pl.x > 0.0 ? 0.6 : 2.5));
      vec3 neon = mix(u_ear1, u_ear2, gradT);
      float core = exp(-pow(dRing / RING_T + 1.0, 2.0) * 1.1);
      ringCol = mix(neon, vec3(1.0), 0.40 * core) * (1.05 + 0.08 * sin(u_time * 1.7));
      spill = exp(-max(dRing, 0.0) * 14.0) * outward;
    }
    vec3 plateCol = mix(vec3(0.16, 0.17, 0.20), u_body * 0.22 + vec3(0.07), 0.5);
    body = mix(body, plateCol, plate);

    // ---- face decals: eyes + connecting line --------------------------------
    float onFace = smoothstep(0.18, 0.42, pl.z);
    float lid = mix(1.0, 0.10, u_blink);
    float aa = max(px * 1.1, 0.0035);
    vec2 pe = pl.xy - vec2(0.0, EYE_Y);
    vec2 dl = vec2(abs(pe.x) - EYE_X, pe.y) / vec2(EYE_RX, EYE_RY * lid);
    float eyeM = 1.0 - smoothstep(1.0 - aa / EYE_RX, 1.0 + aa / EYE_RX, length(dl));
    float lw = max(LINE_HALF, 0.6 * px);
    float lineM =
      (1.0 - smoothstep(lw - aa, lw + aa, abs(pe.y))) *
      (1.0 - smoothstep(EYE_X - aa, EYE_X + aa, abs(pe.x)));
    float face = clamp(max(eyeM, lineM), 0.0, 1.0) * onFace;

    // ---- shade ----------------------------------------------------------------
    vec3 lit = body * lightSum;
    lit += vec3(1.0) * specK * (1.0 - plate * 0.6);
    lit = mix(lit, env * mix(vec3(1.0), body, 0.35), fres * 0.42);

    vec3 eyeLit = u_eye * (0.84 + 0.16 * wrap) + vec3(1.0) * specK * 0.42 + env * fres * 0.16;
    col = mix(lit, eyeLit, face);

    // neon spills light on the cup face and on the head next to it
    col += mix(u_ear1, u_ear2, 0.5) * spill * 0.34 * (1.0 - face);
    // the ring itself emits: no lighting
    col = mix(col, ringCol, ringMask);
  } else if (minD < 1e2) {
    // anti-aliased silhouette: how close did the ray pass to the surface?
    float r = minD / max(tMin * pixAng, 1e-5);
    cov = 1.0 - smoothstep(0.0, 1.15, r);
    // soft rim colour for the faded edge: reuse the body tone
    vec3 body = (u_mode > 0.5) ? wash(normalize(ro + rd * tMin), u_time * u_speed) : u_body;
    col = body * 0.9;
  }

  // neon halo behind / around the ring
  vec3 premul = col * cov + glowCol * ga * (1.0 - cov);
  float a = cov + ga * (1.0 - cov);
  gl_FragColor = vec4(clamp(premul / max(a, 1e-4), 0.0, 1.0), clamp(a, 0.0, 1.0));
}
`;

function isDev() {
  return typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '').trim();
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h.padEnd(6, '0').slice(0, 6);
  const n = Number.parseInt(full, 16);
  if (Number.isNaN(n)) return [0.96, 0.96, 0.96];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    if (isDev()) {
      console.warn('LiveOrb: shader failed to compile\n', gl.getShaderInfoLog(shader));
    }
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function resolveVariant(
  variant: LiveOrbVariant,
  color?: string,
  eyeColor?: string,
  colors?: string[],
  earColors?: string[],
) {
  let body: string = WHITE.color;
  let eye: string = WHITE.eyeColor;
  let mode = 0;
  let palette: string[] = WEBGL_COLORS;
  let ear: string[] = EAR_COLORS;

  if (variant === 'black') {
    body = BLACK.color;
    eye = BLACK.eyeColor;
  } else if (variant === 'webgl') {
    palette = colors && colors.length > 0 ? colors : WEBGL_COLORS;
    body = palette[1] ?? WEBGL_COLORS[1]!;
    eye = '#0C0C10';
    mode = 1;
    // the neon ring borrows the wash so the whole head stays one palette
    ear = [palette[0] ?? WEBGL_COLORS[0]!, palette[2] ?? WEBGL_COLORS[2]!];
  } else if (variant === 'custom') {
    body = color ?? CUSTOM_DEFAULT.color;
    eye = eyeColor ?? CUSTOM_DEFAULT.eyeColor;
  }

  if (earColors && earColors.length > 0) {
    ear = [earColors[0]!, earColors[1] ?? earColors[0]!];
  }

  return { body, eye, mode, palette, ear };
}

export function fallbackFaceStyle(resolved: ReturnType<typeof resolveVariant>): {
  backgroundColor?: string;
  backgroundImage?: string;
} {
  if (resolved.mode === 1) {
    const a = resolved.palette[0] ?? WEBGL_COLORS[0];
    const b = resolved.palette[1] ?? WEBGL_COLORS[1];
    const c = resolved.palette[2] ?? WEBGL_COLORS[2];
    return {
      backgroundImage: `linear-gradient(135deg, ${a}, ${b}, ${c})`,
    };
  }
  return { backgroundColor: resolved.body };
}

/** Head limits (radians) reached when the pointer is far away. */
const MAX_YAW = 0.62;
const MAX_PITCH = 0.4;
/** Resting gaze: a hair above the horizon, like a head held up. */
const NEUTRAL_Y = 0.06;

/**
 * Head → world rotation, column-major (what `uniformMatrix3fv` expects).
 * Order: roll about the face axis, then nod (pitch), then turn (yaw) —
 * so the head turns about the vertical axis, like a neck would.
 */
export function headRotation(yaw: number, pitch: number, roll: number): Float32Array {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  // M = Ry(yaw) · Rx(pitch) · Rz(roll)
  const r00 = cy * cr + sy * sp * sr;
  const r01 = -cy * sr + sy * sp * cr;
  const r02 = sy * cp;
  const r10 = cp * sr;
  const r11 = cp * cr;
  const r12 = -sp;
  const r20 = -sy * cr + cy * sp * sr;
  const r21 = sy * sr + cy * sp * cr;
  const r22 = cy * cp;
  return new Float32Array([r00, r10, r20, r01, r11, r21, r02, r12, r22]);
}

/**
 * Evenly lit 3D head (Baymax-style): wide rounded skull, two oval eyes joined
 * by a thin line, glowing headphone ear-cups. The head turns toward the
 * pointer; eyes, line and ears are rigid with it, so they follow the surface.
 */
export function createLiveOrb(canvas: HTMLCanvasElement, initial: LiveOrbOptions = {}): LiveOrbInstance | null {
  let options: Required<Pick<LiveOrbOptions, 'variant' | 'interactive' | 'blink' | 'ears'>> & LiveOrbOptions = {
    variant: 'white',
    interactive: true,
    blink: true,
    ears: true,
    ...initial,
  };

  // `look` is the head pose in [-1, 1]² (x: turn right, y: look up).
  const look = { x: 0, y: NEUTRAL_Y, vx: 0, vy: 0 };
  const targetLook = { x: 0, y: NEUTRAL_Y };
  let reduce = false;

  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    powerPreference: 'high-performance',
  });
  if (!gl) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    if (isDev()) {
      console.warn('LiveOrb: program failed to link\n', gl.getProgramInfoLog(program));
    }
    return null;
  }
  gl.useProgram(program);
  options.onHasGl?.(true);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const u = (name: string) => gl.getUniformLocation(program, name);
  const uResolution = u('u_resolution');
  const uTime = u('u_time');
  const uSpeed = u('u_speed');
  const uRot = u('u_rot');
  const uBlink = u('u_blink');
  const uMode = u('u_mode');
  const uEars = u('u_ears');
  const uBody = u('u_body');
  const uEye = u('u_eye');
  const uC1 = u('u_c1');
  const uC2 = u('u_c2');
  const uC3 = u('u_c3');
  const uEar1 = u('u_ear1');
  const uEar2 = u('u_ear2');

  // The fragment shader writes final straight-alpha colour: no blending.
  gl.disable(gl.BLEND);

  let raf = 0;
  let running = true;
  let visible = true;
  const start = performance.now();
  let last = start;
  let nextBlink = start + 1800 + Math.random() * 2400;
  let blinkAt = -10_000;

  const resize = () => {
    const parent = canvas.parentElement;
    if (!parent) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    if (w <= 0 || h <= 0) return;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    gl.viewport(0, 0, canvas.width, canvas.height);
  };

  resize();
  const ro = new ResizeObserver(resize);
  if (canvas.parentElement) ro.observe(canvas.parentElement);

  // No need to burn GPU while the head is scrolled away / in a hidden tab.
  const io =
    typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([entry]) => {
          visible = entry ? entry.isIntersecting : true;
        })
      : null;
  io?.observe(canvas);

  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const onReduce = () => {
    reduce = mqReduce.matches;
  };
  onReduce();
  mqReduce.addEventListener('change', onReduce);

  const onMove = (e: PointerEvent) => {
    if (!options.interactive) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    // Angle-like mapping: a small avatar still turns smoothly over a long
    // distance instead of snapping to the limit a few pixels from its centre.
    const reach = Math.max(rect.width, rect.height) * 3 + 120;
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = rect.top + rect.height / 2 - e.clientY;
    targetLook.x = Math.tanh((dx / reach) * 2.2);
    targetLook.y = Math.tanh((dy / reach) * 2.2);
  };
  const onLeave = (e: MouseEvent) => {
    if (e.relatedTarget === null) {
      targetLook.x = 0;
      targetLook.y = NEUTRAL_Y;
    }
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('mouseout', onLeave);

  const onLost = (e: Event) => {
    e.preventDefault();
    running = false;
    cancelAnimationFrame(raf);
    options.onHasGl?.(false);
  };
  canvas.addEventListener('webglcontextlost', onLost);

  const tick = (now: number) => {
    if (!running) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    if (!visible || document.hidden) return;

    const resolved = resolveVariant(
      options.variant,
      options.color,
      options.eyeColor,
      options.colors,
      options.earColors,
    );
    const time = (now - start) / 1000;

    // Spring-damped head pose: a slight overshoot makes it feel like a neck.
    const tx = options.interactive ? targetLook.x : 0;
    const ty = options.interactive ? targetLook.y : NEUTRAL_Y;
    const K = 130;
    const C = 17;
    look.vx += ((tx - look.x) * K - look.vx * C) * dt;
    look.vy += ((ty - look.y) * K - look.vy * C) * dt;
    look.x += look.vx * dt;
    look.y += look.vy * dt;

    // Idle life: a barely-there sway so the 3D form reads even at rest.
    const sway = reduce ? 0 : 1;
    const lx = Math.max(-1, Math.min(1, look.x)) + Math.sin(time * 0.9) * 0.03 * sway;
    const ly = Math.max(-1, Math.min(1, look.y)) + Math.sin(time * 0.67 + 1.3) * 0.022 * sway;
    const yaw = lx * MAX_YAW;
    const pitch = -ly * MAX_PITCH;
    const roll = -lx * 0.09;

    if (!reduce && options.blink && now >= nextBlink) {
      blinkAt = now;
      nextBlink = now + 2200 + Math.random() * 3800;
    }
    const bt = (now - blinkAt) / 1000;
    let b = 0;
    if (!reduce && options.blink) {
      if (bt < 0.055) b = bt / 0.055;
      else if (bt < 0.1) b = 1;
      else if (bt < 0.18) b = 1 - (bt - 0.1) / 0.08;
    }
    const body = hexToRgb(resolved.body);
    const eye = hexToRgb(resolved.eye);
    const palette = [0, 1, 2].map((i) => hexToRgb(resolved.palette[i % resolved.palette.length] ?? WEBGL_COLORS[i]!));
    const ear1 = hexToRgb(resolved.ear[0] ?? EAR_COLORS[0]!);
    const ear2 = hexToRgb(resolved.ear[1] ?? EAR_COLORS[1]!);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform1f(uTime, reduce ? 0 : time);
    gl.uniform1f(uSpeed, reduce ? 0 : 0.55);
    gl.uniformMatrix3fv(uRot, false, headRotation(yaw, pitch, roll));
    gl.uniform1f(uBlink, b);
    gl.uniform1f(uMode, resolved.mode);
    gl.uniform1f(uEars, options.ears ? 1 : 0);
    gl.uniform3f(uBody, body[0], body[1], body[2]);
    gl.uniform3f(uEye, eye[0], eye[1], eye[2]);
    gl.uniform3f(uC1, palette[0]![0], palette[0]![1], palette[0]![2]);
    gl.uniform3f(uC2, palette[1]![0], palette[1]![1], palette[1]![2]);
    gl.uniform3f(uC3, palette[2]![0], palette[2]![1], palette[2]![2]);
    gl.uniform3f(uEar1, ear1[0], ear1[1], ear1[2]);
    gl.uniform3f(uEar2, ear2[0], ear2[1], ear2[2]);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  raf = requestAnimationFrame(tick);

  return {
    setOptions(next) {
      options = { ...options, ...next };
    },
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io?.disconnect();
      mqReduce.removeEventListener('change', onReduce);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('mouseout', onLeave);
      canvas.removeEventListener('webglcontextlost', onLost);
      options.onHasGl?.(false);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    },
  };
}

export type LiveOrbProps = Omit<LiveOrbOptions, 'onHasGl'> & {
  className?: string;
  /** Edge length in CSS pixels. Default `280`. */
  size?: number;
  /** Accessible name. Default `"Assistant avatar"`. */
  label?: string;
};

/**
 * CSS-only head used when WebGL is unavailable. Same design as the 3D head —
 * wide skull, two oval eyes joined by a line, glowing ear-cups — and a light
 * parallax toward the pointer so it still feels alive without a GPU.
 * Geometry is expressed in % of the box (same units as the shader: the view
 * spans 2.84 head-units, so 1 unit ≈ 35.2 %).
 */
function FallbackHead({
  resolved,
  ears,
  interactive,
}: {
  resolved: ReturnType<typeof resolveVariant>;
  ears: boolean;
  interactive: boolean;
}) {
  const faceRef = useRef<HTMLDivElement>(null);
  const earsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!interactive) return undefined;
    const face = faceRef.current;
    const earsEl = earsRef.current;
    const root = face?.parentElement;
    if (!face || !root) return undefined;
    const onMove = (e: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const reach = Math.max(rect.width, rect.height) * 3 + 120;
      const x = Math.tanh(((e.clientX - (rect.left + rect.width / 2)) / reach) * 2.2);
      const y = Math.tanh(((rect.top + rect.height / 2 - e.clientY) / reach) * 2.2);
      // face features sit on the front: they slide the most
      face.style.transform = `translate(${(x * 5.5).toFixed(2)}%, ${(-y * 3.4).toFixed(2)}%)`;
      // ear-cups are at the back of the sides: they slide the other way, less
      if (earsEl) {
        earsEl.style.transform = `translate(${(-x * 1.8).toFixed(2)}%, ${(-y * 1.2).toFixed(2)}%)`;
      }
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [interactive]);

  const [c1, c2] = resolved.ear;
  const slide = 'transform 140ms ease-out';
  // Inline on purpose: the fallback must not depend on any stylesheet.
  const abs = { position: 'absolute' } as const;
  const eye = {
    ...abs,
    backgroundColor: resolved.eye,
    width: '8.3%',
    height: '9%',
    top: '42.9%',
    borderRadius: '50%',
  } as const;

  return (
    <div data-part="zoom" aria-hidden style={{ ...abs, inset: 0, transform: `scale(${HEAD_ZOOM})` }}>
      {ears ? (
        <div ref={earsRef} data-part="ears" aria-hidden style={{ ...abs, inset: 0, transition: slide }}>
          {[0, 1].map((i) => (
            <span
              key={i}
              data-part="ear"
              style={{
                ...abs,
                borderRadius: '50%',
                left: i === 0 ? '9%' : '79%',
                top: '37%',
                width: '12%',
                height: '30%',
                background: `linear-gradient(${i === 0 ? 135 : 225}deg, ${c1}, ${c2})`,
                boxShadow: `0 0 6px ${c2}66, inset 0 0 0 2px #0000001f`,
              }}
            >
              <span
                style={{
                  ...abs,
                  borderRadius: '50%',
                  inset: '16% 22%',
                  background: 'radial-gradient(circle at 40% 30%, #3b3e45, #15171b)',
                }}
              />
            </span>
          ))}
        </div>
      ) : null}
      <div
        aria-hidden
        data-part="head"
        style={{
          ...abs,
          overflow: 'hidden',
          left: '15%',
          top: '24%',
          width: '70%',
          height: '52%',
          borderRadius: '50%',
          ...fallbackFaceStyle(resolved),
          boxShadow: 'inset -6px -8px 14px #0000002e, inset 5px 6px 12px #ffffff66',
        }}
      />
      <div ref={faceRef} aria-hidden data-part="face" style={{ ...abs, inset: 0, transition: slide }}>
        <span data-part="eye" style={{ ...eye, left: '29.9%' }} />
        <span data-part="eye" style={{ ...eye, left: '61.8%' }} />
        <span
          data-part="line"
          style={{
            ...abs,
            backgroundColor: resolved.eye,
            left: '34%',
            width: '32%',
            height: '1.6%',
            top: '46.6%',
            borderRadius: '999px',
          }}
        />
      </div>
    </div>
  );
}

/**
 * Evenly lit 3D head (Baymax-style): wide rounded skull, two oval eyes joined
 * by a thin line, glowing headphone ear-cups. The head turns to follow the
 * pointer. Falls back to a CSS head when WebGL is unavailable.
 */
export function LiveOrb({
  className,
  size = 280,
  label = 'Assistant avatar',
  variant = 'white',
  color,
  eyeColor,
  colors,
  interactive = true,
  blink = true,
  ears = true,
  earColors,
}: LiveOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const instanceRef = useRef<LiveOrbInstance | null>(null);
  const [hasGl, setHasGl] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    instanceRef.current = createLiveOrb(canvas, {
      variant,
      color,
      eyeColor,
      colors,
      interactive,
      blink,
      ears,
      earColors,
      onHasGl: setHasGl,
    });
    return () => {
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
    // Engine reads live options via setOptions; mount once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    instanceRef.current?.setOptions({
      variant,
      color,
      eyeColor,
      colors,
      interactive,
      blink,
      ears,
      earColors,
      onHasGl: setHasGl,
    });
  }, [variant, color, eyeColor, colors, interactive, blink, ears, earColors]);

  const resolved = resolveVariant(variant, color, eyeColor, colors, earColors);

  return (
    <div
      data-slot="live-orb"
      role="img"
      aria-label={label}
      className={cn('relative shrink-0', className)}
      style={{ position: 'relative', width: size, height: size }}
    >
      {!hasGl ? <FallbackHead resolved={resolved} ears={ears} interactive={interactive} /> : null}
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
    </div>
  );
}

export default LiveOrb;
