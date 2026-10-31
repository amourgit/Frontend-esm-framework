import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { BRAND_FILES, resolveBranding } = require('./brand');

describe('resolveBranding', () => {
  let root: string;
  let defaults: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'egen-brand-'));
    defaults = join(root, 'default-assets');
    mkdirSync(defaults);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('sans EGEN_BRAND_DIR : assets neutres du shell uniquement', () => {
    const result = resolveBranding({}, { defaultAssetsDir: defaults });

    expect(result.brandDir).toBeUndefined();
    expect(result.pwaIconPath).toBe(join(defaults, BRAND_FILES.pwaIcon));
    expect(result.copyPatterns).toEqual([{ from: defaults }]);
  });

  it('avec un dossier valide : le client surcharge les assets (copiés après, avec force)', () => {
    const brand = join(root, 'brand');
    mkdirSync(brand);
    writeFileSync(join(brand, BRAND_FILES.pwaIcon), 'png');

    const result = resolveBranding({ EGEN_BRAND_DIR: brand }, { defaultAssetsDir: defaults });

    expect(result.brandDir).toBe(resolve(brand));
    expect(result.pwaIconPath).toBe(join(brand, BRAND_FILES.pwaIcon));
    expect(result.copyPatterns).toEqual([{ from: defaults }, { from: resolve(brand), force: true, priority: 1 }]);
  });

  it("dossier valide sans icône PWA : l'icône neutre du shell reste utilisée", () => {
    const brand = join(root, 'brand');
    mkdirSync(brand);
    writeFileSync(join(brand, BRAND_FILES.favicon), 'ico');

    const result = resolveBranding({ EGEN_BRAND_DIR: brand }, { defaultAssetsDir: defaults });

    expect(result.pwaIconPath).toBe(join(defaults, BRAND_FILES.pwaIcon));
    expect(result.copyPatterns).toHaveLength(2);
  });

  it('chemin inexistant ou fichier : ignoré avec un avertissement, sans casser le build', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const file = join(root, 'not-a-dir.txt');
    writeFileSync(file, 'x');

    for (const bad of [join(root, 'missing'), file]) {
      const result = resolveBranding({ EGEN_BRAND_DIR: bad }, { defaultAssetsDir: defaults });
      expect(result.brandDir).toBeUndefined();
      expect(result.copyPatterns).toEqual([{ from: defaults }]);
    }
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
