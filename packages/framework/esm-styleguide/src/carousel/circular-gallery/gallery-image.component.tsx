/** @category CircularGallery */
import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import styles from './circular-gallery.module.scss';

gsap.registerPlugin(MotionPathPlugin);

interface GalleryImageProps {
  url: string;
  title: string;
  open: boolean;
  inPlace: boolean;
  id: number;
  onInPlace: (id: number) => void;
  total: number;
}

/**
 * Animation reprise à l'identique de l'original : un cercle miniature (dans
 * la rangée d'onglets, en bas) se déploie en plein cadre via un timeline GSAP
 * en 3 temps — remonte au centre, grossit jusqu'à couvrir le cadre (avec un
 * `clipPath` qui bascule de cercle à carré une fois en place) — et, en sens
 * inverse (fermeture), rétrécit puis REBONDIT jusqu'à sa position d'onglet
 * via `MotionPathPlugin` (courbe passant par un point intermédiaire
 * au-dessus de la rangée d'onglets, pour un effet de "chute avec rebond").
 */
export const GalleryImage: React.FC<GalleryImageProps> = ({ url, title, open, inPlace, id, onInPlace, total }) => {
  const [firstLoad, setLoaded] = useState(true);
  const clip = useRef<SVGCircleElement>(null);

  // ── Constantes d'animation (identiques à l'original) ────────────────────────
  const gap = 10;
  const circleRadius = 7;
  const defaults = { transformOrigin: 'center center' };
  const duration = 0.4;
  const width = 400;
  const height = 400;
  const scale = 700;

  const bigSize = circleRadius * scale;
  const overlap = 0;

  // ── Calcul des positions (identique à l'original) ───────────────────────────
  const getPosSmall = () => ({
    cx: width / 2 - (total * (circleRadius * 2 + gap) - gap) / 2 + id * (circleRadius * 2 + gap),
    cy: height - 30,
    r: circleRadius,
  });
  const getPosSmallAbove = () => ({
    cx: width / 2 - (total * (circleRadius * 2 + gap) - gap) / 2 + id * (circleRadius * 2 + gap),
    cy: height / 2,
    r: circleRadius * 2,
  });
  const getPosCenter = () => ({ cx: width / 2, cy: height / 2, r: circleRadius * 7 });
  const getPosEnd = () => ({ cx: width / 2 - bigSize + overlap, cy: height / 2, r: bigSize });
  const getPosStart = () => ({ cx: width / 2 + bigSize - overlap, cy: height / 2, r: bigSize });

  useEffect(() => {
    setLoaded(false);
    if (!clip.current) {
      return;
    }

    const flipDuration = firstLoad ? 0 : duration;
    const upDuration = firstLoad ? 0 : 0.2;
    const bounceDuration = firstLoad ? 0.01 : 1;
    const delay = firstLoad ? 0 : flipDuration + upDuration;

    if (open) {
      gsap
        .timeline()
        .set(clip.current, { ...defaults, ...getPosSmall() })
        .to(clip.current, {
          ...defaults,
          ...getPosCenter(),
          duration: upDuration,
          ease: 'power3.inOut',
        })
        .to(clip.current, {
          ...defaults,
          ...getPosEnd(),
          duration: flipDuration,
          ease: 'power4.in',
          onComplete: () => onInPlace(id),
        });
    } else {
      gsap
        .timeline({ overwrite: true })
        .set(clip.current, { ...defaults, ...getPosStart() })
        .to(clip.current, {
          ...defaults,
          ...getPosCenter(),
          delay,
          duration: flipDuration,
          ease: 'power4.out',
        })
        .to(clip.current, {
          ...defaults,
          motionPath: {
            path: [getPosSmallAbove(), getPosSmall()],
            curviness: 1,
          },
          duration: bounceDuration,
          ease: 'bounce.out',
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
      className={styles.galleryImageSvg}
    >
      <defs>
        <clipPath id={`${id}_circleClip`}>
          <circle cx={0} cy={0} r={circleRadius} ref={clip} />
        </clipPath>
        <clipPath id={`${id}_squareClip`}>
          <rect width={width} height={height} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}${inPlace ? '_squareClip' : '_circleClip'})`}>
        <image width={width} height={height} href={url} className={styles.pointerNone}>
          <title>{title}</title>
        </image>
      </g>
    </svg>
  );
};
