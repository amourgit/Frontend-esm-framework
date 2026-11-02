import React, { type CSSProperties } from 'react';
import { isSafeToolWindowIconUrl, type ToolWindowAnchor } from '@egen-civitas/esm-extensions';
import { useStore } from '@egen-civitas/esm-react-utils';
import { resolveWorkbenchIcon } from './workbench-icons.js';
import { toolWindowTitle, useToolWindows, type ToolWindow } from './use-tool-windows.js';
import {
  getOpenCompartments,
  toggleCompartment,
  toggleToolWindow,
  workbenchStore,
  type SideAnchor,
} from './workbench.store.js';
import { formatToolWindowBadge, workbenchBadgeStore } from './workbench-badges.js';
import styles from './workbench.module.scss';

function RailGroup({ anchor, label, rail }: { anchor: ToolWindowAnchor; label: string; rail?: 'left' | 'right' }) {
  const tools = useToolWindows(anchor, rail);
  // NB : `useStore` retourne toujours un objet (état étalé) : on lit l'état entier, jamais une valeur primitive.
  const state = useStore(workbenchStore);
  const activeId = state.active[anchor];
  const openOwn = getOpenCompartments(anchor, state);

  if (tools.length === 0) return null;

  return (
    <div
      role="group"
      aria-label={label}
      data-anchor={anchor}
      className={`${styles.railGroup} egen-anim-stagger egen-anim-stagger--fade`}
    >
      {tools.map((tool) => (
        <RailButton
          key={tool.id}
          tool={tool}
          active={tool.compartment ? openOwn.includes(tool.id) : tool.id === activeId}
          onClick={() =>
            // Compartiment propre : s'ouvre/se ferme sans toucher au compartiment par défaut de la zone.
            tool.compartment ? toggleCompartment(anchor as SideAnchor, tool.id) : toggleToolWindow(anchor, tool.id)
          }
        />
      ))}
    </div>
  );
}

function RailButton({ tool, active, onClick }: { tool: ToolWindow; active: boolean; onClick: () => void }) {
  const title = toolWindowTitle(tool);
  const Icon = resolveWorkbenchIcon(tool.meta.icon);
  const iconUrl = isSafeToolWindowIconUrl(tool.meta.iconUrl) ? tool.meta.iconUrl : undefined;
  // NB : `useStore` retourne l'état étalé (clé = id de fenêtre d'outils).
  const badge = useStore(workbenchBadgeStore)[tool.id];

  return (
    <button
      type="button"
      className={styles.railButton}
      aria-pressed={active}
      aria-label={title}
      title={title}
      data-active={active}
      onClick={onClick}
    >
      {iconUrl ? (
        <span
          aria-hidden="true"
          className={styles.railIconMask}
          style={{ '--egen-rail-icon': `url("${iconUrl.replace(/"/g, '%22')}")` } as CSSProperties}
        />
      ) : Icon ? (
        <Icon size={18} aria-hidden="true" />
      ) : (
        <span aria-hidden="true">{title.charAt(0).toUpperCase()}</span>
      )}
      {badge !== undefined && (
        <span className={styles.railBadge} data-testid={`workbench-badge-${tool.id}`}>
          {formatToolWindowBadge(badge)}
        </span>
      )}
    </button>
  );
}

/**
 * Rail gauche (fixe) : en haut, les fenêtres d'outils de l'app active affichées dans la zone
 * gauche ; en bas, celles affichées dans la zone basse (ex. terminal).
 */
export function LeftRail() {
  return (
    <nav aria-label="Outils de l'application" data-testid="workbench-rail-left" className={styles.rail}>
      <RailGroup anchor="left" label="Panneau latéral" />
      <span className={styles.railSpacer} />
      <RailGroup anchor="bottom" rail="left" label="Panneau inférieur" />
    </nav>
  );
}

/** Rail droit (fixe) : options globales en haut (zone droite) ; en bas, celles qui ouvrent la zone basse. */
export function RightRail() {
  return (
    <nav aria-label="Outils globaux" data-testid="workbench-rail-right" className={styles.rail}>
      <RailGroup anchor="right" label="Panneau droit" />
      <span className={styles.railSpacer} />
      <RailGroup anchor="bottom" rail="right" label="Panneau inférieur" />
    </nav>
  );
}
