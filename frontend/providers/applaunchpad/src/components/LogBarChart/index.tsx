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
          color: 'rgba(3, 190, 232, 0.42)' // 0% 处的颜色
        },
        {
          offset: 1,
          color: 'rgba(0, 182, 240, 0)'
        }
      ],
      global: false // 缺省为 false
    },
    lineColor: '#85CCFF'
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
