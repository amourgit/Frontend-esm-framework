/** @module @category Framework */
import type { ComponentType } from 'react';
import React from 'react';
import ReactDOMClient from 'react-dom/client';
import type { AppProps } from 'single-spa';
import singleSpaReact, { type ReactAppOrParcel } from 'single-spa-react';
import type { ComponentDecoratorOptions } from './egenComponentDecorator';
import { egenComponentDecorator } from './egenComponentDecorator';

/**
 * Creates a single-spa lifecycle object for a React component. The component is
 * wrapped with the Egen component decorator which provides standard functionality
 * like error boundaries, configuration, and extension support.
 *
 * @param Component The React component to create a lifecycle for.
 * @param options Configuration options for the Egen component decorator.
 * @returns A single-spa lifecycle object with bootstrap, mount, and unmount functions.
 *
 * @example
 * ```ts
 * import { getLifecycle } from '@egen/esm-framework';
 * import MyComponent from './MyComponent';
 * export const lifecycle = getLifecycle(MyComponent, { featureName: 'my-feature', moduleName: '@egen/esm-my-app' });
 * ```
 */
export function getLifecycle<T>(Component: ComponentType<T>, options: ComponentDecoratorOptions) {
  return singleSpaReact<T>({
    React,
    ReactDOMClient,
    rootComponent: egenComponentDecorator<T>(options)(Component) as ComponentType<T & AppProps>,
  });
}

/**
 * Creates a lazy-loading single-spa lifecycle for a React component. The component
 * is loaded asynchronously via dynamic import only when it's needed, which helps
 * reduce initial bundle size. This is the recommended way to define lifecycles
 * for most modules.
 *
 * @param lazy A function that returns a Promise resolving to a module with the
 *   component as its default export (i.e., a dynamic import).
 * @param options Configuration options for the Egen component decorator.
 * @returns A function that returns a Promise resolving to a single-spa lifecycle object.
 *
 * @example
 * ```ts
 * import { getAsyncLifecycle } from '@egen/esm-framework';
 * const options = { featureName: 'my-feature', moduleName: '@egen/esm-my-app' };
 * export const root = getAsyncLifecycle(() => import('./root.component'), options);
 * ```
 */
export function getAsyncLifecycle<T>(
  lazy: () => Promise<{ default: ComponentType<T> }>,
  options: ComponentDecoratorOptions,
) {
  return () => lazy().then(({ default: Component }) => getLifecycle(Component, options));
}

/**
 * Creates a single-spa lifecycle for a React component that is already loaded.
 * Unlike {@link getAsyncLifecycle}, this wraps a synchronously-available component
 * in a Promise to match the expected lifecycle interface. Use this when the
 * component doesn't need lazy loading.
 *
 * @param Component The React component to create a lifecycle for.
 * @param options Configuration options for the Egen component decorator.
 * @returns A function that returns a Promise resolving to a single-spa lifecycle object.
 *
 * @example
 * ```ts
 * import { getSyncLifecycle } from '@egen/esm-framework';
 * import MyComponent from './MyComponent';
 * const options = { featureName: 'my-feature', moduleName: '@egen/esm-my-app' };
 * export const myExtension = getSyncLifecycle(MyComponent, options);
 * ```
 */
export function getSyncLifecycle<T>(Component: ComponentType<T>, options: ComponentDecoratorOptions) {
  return () => Promise.resolve(getLifecycle(Component, options));
}

/**
 * @deprecated Use getAsyncLifecycle instead.
 */
export const getAsyncExtensionLifecycle = getAsyncLifecycle;
