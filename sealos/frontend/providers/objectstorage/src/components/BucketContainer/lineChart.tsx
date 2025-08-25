import ReactEChartsCore, { EChartsReactProps } from 'echarts-for-react';
// Import the echarts core module, which provides the necessary interfaces for using echarts.
import * as echarts from 'echarts/core';
import {
  GridComponent,
  VisualMapComponent,
  MarkLineComponent,
  DatasetComponent,
  TooltipComponent,
  TitleComponent
} from 'echarts/components';
import { LineChart } from 'echarts/charts';
import { UniversalTransition } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';
import { Box, Text } from '@chakra-ui/react';
import {
  DatasetComponentOption,
  GridComponentOption,
  LineSeriesOption,
  TitleComponentOption,
  TooltipComponentOption
} from 'echarts';

echarts.use([
  GridComponent,
  DatasetComponent,
  MarkLineComponent,
  LineChart,
  CanvasRenderer,
  TooltipComponent,
  UniversalTransition,
  TitleComponent
]);

type EChartsOption = echarts.ComposeOption<
  | GridComponentOption
  | DatasetComponentOption
  | TooltipComponentOption
  | LineSeriesOption
  | TitleComponentOption
>;
export default function TrendChart({
  source,
  title,
  dimesion,
  styles,
  ...echartsProps
}: {
  title: string;
  dimesion: string;
  styles: {
    areaColor: string;
    lineColor: string;
    itemColor: string;
  };
  source: (number | string)[][];
} & Omit<EChartsReactProps, 'option'>) {
  const option: EChartsOption = {
    // grid: { top: 8, right: 8, bottom: 24, left: 36 },
    dataset: {
      source
    },
    grid: {
      left: '0',
      bottom: '10%',
      top: '5%',
      right: '0',
      width: '100%',
      height: '100%',
      containLabel: true
    },
    xAxis: {
      type: 'time',
      axisLabel: {
        color: 'transparent'
      }
    },
    yAxis: {
      min: 'dataMin',
      max: 'dataMax',
      type: 'value',
      splitLine: {
        lineStyle: {
          type: 'dashed',
          color: 'rgba(189, 193, 197, 1)',
          width: 0.5
        }
      },
      minInterval: 1,
      nameTextStyle: {
        padding: [10, 10, 10, 10]
      }
    },
    series: {
      type: 'line',
      symbol: 'none',
      areaStyle: {
        color: styles.areaColor
      },
      lineStyle: {
        width: 1.5,
        color: styles.lineColor
      },
      encode: {
        x: 'date',
        y: dimesion
      },
      smooth: true,
      emphasis: {
        scale: false
      },
      itemStyle: {
        color: styles.itemColor
      }
    },
    tooltip: {
      trigger: 'axis',
      position(point, _params, dom, _rect, size) {
        let xPos = point[0];
        let yPos = point[1];
        let chartWidth = size.viewSize[0];
        let chartHeight = size.viewSize[1];
        let tooltipWidth = (dom as HTMLElement).offsetWidth;
        let tooltipHeight = (dom as HTMLElement).offsetHeight;
        if (xPos + tooltipWidth > chartWidth) {
          xPos -= tooltipWidth;
        }
        if (xPos < 0) {
          xPos = 0;
        }
        if (yPos + tooltipHeight > chartHeight) {
          yPos -= tooltipHeight;
        }
        if (yPos < 0) {
          yPos = 0;
        }
        return [xPos, yPos];
      }
    }
  };
  return (
    <Box
      padding={'24px'}
      border={'1px solid'}
      borderColor={'#EAEBF0'}
      borderRadius={'4px'}
      bgColor={'#FBFBFC'}
      flexDir={'column'}
      position={'relative'}
    >
      <Text mb="10px" color={'grayModern.900'} fontSize={'12px'}>
        {title}
      </Text>
      <ReactEChartsCore
        echarts={echarts}
        option={option}
        notMerge={true}
        lazyUpdate={true}
        style={{ height: '200px', width: '500px' }}
        {...echartsProps}
      />
    </Box>
  );
}
