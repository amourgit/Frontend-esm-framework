/** @module @category API */
import { egenObservableFetch, restBaseUrl } from '@egen/esm-api';
import type { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators/index.js';
import { type WorkSessionType } from './types';

export function toWorkSessionTypeObject(egenRestForm: any): WorkSessionType {
  return {
    uuid: egenRestForm.uuid,
    display: egenRestForm.display,
    name: egenRestForm.name,
  };
}

/**
 * Fetches all available session types from the REST API.
 *
 * @returns An Observable that emits an array of WorkSessionType objects and then completes.
 *
 * @example
 * ```ts
 * import { getWorkSessionTypes } from '@egen/esm-framework';
 * getWorkSessionTypes().subscribe((sessionTypes) => {
 *   console.log('Available session types:', sessionTypes);
 * });
 * ```
 */
export function getWorkSessionTypes(): Observable<Array<WorkSessionType>> {
  return egenObservableFetch<any>(`${restBaseUrl}/sessiontype`)
    .pipe(
      map((results) => {
        const sessionTypes: Array<WorkSessionType> = results.data.results.map(toWorkSessionTypeObject);
        return sessionTypes;
      }),
    )
    .pipe(take(1));
}
