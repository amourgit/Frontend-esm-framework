import type { EgenOfflineHttpHeaderNames, EgenOfflineHttpHeaders } from '@egen/esm-offline';
import { egenOfflineResponseBodyHttpHeaderName, egenOfflineResponseStatusHttpHeaderName } from './constants';

export function parseEgenOfflineResponseBodyHeader(headers: Headers) {
  // The ?? undefined here is important as getEgenHeader returns null by default when the header
  // is missing. undefined is different than null in this case since we want the body to be missing
  // if the header is not there (null is not missing).
  return getEgenHeader(headers, egenOfflineResponseBodyHttpHeaderName) ?? undefined;
}

export function parseEgenOfflineResponseStatusHeader(headers: Headers) {
  const status = +(getEgenHeader(headers, egenOfflineResponseStatusHttpHeaderName) ?? '');

  // The Response API requires the status to be in the 200-599 range and throws otherwise.
  return isNaN(status) || status < 200 || status > 599 ? 503 : status;
}

export function getEgenHeader<T extends EgenOfflineHttpHeaderNames>(
  headers: Headers,
  name: T,
): EgenOfflineHttpHeaders[T] | null {
  return headers.get(name) as EgenOfflineHttpHeaders[T];
}

export function headersToObject(headers: Headers) {
  const result = {};
  headers.forEach((value, key) => (result[key] = value));
  return result;
}
