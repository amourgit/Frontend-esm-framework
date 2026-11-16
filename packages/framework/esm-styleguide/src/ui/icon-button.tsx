import * as React from 'react';
import { Button } from './button.js';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip.js';

type IconButtonProps = Omit<React.ComponentProps<typeof Button>, 'size' | 'children' | 'aria-label'> & {
  /** Icône (ex. un composant `lucide-react`). */
  icon: React.ReactNode;
  /** Libellé accessible ET infobulle : obligatoire, un bouton sans texte doit toujours être nommé. */
  label: string;
  size?: 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg';
  /** Place de l'infobulle (par défaut : au-dessus). */
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
  /** Désactive l'infobulle (le libellé reste lu par les lecteurs d'écran). */
  noTooltip?: boolean;
};

/** Bouton qui ne montre qu'une icône : variantes de `Button`, `aria-label` obligatoire, infobulle au survol/focus. */
function IconButton({
  icon,
  label,
  size = 'icon',
  variant = 'ghost',
  tooltipSide = 'top',
  noTooltip = false,
  ...props
}: IconButtonProps) {
  const button = (
    <Button type="button" variant={variant} size={size} aria-label={label} {...props}>
      {icon}
    </Button>
  );
  if (noTooltip) return button;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side={tooltipSide}>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { IconButton, type IconButtonProps };
