'use client'

import { Box, Flex, Text, Button, Icon } from '@chakra-ui/react'
import { CurrencySymbol, MySelect, MyTooltip } from '@sealos/ui'
import { useMemo, useState } from 'react'

import { getKeys, getLogs, getModels } from '@/api/platform'
import { useTranslationClientSide } from '@/app/i18n/client'
import SelectDateRange from '@/components/SelectDateRange'
import SwitchPage from '@/components/SwitchPage'
import { BaseTable } from '@/components/table/baseTable'
import { useI18n } from '@/providers/i18n/i18nContext'
import { LogItem } from '@/types/log'
import { useQuery } from '@tanstack/react-query'
import { ColumnDef, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { useBackendStore } from '@/store/backend'

const mockStatus = ['all', 'success', 'failed']

export default function Home(): React.JSX.Element {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')

  const [startTime, setStartTime] = useState(() => {
    const currentDate = new Date()
    currentDate.setMonth(currentDate.getMonth() - 1)
    return currentDate
  })
  const [endTime, setEndTime] = useState(new Date())
  const [name, setName] = useState('')
  const [modelName, setModelName] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [logData, setLogData] = useState<LogItem[]>([])
  const [total, setTotal] = useState(0)
  const { currencySymbol } = useBackendStore()

  const { data: models = [] } = useQuery(['getModels'], () => getModels())
  const { data: tokenData } = useQuery(['getKeys'], () => getKeys({ page: 1, perPage: 100 }))

  const { isLoading } = useQuery(
    ['getLogs', page, pageSize, name, modelName, startTime, endTime],
    () =>
      getLogs({
        page,
        perPage: pageSize,
        token_name: name,
        model_name: modelName,
        start_timestamp: startTime.getTime().toString(),
        end_timestamp: endTime.getTime().toString()
      }),
    {
      onSuccess: (data) => {
        if (!data.logs) {
          setLogData([])
          setTotal(0)
          return
        }
        setLogData(data.logs)
        setTotal(data.total)
      }
    }
  )

  const columns = useMemo<ColumnDef<LogItem>[]>(() => {
    return [
      {
        header: t('logs.name'),
        accessorKey: 'token_name'
      },
      {
        header: t('logs.model'),
        accessorKey: 'model'
      },
      {
        header: t('logs.prompt_tokens'),
        accessorKey: 'prompt_tokens'
      },
      {
        header: t('logs.completion_tokens'),
        accessorKey: 'completion_tokens'
      },

      {
        header: t('logs.status'),
        accessorFn: (row) => (row.code === 200 ? t('logs.success') : t('logs.failed')),
        cell: ({ getValue }) => {
          const value = getValue() as string
          return (
            <Text
              color={
                value === t('logs.success')
                  ? 'var(--Green-600, #039855)'
                  : 'var(--Red-600, #D92D20)'
              }
              fontFamily="PingFang SC"
              fontSize="12px"
              fontWeight={500}
              lineHeight="16px"
              letterSpacing="0.5px">
              {value}
            </Text>
          )
        },
        id: 'status'
      },
      {
        header: t('logs.time'),
        accessorFn: (row) => new Date(row.created_at).toLocaleString(),
        id: 'created_at'
      },
      {
        accessorKey: 'used_amount',
        id: 'used_amount',
        header: () => {
          return (
            <Box position={'relative'}>
              <MyTooltip placement="bottom-end" label={t('logs.total_price_tip')}>
                <Flex alignItems={'center'} gap={'4px'}>
                  {t('logs.total_price')}
                  <CurrencySymbol type={currencySymbol} />
                </Flex>
              </MyTooltip>
            </Box>
          )
        }
      }
    ]
  }, [])

  const table = useReactTable({
    data: logData,
    columns,
    getCoreRowModel: getCoreRowModel()
  })

  return (
    <Flex w="full" h="full" flexDirection={'column'} pr={'8px'} pb={'8px'} overflow={'hidden'}>
      <Flex
        flexDirection={'column'}
        flex={1}
        h={'0'}
        bg={'white'}
        borderRadius={'12px'}
        px={'32px'}
        pt={'24px'}>
        <Flex justifyContent={'space-between'} color={'black'} fontSize={'20px'} fontWeight={500}>
          <Text>{t('logs.call_log')}</Text>
          <Button
            border={'1px solid #DFE2EA'}
            variant={'square'}
            onClick={() => {
              setName('')
              setModelName('')
            }}>
            <Icon
              xmlns="http://www.w3.org/2000/svg"
              width="16px"
              height="16px"
              viewBox="0 0 16 16"
              fill="none">
              <path
                d="M6.4354 14.638C5.1479 14.2762 4.0979 13.5684 3.2854 12.5145C2.4729 11.4606 2.06665 10.2473 2.06665 8.87454C2.06665 8.16346 2.1854 7.48656 2.4229 6.84385C2.6604 6.20113 2.9979 5.61181 3.4354 5.07589C3.5729 4.92619 3.74165 4.84809 3.94165 4.8416C4.14165 4.83512 4.3229 4.91321 4.4854 5.07589C4.6229 5.21311 4.6949 5.38152 4.7014 5.58113C4.7079 5.78073 4.64215 5.96785 4.50415 6.1425C4.20415 6.52923 3.9729 6.95338 3.8104 7.41496C3.6479 7.87653 3.56665 8.36306 3.56665 8.87454C3.56665 9.88501 3.86365 10.7865 4.45765 11.5789C5.05165 12.3713 5.81715 12.9107 6.75415 13.1971C6.91665 13.247 7.0509 13.3406 7.1569 13.4778C7.2629 13.6151 7.31615 13.7648 7.31665 13.9269C7.31665 14.1764 7.22915 14.373 7.05415 14.5167C6.87915 14.6605 6.6729 14.7009 6.4354 14.638ZM9.6979 14.638C9.4604 14.7004 9.25415 14.6567 9.07915 14.507C8.90415 14.3573 8.81665 14.1577 8.81665 13.9082C8.81665 13.7585 8.8699 13.6151 8.9764 13.4778C9.0829 13.3406 9.21715 13.247 9.37915 13.1971C10.3167 12.8977 11.0824 12.3551 11.6764 11.5691C12.2704 10.7832 12.5672 9.88501 12.5667 8.87454C12.5667 7.62703 12.1292 6.56665 11.2542 5.6934C10.3792 4.82015 9.31665 4.38352 8.06665 4.38352H8.0104L8.3104 4.68292C8.4479 4.82015 8.51665 4.9948 8.51665 5.20687C8.51665 5.41895 8.4479 5.5936 8.3104 5.73083C8.1729 5.86805 7.9979 5.93666 7.7854 5.93666C7.5729 5.93666 7.3979 5.86805 7.2604 5.73083L5.6854 4.15897C5.6104 4.08412 5.5574 4.00303 5.5264 3.91571C5.4954 3.82838 5.47965 3.73482 5.47915 3.63502C5.47915 3.53522 5.4949 3.44166 5.5264 3.35433C5.5579 3.26701 5.6109 3.18592 5.6854 3.11107L7.2604 1.53921C7.3979 1.40199 7.5729 1.33337 7.7854 1.33337C7.9979 1.33337 8.1729 1.40199 8.3104 1.53921C8.4479 1.67644 8.51665 1.85109 8.51665 2.06316C8.51665 2.27524 8.4479 2.44989 8.3104 2.58712L8.0104 2.88652H8.06665C9.74165 2.88652 11.1604 3.46661 12.3229 4.62678C13.4854 5.78696 14.0667 7.20288 14.0667 8.87454C14.0667 10.2343 13.6604 11.4444 12.8479 12.5048C12.0354 13.5652 10.9854 14.2762 9.6979 14.638Z"
                fill="#485264"
              />
            </Icon>
          </Button>
        </Flex>

        <Flex flexDirection={'column'} mb={'24px'} gap={4} mt={'16px'} flexWrap={'wrap'}>
          <Flex flex={1} justifyContent={'space-between'} gap={'20px'}>
            <Flex alignItems={'center'} flex={1}>
              <Box flexShrink={0} w={'100px'}>
                {t('logs.name')}
              </Box>
              <MySelect
                boxStyle={{
                  w: '100%'
                }}
                maxW={'500px'}
                w={'100%'}
                placeholder={t('logs.select_token_name')}
                height="32px"
                value={name}
                list={[
                  {
                    value: 'all',
                    label: 'all'
                  },
                  ...(tokenData?.tokens?.map((item) => ({
                    value: item.name,
                    label: item.name
                  })) || [])
                ]}
                onchange={(val: string) => {
                  if (val === 'all') {
                    setName('')
                  } else {
                    setName(val)
                  }
                }}
              />
            </Flex>

            <Flex alignItems={'center'} flex={1}>
              <Box flexShrink={0} w={'100px'}>
                {t('logs.modal')}
              </Box>
              <MySelect
                placeholder={t('logs.select_modal')}
                boxStyle={{
                  w: '100%'
                }}
                maxW={'500px'}
                w={'100%'}
                height="32px"
                value={modelName}
                list={
                  ['all', ...models].map((item) => ({
                    value: item,
                    label: item
                  })) || []
                }
                onchange={(val: string) => {
                  if (val === 'all') {
                    setModelName('')
                  } else {
                    setModelName(val)
                  }
                }}
              />
            </Flex>
          </Flex>

          <Flex alignItems={'center'} maxW={'50%'} pr={'10px'}>
            <Box flexShrink={0} w={'100px'}>
              {t('logs.time')}
            </Box>
            <SelectDateRange
              startTime={startTime}
              setStartTime={setStartTime}
              endTime={endTime}
              setEndTime={setEndTime}
            />
          </Flex>
        </Flex>

        <BaseTable table={table} isLoading={isLoading} />
        <SwitchPage
          justifyContent={'end'}
          currentPage={page}
          totalPage={Math.ceil(total / pageSize)}
          totalItem={total}
          pageSize={pageSize}
          setCurrentPage={(idx: number) => setPage(idx)}
        />
      </Flex>
    </Flex>
  )
}
