/** @module @category API */
import { getWorkSessionTypes, type WorkSessionType } from '@egen/esm-data-api';
import { useEffect, useState } from 'react';

/**
 * A React hook that fetches and returns all available session types from the
 * server. The data is fetched once when the component mounts.
 *
 * @returns An array of WorkSessionType objects. Returns an empty array while loading
 *   or if an error occurs.
 *
 * @example
 * ```tsx
 * import { useWorkSessionTypes } from '@egen/esm-framework';
 * function WorkSessionTypeSelector() {
 *   const sessionTypes = useWorkSessionTypes();
 *   return (
 *     <select>
 *       {sessionTypes.map((st) => (
 *         <option key={st.uuid} value={st.uuid}>{st.display}</option>
 *       ))}
 *     </select>
 *   );
 * }
 * ```
 */
export function useWorkSessionTypes() {
  const [sessionTypes, setWorkSessionTypes] = useState<Array<WorkSessionType>>([]);

  useEffect(() => {
    const sub = getWorkSessionTypes().subscribe(
      (types) => setWorkSessionTypes(types),
      (error) => console.error(error),
    );
    return () => sub.unsubscribe();
  }, []);

  return sessionTypes;
}
