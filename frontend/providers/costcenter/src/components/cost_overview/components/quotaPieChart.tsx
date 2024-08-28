import { UserQuotaItemType } from '@/pages/api/getQuota';
import { useBreakpointValue } from '@chakra-ui/react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import { PieChart } from 'echarts/charts';
import * as echarts from 'echarts/core';
import { LabelLayout } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([PieChart, CanvasRenderer, LabelLayout]);

export default function CostChart({
  data,
  color = '#13C4B9'
}: {
  data: UserQuotaItemType & { title: string };
  color?: string;
}) {
  const radius = ['45%', '70%'];
  const aspectRatio = useBreakpointValue({
    xl: '5/4',
    lg: '5/3',
    md: '6/2',
    sm: '5/4'
  });
  const publicOption = {
    name: data.title,
    radius: radius || ['45%', '70%'],
    avoidLabelOverlap: false,
    center: ['50%', '60%'],
    left: 'left'
  };
  const option = {
    color: [color, '#F4F4F7'],
    series: [
      {
        type: 'pie',
        clockwise: false,
        label: {
          show: true,
          position: 'center',
          formatter() {
            return data.title;
          }
        },
        startAngle: 45,
        data: [data.used, data.limit - data.used],
        labelLine: {
          show: false
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
        aspectRatio,
        width: '120px',
        height: '120px'
      }}
    />
  );
}
