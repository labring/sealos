'use client'
import React, { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Flex,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  FormControl,
  Input,
  FormErrorMessage,
  useDisclosure,
  Center,
  Spinner
} from '@chakra-ui/react'
import { CurrencySymbol } from '@sealos/ui'
import {
  Column,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable
} from '@tanstack/react-table'
import { TFunction } from 'i18next'
import { createToken, deleteToken, getTokens, updateToken } from '@/api/platform'

import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'
import { ChainIcon } from '@/ui/icons/index'
import { useMessage } from '@sealos/ui'
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query'
import { TokenInfo } from '@/types/user/token'
import SwitchPage from '@/components/common/SwitchPage'
import { useBackendStore } from '@/store/backend'
import { MyTooltip } from '@/components/common/MyTooltip'
import { QueryKey } from '@/types/query-key'

export function KeyList(): JSX.Element {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const { isOpen, onOpen, onClose } = useDisclosure()

  return (
    <>
      {/* gap is 13px */}
      <Flex direction="column" alignItems="flex-start" gap="8px" alignSelf="stretch" w="full">
        <Text
          color="var(--Black, #000)"
          fontFamily="PingFang SC"
          fontSize="20px"
          fontStyle="normal"
          fontWeight={500}
          lineHeight="26px"
          letterSpacing="0.15px">
          {t('keyList.title')}
        </Text>
      </Flex>

      {/* table */}
      <ModelKeyTable t={t} onOpen={onOpen} />
      {/* modal */}
      <CreateKeyModal isOpen={isOpen} onClose={onClose} t={t} />
    </>
  )
}

export enum TableHeaderId {
  NAME = 'key.name',
  KEY = 'key.key',
  CREATED_AT = 'key.createdAt',
  LAST_USED_AT = 'key.lastUsedAt',
  STATUS = 'key.status',
  ACTIONS = 'key.actions',
  REQUEST_COUNT = 'key.requestCount',
  USED_AMOUNT = 'key.usedAmount'
}

enum KeyStatus {
  ENABLED = 1,
  DISABLED = 2,
  EXPIRED = 3,
  EXHAUSTED = 4
}

const CustomHeader = ({ column, t }: { column: Column<TokenInfo>; t: TFunction }) => {
  const { currencySymbol } = useBackendStore()
  if (column.id === TableHeaderId.USED_AMOUNT) {
    return (
      <Flex alignItems={'center'} gap={'4px'}>
        <Text
          color="var(--light-general-on-surface-low, var(--Gray-Modern-600, #485264))"
          fontFamily="PingFang SC"
          fontSize="12px"
          fontWeight={500}
          lineHeight="16px"
          letterSpacing="0.5px">
          {t(column.id as TableHeaderId)}
        </Text>
        <CurrencySymbol type={currencySymbol} />
      </Flex>
    )
  }
  return (
    <Text
      color="var(--light-general-on-surface-low, var(--Gray-Modern-600, #485264))"
      fontFamily="PingFang SC"
      fontSize="12px"
      fontWeight={500}
      lineHeight="16px"
      letterSpacing="0.5px">
      {t(column.id as TableHeaderId)}
    </Text>
  )
}

