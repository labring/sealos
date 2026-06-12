import { memo } from 'react';
import { type CellContext } from '@tanstack/react-table';

import { AppListItemType } from '@/types/app';
import { storageGiToQuantity } from '@/utils/resourceQuantity';

export const Storage = memo<CellContext<AppListItemType, unknown>>(
  ({ row }) => {
    const item = row.original;
    return (
      <span className="text-sm font-normal text-zinc-600">
        {item.storeAmount > 0
          ? storageGiToQuantity(item.storeAmount).formatForDisplay({
              format: 'BinarySI',
              scale: 'auto',
              digits: 4
            })
          : '-'}
      </span>
    );
  },
  (prev, next) => prev.row.original.storeAmount === next.row.original.storeAmount
);

Storage.displayName = 'Storage';
