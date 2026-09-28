/** @category Page Background */
import React, { useEffect } from 'react';
import { GradientWave } from './gradient-wave.component.js';
import { usePageBackground } from './page-background.context.js';
import { cn } from './page-background.utils.js';

/** Palette par défaut du fond animé de la page d'accueil. */
const DEFAULT_HOME_GRADIENT_COLORS = ['#008080', '#0b192c', '#0ea5e9', '#042f2e', '#0284c7', '#064e3b'];

/**
 * Arrière-plan animé par défaut de l'application (fond WebGL `GradientWave`).
 * Sert de secours quand aucune page n'a déclaré d'image via `<PageBackground>`.
 */
export function AnimatedHomeBackground({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden select-none bg-[#030708]',
        className,
      )}
    >
      <GradientWave
        colors={DEFAULT_HOME_GRADIENT_COLORS}
        isPlaying={true}
        shadowPower={8}
        darkenTop={false}
        noiseSpeed={0.00001}
        noiseFrequency={[0.0001, 0.0009]}
        deform={{ incline: 0.5, noiseAmp: 250, noiseFlow: 5 }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />
      <div
        className="absolute bottom-[-10%] left-[10%] w-[80%] h-[350px] rounded-full opacity-30 blur-[120px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.3) 0%, rgba(6,78,59,0.12) 50%, transparent 80%)',
        }}
      />
    </div>
  );
}

export interface DefaultBackgroundProps {
  /** Source de l'image de fond (ex : salle, rayon, casier...). */
  imageSrc?: string;
  /** Texte alternatif pour l'accessibilité. */
  imageAlt?: string;
  /**
   * Mode d'ajustement de l'image.
   * @default 'cover'
   */
  imageFit?: 'cover' | 'fill' | 'contain';
  /** Injection CSS sur le conteneur racine de l'arrière-plan. */
  className?: string;
  /** Injection CSS sur la balise `<img>`. */
  imageClassName?: string;
  /**
   * Injection CSS sur la couche de voile sombre (`showDarkWash`) ET, si
   * `showAtmosphere` est activé, sur une seconde couche de surimpression
   * libre sans dégradé imposé. Les deux usages sont indépendants : le voile
   * sombre assure la lisibilité par défaut, `showAtmosphere` sert à injecter
   * un habillage additionnel (vignette colorée, texture...) au cas par cas.
   */
  overlayClassName?: string;
  /** Injection CSS sur le halo lumineux au sol. */
  glowClassName?: string;
  /**
   * Active une seconde couche de surimpression libre, en plus du voile
   * sombre standard — n'a d'effet que si `overlayClassName` est fourni.
   * @default false
   */
  showAtmosphere?: boolean;
  /**
   * Active le halo lumineux (vert émeraude par défaut, ou teinté par
   * `accent`) en bas de l'arrière-plan.
   * @default true
   */
  showGlow?: boolean;
  /**
   * Active le voile sombre en dégradé (haut → bas) qui garantit la
   * lisibilité du contenu et de la topbar au-dessus de l'image.
   * @default true
   */
  showDarkWash?: boolean;
  /** Couleur d'accentuation optionnelle pour teinter l'image et le halo. */
  accent?: string;
  /** Éléments enfants à superposer à l'arrière-plan. */
  children?: React.ReactNode;
}

/**
 * Arrière-plan par défaut d'une page : image plein écran avec dégradés
 * d'ambiance, grain de texture et halo lumineux. Si `imageSrc` est omis,
 * retombe sur `<AnimatedHomeBackground>`.
 */
