import { describe, expect, it } from 'vitest';
import { isNavEntryInWorkspace, isNavEntryMeta, type NavEntryMeta } from './nav-entry';

const base: NavEntryMeta = { section: 'annuaire', label: 'Contacts', route: 'annuaire/contacts' };

describe('isNavEntryMeta', () => {
  it('accepte une entrée minimale, sans group (lien simple)', () => {
    expect(isNavEntryMeta(base)).toBe(true);
  });

  it('accepte une entrée complète avec group, workspaces et sectionRoute', () => {
    expect(
      isNavEntryMeta({ ...base, group: 'collab', workspaces: ['intranet', 'extranet'], sectionRoute: 'annuaire' }),
    ).toBe(true);
  });

  it.each(['section', 'label', 'route'])('refuse une entrée sans %s', (key) => {
    expect(isNavEntryMeta({ ...base, [key]: '' })).toBe(false);
    const { [key as keyof NavEntryMeta]: _omitted, ...rest } = base;
    expect(isNavEntryMeta(rest)).toBe(false);
  });

  it('refuse un group, un sectionRoute ou des workspaces mal typés', () => {
    expect(isNavEntryMeta({ ...base, group: '' })).toBe(false);
    expect(isNavEntryMeta({ ...base, group: 3 })).toBe(false);
    expect(isNavEntryMeta({ ...base, sectionRoute: '' })).toBe(false);
    expect(isNavEntryMeta({ ...base, workspaces: 'intranet' })).toBe(false);
    expect(isNavEntryMeta({ ...base, workspaces: ['intranet', 2] })).toBe(false);
  });

  it('refuse null, undefined et les valeurs non objet', () => {
    expect(isNavEntryMeta(null)).toBe(false);
    expect(isNavEntryMeta(undefined)).toBe(false);
    expect(isNavEntryMeta('annuaire')).toBe(false);
  });
});

describe('isNavEntryInWorkspace', () => {
  it('est visible partout sans liste, avec une liste vide ou avec « * »', () => {
    expect(isNavEntryInWorkspace(base, 'extranet')).toBe(true);
    expect(isNavEntryInWorkspace({ ...base, workspaces: [] }, 'extranet')).toBe(true);
    expect(isNavEntryInWorkspace({ ...base, workspaces: ['*'] }, 'extranet')).toBe(true);
  });

  it("n'est visible que dans les espaces listés", () => {
    const meta = { ...base, workspaces: ['intranet', 'rh'] };
    expect(isNavEntryInWorkspace(meta, 'intranet')).toBe(true);
    expect(isNavEntryInWorkspace(meta, 'rh')).toBe(true);
    expect(isNavEntryInWorkspace(meta, 'extranet')).toBe(false);
  });
});
