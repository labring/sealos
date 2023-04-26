import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { printMemory } from '@/utils/tools';
import { useGlobalStore } from '@/store/global';

const PodLineChart = ({
  type,
  cpu = 1000000,
  data
}: {
  type: 'cpu' | 'memory' | 'green' | 'deepBlue';
  cpu?: number;
  data: number[];
}) => {
  const { screenWidth } = useGlobalStore();

  const Dom = useRef<HTMLDivElement>(null);
  const myChart = useRef<echarts.ECharts>();

  const map = {
    cpu: {
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
      lineColor: '#36ADEF',
      formatter: (e: any) => `${((e[0].value / cpu) * 100).toFixed(2)}%`
    },
    memory: {
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
      lineColor: '#8172D8',
      formatter: (e: any) => printMemory(e[0].value)
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
      formatter: (e: any) => printMemory(e[0].value)
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
      lineColor: '#3293EC',
      formatter: (e: any) => printMemory(e[0].value)
    }
  };

  const option = useRef({
    xAxis: {
      type: 'category',
      show: false,
      boundaryGap: false,
      data: data.map((_, i) => i)
    },
    yAxis: {
      type: 'value',
      show: false,
      boundaryGap: false
    },
    grid: {
      show: false,
      left: 5,
      right: 5,
      top: 5,
      bottom: 5
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'line'
      },
      formatter: map[type].formatter
    },
    series: [
      {
        data: data,
        type: 'line',
        showSymbol: false,
        smooth: true,
        animationDuration: 300,
        animationEasingUpdate: 'linear',
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
        },
        emphasis: {
          // highlight
          disabled: true
        }
      }
    ]
  });

  useEffect(() => {
    if (!Dom.current || myChart?.current?.getOption()) return;
    myChart.current = echarts.init(Dom.current);
    myChart.current && myChart.current.setOption(option.current);
  }, [Dom]);

  // data changed, update
  useEffect(() => {
    if (!myChart.current || !myChart?.current?.getOption()) return;
    const x = option.current.xAxis.data;
    option.current.xAxis.data = [...x.slice(1), x[x.length - 1] + 1];
    option.current.series[0].data = data;
    myChart.current.setOption(option.current);
  }, [data]);

  // resize chart
  useEffect(() => {
    if (!myChart.current || !myChart.current.getOption()) return;
    myChart.current.resize();
  }, [screenWidth]);

  return <div ref={Dom} style={{ width: '100%', height: '100%' }} />;
};

export default PodLineChart;
