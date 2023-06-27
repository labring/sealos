import ReactEChartsCore from 'echarts-for-react/lib/core';
// Import the echarts core module, which provides the necessary interfaces for using echarts.
import * as echarts from 'echarts/core';
import {
  GridComponent,
  VisualMapComponent,
  MarkLineComponent,
  DatasetComponent,
  TooltipComponent
} from 'echarts/components';
import { LineChart } from 'echarts/charts';
import { UniversalTransition } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';
import { INITAL_SOURCE } from '@/constants/billing';
import { BillingItem } from '@/types/billing';
import { parseISO, format, isSameDay, startOfDay } from 'date-fns';
import { formatMoney } from '@/utils/format';
import { useTranslation } from 'next-i18next';

echarts.use([
  GridComponent,
  VisualMapComponent,
  DatasetComponent,
  MarkLineComponent,
  LineChart,
  CanvasRenderer,
  TooltipComponent,
  UniversalTransition
]);

export default function Trend({ data }: { data: BillingItem[] }) {
  const { t } = useTranslation();
  const source = [
    ...INITAL_SOURCE,
    ...(data
      .filter((v) => v.type === 0)
      .map<[Date, number, number, number, number]>((item) => [
        parseISO(item.time),
        item.costs?.cpu || 0,
        item.costs?.memory || 0,
        item.costs?.storage || 0,
        item.amount
      ])
      // 归并为当天的开始
      .reduce<[Date, number, number, number, number][]>((pre, cur) => {
        if (pre.length !== 0) {
          const precost = pre[pre.length - 1];
          if (isSameDay(precost[0], cur[0])) {
            cur.forEach((v, i) => i > 0 && ((precost[i] as number) += v as number));
            return pre;
          }
        }
        cur[0] = startOfDay(cur[0]);
        pre.push(cur);

        return pre;
      }, [])
      .map((x) => {
        return [x[0], formatMoney(x[1]), formatMoney(x[2]), formatMoney(x[3]), formatMoney(x[4])];
      })
      .reverse() || [])
  ];
  const option = {
    xAxis: {
      type: 'time',
      minInterval: 24 * 60 * 60 * 1000, // 最小刻度为一天
      // maxInterval: 30 * 24 * 60 * 60 * 1000, // 最大刻度为一周
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
      name: '元',
      type: 'value',
      boundaryGap: false,
      nameTextStyle: {
        color: 'rgba(107, 112, 120, 1)'
      },
      axisLine: {
        show: true,
        lineStyle: {
          color: 'rgba(177, 200, 222, 0.6)'
        }
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
        color: 'rgba(107, 112, 120, 1)'
      }
    },
    dataset: {
      dimensions: INITAL_SOURCE[0],
      source
    },
    grid: {
      left: '40px',
      right: '5px'
    },
    color: ['#24282C'],
    tooltip: {
      trigger: 'axis',
      borderWidth: 0,
      axisPointer: {
        type: 'line'
      },
      extraCssText:
        'box-shadow: 0px 2px 4px rgba(161, 167, 179, 0.25), 0px 0px 1px rgba(121, 141, 159, 0.25);',
      backgroundColor: 'transparent',
      padding: '0px',

      formatter: function (params: any) {
        // 如果不允许使用 `innerHTML`，可以使用 DOM API 来创建和添加元素。例如：

        const { data, value } = params[0];
        const date = format(data[0], 'yyyy-MM-dd');
        const totalCost = value[4];
        // 创建外层 div 元素
        const resDom = document.createElement('div');
        resDom.style.background = '#FFFFFF';
        // resDom.style.width = '';
        resDom.style.padding = '16px';
        // resDom.style.height = '79px';
        resDom.style.padding = '16px';
        resDom.style.border = '1px solid rgba(205, 213, 218, 1)';
        resDom.style.borderRadius = '4px';
        // 创建日期 p 元素
        const dateP = document.createElement('p');
        dateP.style.color = '#5A646E';
        dateP.style.marginBottom = '8px';
        dateP.style.fontFamily = "'PingFang SC'";
        dateP.style.fontStyle = 'normal';
        dateP.style.fontWeight = '500';
        dateP.style.fontSize = '12px';
        dateP.style.lineHeight = '150%';
        dateP.textContent = date;
        // 创建总消费 p 元素
        const totalCostP = document.createElement('p');
        totalCostP.style.fontFamily = "'PingFang SC'";
        totalCostP.style.fontStyle = 'normal';
        totalCostP.style.fontWeight = '500';
        totalCostP.style.fontSize = '14px';
        totalCostP.style.lineHeight = '150%';
        totalCostP.textContent = `${t('Total Cost')} : ¥${totalCost}`;
        // 创建空 div 元素
        const emptyDiv = document.createElement('div');
        // 添加子元素到外层 div 元素中
        resDom.appendChild(dateP);
        resDom.appendChild(totalCostP);
        resDom.appendChild(emptyDiv);
        return resDom;
      }
    },
    series: [
      {
        type: 'line',
        smooth: true,
        showSymbol: false,
        datasetIndex: 0,
        encode: {
          // 将 "amount" 列映射到 y 轴。
          x: 'date',
          y: 'amount'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            {
              offset: 0,
              color: 'rgba(220, 227, 231, 0.8)'
            },
            {
              offset: 1,
              color: 'rgba(233, 237, 239, 0)'
            }
          ])
        }
      }
    ]
  };
  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      notMerge={true}
      lazyUpdate={true}
      style={{ height: '310px', width: '100%', flex: 1 }}
    />
  );
}
