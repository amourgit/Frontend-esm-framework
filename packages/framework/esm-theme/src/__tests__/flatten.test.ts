import { describe, expect, it } from 'vitest';
import { flattenToCssVars } from '../flatten';

describe('flattenToCssVars — résolution générique light/dark', () => {
  it('place les valeurs communes (sans light/dark) dans `base`', () => {
    const result = flattenToCssVars({
      colors: { primary: { '500': '#6366f1' } },
      borderRadius: { xl: '1.25rem' },
    });

    expect(result.base).toEqual({
      '--colors-primary-500': '#6366f1',
      '--border-radius-xl': '1.25rem',
    });
    expect(result.light).toEqual({});
    expect(result.dark).toEqual({});
  });

  it('résout une branche {light, dark} SANS jamais inclure "light"/"dark" dans le nom de variable', () => {
    const result = flattenToCssVars({
      panel: {
        dark: { card: { background: 'rgba(15,23,42,0.65)' } },
        light: { card: { background: 'rgba(255,255,255,0.60)' } },
      },
    });

    expect(result.dark).toEqual({ '--panel-card-background': 'rgba(15,23,42,0.65)' });
    expect(result.light).toEqual({ '--panel-card-background': 'rgba(255,255,255,0.60)' });
    expect(result.base).toEqual({});

    // Aucun nom de variable ne doit contenir "light" ou "dark"
    for (const name of [...Object.keys(result.light), ...Object.keys(result.dark)]) {
      expect(name).not.toMatch(/light|dark/);
    }
  });

  it('fonctionne pour N’IMPORTE QUELLE clé du schéma, pas seulement "panel" (généricité)', () => {
    const result = flattenToCssVars({
      colors: {
        surface: { light: { foreground: '#0f172a' }, dark: { foreground: '#f1f5f9' } },
        border: { light: { default: 'rgba(0,0,0,0.1)' }, dark: { default: 'rgba(255,255,255,0.1)' } },
      },
      // Une extension future, totalement inconnue du moteur, doit aussi être résolue
      monPlugin: { custom: { light: { x: '1' }, dark: { x: '2' } } },
    });

    expect(result.light['--colors-surface-foreground']).toBe('#0f172a');
    expect(result.dark['--colors-surface-foreground']).toBe('#f1f5f9');
    expect(result.light['--colors-border-default']).toBe('rgba(0,0,0,0.1)');
    expect(result.dark['--colors-border-default']).toBe('rgba(255,255,255,0.1)');
    expect(result.light['--mon-plugin-custom-x']).toBe('1');
    expect(result.dark['--mon-plugin-custom-x']).toBe('2');
  });

  it('gère une branche ne déclarant que "dark" (light absent)', () => {
    const result = flattenToCssVars({ panel: { dark: { toast: { background: 'black' } } } });
    expect(result.dark).toEqual({ '--panel-toast-background': 'black' });
    expect(result.light).toEqual({});
  });

  it('ne traite PAS comme thémable un objet qui a "light"/"dark" PLUS d’autres clés', () => {
    // Ici "light" n'est qu'une propriété parmi d'autres -> pas une branche de mode
    const result = flattenToCssVars({
      icons: { light: 'thin-icon-set', strokeWidth: '1.5' },
    });

    expect(result.base).toEqual({
      '--icons-light': 'thin-icon-set',
      '--icons-stroke-width': '1.5',
    });
    expect(result.light).toEqual({});
    expect(result.dark).toEqual({});
  });

  it('ignore les clés racines listées dans ignoreRootKeys', () => {
    const result = flattenToCssVars(
      { priority: 10, meta: { name: 'x' }, colors: { primary: { '500': '#000' } } },
      { ignoreRootKeys: ['priority', 'meta'] },
    );
    expect(result.base).toEqual({ '--colors-primary-500': '#000' });
  });

  it('REJETTE (et omet) une valeur contenant des caractères structurants CSS dangereux, plutôt que de la "nettoyer"', () => {
    const result = flattenToCssVars({
      colors: { primary: { '500': 'red; } body { display:none } /* ' } },
      borderRadius: { xl: '1.25rem' }, // valeur saine voisine, doit rester intacte
    });

    // La variable dangereuse est totalement absente (pas de valeur partielle/mutée)
    expect(result.base['--colors-primary-500']).toBeUndefined();
    // Les autres variables, saines, ne sont pas affectées
    expect(result.base['--border-radius-xl']).toBe('1.25rem');
  });

  it('rejette une valeur dépassant la longueur maximale autorisée', () => {
    const result = flattenToCssVars({ colors: { primary: { '500': 'a'.repeat(5000) } } });
    expect(result.base['--colors-primary-500']).toBeUndefined();
  });

  it("rejette un url(...) avec un schéma non sûr (javascript:, data:text/html...) mais accepte https:// et les chemins relatifs", () => {
    const safe1 = flattenToCssVars({ effects: { bg: "url('https://cdn.example.com/bg.png')" } });
    const safe2 = flattenToCssVars({ effects: { bg2: "url('/assets/bg.png')" } });
    const unsafe1 = flattenToCssVars({ effects: { bg3: "url('javascript:alert(1)')" } });
    const unsafe2 = flattenToCssVars({ effects: { bg4: "url('data:text/html,<script>alert(1)</script>')" } });

    expect(safe1.base['--effects-bg']).toContain('https://cdn.example.com/bg.png');
    expect(safe2.base['--effects-bg2']).toContain('/assets/bg.png');
    expect(unsafe1.base['--effects-bg3']).toBeUndefined();
    expect(unsafe2.base['--effects-bg4']).toBeUndefined();
  });

  it('accepte les valeurs CSS légitimes courantes (couleurs, flou, ombres, transitions, polices)', () => {
    const result = flattenToCssVars({
      colors: { primary: { '500': '#6366f1' } },
      panel: { dark: { card: { background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(20px) saturate(180%)' } } },
      shadows: { glow: '0 0 24px rgba(99, 102, 241, 0.4), 0 0 48px rgba(99, 102, 241, 0.15)' },
      transitions: { default: 'all 200ms cubic-bezier(0.42, 0, 0.18, 1)' },
      typography: { fontFamily: ['Inter', 'sans-serif'] },
    });

    expect(result.base['--colors-primary-500']).toBe('#6366f1');
    expect(result.dark['--panel-card-background']).toBe('rgba(15, 23, 42, 0.65)');
    expect(result.dark['--panel-card-backdrop-filter']).toBe('blur(20px) saturate(180%)');
    expect(result.base['--shadows-glow']).toContain('rgba(99, 102, 241, 0.4)');
    expect(result.base['--transitions-default']).toContain('cubic-bezier');
    expect(result.base['--typography-font-family']).toBe('Inter, sans-serif');
  });
});
