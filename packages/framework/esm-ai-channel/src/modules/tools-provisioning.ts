// =============================================================================
//  Module — Provisionnement des tools frontend vers le backend IA
//
//  Le backend doit connaître, à tout instant, les tools que CE frontend sait
//  exécuter (et que l'utilisateur courant a le droit d'exécuter) pour pouvoir
//  les appeler. Ce module :
//    • envoie le catalogue complet (`tools.sync` : tools exécutables + capacités
//      déclaratives) à chaque (re)connexion ;
//    • envoie les différences (`tools.delta`) quand un microfrontend enregistre /
//      remplace / retire un tool ou une capacité, ou quand les privilèges de
//      l'utilisateur changent ;
//    • renvoie le catalogue complet sur demande du backend (`tools.request_sync`).
// =============================================================================

import {
  getCapabilityDescriptors,
  getToolDescriptors,
  type AICapabilityDescriptor,
  type AIToolDescriptor,
} from '@egen-civitas/esm-ai-tools';
import { subscribeToAIEvent, AI_EVENTS } from '@egen-civitas/esm-ai-events';
import { sessionStore } from '@egen-civitas/esm-api';
import type { AIChannel, ChannelModule } from '../channel.js';

export interface ToolsProvisioningOptions {
  /** Privilèges de l'utilisateur courant (défaut : session EGEN) */
  getPrivileges?: () => string[];
  /** Abonnement aux changements de privilèges (défaut : session EGEN) */
  subscribePrivileges?: (listener: () => void) => () => void;
  /** Source des tools (défaut : registre esm-ai-tools) */
  getDescriptors?: (privileges: string[]) => AIToolDescriptor[];
  /** Source des capacités déclaratives (défaut : registre esm-ai-tools) */
  getCapabilities?: (privileges: string[]) => AICapabilityDescriptor[];
  /** Abonnement aux changements du registre (défaut : évènements esm-ai-events) */
  subscribeRegistry?: (listener: () => void) => () => void;
  debounceMs?: number;
}

function sessionPrivileges(): string[] {
  const state = sessionStore.getState();
  return state.loaded && state.session?.user ? (state.session.user.privileges?.map((p) => p.display) ?? []) : [];
}

function defaultSubscribeRegistry(listener: () => void): () => void {
  const unsubs = [
    subscribeToAIEvent(AI_EVENTS.TOOL_REGISTERED, listener),
    subscribeToAIEvent(AI_EVENTS.TOOL_OVERRIDDEN, listener),
    subscribeToAIEvent(AI_EVENTS.TOOL_REMOVED, listener),
    subscribeToAIEvent(AI_EVENTS.CAPABILITY_REGISTERED, listener),
    subscribeToAIEvent(AI_EVENTS.CAPABILITY_REMOVED, listener),
  ];
  return () => unsubs.forEach((u) => u());
}

export function createToolsProvisioning(options: ToolsProvisioningOptions = {}): ChannelModule {
  const getPrivileges = options.getPrivileges ?? sessionPrivileges;
  const subscribePrivileges = options.subscribePrivileges ?? ((l) => sessionStore.subscribe(l));
  const getDescriptors = options.getDescriptors ?? getToolDescriptors;
  const getCapabilities = options.getCapabilities ?? getCapabilityDescriptors;
  const subscribeRegistry = options.subscribeRegistry ?? defaultSubscribeRegistry;
  const debounceMs = options.debounceMs ?? 50;

  return {
    name: 'tools-provisioning',
    attach(channel: AIChannel) {
      let revision = 0;
      /** clé (`tool:<id>` | `cap:<id>`) → sérialisation du descripteur tel que connu du backend */
      let known = new Map<string, string>();
      let timer: ReturnType<typeof setTimeout> | null = null;

      const snapshot = () => {
        const privileges = getPrivileges();
        const tools = getDescriptors(privileges);
        const capabilities = getCapabilities(privileges);
        const map = new Map<string, string>([
          ...tools.map((d) => [`tool:${d.id}`, JSON.stringify(d)] as [string, string]),
          ...capabilities.map((d) => [`cap:${d.id}`, JSON.stringify(d)] as [string, string]),
        ]);
        return { tools, capabilities, map };
      };

      const sendFull = () => {
        const { tools, capabilities, map } = snapshot();
        revision++;
        known = map;
        try {
          channel.send('tools.sync', { revision, tools, capabilities });
        } catch {
          // canal coupé : la synchronisation complète repartira à la reconnexion
        }
      };

      const sendDelta = () => {
        if (!channel.isReady) return;
        const { tools, capabilities, map } = snapshot();
        const upsert = tools.filter((d) => known.get(`tool:${d.id}`) !== map.get(`tool:${d.id}`));
        const capabilitiesUpsert = capabilities.filter((d) => known.get(`cap:${d.id}`) !== map.get(`cap:${d.id}`));
        const gone = [...known.keys()].filter((key) => !map.has(key));
        const removed = gone.filter((k) => k.startsWith('tool:')).map((k) => k.slice('tool:'.length));
        const capabilitiesRemoved = gone.filter((k) => k.startsWith('cap:')).map((k) => k.slice('cap:'.length));
        if (!upsert.length && !removed.length && !capabilitiesUpsert.length && !capabilitiesRemoved.length) return;
        revision++;
        known = map;
        try {
          channel.send('tools.delta', { revision, upsert, removed, capabilitiesUpsert, capabilitiesRemoved });
        } catch {
          // idem
        }
      };

      const scheduleDelta = () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          timer = null;
          sendDelta();
        }, debounceMs);
      };

      const unsubs = [
        channel.onReady(sendFull),
        channel.onDisconnect(() => {
          known = new Map();
        }),
        channel.on('tools.request_sync', sendFull),
        subscribeRegistry(scheduleDelta),
        subscribePrivileges(scheduleDelta),
      ];

      return () => {
        if (timer) clearTimeout(timer);
        unsubs.forEach((u) => u());
      };
    },
  };
}
