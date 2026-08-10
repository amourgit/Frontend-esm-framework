/** @category CascadingNavDropdown */
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { SearchIcon, ChevronRightIcon } from '../icons/icons';
import type { NavigationItem } from './cascading-nav-dropdown.types';
import styles from './cascading-nav-dropdown.module.scss';

interface ColumnWithSearchProps {
  columnItems: NavigationItem[];
  columnIndex: number;
  activeItems: (string | null)[];
  searchable: boolean;
  searchPlaceholder: string;
  onHover: (item: NavigationItem, level: number) => void;
  onNavigate: (path: string) => void;
}

export const ColumnWithSearch: React.FC<ColumnWithSearchProps> = ({
  columnItems,
  columnIndex,
  activeItems,
  searchable,
  searchPlaceholder,
  onHover,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');

  const filteredItems = useMemo(() => {
    if (!query.trim()) {
      return columnItems;
    }
    const q = query.trim().toLowerCase();
    return columnItems.filter((item) => item.label.toLowerCase().includes(q));
  }, [columnItems, query]);

  return (
    <motion.div
      className={styles.column}
      initial={{ opacity: 0, width: 0 }}
      animate={{ opacity: 1, width: 'var(--cnd-column-width)' }}
      exit={{ opacity: 0, width: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {searchable && (
        <div className={styles.columnSearch}>
          <SearchIcon className={styles.columnSearchIcon} size={14} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className={styles.columnSearchInput}
            aria-label={searchPlaceholder}
          />
        </div>
      )}

      <ul className={styles.columnList} role="list">
        {filteredItems.map((item) => {
          const isActive = activeItems[columnIndex] === item.id;
          const hasChildren = Boolean(item.children?.length);
          const Icon = item.icon;

          return (
            <li key={item.id}>
              <button
                type="button"
                className={styles.columnItem}
                data-active={isActive || undefined}
                onMouseEnter={() => onHover(item, columnIndex)}
                onFocus={() => onHover(item, columnIndex)}
                onClick={() => {
                  if (!hasChildren && item.path) {
                    onNavigate(item.path);
                  }
                }}
              >
                {Icon && <Icon className={styles.columnItemIcon} size={16} />}
                <span className={styles.columnItemLabel}>{item.label}</span>
                {hasChildren && <ChevronRightIcon className={styles.columnItemChevron} size={14} />}
              </button>
            </li>
          );
        })}

        {filteredItems.length === 0 && <li className={styles.columnEmpty}>—</li>}
      </ul>
    </motion.div>
  );
};
