import { describe, expect, it } from 'vitest';
import {
  getToolWindowMetaProblems,
  isSafeToolWindowIconUrl,
  isToolWindowMeta,
  isToolWindowSlot,
  TOOL_WINDOW_SLOTS,
} from './tool-window';

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

describe('iconUrl et diagnostic', () => {
  it.each(['https://cdn.example.org/a.svg', '/assets/a.svg', 'data:image/svg+xml;base64,PHN2Zz4='])(
    'accepte %s',
    (url) => {
      expect(isSafeToolWindowIconUrl(url)).toBe(true);
      expect(isToolWindowMeta({ title: 'A', iconUrl: url })).toBe(true);
    },
  );

  it.each([
    'javascript:alert(1)',
    'http://insecure.example/a.svg',
    '//evil.example/a.svg',
    'data:text/html,<b>',
    '',
    3,
  ])('refuse %j', (url) => {
    expect(isSafeToolWindowIconUrl(url)).toBe(false);
    expect(isToolWindowMeta({ title: 'A', iconUrl: url })).toBe(false);
  });

  it('nomme chaque problème de la meta', () => {
    expect(getToolWindowMetaProblems({ title: 'A', order: 'x', rail: 'top' })).toHaveLength(2);
    expect(getToolWindowMetaProblems(undefined)[0]).toContain('meta');
    expect(getToolWindowMetaProblems({ title: 'A' })).toEqual([]);
  });

  it('reconnaît les slots de rail', () => {
    expect(isToolWindowSlot('shell-rail-left-slot')).toBe(true);
    expect(isToolWindowSlot('home-sections')).toBe(false);
  });
});
