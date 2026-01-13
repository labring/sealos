import dayjs from 'dayjs';
import * as echarts from 'echarts';
import React, { useEffect, useMemo, useRef } from 'react';

import { useGlobalStore } from '@/store/global';
import { MonitorDataResult } from '@/types/monitor';

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
          color: 'rgba(147, 197, 253, 0.42)' // Tailwind blue-300
        },
        {
          offset: 1,
          color: 'rgba(147, 197, 253, 0)'
        }
      ],
      global: false
    },
    lineColor: '#93C5FD' // Tailwind blue-300
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
          color: 'rgba(59, 130, 246, 0.42)' // Tailwind blue-500
        },
        {
          offset: 1,
          color: 'rgba(59, 130, 246, 0)'
        }
      ],
      global: false
    },
    lineColor: '#3B82F6' // Tailwind blue-500
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
          color: 'rgba(192, 132, 252, 0.42)' // Tailwind purple-400
        },
        {
          offset: 1,
          color: 'rgba(192, 132, 252, 0)'
        }
      ],
      global: false
    },
    lineColor: '#C084FC' // Tailwind purple-400
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
          color: 'rgba(16, 185, 129, 0.42)' // Tailwind emerald-500
        },
        {
          offset: 1,
          color: 'rgba(16, 185, 129, 0)'
        }
      ],
      global: false
    },
    lineColor: '#10B981', // Tailwind emerald-500
    max: 100
  }
};

const LogBarChart = ({
  type,
  data,
  isShowLabel = false,
  visible = true
}: {
  type: 'blue' | 'deepBlue' | 'green' | 'purple';
  data?: MonitorDataResult;
  isShowLabel?: boolean;
  visible?: boolean;
}) => {
  const { screenWidth } = useGlobalStore();
  const xData = useMemo(
    () =>
      data?.xData?.map((time) => dayjs(time * 1000).format('MM-DD HH:mm')) || new Array(30).fill(0),
    [data?.xData]
  );
  const yData = data?.yData || new Array(30).fill('');

  const Dom = useRef<HTMLDivElement>(null);
  const myChart = useRef<echarts.ECharts>();
  const resizeObserver = useRef<ResizeObserver>();

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
      data: xData,
      boundaryGap: true,
      axisLine: {
        lineStyle: {
          color: '#E8EBF0'
        }
      },
      axisLabel: {
        color: '#667085'
      }
    },
    yAxis: {
      type: 'value',
      splitNumber: 3,
      splitLine: {
        lineStyle: {
          type: 'dashed',
          color: '#E4E7EC'
        }
      }
    },
    series: [
      {
        data: yData,
        type: 'bar',
        animationDuration: 300,
        barWidth: '90%',
        ...optionStyle
      }
    ],
    grid: {
      left: 0,
      right: 0,
      bottom: 0,
      top: 5,
      containLabel: true
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'line'
      },
      formatter: (params: any[]) => {
        const axisValue = params[0]?.axisValue;
        return `${axisValue} ${params[0]?.value || 0}`;
      }
    }
  });

  // init chart
  useEffect(() => {
    if (!Dom.current || myChart?.current?.getOption() || !visible) return;
    myChart.current = echarts.init(Dom.current);
    myChart.current && myChart.current.setOption(option.current);
  }, [Dom, visible]);

  // data changed, update
  useEffect(() => {
    if (!myChart.current || !myChart?.current?.getOption() || !visible) return;
    option.current.xAxis.data = xData;
    option.current.series[0].data = yData;
    myChart.current.setOption(option.current);
  }, [xData, yData, visible]);

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

  useEffect(() => {
    if (!Dom.current || !visible) return;

    resizeObserver.current = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry?.contentRect && myChart.current) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          myChart.current.resize();
        }
      }
    });

    resizeObserver.current.observe(Dom.current);

    return () => {
      resizeObserver.current?.disconnect();
    };
  }, [visible]);

  useEffect(() => {
    return () => {
      if (myChart.current) {
        myChart.current.dispose();
      }
      resizeObserver.current?.disconnect();
    };
  }, []);

  return <div ref={Dom} style={{ width: '100%', height: '140px' }} />;
};

export default LogBarChart;
