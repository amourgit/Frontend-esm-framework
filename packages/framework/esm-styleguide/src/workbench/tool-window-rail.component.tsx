import React from 'react';
import type { ToolWindowAnchor } from '@egen-civitas/esm-extensions';
import { useStore } from '@egen-civitas/esm-react-utils';
import { resolveWorkbenchIcon } from './workbench-icons.js';
import { toolWindowTitle, useToolWindows, type ToolWindow } from './use-tool-windows.js';
import { toggleToolWindow, workbenchStore } from './workbench.store.js';
import { formatToolWindowBadge, workbenchBadgeStore } from './workbench-badges.js';
import styles from './workbench.module.scss';

function RailGroup({ anchor, label }: { anchor: ToolWindowAnchor; label: string }) {
  const tools = useToolWindows(anchor);
  // NB : `useStore` retourne toujours un objet (état étalé) : on lit l'état entier, jamais une valeur primitive.
  const { active } = useStore(workbenchStore);
  const activeId = active[anchor];

  if (tools.length === 0) return null;

  return (
    <div role="group" aria-label={label} data-anchor={anchor} className={`${styles.railGroup} egen-anim-stagger egen-anim-stagger--fade`}>
      {tools.map((tool) => (
        <RailButton
          key={tool.id}
          tool={tool}
          active={tool.id === activeId}
          onClick={() => toggleToolWindow(anchor, tool.id)}
        />
      ))}
    </div>
  );
}

function RailButton({ tool, active, onClick }: { tool: ToolWindow; active: boolean; onClick: () => void }) {
  const title = toolWindowTitle(tool);
  const Icon = resolveWorkbenchIcon(tool.meta.icon);
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
      {Icon ? <Icon size={18} aria-hidden="true" /> : <span aria-hidden="true">{title.charAt(0).toUpperCase()}</span>}
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
      <RailGroup anchor="bottom" label="Panneau inférieur" />
    </nav>
  );
}

/** Rail droit (fixe) : options globales, affichées dans la zone droite. */
export function RightRail() {
  return (
    <nav aria-label="Outils globaux" data-testid="workbench-rail-right" className={styles.rail}>
      <RailGroup anchor="right" label="Panneau droit" />
    </nav>
  );
}
