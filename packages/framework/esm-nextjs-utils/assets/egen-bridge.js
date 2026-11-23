/*!
 * EGEN embed bridge — script injectable, sans dépendance (protocole @egen-civitas/esm-nextjs-utils 1.1).
 * À servir par l'application embarquée (copie vendorisée de ce fichier) :
 *   <script src="/egen-bridge.js" defer data-mode="history" data-base-path="/"></script>
 * Rôle : annoncer au Shell la page courante de l'application (`location`) et obéir à `goto`,
 * pour que l'URL du Core reflète la navigation interne (actualisation, retour/avance, partage).
 * Attributs : data-mode = history | hash | none ; data-base-path = préfixe de l'app à retirer des chemins ;
 *             data-hosts = origines du Shell autorisées (facultatif : par défaut, celles que frame-ancestors admet).
 * Sécurité : ne parle qu'à window.parent, jamais avant un message valide du Shell, uniquement à l'origine de ce message.
 */
(function () {
  'use strict';
  if (window.parent === window || window.EgenBridge) return;

  var script = document.currentScript;
  var data = function (name, fallback) {
    return (script && script.getAttribute('data-' + name)) || fallback;
  };
  var mode = data('mode', 'history');
  if (mode === 'none') return;
  var basePath = '/' + String(data('base-path', '/')).replace(/^\/+|\/+$/g, '');
  if (basePath === '/') basePath = '';
  var hosts = String(data('hosts', ''))
    .split(/[\s,]+/)
    .filter(Boolean);

  var hostOrigin = null;
  var moduleName = null;
  var lastSent = null;
  var gotoListeners = [];
  var origPush = history.pushState;
  var origReplace = history.replaceState;

  function currentPath() {
    if (mode === 'hash') {
      var h = location.hash.replace(/^#/, '');
      return h ? (h.charAt(0) === '/' ? h : '/' + h) : '/';
    }
    var p = location.pathname;
    if (basePath && p.indexOf(basePath) === 0) p = p.slice(basePath.length) || '/';
    return p + location.search + location.hash;
  }

  function send(message) {
    if (!hostOrigin) return;
    window.parent.postMessage({ egen: 1, moduleName: moduleName, message: message }, hostOrigin);
  }

  function report(replace) {
    var path = currentPath();
    if (!hostOrigin || path === lastSent) return;
    lastSent = path;
    send({ kind: 'location', path: path, replace: !!replace, title: document.title });
  }

  function applyGoto(path) {
    if (path === currentPath()) return;
    lastSent = path; // la navigation demandée par le Shell ne lui est pas renvoyée
    for (var i = 0; i < gotoListeners.length; i++) {
      if (gotoListeners[i](path) === true) return;
    }
    if (mode === 'hash') location.hash = path;
    else location.assign(basePath + path); // repli robuste ; une app SPA peut enregistrer un onGoto pour une navigation douce
  }

  function isEnvelope(d) {
    return d && typeof d === 'object' && d.egen === 1 && typeof d.moduleName === 'string' && d.message && typeof d.message.kind === 'string';
  }

  window.addEventListener('message', function (event) {
    if (event.source !== window.parent || !isEnvelope(event.data)) return;
    if (hosts.length && hosts.indexOf(event.origin) === -1) return;
    if (hostOrigin && event.origin !== hostOrigin) return;
    var kind = event.data.message.kind;
    if (!hostOrigin && kind !== 'hello' && kind !== 'init') return;
    var first = !hostOrigin;
    hostOrigin = event.origin;
    moduleName = event.data.moduleName;
    if (kind === 'hello') {
      send({ kind: 'ready', caps: ['location', 'goto'] });
    }
    if (first || kind === 'hello') {
      lastSent = null;
      report(true);
    }
    if (kind === 'goto' && typeof event.data.message.path === 'string') applyGoto(event.data.message.path);
  });

  if (mode === 'history') {
    history.pushState = function () {
      var r = origPush.apply(this, arguments);
      report(false);
      return r;
    };
    history.replaceState = function () {
      var r = origReplace.apply(this, arguments);
      report(true);
      return r;
    };
    window.addEventListener('popstate', function () {
      report(true);
    });
  } else {
    window.addEventListener('hashchange', function () {
      report(false);
    });
  }

  // Titre : suit les changements de <title> (fil d'Ariane du Shell)
  var titleEl = document.querySelector('title');
  if (titleEl && window.MutationObserver) {
    new MutationObserver(function () {
      if (hostOrigin) send({ kind: 'title', title: document.title });
    }).observe(titleEl, { childList: true });
  }

  window.EgenBridge = {
    /** Enregistre une navigation douce (ex. router.push) ; renvoyer true si la demande est traitée. */
    onGoto: function (fn) {
      gotoListeners.push(fn);
      return function () {
        gotoListeners = gotoListeners.filter(function (l) {
          return l !== fn;
        });
      };
    },
    report: report,
  };
  document.dispatchEvent(new CustomEvent('egen-bridge:ready'));
})();
