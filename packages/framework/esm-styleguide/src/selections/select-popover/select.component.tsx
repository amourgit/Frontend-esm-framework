/** @category SelectPopover */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { SelectContext } from './select-popover.types';
import type { SelectOption, SelectProps } from './select-popover.types';

/**
 * `Select` — provider du compound component (`SelectTrigger` + `SelectContent`).
 * Popover générique de sélection dans une liste d'options — pas seulement des
 * "workspaces" : convient à n'importe quelle liste (tenants, langues,
 * utilisateurs, rôles...) grâce à `getOptionId`/`getOptionName` personnalisables.
 *
 * @example
 * ```tsx
 * <Select options={tenants} selectedOptionId={activeTenantId} onOptionChange={setTenant}>
 *   <SelectTrigger />
 *   <SelectContent searchable title="Tenants" />
 * </Select>
 * ```
 */
export function Select<T extends SelectOption = SelectOption>({
  children,
  options,
  selectedOptionId,
  onOptionChange,
  open: controlledOpen,
  onOpenChange,
  getOptionId = (option) => option.id,
  getOptionName = (option) => option.name,
}: SelectProps<T>) {
  const [internalOpen, setInternalOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      onOpenChange?.(next);
      if (!isControlled) {
        setInternalOpen(next);
      }
    },
    [onOpenChange, isControlled],
  );

  const selectedOption = useMemo(() => {
    if (!selectedOptionId) {
      return options[0];
    }
    return options.find((o) => getOptionId(o) === selectedOptionId) ?? options[0];
  }, [options, selectedOptionId, getOptionId]);

  const handleOptionSelect = useCallback(
    (option: T) => {
      onOptionChange?.(option);
      setOpen(false);
    },
    [onOptionChange, setOpen],
  );

  return (
    <SelectContext.Provider
      value={{
        open,
        setOpen,
        selectedOption,
        options,
        onOptionSelect: handleOptionSelect,
        getOptionId,
        getOptionName,
        triggerRef,
      }}
    >
      {children}
    </SelectContext.Provider>
  );
}
