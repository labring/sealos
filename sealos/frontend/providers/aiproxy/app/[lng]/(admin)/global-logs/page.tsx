'use client'

import { Box, Flex, Text, Button, Icon, Input } from '@chakra-ui/react'
import { CurrencySymbol, MyTooltip } from '@sealos/ui'
import { useMemo, useState } from 'react'

import { getGlobalLogs, getEnabledMode } from '@/api/platform'
import { useTranslationClientSide } from '@/app/i18n/client'
import SelectDateRange from '@/components/common/SelectDateRange'
import SwitchPage from '@/components/common/SwitchPage'
import { BaseTable } from '@/components/table/BaseTable'
import { useI18n } from '@/providers/i18n/i18nContext'
import { GlobalLogItem } from '@/types/user/logs'
import { useQuery } from '@tanstack/react-query'
import { ColumnDef, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { QueryKey } from '@/types/query-key'
import { SingleSelectComboboxUnstyle } from '@/components/common/SingleSelectComboboxUnStyle'
import { useBackendStore } from '@/store/backend'

export default function Home(): React.JSX.Element {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const { currencySymbol } = useBackendStore()

  const [startTime, setStartTime] = useState(() => {
    const currentDate = new Date()
    currentDate.setMonth(currentDate.getMonth() - 1)
    return currentDate
  })
  const [endTime, setEndTime] = useState(new Date())
  const [groupId, setGroupId] = useState('')
  const [name, setName] = useState('')
  const [modelName, setModelName] = useState<string>('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [logData, setLogData] = useState<GlobalLogItem[]>([])
  const [total, setTotal] = useState(0)

  const { data: models = [] } = useQuery([QueryKey.GetEnabledModels], () => getEnabledMode())

  const { isLoading } = useQuery(
    [QueryKey.GetGlobalLogs, page, pageSize, name, modelName, startTime, endTime, groupId],
    () =>
      getGlobalLogs({
        page,
        perPage: pageSize,
        token_name: name,
        model_name: modelName,
        start_timestamp: startTime.getTime().toString(),
        end_timestamp: endTime.getTime().toString(),
        group_id: groupId
      }),
    {
      onSuccess: (data) => {
        if (!data?.logs) {
          setLogData([])
          setTotal(0)
          return
        }
        setLogData(data?.logs || [])
        setTotal(data?.total || 0)
      }
    }
  )

  const columns = useMemo<ColumnDef<GlobalLogItem>[]>(() => {
    return [
      {
        header: t('GlobalLogs.groupId'),
        accessorKey: 'group'
      },
      {
        header: t('GlobalLogs.tokenName'),
        accessorKey: 'token_name'
      },
      {
        header: t('logs.model'),
        accessorKey: 'model'
      },
      {
        header: t('GlobalLogs.channel'),
        accessorKey: 'channel'
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
                  <Text
                    noOfLines={1}
                    color="grayModern.600"
                    fontFamily="PingFang SC"
                    fontSize="12px"
                    fontWeight={500}
                    lineHeight="16px"
                    letterSpacing="0.5px">
                    {t('logs.total_price')}
                  </Text>
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
    <Flex
      pt="4px"
      pb="12px"
      pr="12px"
      h="100vh"
      width="full"
      flexDirection="column"
      overflow="hidden">
      <Flex
        bg="white"
        px="32px"
        pt="24px"
        pb="8px"
        gap="24px"
        borderRadius="12px"
        flexDirection="column"
        h="full"
        w="full"
        flex="1">
        {/* -- header */}
        <Flex flexDirection="column" gap="16px" alignItems="flex-start">
          <Flex
            w="full"
            h="32px"
            justifyContent="space-between"
            alignItems="center"
            alignSelf="stretch">
            <Text
              color="black"
              fontFamily="PingFang SC"
              fontSize="20px"
              fontStyle="normal"
              fontWeight="500"
              lineHeight="26px"
              letterSpacing="0.15px">
              {t('logs.call_log')}
            </Text>
            <Button
              variant="outline"
              _hover={{
                transform: 'scale(1.05)',
                transition: 'transform 0.2s ease'
              }}
              _active={{
                transform: 'scale(0.92)',
                animation: 'pulse 0.3s ease'
              }}
              sx={{
                '@keyframes pulse': {
                  '0%': { transform: 'scale(0.92)' },
                  '50%': { transform: 'scale(0.96)' },
                  '100%': { transform: 'scale(0.92)' }
                }
              }}
              display="flex"
              padding="8px"
              justifyContent="center"
              alignItems="center"
              gap="8px"
              borderRadius="6px"
              border="1px solid #DFE2EA"
              bg="white"
              boxShadow="0px 1px 2px 0px rgba(19, 51, 107, 0.05), 0px 0px 1px 0px rgba(19, 51, 107, 0.08)"
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
          <Flex gap="16px" flexDirection="column" alignItems="flex-start" alignSelf="stretch">
            {/* -- the first row */}
            <Flex
              alignItems="flex-start"
              justifyContent="space-between"
              sx={{
                transition: 'gap 0.3s ease',
                '@media screen and (min-width: 1300px)': {
                  gap: '160px',
                  flexWrap: 'nowrap'
                }
              }}
              gap="16px"
              alignSelf="stretch"
              flexWrap="wrap">
              <Flex h="32px" gap="32px" alignItems="center" flex="0 0 auto">
                <Text
                  whiteSpace="nowrap"
                  color="grayModern.900"
                  fontFamily="PingFang SC"
                  fontSize="12px"
                  fontStyle="normal"
                  fontWeight="500"
                  lineHeight="16px"
                  letterSpacing="0.5px">
                  {t('GlobalLogs.keyName')}
                </Text>
                <Input
                  w="500px"
                  py="6px"
                  px="12px"
                  alignItems="center"
                  borderRadius="4px"
                  border="1px solid"
                  borderColor="grayModern.200"
                  bgColor="grayModern.50"
                  _hover={{ borderColor: 'grayModern.300' }}
                  _focus={{ borderColor: 'grayModern.300' }}
                  _focusVisible={{ borderColor: 'grayModern.300' }}
                  _active={{ borderColor: 'grayModern.300' }}
                  placeholder={t('GlobalLogs.select_token_name')}
                  _placeholder={{
                    color: 'grayModern.500',
                    fontFamily: 'PingFang SC',
                    fontSize: '12px',
                    fontWeight: 400,
                    lineHeight: '16px',
                    letterSpacing: '0.048px'
                  }}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Flex>

              <Flex h="32px" gap="32px" alignItems="center" flex="0 0 auto">
                <Text
                  whiteSpace="nowrap"
                  color="grayModern.900"
                  fontFamily="PingFang SC"
                  fontSize="12px"
                  fontStyle="normal"
                  fontWeight="500"
                  lineHeight="16px"
                  letterSpacing="0.5px">
                  {t('logs.modal')}
                </Text>

                <SingleSelectComboboxUnstyle<string>
                  dropdownItems={['all', ...models.map((item) => item.model)]}
                  setSelectedItem={(value) => {
                    if (value === 'all') {
                      setModelName('')
                    } else {
                      setModelName(value)
                    }
                  }}
                  handleDropdownItemFilter={(dropdownItems, inputValue) => {
                    const lowerCasedInput = inputValue.toLowerCase()
                    return dropdownItems.filter(
                      (item) => !inputValue || item.toLowerCase().includes(lowerCasedInput)
                    )
                  }}
                  handleDropdownItemDisplay={(dropdownItem) => {
                    return (
                      <Text
                        color="grayModern.600"
                        fontFamily="PingFang SC"
                        fontSize="12px"
                        fontStyle="normal"
                        fontWeight={400}
                        lineHeight="16px"
                        letterSpacing="0.048px">
                        {dropdownItem}
                      </Text>
                    )
                  }}
                  flexProps={{ w: '500px' }}
                  placeholder={t('GlobalLogs.selectModel')}
                />
              </Flex>
            </Flex>

            {/* -- the first row end */}

            {/* -- the second row */}
            <Flex
              alignItems="flex-start"
              justifyContent="space-between"
              sx={{
                transition: 'gap 0.3s ease',
                '@media screen and (min-width: 1300px)': {
                  gap: '160px',
                  flexWrap: 'nowrap'
                }
              }}
              gap="16px"
              alignSelf="stretch"
              flexWrap="wrap">
              <Flex h="32px" gap="32px" alignItems="center" flex="0 0 auto">
                <Text
                  whiteSpace="nowrap"
                  color="grayModern.900"
                  fontFamily="PingFang SC"
                  fontSize="12px"
                  fontStyle="normal"
                  fontWeight="500"
                  lineHeight="16px"
                  letterSpacing="0.5px">
                  {t('GlobalLogs.groupId')}
                </Text>
                <Input
                  w="500px"
                  py="6px"
                  px="12px"
                  alignItems="center"
                  borderRadius="4px"
                  border="1px solid"
                  borderColor="grayModern.200"
                  bgColor="grayModern.50"
                  _hover={{ borderColor: 'grayModern.300' }}
                  _focus={{ borderColor: 'grayModern.300' }}
                  _focusVisible={{ borderColor: 'grayModern.300' }}
                  _active={{ borderColor: 'grayModern.300' }}
                  placeholder={t('GlobalLogs.selectGroupId')}
                  _placeholder={{
                    color: 'grayModern.500',
                    fontFamily: 'PingFang SC',
                    fontSize: '12px',
                    fontWeight: 400,
                    lineHeight: '16px',
                    letterSpacing: '0.048px'
                  }}
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                />
              </Flex>

              <Flex h="32px" gap="32px" alignItems="center" flex="0 0 auto">
                <Text
                  whiteSpace="nowrap"
                  color="grayModern.900"
                  fontFamily="PingFang SC"
                  fontSize="12px"
                  fontStyle="normal"
                  fontWeight="500"
                  lineHeight="16px"
                  letterSpacing="0.5px">
                  {t('logs.time')}
                </Text>
                <SelectDateRange
                  w="500px"
                  startTime={startTime}
                  setStartTime={setStartTime}
                  endTime={endTime}
                  setEndTime={setEndTime}
                />
              </Flex>
            </Flex>
            {/* -- the second row end */}
          </Flex>
        </Flex>
        {/* -- header end */}

        {/* -- table */}
        <Flex gap="24px" flexDirection="column" flex="1">
          <BaseTable table={table} isLoading={isLoading} />
          <SwitchPage
            m="0"
            justifyContent={'end'}
            currentPage={page}
            totalPage={Math.ceil(total / pageSize)}
            totalItem={total}
            pageSize={pageSize}
            setCurrentPage={(idx: number) => setPage(idx)}
          />
        </Flex>
        {/* -- table end */}
      </Flex>
    </Flex>
  )
}
