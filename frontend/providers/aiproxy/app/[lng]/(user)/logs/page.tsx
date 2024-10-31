'use client'

import { Box, Flex } from '@chakra-ui/react'
import { MySelect } from '@sealos/ui'
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
  const [pageSize, setPageSize] = useState(1)
  const [logData, setLogData] = useState<LogItem[]>([])
  const [total, setTotal] = useState(0)

  const { data: models = [] } = useQuery(['getModels'], () => getModels())
  const { data: modelNames = [] } = useQuery(['getKeys'], () => getKeys())

  useQuery(
    ['getLogs', page, pageSize, name, modelName],
    () => getLogs({ page, perPage: pageSize, token_name: name, model_name: modelName }),
    {
      onSuccess: (data) => {
        console.log(data, 'data')
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

  console.log(models, logData, modelNames)

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
        accessorFn: (row) => (row.code === 200 ? 'success' : 'failed'),
        id: 'status'
      },
      {
        header: t('logs.time'),
        accessorFn: (row) => new Date(row.created_at).toLocaleString(),
        id: 'created_at'
      },
      {
        header: t('logs.price'),
        accessorFn: (row) => `${row.price}/${row.completion_price}`,
        id: 'price'
      }
    ]
  }, [])

  const table = useReactTable({
    data: logData,
    columns,
    getCoreRowModel: getCoreRowModel()
  })

  return (
    <Box h="100%" pr={'8px'} pb={'8px'}>
      <Box h={'100%'} bg={'white'} borderRadius={'12px'} px={'32px'} pt={'24px'}>
        <Box color={'black'} fontSize={'20px'} fontWeight={500}>
          {t('logs.call_log')}
        </Box>
        <Flex gap={4} mt={'16px'} flexWrap={'wrap'}>
          <Flex alignItems={'center'} flex={1}>
            <Box flexShrink={0} w={'100px'}>
              {t('logs.name')}
            </Box>
            <MySelect
              placeholder={t('logs.select_token_name')}
              w={'300px'}
              height="32px"
              value={name}
              list={models.map((item) => ({
                value: item,
                label: item
              }))}
              onchange={(val: string) => setName(val)}
            />
          </Flex>

          <Flex alignItems={'center'} flex={1}>
            <Box flexShrink={0} w={'100px'}>
              {t('logs.modal')}
            </Box>
            <MySelect
              placeholder={t('logs.select_modal')}
              w={'300px'}
              height="32px"
              value={modelName}
              list={models.map((item) => ({
                value: item,
                label: item
              }))}
              onchange={(val: string) => setModelName(val)}
            />
          </Flex>

          <Flex alignItems={'center'} flex={1}>
            <Box flexShrink={0} w={'100px'}>
              {t('logs.status')}
            </Box>
            <MySelect
              w={'300px'}
              height="32px"
              value={modelName}
              list={mockStatus.map((item) => ({
                value: item,
                label: item
              }))}
              onchange={(val: string) => setModelName(val)}
            />
          </Flex>
          <Flex alignItems={'center'} flex={1}>
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
        <Box mt={'24px'}>
          <BaseTable table={table} />
          <SwitchPage
            justifyContent={'end'}
            currentPage={page}
            totalPage={Math.ceil(total / pageSize)}
            totalItem={total}
            pageSize={pageSize}
            setCurrentPage={(idx: number) => setPage(idx)}
          />
        </Box>
      </Box>
    </Box>
  )
}
