'use client'
import { useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, PlusSquareIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Select,
  Table,
  TableContainer,
  Tag,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr
} from '@chakra-ui/react'
import {
  Column,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable
} from '@tanstack/react-table'
import { TFunction } from 'i18next'

import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'

export function KeyList(): JSX.Element {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  return (
    <>
      <Flex direction="column" alignItems="flex-start" gap="8px" alignSelf="stretch">
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
      <Flex>
        <Icon
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none">
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M15.065 4.06161C16.3317 5.82297 16.1731 8.29256 14.5891 9.87655L13.6605 10.8051C13.3574 11.1082 12.866 11.1082 12.563 10.8051L7.28603 5.52819C6.98295 5.22511 6.98295 4.73372 7.28603 4.43064L8.2146 3.50206C9.78978 1.92688 12.2407 1.76126 14.0001 3.00518L15.0432 1.96204C15.3361 1.66915 15.811 1.66915 16.1039 1.96204C16.3968 2.25493 16.3968 2.72981 16.1039 3.0227L15.065 4.06161ZM1.89154 15.1228C1.59865 15.4157 1.59865 15.8906 1.89155 16.1835C2.18444 16.4764 2.65931 16.4764 2.9522 16.1835L3.98563 15.1501C5.74633 16.4091 8.20964 16.2481 9.79066 14.6671L10.7192 13.7385C11.0223 13.4354 11.0223 12.944 10.7192 12.641L10.0647 11.9865L10.6237 11.4275C10.9166 11.1346 10.9166 10.6597 10.6237 10.3668C10.3308 10.074 9.85594 10.074 9.56304 10.3668L9.00409 10.9258L7.17634 9.09806L7.73131 8.54309C8.02421 8.2502 8.02421 7.77532 7.73131 7.48243C7.43842 7.18954 6.96355 7.18954 6.67065 7.48243L6.11568 8.0374L5.4423 7.36402C5.13922 7.06094 4.64783 7.06094 4.34475 7.36402L3.41617 8.2926C1.83803 9.87075 1.67475 12.328 2.92634 14.088L1.89154 15.1228ZM4.89352 8.93657L4.47683 9.35326C3.30235 10.5277 3.30235 12.4319 4.47683 13.6064C5.65131 14.7809 7.55552 14.7809 8.73 13.6064L9.14669 13.1897L4.89352 8.93657ZM13.5284 8.81589L13.1117 9.23258L8.85857 4.97941L9.27526 4.56272C10.4497 3.38824 12.3539 3.38824 13.5284 4.56272C14.7029 5.7372 14.7029 7.64141 13.5284 8.81589Z"
            fill="#111824"
          />
        </Icon>
        API Endpoint:
        <Text color={'brightBlue.600'}>https://www.aiproxy.com</Text>
        <Button>新建</Button>
      </Flex>
      <Flex direction="column" alignItems="flex-start" gap="12px">
        <KeyItem t={t} />
      </Flex>
    </>
  )
}

function KeyItem({ t }: { t: TFunction }): JSX.Element {
  return <TableDemo t={t} />
}

type KeyItem = {
  id: number
  name: string
  key: string
  createdAt: string
  lastUsedAt: string
  status: 'active' | 'inactive'
}

export enum TableHeaderId {
  NAME = 'key.name',
  KEY = 'key.key',
  CREATED_AT = 'key.createdAt',
  LAST_USED_AT = 'key.lastUsedAt',
  STATUS = 'key.status',
  ACTIONS = 'key.actions'
}

const CustomHeader = ({ column, t }: { column: Column<KeyItem>; t: TFunction }) => {
  return <Text>{t(column.id as TableHeaderId)}</Text>
}

