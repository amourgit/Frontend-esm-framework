import { connectToEgen, type EgenClient } from '@egen-civitas/esm-embed-client';
import { createBus, HostConnection, type ConnectionOptions, type HostControls, type HostProviders } from '../index.js';
import { effectiveGrants, type ApprovedGrants, type EffectiveGrants } from '@egen-civitas/esm-embed-protocol';

export const ORIGIN = 'https://shell.exemple.org';
export const MODULE = '@acme/esm-demo-app';

/** Banc d'essai : un vrai `HostConnection` face au vrai client SDK, reliés par des fenêtres simulées et un vrai MessageChannel. */
export async function harness(opts: { providers?: HostProviders; approved?: ApprovedGrants; requested?: Parameters<typeof connectToEgen>[0]['capabilities']; controls?: Partial<HostControls>; grants?: EffectiveGrants; limits?: ConnectionOptions['limits'] } = {}) {
  const appWindow = new EventTarget();
  const hostWindow: any = {
    postMessage: (message: unknown, targetOrigin: string) => {
      // app → hôte : livré à la connexion comme le ferait le Shell après filtrage source/origine
      queueMicrotask(() => conn.handle(message));
      sentByApp.push({ message, targetOrigin });
    },
  };
  const sentByApp: Array<{ message: any; targetOrigin: string }> = [];
  const channel = createBus();
  const controls: HostControls = { channel, ...opts.controls };
  const conn: HostConnection = new HostConnection({
    moduleName: MODULE,
    grants: opts.grants ?? effectiveGrants(undefined, opts.approved ?? {}),
    providers: opts.providers ?? {},
    controls,
    limits: { pingIntervalMs: 0, ...opts.limits },
    post: (message, transfer) => {
      const ev: any = new Event('message');
      ev.data = message;
      ev.origin = ORIGIN;
      ev.source = hostWindow;
      ev.ports = transfer ?? [];
      queueMicrotask(() => appWindow.dispatchEvent(ev));
    },
  });
  const client: EgenClient = await new Promise<EgenClient>((resolve) => {
    connectToEgen({ moduleName: MODULE, hostOrigins: [ORIGIN], window: appWindow as any, host: hostWindow, capabilities: opts.requested, timeoutMs: 400 }).then(resolve);
  });
  return { client, conn, channel, sentByApp, close: () => (client.close(), conn.destroy()) };
}

export const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));
