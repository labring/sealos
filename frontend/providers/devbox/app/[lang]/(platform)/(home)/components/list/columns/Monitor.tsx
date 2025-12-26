import { memo } from 'react';
import { type CellContext } from '@tanstack/react-table';

import { DevboxListItemTypeV2 } from '@/types/devbox';
import { generateMockMonitorData } from '@/constants/mock';
import MonitorChart from '@/components/MonitorChart';

interface MonitorProps extends CellContext<DevboxListItemTypeV2, unknown> {
  type: 'cpu' | 'memory';
}

export const Monitor = memo<MonitorProps>(
  ({ row, type }) => {
    const item = row.original;
    const data = type === 'cpu' ? item.usedCpu : item.usedMemory;
    const chartType = type === 'cpu' ? 'blue' : 'green';

    return (
      <MonitorChart
        type={chartType}
        data={data || generateMockMonitorData(item.name)}
        className="h-9 w-44"
      />
    );
  },
  (prev, next) => {
    const prevData =
      prev.type === 'cpu' ? prev.row.original.usedCpu : prev.row.original.usedMemory;
    const nextData =
      next.type === 'cpu' ? next.row.original.usedCpu : next.row.original.usedMemory;

    return (
      prev.row.original.id === next.row.original.id &&
      JSON.stringify(prevData) === JSON.stringify(nextData)
    );
  }
);

Monitor.displayName = 'Monitor';
