/** @category Sheet */
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface SheetPortalProps {
  children: React.ReactNode;
  container?: HTMLElement;
  className?: string;
}

export const SheetPortal: React.FC<SheetPortalProps> = ({ children, container, className }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  const portalContent = className ? <div className={className}>{children}</div> : children;

  return createPortal(portalContent, container || document.body);
};
