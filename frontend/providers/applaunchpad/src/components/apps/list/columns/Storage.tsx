import { memo } from 'react';
import { type CellContext } from '@tanstack/react-table';

import { AppListItemType } from '@/types/app';

export const Storage = memo<CellContext<AppListItemType, unknown>>(
  ({ row }) => {
    const item = row.original;
    return (
      <span className="text-sm font-normal text-zinc-600">
        {item.storeAmount > 0 ? `${item.storeAmount}Gi` : '-'}
      </span>
    );
  },
  (prev, next) => prev.row.original.storeAmount === next.row.original.storeAmount
);

Storage.displayName = 'Storage';
