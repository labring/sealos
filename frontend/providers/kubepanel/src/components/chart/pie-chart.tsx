import { sum } from 'lodash';
import dynamic from 'next/dynamic';
import React from 'react';

export type PieChartData = {
  type: string;
  value: number;
};

interface PieChartProps {
  title: string;
  data: Array<PieChartData>;
  color: (type: string) => string;
}

// @ts-ignore - @ant-design/plots has complex types that cause deep instantiation in full tsc
const DynamicPie = dynamic(() => import('@ant-design/plots').then((item) => item.Pie), {
  ssr: false
});

export const PieChart = ({ title, data, color }: PieChartProps) => {
  const total = sum(data.map((d) => d.value));

  const config = {
    data: data,
    angleField: 'value',
    colorField: 'type',
    color: data.map((item) => color(item.type)),
    width: 220,
    height: 350,
    innerRadius: 0.6,
    radius: 0.92,
    label: false,
    legend: {
      position: 'bottom' as const,
      layout: 'vertical' as const,
      offsetY: -30,
      marker: {
        symbol: 'square' as const,
        style: {
          r: 6
        }
      },
      itemSpacing: 13
    },
    annotations: [
      {
        type: 'text',
        style: {
          text: `${title}\n${total}`,
          x: '50%',
          y: '50%',
          textAlign: 'center',
          fontSize: 16,
          fontWeight: '500',
          textBaseline: 'middle'
        }
      }
    ],
    tooltip: {
      items: [
        (d: any) => ({
          name: d.type,
          value: d.value
        })
      ]
    }
  };

  return <DynamicPie {...config} />;
};
