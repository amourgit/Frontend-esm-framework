/** @module @category UI */

const ARC_PATH =
  'm 164,100 c 0,-35.346224 -28.65378,-64 -64,-64 -35.346224,0 -64,28.653776 -64,64 0,35.34622 28.653776,64 64,64 35.34622,0 64,-26.21502 64,-64 0,-37.784981 -26.92058,-64 -64,-64 -37.079421,0 -65.267479,26.922736 -64,64 1.267479,37.07726 26.703171,65.05317 64,64 37.29683,-1.05317 64,-64 64,-64';

/**
 * Markup HTML du loader EGEN (voir spinner/_loader.scss). Source unique : utilisé par le
 * composant React `Loader`, par `renderLoadingSpinner` et par le contrôleur `showPageLoader`.
 */
export function loaderMarkup(size = 160, label = 'Chargement en cours'): string {
  return `<div class="egen-loader">
  <svg class="egen-loader__defs" aria-hidden="true" focusable="false"><defs>
    <filter id="egen-loader-goo">
      <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
      <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 20 -10" result="goo" />
      <feComposite in="SourceGraphic" in2="goo" operator="atop" />
    </filter>
  </defs></svg>
  <svg class="egen-loader__shadow" width="${size}" height="${size}" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
    <path class="egen-loader__arc" d="${ARC_PATH}" />
    <circle class="egen-loader__ring" cx="100" cy="100" r="64" />
  </svg>
  <svg class="egen-loader__spin" width="${size}" height="${size}" viewBox="0 0 200 200" role="status" aria-label="${label}">
    <defs>
      <linearGradient id="egen-loader-gradient" gradientUnits="userSpaceOnUse" x1="40" y1="40" x2="160" y2="160">
        <stop class="egen-loader__stop-from" offset="0" />
        <stop class="egen-loader__stop-to" offset="1" />
      </linearGradient>
    </defs>
    <path class="egen-loader__arc" d="${ARC_PATH}" />
    <circle class="egen-loader__ring" cx="100" cy="100" r="64" />
  </svg>
</div>`;
}
