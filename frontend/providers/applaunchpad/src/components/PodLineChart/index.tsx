import React, { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts';
import { useGlobalStore } from '@/store/global';
import { MonitorDataResult } from '@/types/monitor';
import dayjs from 'dayjs';
import { cn } from '@sealos/shadcn-ui';

const map = {
  blue: {
    backgroundColor: 'rgba(229, 243, 255, 0.3)',
    lineColor: '#49AEFF'
  },
  green: {
    backgroundColor: 'rgba(214, 245, 241, 0.3)',
    lineColor: '#00D1B5'
  },
  deepBlue: {
    backgroundColor: 'rgba(47, 112, 237, 0.3)',
    lineColor: '#3293EC'
  },
  purple: {
    backgroundColor: 'rgba(211, 190, 255, 0.3)',
    lineColor: '#8172D8'
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
    data?.xData?.map((time) => (time ? dayjs(time * 1000).format('MM-DD HH:mm') : '')) ||
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
      borderRadius: 6,
      formatter: (params: any[]) => {
        const xValue = params[0]?.axisValue;
        const yValue = params[0]?.value;
        return `
          <div>
            <div style="font-size: 12px; margin-bottom: 6px; font-weight: 500; color: #09090B;">
              ${xValue || ''}
            </div>
            <div style="display: flex; align-items: center; font-size: 12px; font-weight: 500;">
              <span style="display: inline-block; width: 8px; height: 8px; background-color: ${
                map[type].lineColor
              }; margin-right: 8px; border-radius: 2px;"></span>
              <span style="color: #09090B;">${yValue || 0}%</span>
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
