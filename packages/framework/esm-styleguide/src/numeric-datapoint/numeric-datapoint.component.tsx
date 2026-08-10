/** @module @category UI */
import React, { useMemo, useId } from 'react';
import classNames from 'classnames';
import { getCoreTranslation } from '@egen/esm-translations';
import {
  calculateInterpretation,
  normalizeInterpretation,
  type DataPointInterpretation,
  type DATAPOINT_INTERPRETATION,
  type DataPointReferenceRanges,
} from './interpretation-utils';
import { useConceptReferenceRange } from './use-concept-reference-range';
import styles from './numeric-datapoint.module.scss';

export interface NumericDataPointProps {
  /** The data point value to display */
  value: string | number;
  /** Unit of measurement */
  unit?: string;
  /** Label for the data point (only shown for card variant) */
  label?: string;
  /** Pre-calculated interpretation */
  interpretation?: DataPointInterpretation | DATAPOINT_INTERPRETATION;
  /** Reference range for calculating interpretation */
  referenceRange?: DataPointReferenceRanges;
  /** Concept UUID to fetch reference range from */
  conceptUuid?: string;
  /**
   * Display style variant, defaults to 'card'
   * - 'card': Card-style container with colored borders and backgrounds
   * - 'cell': Table cell styling with background colors
   */
  variant?: 'card' | 'cell';
  entityUuid: string;
}

/**
 * Generic numeric data point component for displaying numeric values
 * with interpretation-based styling (normal / high / low / critical).
 *
 * Can be used for any domain: metrics, KPIs, sensor readings, test results, etc.
 *
 * @example
 * ```tsx
 * import { NumericDataPoint } from '@egen/esm-framework';
 * <NumericDataPoint
 *   value={98.5}
 *   unit="%"
 *   label="Completion Rate"
 *   entityUuid="abc-123"
 *   conceptUuid="concept-uuid"
 * />
 * ```
 */
export const NumericDataPoint: React.FC<NumericDataPointProps> = ({
  value,
  unit,
  label,
  interpretation: providedInterpretation,
  referenceRange: providedReferenceRange,
  conceptUuid,
  variant = 'card',
  entityUuid,
}) => {
  const generatedId = useId();

  const { referenceRange: fetchedReferenceRange, isLoading: isLoadingConcept } = useConceptReferenceRange(
    providedReferenceRange || providedInterpretation ? undefined : conceptUuid,
    entityUuid,
  );

  const referenceRange = providedReferenceRange ?? fetchedReferenceRange;

  const calculatedInterpretation = useMemo(() => {
    if (providedInterpretation) return normalizeInterpretation(providedInterpretation);
    if (referenceRange && !isLoadingConcept) return calculateInterpretation(value, referenceRange);
    return 'normal';
  }, [providedInterpretation, referenceRange, value, isLoadingConcept]);

  const interpretation = calculatedInterpretation ?? 'normal';

  const flaggedCritical =
    interpretation === 'critically_low' ||
    interpretation === 'critically_high' ||
    interpretation === 'off_scale_low' ||
    interpretation === 'off_scale_high';
  const flaggedAbnormal = interpretation !== 'normal';

  const labelId = label
    ? `egen-numeric-dp-label-${label.replaceAll(/\s+/g, '-').toLowerCase()}-${generatedId}`
    : undefined;
  const valueId = `egen-numeric-dp-value-${generatedId}`;
  const unitId = `egen-numeric-dp-unit-${generatedId}`;

  const hasValue = value != null && value !== '';
  const displayValue = hasValue ? value : getCoreTranslation('notAvailable', 'Not available');

  const interpretationClasses = classNames({
    [styles['critically-low']]: interpretation === 'critically_low' || interpretation === 'off_scale_low',
    [styles['critically-high']]: interpretation === 'critically_high' || interpretation === 'off_scale_high',
    [styles.low]: interpretation === 'low',
    [styles.high]: interpretation === 'high',
    [styles['off-scale-low']]: interpretation === 'off_scale_low',
    [styles['off-scale-high']]: interpretation === 'off_scale_high',
  });

  const cardContainerClasses = classNames({
    [styles.container]: true,
    [styles.card]: true,
    [styles['critical-value']]: flaggedCritical,
    [styles['abnormal-value']]: flaggedAbnormal && !flaggedCritical,
  });

  const cellClasses = classNames({
    [styles.cell]: true,
    [interpretationClasses]: true,
  });

  if (variant === 'cell') {
    return (
      <div className={cellClasses}>
        {displayValue}
        {hasValue && unit ? ` ${unit}` : ''}
      </div>
    );
  }

  return (
    <section className={cardContainerClasses} data-testid="numeric-datapoint-card">
      {label && (
        <div className={styles['label-container']}>
          <span id={labelId} className={styles.label}>
            {label}
          </span>
          {flaggedAbnormal && (
            <span
              className={styles[interpretation.replace('_', '-')]}
              title={getCoreTranslation('abnormalValue', 'Abnormal value')}
            />
          )}
        </div>
      )}
      <div className={styles['value-container']}>
        <span
          id={valueId}
          aria-labelledby={labelId && unitId ? `${labelId} ${unitId}` : labelId || unitId || undefined}
          className={styles.value}
        >
          {displayValue}
        </span>
        {hasValue && unit && (
          <span id={unitId} className={styles.units}>
            {unit}
          </span>
        )}
      </div>
    </section>
  );
};
