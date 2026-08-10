/** @module @category Context */
import { useDefineAppContext } from './useDefineAppContext';

export interface EgenAppContextProps<T extends NonNullable<object> = NonNullable<object>> {
  /** the namespace that this component defines */
  namespace: string;
  /** used to control the value associated with the namespace */
  value?: T;
}

/**
 * EgenAppContext is a simple React component meant to function similarly to React's Context,
 * but built on top of the EgenAppContext.
 *
 * @example
 * ```ts
 *    <EgenAppContext namespace="something" value={{ key: "1234" }} />
 * ```
 *
 * **Notes on usage:** Unlike a proper React context where the value is limited to the subtree under the
 * context component, the `EgenAppContext` is inherently global in scope. That means that _all applications_
 * will see the values that you set for the namespace if they load the value of the namespace.
 */
export function EgenAppContext<T extends NonNullable<object> = NonNullable<object>>({
  namespace,
  value,
}: EgenAppContextProps<T>) {
  useDefineAppContext<T>(namespace, value);

  return null;
}
