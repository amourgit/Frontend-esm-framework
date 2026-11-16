import * as React from 'react';
import { cn } from './cn.js';
import { Input } from './input.js';
import { Label } from './label.js';

type TextInputProps = Omit<React.ComponentProps<typeof Input>, 'id'> & {
  /** Obligatoire : un champ sans libellé n'est pas accessible. */
  label: React.ReactNode;
  id?: string;
  /** Texte d'aide sous le champ. */
  helperText?: React.ReactNode;
  /** Message d'erreur : met le champ en `aria-invalid` et remplace le texte d'aide. */
  errorText?: React.ReactNode;
  /** Masque le libellé visuellement (il reste lu par les lecteurs d'écran). */
  hideLabel?: boolean;
  /** Classes du conteneur (le champ lui-même reçoit `className`). */
  containerClassName?: string;
};

/** Champ texte complet : libellé relié, aide/erreur annoncées (`aria-describedby`), états `invalid` et `disabled`. */
function TextInput({
  label,
  id,
  helperText,
  errorText,
  hideLabel = false,
  containerClassName,
  className,
  ...props
}: TextInputProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const message = errorText ?? helperText;
  return (
    <div data-slot="text-input" className={cn('grid gap-1.5', containerClassName)}>
      <Label htmlFor={inputId} className={cn(hideLabel && 'sr-only')}>
        {label}
      </Label>
      <Input
        id={inputId}
        aria-invalid={errorText ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={className}
        {...props}
      />
      {message ? (
        <p id={messageId} className={cn('text-xs', errorText ? 'text-destructive' : 'text-muted-foreground')}>
          {message}
        </p>
      ) : null}
    </div>
  );
}

export { TextInput, type TextInputProps };
