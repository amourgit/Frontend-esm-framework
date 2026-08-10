import uniq from 'lodash-es/uniq';

// note that these constants are also defined in @egen/esm-offline
export const egenOfflineResponseBodyHttpHeaderName = 'x-egen-offline-response-body';
export const egenOfflineResponseStatusHttpHeaderName = 'x-egen-offline-response-status';
export const egenOfflineCachingStrategyHttpHeaderName = 'x-egen-offline-caching-strategy';

export const egenCachePrefix = 'egen';
export const egenCacheName = `${egenCachePrefix}-spa-cache-v1`;

export const wbManifest = self.__WB_MANIFEST;
export const indexUrl = prefixWithServiceWorkerLocationIfRelative('index.html');
export const absoluteWbManifestUrls = uniq(wbManifest.map(({ url }) => prefixWithServiceWorkerLocationIfRelative(url)));

export const buildManifestSuffix = '.buildmanifest.json';

function prefixWithServiceWorkerLocationIfRelative(path: string) {
  return new URL(path, self.location.href).href;
}
