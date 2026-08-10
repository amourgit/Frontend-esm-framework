/** @category Sheet */
import React from 'react';
import classNames from 'classnames';
import { useSheetContext } from './sheet.context';
import styles from './sheet.module.scss';

export interface SheetTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const SheetTrigger: React.FC<SheetTriggerProps> = ({ asChild, children, className }) => {
  const { onOpenChange } = useSheetContext();
  const handleClick = () => onOpenChange(true);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      ...(children.props as Record<string, unknown>),
      className: classNames((children.props as { className?: string }).className, className),
      onClick: (e: React.MouseEvent) => {
        (children.props as { onClick?: (e: React.MouseEvent) => void }).onClick?.(e);
        handleClick();
      },
    });
  }

  return (
    <button onClick={handleClick} type="button" className={classNames(styles.triggerReset, className)}>
      {children}
    </button>
  );
};

export interface SheetCloseProps {
  asChild?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const SheetClose: React.FC<SheetCloseProps> = ({ asChild, children, className }) => {
  const { onOpenChange } = useSheetContext();
  const handleClick = () => onOpenChange(false);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      ...(children.props as Record<string, unknown>),
      className: classNames((children.props as { className?: string }).className, className),
      onClick: (e: React.MouseEvent) => {
        (children.props as { onClick?: (e: React.MouseEvent) => void }).onClick?.(e);
        handleClick();
      },
    });
  }

  return (
    <button onClick={handleClick} type="button" className={classNames(styles.triggerReset, className)}>
      {children}
    </button>
  );
};
