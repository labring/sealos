import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { type HeaderContext } from '@tanstack/react-table';

import { DevboxListItemTypeV2, DevboxStatusMapType } from '@/types/devbox';
import { DevboxStatusEnum, devboxStatusMap } from '@/constants/devbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@sealos/shadcn-ui/dropdown-menu';
import DevboxStatusTag from '@/components/StatusTag';
import { Polygon } from '@/components/Polygon';

interface StatusFilterProps extends HeaderContext<DevboxListItemTypeV2, unknown> {
  statusFilter: DevboxStatusEnum[];
  onStatusFilterChange: (statuses: DevboxStatusEnum[]) => void;
}

export const StatusFilter = memo<StatusFilterProps>(
  ({ table, statusFilter, onStatusFilterChange }) => {
    const t = useTranslations();
    const currentData = table.getCoreRowModel().rows.map((row) => row.original);

    const existingStatuses = new Set(
      currentData.map((item) =>
        item.status.value === DevboxStatusEnum.Shutdown
          ? DevboxStatusEnum.Stopped
          : item.status.value
      )
    );

    const statusOptions = Object.values(devboxStatusMap).filter((status) => {
      if (status.value === DevboxStatusEnum.Shutdown) return false;
      if (status.value === DevboxStatusEnum.Stopped) {
        return existingStatuses.has(DevboxStatusEnum.Stopped);
      }
      return existingStatuses.has(status.value);
    }) as DevboxStatusMapType[];

    const isAllSelected = Object.values(devboxStatusMap)
      .filter((status) => status.value !== DevboxStatusEnum.Shutdown)
      .map((status) => status.value)
      .every((value) => statusFilter.includes(value));

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex cursor-pointer items-center gap-2 hover:text-zinc-800">
            {t('status')}
            <Polygon
              fillColor={isAllSelected ? '#A1A1AA' : '#2563EB'}
              className="h-1.5 w-3 shrink-0"
            />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <div className="flex items-center px-1 py-1.5 text-xs font-medium text-zinc-500 select-none">
            {t('status')}
          </div>
          {statusOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              className="flex w-full cursor-pointer items-center justify-between px-2 py-1.5"
              onClick={() => {
                const value = option.value as DevboxStatusEnum;
                const isSelected = statusFilter.includes(value);
                onStatusFilterChange(
                  isSelected
                    ? statusFilter.filter((v) => v !== value)
                    : [...statusFilter, value]
                );
              }}
            >
              <DevboxStatusTag status={option} className="font-normal" />
              {statusFilter.includes(option.value as DevboxStatusEnum) && (
                <Check className="h-4 w-4 text-blue-600" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
);

StatusFilter.displayName = 'StatusFilter';
