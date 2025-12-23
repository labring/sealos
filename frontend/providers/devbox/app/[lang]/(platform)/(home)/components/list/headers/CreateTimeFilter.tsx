import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { Check, ArrowUpWideNarrow, ArrowDownWideNarrow } from 'lucide-react';
import { type HeaderContext } from '@tanstack/react-table';

import { DevboxListItemTypeV2 } from '@/types/devbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@sealos/shadcn-ui/dropdown-menu';
import { Polygon } from '@/components/Polygon';
import DatePicker from '@/components/DatePicker';

interface CreateTimeFilterProps extends HeaderContext<DevboxListItemTypeV2, unknown> {
  isSpecificTimeRangeSelected: boolean;
}

export const CreateTimeFilter = memo<CreateTimeFilterProps>(
  ({ column, isSpecificTimeRangeSelected }) => {
    const t = useTranslations();

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex cursor-pointer items-center gap-2 hover:text-zinc-800">
            {column.getIsSorted() === 'asc' ? (
              <ArrowUpWideNarrow className="h-4 w-4 shrink-0 text-blue-600" />
            ) : isSpecificTimeRangeSelected ? (
              <ArrowDownWideNarrow className="h-4 w-4 shrink-0 text-blue-600" />
            ) : (
              <ArrowDownWideNarrow className="h-4 w-4 shrink-0" />
            )}
            <span className="select-none">{t('create_time')}</span>
            <Polygon
              fillColor={
                column.getIsSorted() === 'asc' || isSpecificTimeRangeSelected
                  ? '#2563EB'
                  : '#A1A1AA'
              }
              className="h-1.5 w-3 shrink-0"
            />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[290px]">
          <div className="flex items-center px-1 py-1.5 text-xs font-medium text-zinc-500">
            {t('time_range')}
          </div>
          <div className="p-2">
            <DatePicker />
          </div>
          <DropdownMenuSeparator />
          <div className="flex items-center px-1 py-1.5 text-xs font-medium text-zinc-500">
            {t('order')}
          </div>
          <DropdownMenuItem
            onClick={() => column.toggleSorting(false)}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <ArrowUpWideNarrow className="mr-2 h-4 w-4 text-zinc-500" />
              {t('oldest_first')}
            </div>
            {column.getIsSorted() === 'asc' && <Check className="h-4 w-4 text-blue-600" />}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => column.toggleSorting(true)}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <ArrowDownWideNarrow className="mr-2 h-4 w-4 text-zinc-500" />
              {t('newest_first')}
            </div>
            {column.getIsSorted() === 'desc' && <Check className="h-4 w-4 text-blue-600" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
);

CreateTimeFilter.displayName = 'CreateTimeFilter';
