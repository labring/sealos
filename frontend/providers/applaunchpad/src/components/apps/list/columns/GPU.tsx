import { memo } from 'react';
import { type CellContext } from '@tanstack/react-table';

import { AppListItemType } from '@/types/app';
import GPUItem from '@/components/GPUItem';

export const GPU = memo<CellContext<AppListItemType, unknown>>(
  ({ row }) => {
    return (
      <div className="overflow-hidden pr-4">
        <GPUItem gpu={row.original.gpu} />
      </div>
    );
  },
  (prev, next) => {
    const prevGpu = prev.row.original.gpu;
    const nextGpu = next.row.original.gpu;
    return prevGpu?.type === nextGpu?.type && prevGpu?.amount === nextGpu?.amount;
  }
);

GPU.displayName = 'GPU';
