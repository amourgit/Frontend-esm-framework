import { describe, expect, it } from 'vitest';
import {
  getStaggeredMenuEntryProblems,
  isStaggeredMenuEntryMeta,
  resolveStaggeredMenuEntries,
  STAGGERED_MENU_SLOT,
} from './staggered-menu-slot';

const ext = (name: string, moduleName: string, meta: unknown) => ({ name, moduleName, meta });
const ids = (entries: Array<{ id: string }>) => entries.map((e) => e.id);

describe('STAGGERED_MENU_SLOT', () => {
  it('a un nom stable (contrat avec les routes.json des apps)', () => {
    expect(STAGGERED_MENU_SLOT).toBe('staggered-menu-slot');
  });
});

describe('isStaggeredMenuEntryMeta', () => {
  it('accepte une meta minimale (titre seul)', () => {
    expect(isStaggeredMenuEntryMeta({ title: 'Raccourcis' })).toBe(true);
  });

  it('accepte une meta complète', () => {
    expect(
      isStaggeredMenuEntryMeta({
        title: 'Raccourcis',
        titleKey: 'shortcuts',
        area: 'bottom',
        order: 3,
        priority: 10,
        global: true,
        showTitle: true,
      }),
    ).toBe(true);
  });

  it.each([undefined, null, 'x', 3, {}, { title: '' }, { title: 1 }])('refuse %j', (meta) => {
    expect(isStaggeredMenuEntryMeta(meta)).toBe(false);
  });

  it('refuse un champ optionnel de mauvais type, avec un message précis', () => {
    expect(getStaggeredMenuEntryProblems({ title: 'a', area: 'middle' })).toEqual([
      '`area` vaut "top", "content", "bottom"',
    ]);
    expect(getStaggeredMenuEntryProblems({ title: 'a', order: Number.NaN })).toEqual([
      '`order` doit être un nombre fini',
    ]);
    expect(getStaggeredMenuEntryProblems({ title: 'a', priority: 'high' })).toEqual([
      '`priority` doit être un nombre fini',
    ]);
    expect(getStaggeredMenuEntryProblems({ title: 'a', global: 'yes', showTitle: 1 })).toHaveLength(2);
  });
});

describe('resolveStaggeredMenuEntries', () => {
  const active = new Set(['@egen/esm-annuaire-app']);

  it("ne garde que les entrées de l'app montée et les entrées globales", () => {
    const entries = resolveStaggeredMenuEntries(
      [
        ext('annuaire', '@egen/esm-annuaire-app', { title: 'Annuaire' }),
        ext('sites', '@egen/esm-sites-app', { title: 'Sites' }),
        ext('news', '@egen/esm-news-app', { title: 'News', global: true }),
      ],
      active,
    );
    expect(ids(entries)).toEqual(['annuaire', 'news']);
  });

  it('une entrée qui devient non montée disparaît, une globale reste', () => {
    const assigned = [
      ext('annuaire', '@egen/esm-annuaire-app', { title: 'Annuaire' }),
      ext('news', '@egen/esm-news-app', { title: 'News', global: true }),
    ];
    expect(ids(resolveStaggeredMenuEntries(assigned, new Set()))).toEqual(['news']);
  });

  it('écarte les entrées dont la meta est invalide', () => {
    const entries = resolveStaggeredMenuEntries(
      [ext('ok', 'm', { title: 'ok', global: true }), ext('ko', 'm', { global: true }), ext('ko2', 'm', undefined)],
      active,
    );
    expect(ids(entries)).toEqual(['ok']);
  });

  it('range par zone (top, content, bottom) puis par ordre', () => {
    const entries = resolveStaggeredMenuEntries(
      [
        ext('bas', 'm', { title: 'bas', global: true, area: 'bottom', order: 1 }),
        ext('milieu-2', 'm', { title: 'm2', global: true, order: 2 }),
        ext('haut', 'm', { title: 'haut', global: true, area: 'top' }),
        ext('milieu-1', 'm', { title: 'm1', global: true, area: 'content', order: 1 }),
      ],
      active,
    );
    expect(ids(entries)).toEqual(['haut', 'milieu-1', 'milieu-2', 'bas']);
    expect(entries.map((e) => e.area)).toEqual(['top', 'content', 'content', 'bottom']);
  });

  it("sans order, suit l'ordre d'enregistrement du slot", () => {
    const entries = resolveStaggeredMenuEntries(
      [ext('a', 'm', { title: 'a', global: true }), ext('b', 'm', { title: 'b', global: true })],
      active,
    );
    expect(ids(entries)).toEqual(['a', 'b']);
  });

  it("à order égal, la priorité la plus haute passe devant, puis l'ordre d'enregistrement", () => {
    const entries = resolveStaggeredMenuEntries(
      [
        ext('a', 'm', { title: 'a', global: true, order: 1 }),
        ext('b', 'm', { title: 'b', global: true, order: 1, priority: 5 }),
        ext('c', 'm', { title: 'c', global: true, order: 1, priority: 5 }),
      ],
      active,
    );
    expect(ids(entries)).toEqual(['b', 'c', 'a']);
  });

  it('applique les valeurs par défaut (zone content, priorité 0)', () => {
    const [entry] = resolveStaggeredMenuEntries([ext('a', 'm', { title: 'a', global: true })], active);
    expect(entry).toMatchObject({ id: 'a', moduleName: 'm', area: 'content', priority: 0, order: 0 });
  });

  describe('maxEntries', () => {
    const assigned = [
      ext('a', 'm', { title: 'a', global: true, order: 1, priority: 1 }),
      ext('b', 'm', { title: 'b', global: true, order: 2, priority: 9 }),
      ext('c', 'm', { title: 'c', global: true, order: 3, priority: 5 }),
      ext('d', 'm', { title: 'd', global: true, order: 4, priority: 5 }),
    ];

    it("écarte les moins prioritaires et garde l'ordre d'affichage", () => {
      expect(ids(resolveStaggeredMenuEntries(assigned, active, { maxEntries: 2 }))).toEqual(['b', 'c']);
    });

    it("à priorité égale, garde celles qui passent en premier à l'affichage", () => {
      expect(ids(resolveStaggeredMenuEntries(assigned, active, { maxEntries: 3 }))).toEqual(['b', 'c', 'd']);
    });

    it('0 masque tout ; une limite absente, invalide ou trop grande ne filtre rien', () => {
      expect(resolveStaggeredMenuEntries(assigned, active, { maxEntries: 0 })).toEqual([]);
      for (const maxEntries of [undefined, -1, Number.NaN, 4, 99]) {
        expect(resolveStaggeredMenuEntries(assigned, active, { maxEntries })).toHaveLength(4);
      }
    });
  });
});