const ModelKeyTable = ({ t, onOpen }: { t: TFunction; onOpen: () => void }) => {
  const aiproxyBackend = useBackendStore((state) => state.aiproxyBackend)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [openPopoverId, setOpenPopoverId] = useState<number | null>(null)

  const { message } = useMessage({
    warningBoxBg: 'var(--Yellow-50, #FFFAEB)',
    warningIconBg: 'var(--Yellow-500, #F79009)',
    warningIconFill: 'white',
    successBoxBg: 'var(--Green-50, #EDFBF3)',
    successIconBg: 'var(--Green-600, #039855)',
    successIconFill: 'white'
  })
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: [QueryKey.GetTokens, page, pageSize],
    queryFn: () => getTokens({ page, perPage: pageSize }),
    refetchOnReconnect: true,
    onSuccess(data) {
      setTotal(data?.total || 0)
    }
  })

  const deleteKeyMutation = useMutation((id: number) => deleteToken(id), {
    onSuccess() {
      queryClient.invalidateQueries([QueryKey.GetTokens])
      message({
        status: 'success',
        title: t('key.deleteSuccess'),
        isClosable: true,
        duration: 2000,
        position: 'top'
      })
    },
    onError(err: any) {
      message({
        status: 'warning',
        title: t('key.deleteFailed'),
        description: err?.message || t('key.deleteFailed'),
        isClosable: true,
        position: 'top'
      })
    }
  })

  const updateKeyMutation = useMutation(
    ({ id, status }: { id: number; status: number }) => updateToken(id, status),
    {
      onSuccess() {
        queryClient.invalidateQueries([QueryKey.GetTokens])
        message({
          status: 'success',
          title: t('key.updateSuccess'),
          isClosable: true,
          duration: 2000,
          position: 'top'
        })
      },
      onError(err: any) {
        message({
          status: 'warning',
          title: t('key.updateFailed'),
          description: err?.message ? t(err.message) : t('key.updateFailed'),
          isClosable: true,
          position: 'top'
        })
      }
    }
  )

  // Update the button click handlers in the table actions column:
  const handleStatusUpdate = (id: number, currentStatus: number) => {
    const newStatus = currentStatus === KeyStatus.DISABLED ? KeyStatus.ENABLED : KeyStatus.DISABLED
    updateKeyMutation.mutate({ id, status: newStatus })
  }

  const handleDelete = (id: number) => {
    deleteKeyMutation.mutate(id)
  }

  const columnHelper = createColumnHelper<TokenInfo>()

  const columns = [
    columnHelper.accessor((row) => row.name, {
      id: TableHeaderId.NAME,
      header: (props) => <CustomHeader column={props.column} t={t} />,
      cell: (info) => (
        <Text
          color="grayModern.900"
          fontFamily="PingFang SC"
          fontSize="14px"
          fontWeight={500}
          lineHeight="20px"
          letterSpacing="0.1px">
          {info.getValue()}
        </Text>
      )
    }),
    columnHelper.accessor((row) => row.key, {
      id: TableHeaderId.KEY,
      header: (props) => <CustomHeader column={props.column} t={t} />,
      cell: (info) => (
        <Text
          color="grayModern.600"
          fontFamily="PingFang SC"
          fontSize="12px"
          fontWeight={500}
          lineHeight="16px"
          letterSpacing="0.5px"
          cursor="pointer"
          onClick={() => {
            const key = 'sk-' + info.getValue()
            navigator.clipboard.writeText(key).then(
              () => {
                message({
                  status: 'success',
                  title: t('copySuccess'),
                  isClosable: true,
                  duration: 2000,
                  position: 'top'
                })
              },
              (err) => {
                message({
                  status: 'warning',
                  title: t('copyFailed'),
                  description: err?.message || t('copyFailed'),
                  isClosable: true,
                  position: 'top'
                })
              }
            )
          }}>
          <MyTooltip label={t('copy')}>
            {'sk-' + info.getValue().substring(0, 8) + '*'.repeat(3)}
          </MyTooltip>
        </Text>
      )
    }),
    columnHelper.accessor((row) => row.created_at, {
      id: TableHeaderId.CREATED_AT,
      header: (props) => <CustomHeader column={props.column} t={t} />,
      cell: (info) => (
        <Text
          color="grayModern.600"
          fontFamily="PingFang SC"
          fontSize="12px"
          fontWeight={500}
          lineHeight="16px"
          letterSpacing="0.5px">
          {new Date(info.getValue()).toLocaleString()}
        </Text>
      )
    }),
    columnHelper.accessor((row) => row.accessed_at, {
      id: TableHeaderId.LAST_USED_AT,
      header: (props) => <CustomHeader column={props.column} t={t} />,
      cell: (info) => {
        const timestamp = info.getValue()

        if (timestamp && timestamp < 0) {
          return (
            <Text
              color="grayModern.500"
              fontFamily="PingFang SC"
              fontSize="12px"
              fontWeight={500}
              lineHeight="16px"
              letterSpacing="0.5px">
              {t('key.unused')}
            </Text>
          )
        }

        return (
          <Text
            color="grayModern.600"
            fontFamily="PingFang SC"
            fontSize="12px"
            fontWeight={500}
            lineHeight="16px"
            letterSpacing="0.5px">
            {new Date(timestamp).toLocaleString()}
          </Text>
        )
      }
    }),
    columnHelper.accessor((row) => row.status, {
      id: TableHeaderId.STATUS,
      header: (props) => <CustomHeader column={props.column} t={t} />,
      cell: (info) => {
        const status = info.getValue()
        let statusText = ''
        let statusColor = ''

        switch (status) {
          case KeyStatus.ENABLED:
            statusText = t('keystatus.enabled')
            statusColor = 'green.600'
            break
          case KeyStatus.DISABLED:
            statusText = t('keystatus.disabled')
            statusColor = 'red.600'
            break
          case KeyStatus.EXPIRED:
            statusText = t('keystatus.expired')
            statusColor = 'orange.500'
            break
          case KeyStatus.EXHAUSTED:
            statusText = t('keystatus.exhausted')
            statusColor = 'gray.500'
            break
          default:
            statusText = t('keystatus.unknown')
            statusColor = 'gray.500'
        }

        return (
          <Text
            color={statusColor}
            fontFamily="PingFang SC"
            fontSize="12px"
            fontWeight={500}
            lineHeight="16px"
            letterSpacing="0.5px">
            {statusText}
          </Text>
        )
      }
    }),

    columnHelper.accessor((row) => row.request_count, {
      id: TableHeaderId.REQUEST_COUNT,
      header: (props) => <CustomHeader column={props.column} t={t} />,
      cell: (info) => (
        <Text
          color="grayModern.900"
          fontFamily="PingFang SC"
          fontSize="14px"
          fontWeight={500}
          lineHeight="20px"
          letterSpacing="0.1px">
          {info.getValue()}
        </Text>
      )
    }),

    columnHelper.accessor((row) => row.used_amount, {
      id: TableHeaderId.USED_AMOUNT,
      header: (props) => <CustomHeader column={props.column} t={t} />,
      cell: (info) => {
        const value = Number(info.getValue())
        // 获取小数部分的长度
        const decimalLength = value.toString().split('.')[1]?.length || 0
        // 如果小数位超过6位则保留6位，否则保持原样
        const formattedValue = decimalLength > 6 ? value.toFixed(6) : value

        return (
          <Text
            color="grayModern.900"
            fontFamily="PingFang SC"
            fontSize="14px"
            fontWeight={500}
            lineHeight="20px"
            letterSpacing="0.1px">
            {formattedValue}
          </Text>
        )
      }
    }),

    columnHelper.display({
      id: TableHeaderId.ACTIONS,
      header: (props) => <CustomHeader column={props.column} t={t} />,
      cell: (info) => (
        <Popover
          placement="bottom-end"
          isOpen={openPopoverId === info.row.original.id}
          onClose={() => setOpenPopoverId(null)}>
          <PopoverTrigger>
            <Box
              cursor="pointer"
              transition="all 0.2s"
              display="inline-flex"
              p="4px"
              alignItems="center"
              gap="6px"
              borderRadius="6px"
              _hover={{ bg: 'gray.100' }}
              onClick={() => setOpenPopoverId(info.row.original.id)}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.66675 3.33333C6.66675 2.59695 7.2637 2 8.00008 2C8.73646 2 9.33341 2.59695 9.33341 3.33333C9.33341 4.06971 8.73646 4.66667 8.00008 4.66667C7.2637 4.66667 6.66675 4.06971 6.66675 3.33333ZM6.66675 8C6.66675 7.26362 7.2637 6.66667 8.00008 6.66667C8.73646 6.66667 9.33341 7.26362 9.33341 8C9.33341 8.73638 8.73646 9.33333 8.00008 9.33333C7.2637 9.33333 6.66675 8.73638 6.66675 8ZM6.66675 12.6667C6.66675 11.9303 7.2637 11.3333 8.00008 11.3333C8.73646 11.3333 9.33341 11.9303 9.33341 12.6667C9.33341 13.403 8.73646 14 8.00008 14C7.2637 14 6.66675 13.403 6.66675 12.6667Z"
                  fill="#485264"
                />
              </svg>
            </Box>
          </PopoverTrigger>
          <PopoverContent w="100px">
            <PopoverBody
              display="flex"
              p="6px"
              alignItems="flex-start"
              gap="10px"
              borderRadius="6px"
              bg="white">
              <Flex
                width="88px"
                alignItems="flex-start"
                direction="column"
                gap="2px"
                flexShrink={0}>
                {info.row.original.status === KeyStatus.DISABLED ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    justifyContent="flex-start"
                    display="flex"
                    padding="6px 4px"
                    alignItems="center"
                    gap="8px"
                    alignSelf="stretch"
                    borderRadius="4px"
                    background="transparent"
                    color="grayModern.600"
                    _hover={{
                      background: 'rgba(17, 24, 36, 0.05)',
                      color: 'brightBlue.600'
                    }}
                    onClick={() => {
                      handleStatusUpdate(info.row.original.id, info.row.original.status)
                      setOpenPopoverId(null)
                    }}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none">
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M5.79427 11.5962L10.4323 8.98982C11.1347 8.5951 11.5697 8.34893 11.8659 8.14524C11.9632 8.07836 12.0235 8.03018 12.0586 8C12.0235 7.96982 11.9632 7.92163 11.8659 7.85476C11.5697 7.65107 11.1347 7.40489 10.4323 7.01018L5.79426 4.40384C5.09214 4.00928 4.65523 3.76546 4.3252 3.61731C4.18814 3.55579 4.10581 3.52836 4.06506 3.51656C4.04193 3.52364 4.02176 3.53387 4.00487 3.54574C3.99613 3.5881 3.98409 3.65984 3.97362 3.77094C3.94094 4.11764 3.93933 4.60257 3.93933 5.39366L3.93933 10.6063C3.93933 11.3974 3.94094 11.8824 3.97362 12.2291C3.98409 12.3402 3.99613 12.4119 4.00487 12.4543C4.02176 12.4661 4.04193 12.4764 4.06506 12.4834C4.10581 12.4716 4.18814 12.4442 4.3252 12.3827C4.65523 12.2345 5.09214 11.9907 5.79427 11.5962ZM13.4344 7.31995C13.2073 6.82366 12.5309 6.44352 11.178 5.68325L6.53993 3.07691C5.18701 2.31663 4.51056 1.9365 3.95547 1.99328C3.4713 2.04281 3.03146 2.28998 2.74531 2.67333C2.41724 3.11284 2.41724 3.87311 2.41724 5.39366L2.41724 10.6063C2.41724 12.1269 2.41724 12.8872 2.74531 13.3267C3.03146 13.71 3.4713 13.9572 3.95547 14.0067C4.51055 14.0635 5.18702 13.6834 6.53994 12.9231L11.178 10.3167C12.5309 9.55647 13.2073 9.17634 13.4344 8.68005C13.6324 8.24717 13.6324 7.75283 13.4344 7.31995Z"
                        fill="currentColor"
                      />
                    </svg>
                    <Text
                      fontFamily="PingFang SC"
                      fontSize="12px"
                      fontStyle="normal"
                      fontWeight="500"
                      lineHeight="16px"
                      letterSpacing="0.5px">
                      {t('enable')}
                    </Text>
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    justifyContent="flex-start"
                    display="flex"
                    padding="6px 4px"
                    alignItems="center"
                    gap="8px"
                    alignSelf="stretch"
                    borderRadius="4px"
                    background="transparent"
                    color="grayModern.600"
                    _hover={{
                      background: 'rgba(17, 24, 36, 0.05)',
                      color: 'brightBlue.600'
                    }}
                    onClick={() => {
                      setOpenPopoverId(null)
                      handleStatusUpdate(info.row.original.id, info.row.original.status)
                    }}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none">
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M3.63017 4.57294C2.88892 5.5168 2.44686 6.70677 2.44686 8C2.44686 11.0669 4.9331 13.5532 8.00004 13.5532C9.29326 13.5532 10.4832 13.1111 11.4271 12.3699L3.63017 4.57294ZM4.57298 3.63013L12.3699 11.4271C13.1112 10.4832 13.5532 9.29322 13.5532 8C13.5532 4.93306 11.067 2.44681 8.00004 2.44681C6.70682 2.44681 5.51684 2.88887 4.57298 3.63013ZM1.11353 8C1.11353 4.19668 4.19672 1.11348 8.00004 1.11348C11.8034 1.11348 14.8866 4.19668 14.8866 8C14.8866 11.8033 11.8034 14.8865 8.00004 14.8865C4.19672 14.8865 1.11353 11.8033 1.11353 8Z"
                        fill="currentColor"
                      />
                    </svg>
                    <Text
                      fontFamily="PingFang SC"
                      fontSize="12px"
                      fontStyle="normal"
                      fontWeight="500"
                      lineHeight="16px"
                      letterSpacing="0.5px">
                      {t('disable')}
                    </Text>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  justifyContent="flex-start"
                  display="flex"
                  padding="6px 4px"
                  alignItems="center"
                  gap="8px"
                  alignSelf="stretch"
                  borderRadius="4px"
                  background="transparent"
                  color="grayModern.600"
                  _hover={{
                    background: 'rgba(17, 24, 36, 0.05)',
                    color: '#D92D20'
                  }}
                  onClick={() => {
                    handleDelete(info.row.original.id)
                    setOpenPopoverId(null)
                  }}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none">
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M7.48258 1.18025H8.51761C8.84062 1.18024 9.12229 1.18023 9.35489 1.19923C9.60133 1.21937 9.85079 1.26411 10.0921 1.38704C10.4491 1.56894 10.7393 1.85919 10.9212 2.21619C11.0441 2.45745 11.0889 2.70692 11.109 2.95335C11.125 3.14941 11.1275 3.38033 11.1279 3.64149H13.5379C13.9061 3.64149 14.2045 3.93996 14.2045 4.30815C14.2045 4.67634 13.9061 4.97482 13.5379 4.97482H12.9739V11.2268C12.9739 11.7206 12.9739 12.1312 12.9466 12.4663C12.918 12.8153 12.8565 13.1408 12.7001 13.4479C12.4592 13.9206 12.0748 14.305 11.602 14.5459C11.2949 14.7024 10.9695 14.7639 10.6205 14.7924C10.2853 14.8198 9.87475 14.8198 9.381 14.8197H6.61919C6.12544 14.8198 5.71484 14.8198 5.37973 14.7924C5.03069 14.7639 4.70525 14.7024 4.39817 14.5459C3.9254 14.305 3.54102 13.9206 3.30013 13.4479C3.14366 13.1408 3.08215 12.8153 3.05363 12.4663C3.02625 12.1312 3.02626 11.7206 3.02627 11.2268L3.02627 4.97482H2.46232C2.09413 4.97482 1.79565 4.67634 1.79565 4.30815C1.79565 3.93996 2.09413 3.64149 2.46232 3.64149H4.87226C4.87265 3.38033 4.87516 3.14941 4.89118 2.95335C4.91131 2.70692 4.95605 2.45745 5.07899 2.21619C5.26089 1.85919 5.55113 1.56894 5.90813 1.38704C6.1494 1.26411 6.39886 1.21937 6.64529 1.19923C6.8779 1.18023 7.15957 1.18024 7.48258 1.18025ZM4.3596 4.97482V11.1996C4.3596 11.7275 4.36012 12.0833 4.38254 12.3577C4.40432 12.6243 4.44341 12.7547 4.48814 12.8425C4.60119 13.0644 4.7816 13.2448 5.00349 13.3579C5.09128 13.4026 5.22172 13.4417 5.4883 13.4635C5.76267 13.4859 6.11851 13.4864 6.64642 13.4864H9.35377C9.88168 13.4864 10.2375 13.4859 10.5119 13.4635C10.7785 13.4417 10.9089 13.4026 10.9967 13.3579C11.2186 13.2448 11.399 13.0644 11.5121 12.8425C11.5568 12.7547 11.5959 12.6243 11.6176 12.3577C11.6401 12.0833 11.6406 11.7275 11.6406 11.1996V4.97482H4.3596ZM9.79454 3.64149H6.20564C6.20612 3.38305 6.20849 3.20378 6.22008 3.06193C6.23348 2.89795 6.2558 2.84348 6.267 2.82151C6.32106 2.71539 6.40734 2.62912 6.51345 2.57505C6.53543 2.56386 6.58989 2.54154 6.75387 2.52814C6.92563 2.51411 7.15224 2.51359 7.50785 2.51359H8.49234C8.84795 2.51359 9.07456 2.51411 9.24632 2.52814C9.4103 2.54154 9.46476 2.56386 9.48674 2.57505C9.59285 2.62912 9.67913 2.71539 9.73319 2.82151C9.74439 2.84348 9.76671 2.89795 9.78011 3.06193C9.7917 3.20378 9.79407 3.38305 9.79454 3.64149ZM6.76948 7.02568C7.13767 7.02568 7.43614 7.32416 7.43614 7.69235V10.7689C7.43614 11.1371 7.13767 11.4356 6.76948 11.4356C6.40129 11.4356 6.10281 11.1371 6.10281 10.7689V7.69235C6.10281 7.32416 6.40129 7.02568 6.76948 7.02568ZM9.23071 7.02568C9.5989 7.02568 9.89738 7.32416 9.89738 7.69235V10.7689C9.89738 11.1371 9.5989 11.4356 9.23071 11.4356C8.86252 11.4356 8.56404 11.1371 8.56404 10.7689V7.69235C8.56404 7.32416 8.86252 7.02568 9.23071 7.02568Z"
                      fill="currentColor"
                    />
                  </svg>
                  <Text
                    fontFamily="PingFang SC"
                    fontSize="12px"
                    fontStyle="normal"
                    fontWeight="500"
                    lineHeight="16px"
                    letterSpacing="0.5px">
                    {t('delete')}
                  </Text>
                </Button>
              </Flex>
            </PopoverBody>
          </PopoverContent>
        </Popover>
      )
    })
  ]

  const sortTableData = (data: TokenInfo[]) => {
    return data.sort((a, b) => b.created_at - a.created_at)
  }

  const sortedData = useMemo(() => sortTableData(data?.tokens || []), [data])

  const table = useReactTable({
    data: sortedData,
    columns,
    getCoreRowModel: getCoreRowModel()
  })

  return (
    <>
      {isLoading ? (
        <Box w="full" h="full" display="flex" justifyContent="center" alignItems="center">
          <Center>
            <Spinner />
          </Center>
        </Box>
      ) : data?.tokens.length === 0 ? (
        <Box w="full" h="full" display="flex" justifyContent="center" alignItems="center">
          <Center>
            <Flex display="inline-flex" flexDirection="column" alignItems="center" gap="24px">
              <Flex flexDirection="column" alignItems="center" gap="16px">
                <Flex
                  display="flex"
                  width="64px"
                  height="64px"
                  justifyContent="center"
                  alignItems="center"
                  position="relative">
                  <Box width="64px" height="64px">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="64"
                      height="64"
                      viewBox="0 0 64 64"
                      fill="none">
                      <circle
                        cx="32"
                        cy="32"
                        r="31.6"
                        stroke="#9CA2A8"
                        strokeWidth="0.8"
                        strokeDasharray="3.2 3.2"
                      />
                    </svg>
                  </Box>
                  <Flex
                    width="38.4px"
                    height="38.4px"
                    position="absolute"
                    left="50%"
                    top="50%"
                    transform="translate(-50%, -50%)">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="40"
                      height="39"
                      viewBox="0 0 40 39"
                      fill="none">
                      <path
                        d="M6.95009 33.671L6.91264 33.6702C6.69615 33.6632 5.57087 33.5909 4.8212 32.8881C4.05254 32.1673 3.96079 31.1308 3.95022 30.9301C3.9492 30.9113 3.9487 30.8924 3.94873 30.8735V25.2283C3.93754 24.9957 3.92251 24.2101 4.18574 23.3377C4.43794 22.5011 4.74952 21.9519 4.83875 21.8037L7.67287 16.7898C7.68704 16.7646 7.70202 16.7403 7.71809 16.7166C7.80645 16.5855 8.28149 15.9107 8.93285 15.5055C9.61822 15.0786 10.4478 15.0457 10.6858 15.0457H28.5882C28.6112 15.0457 28.634 15.0463 28.6575 15.0478C28.8355 15.0592 29.7596 15.1372 30.4747 15.5463C31.1576 15.9374 31.7072 16.6208 31.8104 16.7536C31.8314 16.7808 31.851 16.809 31.8694 16.838L35.2354 22.1717C35.2498 22.1952 35.2643 22.2198 35.2775 22.2449C35.342 22.3688 35.6747 23.0233 35.8432 23.6598C36.0096 24.2896 36.0497 24.9856 36.0558 25.1185L36.0567 25.164V30.81C36.0605 31.1085 36.0055 32.133 35.1557 32.8943C34.3509 33.6148 33.2674 33.6706 32.9545 33.6706H6.95009V33.671ZM6.66171 22.9478C6.59978 23.058 6.40716 23.4223 6.24522 23.959C6.07419 24.5264 6.09451 25.0568 6.09723 25.1156C6.09875 25.141 6.09967 25.1665 6.1 25.1919V30.8363L6.10211 30.8519C6.11544 30.9534 6.17738 31.1993 6.28416 31.3102L6.29852 31.3255L6.31545 31.3379C6.46492 31.4481 6.8353 31.5113 6.96466 31.5191L32.9562 31.5195C33.1719 31.517 33.5488 31.4451 33.7196 31.292C33.8724 31.155 33.9067 30.92 33.9067 30.8823L33.9046 30.817V25.197C33.893 24.9777 33.8505 24.5408 33.7625 24.2097C33.6629 23.8315 33.4401 23.3785 33.3964 23.2918L33.3843 23.2706L30.0811 18.0358L30.0708 18.0233C29.9456 17.8726 29.6454 17.5504 29.4057 17.413C29.1981 17.2942 28.7752 17.2181 28.5575 17.1978L28.5349 17.1967H10.6896C10.5226 17.1982 10.2123 17.2424 10.069 17.332C9.86704 17.4578 9.62797 17.7453 9.52966 17.8796L9.52119 17.8912L6.70482 22.8736L6.67439 22.9248L6.6748 22.9235C6.67398 22.926 6.66171 22.9478 6.66171 22.9478ZM19.9 13.4682C19.6148 13.4679 19.3413 13.3545 19.1396 13.1528C18.9379 12.9512 18.8245 12.6777 18.8241 12.3925V6.20461C18.8245 5.91948 18.9379 5.64612 19.1395 5.44448C19.3411 5.24285 19.6144 5.12939 19.8996 5.129C20.1848 5.12928 20.4582 5.24268 20.66 5.44433C20.8617 5.64597 20.9752 5.91939 20.9756 6.20461V12.3925C20.9753 12.6776 20.8619 12.9511 20.6602 13.1527C20.4586 13.3544 20.1852 13.4678 19.9 13.4681V13.4682ZM27.1119 13.4274C26.8267 13.427 26.5533 13.3135 26.3517 13.1118C26.15 12.9101 26.0366 12.6367 26.0363 12.3515C26.0365 12.1048 26.1213 11.8656 26.2766 11.6739L28.7355 8.64132C28.8363 8.51661 28.9638 8.41609 29.1086 8.34716C29.2533 8.27823 29.4117 8.24265 29.5721 8.24303C29.8206 8.24303 30.0547 8.32611 30.2483 8.48318C30.3584 8.5718 30.4499 8.68143 30.5173 8.8057C30.5847 8.92996 30.6267 9.06639 30.6409 9.20704C30.6561 9.34752 30.6432 9.48962 30.603 9.6251C30.5628 9.76057 30.4962 9.88671 30.4069 9.99622L27.948 13.0289C27.8477 13.1535 27.7206 13.2541 27.5761 13.323C27.4317 13.3919 27.2736 13.4275 27.1136 13.4272H27.1119V13.4274ZM12.809 13.3451C12.6474 13.3455 12.4878 13.3093 12.3423 13.2392C12.1967 13.169 12.0689 13.0667 11.9686 12.9401L9.55142 9.90765C9.37386 9.68444 9.29211 9.39991 9.32409 9.11649C9.35608 8.83307 9.49919 8.57391 9.72203 8.39589C9.91185 8.24335 10.1482 8.16052 10.3918 8.16124C10.7215 8.16124 11.0283 8.30897 11.2336 8.5665L13.651 11.5989C13.8286 11.822 13.9105 12.1065 13.8786 12.3899C13.8467 12.6732 13.7036 12.9324 13.4809 13.1105C13.2903 13.262 13.0542 13.3447 12.8107 13.3451H12.809Z"
                        fill="#7B838B"
                      />
                      <path
                        d="M19.9417 29.2455C17.5452 29.2455 15.463 27.6388 14.8787 25.3389L14.8316 25.1535L5.27874 25.1478C4.99351 25.1472 4.72015 25.0335 4.51855 24.8317C4.31694 24.63 4.20352 24.3565 4.20312 24.0713C4.20357 23.7862 4.31705 23.5129 4.51868 23.3114C4.72032 23.1098 4.99364 22.9964 5.27874 22.9961L15.7979 23.0028C16.083 23.0035 16.3561 23.1172 16.5576 23.3188C16.7591 23.5205 16.8725 23.7938 16.8729 24.0789C16.8729 25.7697 18.2209 27.094 19.9417 27.094C21.6564 27.094 22.9997 25.7697 22.9997 24.0789C23.0003 23.7938 23.1138 23.5205 23.3154 23.3188C23.5169 23.1172 23.7902 23.0036 24.0753 23.0028L34.4971 22.9963C35.0904 22.9963 35.5727 23.4781 35.5731 24.071C35.5735 24.664 35.0913 25.1471 34.4983 25.148L25.0421 25.1537L24.9949 25.3391C24.4113 27.6389 22.3335 29.2455 19.9417 29.2455Z"
                        fill="#7B838B"
                      />
                    </svg>
                  </Flex>
                </Flex>
                <Text
                  color="var(--light-general-on-surface-lowest, var(--Gray-Modern-500, #667085))"
                  fontFamily="PingFang SC"
                  fontSize="14px"
                  fontWeight={500}
                  lineHeight="20px"
                  letterSpacing="0.1px">
                  {t('noData')}
                </Text>
              </Flex>

              <Button
                onClick={() => onOpen()}
                display="flex"
                width="156px"
                padding="10px 20px"
                justifyContent="center"
                alignItems="center"
                gap="8px"
                borderRadius="6px"
                background="grayModern.900"
                boxShadow="0px 1px 2px 0px rgba(19, 51, 107, 0.05), 0px 0px 1px 0px rgba(19, 51, 107, 0.08)"
                _hover={{ background: 'grayModern.800' }}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M8.00008 2.66667C8.36827 2.66667 8.66675 2.96515 8.66675 3.33334V7.33334H12.6667C13.0349 7.33334 13.3334 7.63181 13.3334 8C13.3334 8.36819 13.0349 8.66667 12.6667 8.66667H8.66675V12.6667C8.66675 13.0349 8.36827 13.3333 8.00008 13.3333C7.63189 13.3333 7.33341 13.0349 7.33341 12.6667V8.66667H3.33341C2.96522 8.66667 2.66675 8.36819 2.66675 8C2.66675 7.63181 2.96522 7.33334 3.33341 7.33334H7.33341V3.33334C7.33341 2.96515 7.63189 2.66667 8.00008 2.66667Z"
                    fill="white"
                  />
                </svg>
                {t('createKey2')}
              </Button>
            </Flex>
          </Center>
        </Box>
      ) : (
        <Flex direction="column" alignItems="flex-start" gap="12px" w="full" h="full">
          {/* header */}
          <Flex alignItems="center" alignSelf="stretch" justifyContent="space-between">
            <Flex alignItems="center" gap="8px">
              <ChainIcon boxSize={18} color="grayModern.900" />
              <Text
                color="grayModern.900"
                fontFamily="PingFang SC"
                fontSize="14px"
                fontWeight={500}
                lineHeight="20px"
                whiteSpace="nowrap"
                letterSpacing="0.1px">
                API Endpoint:
              </Text>
              <MyTooltip label={t('copy')}>
                <Text
                  color="var(--light-sealos-secondary-text, var(--Bright-Blue-600, #0884DD))"
                  fontFamily="PingFang SC"
                  fontSize="14px"
                  fontWeight={500}
                  lineHeight="20px"
                  letterSpacing="0.1px"
                  textDecoration="none"
                  _hover={{ textDecoration: 'underline' }}
                  cursor="pointer"
                  whiteSpace="nowrap"
                  onClick={() => {
                    const endpoint = aiproxyBackend
                    navigator.clipboard.writeText(endpoint).then(
                      () => {
                        message({
                          status: 'success',
                          title: t('copySuccess'),
                          isClosable: true,
                          duration: 2000,
                          position: 'top'
                        })
                      },
                      (err) => {
                        message({
                          status: 'warning',
                          title: t('copyFailed'),
                          description: err?.message || t('copyFailed'),
                          isClosable: true,
                          position: 'top'
                        })
                      }
                    )
                  }}>
                  {aiproxyBackend}
                </Text>
              </MyTooltip>
            </Flex>
            <Button
              display="flex"
              padding="8px 14px"
              justifyContent="center"
              alignItems="center"
              gap="6px"
              borderRadius="6px"
              bg="grayModern.900"
              color="white"
              boxShadow="0px 1px 2px 0px rgba(19, 51, 107, 0.05), 0px 0px 1px 0px rgba(19, 51, 107, 0.08)"
              _hover={{ bg: 'grayModern.800' }}
              onClick={onOpen}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M8.00008 2.66667C8.36827 2.66667 8.66675 2.96515 8.66675 3.33334V7.33334H12.6667C13.0349 7.33334 13.3334 7.63181 13.3334 8C13.3334 8.36819 13.0349 8.66667 12.6667 8.66667H8.66675V12.6667C8.66675 13.0349 8.36827 13.3333 8.00008 13.3333C7.63189 13.3333 7.33341 13.0349 7.33341 12.6667V8.66667H3.33341C2.96522 8.66667 2.66675 8.36819 2.66675 8C2.66675 7.63181 2.96522 7.33334 3.33341 7.33334H7.33341V3.33334C7.33341 2.96515 7.63189 2.66667 8.00008 2.66667Z"
                  fill="white"
                />
              </svg>
              {t('createKey')}
            </Button>
          </Flex>
          {/* header end */}

          {/* table */}
          <Box w="full" h="full" gap="24px" display="flex" flexDirection="column" overflow="hidden">
            <TableContainer w="full" flex="1 0 0" overflowY="auto" minHeight="0">
              <Table variant="simple" size="md" w="full">
                <Thead>
                  {table.getHeaderGroups().map((headerGroup) => {
                    return (
                      <Tr
                        key={headerGroup.id}
                        height="42px"
                        alignSelf="stretch"
                        bg="grayModern.100">
                        {headerGroup.headers.map((header, i) => {
                          return (
                            <Th
                              key={header.id}
                              border={'none'}
                              // the first th
                              borderTopLeftRadius={i === 0 ? '6px' : '0'}
                              borderBottomLeftRadius={i === 0 ? '6px' : '0'}
                              // the last th
                              borderTopRightRadius={
                                i === headerGroup.headers.length - 1 ? '6px' : '0'
                              }
                              borderBottomRightRadius={
                                i === headerGroup.headers.length - 1 ? '6px' : '0'
                              }>
                              {flexRender(header.column.columnDef.header, header.getContext())}
                            </Th>
                          )
                        })}
                      </Tr>
                    )
                  })}
                </Thead>
                <Tbody>
                  {table.getRowModel().rows.map((row) => {
                    return (
                      <Tr
                        key={row.id}
                        height="48px"
                        alignSelf="stretch"
                        borderBottom="1px solid"
                        borderColor="grayModern.150">
                        {row.getVisibleCells().map((cell) => {
                          return (
                            <Td key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </Td>
                          )
                        })}
                      </Tr>
                    )
                  })}
                </Tbody>
              </Table>
            </TableContainer>
            <SwitchPage
              m="0"
              justifyContent={'end'}
              currentPage={page}
              totalPage={Math.ceil(total / pageSize)}
              totalItem={total}
              pageSize={pageSize}
              setCurrentPage={(idx: number) => setPage(idx)}
            />
          </Box>
          {/* table end */}
        </Flex>
      )}
    </>
  )
}

