'use client'

import {
  Box,
  Flex,
  Text,
  Button,
  Icon,
  Modal,
  useDisclosure,
  ModalOverlay,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalContent,
  Grid
} from '@chakra-ui/react'
import { CurrencySymbol, MySelect, MyTooltip } from '@sealos/ui'
import { useMemo, useState } from 'react'

import { getTokens, getUserLogs, getEnabledMode } from '@/api/platform'
import { useTranslationClientSide } from '@/app/i18n/client'
import SelectDateRange from '@/components/common/SelectDateRange'
import SwitchPage from '@/components/common/SwitchPage'
import { BaseTable } from '@/components/table/BaseTable'
import { useI18n } from '@/providers/i18n/i18nContext'
import { LogItem } from '@/types/user/logs'
import { useQuery } from '@tanstack/react-query'
import { getCoreRowModel, useReactTable, createColumnHelper } from '@tanstack/react-table'
import { QueryKey } from '@/types/query-key'
import { useBackendStore } from '@/store/backend'
import { SingleSelectComboboxUnstyle } from '@/components/common/SingleSelectComboboxUnStyle'
import { getTranslationWithFallback } from '@/utils/common'
import ReactJson, { OnCopyProps } from 'react-json-view'

const getTimeDiff = (createdAt: number, requestAt: number) => {
  const diff = Number(((createdAt - requestAt) / 1000).toFixed(4)).toString()
  return `${diff}s`
}

