// App factice de l'artefact natif de test : conteneur de module fédéré (script classique, global `_e2e_fake`).
// `get('./start')` retourne une fabrique de module dont l'export `root` (nom du `component` de la page) fournit le
// cycle de vie single-spa.
(function () {
  var lifecycles = {
    bootstrap: function () {
      return Promise.resolve();
    },
    mount: function () {
      var el = document.createElement('div');
      el.id = 'e2e-fake-mounted';
      el.textContent = 'e2e-fake';
      document.body.appendChild(el);
      return Promise.resolve();
    },
    unmount: function () {
      var el = document.getElementById('e2e-fake-mounted');
      if (el) el.remove();
      return Promise.resolve();
    },
  };
  window._e2e_fake = {
    init: function () {
      return Promise.resolve();
    },
    get: function () {
      return Promise.resolve(function () {
        return {
          root: function () {
            return lifecycles;
          },
        };
      });
    },
  };
})();
