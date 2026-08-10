/** @category SelectPopover */
import React, { useState } from 'react';
import styles from './select-popover.module.scss';

interface SelectAvatarProps {
  src?: string;
  name: string;
}

export const SelectAvatar: React.FC<SelectAvatarProps> = ({ src, name }) => {
  const [errored, setErrored] = useState(false);

  if (src && !errored) {
    return <img className={styles.avatar} src={src} alt="" onError={() => setErrored(true)} />;
  }

  return (
    <span className={styles.avatarFallback} aria-hidden="true">
      {name.charAt(0).toUpperCase()}
    </span>
  );
};
