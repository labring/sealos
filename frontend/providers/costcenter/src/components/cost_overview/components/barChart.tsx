import ReactEChartsCore from 'echarts-for-react/lib/core';
// Import the echarts core module, which provides the necessary interfaces for using echarts.
import { addMonths, differenceInMonths, format, isSameMonth, startOfMonth } from 'date-fns';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { useTranslation } from 'next-i18next';

echarts.use([GridComponent, BarChart, CanvasRenderer, TooltipComponent]);

export default function Chart({
  data,
  startTime,
  endTime
}: {
  data: [[number, number | string][], string][];
  startTime: Date;
  endTime: Date;
}) {
  const { t } = useTranslation();
  const series = data.map(([sourceRaw, seriesName]) => {
    const source = [
      ...[...sourceRaw]
        .sort(([aDate], [bDate]) => aDate - bDate)
        .reduce<[Date, number][]>(
          (pre, [curDate, curVal]) => {
            const len = pre.length;
            const time = new Date(curDate);
            let val = parseInt(curVal + '');
            let preTime = pre[len - 1][0];
            if (isSameMonth(preTime, time)) {
              pre[len - 1][1] = pre[len - 1][1] + val;
            } else {
              while (differenceInMonths(time, preTime) > 1) {
                preTime = addMonths(preTime, 1);
                pre.push([startOfMonth(preTime), 0]);
              }
              pre.push([startOfMonth(time), val]);
            }
            return pre;
          },
          [[startOfMonth(startTime), 0]] as [Date, number][]
        )
        .map(([date, val]) => [format(date, 'yyyy-MM'), val / 1_000_000])
    ];
    return {
      type: 'bar',
      smooth: true,
      showSymbol: false,
      datasetIndex: 0,
      encode: {
        // 将 "amount" 列映射到 y 轴。
        x: 'date',
        y: 'amount'
      },
      name: seriesName,
      data: source
    };
  });

  const option = {
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
      boundaryGap: false,
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
        color: '#667085'
      }
    },
    grid: {
      left: '40px',
      right: '5px'
    },
    color: ['#18181B', '#3B82F6'],
    tooltip: {
      trigger: 'axis',
      borderWidth: 0
    },
    legend: {
      top: 'bottom'
    },
    bottom: '10%',
    series
  };
  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      notMerge={true}
      lazyUpdate={true}
      style={{ height: '300px', width: '100%' }}
    />
  );
}
