'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Box, Flex, Grid, Input, Select } from '@chakra-ui/react'
import { MySelect } from '@sealos/ui'

import { useTranslationClientSide } from '@/app/i18n/client'
import SelectDateRange from '@/components/SelectDateRange'
import { useI18n } from '@/providers/i18n/i18nContext'
import { LogForm } from '@/types/form'
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { LogItem } from '@/types/log'
import { BaseTable } from '@/components/table/baseTable'
import SwitchPage from '@/components/SwitchPage'

const mockModals = ['gpt-3.5-turbo', 'gpt-4o-mini', 'gpt-4']

const mockNames = [
  {
    id: 1,
    group: 'ns-admin',
    key: 'ngjLFEFQaEudGOFKA2E6Cc64239644BcA045E57c9eE721F9',
    status: 1,
    name: 'test token',
    quota: 0,
    used_amount: 0,
    request_count: 0,
    models: null,
    subnet: '',
    created_at: 1729672144913,
    accessed_at: -62135596800000,
    expired_at: -62135596800000
  }
]

const mockStatus = ['success', 'failed']

const mockLogItems: LogItem[] = [
  {
    token_name: 'test token',
    endpoint: '/v1/chat/completions',
    content: '',
    group: 'ns-admin',
    model: 'gpt-3.5-turbo',
    price: 0.0035,
    completion_price: 0.0035,
    token_id: 1,
    used_amount: 0.0002415,
    prompt_tokens: 18,
    completion_tokens: 51,
    channel: 1,
    code: 200,
    created_at: 1730354956491
  },
  {
    token_name: 'test token',
    endpoint: '/v1/chat/completions',
    content: '',
    group: 'ns-admin',
    model: 'gpt-3.5-turbo',
    price: 0.0035,

    completion_price: 0.0035,
    token_id: 1,
    used_amount: 0.000315,
    prompt_tokens: 18,
    completion_tokens: 72,
    channel: 1,
    code: 200,
    created_at: 1730354922071
  },
  {
    token_name: 'test token',
    endpoint: '/v1/chat/completions',
    content: '',
    group: 'ns-admin',
    model: 'gpt-3.5-turbo',
    price: 0.0035,

    completion_price: 0.0035,
    token_id: 1,
    used_amount: 0.000294,
    prompt_tokens: 18,
    completion_tokens: 66,
    channel: 1,
    code: 200,
    created_at: 1730354860678
  },
  {
    token_name: 'test token',
    endpoint: '/v1/chat/completions',
    content: '',
    group: 'ns-admin',
    model: 'gpt-3.5-turbo',
    price: 0.0035,

    completion_price: 0.0035,
    token_id: 1,
    used_amount: 0.0004375,
    prompt_tokens: 18,
    completion_tokens: 107,
    channel: 1,
    code: 200,
    created_at: 1730354800680
  },
  {
    token_name: 'test token',
    endpoint: '/v1/chat/completions',
    content: '',
    group: 'ns-admin',
    model: 'gpt-3.5-turbo',
    price: 0.0035,
    completion_price: 0.0035,
    token_id: 1,
    used_amount: 0.0003605,
    prompt_tokens: 18,
    completion_tokens: 85,
    channel: 1,
    code: 200,
    created_at: 1730088079991
  },
  {
    token_name: 'test token',
    endpoint: '/v1/chat/completions',
    content: '',
    group: 'ns-admin',
    model: 'gpt-3.5-turbo',
    price: 0.0035,

    completion_price: 0.0035,
    token_id: 1,
    used_amount: 0.000329,
    prompt_tokens: 18,
    completion_tokens: 76,
    channel: 1,
    code: 200,
    created_at: 1730087556437
  },
  {
    token_name: 'test token',
    endpoint: '/v1/chat/completions',
    content: '',
    group: 'ns-admin',
    model: 'gpt-3.5-turbo',
    price: 0.0035,
    id: 5,
    completion_price: 0.0105,
    token_id: 1,
    used_amount: 0.0005775000000000001,
    prompt_tokens: 18,
    completion_tokens: 49,
    channel: 1,
    code: 200,
    created_at: 1729847798155
  },
  {
    token_name: 'test token',
    endpoint: '/v1/chat/completions',
    content: '',
    group: 'ns-admin',
    model: 'gpt-3.5-turbo',
    price: 0.0035,
    id: 4,
    completion_price: 0.0105,
    token_id: 1,
    used_amount: 0.000672,
    prompt_tokens: 18,
    completion_tokens: 58,
    channel: 1,
    code: 200,
    created_at: 1729840920384
  },
  {
    token_name: 'test token',
    endpoint: '/v1/chat/completions',
    content: '',
    group: 'ns-admin',
    model: 'gpt-3.5-turbo',
    price: 0.0035,
    id: 3,
    completion_price: 0.0105,
    token_id: 1,
    used_amount: 0.00034749225,
    prompt_tokens: 99,
    completion_tokens: 27,
    channel: 1,
    code: 200,
    created_at: 1729840549119
  },
  {
    token_name: 'test token',
    endpoint: '/v1/chat/completions',
    content: '',
    group: 'ns-admin',
    model: 'gpt-3.5-turbo',
    price: 0.0035,
    id: 2,
    completion_price: 0.0105,
    token_id: 1,
    used_amount: 0.00006638100000000001,
    prompt_tokens: 18,
    completion_tokens: 92,
    channel: 1,
    code: 200,
    created_at: 1729840027914
  },
  {
    token_name: 'test token',
    endpoint: '/v1/chat/completions',
    content: '',
    group: 'ns-admin',
    model: 'gpt-3.5-turbo',
    price: 0.0035,
    id: 5,
    completion_price: 0.0105,
    token_id: 1,
    used_amount: 0.0005775000000000001,
    prompt_tokens: 18,
    completion_tokens: 49,
    channel: 1,
    code: 200,
    created_at: 1729847798155
  },
  {
    token_name: 'test token',
    endpoint: '/v1/chat/completions',
    content: '',
    group: 'ns-admin',
    model: 'gpt-3.5-turbo',
    price: 0.0035,
    id: 4,
    completion_price: 0.0105,
    token_id: 1,
    used_amount: 0.000672,
    prompt_tokens: 18,
    completion_tokens: 58,
    channel: 1,
    code: 200,
    created_at: 1729840920384
  },
  {
    token_name: 'test token',
    endpoint: '/v1/chat/completions',
    content: '',
    group: 'ns-admin',
    model: 'gpt-3.5-turbo',
    price: 0.0035,
    id: 3,
    completion_price: 0.0105,
    token_id: 1,
    used_amount: 0.00034749225,
    prompt_tokens: 99,
    completion_tokens: 27,
    channel: 1,
    code: 200,
    created_at: 1729840549119
  },
  {
    token_name: 'test token',
    endpoint: '/v1/chat/completions',
    content: '',
    group: 'ns-admin',
    model: 'gpt-3.5-turbo',
    price: 0.0035,
    id: 2,
    completion_price: 0.0105,
    token_id: 1,
    used_amount: 0.00006638100000000001,
    prompt_tokens: 18,
    completion_tokens: 92,
    channel: 1,
    code: 200,
    created_at: 1729840027914
  }
]

