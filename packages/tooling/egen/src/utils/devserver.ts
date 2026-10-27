import { resolve } from 'path';
import { basename } from 'path';
import { fork } from 'child_process';
import { childColorEnv, getLogHub } from './log-hub';

export function startDevServer(source: string, port: number, cwd = process.cwd(), useRspack: boolean = false) {
  const runner = resolve(import.meta.dirname, 'debugger.js');
  const hub = getLogHub();
  // Avec le hub, la sortie du serveur de dev transite par lui (puis est réémise dans le terminal).
  const ps = fork(runner, [], { cwd, silent: !!hub, env: hub ? childColorEnv() : process.env });
  hub?.attachChild(ps, basename(cwd));

  ps.send({ source, port, useRspack });

  const ready = new Promise<void>((resolve, reject) => {
    ps.on('message', (msg: { type: string }) => {
      if (msg.type === 'compilation-complete') {
        resolve();
      }
    });
    ps.on('error', reject);
    ps.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Dev server process exited with code ${code}`));
      }
    });
  });

  return { process: ps, ready };
}