function CreateKeyModal({
  isOpen,
  onClose,
  t
}: {
  isOpen: boolean
  onClose: () => void
  t: TFunction
}) {
  const initialRef = React.useRef(null)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const queryClient = useQueryClient()
  const { message } = useMessage({
    warningBoxBg: 'var(--Yellow-50, #FFFAEB)',
    warningIconBg: 'var(--Yellow-500, #F79009)',
    warningIconFill: 'white',

    successBoxBg: 'var(--Green-50, #EDFBF3)',
    successIconBg: 'var(--Green-600, #039855)',
    successIconFill: 'white'
  })

  const createKeyMutation = useMutation((name: string) => createToken(name), {
    onSuccess(data) {
      createKeyMutation.reset()
      setName('')
      queryClient.invalidateQueries([QueryKey.GetTokens])
      message({
        status: 'success',
        title: t('key.createSuccess'),
        isClosable: true,
        duration: 2000,
        position: 'top'
      })
      onClose()
    },
    onError(err) {
      console.error(err)
      message({
        status: 'warning',
        title: t('key.createFailed'),
        description: err instanceof Error ? t(err.message as any) : t('key.createFailed'),
        isClosable: true,
        position: 'top'
      })
    }
  })

  const validateName = (value: string) => {
    if (!value) {
      setError(t('key.nameRequired'))
    } else if (value.length >= 32) {
      setError(t('key.nameMaxLength'))
    } else if (!/^[A-Za-z0-9-]+$/.test(value)) {
      setError(t('key.nameOnlyLettersAndNumbers'))
    } else {
      setError('')
    }
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    validateName(newName)
    setName(newName)
  }

  const handleConfirm = () => {
    if (error === '' && name !== '') {
      createKeyMutation.mutate(name)
      return
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered initialFocusRef={initialRef}>
      <ModalOverlay />
      <Flex
        as={ModalContent}
        width="400px"
        flexDirection="column"
        justifyContent="center"
        alignItems="flex-start"
        borderRadius="var(--semilg, 10px)"
        background="var(--White, #FFF)"
        boxShadow="0px 32px 64px -12px rgba(19, 51, 107, 0.20), 0px 0px 1px 0px rgba(19, 51, 107, 0.20)">
        {/* header */}
        <Flex
          as={ModalHeader}
          height="48px"
          padding="10px 20px"
          justifyContent="center"
          alignItems="center"
          borderBottom="1px solid grayModern.100"
          background="grayModern.25"
          w="full">
          <Flex w="360px" justifyContent="space-between" alignItems="center">
            <Flex alignItems="center" gap="10px" flexShrink={0}>
              {t('Key.create')}
            </Flex>
            <Flex
              as={ModalCloseButton}
              position="static"
              width="28px"
              height="28px"
              padding="4px"
              borderRadius="4px"
              justifyContent="center"
              alignItems="center"
              gap="10px"
              flexShrink={0}
            />
          </Flex>
        </Flex>
        {/* body */}
        <Flex
          as={ModalBody}
          height="166px"
          padding="24px 36.5px 24px 35.5px"
          justifyContent="center"
          alignItems="center"
          w="full">
          <Flex w="328px" direction="column" alignItems="flex-end" gap="24px">
            <Flex
              direction="column"
              alignItems="flex-start"
              gap="10px"
              alignSelf="stretch"
              w="full">
              <Text
                color="grayModern.900"
                w="full"
                fontFamily="PingFang SC"
                fontSize="14px"
                fontStyle="normal"
                fontWeight={500}
                lineHeight="20px"
                letterSpacing="0.1px">
                {t('key.createName')}
              </Text>
              <FormControl isInvalid={!!error}>
                <Input
                  ref={initialRef}
                  type="text"
                  value={name}
                  onChange={handleNameChange}
                  placeholder={t('key.namePlaceholder')}
                  w="full"
                  height="32px"
                  padding="8px 12px"
                  borderRadius="6px"
                  border="1px solid grayModern.200"
                  background="grayModern.50"
                  _placeholder={{
                    color: 'grayModern.400'
                  }}
                  isDisabled={createKeyMutation.isLoading}
                />
                {error && <FormErrorMessage>{error}</FormErrorMessage>}
              </FormControl>
            </Flex>
            {/* button */}
            <Flex
              w="full"
              justifyContent="flex-end"
              alignItems="center"
              alignSelf="stretch"
              gap="12px">
              <Button
                display="flex"
                padding="8px 14px"
                justifyContent="center"
                alignItems="center"
                gap="6px"
                borderRadius="6px"
                background="grayModern.900"
                boxShadow="0px 1px 2px 0px rgba(19, 51, 107, 0.05), 0px 0px 1px 0px rgba(19, 51, 107, 0.08)"
                _hover={{ background: 'var(--Gray-Modern-800, #1F2937)' }}
                onClick={handleConfirm}
                isDisabled={!!error}
                isLoading={createKeyMutation.isLoading}>
                {t('confirm')}
              </Button>
            </Flex>
          </Flex>
        </Flex>
      </Flex>
    </Modal>
  )
}

export default KeyList
