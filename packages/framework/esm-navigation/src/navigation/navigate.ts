/** @module @category Navigation */
import { navigateToUrl } from 'single-spa';
import { interpolateUrl } from './interpolate-string';
import type {} from '@egen/esm-globals';

function trimTrailingSlash(str: string) {
  return str.replace(/\/$/, '');
}

export type TemplateParams = { [key: string]: string };

export interface NavigateOptions {
  to: string;
  templateParams?: TemplateParams;
}

/**
 * Calls `location.assign` for non-SPA paths and [navigateToUrl](https://single-spa.js.org/docs/api/#navigatetourl) for SPA paths
 *
 * #### Example usage:
 * ```js
 * @example
 * const config = useConfig();
 * const submitHandler = () => {
 *   navigate({ to: config.links.submitSuccess });
 * };
 * ```
 *
 * #### Example behavior::
 * ```js
 * @example
 * navigate({ to: "/some/path" }); // => window.location.assign("/some/path")
 * navigate({ to: "https://single-spa.js.org/" }); // => window.location.assign("https://single-spa.js.org/")
 * navigate({ to: "${egenBase}/some/path" }); // => window.location.assign("/egen/some/path")
 * navigate({ to: "/egen/spa/foo/page" }); // => navigateToUrl("/egen/spa/foo/page")
 * navigate({ to: "${egenSpaBase}/bar/page" }); // => navigateToUrl("/egen/spa/bar/page")
 * navigate({ to: "/${egenSpaBase}/baz/page" }) // => navigateToUrl("/egen/spa/baz/page")
 * navigate({ to: "https://egen.alpha.vercel.com/${egenSpaBase}/qux/page" }); // => navigateToUrl("/egen/spa/qux/page")
 *   if `window.location.origin` == "https://egen.alpha.vercel.com", else will use window.location.assign
 * ```
 *
 * @param to The target path or URL. Supports templating with 'egenBase', 'egenSpaBase',
 * and any additional template parameters defined in `templateParams`.
 * For example, `${egenSpaBase}/home` will resolve to `/egen/spa/home`
 * for implementations using the standard Egen and SPA base paths.
 * If `templateParams` contains `{ foo: "bar" }`, then the URL `${egenBase}/${foo}`
 * will become `/egen/bar`.
 */
export function navigate({ to, templateParams }: NavigateOptions): void {
  const egenSpaBase = trimTrailingSlash(window.getEgenSpaBase());
  const target = interpolateUrl(to, templateParams).replace(window.location.origin, '');
  const isSpaPath = target.startsWith(egenSpaBase);

  if (isSpaPath) {
    navigateToUrl(target);
  } else {
    window.location.assign(target);
  }
}
