/** @category TopBar */
import React, { forwardRef } from 'react';
import { cn } from '../page-background/page-background.utils.js';

// =============================================================================
//  TOPBAR — barre de navigation supérieure (Tailwind, présentationnelle)
//
//  Composant PUREMENT visuel : aucune logique de session, de tenant, de
//  routage ni de panneau. L'app qui l'utilise garde toute sa logique et ne
//  fournit que le CONTENU des trois zones (gauche / centre / droite) et,
//  optionnellement, une seconde ligne (fil d'Ariane).
//
//  Tokens : tout vient des variables injectées par @egen-civitas/esm-theme
//  (--panel-header-*, --colors-*, --layout-header-height), avec fallback
//  statique le temps que le moteur de thème hydrate les variables.
// =============================================================================

export interface TopBarProps {
  /** Zone gauche : hamburger, logo, recherche, sélecteur de contexte... */
  left?: React.ReactNode;
  /** Zone centrale : contenu libre (ex. `ExtensionSlot`). Masquée si vide. */
  center?: React.ReactNode;
  /** Zone droite : actions (`TopBarIconButton`), `TopBarDivider`, `TopBarAvatar`... */
  right?: React.ReactNode;
  /** Seconde ligne sous la barre (ex. fil d'Ariane). Masquée si absente. */
  secondary?: React.ReactNode;
  /** Élément enfant rendu à l'intérieur de la barre (ex. panneau latéral positionné en absolu). */
  children?: React.ReactNode;
  /** Colle la barre en haut de page. @default true */
  sticky?: boolean;
  /** Décalage `top` en sticky (ex. bannière hors-ligne). @default 'var(--own-offline-banner-height, 0px)' */
  stickyOffset?: string;
  /** Style visuel : `glass` (flou translucide) ou `solid` (fond plein). @default 'glass' */
  variant?: 'glass' | 'solid';
  /** Libellé accessible de la navigation. @default 'Navigation principale' */
  ariaLabel?: string;
  /** Classes Tailwind additionnelles sur la barre principale. */
  className?: string;
  /** Classes Tailwind additionnelles sur le conteneur racine. */
  wrapperClassName?: string;
}

/**
 * `TopBar` — barre supérieure en trois zones (gauche / centre / droite) avec
 * seconde ligne optionnelle. Voir le guide d'utilisation en bas de fichier.
 */
export const TopBar = forwardRef<HTMLElement, TopBarProps>(function TopBar(
  {
    left,
    center,
    right,
    secondary,
    children,
    sticky = true,
    stickyOffset = 'var(--own-offline-banner-height, 0px)',
    variant = 'glass',
    ariaLabel = 'Navigation principale',
    className,
    wrapperClassName,
  },
  ref,
) {
  return (
    <div
      className={cn('flex flex-col w-full z-(--z-index-sticky,200)', sticky && 'sticky', wrapperClassName)}
      style={sticky ? { top: stickyOffset } : undefined}
    >
      <header
        ref={ref}
        role="banner"
        aria-label={ariaLabel}
        className={cn(
          'relative flex w-full items-center justify-between gap-2 px-3 sm:px-4 select-none',
          'h-(--layout-header-height,48px) border-b',
          'border-b-(--panel-header-border,rgba(255,255,255,0.08))',
          'text-(--colors-surface-foreground,#f4f4f4)',
          variant === 'glass'
            ? 'bg-(--panel-header-background,rgba(11,25,44,0.72)) backdrop-blur-xl shadow-(--panel-header-box-shadow,0_1px_12px_rgba(0,0,0,0.25))'
            : 'bg-(--colors-surface-card,#0b192c) shadow-(--panel-header-box-shadow,none)',
          className,
        )}
      >
        <div className="flex min-w-0 shrink-0 items-center gap-2">{left}</div>
        {center ? <div className="flex min-w-0 flex-1 items-center justify-center gap-2 px-2">{center}</div> : null}
        <div className="flex shrink-0 items-center gap-1">{right}</div>
        {children}
      </header>
      {secondary ? <div className="w-full">{secondary}</div> : null}
    </div>
  );
});

export interface TopBarIconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Icône (ex. composant Carbon `<Notification size={20} />`). */
  icon: React.ReactNode;
  /** Libellé accessible ET infobulle (obligatoire : le bouton n'a pas de texte). */
  label: string;
  /** Pastille de compteur (nombre ou texte). Masquée si `0`/vide. */
  badge?: number | string;
  /** Met le bouton en surbrillance (panneau ouvert). */
  active?: boolean;
}

