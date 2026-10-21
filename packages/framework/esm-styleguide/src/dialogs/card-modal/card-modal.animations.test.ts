import { describe, expect, it } from 'vitest';
import { cardModalAnimationPresets, cardModalPresetStyles } from './card-modal.animations';

describe('cardModalAnimationPresets', () => {
  it('expose le préréglage warp avec initial/animate/exit cohérents', () => {
    const warp = cardModalAnimationPresets.warp;
    expect(warp.initial).toMatchObject({ opacity: 0, scaleY: 2, scaleX: 0.4, y: 100 });
    expect(warp.animate).toMatchObject({ opacity: 1, scaleY: 1, scaleX: 1, y: 0 });
    expect(warp.exit).toMatchObject({ opacity: 0, scaleY: 2, scaleX: 0.4, y: 100 });
  });

  it('applique la perspective 3D uniquement au préréglage warp', () => {
    expect(cardModalPresetStyles.warp).toMatchObject({ transformPerspective: 1000, originY: 0 });
    expect(cardModalPresetStyles.scale).toBeUndefined();
  });
});
