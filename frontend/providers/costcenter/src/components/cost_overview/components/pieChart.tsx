import { resourceType } from '@/constants/billing';
import useEnvStore from '@/stores/env';
import { formatMoney } from '@/utils/format';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import { PieChart } from 'echarts/charts';
import { DatasetComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { LabelLayout } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';
import { useTranslation } from 'next-i18next';
import { useMemo } from 'react';

echarts.use([
  TooltipComponent,
  LegendComponent,
  PieChart,
  CanvasRenderer,
  LabelLayout,
  DatasetComponent
]);

export default function CostChart({ data }: { data: number[]; appName: string }) {
  const { t } = useTranslation();
  const { gpuEnabled } = useEnvStore();
  const radius = ['50%', '90%'];

  const result = (gpuEnabled ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 4]).map((_, i) => {
    return [t(resourceType[i]), formatMoney(data[i]).toFixed(2)];
  });
  const title = t('All APP', { ns: 'applist' }) + '\n' + t('Cost Form');
  const source = useMemo(() => [['name', 'cost'], ...result], [result]);
  const publicOption = {
    name: t('common:cost_form'),
    radius: radius || ['45%', '70%'],
    avoidLabelOverlap: false,
    center: ['50%', '60%'],
    right: '20%',
    top: '20px',
    bottom: '20px',
    emptyCircleStyle: {
      borderCap: 'ronud'
    }
  };
  const option = {
    dataset: {
      source
    },
    tooltip: {
      trigger: 'item'
    },
    legend: {
      orient: 'vertical',
      top: 'middle',
      align: 'left',
      right: '10%',
      textStyle: {
        padding: [6, 6, 6, 6]
      }
    },
    color: ['#1D2532', '#009BDE', '#40C6FF', '#6F5DD7', '#8774EE'],
    series: [
      {
        type: 'pie',
        label: {
          show: true,
          fontSize: 12,
          position: 'center',
          color: '#485264',
          fontWidth: '500',
          formatter: function (params: any) {
            return title;
          }
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
        // aspectRatio,
        width: '100%',
        minWidth: '500px',
        height: '260px'
      }}
    />
  );
}