export function DefaultPageBackground({
  imageSrc,
  imageAlt = 'Arrière-plan immersif',
  imageFit = 'cover',
  className,
  imageClassName,
  overlayClassName,
  glowClassName,
  showAtmosphere = false,
  showGlow = true,
  showDarkWash = true,
  accent,
  children,
}: DefaultBackgroundProps) {
  if (!imageSrc) {
    return <AnimatedHomeBackground className={className} />;
  }

  const fitClass =
    imageFit === 'fill' ? 'object-fill' : imageFit === 'contain' ? 'object-contain object-center' : 'object-cover object-center';

  return (
    <div
      className={cn(
        'fixed inset-0 pointer-events-none overflow-hidden z-0 select-none',
        !className?.includes('bg-') && 'bg-[#030708]',
        className,
      )}
    >
      {/* Image de fond principale */}
      <img
        key={imageSrc}
        src={imageSrc}
        alt={imageAlt}
        className={cn(
          'absolute inset-0 w-full h-full select-none transition-all duration-700 ease-out',
          fitClass,
          imageFit === 'fill' ? 'opacity-100' : 'opacity-95',
          imageClassName,
        )}
        referrerPolicy="no-referrer"
      />

      {/* Teinte d'accentuation dynamique si accent est spécifié */}
      {accent && (
        <>
          <div
            className="absolute inset-0 pointer-events-none transition-colors duration-700"
            style={{ backgroundColor: accent, mixBlendMode: 'color', opacity: 0.35 }}
          />
          <div
            className="absolute inset-0 pointer-events-none transition-colors duration-700"
            style={{ backgroundColor: accent, mixBlendMode: 'multiply', opacity: 0.2 }}
          />
        </>
      )}

      {/* Voile sombre en dégradé, pour la lisibilité de la topbar et du contenu */}
      {showDarkWash && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/55 via-black/15 via-25% to-transparent transition-opacity duration-700"
        />
      )}
      {showDarkWash && (
        <div
          className={cn(
            'absolute inset-0 pointer-events-none bg-gradient-to-b from-black/45 via-black/20 to-black/70 transition-opacity duration-700',
            overlayClassName,
          )}
        />
      )}

      {/* Grain subtil de texture cinématographique */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E")`,
          backgroundSize: '180px 180px',
        }}
      />

      {/* Surcouche personnalisable additionnelle, sans dégradé imposé */}
      {showAtmosphere && overlayClassName && (
        <div className={cn('absolute inset-0 pointer-events-none transition-all duration-500', overlayClassName)} />
      )}

      {/* Halo lumineux au sol, neutre ou teinté par accent */}
      {showGlow && (
        <div
          className={cn(
            'absolute bottom-[-10%] left-[10%] w-[80%] h-[350px] rounded-full opacity-35 blur-[120px] pointer-events-none transition-all duration-700',
            glowClassName,
          )}
          style={{
            background: accent
              ? `radial-gradient(ellipse at center, ${accent}66 0%, ${accent}22 50%, transparent 80%)`
              : 'radial-gradient(ellipse at center, rgba(16,185,129,0.3) 0%, rgba(6,78,59,0.12) 50%, transparent 80%)',
          }}
        />
      )}

      {children}
    </div>
  );
}

export interface PageBackgroundProps extends DefaultBackgroundProps {
  /**
   * Composant React qui surcharge intégralement `<DefaultPageBackground>`
   * quand il est fourni. Attention : passer un élément JSX inline
   * (`customComponent={<MonFond />}`) recrée une nouvelle référence à chaque
   * rendu du parent, ce qui redéclenche l'effet d'enregistrement de
   * `<PageBackground>` à chaque rendu — préférer une valeur mémoïsée
   * (`useMemo`) si le parent se re-rend fréquemment.
   */
  customComponent?: React.ReactNode;
}

/**
 * Rendu de l'arrière-plan global unique de l'application. À monter une
 * seule fois (ex. dans le shell), à l'intérieur de `<PageBackgroundProvider>`.
 */
export function GlobalPageBackground() {
  const { config } = usePageBackground();

  if (config?.customComponent) {
    return (
      <div className={cn('fixed inset-0 pointer-events-none overflow-hidden z-0 select-none bg-[#030708]', config.className)}>
        {config.customComponent}
      </div>
    );
  }

  if (config?.imageSrc) {
    return (
      <DefaultPageBackground
        imageSrc={config.imageSrc}
        imageAlt={config.imageAlt}
        imageFit={config.imageFit}
        className={config.className}
        imageClassName={config.imageClassName}
        overlayClassName={config.overlayClassName}
        glowClassName={config.glowClassName}
        showAtmosphere={config.showAtmosphere ?? false}
        showGlow={config.showGlow ?? true}
        showDarkWash={config.showDarkWash ?? true}
        accent={config.accent}
      >
        {config.children}
      </DefaultPageBackground>
    );
  }

  return <AnimatedHomeBackground className={config?.className} />;
}

/**
 * Composant déclaratif d'arrière-plan pour une page : s'enregistre auprès du
 * `<PageBackgroundProvider>` global pendant sa durée de vie et restaure le
 * fond par défaut au démontage. Ne rend rien lui-même — le rendu effectif se
 * fait via `<GlobalPageBackground>`.
 *
 * @example
 * function MaPage() {
 *   return (
 *     <>
 *       <PageBackground imageSrc="/assets/salle.jpg" accent="#0ea5e9" />
 *       {// ...contenu de la page}
 *     </>
 *   );
 * }
 */
export function PageBackground({
  customComponent,
  imageSrc,
  imageAlt,
  imageFit,
  className,
  imageClassName,
  overlayClassName,
  glowClassName,
  showAtmosphere,
  showGlow,
  showDarkWash,
  accent,
  children,
}: PageBackgroundProps) {
  const { setPageBackground } = usePageBackground();

  useEffect(() => {
    setPageBackground({
      customComponent,
      imageSrc,
      imageAlt,
      imageFit,
      className,
      imageClassName,
      overlayClassName,
      glowClassName,
      showAtmosphere,
      showGlow,
      showDarkWash,
      accent,
      children,
    });

    return () => {
      setPageBackground(null);
    };
  }, [
    setPageBackground,
    customComponent,
    imageSrc,
    imageAlt,
    imageFit,
    className,
    imageClassName,
    overlayClassName,
    glowClassName,
    showAtmosphere,
    showGlow,
    showDarkWash,
    accent,
    children,
  ]);

  return null;
}

