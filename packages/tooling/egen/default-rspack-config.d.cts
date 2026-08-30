// Types pour default-rspack-config.cjs.
//
// Ce fichier .cjs fait `Object.assign(extendConfig, rest)` a l'execution :
// il fusionne la fonction par defaut de @egen-civitas/rspack-config avec
// tous ses autres exports nommes en proprietes statiques attachees a cette
// fonction. Cette declaration reflete exactement cette forme pour que la
// resolution de types (node10, node16 CJS/ESM, bundler) reussisse.

import type RspackConfigModule from '@egen-civitas/rspack-config';

type NamedExports = Omit<typeof import('@egen-civitas/rspack-config'), 'default'>;
type Merged = typeof RspackConfigModule & NamedExports;

declare const merged: Merged;
export = merged;
