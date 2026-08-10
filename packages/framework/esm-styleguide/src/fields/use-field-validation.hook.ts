/** @category Fields */
import { useEffect, useState } from 'react';
import type { ValidationConfig, ValidationRule, ValidationRuleType } from './dynamic-field.types';

const vibrationPatterns: Record<ValidationRuleType, number[]> = {
  error: [100, 50, 100],
  warning: [50, 30, 50],
  success: [30],
};

export interface UseFieldValidationResult {
  currentValidation: ValidationRule | null;
  isAnimating: boolean;
}

/**
 * Évalue en temps réel la première règle en échec (ou la règle de succès) parmi
 * `validation.rules`, déclenche une micro-vibration (si supportée et autorisée)
 * lors d'un changement de sévérité, et notifie `onValidationChange`.
 */
export function useFieldValidation(
  inputValue: string,
  validation: ValidationConfig,
  onValidationChange?: (validation: ValidationRule | null) => void,
): UseFieldValidationResult {
  const [currentValidation, setCurrentValidation] = useState<ValidationRule | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const triggerVibration = (type: ValidationRuleType) => {
    if (!validation.triggerVibration) {
      return;
    }

    setIsAnimating(true);

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(vibrationPatterns[type]);
    }

    setTimeout(() => setIsAnimating(false), 600);
  };

  useEffect(() => {
    if (!validation.realTimeValidation || !inputValue || validation.rules.length === 0) {
      setCurrentValidation(null);
      onValidationChange?.(null);
      return;
    }

    const failedRule = validation.rules.find((rule) => !rule.regex.test(inputValue));

    if (failedRule) {
      if (currentValidation?.type !== failedRule.type) {
        triggerVibration(failedRule.type);
      }
      setCurrentValidation(failedRule);
      onValidationChange?.(failedRule);
      return;
    }

    const successRule = validation.rules.find((rule) => rule.type === 'success' && rule.regex.test(inputValue));

    if (successRule) {
      if (currentValidation?.type !== 'success') {
        triggerVibration('success');
      }
      setCurrentValidation(successRule);
      onValidationChange?.(successRule);
      return;
    }

    setCurrentValidation(null);
    onValidationChange?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue, validation.rules, validation.realTimeValidation, currentValidation?.type, onValidationChange]);

  return { currentValidation, isAnimating };
}
