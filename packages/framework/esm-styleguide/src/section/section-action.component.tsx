/** @category Section */
import React from 'react';
import { cn } from '../page-background/page-background.utils.js';

export interface SectionActionProps {
  /** Libellé visible. Omis : bouton icône seule (`label` devient alors obligatoire côté accessibilité). */
  children?: React.ReactNode;
  /** Icône avant le libellé. */
  icon?: React.ReactNode;
  /** Libellé accessible + infobulle (requis pour un bouton icône seule). */
  label?: string;
  /** Option sélectionnée (filtre, onglet) : fond marqué + `aria-pressed`. */
  active?: boolean;
  /** `ghost` (défaut, sans fond), `outline` (contour fin) ou `solid` (couleur d'accent). */
  variant?: 'ghost' | 'outline' | 'solid';
  /** @default 'md' */
  size?: 'sm' | 'md';
  /** Rend un lien `<a>` au lieu d'un `<button>`. */
  href?: string;
  target?: string;
  rel?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  className?: string;
}

const SIZE: Record<NonNullable<SectionActionProps['size']>, { text: string; icon: string }> = {
  sm: { text: 'h-7 px-2.5 text-xs', icon: 'size-7' },
  md: { text: 'h-8 px-3 text-[13px]', icon: 'size-8' },
};

/**
 * Bouton de contrôle pour l'en-tête ou le pied d'un `Section` : « Voir tout »,
 * filtre, rafraîchir... Plusieurs `SectionAction` avec `active` forment un
 * sélecteur d'options (filtres, onglets).
 */
export function SectionAction({
  children,
  icon,
  label,
  active = false,
  variant = 'ghost',
  size = 'md',
  href,
  target,
  rel,
  disabled,
  type = 'button',
  onClick,
  className,
}: SectionActionProps) {
  const iconOnly = !children;
  const classes = cn(
    'inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md',
    'font-medium leading-none no-underline outline-none transition-colors duration-150',
    'focus-visible:ring-2 focus-visible:ring-(--section-accent,#34d399)/70',
    'aria-disabled:pointer-events-none aria-disabled:opacity-40 disabled:pointer-events-none disabled:opacity-40',
    iconOnly ? cn(SIZE[size].icon, 'p-0') : SIZE[size].text,
    variant === 'solid'
      ? 'border-0 bg-(--section-accent,#10b981) text-white hover:brightness-110'
      : variant === 'outline'
        ? cn(
            'border border-solid border-(--section-line,rgba(255,255,255,0.12))',
            active
              ? 'bg-(--section-fg,#fff)/12 text-(--section-fg,#fff)'
              : 'bg-transparent text-(--section-muted,rgba(255,255,255,0.65)) hover:bg-(--section-fg,#fff)/8 hover:text-(--section-fg,#fff)',
          )
        : cn(
            'border-0',
            active
              ? 'bg-(--section-fg,#fff)/12 text-(--section-fg,#fff)'
              : 'bg-transparent text-(--section-muted,rgba(255,255,255,0.65)) hover:bg-(--section-fg,#fff)/8 hover:text-(--section-fg,#fff)',
          ),
    className,
  );

  const content = (
    <>
      {icon}
      {children}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target={target}
        rel={rel ?? (target === '_blank' ? 'noreferrer noopener' : undefined)}
        title={label}
        aria-label={iconOnly ? label : undefined}
        aria-current={active || undefined}
        aria-disabled={disabled || undefined}
        onClick={onClick}
        className={classes}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type={type}
      title={label}
      aria-label={iconOnly ? label : undefined}
      aria-pressed={active || undefined}
      disabled={disabled}
      onClick={onClick}
      className={classes}
    >
      {content}
    </button>
  );
}
