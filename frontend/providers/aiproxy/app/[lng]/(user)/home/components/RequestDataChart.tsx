'use client'

import { Box } from '@chakra-ui/react'
import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'
import { ChartDataItem } from '@/types/user/dashboard'
import { useBackendStore } from '@/store/backend'

export default function RequestDataChart({ data }: { data: ChartDataItem[] }): React.JSX.Element {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const { currencySymbol } = useBackendStore()

  const option = useMemo(() => {
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: '#E2E8F0'
          }
        }
      },
      legend: {
        data: [
          t('dataDashboard.callCount'),
          t('dataDashboard.exceptionCount'),
          t('dataDashboard.cost')
        ],
        bottom: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'time',
        boundaryGap: false,
        axisLine: {
          lineStyle: {
            color: '#E2E8F0'
          }
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: '#E2E8F0',
            type: 'dashed'
          }
        }
      },
      yAxis: {
        type: 'value',
        splitLine: {
          lineStyle: {
            color: '#E2E8F0',
            type: 'dashed'
          }
        }
      },
      series: [
        {
          name: t('dataDashboard.callCount'),
          type: 'line',
          smooth: true,
          data: data.map((item) => [item.timestamp, item.request_count]),
          itemStyle: {
            color: '#3B82F6'
          }
        },
        {
          name: t('dataDashboard.exceptionCount'),
          type: 'line',
          smooth: true,
          data: data.map((item) => [item.timestamp, item.exception_count]),
          itemStyle: {
            color: '#F59E0B'
          }
        },
        {
          name: t('dataDashboard.cost'),
          type: 'line',
          smooth: true,
          data: data.map((item) => [item.timestamp, item.used_amount]),
          itemStyle: {
            color: '#10B981'
          }
        }
      ]
    }
  }, [data, t])

  return (
    <Box w="full" h="full" bg="white" borderRadius="lg" p={4}>
      <ReactECharts
        option={option}
        style={{ height: '100%', width: '100%' }}
        opts={{ renderer: 'svg' }}
      />
    </Box>
  )
}
