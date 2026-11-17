import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { ConfigurableLink, useLayoutType, usePaginationInfo } from '@egen-civitas/esm-react-utils';
import { getCoreTranslation } from '@egen-civitas/esm-translations';
import { Button } from '../ui/index.js';
import { cn } from '../ui/cn.js';

export interface PaginationChange {
  page: number;
  pageSize: number;
}

export interface PaginationProps {
  /** The count of current items displayed */
  currentItems: number;
  /** The count of total items displayed */
  totalItems: number;
  /** The current page number */
  pageNumber: number;
  /** The size of each page */
  pageSize: number;
  /** A callback to be called when the page (or the page size) changes */
  onPageNumberChange?: (change: PaginationChange) => void;
  /** An optional URL the user should be directed to if they click on the link to see all results */
  dashboardLinkUrl?: string;
  /** Optional text to display instead of the default "See all" */
  dashboardLinkLabel?: string;
}

/**
 * Re-usable pagination bar
 */
export const Pagination: React.FC<PaginationProps> = ({
  totalItems,
  pageSize,
  onPageNumberChange,
  pageNumber,
  dashboardLinkUrl,
  currentItems,
  dashboardLinkLabel: urlLabel,
}) => {
  const { pageSizes, pageItemsCount } = usePaginationInfo(pageSize, totalItems, pageNumber, currentItems);
  const isTablet = useLayoutType() === 'tablet';
  const itemsDisplayed = getCoreTranslation('paginationItemsCount', '{{pageItemsCount}} / {{totalItems}} items', {
    totalItems,
    pageItemsCount,
  });
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const goTo = (page: number) => onPageNumberChange?.({ page: Math.min(Math.max(page, 1), totalPages), pageSize });
  const controlSize = isTablet ? 'h-12' : 'h-8';

  if (totalItems <= 0) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-between border-t border-border bg-card pl-4 text-sm text-muted-foreground',
        isTablet && 'min-h-12',
      )}
    >
      <div>
        {itemsDisplayed}
        {dashboardLinkUrl && (
          <ConfigurableLink to={dashboardLinkUrl} className="ml-4 text-sm text-primary hover:underline">
            {urlLabel ?? getCoreTranslation('seeAll', 'See all')}
          </ConfigurableLink>
        )}
      </div>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2">
          <span className="sr-only">{getCoreTranslation('itemsPerPage' as any, 'Items per page')}</span>
          <select
            className={cn('rounded-md border border-input bg-transparent px-2 text-sm text-foreground', controlSize)}
            value={pageSize}
            onChange={(event) => onPageNumberChange?.({ page: 1, pageSize: Number(event.target.value) })}
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="sr-only">{getCoreTranslation('pageNumber' as any, 'Page number')}</span>
          <select
            className={cn('rounded-md border border-input bg-transparent px-2 text-sm text-foreground', controlSize)}
            value={pageNumber}
            onChange={(event) => goTo(Number(event.target.value))}
          >
            {Array.from({ length: totalPages }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                {index + 1}
              </option>
            ))}
          </select>
        </label>
        <span>{getCoreTranslation('paginationOfPages', 'of {{count}} pages', { count: totalPages })}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={isTablet ? 'size-12' : undefined}
          disabled={pageNumber <= 1}
          aria-label={getCoreTranslation('previousPage' as any, 'Previous page')}
          onClick={() => goTo(pageNumber - 1)}
        >
          <ChevronLeftIcon aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={isTablet ? 'size-12' : undefined}
          disabled={pageNumber >= totalPages}
          aria-label={getCoreTranslation('nextPage' as any, 'Next page')}
          onClick={() => goTo(pageNumber + 1)}
        >
          <ChevronRightIcon aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
};
