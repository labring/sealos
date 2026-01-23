import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import * as echarts from 'echarts';
import { useGlobalStore } from '@/store/global';
import dayjs from 'dayjs';
import { LineStyleMap, NetworkLineStyleMap } from '@/constants/monitor';
import { Button } from '@sealos/shadcn-ui/button';
import { cn } from '@sealos/shadcn-ui';
import { Tooltip, TooltipContent, TooltipTrigger } from '@sealos/shadcn-ui/tooltip';
import { useTranslation } from 'next-i18next';

type MonitorChartProps = React.HTMLAttributes<HTMLDivElement> & {
  data: {
    xData: string[];
    yData: {
      name: string;
      type: string;
      data: Array<number | null>;
      lineStyleType?: string;
    }[];
  };
  type?: 'blue' | 'deepBlue' | 'green' | 'purple' | 'cpu' | 'memory' | 'storage' | 'network';
  title: string;
  yAxisLabelFormatter?: (value: number) => string;
  yDataFormatter?: (values: Array<number | null>) => Array<number | null>;
  xAxisLabelFormatter?: (value: string) => string;
  xAxisTooltipFormatter?: (value: string) => string;
  yAxisConfig?: {
    min?: number | ((value: { min: number; max: number }) => number);
    max?: number | ((value: { min: number; max: number }) => number);
    interval?: number;
    splitNumber?: number;
  };
  yAxisUseNative?: boolean;
  displayNameFormatter?: (params: {
    seriesName: string;
    seriesIndex: number;
    appName?: string;
    type?: string;
  }) => string;
  unit?: string;
  isShowLegend?: boolean;
  lineWidth?: number;
  appName?: string;
  /** All active pod names (used to distinguish active vs deprecated pods) */
  activePodNames?: string[];
  /** Checked pod names from header (only these active pods will be shown in legend and chart) */
  checkedPodNames?: string[];
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
  yAxisUseNative,
  displayNameFormatter,
  unit,
  isShowLegend = true,
  lineWidth = 1.5,
  appName,
  activePodNames,
  checkedPodNames,
  className,
  ...props
}: MonitorChartProps) => {
  const { t } = useTranslation();
  const { screenWidth } = useGlobalStore();
  const chartDom = useRef<HTMLDivElement>(null);
  const myChart = useRef<echarts.ECharts>();
  const seriesNames = useMemo(() => data?.yData?.map((item) => item.name) || [], [data?.yData]);
  const seriesIndexMap = useMemo(
    () => new Map(seriesNames.map((name, index) => [name, index])),
    [seriesNames]
  );
  const [selectedSeries, setSelectedSeries] = useState<Set<string>>(new Set(seriesNames));

  // For cpu/memory charts, only show checked pods in legend (but deprecated pods always in chart)
  const isCpuOrMemoryType = type === 'cpu' || type === 'memory';
  const legendData = useMemo(() => {
    if (!data?.yData) return [];
    if (isCpuOrMemoryType && checkedPodNames) {
      // Filter to only show checked pods in legend
      const checkedPodSet = new Set(checkedPodNames);
      return data.yData.filter((item) => checkedPodSet.has(item.name));
    }
    return data.yData;
  }, [data?.yData, checkedPodNames, isCpuOrMemoryType]);

  // Active pod names for legend filtering and "show all" button
  const legendSeriesNames = useMemo(() => legendData.map((item) => item.name), [legendData]);
  const filterLabel =
    type === 'cpu' || type === 'memory'
      ? t('replica_filtering')
      : type === 'storage'
      ? t('volume_filtering')
      : t('status_filtering');

  useEffect(() => {
    const nextSelected = new Set(seriesNames);
    if (type === 'network') {
      nextSelected.delete('2xx');
    }
    setSelectedSeries(nextSelected);
  }, [seriesNames, type]);

  // Network status code display info (code prefix and label separately for styling)
  const networkStatusCodeInfo: Record<string, { code: string; label: string }> = useMemo(
    () => ({
      '2xx': { code: '2xx', label: 'success' },
      '3xx': { code: '3xx', label: 'redirect' },
      '4xx': { code: '4xx', label: 'client err' },
      '5xx': { code: '5xx', label: 'server err' }
    }),
    []
  );

  const getNetworkDisplayInfo = useCallback(
    (seriesName: string): { code: string; label: string } | null => {
      return networkStatusCodeInfo[seriesName] || null;
    },
    [networkStatusCodeInfo]
  );

  const getDisplayName = useCallback(
    (seriesName: string, seriesIndex: number) => {
      if (displayNameFormatter) {
        return displayNameFormatter({ seriesName, seriesIndex, appName, type });
      }
      if (type === 'cpu' || type === 'memory') {
        const displayIndex = String(seriesIndex + 1).padStart(2, '0');
        return `Replica-${displayIndex}`;
      }
      if (type === 'network') {
        const info = networkStatusCodeInfo[seriesName];
        return info ? `${info.code} ${info.label}` : seriesName;
      }
      return seriesName;
    },
    [appName, displayNameFormatter, networkStatusCodeInfo, type]
  );

  const getSeriesLineColor = useCallback(
    (seriesName: string, seriesIndex: number) => {
      if (type === 'network') {
        return (
          NetworkLineStyleMap[seriesName]?.lineColor ||
          LineStyleMap[seriesIndex % LineStyleMap.length].lineColor
        );
      }
      return LineStyleMap[seriesIndex % LineStyleMap.length].lineColor;
    },
    [type]
  );

  const option = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis',
        // Prevent tooltip DOM from capturing pointer, so hover keeps tracking chart.
        enterable: false,
        extraCssText: `
          box-shadow: none; 
          padding: 0; 
          background-color: transparent; 
          border: none;
          pointer-events: none;
          z-index: 9999;
        `,
        formatter: (params: any) => {
          const formatValue = (value: number | null | undefined) => {
            if (value === null || value === undefined || Number.isNaN(value)) return '-';
            return value;
          };
          const axisIndex = params?.[0]?.dataIndex ?? 0;
          const rawTime = data?.xData?.[axisIndex];
          const axisValue = rawTime
            ? xAxisTooltipFormatter
              ? xAxisTooltipFormatter(rawTime)
              : dayjs(parseFloat(rawTime) * 1000).format('YYYY-MM-DD HH:mm')
            : params[0]?.axisValue;
          const isCpuOrMemory = type === 'cpu' || type === 'memory';
          const isNetwork = type === 'network';
          return `
            <div class="bg-white min-w-[260px] rounded-lg p-4 border-[0.5px] border-zinc-200 shadow-xs">
              <div class="text-sm font-medium text-zinc-900 mb-1.5 pb-1.5 border-b border-zinc-100 flex">
                ${axisValue}
              </div>
              ${params
                .map((item: any, index: number) => {
                  const isLastItem = index === params.length - 1;
                  const seriesName = item.seriesName || '';
                  if (!isCpuOrMemory) {
                    const displayName = isNetwork
                      ? (() => {
                          const info = getNetworkDisplayInfo(seriesName);
                          return info
                            ? `<span class="font-medium text-zinc-900">${info.code}</span><span class="font-normal text-zinc-500"> ${info.label}</span>`
                            : seriesName;
                        })()
                      : seriesName;
                    return `
                      <div class="flex items-center justify-between gap-4 ${
                        isLastItem ? '' : 'mb-1.5'
                      }">
                        <div class="flex gap-2 items-center min-w-0">
                          <span class="inline-block w-2 h-2 rounded-full" style="background: ${
                            item.color
                          }"></span>
                          <div class="text-sm truncate">${displayName}</div>
                        </div>
                        <span class="min-w-14 w-fit text-right text-sm font-medium text-zinc-900">${formatValue(
                          item.value
                        )}${unit || ''}</span>
                      </div>
                    `;
                  }
                  const seriesIndex = seriesIndexMap.get(seriesName) ?? 0;
                  const displayName = getDisplayName(seriesName, seriesIndex);
                  return `
                    <div class="flex flex-col gap-[2px] ${isLastItem ? '' : 'mb-1.5'}">
                      <div class="flex gap-2 items-center">
                        <span class="inline-block w-2 h-2 rounded-full" style="background: ${
                          item.color
                        }"></span>
                        <div class="text-sm font-medium text-zinc-900">${displayName}</div>
                      </div>
                      
                      <div class="flex items-center justify-between gap-4">
                        <div class="text-sm font-normal text-zinc-500 truncate">${seriesName}</div>
                        <span class="min-w-14 w-fit text-right text-sm font-medium text-zinc-900">${formatValue(
                          item.value
                        )}${unit || ''}</span>
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
          const offset = 10;
          const verticalOffset = -24;
          const headerHeight = 90; // header height (h-20 = 80px)
          const tooltipWidth = dom.offsetWidth;
          const tooltipHeight = dom.offsetHeight;

          // get the position of the chart container
          const chartContainer = dom.parentElement?.parentElement;
          const chartRect = chartContainer?.getBoundingClientRect();

          if (!chartRect) {
            return [point[0] + offset, point[1] + offset];
          }

          // calculate the position of the tooltip in the viewport
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;

          // the position of the mouse point in the viewport
          const pointInViewportX = chartRect.left + point[0];
          const pointInViewportY = chartRect.top + point[1];

          let xPos = point[0] + offset;
          let yPos = point[1] + offset;

          // horizontal direction flip: if the right edge of the tooltip exceeds the right boundary of the viewport, flip to the left
          if (pointInViewportX + offset + tooltipWidth > viewportWidth) {
            xPos = point[0] - tooltipWidth - offset;
          }
          // if the left edge of the tooltip exceeds the left boundary of the viewport after flipping, stick to the left boundary of the viewport
          if (pointInViewportX + xPos - point[0] < 0) {
            xPos = -chartRect.left;
          }

          // vertical direction flip: if the bottom edge of the tooltip exceeds the bottom boundary of the viewport, flip to the top
          if (pointInViewportY + offset + tooltipHeight > viewportHeight) {
            yPos = point[1] - tooltipHeight - verticalOffset;
          }
          // if the top edge of the tooltip exceeds the header bottom after flipping, stick to below the header
          if (pointInViewportY + yPos - point[1] < headerHeight) {
            yPos = headerHeight - chartRect.top;
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
        interval: yAxisUseNative ? yAxisConfig?.interval : yAxisConfig?.interval ?? 25,
        max: yAxisUseNative ? yAxisConfig?.max : yAxisConfig?.max ?? 100,
        min: yAxisUseNative ? yAxisConfig?.min ?? 0 : yAxisConfig?.min ?? 0,
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
          // For cpu/memory charts with activePodNames:
          // - Active pods (in activePodNames): show only if checked in header AND selected in legend
          // - Deprecated pods (not in activePodNames): always show
          if (isCpuOrMemoryType && activePodNames) {
            const isActivePod = activePodNames.includes(item.name);
            if (isActivePod) {
              // Active pod: must be checked in header AND selected in legend
              const isChecked = checkedPodNames?.includes(item.name) ?? false;
              if (!isChecked || !selectedSeries.has(item.name)) return null;
            }
            // Deprecated pod: always show (no filter)
          } else {
            // For other chart types, use normal selection logic
            if (!selectedSeries.has(item.name)) return null;
          }
          const formattedData = yDataFormatter ? yDataFormatter(item.data) : item.data;
          const seriesLineColor = getSeriesLineColor(item.name, index);
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
              color: seriesLineColor,
              type: item?.lineStyleType || 'solid'
            },
            itemStyle: {
              width: 1.5,
              color: seriesLineColor
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
      activePodNames,
      checkedPodNames,
      data?.xData,
      data?.yData,
      getDisplayName,
      getNetworkDisplayInfo,
      getSeriesLineColor,
      isCpuOrMemoryType,
      lineWidth,
      selectedSeries,
      seriesIndexMap,
      type,
      unit,
      xAxisLabelFormatter,
      xAxisTooltipFormatter,
      yAxisConfig?.interval,
      yAxisConfig?.max,
      yAxisConfig?.min,
      yAxisConfig?.splitNumber,
      yAxisLabelFormatter,
      yAxisUseNative,
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
        <div className="relative w-[217px]">
          <div className="absolute inset-0 flex flex-col gap-2">
            <div className="flex shrink-0 items-center justify-between px-1">
              <span className="text-sm font-normal text-zinc-500">{filterLabel}</span>
              <button
                type="button"
                className="text-sm font-normal text-blue-600 hover:underline"
                onClick={() =>
                  setSelectedSeries((prev) => {
                    if (legendSeriesNames.length === 0) return new Set();
                    // Check if all legend items are selected
                    const isAllLegendSelected = legendSeriesNames.every((name) => prev.has(name));
                    if (isAllLegendSelected) {
                      // Deselect all legend items, but keep non-legend items (deprecated pods) selected
                      const next = new Set(prev);
                      legendSeriesNames.forEach((name) => next.delete(name));
                      return next;
                    } else {
                      // Select all legend items
                      const next = new Set(prev);
                      legendSeriesNames.forEach((name) => next.add(name));
                      return next;
                    }
                  })
                }
              >
                {t('show_all')}
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
              {legendData.map((item) => {
                // Use original index from seriesIndexMap to keep color consistent
                const originalIndex = seriesIndexMap.get(item.name) ?? 0;
                const lineColor = getSeriesLineColor(item.name, originalIndex);
                const isSelected = selectedSeries.has(item.name);
                const displayName = getDisplayName(item.name, originalIndex);
                const isCpuOrMemory = type === 'cpu' || type === 'memory';
                const isNetwork = type === 'network';
                const networkInfo = isNetwork ? getNetworkDisplayInfo(item.name) : null;
                return (
                  <Button
                    key={item?.name + originalIndex}
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
                    <span className="flex items-center gap-2 min-w-0 pr-6">
                      <span className="relative h-3 w-4">
                        <span
                          className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 rounded-full"
                          style={{
                            backgroundColor: lineColor
                          }}
                        />
                        <span
                          className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
                          style={{
                            boxShadow: `0 0 0 2px ${lineColor}`
                          }}
                        />
                      </span>
                      <Tooltip disableHoverableContent>
                        <TooltipTrigger asChild>
                          {isNetwork && networkInfo ? (
                            <span className="text-sm truncate">
                              <span className="font-normal text-zinc-900">{networkInfo.code}</span>
                              <span className="font-normal text-zinc-500 ml-1">
                                {' '}
                                {networkInfo.label}
                              </span>
                            </span>
                          ) : (
                            <span className="text-sm font-normal text-zinc-900 truncate">
                              {displayName}
                            </span>
                          )}
                        </TooltipTrigger>
                        <TooltipContent className="rounded-xl pointer-events-none">
                          <div className="p-2">
                            <span className="flex items-center gap-2 min-w-0">
                              <span
                                className="inline-block w-2 h-2 rounded-full bg-[var(--dot-color)]"
                                style={
                                  {
                                    '--dot-color': lineColor
                                  } as React.CSSProperties
                                }
                              />
                              <span className="text-sm text-zinc-900 font-normal break-all">
                                {isCpuOrMemory
                                  ? displayName
                                  : isNetwork && networkInfo
                                  ? `${networkInfo.code} ${networkInfo.label}`
                                  : item.name}
                              </span>
                            </span>
                            {isCpuOrMemory && (
                              <span className="text-sm text-zinc-500 font-normal break-all">
                                {item.name}
                              </span>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </span>
                    {isSelected && (
                      <Check className="absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-blue-600" />
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonitorChart;
