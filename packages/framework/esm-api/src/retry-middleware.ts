/** @module @category API */
import type { EgenFetchMiddleware } from './middleware.js';

/** HTTP methods considered idempotent by default — safe to retry without risking a duplicate side effect. */
const DEFAULT_RETRYABLE_METHODS: ReadonlyArray<string> = ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS'];

export interface RetryMiddlewareOptions {
  /** Maximum number of attempts, including the first. Must be at least 1. @default 3 */
  maxAttempts?: number;
  /** Delay, in milliseconds, before the first retry. Doubles on each subsequent attempt (before the cap and jitter are applied). @default 300 */
  baseDelayMs?: number;
  /** Upper bound, in milliseconds, on the computed delay before jitter is applied. @default 10000 */
  maxDelayMs?: number;
  /**
   * HTTP methods eligible for retry. A request whose method is not in this
   * list is attempted exactly once, with no behavior change at all — this is
   * what keeps the middleware safe to add to a pipeline that also handles
   * non-idempotent mutations. @default GET, HEAD, PUT, DELETE, OPTIONS
   */
  retryableMethods?: ReadonlyArray<string>;
  /**
   * Decides whether a given failure should be retried. Receives whatever
   * `next()` threw. @default retries network-level failures (no `response`
   * on the error at all) and HTTP 429 or 5xx responses; does not retry other
   * 4xx responses.
   */
  isRetryable?: (error: unknown) => boolean;
  /** Overridable for tests: replaces the real timer-based wait. @default a real `setTimeout`-based wait. */
  wait?: (delayMs: number) => Promise<void>;
  /** Overridable for tests: the source of jitter. Must return a number in `[0, 1)`. @default `Math.random` */
  random?: () => number;
}

function defaultIsRetryable(error: unknown): boolean {
  if (error && typeof error === 'object' && 'response' in error) {
    const status = (error as { response?: { status?: number } }).response?.status;
    return status === 429 || (typeof status === 'number' && status >= 500);
  }
  // No `response` on the error at all: treat it as a network-level failure
  // (e.g. the TypeError window.fetch throws when the request never reaches
  // a server), which is exactly the transient kind of failure retrying is
  // meant to absorb.
  return true;
}

function defaultWait(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

/**
 * Builds a middleware that retries a failed request with exponential backoff
 * and full jitter: each delay is chosen uniformly at random between 0 and a
 * cap that doubles on every attempt (up to `maxDelayMs`). Full jitter is the
 * strategy cloud providers' own architecture guidance recommends, to avoid
 * many clients retrying in lockstep and re-creating the very overload that
 * caused the failures in the first place.
 *
 * Safe to add to any pipeline: a request is only ever retried when both (a)
 * its HTTP method is in `retryableMethods` (idempotent methods only, by
 * default — never `POST`/`PATCH` unless explicitly opted in) and (b)
 * `isRetryable` accepts the specific failure. Anything else is attempted
 * exactly once, with no behavior change.
 *
 * @example
 * ```ts
 * import { egenFetch, composeMiddlewares, createRetryMiddleware } from '@egen-civitas/esm-api';
 *
 * const resilientFetch = composeMiddlewares(egenFetch, [createRetryMiddleware()]);
 * const response = await resilientFetch('/ws/rest/v1/concept');
 * ```
 */
export function createRetryMiddleware(options: RetryMiddlewareOptions = {}): EgenFetchMiddleware {
  const {
    maxAttempts = 3,
    baseDelayMs = 300,
    maxDelayMs = 10_000,
    retryableMethods = DEFAULT_RETRYABLE_METHODS,
    isRetryable = defaultIsRetryable,
    wait = defaultWait,
    random = Math.random,
  } = options;

  if (maxAttempts < 1) {
    throw new Error('createRetryMiddleware: maxAttempts must be at least 1.');
  }

  const retryableMethodsUpper = retryableMethods.map((method) => method.toUpperCase());

  return async function retryMiddleware(request, next) {
    const method = (request.init.method ?? 'GET').toUpperCase();
    const eligible = retryableMethodsUpper.includes(method);

    let attempt = 1;
    for (;;) {
      try {
        return await next(request);
      } catch (error) {
        if (!eligible || attempt >= maxAttempts || !isRetryable(error)) {
          throw error;
        }
        const cap = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
        await wait(random() * cap);
        attempt++;
      }
    }
  };
}
