import React, { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts';
import { useGlobalStore } from '@/store/global';
import { MonitorDataResult } from '@/types/monitor';
import dayjs from 'dayjs';

const map = {
  blue: {
    backgroundColor: {
      type: 'linear',
      x: 0,
      y: 0,
      x2: 0,
      y2: 1,
      colorStops: [
        {
          offset: 0,
          color: 'rgba(3, 190, 232, 0.42)' // 0% 处的颜色
        },
        {
          offset: 1,
          color: 'rgba(0, 182, 240, 0)'
        }
      ],
      global: false // 缺省为 false
    },
    lineColor: '#36ADEF'
  },
  deepBlue: {
    backgroundColor: {
      type: 'linear',
      x: 0,
      y: 0,
      x2: 0,
      y2: 1,
      colorStops: [
        {
          offset: 0,
          color: 'rgba(47, 112, 237, 0.42)' // 0% 处的颜色
        },
        {
          offset: 1,
          color: 'rgba(94, 159, 235, 0)'
        }
      ],
      global: false
    },
    lineColor: '#3293EC'
  },
  purple: {
    backgroundColor: {
      type: 'linear',
      x: 0,
      y: 0,
      x2: 0,
      y2: 1,
      colorStops: [
        {
          offset: 0,
          color: 'rgba(211, 190, 255, 0.42)' // 0% 处的颜色
        },
        {
          offset: 1,
          color: 'rgba(52, 60, 255, 0)'
        }
      ],
      global: false // 缺省为 false
    },
    lineColor: '#8172D8'
  },
  green: {
    backgroundColor: {
      type: 'linear',
      x: 0,
      y: 0,
      x2: 0,
      y2: 1,
      colorStops: [
        {
          offset: 0,
          color: 'rgba(4, 209, 148, 0.42)' // 0% 处的颜色
        },
        {
          offset: 1,
          color: 'rgba(19, 217, 181, 0)'
        }
      ],
      global: false // 缺省为 false
    },
    lineColor: '#00A9A6',
    max: 100
  }
};

const PodLineChart = ({
  type,
  data,
  isShowLabel = false
}: {
  type: 'blue' | 'deepBlue' | 'green' | 'purple';
  data?: MonitorDataResult;
  isShowLabel?: boolean;
}) => {
  const { screenWidth } = useGlobalStore();
  const xData =
    data?.xData?.map((time) => (time ? dayjs(time * 1000).format('HH:mm') : '')) ||
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
      axisLabel: {
        show: isShowLabel
      }
    },
    grid: {
      containLabel: isShowLabel,
      show: false,
      left: 0,
      right: isShowLabel ? 14 : 0,
      top: 10,
      bottom: 2
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'line'
      },
      formatter: (params: any[]) => {
        const axisValue = params[0]?.axisValue;
        return `${axisValue} ${params[0]?.value || 0}%`;
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

  return <div ref={Dom} style={{ width: '100%', height: '100%' }} />;
};

export default React.memo(PodLineChart);
