/** @module @category UI */
import React, { useMemo } from 'react';
import classNames from 'classnames';
import { ExtensionSlot } from '@egen/esm-react-utils';
import { getCoreTranslation } from '@egen/esm-translations';
import { formatPartialDate } from '@egen/esm-utils';
import EntityBannerEntityIdentifiers from './entity-banner-entity-identifiers.component';
import styles from './entity-banner-entity-info.module.scss';

interface EntityBannerEntityInfoProps {
  entity: fhir.Patient;
  renderedFrom?: string;
}

export function EntityBannerEntityInfo({ entity, renderedFrom }: EntityBannerEntityInfoProps) {
  const name = entity?.name?.[0]
    ? [entity.name[0].given?.join(' '), entity.name[0].family].filter(Boolean).join(' ')
    : getCoreTranslation('unknown', 'Unknown');

  const extensionState = useMemo(
    () => ({ entityUuid: entity.id, entity, renderedFrom }),
    [entity.id, entity, renderedFrom],
  );

  return (
    <div className={styles.entityInfo}>
      <div className={classNames(styles.row, styles.entityNameRow)}>
        <div className={styles.flexRow}>
          <span className={styles.entityName}>{name}</span>
          <ExtensionSlot className={styles.tagsSlot} name="entity-banner-tags-slot" state={extensionState} />
        </div>
      </div>
      <div className={styles.demographics}>
        {entity.birthDate && (
          <>
            <span>{formatPartialDate(entity.birthDate, { time: false })}</span>
            <span className={styles.separator}>&middot;</span>
          </>
        )}
        <EntityBannerEntityIdentifiers identifiers={entity.identifier} showIdentifierLabel />
        <ExtensionSlot className={styles.extensionSlot} name="entity-banner-bottom-slot" state={extensionState} />
      </div>
    </div>
  );
}
