import * as React from 'react';
import { cn } from './cn.js';

// Liste d'actions d'un panneau (menu utilisateur, langue, outils hors ligne…) : remplace `Switcher` / `SwitcherItem` de Carbon.
// Pour un menu qui s'ouvre au clic sur un bouton, utiliser `DropdownMenu` (gestion du focus et du clavier incluse).

function MenuList({ className, ...props }: React.ComponentProps<'ul'>) {
  return <ul data-slot="menu-list" role="menu" className={cn('m-0 flex list-none flex-col p-0', className)} {...props} />;
}

const itemClass =
  'flex min-h-10 w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-4 py-2 text-left text-sm text-foreground no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-50';

type MenuItemProps = React.ComponentProps<'button'> & {
  /** Rend un lien (`<a>`) vers cette adresse au lieu d'un bouton. */
  href?: string;
  target?: string;
  rel?: string;
  /** Élément actuellement choisi (`aria-current`). */
  selected?: boolean;
};

function MenuItem({ className, href, target, rel, selected, children, type = 'button', ...props }: MenuItemProps) {
  return (
    <li role="none" data-slot="menu-item">
      {href ? (
        <a
          role="menuitem"
          href={href}
          target={target}
          rel={rel ?? (target === '_blank' ? 'noopener noreferrer' : undefined)}
          aria-current={selected || undefined}
          className={cn(itemClass, selected && 'font-semibold', className)}
        >
          {children}
        </a>
      ) : (
        <button
          role="menuitem"
          type={type}
          aria-current={selected || undefined}
          className={cn(itemClass, selected && 'font-semibold', className)}
          {...props}
        >
          {children}
        </button>
      )}
    </li>
  );
}

function MenuDivider({ className, ...props }: React.ComponentProps<'li'>) {
  return <li role="separator" data-slot="menu-divider" className={cn('my-1 h-px bg-border', className)} {...props} />;
}

export { MenuList, MenuItem, MenuDivider, type MenuItemProps };
