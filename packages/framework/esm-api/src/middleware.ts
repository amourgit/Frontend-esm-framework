/** @module @category API */
import type { FetchConfig } from './egen-fetch.js';
import type { FetchResponse } from './types/index.js';

/**
 * The request flowing through an {@link EgenFetchMiddleware} pipeline.
 *
 * Deliberately mutable-by-convention: a middleware that wants to change the
 * outgoing request builds a new object (e.g. `{ ...request, url: ... }`) and
 * passes that to `next()` — the pipeline never mutates `request` itself.
 */
export interface EgenFetchRequest {
  /** The URL that will be passed to the terminal fetch handler. */
  url: string;
  /** The fetch options that will be passed to the terminal fetch handler. */
  init: FetchConfig;
}

/**
 * A single stage in an `egenFetch` middleware pipeline.
 *
 * A middleware receives the current `request` and a `next` function that
 * invokes the rest of the pipeline — ending, eventually, in the terminal
 * handler (typically {@link egenFetch} itself). To continue the chain, call
 * `next(request)` — with the same request, or a modified one — and return
 * (or further process) its result. To short-circuit the chain entirely
 * (serve a cached response, refuse a request outright...), simply don't call
 * `next` and return a {@link FetchResponse} directly, or throw.
 */
export type EgenFetchMiddleware = (
  request: EgenFetchRequest,
  next: (request: EgenFetchRequest) => Promise<FetchResponse>,
) => Promise<FetchResponse>;

/**
 * Composes a list of middlewares around a terminal fetch handler into a
 * single function with the same calling convention as `egenFetch` itself:
 * `(url, init?) => Promise<FetchResponse>`.
 *
 * Middlewares run in the order given: the first middleware in the list is
 * the outermost one — it is the first to see the request on the way in, and
 * the last to see the response (or error) on the way out.
 *
 * The resulting function does not preserve `egenFetch`'s `<T>` generic
 * (TypeScript cannot express "the same generic signature as this parameter"
 * for a returned function) — type the call site instead, e.g.
 * `useSWR<FetchResponse<Concept>>(url, resilientFetch)`.
 *
 * @param handler The terminal handler that actually performs the request —
 *   typically {@link egenFetch} — invoked once every middleware in the
 *   pipeline has run.
 * @param middlewares The middlewares to apply, outermost first. An empty
 *   array (the default) makes the returned function behave exactly like
 *   `handler` itself.
 * @returns A function with the same calling convention as `handler`.
 *
 * @example
 * ```ts
 * import { egenFetch, composeMiddlewares, type EgenFetchMiddleware } from '@egen-civitas/esm-api';
 *
 * const loggingMiddleware: EgenFetchMiddleware = async (request, next) => {
 *   const startedAt = performance.now();
 *   try {
 *     return await next(request);
 *   } finally {
 *     console.debug(`${request.url} took ${performance.now() - startedAt}ms`);
 *   }
 * };
 *
 * const fetchWithLogging = composeMiddlewares(egenFetch, [loggingMiddleware]);
 * const response = await fetchWithLogging('/ws/rest/v1/session');
 * ```
 */
export function composeMiddlewares(
  handler: (url: string, init?: FetchConfig) => Promise<FetchResponse>,
  middlewares: ReadonlyArray<EgenFetchMiddleware> = [],
): (url: string, init?: FetchConfig) => Promise<FetchResponse> {
  const terminal = (request: EgenFetchRequest) => handler(request.url, request.init);

  const pipeline = middlewares.reduceRight<(request: EgenFetchRequest) => Promise<FetchResponse>>(
    (next, middleware) => (request) => middleware(request, next),
    terminal,
  );

  return (url: string, init: FetchConfig = {}) => pipeline({ url, init });
}
