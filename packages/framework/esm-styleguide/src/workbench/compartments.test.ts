import { describe, expect, it } from 'vitest';
import {
  DEFAULT_COMPARTMENT_LIMITS,
  fitCompartmentHeights,
  resizeCompartmentBoundary,
  type CompartmentItem,
} from './compartments';

const item = (key: string, height = 40, minHeight = 15, maxHeight = 100): CompartmentItem => ({
  key,
  height,
  minHeight,
  maxHeight,
});
const sum = (values: number[]) => Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100;

describe('fitCompartmentHeights', () => {
  it('un compartiment seul remplit la zone', () => {
    expect(fitCompartmentHeights([item('a', 60)])).toEqual([100]);
  });

  it('un nouveau compartiment prend sa hauteur de base, les autres se partagent le reste', () => {
    const items = [item('default', DEFAULT_COMPARTMENT_LIMITS.height, 25), item('own', 40)];
    expect(fitCompartmentHeights(items, { default: 100 })).toEqual([60, 40]);
    const three = [...items, item('own2', 20)];
    const result = fitCompartmentHeights(three, { default: 60, own: 40 });
    expect(result[2]).toBe(20);
    expect(sum(result)).toBe(100);
    expect(result[0] / result[1]).toBeCloseTo(1.5, 1);
  });

  it('respecte minimum et maximum et totalise toujours 100', () => {
    const items = [item('a', 50, 30, 60), item('b', 50, 10, 100)];
    const result = fitCompartmentHeights(items, { a: 90, b: 10 });
    expect(result).toEqual([60, 40]);
    expect(sum(fitCompartmentHeights([item('a', 10, 40), item('b', 10, 40), item('c', 10, 40)]))).toBe(100);
  });

  it('ignore les maximums quand ils ne permettent pas de remplir la zone', () => {
    const result = fitCompartmentHeights([item('a', 30, 10, 40), item('b', 30, 10, 40)], {});
    expect(sum(result)).toBe(100);
  });

  it('ignore les valeurs mémorisées invalides', () => {
    const result = fitCompartmentHeights([item('a', 50), item('b', 50)], { a: Number.NaN, b: -3 });
    expect(result).toEqual([50, 50]);
  });
});

describe('resizeCompartmentBoundary', () => {
  const items = [item('a', 40, 20, 70), item('b', 30, 20, 70), item('c', 30, 20, 70)];

  it('déplace la frontière : le voisin gagne, les suivants cèdent la place', () => {
    expect(resizeCompartmentBoundary([40, 30, 30], items, 0, 10)).toEqual([50, 20, 30]);
    // Le compartiment contigu atteint son minimum : le suivant continue de céder.
    expect(resizeCompartmentBoundary([40, 30, 30], items, 0, 20)).toEqual([60, 20, 20]);
  });

  it('vers le haut, le compartiment du dessous grandit', () => {
    expect(resizeCompartmentBoundary([40, 30, 30], items, 0, -10)).toEqual([30, 40, 30]);
  });

  it("s'arrête net aux bornes et conserve la somme", () => {
    const result = resizeCompartmentBoundary([40, 30, 30], items, 1, 100);
    expect(sum(result)).toBe(100);
    expect(result[1]).toBeLessThanOrEqual(70);
    expect(result[2]).toBeGreaterThanOrEqual(20);
  });

  it('ignore un rang ou un déplacement invalide', () => {
    expect(resizeCompartmentBoundary([40, 30, 30], items, 2, 10)).toEqual([40, 30, 30]);
    expect(resizeCompartmentBoundary([40, 30, 30], items, 0, Number.NaN)).toEqual([40, 30, 30]);
  });
});
