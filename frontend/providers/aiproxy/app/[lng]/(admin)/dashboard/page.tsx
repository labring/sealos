'use client'
import {
  Checkbox,
  Box,
  Button,
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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  FormControl,
  Input,
  FormErrorMessage,
  ModalFooter,
  useDisclosure,
  FormLabel,
  HStack,
  VStack,
  Center,
  Select,
  ListItem,
  List,
  InputGroup,
  Spinner
} from '@chakra-ui/react'
import {
  Column,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable
} from '@tanstack/react-table'
import { useMessage } from '@sealos/ui'
import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'
import { ChannelInfo, ChannelStatus } from '@/types/admin/channels/channelInfo.d'
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query'
import { useState, useRef, useMemo, Dispatch, SetStateAction, useEffect } from 'react'
import { getBuiltInSupportModels, getChannels } from '@/api/platform'
import SwitchPage from '@/components/common/SwitchPage'
import { FieldErrors, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCombobox, UseComboboxReturnValue, useSelect, useMultipleSelection } from 'downshift'
import { ModelType } from '@/types/models/model'
import clsx from 'clsx'

type ModelTypeKey = keyof typeof ModelType

export default function DashboardPage() {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  return (
    <Flex pt="4px" pb="12px" pr="12px" h="100vh" width="full">
      <Flex
        bg="white"
        gap="16px"
        pt="24px"
        pl="32px"
        pr="32px"
        pb="18px"
        flexDirection="column"
        borderRadius="12px"
        h="full"
        w="full"
        flex="1">
        {/* header */}
        <Flex w="full" flexDirection="column" alignItems="flex-start" gap="8px">
          <Flex w="full" alignSelf="stretch" alignItems="center" justifyContent="space-between">
            <Flex alignItems="center" gap="16px">
              <Text
                color="black"
                fontFamily="PingFang SC"
                fontSize="20px"
                fontStyle="normal"
                fontWeight="500"
                lineHeight="26px"
                letterSpacing="0.15px">
                {t('dashboard.title')}
              </Text>
            </Flex>

            <Flex justifyContent="flex-end" alignContent="center" gap="12px">
              <Button
                display="flex"
                padding="8px 14px"
                justifyContent="center"
                alignItems="center"
                gap="6px"
                borderRadius="6px"
                bg="#111824"
                boxShadow="0px 1px 2px 0px rgba(19, 51, 107, 0.05), 0px 0px 1px 0px rgba(19, 51, 107, 0.08)"
                color="white"
                fontSize="12px"
                fontFamily="PingFang SC"
                fontWeight="500"
                whiteSpace="nowrap"
                lineHeight="16px"
                letterSpacing="0.5px"
                transition="all 0.2s ease"
                onClick={() => onOpen()}
                _hover={{
                  bg: '#2D3648',
                  transform: 'scale(1.05)'
                }}
                _active={{
                  bg: '#0A0F17',
                  transform: 'scale(0.95)',
                  animation: 'shake 0.3s'
                }}
                sx={{
                  '@keyframes shake': {
                    '0%, 100%': { transform: 'scale(0.95)' },
                    '25%': { transform: 'scale(0.95) translateX(-2px)' },
                    '75%': { transform: 'scale(0.95) translateX(2px)' }
                  }
                }}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none">
                  <path
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                    d="M7.99996 2.66675C8.36815 2.66675 8.66663 2.96522 8.66663 3.33341V7.33341H12.6666C13.0348 7.33341 13.3333 7.63189 13.3333 8.00008C13.3333 8.36827 13.0348 8.66675 12.6666 8.66675H8.66663V12.6667C8.66663 13.0349 8.36815 13.3334 7.99996 13.3334C7.63177 13.3334 7.33329 13.0349 7.33329 12.6667V8.66675H3.33329C2.9651 8.66675 2.66663 8.36827 2.66663 8.00008C2.66663 7.63189 2.9651 7.33341 3.33329 7.33341H7.33329V3.33341C7.33329 2.96522 7.63177 2.66675 7.99996 2.66675Z"
                    fill="white"
                  />
                </svg>
                {t('dashboard.create')}
              </Button>
              <Button
                display="flex"
                padding="8px 14px"
                justifyContent="center"
                alignItems="center"
                gap="6px"
                borderRadius="6px"
                bg="#111824"
                boxShadow="0px 1px 2px 0px rgba(19, 51, 107, 0.05), 0px 0px 1px 0px rgba(19, 51, 107, 0.08)"
                color="white"
                fontSize="12px"
                fontFamily="PingFang SC"
                fontWeight="500"
                whiteSpace="nowrap"
                lineHeight="16px"
                letterSpacing="0.5px">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none">
                  <path
                    d="M4.67403 1.54568C4.67403 1.42836 4.57892 1.33325 4.4616 1.33325C2.77074 1.33325 1.40002 2.70397 1.40002 4.39483V11.605C1.40002 13.2959 2.77074 14.6666 4.4616 14.6666H11.6718C13.3626 14.6666 14.7334 13.2959 14.7334 11.605V4.39483C14.7334 2.70397 13.3626 1.33325 11.6718 1.33325H10.1347C9.76646 1.33325 9.46799 1.63173 9.46799 1.99992C9.46799 2.36811 9.76646 2.66659 10.1347 2.66659H11.6718C12.6263 2.66659 13.4 3.44035 13.4 4.39483V11.605C13.4 12.5595 12.6263 13.3333 11.6718 13.3333H4.4616C3.50712 13.3333 2.73336 12.5595 2.73336 11.605V4.39483C2.73336 3.44035 3.50712 2.66659 4.4616 2.66659C4.57892 2.66659 4.67403 2.57148 4.67403 2.45416V1.54568Z"
                    fill="white"
                  />
                  <path
                    d="M7.44956 4.7593C7.34366 4.01775 7.12184 3.5521 6.74895 3.28889C5.86143 2.66241 5.20264 2.6666 5.10574 2.66722L5.09932 2.66725H4.43265V1.33392H5.09932C5.33405 1.33392 6.3067 1.34467 7.51785 2.1996C8.33657 2.77751 8.64402 3.69217 8.7695 4.5708C8.87184 5.28739 8.86613 6.09283 8.86087 6.83489C8.85974 6.99521 8.85862 7.15259 8.85862 7.30546C8.85862 7.73754 8.84937 8.14339 8.83572 8.50719L9.39676 7.94615C9.65711 7.6858 10.0792 7.6858 10.3396 7.94615C10.5999 8.2065 10.5999 8.6286 10.3396 8.88896L8.58245 10.6461C8.441 10.7875 8.25178 10.8521 8.06671 10.8399C7.88163 10.8521 7.69242 10.7875 7.55096 10.6461L5.79384 8.88896C5.53349 8.6286 5.53349 8.2065 5.79384 7.94615C6.05419 7.6858 6.4763 7.6858 6.73665 7.94615L7.41135 8.62084L7.49316 8.70266C7.51162 8.29469 7.52529 7.81909 7.52529 7.30546C7.52529 7.12915 7.52639 6.95576 7.52746 6.78545C7.53213 6.04759 7.53644 5.36763 7.44956 4.7593Z"
                    fill="white"
                  />
                </svg>
                {t('dashboard.import')}
              </Button>
              <Button
                display="flex"
                padding="8px 14px"
                justifyContent="center"
                alignItems="center"
                gap="6px"
                borderRadius="6px"
                bg="#111824"
                boxShadow="0px 1px 2px 0px rgba(19, 51, 107, 0.05), 0px 0px 1px 0px rgba(19, 51, 107, 0.08)"
                color="white"
                fontSize="12px"
                fontFamily="PingFang SC"
                fontWeight="500"
                lineHeight="16px"
                whiteSpace="nowrap"
                letterSpacing="0.5px">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none">
                  <path
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                    d="M7.52851 1.52851C7.78886 1.26816 8.21097 1.26816 8.47132 1.52851L11.138 4.19518C11.3983 4.45553 11.3983 4.87764 11.138 5.13799C10.8776 5.39834 10.4555 5.39834 10.1952 5.13799L8.66659 3.60939V9.99992C8.66659 10.3681 8.36811 10.6666 7.99992 10.6666C7.63173 10.6666 7.33325 10.3681 7.33325 9.99992V3.60939L5.80466 5.13799C5.54431 5.39834 5.1222 5.39834 4.86185 5.13799C4.6015 4.87764 4.6015 4.45553 4.86185 4.19518L7.52851 1.52851ZM1.99992 7.33325C2.36811 7.33325 2.66659 7.63173 2.66659 7.99992V10.7999C2.66659 11.371 2.6671 11.7592 2.69162 12.0592C2.7155 12.3515 2.75878 12.501 2.81191 12.6052C2.93974 12.8561 3.14372 13.0601 3.3946 13.1879C3.49887 13.2411 3.64833 13.2843 3.94061 13.3082C4.24067 13.3327 4.62887 13.3333 5.19992 13.3333H10.7999C11.371 13.3333 11.7592 13.3327 12.0592 13.3082C12.3515 13.2843 12.501 13.2411 12.6052 13.1879C12.8561 13.0601 13.0601 12.8561 13.1879 12.6052C13.2411 12.501 13.2843 12.3515 13.3082 12.0592C13.3327 11.7592 13.3333 11.371 13.3333 10.7999V7.99992C13.3333 7.63173 13.6317 7.33325 13.9999 7.33325C14.3681 7.33325 14.6666 7.63173 14.6666 7.99992V10.8275C14.6666 11.3641 14.6666 11.807 14.6371 12.1678C14.6065 12.5425 14.5408 12.887 14.3759 13.2106C14.1203 13.7123 13.7123 14.1203 13.2106 14.3759C12.887 14.5408 12.5425 14.6065 12.1678 14.6371C11.807 14.6666 11.3641 14.6666 10.8275 14.6666H5.17237C4.63573 14.6666 4.19283 14.6666 3.83204 14.6371C3.4573 14.6065 3.11283 14.5408 2.78928 14.3759C2.28751 14.1203 1.87956 13.7123 1.6239 13.2106C1.45904 12.887 1.39333 12.5425 1.36271 12.1678C1.33324 11.807 1.33324 11.3641 1.33325 10.8275L1.33325 7.99992C1.33325 7.63173 1.63173 7.33325 1.99992 7.33325Z"
                    fill="white"
                  />
                </svg>
                {t('dashboard.export')}
              </Button>
            </Flex>
          </Flex>
        </Flex>
        {/* body */}
        {/* table */}
        <ChannelTable />
        {/* modal */}
        <UpdateChannelModal isOpen={isOpen} onClose={onClose} />
      </Flex>
    </Flex>
  )
}

