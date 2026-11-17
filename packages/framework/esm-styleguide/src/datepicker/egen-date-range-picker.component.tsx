import React, { forwardRef, useId, useMemo } from 'react';
import classNames from 'classnames';
import {
  Button,
  DateInput,
  DateRangePicker,
  type DateRangePickerProps,
  FieldError,
  Label,
  Provider,
  type DateRange,
  Group,
} from 'react-aria-components';
import { type CalendarDate } from '@internationalized/date';
import { DateSegment } from './date-segment.component.js';
import styles from './datepicker.module.css';
import { EgenIntlLocaleContext, useDatepickerContext } from './hooks.js';
import { type DateInputValue, type DatePickerBaseProps } from './types.js';
import { I18nWrapper } from './i18n-wrapper.component.js';
import { DatePickerIcon } from './date-picker-icon.component.js';
import { CalendarPopover } from './calendar-popover.component.js';
import { dateToInternationalizedDate, internationalizedDateToDate } from './utils.js';
import { DEFAULT_MIN_DATE_FLOOR } from './defaults.js';

/** Properties for the EgenDateRangePicker */
export interface EgenDateRangePickerProps
  extends Omit<DateRangePickerProps<CalendarDate>, 'className' | 'onChange' | 'defaultValue' | 'value'>,
    DatePickerBaseProps {
  /** The default value (uncontrolled) */
  defaultValue?: [DateInputValue, DateInputValue];
  /** Handler that is called when the value changes. */
  onChange?: (value: [Date | null | undefined, Date | null | undefined]) => void;
  /** Handler that is called when the value changes. Note that this provides types from @internationalized/date. */
  onChangeRaw?: (value: DateRange | null) => void;
  /** Specifies the size of the input. Currently supports either `sm`, `md`, or `lg` as an option */
  size?: 'sm' | 'md' | 'lg';
  /** The value (controlled) */
  value?: [DateInputValue, DateInputValue];
}

/**
 * A date range picker to enter or select a date and time range. Based on React Aria, but with EGEN styling.
 */
export const EgenDateRangePicker = /*#__PURE__*/ forwardRef<HTMLDivElement, EgenDateRangePickerProps>(
  function EgenDateRangePicker(
    {
      className,
      defaultValue: rawDefaultValue,
      invalid,
      invalidText,
      isDisabled,
      isInvalid: isInvalidRaw,
      label,
      labelText,
      light,
      maxDate: rawMaxDate,
      minDate: rawMinDate,
      onChange,
      onChangeRaw,
      size = 'md',
      value: rawValue,
      ...dateRangePickerProps
    },
    ref,
  ) {
    const { calendar, intlLocale, today_ } = useDatepickerContext();

    const id = useId();
    const hasVisibleLabel = !!(labelText ?? label);

    // Warn in development if no accessible label is provided
    if (process.env.NODE_ENV !== 'production') {
      if (!hasVisibleLabel && !dateRangePickerProps['aria-label'] && !dateRangePickerProps['aria-labelledby']) {
        console.warn(
          'EgenDateRangePicker: You must provide either a visible label (labelText/label) or an aria-label for accessibility.',
        );
      }
    }

    const value = useMemo(() => {
      if (rawValue) {
        return {
          start: dateToInternationalizedDate(rawValue[0], calendar, false)!,
          end: dateToInternationalizedDate(rawValue[1], calendar, false)!,
        };
      }
      return undefined;
    }, [rawValue, calendar]);

    const defaultValue = useMemo(() => {
      if (rawDefaultValue) {
        return {
          start: dateToInternationalizedDate(rawDefaultValue[0], calendar, false)!,
          end: dateToInternationalizedDate(rawDefaultValue[1], calendar, false)!,
        };
      }
      return undefined;
    }, [rawDefaultValue, calendar]);

    const minDate = useMemo(
      () => dateToInternationalizedDate(rawMinDate ?? DEFAULT_MIN_DATE_FLOOR, calendar, true),
      [rawMinDate, calendar],
    );
    const maxDate = useMemo(() => dateToInternationalizedDate(rawMaxDate, calendar, true), [rawMaxDate, calendar]);
    const isInvalid = useMemo(() => invalid || isInvalidRaw, [invalid, isInvalidRaw]);

    const innerOnChange = useMemo(() => {
      if (onChangeRaw && onChange) {
        console.error(
          'An EgenDateRangePicker component was created with both onChange and onChangeRaw handlers defined. Only onChangeRaw will be used.',
        );
      }

      return (
        onChangeRaw ??
        ((range: DateRange) =>
          onChange?.([internationalizedDateToDate(range.start), internationalizedDateToDate(range.end)]))
      );
    }, [onChangeRaw, onChange]);

    return (
      <I18nWrapper locale={intlLocale.toString()}>
        <div className={classNames(styles.formItem, className)}>
          <Provider values={[[EgenIntlLocaleContext, intlLocale]]}>
            <DateRangePicker
              id={hasVisibleLabel ? id : undefined}
              className={classNames(styles.datePicker, {
                [styles.light]: light,
                [styles.disabled]: isDisabled,
              })}
              isInvalid={isInvalid}
              shouldForceLeadingZeros={intlLocale.language === 'en' ? true : undefined}
              maxValue={maxDate}
              minValue={minDate}
              value={value}
              defaultValue={defaultValue}
              ref={ref}
              isDisabled={isDisabled}
              {...dateRangePickerProps}
              onChange={innerOnChange}
            >
              <div className={styles.container}>
                {hasVisibleLabel && (
                  <Label
                    data-slot="date-label"
                    data-disabled={isDisabled ? 'true' : undefined}
                    className={classNames(styles.label, { [styles.labelDisabled]: isDisabled })}
                    htmlFor={id}>
                    {labelText ?? label}
                  </Label>
                )}

                <Group className={styles.inputGroup}>
                  <div
                    className={classNames(styles.inputsWrapper, {
                      [styles.inputsWrapperSm]: size === 'sm',
                      [styles.inputsWrapperMd]: size === 'md' || !size || size.length === 0,
                      [styles.inputsWrapperLg]: size === 'lg',
                    })}
                  >
                    <DateInput
                      data-slot="date-input-wrapper"
                      className={classNames(
                        styles.startInput,
                        styles.dateInputWrapper,
                      )}
                      slot="start"
                    >
                      {(segment) => <DateSegment className={styles.inputSegment} segment={segment} />}
                    </DateInput>
                    <div className={styles.separator}>
                      <span aria-hidden="true" data-readonly>
                        –
                      </span>
                    </div>
                    <DateInput
                      data-slot="date-input-wrapper"
                      className={classNames(
                        styles.endInput,
                        styles.dateInputWrapper,
                      )}
                      slot="end"
                    >
                      {(segment) => <DateSegment className={styles.inputSegment} segment={segment} />}
                    </DateInput>
                  </div>
                  <Button
                    className={classNames(styles.flatButton, {
                      [styles.flatButtonSm]: size === 'sm',
                      [styles.flatButtonMd]: size === 'md' || !size || size.length === 0,
                      [styles.flatButtonLg]: size === 'lg',
                    })}
                  >
                    <DatePickerIcon />
                  </Button>
                </Group>
                <FieldError className={styles.invalidText}>{invalidText}</FieldError>
                <CalendarPopover variant="range" today_={today_} minDate={minDate} maxDate={maxDate} />
              </div>
            </DateRangePicker>
          </Provider>
        </div>
      </I18nWrapper>
    );
  },
);
