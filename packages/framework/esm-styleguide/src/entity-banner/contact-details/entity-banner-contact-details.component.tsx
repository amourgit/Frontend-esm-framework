/** @module @category UI */
import React, { useMemo } from 'react';
import classNames from 'classnames';
import { InlineLoading } from '@carbon/react';
import { type CoreTranslationKey, getCoreTranslation } from '@egen/esm-translations';
import { ConfigurableLink, useEntity } from '@egen/esm-react-utils';
import { parseDate } from '@egen/esm-utils';
import { useEntityContactAttributes } from './useEntityAttributes';
import { useEntityGroupsForEntity } from './useEntityGroupsForEntity';
import { useRelationships } from './useRelationships';
import styles from './entity-banner-contact-details.module.scss';

interface ContactDetailsProps {
  entityId: string;
  inactive: boolean;
}

const EntityGroups: React.FC<{ entityUuid: string }> = ({ entityUuid }) => {
  const { groups = [], isLoading } = useEntityGroupsForEntity(entityUuid);

  return (
    <>
      <p className={styles.heading}>
        {getCoreTranslation('entityGroups', 'Entity Groups')} ({groups?.length ?? 0})
      </p>
      {isLoading ? (
        <InlineLoading description={`${getCoreTranslation('loading', 'Loading')} ...`} role="progressbar" />
      ) : (
        <ul>
          {(() => {
            if (groups?.length > 0) {
              const sortedGroups = groups.sort(
                (a, b) => parseDate(a?.startDate).getTime() - parseDate(b?.startDate).getTime(),
              );
              const slicedGroups = sortedGroups.slice(0, 3);
              return slicedGroups?.map((group) => (
                <li key={group.uuid}>
                  <ConfigurableLink to={`${window.spaBase}/home/entity-groups/${group.uuid}`} key={group.uuid}>
                    {group.name}
                  </ConfigurableLink>
                </li>
              ));
            }
            return <li>--</li>;
          })()}
          {groups.length > 3 && (
            <li className={styles.link}>
              <ConfigurableLink to={`${window.spaBase}/home/entity-groups`}>
                {getCoreTranslation('seeMoreGroups', 'See {{count}} more groups', {
                  count: groups?.length - 3,
                })}
              </ConfigurableLink>
            </li>
          )}
        </ul>
      )}
    </>
  );
};

const Address: React.FC<{ entityId: string }> = ({ entityId }) => {
  const { entity, isLoading } = useEntity(entityId);
  const address = entity?.address?.find((a) => a.use === 'home');
  const getAddressKey = (url: string) => url.split('#')[1];

  if (isLoading) {
    return <InlineLoading description={`${getCoreTranslation('loading', 'Loading')} ...`} role="progressbar" />;
  }

  return (
    <>
      <p className={styles.heading}>{getCoreTranslation('address', 'Address')}</p>
      <ul>
        {address ? (
          Object.entries(address)
            .filter(([key]) => key !== 'id' && key !== 'use')
            .map(([key, value]) =>
              key === 'extension' ? (
                address.extension?.[0]?.extension?.map((add, i) => (
                  <li key={`address-${key}-${i}`}>
                    {getCoreTranslation(
                      getAddressKey(add.url) as CoreTranslationKey,
                      getAddressKey(add.url) as CoreTranslationKey,
                    )}
                    : {add.valueString}
                  </li>
                ))
              ) : (
                <li key={`address-${key}`}>
                  {getCoreTranslation(key as CoreTranslationKey, key)}: {value}
                </li>
              ),
            )
        ) : (
          <li>--</li>
        )}
      </ul>
    </>
  );
};

const Contact: React.FC<{ entityUuid: string; inactive?: boolean }> = ({ entityUuid }) => {
  const { isLoading: isLoadingAttributes, contactAttributes } = useEntityContactAttributes(entityUuid);

  const contacts = useMemo(
    () =>
      contactAttributes
        ? [
            ...contactAttributes?.map((contact) => [
              contact.attributeType.display
                ? getCoreTranslation(contact.attributeType.display as CoreTranslationKey, contact.attributeType.display)
                : '',
              contact.value,
            ]),
          ]
        : [],
    [contactAttributes],
  );

  return (
    <>
      <p className={styles.heading}>{getCoreTranslation('contactDetails', 'Contact Details')}</p>
      {isLoadingAttributes ? (
        <InlineLoading description={`${getCoreTranslation('loading', 'Loading')} ...`} role="progressbar" />
      ) : (
        <ul>
          {contacts.length ? (
            contacts.map(([label, value], index) => (
              <li key={`${label}-${value}-${index}`}>
                {label}: {value}
              </li>
            ))
          ) : (
            <li>--</li>
          )}
        </ul>
      )}
    </>
  );
};

const Relationships: React.FC<{ entityId: string }> = ({ entityId }) => {
  const { data: relationships, isLoading } = useRelationships(entityId);

  return (
    <>
      <p className={styles.heading}>{getCoreTranslation('relationships', 'Relationships')}</p>
      {isLoading ? (
        <InlineLoading description={`${getCoreTranslation('loading', 'Loading')} ...`} role="progressbar" />
      ) : (
        <ul>
          {relationships && relationships.length > 0 ? (
            <>
              {relationships.map((r) => (
                <li key={r.uuid} className={styles.relationship}>
                  <div>
                    <ConfigurableLink to={`${window.spaBase}/entity/${r.relativeUuid}/detail`}>
                      {r.display}
                    </ConfigurableLink>
                  </div>
                  <div>{r.relationshipType}</div>
                  <div>
                    {`${r.relativeAge ? r.relativeAge : '--'} ${
                      r.relativeAge
                        ? r.relativeAge === 1
                          ? getCoreTranslation('yearAbbreviation', 'yr')
                          : getCoreTranslation('yearsAbbreviation', 'yrs')
                        : ''
                    }`}
                  </div>
                </li>
              ))}
            </>
          ) : (
            <li>--</li>
          )}
        </ul>
      )}
    </>
  );
};

export function EntityBannerContactDetails({ entityId, inactive }: ContactDetailsProps) {
  return (
    <div
      className={classNames(styles.contactDetails, {
        [styles.inactive]: inactive,
      })}
    >
      <div className={styles.row}>
        <div className={styles.col}>
          <Address entityId={entityId} />
        </div>
        <div className={styles.col}>
          <Contact entityUuid={entityId} />
        </div>
      </div>
      <div className={styles.row}>
        <div className={styles.col}>
          <Relationships entityId={entityId} />
        </div>
        <div className={styles.col}>
          <EntityGroups entityUuid={entityId} />
        </div>
      </div>
    </div>
  );
}
