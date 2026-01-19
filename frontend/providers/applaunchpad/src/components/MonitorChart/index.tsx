import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import * as echarts from 'echarts';
import { useGlobalStore } from '@/store/global';
import dayjs from 'dayjs';
import { LineStyleMap } from '@/constants/monitor';
import { Button } from '@sealos/shadcn-ui/button';
import { cn } from '@sealos/shadcn-ui';

type MonitorChartProps = React.HTMLAttributes<HTMLDivElement> & {
  data: {
    xData: string[];
    yData: {
      name: string;
      type: string;
      data: number[];
      lineStyleType?: string;
    }[];
  };
  type?: 'blue' | 'deepBlue' | 'green' | 'purple' | 'cpu' | 'memory' | 'storage' | 'network';
  title: string;
  yAxisLabelFormatter?: (value: number) => string;
  yDataFormatter?: (values: number[]) => number[];
  xAxisLabelFormatter?: (value: string) => string;
  xAxisTooltipFormatter?: (value: string) => string;
  yAxisConfig?: {
    min?: number;
    max?: number;
    interval?: number;
    splitNumber?: number;
  };
  displayNameFormatter?: (params: {
    seriesName: string;
    seriesIndex: number;
    appName?: string;
    type?: string;
  }) => string;
  seriesNameFormatter?: (params: {
    seriesName: string;
    displayName: string;
    seriesIndex: number;
    appName?: string;
    type?: string;
  }) => string;
  unit?: string;
  isShowLegend?: boolean;
  lineWidth?: number;
  appName?: string;
};

