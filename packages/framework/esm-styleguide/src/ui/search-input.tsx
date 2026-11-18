import * as React from 'react';
import { SearchIcon, XIcon } from 'lucide-react';
import { cn } from './cn.js';

type SearchInputProps = Omit<React.ComponentProps<'input'>, 'type' | 'value' | 'defaultValue' | 'onChange'> & {
  /** Libellé accessible du champ (obligatoire : pas de libellé visible). */
  label: string;
  value?: string;
  defaultValue?: string;
  /** Reçoit la valeur saisie (pas l'événement). */
  onValueChange?: (value: string) => void;
  /** Libellé du bouton qui vide le champ. */
  clearLabel?: string;
  containerClassName?: string;
};

/** Champ de recherche : icône loupe, bouton « effacer » dès qu'il y a une saisie, `Échap` vide le champ. */
function SearchInput({
  label,
  value,
  defaultValue = '',
  onValueChange,
  clearLabel = 'Clear search',
  className,
  containerClassName,
  onKeyDown,
  ...props
}: SearchInputProps) {
  const [inner, setInner] = React.useState(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? value : inner;
  const update = (next: string) => {
    if (!controlled) setInner(next);
    onValueChange?.(next);
  };
  return (
    <div data-slot="search-input" className={cn('relative flex items-center', containerClassName)}>
      <SearchIcon className="pointer-events-none absolute left-3 size-4 text-muted-foreground" aria-hidden="true" />
      <input
        type="search"
        role="searchbox"
        aria-label={label}
        value={current}
        onChange={(event) => update(event.target.value)}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.key === 'Escape' && current) {
            event.stopPropagation();
            update('');
          }
        }}
        className={cn(
          'h-9 w-full min-w-0 rounded-md border border-input bg-transparent pr-9 pl-9 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-search-cancel-button]:hidden',
          className,
        )}
        {...props}
      />
      {current ? (
        <button
          type="button"
          aria-label={clearLabel}
          title={clearLabel}
          onClick={() => update('')}
          className="absolute right-1 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <XIcon className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

export { SearchInput, type SearchInputProps };
