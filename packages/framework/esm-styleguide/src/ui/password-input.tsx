import * as React from 'react';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { cn } from './cn.js';
import { TextInput, type TextInputProps } from './text-input.js';

type PasswordInputProps = Omit<TextInputProps, 'type' | 'ref'> & {
  /** Libellés (déjà traduits) du bouton qui affiche / masque le mot de passe. */
  showPasswordLabel?: string;
  hidePasswordLabel?: string;
};

/** Champ mot de passe : `TextInput` avec un bouton œil pour afficher ou masquer la saisie. */
const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { showPasswordLabel = 'Show password', hidePasswordLabel = 'Hide password', containerClassName, className, ...props },
  ref,
) {
  const [visible, setVisible] = React.useState(false);
  const toggleLabel = visible ? hidePasswordLabel : showPasswordLabel;
  return (
    <div className={cn('relative', containerClassName)}>
      <TextInput {...props} ref={ref} containerClassName="w-full" type={visible ? 'text' : 'password'} className={cn('pr-10', className)} />
      <button
        type="button"
        aria-label={toggleLabel}
        title={toggleLabel}
        onClick={() => setVisible((value) => !value)}
        className="absolute right-1 bottom-0 inline-flex size-9 items-center justify-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {visible ? <EyeOffIcon className="size-4" aria-hidden="true" /> : <EyeIcon className="size-4" aria-hidden="true" />}
      </button>
    </div>
  );
});

export { PasswordInput, type PasswordInputProps };
