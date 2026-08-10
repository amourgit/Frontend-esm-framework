/** @category SelectPopover */
import { createContext, useContext, type RefObject } from 'react';
import type React from 'react';

/** Une option sélectionnable — champs libres au-delà de `id`/`name` (logo, plan, etc.). */
export interface SelectOption {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface SelectContextValue<T extends SelectOption = SelectOption> {
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedOption: T | undefined;
  options: T[];
  onOptionSelect: (option: T) => void;
  getOptionId: (option: T) => string;
  getOptionName: (option: T) => string;
  triggerRef: RefObject<HTMLButtonElement>;
}

export const SelectContext = createContext<SelectContextValue<any> | null>(null);

export function useSelectContext<T extends SelectOption = SelectOption>(): SelectContextValue<T> {
  const context = useContext(SelectContext) as SelectContextValue<T> | null;
  if (!context) {
    throw new Error('Select compound components must be used within <Select>');
  }
  return context;
}

export interface SelectProps<T extends SelectOption = SelectOption> {
  children: React.ReactNode;
  /** Options proposées — aucune donnée statique, tout vient d'ici. */
  options: T[];
  selectedOptionId?: string;
  onOptionChange?: (option: T) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Extrait l'identifiant d'une option. Défaut : `option.id`. */
  getOptionId?: (option: T) => string;
  /** Extrait le libellé d'une option. Défaut : `option.name`. */
  getOptionName?: (option: T) => string;
}

export interface SelectTriggerProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Remplace entièrement le contenu du déclencheur. Reçoit l'option sélectionnée et l'état ouvert/fermé. */
  renderTrigger?: (selectedOption: SelectOption | undefined, isOpen: boolean) => React.ReactNode;
  /** Affiche un avatar (image `option.logo`/`option.avatarUrl` ou initiale) devant le nom. Ignoré si `renderTrigger` est fourni. Défaut : true. */
  showAvatar?: boolean;
  placeholder?: React.ReactNode;
}

export interface SelectContentProps {
  className?: string;
  style?: React.CSSProperties;
  /** Remplace entièrement le rendu d'une option dans la liste. */
  renderOption?: (option: SelectOption, isSelected: boolean) => React.ReactNode;
  title?: React.ReactNode;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  emptyMessage?: React.ReactNode;
  showAvatar?: boolean;
  /** Contenu additionnel en pied de liste (ex. « + Créer... »). */
  children?: React.ReactNode;
}
