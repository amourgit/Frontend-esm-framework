import { getGlobalStore } from '@egen-civitas/esm-state';
import {
  getAssignedExtensions,
  getToolWindowCompartment,
  TOOL_WINDOW_SLOTS,
  type ToolWindowAnchor,
} from '@egen-civitas/esm-extensions';
import { DEFAULT_COMPARTMENT_ID } from './compartments.js';

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

/** Zones latérales : les seules à pouvoir être divisées en compartiments verticaux. */
export type SideAnchor = 'left' | 'right';

export const SIDE_ANCHORS: readonly SideAnchor[] = ['left', 'right'];

export interface WorkbenchState {
  /** Largeur (left/right) ou hauteur (bottom) de chaque zone, en pixels. */
  sizes: Record<ToolWindowAnchor, number>;
  /** Fenêtre d'outils (nom de l'extension) affichée dans chaque zone ; `null` : zone repliée. */
  active: Record<ToolWindowAnchor, string | null>;
  /**
   * Zones latérales : fenêtres d'outils ouvertes dans un compartiment **propre** (empilées sous le compartiment
   * par défaut, dans l'ordre d'ouverture). Le compartiment par défaut reste porté par `active`.
   */
  compartments: Record<SideAnchor, string[]>;
  /** Hauteur mémorisée de chaque compartiment, en % de sa zone (clé : voir `compartmentKey`). */
  heights: Record<string, number>;
}

/** Clé de mémorisation de la hauteur d'un compartiment ; `id` omis : compartiment par défaut de la zone. */
export function compartmentKey(anchor: SideAnchor, id: string = DEFAULT_COMPARTMENT_ID): string {
  return `${anchor}:${id}`;
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
    compartments: { left: [], right: [] },
    heights: {},
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
    for (const anchor of SIDE_ANCHORS) {
      const open = parsed?.compartments?.[anchor];
      if (Array.isArray(open)) {
        state.compartments[anchor] = open.filter(
          (id, index): id is string => typeof id === 'string' && id.length > 0 && open.indexOf(id) === index,
        );
      }
    }
    for (const [key, value] of Object.entries(parsed?.heights ?? {})) {
      if (typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 100) state.heights[key] = value;
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

const isSide = (anchor: ToolWindowAnchor): anchor is SideAnchor => anchor === 'left' || anchor === 'right';

/** Fenêtres d'outils ouvertes dans un compartiment propre de la zone `anchor` (liste vide pour la zone basse). */
export function getOpenCompartments(
  anchor: ToolWindowAnchor,
  state: Partial<WorkbenchState> = workbenchStore.getState(),
) {
  return isSide(anchor) ? (state.compartments?.[anchor] ?? []) : [];
}

/** Vrai si la fenêtre d'outils `id` demande un compartiment propre (`meta.compartment`) dans la zone `anchor`. */
export function hasOwnCompartment(anchor: ToolWindowAnchor, id: string): boolean {
  if (!isSide(anchor)) return false;
  try {
    const extension = getAssignedExtensions(TOOL_WINDOW_SLOTS[anchor]).find((candidate) => candidate.name === id);
    return Boolean(extension?.meta && getToolWindowCompartment(extension.meta as { compartment?: unknown }));
  } catch {
    // slot pas encore enregistré (appel d'une app avant le montage du rail) : compartiment par défaut
    return false;
  }
}

/** Ouvre la fenêtre `id` dans un compartiment propre de la zone `anchor` (sans effet si déjà ouverte). */
export function openCompartment(anchor: SideAnchor, id: string) {
  const state = workbenchStore.getState();
  const open = getOpenCompartments(anchor, state);
  if (!open.includes(id)) {
    workbenchStore.setState({
      compartments: { ...defaultCompartments(), ...state.compartments, [anchor]: [...open, id] },
    });
  }
}

/** Referme le compartiment propre `id` de la zone `anchor` ; les autres se partagent la place libérée. */
export function closeCompartment(anchor: SideAnchor, id: string) {
  const state = workbenchStore.getState();
  const open = getOpenCompartments(anchor, state);
  if (open.includes(id)) {
    workbenchStore.setState({
      compartments: { ...defaultCompartments(), ...state.compartments, [anchor]: open.filter((other) => other !== id) },
    });
  }
}

/** Ouvre le compartiment propre `id` de la zone `anchor`, ou le referme s'il est ouvert. */
export function toggleCompartment(anchor: SideAnchor, id: string) {
  if (getOpenCompartments(anchor).includes(id)) closeCompartment(anchor, id);
  else openCompartment(anchor, id);
}

function defaultCompartments(): Record<SideAnchor, string[]> {
  return { left: [], right: [] };
}

/**
 * Mémorise les hauteurs (en %) des compartiments d'une zone latérale. `heights` est indexé par clé de
 * compartiment (voir `compartmentKey`) ; seules les valeurs réellement modifiées déclenchent une mise à jour.
 */
export function setCompartmentHeights(heights: Readonly<Record<string, number>>) {
  const current = workbenchStore.getState().heights ?? {};
  const changed = Object.entries(heights).some(([key, value]) => Math.abs((current[key] ?? -1) - value) > 0.005);
  if (changed) workbenchStore.setState({ heights: { ...current, ...heights } });
}

/**
 * Ouvre la fenêtre d'outils `id` dans la zone `anchor` ; un second appel sur la même la referme.
 * Selon sa `meta.compartment`, elle occupe le compartiment par défaut de la zone ou un compartiment propre.
 */
export function toggleToolWindow(anchor: ToolWindowAnchor, id: string) {
  if (isSide(anchor) && hasOwnCompartment(anchor, id)) return toggleCompartment(anchor, id);
  const { active } = workbenchStore.getState();
  workbenchStore.setState({ active: { ...active, [anchor]: active[anchor] === id ? null : id } });
}

/** Ouvre la fenêtre d'outils `id` dans la zone `anchor` (sans la refermer si elle est déjà affichée). */
export function openToolWindow(anchor: ToolWindowAnchor, id: string) {
  if (isSide(anchor) && hasOwnCompartment(anchor, id)) return openCompartment(anchor, id);
  const { active } = workbenchStore.getState();
  if (active[anchor] !== id) workbenchStore.setState({ active: { ...active, [anchor]: id } });
}

/**
 * Replie la zone `anchor` (compartiment par défaut et compartiments propres). Avec `id`, ne referme que
 * cette fenêtre d'outils.
 */
export function closeToolWindow(anchor: ToolWindowAnchor, id?: string) {
  const state = workbenchStore.getState();
  if (id !== undefined) {
    if (isSide(anchor) && getOpenCompartments(anchor, state).includes(id)) return closeCompartment(anchor, id);
    if (state.active[anchor] === id) workbenchStore.setState({ active: { ...state.active, [anchor]: null } });
    return;
  }
  const patch: Partial<WorkbenchState> = {};
  if (state.active[anchor] !== null) patch.active = { ...state.active, [anchor]: null };
  if (isSide(anchor) && getOpenCompartments(anchor, state).length > 0) {
    patch.compartments = { ...defaultCompartments(), ...state.compartments, [anchor]: [] };
  }
  if (Object.keys(patch).length > 0) workbenchStore.setState(patch);
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
