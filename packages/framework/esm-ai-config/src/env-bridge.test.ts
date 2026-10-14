import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Le shell injecte dans le navigateur UNIQUEMENT les variables EGEN_AI_* d'une liste blanche
 * (rspack.config.js). Une variable lue par la config mais absente de cette liste est ignorée
 * en silence en production ; une variable listée mais jamais lue est du bruit (et, pour un secret,
 * une fuite dans le bundle). Ce test garde les deux listes synchronisées.
 */
describe('pont EGEN_AI_* du shell ↔ variables lues par la config', () => {
  const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
  const keysIn = (src: string) => [...new Set(src.match(/'EGEN_AI_[A-Z_]+'/g) ?? [])].map((k) => k.slice(1, -1)).sort();

  it('la liste blanche du shell correspond exactement aux variables lues par defaults.ts', () => {
    const defaults = keysIn(read('./defaults.ts'));
    const rspack = read('../../../shell/esm-app-shell/rspack.config.js');
    const block = rspack.slice(rspack.indexOf('const EGEN_AI_ENV_KEYS = ['), rspack.indexOf('];', rspack.indexOf('const EGEN_AI_ENV_KEYS = [')));
    expect(keysIn(block)).toEqual(defaults);
  });
});
