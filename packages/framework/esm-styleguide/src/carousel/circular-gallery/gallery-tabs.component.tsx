/** @category CircularGallery */
import React from 'react';
import styles from './circular-gallery.module.scss';
import type { CircularGalleryImage } from './circular-gallery.types';

interface GalleryTabsProps {
  images: CircularGalleryImage[];
  onSelect: (index: number) => void;
}

export const GalleryTabs: React.FC<GalleryTabsProps> = ({ images, onSelect }) => {
  const gap = 10;
  const circleRadius = 7;
  const width = 400;
  const height = 400;

  const getPosX = (i: number) => width / 2 - (images.length * (circleRadius * 2 + gap) - gap) / 2 + i * (circleRadius * 2 + gap);
  const getPosY = () => height - 30;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
      className={styles.galleryImageSvg}
    >
      {images.map((image, i) => (
        <g key={image.url} className={styles.tabGroup}>
          <defs>
            <clipPath id={`tab_${i}_clip`}>
              <circle cx={getPosX(i)} cy={getPosY()} r={circleRadius} />
            </clipPath>
          </defs>
          <image
            x={getPosX(i) - circleRadius}
            y={getPosY() - circleRadius}
            width={circleRadius * 2}
            height={circleRadius * 2}
            href={image.url}
            clipPath={`url(#tab_${i}_clip)`}
            className={styles.pointerNone}
            preserveAspectRatio="xMidYMid slice"
          />
          <circle
            onClick={() => onSelect(i)}
            className={styles.tabCircle}
            strokeWidth={2}
            cx={getPosX(i)}
            cy={getPosY()}
            r={circleRadius + 2}
          >
            <title>{image.title}</title>
          </circle>
        </g>
      ))}
    </svg>
  );
};
