/** @module @category Extension */

/**
 * Extensions du `StaggeredMenuPanel`.
 *
 * Le panneau latéral animé du styleguide accepte des composants libres posés par les apps, de la même
 * façon que les rails du shell (voir `tool-window.ts`) : une app déclare une **extension** sur le slot
 * `staggered-menu-slot` et indique, dans sa `meta`, où, dans quel ordre et avec quelle priorité elle
 * s'affiche.
 *
 * Déclaration dans le `routes.json` d'une app :
 * `{ "slot": "staggered-menu-slot", "component": "monWidget", "meta": StaggeredMenuEntryMeta }`.
 *
 * Comme pour les rails, une entrée n'apparaît que lorsque son app est montée (une de ses pages est
 * active), sauf si elle déclare `meta.global: true`.
 */
export const STAGGERED_MENU_SLOT = 'staggered-menu-slot';

/**
 * Zones du panneau qui accueillent des extensions, dans l'ordre d'affichage :
 *
 *   `top`     avant la liste des liens de navigation
 *   `content` juste après la liste des liens (zone par défaut)
 *   `bottom`  en pied de panneau, après le bloc de liens sociaux
 */
export const STAGGERED_MENU_AREAS = ['top', 'content', 'bottom'] as const;

export type StaggeredMenuArea = (typeof STAGGERED_MENU_AREAS)[number];

/** Zone utilisée quand `meta.area` est absent. */
export const DEFAULT_STAGGERED_MENU_AREA: StaggeredMenuArea = 'content';

/** Métadonnées d'une extension du panneau (titre accessible, zone, ordre, priorité, portée). */
export interface StaggeredMenuEntryMeta {
  /** Titre : nom accessible de la section et, avec `showTitle`, intitulé visible au-dessus du composant. */
  title: string;
  /** Clé de traduction du titre (optionnelle), cherchée dans le module de l'app. */
  titleKey?: string;
  /** Zone du panneau où s'affiche le composant (défaut `content`). */
  area?: StaggeredMenuArea;
  /**
   * Position dans la zone (ordre croissant). Absent : ordre d'enregistrement du slot. Comme pour les rails,
   * deux entrées de même `order` sont départagées par `priority` puis par l'ordre d'enregistrement.
   */
  order?: number;
  /**
   * Importance de l'entrée (défaut 0, plus grand = plus important). Sert (1) à départager deux entrées de
   * même `order` : la plus prioritaire passe devant, et (2) à choisir les entrées conservées quand le panneau
   * limite leur nombre (`maxExtensions`) : les moins prioritaires sont écartées.
   */
  priority?: number;
  /**
   * L'entrée reste affichée quelle que soit l'app active (comme `global` des rails). Absent : elle n'apparaît
   * que lorsqu'une page de son app est montée.
   */
  global?: boolean;
  /** Affiche `title` comme intitulé visible au-dessus du composant (défaut : non, le composant est libre). */
  showTitle?: boolean;
}

/** Vrai si `area` est une zone connue du panneau. */
export function isStaggeredMenuArea(area: unknown): area is StaggeredMenuArea {
  return typeof area === 'string' && (STAGGERED_MENU_AREAS as readonly string[]).includes(area);
}

/**
 * Liste précise des problèmes d'une `meta` d'extension du panneau (vide = valide). Une entrée invalide
 * n'apparaît pas : le dire clairement à l'enregistrement évite de chercher pourquoi à l'intégration d'une app.
 */
export function getStaggeredMenuEntryProblems(meta: unknown): string[] {
  if (!meta || typeof meta !== 'object') return ['`meta` est absente : ajouter au moins { "title": "…" }'];
  const m = meta as Record<string, unknown>;
  const problems: string[] = [];
  if (typeof m.title !== 'string' || m.title.length === 0) problems.push('`title` doit être une chaîne non vide');
  if (m.titleKey !== undefined && typeof m.titleKey !== 'string') problems.push('`titleKey` doit être une chaîne');
  if (m.area !== undefined && !isStaggeredMenuArea(m.area))
    problems.push(`\`area\` vaut ${STAGGERED_MENU_AREAS.map((a) => `"${a}"`).join(', ')}`);
  if (m.order !== undefined && (typeof m.order !== 'number' || !Number.isFinite(m.order)))
    problems.push('`order` doit être un nombre fini');
  if (m.priority !== undefined && (typeof m.priority !== 'number' || !Number.isFinite(m.priority)))
    problems.push('`priority` doit être un nombre fini');
  if (m.global !== undefined && typeof m.global !== 'boolean') problems.push('`global` doit être un booléen');
  if (m.showTitle !== undefined && typeof m.showTitle !== 'boolean') problems.push('`showTitle` doit être un booléen');
  return problems;
}

