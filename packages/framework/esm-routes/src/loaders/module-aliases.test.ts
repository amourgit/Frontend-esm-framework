import { describe, expect, it } from 'vitest';
import { getModuleAliases, invertAliases, setModuleAliases } from './module-aliases';

describe('invertAliases', () => {
  it('inverse alias -> paquet en paquet -> alias[]', () => {
    const map = invertAliases({
      '@egen-civitas/esm-clock-app': '@egen/esm-clock-app',
      '@egen-civitas/esm-logs-app': '@egen/esm-logs-app',
      '@autre/esm-clock-app': '@egen/esm-clock-app',
    });
    expect(map.get('@egen/esm-clock-app')).toEqual(['@egen-civitas/esm-clock-app', '@autre/esm-clock-app']);
    expect(map.get('@egen/esm-logs-app')).toEqual(['@egen-civitas/esm-logs-app']);
    expect(map.get('@egen/inconnu')).toBeUndefined();
  });

  it.each([undefined, null, {}, 'texte', 42] as Array<any>)('tolère une table absente ou mal formée (%j)', (value) => {
    expect(invertAliases(value).size).toBe(0);
  });

  it('ignore les entrées vides ou non textuelles', () => {
    const map = invertAliases({ '': '@egen/a', '@x/a': '', '@y/a': 3 as any, '@ok/a': '@egen/a' });
    expect([...map.entries()]).toEqual([['@egen/a', ['@ok/a']]]);
  });
});

describe('setModuleAliases / getModuleAliases', () => {
  it('retient les alias, sans doublon, sans valeur vide ni nom identique au paquet', () => {
    expect(setModuleAliases('@egen/a', ['@c/a', '@c/a', '', '  ', '@egen/a', '@d/a'])).toEqual(['@c/a', '@d/a']);
    expect(getModuleAliases('@egen/a')).toEqual(['@c/a', '@d/a']);
  });

  it('remplace les alias précédents et les oublie quand la liste est vide', () => {
    setModuleAliases('@egen/b', ['@c/b']);
    setModuleAliases('@egen/b', ['@d/b']);
    expect(getModuleAliases('@egen/b')).toEqual(['@d/b']);
    setModuleAliases('@egen/b', undefined);
    expect(getModuleAliases('@egen/b')).toEqual([]);
  });

  it('renvoie un tableau vide pour une app inconnue', () => {
    expect(getModuleAliases('@egen/jamais-vue')).toEqual([]);
  });
});
