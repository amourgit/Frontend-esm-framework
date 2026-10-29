import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BRAND_DIR_ENV, resolveBrandDir } from './brand';
import * as logger from './logger';

describe('resolveBrandDir', () => {
  let root: string;
  let app: string;

  beforeEach(() => {
    delete process.env[BRAND_DIR_ENV];
    // realpath : sur macOS, tmpdir() passe par un lien symbolique.
    root = realpathSync(mkdtempSync(join(tmpdir(), 'egen-brand-')));
    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'client', workspaces: ['packages/*'] }));
    app = join(root, 'packages', 'app');
    mkdirSync(app, { recursive: true });
    mkdirSync(join(root, 'branding', 'shell'), { recursive: true });
  });

  afterEach(() => {
    delete process.env[BRAND_DIR_ENV];
    rmSync(root, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("renvoie undefined sans avertissement quand la variable n'est définie nulle part", () => {
    const warn = vi.spyOn(logger, 'logWarn').mockImplementation(() => {});

    expect(resolveBrandDir(app)).toBeUndefined();
    expect(warn).not.toHaveBeenCalled();
  });

  it('résout un chemin relatif de .env depuis la racine du monorepo (même lancé depuis un sous-dossier)', () => {
    writeFileSync(join(root, '.env.development'), `${BRAND_DIR_ENV}=branding/shell\n`);

    expect(resolveBrandDir(app)).toBe(join(root, 'branding', 'shell'));
  });

  it('lit le .env du mode demandé (production ≠ development)', () => {
    writeFileSync(join(root, '.env.production'), `${BRAND_DIR_ENV}=branding/shell\n`);

    expect(resolveBrandDir(app, 'development')).toBeUndefined();
    expect(resolveBrandDir(app, 'production')).toBe(join(root, 'branding', 'shell'));
  });

  it("donne priorité à l'environnement sur le .env, et accepte un chemin absolu", () => {
    writeFileSync(join(root, '.env.development'), `${BRAND_DIR_ENV}=does-not-exist\n`);
    process.env[BRAND_DIR_ENV] = join(root, 'branding', 'shell');

    expect(resolveBrandDir(app)).toBe(join(root, 'branding', 'shell'));
  });

  it('ignore avec un avertissement un chemin inexistant ou qui est un fichier', () => {
    const warn = vi.spyOn(logger, 'logWarn').mockImplementation(() => {});
    writeFileSync(join(root, 'branding', 'file.txt'), 'x');

    for (const bad of ['nope', 'branding/file.txt']) {
      process.env[BRAND_DIR_ENV] = bad;
      expect(resolveBrandDir(app)).toBeUndefined();
    }
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('hors monorepo : résout depuis le dossier fourni', () => {
    const lone = realpathSync(mkdtempSync(join(tmpdir(), 'egen-lone-')));
    try {
      mkdirSync(join(lone, 'brand'));
      process.env[BRAND_DIR_ENV] = 'brand';

      expect(resolveBrandDir(lone)).toBe(join(lone, 'brand'));
    } finally {
      rmSync(lone, { recursive: true, force: true });
    }
  });
});
