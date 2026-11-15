#!/usr/bin/env node
// Suivi des phases du chantier Design System (verrouillage multi-développeurs).
// Usage : node scripts/design-system-tracking.mjs <claim|release|complete|check> [DS-n] [développeur]
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'docs/design-system/TRACKING.md';
const ROW = /^\| (DS-\d+) \| (.+?) \| \[( |~|x)\] (todo|locked|done) \| (.+?) \| (.+?) \|$/;
const [cmd, phase, who] = process.argv.slice(2);

const lines = readFileSync(FILE, 'utf8').split('\n');
const rows = lines.map((l, i) => ({ i, m: l.match(ROW) })).filter((r) => r.m);
const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};
const write = (r, status, lock, date) => {
  const box = status === 'done' ? 'x' : status === 'locked' ? '~' : ' ';
  lines[r.i] = `| ${r.m[1]} | ${r.m[2]} | [${box}] ${status} | ${lock} | ${date} |`;
  writeFileSync(FILE, lines.join('\n'));
};

if (cmd === 'check') {
  if (rows.length === 0) fail('Aucune phase trouvée');
  rows.forEach((r, idx) => {
    if (r.m[1] !== `DS-${idx}`) fail(`Ordre des phases invalide : ${r.m[1]}`);
    const [, , , status, lock] = r.m;
    if (status === 'locked' && lock === '—') fail(`${r.m[1]} verrouillée sans propriétaire`);
    if (status === 'done') {
      const before = rows.slice(0, idx).find((p) => p.m[4] !== 'done');
      if (before) fail(`${r.m[1]} validée alors que ${before.m[1]} ne l'est pas`);
    }
  });
  console.log(`OK — ${rows.length} phases, ${rows.filter((r) => r.m[4] === 'done').length} validées`);
} else {
  const r = rows.find((x) => x.m[1] === phase);
  if (!r) fail(`Phase inconnue : ${phase}`);
  const [, , , status, lock] = r.m;
  if (cmd === 'claim') {
    if (!who) fail('Développeur requis');
    if (status === 'done') fail(`${phase} déjà validée`);
    if (status === 'locked' && lock !== who) fail(`${phase} verrouillée par ${lock}`);
    write(r, 'locked', who, '—');
  } else if (cmd === 'release') {
    if (status === 'locked' && who && lock !== who) fail(`${phase} appartient à ${lock}`);
    if (status !== 'done') write(r, 'todo', '—', '—');
  } else if (cmd === 'complete') {
    if (status === 'locked' && who && lock !== who) fail(`${phase} appartient à ${lock}`);
    write(r, 'done', '—', new Date().toISOString().slice(0, 10));
  } else fail('Commande : claim | release | complete | check');
  console.log(`${phase} → ${cmd}`);
}
