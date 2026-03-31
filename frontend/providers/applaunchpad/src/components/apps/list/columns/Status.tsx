import { memo } from 'react';
import { type CellContext } from '@tanstack/react-table';

import { AppListItemType } from '@/types/app';
import AppStatusTag from '@/components/AppStatusTag';

export const Status = memo<CellContext<AppListItemType, unknown>>(
  ({ row }) => {
    const item = row.original;
    return (
      <AppStatusTag
        className="font-medium text-zinc-900"
        status={item.status}
        isPause={item.isPause}
        showBorder={false}
      />
    );
  },
  (prev, next) =>
    prev.row.original.status.value === next.row.original.status.value &&
    prev.row.original.isPause === next.row.original.isPause
);

Status.displayName = 'Status';
