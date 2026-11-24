#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { startSimulator } from '../dist/server.js';

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
if (args.includes('--help') || !opt('--app')) {
  console.log(`egen-embed-sim — simulateur de Shell EGEN pour développer une app embarquée sans le Core

Usage : egen-embed-sim --app <url> [--manifest egen-app.json] [--port 4100] [--strict] [--session session.json]

  --app        URL de l'app embarquée (ex. http://localhost:3000)
  --manifest   manifeste egen-app.json de l'app (les capacités demandées sont approuvées, sauf --strict)
  --strict     n'approuver que les capacités « par défaut » (voir doc 17 §5)
  --session    fichier JSON de la session simulée`);
  process.exit(opt('--app') ? 0 : 1);
}
const read = async (p) => (p ? JSON.parse(await readFile(p, 'utf8')) : undefined);
const sim = await startSimulator({
  app: opt('--app'),
  port: opt('--port') ? Number(opt('--port')) : undefined,
  manifest: await read(opt('--manifest')),
  session: await read(opt('--session')),
  strict: args.includes('--strict'),
});
console.log(`Simulateur de Shell EGEN : ${sim.url}\nDéclarez dans votre app : hostOrigins: ['${sim.url}']`);
