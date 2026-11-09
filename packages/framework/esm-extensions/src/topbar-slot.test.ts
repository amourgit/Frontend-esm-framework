import { describe, expect, it } from 'vitest';
import { TOPBAR_SLOT } from './topbar-slot';

describe('TOPBAR_SLOT', () => {
  it('est le slot neutre unique de la TopBar : aucun numéro de niveau ni de région dans son nom', () => {
    expect(TOPBAR_SLOT).toBe('topbar-slot');
    expect(TOPBAR_SLOT).not.toMatch(/(?:^|-)l\d|level|left|right|center/i);
  });
});
