/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dispatchAIEvent, subscribeToAIEvent, observeAIEvent, subscribeToAllAIEvents, aiEvents$, AI_EVENTS } from '.';

describe('AI Event Bus', () => {
  describe('dispatchAIEvent', () => {
    it("notifie les subscribers de l'événement correct", () => {
      const handler = vi.fn();
      const unsub = subscribeToAIEvent(AI_EVENTS.TOOL_EXECUTED, handler);

      dispatchAIEvent(AI_EVENTS.TOOL_EXECUTED, {
        toolId: 'navigate',
        toolName: 'navigate',
        executionId: 'exec-1',
        durationMs: 10,
        success: true,
      });

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].toolId).toBe('navigate');
      expect(handler.mock.calls[0][0].success).toBe(true);
      unsub();
    });

    it('ajoute timestamp et eventId automatiquement', () => {
      const handler = vi.fn();
      const unsub = subscribeToAIEvent(AI_EVENTS.TOOL_EXECUTED, handler);

      dispatchAIEvent(AI_EVENTS.TOOL_EXECUTED, {
        toolId: 't1',
        toolName: 't1',
        executionId: 'exec-2',
        durationMs: 5,
        success: true,
      });

      const payload = handler.mock.calls[0][0];
      expect(payload.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(payload.eventId).toMatch(/^egen-ai-evt-/);
      unsub();
    });

    it('émet un CustomEvent DOM en parallèle', () => {
      const domHandler = vi.fn();
      window.addEventListener(AI_EVENTS.TOOL_EXECUTED, domHandler);

      dispatchAIEvent(AI_EVENTS.TOOL_EXECUTED, {
        toolId: 'navigate',
        toolName: 'navigate',
        executionId: 'exec-3',
        durationMs: 8,
        success: true,
      });

      expect(domHandler).toHaveBeenCalledOnce();
      window.removeEventListener(AI_EVENTS.TOOL_EXECUTED, domHandler);
    });

    it('les eventIds sont uniques', () => {
      const ids: string[] = [];
      const unsub = subscribeToAIEvent(AI_EVENTS.CAPABILITY_REGISTERED, (p) => ids.push(p.eventId));

      for (let i = 0; i < 5; i++) {
        dispatchAIEvent(AI_EVENTS.CAPABILITY_REGISTERED, {
          capabilityId: `cap-${i}`,
          capabilityName: `Capability ${i}`,
        });
      }

      expect(new Set(ids).size).toBe(5);
      unsub();
    });
  });

  describe('subscribeToAIEvent', () => {
    it("ne reçoit pas les événements d'autres types", () => {
      const handler = vi.fn();
      const unsub = subscribeToAIEvent(AI_EVENTS.TOOL_REGISTERED, handler);

      dispatchAIEvent(AI_EVENTS.TOOL_EXECUTED, {
        toolId: 't',
        toolName: 't',
        executionId: 'e',
        durationMs: 1,
        success: true,
      });

      expect(handler).not.toHaveBeenCalled();
      unsub();
    });

    it('arrête de recevoir après unsubscribe', () => {
      const handler = vi.fn();
      const unsub = subscribeToAIEvent(AI_EVENTS.MESSAGE_SENT, handler);
      unsub();

      dispatchAIEvent(AI_EVENTS.MESSAGE_SENT, {
        sessionId: 's1',
        messageId: 'm1',
        role: 'user',
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it('plusieurs subscribers reçoivent le même événement', () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      const u1 = subscribeToAIEvent(AI_EVENTS.SESSION_STARTED, h1);
      const u2 = subscribeToAIEvent(AI_EVENTS.SESSION_STARTED, h2);

      dispatchAIEvent(AI_EVENTS.SESSION_STARTED, { sessionId: 'sess-1' });

      expect(h1).toHaveBeenCalledOnce();
      expect(h2).toHaveBeenCalledOnce();
      u1();
      u2();
    });
  });

  describe('observeAIEvent', () => {
    it("retourne un Observable qui émet pour le bon type d'événement", () => {
      const received: string[] = [];
      const sub = observeAIEvent(AI_EVENTS.TOOL_REGISTERED).subscribe((p) => received.push(p.toolId));

      dispatchAIEvent(AI_EVENTS.TOOL_REGISTERED, {
        toolId: 'tool-a',
        toolName: 'Tool A',
        moduleName: '@test/app',
      });
      dispatchAIEvent(AI_EVENTS.TOOL_EXECUTED, {
        toolId: 'tool-b',
        toolName: 'Tool B',
        executionId: 'e',
        durationMs: 1,
        success: true,
      });

      expect(received).toEqual(['tool-a']);
      sub.unsubscribe();
    });
  });

  describe('subscribeToAllAIEvents', () => {
    it("reçoit tous les types d'événements", () => {
      const received: string[] = [];
      const unsub = subscribeToAllAIEvents((name) => received.push(name));

      dispatchAIEvent(AI_EVENTS.CONFIG_CHANGED, {
        previousEnabled: false,
        newEnabled: true,
        source: 'runtime',
      });
      dispatchAIEvent(AI_EVENTS.SESSION_STARTED, { sessionId: 's' });
      dispatchAIEvent(AI_EVENTS.TOOL_FAILED, {
        toolId: 't',
        toolName: 't',
        executionId: 'e',
        error: 'fail',
        durationMs: 0,
      });

      expect(received).toContain(AI_EVENTS.CONFIG_CHANGED);
      expect(received).toContain(AI_EVENTS.SESSION_STARTED);
      expect(received).toContain(AI_EVENTS.TOOL_FAILED);
      unsub();
    });
  });
});
