/** @module @category UI */
import { useEffect, useState } from 'react';

export type LayoutType = 'phone' | 'tablet' | 'small-desktop' | 'large-desktop';

function getLayout() {
  let layout: LayoutType = 'tablet';

  document.body.classList.forEach((cls) => {
    switch (cls) {
      case 'egen-breakpoint-lt-tablet':
        layout = 'phone';
        break;
      case 'egen-breakpoint-gt-small-desktop':
        layout = 'large-desktop';
        break;
      case 'egen-breakpoint-gt-tablet':
        layout = 'small-desktop';
        break;
    }
  });

  return layout;
}

export function useLayoutType() {
  const [type, setType] = useState<LayoutType>(getLayout);

  useEffect(() => {
    const handler = () => {
      setType(getLayout());
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return type;
}

export const isDesktop = (layout: LayoutType) => layout === 'small-desktop' || layout === 'large-desktop';
