import { Datum, PieConfig } from '@ant-design/charts';
import { sum } from 'lodash';
import dynamic from 'next/dynamic';

export type PieChartData = {
  type: string;
  value: number;
};

interface PieChartProps {
  title: string;
  data: Array<PieChartData>;
  color: (type: string) => string;
}

const DynamicPie = dynamic(() => import('@ant-design/plots').then((item) => item.Pie), {
  ssr: false
});

export const PieChart = ({ title, data, color }: PieChartProps) => {
  const config: PieConfig = {
    data: data,
    angleField: 'value',
    colorField: 'type',
    color: (datum: Datum) => color(datum['type']),
    width: 150,
    radius: 1,
    innerRadius: 0.88,
    statistic: {
      title: {
        content: title,
        style: {
          fontSize: '14px',
          whiteSpace: 'pre-wrap',
          overflow: 'visible'
        }
      },
      content: {
        content: `${sum(data.map((d) => d.value))}`,
        style: {
          fontSize: '14px',
          fontWeight: 'bold'
        }
      }
    },
    label: false,
    legend: {
      layout: 'vertical' as 'vertical',
      position: 'bottom' as 'bottom'
    }
  };
  return <DynamicPie {...config} animation={false} />;
};
