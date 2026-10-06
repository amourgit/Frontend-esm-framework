import { describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:net';
import { isPortAvailable, getAvailablePort } from './port';

/**
 * Creates a mock server whose listen() triggers either the 'listening' or 'error' event
 * depending on the `shouldSucceed` parameter. The close() callback fires immediately.
 */
function createMockServer(shouldSucceed: boolean): Server {
  const handlers: Record<string, (err?: NodeJS.ErrnoException) => void> = {};
  return {
    once: vi.fn((event: string, handler: (err?: NodeJS.ErrnoException) => void) => {
      handlers[event] = handler;
    }),
    listen: vi.fn(() => {
      if (shouldSucceed) {
        handlers['listening']?.();
      } else {
        // Un vrai serveur net passe toujours une Error à l'event 'error' — ici un code
        // volontairement hors de IPV6_UNSUPPORTED_CODES pour simuler un port réellement occupé.
        handlers['error']?.({ code: 'EADDRINUSE' } as NodeJS.ErrnoException);
      }
    }),
    close: vi.fn((cb: () => void) => cb()),
  } as unknown as Server;
}

vi.mock('node:net', () => ({
  createServer: vi.fn(),
}));

// Import after mock declaration so vitest applies the mock
import { createServer } from 'node:net';
const mockCreateServer = vi.mocked(createServer);

describe('isPortAvailable', () => {
  it('returns true when both IPv4 and IPv6 binds succeed', async () => {
    const ipv4Server = createMockServer(true);
    const ipv6Server = createMockServer(true);
    mockCreateServer.mockReturnValueOnce(ipv4Server).mockReturnValueOnce(ipv6Server);

    await expect(isPortAvailable(3000)).resolves.toBe(true);

    expect(ipv4Server.listen).toHaveBeenCalledWith(3000, 'localhost');
    expect(ipv6Server.listen).toHaveBeenCalledWith(3000, '::1');
  });

  it('returns false when the IPv4 bind fails', async () => {
    const ipv4Server = createMockServer(false);
    mockCreateServer.mockReturnValueOnce(ipv4Server);

    await expect(isPortAvailable(3000)).resolves.toBe(false);

    expect(ipv4Server.listen).toHaveBeenCalledWith(3000, 'localhost');
  });

  it('returns false when the IPv6 bind fails', async () => {
    const ipv4Server = createMockServer(true);
    const ipv6Server = createMockServer(false);
    mockCreateServer.mockReturnValueOnce(ipv4Server).mockReturnValueOnce(ipv6Server);

    await expect(isPortAvailable(3000)).resolves.toBe(false);
  });
});

describe('getAvailablePort', () => {
  it('returns the start port when it is available', async () => {
    const ipv4 = createMockServer(true);
    const ipv6 = createMockServer(true);
    mockCreateServer.mockReturnValueOnce(ipv4).mockReturnValueOnce(ipv6);

    await expect(getAvailablePort(8081)).resolves.toBe(8081);
  });

  it('skips occupied ports and returns the next available one', async () => {
    // Port 8081: IPv4 fails
    const occupied = createMockServer(false);
    // Port 8082: both succeed
    const ipv4 = createMockServer(true);
    const ipv6 = createMockServer(true);

    mockCreateServer.mockReturnValueOnce(occupied).mockReturnValueOnce(ipv4).mockReturnValueOnce(ipv6);

    await expect(getAvailablePort(8081)).resolves.toBe(8082);
  });

  it('never returns a reserved port, even when it is free (e.g. a backend that is not running yet)', async () => {
    // Port 8082 est réservé : il ne doit même pas être testé (aucun createServer consommé pour lui).
    // Port 8083 : IPv4 et IPv6 libres.
    const ipv4 = createMockServer(true);
    const ipv6 = createMockServer(true);
    mockCreateServer.mockReset();
    mockCreateServer.mockReturnValueOnce(ipv4).mockReturnValueOnce(ipv6);

    await expect(getAvailablePort(8082, [8082])).resolves.toBe(8083);
    expect(mockCreateServer).toHaveBeenCalledTimes(2);
  });

  it('throws when no port is available up to 65535', async () => {
    // All ports fail
    mockCreateServer.mockImplementation(() => createMockServer(false));

    await expect(getAvailablePort(65535)).rejects.toThrow('Could not find an available port');
  });
});
