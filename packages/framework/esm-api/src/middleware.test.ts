import { describe, expect, it, vi } from 'vitest';
import { composeMiddlewares, type EgenFetchMiddleware, type EgenFetchRequest } from './middleware';
import type { FetchResponse } from './types/index';

function fakeResponse(body: Record<string, unknown> = {}): FetchResponse {
  return { data: body, status: 200 } as unknown as FetchResponse;
}

describe('composeMiddlewares', () => {
  it('calls the handler directly when given no middlewares', async () => {
    const handler = vi.fn().mockResolvedValue(fakeResponse({ ok: true }));
    const fetchFn = composeMiddlewares(handler, []);

    const response = await fetchFn('/ws/rest/v1/session', { method: 'GET' });

    expect(handler).toHaveBeenCalledWith('/ws/rest/v1/session', { method: 'GET' });
    expect(response.data).toEqual({ ok: true });
  });

  it('behaves the same when the middlewares argument is omitted entirely', async () => {
    const handler = vi.fn().mockResolvedValue(fakeResponse());
    const fetchFn = composeMiddlewares(handler);

    await fetchFn('/ws/rest/v1/session');

    expect(handler).toHaveBeenCalledWith('/ws/rest/v1/session', {});
  });

  it('defaults init to {} when the composed function is called with only a url', async () => {
    const handler = vi.fn().mockResolvedValue(fakeResponse());
    const fetchFn = composeMiddlewares(handler, []);

    await fetchFn('/ws/rest/v1/session');

    expect(handler).toHaveBeenCalledWith('/ws/rest/v1/session', {});
  });

  it('invokes a single middleware with the request, and calls the handler when it calls next', async () => {
    const handler = vi.fn().mockResolvedValue(fakeResponse({ ok: true }));
    const middleware = vi.fn(async (request: EgenFetchRequest, next: (r: EgenFetchRequest) => Promise<FetchResponse>) =>
      next(request),
    );

    const fetchFn = composeMiddlewares(handler, [middleware]);
    await fetchFn('/ws/rest/v1/session', { method: 'GET' });

    expect(middleware).toHaveBeenCalledWith({ url: '/ws/rest/v1/session', init: { method: 'GET' } }, expect.any(Function));
    expect(handler).toHaveBeenCalledWith('/ws/rest/v1/session', { method: 'GET' });
  });

  it('runs middlewares outermost-first on the way in, and in reverse order on the way out', async () => {
    const callOrder: string[] = [];
    const handler = vi.fn().mockImplementation(async () => {
      callOrder.push('handler');
      return fakeResponse();
    });

    const makeTracingMiddleware = (name: string): EgenFetchMiddleware => async (request, next) => {
      callOrder.push(`${name}:before`);
      const response = await next(request);
      callOrder.push(`${name}:after`);
      return response;
    };

    const fetchFn = composeMiddlewares(handler, [makeTracingMiddleware('outer'), makeTracingMiddleware('inner')]);
    await fetchFn('/ws/rest/v1/session');

    expect(callOrder).toEqual(['outer:before', 'inner:before', 'handler', 'inner:after', 'outer:after']);
  });

  it('lets a middleware modify the request before it reaches the handler', async () => {
    const handler = vi.fn().mockResolvedValue(fakeResponse());
    const addTraceHeader: EgenFetchMiddleware = (request, next) =>
      next({
        url: request.url,
        init: { ...request.init, headers: { ...request.init.headers, 'X-Trace-Id': 'abc-123' } },
      });

    const fetchFn = composeMiddlewares(handler, [addTraceHeader]);
    await fetchFn('/ws/rest/v1/session', { headers: { Accept: 'application/json' } });

    expect(handler).toHaveBeenCalledWith('/ws/rest/v1/session', {
      headers: { Accept: 'application/json', 'X-Trace-Id': 'abc-123' },
    });
  });

  it('lets a middleware modify the url before it reaches the handler', async () => {
    const handler = vi.fn().mockResolvedValue(fakeResponse());
    const rewriteUrl: EgenFetchMiddleware = (request, next) => next({ ...request, url: '/ws/rest/v1/rewritten' });

    const fetchFn = composeMiddlewares(handler, [rewriteUrl]);
    await fetchFn('/ws/rest/v1/original');

    expect(handler).toHaveBeenCalledWith('/ws/rest/v1/rewritten', {});
  });

  it('lets a middleware short-circuit the pipeline without ever calling the handler', async () => {
    const handler = vi.fn().mockResolvedValue(fakeResponse({ fromHandler: true }));
    const cached = fakeResponse({ fromCache: true });
    const cacheMiddleware: EgenFetchMiddleware = async () => cached;

    const fetchFn = composeMiddlewares(handler, [cacheMiddleware]);
    const response = await fetchFn('/ws/rest/v1/session');

    expect(response).toBe(cached);
    expect(handler).not.toHaveBeenCalled();
  });

  it('lets an outer middleware catch and recover from an error thrown by the handler', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('network down'));
    const fallback = fakeResponse({ fromFallback: true });
    const recoverMiddleware: EgenFetchMiddleware = async (request, next) => {
      try {
        return await next(request);
      } catch {
        return fallback;
      }
    };

    const fetchFn = composeMiddlewares(handler, [recoverMiddleware]);
    const response = await fetchFn('/ws/rest/v1/session');

    expect(response).toBe(fallback);
  });

  it('propagates an error from the handler through middlewares that do not catch it', async () => {
    const error = new Error('network down');
    const handler = vi.fn().mockRejectedValue(error);
    const passthroughMiddleware: EgenFetchMiddleware = (request, next) => next(request);

    const fetchFn = composeMiddlewares(handler, [passthroughMiddleware]);

    await expect(fetchFn('/ws/rest/v1/session')).rejects.toThrow('network down');
  });

  it('lets a middleware transform an error into a different one', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('raw network error'));
    const wrapErrors: EgenFetchMiddleware = async (request, next) => {
      try {
        return await next(request);
      } catch {
        throw new Error('wrapped error');
      }
    };

    const fetchFn = composeMiddlewares(handler, [wrapErrors]);

    await expect(fetchFn('/ws/rest/v1/session')).rejects.toThrow('wrapped error');
  });

  it('composes three middlewares together correctly, each seeing the effect of the ones before it', async () => {
    const handler = vi.fn().mockImplementation(async (url: string) => fakeResponse({ finalUrl: url }));

    const addPrefix: EgenFetchMiddleware = (request, next) => next({ ...request, url: `/prefix${request.url}` });
    const addSuffix: EgenFetchMiddleware = (request, next) => next({ ...request, url: `${request.url}/suffix` });
    const uppercase: EgenFetchMiddleware = (request, next) => next({ ...request, url: request.url.toUpperCase() });

    const fetchFn = composeMiddlewares(handler, [addPrefix, addSuffix, uppercase]);
    await fetchFn('/middle');

    // addPrefix wraps first (outermost) but its next() is called last, after
    // addSuffix and uppercase have already been applied to the *inner*
    // request they each received — so the actual mutation order, inside out,
    // is: uppercase(addSuffix(addPrefix(original))) reaching the handler.
    expect(handler).toHaveBeenCalledWith('/PREFIX/MIDDLE/SUFFIX', {});
  });
});
