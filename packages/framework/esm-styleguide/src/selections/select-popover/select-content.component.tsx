/** @category SelectPopover */
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import classNames from 'classnames';
import { CheckmarkOutlineIcon, SearchIcon } from '../../icons';
import { useSelectContext } from './select-popover.types';
import { SelectAvatar } from './select-avatar.component';
import type { SelectContentProps, SelectOption } from './select-popover.types';
import styles from './select-popover.module.scss';

interface Anchor {
  top: number;
  left: number;
  width: number;
}

export const SelectContent: React.FC<SelectContentProps> = ({
  className,
  style,
  renderOption,
  title = 'Options',
  searchable = false,
  searchPlaceholder = 'Rechercher…',
  onSearch,
  emptyMessage = 'Aucun résultat.',
  showAvatar = true,
  children,
}) => {
  const { open, setOpen, options, selectedOption, onOptionSelect, getOptionId, getOptionName, triggerRef } = useSelectContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    setAnchor({ top: rect.bottom + 8, left: rect.left, width: rect.width });
  }, [open, triggerRef]);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, setOpen, triggerRef]);

  useLayoutEffect(() => {
    onSearch?.(searchQuery);
  }, [searchQuery, onSearch]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) {
      return options;
    }
    const q = searchQuery.trim().toLowerCase();
    return options.filter((o) => getOptionName(o).toLowerCase().includes(q));
  }, [options, searchQuery, getOptionName]);

  const defaultRenderOption = (option: SelectOption, isSelected: boolean) => (
    <span className={styles.optionContent}>
      {showAvatar && <SelectAvatar src={option.logo as string | undefined} name={getOptionName(option)} />}
      <span className={styles.optionText}>
        <span className={styles.optionName}>{getOptionName(option)}</span>
        {typeof option.plan === 'string' && <span className={styles.optionMeta}>{option.plan}</span>}
      </span>
      {isSelected && <CheckmarkOutlineIcon className={styles.optionCheck} size={16} />}
    </span>
  );

  return (
    <AnimatePresence>
      {open && anchor && (
        <>
          <div className={styles.overlay} onClick={() => setOpen(false)} aria-hidden="true" />
          <motion.div
            ref={panelRef}
            role="listbox"
            className={classNames(styles.panel, className)}
            style={{ top: anchor.top, left: anchor.left, minWidth: anchor.width, ...style }}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.15 } }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {title && (
              <div className={styles.panelHeader}>
                <p className={styles.panelTitle}>{title}</p>
              </div>
            )}

            {searchable && (
              <div className={styles.searchRow}>
                <SearchIcon className={styles.searchIcon} size={14} />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className={styles.searchInput}
                  aria-label={searchPlaceholder}
                />
              </div>
            )}

            <div className={styles.optionsList}>
              {filteredOptions.length === 0 ? (
                <div className={styles.emptyState}>{emptyMessage}</div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = Boolean(selectedOption && getOptionId(selectedOption) === getOptionId(option));
                  return (
                    <button
                      key={getOptionId(option)}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={classNames(styles.optionButton, { [styles['optionButton--selected']]: isSelected })}
                      onClick={() => onOptionSelect(option)}
                    >
                      {renderOption ? renderOption(option, isSelected) : defaultRenderOption(option, isSelected)}
                    </button>
                  );
                })
              )}
            </div>

            {children && (
              <>
                <div className={styles.panelDivider} />
                <div className={styles.panelFooter}>{children}</div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
