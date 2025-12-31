import { memo } from 'react';
import { type CellContext } from '@tanstack/react-table';

import { AppListItemType } from '@/types/app';
import PodLineChart from '@/components/PodLineChart';
import { EMPTY_MONITOR_DATA } from '@/constants/monitor';

export const Memory = memo<CellContext<AppListItemType, unknown>>(
  ({ row }) => {
    const item = row.original;
    return (
      <PodLineChart
        type="green"
        data={item.usedMemory || EMPTY_MONITOR_DATA}
        className="h-9 w-44"
      />
    );
  },
  (prev, next) => {
    const prevData = prev.row.original.usedMemory;
    const nextData = next.row.original.usedMemory;
    return (
      prev.row.original.id === next.row.original.id &&
      JSON.stringify(prevData) === JSON.stringify(nextData)
    );
  }
);

Memory.displayName = 'Memory';
