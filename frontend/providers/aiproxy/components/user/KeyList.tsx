'use client';
import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  Flex,
  HStack,
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
} from '@chakra-ui/react';
import {
  Column,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable
} from '@tanstack/react-table';
import { TFunction } from 'i18next';

import { useTranslationClientSide } from '@/app/i18n/client';
import { useI18n } from '@/providers/i18n/i18nContext';

export function KeyList(): JSX.Element {
  const { lng } = useI18n();
  const { t } = useTranslationClientSide(lng, 'common');
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
          letterSpacing="0.15px"
        >
          {t('keyList.title')}
        </Text>
      </Flex>
      <Flex direction="column" alignItems="flex-start" gap="12px">
        <KeyItem t={t} />
      </Flex>
    </>
  );
}

function KeyItem({ t }: { t: TFunction }): JSX.Element {
  return <TableDemo t={t} />;
}

type KeyItem = {
  id: number;
  name: string;
  key: string;
  createdAt: string;
  lastUsedAt: string;
  status: 'active' | 'inactive';
};

export enum TableHeaderId {
  NAME = 'key.name',
  KEY = 'key.key',
  CREATED_AT = 'key.createdAt',
  LAST_USED_AT = 'key.lastUsedAt',
  STATUS = 'key.status',
  ACTIONS = 'key.actions'
}

const CustomHeader = ({ column, t }: { column: Column<KeyItem>; t: TFunction }) => {
  return <Text>{t(column.id as TableHeaderId)}</Text>;
};

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
  ]);

  const columnHelper = createColumnHelper<KeyItem>();

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
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

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
                alignItems="center"
              >
                {headerGroup.headers.map((header) => (
                  <Th
                    key={header.id}
                    whiteSpace="nowrap"
                    flex={header.id === TableHeaderId.ACTIONS ? '0 0 100px' : '1 1 0'}
                    textAlign="left"
                    px={4}
                  >
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
                borderColor="grayModern.150"
              >
                {row.getVisibleCells().map((cell) => (
                  <Td
                    key={cell.id}
                    flex={cell.column.id === TableHeaderId.ACTIONS ? '0 0 100px' : '1 1 0'}
                    textAlign="left"
                    px={4}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Td>
                ))}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
};

function SwitchPage({ table, t }: { table: Table<KeyItem>; t: TFunction }) {
  return (
    <HStack spacing={4} mt={4} justify="flex-end">
      <Button
        size="sm"
        onClick={() => table.setPageIndex(0)}
        disabled={!table.getCanPreviousPage()}
      >
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
        disabled={!table.getCanNextPage()}
      >
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
          table.setPageSize(Number(e.target.value));
        }}
      >
        {[10, 20, 30, 40, 50].map((pageSize) => (
          <option key={pageSize} value={pageSize}>
            {t('pagination.show')} {pageSize}
          </option>
        ))}
      </Select>
    </HStack>
  );
}

export default KeyList;
