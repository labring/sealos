import React, { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts';
import { useGlobalStore } from '@/store/global';

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
  limit = 1000000,
  data
}: {
  type: 'blue' | 'deepBlue' | 'green' | 'purple';
  limit: number;
  data: number[];
}) => {
  const { screenWidth } = useGlobalStore();

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
      show: false,
      boundaryGap: false,
      data: data.map((_, i) => i)
    },
    yAxis: {
      type: 'value',
      boundaryGap: false,
      splitNumber: 2,
      max: 100,
      min: 0
    },
    grid: {
      show: false,
      left: 0,
      right: 0,
      top: 0,
      bottom: 2
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'line'
      },
      formatter: (e: any[]) => `${e[0]?.value || 0}%`
    },
    series: [
      {
        data: new Array(data.length).fill(0),
        type: 'line',
        showSymbol: false,
        smooth: true,
        animationDuration: 300,
        animationEasingUpdate: 'linear',
        ...optionStyle,
        emphasis: {
          // highlight
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

    const uniData = data.map((item) => ((item / limit) * 100).toFixed(2));

    const x = option.current.xAxis.data;
    option.current.xAxis.data = [...x.slice(1), x[x.length - 1] + 1];
    option.current.series[0].data = uniData;
    myChart.current.setOption(option.current);
  }, [data, limit]);

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
