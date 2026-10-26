import React, { useEffect, useMemo, useState } from 'react';
import { isNavEntryMeta, TOPBAR_LEVEL2_NAV_SLOT, type NavEntryMeta } from '@egen-civitas/esm-extensions';
import { navigate } from '@egen-civitas/esm-navigation';
import { useAssignedExtensions } from '@egen-civitas/esm-react-utils';
import { translateFrom } from '@egen-civitas/esm-translations';
import { resolveWorkbenchIcon } from './workbench-icons.js';
import styles from './section-nav-panel.module.scss';

interface SectionEntry {
  /** Nom de l'extension (routes.json) : identifie la sous-option. */
  name: string;
  moduleName: string;
  meta: NavEntryMeta;
}

interface SectionGroup {
  key: string;
  label?: string;
  entries: SectionEntry[];
}

export interface SectionNavPanelProps {
  /** Section (`NavEntryMeta.section`) dont le panneau liste les sous-options. */
  section: string;
}

const text = (moduleName: string, key: string | undefined, fallback: string) =>
  key ? translateFrom(moduleName, key, fallback) : fallback;

/** Route courante, relative à la base SPA, sans slash de tête ni de queue (ex. `annuaire/contacts`). */
function currentRoute(): string {
  const base = window.getEgenSpaBase().replace(/\/$/, '');
  const path = window.location.pathname;
  return (path.startsWith(base) ? path.slice(base.length) : path).replace(/^\/+|\/+$/g, '');
}

const matches = (route: string, current: string) => current === route || current.startsWith(`${route}/`);

function useCurrentRoute(): string {
  const [route, setRoute] = useState(currentRoute);
  useEffect(() => {
    const update = () => setRoute(currentRoute());
    window.addEventListener('single-spa:routing-event', update);
    window.addEventListener('popstate', update);
    update();
    return () => {
      window.removeEventListener('single-spa:routing-event', update);
      window.removeEventListener('popstate', update);
    };
  }, []);
  return route;
}

/**
 * Contenu d'une option globale du rail gauche : liste les sous-options (entrées `NavEntryMeta`
 * de la `section`, déclarées par l'app sur le slot `topbar-level2-nav`), regroupées par `group`.
 * Un clic navigue vers la route de la sous-option : la zone centrale se met à jour, la zone
 * gauche reste ouverte.
 *
 * À utiliser comme composant d'une extension du slot `shell-rail-left-slot` déclarée avec
 * `meta.global: true` (voir `ToolWindowMeta`).
 */
export function SectionNavPanel({ section }: SectionNavPanelProps) {
  const assigned = useAssignedExtensions(TOPBAR_LEVEL2_NAV_SLOT);
  const route = useCurrentRoute();
  const [selected, setSelected] = useState<string | null>(null);

  const groups = useMemo<SectionGroup[]>(() => {
    const byKey = new Map<string, SectionGroup>();
    for (const extension of assigned) {
      if (!isNavEntryMeta(extension.meta) || extension.meta.section !== section) continue;
      const meta = extension.meta;
      const key = meta.group ?? '';
      let group = byKey.get(key);
      if (!group) {
        const label = meta.group ? (meta.groupLabel ?? meta.group) : undefined;
        group = {
          key,
          label: label ? text(extension.moduleName, meta.groupLabelKey, label) : undefined,
          entries: [],
        };
        byKey.set(key, group);
      }
      group.entries.push({ name: extension.name, moduleName: extension.moduleName, meta });
    }
    return [...byKey.values()];
  }, [assigned, section]);

  // Sous-option active : la route la plus spécifique qui correspond ; à route égale (plusieurs
  // sous-options sur la même page), celle qui vient d'être cliquée, sinon la première.
  const activeName = useMemo(() => {
    const candidates = groups.flatMap((group) => group.entries).filter((entry) => matches(entry.meta.route, route));
    if (candidates.length === 0) return null;
    const longest = Math.max(...candidates.map((entry) => entry.meta.route.length));
    const best = candidates.filter((entry) => entry.meta.route.length === longest);
    return (best.find((entry) => entry.name === selected) ?? best[0]).name;
  }, [groups, route, selected]);

  if (groups.length === 0) return null;

  return (
    <nav className={styles.panel} data-testid={`section-nav-${section}`}>
      {groups.map((group) => (
        <div key={group.key} className={styles.group} role="group" aria-label={group.label}>
          {group.label && <h3 className={styles.groupTitle}>{group.label}</h3>}
          <ul className={styles.list}>
            {group.entries.map((entry) => {
              const Icon = resolveWorkbenchIcon(entry.meta.icon);
              const label = text(entry.moduleName, entry.meta.labelKey, entry.meta.label);
              const description = entry.meta.description
                ? text(entry.moduleName, entry.meta.descriptionKey, entry.meta.description)
                : undefined;
              return (
                <li key={entry.name}>
                  <button
                    type="button"
                    className={styles.entry}
                    data-active={entry.name === activeName}
                    aria-current={entry.name === activeName ? 'page' : undefined}
                    title={description}
                    onClick={() => {
                      setSelected(entry.name);
                      navigate({ to: `\${egenSpaBase}/${entry.meta.route}` });
                    }}
                  >
                    {Icon && <Icon size={16} aria-hidden="true" className={styles.entryIcon} />}
                    <span className={styles.entryLabel}>{label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
