import React, { type PropsWithChildren } from 'react';
import { vi } from 'vitest';
import { egenFetch } from '@egen/esm-api/mock';
import { configSchema } from '@egen/esm-config/mock';
import { getExtensionInternalStore } from '@egen/esm-extensions/mock';
import { createGlobalStore } from '@egen/esm-state/mock';
import { isDesktop as realIsDesktop } from './src/useLayoutType';
import { useFhirFetchAll as realUseFhirFetchAll } from './src/useFhirFetchAll';
import { useFhirInfinite as realUseFhirInfinite } from './src/useFhirInfinite';
import { useFhirPagination as realUseFhirPagination } from './src/useFhirPagination';
import { useEgenFetchAll as realUseEgenFetchAll } from './src/useEgenFetchAll';
import { useEgenInfinite as realUseEgenInfinite } from './src/useEgenInfinite';
import { useEgenPagination as realUseEgenrPagination } from './src/useEgenPagination';
import { useVisitContextStore as realUseVisitContextStore } from './src/useVisitContextStore';
import { usePagination as realUsePagination } from './src/usePagination';
import { usePaginationInfo as realUsePaginationInfo } from './src/usePaginationInfo';
export { ConfigurableLink } from './src/ConfigurableLink';
export { RenderIfValueIsTruthy } from './src/RenderIfValueIsTruthy';
export { useStore, useStoreWithActions, createUseStore } from './src/useStore';
import * as utils from '@egen/esm-utils';

export const ComponentContext = React.createContext(null);

export const egenComponentDecorator = vi.fn().mockImplementation(() => (component) => component);

export const useAttachments = vi.fn(() => ({
  isLoading: true,
  data: [],
  error: null,
  mutate: vi.fn(),
  isValidating: true,
}));

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
export const useConfig = vi.fn<typeof import('@egen/esm-react-utils').useConfig>(
  (options?: { externalModuleName?: string }) => {
    if (options?.externalModuleName) {
      console.warn(`Mock useConfig called with externalModuleName: ${options.externalModuleName}`);
    }
    return utils.getDefaultsFromConfigSchema(configSchema);
  },
);

export const useCurrentPatient = vi.fn(() => []);

export const useEntity = vi.fn(() => ({
  isLoading: true,
  patient: null,
  entityUuid: null,
  error: null,
}));

export const useSession = vi.fn(() => ({
  authenticated: false,
  sessionId: '',
}));

export const useLayoutType = vi.fn(() => 'desktop');

export const useRenderableExtensions = vi.fn(() => []);

export const useAssignedExtensions = vi.fn(() => []);

export const useExtensionSlotMeta = vi.fn(() => ({}));

export const useConnectedExtensions = vi.fn(() => []);

export const UserHasAccess = vi.fn((props: PropsWithChildren) => {
  return props.children;
});

export const useExtensionInternalStore = createGlobalStore('extensionInternal', getExtensionInternalStore());

export const useExtensionStore = vi.fn();

export const ExtensionSlot = vi.fn(({ children }) => <>{children}</>);

export const Extension = vi.fn((props: any) => <slot />);

export const useFeatureFlag = vi.fn().mockReturnValue(true);

export const usePagination = vi.fn(realUsePagination);
export const usePaginationInfo = vi.fn(realUsePaginationInfo);

export const useEgenPagination = vi.fn(realUseEgenrPagination);
export const useEgenInfinite = vi.fn(realUseEgenInfinite);
export const useEgenFetchAll = vi.fn(realUseEgenFetchAll);
export const useFhirPagination = vi.fn(realUseFhirPagination);
export const useFhirInfinite = vi.fn(realUseFhirInfinite);
export const useFhirFetchAll = vi.fn(realUseFhirFetchAll);

export const useSessionContext = vi.fn(() => ({
  error: null,
  mutate: vi.fn(),
  isValidating: true,
  currentSession: null,
  activeSession: null,
  currentSessionIsRetrospective: false,
}));

export const useVisitContextStore = vi.fn(realUseVisitContextStore);

export const useSessionTypes = vi.fn(() => []);

export const useAbortController = vi.fn(() => {
  let aborted = false;
  return {
    abort: () => {
      aborted = true;
    },
    signal: {
      aborted,
    },
  } as AbortController;
});

export const useEgenSWR = vi.fn((key: string | Array<any>) => {
  return { data: egenFetch(key.toString()) };
});

export const useDebounce = vi.fn((value) => value);

export const useOnClickOutside = vi.fn(function useOnClickOutside() {
  return React.useRef();
});

export const useOnVisible = vi.fn(function useOnVisible() {
  return React.useRef();
});

export const useBodyScrollLock = vi.fn();

export const isDesktop = vi.fn(realIsDesktop);

export const useLocations = vi.fn(() => []);

export const toEgenIsoString = vi.fn((date: Date) => date.toISOString());

export const toDateObjectStrict = vi.fn((date: string) => new Date(date));

export const getLocale = vi.fn(() => 'en');

export const useAppContext = vi.fn();

export const useAssignedExtensionIds = vi.fn();

export const useConnectivity = vi.fn();

export const useDefineAppContext = vi.fn();

export const useExtensionSlot = vi.fn();

export const useForceUpdate = vi.fn();

export const useLeftNav = vi.fn();

export const useLeftNavStore = vi.fn();

// TODO: Remove this in favour of usePrimaryIdentifierCode below
export const usePrimaryIdentifierResource = vi.fn();

export const usePrimaryIdentifierCode = vi.fn();

export const useBackendConfiguration = vi.fn(() => ({
  backendConfiguration: undefined,
  isLoadingBackendConfiguration: false,
  mutateBackendConfiguration: vi.fn(),
  errorFetchingBackendConfiguration: undefined,
}));
