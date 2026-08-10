// ============================================================================
//  Catégorie « dialogs »
//  Fenêtres superposées auto-contenues (overlay + panneau centré), montées
//  directement en React dans l'app appelante — gestion complète de
//  l'ouverture/fermeture, de l'animation et du contenu.
//
//  Nommée 'dialogs' (et non 'modals') pour ne pas entrer en collision avec
//  le système de modales existant (showModal/setupModals, src/modals/),
//  qui repose sur l'enregistrement nommé de parcels single-spa — un
//  mécanisme différent, pour des modales inter-applications.
// ============================================================================
export * from './card-modal';
