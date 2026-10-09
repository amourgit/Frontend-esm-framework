// =============================================================================
//  Module — Exécution des appels de tools demandés par le backend
//
//  Le backend envoie `tool.call` ; ce module passe par le pipeline complet de
//  esm-ai-tools (résolution, validation des arguments, permissions, timeout,
//  décorateurs) — jamais en confiance aveugle — puis renvoie `tool.result`.
//
//  • exécution séquentielle (navigation, remplissage de champs… ne se
//    parallélisent pas) ;
//  • idempotence : un `callId` déjà traité renvoie le résultat mis en cache ;
//  • `tool.cancel` : un appel encore en file n'est pas exécuté ;
//  • le résultat est « fiable » : mis en file si le canal est coupé au moment de
//    l'envoi, livré à la reconnexion.
// =============================================================================

import { executeTool, type AIToolResult } from '@egen-civitas/esm-ai-tools';
import { getAIContext } from '@egen-civitas/esm-ai-context';
import { getAIConfig } from '@egen-civitas/esm-ai-config';
import type { AIChannel, ChannelModule } from '../channel.js';
import type { ServerPayloadMap } from '../protocol.js';

export type ToolActivityStatus = 'running' | 'success' | 'error' | 'cancelled';

export interface ToolActivity {
  callId: string;
  tool: string;
  arguments: Record<string, unknown>;
  status: ToolActivityStatus;
  /** Flux de conversation à l'origine de l'appel */
  streamId?: string;
  error?: string;
  durationMs?: number;
}

export type ToolActivityListener = (activity: ToolActivity) => void;

export interface ToolDispatcher extends ChannelModule {
  onActivity(listener: ToolActivityListener): () => void;
}

export interface ToolDispatcherOptions {
  /** Exécuteur (défaut : pipeline esm-ai-tools) — injectable pour les tests */
  execute?: (request: { tool: string; arguments: Record<string, unknown> }) => Promise<AIToolResult>;
  resultCacheSize?: number;
}

type ToolCallPayload = ServerPayloadMap['tool.call'];

export function createToolDispatcher(options: ToolDispatcherOptions = {}): ToolDispatcher {
  const listeners = new Set<ToolActivityListener>();
  const cacheSize = options.resultCacheSize ?? 200;

  const execute =
    options.execute ?? ((request) => executeTool({ tool: request.tool, arguments: request.arguments }, getAIContext()));

  const emit = (activity: ToolActivity) => {
    for (const l of listeners) {
      try {
        l(activity);
      } catch (err) {
        console.error('[EGEN AI Channel] Erreur dans un écouteur d’activité de tool :', err);
      }
    }
  };

  return {
    name: 'tool-dispatcher',
    onActivity(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    attach(channel: AIChannel) {
      const results = new Map<string, AIToolResult>();
      const queued = new Set<string>();
      const cancelled = new Set<string>();
      let chain: Promise<void> = Promise.resolve();

      const reply = (callId: string, result: AIToolResult) => {
        try {
          channel.send(
            'tool.result',
            {
              callId,
              success: result.success,
              ...(result.success ? { data: result.data } : { error: result.error ?? 'Échec du tool' }),
              durationMs: result.durationMs,
            },
            { reliable: true },
          );
        } catch (err) {
          console.error('[EGEN AI Channel] Impossible d’envoyer tool.result :', err);
        }
      };

      const run = async (call: ToolCallPayload) => {
        if (cancelled.delete(call.callId)) {
          queued.delete(call.callId);
          emit({ callId: call.callId, tool: call.tool, arguments: call.arguments, status: 'cancelled', streamId: call.streamId });
          return;
        }
        queued.delete(call.callId);
        emit({ callId: call.callId, tool: call.tool, arguments: call.arguments, status: 'running', streamId: call.streamId });

        const limit = Math.min(call.timeoutMs ?? Infinity, getAIConfig().security.toolTimeoutMs);
        let result: AIToolResult;
        try {
          result = await withDeadline(execute({ tool: call.tool, arguments: call.arguments ?? {} }), limit, call.tool);
        } catch (err) {
          result = { success: false, error: err instanceof Error ? err.message : String(err), durationMs: 0 };
        }

        results.set(call.callId, result);
        if (results.size > cacheSize) results.delete(results.keys().next().value as string);

        emit({
          callId: call.callId,
          tool: call.tool,
          arguments: call.arguments,
          status: result.success ? 'success' : 'error',
          streamId: call.streamId,
          error: result.error,
          durationMs: result.durationMs,
        });
        reply(call.callId, result);
      };

      const offCall = channel.on('tool.call', (call) => {
        if (!call?.callId || !call.tool) return;
        const cached = results.get(call.callId);
        if (cached) {
          reply(call.callId, cached);
          return;
        }
        if (queued.has(call.callId)) return;
        queued.add(call.callId);
        chain = chain.then(() => run(call)).catch(() => undefined);
      });

      const offCancel = channel.on('tool.cancel', ({ callId }) => {
        if (queued.has(callId)) cancelled.add(callId);
      });

      return () => {
        offCall();
        offCancel();
      };
    },
  };
}

function withDeadline<T>(promise: Promise<T>, ms: number, tool: string): Promise<T> {
  if (!Number.isFinite(ms)) return promise;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Tool « ${tool} » : délai de ${ms} ms dépassé`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}
