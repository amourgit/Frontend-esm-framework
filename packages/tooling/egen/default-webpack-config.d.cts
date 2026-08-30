// Types pour default-webpack-config.cjs.
//
// Ce fichier .cjs fait `Object.assign(extendConfig, rest)` a l'execution :
// il fusionne la fonction par defaut de @egen-civitas/webpack-config avec
// tous ses autres exports nommes en proprietes statiques attachees a cette
// fonction. Cette declaration reflete exactement cette forme pour que la
// resolution de types (node10, node16 CJS/ESM, bundler) reussisse.

import type WebpackConfigModule from '@egen-civitas/webpack-config';

type NamedExports = Omit<typeof import('@egen-civitas/webpack-config'), 'default'>;
type Merged = typeof WebpackConfigModule & NamedExports;

declare const merged: Merged;
export = merged;
