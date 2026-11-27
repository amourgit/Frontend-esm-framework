import { describe, expect, it } from 'vitest';
import { isXboxAudioMuted, playXboxSound, toggleXboxAudio } from './index';

describe('sons d’interface', () => {
  it('expose les trois fonctions publiques', () => {
    expect(typeof playXboxSound).toBe('function');
    expect(typeof isXboxAudioMuted).toBe('function');
    expect(typeof toggleXboxAudio).toBe('function');
  });

  it('toggleXboxAudio inverse l’état muet et le renvoie', () => {
    const avant = isXboxAudioMuted();
    const apres = toggleXboxAudio();
    expect(apres).toBe(!avant);
    expect(isXboxAudioMuted()).toBe(apres);
    toggleXboxAudio(); // remet l’état initial
    expect(isXboxAudioMuted()).toBe(avant);
  });

  it('jouer un son en mode muet ne lève aucune erreur', () => {
    if (!isXboxAudioMuted()) toggleXboxAudio();
    expect(() => playXboxSound('select')).not.toThrow();
    toggleXboxAudio();
  });
});
