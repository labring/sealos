'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Box, Flex, Grid, Input, Select } from '@chakra-ui/react'
import { MySelect } from '@sealos/ui'

import { useTranslationClientSide } from '@/app/i18n/client'
import SelectDateRange from '@/components/SelectDateRange'
import { useI18n } from '@/providers/i18n/i18nContext'
import { LogForm } from '@/types/form'

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

  return (
    <Box h="100%" pr={'8px'} pb={'8px'}>
      <Box h={'100%'} bg={'white'} borderRadius={'12px'} px={'32px'} pt={'24px'}>
        <Box color={'black'} fontSize={'20px'} fontWeight={500} mb={4}>
          {t('logs.call_log')}
        </Box>
        <Flex gap={4} mb={4} flexWrap={'wrap'}>
          <Flex alignItems={'center'} w={'50%'}>
            <Box flexBasis={'100px'}>{t('logs.name')}</Box>
            <MySelect
              width={'120px'}
              height="32px"
              value={getValues('name')}
              list={mockNames.map((item) => ({
                value: item.name,
                label: item.name
              }))}
              onchange={(val: string) => setValue('name', val)}
            />
          </Flex>

          <Flex alignItems={'center'} w={'50%'}>
            <Box flexBasis={'100px'}>{t('logs.modal')}</Box>
            <MySelect
              width={'120px'}
              height="32px"
              value={getValues('modelName')}
              list={mockModals.map((item) => ({
                value: item,
                label: item
              }))}
              onchange={(val: string) => setValue('modelName', val)}
            />
          </Flex>

          <Flex alignItems={'center'} w={'50%'}>
            <Box flexBasis={'100px'}>{t('logs.status')}</Box>
            {/* <MySelect
              width={'120px'}
              height="32px"
              value={getValues('status')}
              list={mockStatus.map((item) => ({
                value: item,
                label: item
              }))}
              onchange={(val: string) => setValue('status', val)}
            /> */}
          </Flex>
          <Flex alignItems={'center'} w={'50%'}>
            <Box flexBasis={'100px'}>{t('logs.time')}</Box>
            <SelectDateRange
              startTime={startTime}
              setStartTime={setStartTime}
              endTime={endTime}
              setEndTime={setEndTime}
            />
          </Flex>
        </Flex>
      </Box>
    </Box>
  )
}
