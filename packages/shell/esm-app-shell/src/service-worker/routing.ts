import type { RouteHandlerCallbackOptions } from 'workbox-core';
import { registerRoute } from 'workbox-routing';
import { getOrCreateDefaultRouter } from 'workbox-routing/utils/getOrCreateDefaultRouter';
import { validMethods } from 'workbox-routing/utils/constants';
import { CacheOnly, NetworkFirst, NetworkOnly } from 'workbox-strategies';
import { indexUrl, egenCacheName, egenOfflineCachingStrategyHttpHeaderName } from './constants';
import { ServiceWorkerDb } from './storage';
import {
  getEgenHeader,
  parseEgenOfflineResponseBodyHeader,
  parseEgenOfflineResponseStatusHeader,
} from './http-header-utils';
import type { EgenOfflineCachingStrategy } from '@egen/esm-offline';
import uniq from 'lodash-es/uniq';

const networkOnly = new NetworkOnly();
const cacheOnly = new CacheOnly({ cacheName: egenCacheName });
const networkFirst = new NetworkFirst({ cacheName: egenCacheName });

const defaultStrategy: EgenOfflineCachingStrategy = 'network-only-or-cache-only';
const knownStrategyHandlers: Record<
  EgenOfflineCachingStrategy,
  (options: RouteHandlerCallbackOptions) => Promise<Response>
> = {
  ['network-first']: (options) => networkFirst.handle(options),
  ['network-only-or-cache-only']: async (options: RouteHandlerCallbackOptions) => {
    try {
      return await networkOnly.handle(options);
    } catch (e) {
      return await cacheOnly.handle(options);
    }
  },
};

/**
 * Registers required Workbox routes used by the service worker to provide offline functionality.
 */
export function registerAllEgenRoutes() {
  // Navigation requests are, when unresolvable via network (i.e. when offline), routed back
  // to the SPA's index (which should always be precached).
  // This ensures that the page loads correctly when a new navigation occurs to pages
  // like `/egen/spa/anything/nested`.
  registerRoute(({ request }) => request.mode === 'navigate', navigationHandler);

  // Fallback routing behavior.
  // Checks if a dynamic route registration exists and, if so, handles it using a Network First approach.
  // Otherwise falls back to a NetworkOnly - CacheOnly behavior.
  //
  // The latter ensures that:
  // a) precached files (like the app shell and files resolved from the importmap) are returned when offline.
  // b) anything else (e.g. API requests) is not cached.
  const router = getOrCreateDefaultRouter();
  for (const method of validMethods) {
    router.setDefaultHandler(defaultHandler, method);
  }
}

async function navigationHandler(options: RouteHandlerCallbackOptions) {
  try {
    return await networkOnly.handle(options);
  } catch (e) {
    const cache = await caches.open(egenCacheName);
    const response = await cache.match(indexUrl);
    return response ?? Response.error();
  }
}

async function defaultHandler(options: RouteHandlerCallbackOptions) {
  const { request } = options;
  const handlerKey = options.request.method === 'GET' ? await getHandlerKey(options) : defaultStrategy;
  const handler = knownStrategyHandlers[handlerKey] ?? knownStrategyHandlers[defaultStrategy];

  try {
    return await handler(options);
  } catch (e) {
    console.warn('[SW] Could not handle the request to %s (using handler %s).', request.url, handlerKey, e);

    return new Response(parseEgenOfflineResponseBodyHeader(request.headers), {
      status: parseEgenOfflineResponseStatusHeader(request.headers),
    });
  }
}

async function getHandlerKey({ request }: RouteHandlerCallbackOptions) {
  return getHandlerKeyFromHeaders(request.headers) ?? (await getHandlerKeyFromDynamicRouteRegistrations(request.url));
}

function getHandlerKeyFromHeaders(headers: Headers) {
  return getEgenHeader(headers, egenOfflineCachingStrategyHttpHeaderName);
}

async function getHandlerKeyFromDynamicRouteRegistrations(url: string) {
  const db = new ServiceWorkerDb();
  const allDynamicRouteRegistrations = await db.dynamicRouteRegistrations.toArray();
  const strategies = uniq(
    allDynamicRouteRegistrations
      .filter((route) => new RegExp(route.pattern).test(url))
      .map((route) => route.strategy ?? 'network-first'),
  );

  if (strategies.length <= 1) {
    return strategies[0];
  } else {
    // Multiple routes can match the URL (multiple RegExps can match).
    // In that case, prioritize the available strategies. When in doubt, cache the resource again.
    const priorities: Array<EgenOfflineCachingStrategy> = ['network-first', 'network-only-or-cache-only'];

    return (
      priorities.find((prioritizedStrategy) => strategies.some((strategy) => strategy === prioritizedStrategy)) ??
      defaultStrategy
    );
  }
}
