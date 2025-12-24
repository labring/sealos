import { memo } from 'react';
import dayjs from 'dayjs';
import { type CellContext } from '@tanstack/react-table';

import { DevboxListItemTypeV2 } from '@/types/devbox';

export const CreateTime = memo<CellContext<DevboxListItemTypeV2, unknown>>(
  ({ row }) => {
    const item = row.original;
    return (
      <span className="text-sm text-zinc-600">
        {dayjs(item.createTime).format('YYYY/MM/DD HH:mm')}
      </span>
    );
  },
  (prev, next) => prev.row.original.createTime === next.row.original.createTime
);

CreateTime.displayName = 'CreateTime';
