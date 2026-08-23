import { createServer } from 'node:net';

const MAX_PORT = 65535;

const IPV6_UNSUPPORTED_CODES = new Set(['EAFNOSUPPORT', 'EADDRNOTAVAIL']);

/**
 * Checks if a port is available for use by attempting to bind to it.
 * Checks both IPv4 (0.0.0.0) and IPv6 (::) to ensure the port is truly available.
 * If IPv6 itself isn't supported in the current environment (EAFNOSUPPORT /
 * EADDRNOTAVAIL — common in minimal containers and some CI runners), the IPv6
 * check is skipped rather than treated as "port unavailable": otherwise this
 * function would always report every port as taken, and egen would never be
 * able to start at all in such an environment.
 * @param port The port number to check
 * @returns A promise that resolves to true if the port is available, false otherwise
 */
export function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      // Port is available on IPv4, now check IPv6
      server.close(() => {
        const server6 = createServer();

        server6.once('error', (err: NodeJS.ErrnoException) => {
          resolve(IPV6_UNSUPPORTED_CODES.has(err.code ?? '') ? true : false);
        });

        server6.once('listening', () => {
          server6.close(() => {
            resolve(true);
          });
        });

        server6.listen(port, '::1');
      });
    });

    server.listen(port, 'localhost');
  });
}

/**
 * Finds the next available port starting from the given port.
 * @param startPort The port number to start searching from
 * @returns A promise that resolves to an available port number
 * @throws Error if no available port is found up to port 65535
 */
export async function getAvailablePort(startPort: number): Promise<number> {
  for (let port = startPort; port <= MAX_PORT; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  throw new Error(`Could not find an available port between ${startPort} and ${MAX_PORT}`);
}
