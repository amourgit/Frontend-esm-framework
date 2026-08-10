import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('glob', () => ({
  glob: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock('./logger', () => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logFail: vi.fn(),
}));

import { glob } from 'glob';
import { existsSync, readFileSync } from 'node:fs';
import { resolvePackages } from './packages';

const mockGlob = vi.mocked(glob);
const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);

beforeEach(() => {
  vi.resetAllMocks();
});

// Helper to set up a consistent filesystem mock from a map of path -> JSON content.
// Paths not in the map are treated as non-existent.
function mockFs(files: Record<string, object>) {
  mockExistsSync.mockImplementation((p) => String(p) in files);
  mockReadFileSync.mockImplementation((p) => {
    const content = files[String(p)];
    if (content === undefined) {
      throw new Error(`ENOENT: ${p}`);
    }
    return JSON.stringify(content);
  });
}

describe('resolvePackages', () => {
  describe('monorepo with workspaces (array form)', () => {
    it('resolves a single package name to its workspace directory', async () => {
      vi.spyOn(process, 'cwd').mockReturnValue('/repo');

      mockFs({
        '/repo/package.json': { name: 'root', workspaces: ['packages/*'] },
        '/repo/packages/app-a/package.json': { name: '@egen/app-a' },
        '/repo/packages/app-b/package.json': { name: '@egen/app-b' },
      });
      mockGlob.mockResolvedValue(['packages/app-a', 'packages/app-b']);

      const result = await resolvePackages(['@egen/app-a']);
      expect(result).toEqual(['/repo/packages/app-a']);
    });

    it('resolves multiple package names', async () => {
      vi.spyOn(process, 'cwd').mockReturnValue('/repo');

      mockFs({
        '/repo/package.json': { name: 'root', workspaces: ['packages/*'] },
        '/repo/packages/app-a/package.json': { name: '@egen/app-a' },
        '/repo/packages/app-b/package.json': { name: '@egen/app-b' },
      });
      mockGlob.mockResolvedValue(['packages/app-a', 'packages/app-b']);

      const result = await resolvePackages(['@egen/app-a', '@egen/app-b']);
      expect(result).toEqual(['/repo/packages/app-a', '/repo/packages/app-b']);
    });

    it('handles multiple workspace patterns', async () => {
      vi.spyOn(process, 'cwd').mockReturnValue('/repo');

      mockFs({
        '/repo/package.json': { name: 'root', workspaces: ['packages/apps/*', 'packages/libs/*'] },
        '/repo/packages/apps/login/package.json': { name: '@egen/esm-login-app' },
        '/repo/packages/libs/utils/package.json': { name: '@egen/esm-utils' },
      });
      // glob is called once per pattern
      mockGlob.mockResolvedValueOnce(['packages/apps/login']).mockResolvedValueOnce(['packages/libs/utils']);

      const result = await resolvePackages(['@egen/esm-login-app']);
      expect(result).toEqual(['/repo/packages/apps/login']);
      expect(mockGlob).toHaveBeenCalledTimes(2);
    });

    it('skips workspace directories without a package.json', async () => {
      vi.spyOn(process, 'cwd').mockReturnValue('/repo');

      mockFs({
        '/repo/package.json': { name: 'root', workspaces: ['packages/*'] },
        '/repo/packages/app-a/package.json': { name: '@egen/app-a' },
        // packages/orphan has no package.json
      });
      mockGlob.mockResolvedValue(['packages/app-a', 'packages/orphan']);

      const result = await resolvePackages(['@egen/app-a']);
      expect(result).toEqual(['/repo/packages/app-a']);
    });
  });

  describe('monorepo with workspaces (object form)', () => {
    it('resolves packages when workspaces uses the { packages: [...] } form', async () => {
      vi.spyOn(process, 'cwd').mockReturnValue('/repo');

      mockFs({
        '/repo/package.json': { name: 'root', workspaces: { packages: ['packages/*'] } },
        '/repo/packages/app-a/package.json': { name: '@egen/app-a' },
      });
      mockGlob.mockResolvedValue(['packages/app-a']);

      const result = await resolvePackages(['@egen/app-a']);
      expect(result).toEqual(['/repo/packages/app-a']);
    });
  });

  describe('workspace root discovery from subdirectory', () => {
    it('finds workspace root when cwd is inside a workspace package', async () => {
      vi.spyOn(process, 'cwd').mockReturnValue('/repo/packages/app-a');

      mockFs({
        '/repo/packages/app-a/package.json': { name: '@egen/app-a' },
        '/repo/package.json': { name: 'root', workspaces: ['packages/*'] },
        '/repo/packages/app-b/package.json': { name: '@egen/app-b' },
      });
      mockGlob.mockResolvedValue(['packages/app-a', 'packages/app-b']);

      const result = await resolvePackages(['@egen/app-b']);
      expect(result).toEqual(['/repo/packages/app-b']);
    });
  });

  describe('single package (no workspaces)', () => {
    it('resolves when the cwd package.json name matches', async () => {
      vi.spyOn(process, 'cwd').mockReturnValue('/projects/lab-app');

      mockFs({
        '/projects/lab-app/package.json': { name: '@egen/esm-laboratory-app' },
      });

      const result = await resolvePackages(['@egen/esm-laboratory-app']);
      expect(result).toEqual(['/projects/lab-app']);
    });
  });

  describe('error handling', () => {
    it('throws when a requested package is not found', async () => {
      vi.spyOn(process, 'cwd').mockReturnValue('/repo');

      mockFs({
        '/repo/package.json': { name: 'root', workspaces: ['packages/*'] },
        '/repo/packages/app-a/package.json': { name: '@egen/app-a' },
      });
      mockGlob.mockResolvedValue(['packages/app-a']);

      await expect(resolvePackages(['@egen/nonexistent'])).rejects.toThrow(
        'Could not resolve the following package(s)',
      );
    });

    it('lists the unresolved package names in the error', async () => {
      vi.spyOn(process, 'cwd').mockReturnValue('/repo');

      mockFs({
        '/repo/package.json': { name: 'root', workspaces: ['packages/*'] },
        '/repo/packages/app-a/package.json': { name: '@egen/app-a' },
      });
      mockGlob.mockResolvedValue(['packages/app-a']);

      await expect(resolvePackages(['@egen/nonexistent'])).rejects.toThrow('@egen/nonexistent');
    });

    it('includes available packages in the error message', async () => {
      vi.spyOn(process, 'cwd').mockReturnValue('/repo');

      mockFs({
        '/repo/package.json': { name: 'root', workspaces: ['packages/*'] },
        '/repo/packages/app-a/package.json': { name: '@egen/app-a' },
      });
      mockGlob.mockResolvedValue(['packages/app-a']);

      await expect(resolvePackages(['@egen/nonexistent'])).rejects.toThrow('@egen/app-a');
    });

    it('reports when no packages are found at all', async () => {
      vi.spyOn(process, 'cwd').mockReturnValue('/empty');

      mockExistsSync.mockReturnValue(false);

      await expect(resolvePackages(['@egen/anything'])).rejects.toThrow(
        'No packages were found in the current directory',
      );
    });

    it('throws for a mix of found and not-found packages', async () => {
      vi.spyOn(process, 'cwd').mockReturnValue('/repo');

      mockFs({
        '/repo/package.json': { name: 'root', workspaces: ['packages/*'] },
        '/repo/packages/app-a/package.json': { name: '@egen/app-a' },
      });
      mockGlob.mockResolvedValue(['packages/app-a']);

      await expect(resolvePackages(['@egen/app-a', '@egen/missing'])).rejects.toThrow('@egen/missing');
    });
  });
});