/** Valide une `meta` d'extension : vrai si c'est une `StaggeredMenuEntryMeta` exploitable. */
export function isStaggeredMenuEntryMeta(meta: unknown): meta is StaggeredMenuEntryMeta {
  return getStaggeredMenuEntryProblems(meta).length === 0;
}

/** Forme minimale d'une extension assignée au slot (compatible avec `AssignedExtension`). */
export interface StaggeredMenuAssignedExtension {
  name: string;
  moduleName: string;
  meta?: unknown;
}

/** Entrée résolue : une extension valide, visible, avec sa zone, son ordre et sa priorité calculés. */
export interface ResolvedStaggeredMenuEntry<T extends StaggeredMenuAssignedExtension = StaggeredMenuAssignedExtension> {
  /** Nom de l'extension : identifiant de l'entrée dans le panneau. */
  id: string;
  moduleName: string;
  meta: StaggeredMenuEntryMeta;
  area: StaggeredMenuArea;
  order: number;
  priority: number;
  /** Extension d'origine (pour la retrouver dans le slot). */
  extension: T;
}

export interface ResolveStaggeredMenuEntriesOptions {
  /**
   * Nombre maximal d'entrées affichées. Au-delà, les moins prioritaires sont écartées (à priorité égale,
   * les premières dans l'ordre d'affichage sont conservées). Absent ou invalide : aucune limite.
   */
  maxEntries?: number;
}

/**
 * Entrées affichables du panneau, dans l'ordre d'affichage.
 *
 * 1. écarte les entrées dont la `meta` est invalide ;
 * 2. écarte celles dont l'app n'est pas montée, sauf `meta.global` ;
 * 3. si `maxEntries` est fixé, ne garde que les plus prioritaires ;
 * 4. trie par zone (`top`, `content`, `bottom`), puis `order` croissant, puis `priority` décroissante,
 *    puis ordre d'enregistrement.
 */
export function resolveStaggeredMenuEntries<T extends StaggeredMenuAssignedExtension>(
  assigned: readonly T[],
  activeModules: ReadonlySet<string>,
  options: ResolveStaggeredMenuEntriesOptions = {},
): ResolvedStaggeredMenuEntry<T>[] {
  const areaRank = (area: StaggeredMenuArea) => STAGGERED_MENU_AREAS.indexOf(area);

  const visible = assigned
    .map((extension, index) => ({ extension, index }))
    .filter(({ extension }) => isStaggeredMenuEntryMeta(extension.meta))
    .filter(
      ({ extension }) =>
        (extension.meta as StaggeredMenuEntryMeta).global === true || activeModules.has(extension.moduleName),
    )
    .map(({ extension, index }) => {
      const meta = extension.meta as StaggeredMenuEntryMeta;
      return {
        index,
        entry: {
          id: extension.name,
          moduleName: extension.moduleName,
          meta,
          area: meta.area ?? DEFAULT_STAGGERED_MENU_AREA,
          order: meta.order ?? index,
          priority: meta.priority ?? 0,
          extension,
        } satisfies ResolvedStaggeredMenuEntry<T>,
      };
    });

  const byDisplay = (a: (typeof visible)[number], b: (typeof visible)[number]) =>
    areaRank(a.entry.area) - areaRank(b.entry.area) ||
    a.entry.order - b.entry.order ||
    b.entry.priority - a.entry.priority ||
    a.index - b.index;

  const sorted = [...visible].sort(byDisplay);

  const { maxEntries } = options;
  if (typeof maxEntries !== 'number' || !Number.isFinite(maxEntries) || maxEntries < 0 || maxEntries >= sorted.length) {
    return sorted.map(({ entry }) => entry);
  }

  // Les plus prioritaires d'abord ; à priorité égale, celles qui passent en premier à l'affichage.
  const kept = new Set(
    sorted
      .map((item, displayIndex) => ({ item, displayIndex }))
      .sort((a, b) => b.item.entry.priority - a.item.entry.priority || a.displayIndex - b.displayIndex)
      .slice(0, Math.floor(maxEntries))
      .map(({ item }) => item),
  );
  return sorted.filter((item) => kept.has(item)).map(({ entry }) => entry);
}
