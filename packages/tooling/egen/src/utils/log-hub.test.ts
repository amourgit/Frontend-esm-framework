import { afterEach, describe, expect, it } from 'vitest';
import { LogHub, detectLevel, stripAnsi } from './log-hub';

describe('detectLevel', () => {
  it.each([
    ['\u001b[31mError: boom\u001b[0m', 'error'],
    ['Rspack compiled with 6 errors in 25.54 s', 'error'],
    ['Module not found: failed to compile', 'error'],
    ['WARNING in ./src/a.ts', 'warn'],
    ['Rspack compiled with 1 warning in 26 s', 'warn'],
    ['[egen] Listening at http://localhost:8081', 'success'],
    ['Rspack 1.7.9 compiled successfully in 19 s', 'success'],
    ['debug: cache hit', 'debug'],
    ['<i> [webpack-dev-server] Loopback: http://localhost:8100/', 'info'],
  ])('%s → %s', (line, level) => expect(detectLevel(line)).toBe(level));

  it.each(['plain line', './translations/en.json 779 bytes [built] [code generated]', 'asset main.js 5 MiB [emitted]'])(
    'sans indice : %s',
    (line) => expect(detectLevel(line)).toBeUndefined(),
  );
  it('retire les séquences ANSI', () => expect(stripAnsi('\u001b[1;32mok\u001b[0m')).toBe('ok'));
});

describe('LogHub niveaux et lignes', () => {
  const entries = (hub: LogHub) => (hub as unknown as { entries: Array<{ level: string; message: string; id: number }> }).entries;

  it('les lignes de suite héritent du niveau du bloc d\'erreur', () => {
    const hub = new LogHub();
    hub.ingest('app', 'ERROR in ./src/index.ts:4:23\n  × TS2307: Cannot find module\n  │ > 4 | import x\nautre ligne\n');
    expect(entries(hub).map((e) => e.level)).toEqual(['error', 'error', 'error', 'info']);
  });

  it('un retour chariot ne garde que le dernier état de la ligne', () => {
    const hub = new LogHub();
    hub.ingest('app', 'progress 10%\rprogress 60%\rprogress 100%\n');
    expect(entries(hub).map((e) => e.message)).toEqual(['progress 100%']);
  });

  it('les ids sont croissants', () => {
    const hub = new LogHub();
    hub.ingest('a', 'x\ny\n');
    const [first, second] = entries(hub);
    expect(second.id).toBe(first.id + 1);
  });
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
