import { memo } from 'react';
import { type CellContext } from '@tanstack/react-table';
import dynamic from 'next/dynamic';

import { AppListItemType } from '@/types/app';
import { EMPTY_MONITOR_DATA } from '@/constants/monitor';

const PodLineChart = dynamic(() => import('@/components/PodLineChart'), {
  ssr: false
});

export const CPU = memo<CellContext<AppListItemType, unknown>>(
  ({ row }) => {
    const item = row.original;
    return (
      <div className="w-full pr-10">
        <PodLineChart
          type="blue"
          data={item.usedCpu || EMPTY_MONITOR_DATA}
          className="h-9 max-w-[300px]"
        />
      </div>
    );
  },
  (prev, next) => {
    const prevData = prev.row.original.usedCpu;
    const nextData = next.row.original.usedCpu;
    return (
      prev.row.original.id === next.row.original.id &&
      JSON.stringify(prevData) === JSON.stringify(nextData)
    );
  }
);

CPU.displayName = 'CPU';