/* ============================================================================
 *  GUIDE D'UTILISATION — @egen-civitas/esm-styleguide/page-background
 * ============================================================================
 *  Système d'arrière-plan de page en Tailwind (utilitaire pur, pas de SCSS
 *  ni de CSS Modules). Porté et durci depuis Civitas-GED, où il habillait
 *  déjà toutes les pages de l'intranet.
 *
 *  1. INSTALLATION (une fois, dans le shell de l'app)
 *  ----------------------------------------------------------------------
 *  S'assurer d'abord que le preset Tailwind du framework est bien importé
 *  (voir @egen-civitas/tailwind-preset) :
 *
 *    import '@egen-civitas/tailwind-preset/tailwind.tw.css';
 *
 *  Puis monter le Provider et le rendu global UNE SEULE FOIS, au sommet de
 *  l'app (le Provider doit englober tout ce qui utilisera <PageBackground>) :
 *
 *    import {
 *      PageBackgroundProvider,
 *      GlobalPageBackground,
 *    } from '@egen-civitas/esm-styleguide';
 *
 *    function Root() {
 *      return (
 *        <PageBackgroundProvider>
 *          <GlobalPageBackground />   // rendu réel de l'arrière-plan (z-0, fixed)
 *          <AppShell />               // reste de l'app, contenu au-dessus
 *        </PageBackgroundProvider>
 *      );
 *    }
 *
 *  Sans imageSrc déclaré par aucune page, <GlobalPageBackground> retombe
 *  automatiquement sur <AnimatedHomeBackground> (fond WebGL animé).
 *
 *  2. USAGE DANS UNE PAGE (déclaratif, cas le plus courant)
 *  ----------------------------------------------------------------------
 *    import { PageBackground } from '@egen-civitas/esm-styleguide';
 *
 *    function SallesPage() {
 *      return (
 *        <>
 *          <PageBackground
 *            imageSrc="/assets/salle.jpg"
 *            accent="#0ea5e9"        // teinte optionnelle de l'image + du halo
 *            showGlow                // halo lumineux au sol (défaut: true)
 *            showDarkWash            // voile sombre pour la lisibilité (défaut: true)
 *          />
 *          {/* ...contenu de la page, rendu normalement au-dessus (z-0) *}
 *        </>
 *      );
 *    }
 *
 *  <PageBackground> ne rend rien lui-même : il s'enregistre auprès du
 *  Provider au montage et restaure le fond par défaut au démontage — donc
 *  UNE SEULE instance active à la fois, celle de la page actuellement
 *  affichée.
 *
 *  3. SURCHARGE TOTALE PAR UN COMPOSANT CUSTOM
 *  ----------------------------------------------------------------------
 *    <PageBackground customComponent={<MonFondSurMesure />} />
 *
 *  ⚠️ Mémoïser customComponent (useMemo) si le parent se re-rend souvent :
 *  un élément JSX inline est une nouvelle référence à chaque rendu, ce qui
 *  redéclenche l'effet d'enregistrement à chaque fois (cf. JSDoc de
 *  PageBackgroundProps.customComponent ci-dessus).
 *
 *  4. SURCHARGER LE FOND (SCSS non-layered) AVEC DES CLASSES TAILWIND
 *  ----------------------------------------------------------------------
 *  Ce dossier est déjà 100% Tailwind : les classes normales suffisent. Le
 *  suffixe `!` (bg-primary-500!) n'est nécessaire QUE pour surcharger un
 *  composant SCSS existant du framework (Card, Panel...) partageant le même
 *  sélecteur — voir le commentaire en tête de tailwind.tw.css.
 *
 *  5. GRADIENT WAVE SEUL (sans le système PageBackground)
 *  ----------------------------------------------------------------------
 *    import { GradientWave } from '@egen-civitas/esm-styleguide';
 *
 *    <div className="relative h-64 w-full overflow-hidden rounded-xl!">
 *      <GradientWave colors={['#4f46e5', '#0ea5e9', '#064e3b']} />
 *    </div>
 *
 *  Le composant gère un canvas WebGL enfant en `absolute inset-0` — le
 *  parent doit être positionné (`relative`) et avoir une taille définie.
 *  Les props autres que `isPlaying` ne sont lues qu'AU MONTAGE (perf : le
 *  contexte WebGL n'est jamais reconstruit) — pour changer `colors` ou
 *  `deform` dynamiquement, démonter/remonter le composant (`key={...}`).
 * ==========================================================================*/
