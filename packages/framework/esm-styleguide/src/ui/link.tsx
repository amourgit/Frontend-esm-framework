import * as React from 'react';
import { Slot } from 'radix-ui';
import { cn } from './cn.js';

type LinkProps = Omit<React.ComponentProps<'a'>, 'ref'> & {
  /** Rend l'enfant à la place de `<a>` (ex. le `<Link>` de react-router) en lui passant les classes. */
  asChild?: boolean;
  /** Souligné en permanence (sinon : au survol). */
  underline?: boolean;
};

/** Lien de texte : couleur `primary`, focus visible. Les liens externes (`target="_blank"`) reçoivent `rel="noopener noreferrer"`. */
const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { className, asChild = false, underline = false, target, rel, ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : 'a';
  return (
    <Comp
      ref={ref}
      data-slot="link"
      target={target}
      rel={rel ?? (target === '_blank' ? 'noopener noreferrer' : undefined)}
      className={cn(
        'rounded-sm text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50',
        underline && 'underline',
        className,
      )}
      {...props}
    />
  );
});

export { Link, type LinkProps };
