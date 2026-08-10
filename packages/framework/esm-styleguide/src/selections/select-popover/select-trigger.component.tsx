/** @category SelectPopover */
import React from 'react';
import classNames from 'classnames';
import { ChevronDownIcon } from '../../icons';
import { useSelectContext } from './select-popover.types';
import { SelectAvatar } from './select-avatar.component';
import type { SelectTriggerProps } from './select-popover.types';
import styles from './select-popover.module.scss';

export const SelectTrigger: React.FC<SelectTriggerProps> = ({
  className,
  renderTrigger,
  showAvatar = true,
  placeholder = 'Sélectionner…',
  ...rest
}) => {
  const { open, setOpen, selectedOption, getOptionName, triggerRef } = useSelectContext();

  return (
    <button
      ref={triggerRef}
      type="button"
      data-state={open ? 'open' : 'closed'}
      className={classNames(styles.trigger, className)}
      aria-haspopup="listbox"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      {...rest}
    >
      {renderTrigger ? (
        renderTrigger(selectedOption, open)
      ) : (
        <span className={styles.triggerContent}>
          {selectedOption ? (
            <>
              {showAvatar && <SelectAvatar src={selectedOption.logo as string | undefined} name={getOptionName(selectedOption)} />}
              <span className={styles.triggerLabel}>{getOptionName(selectedOption)}</span>
            </>
          ) : (
            <span className={styles.triggerPlaceholder}>{placeholder}</span>
          )}
        </span>
      )}
      <ChevronDownIcon className={classNames(styles.triggerChevron, { [styles['triggerChevron--open']]: open })} size={16} />
    </button>
  );
};
