'use client'
import {
  Checkbox,
  Box,
  Flex,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useDisclosure,
  Spinner
} from '@chakra-ui/react'
import {
  Column,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable
} from '@tanstack/react-table'
import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'
import { ChannelInfo, ChannelStatus, ChannelType } from '@/types/admin/channels/channelInfo'
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query'
import { useState, useMemo, useEffect } from 'react'
import {
  deleteChannel,
  getChannels,
  getChannelTypeNames,
  updateChannelStatus
} from '@/api/platform'
import SwitchPage from '@/components/common/SwitchPage'
import UpdateChannelModal from './UpdateChannelModal'
import { useMessage } from '@sealos/ui'
import { QueryKey } from '@/types/query-key'
import { downloadJson } from '@/utils/common'

export default function ChannelTable({
  exportData
}: {
  exportData: (data: ChannelInfo[]) => void
}) {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const [operationType, setOperationType] = useState<'create' | 'update'>('update')
  const [channelInfo, setChannelInfo] = useState<ChannelInfo | undefined>(undefined)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [selectedChannels, setSelectedChannels] = useState<ChannelInfo[]>([])

  useEffect(() => {
    exportData(selectedChannels)
  }, [selectedChannels])

  const { message } = useMessage({
    warningBoxBg: 'var(--Yellow-50, #FFFAEB)',
    warningIconBg: 'var(--Yellow-500, #F79009)',
    warningIconFill: 'white',
    successBoxBg: 'var(--Green-50, #EDFBF3)',
    successIconBg: 'var(--Green-600, #039855)',
    successIconFill: 'white'
  })

  const queryClient = useQueryClient()

  const { isLoading: isChannelTypeNamesLoading, data: channelTypeNames } = useQuery({
    queryKey: [QueryKey.GetChannelTypeNames],
    queryFn: () => getChannelTypeNames()
  })

  const { data, isLoading: isChannelsLoading } = useQuery({
    queryKey: [QueryKey.GetChannels, page, pageSize],
    queryFn: () => getChannels({ page, perPage: pageSize }),
    refetchOnReconnect: true,
    onSuccess(data) {
      setTotal(data?.total || 0)
    }
  })

  const updateChannelStatusMutation = useMutation(
    ({ id, status }: { id: string; status: number }) => updateChannelStatus(id, status),
    {
      onSuccess() {
        message({
          status: 'success',
          title: t('channel.updateSuccess'),
          isClosable: true,
          duration: 2000,
          position: 'top'
        })
        queryClient.invalidateQueries([QueryKey.GetChannels])
        queryClient.invalidateQueries([QueryKey.GetChannelTypeNames])
      },
      onError(err: any) {
        message({
          status: 'warning',
          title: t('channel.updateFailed'),
          description: err?.message || t('channel.updateFailed'),
          isClosable: true,
          position: 'top'
        })
      }
    }
  )
  const deleteChannelMutation = useMutation(({ id }: { id: string }) => deleteChannel(id), {
    onSuccess() {
      message({
        status: 'success',
        title: t('channel.deleteSuccess'),
        isClosable: true,
        duration: 2000,
        position: 'top'
      })
      queryClient.invalidateQueries([QueryKey.GetChannels])
      queryClient.invalidateQueries([QueryKey.GetChannelTypeNames])
    },
    onError(err: any) {
      message({
        status: 'warning',
        title: t('channel.deleteFailed'),
        description: err?.message || t('channel.deleteFailed'),
        isClosable: true,
        position: 'top'
      })
    }
  })

  // Update the button click handlers in the table actions column:
  const handleStatusUpdate = (id: string, currentStatus: number) => {
    const newStatus =
      currentStatus === ChannelStatus.ChannelStatusDisabled
        ? ChannelStatus.ChannelStatusEnabled
        : ChannelStatus.ChannelStatusDisabled
    updateChannelStatusMutation.mutate({ id, status: newStatus })
  }

  const columnHelper = createColumnHelper<ChannelInfo>()

  const handleHeaderCheckboxChange = (isChecked: boolean) => {
    if (isChecked) {
      setSelectedChannels(data?.channels || [])
    } else {
      setSelectedChannels([])
    }
  }

  const handleRowCheckboxChange = (channel: ChannelInfo, isChecked: boolean) => {
    if (isChecked) {
      setSelectedChannels([...selectedChannels, channel])
    } else {
      setSelectedChannels(selectedChannels.filter((c) => c.id !== channel.id))
    }
  }

  const handleExportRow = (channel: ChannelInfo) => {
    const channels = [channel]
    const filename = `channel_${channels[0].id}_${new Date().toISOString()}.json`
    downloadJson(channels, filename)
  }

  const columns = [
    columnHelper.accessor((row) => row.id, {
      id: 'id',
      header: () => (
        <Flex display="inline-flex" alignItems="center" gap="16px">
          <Checkbox
            width="16px"
            height="16px"
            borderRadius="4px"
            colorScheme="grayModern"
            isChecked={
              data?.channels &&
              data.channels.length > 0 &&
              selectedChannels.length === data.channels.length
            }
            onChange={(e) => handleHeaderCheckboxChange(e.target.checked)}
            sx={{
              '.chakra-checkbox__control': {
                width: '16px',
                height: '16px',
                border: '1px solid',
                borderColor: 'grayModern.300',
                background: 'grayModern.100',
                transition: 'all 0.2s ease',
                _checked: {
                  background: 'grayModern.500',
                  borderColor: 'grayModern.500'
                }
              }
            }}
          />
          <Text
            color="grayModern.600"
            fontFamily="PingFang SC"
            fontSize="12px"
            fontWeight={500}
            lineHeight="16px"
            letterSpacing="0.5px">
            {t('channels.id')}
          </Text>
        </Flex>
      ),
      cell: (info) => (
        <Flex display="inline-flex" alignItems="center" gap="16px">
          <Checkbox
            width="16px"
            height="16px"
            borderRadius="4px"
            colorScheme="grayModern"
            isChecked={selectedChannels.some((c) => c.id === info.getValue())}
            onChange={(e) => handleRowCheckboxChange(info.row.original, e.target.checked)}
            sx={{
              '.chakra-checkbox__control': {
                width: '16px',
                height: '16px',
                border: '1px solid',
                borderColor: 'grayModern.300',
                background: 'white',
                _checked: {
                  background: 'grayModern.500',
                  borderColor: 'grayModern.500'
                }
              }
            }}
          />
          <Text
            color="grayModern.600"
            fontFamily="PingFang SC"
            fontSize="12px"
            fontWeight={500}
            lineHeight="16px"
            letterSpacing="0.5px">
            {info.getValue()}
          </Text>
        </Flex>
      )
    }),
    columnHelper.accessor((row) => row.name, {
      id: 'name',
      header: () => (
        <Text
          color="grayModern.600"
          fontFamily="PingFang SC"
          fontSize="12px"
          fontWeight={500}
          lineHeight="16px"
          letterSpacing="0.5px">
          {t('channels.name')}
        </Text>
      ),
      cell: (info) => (
        <Text
          color="grayModern.600"
          fontFamily="PingFang SC"
          fontSize="12px"
          fontWeight={500}
          lineHeight="16px"
          letterSpacing="0.5px">
          {info.getValue()}
        </Text>
      )
    }),
    columnHelper.accessor((row) => row.type, {
      id: 'type',
      header: () => (
        <Text
          color="grayModern.600"
          fontFamily="PingFang SC"
          fontSize="12px"
          fontWeight={500}
          lineHeight="16px"
          letterSpacing="0.5px">
          {t('channels.type')}
        </Text>
      ),
      cell: (info) => (
        <Text
          color="grayModern.600"
          fontFamily="PingFang SC"
          fontSize="12px"
          fontWeight={500}
          lineHeight="16px"
          letterSpacing="0.5px">
          {channelTypeNames?.[String(info.getValue()) as ChannelType]}
        </Text>
      )
    }),
    columnHelper.accessor((row) => row.request_count, {
      id: 'request_count',
      header: () => (
        <Text
          color="grayModern.600"
          fontFamily="PingFang SC"
          fontSize="12px"
          fontWeight={500}
          lineHeight="16px"
          letterSpacing="0.5px">
          {t('channels.requestCount')}
        </Text>
      ),
      cell: (info) => (
        <Text
          color="grayModern.600"
          fontFamily="PingFang SC"
          fontSize="12px"
          fontWeight={500}
          lineHeight="16px"
          letterSpacing="0.5px">
          {info.getValue()}
        </Text>
      )
    }),
    columnHelper.accessor((row) => row.status, {
      id: 'status',
      header: () => (
        <Text
          color="grayModern.600"
          fontFamily="PingFang SC"
          fontSize="12px"
          fontWeight={500}
          lineHeight="16px"
          letterSpacing="0.5px">
          {t('channels.status')}
        </Text>
      ),
      cell: (info) => {
        const status = info.getValue()
        let statusText = ''
        let statusColor = ''

        switch (status) {
          case ChannelStatus.ChannelStatusEnabled:
            statusText = t('keystatus.enabled')
            statusColor = 'green.600'
            break
          case ChannelStatus.ChannelStatusDisabled:
            statusText = t('keystatus.disabled')
            statusColor = 'red.600'
            break
          case ChannelStatus.ChannelStatusAutoDisabled:
            statusText = t('channelStatus.autoDisabled')
            statusColor = 'orange.500'
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

    columnHelper.display({
      id: 'actions',
      header: () => (
        <Text
          color="grayModern.600"
          fontFamily="PingFang SC"
          fontSize="12px"
          fontWeight={500}
          lineHeight="16px"
          letterSpacing="0.5px">
          {t('channels.action')}
        </Text>
      ),
      cell: (info) => (
        <Menu>
          <MenuButton
            display="inline-flex"
            p="4px"
            alignItems="center"
            gap="6px"
            borderRadius="6px"
            transition="all 0.2s"
            _hover={{ bg: 'gray.100' }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.66663 3.33333C6.66663 2.59695 7.26358 2 7.99996 2C8.73634 2 9.33329 2.59695 9.33329 3.33333C9.33329 4.06971 8.73634 4.66667 7.99996 4.66667C7.26358 4.66667 6.66663 4.06971 6.66663 3.33333ZM6.66663 8C6.66663 7.26362 7.26358 6.66667 7.99996 6.66667C8.73634 6.66667 9.33329 7.26362 9.33329 8C9.33329 8.73638 8.73634 9.33333 7.99996 9.33333C7.26358 9.33333 6.66663 8.73638 6.66663 8ZM6.66663 12.6667C6.66663 11.9303 7.26358 11.3333 7.99996 11.3333C8.73634 11.3333 9.33329 11.9303 9.33329 12.6667C9.33329 13.403 8.73634 14 7.99996 14C7.26358 14 6.66663 13.403 6.66663 12.6667Z"
                fill="#485264"
              />
            </svg>
          </MenuButton>
          <MenuList
            minW="88px"
            w="88px"
            p="6px"
            gap="2px"
            alignItems="flex-start"
            bg="white"
            borderRadius="6px"
            boxShadow="0px 4px 10px 0px rgba(19, 51, 107, 0.10), 0px 0px 1px 0px rgba(19, 51, 107, 0.10)">
            {/* <MenuItem
              display="flex"
              p="6px 4px"
              alignItems="center"
              gap="8px"
              alignSelf="stretch"
              borderRadius="4px"
              color="grayModern.600"
              _hover={{
                bg: 'rgba(17, 24, 36, 0.05)',
                color: 'brightBlue.600'
              }}
              onClick={() => console.log('Export', info.row.original.id)}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none">
                <path
                  d="M9.47739 2.2602C9.50277 2.21437 9.56866 2.21437 9.59403 2.2602L10.2438 3.43359C10.2498 3.44453 10.2588 3.45355 10.2698 3.45962L11.4432 4.10934C11.489 4.13472 11.489 4.20061 11.4432 4.22598L10.2698 4.87571C10.2588 4.88177 10.2498 4.89079 10.2438 4.90173L9.59403 6.07512C9.56866 6.12095 9.50277 6.12095 9.47739 6.07512L8.82767 4.90173C8.82161 4.89079 8.81258 4.88177 8.80164 4.87571L7.62825 4.22598C7.58242 4.20061 7.58242 4.13472 7.62825 4.10934L8.80164 3.45962C8.81258 3.45355 8.82161 3.44453 8.82767 3.43359L9.47739 2.2602Z"
                  fill="currentColor"
                />
                <path
                  d="M2.84715 2.83856C3.21164 2.47407 3.80259 2.47407 4.16708 2.83856L13.5095 12.1809C13.8739 12.5454 13.8739 13.1364 13.5095 13.5009C13.145 13.8654 12.554 13.8654 12.1895 13.5009L2.84715 4.15849C2.48266 3.79401 2.48266 3.20305 2.84715 2.83856Z"
                  fill="currentColor"
                />
                <path
                  d="M4.26066 8.92065C4.23528 8.87482 4.16939 8.87482 4.14401 8.92065L3.49429 10.094C3.48823 10.105 3.47921 10.114 3.46826 10.1201L2.29488 10.7698C2.24905 10.7952 2.24905 10.8611 2.29488 10.8864L3.46826 11.5362C3.47921 11.5422 3.48823 11.5512 3.49429 11.5622L4.14401 12.7356C4.16939 12.7814 4.23528 12.7814 4.26066 12.7356L4.91038 11.5622C4.91644 11.5512 4.92546 11.5422 4.93641 11.5362L6.1098 10.8864C6.15563 10.8611 6.15563 10.7952 6.1098 10.7698L4.93641 10.1201C4.92546 10.114 4.91644 10.105 4.91038 10.094L4.26066 8.92065Z"
                  fill="currentColor"
                />
                <path
                  d="M2.23669 6.87438C2.21065 6.84835 2.21065 6.80614 2.23669 6.7801L2.8096 6.20719C2.83564 6.18115 2.87785 6.18115 2.90389 6.20719L3.4768 6.7801C3.50283 6.80614 3.50283 6.84835 3.4768 6.87438L2.90389 7.4473C2.87785 7.47333 2.83564 7.47333 2.8096 7.4473L2.23669 6.87438Z"
                  fill="currentColor"
                />
                <path
                  d="M11.5622 7.44054C11.5362 7.46657 11.5362 7.50878 11.5622 7.53482L12.1352 8.10773C12.1612 8.13377 12.2034 8.13377 12.2294 8.10773L12.8023 7.53482C12.8284 7.50878 12.8284 7.46657 12.8023 7.44054L12.2294 6.86762C12.2034 6.84159 12.1612 6.84159 12.1352 6.86762L11.5622 7.44054Z"
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
                {t('channels.test')}
              </Text>
            </MenuItem> */}
            <MenuItem
              display="flex"
              p="6px 4px"
              alignItems="center"
              gap="8px"
              alignSelf="stretch"
              borderRadius="4px"
              color="grayModern.600"
              _hover={{
                bg: 'rgba(17, 24, 36, 0.05)',
                color:
                  info.row.original.status === ChannelStatus.ChannelStatusEnabled
                    ? '#D92D20'
                    : 'brightBlue.600'
              }}
              onClick={() =>
                handleStatusUpdate(String(info.row.original.id), info.row.original.status)
              }>
              {info.row.original.status === ChannelStatus.ChannelStatusEnabled ? (
                <>
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
                    {t('channels.disable')}
                  </Text>
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none">
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M5.79427 11.5962L10.4323 8.98988C11.1347 8.59516 11.5697 8.34899 11.8659 8.1453C11.9632 8.07842 12.0235 8.03024 12.0586 8.00006C12.0235 7.96988 11.9632 7.92169 11.8659 7.85482C11.5697 7.65113 11.1347 7.40495 10.4323 7.01024L5.79426 4.4039C5.09214 4.00934 4.65523 3.76552 4.3252 3.61737C4.18814 3.55585 4.10581 3.52842 4.06506 3.51662C4.04193 3.52371 4.02176 3.53393 4.00487 3.5458C3.99613 3.58816 3.98409 3.6599 3.97362 3.771C3.94094 4.1177 3.93933 4.60263 3.93933 5.39372L3.93933 10.6064C3.93933 11.3975 3.94094 11.8824 3.97362 12.2291C3.98409 12.3402 3.99613 12.412 4.00487 12.4543C4.02176 12.4662 4.04193 12.4764 4.06506 12.4835C4.10581 12.4717 4.18814 12.4443 4.3252 12.3827C4.65523 12.2346 5.09214 11.9908 5.79427 11.5962ZM13.4344 7.32001C13.2073 6.82372 12.5309 6.44358 11.178 5.68331L6.53993 3.07697C5.18701 2.31669 4.51056 1.93656 3.95547 1.99334C3.4713 2.04287 3.03146 2.29004 2.74531 2.6734C2.41724 3.1129 2.41724 3.87317 2.41724 5.39372L2.41724 10.6064C2.41724 12.1269 2.41724 12.8872 2.74531 13.3267C3.03146 13.7101 3.4713 13.9572 3.95547 14.0068C4.51055 14.0636 5.18702 13.6834 6.53994 12.9231L11.178 10.3168C12.5309 9.55654 13.2073 9.1764 13.4344 8.68011C13.6324 8.24723 13.6324 7.75289 13.4344 7.32001Z"
                      fill="currentcolor"
                    />
                  </svg>
                  <Text
                    fontFamily="PingFang SC"
                    fontSize="12px"
                    fontStyle="normal"
                    fontWeight="500"
                    lineHeight="16px"
                    letterSpacing="0.5px">
                    {t('channels.enable')}
                  </Text>
                </>
              )}
            </MenuItem>
            <MenuItem
              display="flex"
              p="6px 4px"
              alignItems="center"
              gap="8px"
              alignSelf="stretch"
              borderRadius="4px"
              color="grayModern.600"
              _hover={{
                bg: 'rgba(17, 24, 36, 0.05)',
                color: 'brightBlue.600'
              }}
              onClick={() => {
                setOperationType('update')
                setChannelInfo(info.row.original)
                onOpen()
              }}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none">
                <path
                  d="M12.0523 2.93262L13.3722 4.25256L14.2789 3.34585C14.4462 3.17856 14.5299 3.0949 14.5773 3.00621C14.6844 2.80608 14.6844 2.56569 14.5773 2.36557C14.5299 2.27687 14.4462 2.19323 14.2789 2.02594C14.1116 1.85864 14.028 1.77497 13.9393 1.72752C13.7391 1.62045 13.4987 1.62045 13.2986 1.72752C13.2099 1.77497 13.1263 1.85862 12.959 2.02592L12.0523 2.93262Z"
                  fill="currentColor"
                />
                <path
                  d="M7.04104 10.4281C6.99727 10.4309 6.94313 10.4309 6.87317 10.4309H6.30799C6.15331 10.4309 6.07597 10.4309 6.0171 10.4003C5.9675 10.3745 5.92705 10.3341 5.90128 10.2845C5.8707 10.2256 5.8707 10.1483 5.8707 9.9936V9.42304C5.8707 9.26836 5.8707 9.19102 5.90128 9.13215C5.9046 9.12575 5.90817 9.1195 5.91198 9.11341C5.95109 9.0338 6.03139 8.9535 6.17161 8.81328L11.188 3.79689L12.5079 5.11682L7.49154 10.1332C7.32748 10.2973 7.24544 10.3793 7.15057 10.4093C7.11488 10.4206 7.07802 10.4269 7.04104 10.4281Z"
                  fill="currentColor"
                />
                <path
                  d="M5.62978 1.94104C5.00856 1.94103 4.50132 1.94103 4.08949 1.97523C3.66341 2.01061 3.28008 2.08603 2.92343 2.27129C2.38767 2.5496 1.95084 2.98643 1.67254 3.52218C1.48727 3.87884 1.41186 4.26216 1.37647 4.68826C1.34227 5.10009 1.34228 5.60732 1.34229 6.22854V10.3859C1.34228 11.0072 1.34227 11.5144 1.37647 11.9262C1.41186 12.3523 1.48727 12.7357 1.67254 13.0923C1.95084 13.6281 2.38767 14.0649 2.92343 14.3432C3.28008 14.5285 3.66341 14.6039 4.0895 14.6393C4.50134 14.6735 5.00858 14.6735 5.62983 14.6735H9.78716C10.4084 14.6735 10.9156 14.6735 11.3275 14.6393C11.7536 14.6039 12.1369 14.5285 12.4936 14.3432C13.0293 14.0649 13.4661 13.6281 13.7444 13.0923C13.9297 12.7357 14.0051 12.3523 14.0405 11.9263C14.0747 11.5144 14.0747 11.0072 14.0747 10.386V7.69404C14.0747 7.32585 13.7762 7.02737 13.408 7.02737C13.0398 7.02737 12.7414 7.32585 12.7414 7.69404V10.3575C12.7414 11.0141 12.7408 11.4658 12.7118 11.8159C12.6833 12.158 12.6312 12.3431 12.5612 12.4777C12.4094 12.7699 12.1712 13.0082 11.8789 13.16C11.7443 13.2299 11.5593 13.2821 11.2171 13.3105C10.867 13.3396 10.4153 13.3401 9.7587 13.3401H5.65828C5.00167 13.3401 4.54998 13.3396 4.19985 13.3105C3.8577 13.2821 3.67268 13.2299 3.53806 13.16C3.24583 13.0082 3.00756 12.7699 2.85576 12.4777C2.78583 12.3431 2.73365 12.158 2.70523 11.8159C2.67615 11.4658 2.67562 11.0141 2.67562 10.3575V6.25704C2.67562 5.60043 2.67615 5.14873 2.70523 4.7986C2.73365 4.45645 2.78583 4.27143 2.85576 4.13681C3.00756 3.84459 3.24583 3.60631 3.53806 3.45451C3.67268 3.38458 3.8577 3.3324 4.19984 3.30399C4.54997 3.27491 5.00165 3.27437 5.65826 3.27437H8.34949C8.71768 3.27437 9.01616 2.9759 9.01616 2.60771C9.01616 2.23952 8.71768 1.94104 8.34949 1.94104L5.62978 1.94104Z"
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
                {t('channels.edit')}
              </Text>
            </MenuItem>
            <MenuItem
              display="flex"
              p="6px 4px"
              alignItems="center"
              gap="8px"
              alignSelf="stretch"
              borderRadius="4px"
              color="grayModern.600"
              _hover={{
                bg: 'rgba(17, 24, 36, 0.05)',
                color: 'brightBlue.600'
              }}
              onClick={() => handleExportRow(info.row.original)}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M7.52851 1.52851C7.78886 1.26816 8.21097 1.26816 8.47132 1.52851L11.138 4.19518C11.3983 4.45553 11.3983 4.87764 11.138 5.13799C10.8776 5.39834 10.4555 5.39834 10.1952 5.13799L8.66659 3.60939V9.99992C8.66659 10.3681 8.36811 10.6666 7.99992 10.6666C7.63173 10.6666 7.33325 10.3681 7.33325 9.99992V3.60939L5.80466 5.13799C5.54431 5.39834 5.1222 5.39834 4.86185 5.13799C4.6015 4.87764 4.6015 4.45553 4.86185 4.19518L7.52851 1.52851ZM1.99992 7.33325C2.36811 7.33325 2.66659 7.63173 2.66659 7.99992V10.7999C2.66659 11.371 2.6671 11.7592 2.69162 12.0592C2.7155 12.3515 2.75878 12.501 2.81191 12.6052C2.93974 12.8561 3.14372 13.0601 3.3946 13.1879C3.49887 13.2411 3.64833 13.2843 3.94061 13.3082C4.24067 13.3327 4.62887 13.3333 5.19992 13.3333H10.7999C11.371 13.3333 11.7592 13.3327 12.0592 13.3082C12.3515 13.2843 12.501 13.2411 12.6052 13.1879C12.8561 13.0601 13.0601 12.8561 13.1879 12.6052C13.2411 12.501 13.2843 12.3515 13.3082 12.0592C13.3327 11.7592 13.3333 11.371 13.3333 10.7999V7.99992C13.3333 7.63173 13.6317 7.33325 13.9999 7.33325C14.3681 7.33325 14.6666 7.63173 14.6666 7.99992V10.8275C14.6666 11.3641 14.6666 11.807 14.6371 12.1678C14.6065 12.5425 14.5408 12.887 14.3759 13.2106C14.1203 13.7123 13.7123 14.1203 13.2106 14.3759C12.887 14.5408 12.5425 14.6065 12.1678 14.6371C11.807 14.6666 11.3641 14.6666 10.8275 14.6666H5.17237C4.63573 14.6666 4.19283 14.6666 3.83204 14.6371C3.4573 14.6065 3.11283 14.5408 2.78928 14.3759C2.28751 14.1203 1.87956 13.7123 1.6239 13.2106C1.45904 12.887 1.39333 12.5425 1.36271 12.1678C1.33324 11.807 1.33324 11.3641 1.33325 10.8275L1.33325 7.99992C1.33325 7.63173 1.63173 7.33325 1.99992 7.33325Z"
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
                {t('channels.export')}
              </Text>
            </MenuItem>

            <MenuItem
              display="flex"
              p="6px 4px"
              alignItems="center"
              gap="8px"
              alignSelf="stretch"
              borderRadius="4px"
              color="grayModern.600"
              _hover={{
                bg: 'rgba(17, 24, 36, 0.05)',
                color: '#D92D20'
              }}
              onClick={() => deleteChannelMutation.mutate({ id: String(info.row.original.id) })}>
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
                {t('channels.delete')}
              </Text>
            </MenuItem>
          </MenuList>
        </Menu>
      )
    })
  ]

  const tableData = useMemo(() => data?.channels || [], [data])

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel()
  })

  return (
    <Box
      w="full"
      h="full"
      display="flex"
      flexDirection="column"
      gap="24px"
      overflow="hidden"
      id="channel-table-container">
      <TableContainer w="full" flex="1 0 0" minHeight="0" overflowY="auto">
        <Table variant="simple" w="full" size="md">
          <Thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Tr key={headerGroup.id} height="42px" alignSelf="stretch" bg="grayModern.100">
                {headerGroup.headers.map((header, i) => (
                  <Th
                    key={header.id}
                    border={'none'}
                    // the first th
                    borderTopLeftRadius={i === 0 ? '6px' : '0'}
                    borderBottomLeftRadius={i === 0 ? '6px' : '0'}
                    // the last th
                    borderTopRightRadius={i === headerGroup.headers.length - 1 ? '6px' : '0'}
                    borderBottomRightRadius={i === headerGroup.headers.length - 1 ? '6px' : '0'}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </Th>
                ))}
              </Tr>
            ))}
          </Thead>
          <Tbody>
            {isChannelTypeNamesLoading || isChannelsLoading ? (
              <Tr height="48px" alignSelf="stretch" border="none">
                <Td
                  h="300px"
                  colSpan={table.getAllColumns().length}
                  textAlign="center"
                  py={4}
                  border="none">
                  <Spinner size="xl" />
                </Td>
              </Tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <Tr
                  key={row.id}
                  height="48px"
                  alignSelf="stretch"
                  borderBottom="1px solid"
                  borderColor="grayModern.150">
                  {row.getVisibleCells().map((cell) => (
                    <Td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Td>
                  ))}
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </TableContainer>
      <SwitchPage
        m="0"
        justifyContent={'flex-end'}
        currentPage={page}
        totalPage={Math.ceil(total / pageSize)}
        totalItem={total}
        pageSize={pageSize}
        setCurrentPage={(idx: number) => setPage(idx)}
      />
      <UpdateChannelModal
        isOpen={isOpen}
        onClose={onClose}
        operationType={operationType}
        channelInfo={channelInfo}
      />
    </Box>
  )
}
