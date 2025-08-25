import ReactEChartsCore from 'echarts-for-react/lib/core';
// Import the echarts core module, which provides the necessary interfaces for using echarts.
import { Cycle } from '@/types/cycle';
import { addDays, differenceInDays, format, isSameDay, startOfDay, subDays } from 'date-fns';
import { LineChart } from 'echarts/charts';
import {
  DatasetComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
  VisualMapComponent
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { UniversalTransition } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';
import { useTranslation } from 'next-i18next';

echarts.use([
  GridComponent,
  VisualMapComponent,
  DatasetComponent,
  MarkLineComponent,
  LineChart,
  LegendComponent,
  CanvasRenderer,
  TooltipComponent,
  UniversalTransition
]);

export default function Trend({
  data,
  cycle,
  startTime,
  endTime
}: {
  data: [[number, string][], string][];
  cycle: Cycle;
  startTime: Date;
  endTime: Date;
}) {
  const { t } = useTranslation();
  let methods = [isSameDay, startOfDay, differenceInDays, subDays, 7 as number] as const;
  const series = data.map(([sourceRaw, seriesName]) => {
    const source = [
      // ['date', 'amount'],
      ...[...sourceRaw]
        .sort((a, b) => a[0] - b[0])
        .reduce<[Date, number][]>(
          (pre, [curDate, curVal]) => {
            const len = pre.length;
            const time = new Date(curDate * 1000);
            let val = parseInt(curVal);
            let preTime = pre[len - 1][0];
            if (methods[0](preTime, time)) {
              pre[len - 1][1] = pre[len - 1][1] + val;
              // pre[len - 1][0] = time
            } else {
              while (methods[2](time, preTime) > 1) {
                preTime = addDays(preTime, 1);
                pre.push([preTime, 0]);
              }
              pre.push([methods[1](time), val]);
            }
            return pre;
          },
          [[methods[1](startTime), 0]] as [Date, number][]
        )
        .map(([date, val]) => [format(date, 'MM-dd'), val / 1_000_000])
    ];
    return {
      type: 'line',
      smooth: true,
      datasetIndex: 0,
      encode: {
        // 将 "amount" 列映射到 y 轴。
        x: 'date',
        y: 'amount'
      },
      connectNulls: true,
      name: seriesName,
      data: source
    };
  });
  const option = {
    legend: {
      bottom: 0
    },
    xAxis: {
      type: 'category',
      symbolOffset: [10, 10],
      label: {
        show: true
      },
      axisLine: {
        lineStyle: {
          color: '#8A95A7'
        }
      },
      axisLabel: {
        color: '#667085'
      }
    },
    yAxis: {
      name: '',
      type: 'value',
      // boundaryGap: false,
      nameTextStyle: {
        color: '#667085'
      },
      splitLine: {
        lineStyle: {
          type: 'dashed'
        }
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        fontSize: '12px',
        color: '#667085'
      }
    },
    dataset: {
      // dimensions: ['date', 'amount', 'namespace'],
      // source
    },
    grid: {
      left: '40px',
      right: '5px'
    },
    color: [
      // Does not support CSS vars here.
      'oklch(0.646 0.222 41.116)',
      'oklch(0.6 0.118 184.704)',
      'oklch(0.398 0.07 227.392)',
      'oklch(0.828 0.189 84.429)',
      'oklch(0.769 0.188 70.08)'
    ],
    tooltip: {
      trigger: 'axis',
      // borderWidth: 0,
      axisPointer: {
        type: 'line'
      }
    },
    series
  };
  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      notMerge={true}
      lazyUpdate={true}
      style={{ height: '300px', width: '100%', flex: 1 }}
    />
  );
}
