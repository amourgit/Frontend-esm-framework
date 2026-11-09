import { describe, expect, it } from 'vitest';
import { MAX_MESSAGE_LENGTH, isSupportedProtocolVersion, parseHostMessage } from './protocol';

const msg = (extra: Record<string, unknown>) => JSON.stringify({ p: 'egen-host', v: 1, ...extra });

describe('isSupportedProtocolVersion', () => {
  it('accepte la v1 uniquement', () => {
    expect(isSupportedProtocolVersion(1)).toBe(true);
    expect(isSupportedProtocolVersion(0)).toBe(false);
    expect(isSupportedProtocolVersion(2)).toBe(false);
    expect(isSupportedProtocolVersion(1.5)).toBe(false);
    expect(isSupportedProtocolVersion('1')).toBe(false);
  });
});

describe('parseHostMessage', () => {
  it('décode une réponse de succès', () => {
    expect(parseHostMessage(msg({ id: 'a', ok: true, r: 42 }))).toEqual({
      p: 'egen-host',
      v: 1,
      id: 'a',
      ok: true,
      r: 42,
    });
  });

  it("décode une réponse d'échec et normalise un `e` absent en objet vide", () => {
    expect(parseHostMessage(msg({ id: 'a', ok: false, e: { code: 'DENIED' } }))).toMatchObject({
      ok: false,
      e: { code: 'DENIED' },
    });
    expect(parseHostMessage(msg({ id: 'a', ok: false }))).toMatchObject({ ok: false, e: {} });
    expect(parseHostMessage(msg({ id: 'a', ok: false, e: 'x' }))).toMatchObject({ ok: false, e: {} });
  });

  it('décode un événement', () => {
    expect(parseHostMessage(msg({ ev: 'lifecycle.resume', d: { a: 1 } }))).toEqual({
      p: 'egen-host',
      v: 1,
      ev: 'lifecycle.resume',
      d: { a: 1 },
    });
  });

  it('ne filtre pas la version (le client répond « incompatible » plutôt que de laisser expirer)', () => {
    expect(parseHostMessage(JSON.stringify({ p: 'egen-host', v: 9, id: 'a', ok: true }))).toMatchObject({ v: 9 });
  });

  it.each([
    ['non textuel', 42],
    ['objet', {}],
    ['null', null],
    ['chaîne vide', ''],
    ['JSON invalide', '{pas du json'],
    ['tableau', '[]'],
    ['nombre JSON', '12'],
    ['sans p', JSON.stringify({ v: 1, id: 'a', ok: true })],
    ['mauvais p', JSON.stringify({ p: 'autre', v: 1, id: 'a', ok: true })],
    ['v non numérique', JSON.stringify({ p: 'egen-host', v: '1', id: 'a', ok: true })],
    ['ni réponse ni événement', msg({ foo: 1 })],
    ['id non textuel', msg({ id: 5, ok: true })],
    ['ok non booléen', msg({ id: 'a', ok: 'oui' })],
    ['ev non textuel', msg({ ev: 5 })],
  ])('ignore : %s', (_label, raw) => {
    expect(parseHostMessage(raw)).toBeNull();
  });

  it('ignore un message trop long', () => {
    expect(parseHostMessage(msg({ id: 'a', ok: true, r: 'x'.repeat(MAX_MESSAGE_LENGTH) }))).toBeNull();
  });

  it("n'évalue rien : un contenu qui ressemble à du code reste une donnée", () => {
    const parsed = parseHostMessage(msg({ id: 'a', ok: true, r: 'alert(1)//</script>' }));
    expect(parsed).toMatchObject({ r: 'alert(1)//</script>' });
  });
});
