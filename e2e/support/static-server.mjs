// Serveur statique minimal pour un artefact du shell : sert `root` sous `base` (natif : `/app` ; web : `/egen-civitas/spa`).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

/**
 * @param {{ root: string, extra?: Record<string, string> }} options `extra` : chemin d'URL → fichier du disque
 * (fixtures ajoutées à l'artefact sans le modifier).
 * @returns {Promise<{ origin: string, requests: string[], close: () => Promise<void> }>}
 */
export async function startStaticServer({ root, extra = {}, base = '/app' }) {
  const requests = [];
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    requests.push(`${res.statusCode}:${url.pathname}`);
    const path = decodeURIComponent(url.pathname);
    let file = extra[path];
    if (!file) {
      if (!path.startsWith(`${base}/`) && path !== base) {
        res.writeHead(404).end('not found');
        return;
      }
      const relative = normalize(path.slice(base.length)).replace(/^(\.\.[/\\])+/, '');
      // Repli SPA : une URL de route (sans extension) sert index.html ; une ressource absente reste un vrai 404.
      file = join(root, relative === '/' || relative === '.' || !extname(relative) ? 'index.html' : relative);
    }
    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    origin: `http://127.0.0.1:${port}`,
    requests,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}
