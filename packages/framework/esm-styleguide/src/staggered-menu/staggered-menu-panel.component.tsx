import React, { useCallback, useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';

export interface StaggeredMenuItem {
  label: string;
  ariaLabel: string;
  link: string;
}

export interface StaggeredMenuSocialItem {
  label: string;
  link: string;
}

export interface StaggeredMenuPanelProps {
  isOpen: boolean;
  onClose?: () => void;
  position?: 'left' | 'right';
  /** Couleurs des couches animées derrière le panneau. Aucune valeur par défaut : sans cette prop, aucune couche n'est rendue. */
  colors?: string[];
  /** Liens de navigation. Aucune valeur par défaut : sans cette prop, la liste est vide (rien n'est rendu). */
  items?: StaggeredMenuItem[];
  /** Liens sociaux. Aucune valeur par défaut : sans cette prop, le bloc social n'est pas rendu. */
  socialItems?: StaggeredMenuSocialItem[];
  displaySocials?: boolean;
  displayItemNumbering?: boolean;
  /** Couleur d'accent — à passer en `var(--...)` du thème EGEN pour rester cohérent avec le reste de l'app. */
  accentColor?: string;
  closeOnClickAway?: boolean;
}

/**
 * `StaggeredMenuPanel` — panneau de navigation latéral entièrement piloté par
 * props, sans aucun contenu par défaut : ni item de navigation, ni item
 * social, ni couche de couleur, ni couleur d'accent ne sont pré-remplis.
 * C'est au consommateur de fournir la totalité du contenu (`items`,
 * `socialItems`, `colors`, `accentColor`) — typiquement via les tokens du
 * thème EGEN (`var(--colors-*)`), comme dans l'exemple ci-dessous.
 *
 * Le design (mise en page, typographie, structure du DOM/CSS) et
 * l'animation GSAP (timeline d'ouverture/fermeture, stagger des items,
 * cycle du texte du bouton) sont repris à l'identique — non modifiés.
 *
 * @example
 * ```tsx
 * <StaggeredMenuPanel
 *   isOpen={menuOpen}
 *   onClose={() => setMenuOpen(false)}
 *   position="right"
 *   items={navItems}
 *   socialItems={socialItems}
 *   displaySocials
 *   displayItemNumbering
 *   colors={['var(--colors-secondary-300)', 'var(--colors-primary-600)']}
 *   accentColor="var(--colors-primary-600)"
 *   closeOnClickAway
 * />
 * ```
 */
export const StaggeredMenuPanel: React.FC<StaggeredMenuPanelProps> = ({
  isOpen,
  onClose,
  position = 'right',
  colors,
  items,
  socialItems,
  displaySocials = true,
  displayItemNumbering = true,
  accentColor,
  closeOnClickAway = true,
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const preLayersRef = useRef<HTMLDivElement | null>(null);
  const preLayerElsRef = useRef<HTMLElement[]>([]);

  const openTlRef = useRef<gsap.core.Timeline | null>(null);
  const closeTweenRef = useRef<gsap.core.Tween | null>(null);
  const itemEntranceTweenRef = useRef<gsap.core.Tween | null>(null);
  const busyRef = useRef(false);
  const prevOpenRef = useRef<boolean>(false);

  // ─── Init: positionner hors-écran ────────────────────────────────────────
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const panel = panelRef.current;
      const preContainer = preLayersRef.current;
      if (!panel) return;

      let preLayers: HTMLElement[] = [];
      if (preContainer) {
        preLayers = Array.from(preContainer.querySelectorAll('.sm-prelayer')) as HTMLElement[];
      }
      preLayerElsRef.current = preLayers;

      const offscreen = position === 'left' ? -100 : 100;
      gsap.set([panel, ...preLayers], { xPercent: offscreen, opacity: 1 });
      if (preContainer) {
        gsap.set(preContainer, { xPercent: 0, opacity: 1 });
      }
    });
    return () => ctx.revert();
  }, [position]);

  // ─── Build open timeline (identique à l'original) ────────────────────────
  const buildOpenTimeline = useCallback(() => {
    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return null;

    openTlRef.current?.kill();
    if (closeTweenRef.current) {
      closeTweenRef.current.kill();
      closeTweenRef.current = null;
    }
    itemEntranceTweenRef.current?.kill();

    const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel')) as HTMLElement[];
    const numberEls = Array.from(
      panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item')
    ) as HTMLElement[];
    const socialTitle = panel.querySelector('.sm-socials-title') as HTMLElement | null;
    const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link')) as HTMLElement[];

    const offscreen = position === 'left' ? -100 : 100;
    const layerStates = layers.map(el => ({ el, start: offscreen }));
    const panelStart = offscreen;

    if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 10 });
    if (numberEls.length) gsap.set(numberEls, { ['--sm-num-opacity' as any]: 0 });
    if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
    if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 });

    const tl = gsap.timeline({ paused: true });

    layerStates.forEach((ls, i) => {
      tl.fromTo(ls.el, { xPercent: ls.start }, { xPercent: 0, duration: 0.5, ease: 'power4.out' }, i * 0.07);
    });

    const lastTime = layerStates.length ? (layerStates.length - 1) * 0.07 : 0;
    const panelInsertTime = lastTime + (layerStates.length ? 0.08 : 0);
    const panelDuration = 0.65;

    tl.fromTo(
      panel,
      { xPercent: panelStart },
      { xPercent: 0, duration: panelDuration, ease: 'power4.out' },
      panelInsertTime
    );

    if (itemEls.length) {
      const itemsStartRatio = 0.15;
      const itemsStart = panelInsertTime + panelDuration * itemsStartRatio;

      tl.to(
        itemEls,
        { yPercent: 0, rotate: 0, duration: 1, ease: 'power4.out', stagger: { each: 0.1, from: 'start' } },
        itemsStart
      );

      if (numberEls.length) {
        tl.to(
          numberEls,
          { duration: 0.6, ease: 'power2.out', ['--sm-num-opacity' as any]: 1, stagger: { each: 0.08, from: 'start' } },
          itemsStart + 0.1
        );
      }
    }

    if (socialTitle || socialLinks.length) {
      const socialsStart = panelInsertTime + panelDuration * 0.4;

      if (socialTitle) tl.to(socialTitle, { opacity: 1, duration: 0.5, ease: 'power2.out' }, socialsStart);
      if (socialLinks.length) {
        tl.to(
          socialLinks,
          {
            y: 0,
            opacity: 1,
            duration: 0.55,
            ease: 'power3.out',
            stagger: { each: 0.08, from: 'start' },
            onComplete: () => {
              gsap.set(socialLinks, { clearProps: 'opacity' });
            },
          },
          socialsStart + 0.04
        );
      }
    }

    openTlRef.current = tl;
    return tl;
  }, [position]);

  // ─── Play open ────────────────────────────────────────────────────────────
  const playOpen = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;
    const tl = buildOpenTimeline();
    if (tl) {
      tl.eventCallback('onComplete', () => { busyRef.current = false; });
      tl.play(0);
    } else {
      busyRef.current = false;
    }
  }, [buildOpenTimeline]);

  // ─── Play close ───────────────────────────────────────────────────────────
  const playClose = useCallback(() => {
    openTlRef.current?.kill();
    openTlRef.current = null;
    itemEntranceTweenRef.current?.kill();

    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return;

    const all: HTMLElement[] = [...layers, panel];
    closeTweenRef.current?.kill();

    const offscreen = position === 'left' ? -100 : 100;

    closeTweenRef.current = gsap.to(all, {
      xPercent: offscreen,
      duration: 0.32,
      ease: 'power3.in',
      overwrite: 'auto',
      onComplete: () => {
        const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel')) as HTMLElement[];
        if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 10 });

        const numberEls = Array.from(
          panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item')
        ) as HTMLElement[];
        if (numberEls.length) gsap.set(numberEls, { ['--sm-num-opacity' as any]: 0 });

        const socialTitle = panel.querySelector('.sm-socials-title') as HTMLElement | null;
        const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link')) as HTMLElement[];
        if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
        if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 });

        busyRef.current = false;
      },
    });
  }, [position]);

  // ─── Réagir aux changements de isOpen (piloté de l'extérieur) ────────────
  React.useEffect(() => {
    if (isOpen === prevOpenRef.current) return;
    prevOpenRef.current = isOpen;
    if (isOpen) {
      playOpen();
    } else {
      playClose();
    }
  }, [isOpen, playOpen, playClose]);

  // ─── Click-away ───────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!closeOnClickAway || !isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose?.();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeOnClickAway, isOpen, onClose]);

  // ─── Couches de couleur ───────────────────────────────────────────────────
  // Base VIDE : sans `colors`, aucune couche n'est rendue (plus de fallback
  // gris codé en dur). C'est au consommateur de fournir ses couleurs.
  const preLayers = colors && colors.length ? colors.slice(0, 4) : [];
  if (preLayers.length >= 3) {
    const mid = Math.floor(preLayers.length / 2);
    preLayers.splice(mid, 1);
  }

  const navItems = items ?? [];
  const socials = socialItems ?? [];

  return (
    <div
      className="sm-scope"
      style={accentColor ? ({ ['--sm-accent' as any]: accentColor } as React.CSSProperties) : undefined}
      data-position={position}
    >
      {/* Couches de couleur animées derrière le panneau */}
      <div
        ref={preLayersRef}
        className="sm-prelayers pointer-events-none"
        style={{ zIndex: 9998 }}
        aria-hidden="true"
      >
        {preLayers.map((c, i) => (
          <div
            key={i}
            className="sm-prelayer"
            style={{ background: c }}
          />
        ))}
      </div>

      {/* Panneau principal */}
      <aside
        id="staggered-menu-panel"
        ref={panelRef}
        className="staggered-menu-panel pointer-events-auto"
        style={{ zIndex: 9999, WebkitBackdropFilter: 'blur(12px)' }}
        aria-hidden={!isOpen}
      >
        <div className="sm-panel-inner">
          {/* Base VIDE : sans `items`, aucun <ul> "No items" n'est rendu. */}
          {navItems.length > 0 && (
            <ul
              className="sm-panel-list"
              role="list"
              data-numbering={displayItemNumbering || undefined}
            >
              {navItems.map((it, idx) => (
                <li className="sm-panel-itemWrap" key={it.label + idx}>
                  <a
                    className="sm-panel-item"
                    href={it.link}
                    aria-label={it.ariaLabel}
                    data-index={idx + 1}
                  >
                    <span className="sm-panel-itemLabel">
                      {it.label}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}

          {displaySocials && socials.length > 0 && (
            <div className="sm-socials" aria-label="Social links">
              <h3 className="sm-socials-title">Socials</h3>
              <ul className="sm-socials-list" role="list">
                {socials.map((s, i) => (
                  <li key={s.label + i} className="sm-socials-item">
                    <a
                      href={s.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sm-socials-link"
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </aside>

      <style>{`
.sm-scope .staggered-menu-panel { position: fixed; top: 0; ${position === 'left' ? 'left: 0;' : 'right: 0;'} width: clamp(260px, 38vw, 420px); height: 100%; background: white; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); display: flex; flex-direction: column; padding: 6em 2em 2em 2em; overflow-y: auto; z-index: 50; }
.sm-scope .sm-prelayers { position: fixed; top: 0; ${position === 'left' ? 'left: 0;' : 'right: 0;'} bottom: 0; width: clamp(260px, 38vw, 420px); pointer-events: none; z-index: 49; }
.sm-scope .sm-prelayer { position: absolute; top: 0; right: 0; height: 100%; width: 100%; transform: translateX(0); }
.sm-scope .sm-panel-inner { flex: 1; display: flex; flex-direction: column; gap: 1.25rem; }
.sm-scope .sm-panel-itemWrap { position: relative; overflow: hidden; line-height: 1; }
.sm-scope .sm-panel-item { position: relative; color: #000; font-weight: 600; font-size: 4rem; cursor: pointer; line-height: 1; letter-spacing: -2px; text-transform: uppercase; transition: background 0.25s, color 0.25s; display: inline-block; text-decoration: none; padding-right: 1.4em; }
.sm-scope .sm-panel-itemLabel { display: inline-block; will-change: transform; transform-origin: 50% 100%; }
.sm-scope .sm-panel-item:hover { color: var(--sm-accent, #ff0000); }
.sm-scope .sm-panel-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
.sm-scope .sm-panel-list[data-numbering] { counter-reset: smItem; }
.sm-scope .sm-panel-list[data-numbering] .sm-panel-item::after { counter-increment: smItem; content: counter(smItem, decimal-leading-zero); position: absolute; top: 0.1em; right: 3.2em; font-size: 18px; font-weight: 400; color: var(--sm-accent, #ff0000); letter-spacing: 0; pointer-events: none; user-select: none; opacity: var(--sm-num-opacity, 0); }
.sm-scope .sm-socials { margin-top: auto; padding-top: 2rem; display: flex; flex-direction: column; gap: 0.75rem; }
.sm-scope .sm-socials-title { margin: 0; font-size: 1rem; font-weight: 500; color: var(--sm-accent, #ff0000); }
.sm-scope .sm-socials-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: row; align-items: center; gap: 1rem; flex-wrap: wrap; }
.sm-scope .sm-socials-list .sm-socials-link { opacity: 1; transition: opacity 0.3s ease; }
.sm-scope .sm-socials-list:hover .sm-socials-link:not(:hover) { opacity: 0.35; }
.sm-scope .sm-socials-list:focus-within .sm-socials-link:not(:focus-visible) { opacity: 0.35; }
.sm-scope .sm-socials-list .sm-socials-link:hover, .sm-scope .sm-socials-list .sm-socials-link:focus-visible { opacity: 1; }
.sm-scope .sm-socials-link:focus-visible { outline: 2px solid var(--sm-accent, #ff0000); outline-offset: 3px; }
.sm-scope .sm-socials-link { font-size: 1.2rem; font-weight: 500; color: #111; text-decoration: none; position: relative; padding: 2px 0; display: inline-block; transition: color 0.3s ease, opacity 0.3s ease; }
.sm-scope .sm-socials-link:hover { color: var(--sm-accent, #ff0000); }
@media (max-width: 1024px) { .sm-scope .staggered-menu-panel { width: 100%; left: 0; right: 0; } .sm-scope .sm-prelayers { width: 100%; left: 0; right: 0; } }
@media (max-width: 640px) { .sm-scope .staggered-menu-panel { width: 100%; left: 0; right: 0; } .sm-scope .sm-prelayers { width: 100%; left: 0; right: 0; } }
      `}</style>
    </div>
  );
};

export default StaggeredMenuPanel;