function ChannelTable() {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())

  const { data, isLoading } = useQuery({
    queryKey: ['getChannels', page, pageSize],
    queryFn: () => getChannels({ page, perPage: pageSize }),
    refetchOnReconnect: true,
    onSuccess(data) {
      setTotal(data?.total || 0)
    }
  })

  const columnHelper = createColumnHelper<ChannelInfo>()

  const handleHeaderCheckboxChange = (isChecked: boolean) => {
    if (isChecked) {
      const currentPageIds = data?.channels.map((channel) => channel.id) || []
      setSelectedRows(new Set(currentPageIds))
    } else {
      setSelectedRows(new Set())
    }
  }

  const handleRowCheckboxChange = (id: number, isChecked: boolean) => {
    const newSelected = new Set(selectedRows)
    if (isChecked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedRows(newSelected)
  }

  const columns = [
    columnHelper.accessor((row) => row.id, {
      id: 'id',
      header: () => (
        <Flex display="inline-flex" alignItems="center" gap="16px">
          {/* <Checkbox
            size="sm"
            colorScheme="grayModern"
            isChecked={
              data?.channels &&
              data.channels.length > 0 &&
              selectedRows.size === data.channels.length
            }
            onChange={(e) => handleHeaderCheckboxChange(e.target.checked)}
            spacing={0}
            iconColor="white"
            iconSize="12px"
            sx={{
              '.chakra-checkbox__control': {
                borderRadius: '4px',
                borderColor: 'grayModern.300',
                background: 'grayModern.100',
                transition: 'all 0.2s ease',
                _checked: {
                  background: 'grayModern.500',
                  borderColor: 'grayModern.500'
                }
              }
            }}
          /> */}
          <Checkbox
            width="16px"
            height="16px"
            borderRadius="4px"
            colorScheme="grayModern"
            isChecked={
              data?.channels &&
              data.channels.length > 0 &&
              selectedRows.size === data.channels.length
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
            ID
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
            isChecked={selectedRows.has(info.getValue())}
            onChange={(e) => handleRowCheckboxChange(info.getValue(), e.target.checked)}
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
          {new Date(info.getValue()).toLocaleString()}
        </Text>
      )
    }),
    columnHelper.accessor((row) => row.request_count, {
      id: 'request_count',
      header: () => <Text>Request Count</Text>,
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
    columnHelper.accessor((row) => row.status, {
      id: 'status',
      header: () => <Text>Status</Text>,
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
          Action
        </Text>
      ),
      cell: (info) => (
        <Menu>
          <MenuButton
            px={4}
            py={2}
            transition="all 0.2s"
            borderRadius="md"
            borderWidth="1px"
            _hover={{ bg: 'gray.400' }}
            _expanded={{ bg: 'blue.400' }}
            _focus={{ boxShadow: 'outline' }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none">
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M6.66663 3.33333C6.66663 2.59695 7.26358 2 7.99996 2C8.73634 2 9.33329 2.59695 9.33329 3.33333C9.33329 4.06971 8.73634 4.66667 7.99996 4.66667C7.26358 4.66667 6.66663 4.06971 6.66663 3.33333ZM6.66663 8C6.66663 7.26362 7.26358 6.66667 7.99996 6.66667C8.73634 6.66667 9.33329 7.26362 9.33329 8C9.33329 8.73638 8.73634 9.33333 7.99996 9.33333C7.26358 9.33333 6.66663 8.73638 6.66663 8ZM6.66663 12.6667C6.66663 11.9303 7.26358 11.3333 7.99996 11.3333C8.73634 11.3333 9.33329 11.9303 9.33329 12.6667C9.33329 13.403 8.73634 14 7.99996 14C7.26358 14 6.66663 13.403 6.66663 12.6667Z"
                fill="#485264"
              />
            </svg>
          </MenuButton>
          <MenuList minW="120px">
            <MenuItem
              fontSize="12px"
              fontWeight={500}
              color="grayModern.600"
              onClick={() => console.log('Export', info.row.original.id)}>
              {t('channels.test')}
            </MenuItem>
            <MenuItem
              fontSize="12px"
              fontWeight={500}
              color="grayModern.600"
              onClick={() => console.log('Enable/Disable', info.row.original.id)}>
              {info.row.original.status === ChannelStatus.ChannelStatusEnabled
                ? t('channels.disable')
                : t('channels.enable')}
            </MenuItem>
            <MenuItem
              fontSize="12px"
              fontWeight={500}
              color="grayModern.600"
              onClick={() => console.log('Edit', info.row.original.id)}>
              {t('channels.edit')}
            </MenuItem>
            <MenuItem
              fontSize="12px"
              fontWeight={500}
              color="grayModern.600"
              onClick={() => console.log('Export', info.row.original.id)}>
              {t('channels.export')}
            </MenuItem>
          </MenuList>
        </Menu>
      )
    })
  ]

  const table = useReactTable({
    data: data?.channels || [],
    columns,
    getCoreRowModel: getCoreRowModel()
  })

  return (
    <Box w="full" h="full" display="flex" flexDirection="column" id="channel-table-container">
      <TableContainer w="full" flex="1" overflowY="auto">
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
            {table.getRowModel().rows.map((row) => (
              <Tr
                key={row.id}
                height="48px"
                alignSelf="stretch"
                borderBottom="1px solid"
                borderColor="grayModern.150">
                {row.getVisibleCells().map((cell) => (
                  <Td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</Td>
                ))}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
      <SwitchPage
        justifyContent={'end'}
        currentPage={page}
        totalPage={Math.ceil(total / pageSize)}
        totalItem={total}
        pageSize={pageSize}
        setCurrentPage={(idx: number) => setPage(idx)}
      />
    </Box>
  )
}

function SelectTypeCombobox({
  dropdownItems,
  setSelectedItem,
  errors
}: {
  dropdownItems: string[]
  setSelectedItem: (item: string) => void
  errors: FieldErrors<{ type: number }>
}) {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const [getFilteredDropdownItems, setGetFilteredDropdownItems] = useState<string[]>(dropdownItems)

  const handleGetFilteredDropdownItems = (inputValue: string) => {
    const lowerCasedInputValue = inputValue.toLowerCase()
    return function dropdownItemsFilter(item: string) {
      return !inputValue || item.toLowerCase().includes(lowerCasedInputValue)
    }
  }

  const {
    isOpen: isComboboxOpen,
    getToggleButtonProps,
    getLabelProps,
    getMenuProps,
    getInputProps,
    highlightedIndex,
    getItemProps,
    selectedItem
  }: UseComboboxReturnValue<string> = useCombobox({
    items: getFilteredDropdownItems,
    onInputValueChange: ({ inputValue }) => {
      setGetFilteredDropdownItems(dropdownItems.filter(handleGetFilteredDropdownItems(inputValue)))
    },

    onSelectedItemChange: ({ selectedItem }) => {
      const selectedDropdownItem = dropdownItems.find((item) => item === selectedItem)
      if (selectedDropdownItem) {
        setSelectedItem(selectedDropdownItem)
      }
    }
  })
  return (
    <FormControl isInvalid={!!errors.type} isRequired>
      <VStack w="full" alignItems="flex-start" gap="8px">
        <FormLabel
          color="grayModern.900"
          fontFamily="PingFang SC"
          fontSize="14px"
          fontStyle="normal"
          fontWeight={500}
          lineHeight="20px"
          letterSpacing="0.1px"
          display="flex"
          alignItems="center"
          minH="20px"
          justifyContent="flex-start"
          m={0}
          {...getLabelProps()}>
          {t('channelsForm.type')}
        </FormLabel>

        <InputGroup w="full" alignItems="center">
          <Input
            display="flex"
            h="32px"
            py="8px"
            pl="12px"
            pr="44px" // 32 + 12 for the button
            alignItems="center"
            borderRadius="6px"
            border="1px solid var(--Gray-Modern-200, #E8EBF0)"
            bgColor="grayModern.50"
            variant="unstyled"
            placeholder={t('channelsFormPlaceholder.type')}
            {...getInputProps()}
          />
          <Button
            position="absolute"
            right={0}
            h="32px"
            w="32px"
            zIndex={1}
            variant="unstyled"
            display="flex"
            alignItems="center"
            justifyContent="center"
            {...getToggleButtonProps()}>
            {isComboboxOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="17"
                height="16"
                viewBox="0 0 17 16"
                fill="none">
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M4.32148 10.4715C4.58183 10.7318 5.00394 10.7318 5.26429 10.4715L8.79289 6.94289L12.3215 10.4715C12.5818 10.7318 13.0039 10.7318 13.2643 10.4715C13.5246 10.2111 13.5246 9.78903 13.2643 9.52868L9.26429 5.52868C9.00394 5.26833 8.58183 5.26833 8.32148 5.52868L4.32148 9.52868C4.06113 9.78903 4.06113 10.2111 4.32148 10.4715Z"
                  fill="#667085"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="17"
                height="16"
                viewBox="0 0 17 16"
                fill="none">
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M4.32148 5.52851C4.58183 5.26816 5.00394 5.26816 5.26429 5.52851L8.79289 9.05711L12.3215 5.52851C12.5818 5.26816 13.0039 5.26816 13.2643 5.52851C13.5246 5.78886 13.5246 6.21097 13.2643 6.47132L9.26429 10.4713C9.00394 10.7317 8.58183 10.7317 8.32148 10.4713L4.32148 6.47132C4.06113 6.21097 4.06113 5.78886 4.32148 5.52851Z"
                  fill="#667085"
                />
              </svg>
            )}
          </Button>
        </InputGroup>

        {errors.type && <FormErrorMessage>{errors.type.message}</FormErrorMessage>}
      </VStack>
      <List
        position="absolute"
        mt="2px"
        w="full"
        py="6px"
        pl="6px"
        pr="6px"
        bg="white"
        alignItems="flex-start"
        boxShadow="0px 12px 16px -4px rgba(19, 51, 107, 0.20), 0px 0px 1px 0px rgba(19, 51, 107, 0.20)"
        maxH="60"
        overflowY="auto"
        zIndex="10"
        borderRadius="6px"
        display={isComboboxOpen && getFilteredDropdownItems.length ? 'block' : 'none'}
        {...getMenuProps()}>
        {isComboboxOpen &&
          getFilteredDropdownItems.map((item, index) => (
            <ListItem
              key={item}
              display="flex"
              padding="8px 4px"
              alignItems="center"
              gap="8px"
              alignSelf="stretch"
              borderRadius="4px"
              bg={highlightedIndex === index ? 'rgba(17, 24, 36, 0.05)' : 'transparent'}
              fontWeight={selectedItem === item ? 'bold' : 'normal'}
              cursor="pointer"
              color="grayModern.900"
              fontFamily="PingFang SC"
              fontSize="12px"
              fontStyle="normal"
              lineHeight="16px"
              letterSpacing="0.5px"
              _hover={{ bg: 'rgba(17, 24, 36, 0.05)' }}
              {...getItemProps({ item, index })}>
              {item}
            </ListItem>
          ))}
      </List>
    </FormControl>
  )
}

function SelectModelComBox({
  dropdownItems,
  selectedItems,
  setSelectedItems
}: {
  dropdownItems: string[]
  selectedItems: string[]
  setSelectedItems: Dispatch<SetStateAction<string[]>>
}) {
  function getFilteredDropdownItems(selectedItems: string[], inputValue: string) {
    const lowerCasedInputValue = inputValue.toLowerCase()

    return dropdownItems.filter(
      (item) => !selectedItems.includes(item) && item.toLowerCase().includes(lowerCasedInputValue)
    )
  }

  const MultipleComboBox = () => {
    const [inputValue, setInputValue] = useState<string>('')

    // Dropdown list excludes already selected options and includes those matching the input.
    const items = useMemo(() => getFilteredDropdownItems(selectedItems, inputValue), [inputValue])

    const { getSelectedItemProps, getDropdownProps, removeSelectedItem } = useMultipleSelection({
      selectedItems,
      onStateChange({ selectedItems: newSelectedItems, type }) {
        switch (type) {
          case useMultipleSelection.stateChangeTypes.SelectedItemKeyDownBackspace:
          case useMultipleSelection.stateChangeTypes.SelectedItemKeyDownDelete:
          case useMultipleSelection.stateChangeTypes.DropdownKeyDownBackspace:
          case useMultipleSelection.stateChangeTypes.FunctionRemoveSelectedItem:
            setSelectedItems(newSelectedItems ?? [])
            break
          default:
            break
        }
      }
    })
    const {
      isOpen,
      getToggleButtonProps,
      getLabelProps,
      getMenuProps,
      getInputProps,
      highlightedIndex,
      getItemProps,
      selectedItem
    } = useCombobox({
      items,
      defaultHighlightedIndex: 0, // after selection, highlight the first item.
      selectedItem: null,
      inputValue,
      stateReducer(state, actionAndChanges) {
        const { changes, type } = actionAndChanges

        switch (type) {
          case useCombobox.stateChangeTypes.InputKeyDownEnter:
          case useCombobox.stateChangeTypes.ItemClick:
            return {
              ...changes,
              isOpen: true, // keep the menu open after selection.
              highlightedIndex: 0 // with the first option highlighted.
            }
          default:
            return changes
        }
      },
      onStateChange({ inputValue: newInputValue, type, selectedItem: newSelectedItem }) {
        switch (type) {
          case useCombobox.stateChangeTypes.InputKeyDownEnter:
          case useCombobox.stateChangeTypes.ItemClick:
          case useCombobox.stateChangeTypes.InputBlur:
            if (newSelectedItem) {
              setSelectedItems([...selectedItems, newSelectedItem])
              setInputValue('')
            }
            break

          case useCombobox.stateChangeTypes.InputChange:
            setInputValue(newInputValue ?? '')

            break
          default:
            break
        }
      }
    })

    return (
      <Box w="full">
        <VStack align="stretch" spacing="8px">
          <FormLabel
            color="grayModern.900"
            fontFamily="PingFang SC"
            fontSize="14px"
            fontWeight={500}
            lineHeight="20px"
            letterSpacing="0.1px"
            m={0}
            {...getLabelProps()}>
            Pick some books:
          </FormLabel>

          <Box
            bg="white"
            borderRadius="6px"
            border="1px solid"
            borderColor="grayModern.200"
            p="8px">
            <Flex wrap="wrap" gap="8px" alignItems="center">
              {selectedItems.map((selectedItemForRender, index) => (
                <Box
                  key={`selected-item-${index}`}
                  bg="grayModern.100"
                  borderRadius="6px"
                  px="8px"
                  py="4px"
                  _focus={{ bg: 'red.100' }}
                  {...getSelectedItemProps({
                    selectedItem: selectedItemForRender,
                    index
                  })}>
                  <Flex alignItems="center" gap="4px">
                    <Text fontSize="12px">{selectedItemForRender}</Text>
                    <Box
                      as="span"
                      cursor="pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeSelectedItem(selectedItemForRender)
                      }}>
                      ×
                    </Box>
                  </Flex>
                </Box>
              ))}

              <Flex flex={1} gap="4px">
                <Input
                  variant="unstyled"
                  placeholder="Best book ever"
                  fontSize="12px"
                  {...getInputProps(getDropdownProps({ preventKeyAction: isOpen }))}
                />
                <Button
                  variant="unstyled"
                  display="flex"
                  alignItems="center"
                  px="8px"
                  {...getToggleButtonProps()}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none">
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M4.32148 5.52851C4.58183 5.26816 5.00394 5.26816 5.26429 5.52851L8.79289 9.05711L12.3215 5.52851C12.5818 5.26816 13.0039 5.26816 13.2643 5.52851C13.5246 5.78886 13.5246 6.21097 13.2643 6.47132L9.26429 10.4713C9.00394 10.7317 8.58183 10.7317 8.32148 10.4713L4.32148 6.47132C4.06113 6.21097 4.06113 5.78886 4.32148 5.52851Z"
                      fill="#667085"
                    />
                  </svg>
                </Button>
              </Flex>
            </Flex>
          </Box>
        </VStack>

        <List
          position="absolute"
          mt="2px"
          w="full"
          bg="white"
          boxShadow="0px 12px 16px -4px rgba(19, 51, 107, 0.20)"
          maxH="320px"
          overflowY="auto"
          borderRadius="6px"
          display={isOpen && items.length ? 'block' : 'none'}
          zIndex={10}
          {...getMenuProps()}>
          {isOpen &&
            items.map((item, index) => (
              <ListItem
                key={`${item}${index}`}
                px="12px"
                py="8px"
                bg={highlightedIndex === index ? 'grayModern.100' : 'transparent'}
                fontWeight={selectedItem === item ? 'bold' : 'normal'}
                cursor="pointer"
                _hover={{ bg: 'grayModern.100' }}
                {...getItemProps({ item, index })}>
                <VStack align="stretch" spacing="4px">
                  <Text fontSize="12px" color="grayModern.900">
                    {item}
                  </Text>
                </VStack>
              </ListItem>
            ))}
        </List>
      </Box>
    )
  }
  return <MultipleComboBox />
}

function UpdateChannelModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')

  const [modelTypes, setModelTypes] = useState<ModelTypeKey[]>([])

  const [selectedModelType, setSelectedModelType] = useState<ModelTypeKey | null>(null)
  const [models, setModels] = useState<string[]>([])
  const [selectedModels, setSelectedModels] = useState<string[]>([])

  const [modelMapping, setModelMapping] = useState<Record<string, string>>({})

  console.log(selectedModelType)
  console.log(selectedModels)

  const { isLoading: isBuiltInSupportModelsLoading, data: builtInSupportModels } = useQuery({
    queryKey: ['models'],
    queryFn: () => getBuiltInSupportModels(),
    onSuccess: (data) => {
      if (!data) return

      const types = Object.keys(data)
        .map((key) => {
          // Find the corresponding enumeration key based on an enumeration value (string).
          const enumKey = Object.entries(ModelType).find(
            ([_, value]) => value === key
          )?.[0] as ModelTypeKey
          return enumKey
        })
        .filter((key): key is ModelTypeKey => key !== undefined)

      setModelTypes(types)
    }
  })

  useEffect(() => {
    if (!builtInSupportModels || !selectedModelType) return
    const modelTypeValue = selectedModelType ? (ModelType[selectedModelType] as ModelType) : null
    const models = modelTypeValue
      ? builtInSupportModels?.[modelTypeValue as keyof typeof builtInSupportModels] || []
      : []
    setModels(models)
  }, [selectedModelType, builtInSupportModels])

  console.log(1)

  const { message } = useMessage({
    warningBoxBg: 'var(--Yellow-50, #FFFAEB)',
    warningIconBg: 'var(--Yellow-500, #F79009)',
    warningIconFill: 'white',

    successBoxBg: 'var(--Green-50, #EDFBF3)',
    successIconBg: 'var(--Green-600, #039855)',
    successIconFill: 'white'
  })

  const schema = z.object({
    type: z.number(),
    name: z.string().min(1, { message: t('channels.name_required') }),
    key: z.string().min(1, { message: t('channels.key_required') }),
    base_url: z.string(),
    models: z.array(z.string()).default([]),
    model_mapping: z.record(z.string(), z.any()).default({})
  })

  type FormData = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    reset,
    trigger,
    getValues,
    setValue,
    formState: { errors }
  } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  const onValidate = (data: FormData) => {
    console.log(data)
  }

  const onInvalid = () => {
    const firstErrorMessage = Object.values(errors)[0]?.message
    if (firstErrorMessage) {
      message({
        title: firstErrorMessage as string,
        status: 'error',
        position: 'top',
        duration: 2000,
        isClosable: true,
        description: firstErrorMessage as string
      })
    }
  }

  const onSubmit = handleSubmit(onValidate, onInvalid)

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      {isOpen && (
        <ModalContent
          minW="530px"
          minH="768px"
          flexDirection="column"
          justifyContent="center"
          alignItems="flex-start"
          borderRadius="10px"
          background="white"
          boxShadow="0px 32px 64px -12px rgba(19, 51, 107, 0.20), 0px 0px 1px 0px rgba(19, 51, 107, 0.20)">
          {/* header */}
          <ModalHeader
            height="48px"
            padding="10px 20px"
            justifyContent="center"
            alignItems="center"
            flexShrink="0"
            borderBottom="1px solid grayModern.100"
            background="grayModern.25"
            w="full">
            <Flex w="full" justifyContent="space-between" alignItems="center">
              <Flex w="98px" alignItems="center" gap="10px" flexShrink={0}>
                <Text
                  color="grayModern.900"
                  fontFamily="PingFang SC"
                  fontSize="16px"
                  fontStyle="normal"
                  fontWeight={500}
                  lineHeight="24px"
                  letterSpacing="0.15px">
                  {t('channels.create')}
                </Text>
              </Flex>
            </Flex>
          </ModalHeader>
          <ModalCloseButton
            display="flex"
            width="28px"
            height="28px"
            padding="4px"
            justifyContent="center"
            alignItems="center"
            gap="10px"
            flexShrink={0}
            borderRadius="4px"
          />
          {/* body */}
          {isBuiltInSupportModelsLoading || !builtInSupportModels ? (
            <Center w="full" h="full">
              <Spinner />
            </Center>
          ) : (
            <>
              <ModalBody w="full" h="full">
                <VStack
                  as="form"
                  h="full"
                  w="full"
                  onSubmit={onSubmit}
                  padding="24px 36px 24px 36px"
                  spacing="24px"
                  justifyContent="center"
                  alignItems="center"
                  align="stretch">
                  <FormControl isInvalid={!!errors.name} isRequired>
                    <VStack w="full" alignItems="flex-start" gap="8px">
                      <FormLabel
                        color="grayModern.900"
                        fontFamily="PingFang SC"
                        fontSize="14px"
                        fontStyle="normal"
                        fontWeight={500}
                        lineHeight="20px"
                        letterSpacing="0.1px"
                        display="flex"
                        alignItems="center"
                        minH="20px"
                        justifyContent="flex-start"
                        m={0}>
                        {t('channelsForm.name')}
                      </FormLabel>

                      <Input
                        display="flex"
                        h="32px"
                        py="8px"
                        px="12px"
                        alignItems="center"
                        borderRadius="6px"
                        border="1px solid var(--Gray-Modern-200, #E8EBF0)"
                        bgColor="grayModern.50"
                        variant="unstyled"
                        placeholder={t('channelsFormPlaceholder.name')}
                        {...register('name')}
                      />
                      {errors.name && <FormErrorMessage>{errors.name.message}</FormErrorMessage>}
                    </VStack>
                  </FormControl>
                  <SelectTypeCombobox
                    dropdownItems={modelTypes}
                    setSelectedItem={(item: string) => setSelectedModelType(item as ModelTypeKey)}
                    errors={errors}
                  />
                  <SelectModelComBox
                    dropdownItems={models}
                    selectedItems={selectedModels}
                    setSelectedItems={setSelectedModels}
                  />
                </VStack>
              </ModalBody>

              <ModalFooter
                w="full"
                h="36px"
                justifyContent="flex-end"
                alignItems="center"
                alignSelf="stretch"
                gap="16px">
                <Button
                  w="88px"
                  display="flex"
                  padding="8px 20px"
                  justifyContent="center"
                  alignItems="center"
                  gap="8px"
                  borderRadius="6px"
                  background="grayModern.900"
                  boxShadow="0px 1px 2px 0px rgba(19, 51, 107, 0.05), 0px 0px 1px 0px rgba(19, 51, 107, 0.08)"
                  _hover={{ background: 'var(--Gray-Modern-800, #1F2937)' }}
                  onClick={() => {}}
                  isDisabled={false}
                  isLoading={false}>
                  {t('confirm')}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      )}
    </Modal>
  )
}
