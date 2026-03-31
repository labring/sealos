import { memo } from 'react';
import { type CellContext } from '@tanstack/react-table';

import { AppListItemType } from '@/types/app';

export const CreateTime = memo<CellContext<AppListItemType, unknown>>(
  ({ row }) => {
    return <span className="text-sm font-normal text-zinc-600">{row.original.createTime}</span>;
  },
  (prev, next) => prev.row.original.createTime === next.row.original.createTime
);

CreateTime.displayName = 'CreateTime';
