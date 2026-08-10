import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

export interface MenuToggleButtonProps {
  isOpen: boolean;
  onToggle: () => void;
  /** Couleur du bouton à l'état fermé. Aucune valeur par défaut : à fournir (ex. `var(--colors-surface-foreground)`). */
  menuButtonColor?: string;
  /** Couleur du bouton à l'état ouvert (si `changeMenuColorOnOpen`). Aucune valeur par défaut. */
  openMenuButtonColor?: string;
  changeMenuColorOnOpen?: boolean;
  className?: string;
}

/**
 * `MenuToggleButton` — déclencheur (hamburger animé + texte cyclique) du
 * `StaggeredMenuPanel`. Aucune couleur n'est pré-remplie : `menuButtonColor`
 * et `openMenuButtonColor` doivent être fournies par le consommateur
 * (typiquement des tokens du thème EGEN, ex. `var(--colors-surface-foreground)`).
 * Design et animation GSAP (icône +/×, cycle de texte "Menu" ↔ "Close")
 * repris à l'identique — non modifiés.
 */
export const MenuToggleButton: React.FC<MenuToggleButtonProps> = ({
  isOpen,
  onToggle,
  menuButtonColor,
  openMenuButtonColor,
  changeMenuColorOnOpen = true,
  className,
}) => {
  const toggleBtnRef = useRef<HTMLButtonElement | null>(null);
  const plusHRef = useRef<HTMLSpanElement | null>(null);
  const plusVRef = useRef<HTMLSpanElement | null>(null);
  const iconRef = useRef<HTMLSpanElement | null>(null);
  const textInnerRef = useRef<HTMLSpanElement | null>(null);
  const textWrapRef = useRef<HTMLSpanElement | null>(null);

  const [textLines, setTextLines] = useState<string[]>(['Menu', 'Close']);

  const spinTweenRef = useRef<gsap.core.Timeline | null>(null);
  const textCycleAnimRef = useRef<gsap.core.Tween | null>(null);
  const colorTweenRef = useRef<gsap.core.Tween | null>(null);

  const prevOpenRef = useRef<boolean>(false);

  // ─── Init: état initial de l'icône et de la couleur ──────────────────────
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const plusH = plusHRef.current;
      const plusV = plusVRef.current;
      const icon = iconRef.current;
      const textInner = textInnerRef.current;

      if (!plusH || !plusV || !icon || !textInner) return;

      gsap.set(plusH, { transformOrigin: '50% 50%', rotate: 0 });
      gsap.set(plusV, { transformOrigin: '50% 50%', rotate: 90 });
      gsap.set(icon, { rotate: 0, transformOrigin: '50% 50%' });
      gsap.set(textInner, { yPercent: 0 });

      if (toggleBtnRef.current && menuButtonColor) gsap.set(toggleBtnRef.current, { color: menuButtonColor });
    });
    return () => ctx.revert();
  }, [menuButtonColor]);

  // ─── Sync couleur quand les props changent ────────────────────────────────
  React.useEffect(() => {
    if (toggleBtnRef.current) {
      if (changeMenuColorOnOpen) {
        const targetColor = prevOpenRef.current ? openMenuButtonColor : menuButtonColor;
        if (targetColor) gsap.set(toggleBtnRef.current, { color: targetColor });
      } else if (menuButtonColor) {
        gsap.set(toggleBtnRef.current, { color: menuButtonColor });
      }
    }
  }, [changeMenuColorOnOpen, menuButtonColor, openMenuButtonColor]);

  // ─── Animation icône +/× ─────────────────────────────────────────────────
  const animateIcon = useCallback((opening: boolean) => {
    const icon = iconRef.current;
    const h = plusHRef.current;
    const v = plusVRef.current;
    if (!icon || !h || !v) return;

    spinTweenRef.current?.kill();

    if (opening) {
      gsap.set(icon, { rotate: 0, transformOrigin: '50% 50%' });
      spinTweenRef.current = gsap
        .timeline({ defaults: { ease: 'power4.out' } })
        .to(h, { rotate: 45, duration: 0.5 }, 0)
        .to(v, { rotate: -45, duration: 0.5 }, 0);
    } else {
      spinTweenRef.current = gsap
        .timeline({ defaults: { ease: 'power3.inOut' } })
        .to(h, { rotate: 0, duration: 0.35 }, 0)
        .to(v, { rotate: 90, duration: 0.35 }, 0)
        .to(icon, { rotate: 0, duration: 0.001 }, 0);
    }
  }, []);

  // ─── Animation couleur du bouton ──────────────────────────────────────────
  const animateColor = useCallback(
    (opening: boolean) => {
      const btn = toggleBtnRef.current;
      if (!btn) return;
      colorTweenRef.current?.kill();
      if (changeMenuColorOnOpen) {
        const targetColor = opening ? openMenuButtonColor : menuButtonColor;
        if (targetColor) {
          colorTweenRef.current = gsap.to(btn, { color: targetColor, delay: 0.18, duration: 0.3, ease: 'power2.out' });
        }
      } else if (menuButtonColor) {
        gsap.set(btn, { color: menuButtonColor });
      }
    },
    [openMenuButtonColor, menuButtonColor, changeMenuColorOnOpen]
  );

  // ─── Animation texte cyclique Menu ↔ Close ────────────────────────────────
  const animateText = useCallback((opening: boolean) => {
    const inner = textInnerRef.current;
    if (!inner) return;

    textCycleAnimRef.current?.kill();

    const currentLabel = opening ? 'Menu' : 'Close';
    const targetLabel = opening ? 'Close' : 'Menu';
    const cycles = 3;

    const seq: string[] = [currentLabel];
    let last = currentLabel;
    for (let i = 0; i < cycles; i++) {
      last = last === 'Menu' ? 'Close' : 'Menu';
      seq.push(last);
    }
    if (last !== targetLabel) seq.push(targetLabel);
    seq.push(targetLabel);

    setTextLines(seq);
    gsap.set(inner, { yPercent: 0 });

    const lineCount = seq.length;
    const finalShift = ((lineCount - 1) / lineCount) * 100;

    textCycleAnimRef.current = gsap.to(inner, {
      yPercent: -finalShift,
      duration: 0.5 + lineCount * 0.07,
      ease: 'power4.out',
    });
  }, []);

  // ─── Réagir au changement externe de isOpen ───────────────────────────────
  React.useEffect(() => {
    if (isOpen === prevOpenRef.current) return;
    prevOpenRef.current = isOpen;
    animateIcon(isOpen);
    animateColor(isOpen);
    animateText(isOpen);
  }, [isOpen, animateIcon, animateColor, animateText]);

  return (
    <button
      ref={toggleBtnRef}
      className={`sm-toggle relative inline-flex items-center gap-[0.3rem] bg-transparent border-0 cursor-pointer font-medium leading-none overflow-visible pointer-events-auto${className ? ' ' + className : ''}`}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={isOpen}
      aria-controls="staggered-menu-panel"
      onClick={onToggle}
      type="button"
    >
      {/* Texte cyclique Menu / Close */}
      <span
        ref={textWrapRef}
        className="sm-toggle-textWrap relative inline-block h-[1em] overflow-hidden whitespace-nowrap w-[var(--sm-toggle-width,auto)] min-w-[var(--sm-toggle-width,auto)] mr-[0.5em]"
        aria-hidden="true"
      >
        <span ref={textInnerRef} className="sm-toggle-textInner flex flex-col leading-none">
          {textLines.map((l, i) => (
            <span className="sm-toggle-line block h-[1em] leading-none" key={i}>
              {l}
            </span>
          ))}
        </span>
      </span>

      {/* Icône +/× */}
      <span
        ref={iconRef}
        className="sm-icon relative w-[14px] h-[14px] shrink-0 inline-flex items-center justify-center [will-change:transform]"
        aria-hidden="true"
      >
        <span
          ref={plusHRef}
          className="sm-icon-line absolute left-1/2 top-1/2 w-full h-[2px] bg-current rounded-[2px] -translate-x-1/2 -translate-y-1/2 [will-change:transform]"
        />
        <span
          ref={plusVRef}
          className="sm-icon-line sm-icon-line-v absolute left-1/2 top-1/2 w-full h-[2px] bg-current rounded-[2px] -translate-x-1/2 -translate-y-1/2 [will-change:transform]"
        />
      </span>

      <style>{`
.sm-toggle { position: relative; display: inline-flex; align-items: center; gap: 0.3rem; background: transparent; border: none; cursor: pointer; font-weight: 500; line-height: 1; overflow: visible; }
.sm-toggle:focus-visible { outline: 2px solid #ffffffaa; outline-offset: 4px; border-radius: 4px; }
.sm-toggle-textWrap { position: relative; display: inline-block; height: 1em; overflow: hidden; white-space: nowrap; width: var(--sm-toggle-width, auto); min-width: var(--sm-toggle-width, auto); }
.sm-toggle-textInner { display: flex; flex-direction: column; line-height: 1; }
.sm-toggle-line { display: block; height: 1em; line-height: 1; }
.sm-icon { position: relative; width: 14px; height: 14px; flex: 0 0 14px; display: inline-flex; align-items: center; justify-content: center; will-change: transform; }
.sm-icon-line { position: absolute; left: 50%; top: 50%; width: 100%; height: 2px; background: currentColor; border-radius: 2px; transform: translate(-50%, -50%); will-change: transform; }
      `}</style>
    </button>
  );
};

export default MenuToggleButton;
