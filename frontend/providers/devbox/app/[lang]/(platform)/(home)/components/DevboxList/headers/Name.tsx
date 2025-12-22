import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { Check, ArrowDownAZ, ArrowUpAZ } from 'lucide-react';
import { type HeaderContext } from '@tanstack/react-table';

import { DevboxListItemTypeV2 } from '@/types/devbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@sealos/shadcn-ui/dropdown-menu';
import { Polygon } from '@/components/Polygon';

export const Name = memo<HeaderContext<DevboxListItemTypeV2, unknown>>(({ column }) => {
  const t = useTranslations();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex cursor-pointer items-center gap-2 select-none hover:text-zinc-800">
          {column.getIsSorted() === 'desc' ? (
            <ArrowDownAZ className="h-4 w-4 shrink-0 text-blue-600" />
          ) : (
            <ArrowUpAZ
              className={`h-4 w-4 shrink-0 ${column.getIsSorted() === 'asc' ? 'text-blue-600' : ''}`}
            />
          )}
          {t('name')}
          <Polygon
            fillColor={column.getIsSorted() ? '#2563EB' : '#A1A1AA'}
            className="h-1.5 w-3 shrink-0"
          />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <div className="flex items-center px-1 py-1.5 text-xs font-medium text-zinc-500">
          {t('order')}
        </div>
        <DropdownMenuItem
          onClick={() => {
            if (column.getIsSorted() === 'asc') {
              column.clearSorting();
            } else {
              column.toggleSorting(false);
            }
          }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <ArrowUpAZ className="h-4 w-4 shrink-0" />
            {t('sort.asc')}
          </div>
          {column.getIsSorted() === 'asc' && <Check className="h-4 w-4 text-blue-600" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            if (column.getIsSorted() === 'desc') {
              column.clearSorting();
            } else {
              column.toggleSorting(true);
            }
          }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <ArrowDownAZ className="h-4 w-4 shrink-0" />
            {t('sort.desc')}
          </div>
          {column.getIsSorted() === 'desc' && <Check className="h-4 w-4 text-blue-600" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

Name.displayName = 'Name';
