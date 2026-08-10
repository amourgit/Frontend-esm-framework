import { describe, expect, it, vi } from 'vitest';
import { fireEgenEvent, subscribeEgenEvent } from './index';

describe('Event system', () => {
  describe('fireEgenEvent', () => {
    it('dispatches an event on window by default', () => {
      const handler = vi.fn();
      window.addEventListener('egen:started', handler);

      fireEgenEvent('started');

      expect(handler).toHaveBeenCalledOnce();
      window.removeEventListener('egen:started', handler);
    });

    it('dispatches an event with payload', () => {
      const handler = vi.fn();
      window.addEventListener('egen:before-page-changed', handler);

      const payload = {
        cancelNavigation: vi.fn(),
        newPage: '/home',
        oldUrl: 'http://localhost/old',
        newUrl: 'http://localhost/new',
      };
      fireEgenEvent('before-page-changed', payload);

      expect(handler).toHaveBeenCalledOnce();
      const event = handler.mock.calls[0][0] as CustomEvent;
      expect(event.detail).toEqual(payload);
      window.removeEventListener('egen:before-page-changed', handler);
    });

    it('returns true when event is not cancelled', () => {
      const result = fireEgenEvent('started');
      expect(result).toBe(true);
    });

    it('returns false when event is cancelled', () => {
      const handler = (e: Event) => e.preventDefault();
      window.addEventListener('egen:started', handler);

      const result = fireEgenEvent('started');

      expect(result).toBe(false);
      window.removeEventListener('egen:started', handler);
    });
  });

  describe('subscribeEgenEvent', () => {
    it('subscribes to an event on window by default', () => {
      const handler = vi.fn();
      const unsubscribe = subscribeEgenEvent('started', handler);

      fireEgenEvent('started');

      expect(handler).toHaveBeenCalledOnce();
      unsubscribe();
    });

    it('receives the event payload', () => {
      const handler = vi.fn();
      const unsubscribe = subscribeEgenEvent('before-page-changed', handler);

      const payload = {
        cancelNavigation: vi.fn(),
        newPage: '/home',
        oldUrl: 'http://localhost/old',
        newUrl: 'http://localhost/new',
      };
      fireEgenEvent('before-page-changed', payload);

      expect(handler).toHaveBeenCalledWith(payload);
      unsubscribe();
    });

    it('receives undefined for events without payload', () => {
      const handler = vi.fn();
      const unsubscribe = subscribeEgenEvent('started', handler);

      fireEgenEvent('started');

      expect(handler).toHaveBeenCalledWith(undefined);
      unsubscribe();
    });

    it('unsubscribes correctly', () => {
      const handler = vi.fn();
      const unsubscribe = subscribeEgenEvent('started', handler);

      fireEgenEvent('started');
      expect(handler).toHaveBeenCalledOnce();

      unsubscribe();

      fireEgenEvent('started');
      expect(handler).toHaveBeenCalledOnce();
    });

    it('allows multiple subscribers to the same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const unsubscribe1 = subscribeEgenEvent('started', handler1);
      const unsubscribe2 = subscribeEgenEvent('started', handler2);

      fireEgenEvent('started');

      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
      unsubscribe1();
      unsubscribe2();
    });

    it('calling unsubscribe multiple times is safe', () => {
      const handler = vi.fn();
      const unsubscribe = subscribeEgenEvent('started', handler);

      unsubscribe();
      expect(() => unsubscribe()).not.toThrow();
    });

    it('unsubscribing one handler does not affect others', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const unsubscribe1 = subscribeEgenEvent('started', handler1);
      const unsubscribe2 = subscribeEgenEvent('started', handler2);

      unsubscribe1();
      fireEgenEvent('started');

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledOnce();
      unsubscribe2();
    });
  });
});
