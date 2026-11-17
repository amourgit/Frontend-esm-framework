/** @module @category UI */
import React, {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  type ComponentProps,
} from 'react';
import classNames from 'classnames';
import { useLayoutType, useOnClickOutside } from '@egen-civitas/esm-react-utils';
import styles from './custom-overflow-menu.module.css';

interface CustomOverflowMenuContextValue {
  closeMenu: () => void;
}

const CustomOverflowMenuContext = createContext<CustomOverflowMenuContextValue | null>(null);

export function useCustomOverflowMenu() {
  const context = useContext(CustomOverflowMenuContext);
  if (!context) {
    throw new Error('useCustomOverflowMenu must be used within a CustomOverflowMenu');
  }
  return context;
}

interface CustomOverflowMenuProps {
  /** The content to display as the menu trigger button. */
  menuTitle: React.ReactNode;
  /** The menu items to display when the menu is open. */
  children: React.ReactNode;
}

/**
 * A custom overflow menu with a text/icon trigger button. Uses CSS-based show/hide (no portal), so keyboard
 * behavior (Escape, arrow keys, auto-focus) is implemented here to match the WAI-ARIA menu button pattern.
 */
export function CustomOverflowMenu({ menuTitle, children }: CustomOverflowMenuProps) {
  const [menuIsOpen, setMenuIsOpen] = React.useState(false);
  const ref = useOnClickOutside<HTMLDivElement>(() => setMenuIsOpen(false), menuIsOpen);
  const isTablet = useLayoutType() === 'tablet';
  const toggleShowMenu = useCallback(() => setMenuIsOpen((state) => !state), []);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const uniqueId = useId();
  const triggerId = `custom-overflow-menu-trigger-${uniqueId}`;
  const menuId = `custom-overflow-menu-${uniqueId}`;

  const closeMenuAndFocusTrigger = useCallback(() => {
    setMenuIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  const contextValue = useMemo(() => ({ closeMenu: closeMenuAndFocusTrigger }), [closeMenuAndFocusTrigger]);

  const handleEscapeKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && menuIsOpen) {
        e.stopPropagation();
        closeMenuAndFocusTrigger();
      }
    },
    [closeMenuAndFocusTrigger, menuIsOpen],
  );

  const childArray = Children.toArray(children);

  useEffect(() => {
    if (menuIsOpen && menuRef.current) {
      const firstItem = menuRef.current.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])');
      firstItem?.focus();
    }
  }, [menuIsOpen]);

  const handleOverflowMenuItemFocus = useCallback(
    ({ currentIndex, direction }: { currentIndex?: number; direction: number }) => {
      const enabledItems = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])');
      if (!enabledItems?.length) {
        return;
      }

      const activeItem =
        (document.activeElement?.closest?.('[role="menuitem"]') as HTMLElement) ?? document.activeElement;
      const currentPos = Array.from(enabledItems).indexOf(activeItem as HTMLElement);
      if (currentPos === -1) {
        enabledItems[direction > 0 ? 0 : enabledItems.length - 1]?.focus();
        return;
      }

      const nextPos = currentPos + direction;
      const wrappedPos = nextPos < 0 ? enabledItems.length - 1 : nextPos >= enabledItems.length ? 0 : nextPos;
      enabledItems[wrappedPos]?.focus();
    },
    [],
  );

  const enrichedChildren = childArray.map((child, index) => {
    if (isValidElement(child)) {
      return cloneElement(child as React.ReactElement<any>, {
        closeMenu: closeMenuAndFocusTrigger,
        handleOverflowMenuItemFocus,
        index,
      });
    }
    return child;
  });

  return (
    <div data-overflow-menu className={styles.container} ref={ref}>
      <button
        type="button"
        className={classNames(styles.trigger, { [styles.triggerOpen]: menuIsOpen })}
        aria-controls={menuId}
        aria-expanded={menuIsOpen}
        aria-haspopup="true"
        id={triggerId}
        onClick={toggleShowMenu}
        onKeyDown={handleEscapeKey}
        ref={triggerRef}
      >
        {menuTitle}
      </button>
      <div
        className={classNames(styles.menu, { [styles.show]: menuIsOpen })}
        aria-labelledby={triggerId}
        data-placement="bottom"
        id={menuId}
        onKeyDown={handleEscapeKey}
        ref={menuRef}
        role="menu"
        tabIndex={-1}
      >
        <ul className={styles.list} data-size={isTablet ? 'lg' : 'md'}>
          <CustomOverflowMenuContext.Provider value={contextValue}>
            {enrichedChildren}
          </CustomOverflowMenuContext.Provider>
        </ul>
      </div>
    </div>
  );
}

export interface CustomOverflowMenuItemProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onClick'> {
  /** Texte de l'entrée. */
  itemText: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  /** Entrée destructive (rouge). */
  isDelete?: boolean;
  /** Filet de séparation au-dessus de l'entrée. */
  hasDivider?: boolean;
  /** Rend un lien (`<a>`) au lieu d'un bouton. */
  href?: string;
  /** Ajoute le texte en infobulle (`title`). */
  requireTitle?: boolean;
  wrapperClassName?: string;
  /** Fournis par `CustomOverflowMenu` ; ferme le menu après l'action. */
  closeMenu?: () => void;
}

export function CustomOverflowMenuItem({
  itemText,
  onClick,
  isDelete,
  hasDivider,
  href,
  requireTitle,
  wrapperClassName,
  className,
  disabled,
  closeMenu: closeMenuProp,
  handleOverflowMenuItemFocus,
  index: _index,
  ...rest
}: CustomOverflowMenuItemProps & {
  handleOverflowMenuItemFocus?: (args: { currentIndex?: number; direction: number }) => void;
  index?: number;
}) {
  const context = useContext(CustomOverflowMenuContext);
  const closeMenu = closeMenuProp ?? context?.closeMenu;
  const itemClass = classNames(styles.item, { [styles.itemDelete]: isDelete }, className);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    onClick?.(event);
    closeMenu?.();
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      handleOverflowMenuItemFocus?.({ direction: 1 });
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      handleOverflowMenuItemFocus?.({ direction: -1 });
    }
  };
  const title = requireTitle && typeof itemText === 'string' ? itemText : undefined;
  return (
    <li role="none" className={classNames(styles.itemWrapper, { [styles.itemDivider]: hasDivider }, wrapperClassName)}>
      {href ? (
        <a role="menuitem" href={href} className={itemClass} title={title} onClick={handleClick} onKeyDown={handleKeyDown}>
          {itemText}
        </a>
      ) : (
        <button
          type="button"
          role="menuitem"
          className={itemClass}
          disabled={disabled}
          title={title}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          {...rest}
        >
          {itemText}
        </button>
      )}
    </li>
  );
}
