/** @module @category UI */
import React from 'react';
import { useLayoutType } from '@egen-civitas/esm-react-utils';
import { Layer } from '../ui/index.js';

export interface ResponsiveWrapperProps {
  children: React.ReactNode;
}

/**
 * ResponsiveWrapper enables a responsive behavior for the component its wraps, providing a different rendering based on the current layout type.
 * On desktop, it renders the children as is, while on a tablet, it wraps them in a `Layer` (a plain surface, see `ui/layer.tsx`).
 * This provides a light background for form inputs on tablets, in accordance with the design requirements.
 */
export const ResponsiveWrapper: React.FC<ResponsiveWrapperProps> = ({ children }) => {
  const layout = useLayoutType();
  const isTablet = layout === 'tablet';

  if (isTablet) {
    return <Layer className="bg-transparent">{children}</Layer>;
  }

  return <>{children}</>;
};
