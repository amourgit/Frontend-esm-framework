import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  BLACK,
  EAR_COLORS,
  HEAD_ZOOM,
  LiveOrb,
  WEBGL_COLORS,
  WHITE,
  createLiveOrb,
  headRotation,
  resolveVariant,
} from './live-orb.component';

/** Normalise `#rrggbb` / `rgb(r, g, b)` (the DOM implementation decides which one it keeps). */
function hex(css: string) {
  const m = css.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!m) return css.toLowerCase();
  return `#${[m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;
}

/** Column-major 3×3 times a vector. */
function apply(m: Float32Array, v: [number, number, number]) {
  return [0, 1, 2].map((r) => m[r]! * v[0] + m[3 + r]! * v[1] + m[6 + r]! * v[2]);
}

describe('resolveVariant', () => {
  it('donne aux oreilles le dégradé vert → jaune par défaut, sur toutes les matières', () => {
    for (const variant of ['white', 'black', 'custom'] as const) {
      expect(resolveVariant(variant).ear).toEqual(EAR_COLORS);
    }
  });

  it('conserve les couleurs de corps et d’yeux de chaque matière', () => {
    expect(resolveVariant('white')).toMatchObject({ body: WHITE.color, eye: WHITE.eyeColor, mode: 0 });
    expect(resolveVariant('black')).toMatchObject({ body: BLACK.color, eye: BLACK.eyeColor, mode: 0 });
    expect(resolveVariant('custom', '#112233', '#ffeedd')).toMatchObject({ body: '#112233', eye: '#ffeedd' });
  });

  it('la matière webgl réutilise sa palette pour l’anneau des oreilles', () => {
    const r = resolveVariant('webgl');
    expect(r.mode).toBe(1);
    expect(r.ear).toEqual([WEBGL_COLORS[0], WEBGL_COLORS[2]]);
    expect(resolveVariant('webgl', undefined, undefined, ['#111111', '#222222', '#333333']).ear).toEqual([
      '#111111',
      '#333333',
    ]);
  });

  it('earColors prime sur la matière, et une seule couleur sert aux deux extrémités', () => {
    expect(resolveVariant('webgl', undefined, undefined, undefined, ['#aaaaaa', '#bbbbbb']).ear).toEqual([
      '#aaaaaa',
      '#bbbbbb',
    ]);
    expect(resolveVariant('white', undefined, undefined, undefined, ['#cccccc']).ear).toEqual(['#cccccc', '#cccccc']);
  });
});

describe('headRotation', () => {
  it('est l’identité quand la tête est de face', () => {
    const m = Array.from(headRotation(0, 0, 0));
    [1, 0, 0, 0, 1, 0, 0, 0, 1].forEach((v, i) => expect(m[i]).toBeCloseTo(v, 6));
  });

  it('reste une rotation (longueurs conservées, déterminant 1)', () => {
    const m = headRotation(0.5, -0.3, 0.08);
    for (const v of [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
      [0.3, -0.7, 0.2],
    ] as Array<[number, number, number]>) {
      const out = apply(m, v);
      expect(Math.hypot(...(out as [number, number, number]))).toBeCloseTo(Math.hypot(...v), 5);
    }
    const [a, b, c] = [apply(m, [1, 0, 0]), apply(m, [0, 1, 0]), apply(m, [0, 0, 1])] as number[][];
    const det =
      a![0]! * (b![1]! * c![2]! - b![2]! * c![1]!) -
      b![0]! * (a![1]! * c![2]! - a![2]! * c![1]!) +
      c![0]! * (a![1]! * b![2]! - a![2]! * b![1]!);
    expect(det).toBeCloseTo(1, 5);
  });

  it('un yaw positif tourne le visage vers la droite de l’écran', () => {
    const face = apply(headRotation(0.5, 0, 0), [0, 0, 1]);
    expect(face[0]).toBeGreaterThan(0.4);
    expect(face[1]).toBeCloseTo(0, 5);
  });

  it('un pitch négatif (pointeur en haut) relève le visage', () => {
    expect(apply(headRotation(0, -0.3, 0), [0, 0, 1])[1]).toBeGreaterThan(0.25);
  });
});

describe('LiveOrb sans WebGL', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null as never);
  });

  it('createLiveOrb renvoie null quand WebGL est indisponible', () => {
    expect(createLiveOrb(document.createElement('canvas'))).toBeNull();
  });

  it('affiche le repli CSS complet : tête, deux yeux, trait de jonction, deux oreilles', () => {
    const { container } = render(<LiveOrb size={64} />);
    expect(screen.getByRole('img', { name: 'Assistant avatar' })).toHaveStyle({ width: '64px', height: '64px' });
    expect(container.querySelectorAll('[data-part="head"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-part="eye"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-part="line"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-part="ear"]')).toHaveLength(2);
  });

  it('ears={false} retire les oreilles sans toucher au visage', () => {
    const { container } = render(<LiveOrb ears={false} />);
    expect(container.querySelectorAll('[data-part="ear"]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-part="eye"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-part="line"]')).toHaveLength(1);
  });

  it('applique la matière : yeux et trait prennent la couleur d’yeux', () => {
    const { container } = render(<LiveOrb variant="custom" color="#0f766e" eyeColor="#ecfeff" />);
    const line = container.querySelector('[data-part="line"]') as HTMLElement;
    expect(hex(line.style.backgroundColor)).toBe('#ecfeff');
    expect(hex((container.querySelector('[data-part="head"]') as HTMLElement).style.backgroundColor)).toBe('#0f766e');
  });

  it('earColors colore l’anneau des oreilles', () => {
    const { container } = render(<LiveOrb earColors={['#ff0000', '#0000ff']} />);
    const ear = container.querySelector('[data-part="ear"]') as HTMLElement;
    const css = ear.style.background.toLowerCase();
    expect(css.includes('#ff0000') || css.includes('rgb(255, 0, 0)')).toBe(true);
    expect(css.includes('#0000ff') || css.includes('rgb(0, 0, 255)')).toBe(true);
  });

  it('le libellé accessible est personnalisable', () => {
    render(<LiveOrb label="Assistant EGEN" />);
    expect(screen.getByRole('img', { name: 'Assistant EGEN' })).toBeInTheDocument();
  });

  it('le repli agrandit toute la tête d’un même facteur (proportions conservées)', () => {
    expect(HEAD_ZOOM).toBeGreaterThan(1);
    expect(HEAD_ZOOM).toBeLessThanOrEqual(1.2);
    const { container } = render(<LiveOrb />);
    const zoom = container.querySelector('[data-part="zoom"]') as HTMLElement;
    expect(zoom.style.transform).toBe(`scale(${HEAD_ZOOM})`);
    expect(zoom.querySelector('[data-part="head"]')).not.toBeNull();
    expect(zoom.querySelectorAll('[data-part="eye"]')).toHaveLength(2);
    expect(zoom.querySelectorAll('[data-part="ear"]')).toHaveLength(2);
  });
});
