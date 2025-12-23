import { memo } from 'react';
import { type CellContext } from '@tanstack/react-table';

import { DevboxListItemTypeV2 } from '@/types/devbox';
import { DevboxStatusEnum } from '@/constants/devbox';
import DevboxStatusTag from '@/components/StatusTag';

export const Status = memo<CellContext<DevboxListItemTypeV2, unknown>>(
  ({ row }) => {
    const item = row.original;
    return (
      <DevboxStatusTag
        status={item.status}
        isShutdown={item.status.value === DevboxStatusEnum.Shutdown}
      />
    );
  },
  (prev, next) => prev.row.original.status.value === next.row.original.status.value
);

Status.displayName = 'Status';
