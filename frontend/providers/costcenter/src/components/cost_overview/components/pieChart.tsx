import * as echarts from 'echarts/core';
import { TooltipComponent, LegendComponent, DatasetComponent } from 'echarts/components';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import { PieChart } from 'echarts/charts';
import { LabelLayout } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';
import { formatMoney } from '@/utils/format';
import { useMemo } from 'react';
import { useBreakpointValue } from '@chakra-ui/react';
import { BillingData, Costs } from '@/types/billing';
import { useTranslation } from 'next-i18next';
import useEnvStore from '@/stores/env';
import {
  ComposeOption,
  DatasetComponentOption,
  LabelLayoutOptionCallback,
  LegendComponentOption,
  PieSeriesOption,
  TooltipComponentOption
} from 'echarts';

echarts.use([
  TooltipComponent,
  LegendComponent,
  PieChart,
  CanvasRenderer,
  LabelLayout,
  DatasetComponent
]);

export default function CostChart({ data }: { data: Costs }) {
  const { t } = useTranslation();
  const { cpu = 0, memory = 0, storage = 0, gpu = 0, network = 0, port = 0 } = data;
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
      ['network', formatMoney(network).toFixed(2)],
      ['port', formatMoney(port).toFixed(2)],
      ...(gpuEnabled ? [['gpu', formatMoney(gpu).toFixed(2)]] : [])
    ],
    [cpu, memory, storage, gpu, gpuEnabled]
  );
  const amount = formatMoney(cpu + memory + storage + gpu + port + network);
  const publicOption = {
    name: 'Cost Form',
    radius: radius || ['45%', '70%'],
    avoidLabelOverlap: false,
    center: ['50%', '60%'],
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
    color: ['#24282C', '#485058', '#7B838B', '#BDC1C5', '#9CA2A8', '#DEE0E2'],
    series: [
      {
        type: 'pie',
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
        encode: {
          itemName: 'name',
          value: 'cost'
        },
        itemStyle: {
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0)',
          left: 0
        },
        ...publicOption
      },
      {
        type: 'pie',
        radius: [publicOption.radius[0], publicOption.radius[0]],
        center: publicOption.center,
        selected: true,
        label: {
          position: 'center',
          show: true,
          formatter: function (params: any) {
            let result = amount.toFixed(2) + `\n${t('Expenditure')}`;
            if (result) return result;
            else return ' ';
          },
          emphasis: {
            label: true
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
          scale: false
        },
        encode: {
          itemName: 'name',
          value: 'cost'
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
      style={{
        aspectRatio,
        width: '100%',
        flex: 1
      }}
    />
  );
}
