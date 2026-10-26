import { createServer, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { ChildProcess } from 'node:child_process';

/**
 * Hub de logs du terminal `egen develop`.
 *
 * Il capte tout ce qui sort dans le terminal (processus principal + serveurs de dev de chaque
 * app + processus `develop`), le structure (source, niveau, horodatage) et le diffuse en temps
 * réel (SSE) à l'app de logs du shell. Le texte brut, couleurs ANSI comprises, est conservé.
 * Le serveur n'écoute que sur 127.0.0.1 ; `egen develop` l'expose en same-origin via un proxy.
 */
export type LogLevel = 'error' | 'warn' | 'success' | 'info' | 'debug';

export interface LogEntry {
  id: number;
  ts: number;
  source: string;
  level: LogLevel;
  /** Ligne brute (séquences ANSI conservées). */
  message: string;
}

const MAX_ENTRIES = 5000;
// eslint-disable-next-line no-control-regex
const ANSI = /\u001b\[[0-9;]*[A-Za-z]/g;

export function stripAnsi(text: string): string {
  return text.replace(ANSI, '');
}

/** Déduit le niveau d'une ligne ; `fallback` (stderr → `error`) ne s'applique qu'en l'absence d'indice. */
export function detectLevel(line: string, fallback: LogLevel = 'info'): LogLevel {
  const text = stripAnsi(line);
  if (/\b(error|erreur|fatal|failed|failure|exception|ELIFECYCLE|ERR_|TS\d{4})\b|✖|✘|^\s*at\s.+\(.+\)/i.test(text)) return 'error';
  if (/\b(warn|warning|avertissement|deprecated|deprecation)\b|⚠/i.test(text)) return 'warn';
  if (/\b(success|succeeded|compiled|ready|done|listening|available|built)\b|✔|✓/i.test(text)) return 'success';
  if (/\b(debug|trace|verbose)\b/i.test(text)) return 'debug';
  return fallback === 'error' ? 'info' : fallback;
}

export class LogHub {
  private entries: LogEntry[] = [];
  private nextId = 1;
  private clients = new Set<ServerResponse>();
  private partial = new Map<string, string>();
  private server?: Server;
  private readonly write = {
    out: process.stdout.write.bind(process.stdout),
    err: process.stderr.write.bind(process.stderr),
  };

  push(source: string, line: string, stream: 'out' | 'err' = 'out') {
    const message = line.replace(/\r$/, '');
    if (stripAnsi(message).trim().length === 0) return;
    const level = detectLevel(message, stream === 'err' ? 'warn' : 'info');
    const entry: LogEntry = { id: this.nextId++, ts: Date.now(), source, level, message };
    this.entries.push(entry);
    if (this.entries.length > MAX_ENTRIES) this.entries.splice(0, this.entries.length - MAX_ENTRIES);
    const frame = `id: ${entry.id}\ndata: ${JSON.stringify(entry)}\n\n`;
    for (const client of this.clients) client.write(frame);
  }

  /** Découpe un flux en lignes complètes (le reste attend le prochain bloc). */
  ingest(source: string, chunk: string | Buffer, stream: 'out' | 'err' = 'out') {
    const key = `${source}:${stream}`;
    const text = (this.partial.get(key) ?? '') + chunk.toString();
    const lines = text.split('\n');
    this.partial.set(key, lines.pop() ?? '');
    for (const line of lines) this.push(source, line, stream);
  }

  /** Duplique stdout/stderr du processus courant dans le hub (le terminal reste inchangé). */
  teeProcess(source: string) {
    for (const [name, stream] of [['out', process.stdout], ['err', process.stderr]] as const) {
      const original = this.write[name];
      stream.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
        try {
          this.ingest(source, typeof chunk === 'string' ? chunk : Buffer.from(chunk), name);
        } catch {
          // le hub ne doit jamais casser la sortie du terminal
        }
        return (original as (...a: unknown[]) => boolean)(chunk, ...rest);
      }) as typeof stream.write;
    }
  }

  /** Capte la sortie d'un processus fils (créé avec `silent: true`) et la réémet dans le terminal. */
  attachChild(child: ChildProcess, source: string) {
    child.stdout?.on('data', (data: Buffer) => {
      this.write.out(data);
      this.ingest(source, data, 'out');
    });
    child.stderr?.on('data', (data: Buffer) => {
      this.write.err(data);
      this.ingest(source, data, 'err');
    });
  }

  start(): Promise<number> {
    if (this.server?.listening) return Promise.resolve((this.server.address() as AddressInfo).port);
    this.server = createServer((req, res) => {
      const path = (req.url ?? '/').split('?')[0].replace(/\/+$/, '');
      if (path === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({ ok: true, entries: this.entries.length }));
      } else if (path === '/history') {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify(this.entries));
      } else if (path === '/stream') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-store',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        });
        res.write(': connected\n\n'); // envoie les en-têtes tout de suite (onopen côté navigateur)
        // Reprise après coupure : seules les entrées manquantes sont renvoyées.
        const last = Number(req.headers['last-event-id'] ?? 0) || 0;
        for (const entry of this.entries) {
          if (entry.id > last) res.write(`id: ${entry.id}\ndata: ${JSON.stringify(entry)}\n\n`);
        }
        this.clients.add(res);
        const ping = setInterval(() => res.write(': ping\n\n'), 15000);
        req.on('close', () => {
          clearInterval(ping);
          this.clients.delete(res);
        });
      } else {
        res.writeHead(404).end();
      }
    });
    return new Promise((resolve, reject) => {
      this.server!.once('error', reject);
      this.server!.listen(0, '127.0.0.1', () => {
        this.server!.unref();
        resolve((this.server!.address() as AddressInfo).port);
      });
    });
  }
}

let hub: LogHub | undefined;

export function getLogHub(): LogHub | undefined {
  return hub;
}

/** Démarre (une seule fois) le hub : capte le processus courant et retourne son port local. */
export async function startLogHub(): Promise<{ hub: LogHub; port: number }> {
  hub ??= new LogHub();
  const port = await hub.start();
  hub.teeProcess('egen');
  return { hub, port };
}