export default function Home(): React.JSX.Element {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')

  const [startTime, setStartTime] = useState(() => {
    const currentDate = new Date()
    currentDate.setMonth(currentDate.getMonth() - 1)
    return currentDate
  })
  const [endTime, setEndTime] = useState(new Date())

  const { getValues, setValue } = useForm<LogForm>({
    defaultValues: {
      name: '',
      modelName: '',
      createdAt: new Date(),
      endedAt: new Date(),
      page: 1,
      pageSize: 10
    }
  })

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
    data: mockLogItems,
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
              w={'300px'}
              height="32px"
              value={getValues('name')}
              list={mockNames.map((item) => ({
                value: item.name,
                label: item.name
              }))}
              onchange={(val: string) => setValue('name', val)}
            />
          </Flex>

          <Flex alignItems={'center'} flex={1}>
            <Box flexShrink={0} w={'100px'}>
              {t('logs.modal')}
            </Box>
            <MySelect
              w={'300px'}
              height="32px"
              value={getValues('modelName')}
              list={mockModals.map((item) => ({
                value: item,
                label: item
              }))}
              onchange={(val: string) => setValue('modelName', val)}
            />
          </Flex>

          <Flex alignItems={'center'} flex={1}>
            <Box flexShrink={0} w={'100px'}>
              {t('logs.status')}
            </Box>
            <MySelect
              w={'300px'}
              height="32px"
              value={getValues('modelName')}
              list={mockStatus.map((item) => ({
                value: item,
                label: item
              }))}
              onchange={(val: string) => setValue('modelName', val)}
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
            currentPage={getValues('page')}
            totalPage={10}
            totalItem={100}
            pageSize={10}
            setCurrentPage={(idx: number) => setValue('page', idx)}
          />
        </Box>
      </Box>
    </Box>
  )
}
