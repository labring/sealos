import React, { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts';
import { useGlobalStore } from '@/store/global';
import { cn } from '@sealos/shadcn-ui';

const colorMap = {
  blue: {
    main: '#60A5FA',
    background: 'rgba(96, 165, 250, 0.3)'
  },
  green: {
    main: '#00D1B5',
    background: 'rgba(0, 209, 181, 0.2)'
  },
  deepBlue: {
    main: '#517DFF',
    background: 'rgba(81, 125, 255, 0.2)'
  },
  purple: {
    main: '#8B8BFF',
    background: 'rgba(139, 139, 255, 0.2)'
  }
};

const PodPieChart = ({
  type = 'blue',
  value = 0,
  className
}: {
  type?: 'blue' | 'deepBlue' | 'green' | 'purple';
  value?: number;
  className?: string;
}) => {
  const { screenWidth } = useGlobalStore();
  const chartRef = useRef<HTMLDivElement>(null);
  const myChart = useRef<echarts.ECharts>();

  const colors = useMemo(() => colorMap[type], [type]);
  const displayValue = useMemo(() => Math.min(100, Math.max(0, value)), [value]);

  const option = useMemo(
    () => ({
      series: [
        {
          type: 'pie',
          radius: ['70%', '90%'],
          avoidLabelOverlap: false,
          label: {
            show: true,
            position: 'center',
            formatter: `${displayValue}%`,
            fontSize: 20,
            fontWeight: 600,
            color: '#18181B'
          },
          labelLine: {
            show: false
          },
          data: [
            {
              value: displayValue,
              name: 'Used',
              itemStyle: {
                color: colors.main
              }
            },
            {
              value: 100 - displayValue,
              name: 'Free',
              itemStyle: {
                color: '#F4F4F5'
              }
            }
          ],
          emphasis: {
            disabled: true
          }
        }
      ]
    }),
    [displayValue, colors]
  );

  // init chart
  useEffect(() => {
    if (!chartRef.current) return;

    if (!myChart.current) {
      myChart.current = echarts.init(chartRef.current);
    }
    myChart.current.setOption(option);
  }, [option]);

  // resize chart
  useEffect(() => {
    if (!myChart.current) return;
    myChart.current.resize();
  }, [screenWidth]);

  return (
    <div className={cn('relative h-full min-h-0 w-full', className)}>
      <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default React.memo(PodPieChart);
