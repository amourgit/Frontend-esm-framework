import { describe, it, expect } from 'vitest';
import { DEFAULT_OPERATORS, isFilterReady, matchesFilters, type Filter, type FilterSchema } from './filter-bar.component.js';

const schema: FilterSchema = {
  fields: [
    { id: 'category', label: 'Catégorie', type: 'select', options: [{ value: 'rh', label: 'RH' }, { value: 'it', label: 'IT' }] },
    { id: 'title', label: 'Titre', type: 'text' },
  ],
};
const items = [
  { id: 1, category: 'rh', title: 'Congés annuels' },
  { id: 2, category: 'it', title: 'Maintenance des serveurs' },
];
const get = (item: (typeof items)[number], fieldId: string) => (item as Record<string, unknown>)[fieldId];

describe('filtres — moteur d\'évaluation', () => {
  it('expose des opérateurs par défaut pour chaque type de champ', () => {
    expect(Object.keys(DEFAULT_OPERATORS)).toEqual(expect.arrayContaining(['text', 'number', 'date', 'select', 'boolean']));
  });

  it("n'applique un filtre qu'une fois ses valeurs renseignées", () => {
    expect(isFilterReady('is', [])).toBe(false);
    expect(isFilterReady('is', ['it'])).toBe(true);
    expect(isFilterReady('is_empty', [])).toBe(true);
  });

  it('filtre une liste (select « est » + texte « contient »)', () => {
    const byCategory: Filter[] = [{ id: 'f1', field: 'category', operator: 'is', values: ['it'] }];
    expect(items.filter((i) => matchesFilters(i, byCategory, schema, get)).map((i) => i.id)).toEqual([2]);

    const byTitle: Filter[] = [{ id: 'f2', field: 'title', operator: 'contains', values: ['congés'] }];
    expect(items.filter((i) => matchesFilters(i, byTitle, schema, get)).map((i) => i.id)).toEqual([1]);
  });

  it('ignore un filtre incomplet', () => {
    const incomplete: Filter[] = [{ id: 'f3', field: 'category', operator: 'is', values: [] }];
    expect(items.filter((i) => matchesFilters(i, incomplete, schema, get))).toHaveLength(2);
  });
});
