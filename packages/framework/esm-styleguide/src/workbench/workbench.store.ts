import { getGlobalStore } from '@egen-civitas/esm-state';
import type { ToolWindowAnchor } from '@egen-civitas/esm-extensions';

/**
 * État global du plan de travail du shell (rails + zones façon IntelliJ).
 *
 * Il passe par `@egen-civitas/esm-state` et non par un contexte React : le shell et chaque
 * app micro-frontend vivent dans des racines React distinctes. La taille des zones et la
 * fenêtre d'outils active de chaque zone sont mémorisées dans le navigateur (localStorage),
 * comme IntelliJ restaure sa disposition.
 */
export const WORKBENCH_STORAGE_KEY = 'egen-workbench-layout';

export const ZONE_ANCHORS: readonly ToolWindowAnchor[] = ['left', 'bottom', 'right'];

/** Taille par défaut des zones, en pixels (largeur pour left/right, hauteur pour bottom). */
export const DEFAULT_ZONE_SIZES: Readonly<Record<ToolWindowAnchor, number>> = { left: 280, right: 320, bottom: 240 };

const ZONE_LIMITS: Readonly<Record<ToolWindowAnchor, { min: number; max: number }>> = {
  left: { min: 200, max: 640 },
  right: { min: 220, max: 640 },
  bottom: { min: 120, max: 720 },
};

export interface WorkbenchState {
  /** Largeur (left/right) ou hauteur (bottom) de chaque zone, en pixels. */
  sizes: Record<ToolWindowAnchor, number>;
  /** Fenêtre d'outils (nom de l'extension) affichée dans chaque zone ; `null` : zone repliée. */
  active: Record<ToolWindowAnchor, string | null>;
}

/**
 * Borne une taille de zone : minimum fixe, maximum = plafond fixe ET part de la fenêtre
 * (50 % de la largeur, 70 % de la hauteur), pour que le contenu central reste toujours visible.
 */
export function clampZoneSize(
  anchor: ToolWindowAnchor,
  size: number,
  viewport: { width: number; height: number } = { width: window.innerWidth, height: window.innerHeight },
): number {
  const { min, max } = ZONE_LIMITS[anchor];
  const viewportMax = Math.floor((anchor === 'bottom' ? viewport.height * 0.7 : viewport.width * 0.5) || max);
  const upper = Math.max(min, Math.min(max, viewportMax));
  if (!Number.isFinite(size)) return DEFAULT_ZONE_SIZES[anchor];
  return Math.round(Math.min(upper, Math.max(min, size)));
}

function defaultState(): WorkbenchState {
  return {
    sizes: { ...DEFAULT_ZONE_SIZES },
    active: { left: null, right: null, bottom: null },
  };
}

function readStoredState(): WorkbenchState {
  const state = defaultState();
  try {
    const raw = window.localStorage.getItem(WORKBENCH_STORAGE_KEY);
    if (!raw) return state;
    const parsed = JSON.parse(raw) as Partial<WorkbenchState> | null;
    for (const anchor of ZONE_ANCHORS) {
      const size = parsed?.sizes?.[anchor];
      if (typeof size === 'number') state.sizes[anchor] = clampZoneSize(anchor, size);
      const active = parsed?.active?.[anchor];
      if (typeof active === 'string' && active.length > 0) state.active[anchor] = active;
    }
  } catch {
    // stockage indisponible ou contenu corrompu : disposition par défaut
  }
  return state;
}

export const workbenchStore = getGlobalStore<WorkbenchState>('workbench', readStoredState());

workbenchStore.subscribe((state) => {
  try {
    window.localStorage.setItem(WORKBENCH_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota dépassé ou stockage désactivé : la disposition reste valable pour la session
  }
});

/** Ouvre la fenêtre d'outils `id` dans la zone `anchor` ; un second appel sur la même la referme. */
export function toggleToolWindow(anchor: ToolWindowAnchor, id: string) {
  const { active } = workbenchStore.getState();
  workbenchStore.setState({ active: { ...active, [anchor]: active[anchor] === id ? null : id } });
}

/** Ouvre la fenêtre d'outils `id` dans la zone `anchor` (sans la refermer si elle est déjà affichée). */
export function openToolWindow(anchor: ToolWindowAnchor, id: string) {
  const { active } = workbenchStore.getState();
  if (active[anchor] !== id) workbenchStore.setState({ active: { ...active, [anchor]: id } });
}

/** Replie la zone `anchor`. */
export function closeToolWindow(anchor: ToolWindowAnchor) {
  const { active } = workbenchStore.getState();
  if (active[anchor] !== null) workbenchStore.setState({ active: { ...active, [anchor]: null } });
}

/** Redimensionne la zone `anchor` (valeur bornée par `clampZoneSize`). */
export function setZoneSize(anchor: ToolWindowAnchor, size: number) {
  const { sizes } = workbenchStore.getState();
  const next = clampZoneSize(anchor, size);
  if (sizes[anchor] !== next) workbenchStore.setState({ sizes: { ...sizes, [anchor]: next } });
}

/** Rétablit la taille par défaut de la zone `anchor`. */
export function resetZoneSize(anchor: ToolWindowAnchor) {
  setZoneSize(anchor, DEFAULT_ZONE_SIZES[anchor]);
}
