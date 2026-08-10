/** @module @category UI */
import React, { useEffect, useMemo, useState } from 'react';
import GeoPattern from 'geopattern';
import { SkeletonIcon } from '@carbon/react';
import { getCoreTranslation } from '@egen/esm-translations';
import { useEntityPhoto } from './useEntityPhoto';
import PlaceholderIcon from './placeholder-icon.component';
import styles from './entity-photo.module.scss';

export interface EntityPhotoProps {
  entityName: string;
  entityUuid: string;
  alt?: string;
}

function getInitials(name: string, maxInitials = 3): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxInitials)
    .map((part) => part[0])
    .join('');
}

/**
 * Displays the profile photo for an entity.
 *
 * If no photo is available, it renders a generated geometric avatar
 * based on the entity UUID. The default size is 56px.
 *
 * @example
 * ```tsx
 * import { EntityPhoto } from '@egen/esm-framework';
 * <EntityPhoto entityUuid="abc-123" entityName="Alice Martin" />
 * ```
 */
export function EntityPhoto({ entityUuid, entityName, alt }: EntityPhotoProps) {
  const { data: photo, isLoading } = useEntityPhoto(entityUuid);
  const [validImageSrc, setValidImageSrc] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const pattern = useMemo(() => GeoPattern.generate(entityUuid), [entityUuid]);

  useEffect(() => {
    if (photo?.imageSrc) {
      const imageSrc = new URL(photo.imageSrc, window.location.origin).pathname;

      setIsValidating(true);
      let cancelled = false;
      const img = new Image();
      img.onload = () => {
        if (!cancelled) {
          setValidImageSrc(imageSrc);
          setIsValidating(false);
        }
      };
      img.onerror = () => {
        if (!cancelled) {
          setValidImageSrc(null);
          setIsValidating(false);
        }
      };
      img.src = imageSrc;

      return () => {
        cancelled = true;
      };
    } else {
      setValidImageSrc(null);
      setIsValidating(false);
    }
  }, [photo?.imageSrc]);

  const altText = useMemo(() => {
    if (alt) return alt;
    return validImageSrc
      ? getCoreTranslation('entityPhotoAlt', 'Profile photo of {{entityName}}', { entityName })
      : getCoreTranslation('entityAvatarAlt', 'Avatar for {{entityName}}', { entityName });
  }, [alt, validImageSrc, entityName]);

  if (isLoading || isValidating) {
    return <SkeletonIcon className={styles.skeleton} data-testid="skeleton-icon" />;
  }

  if (photo?.imageSrc && !validImageSrc) {
    return (
      <PlaceholderIcon
        aria-label={getCoreTranslation('entityPhotoPlaceholder', 'Photo placeholder for {{entityName}}', {
          entityName,
        })}
      />
    );
  }

  if (validImageSrc) {
    return (
      <div aria-label={altText}>
        <img className={styles.avatar} src={validImageSrc} alt={altText} title={entityName} />
      </div>
    );
  }

  return (
    <div aria-label={altText}>
      <div
        className={styles.avatar}
        title={entityName}
        style={{
          backgroundImage: pattern.toDataUrl(),
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
        }}
      >
        <span className={styles.initials}>{getInitials(entityName)}</span>
      </div>
    </div>
  );
}
