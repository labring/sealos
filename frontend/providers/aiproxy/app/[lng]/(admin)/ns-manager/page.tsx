'use client'

import {
  Box,
  Flex,
  Text,
  Button,
  Icon,
  Input,
  MenuItem,
  MenuList,
  Menu,
  MenuButton
} from '@chakra-ui/react'
import { CurrencySymbol } from '@sealos/ui'
import { useMemo, useState } from 'react'

import { deleteGroup, getGroups, updateGroupQpm, updateGroupStatus } from '@/api/platform'
import { useTranslationClientSide } from '@/app/i18n/client'
import SwitchPage from '@/components/common/SwitchPage'
import { BaseTable } from '@/components/table/BaseTable'
import { useI18n } from '@/providers/i18n/i18nContext'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ColumnDef,
  getCoreRowModel,
  useReactTable,
  createColumnHelper
} from '@tanstack/react-table'
import { QueryKey } from '@/types/query-key'
import { useBackendStore } from '@/store/backend'
import { GroupInfo, GroupStatus } from '@/types/admin/group'
import { useMessage } from '@sealos/ui'
import { EditableTextNoLable } from '@/components/common/EditableTextNoLable'

export default function Home(): React.JSX.Element {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const { currencySymbol } = useBackendStore()
  const { message } = useMessage({
    warningBoxBg: 'var(--Yellow-50, #FFFAEB)',
    warningIconBg: 'var(--Yellow-500, #F79009)',
    warningIconFill: 'white',
    successBoxBg: 'var(--Green-50, #EDFBF3)',
    successIconBg: 'var(--Green-600, #039855)',
    successIconFill: 'white'
  })

  const queryClient = useQueryClient()

  const [groupId, setGroupId] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [groupData, setGroupData] = useState<GroupInfo[]>([])
  const [total, setTotal] = useState(0)

  const { isLoading } = useQuery(
    [QueryKey.GetGroups, page, pageSize, groupId],
    () =>
      getGroups({
        page,
        perPage: pageSize,
        keyword: groupId
      }),
    {
      onSuccess: (data) => {
        if (!data?.groups) {
          setGroupData([])
          setTotal(0)
          return
        }
        setGroupData(data?.groups || [])
        setTotal(data?.total || 0)
      }
    }
  )

  const deleteGroupMutation = useMutation(({ id }: { id: string }) => deleteGroup(id), {
    onSuccess() {
      message({
        status: 'success',
        title: t('nsManager.deleteGroupSuccess'),
        isClosable: true,
        duration: 2000,
        position: 'top'
      })
      queryClient.invalidateQueries([QueryKey.GetGroups])
    },
    onError(err: any) {
      message({
        status: 'warning',
        title: t('nsManager.deleteGroupFailed'),
        description: err?.message || t('nsManager.deleteGroupFailed'),
        isClosable: true,
        position: 'top'
      })
    }
  })

  const updateGroupStatusMutation = useMutation(
    ({ id, status }: { id: string; status: number }) => updateGroupStatus(id, status),
    {
      onSuccess() {
        message({
          status: 'success',
          title: t('nsManager.updateGroupStatusSuccess'),
          isClosable: true,
          duration: 2000,
          position: 'top'
        })
        queryClient.invalidateQueries([QueryKey.GetGroups])
      },
      onError(err: any) {
        message({
          status: 'warning',
          title: t('nsManager.updateGroupStatusFailed'),
          description: err?.message || t('nsManager.updateGroupStatusFailed'),
          isClosable: true,
          position: 'top'
        })
      }
    }
  )

  const updateGroupQpmMutation = useMutation(
    ({ id, qpm }: { id: string; qpm: number }) => updateGroupQpm(id, qpm),
    {
      onSuccess() {
        message({
          status: 'success',
          title: t('nsManager.updateGroupQpmSuccess'),
          isClosable: true,
          duration: 2000,
          position: 'top'
        })
        queryClient.invalidateQueries([QueryKey.GetGroups])
      },
      onError(err: any) {
        message({
          status: 'warning',
          title: t('nsManager.updateGroupQpmFailed'),
          description: err?.message || t('nsManager.updateGroupQpmFailed'),
          isClosable: true,
          position: 'top'
        })
      }
    }
  )

  // Update the button click handlers in the table actions column:
  const handleStatusUpdate = (id: string, currentStatus: number) => {
    const newStatus =
      currentStatus === GroupStatus.DISABLED ? GroupStatus.ENABLED : GroupStatus.DISABLED
    updateGroupStatusMutation.mutate({ id, status: newStatus })
  }
  const columnHelper = createColumnHelper<GroupInfo>()

  const columns = useMemo<ColumnDef<GroupInfo>[]>(() => {
    return [
      {
        header: t('nsManager.groupId'),
        accessorKey: 'id'
      },
      {
        header: t('nsManager.qpm'),
        id: 'qpm',
        cell: (info) => (
          <EditableTextNoLable
            value={info.row.original.qpm}
            flexProps={{ gap: '2px' }}
            onSubmit={(value) =>
              updateGroupQpmMutation.mutate({
                id: info.row.original.id,
                qpm: Number(value)
              })
            }
          />
        )
      },
      {
        header: t('nsManager.created_at'),
        accessorFn: (row) => new Date(row.created_at).toLocaleString(),
        id: 'created_at'
      },
      {
        header: t('nsManager.accessed_at'),
        accessorFn: (row) => {
          if (row.accessed_at && row.accessed_at < 0) {
            return t('key.unused')
          }

          return new Date(row.accessed_at).toLocaleString()
        },
        id: 'accessed_at'
      },
      {
        header: t('nsManager.request_count'),
        accessorKey: 'request_count'
      },
      {
        header: t('nsManager.status'),
        accessorFn: (row) =>
          row.status === GroupStatus.ENABLED ? t('nsManager.enabled') : t('nsManager.disabled'),
        cell: ({ getValue }) => {
          const value = getValue() as string
          return (
            <Text
              color={
                value === t('nsManager.enabled')
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
        accessorKey: 'used_amount',
        id: 'used_amount',
        header: () => {
          return (
            <Box position={'relative'}>
              <Flex alignItems={'center'} gap={'4px'}>
                <Text
                  noOfLines={1}
                  color="grayModern.600"
                  fontFamily="PingFang SC"
                  fontSize="12px"
                  fontWeight={500}
                  lineHeight="16px"
                  letterSpacing="0.5px">
                  {t('nsManager.used_amount')}
                </Text>
                <CurrencySymbol type={currencySymbol} />
              </Flex>
            </Box>
          )
        }
      },
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
            {t('nsManager.actions')}
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
                  color: info.row.original.status === 1 ? '#D92D20' : 'brightBlue.600'
                }}
                onClick={() => handleStatusUpdate(info.row.original.id, info.row.original.status)}>
                {info.row.original.status === GroupStatus.ENABLED ? (
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
                  color: '#D92D20'
                }}
                onClick={() => deleteGroupMutation.mutate({ id: String(info.row.original.id) })}>
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
  }, [])

  const table = useReactTable({
    data: groupData,
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
              {t('nsManager.ns_manager')}
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
                setGroupId('')
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
              gap="160px"
              alignSelf="stretch">
              <Flex h="32px" gap="48px" alignItems="center" flex="1" justifyContent="flex-start">
                <Text
                  whiteSpace="nowrap"
                  color="grayModern.900"
                  fontFamily="PingFang SC"
                  fontSize="12px"
                  fontStyle="normal"
                  fontWeight="500"
                  lineHeight="16px"
                  letterSpacing="0.5px">
                  {t('nsManager.groupId')}
                </Text>
                <Input
                  w="276px"
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
                  placeholder={t('nsManager.select_group_id')}
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
    </Flex>
  )
}
