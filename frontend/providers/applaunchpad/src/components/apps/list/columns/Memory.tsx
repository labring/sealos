import { memo } from 'react';
import { type CellContext } from '@tanstack/react-table';
import dynamic from 'next/dynamic';

import { AppListItemType } from '@/types/app';
import { EMPTY_MONITOR_DATA } from '@/constants/monitor';

const PodLineChart = dynamic(() => import('@/components/PodLineChart'), {
  ssr: false
});

export const Memory = memo<CellContext<AppListItemType, unknown>>(
  ({ row }) => {
    const item = row.original;
    return (
      <div className="w-full pr-10">
        <PodLineChart
          type="green"
          data={item.usedMemory || EMPTY_MONITOR_DATA}
          className="h-9 max-w-[300px]"
        />
      </div>
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
