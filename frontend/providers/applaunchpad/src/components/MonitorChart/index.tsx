import React, { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts';
import { useGlobalStore } from '@/store/global';
import dayjs from 'dayjs';
import { LineStyleMap } from '@/constants/monitor';
import { Flex, FlexProps, Text } from '@chakra-ui/react';
import MyIcon from '../Icon';
import { useTranslation } from 'next-i18next';
import styles from './index.module.css';

type MonitorChart = FlexProps & {
  data: {
    xData: string[];
    yData: {
      name: string;
      type: string;
      data: number[];
      lineStyleType?: string;
    }[];
  };
  type?: 'blue' | 'deepBlue' | 'green' | 'purple';
  title: string;
  yAxisLabelFormatter?: (value: number) => string;
  yDataFormatter?: (values: number[]) => number[];
  unit?: string;
  isShowLegend?: boolean;
};

const MonitorChart = ({
  type,
  data,
  title,
  yAxisLabelFormatter,
  yDataFormatter,
  unit,
  isShowLegend = true,
  ...props
}: MonitorChart) => {
  const { screenWidth } = useGlobalStore();
  const chartDom = useRef<HTMLDivElement>(null);
  const myChart = useRef<echarts.ECharts>();
  const { t } = useTranslation();

  const option = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis',
        enterable: true,
        extraCssText: `
          box-shadow: none; 
          padding: 0; 
          background-color: transparent; 
          border: none;
        `,
        formatter: (params: any) => {
          let axisValue = params[0]?.axisValue;
          return `
            <div class="${styles.tooltip}">
              <div class="${styles.tooltipHeader}">${axisValue}</div>
              ${params
                .map(
                  (item: any) => `
                    <div class="${styles.tooltipItem}">
                      <span class="${styles.tooltipDot}" style="background: ${item.color}"></span>
                      <span class="${styles.tooltipName}">${item.seriesName}</span>
                      <span class="${styles.tooltipValue}">${item.value}${unit || ''}</span>
                      <button class="${styles.tooltipButton}" onclick="(() => {
                        const currentUrl = window.location.href;
                        const urlParams = currentUrl.split('?')[1] || '';
                        const baseUrl = window.location.pathname.replace('/monitor', '/logs');
                        const separator = urlParams ? '?' : '';
                        window.location.href = baseUrl + separator + urlParams + (urlParams ? '&' : '?') + 'pod=${
                          item.seriesName
                        }';
                      })()">${t('logs')}
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path fill-rule="evenodd" clip-rule="evenodd" d="M6.64645 2.64645C6.45118 2.84171 6.45118 3.15829 6.64645 3.35355L8.79289 5.5H2C1.72386 5.5 1.5 5.72386 1.5 6C1.5 6.27614 1.72386 6.5 2 6.5H8.79289L6.64645 8.64645C6.45118 8.84171 6.45118 9.15829 6.64645 9.35355C6.84171 9.54882 7.15829 9.54882 7.35355 9.35355L10.3536 6.35355C10.5488 6.15829 10.5488 5.84171 10.3536 5.64645L7.35355 2.64645C7.15829 2.45118 6.84171 2.45118 6.64645 2.64645Z" fill="#667085"/>
                        </svg>
                      </button>
                    </div>
                  `
                )
                .join('')}
            </div>
          `;
        },

        // @ts-ignore
        position: (point, params, dom, rect, size) => {
          let xPos = point[0];
          let yPos = point[1] + 10;
          let chartWidth = size.viewSize[0];
          let chartHeight = size.viewSize[1];
          let tooltipWidth = dom.offsetWidth;
          let tooltipHeight = dom.offsetHeight;

          if (xPos + tooltipWidth > chartWidth) {
            xPos = xPos - tooltipWidth;
          }

          if (xPos < 0) {
            xPos = 0;
          }

          return [xPos, yPos];
        }
      },
      grid: {
        left: '4px',
        bottom: '4px',
        top: '10px',
        right: '20px',
        containLabel: true
      },
      xAxis: {
        show: true,
        type: 'category',
        offset: 4,
        boundaryGap: false,
        axisLabel: {
          interval: (index: number, value: string) => {
            const total = data?.xData?.length || 0;
            if (index === 0 || index === total - 1) return false;
            return index % Math.floor(total / 6) === 0;
          },
          textStyle: {
            color: '#667085'
          },
          hideOverlap: true
        },
        axisTick: {
          show: false
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: '#E4E7EC',
            type: 'solid'
          }
        },
        data: data?.xData?.map((time) => dayjs(parseFloat(time) * 1000).format('MM-DD HH:mm'))
      },
      yAxis: {
        type: 'value',
        splitNumber: 2,
        max: 100,
        min: 0,
        boundaryGap: false,
        axisLabel: {
          formatter: yAxisLabelFormatter
        },
        axisLine: {
          show: false
        },
        splitLine: {
          lineStyle: {
            type: 'dashed',
            color: '#E4E7EC'
          }
        }
      },
      series: data?.yData?.map((item, index) => {
        return {
          name: item.name,
          data: item.data,
          type: 'line',
          smooth: true,
          showSymbol: false,
          animationDuration: 300,
          animationEasingUpdate: 'linear',
          areaStyle: {
            color: LineStyleMap[index % LineStyleMap.length].backgroundColor
          },
          lineStyle: {
            width: '1',
            color: LineStyleMap[index % LineStyleMap.length].lineColor,
            type: item?.lineStyleType || 'solid'
          },
          itemStyle: {
            width: 1.5,
            color: LineStyleMap[index % LineStyleMap.length].lineColor
          },
          emphasis: {
            // highlight
            disabled: true
          }
        };
      })
    }),
    [data?.xData, data?.yData]
  );

  useEffect(() => {
    if (!chartDom.current) return;

    if (!myChart.current) {
      myChart.current = echarts.init(chartDom.current);
    } else {
      myChart.current.dispose();
      myChart.current = echarts.init(chartDom.current);
    }

    myChart.current.setOption(option);
  }, [data, option]);

  useEffect(() => {
    return () => {
      if (myChart.current) {
        myChart.current.dispose();
      }
    };
  }, []);

  // resize chart
  useEffect(() => {
    if (!myChart.current || !myChart.current.getOption()) return;
    myChart.current.resize();
  }, [screenWidth]);

  return (
    <Flex position={'relative'} height={'100%'} gap={'25px'}>
      <Flex ref={chartDom} flex={'1 1 80%'} />
      {isShowLegend && (
        <Flex
          justifyContent={'center'}
          alignContent={'center'}
          flexDirection={'column'}
          flex={'1 0 20%'}
          gap={'12px'}
        >
          {data?.yData?.map((item, index) => (
            <Flex key={item?.name + index} alignItems={'center'} w={'fit-content'}>
              <MyIcon
                width={'16px'}
                name="chart"
                color={LineStyleMap[index % LineStyleMap.length].lineColor}
                mr="6px"
              />
              <Text fontSize={'11px'} color={'grayModern.900'} fontWeight={500}>
                {item?.name}
              </Text>
            </Flex>
          ))}
        </Flex>
      )}
    </Flex>
  );
};

export default MonitorChart;
