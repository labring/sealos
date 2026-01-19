import React, { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts';
import { useGlobalStore } from '@/store/global';
import { MonitorDataResult } from '@/types/monitor';
import dayjs from 'dayjs';
import { cn } from '@sealos/shadcn-ui';

const map = {
  blue: {
    backgroundColor: 'rgba(73, 174, 255, 0.3)',
    lineColor: '#49AEFF'
  },
  green: {
    backgroundColor: 'rgba(0, 209, 181, 0.3)',
    lineColor: '#00D1B5'
  },
  deepBlue: {
    backgroundColor: 'rgba(81, 125, 255, 0.3)',
    lineColor: '#517DFF'
  },
  purple: {
    backgroundColor: 'rgba(139, 139, 255, 0.3)',
    lineColor: '#8B8BFF'
  }
};

const PodLineChart = ({
  type,
  data,
  isShowLabel = false,
  isShowText = true,
  className
}: {
  type: 'blue' | 'deepBlue' | 'green' | 'purple';
  data?: MonitorDataResult;
  isShowLabel?: boolean;
  isShowText?: boolean;
  className?: string;
}) => {
  const { screenWidth } = useGlobalStore();
  const xData =
    data?.xData?.map((time) => (time ? dayjs(time * 1000).format('YYYY-MM-DD HH:mm') : '')) ||
    new Array(30).fill(0);
  const yData = data?.yData || new Array(30).fill('');

  const Dom = useRef<HTMLDivElement>(null);
  const myChart = useRef<echarts.ECharts>();

  const optionStyle = useMemo(
    () => ({
      areaStyle: {
        color: map[type].backgroundColor
      },
      lineStyle: {
        width: '1',
        color: map[type].lineColor
      },
      itemStyle: {
        width: 1.5,
        color: map[type].lineColor
      }
    }),
    [type]
  );
  const option = useRef({
    xAxis: {
      type: 'category',
      show: isShowLabel,
      boundaryGap: false,
      data: xData,
      axisLabel: {
        show: isShowLabel
      },
      axisTick: {
        show: false
      },
      axisLine: {
        show: false
      }
    },
    yAxis: {
      type: 'value',
      boundaryGap: false,
      splitNumber: 2,
      max: 100,
      min: 0,
      interval: 50,
      axisLabel: {
        show: isShowLabel,
        formatter: '{value}'
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: '#EBEBEB'
        }
      }
    },
    grid: {
      containLabel: isShowLabel,
      show: false,
      left: '2%',
      right: isShowLabel ? '4%' : 0,
      top: 10,
      bottom: 2
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'line'
      },
      appendToBody: true,
      extraCssText: `
        box-shadow: none;
        padding: 0;
        background-color: transparent;
        border: none;
      `,
      formatter: (params: any[]) => {
        const xValue = params[0]?.axisValue;
        const yValue = params[0]?.value ?? 0;
        return `
          <div class="bg-white min-w-[127px] rounded-lg py-3 px-[10px] border-[0.5px] border-zinc-200 shadow-xs">
            <div class="text-xs font-medium text-zinc-900 mb-1">
              ${xValue || ''}
            </div>
            <div class="flex items-center gap-2">
              <span class="inline-block w-2 h-2 rounded-xs" style="background: ${
                map[type].lineColor
              }"></span>
              <span class="text-xs font-medium text-zinc-900">${yValue}%</span>
            </div>
          </div>
        `;
      }
    },
    series: [
      {
        data: yData,
        type: 'line',
        showSymbol: false,
        smooth: true,
        animationDuration: 300,
        animationEasingUpdate: 'linear',
        ...optionStyle,
        emphasis: {
          disabled: true
        }
      }
    ]
  });

  // init chart
  useEffect(() => {
    if (!Dom.current || myChart?.current?.getOption()) return;
    myChart.current = echarts.init(Dom.current);
    myChart.current && myChart.current.setOption(option.current);
  }, [Dom]);

  // data changed, update
  useEffect(() => {
    if (!myChart.current || !myChart?.current?.getOption()) return;
    option.current.xAxis.data = xData;
    option.current.series[0].data = yData;
    myChart.current.setOption(option.current);
  }, [xData, yData]);

  // type changed, update
  useEffect(() => {
    if (!myChart.current || !myChart?.current?.getOption()) return;
    option.current.series[0] = {
      ...option.current.series[0],
      ...optionStyle
    };
    myChart.current.setOption(option.current);
  }, [optionStyle]);

  // resize chart
  useEffect(() => {
    if (!myChart.current || !myChart.current.getOption()) return;
    myChart.current.resize();
  }, [screenWidth]);

  return (
    <div className={cn('relative h-full w-full', className)}>
      <div ref={Dom} style={{ width: '100%', height: '100%' }} />
      {isShowText && (
        <span className="pointer-events-none absolute right-0 bottom-0.5 text-xs font-medium text-zinc-600 [text-shadow:1px_1px_0_#FFF,-1px_-1px_0_#FFF,1px_-1px_0_#FFF,-1px_1px_0_#FFF]">
          {data?.yData[data?.yData?.length - 1]}%
        </span>
      )}
    </div>
  );
};

export default React.memo(PodLineChart);
