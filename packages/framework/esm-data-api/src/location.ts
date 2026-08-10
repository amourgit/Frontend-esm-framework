/** @module @category API */
import { egenObservableFetch, restBaseUrl } from '@egen/esm-api';
import type { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators/index.js';
import type { Location } from './types';

export function toLocationObject(egenRestForm: any): Location {
  return {
    uuid: egenRestForm.uuid,
    display: egenRestForm.display,
  };
}

export function getLocations(
  tagUuidOrName: string | null = null,
  query: string | null = null,
): Observable<Array<Location>> {
  const params = new URLSearchParams();
  if (tagUuidOrName) {
    params.set('tag', tagUuidOrName);
  }
  if (query) {
    params.set('q', query);
  }
  const queryString = params.toString();
  const url = `${restBaseUrl}/location${queryString ? '?' + queryString : ''}`;

  return egenObservableFetch<{ results: Array<Location> }>(url)
    .pipe(
      map((results) => {
        const locations: Array<Location> = results.data.results.map(toLocationObject);
        return locations;
      }),
    )
    .pipe(take(1));
}
