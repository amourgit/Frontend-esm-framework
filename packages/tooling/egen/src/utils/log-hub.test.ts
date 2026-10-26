import { afterEach, describe, expect, it } from 'vitest';
import { LogHub, detectLevel, stripAnsi } from './log-hub';

describe('detectLevel', () => {
  it.each([
    ['\u001b[31mError: boom\u001b[0m', 'error'],
    ['Module not found: failed to compile', 'error'],
    ['WARNING in ./src/a.ts', 'warn'],
    ['[egen] Listening at http://localhost:8081', 'success'],
    ['compiled successfully', 'success'],
    ['debug: cache hit', 'debug'],
    ['plain line', 'info'],
  ])('%s → %s', (line, level) => expect(detectLevel(line)).toBe(level));

  it('stderr sans indice → avertissement', () => expect(detectLevel('plain', 'warn')).toBe('warn'));
  it('retire les séquences ANSI', () => expect(stripAnsi('\u001b[1;32mok\u001b[0m')).toBe('ok'));
});

describe('LogHub', () => {
  let port: number | undefined;
  const hub = new LogHub();
  afterEach(() => (port = undefined));

  it('découpe les flux en lignes complètes et garde l\'historique', async () => {
    hub.ingest('app', 'ligne 1\nlig');
    hub.ingest('app', 'ne 2\n\n   \n');
    port = await hub.start();
    const res = await fetch(`http://127.0.0.1:${port}/history`);
    const entries = (await res.json()) as Array<{ message: string; source: string }>;
    expect(entries.map((e) => e.message)).toEqual(['ligne 1', 'ligne 2']);
    expect(entries[0].source).toBe('app');
  });

  it('diffuse en SSE les nouvelles lignes', async () => {
    port = await hub.start();
    const res = await fetch(`http://127.0.0.1:${port}/stream`, { headers: { 'Last-Event-ID': '2' } });
    const reader = res.body!.getReader();
    hub.push('app', 'Error: live');
    let frame = '';
    while (!frame.includes('live')) frame += new TextDecoder().decode((await reader.read()).value);
    expect(frame).toContain('"level":"error"');
    expect(frame).toContain('Error: live');
    await reader.cancel();
  });
});
