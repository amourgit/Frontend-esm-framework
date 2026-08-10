import React from 'react';
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
export { useStore, useStoreWithActions, createUseStore } from './src/useStore';
import * as utils from '@egen/esm-utils';

export const ComponentContext = React.createContext(null);

export const egenComponentDecorator = jest.fn().mockImplementation(() => (component) => component);

export const useAttachments = jest.fn(() => ({
  isLoading: true,
  data: [],
  error: null,
  mutate: jest.fn(),
  isValidating: true,
}));

export const useConfig = jest.fn().mockImplementation((options?: { externalModuleName?: string }) => {
  if (options?.externalModuleName) {
    console.warn(`Mock useConfig called with externalModuleName: ${options.externalModuleName}`);
  }
  return utils.getDefaultsFromConfigSchema(configSchema);
});

export const useCurrentPatient = jest.fn(() => []);

export const useEntity = jest.fn(() => ({
  isLoading: true,
  patient: null,
  entityUuid: null,
  error: null,
}));

export const useSession = jest.fn(() => ({
  authenticated: false,
  sessionId: '',
}));

export const useLayoutType = jest.fn(() => 'desktop');

export const useRenderableExtensions = jest.fn(() => []);

export const useAssignedExtensions = jest.fn(() => []);

export const useExtensionSlotMeta = jest.fn(() => ({}));

export const useConnectedExtensions = jest.fn(() => []);

export const UserHasAccess = jest.fn().mockImplementation((props: any) => {
  return props.children;
});

export const useExtensionInternalStore = createGlobalStore('extensionInternal', getExtensionInternalStore());

export const useExtensionStore = jest.fn();

export const ExtensionSlot = jest.fn().mockImplementation(({ children }) => <>{children}</>);

export const Extension = jest.fn().mockImplementation((props: any) => <slot />);

export const useFeatureFlag = jest.fn().mockReturnValue(true);

export const usePagination = jest.fn(realUsePagination);
export const usePaginationInfo = jest.fn(realUsePaginationInfo);

export const useEgenPagination = jest.fn(realUseEgenrPagination);
export const useEgenInfinite = jest.fn(realUseEgenInfinite);
export const useEgenFetchAll = jest.fn(realUseEgenFetchAll);
export const useFhirPagination = jest.fn(realUseFhirPagination);
export const useFhirInfinite = jest.fn(realUseFhirInfinite);
export const useFhirFetchAll = jest.fn(realUseFhirFetchAll);

export const useSessionContext = jest.fn().mockReturnValue({
  error: null,
  mutate: jest.fn(),
  isValidating: true,
  currentSession: null,
  activeSession: null,
  currentSessionIsRetrospective: false,
});

export const useVisitContextStore = jest.fn(realUseVisitContextStore);

export const useSessionTypes = jest.fn(() => []);

export const useAbortController = jest.fn(() => {
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

export const useEgenSWR = jest.fn((key: string | Array<any>) => {
  return { data: egenFetch(key.toString()) };
});

export const useDebounce = jest.fn().mockImplementation((value) => value);

export const useOnClickOutside = jest.fn(function useOnClickOutside() {
  return React.useRef();
});

export const useOnVisible = jest.fn(function useOnVisible() {
  return React.useRef();
});

export const useBodyScrollLock = jest.fn();

export const isDesktop = jest.fn(realIsDesktop);

export const useLocations = jest.fn().mockReturnValue([]);

export const toEgenIsoString = jest.fn().mockImplementation((date: Date) => date.toISOString());

export const toDateObjectStrict = jest.fn().mockImplementation((date: string) => new Date(date));

export const getLocale = jest.fn().mockReturnValue('en');

export const useAppContext = jest.fn();

export const useAssignedExtensionIds = jest.fn();

export const useConnectivity = jest.fn();

export const useDefineAppContext = jest.fn();

export const useExtensionSlot = jest.fn();

export const useForceUpdate = jest.fn();

export const useLeftNav = jest.fn();

export const useLeftNavStore = jest.fn();

// TODO: Remove this in favour of usePrimaryIdentifierCode below
export const usePrimaryIdentifierResource = jest.fn();

export const usePrimaryIdentifierCode = jest.fn();

export const useBackendConfiguration = jest.fn().mockReturnValue({
  backendConfiguration: undefined,
  isLoadingBackendConfiguration: false,
  mutateBackendConfiguration: jest.fn(),
  errorFetchingBackendConfiguration: undefined,
});
