'use client'

import {
  Box,
  Flex,
  Text,
  Button,
  Icon,
  useDisclosure,
  InputGroup,
  InputRightElement,
  Input
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
import { getTimeDiff } from './tools/handleTime'
import dynamic from 'next/dynamic'
import { useDebounce } from '@/hooks/useDebounce'

const LogDetailModal = dynamic(
  () => import('./components/LogDetailModal'),
  { ssr: false } // 禁用服务端渲染
)

export default function Logs(): React.JSX.Element {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const { currencySymbol } = useBackendStore()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [selectedRow, setSelectedRow] = useState<LogItem | null>(null)

  const [startTime, setStartTime] = useState(() => {
    const currentDate = new Date()
    currentDate.setDate(currentDate.getDate() - 3)
    return currentDate
  })
  const [endTime, setEndTime] = useState(new Date())
  const [keyName, setKeyName] = useState('')
  const [codeType, setCodeType] = useState('all')
  const [modelName, setModelName] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [inputKeyword, setInputKeyword] = useState('')
  const debouncedKeyword = useDebounce(inputKeyword, 500) // 500ms 延迟 0.5s

  const { data: logData, isLoading } = useQuery(
    [
      QueryKey.GetUserLogs,
      page,
      pageSize,
      keyName,
      modelName,
      startTime,
      endTime,
      codeType,
      debouncedKeyword
    ],
    () =>
      getUserLogs({
        page,
        perPage: pageSize,
        token_name: keyName,
        model_name: modelName,
        keyword: debouncedKeyword,
        code_type: codeType as 'all' | 'success' | 'error',
        start_timestamp: startTime.getTime().toString(),
        end_timestamp: endTime.getTime().toString()
      })
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
                fontWeight={400}
                lineHeight="16px"
                letterSpacing="0.048px">
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
                    color="grayModern.900"
                    fontFamily="PingFang SC"
                    fontSize="12px"
                    fontWeight={400}
                    lineHeight="16px"
                    letterSpacing="0.048px">
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
            h="28px"
            variant="unstyled"
            display="inline-flex"
            padding="6px 8px"
            justifyContent="center"
            alignItems="center"
            gap="4px"
            borderRadius="4px"
            background="grayModern.150"
            whiteSpace="nowrap"
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
              fontStyle="normal"
              fontSize="11px"
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
    data: logData?.logs || [],
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
            <Flex alignItems="center" gap="24px">
              <InputGroup w="290px">
                <Input
                  py="6px"
                  px="12px"
                  h="32px"
                  alignItems="center"
                  borderRadius="4px"
                  border="1px solid"
                  borderColor="grayModern.200"
                  bgColor="grayModern.50"
                  _hover={{ borderColor: 'grayModern.300' }}
                  _focus={{ borderColor: 'grayModern.300' }}
                  _focusVisible={{ borderColor: 'grayModern.300' }}
                  _active={{ borderColor: 'grayModern.300' }}
                  placeholder={t('logs.searchByContent')}
                  _placeholder={{
                    color: 'grayModern.500',
                    fontFamily: 'PingFang SC',
                    fontSize: '12px',
                    fontWeight: 400,
                    lineHeight: '16px',
                    letterSpacing: '0.048px'
                  }}
                  value={inputKeyword}
                  onChange={(e) => {
                    setInputKeyword(e.target.value)
                  }}
                />
                <InputRightElement w="32px" h="32px">
                  <Box
                    display="flex"
                    w="full"
                    h="full"
                    p="0px 4px"
                    justifyContent="center"
                    alignItems="center"
                    borderLeft="1px solid"
                    borderColor="grayModern.200">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none">
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M7.33331 2.66659C4.75598 2.66659 2.66665 4.75592 2.66665 7.33325C2.66665 9.91058 4.75598 11.9999 7.33331 11.9999C8.59061 11.9999 9.73178 11.5027 10.5709 10.6942C10.5885 10.6714 10.6077 10.6494 10.6286 10.6285C10.6495 10.6076 10.6714 10.5884 10.6942 10.5708C11.5028 9.73172 12 8.59055 12 7.33325C12 4.75592 9.91064 2.66659 7.33331 2.66659ZM12.0212 11.0784C12.8423 10.0519 13.3333 8.74993 13.3333 7.33325C13.3333 4.01954 10.647 1.33325 7.33331 1.33325C4.0196 1.33325 1.33331 4.01954 1.33331 7.33325C1.33331 10.647 4.0196 13.3333 7.33331 13.3333C8.74999 13.3333 10.052 12.8423 11.0784 12.0212L13.5286 14.4713C13.7889 14.7317 14.211 14.7317 14.4714 14.4713C14.7317 14.211 14.7317 13.7889 14.4714 13.5285L12.0212 11.0784Z"
                        fill="#667085"
                      />
                    </svg>
                  </Box>
                </InputRightElement>
              </InputGroup>
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
                  setKeyName('')
                  setModelName('')
                  setCodeType('all')
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
                  dropdownItems={['all', ...(logData?.token_names || [])]}
                  setSelectedItem={(value) => {
                    if (value === 'all') {
                      setKeyName('')
                    } else {
                      setKeyName(value)
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
                  dropdownItems={['all', ...(logData?.models || [])]}
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
                      label: t('logs.statusOptions.all')
                    },
                    {
                      value: 'success',
                      label: t('logs.statusOptions.success')
                    },
                    {
                      value: 'error',
                      label: t('logs.statusOptions.error')
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
            totalPage={Math.ceil((logData?.total || 0) / pageSize)}
            totalItem={logData?.total || 0}
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