export default function Logs(): React.JSX.Element {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const { currencySymbol } = useBackendStore()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [selectedRow, setSelectedRow] = useState<LogItem | null>(null)

  const [startTime, setStartTime] = useState(() => {
    const currentDate = new Date()
    currentDate.setMonth(currentDate.getMonth() - 1)
    return currentDate
  })
  const [endTime, setEndTime] = useState(new Date())
  const [name, setName] = useState('')
  const [codeType, setCodeType] = useState('all')
  const [modelName, setModelName] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [logData, setLogData] = useState<LogItem[]>([])
  const [total, setTotal] = useState(0)

  const { data: modelConfigs = [] } = useQuery([QueryKey.GetEnabledModels], () => getEnabledMode())
  const { data: tokenData } = useQuery([QueryKey.GetTokens], () =>
    getTokens({ page: 1, perPage: 100 })
  )

  const { isLoading } = useQuery(
    [QueryKey.GetUserLogs, page, pageSize, name, modelName, startTime, endTime, codeType],
    () =>
      getUserLogs({
        page,
        perPage: pageSize,
        token_name: name,
        model_name: modelName,
        code_type: codeType as 'all' | 'success' | 'error',
        start_timestamp: startTime.getTime().toString(),
        end_timestamp: endTime.getTime().toString()
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

  const columnHelper = createColumnHelper<LogItem>()

  const columns = useMemo(
    () => [
      columnHelper.accessor('token_name', {
        header: () => (
          <Text
            color="grayModern.600"
            fontFamily="PingFang SC"
            fontSize="12px"
            fontWeight={500}
            lineHeight="16px"
            letterSpacing="0.5px">
            {t('logs.name')}
          </Text>
        ),
        id: 'token_name'
      }),
      columnHelper.accessor('model', {
        header: () => (
          <Text
            color="grayModern.600"
            fontFamily="PingFang SC"
            fontSize="12px"
            fontWeight={500}
            lineHeight="16px"
            letterSpacing="0.5px">
            {t('logs.model')}
          </Text>
        ),
        id: 'model'
      }),
      columnHelper.accessor('prompt_tokens', {
        header: () => (
          <Text
            color="grayModern.600"
            fontFamily="PingFang SC"
            fontSize="12px"
            fontWeight={500}
            lineHeight="16px"
            letterSpacing="0.5px">
            {t('logs.prompt_tokens')}
          </Text>
        ),
        id: 'prompt_tokens'
      }),
      columnHelper.accessor('completion_tokens', {
        header: () => (
          <Text
            color="grayModern.600"
            fontFamily="PingFang SC"
            fontSize="12px"
            fontWeight={500}
            lineHeight="16px"
            letterSpacing="0.5px">
            {t('logs.completion_tokens')}
          </Text>
        ),
        id: 'completion_tokens'
      }),

      columnHelper.display({
        header: () => (
          <Text
            color="grayModern.600"
            fontFamily="PingFang SC"
            fontSize="12px"
            fontWeight={500}
            lineHeight="16px"
            letterSpacing="0.5px">
            {t('logs.totalTime')}
          </Text>
        ),
        cell: ({ row }) => (
          <Text
            color="grayModern.600"
            fontFamily="PingFang SC"
            fontSize="12px"
            fontWeight={500}
            lineHeight="16px"
            letterSpacing="0.5px">
            {getTimeDiff(row.original.created_at, row.original.request_at)}
          </Text>
        ),
        id: 'total_time'
      }),

      columnHelper.accessor('code', {
        header: () => (
          <Text
            color="grayModern.600"
            fontFamily="PingFang SC"
            fontSize="12px"
            fontWeight={500}
            lineHeight="16px"
            letterSpacing="0.5px">
            {t('logs.status')}
          </Text>
        ),
        cell: ({ getValue, row }) => {
          const code = getValue()
          return (
            <Flex alignItems="center" gap="4px" w="fit-content">
              <Text
                color={code === 200 ? 'var(--Green-600, #039855)' : 'var(--Red-600, #D92D20)'}
                fontFamily="PingFang SC"
                fontSize="12px"
                fontWeight={500}
                lineHeight="16px"
                letterSpacing="0.5px">
                {code !== 200 ? `${t('logs.failed')} (${row.original.code})` : code}
              </Text>
              {code !== 200 && (
                <MyTooltip placement="bottom-end" label={row.original.content}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="15"
                    height="14"
                    viewBox="0 0 15 14"
                    fill="none">
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M7.79299 2.23698C5.16257 2.23698 3.03019 4.36936 3.03019 6.99978C3.03019 9.6302 5.16257 11.7626 7.79299 11.7626C10.4234 11.7626 12.5558 9.6302 12.5558 6.99978C12.5558 4.36936 10.4234 2.23698 7.79299 2.23698ZM1.86353 6.99978C1.86353 3.72503 4.51824 1.07031 7.79299 1.07031C11.0677 1.07031 13.7225 3.72503 13.7225 6.99978C13.7225 10.2745 11.0677 12.9292 7.79299 12.9292C4.51824 12.9292 1.86353 10.2745 1.86353 6.99978ZM7.92275 4.92235C7.68522 4.8816 7.44093 4.92624 7.23315 5.04835C7.02538 5.17046 6.86752 5.36217 6.78755 5.58952C6.68064 5.89343 6.3476 6.05313 6.04369 5.94622C5.73978 5.83931 5.58008 5.50628 5.68699 5.20236C5.85839 4.71511 6.19671 4.30424 6.64202 4.04253C7.08733 3.78082 7.6109 3.68515 8.11998 3.77247C8.62907 3.85979 9.09083 4.12447 9.42347 4.51962C9.75604 4.91469 9.93809 5.41468 9.9374 5.93109C9.93713 6.77507 9.31182 7.32806 8.87572 7.6188C8.63987 7.77603 8.40817 7.89146 8.23774 7.96721C8.15169 8.00545 8.07917 8.0345 8.0268 8.05445C8.00057 8.06445 7.97925 8.07221 7.96366 8.07775L7.94462 8.08442L7.93848 8.08652L7.93629 8.08726L7.93541 8.08755C7.93524 8.08761 7.93469 8.08779 7.75022 7.53439L7.93469 8.08779C7.62906 8.18967 7.2987 8.02449 7.19683 7.71886C7.09498 7.41333 7.26001 7.08309 7.56545 6.9811L7.57281 6.9785C7.58072 6.97569 7.59385 6.97093 7.61148 6.96422C7.64681 6.95075 7.6996 6.92968 7.76391 6.9011C7.89419 6.84319 8.06346 6.75815 8.22857 6.64807C8.5943 6.40425 8.77073 6.1555 8.77073 5.93055L8.77073 5.92968C8.77109 5.68868 8.68615 5.45533 8.53094 5.27096C8.37573 5.08658 8.16028 4.96309 7.92275 4.92235ZM7.20966 9.67285C7.20966 9.35068 7.47083 9.08951 7.79299 9.08951H7.79834C8.12051 9.08951 8.38167 9.35068 8.38167 9.67285C8.38167 9.99501 8.12051 10.2562 7.79834 10.2562H7.79299C7.47083 10.2562 7.20966 9.99501 7.20966 9.67285Z"
                      fill="#667085"
                    />
                  </svg>
                </MyTooltip>
              )}
            </Flex>
          )
        },
        id: 'status'
      }),

      columnHelper.accessor('created_at', {
        header: () => (
          <Text color="grayModern.600" fontSize="12px" fontWeight={500}>
            {t('logs.time')}
          </Text>
        ),
        cell: ({ row }) => new Date(row.original.created_at).toLocaleString(),
        id: 'created_at'
      }),
      columnHelper.accessor('used_amount', {
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
        },
        id: 'used_amount'
      }),

      columnHelper.display({
        header: () => (
          <Text
            color="grayModern.600"
            fontFamily="PingFang SC"
            fontSize="12px"
            fontWeight={500}
            lineHeight="16px"
            letterSpacing="0.5px">
            {t('logs.actions')}
          </Text>
        ),
        cell: ({ row }) => (
          <Button
            onClick={() => {
              setSelectedRow(row.original)
              onOpen()
            }}
            variant="unstyled"
            display="inline-flex"
            padding="6px 8px"
            justifyContent="center"
            alignItems="center"
            gap="4px"
            boxShadow="0px 1px 2px 0px rgba(19, 51, 107, 0.05), 0px 0px 1px 0px rgba(19, 51, 107, 0.08)"
            borderRadius="4px"
            background="grayModern.150"
            fontSize="11px"
            fontFamily="PingFang SC"
            fontWeight="500"
            whiteSpace="nowrap"
            lineHeight="16px"
            letterSpacing="0.5px"
            transition="all 0.2s ease"
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
            }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M0.899414 3.04352C0.899414 2.76738 1.13738 2.54352 1.43092 2.54352H10.5696C10.8631 2.54352 11.1011 2.76738 11.1011 3.04352C11.1011 3.31966 10.8631 3.54352 10.5696 3.54352H1.43092C1.13738 3.54352 0.899414 3.31966 0.899414 3.04352ZM0.899414 5.96889C0.899414 5.69274 1.13738 5.46889 1.43092 5.46889H10.5696C10.8631 5.46889 11.1011 5.69274 11.1011 5.96889C11.1011 6.24503 10.8631 6.46889 10.5696 6.46889H1.43092C1.13738 6.46889 0.899414 6.24503 0.899414 5.96889ZM0.899414 8.9565C0.899414 8.68035 1.13738 8.4565 1.43092 8.4565H7.28546C7.579 8.4565 7.81696 8.68035 7.81696 8.9565C7.81696 9.23264 7.579 9.4565 7.28546 9.4565H1.43092C1.13738 9.4565 0.899414 9.23264 0.899414 8.9565Z"
                fill="#485264"
              />
            </svg>
            <Text
              color="grayModern.600"
              fontFamily="PingFang SC"
              fontSize="12px"
              fontWeight={500}
              lineHeight="16px"
              letterSpacing="0.5px">
              {t('logs.detail')}
            </Text>
          </Button>
        ),
        id: 'detail'
      })
    ],
    [t, currencySymbol]
  )

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
              alignItems="center"
              justifyContent="space-between"
              alignSelf="stretch"
              flexWrap="wrap"
              sx={{
                transition: 'gap 0.3s ease',
                gap: '16px',
                '@media screen and (min-width: 1318px)': {
                  gap: '24px'
                }
              }}>
              <Flex h="32px" gap="24px" alignItems="center" flex="0 1 auto">
                <Text
                  whiteSpace="nowrap"
                  color="grayModern.900"
                  fontFamily="PingFang SC"
                  fontSize="12px"
                  fontStyle="normal"
                  fontWeight="500"
                  lineHeight="16px"
                  letterSpacing="0.5px">
                  {t('logs.name')}
                </Text>
                <SingleSelectComboboxUnstyle<string>
                  dropdownItems={['all', ...(tokenData?.tokens?.map((item) => item.name) || [])]}
                  setSelectedItem={(value) => {
                    if (value === 'all') {
                      setName('')
                    } else {
                      setName(value)
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
                  flexProps={{ w: '280px' }}
                  placeholder={t('logs.select_token_name')}
                />
              </Flex>

              <Flex h="32px" gap="24px" alignItems="center" flex="0 1 auto">
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
                  dropdownItems={['all', ...modelConfigs.map((item) => item.model)]}
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
                  flexProps={{ w: '280px' }}
                  placeholder={t('logs.select_modal')}
                />
              </Flex>

              <Flex h="32px" gap="24px" alignItems="center" flex="0 1 auto">
                <Text
                  whiteSpace="nowrap"
                  color="grayModern.900"
                  fontFamily="PingFang SC"
                  fontSize="12px"
                  fontStyle="normal"
                  fontWeight="500"
                  lineHeight="16px"
                  letterSpacing="0.5px">
                  {t('logs.status')}
                </Text>
                <MySelect
                  boxStyle={{
                    w: '100%'
                  }}
                  maxW={'120px'}
                  w={'100%'}
                  height="32px"
                  value={codeType}
                  list={[
                    {
                      value: 'all',
                      label: 'all'
                    },
                    {
                      value: 'success',
                      label: 'success'
                    },
                    {
                      value: 'error',
                      label: 'error'
                    }
                  ]}
                  onchange={(val: string) => {
                    setCodeType(val)
                  }}
                />
              </Flex>

              <Flex h="32px" gap="24px" alignItems="center" flex="0 1 auto">
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
                  w="280px"
                  startTime={startTime}
                  setStartTime={setStartTime}
                  endTime={endTime}
                  setEndTime={setEndTime}
                />
              </Flex>
            </Flex>
            {/* -- the first row end */}
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
      <LogDetailModal isOpen={isOpen} onClose={onClose} rowData={selectedRow} />
    </Flex>
  )
}

const LogDetailModal = ({
  isOpen,
  onClose,
  rowData
}: {
  isOpen: boolean
  onClose: () => void
  rowData: LogItem | null
}) => {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const { currencySymbol } = useBackendStore()

  // 定义默认的网格配置
  const gridConfig = {
    labelWidth: '153px',
    rowHeight: '48px',
    jsonContentHeight: '122px'
  }

  const renderDetailRow = (
    leftLabel: string | React.ReactNode,
    leftValue: string | number | React.ReactNode | undefined,
    rightLabel?: string | React.ReactNode,
    rightValue?: string | number | React.ReactNode | undefined,
    options?: {
      labelWidth?: string
      rowHeight?: string
      isFirst?: boolean
      isLast?: boolean
    }
  ) => {
    // 辅助函数：渲染标签
    const renderLabel = (label: string | React.ReactNode) => {
      if (typeof label === 'string') {
        return (
          <Text
            color="grayModern.800"
            fontSize="14px"
            fontWeight={500}
            lineHeight="20px"
            letterSpacing="0.1px">
            {label}
          </Text>
        )
      }
      return label
    }

    // 辅助函数：渲染值
    const renderValue = (value: string | number | React.ReactNode | undefined) => {
      if (typeof value === 'string' || typeof value === 'number') {
        return (
          <Text
            color="grayModern.600"
            fontFamily="PingFang SC"
            fontSize="14px"
            fontWeight={500}
            lineHeight="20px"
            letterSpacing="0.1px">
            {value}
          </Text>
        )
      }
      return value
    }
    return (
      <Grid
        templateColumns={rightLabel ? '1fr 1fr' : '1fr'}
        gap="0 0"
        borderLeft="1px solid var(--Gray-Modern-200, #E8EBF0)"
        borderRight="1px solid var(--Gray-Modern-200, #E8EBF0)"
        borderTop="1px solid var(--Gray-Modern-200, #E8EBF0)"
        borderBottom={options?.isLast ? '1px solid var(--Gray-Modern-200, #E8EBF0)' : 'none'}
        borderRadius={
          options?.isFirst && options?.isLast
            ? '8px'
            : options?.isFirst
            ? '8px 8px 0 0'
            : options?.isLast
            ? '0 0 8px 8px'
            : '0'
        }
        overflow="hidden">
        <Grid templateColumns={`${options?.labelWidth || '153px'} 1fr`} gap="0 0">
          <Box
            bg="grayModern.25"
            px="18px"
            py="15px"
            borderRight="1px solid var(--Gray-Modern-200, #E8EBF0)"
            h={options?.rowHeight || '48px'}
            display="flex"
            alignItems="center">
            {renderLabel(leftLabel)}
          </Box>
          <Box
            bg="white"
            p="12px"
            maxW="100%"
            h={options?.rowHeight || '48px'}
            display="flex"
            alignItems="center"
            overflowX="auto"
            sx={{
              '&::-webkit-scrollbar': {
                display: 'none'
              },
              '-ms-overflow-style': 'none',
              scrollbarWidth: 'none'
            }}>
            {renderValue(leftValue)}
          </Box>
        </Grid>
        {rightLabel && (
          <Grid templateColumns={`${options?.labelWidth || '153px'} 1fr`}>
            <Box
              bg="grayModern.25"
              px="18px"
              py="15px"
              borderRight="1px solid var(--Gray-Modern-200, #E8EBF0)"
              borderLeft="1px solid var(--Gray-Modern-200, #E8EBF0)"
              h={options?.rowHeight || '48px'}
              display="flex"
              alignItems="center">
              {renderLabel(rightLabel)}
            </Box>
            <Box
              bg="white"
              p="12px"
              h={options?.rowHeight || '48px'}
              display="flex"
              alignItems="center">
              {renderValue(rightValue)}
            </Box>
          </Grid>
        )}
      </Grid>
    )
  }

  const renderJsonContent = (
    label: string,
    content: string | undefined,
    options?: {
      labelWidth?: string
      contentHeight?: string
      isFirst?: boolean
      isLast?: boolean
    }
  ) => {
    const handleCopy = (copy: OnCopyProps) => {
      const copyText =
        typeof copy.src === 'object' ? JSON.stringify(copy.src, null, 2) : String(copy.src)
      navigator.clipboard.writeText(copyText)
    }

    if (!content) return null

    let parsed = null

    try {
      parsed = JSON.parse(content)
    } catch {
      parsed = content
    }
    return (
      <Grid
        templateColumns={`${options?.labelWidth || '153px'} 1fr`}
        borderRadius={
          options?.isFirst && options?.isLast
            ? '8px'
            : options?.isFirst
            ? '8px 8px 0 0'
            : options?.isLast
            ? '0 0 8px 8px'
            : '0'
        }
        borderLeft="1px solid var(--Gray-Modern-200, #E8EBF0)"
        borderRight="1px solid var(--Gray-Modern-200, #E8EBF0)"
        borderTop="1px solid var(--Gray-Modern-200, #E8EBF0)"
        borderBottom={options?.isLast ? '1px solid var(--Gray-Modern-200, #E8EBF0)' : 'none'}
        overflow="hidden">
        <Box
          bg="grayModern.25"
          px="18px"
          py="15px"
          borderRight="1px solid var(--Gray-Modern-200, #E8EBF0)"
          display="flex"
          alignItems="center"
          h="100%"
          borderTopLeftRadius={options?.isFirst ? '8px' : '0'}
          borderBottomLeftRadius={options?.isLast ? '8px' : '0'}>
          <Text
            color="grayModern.800"
            fontSize="14px"
            fontWeight={500}
            lineHeight="20px"
            letterSpacing="0.1px">
            {label}
          </Text>
        </Box>
        <Box
          bg="white"
          p="12px"
          maxH={options?.contentHeight || '122px'}
          minH={options?.contentHeight || '122px'}
          overflowY="auto"
          borderTopRightRadius={options?.isFirst ? '8px' : '0'}
          borderBottomRightRadius={options?.isLast ? '8px' : '0'}
          sx={{
            '&::-webkit-scrollbar': {
              width: '4px',
              height: '4px'
            },
            '&::-webkit-scrollbar-track': {
              background: 'grayModern.100',
              borderRadius: '2px'
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'grayModern.200',
              borderRadius: '2px'
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: 'grayModern.300'
            }
          }}>
          {typeof parsed === 'object' ? (
            <ReactJson
              src={parsed}
              theme="rjv-default"
              name={false}
              displayDataTypes={false}
              enableClipboard={handleCopy}
              collapsed={2}
              style={{
                fontSize: '14px',
                fontFamily: 'Monaco, monospace',
                backgroundColor: 'transparent',
                width: '100%',
                height: '100%'
              }}
              iconStyle="circle"
            />
          ) : (
            <Text color="grayModern.600" fontSize="14px" fontWeight={500} lineHeight="20px">
              {parsed}
            </Text>
          )}
        </Box>
      </Grid>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent w="730px" maxW="730px" maxH="806px" flexShrink="0">
        <ModalHeader
          height="48px"
          padding="10px 20px"
          justifyContent="center"
          alignItems="center"
          flexShrink="0"
          borderBottom="1px solid grayModern.100"
          background="grayModern.25"
          w="full">
          <Flex alignItems="flex-start" flexShrink="0">
            <Text
              color="grayModern.900"
              fontFamily="PingFang SC"
              fontSize="16px"
              fontStyle="normal"
              fontWeight={500}
              lineHeight="24px"
              letterSpacing="0.15px">
              {t('logs.logDetail')}
            </Text>
          </Flex>
        </ModalHeader>
        <ModalCloseButton
          display="flex"
          width="28px"
          height="28px"
          padding="4px"
          justifyContent="center"
          alignItems="center"
          flexShrink={0}
          borderRadius="4px"
        />
        <ModalBody
          py="18px"
          px="20px"
          overflowY="auto"
          sx={{
            '&::-webkit-scrollbar': {
              display: 'none'
            },
            '-ms-overflow-style': 'none',
            scrollbarWidth: 'none'
          }}>
          <Flex direction="column" gap="0">
            {renderDetailRow(
              t('logs.requestId'),
              rowData?.request_id,
              t('logs.status'),
              <Text
                color={
                  rowData?.code === 200 ? 'var(--Green-600, #039855)' : 'var(--Red-600, #D92D20)'
                }
                fontFamily="PingFang SC"
                fontSize="14px"
                fontWeight={500}
                lineHeight="20px"
                letterSpacing="0.5px">
                {rowData?.code === 200
                  ? t('logs.success')
                  : `${t('logs.failed')} (${rowData?.code})`}
              </Text>,
              {
                labelWidth: gridConfig.labelWidth,
                rowHeight: gridConfig.rowHeight,
                isFirst: true
              }
            )}
            {renderDetailRow(
              'Endpoint',
              rowData?.endpoint,
              t('logs.mode'),
              getTranslationWithFallback(
                `modeType.${String(rowData?.mode)}`,
                'modeType.0',
                t as any
              ),
              {
                labelWidth: gridConfig.labelWidth,
                rowHeight: gridConfig.rowHeight,
                isFirst: false
              }
            )}
            {renderDetailRow(
              t('logs.requestTime'),
              new Date(rowData?.created_at || 0).toLocaleString(),
              t('logs.totalTime'),
              getTimeDiff(rowData?.created_at || 0, rowData?.request_at || 0),
              {
                labelWidth: gridConfig.labelWidth,
                rowHeight: gridConfig.rowHeight,
                isFirst: false
              }
            )}
            {renderDetailRow(
              t('logs.tokenName'),
              rowData?.token_name,
              t('logs.tokenId'),
              rowData?.token_id,
              {
                labelWidth: gridConfig.labelWidth,
                rowHeight: gridConfig.rowHeight,
                isFirst: false
              }
            )}
            {renderDetailRow(t('logs.model'), rowData?.model, undefined, undefined, {
              labelWidth: gridConfig.labelWidth,
              rowHeight: gridConfig.rowHeight,
              isFirst: false
            })}

            {rowData?.content &&
              renderDetailRow(
                t('logs.info'),
                <Flex
                  w="100%"
                  overflowX="auto"
                  sx={{
                    '&::-webkit-scrollbar': {
                      display: 'none'
                    },
                    '-ms-overflow-style': 'none',
                    scrollbarWidth: 'none'
                  }}>
                  <Text
                    color="grayModern.600"
                    fontFamily="PingFang SC"
                    fontSize="14px"
                    fontWeight={500}
                    lineHeight="20px"
                    letterSpacing="0.1px"
                    whiteSpace="nowrap">
                    {rowData.content}
                  </Text>
                </Flex>,
                undefined,
                undefined,
                {
                  labelWidth: gridConfig.labelWidth,
                  rowHeight: gridConfig.rowHeight,
                  isFirst: false
                }
              )}

            {rowData?.request_detail?.request_body &&
              renderJsonContent(t('logs.requestBody'), rowData.request_detail.request_body, {
                labelWidth: gridConfig.labelWidth,
                contentHeight: gridConfig.jsonContentHeight,
                isFirst: false
              })}
            {rowData?.request_detail?.response_body &&
              renderJsonContent(t('logs.responseBody'), rowData.request_detail.response_body, {
                labelWidth: gridConfig.labelWidth,
                contentHeight: gridConfig.jsonContentHeight,
                isLast: false
              })}

            {renderDetailRow(
              <Flex alignItems="center" justifyContent="flex-start" flexWrap="wrap">
                <Text
                  color="grayModern.800"
                  fontFamily="PingFang SC"
                  fontSize="14px"
                  fontWeight={500}
                  lineHeight="20px"
                  mr={'4px'}
                  letterSpacing="0.5px"
                  whiteSpace="nowrap">
                  {t('key.inputPrice')}
                </Text>
                <CurrencySymbol type={currencySymbol} />
                <Text
                  color="grayModern.500"
                  fontFamily="PingFang SC"
                  fontSize="12px"
                  fontWeight={500}
                  lineHeight="16px"
                  letterSpacing="0.5px"
                  textTransform="lowercase"
                  whiteSpace="nowrap">
                  /{t('price.per1kTokens').toLowerCase()}
                </Text>
              </Flex>,
              rowData?.price,
              <Flex alignItems="center" justifyContent="flex-start" flexWrap="wrap">
                <Text
                  color="grayModern.800"
                  fontFamily="PingFang SC"
                  fontSize="14px"
                  fontWeight={500}
                  lineHeight="20px"
                  mr="4px"
                  letterSpacing="0.5px"
                  whiteSpace="nowrap">
                  {t('key.outputPrice')}
                </Text>
                <CurrencySymbol type={currencySymbol} />
                <Text
                  color="grayModern.500"
                  fontFamily="PingFang SC"
                  fontSize="12px"
                  fontWeight={500}
                  lineHeight="16px"
                  letterSpacing="0.5px"
                  textTransform="lowercase"
                  whiteSpace="nowrap">
                  /{t('price.per1kTokens').toLowerCase()}
                </Text>
              </Flex>,
              rowData?.completion_price,
              {
                labelWidth: gridConfig.labelWidth,
                rowHeight: gridConfig.rowHeight,
                isFirst: false
              }
            )}
            {renderDetailRow(
              t('logs.inputTokens'),
              rowData?.prompt_tokens,
              t('logs.outputTokens'),
              rowData?.completion_tokens,
              {
                labelWidth: gridConfig.labelWidth,
                rowHeight: gridConfig.rowHeight,
                isFirst: false
              }
            )}

            {renderDetailRow(
              <MyTooltip placement="bottom-end" label={t('logs.total_price_tip')}>
                <Flex alignItems={'center'} gap={'4px'}>
                  <Text
                    noOfLines={1}
                    color="grayModern.800"
                    fontFamily="PingFang SC"
                    fontSize="14px"
                    fontWeight={500}
                    lineHeight="20px"
                    letterSpacing="0.5px">
                    {t('logs.total_price')}
                  </Text>
                  <CurrencySymbol type={currencySymbol} />
                </Flex>
              </MyTooltip>,
              rowData?.used_amount || 0,
              undefined,
              undefined,
              {
                labelWidth: gridConfig.labelWidth,
                rowHeight: gridConfig.rowHeight,
                isLast: true
              }
            )}
          </Flex>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
