import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Le package expose `.` → dist/internal.js (c'est l'entrée réellement chargée par
// `@egen-civitas/esm-framework`), tandis que public.ts décrit l'API publique
// (typedoc). Un module absent de l'un des deux est invisible des consommateurs :
// `Section` avait été ajouté à public.ts seulement et valait `undefined` à
// l'exécution. Ce garde-fou garde les deux points d'entrée alignés.
const read = (file: string) => readFileSync(resolve(__dirname, '..', file), 'utf8');

describe('points d’entrée du styleguide', () => {
  it.each(['internal.ts', 'public.ts'])('%s exporte le squelette Section', (file) => {
    expect(read(file)).toMatch(/^export \* from '\.\/section\/index\.js';$/m);
  });
});
