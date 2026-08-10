/** @category Fields */
import React, { useEffect, useId, useRef, useState } from 'react';
import classNames from 'classnames';
import { FieldIconComponent } from './field-icon.component';
import { ValidationIcon } from './validation-icon.component';
import { KineticLabel } from './kinetic-label.component';
import { useFieldValidation } from './use-field-validation.hook';
import { defaultValidation, type DynamicFieldProps } from './dynamic-field.types';
import styles from './dynamic-field.module.scss';

/**
 * `DynamicField` — champ de saisie unique, dynamique et personnalisable, destiné à
 * remplacer au cas par cas n'importe quel champ texte des apps EGEN.
 *
 * Quatre variantes visuelles (`variant`), pilotées uniquement par des classes CSS —
 * aucune logique de style en JS (sauf `kinetic`, animée lettre par lettre) :
 * - `outlined` (par défaut) : cadre complet façon "panel" (`--panel-input-*`).
 * - `filled` : fond plein arrondi en haut, bordure inférieure épaisse.
 * - `standard` : pas de fond, simple bordure inférieure (le plus discret).
 * - `kinetic` : label dont chaque lettre s'anime individuellement (décalage +
 *   changement de couleur, en cascade) lors du focus/remplissage — via framer-motion.
 *
 * Le label flotte au-dessus du texte saisi (pattern "floating label"), l'icône de
 * validation glisse depuis la droite lors d'un changement de sévérité, et une
 * micro-vibration (si le device la supporte) accompagne ce changement — tout est
 * défini dans `dynamic-field.module.scss`, exclusivement via les tokens du thème
 * EGEN (`var(--colors-*)`, `var(--panel-*)`, `var(--transitions-*)`...).
 *
 * @example
 * ```tsx
 * <DynamicField
 *   variant="outlined"
 *   label="Adresse e-mail"
 *   type="email"
 *   fieldIcon={{ icon: MailIcon, position: 'left' }}
 *   validation={{
 *     rules: [{ regex: /^\S+@\S+\.\S+$/, message: "Format d'e-mail invalide.", type: 'error' }],
 *   }}
 *   value={email}
 *   onChange={setEmail}
 * />
 * ```
 */
export const DynamicField: React.FC<DynamicFieldProps> = ({
  variant = 'outlined',
  size = 'md',
  label,
  placeholder = ' ',
  type = 'text',
  value = '',
  onChange,
  className,
  disabled = false,
  required = false,
  autoComplete,
  autoFocus,
  id,
  name,
  fieldIcon,
  validation = defaultValidation,
  onFocus,
  onBlur,
  onValidationChange,
}) => {
  const generatedId = useId();
  const fieldId = id ?? `egen-field-${generatedId}`;
  const helpId = `${fieldId}-help`;

  const [inputValue, setInputValue] = useState(value);
  // Uniquement utilisé par variant='kinetic' (les 3 autres variantes restent
  // pilotées à 100% par CSS, via :focus/:placeholder-shown — voir le fichier .scss).
  const [isFocused, setIsFocused] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);

  const { currentValidation, isAnimating } = useFieldValidation(inputValue, validation, onValidationChange);

  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange?.(newValue);
  };

  const hasLeftIcon = fieldIcon?.position === 'left';
  const hasLabelIcon = fieldIcon?.position === 'label';
  const showValidationIcon = Boolean(validation.showIcons) && Boolean(currentValidation);

  const rootClassName = classNames(
    styles.field,
    styles[`field--${variant}`],
    styles[`field--${size}`],
    {
      [styles['field--disabled']]: disabled,
      [styles['field--animating']]: isAnimating,
      [styles['field--has-left-icon']]: hasLeftIcon,
      [styles['field--has-validation-icon']]: showValidationIcon,
    },
    currentValidation && styles[`field--${currentValidation.type}`],
    className,
  );

  return (
    <div className={rootClassName}>
      <div className={styles.fieldControl} ref={fieldRef}>
        {hasLeftIcon && (
          <div className={styles.leftIcon}>
            <FieldIconComponent fieldIcon={fieldIcon} />
          </div>
        )}

        <input
          type={type}
          id={fieldId}
          name={name}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          className={styles.input}
          placeholder={placeholder}
          aria-describedby={validation.showMessages && currentValidation ? helpId : undefined}
          aria-invalid={currentValidation?.type === 'error' ? true : undefined}
        />

        {label && variant === 'kinetic' && (
          <label htmlFor={fieldId} className={styles.kineticLabelWrapper}>
            <KineticLabel label={label} active={isFocused || inputValue.length > 0} required={required} />
          </label>
        )}

        {label && variant !== 'kinetic' && (
          <label htmlFor={fieldId} className={styles.label}>
            {hasLabelIcon && <FieldIconComponent fieldIcon={fieldIcon} className={styles.labelIconGlyph} />}
            <span className={styles.labelText}>
              {label}
              {required && (
                <span className={styles.requiredMark} aria-hidden="true">
                  {' '}
                  *
                </span>
              )}
            </span>
          </label>
        )}

        <ValidationIcon currentValidation={currentValidation} showIcons={Boolean(validation.showIcons)} />
      </div>

      {validation.showMessages && currentValidation && (
        <p id={helpId} className={styles.message} role={currentValidation.type === 'error' ? 'alert' : undefined}>
          <span className={styles.messageLead}>
            {currentValidation.type === 'success' && 'Parfait !'}
            {currentValidation.type === 'error' && 'Erreur —'}
            {currentValidation.type === 'warning' && 'Attention —'}
          </span>{' '}
          {currentValidation.message}
        </p>
      )}
    </div>
  );
};

export default DynamicField;
