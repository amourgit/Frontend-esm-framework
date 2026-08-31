import { describe, expect, it, vi } from 'vitest';
import { createRetryMiddleware } from './retry-middleware';
import type { EgenFetchRequest } from './middleware';
import type { EgenFetchError } from './egen-fetch';
import type { FetchResponse } from './types/index';

function makeRequest(method = 'GET'): EgenFetchRequest {
  return { url: '/ws/rest/v1/concept', init: { method } };
}

function httpError(status: number): EgenFetchError {
  return { message: `HTTP ${status}`, response: { status }, responseBody: null } as unknown as EgenFetchError;
}

function networkError(): Error {
  // What window.fetch itself throws when the request never reaches a server —
  // deliberately has no `.response` at all.
  return new TypeError('Failed to fetch');
}

describe('createRetryMiddleware', () => {
  it('throws synchronously if maxAttempts is less than 1', () => {
    expect(() => createRetryMiddleware({ maxAttempts: 0 })).toThrow(/maxAttempts must be at least 1/);
  });

  it('calls next exactly once and returns its result when it succeeds on the first try', async () => {
    const response = { status: 200 } as FetchResponse;
    const next = vi.fn().mockResolvedValue(response);
    const middleware = createRetryMiddleware({ wait: vi.fn().mockResolvedValue(undefined) });

    const result = await middleware(makeRequest(), next);

    expect(result).toBe(response);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('retries a retryable GET failure and succeeds on the second attempt', async () => {
    const response = { status: 200 } as FetchResponse;
    const next = vi.fn().mockRejectedValueOnce(httpError(503)).mockResolvedValueOnce(response);
    const wait = vi.fn().mockResolvedValue(undefined);
    const middleware = createRetryMiddleware({ wait, random: () => 0.5 });

    const result = await middleware(makeRequest('GET'), next);

    expect(result).toBe(response);
    expect(next).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledTimes(1);
  });

  it('gives up after maxAttempts and propagates the last error', async () => {
    const error = httpError(500);
    const next = vi.fn().mockRejectedValue(error);
    const wait = vi.fn().mockResolvedValue(undefined);
    const middleware = createRetryMiddleware({ maxAttempts: 3, wait, random: () => 0.5 });

    await expect(middleware(makeRequest('GET'), next)).rejects.toBe(error);
    expect(next).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenCalledTimes(2);
  });

  it('does not retry a non-idempotent method (POST) by default, even on a retryable-looking failure', async () => {
    const error = httpError(503);
    const next = vi.fn().mockRejectedValue(error);
    const wait = vi.fn().mockResolvedValue(undefined);
    const middleware = createRetryMiddleware({ wait });

    await expect(middleware(makeRequest('POST'), next)).rejects.toBe(error);
    expect(next).toHaveBeenCalledTimes(1);
    expect(wait).not.toHaveBeenCalled();
  });

  it('retries POST when explicitly added to retryableMethods', async () => {
    const response = { status: 200 } as FetchResponse;
    const next = vi.fn().mockRejectedValueOnce(httpError(503)).mockResolvedValueOnce(response);
    const wait = vi.fn().mockResolvedValue(undefined);
    const middleware = createRetryMiddleware({ retryableMethods: ['POST'], wait, random: () => 0.5 });

    const result = await middleware(makeRequest('POST'), next);

    expect(result).toBe(response);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('treats the method case-insensitively', async () => {
    const response = { status: 200 } as FetchResponse;
    const next = vi.fn().mockRejectedValueOnce(httpError(503)).mockResolvedValueOnce(response);
    const wait = vi.fn().mockResolvedValue(undefined);
    // Request declares lowercase 'get', option declares uppercase 'GET'.
    const middleware = createRetryMiddleware({ retryableMethods: ['GET'], wait, random: () => 0.5 });

    const result = await middleware({ url: '/x', init: { method: 'get' } }, next);

    expect(result).toBe(response);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('treats a request with no method at all as GET (retryable by default)', async () => {
    const response = { status: 200 } as FetchResponse;
    const next = vi.fn().mockRejectedValueOnce(httpError(503)).mockResolvedValueOnce(response);
    const wait = vi.fn().mockResolvedValue(undefined);
    const middleware = createRetryMiddleware({ wait, random: () => 0.5 });

    const result = await middleware({ url: '/x', init: {} }, next);

    expect(result).toBe(response);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('does not retry a non-retryable 4xx error (e.g. 404) by default', async () => {
    const error = httpError(404);
    const next = vi.fn().mockRejectedValue(error);
    const wait = vi.fn().mockResolvedValue(undefined);
    const middleware = createRetryMiddleware({ wait });

    await expect(middleware(makeRequest('GET'), next)).rejects.toBe(error);
    expect(next).toHaveBeenCalledTimes(1);
    expect(wait).not.toHaveBeenCalled();
  });

  it('retries a 429 (Too Many Requests) by default', async () => {
    const response = { status: 200 } as FetchResponse;
    const next = vi.fn().mockRejectedValueOnce(httpError(429)).mockResolvedValueOnce(response);
    const wait = vi.fn().mockResolvedValue(undefined);
    const middleware = createRetryMiddleware({ wait, random: () => 0.5 });

    const result = await middleware(makeRequest('GET'), next);

    expect(result).toBe(response);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('retries a network-level error with no .response at all, by default', async () => {
    const response = { status: 200 } as FetchResponse;
    const next = vi.fn().mockRejectedValueOnce(networkError()).mockResolvedValueOnce(response);
    const wait = vi.fn().mockResolvedValue(undefined);
    const middleware = createRetryMiddleware({ wait, random: () => 0.5 });

    const result = await middleware(makeRequest('GET'), next);

    expect(result).toBe(response);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('respects a custom isRetryable predicate that is more permissive than the default', async () => {
    const response = { status: 200 } as FetchResponse;
    const next = vi.fn().mockRejectedValueOnce(httpError(404)).mockResolvedValueOnce(response);
    const wait = vi.fn().mockResolvedValue(undefined);
    const middleware = createRetryMiddleware({ wait, random: () => 0.5, isRetryable: () => true });

    const result = await middleware(makeRequest('GET'), next);

    expect(result).toBe(response);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('respects a custom isRetryable predicate that is more restrictive than the default', async () => {
    const error = httpError(500);
    const next = vi.fn().mockRejectedValue(error);
    const wait = vi.fn().mockResolvedValue(undefined);
    const middleware = createRetryMiddleware({ wait, isRetryable: () => false });

    await expect(middleware(makeRequest('GET'), next)).rejects.toBe(error);
    expect(next).toHaveBeenCalledTimes(1);
    expect(wait).not.toHaveBeenCalled();
  });

  it('computes delays as random() * min(maxDelayMs, baseDelayMs * 2^(attempt-1))', async () => {
    const next = vi
      .fn()
      .mockRejectedValueOnce(httpError(500))
      .mockRejectedValueOnce(httpError(500))
      .mockRejectedValueOnce(httpError(500))
      .mockResolvedValueOnce({ status: 200 } as FetchResponse);
    const wait = vi.fn().mockResolvedValue(undefined);
    const middleware = createRetryMiddleware({
      maxAttempts: 4,
      baseDelayMs: 100,
      maxDelayMs: 10_000,
      wait,
      random: () => 0.5,
    });

    await middleware(makeRequest('GET'), next);

    // attempt 1 -> cap = 100 * 2^0 = 100   -> delay = 50
    // attempt 2 -> cap = 100 * 2^1 = 200   -> delay = 100
    // attempt 3 -> cap = 100 * 2^2 = 400   -> delay = 200
    expect(wait.mock.calls.map(([delay]) => delay)).toEqual([50, 100, 200]);
  });

  it('caps the delay at maxDelayMs once the exponential growth exceeds it', async () => {
    const next = vi
      .fn()
      .mockRejectedValueOnce(httpError(500))
      .mockRejectedValueOnce(httpError(500))
      .mockResolvedValueOnce({ status: 200 } as FetchResponse);
    const wait = vi.fn().mockResolvedValue(undefined);
    const middleware = createRetryMiddleware({
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 1500,
      wait,
      random: () => 1, // upper bound of the [0, 1) range, to read the cap directly
    });

    await middleware(makeRequest('GET'), next);

    // attempt 1 -> cap = min(1500, 1000 * 2^0) = 1000
    // attempt 2 -> cap = min(1500, 1000 * 2^1) = 1500 (capped, would otherwise be 2000)
    expect(wait.mock.calls.map(([delay]) => delay)).toEqual([1000, 1500]);
  });

  it('uses a real timer-based wait by default (no options passed)', async () => {
    vi.useFakeTimers();
    try {
      const next = vi.fn().mockRejectedValueOnce(httpError(500)).mockResolvedValueOnce({ status: 200 } as FetchResponse);
      const middleware = createRetryMiddleware({ baseDelayMs: 100, random: () => 1 });

      const resultPromise = middleware(makeRequest('GET'), next);
      // Let the microtask from the first (rejected) `next()` call settle so
      // the middleware actually reaches its `wait(...)` call before we
      // advance timers.
      await Promise.resolve();
      await Promise.resolve();

      await vi.advanceTimersByTimeAsync(100);

      const result = await resultPromise;
      expect(result).toEqual({ status: 200 });
      expect(next).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
