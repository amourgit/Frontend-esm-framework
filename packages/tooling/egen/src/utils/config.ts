import { createRequire } from 'node:module';
import type { Configuration as RspackConfig } from '@rspack/core';
import type { ImportmapDeclaration, RoutesDeclaration } from './importmap';
import { setEnvVariables } from './variables';

export interface BuildOptions {
  backend?: string;
  defaultLocale?: string;
  importmap?: ImportmapDeclaration;
  routes?: RoutesDeclaration;
  apiUrl?: string;
  spaPath?: string;
  pageTitle?: string;
  supportOffline?: boolean;
  configUrls?: Array<string>;
  env?: string;
  coreAppsDir?: string;
  addCookie?: string;
  fresh?: boolean;
  assets?: Array<string>;
}

/**
 * Maps {@link BuildOptions} to the `EGEN_*` environment variables that the
 * rspack config reads at evaluation time.
 */
export function setBundlerEnv(options: BuildOptions = {}) {
  const variables: Record<string, unknown> = {};

  if (typeof options.backend === 'string') {
    variables.EGEN_PROXY_TARGET = options.backend;
  }

  if (typeof options.spaPath === 'string') {
    variables.EGEN_PUBLIC_PATH = options.spaPath;
  }

  if (typeof options.apiUrl === 'string') {
    variables.EGEN_API_URL = options.apiUrl;
  }

  if (typeof options.pageTitle === 'string') {
    variables.EGEN_PAGE_TITLE = options.pageTitle;
  }

  if (typeof options.addCookie === 'string') {
    variables.EGEN_ADD_COOKIE = options.addCookie;
  }

  if (typeof options.supportOffline === 'boolean') {
    variables.EGEN_OFFLINE = options.supportOffline ? 'enable' : 'disable';
  }

  if (Array.isArray(options.configUrls)) {
    variables.EGEN_CONFIG_URLS = options.configUrls.join(';');
  }

  if (typeof options.env === 'string') {
    variables.EGEN_ENV = options.env;
    variables.NODE_ENV = options.env;
  }

  if (typeof options.defaultLocale === 'string') {
    variables.EGEN_ESM_DEFAULT_LOCALE = options.defaultLocale;
  }

  if (typeof options.importmap === 'object') {
    switch (options.importmap.type) {
      case 'inline':
        variables.EGEN_ESM_IMPORTMAP = options.importmap.value;
        break;
      case 'url':
        variables.EGEN_ESM_IMPORTMAP_URL = options.importmap.value;
        break;
    }
  }

  if (typeof options.routes === 'object') {
    switch (options.routes.type) {
      case 'inline':
        variables.EGEN_ROUTES = options.routes.value;
        break;
      case 'url':
        variables.EGEN_ROUTES_URL = options.routes.value;
        break;
    }
  }

  if (typeof options.coreAppsDir === 'string') {
    variables.EGEN_ESM_CORE_APPS_DIR = options.coreAppsDir;
  }

  if (typeof options.fresh === 'boolean') {
    variables.EGEN_CLEAN_BEFORE_BUILD = options.fresh;
  }

  if (Array.isArray(options.assets)) {
    variables.EGEN_JS_CSS_ASSETS = options.assets.join(';');
  }

  setEnvVariables(variables);
}

export function loadBundlerConfig(options: BuildOptions = {}) {
  setBundlerEnv(options);

  const require = createRequire(import.meta.url);
  const config:
    | ((env: Record<string | number | symbol, unknown>) => RspackConfig)
    | RspackConfig = require('@egen/esm-app-shell/rspack.config.js');

  if (typeof config === 'function') {
    return config({});
  }

  return config;
}
