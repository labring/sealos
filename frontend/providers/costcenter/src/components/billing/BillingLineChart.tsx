import ReactEChartsCore from 'echarts-for-react/lib/core';
// Import the echarts core module, which provides the necessary interfaces for using echarts.
import useOverviewStore from '@/stores/overview';
import { Cycle } from '@/types/cycle';
import {
  addDays,
  addHours,
  addMonths,
  addWeeks,
  addYears,
  differenceInDays,
  differenceInHours,
  differenceInMonths,
  differenceInWeeks,
  differenceInYears,
  format,
  isSameDay,
  isSameHour,
  isSameMonth,
  isSameWeek,
  isSameYear,
  startOfDay,
  startOfHour,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subHours,
  subMonths,
  subWeeks,
  subYears
} from 'date-fns';
import { LineChart } from 'echarts/charts';
import {
  GridComponent,
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
  MarkLineComponent,
  LineChart,
  CanvasRenderer,
  TooltipComponent,
  UniversalTransition
]);

export default function Trend({ data, cycle }: { data: [number, string][]; cycle: Cycle }) {
  const { t } = useTranslation();
  let methods = [
    isSameDay,
    startOfDay,
    differenceInDays,
    subDays,
    addDays,
    7 as number,
    'MM-dd' as string
  ] as const;
  if (cycle === 'Week') {
    methods = [isSameWeek, startOfWeek, differenceInWeeks, subWeeks, addWeeks, 7, 'MM-dd'];
  } else if (cycle === 'Month') {
    methods = [isSameMonth, startOfMonth, differenceInMonths, subMonths, addMonths, 6, 'yyyy-MM'];
  } else if (cycle === 'Hour') {
    methods = [isSameHour, startOfHour, differenceInHours, subHours, addHours, 24, 'MM-dd HH:mm'];
  } else if (cycle === 'Year') {
    methods = [isSameYear, startOfYear, differenceInYears, subYears, addYears, 3, 'yyyy'];
  }
  const { startTime } = useOverviewStore();
  const startOfTime = methods[1](startTime);
  const source = [
    // ['date', 'amount'],
    ...[...data]
      .sort(([aD], [bD]) => aD - bD)
      .reduce<[Date, number][]>(
        (pre, [curDate, curVal]) => {
          const len = pre.length;
          const time = new Date(curDate * 1000);
          let val = parseInt(curVal);
          let preTime = pre[len - 1][0];

          if (methods[0](preTime, time)) {
            pre[len - 1][1] = pre[len - 1][1] + val;
          } else {
            while (methods[2](time, preTime) > 1) {
              preTime = methods[4](preTime, 1);
              pre.push([methods[1](preTime), 0]);
            }
            pre.push([methods[1](time), val]);
          }
          return pre;
        },
        [[startOfTime, 0]] as [Date, number][]
      )
      .map(([date, val]) => [format(date, methods[6]), val / 1_000_000])
  ];
  const series = {
    type: 'line',
    smooth: true,
    datasetIndex: 0,
    encode: {
      x: 'date',
      y: 'amount'
    },
    connectNulls: true,
    data: source
  };
  const option = {
    xAxis: {
      type: 'category',
      symbolOffset: [10, 10],
      label: {
        show: true
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(177, 200, 222, 0.6)'
        }
      },
      axisLabel: {
        color: 'rgba(107, 112, 120, 1)'
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
      left: '10%',
      right: '10%',
      bottom: '40px',
      top: '40px'
    },
    color: ['#11B6FC'],
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
      lazyUpdate={false}
      style={{ height: '191px', width: '916px', flex: 1 }}
    />
  );
}
