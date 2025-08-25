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
    style: {
      transform: 'scale(0.95)'
    },
    colorField: 'type',
    color: (datum: Datum) => color(datum['type']),
    padding: 0.1, //Try to avoid dial misalignment caused by different legends' number
    width: 200,
    height: 350,
    radius: 0.9,
    innerRadius: 0.75,
    statistic: {
      title: false,
      content: {
        customHtml: () => {
          return (
            <div>
              <div className="font-medium text-base text-black">{title}</div>
              <div className="font-medium text-4xl text-black">{sum(data.map((d) => d.value))}</div>
            </div>
          ) as unknown as string;
        }
      }
    },
    label: false,
    legend: {
      layout: 'vertical',
      position: 'bottom',
      offsetY: -30,
      marker: {
        symbol: (x: number, y: number, r: number) => {
          const width = r * 4;
          const height = width * 0.5;
          return [
            ['M', x - width / 2, y - height / 2],
            ['L', x + width / 2, y - height / 2],
            ['L', x + width / 2, y + height / 2],
            ['L', x - width / 2, y + height / 2],
            ['Z']
          ];
        },
        spacing: 13
      }
    }
  };
  return <DynamicPie {...config} animation={false} />;
};
