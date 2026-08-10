/** @category Sheet */
import React from 'react';
import classNames from 'classnames';
import styles from './sheet.module.scss';

export interface SheetHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const SheetHeader: React.FC<SheetHeaderProps> = ({ children, className }) => (
  <div className={classNames(styles.header, className)}>{children}</div>
);

export interface SheetTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const SheetTitle: React.FC<SheetTitleProps> = ({ children, className }) => (
  <h3 className={classNames(styles.title, className)}>{children}</h3>
);

export interface SheetDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export const SheetDescription: React.FC<SheetDescriptionProps> = ({ children, className }) => (
  <p className={classNames(styles.description, className)}>{children}</p>
);

export interface SheetFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const SheetFooter: React.FC<SheetFooterProps> = ({ children, className }) => (
  <div className={classNames(styles.footer, className)}>{children}</div>
);
