import { Box, Flex, Text } from '@chakra-ui/react'
import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'
import { ChartDataItem } from '@/types/user/dashboard'
import { useBackendStore } from '@/store/backend'

export default function RequestDataChart({ data }: { data: ChartDataItem[] }): React.JSX.Element {
  const costChartRef = useRef<HTMLDivElement>(null)
  const requestChartRef = useRef<HTMLDivElement>(null)
  const costChartInstance = useRef<echarts.ECharts>()
  const requestChartInstance = useRef<echarts.ECharts>()
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const { currencySymbol } = useBackendStore()

  // Add helper function to determine date format
  const getDateFormat = (timestamps: number[]) => {
    if (timestamps.length < 2) return 'detailed'

    const timeDiff = timestamps[timestamps.length - 1] - timestamps[0]
    // If time difference is more than 15 days (1296000 seconds), show daily format
    return timeDiff > 1296000 ? 'daily' : 'detailed'
  }

  // 初始化图表
  useEffect(() => {
    if (costChartRef.current && requestChartRef.current) {
      costChartInstance.current = echarts.init(costChartRef.current, undefined, {
        renderer: 'svg'
      })
      requestChartInstance.current = echarts.init(requestChartRef.current, undefined, {
        renderer: 'svg'
      })
    }

    return () => {
      costChartInstance.current?.dispose()
      requestChartInstance.current?.dispose()
      costChartInstance.current = undefined
      requestChartInstance.current = undefined
    }
  }, [])

  // 配置图表选项
  useEffect(() => {
    if (!costChartInstance.current || !requestChartInstance.current) return

    const commonTooltipStyle: echarts.EChartsOption['tooltip'] = {
      trigger: 'axis',
      axisPointer: {
        type: 'line',
        lineStyle: {
          color: '#219BF4'
        }
      },
      backgroundColor: 'white',
      borderWidth: 0,
      padding: [8, 12],
      textStyle: {
        color: '#111824',
        fontSize: 12
      }
    }

    const commonXAxis: echarts.EChartsOption['xAxis'] = {
      type: 'time',
      // boundaryGap: ['0%', '5%'] as [string, string],
      boundaryGap: ['0%', '0%'] as [string, string],
      axisLine: {
        lineStyle: {
          color: '#E8EBF0',
          width: 2
        }
      },
      splitLine: {
        show: false,
        lineStyle: {
          color: '#DFE2EA',
          type: 'dashed' as const
        }
      },
      axisTick: {
        show: true,
        length: 6,
        lineStyle: {
          color: '#E8EBF0',
          width: 2
        }
      },
      axisLabel: {
        show: true,
        color: '#667085',
        formatter: (value: number) => {
          const date = new Date(value * 1000)
          const format = getDateFormat(data.map((item) => item.timestamp))

          return date
            .toLocaleString(lng, {
              month: '2-digit',
              day: '2-digit',
              ...(format === 'detailed' && {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              })
            })
            .replace(/\//g, '-')
        },
        margin: 14,
        align: 'left'
      }
    }

    // 成本图表配置
    const costOption: echarts.EChartsOption = {
      tooltip: {
        ...commonTooltipStyle,
        formatter: function (
          params:
            | echarts.DefaultLabelFormatterCallbackParams
            | echarts.DefaultLabelFormatterCallbackParams[]
        ) {
          if (!params) return ''
          const paramArray = Array.isArray(params) ? params : [params]
          if (paramArray.length === 0) return ''

          const time = new Date((paramArray[0].value as [number, number])[0] * 1000)
          const timeStr = time.toLocaleString(lng, {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })

          let result = `
            <div style="font-weight: 500; margin-bottom: 4px; margin-top: 4px; color: #667085; font-size: 12px">${timeStr}</div>
            <div style="height: 1px; background: #DFE2EA; margin: 8px 0;"></div>
          `

          const currency =
            currencySymbol === 'shellCoin'
              ? `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 15 15" fill="none">
<circle cx="7" cy="7.4854" r="6.74" fill="url(#paint0_linear_802_289)" stroke="url(#paint1_linear_802_289)" stroke-width="0.52"/>
<circle cx="6.99996" cy="7.48542" r="6.11562" fill="url(#paint2_linear_802_289)"/>
<path d="M7.00004 13.601C10.3776 13.601 13.1157 10.863 13.1157 7.48541C13.1157 6.09903 12.6543 4.82038 11.8768 3.79462C11.4855 3.73941 11.0856 3.71085 10.679 3.71085C6.28906 3.71085 2.67666 7.0397 2.22829 11.3108C3.34913 12.7072 5.07019 13.601 7.00004 13.601Z" fill="url(#paint3_linear_802_289)"/>
<circle cx="7.00007" cy="7.48539" r="4.74284" fill="url(#paint4_linear_802_289)"/>
<path d="M5.0457 7.27105C5.43915 7.84631 6.25318 7.79525 6.25318 7.79525C6.04967 7.59782 5.91739 7.41741 5.90383 6.90342C5.89026 6.38943 5.59856 6.25328 5.59856 6.25328C6.1209 5.9231 5.93435 5.56569 5.91739 5.16743C5.90722 4.91895 6.05307 4.73514 6.16839 4.62962C5.50464 4.7294 4.90487 5.08243 4.49413 5.61512C4.0834 6.14782 3.89338 6.81905 3.96371 7.4889C4.0112 7.35614 4.68277 6.74004 5.0457 7.27105Z" fill="url(#paint5_linear_802_289)"/>
<path d="M9.86551 6.24649C9.84796 6.19055 9.82642 6.13595 9.80106 6.08311V6.0797C9.68269 5.83801 9.48642 5.64355 9.2441 5.52785C9.00177 5.41215 8.72761 5.382 8.46607 5.4423C8.20453 5.5026 7.97096 5.6498 7.80325 5.86003C7.63554 6.07027 7.54352 6.3312 7.54212 6.6005C7.54214 6.6852 7.55123 6.76965 7.56925 6.85239C7.56933 6.85352 7.56933 6.85466 7.56925 6.85579C7.57603 6.88983 7.58621 6.92387 7.59638 6.95791C7.65692 7.1977 7.6687 7.44727 7.63102 7.69172C7.59334 7.93618 7.50697 8.17051 7.37706 8.38073C7.24716 8.59095 7.07638 8.77275 6.87493 8.91528C6.67348 9.05781 6.44548 9.15815 6.20453 9.21031C5.96359 9.26246 5.71465 9.26537 5.47256 9.21886C5.23047 9.17234 5.0002 9.07735 4.7955 8.93957C4.5908 8.80178 4.41585 8.62402 4.28111 8.41689C4.14636 8.20976 4.05458 7.97751 4.01124 7.734C4.07253 8.15611 4.22146 8.56059 4.4484 8.92127C4.67533 9.28194 4.97521 9.59077 5.32862 9.82776C5.68204 10.0648 6.0811 10.2246 6.49998 10.297C6.91886 10.3694 7.34822 10.3527 7.76027 10.248C8.17231 10.1433 8.55786 9.95296 8.89194 9.68924C9.22603 9.42553 9.50121 9.09435 9.69966 8.71713C9.89812 8.33992 10.0154 7.92508 10.044 7.49949C10.0726 7.07389 10.0118 6.64701 9.86551 6.24649Z" fill="url(#paint6_linear_802_289)"/>
<path d="M9.36006 7.06679C9.36006 8.55005 8.16191 9.75248 6.68392 9.75248C5.89947 9.75248 5.19385 9.41375 4.70436 8.8741C4.73401 8.8968 4.76445 8.91867 4.7955 8.93957C5.0002 9.07735 5.23047 9.17234 5.47256 9.21886C5.71465 9.26537 5.96359 9.26246 6.20453 9.21031C6.44548 9.15815 6.67348 9.05781 6.87493 8.91528C7.07638 8.77275 7.24716 8.59095 7.37706 8.38073C7.50697 8.17051 7.59334 7.93618 7.63102 7.69172C7.6687 7.44727 7.65692 7.1977 7.59638 6.95791C7.58621 6.92387 7.57603 6.88983 7.56925 6.85579C7.56933 6.85466 7.56933 6.85352 7.56925 6.85239C7.55123 6.76965 7.54214 6.6852 7.54212 6.6005C7.54352 6.3312 7.63554 6.07027 7.80325 5.86003C7.97096 5.6498 8.20453 5.5026 8.46607 5.4423C8.57396 5.41742 8.68394 5.4079 8.79301 5.41347C9.1483 5.86929 9.36006 6.44322 9.36006 7.06679Z" fill="url(#paint7_linear_802_289)"/>
<g filter="url(#filter0_d_802_289)">
<path d="M9.47934 2.93023L9.75865 3.43154L10.26 3.71084L9.75865 3.99014L9.47934 4.49146L9.20004 3.99014L8.69873 3.71084L9.20004 3.43154L9.47934 2.93023Z" fill="#F7F7F7"/>
</g>
<defs>
<filter id="filter0_d_802_289" x="4.69873" y="2.93023" width="9.56123" height="9.56123" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
  <feFlood flood-opacity="0" result="BackgroundImageFix"/>
  <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
  <feOffset dy="4"/>
  <feGaussianBlur stdDeviation="2"/>
  <feComposite in2="hardAlpha" operator="out"/>
  <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
  <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_802_289"/>
  <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_802_289" result="shape"/>
</filter>
<linearGradient id="paint0_linear_802_289" x1="3.85" y1="1.1854" x2="10.5" y2="13.7854" gradientUnits="userSpaceOnUse">
  <stop stop-color="#F0F0F0"/>
  <stop offset="1" stop-color="#EBEBED"/>
</linearGradient>
<linearGradient id="paint1_linear_802_289" x1="11.2" y1="13.0854" x2="2.1" y2="2.2354" gradientUnits="userSpaceOnUse">
  <stop stop-color="#2B3750"/>
  <stop offset="1" stop-color="#9AA4B9"/>
</linearGradient>
<linearGradient id="paint2_linear_802_289" x1="2.80003" y1="2.9354" x2="10.5" y2="12.7354" gradientUnits="userSpaceOnUse">
  <stop stop-color="#D6D8DF"/>
  <stop offset="1" stop-color="#DADCE3"/>
</linearGradient>
<linearGradient id="paint3_linear_802_289" x1="11.2" y1="11.6854" x2="4.20003" y2="6.0854" gradientUnits="userSpaceOnUse">
  <stop stop-color="#ABAFBF"/>
  <stop offset="1" stop-color="#B7BACC"/>
</linearGradient>
<linearGradient id="paint4_linear_802_289" x1="4.9" y1="3.2854" x2="9.8" y2="11.3354" gradientUnits="userSpaceOnUse">
  <stop stop-color="#9DA1B3"/>
  <stop offset="1" stop-color="#535A73"/>
</linearGradient>
<linearGradient id="paint5_linear_802_289" x1="4.89999" y1="4.68541" x2="9.09999" y2="10.2854" gradientUnits="userSpaceOnUse">
  <stop stop-color="#FCFCFC"/>
  <stop offset="1" stop-color="#DDDFE6"/>
</linearGradient>
<linearGradient id="paint6_linear_802_289" x1="4.89999" y1="4.68541" x2="9.09999" y2="10.2854" gradientUnits="userSpaceOnUse">
  <stop stop-color="#FCFCFC"/>
  <stop offset="1" stop-color="#DDDFE6"/>
</linearGradient>
<linearGradient id="paint7_linear_802_289" x1="4.89999" y1="4.68541" x2="9.09999" y2="10.2854" gradientUnits="userSpaceOnUse">
  <stop stop-color="#FCFCFC"/>
  <stop offset="1" stop-color="#DDDFE6"/>
</linearGradient>
</defs>
</svg>`
              : currencySymbol === 'cny'
              ? '￥'
              : '$'

          paramArray.forEach((param) => {
            const value = (param.value as [number, number])[1]
            const formattedValue = Number(value).toLocaleString(lng, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 4
            })
            result += `
              <div style="display: flex; align-items: center; margin: 4px 0; min-width: 150px">
                <div style="display: flex; align-items: center; flex: 1">
                  ${param.marker} 
                  <span style="margin-left: 4px; color: #667085; font-size: 12px">${param.seriesName}</span>
                  <span style="margin-left: 4px">${currency}</span>
                </div>
                <div style="font-weight: 500; color: #667085; font-size: 12px">${formattedValue}</div>
              </div>
            `
          })

          return result
        }
      },
      legend: {
        show: false,
        data: [t('dataDashboard.cost')],
        bottom: 0
      },
      grid: {
        left: 0,
        right: 0,
        bottom: 10,
        top: 10,
        containLabel: true
      },
      xAxis: commonXAxis,
      yAxis: {
        type: 'value',
        splitLine: {
          show: true,
          lineStyle: {
            color: '#DFE2EA',
            type: 'dashed'
          }
        },
        axisLine: {
          show: false,
          lineStyle: {
            color: '#667085',
            width: 2
          }
        },
        axisLabel: {
          // formatter: '${value}',
          color: '#667085'
        }
      },
      series: [
        {
          name: t('dataDashboard.cost'),
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: data.map((item) => [item.timestamp, item.used_amount]),
          itemStyle: {
            color: '#13C4B9'
          }
        }
      ]
    }

    // 请求数图表配置
    const requestOption: echarts.EChartsOption = {
      tooltip: {
        ...commonTooltipStyle,
        formatter: function (params) {
          if (!params) return ''
          const paramArray = Array.isArray(params) ? params : [params]
          if (paramArray.length === 0) return ''

          const time = new Date((paramArray[0].value as [number, number])[0] * 1000)
          const timeStr = time.toLocaleString(lng, {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })

          let result = `
            <div style="font-weight: 500; margin-bottom: 4px; margin-top: 4px; color: #667085; font-size: 12px">${timeStr}</div>
            <div style="height: 1px; background: #DFE2EA; margin: 8px 0;"></div>
          `

          paramArray.forEach((param) => {
            const value = (param.value as [number, number])[1]
            result += `
              <div style="display: flex; align-items: center; margin: 4px 0; min-width: 150px">
                <div style="display: flex; align-items: center; flex: 1">
                  ${param.marker} 
                  <span style="margin-left: 4px; color: #667085; font-size: 12px">${param.seriesName}</span>
                </div>
                <div style="font-weight: 500; color: #667085; font-size: 12px">${value}</div>
              </div>
            `
          })

          return result
        }
      },
      legend: {
        data: [t('dataDashboard.callCount'), t('dataDashboard.exceptionCount')],
        bottom: 10
      },
      grid: {
        left: 0,
        right: 0,
        bottom: 60,
        top: 10,
        containLabel: true
      },
      xAxis: commonXAxis,
      yAxis: {
        type: 'value',
        splitLine: {
          show: true,
          lineStyle: {
            color: '#DFE2EA',
            type: 'dashed'
          }
        },
        axisLine: {
          show: false,
          lineStyle: {
            color: '#667085',
            width: 2
          }
        },
        axisLabel: {
          color: '#667085'
        }
      },
      series: [
        {
          name: t('dataDashboard.callCount'),
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: data.map((item) => [item.timestamp, item.request_count]),
          itemStyle: {
            color: '#11B6FC'
          }
        },
        {
          name: t('dataDashboard.exceptionCount'),
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: data.map((item) => [item.timestamp, item.exception_count]),
          itemStyle: {
            color: '#FDB022'
          }
        }
      ]
    }

    // 设置图表选项
    costChartInstance.current.setOption(costOption)
    requestChartInstance.current.setOption(requestOption)

    // 图表联动
    costChartInstance.current.group = 'request-data'
    requestChartInstance.current.group = 'request-data'
    echarts.connect('request-data')
  }, [data, t, lng])

  // 处理窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      costChartInstance.current?.resize()
      requestChartInstance.current?.resize()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <Box
      display="flex"
      flexDirection="column"
      w="full"
      h="full"
      gap="24px"
      overflowY="auto"
      overflowX="hidden"
      sx={{
        '&::-webkit-scrollbar': {
          display: 'none'
        },
        msOverflowStyle: 'none',
        scrollbarWidth: 'none'
      }}>
      <Flex w="full" flex="4.5" flexDirection="column" gap="24px">
        <Text
          color="black"
          fontFamily="PingFang SC"
          fontStyle="normal"
          fontSize="14px"
          fontWeight="500"
          lineHeight="20px"
          letterSpacing="0.1px">
          {t('dataDashboard.cost')}
        </Text>
        <Box ref={costChartRef} w="full" h="full" position="relative" minH="140px" />
      </Flex>
      <Flex w="full" flex="5.5" flexDirection="column" gap="24px">
        <Text
          color="black"
          fontFamily="PingFang SC"
          fontStyle="normal"
          fontSize="14px"
          fontWeight="500"
          lineHeight="20px"
          letterSpacing="0.1px">
          {t('dataDashboard.callCount')}
        </Text>
        <Box ref={requestChartRef} w="full" h="full" position="relative" minH="160px" />
      </Flex>
    </Box>
  )
}
