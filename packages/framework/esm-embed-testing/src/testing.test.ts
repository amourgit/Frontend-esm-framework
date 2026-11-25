import { afterEach, describe, expect, it } from 'vitest';
import { connectToEgen } from '@egen-civitas/esm-embed-client';
import { createTestHost, defineConformance } from './index.js';
import { startSimulator, type Simulator } from './server.js';

// La suite de conformité, exécutée contre le SDK officiel
defineConformance(connectToEgen, { describe, it, expect });

const tick = (ms = 25) => new Promise((r) => setTimeout(r, ms));

describe('createTestHost', () => {
  it('journalise les services sollicités et publie les événements', async () => {
    const sim = createTestHost({ manifestCapabilities: { events: { publish: ['app.t.*'], subscribe: ['core.*'] }, notifications: {} }, approved: { events: { publish: ['app.*'], subscribe: ['core.*'] }, notifications: {} } });
    const egen = await connectToEgen({ ...sim.connectOptions, capabilities: ['events', 'notifications'] });
    await egen.events.publish('app.t.saved', { id: 1 });
    await egen.notifications.show({ kind: 'success', title: 'OK' });
    const got: unknown[] = [];
    await egen.events.subscribe('core.ping', (p) => got.push(p));
    sim.emit.event('core.ping', 7);
    await tick();
    expect(sim.published).toEqual([{ topic: 'app.t.saved', payload: { id: 1 }, from: '@acme/esm-test-app' }]);
    expect(sim.notifications).toEqual([{ kind: 'success', title: 'OK' }]);
    expect(got).toEqual([7]);
    expect(sim.calls.map((c) => `${c.cap}.${c.method}`)).toEqual(['events.publish', 'notifications.show']);
    egen.close();
    sim.destroy();
  });

  it('outils IA : l’agent invoque l’outil déclaré par l’app', async () => {
    const sim = createTestHost({ manifestCapabilities: { 'ai-tools': { tools: ['t.*'] } }, approved: { 'ai-tools': { tools: ['t.*'] } } });
    const egen = await connectToEgen({ ...sim.connectOptions, capabilities: ['ai-tools'] });
    await egen.aiTools.register([{ name: 't.sum', description: 'somme', handler: (a) => (a.a as number) + (a.b as number) }]);
    expect([...sim.tools.keys()]).toEqual(['t.sum']);
    await expect(sim.invokeTool('t.sum', { a: 1, b: 2 })).resolves.toBe(3);
    egen.close();
    sim.destroy();
  });

  it('drapeaux simulés et confirmation', async () => {
    const sim = createTestHost({ approved: { dialogs: {}, flags: { names: ['beta'] } }, flags: { beta: true }, confirm: false });
    const egen = await connectToEgen({ ...sim.connectOptions, capabilities: ['dialogs', 'flags'] });
    await expect(egen.flags.isEnabled('beta')).resolves.toBe(true);
    await expect(egen.dialogs.confirm({ title: 't', message: 'm' })).resolves.toBe(false);
    egen.close();
    sim.destroy();
  });

  it('extensions simulées : découverte et changements poussés', async () => {
    const sim = createTestHost({ extensions: { 'topbar-nav-slot': [] }, manifestCapabilities: { extensions: { discover: ['topbar-nav-slot'] } }, approved: { extensions: { discover: ['topbar-nav-slot'] } } });
    const egen = await connectToEgen({ ...sim.connectOptions, capabilities: ['extensions'] });
    await expect(egen.extensions.list('topbar-nav-slot')).resolves.toEqual([]);
    const got: unknown[] = [];
    await egen.extensions.onChange('topbar-nav-slot', (l) => got.push(l.length));
    sim.emit.extensions('topbar-nav-slot', [{ name: 'a', moduleName: 'm', meta: {} }]);
    await tick();
    expect(got).toEqual([1]);
    egen.close();
    sim.destroy();
  });

  it('goto et visibilité poussés', async () => {
    const sim = createTestHost();
    const egen = await connectToEgen({ ...sim.connectOptions, capabilities: ['navigation', 'lifecycle'] });
    const g: any[] = [];
    const v: boolean[] = [];
    await egen.navigation.onGoto((m) => g.push(m.path));
    await egen.lifecycle.onVisibility((x) => v.push(x));
    sim.emit.goto('/a');
    sim.emit.visibility(false);
    await tick();
    expect(g).toEqual(['/a']);
    expect(v).toEqual([false]);
    egen.close();
    sim.destroy();
  });
});

describe('simulateur de Shell (serveur)', () => {
  let sim: Simulator | undefined;
  afterEach(async () => void (await sim?.close()));

  it('sert la page, la configuration et les modules ; refuse la traversée de chemin', async () => {
    sim = await startSimulator({ app: 'http://localhost:3000', port: 0, manifest: { manifestVersion: 1, name: '@a/b', version: '1.0.0', title: 'T', url: 'http://localhost:3000', route: 'b', technology: 'react', navigation: { mode: 'none' }, capabilities: { locale: {}, notifications: {} } } });
    const page = await fetch(sim.url + '/');
    expect(page.status).toBe(200);
    const html = await page.text();
    expect(html).toContain('importmap');
    expect(html).toContain('createEmbedHost');
    const cfg = await (await fetch(sim.url + '/api/config')).json();
    expect(cfg.moduleName).toBe('@a/b');
    expect(cfg.approved).toEqual({ notifications: {} });
    expect(cfg.extensions['topbar-nav-slot']).toHaveLength(1);
    const mod = await fetch(sim.url + '/vendor/host/index.js');
    expect(mod.status).toBe(200);
    expect(mod.headers.get('content-type')).toMatch(/javascript/);
    for (const bad of ['/vendor/host/../../package.json', '/vendor/host/%2e%2e/%2e%2e/package.json', '/vendor/host/index.json', '/vendor/autre/index.js', '/etc/passwd']) {
      expect((await fetch(sim.url + bad)).status).toBe(404);
    }
  });

  it('refuse un manifeste invalide et un mode strict', async () => {
    await expect(startSimulator({ app: 'http://localhost:3000', port: 0, manifest: { nope: 1 } })).rejects.toThrow(/Manifeste invalide/);
    sim = await startSimulator({ app: 'http://localhost:3000', port: 0, strict: true, manifest: { manifestVersion: 1, name: '@a/b', version: '1.0.0', title: 'T', url: 'http://localhost:3000', route: 'b', technology: 'react', navigation: { mode: 'none' }, capabilities: { notifications: {} } } });
    expect((await (await fetch(sim.url + '/api/config')).json()).approved).toEqual({});
  });
});
