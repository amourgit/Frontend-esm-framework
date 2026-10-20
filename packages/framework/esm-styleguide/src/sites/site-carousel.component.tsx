/** @category Sites */
import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../page-background/page-background.utils.js';
import type { SiteSummary } from './site.types.js';

export interface SiteCarouselProps {
  sites: SiteSummary[];
  /** Appelé quand l'utilisateur valide la carte centrale. */
  onSelect?: (site: SiteSummary) => void;
  /** Hauteur de la scène. @default 500 */
  height?: number | string;
  className?: string;
}

interface Slot {
  key: number;
  site: SiteSummary;
}

const DRAG_THRESHOLD = 10;
const SWIPE_THRESHOLD = 45;

/**
 * Carrousel « en quinconce » de sites : la carte centrale est sélectionnable,
 * les autres l'amènent au centre. Glisser/swiper ou flèches pour naviguer.
 * Présentationnel : aucune navigation ni son, tout passe par `onSelect`.
 */
export function SiteCarousel({ sites, onSelect, height = 500, className }: SiteCarouselProps) {
  const counter = useRef(0);
  const build = (list: SiteSummary[]): Slot[] => list.map((site) => ({ site, key: counter.current++ }));
  const [slots, setSlots] = useState<Slot[]>(() => build(sites));
  const [cardSize, setCardSize] = useState(350);
  const dragging = useRef(false);
  const startX = useRef(0);
  const currentX = useRef(0);

  useEffect(() => setSlots(build(sites)), [sites]);

  useEffect(() => {
    const update = () => setCardSize(window.matchMedia('(min-width: 640px)').matches ? 350 : 280);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const move = (steps: number) =>
    setSlots((prev) => {
      if (prev.length < 2) return prev;
      const next = [...prev];
      for (let i = 0; i < Math.abs(steps); i++) {
        const item = steps > 0 ? next.shift() : next.pop();
        if (!item) break;
        const renewed = { ...item, key: counter.current++ };
        if (steps > 0) next.push(renewed);
        else next.unshift(renewed);
      }
      return next;
    });

  const onPointerUp = () => {
    const diff = currentX.current - startX.current;
    if (Math.abs(diff) >= SWIPE_THRESHOLD) move(diff < 0 ? 1 : -1);
    setTimeout(() => {
      dragging.current = false;
    }, 50);
  };

  const arrowClass =
    'flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center border-2 border-white/20 bg-slate-950/80 text-slate-100 transition-colors hover:bg-teal-500 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400';

  return (
    <div
      onPointerDown={(e) => {
        startX.current = currentX.current = e.clientX;
        dragging.current = false;
      }}
      onPointerMove={(e) => {
        currentX.current = e.clientX;
        if (Math.abs(currentX.current - startX.current) > DRAG_THRESHOLD) dragging.current = true;
      }}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={cn('relative w-full overflow-hidden cursor-grab active:cursor-grabbing touch-pan-y select-none', className)}
      style={{ height }}
    >
      {slots.map(({ site, key }, index) => {
        const position =
          slots.length % 2 ? index - (slots.length + 1) / 2 : index - slots.length / 2;
        const isCenter = position === 0;
        return (
          <div
            key={key}
            role="button"
            tabIndex={isCenter ? 0 : -1}
            aria-label={site.name}
            onKeyDown={(e) => e.key === 'Enter' && isCenter && onSelect?.(site)}
            onClick={() => {
              if (dragging.current) return;
              if (isCenter) onSelect?.(site);
              else move(position);
            }}
            className={cn(
              'absolute left-1/2 top-1/2 cursor-pointer border-2 p-7 sm:p-8 transition-all duration-500 ease-in-out',
              isCenter
                ? 'z-10 bg-teal-500 text-slate-950 border-teal-300'
                : 'z-0 bg-slate-900/70 text-slate-100 border-white/15 hover:border-teal-400/60',
            )}
            style={{
              width: cardSize,
              height: cardSize,
              clipPath:
                'polygon(50px 0%, calc(100% - 50px) 0%, 100% 50px, 100% 100%, calc(100% - 50px) 100%, 50px 100%, 0 100%, 0 0)',
              transform: `translate(-50%, -50%) translateX(${(cardSize / 1.5) * position}px) translateY(${
                isCenter ? -30 : position % 2 ? 20 : -10
              }px) rotate(${isCenter ? 0 : position % 2 ? 2.5 : -2.5}deg)`,
              boxShadow: isCenter ? '0 8px 0 4px rgba(255,255,255,0.14)' : 'none',
            }}
          >
            {site.imageUrl && (
              <img
                src={site.imageUrl}
                alt=""
                className="mb-3 sm:mb-4 h-12 w-10 sm:h-14 sm:w-12 bg-slate-800 object-cover object-top rounded-xs shadow-sm"
              />
            )}
            <h3 className="text-sm sm:text-base md:text-lg font-medium leading-snug line-clamp-4">
              {site.name} — {site.description}
            </h3>
            <p
              className={cn(
                'absolute bottom-6 sm:bottom-8 left-7 sm:left-8 right-7 sm:right-8 text-xs sm:text-sm italic truncate',
                isCenter ? 'text-slate-950/80' : 'text-slate-400',
              )}
            >
              {site.shortName} • {site.head} ({site.memberCount} membres, {site.appCount} apps)
            </p>
          </div>
        );
      })}
      <div className="absolute bottom-3 sm:bottom-4 left-1/2 flex -translate-x-1/2 gap-2 z-20">
        <button type="button" onClick={() => move(-1)} className={arrowClass} aria-label="Site précédent">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button type="button" onClick={() => move(1)} className={arrowClass} aria-label="Site suivant">
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
