import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8');
const modulesOf = (source: string, re: RegExp) => new Set([...source.matchAll(re)].map((m) => m[1]));

describe('point d\'entrée du package', () => {
  // `public.ts` décrit l'API publique documentée ; `index.ts` est ce que le package exporte réellement.
  // Un module cité dans l'API publique mais absent de l'index est inaccessible aux apps (ex. nav-behavior en 1.2.0).
  it('exporte chaque module de l\'API publique', () => {
    const published = modulesOf(read('./public.ts'), /from '\.\/([\w-]+)\.js'/g);
    const exported = modulesOf(read('./index.ts'), /export \* from '\.\/([\w-]+)\.js'/g);
    const missing = [...published].filter((m) => !exported.has(m));
    expect(missing).toEqual([]);
  });

  it('exporte la surcharge de comportement de navigation', () => {
    expect(read('./index.ts')).toContain("export * from './nav-behavior.js'");
  });
});