/** Bouton icône compact de la `TopBar`, avec pastille de compteur optionnelle. */
export const TopBarIconButton = forwardRef<HTMLButtonElement, TopBarIconButtonProps>(function TopBarIconButton(
  { icon, label, badge, active = false, className, type = 'button', ...rest },
  ref,
) {
  const showBadge = badge !== undefined && badge !== null && badge !== '' && badge !== 0;
  return (
    <button
      ref={ref}
      type={type}
      title={label}
      aria-label={label}
      aria-pressed={active || undefined}
      className={cn(
        'relative inline-flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-md border-0 p-0',
        'bg-transparent text-inherit transition-colors duration-150 outline-none',
        'hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary-400',
        active && 'bg-primary-500/25 text-primary-200',
        className,
      )}
      {...rest}
    >
      {icon}
      {showBadge ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error-500 px-1 text-[10px] font-bold leading-none text-white">
          {badge}
        </span>
      ) : null}
    </button>
  );
});

/** Séparateur vertical fin entre deux groupes d'actions de la `TopBar`. */
export function TopBarDivider({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('mx-1 h-5 w-px bg-white/15', className)} />;
}

export interface TopBarAvatarProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Image du profil. Si absente, les initiales sont affichées. */
  src?: string;
  /** Nom complet (libellé accessible + calcul des initiales). */
  name: string;
  /** Met l'avatar en surbrillance (panneau ouvert). */
  active?: boolean;
}

/** Avatar rond cliquable de la `TopBar` (image ou initiales). */
export const TopBarAvatar = forwardRef<HTMLButtonElement, TopBarAvatarProps>(function TopBarAvatar(
  { src, name, active = false, className, type = 'button', ...rest },
  ref,
) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  return (
    <button
      ref={ref}
      type={type}
      title={name}
      aria-label={name}
      className={cn(
        'relative inline-flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full p-0',
        'border border-primary-400/50 bg-primary-900/40 text-xs font-bold text-white outline-none',
        'transition-transform duration-150 hover:scale-105 focus-visible:ring-2 focus-visible:ring-primary-400',
        active && 'ring-2 ring-primary-400',
        className,
      )}
      {...rest}
    >
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : initials}
    </button>
  );
});

/* =============================================================================
 *  GUIDE D'UTILISATION — TopBar
 * =============================================================================
 *  IMPORT
 *    import { TopBar, TopBarIconButton, TopBarDivider, TopBarAvatar } from '@egen-civitas/esm-framework';
 *
 *  PRÉREQUIS TAILWIND (une fois par app, tout en haut de root.component.tsx)
 *    import '@egen-civitas/tailwind-preset/tailwind.tw.css';
 *  Le preset scanne aussi le styleguide publié (`@source`), donc les classes
 *  de ce composant sont générées sans configuration supplémentaire.
 *
 *  EXEMPLE MINIMAL
 *    <TopBar
 *      left={<Logo />}
 *      right={
 *        <>
 *          <TopBarIconButton icon={<Search size={20} />} label="Rechercher" onClick={openSearch} />
 *          <TopBarIconButton icon={<Notification size={20} />} label="Notifications" badge={3} />
 *          <TopBarDivider />
 *          <TopBarAvatar name="Samuel Nzila" src={photoUrl} onClick={toggleUserPanel} />
 *        </>
 *      }
 *    />
 *
 *  PROPS PRINCIPALES
 *    left / center / right  contenu des trois zones (center masquée si vide)
 *    secondary              seconde ligne (ex. <BreadcrumbNav />), masquée si absente
 *    children               rendu DANS la <header> (ex. panneau latéral en position absolue)
 *    sticky / stickyOffset  collage en haut de page (défaut : true, décalé par la bannière hors-ligne)
 *    variant                'glass' (défaut, flou translucide) | 'solid'
 *    ariaLabel              libellé accessible de la navigation
 *    className              classes Tailwind en plus sur la barre
 *    wrapperClassName       classes Tailwind en plus sur le conteneur racine
 *
 *  BONNES PRATIQUES
 *    - Garder la logique (session, tenant, panneaux) DANS l'app : la TopBar ne
 *      fait que disposer ce qu'on lui donne.
 *    - Toujours fournir `label` aux TopBarIconButton (accessibilité + infobulle).
 *    - Couleurs/hauteur : pilotées par le thème (--panel-header-*,
 *      --layout-header-height) ; ne pas les coder en dur.
 *    - Pour surcharger un style, ajouter des classes Tailwind via `className`
 *      (pas de `!` nécessaire : ce composant ne partage aucun sélecteur SCSS).
 * ===========================================================================*/
