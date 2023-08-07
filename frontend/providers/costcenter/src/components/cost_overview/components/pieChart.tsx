import * as echarts from 'echarts/core';
import { TooltipComponent, LegendComponent, DatasetComponent } from 'echarts/components';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import { PieChart } from 'echarts/charts';
import { LabelLayout } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';
import { formatMoney } from '@/utils/format';
import { useMemo } from 'react';
import { useBreakpointValue } from '@chakra-ui/react';
import { BillingData } from '@/types/billing';
import { useTranslation } from 'next-i18next';
import useEnvStore from '@/stores/env';

echarts.use([
  TooltipComponent,
  LegendComponent,
  PieChart,
  CanvasRenderer,
  LabelLayout,
  DatasetComponent
]);

export default function CostChart({ data }: { data: BillingData['status']['deductionAmount'] }) {
  const { t } = useTranslation();
  const { cpu = 0, memory = 0, storage = 0, gpu = 0 } = data;
  const gpuEnabled = useEnvStore((state) => state.gpuEnabled);
  const radius = useBreakpointValue({
    xl: ['45%', '70%'],
    lg: ['45%', '70%'],
    md: ['30%', '50%'],
    sm: ['45%', '70%']
  });
  const aspectRatio = useBreakpointValue({
    xl: '5/4',
    lg: '5/3',
    md: '6/2',
    sm: '5/4'
  });
  const source = useMemo(
    () => [
      ['name', 'cost'],
      ['cpu', formatMoney(cpu).toFixed(2)],
      ['memory', formatMoney(memory).toFixed(2)],
      ['storage', formatMoney(storage).toFixed(2)],
      ...(gpuEnabled ? [['gpu', formatMoney(gpu).toFixed(2)]] : [])
    ],
    [cpu, memory, storage, gpu, gpuEnabled]
  );
  const amount = formatMoney(cpu + memory + storage + gpu);
  const publicOption = {
    name: 'Cost Form',
    radius: radius || ['45%', '70%'],
    avoidLabelOverlap: false,
    center: ['50%', '60%'],
    // selectedMode: 'single',

    left: 'left',
    emptyCircleStyle: {
      borderCap: 'ronud'
    }
  };
  const option = {
    dataset: {
      dimensions: source[0],
      source
    },
    tooltip: {
      trigger: 'item'
    },
    legend: {
      top: '10%'
    },
    color: ['#24282C', '#485058', '#7B838B', '#BDC1C5'],
    series: [
      {
        type: 'pie',

        // label: {
        //   show:true,
        //   formatter: '{b}\n￥{@cost}\n({d}%)',
        //   lineHeight: 15,

        // },
        // label: {
        //   show: false,
        //   // position: 'center'
        // },
        emphasis: {
          label: {
            show: false
          }
        },
        label: {
          show: false,
          fontSize: 14
        },

        labelLine: {
          show: false
        },
        // label: {
        //   formatter: '{a|{a}}{abg|}\n{hr|}\n  {b|{b}：}{c}  {per|{d}%}  ',
        //   backgroundColor: '#F6F8FC',
        //   borderColor: '#8C8D8E',
        //   borderWidth: 1,
        //   borderRadius: 4,
        //   rich: {
        //     a: {
        //       color: '#6E7079',
        //       lineHeight: 22,
        //       align: 'center'
        //     },
        //     hr: {
        //       borderColor: '#8C8D8E',
        //       width: '100%',
        //       borderWidth: 1,
        //       height: 0
        //     },
        //     b: {
        //       color: '#4C5058',
        //       fontSize: 14,
        //       fontWeight: 'bold',
        //       lineHeight: 33
        //     },
        //     per: {
        //       color: '#fff',
        //       backgroundColor: '#4C5058',
        //       padding: [3, 4],
        //       borderRadius: 4
        //     }
        //   }
        // },
        // emphasis: {
        //   label:{
        //     show:true
        //   }
        // },
        encode: {
          itemName: 'name',
          value: 'cost'
        },
        itemStyle: {
          borderWidth: 1,
          borderColor: '#fff',
          left: 0
        },
        ...publicOption
      },
      {
        type: 'pie',
        radius: [publicOption.radius[0], publicOption.radius[0]],
        center: publicOption.center,
        label: {
          position: 'center',
          show: true,
          formatter: function (params: any) {
            return amount.toFixed(2) + `\n${t('Expenditure')}`;
          },
          fontSize: 16,
          textStyle: {
            textBorderColor: 'rgba(0,0,0,0)'
          }
        },
        emphasis: {
          label: {
            show: false
          },
          scale: 0
        },
        encode: {
          itemName: 'name',
          value: 'cost'
        }
        // itemStyle: {
        //   borderWidth: 0,
        // }
      }
    ]
    // ]
  };
  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      notMerge={true}
      lazyUpdate={true}
      style={{
        aspectRatio,
        width: '100%',
        flex: 1
        // pointerEvents: 'none'
      }}
    />
  );
}