const TableDemo = ({ t }: { t: TFunction }) => {
  const [data] = useState<KeyItem[]>([
    {
      id: 1,
      name: '1234567890',
      key: '1234567890',
      createdAt: '2021-01-01',
      lastUsedAt: '2021-01-01',
      status: 'active'
    },
    {
      id: 2,
      name: '1234567890',
      key: '1234567890',
      createdAt: '2021-01-01',
      lastUsedAt: '2021-01-01',
      status: 'inactive'
    }
  ])

  const columnHelper = createColumnHelper<KeyItem>()

  const columns = [
    columnHelper.accessor((row) => row.name, {
      id: TableHeaderId.NAME,
      header: (props) => <CustomHeader column={props.column} t={t} />,
      cell: (info) => info.getValue()
    }),
    columnHelper.accessor((row) => row.key, {
      id: TableHeaderId.KEY,
      header: (props) => <CustomHeader column={props.column} t={t} />,
      cell: (info) => info.getValue()
    }),
    columnHelper.accessor((row) => row.createdAt, {
      id: TableHeaderId.CREATED_AT,
      header: (props) => <CustomHeader column={props.column} t={t} />,
      cell: (info) => info.getValue()
    }),
    columnHelper.accessor((row) => row.lastUsedAt, {
      id: TableHeaderId.LAST_USED_AT,
      header: (props) => <CustomHeader column={props.column} t={t} />,
      cell: (info) => info.getValue()
    }),
    columnHelper.accessor((row) => row.status, {
      id: TableHeaderId.STATUS,
      header: (props) => <CustomHeader column={props.column} t={t} />,
      cell: (info) => info.getValue()
    }),

    columnHelper.display({
      id: TableHeaderId.ACTIONS,
      header: (props) => <CustomHeader column={props.column} t={t} />,
      cell: (info) => (
        <Text>Actions</Text>
        // <ActionMenu
        //   status={info.row.original.status}
        //   onStatusChange={() => handleStatusChange(info.row.original.id)}
        //   onDelete={() => handleDelete(info.row.original.id)}
        // />
      )
    })
  ]

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel()
  })

  return (
    <Box>
      <TableContainer width="100%" height="100%">
        <Table variant="simple" width="full" size="md">
          <Thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Tr
                key={headerGroup.id}
                height="42px"
                borderRadius="6px"
                bg="grayModern.100"
                display="flex"
                alignItems="center">
                {headerGroup.headers.map((header) => (
                  <Th
                    key={header.id}
                    whiteSpace="nowrap"
                    flex={header.id === TableHeaderId.ACTIONS ? '0 0 100px' : '1 1 0'}
                    textAlign="left"
                    px={4}>
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
                display="flex"
                alignItems="center"
                height="48px"
                borderBottom="1px solid"
                borderColor="grayModern.150">
                {row.getVisibleCells().map((cell) => (
                  <Td
                    key={cell.id}
                    flex={cell.column.id === TableHeaderId.ACTIONS ? '0 0 100px' : '1 1 0'}
                    textAlign="left"
                    px={4}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Td>
                ))}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  )
}

function SwitchPage({ table, t }: { table: Table<KeyItem>; t: TFunction }) {
  return (
    <HStack spacing={4} mt={4} justify="flex-end">
      <Button
        size="sm"
        onClick={() => table.setPageIndex(0)}
        disabled={!table.getCanPreviousPage()}>
        {'<<'}
      </Button>
      <Button size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
        <ChevronLeftIcon />
      </Button>
      <Button size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
        <ChevronRightIcon />
      </Button>
      <Button
        size="sm"
        onClick={() => table.setPageIndex(table.getPageCount() - 1)}
        disabled={!table.getCanNextPage()}>
        {'>>'}
      </Button>

      <HStack>
        <Text>{t('pagination.page')}</Text>
        <Text fontWeight="bold">
          {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
        </Text>
      </HStack>

      <Select
        size="sm"
        w="auto"
        value={table.getState().pagination.pageSize}
        onChange={(e) => {
          table.setPageSize(Number(e.target.value))
        }}>
        {[10, 20, 30, 40, 50].map((pageSize) => (
          <option key={pageSize} value={pageSize}>
            {t('pagination.show')} {pageSize}
          </option>
        ))}
      </Select>
    </HStack>
  )
}

export default KeyList