const MonitorChart = ({
  type,
  data,
  title,
  yAxisLabelFormatter,
  yDataFormatter,
  xAxisLabelFormatter,
  xAxisTooltipFormatter,
  yAxisConfig,
  displayNameFormatter,
  seriesNameFormatter,
  unit,
  isShowLegend = true,
  lineWidth = 1.2,
  appName,
  className,
  ...props
}: MonitorChartProps) => {
  const { screenWidth } = useGlobalStore();
  const chartDom = useRef<HTMLDivElement>(null);
  const myChart = useRef<echarts.ECharts>();
  const seriesNames = useMemo(() => data?.yData?.map((item) => item.name) || [], [data?.yData]);
  const seriesIndexMap = useMemo(
    () => new Map(seriesNames.map((name, index) => [name, index])),
    [seriesNames]
  );
  const [selectedSeries, setSelectedSeries] = useState<Set<string>>(new Set(seriesNames));

  useEffect(() => {
    setSelectedSeries(new Set(seriesNames));
  }, [seriesNames]);

  const getDisplayName = useCallback(
    (seriesName: string, seriesIndex: number) => {
      if (displayNameFormatter) {
        return displayNameFormatter({ seriesName, seriesIndex, appName, type });
      }
      if (type === 'cpu' || type === 'memory') {
        const displayIndex = String(seriesIndex + 1).padStart(2, '0');
        return `Replica-${displayIndex}`;
      }
      return seriesName;
    },
    [appName, displayNameFormatter, type]
  );

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
          const axisIndex = params?.[0]?.dataIndex ?? 0;
          const rawTime = data?.xData?.[axisIndex];
          const axisValue = rawTime
            ? xAxisTooltipFormatter
              ? xAxisTooltipFormatter(rawTime)
              : dayjs(parseFloat(rawTime) * 1000).format('YYYY-MM-DD HH:mm')
            : params[0]?.axisValue;
          return `
            <div class="bg-white w-[260px] rounded-lg p-4 border-[0.5px] border-zinc-200 shadow-xs">
              <div class="text-sm font-medium text-zinc-900 mb-1.5 pb-1.5 border-b border-zinc-100 flex">
                ${axisValue}
              </div>
              ${params
                .map((item: any) => {
                  const seriesName = item.seriesName || '';
                  const seriesIndex = seriesIndexMap.get(seriesName) ?? 0;
                  const displayName = getDisplayName(seriesName, seriesIndex);
                  const displaySeriesName = seriesNameFormatter
                    ? seriesNameFormatter({
                        seriesName,
                        displayName,
                        seriesIndex,
                        appName,
                        type
                      })
                    : appName
                    ? `${displayName}-${appName}`
                    : seriesName;
                  return `
                    <div class="flex flex-col gap-[2px] mb-1.5">
                      <div class="flex gap-2 items-center">
                        <span class="inline-block w-2 h-2 rounded-full" style="background: ${
                          item.color
                        }"></span>
                        <div class="text-sm font-medium text-zinc-900">${displayName}</div>
                      </div>
                      <div class="flex items-center justify-between gap-4">
                       <div class="text-sm font-normal text-zinc-500 truncate">${displaySeriesName}</div>
                        <span class="min-w-14 w-fit text-right text-sm font-medium text-zinc-900">${
                          item.value
                        }${unit || ''}</span>
                      </div>
                    </div>
                  `;
                })
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
          formatter: (value: string) =>
            xAxisLabelFormatter
              ? xAxisLabelFormatter(value)
              : dayjs(parseFloat(value) * 1000).format('MM-DD HH:mm'),
          textStyle: {
            fontSize: 14,
            fontWeight: 400,
            color: '#71717A'
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
        data: data?.xData || []
      },
      yAxis: {
        type: 'value',
        splitNumber: yAxisConfig?.splitNumber ?? 4,
        interval: yAxisConfig?.interval ?? 25,
        max: yAxisConfig?.max ?? 100,
        min: yAxisConfig?.min ?? 0,
        boundaryGap: false,
        axisLabel: {
          formatter: yAxisLabelFormatter,
          textStyle: {
            fontSize: 14,
            fontWeight: 400,
            color: '#71717A'
          }
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
      series: data?.yData
        ?.map((item, index) => {
          if (!selectedSeries.has(item.name)) return null;
          const formattedData = yDataFormatter ? yDataFormatter(item.data) : item.data;
          return {
            name: item.name,
            data: formattedData,
            type: 'line',
            smooth: false,
            showSymbol: false,
            animationDuration: 300,
            animationEasingUpdate: 'linear',
            lineStyle: {
              width: lineWidth,
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
        .filter(Boolean)
    }),
    [
      appName,
      data?.xData,
      data?.yData,
      getDisplayName,
      lineWidth,
      selectedSeries,
      seriesIndexMap,
      seriesNameFormatter,
      type,
      unit,
      xAxisLabelFormatter,
      xAxisTooltipFormatter,
      yAxisConfig?.interval,
      yAxisConfig?.max,
      yAxisConfig?.min,
      yAxisConfig?.splitNumber,
      yAxisLabelFormatter,
      yDataFormatter
    ]
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
    <div className={cn('relative w-full h-full min-h-[200px] flex gap-6', className)} {...props}>
      <div ref={chartDom} className="flex-1 min-w-0 h-full min-h-[200px]" />
      {isShowLegend && (
        <div className="flex flex-col gap-2 w-[217px] flex-[0_0_217px]">
          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-normal text-zinc-500">Replica filters</span>
            <button
              type="button"
              className="text-sm font-normal text-blue-600 hover:underline"
              onClick={() => setSelectedSeries(new Set(seriesNames))}
            >
              show all
            </button>
          </div>
          <div className="max-h-[200px] overflow-y-auto scrollbar-hide">
            {data?.yData?.map((item, index) => {
              const isSelected = selectedSeries.has(item.name);
              const displayName = getDisplayName(item.name, index);
              return (
                <Button
                  key={item?.name + index}
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setSelectedSeries((prev) => {
                      const next = new Set(prev);
                      if (next.has(item.name)) {
                        next.delete(item.name);
                      } else {
                        next.add(item.name);
                      }
                      return next;
                    })
                  }
                  className={cn(
                    'relative mb-2 flex h-9 w-[217px] items-center justify-between gap-2 px-3 border-[0.5px] rounded-lg shadow-none hover:bg-zinc-100',
                    isSelected ? 'bg-zinc-100' : ''
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="relative h-3 w-4">
                      <span
                        className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 rounded-full"
                        style={{
                          backgroundColor: LineStyleMap[index % LineStyleMap.length].lineColor
                        }}
                      />
                      <span
                        className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
                        style={{
                          boxShadow: `0 0 0 2px ${
                            LineStyleMap[index % LineStyleMap.length].lineColor
                          }`
                        }}
                      />
                    </span>
                    <span className="text-sm font-normal text-zinc-900">{displayName}</span>
                  </span>
                  {isSelected && (
                    <Check className="absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-blue-600" />
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MonitorChart;
