import { useEffect } from 'react';
import { BreadcrumbItem, useBreadcrumbContext } from '@/components/layout/BreadcrumbContext';

/**
 * Custom hook to set breadcrumbs for a page.
 * @param items Array of breadcrumb items to display in the header.
 */
export const useBreadcrumbs = (items: BreadcrumbItem[]) => {
  const { setBreadcrumbs } = useBreadcrumbContext();
  const itemsHash = JSON.stringify(items);

  useEffect(() => {
    setBreadcrumbs(items);
  }, [itemsHash]);
};
