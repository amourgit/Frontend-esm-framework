/** @category Fields */
import React, { useEffect, useState } from 'react';
import classNames from 'classnames';
import { CheckmarkFilledIcon, WarningIcon } from '../icons/icons';
import { ErrorFilledIcon } from '../icons/error-filled.icon';
import type { ValidationRule, ValidationRuleType } from './dynamic-field.types';
import styles from './dynamic-field.module.scss';

const severityIcons: Record<ValidationRuleType, React.ComponentType<{ className?: string; size?: number }>> = {
  success: CheckmarkFilledIcon,
  warning: WarningIcon,
  error: ErrorFilledIcon,
};

interface ValidationIconProps {
  currentValidation: ValidationRule | null;
  showIcons: boolean;
}

export const ValidationIcon: React.FC<ValidationIconProps> = ({ currentValidation, showIcons }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (currentValidation && showIcons) {
      const timeout = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timeout);
    }
    setIsVisible(false);
  }, [currentValidation, showIcons]);

  if (!showIcons || !currentValidation) {
    return null;
  }

  const Icon = severityIcons[currentValidation.type];

  if (!Icon) {
    return null;
  }

  return (
    <div
      className={classNames(styles.validationIcon, styles[`validationIcon--${currentValidation.type}`], {
        [styles['validationIcon--visible']]: isVisible,
      })}
    >
      <Icon className={styles.validationIconGlyph} size={16} />
    </div>
  );
};
