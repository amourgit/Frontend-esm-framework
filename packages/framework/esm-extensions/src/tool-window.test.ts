import { describe, expect, it } from 'vitest';
import { isToolWindowMeta, TOOL_WINDOW_SLOTS } from './tool-window';

describe('TOOL_WINDOW_SLOTS', () => {
  it('associe chaque zone à son slot de rail', () => {
    expect(TOOL_WINDOW_SLOTS).toEqual({
      left: 'shell-rail-left-slot',
      bottom: 'shell-rail-bottom-slot',
      right: 'shell-rail-right-slot',
    });
  });
});

describe('isToolWindowMeta', () => {
  it('accepte une meta minimale (titre seul)', () => {
    expect(isToolWindowMeta({ title: 'Annuaire' })).toBe(true);
  });

  it('accepte une meta complète', () => {
    expect(isToolWindowMeta({ title: 'Annuaire', titleKey: 'directory', icon: 'Users', order: 2 })).toBe(true);
  });

  it.each([undefined, null, 'x', 3, {}, { title: '' }, { title: 1 }])('refuse %j', (meta) => {
    expect(isToolWindowMeta(meta)).toBe(false);
  });

  it('refuse un champ optionnel de mauvais type', () => {
    expect(isToolWindowMeta({ title: 'a', icon: 3 })).toBe(false);
    expect(isToolWindowMeta({ title: 'a', titleKey: 3 })).toBe(false);
    expect(isToolWindowMeta({ title: 'a', order: 'x' })).toBe(false);
    expect(isToolWindowMeta({ title: 'a', order: Number.NaN })).toBe(false);
    expect(isToolWindowMeta({ title: 'a', global: 'yes' })).toBe(false);
  });

  it('accepte le drapeau global', () => {
    expect(isToolWindowMeta({ title: 'Annuaire', icon: 'Users', global: true })).toBe(true);
    expect(isToolWindowMeta({ title: 'Annuaire', global: false })).toBe(true);
  });
});
